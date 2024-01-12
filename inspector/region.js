import { decodeProp } from "./codec.js"
import { html, catcher, direction } from "./view.js"
import { useContext, useMemo } from "preact/hooks"
import { signal } from "@preact/signals"
import { contextMap, betaMud, logError, promiseToSignal, useBinary, useHabitatJson } from './data.js'
import { translateSpace, topLeftCanvasOffset, Scale, framesFromPropAnimation, frameFromCels, celsFromMask, compositeSpaces, animation } from "./render.js"
import { colorsFromOrientation, javaTypeToMuddleClass } from "./neohabitat.js"

const imageFileMapSignal = signal({ 
    "super_trap.bin": "super_trap.bin",
    "trap0.bin": "trap0.bin",
    "trap1.bin": "trap1.bin",
    "loadState": "unloaded"
})

export const imageFileMap = () => {
    if (imageFileMapSignal.value.loadState == "unloaded") {
        const addToImageFileMap = async (indexFile) => {
            const response = await fetch(indexFile, { cache: "no-cache" })
            const paths = await response.json()
            const newPaths = {}
            for (const path of paths) {
                const filename = path.replace(/.*\//, "")
                newPaths[filename] = path
            }
            imageFileMapSignal.value = { ...newPaths, ...imageFileMapSignal.value }
        }
        
        const buildImageFileMap = async () => {
            imageFileMapSignal.value = { ...imageFileMapSignal.value, loadState: "loading" }
            await Promise.all([
                addToImageFileMap("heads.json"),
                addToImageFileMap("props.json"),
                addToImageFileMap("misc.json"),
                addToImageFileMap("beta.json")
            ])
            imageFileMapSignal.value = { ...imageFileMapSignal.value, loadState: "loaded" }
        }
        buildImageFileMap()
    }
    return imageFileMapSignal.value
}

const remapImagePath = (path) => {
    const filename = path.replace(/.*\//, "")
    const map = imageFileMap()
    return map.loadState == "loaded" ? (map[filename] ?? filename) : map[filename]
}

const trapCache = {}
const useTrap = (ref, url, fnAugment) => {
    if (!trapCache[ref]) {
        trapCache[ref] = promiseToSignal((async () => {
            try {
                const response = await fetch(url)
                if (!response.ok) {
                    console.error(response)
                    throw new Error(`Failed to download ${url}: ${response.status}`)
                }
                return decodeProp(fnAugment(new DataView(await response.arrayBuffer())))
            } catch (e) {
                logError(e, ref)
            }
        })(), null)
    }
    return trapCache[ref].value
}

export const propFilenameFromMod = (mod) => {
    const mud = betaMud()
    if (mud == null) {
        // we're not ready to parse this yet
        return null
    }
    const classname = javaTypeToMuddleClass(mod.type)
    const cls = mud.class[classname]
    if (!cls) {
        throw new Error(`No class named ${classname}`)
    }

    const style = mod.style ?? 0
    const imageKey = classname == "class_head" ? "head" : "image"
    const imageRef = cls[imageKey][style]
    if (!imageRef) {
        throw new Error(`Invalid style ${mod.style} for ${classname}`)
    }
    const image = mud[imageKey][imageRef.id]
    if (!image) {
        throw new Error(`${classname} refers to invalid image ${imageRef.id}`)
    }
    return remapImagePath(image.filename)
}

export const propFromMod = (mod, ref) => {
    const propFilename = propFilenameFromMod(mod)
    if (!propFilename) {
        // not ready to parse yet
        return null
    }
    const classname = javaTypeToMuddleClass(mod.type)
    let fnAugment = null
    if (classname == "class_super_trapezoid" && mod.pattern) {
        fnAugment = (data) => {
            const superdata = new Uint8Array(data.byteLength + mod.pattern.length + 2)
            const celoff = data.byteLength - 11
            superdata.set(new Uint8Array(data.buffer))
            superdata.set(mod.pattern, data.byteLength + 2)
            const trapview = new DataView(superdata.buffer)
            trapview.setUint8(celoff + 1, mod.height)
            trapview.setUint8(celoff + 7, mod.upper_left_x)
            trapview.setUint8(celoff + 8, mod.upper_right_x)
            trapview.setUint8(celoff + 9, mod.lower_left_x)
            trapview.setUint8(celoff + 10, mod.lower_right_x)
            trapview.setUint8(celoff + 11, mod.pattern_x_size)
            trapview.setUint8(celoff + 12, mod.pattern_y_size)
            return trapview
        }
    } else if (classname == "class_trapezoid") {
        fnAugment = (data) => {
            const celCount = (data.getUint8(0) & 0x3f) + 1
            for (let icel = 0; icel < celCount; icel ++) {
                const celoff = data.getUint16(7 + celCount + (icel * 2), true)
                data.setUint8(celoff + 1, mod.height)
                if (icel == 0) {            
                    data.setUint8(celoff + 7, mod.upper_left_x)
                    data.setUint8(celoff + 8, mod.upper_right_x)
                    data.setUint8(celoff + 9, mod.lower_left_x)
                    data.setUint8(celoff + 10, mod.lower_right_x)
                }
            }
            return data
        }
    }
    return fnAugment ? useTrap(ref, propFilename, fnAugment) : useBinary(propFilename, decodeProp, null)
}

export const itemView = ({ object }) => {
    const scale = useContext(Scale)
    const mod = object.mods[0]
    const prop = propFromMod(mod, object.ref)
    if (!prop) {
        return null
    }
    const shouldFlip = ((mod.orientation ?? 0) & 0x01) != 0 // TODO
    const grState = mod.gr_state ?? 0
    const regionSpace = { minX: 0, minY: 0, maxX: 160 / 4, maxY: 127 }
    const frames = useMemo(() => {
        const colors = colorsFromOrientation(mod.orientation)
        if (prop.animations.length > 0) {
            return framesFromPropAnimation(prop.animations[grState], prop, colors)
        } else {
            return [frameFromCels(celsFromMask(prop, prop.celmasks[grState]), colors)]
        }
    }, [prop, grState, mod.orientation])
    const objectSpace = translateSpace(compositeSpaces(frames), mod.x / 4, mod.y % 128)
    const [x, y] = topLeftCanvasOffset(regionSpace, objectSpace)
    return html`
        <div id=${object.ref}
             style="position: absolute; left: ${x * scale}px; top: ${y * scale}px; 
                    z-index: ${mod.y > 127 ? (128 + (256 - mod.y)) : mod.y}">
            <${animation} frames=${frames}/>
        </div>`
}

export const regionView = ({ filename }) => {
    const scale = useContext(Scale)
    const objects = useHabitatJson(filename, [])
    let regionRef = null
    const items = objects.flatMap(obj => {
        if (obj.type == "context") {
            regionRef = obj.ref
        } else if (obj.type != "item") {
            logError(`Unknown object type ${obj.type}`, obj.ref)
        } else if (regionRef && obj.in != regionRef) {
            logError(`Object is inside container ${obj.in}; not yet supported`, obj.ref)
        } else {
            return [html`<${catcher} key=${obj.ref} filename=${obj.ref}>
                            <${itemView} object=${obj}/>
                         <//>`]
        }
        return []
    })
    return html`
        <div style="position: relative; width: ${320 * scale}px; height: ${128 * scale}px; overflow: hidden">
            ${items}
        </div>`
}

export const regionNav = ({ filename }) => {
    const objects = useHabitatJson(filename, [])
    const context = objects.find(obj => obj.type == "context")
    if (!context || !context.mods[0].neighbors) {
        return null
    }
    const mod = context.mods[0]
    const compasses = ["North", "East", "South", "West"]
    const directions = compasses.flatMap((compass, ineighbor) => {
        const ref = mod.neighbors[ineighbor]
        if (ref && ref != '') {
            let name = ref
            let href = null
            const ctx = contextMap()[ref]
            if (ctx) {
                if (ctx.name && ctx.name.trim() != '') {
                    name = ctx.name
                }
                // todo: customizable?
                href = `region.html?f=${ctx.filename}`
            }
            return [html`
                <li>
                    <div>
                        <${direction} compass=${compass} orientation=${mod.orientation}/>:
                        <a href=${href}>${name}</a>
                    </div>
                    ${ctx ? html`<${Scale.Provider} value="1"><${regionView} filename=${ctx.filename}/><//>` : null}
                </li>`]
        }
        return []
    })
    return html`<ul>${directions}</ul>`
}

export const objectDetails = ({ filename }) => {
    const objects = useHabitatJson(filename, [])
    const children = objects.flatMap(obj => {
        let summary = `${obj.name} (${obj.ref})`
        let details = null
        const mod = obj.mods && obj.mods[0]
        if (mod && obj.type == "item") {
            summary = `${summary}: ${mod.type} [${mod.x},${mod.y}]`
            const propFilename = propFilenameFromMod(mod)
            if (propFilename) {
                details = html`<a href="detail.html?f=${propFilename}">${propFilename}</a>`
            }
        }
        return html`
                <details>
                    <summary>${summary}</summary>
                    ${details}
                    <pre>${JSON.stringify(obj, null, 2)}</pre>
                </details>`
    })
    return html`<div>${children}</div>`
}
