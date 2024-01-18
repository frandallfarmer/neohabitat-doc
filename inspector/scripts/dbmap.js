import fs from 'node:fs/promises'
import process from 'process'
import { parse } from '../mudparse.js'
import { parseHabitatObject, javaTypeToMuddleClass } from "../neohabitat.js"

async function* allNeohabitatObjects(directory = ".") {
    for (const dirent of (await fs.readdir(directory, { withFileTypes: true }))) {
        if (dirent.isFile() && dirent.name.endsWith(".json")) {
            const data = await fs.readFile(`${directory}/${dirent.name}`, { encoding: "utf-8" })
            const objects = parseHabitatObject(data)
            if (Array.isArray(objects)) {
                yield* objects
            }
        } else if (dirent.isDirectory()) {
            yield* allNeohabitatObjects(`${directory}/${dirent.name}`)
        }
    }
}

process.chdir(`${import.meta.dirname}/../db`)
const refToNeighbors = {}
for await (const obj of allNeohabitatObjects()) {
    if (obj.type == "context" && obj.mods && obj.mods[0].neighbors) {
        refToNeighbors[obj.ref] = [obj.mods[0].orientation, ...obj.mods[0].neighbors]
    } else if (obj.type == "item" && obj.mods && obj.mods[0].connection) {
        const neighborlist = refToNeighbors[obj.in]
        if (!neighborlist) {
            console.error(`Item ${obj.ref} has a connection ${obj.mods[0].connection} but is not in the room`)
            continue
        }
        if (neighborlist.length == 5) {
            neighborlist.push({})
        }
        neighborlist[5][obj.ref] = obj.mods[0].connection
    }
}

await fs.writeFile("neighbormap.json", JSON.stringify(refToNeighbors))
