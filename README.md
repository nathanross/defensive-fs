## Defensive FS

This is a typescript library for a defensive oo-style fs read and write. It's developed and maintained as a helper for convenience scripts I write for myself in typescript.

The value-add over, say, Jetpack, is that this library has an emphasis on built-in, ergonomic defensive programming assertions. The idea being to catch mismatches between expected state of the filesystem and actual state at the place in the code where those assumptions are first made, rather than getting a cryptic error further down the line.