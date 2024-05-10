import { createContext } from "preact"
import { useSignalEffect } from "@preact/signals"
import { useRef, useCallback, useContext, useMemo } from "preact/hooks"
import { html } from "./view.js"
import { charset, useHabitatText } from "./data.js"
import { Scale } from "./render.js"
import { makeCanvas } from "./shim.js"
import { startDrag, overlayImageView, overlayImageEditor, transparencyGridStyle, booleanCheckbox } from "./edit.js"

export const TEXT_W = 40
export const TEXT_H = 16

export const EditState = createContext(null)
const editStateDefaults = {
    x: 0,
    y: 0,
    mouseChar: 0,
    gestureCount: 0
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

export const useEditState = (explicitState = null) => {
    const state = explicitState ?? useContext(EditState)
    return new Proxy(state, {
        get(target, prop, receiver) {
            if (prop in editStateMethods) {
                return editStateMethods[prop].bind(receiver)
            } else if (prop in target) {
                return target[prop]
            } else {
                return editStateDefaults[prop]
            }
        },
        set(target, prop, value, receiver) {
            target[prop] = value
            return true
        },
        has(target, prop) {
            return prop in editStateMethods || prop in target || prop in editStateDefaults
        }
    }) 
}

export const setChar = (char, textmap, editState) => {
    if (char !== 0) {
        textmap[editState.y][editState.x] = char
    }
}

export const insertChar = (char, textmap, editState) => {
    if (editState.insertMode) {
        if (char === 0) {
            char = 32
        }
        textmap[editState.y].splice(editState.x, 0, char)
        textmap[editState.y].splice(TEXT_W - 1, 1)
    } else {
        setChar(char, textmap, editState)
    }
    editState.moveCursor()
}

export const registerKeyHandler = (document, tracker, trackedEditState, textmap) => {
    document.addEventListener("keydown", (e) => {
        const editState = useEditState(trackedEditState)
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
            if (e.shiftKey) {
                tracker.redo()
            } else {
                tracker.undo()
            }
        } else if (!(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement) && !e.ctrlKey && !e.metaKey) {
            tracker.group(() => {
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
                } else if (e.key === "Enter") {
                    editState.x = 0
                    editState.moveCursor(0, 1)
                }
            }, "navigation")
            tracker.group(() => {
                if (e.key === "Backspace") {
                    editState.moveCursor(-1)
                }
                if (e.key === "Backspace" || e.key === "Delete") {
                    if (editState.insertMode) {
                        textmap[editState.y].splice(editState.x, 1)
                        textmap[editState.y][TEXT_W - 1] = 32    
                    } else {
                        setChar(32, textmap, editState)
                    }
                }
            }, "text-correction")
            tracker.group(() => {
                if (e.key.length === 1 && e.key.codePointAt(0) < 128) {
                    let char = e.key.codePointAt(0)
                    if (editState.spaceMouse && e.key === " ") {
                        char = editState.mouseChar
                    }
                    insertChar(char, textmap, editState)
                    e.preventDefault()
                }    
            }, "text-entry")
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

export const byteArrayToTextMap = (bytes) => {
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

export const textmapToString = (textmap) =>
    textmap.reduce((s, row) => s + String.fromCodePoint(...row), "")

export const textView = ({ filename, page = 0 }) => {
    const obj = useHabitatText(`db/Text/${filename}`)
    const byteArray = obj.ascii?.[page]
    if (!byteArray) {
        return null
    }
    const textmap = byteArrayToTextMap(byteArray)
    return html`<${textMapView} textmap=${textmap}/>`
}

export const mouseCharSelector = ({ tracker }) => {
    const chars = charsetCanvases()
    if (!chars) { return null }
    const editState = useEditState()
    const scale = useContext(Scale)

    const rows = []
    for (let y = 0; y < 8; y ++) {
        const columns = []
        for (let x = 0; x < 16; x ++) {
            let char = x + (y * 16)
            if (char === TextCodes.PAGE_LINE_DELIMITER) {
                char = 0x1f // equivalent character
            } else if (char === 0x1f) {
                columns.push(html`<td style="cursor: not-allowed;" title="No character here"></td>`)
                continue
            }
            const cls = char === editState.mouseChar ? "text-cursor" : ""
            let img = html`<img style="image-rendering: pixelated;" class=${cls} width=${8 * scale} height=${8 * scale} src=${chars[char].toDataURL()}/>`
            if (char === 0) {
                img = html`<div style="${transparencyGridStyle} width: ${8 * scale}px; height: ${8 * scale}px;" class=${cls}/>`
            }
            columns.push(html`<td style="cursor: pointer;" onMouseDown=${() => { editState.mouseChar = char }}>${img}</td>`)
        }
        rows.push(html`<tr>${columns}</tr>`)
    }
    return html`<table>${rows}</table>`
}

export const mouseCanvas = ({ textmap, tracker }) => {
    const editState = useEditState()
    const scale = useContext(Scale)
    const scribble = useCallback((e, state) => {
        if (e.type === "pointerdown") {
            state.gesture = `draw-${editState.gestureCount}`
            state.offsetX = e.pageX - e.offsetX
            state.offsetY = e.pageY - e.offsetY
            editState.gestureCount += 1
        }
        const x = Math.floor((e.pageX - state.offsetX) / (8 * scale))
        const y = Math.floor((e.pageY - state.offsetY) / (8 * scale))
        if (x >= 0 && x < TEXT_W && y >= 0 && y < TEXT_H) {
            tracker.group(() => {
                editState.x = x
                editState.y = y
                setChar(editState.mouseChar, textmap, editState)
            }, state.gesture)
        }
    }, [scale])

    const drag = useCallback(e => {
        if (e.isPrimary) {
            startDrag(e, scribble)
        }
    }, [scale])
    return html`
        <div style="width: ${TEXT_W * scale * 8}px; height: ${TEXT_H * scale * 8}px; cursor: cell;"
             onpointerdown=${drag}/>`
}

export const textEditView = ({ textmap, tracker }) => {
    const editState = useEditState()
    const scale = useContext(Scale)
    return html`
        <div style="position: relative; width: ${TEXT_W * scale * 8}px; height: ${TEXT_H * scale * 8}px;">
            <div style="position: absolute; top: 0px; left: 0px">
                <${textMapView} textmap=${textmap}/>
            </div>
            <div style="position: absolute; top: ${8 * editState.y * scale}px; left: ${8 * editState.x * scale}px;
                        width: ${8 * scale}px; height: ${8 * scale}px;"
                 class="text-cursor"/>
            <div style="position: absolute; top: 0px; left: 0px">
                <${mouseCanvas} textmap=${textmap} tracker=${tracker}/>
            </div>
            <${overlayImageView}/>
        </div>
        <p>Click on the document above to move the cursor and draw the currently-selected character.</p>
        <p>If the document does not have focus, you can enable keyboard input without moving the cursor by clicking
           on any blank space on the page.</p>
        <${overlayImageEditor} cropstyle="document"/>
        <${mouseCharSelector} tracker=${tracker}/>
        <${booleanCheckbox} obj=${editState} field="insertMode">Insert mode<//><br/>
        <${booleanCheckbox} obj=${editState} field="spaceMouse">Spacebar draws selected char<//><br/>
        <div>
            <a href="javascript:;" onclick=${() => navigator.clipboard.writeText(JSON.stringify(textmapToString(textmap)))}>
                Copy <tt>"pages"</tt> JSON string to clipboard
            </a>
        </div>`
}
