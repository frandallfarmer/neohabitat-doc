# mamelink
A compatibility shim for Lucasfilm Games' "fastlink", using a MAME plugin to implement similar functionality.

## Building
Run `make`. Assumes a POSIX-like environment. Works On My Machine, totally untested on anything besides Linux.

## Booting reno
Run `./start`. Assumes that `mame` is in the current path, with C64 ROMs installed. MAME will start, and you will probably need to press a key to start the emulated C64 booting. Once the C64 has completed startup, `reno` will automatically begin uploading, and when it is complete, you will see the command `SYS2122` automatically be entered into the emulator. After a few more seconds, Reno will start.

## How It Works
It's a terrible, awful, very bad, no good hack, but it does the trick and should hopefully be portable, even to an enscripten-type browser environment. To send a command to the `mamelink` plugin, the `mamelink.c` library creates a file called `mameplugins/mamelink/linkin` with
the request. The plugin checks for the existence of this file constantly. Once it is able to open it, it executes the instructions it finds, creates a file called `mameplugins/mamelink/linkout` with any response, and deletes `mameplugins/mamelink/linkin`. The `mamelink.c` library waits for the `linkin` file to be deleted, reads all of the data out of `linkout`, if any, and deletes it.

Some amount of energy was put into avoiding race conditions but not a lot. Try not to have multiple programs poking at C64 memory at the same time. This seems unlikely to happen in practice, at least.

## Why did you do it like that
Because every sensible, normal way of doing it was broken thanks to Lua's underpowered standard library, MAME's requirement for non-blocking I/O, and the weird not-quite-acceptable socket support that MAME provides in its plugin interface. (You can only accept a connection from a single client at a time, and there is no way to determine if a client has disconnected.)
