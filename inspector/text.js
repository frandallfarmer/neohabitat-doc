import { createContext } from "preact"
import { useSignalEffect, useSignal, signal } from "@preact/signals"
import { useRef, useCallback, useContext, useMemo } from "preact/hooks"
import { html } from "./view.js"
import { charset, useHabitatText } from "./data.js"
import { Scale } from "./render.js"
import { makeCanvas } from "./shim.js"
import { parseHabitatObject } from "./neohabitat.js"
import { startDrag, overlayImageView, overlayImageEditor, transparencyGridStyle, booleanCheckbox, 
    borderStyle, fieldEditor } from "./edit.js"

export const TEXT_W = 40
export const TEXT_H = 16

export const EditState = createContext(null)
const editStateDefaults = {
    x: 0,
    y: 0,
    mouseChar: 0,
    gestureCount: 0,
    ref: "text-new",
    title: '',
    page: 0,
    onlyDrawingChars: true
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

export const registerKeyHandler = (document, tracker, trackedEditState, pages) => {
    document.addEventListener("keydown", (e) => {
        const editState = useEditState(trackedEditState)
        const textmap = pages[editState.page]
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
    const textmapSignal = useSignal(textmap)
    if (textmapSignal.value !== textmap) {
        textmapSignal.value = textmap
    }
    useSignalEffect(() => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext("2d")
        ctx.imageSmoothingEnabled = false
        ctx.fillStyle = "#c46c71"
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        let x = 0, y = 0
        for (const row of textmapSignal.value) {
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
                style="${scale > 1 ? "image-rendering: pixelated;" : ""} width: ${w*scale}px; height: ${h*scale}px"/>`
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

export const cloneTextmap = (textmap) => [...textmap.map(r => [...r])]

const TextCodes = {
    DELETE_KEY: 0xfe,
    CLR_KEY: 0xfd,
    RETURN_KEY: 0x81,
    PAGE_LINE_DELIMITER: 0x0a
}

export const stringToByteArray = (s) => {
    const byteArray = []
    for (const ch of s) {
        byteArray.push(ch.codePointAt(0))
    }
    return byteArray
} 

export const pageByteArraysFromTextObj = (o) => o.ascii ?? o.pages.map(stringToByteArray)

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
            // console.log(x, y, byte)
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

const allChars = [...Array(0x80).keys()]
allChars[TextCodes.PAGE_LINE_DELIMITER] = 0x1f
allChars[0x1f] = null

const drawingChars = [...allChars.slice(0, 0x1f), 0x24,
    0x20, 0x25, 0x26, 0x2a, 0x2d, 0x3d, 0x40, 0x5c, 0x5e, 0x5f, 0x60, 0x7b, 0x7c, 0x7d, 0x7e, 0x7f
]

export const mouseCharSelector = (_) => {
    const chars = charsetCanvases()
    if (!chars) { return null }
    const editState = useEditState()
    const scale = useContext(Scale)
    const charBytes = editState.onlyDrawingChars ? drawingChars : allChars

    let i = 0
    const rows = []
    while (i < charBytes.length) {
        const columns = []
        for (let x = 0; x < 16; x ++) {
            let char = charBytes[i]
            i ++
            if (char == null) {
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
    }, [scale, textmap])

    const drag = useCallback(e => {
        if (e.isPrimary) {
            startDrag(e, scribble)
        }
    }, [scale, scribble])
    return html`
        <div style="width: ${TEXT_W * scale * 8}px; height: ${TEXT_H * scale * 8}px; cursor: cell;"
             onpointerdown=${drag}/>`
}

export const makePage = (tracker, textmap) => tracker.trackSignal(signal(textmap))

export const replacePages = (tracker, pages, newPages) => {
    pages.splice(0, pages.length, ...(newPages.map(o => makePage(tracker, byteArrayToTextMap(o)))))
}

export const generateTextJson = (editState, pages) => {
    let json = {
        ref: editState.ref,
        pages: pages.map(textmapToString)
    }
    if ((editState.title ?? '') !== '') {
        json.title = editState.title
    }
    return json
}

export const fileLoadView = ({ pages, tracker }) => {
    const editState = useEditState()
    return html`
        <label>
            Edit local file: <input type="file" accept=".json" onchange=${(e) => {
                if (e.target.files.length > 0) {
                    (async (file) => {
                        try {      
                            const text = parseHabitatObject(await file.text())
                            const byteArrays = pageByteArraysFromTextObj(text)
                            tracker.group(() => {
                                editState.page = 0
                                editState.ref = text.ref
                                editState.title = text.title ?? ''
                                replacePages(tracker, pages, byteArrays)
                            })
                        } catch (e) {
                            console.error(e)
                            alert(`Failed to parse JSON: ${e}`)
                        }
                    })(e.target.files[0])
                }
            }}/>
        </label>`
}

export const pageNav = ({ pages, tracker }) => {
    const editState = useEditState()
    return html`
        <div style="display: flex; flex-wrap: wrap;">
            <${Scale.Provider} value=${0.5}>
                ${pages.map((textmap, page) => html`
                    <div style="${borderStyle(page === editState.page)}">
                        <a href="javascript:;" onclick=${() => { editState.page = page }}>
                            <${textMapView} textmap=${textmap}/>
                        </a><br/>
                        <center>
                        ${page > 0 ? html`
                            <a href="javascript:;" title="Move before" onclick=${() => { 
                                tracker.group(() => {
                                    pages.splice(page - 1, 2, pages[page], pages[page - 1])
                                    editState.page = page - 1
                                })
                            }}>${'<'}</a>${' '}
                            <a href="javascript:;" title="Delete" onclick=${() => { 
                                tracker.group(() => {
                                    pages.splice(page, 1) 
                                    editState.page = page - 1
                                })
                            }}>X</a>${' '}
                        ` : null}
                        <a href="javascript:;" title="Clone" onclick=${() => {
                            tracker.group(() => {
                                pages.splice(page, 0, makePage(tracker, cloneTextmap(textmap)))
                                editState.page = page + 1
                            })
                        }}>⎘</a>${' '}
                        ${page < (pages.length - 1) ? html`
                            <a href="javascript:;" title="Move after" onclick=${() => { 
                                tracker.group(() => {
                                    pages.splice(page, 2, pages[page + 1], pages[page]) 
                                    editState.page = page + 1
                                })
                            }}>${'>'}</a>
                        ` : null}
                        </center>
                    </div>`)}
                <div style="align-self: center;">
                    <button onclick=${() => { 
                        tracker.group(() => {
                            pages.push(makePage(tracker, emptyTextmap()))
                            editState.page = pages.length - 1    
                        })
                    }}>+Page</button><br/>
                </div>
            <//>
        </div>`
}

export const textEditView = ({ pages, tracker }) => {
    const editState = useEditState()
    const scale = useContext(Scale)
    const textmap = pages[editState.page]
    return html`
        <div style="display: flex; flex-wrap: wrap;">
            <div style="width: ${TEXT_W * scale * 8}px;">
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
            </div>
            <div style="padding-left: 10px;">
                <${fileLoadView} pages=${pages} tracker=${tracker}/><br/>
                <${overlayImageEditor} cropstyle="document"/>
                <button onclick=${() => tracker.undo()}>Undo</button>
                <button onclick=${() => tracker.redo()}>Redo</button>
                <fieldset>
                    <legend>Characters</legend>
                    <${mouseCharSelector}/>
                    <${booleanCheckbox} obj=${editState} field="insertMode">Insert mode<//><br/>
                    <${booleanCheckbox} obj=${editState} field="spaceMouse">Spacebar draws selected char<//><br/>
                    <${booleanCheckbox} obj=${editState} field="onlyDrawingChars">Hide text characters<//><br/>
                </fieldset>
                <div>
                    <button onclick=${() => navigator.clipboard.writeText(JSON.stringify(generateTextJson(editState, pages), null, 2))}>
                        Copy JSON string to clipboard
                    </a>
                </div>
            </div>
        </div>
        <${pageNav} pages=${pages} tracker=${tracker}/>
        <label>Ref: <${fieldEditor} obj=${editState} field="ref"/></label><br/>
        <label>Title: <${fieldEditor} obj=${editState} field="title"/></label><br/>
        <p>Click on the document above to move the cursor and draw the currently-selected character.</p>
        <p>If the document does not have focus, you can enable keyboard input without moving the cursor by clicking
           on any blank space on the page.</p>`
}
