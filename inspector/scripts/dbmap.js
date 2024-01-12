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
const clusters = []
const refToCluster = {}
const refToNeighbors = {}
const lowestCluster = (clusterid) => {
    while(clusters[clusterid] !== clusterid) {
        if (clusters[clusterid] > clusterid) {
            console.error(`${clusterid} < ${clusters[clusterid]}`)
        }
        clusterid = clusters[clusterid]
    }
    return clusterid
}
for await (const obj of allNeohabitatObjects()) {
    if (obj.type == "context" && obj.mods && obj.mods[0].neighbors) {
        refToNeighbors[obj.ref] = [obj.mods[0].orientation, ...obj.mods[0].neighbors]
        const neighbors = obj.mods[0].neighbors.filter((r) => r && r != "")
        const knownClusters = new Set([refToCluster[obj.ref], ...neighbors.map((r) => refToCluster[r])].filter((r) => r !== undefined))
        let clusterid
        if (knownClusters.size == 0) { // create new cluster
            clusterid = clusters.length
            clusters.push(clusterid)
        } else {
            // merge all clusters with lowest known cluster
            clusterid = lowestCluster(Math.min(...knownClusters))
            for (let id of knownClusters) {
                while (clusters[id] != clusterid) {
                    const nextId = clusters[id]
                    clusters[id] = clusterid
                    id = nextId
                }
            }
        }
        refToCluster[obj.ref] = clusterid
        for (const ref of neighbors) {
            refToCluster[ref] = clusterid
        }
    }
}

const clusterToRefs = {}
for (const [ref, cluster] of Object.entries(refToCluster)) {
    const clusterid = `${lowestCluster(cluster)}`
    const refs = clusterToRefs[clusterid] ?? []
    refs.push(ref)
    clusterToRefs[clusterid] = refs
}

for (const [cluster, refs] of Object.entries(clusterToRefs)) {
    console.log(`Cluster ${cluster}: ${refs.length} (entry point: ${refs[0]})`)
}

await fs.writeFile("neighbormap.json", JSON.stringify(refToNeighbors))
