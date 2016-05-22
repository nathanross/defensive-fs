/* dont consider this a design by contract approach actually gives us any guarantees about whether we'll be able to access or edit the file or directory later, just consider it a baseline of defensive programming to catch egregious errors where they occur*/

declare function require(path: string): any;
var log = require('loglevel');
var fs = require('fs');
var path = require('path');
var wrench = require('wrench');

//probably the most bloated dependency in terms of its own requirements
var Userid = require('userid');

export function needed(assertion: boolean, errorCat: string, detail: string) {
    if (!assertion) {
        throw new Error(errorCat + detail);
    }
}

export function noErr(shouldntFail: () => any) {
    try {
        shouldntFail();
        return true;
    } catch (e) {
        return false;
    }
}

export enum DirectoryAssertions {
    ASSERT_EXISTS = 1,
    ASSERT_PARENTS_EXIST = 2,
    ASSERT_NONE = 3
}

export class ReadableDirectory {
    public abspath: string;
    public constructor(public spath: string) {
        needed(noErr(() => { fs.accessSync(spath, fs.R_OK); }),
            'Readable Directory', spath);
        needed(fs.lstatSync(spath).isDirectory(), 'Readable Directory', spath);
        this.abspath = path.resolve(spath);
    }
    public getReadableSubdir(name: string): ReadableDirectory {
        return new ReadableDirectory(this.spath + '/' + name);
    }
    public getReadableFile(name: string): ReadableFile {
        return new ReadableFile(this.spath + '/' + name);
    }
}

export class ReadableFile {
    public abspath: string;
    public constructor(public spath: string) {
        needed(noErr(() => { fs.accessSync(spath, fs.R_OK); }),
            'Readable File', spath);
        needed(fs.lstatSync(spath).isFile(), 'Readable File', spath);
        this.abspath = path.resolve(spath);
    }
    public read(): String {
        return fs.readFileSync(this.abspath, { encoding: 'utf8' });
    }
}
/*
export class ReplacableFile extends ReadableFile {
    public constructor(public spath: string) {
        super(spath);
        needed(noErr(() => { fs.accessSync(spath, fs.W_OK); }),
            'ReplacableFile', spath);
    }
}
*/
export class WritableDirectory extends ReadableDirectory {
    constructor(public spath: string, requirements: DirectoryAssertions) {
        super(WritableDirectory.createAsAble(path, requirements));
    }
    private static createAsAble(spath: string, requirements: DirectoryAssertions): string {
        let abspath = path.resolve(spath);
        let exists = noErr(() => { fs.accessSync(abspath); });
        needed(exists || requirements != DirectoryAssertions.ASSERT_EXISTS, 'WritableDirectory', abspath);
        if (!exists) {
            let parentsExist = noErr(() => { fs.accessSync(path.dirname(abspath)); });
            needed(parentsExist || requirements != DirectoryAssertions.ASSERT_PARENTS_EXIST, 'WritableDirectory', abspath);
            if (!parentsExist) {
                new WritableDirectory(path.dirname(abspath), requirements);
            }
            fs.mkdirSync(abspath);
        }
        return spath;
    }

    public replaceContents(srcDir: ReadableDirectory): WritableDirectory {
        wrench.copyDirSyncRecursive(srcDir.abspath, this.abspath, { forceDelete: true, preserveFiles: false });
        return this;
    }
    public mergeContents(srcDir: ReadableDirectory): WritableDirectory {
        wrench.copyDirSyncRecursive(srcDir.abspath, this.abspath, { forceDelete: false, preserveFiles: false });
        return this;
    }
    public chownSyncRecursive(username: string, groupname: string): WritableDirectory {
        wrench.chownSyncRecursive(this.abspath, Userid.uid(username), Userid.gid(username));
        return this;
    }
    public chmodSyncRecursive(newPerm: number): WritableDirectory {
        wrench.chmodSyncRecursive(this.abspath, newPerm);
        return this;
    }
    public emptyRecursive(): WritableDirectory {
        wrench.rmdirSyncRecursive(this.abspath, false);
        fs.mkdirSync(this.abspath);
        return this;
    }
    public ensureSymLink(pointedTo: string, pointedFrom: string): WritableDirectory {
        let pointedToDest = path.resolve(this.abspath, pointedTo);
        let dest = this.abspath + '/' + pointedFrom;
        let exists = noErr(() => { fs.accessSync(dest); });
        if (exists) {
            fs.unlinkSync(dest);
        }
        fs.symlinkSync(pointedTo, dest);
        return this;
    }
    public ensureCopyOf(source: ReadableFile, name: string): WritableDirectory {
        let dest = this.abspath + '/' + name;
        fs.createReadStream(source.abspath).pipe(fs.createWriteStream(dest));
        return this;
    }
    public ensureTextfile(content: string, name: string) {
        let dest = this.abspath + '/' + name;
        let exists = noErr(() => { fs.accessSync(dest); });
        if (exists && fs.lstatSync(dest).isSymbolicLink()) {
            fs.unlinkSync(dest);
        }
        fs.writeFileSync(dest, content, { mode: 660 });
    }
    public getWritableSubdir(name: string, requirements: DirectoryAssertions): WritableDirectory {
        return new WritableDirectory(this.spath + '/' + name, requirements);
    }
}
