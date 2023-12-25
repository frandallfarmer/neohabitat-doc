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

const canvasFromBitmap = (bitmap) => {
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
        for (let x = 0; x < line.length; x ++) {
            const pixel = line[x]
            if (pixel == 0) { // transparent
                putpixel(x, y, 0, 0, 0, 0)
            } else if (pixel == 1) { // wild
                // TODO: patterns + colors
                // for now, always blue
                putpixel(x, y, 0, 0, 170, 255)
            } else if (pixel == 2) { // black
                putpixel(x, y, 0, 0, 0, 255)
            } else { // skin
                // TODO: custom skin colors
                putpixel(x, y, 255, 119, 119, 255)
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
    bitmap[y][x + 1] = (byte & 0x3c) >> 4
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

const celDecoder = {}
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
    if (cel.bitmap) {
        cel.canvas = canvasFromBitmap(cel.bitmap)
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

const decodeWalkto = (byte) => {
    return { fromSide: decodeSide(byte), offset: signedByte(byte & 0xfc) }
}

const decodeProp = (data) => {
    const prop = { 
        data: data,
        howHeld: decodeHowHeld(data.getUint8(0)),
        colorBitmask: data.getUint8(1),
        containerXYOff: data.getUint8(3), // TODO: parse this when nonzero
        walkto: { left: decodeWalkto(data.getUint8(4)), right: decodeWalkto(data.getUint8(5)), yoff: data.getInt8(6) },
        animations: [],
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

    // The prop structure also does not encode a count for how many frames there are, so we simply
    // stop parsing once we find one that doesn't make sense.
    // We also use the heuristic that this structure always precedes the first cel, as that seems to be 
    // consistently be the case with all the props in the Habitat source tree. We'll stop reading
    // animation data if we cross that boundary. If we encounter a prop that has the animation data
    // _after_ the cel data, which would be legal but doesn't happen in practice, then we ignore this
    // heuristic rather than failing to parse any animation data.
    // It's possible for there to be no frames, which is represented by an offset of 0 (no_animation)
    if (graphicStateOff != 0) {
        for (let frameOff = graphicStateOff; (graphicStateOff > firstCelOff) || (frameOff < firstCelOff); frameOff += 2) {
            // each animation is two bytes: the starting state, and the ending state
            // the first byte can have its high bit set to indicate that the animation should cycle
            const cycle = (data.getUint8(frameOff) & 0x80) != 0
            const startState = data.getUint8(frameOff) & 0x7f
            const endState = data.getUint8(frameOff + 1)
            if (startState >= stateCount || endState >= stateCount) {
                break
            }
            prop.animations.push({ cycle: cycle, startState: startState, endState: endState })
        }
    }
    return prop
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

const compositeCels = (cels) => {
    if (cels.length == 0) {
        return null
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    let xRel = 0
    let yRel = 0
    for (let cel of cels) {
        minX = Math.min(minX, cel.xOffset + xRel)
        minY = Math.min(minY, -(cel.yOffset + yRel))
        maxX = Math.max(maxX, cel.width + cel.xOffset + xRel)
        maxY = Math.max(maxY, cel.height - (cel.yOffset + yRel))
        xRel += cel.xRel 
        yRel += cel.yRel
    }

    const w = (maxX - minX) * 8
    const h = maxY - minY

    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext("2d")
    xRel = 0
    yRel = 0
    for (let cel of cels) {
        if (cel.canvas) {
            ctx.drawImage(cel.canvas, (cel.xOffset + xRel - minX) * 8, -(cel.yOffset + yRel) - minY)
        }
        xRel += cel.xRel 
        yRel += cel.yRel
    }
    return { canvas: canvas, xOffset: minX * 8, yOffset: minY }
}

const imageFromCanvas = (canvas) => {
    const img = document.createElement("img")
    img.src = canvas.toDataURL()
    img.width = canvas.width * 3
    img.height = canvas.height * 3
    img.style.imageRendering = "pixelated"
    return img
}

const textNode = (text, type = "span") => {
    const node = document.createElement(type)
    node.innerText = text
    return node
}

const linkDetail = (element, filename) => {
    const detailLink = document.createElement("a")
    detailLink.href = `detail.html?f=${filename}`
    detailLink.appendChild(element)
    return detailLink
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

const decodeBinary = async (filename) => {
    try {
        const prop = decodeProp(await readBinary(filename))
        prop.filename = filename
        return prop
    } catch (e) {
        return { filename: filename, error: e }
    }
}

const showError = (e, filename) => {
    const container = document.getElementById("errors")
    const errNode = document.createElement("p")
    console.error(e)
    errNode.appendChild(linkDetail(textNode(filename, "b"), filename))
    errNode.appendChild(textNode(e.toString(), "p"))
    if (e.stack) {
        errNode.appendChild(textNode(e.stack.toString(), "pre"))
    }
    container.appendChild(errNode)
}

const displayFile = async (filename, container) => {
    const prop = await decodeBinary(filename)
    if (prop.error) {
        container.parentNode.removeChild(container)
        showError(prop.error, prop.filename)
    } else {
        try {
            showStates(prop, container)
        } catch (e) {
            container.parentNode.removeChild(container)
            showError(e, prop.filename)
        }
    }
}

const displayList = async (indexFile, containerId) => {
    const response = await fetch(indexFile)
    const filenames = await response.json()
    const container = document.getElementById(containerId)
    for (const filename of filenames) {
        const fileContainer = document.createElement("div")
        fileContainer.style.border = "1px solid black"
        fileContainer.style.margin = "2px"
        fileContainer.style.display = "inline-block"
        fileContainer.appendChild(linkDetail(textNode(filename, "div"), filename))
        container.appendChild(fileContainer)
        displayFile(filename, fileContainer)
    }
}
