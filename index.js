const LE = true // little-endian

const readBinary = async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
        console.log(response)
        throw Error(`Failed to download ${url}`)
    }
    return new DataView(await response.arrayBuffer())
}

const makeCanvas = (w, h) => {
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    return canvas    
}

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

const defaultColors = {
    wildcard: 6,
    skin: 10,
    pattern: 15
}

const canvasFromBitmap = (bitmap, colors = {}) => {
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
        const patbyte = celPatterns[pattern][y % 4]
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

const signedByte = (byte) => {
    if ((byte & 0x80) != 0) {
        const complement = (byte ^ 0xff) + 1
        return -complement
    } else {
        return byte
    }
}

// JS bitmap format: array of scanlines, each scanline being an array of numbers from 0-3
const emptyBitmap = (w, h, color = 0) => {
    const bitmap = []
    for (let y = 0; y < h; y ++) {
        const scanline = []
        for (let x = 0; x < w; x ++) {
            scanline.push(color)
            scanline.push(color)
            scanline.push(color)
            scanline.push(color)
        }
        bitmap.push(scanline)
    }
    return bitmap
}

const drawByte = (bitmap, x, y, byte) => {
    bitmap[y][x]     = (byte & 0xc0) >> 6
    bitmap[y][x + 1] = (byte & 0x30) >> 4
    bitmap[y][x + 2] = (byte & 0x0c) >> 2
    bitmap[y][x + 3] = (byte & 0x03)
}

// Prop decoding functions
const decodeHowHeld = (byte) => {
    const heldVal = byte & 0xc0
    if (heldVal == 0) {
        return "swing"
    } else if (heldVal == 0x40) {
        return "out"
    } else if (heldVal == 0x80) {
        return "both"
    } else {
        return "at_side"
    }
}

const encodeHowHeld = (howHeld) => {
    if (howHeld == "swing") {
        return 0x00
    } else if (howHeld == "out") {
        return 0x40
    } else if (howHeld == "both") {
        return 0x80
    } else if (howHeld == "at_side") {
        return 0xc0
    } else {
        throw new Error(`Unknown hold "${howHeld}"`)
    }
}

const decodeCelType = (byte) => {
    const typeVal = byte & 0xc0
    if (typeVal == 0x00) {
        if ((byte & 0x20) == 0) {
            return "bitmap"
        } else {
            return "text"
        }
    } else if (typeVal == 0x40) {
        return "trap"
    } else if (typeVal == 0x80) {
        return "box"
    } else {
        return "circle"
    }
}

const encodeCelType = (type) => {
    if (type == "bitmap") {
        return 0x00
    } else if (type == "text") {
        return 0x20
    } else if (type == "trap") {
        return 0x40
    } else if (type == "box") {
        return 0x80
    } else if (type == "circle") {
        return 0xc0
    } else {
        throw new Error(`Unknown cel type "${type}"`)
    }
}

const celDecoder = {}
const celEncoder = {}

celDecoder.bitmap = (data, cel) => {
    // bitmap cells are RLE-encoded vertical strips of bytes. Decoding starts from the bottom-left
    // and proceeds upwards until the top of the bitmap is hit; then then next vertical strip is decoded.
    // Each byte describes four 2-bit pixels.
    const bitmap = emptyBitmap(cel.width, cel.height)
    let ibmp = 0
    const end = cel.width * cel.height
    const putByte = (byte) => {
        const x = Math.floor(ibmp / cel.height) * 4
        const y = (cel.height - (ibmp % cel.height)) - 1
        drawByte(bitmap, x, y, byte)
        ibmp ++
    }
    let i = 6
    while (ibmp < end) {
        const byte = data.getUint8(i)
        i ++
        if (byte == 0) {
            // A zero byte denotes the start of a run of identical bytes. The second
            // byte denotes the number of repetitions.
            const count = data.getUint8(i)
            i ++
            if ((count & 0x80) == 0) {
                // if the high bit of the count is not set, we read a third byte to
                // determine the byte to repeat.
                const val = data.getUint8(i)
                i ++
                for (let repeat = 0; repeat < count; repeat ++) {
                    putByte(val)
                }
            } else {
                // if the high bit of the count is set, the lower 7 bits are used as
                // the count, and a fully transparent byte is repeated.
                for (let repeat = 0; repeat < (count & 0x7f); repeat ++) {
                    putByte(0)
                }
            }
        } else {
            // non-zero bytes are raw bitmap data
            putByte(byte)
        }
    }
    cel.bitmap = bitmap
}

celDecoder.box = (data, cel) => {
    const bitmap = emptyBitmap(cel.width, cel.height)
    cel.borderLR = (data.getUint8(0) & 0x20) != 0
    cel.borderTB = (data.getUint8(0) & 0x10) != 0
    cel.pattern = data.getUint8(6)
    for (let y = 0; y < cel.height; y ++) {
        for (let x = 0; x < cel.width; x ++) {
            if (cel.borderTB && (y == 0 || y == (cel.height - 1))) {
                drawByte(bitmap, x * 4, y, 0xaa)
            } else {
                drawByte(bitmap, x * 4, y, cel.pattern)
            }
        }
        if (cel.borderLR) {
            const line = bitmap[y]
            line[0] = 2
            line[line.length - 1] = 2
        }
    }
    cel.bitmap = bitmap
}

const horizontalLine = (bitmap, xa, xb, y, patternByte) => {
    const xStart = xa - (xa % 4)
    const xEnd = (xb + (3 - (xb % 4))) - 3
    for (let x = xStart + 4; x < xEnd; x += 4) {
        drawByte(bitmap, x, y, patternByte)
    }
    const startBit = ((xa - xStart) * 2)
    const startByte = (0xff >> startBit) & patternByte
    drawByte(bitmap, xStart, y, startByte)
    const endBit = (((xEnd + 3) - xb) * 2)
    const endByte = (0xff << endBit) & patternByte
    drawByte(bitmap, xEnd, y, endByte)
}

celDecoder.trap = (data, cel) => {
    let border = false
    // trap.m:21 - high-bit set means "draw a border"
    // It looks like this was used as a flag and the real height
    // was ORed with 0x80 - see house2.m, sign2.m
    // There are also trapezoids that use 0x80 as their height - 
    // bwall6.m, bwall7.m, bwall9.m, magic_wall.m
    // This appears to be special-cased to mean "no border" at trap.m:26
    // mix.m:253 appears to have the logic to calculate y2, extracting
    // the height by ANDing with 0x7f (when not 0x80)
    if ((cel.height & 0x80) != 0 && cel.height != 0x80) {
        border = true
        cel.height = cel.height & 0x7f
    }
    if ((data.getUint8(0) & 0x10) == 0) {
        // shape_pattern is a repeating 4-pixel colour, same as box
        cel.pattern = data.getUint8(6)
    } else {
        // shape_pattern is 0xff, and the pattern is a bitmap that follows
        // the trapezoid definition
        // dline.m:103 - first two bytes are bitmasks used for efficiently calculating
        // offsets into the texture. This means that the dimensions will be a power of 
        // two, and we can get the width and height simply by adding one to the mask.
        const texW = data.getUint8(11) + 1
        const texH = data.getUint8(12) + 1
        cel.texture = emptyBitmap(texW, texH)
        let i = 13
        // dline.m:111 - the y position into the texture is calculated by
        // ANDing y1 with the height mask; thus, unlike prop bitmaps, we decode
        // from the top down
        for (let y = 0; y < texH; y ++) {
            for (let x = 0; x < texW; x ++) {
                drawByte(cel.texture, x * 4, y, data.getUint8(i))
                i ++
            }
        }
    }
    cel.x1a = data.getUint8(7)
    cel.x1b = data.getUint8(8)
    cel.x2a = data.getUint8(9)
    cel.x2b = data.getUint8(10)

    // trapezoid-drawing algorithm:
    // draw_line: draws a line from x1a,y1 to x1b, y1
    // handles border drawing (last/first line, edges)
    // decreases vcount, then jumps to cycle1 if there
    // are more lines
    // cycle1: run bresenham, determine if x1a (left edge) needs to be incremented
    // or decremented (self-modifying code! the instruction in inc_dec1 is
    // written at trap.m:52)
    // has logic to jump back to cycle1 if we have a sharp enough angle that
    // we need to move more than one pixel horizontally
    // cycle2: same thing, but for x2a (right edge)
    // at the end, increments y1 and jumps back to the top of draw_line
    cel.width = Math.floor((Math.max(cel.x1a, cel.x1b, cel.x2a, cel.x2b) + 3) / 4)
    // trap.m:32 - delta_y and vcount are calculated by subtracting y2 - y1.
    // mix.m:253: y2 is calculated as cel_y + cel_height
    // mix.m:261: y1 is calculated as cel_y + 1
    // So for a one-pixel tall trapezoid, deltay is 0, because y1 == y2.
    // vcount is decremented until it reaches -1, compensating for the off-by-one.
    const deltay = cel.height - 1
    cel.bitmap = emptyBitmap(cel.width, cel.height)
    const dxa = Math.abs(cel.x1a - cel.x2a)
    const dxb = Math.abs(cel.x1b - cel.x2b)
    const countMaxA = Math.max(dxa, deltay)
    const countMaxB = Math.max(dxb, deltay)
    const inca = cel.x1a < cel.x2a ? 1 : -1
    const incb = cel.x1b < cel.x2b ? 1 : -1
    let x1aLo = Math.floor(countMaxA / 2)
    let y1aLo = x1aLo
    let x1bLo = Math.floor(countMaxB / 2)
    let y1bLo = x1bLo
    let xa = cel.x1a
    let xb = cel.x1b
    for (let y = 0; y < cel.height; y ++) {
        const line = cel.bitmap[y]
        if (border && (y == 0 || y == (cel.height - 1))) {
            // top and bottom border line
            horizontalLine(cel.bitmap, xa, xb, y, 0xaa, true)
        } else {
            if (cel.texture) {
                const texLine = cel.texture[y % cel.texture.length]
                for (let x = xa; x <= xb; x ++) {
                    line[x] = texLine[x % texLine.length]
                }
            } else {
                horizontalLine(cel.bitmap, xa, xb, y, cel.pattern, border)
            }
        }
        
        if (border) {
            line[xa] = 2
            line[xb] = 2
        }

        // cycle1: move xa
        do {
            x1aLo += dxa
            if (x1aLo >= countMaxA) {
                x1aLo -= countMaxA
                xa += inca
            }
            y1aLo += deltay
        } while (y1aLo < countMaxA)
        y1aLo -= countMaxA

        // cycle2: move xb
        do {
            x1bLo += dxb
            if (x1bLo >= countMaxB) {
                x1bLo -= countMaxB
                xb += incb
            }
            y1bLo += deltay
        } while (y1bLo < countMaxA)
        y1bLo -= countMaxA
    }
}

const decodeCel = (data, changesColorRam) => {
    const cel = { 
        data: data,
        changesColorRam: changesColorRam,
        type: decodeCelType(data.getUint8(0)),
        // wild: (data.getUint8(0) & 0x10) == 0 ? "color" : "pattern",
        width: data.getUint8(0) & 0x0f,
        height: data.getUint8(1),
        xOffset: data.getInt8(2),
        yOffset: data.getInt8(3),
        xRel: data.getInt8(4),
        yRel: data.getInt8(5)
    }
    if (celDecoder[cel.type]) {
        celDecoder[cel.type](data, cel)
    }
    return cel
}

const decodeSide = (byte) => {
    const side = byte & 0x03
    if (side == 0x00) {
        return "left"
    } else if (side == 0x01) {
        return "right"
    } else if (side == 0x02) {
        return "up"
    } else {
        return "down"
    }
}
const encodeSide = (side) => {
    if (side == "left") {
        return 0x00
    } else if (side == "right") {
        return 0x01
    } else if (side == "up") {
        return 0x02
    } else if (side == "down") {
        return 0x03
    } else {
        throw new Error(`Unknown side "${side}"`)
    }
}

const decodeWalkto = (byte) => {
    return { fromSide: decodeSide(byte), offset: signedByte(byte & 0xfc) }
}

const encodeWalkto = ({ fromSide, offset }) => {
    return encodeSide(fromSide) | (offset & 0xfc)
}

const decodeAnimations = (data, startEndTableOff, firstCelOff, stateCount) => {
    const animations = []
    // The prop structure also does not encode a count for how many frames there are, so we simply
    // stop parsing once we find one that doesn't make sense.
    // We also use the heuristic that this structure always precedes the first cel, as that seems to be 
    // consistently be the case with all the props in the Habitat source tree. We'll stop reading
    // animation data if we cross that boundary. If we encounter a prop that has the animation data
    // _after_ the cel data, which would be legal but doesn't happen in practice, then we ignore this
    // heuristic rather than failing to parse any animation data.
    // It's possible for there to be no frames, which is represented by an offset of 0 (no_animation)
    if (startEndTableOff != 0) {
        for (let frameOff = startEndTableOff; (startEndTableOff > firstCelOff) || (frameOff < firstCelOff); frameOff += 2) {
            // each animation is two bytes: the starting state, and the ending state
            // the first byte can have its high bit set to indicate that the animation should cycle
            const cycle = (data.getUint8(frameOff) & 0x80) != 0
            const startState = data.getUint8(frameOff) & 0x7f
            const endState = data.getUint8(frameOff + 1)
            if (startState >= stateCount || endState >= stateCount) {
                break
            }
            animations.push({ cycle: cycle, startState: startState, endState: endState })
        }
    }
    return animations
}

const decodeProp = (data) => {
    const prop = { 
        data: data,
        howHeld: decodeHowHeld(data.getUint8(0)),
        colorBitmask: data.getUint8(1),
        containerXYOff: data.getUint8(3), // TODO: parse this when nonzero
        walkto: { left: decodeWalkto(data.getUint8(4)), right: decodeWalkto(data.getUint8(5)), yoff: data.getInt8(6) },
        celmasks: [],
        cels: []
    }
    const stateCount = (data.getUint8(0) & 0x3f) + 1
    const graphicStateOff = data.getUint8(2)
    const celMasksOff = 7
    const celOffsetsOff = celMasksOff + stateCount

    // The prop structure does not directly encode a count for how many cels there are, but each
    // "graphic state" is defined by a bitmask marking which cels are present, and we do know how
    // many states there are. We can assume that all cels are referenced by at least one state,
    // and use that to determine the cel count.
    let allCelsMask = 0
    for (let icelmask = 0; icelmask < stateCount; icelmask ++) {
        const celmask = data.getUint8(celMasksOff + icelmask)
        prop.celmasks.push(celmask)
        allCelsMask |= celmask
    }
    if (allCelsMask != 0x80 && allCelsMask != 0xc0 && allCelsMask != 0xe0 && allCelsMask != 0xf0 &&
        allCelsMask != 0xf8 && allCelsMask != 0xfc && allCelsMask != 0xfe && allCelsMask != 0xff) {
        throw new Error("Inconsistent graphic state cel masks - implies unused cel data")
    }
    let firstCelOff = Number.POSITIVE_INFINITY
    for (let celOffsetOff = celOffsetsOff; allCelsMask != 0; celOffsetOff += 2) {
        const icel = prop.cels.length
        const celbit = 0x80 >> icel
        const celOff = data.getUint16(celOffsetOff, LE)
        firstCelOff = Math.min(celOff, firstCelOff)
        prop.cels.push(decodeCel(new DataView(data.buffer, celOff), (prop.colorBitmask & celbit) != 0))
        allCelsMask = (allCelsMask << 1) & 0xff
    }
    prop.animations = decodeAnimations(data, graphicStateOff, firstCelOff, stateCount)
    return prop
}

const decodeLimb = (data, limb) => {
    let frameCount = data.getUint8(0) + 1
    limb.frames = []
    for (let iframe = 0; iframe < frameCount; iframe ++) {
        limb.frames.push(data.getInt8(3 + iframe))
    }
    const celOffsetsOff = 3 + frameCount
    const maxCelIndex = Math.max(...limb.frames)
    limb.cels = []
    let firstCelOff
    for (let icel = 0; icel <= maxCelIndex; icel ++) {
        const celOff = data.getUint16(celOffsetsOff + (icel * 2), LE)
        if (icel == 0) {
            firstCelOff = celOff
        }
        limb.cels.push(decodeCel(new DataView(data.buffer, data.byteOffset + celOff)))
    }
    limb.animations = decodeAnimations(data, data.getUint8(2), firstCelOff, limb.frames.length)
}

const choreographyActions = [
    "init", "stand", "walk", "hand_back", "sit_floor", "sit_chair", "bend_over", 
    "bend_back", "point", "throw", "get_shot", "jump", "punch", "wave",
    "frown", "stand_back", "walk_front", "walk_back", "stand_front",
    "unpocket", "gimme", "knife", "arm_get", "hand_out", "operate",
    "arm_back", "shoot1", "shoot2", "nop", "sit_front"
]

const decodeBody = (data) => {
    const body = {
        data: data,
        headCelNumber: data.getUint8(19),
        frozenWhenStands: data.getUint8(20),
        frontFacingLimbOrder: [],
        backFacingLimbOrder: [],
        limbs: [],
        choreography: [],
        actions: {}
    }
    for (let ilimb = 0; ilimb < 6; ilimb ++) {
        body.frontFacingLimbOrder.push(data.getUint8(27 + ilimb))
        body.backFacingLimbOrder.push(data.getUint8(33 + ilimb))
        const limb = {
            pattern: data.getUint8(21 + ilimb),
            affectedByHeight: data.getUint8(39 + ilimb)
        }
        const limbOff = data.getUint16(7 + (ilimb * 2), LE)
        decodeLimb(new DataView(data.buffer, limbOff), limb)
        body.limbs.push(limb)
    }
    const choreographyIndexOff = data.getUint16(0, LE)
    const choreographyTableOff = data.getUint16(2, LE)
    const indexToChoreography = new Map()
    for (const [i, action] of choreographyActions.entries()) {
        let tableIndex = data.getUint8(choreographyIndexOff + i)
        let choreographyIndex = indexToChoreography.get(tableIndex)
        if (choreographyIndex == undefined) {
            choreographyIndex = body.choreography.length
            indexToChoreography.set(tableIndex, choreographyIndex)
            const choreography = []
            body.choreography.push(choreography)
            for (;; tableIndex ++) {
                const state = data.getUint8(choreographyTableOff + tableIndex)
                let limb = (state & 0x70) >> 4
                let animation = state & 0x0f
                if (limb == 6) {
                    limb = 5
                    animation += 0x10
                }
                choreography.push({ limb, animation })
                if ((state & 0x80) != 0) {
                    break
                }
            }
        }
        body.actions[action] = choreographyIndex
    }
    return body
}

const celsFromMask = (prop, celMask) => {
    const cels = []
    for (let icel = 0; icel < 8; icel ++) {
        const celbit = 0x80 >> icel
        if ((celMask & celbit) != 0) {
            cels.push(prop.cels[icel])
        }
    }
    return cels
}

const compositeCels = (cels, celColors = null, paintOrder = null) => {
    if (cels.length == 0) {
        return null
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let xRel = 0
    let yRel = 0
    let layers = []
    for (const [icel, cel] of cels.entries()) {
        if (cel) {
            const x = cel.xOffset + xRel
            const y = -(cel.yOffset + yRel)
            minX = Math.min(minX, x)
            minY = Math.min(minY, y)
            maxX = Math.max(maxX, cel.width + x)
            maxY = Math.max(maxY, cel.height + y)
            if (cel.bitmap) {
                const colors = Array.isArray(celColors) ? celColors[icel] : (celColors ?? {})
                layers.push({ canvas: canvasFromBitmap(cel.bitmap, colors), x, y })
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

    const w = (maxX - minX) * 8
    const h = maxY - minY

    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext("2d")
    for (const layer of layers) {
        if (layer && layer.canvas) {
            ctx.drawImage(layer.canvas, (layer.x - minX) * 8, layer.y - minY)
        }
    }
    return { canvas: canvas, xOffset: minX * 8, yOffset: minY, w: w, h: h }
}

const imageFromCanvas = (canvas) => {
    const img = document.createElement("img")
    img.src = canvas.toDataURL()
    img.width = canvas.width * 3
    img.height = canvas.height * 3
    img.style.imageRendering = "pixelated"
    return img
}

const imageFromBitmap = (bitmap, colors = {}) => imageFromCanvas(canvasFromBitmap(bitmap, colors))

const textNode = (text, type = "span") => {
    const node = document.createElement(type)
    node.innerText = text
    return node
}

const wrapLink = (element, href) => {
    const link = document.createElement("a")
    link.href = href
    link.appendChild(element)
    return link
}

const PropImpl = {
    decode: decodeProp,
    detailHref: (filename) => `detail.html?f=${filename}`,
    celsForAnimationState: (prop, istate) => celsFromMask(prop, prop.celmasks[istate]),
}

const LimbImpl = {
    celsForAnimationState: (limb, istate) => {
        const iframe = limb.frames[istate]
        if (iframe >= 0) {
            return [limb.cels[iframe]]
        } else {
            return []
        }
    }
}

const actionOrientations = {
    "stand_back": "back",
    "walk_front": "front",
    "walk_back": "back",
    "stand_front": "front",
    "sit_front": "front"
}
const BodyImpl = {
    decode: decodeBody,
    detailHref: (filename) => `body.html?f=${filename}`,
    generateFrames: (action, body, frames) => {
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
            const celColors = []
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
                celColors.push({ pattern: limb.pattern })
            }
            if (restartedCount == animations.length) {
                break
            }
            frames.push(compositeCels(cels, celColors, limbOrder))
        }
    }
}

const linkDetail = (element, filename, impl) => {
    return impl && impl.detailHref ? wrapLink(element, impl.detailHref(filename)) : element
}

const createAnimation = (animation, value, impl) => {
    const frames = []
    if (impl.generateFrames) {
        impl.generateFrames(animation, value, frames)
    } else {
        for (let istate = animation.startState; istate <= animation.endState; istate ++) {
            const frame = compositeCels(impl.celsForAnimationState(value, istate))
            if (frame != null) {
                frames.push(frame)
            }
        }
    }
    if (frames.length == 0) {
        return textNode("")
    } else if (frames.length == 1) {
        return imageFromCanvas(frames[0].canvas)
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const frame of frames) {
        minX = Math.min(minX, frame.xOffset)
        minY = Math.min(minY, frame.yOffset)
        maxX = Math.max(maxX, frame.xOffset + frame.w)
        maxY = Math.max(maxY, frame.yOffset + frame.h)
    }

    const w = maxX - minX
    const h = maxY - minY
    const canvas = makeCanvas(w, h)
    canvas.style.imageRendering = "pixelated"
    canvas.style.width = `${w * 3}px`
    canvas.style.height = `${h * 3}px`
    let iframe = 0
    const ctx = canvas.getContext("2d")
    const nextFrame = () => {
        const frame = frames[iframe]
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(frame.canvas, frame.xOffset - minX, frame.yOffset - minY)
        iframe = (iframe + 1) % frames.length
    }
    nextFrame()
    setInterval(nextFrame, 250)
    return canvas
}

const showAnimations = (value, container, impl) => {
    for (const animation of value.animations) {
        container.appendChild(linkDetail(createAnimation(animation, value, impl), value.filename, impl))
    }
}

const showStates = (prop, container) => {
    for (const celmask of prop.celmasks) {
        const state = compositeCels(celsFromMask(prop, celmask))
        if (state) {
            const img = imageFromCanvas(state.canvas)
            img.alt = prop.filename
            container.appendChild(linkDetail(img, prop.filename))
        }
    }
}

const showCels = (prop, container) => {
    for (const cel of prop.cels) {
        if (cel.canvas) {
            container.appendChild(imageFromCanvas(cel.canvas))
        }
    }
}

const decodeBinary = async (filename, impl) => {
    try {
        const prop = impl.decode(await readBinary(filename))
        prop.filename = filename
        return prop
    } catch (e) {
        return { filename: filename, error: e }
    }
}

const showError = (e, filename, impl) => {
    const container = document.getElementById("errors")
    const errNode = document.createElement("p")
    console.error(e)
    errNode.appendChild(linkDetail(textNode(filename, "b"), filename, impl))
    errNode.appendChild(textNode(e.toString(), "p"))
    if (e.stack) {
        errNode.appendChild(textNode(e.stack.toString(), "pre"))
    }
    container.appendChild(errNode)
}

const displayFile = async (filename, container, impl) => {
    const value = await decodeBinary(filename, impl)
    if (value.error) {
        container.parentNode.removeChild(container)
        showError(value.error, value.filename, impl)
    } else {
        try {
            impl.display(value, container)
        } catch (e) {
            container.parentNode.removeChild(container)
            showError(e, value.filename, impl)
        }
    }
}

PropImpl.display = (prop, container) => {
    if (prop.filename == 'heads/fhead.bin') {
        container.appendChild(textNode("CW: Pixel genitals"))
    } else if (prop.animations.length > 0) {
        showAnimations(prop, container, PropImpl)
    } else {
        showStates(prop, container)
    }
}

BodyImpl.display = (body, container) => {
    container.appendChild(linkDetail(createAnimation("walk", body, BodyImpl), body.filename, BodyImpl))
}

const displayList = async (indexFile, containerId, impl) => {
    const response = await fetch(indexFile, { cache: "no-cache" })
    const filenames = await response.json()
    const container = document.getElementById(containerId)
    for (const filename of filenames) {
        const fileContainer = document.createElement("div")
        fileContainer.style.border = "1px solid black"
        fileContainer.style.margin = "2px"
        fileContainer.style.padding = "2px"
        fileContainer.style.display = "inline-block"
        fileContainer.appendChild(linkDetail(textNode(filename, "div"), filename, impl))
        container.appendChild(fileContainer)
        displayFile(filename, fileContainer, impl)
    }
}