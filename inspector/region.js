import { decodeProp } from "./codec.js"
import { parse } from "./mudparse.js"
import { translateSpace, topLeftCanvasOffset } from "./render.js"
import { docBuilder, decodeBinary, append, group, textNode, wrapLink, propAnimationShower, celmaskShower } from "./show.js"
import { parseHabitatObject, colorsFromOrientation, javaTypeToMuddleClass } from "./neohabitat.js"

const addToImageFileMap = async (indexFile, imageFileMap) => {
    const response = await fetch(indexFile, { cache: "no-cache" })
    const paths = await response.json()
    for (const path of paths) {
        const filename = path.replace(/.*\//, "")
        if (!imageFileMap[filename]) {
            imageFileMap[filename] = path
        }
    }
}

const buildImageFileMap = async () => {
    const imageFileMap = { 
        "super_trap.bin": "super_trap.bin",
        "trap0.bin": "trap0.bin",
        "trap1.bin": "trap1.bin"
    }
    await addToImageFileMap("heads.json", imageFileMap)
    await addToImageFileMap("props.json", imageFileMap)
    await addToImageFileMap("misc.json", imageFileMap)
    await addToImageFileMap("beta.json", imageFileMap)
    return imageFileMap
}

const remapImagePath = (imageFileMap, path) => {
    const filename = path.replace(/.*\//, "")
    return imageFileMap[filename] ?? path
}

export const addContextNavLinks = (navContainer, mod, contextMap) => {
    const addDirection = (direction, ref) => {
        if (ref && ref != '') {
            let name = ref
            let href = null
            if (contextMap[ref]) {
                const ctx = contextMap[ref]
                if (ctx.name && ctx.name.trim() != '') {
                    name = ctx.name
                }
                href = `region.html?f=${ctx.filename}`
            }
            const link = href ? wrapLink(textNode(name), href) : textNode(name)
            append(navContainer, group("li", `${direction}: `, link))
        }
    }
    const [n, e, s, w] = mod.neighbors ?? []
    addDirection("North", n)
    addDirection("East", e)
    addDirection("South", s)
    addDirection("West", w)
}

export const propFromMod = async (mod, mud, imageFileMap) => {
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
    const propFilename = remapImagePath(imageFileMap, image.filename)
    const decoder = (data) => {
        if (classname == "class_super_trapezoid" && mod.pattern) {
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
            return decodeProp(trapview)
        } else if (classname == "class_trapezoid") {
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
            return decodeProp(data)
        } else {
            return decodeProp(data)
        }
    }
    const prop = await decodeBinary(propFilename, decoder)
    if (prop.error) {
        throw prop.error
    }
    return prop
}

export const renderMod = (mod, prop) => {
    const colors = colorsFromOrientation(mod.orientation)
    const shouldFlip = ((mod.orientation ?? 0) & 0x01) != 0 // TODO
    const grState = mod.gr_state ?? 0
    const render = prop.animations.length > 0 ? propAnimationShower(prop, colors)(prop.animations[grState])
                                              : celmaskShower(prop, colors)(prop.celmasks[grState])
    const element = render.element
    const regionSpace = { minX: 0, minY: 0, maxX: 160 / 4, maxY: 127 }
    const objectSpace = translateSpace(render, mod.x / 4, mod.y % 128)
    const [x, y] = topLeftCanvasOffset(regionSpace, objectSpace)
    element.style.position = "absolute"
    element.style.left = `${x * 3}px`
    element.style.top = `${y * 3}px`
    element.style.zIndex = mod.y > 127 ? (128 + (256 - mod.y)) : mod.y
    return element
}

export const regionShower = async ({ errorContainer, regionContainer, objectContainer, navContainer, observer }) => {
    const doc = docBuilder({ errorContainer })
    const mud = parse(await (await fetch("beta.mud")).text())
    const contextMap = await (await fetch("db/contextmap.json", { cache: "no-cache" })).json()
    const imageFileMap = await buildImageFileMap()

    const debug = (msg, href, element) => {
        const node = group("li", wrapLink(textNode(msg), href))
        if (element) {
            node.addEventListener("mouseenter", () => { element.style.border = "2px solid red"; element.style.margin = "-2px" })
            node.addEventListener("mouseleave", () => { element.style.border = ""; element.style.margin = "" })
        }
        objectContainer.appendChild(node)
    }
    
    const showRegion = async (filename) => {
        regionContainer.innerHTML = ''
        objectContainer.innerHTML = ''
        navContainer.innerHTML = ''

        const objects = parseHabitatObject(await (await fetch(filename, { cache: "no-cache" })).text())

        if (observer) observer('filename', filename)

        let regionRef = null
        for (const obj of objects) {
            try {
                if (observer) observer("object", obj)
                if (!obj.mods || obj.mods.length == 0) {
                    continue
                }
                const mod = obj.mods[0]
                if (obj.type == "context") {
                    regionRef = obj.ref
                    addContextNavLinks(navContainer, mod, contextMap)
                    continue
                }
                if (obj.type != "item") {
                    throw new Error(`Unknown object type ${obj.type}`)
                }
                if (regionRef && obj.in != regionRef) {
                    throw new Error(`Object is inside container ${obj.in}; not yet supported`)
                }
                const prop = await propFromMod(mod, mud, imageFileMap)
                const element = renderMod(mod, prop)
                debug(`${mod.type} [${mod.x},${mod.y}]`, `detail.html?f=${prop.filename}`, element)
                regionContainer.appendChild(element)
            } catch (e) {
                doc.showError(e, `${obj.name} (${obj.ref})`)
            }
        }
    }
    return showRegion
}