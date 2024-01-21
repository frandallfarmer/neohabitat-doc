import { html } from "./view.js"
import { createContext } from "preact"
import { useState, useEffect, useContext } from "preact/hooks"
import { emptyBitmap, horizontalLine } from "./codec.js"
import { logError } from "./data.js"

// C64 RGB values taken from https://www.c64-wiki.com/wiki/Color
const c64Colors = [
    0x000000, 0xffffff, 0x880000, 0xaaffee, 0xcc44cc, 0x00cc55, 
    0x0000aa, 0xeeee77, 0xdd8855, 0x664400, 0xff7777, 0x333333,
    0x777777, 0xaaff66, 0x0088ff, 0xbbbbbb
]

// from paint.m:447
const celPatterns = [
    [0x00, 0x00, 0x00, 0x00],
    [0xaa, 0xaa, 0xaa, 0xaa],
    [0xff, 0xff, 0xff, 0xff],
    [0xe2, 0xe2, 0xe2, 0xe2],
    [0x8b, 0xbe, 0x0f, 0xcc],
    [0xee, 0x00, 0xee, 0x00],
    [0xf0, 0xf0, 0x0f, 0x0f],
    [0x22, 0x88, 0x22, 0x88],
    [0x32, 0x88, 0x23, 0x88],
    [0x00, 0x28, 0x3b, 0x0c],
    [0x33, 0xcc, 0x33, 0xcc],
    [0x08, 0x80, 0x0c, 0x80],
    [0x3f, 0x3f, 0xf3, 0xf3],
    [0xaa, 0x3f, 0xaa, 0xf3],
    [0xaa, 0x00, 0xaa, 0x00],
    [0x55, 0x55, 0x55, 0x55]
]

const makeCanvas = (w, h) => {
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    canvas.style.imageRendering = "pixelated"
    canvas.style.width = `${w * 3}px`
    canvas.style.height = `${h * 3}px`
    return canvas    
}

export const canvasForSpace = ({ minX, maxX, minY, maxY }) => makeCanvas((maxX - minX) * 8, maxY - minY)

export const defaultColors = {
    wildcard: 6,
    skin: 10,
    pattern: 15
}

export const canvasFromBitmap = (bitmap, colors = {}) => {
    if (bitmap.length == 0 || bitmap[0].length == 0) {
        return null
    }
    const { wildcard, pattern, skin } = { ...defaultColors, ...colors }
    const patternColors = [6, wildcard, 0, skin]
    const h = bitmap.length
    const w = bitmap[0].length * 2
    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext("2d")
    const img = ctx.createImageData(w, h)

    const putpixel = (x, y, r, g, b, a) => {
        const i = (x * 8) + (y * w * 4)
        img.data[i]     = r
        img.data[i + 1] = g
        img.data[i + 2] = b
        img.data[i + 3] = a
        img.data[i + 4] = r
        img.data[i + 5] = g
        img.data[i + 6] = b
        img.data[i + 7] = a
    }

    for (let y = 0; y < bitmap.length; y ++) {
        const line = bitmap[y]
        // TODO: What is pattern 255?
        const patbyte = celPatterns[pattern < 0 || pattern > 15 ? 15 : pattern][y % 4]
        for (let x = 0; x < line.length; x ++) {
            const pixel = line[x]
            let color = null
            if (pixel == 0) { // transparent
                putpixel(x, y, 0, 0, 0, 0)
            } else if (pixel == 1) { // wild
                const shift = (x % 4) * 2
                color = patternColors[(patbyte & (0xc0 >> shift)) >> (6 - shift)]
            } else {
                color = patternColors[pixel]
            }
            if (color != null) {
                const rgb = c64Colors[color]
                putpixel(x, y, (rgb & 0xff0000) >> 16, (rgb & 0xff00) >> 8, rgb & 0xff, 0xff)
            }
        }
    }
    ctx.putImageData(img, 0, 0)
    return canvas
}

export const celsFromMask = (prop, celMask) => {
    const cels = []
    for (let icel = 0; icel < 8; icel ++) {
        const celbit = 0x80 >> icel
        if ((celMask & celbit) != 0) {
            cels.push(prop.cels[icel])
        }
    }
    return cels
}

// canvas coordinate spaces have the top-left corner at 0,0, x increasing to the right, y increasing down.
// habitat coordinate spaces have the object origin at 0,0, x increasing to the right, y increasing _up_.
// In addition, 1 unit horizontally in habitat coordinate space corresponds to 8 pixels horizontally in canvas space.
export const translateSpace = ({ minX, maxX, minY, maxY, ...extra }, dx, dy) => {
    return { ...extra, minX: minX + dx, maxX: maxX + dx, minY: minY + dy, maxY: maxY + dy }
}

export const compositeSpaces = (spaces) => {
    return { minX: Math.min(...spaces.map((f) => f ? f.minX : Math.min())),
             maxX: Math.max(...spaces.map((f) => f ? f.maxX : Math.max())),
             minY: Math.min(...spaces.map((f) => f ? f.minY : Math.min())),
             maxY: Math.max(...spaces.map((f) => f ? f.maxY : Math.max())) }
}

export const topLeftCanvasOffset = (outerSpace, innerSpace) => {
    if (innerSpace) {
        return [(innerSpace.minX - outerSpace.minX) * 8, outerSpace.maxY - innerSpace.maxY]
    } else {
        return [0, 0]
    }
}

export const drawInSpace = (ctx, canvas, ctxSpace, canvasSpace) => {
    const [x, y] = topLeftCanvasOffset(ctxSpace, canvasSpace)
    ctx.drawImage(canvas, x, y)
}

export const compositeLayers = (layers, xCorrect = 0, yCorrect = 0) => {
    const space = compositeSpaces(layers)

    const canvas = canvasForSpace(space)
    const ctx = canvas.getContext("2d")
    for (const layer of layers) {
        if (layer && layer.canvas) {
            drawInSpace(ctx, layer.canvas, space, layer)
        }
    }
    return {...translateSpace(space, -xCorrect, -yCorrect), canvas: canvas }
}

const TXTCMD = {
    halfSpace: 128 + 0,
    doubleSpace: 128 + 15,
    incWidth: 128 + 1,
    decWidth: 128 + 2,
    incHeight: 128 + 3,
    decHeight: 128 + 4,
    halfSize: 128 + 5,
    halfCharDown: 128 + 11,
    inverse: 128 + 12,
    cursorRight: 128 + 7,
    cursorLeft: 128 + 8,
    cursorUp: 128 + 9,
    cursorDown: 128 + 10,
    carriageReturn: 128 + 6,
    space: 0x20,
}

export const bitmapFromChar = (charset, byte, colors) => {
    const { pixelWidth, pixelHeight, halfSize, inverse, pattern } = { ...defaultColors, ...colors }
    const charWidth = pixelWidth * (halfSize ? 4 : 8)
    const charHeight = pixelHeight * 8
    const masks = halfSize ? [0x80, 0x20, 0x08, 0x02] : [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01]
    if (halfSize && "BMWJwm".indexOf(String.fromCharCode(byte)) < 0) {
        masks[3] = 0x04
    }
    const char = charset[byte]
    const bitmap = emptyBitmap(charWidth / 4, charHeight)
    let x = 0
    let y = 0
    for (const rawrow of char) {
        const row = inverse ? rawrow ^ 0xff : rawrow
        for (let repeat = 0; repeat < pixelHeight; repeat ++) {
            for (const mask of masks) {
                if ((mask & row) != 0) {
                    horizontalLine(bitmap, x, x + pixelWidth - 1, y, pattern)
                }
                x += pixelWidth
            }
            x = 0
            y ++
        }
    }
    return bitmap
}

export const stringFromText = (bytes) => {
    let string = ""
    for (const byte of bytes) {
        if (byte >= 128) {
            const entry = Object.entries(TXTCMD).find(([k, v]) => v == byte)
            string += `<${entry ? entry[0] : byte}>`
        } else {
            string += String.fromCharCode(byte)
        }
    }
    return string
}

export const frameFromText = (x, y, bytes, charset, pattern, fineXOffset, colors = null) => {
    const initialX = x
    const layers = []
    let pixelWidth = 1
    let pixelHeight = 1
    let halfSize = true
    let inverse = true

    for (const byte of bytes) {
        const charWidth = pixelWidth * (halfSize ? 1 : 2)
        const charHeight = pixelHeight * 8
        if (byte == TXTCMD.halfSize) {
            halfSize = !halfSize
        } else if (byte == TXTCMD.inverse) {
            inverse = !inverse
        } else if (byte == TXTCMD.incWidth) {
            pixelWidth ++
        } else if (byte == TXTCMD.decWidth) {
            pixelWidth --
        } else if (byte == TXTCMD.incHeight) {
            pixelHeight ++
        } else if (byte == TXTCMD.decHeight) {
            pixelHeight --
        } else if (byte == TXTCMD.carriageReturn) {
            x = initialX
            y -= charHeight
        } else if (byte == TXTCMD.space) {
            x += charWidth
        } else if (byte == TXTCMD.doubleSpace) {
            x += (charWidth * 2)
        } else if (byte == TXTCMD.halfSpace) {
            x += (charWidth / 2)
        } else if (byte == TXTCMD.cursorUp) {
            y += charHeight
        } else if (byte == TXTCMD.cursorDown) {
            y -= charHeight
        } else if (byte == TXTCMD.halfCharDown) {
            y -= (charHeight / 2)
        } else if (byte == TXTCMD.cursorLeft) {
            x -= charWidth
        } else if (byte < 128) {
            const bitmap = bitmapFromChar(charset, byte, {...(colors ?? {}), pattern, pixelWidth, pixelHeight, halfSize, inverse })
            const canvas = canvasFromBitmap(bitmap, colors)
            layers.push({ canvas, minX: x + (fineXOffset / 4), maxX: x + charWidth + (fineXOffset / 4), minY: y - charHeight, maxY: y })
            x += charWidth
        } else {
            logError(`Unknown byte ${byte} encountered when rendering text`)
        }
    }
    return compositeLayers(layers)
}

// We try to consistently model Habitat's coordinate space in our rendering code as y=0 for the bottom, with increasing y meaning going up.
// However, the graphics code converts this internally to a coordinate space where increasing y means going down, and many internal
// coordinates (cel offsets, etc.) assume this.
export const frameFromCels = (cels, { colors: celColors, paintOrder, firstCelOrigin = true, flipHorizontal }) => {
    if (cels.length == 0) {
        return null
    }
    let xRel = 0
    let yRel = 0
    let xCorrect = 0
    let yCorrect = 0
    let layers = []
    for (const [icel, cel] of cels.entries()) {
        if (cel) {
            if (firstCelOrigin) {
                xCorrect = cel.xOffset
                yCorrect = cel.yOffset - cel.height
                firstCelOrigin = false
            }
            const x = cel.xOffset + xRel
            const y = cel.yOffset + yRel
            const colors = (Array.isArray(celColors) ? celColors[icel] : celColors) ?? {}
            if (cel.bitmap) {
                layers.push({ canvas: canvasFromBitmap(cel.bitmap, colors), minX: x, minY: y - cel.height, maxX: x + cel.width, maxY: y })
            } else if (cel.type == "text" && colors.bytes && colors.charset) {
                const textColors = {...colors}
                let pattern = cel.pattern
                if (pattern == 0) {
                     // TODO: this is a bit of a hack; the C64 code would accept a pattern of 0q0101
                     // which would mean blue / wild / blue / wild. but canvasFromBitmap is not currently written
                     // in such a way that this would work. In practice, the pattern byte is always one of four values.
                    textColors.pattern = 15
                    textColors.wilds = 6
                    pattern = 0x55
                }
                layers.push(frameFromText(x, y, colors.bytes, colors.charset, pattern, cel.fineXOffset, textColors))
            } else {
                layers.push(null)
            }
            xRel += cel.xRel 
            yRel += cel.yRel
        } else {
            layers.push(null)
        }
    }

    if (paintOrder) {
        const reordered = []
        for (const ilayer of paintOrder) {
            reordered.push(layers[ilayer])
        }
        layers = reordered
    }

    const frame = compositeLayers(layers)
    if (flipHorizontal) {
        frame.canvas = flipCanvas(frame.canvas)
        const { minX, maxX } = frame
        frame.minX = -maxX + 1
        frame.maxX = -minX + 1
    }
    frame.xOrigin = xCorrect
    frame.yOrigin = yCorrect
    return translateSpace(frame, -xCorrect, -yCorrect) 
}

const framesFromAnimation = (animation, frameFromState) => {
    const frames = []
    for (let istate = animation.startState; istate <= animation.endState; istate ++) {
        const frame = frameFromState(istate)
        frames.push(frame)
    }
    return frames
}

export const framesFromPropAnimation = (animation, prop, options = {}) => {
    const frameFromState = (istate) =>
        frameFromCels(celsFromMask(prop, prop.celmasks[istate]), options)
    return framesFromAnimation(animation, frameFromState)
}

export const framesFromLimbAnimation = (animation, limb, options = {}) => {
    const frameFromState = (istate) => {
        const iframe = limb.frames[istate]
        if (iframe >= 0) {
            return frameFromCels([limb.cels[iframe]], options)
        } else {
            return null
        }
    }
    return framesFromAnimation(animation, frameFromState)
}

const actionOrientations = {
    "stand_back": "back",
    "walk_front": "front",
    "walk_back": "back",
    "stand_front": "front",
    "sit_front": "front"
}

export const framesFromAction = (action, body, options = {}) => {
    const frames = []
    const chore = body.choreography[body.actions[action]]
    const animations = []
    const orientation = actionOrientations[action] ?? "side"
    const limbOrder = orientation == "front" ? body.frontFacingLimbOrder :
                      orientation == "back"  ? body.backFacingLimbOrder : 
                      null // side animations are always displayed in standard limb order
    for (const limb of body.limbs) {
        if (limb.animations.length > 0) {
            animations.push({ ...limb.animations[0] })
        } else {
            animations.push({ startState: 0, endState: 0 })
        }
    }
    for (const override of chore) {
        const ilimb = override.limb
        const newAnim = body.limbs[ilimb].animations[override.animation]
        animations[ilimb].startState = newAnim.startState
        animations[ilimb].endState = newAnim.endState
    }
    while (true) {
        const cels = []
        // const celColors = []
        let restartedCount = 0
        for (const [ilimb, limb] of body.limbs.entries()) {
            const animation = animations[ilimb]
            if (animation.current == undefined) {
                animation.current = animation.startState
            } else {
                animation.current ++
                if (animation.current > animation.endState) {
                    animation.current = animation.startState
                    restartedCount ++
                }
            }
            const istate = limb.frames[animation.current]
            if (istate >= 0) {
                cels.push(limb.cels[istate])
            } else {
                cels.push(null)
            }
            // limb.pattern is not a pattern index, it's a LIMB pattern index
            // celColors.push({ pattern: limb.pattern })
        }
        if (restartedCount == animations.length) {
            break
        }
        frames.push(frameFromCels(cels, {...options, paintOrder: limbOrder, firstCelOrigin: false }))
    }
    return frames
}

export const flipCanvas = (canvas) => {
    const flipped = makeCanvas(canvas.width, canvas.height)
    const ctx = flipped.getContext("2d")
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(canvas, 0, 0)
    return flipped
}

export const imageFromCanvas = (canvas) => {
    const img = document.createElement("img")
    img.src = canvas.toDataURL()
    img.width = canvas.width * 3
    img.height = canvas.height * 3
    img.style.imageRendering = "pixelated"
    return img
}

export const animate = (frames) => {
    const space = compositeSpaces(frames)

    if (frames.length == 0) {
        return { ...space, element: textNode("") }
    } else if (frames.length == 1) {
        return { ...space, element: imageFromCanvas(frames[0].canvas) }
    }
    const canvas = canvasForSpace(space)
    let iframe = 0
    const ctx = canvas.getContext("2d")
    const nextFrame = () => {
        const frame = frames[iframe]
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        if (frame) {
            drawInSpace(ctx, frame.canvas, space, frame)
        }
        iframe = (iframe + 1) % frames.length
    }
    nextFrame()
    setInterval(nextFrame, 250)
    return { ...space, element: canvas }
}

export const Scale = createContext(3)

export const canvasImage = ({ canvas }) => {
    if (canvas) {
        const scale = useContext(Scale)
        return html`
            <img style="image-rendering: pixelated;"
                width="${scale * canvas.width}px" height="${scale * canvas.height}px"
                src=${canvas.toDataURL()} />`
    } else {
        return null
    }
}

export const animatedDiv = ({ frames }) => {
    if (!frames || frames.length == 0) {
        return null
    } else if (frames.length == 1) {
        return html`<${canvasImage} canvas=${frames[0]?.canvas}/>`
    }
    const scale = useContext(Scale)
    const [iframe, setFrame] = useState(0)
    const frame = frames[iframe]
    const space = compositeSpaces(frames)
    const w = (space.maxX - space.minX) * 8
    const h = (space.maxY - space.minY)
    const [x, y] = topLeftCanvasOffset(space, frame)
    const r = w - x - (frame ? frame.canvas.width : 0)
    const b = h - y - (frame ? frame.canvas.height : 0)
    useEffect(() => {
        const nextFrame = () => setFrame((iframe + 1) % frames.length)
        const interval = setInterval(nextFrame, 250)
        return () => clearInterval(interval)
    })

    return html`
        <div style="line-height: 0px; width: ${w * scale}px; height: ${h * scale}px; display: inline-block; vertical-align: top;">
            <div style="padding-left: ${x * scale}px; padding-top: ${y * scale}px; padding-right: ${r * scale}px; padding-bottom: ${b * scale}px;">
                <${canvasImage} canvas=${frame?.canvas}/>
            </div>
        </div>`
}
