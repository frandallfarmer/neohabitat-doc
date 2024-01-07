// adapted from populateModels.js in neohabitat

const replacements = [
    [/UP/g, '"|"'],
    [/DOWN/g, '"}"'],
    [/LEFT/g, '"~"'],
    [/RIGHT/g, '"\u007f"'],
    [/SPACE/g, '" "'],
    [/WEST/g, '0'],
    [/SOUTH/g, '1'],
    [/EAST/g, '2'],
    [/NORTH/g, '3']
];

const joinReplacements = {
    UP: '|',
    DOWN: '}',
    LEFT: '~',
    RIGHT: '\u007f',
    SPACE: ' ',
    WEST: '0',
    SOUTH: '1',
    EAST: '2',
    NORTH: '3'
};

const replacementJoinRegex = /((([A-Z]+\s?\+\s?)+)([A-Z]+\s?)+)/;
const stringJoinRegex = /(("([^"]|\\")*"\s*\+\s*)+"([^"]|\\")*")/g;

function templateStringJoins(data) {
    if (data.search(/\+/) != -1) {
        return data.replace(/(\n)/g, '').replace(stringJoinRegex,
            function(origText, offset, string) {
                var replacementText = [];
                var splitText = origText.split('+');
                for (var textLineId in splitText) {
                    var trimTextLine = splitText[textLineId].trim();
                    var quotesRemoved = trimTextLine.replace(/(^")|("$)/g, '');
                    replacementText.push(quotesRemoved);
                }
                return `"${replacementText.join('')}"`
            }
        );
    }
    return data;
}

function templateConstantJoins(data) {
    return data.replace(replacementJoinRegex, function(origText, offset, string) {
        var replacementText = [];
        var splitText = origText.split('+');
        for (var habConstId in splitText) {
            var trimHabConst = splitText[habConstId].trim();
            if (trimHabConst in joinReplacements) {
                replacementText.push(joinReplacements[trimHabConst]);
            }
        }
        return `"${replacementText.join('')}"`
    });
}

function templateHabitatObject(data) {
    var templated = templateConstantJoins(data);
    for (var replacementId in replacements) {
        var replacement = replacements[replacementId];
        var regex = replacement[0];
        var replacementText = replacement[1];
        templated = templated.replace(regex, replacementText);
    }
    return templateStringJoins(templated);
}

export function parseHabitatObject(data) {
    return JSON.parse(templateHabitatObject(data))
}

export function colorsFromOrientation(orientation) {
    const colorVal = (orientation & 0x78) >> 3
    if (orientation & 0x80) {
        return { wildcard: colorVal }
    } else {
        return { pattern: colorVal }
    }
}

const javaTypeOverrides = {
    Teleport: "class_teleport_booth",
    "Windup_toy": "class_wind_up_toy"
}

export const javaTypeToMuddleClass = (type) => {
    return javaTypeOverrides[type] ?? `class_${type.toLowerCase()}`
}

export const navigate = (start, dest, neighbormap) => {
    // we don't have any way of estimating distance, so we can't use A*. Dijkstra's algorithm should be fine though.
    const dist = {}
    const prev = {}
    dist[start] = 0
    const prioqueue = [[0, [start]]]
    const queued = new Set([start])
    const indexForPriority = (prio) => {
        let imin = 0
        let ilim = prioqueue.length
        while (imin < ilim) {
            const i = imin + Math.floor((ilim - imin) / 2)
            const prioAtI = prioqueue[i][0]
            if (prioAtI == prio) {
                return i
            } else if (prioAtI < prio) {
                ilim = i
            } else {
                imin = i + 1
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
    while (prioqueue.length > 0) {
        const ref = popFromQueue()
        if (ref == dest) {
            break
        }
        const neighbors = neighbormap[ref]
        for (const neighbor of neighbors) {
            if (neighbor !== "") {
                const newdist = dist[ref] + 1
                const olddist = dist[neighbor]
                if (olddist === undefined || newdist < olddist) {
                    dist[neighbor] = newdist
                    prev[neighbor] = ref
                    adjustPriority(neighbor, olddist, newdist)
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
