import { useRef, useLayoutEffect, useContext, useMemo } from "preact/hooks"
import { html } from "./view.js"
import { charset, useHabitatText } from "./data.js"
import { Scale } from "./render.js"
import { makeCanvas } from "./shim.js"

const charsetCanvases = () => {
    if (!charset()) {
        return null
    }
    return useMemo(() => charset().map(row => {
        const canvas = makeCanvas(8, 8)
        const ctx = canvas.getContext("2d")
        const img = ctx.createImageData(8, 8)
        let ipixel = 0
        for (let irow = 0; irow < 8; irow ++) {
            const byte = row[irow]
            for (let bit = 0x80; bit > 0; bit >>= 1) {
                img.data[ipixel    ] = 0
                img.data[ipixel + 1] = 0
                img.data[ipixel + 2] = 0
                img.data[ipixel + 3] = (byte & bit) ? 0 : 255
                ipixel += 4
            }
        }
        ctx.putImageData(img, 0, 0)
        return canvas
    }), [charset()])
}

const textMapView = ({ textmap }) => {
    const chars = charsetCanvases()
    if (!textmap || !chars) {
        return null
    }
    const scale = useContext(Scale)
    const canvasRef = useRef(null)
    useLayoutEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = "#c46c71"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        let x = 0, y = 0
        for (const row of textmap) {
            for (const char of row) {
                ctx.drawImage(chars[char], x * 8, y * 8)
                x ++
            }
            x = 0
            y ++
        }
    }, [textmap])
    const w = textmap[0].length * 8
    const h = textmap.length * 8
    return html`
        <canvas ref=${canvasRef} width="${w}px" height="${h}px"
                style="image-rendering: pixelated; width: ${w*scale}px; height: ${h*scale}px"/>`
}

export const emptyTextmap = () => {
    const w = 40
    const h = 16
    const textmap = []
    for (let y = 0; y < h; y ++) {
        const row = []
        for (let x = 0; x < w; x ++) {
            row.push(32)
        }
        textmap.push(row)
    }
    return textmap
}

const TextCodes = {
    DELETE_KEY: 0xfe,
    CLR_KEY: 0xfd,
    RETURN_KEY: 0x81,
    PAGE_LINE_DELIMITER: 0x0a
}

const byteArrayToTextMap = (bytes) => {
    const textmap = emptyTextmap()
    let x = 0, y = 0
    const printByte = (byte) => {
        // logic in text_handler.m:54 - print_to_page
        if (byte === TextCodes.CLR_KEY) {
            for (let rep = 0; rep < 40; rep ++) {
                printByte(TextCodes.DELETE_KEY)
            }
        } else if (byte === TextCodes.RETURN_KEY || byte === TextCodes.PAGE_LINE_DELIMITER) {
            x = 0
            y ++
        } else if (byte === TextCodes.DELETE_KEY) {
            x --
            textmap[y][x] = 32
        } else {
            console.log(x, y, byte)
            textmap[y][x] = byte
            x ++
            if (x >= textmap[0].length) {
                x = 0
                y ++
            }
        }
    }
    for (const byte of bytes) {
        printByte(byte)
    }
    return textmap
}

export const textView = ({ filename, page = 0 }) => {
    const obj = useHabitatText(`db/Text/${filename}`)
    const byteArray = obj.ascii?.[page]
    if (!byteArray) {
        return null
    }
    const textmap = byteArrayToTextMap(byteArray)
    return html`<${textMapView} textmap=${textmap}/>`
}
