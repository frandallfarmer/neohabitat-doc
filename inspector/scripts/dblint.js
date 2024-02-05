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
const mud = parse(await fs.readFile("../beta.mud", { encoding: "utf-8" }))

const trapezoidChecker = async () => {
    const classmap = {}
    const trapcounts = {}
    for await (const obj of allNeohabitatObjects()) {
        if (obj.type == 'item') {
            const type = obj.mods[0].type
            classmap[type] = javaTypeToMuddleClass(type)
        }
        if (obj.type == 'item' && obj.mods[0].type == "Trapezoid") {
            const gr_state = obj.mods[0].gr_state ?? 0
            if (gr_state != 0) {
                console.log(`Non-trapezoidal trapezoid: ${obj.ref} ${gr_state}`)
            }
            const traptype = obj.mods[0].trapezoid_type ?? "undef"
            trapcounts[traptype] = (trapcounts[traptype] ?? 0) + 1
        }
    }
    console.log("Trapezoid counts:", trapcounts)

    for (const [javatype, muddletype] of Object.entries(classmap)) {
        if (!mud.class[muddletype]) {
            console.error(`No matching class ${muddletype} for ${javatype}`)
        }
    }
}

const defaultGatherer = async () => {
    const defaults = {}
    for await (const obj of allNeohabitatObjects()) {
        if (obj.type == 'item') {
            const type = obj.mods[0].type
            if (!defaults[type]) {
                defaults[type] = {}
            }
            for (const [k, v] of Object.entries(obj.mods[0])) {
                if (k !== "style" && k !== "gr_state" && k !== "orientation" && k !== "x" && k !== "y" && 
                    k !== "type" && defaults[type][k] === undefined) {
                    defaults[type][k] = v
                }
            }
        }
    }
    console.log(JSON.stringify(defaults, null, 2))
}

await defaultGatherer()