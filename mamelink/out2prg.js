const fs = require('node:fs/promises');
const assert = require('node:assert/strict');

const die = (...message) => {
    console.error(...message)
    process.exit(1)
}

if (process.argv.length != 3) {
    die("Usage: node out2prg.js FILE.out")
}

const replaceExtension = (filename, ext) => {
    const idot = filename.lastIndexOf(".")
    return `${idot < 0 ? filename : filename.substr(0, idot)}.${ext}`
}
(async () => {
    const outfilename = process.argv[2]
    const data = await fs.readFile(outfilename)
    assert.equal(data.readUint16LE(0), 0xffff, `${outfilename} does not start with magic FFFF bytes`)
    const prgfilename = replaceExtension(outfilename, "prg")
    const prgfile = await fs.open(prgfilename, "w")
    try {
        let off = 2
        let nextAddress = null
        let bootAddr = null
        while (off < data.length) {
            const startAddr = data.readUint16LE(off)
            const endAddr = data.readUint16LE(off + 2)
            if (startAddr == endAddr && bootAddr == null) {
                bootAddr = startAddr
                console.log(`To start, type SYS${bootAddr}`)
                console.log(`Skipping byte: ${data.readUint8(off + 4)}`)
                off += 5
                continue
            }
            assert.ok(endAddr >= startAddr, `Invalid address range ${startAddr}:${endAddr}`)
            assert.ok(nextAddress == null || startAddr >= nextAddress, `Expected ${startAddr} to come after previous segment ending at ${nextAddress}`)
            const paddingLength = nextAddress == null ? 0 : startAddr - nextAddress
            const blobLength = endAddr - startAddr + 1
            if (nextAddress == null) {
                await fs.writeFile(prgfile, data.subarray(off, off + 2))
            }
            if (paddingLength > 0) {
                await fs.writeFile(prgfile, Buffer.alloc(paddingLength))
            }
            off += 4
            await fs.writeFile(prgfile, data.subarray(off, off + blobLength))
            nextAddress = endAddr + 1
            off += blobLength
        }
    } finally {
        await prgfile.close()
    }
})()