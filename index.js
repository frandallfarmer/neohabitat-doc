const readBinary = async (url) => {
    const response = await fetch(url)
    if (!response.ok) {
        console.log(response)
        throw Error(`Failed to download ${url}`)
    }
    return new DataView(await response.arrayBuffer())
}

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
const LE = true // little-endian

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

const emptyBitmap = (w, h) => {
    const bitmap = []
    for (let y = 0; y < h; y ++) {
        const scanline = []
        for (let x = 0; x < w; x ++) {
            scanline.push(0)
            scanline.push(0)
            scanline.push(0)
            scanline.push(0)
        }
        bitmap.push(scanline)
    }
    return bitmap
}

const celDecoder = {}
celDecoder.bitmap = (data, cel) => {
    const bitmap = emptyBitmap(cel.width, cel.height)
    let ibmp = 0
    const end = cel.width * cel.height
    const putByte = (byte) => {
        const x = Math.floor(ibmp / cel.height) * 4
        const y = (cel.height - (ibmp % cel.height)) - 1
        bitmap[y][x]     = (byte & 0xc0) >> 6
        bitmap[y][x + 1] = (byte & 0x3c) >> 4
        bitmap[y][x + 2] = (byte & 0x0c) >> 2
        bitmap[y][x + 3] = (byte & 0x03)
        ibmp ++
    }
    let i = 6
    while (ibmp < end) {
        const byte = data.getUint8(i)
        i ++
        if (byte == 0) {
            const count = data.getUint8(i)
            i ++
            if ((count & 0x80) == 0) {
                const val = data.getUint8(i)
                i ++
                for (let repeat = 0; repeat < count; repeat ++) {
                    putByte(val)
                }
            } else {
                // transparent run
                for (let repeat = 0; repeat < (count & 0x7f); repeat ++) {
                    putByte(0)
                }
            }
        } else {
            putByte(byte)
        }
    }
    cel.bitmap = bitmap
}

const makeCanvas = (w, h) => {
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    return canvas    
}

const drawBitmap = (bitmap) => {
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

const decodeCel = (data, changesColorRam) => {
    const cel = { 
        data: data,
        changesColorRam: changesColorRam,
        type: decodeCelType(data.getUint8(0)),
        wild: (data.getUint8(0) & 0x10) == 0 ? "color" : "pattern",
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
        cel.image = drawBitmap(cel.bitmap).toDataURL()
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
    for (let frameOff = graphicStateOff; ; frameOff ++) {
        const frame = decodeFrame(data.getUint8(frameOff), stateCount)
        if (!frame) {
            break
        }
        prop.frames.push(frame)
    }
    for (let celOffsetOff = celOffsetsOff; allCelsMask != 0; celOffsetOff += 2) {
        const icel = prop.cels.length
        const celbit = 0x80 >> icel
        prop.cels.push(decodeCel(new DataView(data.buffer, data.getUint16(celOffsetOff, LE)), (prop.colorBitmask & celbit) != 0))
        allCelsMask = (allCelsMask << 1) & 0xff
    }
    return prop
}

const showCels = (prop) => {
    const container = document.getElementById("cels")
    for (const cel of prop.cels) {
        if (cel.image) {
            const img = document.createElement("img")
            img.src = cel.image
            img.width = cel.width * 4 * 2 * 3
            img.height = cel.height * 3
            img.style.imageRendering = "pixelated"
            container.appendChild(img)
        }
    }
}
const doTheThing = async () => {
    const prop = decodeProp(await readBinary("picture1.bin"))
    console.log(prop)
    showCels(prop)
    showCels(decodeProp(await readBinary("picture2.bin")))
    showCels(decodeProp(await readBinary("picture3.bin")))
}

doTheThing()