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
    const imageFileMap = {}
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

export const regionShower = async ({ errorContainer, regionContainer, objectContainer, navContainer, observer }) => {
    const doc = docBuilder({ errorContainer })
    const mud = parse(await (await fetch("beta.mud")).text())
    const contextMap = await (await fetch("db/contextmap.json")).json()
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
                    const addDirection = (direction, ref) => {
                        if (ref) {
                            let name = ref
                            let href = null
                            if (contextMap[ref]) {
                                const ctx = contextMap[ref]
                                name = ctx.name ?? ctx.filename
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
                    continue
                }
                if (obj.type != "item") {
                    doc.showError(`Unknown object type ${obj.type}`, obj.name)
                    continue
                }
                if (regionRef && obj.in != regionRef) {
                    doc.showError(`Object is inside container ${obj.in}; not yet supported`, obj.name)
                    continue
                }
                const classname = javaTypeToMuddleClass(mod.type)
                const cls = mud.class[classname]
                if (!cls) {
                    doc.showError(`No class named ${classname}`, filename)
                    continue
                }
                const style = mod.style ?? 0
                const imageKey = classname == "class_head" ? "head" : "image"
                const imageRef = cls[imageKey][style]
                if (!imageRef) {
                    doc.showError(`Invalid style ${mod.style} for ${classname}`, filename)
                    continue
                }
                const image = mud[imageKey][imageRef.id]
                if (!image) {
                    doc.showError(`${classname} refers to invalid image ${imageRef.id}`, filename)
                    continue
                }
                const propFilename = remapImagePath(imageFileMap, image.filename)
                const prop = await decodeBinary(propFilename, decodeProp)
                if (prop.error) {
                    doc.showError(prop.error, filename)
                    continue
                }
                const colors = colorsFromOrientation(mod.orientation)
                const shouldFlip = ((mod.orientation ?? 0) & 0x01) != 0
                const middleOrientationBits = (mod.orientation ?? 0) & 0x06
                const grState = mod.gr_state ?? 0
                const [width, flipOffset] = image.arguments ?? [0,0]
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
                debug(`${mod.type} [${mod.x},${mod.y}]${shouldFlip ? " (Horizontally flipped)" : ""}`, `detail.html?f=${propFilename}`, element)
                regionContainer.appendChild(element)
            } catch (e) {
                doc.showError(e, obj.name)
            }
        }
    }
    return showRegion
}