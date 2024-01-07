import fs from 'node:fs/promises'
import process from 'process'
import { parseHabitatObject } from "../neohabitat.js"

const buildJsonList = async (directory, jsonList) => {
    for (const dirent of (await fs.readdir(directory, { withFileTypes: true }))) {
        if (dirent.isFile() && dirent.name.endsWith(".json")) {
            jsonList.push(`${directory}/${dirent.name}`)
        } else if (dirent.isDirectory()) {
            await buildJsonList(`${directory}/${dirent.name}`, jsonList)
        }
    }
}

const buildContextMap = async (filenames) => {
    const contextMap = {}
    for (const filename of filenames) {
        const data = await fs.readFile(filename, { encoding: "utf-8" })
        const objects = parseHabitatObject(data)
        if (Array.isArray(objects)) {
            for (const obj of objects) {
                if (obj.type == "context") {
                    contextMap[obj.ref] = {
                        filename: filename.replace(/^\.\//, "db/"),
                        name: obj.name
                    }
                }
            }
        }
    }
    return contextMap
}

const saveContextMap = async () => {
    const filenames = []
    process.chdir(`${import.meta.dirname}/../db`)
    await buildJsonList(".", filenames)
    const contextMap = await buildContextMap(filenames)
    await fs.writeFile("contextmap.json", JSON.stringify(contextMap))
}

saveContextMap()
