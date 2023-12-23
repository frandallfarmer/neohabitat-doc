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

const decodeFrame = (byte, stateCount) => {
    const frameIndex = byte & 0x7f
    if (frameIndex > stateCount) {
        return null
    }
    return { state: frameIndex, cycle: (byte & 0x80) != 0 }
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

const signedByte = (byte) => {
    if ((byte & 0x80) != 0) {
        const complement = (byte ^ 0xff) + 1
        return -complement
    } else {
        return byte
    }
}

const decodeWalkto = (byte) => {
    return { fromSide: decodeSide(byte), offset: signedByte(byte & 0xfc) }
}

const decodeProp = (data) => {
    let prop = { 
        data: data,
        howHeld: decodeHowHeld(data.getUint8(0)),
        colorBitmask: data.getUint8(1),
        containerXYOff: data.getUint8(3), // TODO: parse this when nonzero
        walkto: { left: decodeWalkto(data.getUint8(4)), right: decodeWalkto(data.getUint8(5)), yoff: data.getInt8(6) },
        frames: [],
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
    // The prop structure also does not encode a count for how many frames there are, so we simply
    // stop parsing once we find one that doesn't make sense. 
    // We could also potentially assume that this structure always follows the header (or the 
    // "container" XY array, if one exists), as that seems to be consistently be the case with all 
    // the props in the Habitat source tree.
    // It's possible for there to be no frames, which is represented by an offset of 0 (no_animation)
    if (graphicStateOff != 0) {
        for (let frameOff = graphicStateOff; ; frameOff ++) {
            const frame = decodeFrame(data.getUint8(frameOff), stateCount)
            if (!frame) {
                break
            }
            prop.frames.push(frame)
        }
    }
    for (let celOffsetOff = celOffsetsOff; allCelsMask != 0; celOffsetOff += 2) {
        const icel = prop.cels.length
        const celbit = 0x80 >> icel
        prop.cels.push(decodeCel(new DataView(data.buffer, data.getUint16(celOffsetOff, LE)), (prop.colorBitmask & celbit) != 0))
        allCelsMask = (allCelsMask << 1) & 0xff
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
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (let cel of cels) {
        minX = Math.min(minX, cel.xOffset)
        minY = Math.min(minY, -cel.yOffset)
        maxX = Math.max(maxX, cel.width + cel.xOffset)
        maxY = Math.max(maxY, cel.height - cel.yOffset)
    }    const container = document.getElementById("cels")

    const w = (maxX - minX) * 8
    const h = maxY - minY

    const canvas = makeCanvas(w, h)
    const ctx = canvas.getContext("2d")
    for (let cel of cels) {
        ctx.drawImage(cel.canvas, (cel.xOffset - minX) * 8, -cel.yOffset - minY)
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

const showStates = (prop, container) => {
    for (const celmask of prop.celmasks) {
        const state = compositeCels(celsFromMask(prop, celmask))
        const img = imageFromCanvas(state.canvas)
        img.alt = prop.filename
        container.appendChild(img)
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
    errNode.innerHTML = `${filename}<br/>${e.toString()}`
    container.appendChild(errNode)
}

const displayFile = async (filename, container) => {
    const prop = await decodeBinary(filename)
    if (prop.error) {
        showError(prop.error, prop.filename)
    } else {
        try {
            showStates(prop, container)
        } catch (e) {
            showError(e, prop.filename)
        }
    }
}

const displayList = async (indexFile, containerId) => {
    const response = await fetch(indexFile)
    const filenames = await response.json()
    const container = document.getElementById(containerId)
    for (filename of filenames) {
        displayFile(filename, container)
    }
}

const doTheThing = async () => {
    await displayList("heads.json", "heads")
    await displayList("props.json", "props")
}

doTheThing()