import { createContext } from "preact"
import { signal, useSignal, useSignalEffect } from "@preact/signals"
import { useRef, useLayoutEffect, useContext, useMemo } from "preact/hooks"
import { html } from "./view.js"
import { charset, useHabitatText } from "./data.js"
import { Scale } from "./render.js"
import { makeCanvas } from "./shim.js"


export const TEXT_W = 40
export const TEXT_H = 16

export const EditState = createContext(signal({}))
export const editStateDefaults = {
    x: 0,
    y: 0
}
const editStateMethods = {
    moveCursor(dx = 1, dy = 0) {
        if (dx != 0) {
            let x = this.x + dx
            if (x < 0) {
                x = TEXT_W - 1
                dy -= 1
            }
            if (x >= TEXT_W) {
                x = 0
                dy += 1
            }
            this.x = x
        }
        if (dy != 0) {
            let y = this.y + dy
            if (y < 0) {
                y = TEXT_H - 1
            }
            if (y >= TEXT_H) {
                y = 0
            }
            this.y = y
        }
    }
}

export const useEditState = (explicitStateSig = null) => {
    const stateSig = explicitStateSig ?? useContext(EditState)
    return new Proxy(stateSig, {
        get(target, prop, receiver) {
            if (prop in editStateMethods) {
                return editStateMethods[prop].bind(receiver)
            } else if (prop in target.value) {
                return target.value[prop]
            } else {
                return editStateDefaults[prop]
            }
        },
        set(target, prop, value, receiver) {
            target.value = {...target.value, [prop]: value}
            return true
        },
        has(target, prop) {
            return prop in editStateMethods || prop in target.value || prop in editStateDefaults
        }
    }) 
}

export const setChar = (char, textmap, editState) => {
    textmap[editState.y][editState.x] = char
}

export const insertChar = (char, textmap, editState) => {
    setChar(char, textmap, editState)
    editState.moveCursor()
}

export const registerKeyHandler = (document, tracker, editStateSig, textmap) => {
    document.addEventListener("keydown", (e) => {
        const editState = useEditState(editStateSig)
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
            if (e.shiftKey) {
                tracker.redo()
            } else {
                tracker.undo()
            }
        } else if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !e.ctrlKey && !e.metaKey) {
            if (e.key.startsWith("Arrow")) {
                let dx = 0
                let dy = 0
                if (e.key === "ArrowLeft")  { dx -= 1 }
                if (e.key === "ArrowRight") { dx += 1 }
                if (e.key === "ArrowUp")    { dy -= 1 }
                if (e.key === "ArrowDown")  { dy += 1 }
                editState.moveCursor(dx, dy)
            } else if (e.key === "Home") {
                editState.x = 0
            } else if (e.key === "End") {
                editState.x = TEXT_W - 1
            } else if (e.key === "PageUp") {
                editState.y = 0
            } else if (e.key === "PageDown") {
                editState.y = TEXT_H - 1
            } else if (e.key === "Delete") {
                setChar(32, textmap, editState)
            } else if (e.key === "Backspace") {
                editState.moveCursor(-1)
                setChar(32, textmap, editState)
            } else if (e.key === "Enter") {
                editState.x = 0
                editState.moveCursor(0, 1)
            } else if (e.key.length === 1 && e.key.codePointAt(0) < 128) {
                insertChar(e.key.codePointAt(0), textmap, editState)
                e.preventDefault()
            }
        }
    })
}

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

export const textMapView = ({ textmap }) => {
    const chars = charsetCanvases()
    if (!textmap || !chars) {
        return null
    }
    const scale = useContext(Scale)
    const canvasRef = useRef(null)
    useSignalEffect(() => {
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
    })
    const w = textmap[0].length * 8
    const h = textmap.length * 8
    return html`
        <canvas ref=${canvasRef} width="${w}px" height="${h}px"
                style="image-rendering: pixelated; width: ${w*scale}px; height: ${h*scale}px"/>`
}

export const emptyTextmap = () => {
    const textmap = []
    for (let y = 0; y < TEXT_H; y ++) {
        const row = []
        for (let x = 0; x < TEXT_W; x ++) {
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

export const textEditView = ({ textmap }) => {
    const editState = useEditState()
    const scale = useContext(Scale)
    return html`
        <div style="position: relative;">
            <div style="position: absolute; top: 0px; left: 0px">
                <${textMapView} textmap=${textmap}/>
            </div>
            <div style="position: absolute; top: ${8 * editState.y * scale}px; left: ${8 * editState.x * scale}px;
                        width: ${8 * scale}px; height: ${8 * scale}px;"
                 class="text-cursor"/>
        </div>`
}