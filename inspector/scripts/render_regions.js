import fs from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { generateRegionCanvas } from '../region.js'

async function* jsonPaths(baseDir, prefix = "") {
    for (const dirent of (await fs.readdir(`${baseDir}/${prefix}`, { withFileTypes: true }))) {
        if (dirent.isFile() && dirent.name.endsWith(".json")) {
            yield [prefix, dirent.name]
        } else if (dirent.isDirectory()) {
            yield* jsonPaths(baseDir, `${prefix}${dirent.name}/`)
        }
    }
}

process.chdir(`${import.meta.dirname}/../`)
const dbPath = `${import.meta.dirname}/../db`
const outputPath = `${import.meta.dirname}/../regions`

for await (const [prefix, filename] of jsonPaths(dbPath)) {
    try {
        const path = `${prefix}${filename}`
        const canvas = await generateRegionCanvas(`${dbPath}/${path}`)
        const outPath = path.replace(/\.json$/, ".png")
        await fs.mkdir(`${outputPath}/${prefix}`, { recursive: true })
        await pipeline(
            canvas.createPNGStream(),
            createWriteStream(`${outputPath}/${outPath}`)
        )
    } catch (e) {
        console.error(`Failed to render ${prefix}${filename}`, e)
    }
}
