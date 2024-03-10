import { computed } from "@preact/signals"
import { html, direction, searchBox, catcher } from "./view.js"
import { regionImageView, itemView, standaloneItemView } from "./region.js"
import { contextMap, useJson, useHabitatJson } from "./data.js"
import { Scale } from "./render.js"
import { useState, useMemo } from "preact/hooks"

export const newPriorityQueue = () => {
    const prioqueue = []
    const queued = new Set()
    const indexForPriority = (prio) => {
        let imin = 0
        let ilim = prioqueue.length
        while (imin < ilim) {
            const i = imin + Math.floor((ilim - imin) / 2)
            const prioAtI = prioqueue[i][0]
            if (prioAtI == prio) {
                return i
            } else if (prioAtI < prio) {
                imin = i + 1
            } else {
                ilim = i
            }
        }
        return imin
    }

    const addToQueue = (ref, prio) => {
        queued.add(ref)
        const i = indexForPriority(prio)
        if (i < prioqueue.length && prioqueue[i][0] == prio) {
            prioqueue[i][1].push(ref)
        } else {
            prioqueue.splice(i, 0, [prio, [ref]])
        }
    }

    const adjustPriority = (ref, oldprio, newprio) => {
        if (oldprio !== undefined && queued.has(ref)) {
            const i = indexForPriority(oldprio)
            const list = prioqueue[i][1]
            list.splice(list.indexOf(ref), 1)
            if (list.length == 0) {
                prioqueue.splice(i, 1)
            }
        }
        addToQueue(ref, newprio)        
    }
    const popFromQueue = () => {
        const list = prioqueue[0][1]
        const ref = list.shift()
        if (list.length == 0) {
            prioqueue.shift()
        }
        queued.delete(ref)
        return ref
    }
    const isEmpty = () => prioqueue.length == 0

    return { prioqueue, queued, indexForPriority, addToQueue, adjustPriority, popFromQueue, isEmpty }
}

export const connectionsFromRef = (neighbormap, ref) => {
    if (!neighbormap[ref]) {
        return {orientation: 0, connections: {}}
    }
    const [orientation, n, e, s, w, connections] = neighbormap[ref]
    return { orientation, connections: {...connections, n, e, s, w} }
}

export const navigate = (start, dest, neighbormap) => {
    // we don't have any way of estimating distance, so we can't use A*. Dijkstra's algorithm should be fine though.
    const dist = {}
    const prev = {}
    dist[start] = 0
    const queue = newPriorityQueue()
    queue.addToQueue(start, 0)
    while (!queue.isEmpty()) {
        const ref = queue.popFromQueue()
        if (ref == dest) {
            break
        }
        for (const neighbor of Object.values(connectionsFromRef(neighbormap, ref).connections)) {
            if (neighbor) {
                const newdist = dist[ref] + 1
                const olddist = dist[neighbor]
                if (olddist === undefined || newdist < olddist) {
                    dist[neighbor] = newdist
                    prev[neighbor] = ref
                    queue.adjustPriority(neighbor, olddist, newdist)
                }
            }
        }
    }
    const path = []
    let current = dest
    while (current) {
        path.unshift(current)
        current = prev[current]
    }
    return path
}

export const allContextItems = computed(() => 
    Object
        .entries(contextMap())
        .map(([ref, val]) => ({ ref, label: `${val.name} (${val.filename})`, ...val })))

export const regionSearch = ({ label, onSelected }) =>
    html`<${searchBox} label=${label} items=${allContextItems.value} onSelected=${onSelected}/>`

export const ctxItemFromRef = (ref) => {
    const item = contextMap()[ref]
    if (item) {
        return { ref, ...item }
    } else {
        return null
    }
}

const ctxItemLink = ({ item }) => item ? html`
    <a href="region.html?f=${item.filename}">
        ${item.name}<br/>
        <${catcher} filename=${item.filename}><${regionImageView} filename=${item.filename}/><//>
    </a>` : null

const moveNames = { n: "north", e: "east", w: "west", s: "south" }
const navMove = ({ fromref, dir, orientation }) => {
    const compass = moveNames[dir]
    if (compass) {
        return html`<${direction} compass=${compass} orientation=${orientation}/>`
    }
    const filename = contextMap()[fromref]?.filename
    if (filename) {
        const obj = useHabitatJson(filename).find(o => o.ref == dir)
        if (obj) {
            return html`
                <span>through 
                    <div style="display: inline-block">
                        <${Scale.Provider} value="1">
                            <${itemView} object=${obj} viewer=${standaloneItemView}/>
                        <//>
                    </div>
                </span>`
        }
    }
}

export const directions = ({ start, end }) => {
    if (!start || !end) {
        return null
    }
    const neighbormap = useJson("db/neighbormap.json", {})
    const path = useMemo(() => {
        return navigate(start.ref, end.ref, neighbormap)
    }, [start, end, neighbormap])
    if (path.length < 2) {
        return html`<i>Sorry, there's no way to get to ${end.name} from ${start.name}!</i>`
    }
    const directions = []
    for (let ipath = 0; ipath < (path.length - 1); ipath ++) {
        const fromref = path[ipath] 
        const toref = path[ipath + 1]
        const to = contextMap()[toref]
        const { orientation, connections } = connectionsFromRef(neighbormap, fromref)
        const dir = Object.entries(connections).find(([dir, ref]) => ref == toref)[0]
        directions.push(html`
            <li style="flex: 0 0 400px;">Go <${navMove} dir=${dir} orientation=${orientation} fromref=${fromref}/> towards <${ctxItemLink} item=${to}/></li>`)
    }
    return html`
            <ul style="display: flex; flex-wrap: wrap; gap: 10px;">
                <li style="flex: 0 0 400px;">Starting from <${ctxItemLink} item=${start}/></li>
                ${directions}
            </ul>`
}

export const navigationView = ({ startFilename }) => {
    const startRegion = useHabitatJson(startFilename).find(o => o.type === "context")
    const start = ctxItemFromRef(startRegion?.ref)
    const [end, setEnd] = useState(null)

    return html`
    <${Scale.Provider} value="1">
        <p>
            <${regionSearch} label="Navigate to region:" onSelected=${setEnd}/>
            ${end ? html`<a href="javascript:;" onClick=${() => setEnd(null)}>Clear</a>` : null}
        </p>
        <p><${ctxItemLink} item=${end}/></p>
        <p><${directions} start=${start} end=${end}/></p>
    <//>`
}
