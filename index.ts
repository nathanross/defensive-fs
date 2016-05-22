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

enum DirectoryAssertions {
    ASSERT_EXISTS = 1,
    ASSERT_PARENTS_EXIST = 2,
    ASSERT_NONE = 3
}

export class ReadableDirectory {
    public abspath: string;
    public constructor(public spath: string) {
        needed(noErr(() => { fs.accessSync(spath, fs.R_OK); }),
            'Readable Directory', spath);
        this.abspath = path.resolve(spath);
    }
    public getReadableSubdir(name: string): ReadableDirectory {
        return new ReadableDirectory(this.spath + '/' + name);
    }
}

export class ReadableFile {
    public constructor(public spath: string) {
        needed(noErr(() => { fs.accessSync(spath, fs.R_OK); }),
            'Readable Directory', spath);
    }
}

export class ReplacableFile extends ReadableFile {
    public constructor(public spath: string) {
        super(spath);
        needed(noErr(() => { fs.accessSync(spath, fs.W_OK); }),
            'ReplacableFile', spath);
    }
}

export class WritableDirectory extends ReadableDirectory {
    constructor(public spath: string, requirements: DirectoryAssertions) {
        super(WritableDirectory.createAsAble(path, requirements));
    }
    private static createAsAble(spath: string, requirements: DirectoryAssertions): string {
        let exists = noErr(() => { fs.accessSync(spath); });
        needed(exists || requirements != DirectoryAssertions.ASSERT_EXISTS, 'WritableDirectory', spath);
        if (!exists) {
            let parentsExist = noErr(() => { fs.accessSync(path.dirname(spath)); });
            needed(parentsExist || requirements != DirectoryAssertions.ASSERT_PARENTS_EXIST, 'WritableDirectory', spath);
            if (!parentsExist) {
                new WritableDirectory(path.dirname(spath), requirements);
            }
            fs.mkdirSync()
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
    public getWritableSubdir(name: string, requirements: DirectoryAssertions): WritableDirectory {
        return new WritableDirectory(this.spath + '/' + name, requirements);
    }
}
