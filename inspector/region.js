import { decodeProp } from "./codec.js"
import { html, catcher, direction, searchBox } from "./view.js"
import { useContext, useMemo } from "preact/hooks"
import { signal, computed } from "@preact/signals"
import { contextMap, betaMud, logError, promiseToSignal, until, useBinary, useHabitatJson, charset } from './data.js'
import { translateSpace, topLeftCanvasOffset, Scale, framesFromPropAnimation, frameFromCels, celsFromMask,
         compositeSpaces, animatedDiv, stringFromText, canvasForSpace, drawInSpace, canvasImage } from "./render.js"
import { signedByte } from "./codec.js"
import { colorsFromOrientation, javaTypeToMuddleClass, parseHabitatObject } from "./neohabitat.js"
import { getFile } from "./shim.js"

const imageFileMapSignal = signal({ 
    "super_trap.bin": "super_trap.bin",
    "trap0.bin": "trap0.bin",
    "trap1.bin": "trap1.bin",
    "loadState": "unloaded"
})

export const imageFileMap = () => {
    if (imageFileMapSignal.value.loadState == "unloaded") {
        const addToImageFileMap = async (indexFile) => {
            const response = await getFile(indexFile, { cache: "no-cache" })
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
                const response = await getFile(url)
                if (!response.ok) {
                    console.error(response)
                    throw new Error(`Failed to download ${url}: ${response.status}`)
                }
                const prop = decodeProp(fnAugment(new DataView(await response.arrayBuffer())))
                prop.isTrap = true
                return prop
            } catch (e) {
                logError(e, ref)
            }
        })(), null)
    }
    return trapCache[ref].value
}

export const imageSchemaFromMod = (mod) => {
    const mud = betaMud()
    if (mud == null || imageFileMap().loadState !== "loaded") {
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
    const args = image.arguments ?? [0, 0]
    return { filename: remapImagePath(image.filename), width: args[0], flipOffset: args[1] }
}

export const propFromMod = (mod, ref) => {
    const image = imageSchemaFromMod(mod)
    if (!image) {
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
            trapview.setUint8(celoff + 7, (mod.upper_left_x + mod.x) % 256)
            trapview.setUint8(celoff + 8, (mod.upper_right_x + mod.x) % 256)
            trapview.setUint8(celoff + 9, (mod.lower_left_x + mod.x) % 256)
            trapview.setUint8(celoff + 10, (mod.lower_right_x + mod.x) % 256)
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
                    data.setUint8(celoff + 7, (mod.upper_left_x + mod.x) % 256)
                    data.setUint8(celoff + 8, (mod.upper_right_x + mod.x) % 256)
                    data.setUint8(celoff + 9, (mod.lower_left_x + mod.x) % 256)
                    data.setUint8(celoff + 10, (mod.lower_right_x + mod.x) % 256)
                }
            }
            return data
        }
    }
    return fnAugment ? useTrap(ref, image.filename, fnAugment) : useBinary(image.filename, decodeProp, null)
}

const signedXCoordinate = (modX) => modX > 208 ? signedByte(modX) : modX
const zIndexFromObjectY = (modY) => modY > 127 ? (128 + (256 - modY)) : modY
const objectZComparitor = (obj1, obj2) => zIndexFromObjectY(obj1.mods[0].y) - zIndexFromObjectY(obj2.mods[0].y)

const propLocationFromObjectXY = (prop, modX, modY) => {
    return [prop.isTrap ? 0 : signedXCoordinate(modX) / 4, modY % 128, zIndexFromObjectY(modY)]
}

const colorsFromMod = (mod) => {
    const colors = colorsFromOrientation(mod.orientation)
    if (mod.ascii && mod.ascii.length > 0) {
        colors.bytes = mod.ascii
    } else if (mod.text) {
        colors.bytes = mod.text.split("").map(c => c.charCodeAt(0))
    }
    if (colors.bytes) {
        colors.charset = charset()
    }
    return colors
}

export const propFramesFromMod = (prop, mod, flipOverride = null) => {
    const colors = colorsFromMod(mod)
    const flipHorizontal = flipOverride ?? ((mod.orientation ?? 0) & 0x01) != 0
    const grState = mod.gr_state ?? 0
    if (prop.animations.length > 0) {
        return framesFromPropAnimation(prop.animations[grState], prop, { colors, flipHorizontal })
    } else {
        return [frameFromCels(celsFromMask(prop, prop.celmasks[grState]), { colors, flipHorizontal })]
    }
}

export const propFramesDependencies = (prop, mod, flipOverride = null) =>
    [prop, mod, colorsFromMod(mod).charset, flipOverride]

export const itemView = (props) => {
    return html`
        <${catcher} filename=${props.object.ref}>
            <${props.viewer} ...${props}/>
        <//>`
}

export const standaloneItemView = ({ object }) => {
    const mod = object.mods[0]
    const prop = propFromMod(mod, object.ref)
    if (!prop) {
        return null
    }
    return html`<${animatedDiv} frames=${propFramesFromMod(prop, mod)}/>`
}

export const positionInRegion = (space) => {
    const regionSpace = { minX: 0, minY: 0, maxX: 160 / 4, maxY: 127 }
    space = { ...space }
    if (space.minX >= regionSpace.maxX) {
        space.minX -= 64
        space.maxX -= 64
    }
    return topLeftCanvasOffset(regionSpace, space)
}

export const positionedInRegion = ({ space, z, children }) => {
    const scale = useContext(Scale)
    const [x, y] = positionInRegion(space)
    const style =`position: absolute; left: ${x * scale}px; top: ${y * scale}px; z-index: ${z}`
    return html`<div style=${style}>${children}</div>`
}

export const offsetsFromContainer = (containerProp, containerMod, mod) => {
    if (containerMod.type === "Glue") {
        return { x: signedByte(containerMod[`x_offset_${mod.y + 1}`]), 
                 y: signedByte(containerMod[`y_offset_${mod.y + 1}`]) }
    } else {
        return containerProp.contentsXY[mod.y]
    }
}

export const objectSpaceFromLayout = ({ x, y, frames }) =>
    translateSpace(compositeSpaces(frames), x, y)

export const containedItemLayout = (prop, mod, containerProp, containerMod, containerSpace) => {
    const [containerX, containerY, containerZ] = propLocationFromObjectXY(containerProp, containerMod.x, containerMod.y)
    const { x: offsetX, y: offsetY } = offsetsFromContainer(containerProp, containerMod, mod)
    // offsets are relative to `cel_x_origin` / `cel_y_origin`, which is in "habitat space" but with
    // the y axis inverted (see render.m:115-121)
    const flipHorizontal = (containerMod.orientation & 0x01) != 0
    const frames = propFramesFromMod(prop, mod, flipHorizontal)
    // if the contents are drawn in front, the container has its origin offset by the offset of its first cel.
    const originX = containerProp.contentsInFront ? containerSpace.xOrigin : 0
    const originY = containerProp.contentsInFront ? containerSpace.yOrigin : 0
    const x = (containerX - originX) + (flipHorizontal ? -offsetX : offsetX)
    const y = containerY - (offsetY + originY)
    const z = containerZ
    return { x, y, z, frames }
}

export const containedItemView = ({ object, containerProp, containerMod, containerSpace }) => {
    const mod = object.mods[0]
    const prop = propFromMod(mod, object.ref)
    if (!prop || containerProp.contentsXY.length < mod.y) {
        return null
    }
    const layout = useMemo(
        () => containedItemLayout(prop, mod, containerProp, containerMod, containerSpace),
        propFramesDependencies(prop, mod, containerMod.orientation))

    return html`
        <${positionedInRegion} space=${objectSpaceFromLayout(layout)} z=${layout.z}>
            <${animatedDiv} frames=${layout.frames}/>
        <//>`
}

export const itemInteraction = ({ mod, children }) => {
    const connection = mod.connection && contextMap()[mod.connection]
    if (connection) {
        return html`<a href="region.html?f=${connection.filename}">${children}</a>`
    }
    return children
}

export const regionItemLayout = (prop, mod) => {
    const [x, y, z] = propLocationFromObjectXY(prop, mod.x, mod.y)
    const frames = propFramesFromMod(prop, mod)
    return { x, y, z, frames }
}

export const regionItemView = ({ object, contents = [] }) => {
    const mod = object.mods[0]
    const prop = propFromMod(mod, object.ref)
    if (!prop) {
        return null
    }
    const layout = useMemo(() => regionItemLayout(prop, mod),
        propFramesDependencies(prop, mod))

    const container = html`
            <${positionedInRegion} key=${object.ref} space=${objectSpaceFromLayout(layout)} z=${layout.z}>
                <${itemInteraction} mod=${mod}>
                    <${animatedDiv} frames=${layout.frames}/>
                <//>
            </div>`
    if (prop.contentsXY.length > 0) {
        const children = contents.map(item => html`
            <${containedItemView} key=${item.ref} 
                                  object=${item} 
                                  containerProp=${prop} 
                                  containerMod=${mod}
                                  containerSpace=${layout.frames[0]}/>`)
        if (prop.contentsInFront) {
            return [container, ...children]
        } else {
            return [...children, container]
        }
    }
    return container
}

const sortObjects = (objects) => {
    const regionRef = objects.find(o => o.type === "context")?.ref
    return objects
        .filter(obj => obj.type === "item" && obj.in === regionRef)
        .sort(objectZComparitor)
        .map(obj => [obj, objects.filter(o => o.in === obj.ref)
                                 .sort((o1, o2) => o2.mods[0].y - o1.mods[0].y)])
}

export const regionView = ({ filename }) => {
    const scale = useContext(Scale)
    const objects = useHabitatJson(filename)

    return html`
        <div style="position: relative; line-height: 0px; width: ${320 * scale}px; height: ${128 * scale}px; overflow: hidden">
            ${sortObjects(objects).map(([obj, contents]) => html`
                <${itemView} key=${obj.ref}
                             viewer=${regionItemView} 
                             object=${obj} 
                             contents=${contents}/>`)}
        </div>`
}

export const generateRegionCanvas = async (filename) => {
    const objects = await until(() => useHabitatJson(filename), o => o.length > 0)
    await until(charset)
    const regionSpace = { minX: 0, minY: 0, maxX: 160 / 4, maxY: 127 }
    const canvas = canvasForSpace(regionSpace)
    const ctx = canvas.getContext("2d")
    const drawItem = async (obj, layoutFunc) => {
        const mod = obj.mods[0]
        const prop = await until(() => propFromMod(mod, obj.ref))
        const { x, y, frames } = layoutFunc(prop, mod)
        const frame = frames[0]
        if (frame?.canvas) {
            drawInSpace(ctx, frame.canvas, regionSpace, translateSpace(frame, x, y))
        }
        return [prop, mod, frame]
    }
    for (const [obj, contents] of sortObjects(objects)) {
        const [prop, mod, frame] = await drawItem(obj, regionItemLayout)
        for (const child of contents) {
            if (prop.contentsXY.length > child.mods[0].y) {
                await drawItem(child, (p, m) => containedItemLayout(p, m, prop, mod, frame))
            }
        }
        if (prop.contentsXY.length > 0 && contents.length > 0 && !prop.contentsInFront) {
            await drawItem(obj, regionItemLayout)
        }
    }
    return canvas
}

export const regionImageView = ({ filename }) => {
    const signal = useMemo(() => promiseToSignal(generateRegionCanvas(filename), null), [filename])
    if (signal.value) {
        return html`<${canvasImage} canvas=${signal.value}/>`
    }
}

const positionToCompassOffset = {
    top: 0,
    right: 1,
    bottom: 2,
    left: 3
}

export const locationLink = ({ refId, children }) => {
    if (refId && refId != '') {
        let name = refId
        let href = null
        const ctx = contextMap()[refId]
        if (ctx) {
            if (ctx.name && ctx.name.trim() != '') {
                name = ctx.name
            }
            // todo: customizable?
            href = `region.html?f=${ctx.filename}`
        }
        return html`
            <${Scale.Provider} value="0.5">
                <a href=${href} style="display: inline-block">
                    ${children}: ${name}<br/>
                    ${ctx ? html`<${regionImageView} filename=${ctx.filename}/>` : null}
                </a>
            <//>`
    } else {
        return null
    }
}

export const directionNav = ({ filename, position }) => {
    const objects = useHabitatJson(filename)
    const context = objects.find(obj => obj.type == "context")
    if (!context || !context.mods[0].neighbors) {
        return null
    }
    const mod = context.mods[0]
    
    // orientation:
    // 0 = top is west, 1 = top is north, 2 = top is east, 3 = top is south
    // neighbour list: North, East, South, West
    const ineighbor = (mod.orientation + positionToCompassOffset[position] + 3) & 0x03
    const compasses = ["North", "East", "South", "West"]
    const ref = mod.neighbors[ineighbor]
    return html`<${locationLink} refId=${ref}><span>${compasses[ineighbor]}</span><//>`
}

export const objectNav = ({ filename }) =>
    useHabitatJson(filename)
        .filter(o => o.type == "item" && o.mods[0].connection)
        .sort((o1, o2) => o1.mods[0].x - o2.mods[0].x)
        .map(o => html`
            <${locationLink} refId=${o.mods[0].connection}>
                <${itemView} viewer=${standaloneItemView} object=${o}/>
            <//>`)
    
const propFilter = (key, value) => {
    if (key != "bitmap" && key != "data" && key != "canvas" && key != "texture" && 
        !(key == "pattern" && typeof(value) === "object")) {
        return value
    }
}
export const debugDump = (value) => JSON.stringify(value, propFilter, 2)

export const singleObjectDetails = ({ obj }) => {
    const mod = obj.mods && obj.mods[0]
    if (mod && obj.type == "item") {
        obj = { computedColors: colorsFromOrientation(mod.orientation), ...obj}
        if (mod.ascii) {
            obj.debugString = stringFromText(mod.ascii)
        }
        const image = imageSchemaFromMod(mod)
        if (image) {
            const prop = propFromMod(mod, obj.ref)
            obj = { imageSchema: image, ...obj }
            if (prop && mod.gr_state) {
                if (prop.animations && prop.animations.length > mod.gr_state) {
                    obj.gr_state_animation = prop.animations[mod.gr_state]
                    obj.gr_state_animation_celmasks = prop.celmasks.slice(obj.gr_state_animation.startState, obj.gr_state_animation.endState + 1)
                }
                if (prop.celmasks && prop.celmasks.length > mod.gr_state) {
                    obj.gr_state_celmask = prop.celmasks[mod.gr_state]
                }
            }
            if (prop && prop.isTrap) {
                obj.prop = prop
            }
            return html`
                <a href="detail.html?f=${image.filename}">
                    ${image.filename}<br/><${itemView} object=${obj} viewer=${standaloneItemView}/>
                </a>
                <pre>${debugDump(obj)}</pre>`
        }
    }
}

export const objectDetails = ({ filename }) => {
    const objects = useHabitatJson(filename)
    const children = objects.flatMap(obj => {
        let summary = `${obj.name} (${obj.ref})`
        const mod = obj.mods && obj.mods[0]
        if (mod && obj.type == "item") {
            summary = `${summary}: ${mod.type} [${mod.x},${mod.y}]`
        }
        return html`
                <details>
                    <summary>${summary}</summary>
                    <${catcher} filename=${obj.ref}>
                        <${singleObjectDetails} obj=${obj}/>
                    <//>
                </details>`
    })
    return html`<div>${children}</div>`
}

export const allContextItems = computed(() => 
    Object
        .entries(contextMap())
        .map(([ref, val]) => ({ ref, label: `${val.name} (${val.filename})`, ...val })))

export const regionSearch = ({ label, onSelected }) =>
    html`<${searchBox} label=${label} items=${allContextItems.value} onSelected=${onSelected}/>`
