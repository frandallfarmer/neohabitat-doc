import { createContext } from "preact"
import { useContext, useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "preact/hooks"
import { signal } from "@preact/signals"
import { html, catcher, collapsable } from "./view.js"
import { emptyBitmap, trapTextureToBitmap } from "./codec.js"
import { c64Colors, canvasFromBitmap, canvasImage, defaultColors, rgbaFromNibble, Scale } from "./render.js"
import { colorsFromOrientation, javaTypeToMuddleClass, joinReplacements } from "./neohabitat.js"
import { jsonDump, charView } from "./show.js"
import { useJson, charset, betaMud } from "./data.js"
import { propFromMod, imageSchemaFromMod, standaloneItemView, trapCache } from "./region.js"
import { makeCanvas } from "./shim.js"

const transparencyGridStyle = (() => {
    const canvas = makeCanvas(16, 16)
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#f4f4f4"
    ctx.fillRect(0, 0, 16, 16)
    ctx.fillStyle = "#ddd"
    ctx.fillRect(0, 0, 8, 8)
    ctx.fillRect(8, 8, 8, 8)
    return `background-image: url("${canvas.toDataURL()}");`
})()

export const Selection = createContext(signal(null))
export const selectionInteraction = ({ object, children }) => {
    const selectionRef = useContext(Selection)
    return html`
        <div onclick=${() => selectionRef.value = selectionRef.value === object.ref ? null : object.ref}>
            ${selectionRef.value === object.ref ? html`
                <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; 
                            background-color: #ff000040; border: 1px solid red;"></div>
                ` : null}
            ${children}
        </a>`
}

export const createEditTracker = () => {
    const editHistory = []
    const redoHistory = []
    const editListeners = []
    let editGroupSequence = 0
    let currentEditGroup = 0
    let groupLevel = 0
    
    const commitGroup = () => {
        if (groupLevel === 0) {
            editGroupSequence ++
            currentEditGroup = editGroupSequence
        }
    }

    const update = (obj, key, value, splicing = null) => {
        const result = Array.isArray(obj) ? [...obj] : {...obj}
        if (splicing === null) {
            if (value === undefined) {
                delete result[key]
            } else {
                result[key] = value
            }
        } else {
            result.splice(key, splicing, ...value)
        }
        return result
    }

    const updateIn = (obj, place, key, value, splicing) => {
        if (place.length == 0) {
            return update(obj, key, value, splicing)
        } else {
            return update(obj, place[0], updateIn(obj[place[0]], place.slice(1), key, value, splicing))
        }
    }

    const valueAt = (sig, place) => {
        let value = sig.value
        for (const placeKey of place) {
            value = value[placeKey]
        }
        return value
    }
    
    const performEdit = (sig, place, key, value, splicing, history) => {
        const obj = valueAt(sig, place)
        const previous = splicing === null ? obj[key] : obj.slice(key, key + splicing)
        if (previous === value) {
            return
        }
        sig.value = updateIn(sig.value, place, key, value, splicing)
        const edit = { sig, place, key, value, splicing, previous, group: currentEditGroup }
        history.push(edit)
        for (const listener of editListeners) {
            listener(edit)
        }
    }

    const change = (sig, place, key, value, splicing = null) => {
        performEdit(sig, place, key, value, splicing, editHistory)
        redoHistory.length = 0
        commitGroup()
    }

    const undo = (fromHistory = editHistory, toHistory = redoHistory) => {
        let group = null
        while (fromHistory.length > 0) {
            const edit = fromHistory[fromHistory.length - 1]
            group = group ?? edit.group
            if (group !== edit.group) {
                break
            }
            fromHistory.pop()
            const splicing = edit.splicing === null ? null : edit.value.length
            performEdit(edit.sig, edit.place, edit.key, edit.previous, splicing, toHistory)
        }
        commitGroup()
    }
    
    const redo = () => undo(redoHistory, editHistory)

    const dynamicProxy = (targetGetter, handler) => {
        return new Proxy(targetGetter(), {
            apply(target, thisArg, argumentList) { return Reflect.apply(targetGetter(target), thisArg, argumentList) },
            construct(target, args) { return Reflect.construct(targetGetter(target), args) },
            defineProperty(target, key, descriptor) { return Reflect.defineProperty(targetGetter(target), key, descriptor) },
            getPrototypeOf(target) { return Reflect.getPrototypeOf(targetGetter(target)) },
            setPrototypeOf(target) { return Reflect.setPrototypeOf(targetGetter(target)) },
            has(target, key) { return Reflect.has(targetGetter(target), key) },
            isExtensible(target) { return Reflect.isExtensible(targetGetter(target)) },
            preventExtensions(target) { return Reflect.preventExtensions(targetGetter(target)) },
            ownKeys(target) { return Reflect.ownKeys(targetGetter(target)) },
            getOwnPropertyDescriptor(target, prop) { return Reflect.getOwnPropertyDescriptor(targetGetter(target), prop) },
            ...handler
        })
    }

    // define all mutating array ops in terms of splices
    function push(...vals) {
        this.splice(this.length, 0, ...vals)
        return this.length
    }
    function pop() {
        if (this.length > 0) {
            const retval = this[this.length - 1]
            this.splice(this.length - 1, 1)
            return retval
        }
    }
    function shift() {
        if (this.length > 0) {
            const retval = this[0]
            this.splice(this, 0, 1)
            return retval
        }
    }
    function unshift(...vals) {
        this.splice(0, 0, ...vals)
        return this.length
    }
    function sort(compareFn) {
        this.splice(0, this.length, ...this.toSorted(compareFn))
        return this
    }
    const signalSymbol = Symbol("signal")
    const wrapInnerValue = (sig, value, place, refreshParent = () => {}) => {
        function splice(start, deleteCount, ...items) {
            const parentPlace = [...place]
            parentPlace.pop()
            change(sig, parentPlace, start, items, deleteCount)
            refreshParent()
            return this
        }
        if (value === Array.prototype.push) {
            return push
        } else if (value === Array.prototype.pop) {
            return pop
        } else if (value === Array.prototype.shift) {
            return shift
        } else if (value === Array.prototype.unshift) {
            return unshift
        } else if (value === Array.prototype.sort) {
            return sort
        } else if (value === Array.prototype.splice) {
            return splice
        } else if (typeof(value) === "object") {
            if (value[signalSymbol]) {
                return value
            }
            let innerTarget = value
            const refresh = () => { 
                innerTarget = valueAt(sig, place)
                refreshParent()
            }
            return dynamicProxy(() => innerTarget, {
                get(target, property, receiver) {
                    return wrapInnerValue(sig, innerTarget[property], [...place, property], refresh)
                },
                set(target, property, newValue, receiver) {
                    change(sig, place, property, newValue)
                    refresh()
                    return true
                },
                deleteProperty(target, property) {
                    change(sig, place, property, undefined)
                    refresh()
                    return true
                }
            })
        } else {
            return value
        }
    }

    return { 
        undo, 
        redo,
        change,
        editHistory,
        redoHistory,
        trackSignal(sig) {
            return dynamicProxy(() => sig.value, {
                get(target, property, receiver) {
                    if (property === signalSymbol) {
                        return sig
                    }
                    return wrapInnerValue(sig, sig.value[property], [property])
                },
                set(target, property, newValue, receiver) {
                    change(sig, [], property, newValue)
                    return true
                },
                deleteProperty(target, property) {
                    change(sig, [], property, undefined)
                    return true
                }
            })
        },
        registerListener(listener) {
            editListeners.push(listener)
        },
        group(callback, groupID) {
            if (groupLevel === 0 && groupID) {
                currentEditGroup = groupID
            }
            groupLevel ++
            try {
                callback()
            } finally {
                groupLevel --
                commitGroup()
            }
        }
    }
}

export const trapezoidEditListener = ({ sig, place, key }) => {
    const trapKeys = new Set(["upper_left_x", "upper_right_x", "lower_left_x", "lower_right_x", 
                              "height", "pattern_x_size", "pattern_y_size"])
    const trapClasses = new Set(["Trapezoid", "Super_trapezoid"])
    const isEditingTrap = place.length >= 2 && place[0] === "mods" && place[1] === "0" && trapClasses.has(sig.value.mods[0].type)
    const isEditingTexture = isEditingTrap && place.length === 3 && place[2] === "pattern"
    const isEditingTrapKey = isEditingTrap && place.length === 2 && trapKeys.has(key)

    if (isEditingTexture || isEditingTrapKey) {
        trapCache[sig.value.ref] = null
    }
}

export const moveBy = (ref, dx, dy, objects, tracker) => {
    const obj = objects.find(o => o.ref === ref)
    const mod = obj.mods[0]
    const container = objects.find(o => o.ref === obj.in)
    const containerMod = container?.mods?.[0]
    const inc = (o, fd, delta) => o[fd] = (o[fd] + 256 + delta) % 256
    tracker.group(() => {
        if (containerMod?.type === "Glue") {
            inc(containerMod, `x_offset_${mod.y + 1}`, dx)
            inc(containerMod, `y_offset_${mod.y + 1}`, -dy)
        } else if (container?.type === "context") {
            inc(mod, "x", dx)
            inc(mod, "y", dy)
        }
    }, `objmove-${ref}`)
}

export const positionEditor = ({ obj, objects, tracker }) => {
    const regionRef = objects.find(o => o.type === "context").ref
    const selectionRef = useContext(Selection)
    const mod = obj.mods[0]
    const container = objects.find(o => o.ref === obj.in)
    const containerMod = container?.mods?.[0]

    const inc = (field, delta) => html`
        <a href="javascript:;" onclick=${() => {
            moveBy(obj.ref, field === "x" ? delta : 0, field === "y" ? delta : 0, objects, tracker)
        }}>
            ${delta > 0 ? "+" : ""}${delta}
        </a>`
    
    const isGlued = containerMod?.type === "Glue"
    const snap = (field, to) => isGlued ? null : html`
        <a href="javascript:;" onclick=${() => mod[field] = mod[field] - (mod[field] % to)}>
            Snap to cell
        </a>`
    
    const x = isGlued ? containerMod[`x_offset_${mod.y + 1}`] : mod.x
    const y = isGlued ? containerMod[`y_offset_${mod.y + 1}`] : mod.y
    const regionPosition = html`
        <table>
            <tr>
                <td style="width: 100px;">X: ${x}</td>
                <td>
                    [ ${inc("x", -16)} | ${inc("x", -4)} | ${inc("x", -1)} | ${snap("x", 4)} | \
                      ${inc("x", 1)} | ${inc("x", 4)} | ${inc("x", 16)} ]
                </td>
            </tr>
            <tr>
                <td>Y: ${y}</td>
                <td>
                    [ ${inc("y", -16)} | ${inc("y", -8)} | ${inc("y", -1)} | ${snap("y", 8)} | \
                      ${inc("y", 1)} | ${inc("y", 8)} | ${inc("y", 16)} ]
                </td>
            </tr>
        </table>
        ${isGlued ? null : html`
            <div>
                <label>
                    <input type="checkbox" checked=${mod.y > 127}
                        onclick=${() => { if (mod.y > 127) { mod.y -= 128 } else { mod.y += 128 } }}/>
                    Foreground
                </label>
            </div>`}`
    
    const containedPosition = html`
        <div>
            Inside <a href="javascript:;" onclick=${() => { selectionRef.value = obj.in }}>${obj.in}</a>
            , position ${mod.y}
        </div>
        <button style=${buttonStyle} onclick=${() => { obj.in = regionRef }}>
            Remove from container
        </button>`

    return html`
        <${collapsable} summary="Position">
            ${obj.in === regionRef ? regionPosition : containedPosition }
            ${isGlued ? regionPosition : null}
        <//>`
}

export const patternSelector = ({ selected, onSelected }) => html`
    <div style="display: flex">
        ${[...Array(15).keys()].map((ipattern) => html`
            <div key=${`pattern${ipattern}`}
                style="width: 48px; height: 48px; margin: 2px;
                        border: 4px dotted ${selected === ipattern ? " black" : "transparent"};"
                onclick=${() => onSelected(ipattern)}>
                <${canvasImage} canvas=${canvasFromBitmap(emptyBitmap(2, 16, 1), { pattern: ipattern })}/>
            </div>`)}
    </div>`

export const colorSelector = ({ selected, onSelected }) => html`
    <div style="display: flex">
        ${c64Colors.map((color, icolor) => html`
            <div key=${`color${icolor}`} 
                style="width: 48px; height: 48px; margin: 2px;
                        border: 4px dotted ${selected === icolor ? " black" : "transparent"};"
                onclick=${() => onSelected(icolor)}>
                <div style="background-color: #${color.toString(16).padStart(6, "0")}; width: 100%; height: 100%;"/>
            </div>`)}
    </div>`

export const orientationEditor = ({ obj }) => {
    const mod = obj.mods[0]
    // color, pattern, flip
    const colors = colorsFromOrientation(mod.orientation)
    const flipped = (mod.orientation & 0x01) != 0
    return html`
        <${collapsable} summary="Orientation">
            <${colorSelector}
                selected=${colors.wildcard}
                onSelected=${icolor => { mod.orientation = (mod.orientation & 0x07) | 0x80 | (icolor << 3) }}/>
            <${patternSelector} 
                selected=${colors.pattern}
                onSelected=${ipattern => { mod.orientation = (mod.orientation & 0x07) | (ipattern << 3) }}/>
            <div>
                <label>
                    <input type="checkbox" checked=${flipped}
                            onclick=${() => { mod.orientation = (mod.orientation & 0xfe) | (flipped ? 0 : 1) }}/>
                    Flip horizontally
                </label>
            </div>
        <//>`
}

export const styleEditor = ({ obj, objects }) => {
    const mod = obj.mods[0]
    const { cls, imageKey } = imageSchemaFromMod(mod) ?? {}
    const prop = propFromMod(mod, obj.ref)
    if (!prop) {
        return null
    }
    const grstateSelector = prop.animations.length > 0 ? html`
        <div style="display: flex; flex-wrap: wrap; align-items: center;">
            ${prop.animations.map((animation, i) => html`
                <${catcher} filename="${obj.ref} : Animation ${i}" key="${obj.ref}gr_state${i}">
                    <div style="border: 4px dotted ${mod.gr_state === i ? " black" : "transparent"}"
                         onclick=${() => { mod.gr_state = i }}>
                        <${standaloneItemView} object=${({...obj, mods: [{...mod, gr_state: i}]})}
                                               objects=${objects}/>
                    </div>
                <//>`)}
        </div>` : html`<em>0 (non-animated)</em>`

    return html`
        <${collapsable} summary="Style">
            <${Scale.Provider} value="1">
                <div>Style</div>
                <div style="display: flex; flex-wrap: wrap; align-items: center;">
                    ${cls[imageKey].map((_, istyle) => html`
                        <${catcher} filename="${obj.ref} : Style ${istyle}" key="${obj.ref}style${istyle}">
                            <div style="border: 4px dotted ${mod.style === istyle ? " black" : "transparent"}"
                                 onclick=${() => { mod.style = istyle }}>
                                <${standaloneItemView} object=${({...obj, mods: [{...mod, style: istyle, gr_state: 0}]})}
                                                    objects=${objects}/>
                            </div>
                        <//>`)}
                </div>
                <div>Animation (<tt>gr_state</tt>)</div>
                ${grstateSelector}
            <//>
        <//>`
}

export const itemSlotEditor = ({ objects, tracker, slot, capacity, containerRef, selectionRef, refToInsert }) => {
    const items = objects.filter(o => o.in === containerRef && o.mods[0].y === slot)
    const moveItem = (item, slot) => {
        tracker.group(() => {
            item.mods[0].x = slot
            item.mods[0].y = slot
        })
    }
    const swapWithSlot = (item, slotNew) => {
        tracker.group(() => {
            const prevItems = objects.filter(o => o.in === containerRef && o.mods[0].y === slotNew)
            moveItem(item, slotNew)
            prevItems.forEach(i => moveItem(i, slot))
        })
    }
    if (items.length === 0) {
        return html`
            <button style="${refToInsert !== null ? primaryButtonStyle : disabledStyle} text-align: center;"
                    disabled=${refToInsert === null}
                    onclick=${() => {
                        tracker.group(() => {
                            const o = objects.find(o => o.ref === refToInsert)
                            moveItem(o, slot)
                            o.in = containerRef
                        })
                    }}>
                +<br/>Insert into<br/>this slot
            </button>`
    }
    return html`
        <div style="display: flex; flex-wrap: wrap; ${items.length > 1 ? "background-color: #fcc;" : ""}">
            ${items.map(o => html`
                <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
                    <a href="javascript:;" onclick=${() => { selectionRef.value = o.ref }}>
                        <${standaloneItemView} object=${o} objects=${objects}/>
                    </a>
                    <div>
                    ${slot === 0 ? null : html`
                        <button style=${primaryButtonStyle}
                            onclick=${() => { swapWithSlot(o, slot - 1) }}>
                            ◄ 
                        </button>`}
                    <button style=${dangerousStyle}
                        onclick=${() => { objects.splice(objects.findIndex(item => item.ref === o.ref), 1) }}>
                        🗑
                    </button>
                    ${slot === (capacity - 1) ? null : html`
                        <button style=${primaryButtonStyle}
                            onclick=${() => { swapWithSlot(o, slot + 1) }}>
                            ►
                        </button>`}
                    </div>
                </div>
            `)}
        </div>`
}

export const containerEditor = ({ objects, obj, tracker }) => {
    const selectionRef = useContext(Selection)
    const regionRef = objects.find(o => o.type === "context").ref
    const items = objects
        .filter(o => o.in === obj.ref)
        .sort((o1, o2) => o1.mods[0].y - o2.mods[0].y)
    const capacity = betaMud().class?.[javaTypeToMuddleClass(obj.mods[0].type)]?.byte?.[2] ?? 0
    if (capacity === 0 && items.length === 0) {
        return null
    }
    const insertableObjects = objects.filter(o => o.type === "item" && 
                                                  o.in === regionRef && 
                                                  o.ref !== obj.ref &&
                                                  o.ref !== obj.in)
    let [refToInsert, setRefToInsert] = useState(null)
    refToInsert = refToInsert ?? (insertableObjects.length > 0 ? insertableObjects[0].ref : null)
    return html`
        <${collapsable} summary="Container">
            <div style="display: flex; flex-wrap: wrap">
                ${[...Array(capacity).keys()].map(i => html`
                    <div style="display: flex; flex-direction: column; justify-content: space-between; align-items: center;">
                        <div>Slot ${i + 1}</div>
                        <${itemSlotEditor} objects=${objects} 
                                           tracker=${tracker} 
                                           slot=${i} 
                                           containerRef=${obj.ref} 
                                           selectionRef=${selectionRef}
                                           refToInsert=${refToInsert}/>
                    </div>`)}
            </div>
            ${items.length >= capacity || insertableObjects.length === 0 ? null : html`
                <select onChange=${e => setRefToInsert(e.target.value)}>
                    ${insertableObjects.map(o => html`
                        <option key=${o.ref} value=${o.ref} selected=${o.ref === refToInsert}>
                            ${o.name} (${o.ref})
                        </option>
                    `)}
                </select>`}
        <//>`
}

export const fieldEditor = ({ field, obj, defaultValue }) => {
    const val = obj[field] ?? defaultValue
    if (typeof(val) === "number") {
        return html`<input type="number" value=${val} 
                            onChange=${e => { obj[field] = parseInt(e.currentTarget.value) }}/>`
    } else if (typeof(val) === "string") {
        return html`<input type="text" value=${val}
                            onChange=${e => { obj[field] = e.currentTarget.value }}/>`
    } else {
        return html`<tt>${JSON.stringify(val, null, " ")}</tt>`
    }
}

export const extraFieldsEditor = ({ obj }) => {
    const handledFields = new Set(
        ["x", "y", "orientation", "style", "gr_state", "type", "port_dir", "town_dir", 
         "neighbors", "nitty_bits", "is_turf", "depth", "text", "ascii", "pattern"]
    )
    for (let i = 1; i <= 6; i ++) {
        handledFields.add(`x_offset_${i}`)
        handledFields.add(`y_offset_${i}`)
    }
    const keys = [...Object.keys(obj.mods[0])]
        .filter(k => !handledFields.has(k))
        .sort()
    if (keys.length > 0) {
        return html`
            <${collapsable} summary="Fields">
                <table>
                    ${keys.map(k => html`
                        <tr>
                            <td><tt>${k}</tt></td>
                            <td><${fieldEditor} key=${k} field=${k} obj=${obj.mods[0]}/></td>
                        </tr>`)}
                </table>
            <//>`
    }
}

// all of these characters are chosen to fit into one 16-bit "char"
// so that I can be lazy about indexing into them
const unicodeCharmap = "█◤▏◣◥▕◢◖◗⸝⸜⸍⸌┏┓┛┗◜◝◞◟┣┫┻┳╋┃━◇◆ʘ⸜"
const unicodeCtrlmap = "␣↦↤↥↧⇄\n⇢⇠⇡⇣ꜜ◙☃⛇⧢"
const ctrlCharDescriptions = [
    ["Half space", "q"],
    ["Increase pixel width", "."],
    ["Decrease pixel width", ","],
    ["Increase pixel height", "="],
    ["Decrease pixel height", "-"],
    ["Toggle half-width", "\\"],
    null,
    ["Cursor right", "d"],
    ["Cursor left", "a"],
    ["Cursor up", "w"],
    ["Cursor down", "s"],
    ["Cursor half-down", "x"],
    ["Toggle inverse", "/"],
    null,
    null,
    ["Double space", "e"]
]
// Because this is a real object, not indexed via charCodeAt(), we can use any
// codepoint here
const asciiReplacements = { 
    "$": "$", "@": "@", "\\": "£", "^": "^", "_": "_", 
    "{": "✓", "|": "🠝", "}": "🠟", "~": "🠜", "\u007f": "🠞"
}

const asciiToUnicode = (ascii) => 
    Object.entries(asciiReplacements)
        .reduce((s, [a, u]) => s.replaceAll(a, u), ascii)

const unicodeToAscii = (unicode) =>
    Object.entries(asciiReplacements)
        .reduce((s, [a, u]) => s.replaceAll(u, a), unicode)

export const bytesToUnicode = (bytes) =>
    asciiToUnicode(
        bytes
            .map(b => {
                if (b < 32) {
                    return unicodeCharmap[b]
                }
                if (b > 127 && b < (128 + ctrlCharDescriptions.length)) {
                    return unicodeCtrlmap[b - 128]
                }
                return String.fromCharCode(b)
            })
            .join("")
    )

export const stringToBytes = (s) =>
    unicodeToAscii(s)
        .split("")
        .map(c => {
            const byte = c.charCodeAt(0)
            if (byte === 0x0a) {
                return 128 + 6 // carriage return
            } else if (byte > 255) {
                for (let i = 0; i < unicodeCharmap.length; i ++) {
                    if (byte === unicodeCharmap.charCodeAt(i)) {
                        return i
                    }
                }
                for (let i = 0; i < unicodeCtrlmap.length; i ++) {
                    if (byte === unicodeCtrlmap.charCodeAt(i)) {
                        return i + 128
                    }
                }
                return 32
            } else {
                return byte
            }
        })

export const textEditor = ({ obj, tracker }) => {
    const mod = obj.mods[0]
    const maxLength = mod.type === "Sign" ? 40 :
                      mod.type === "Short_sign" ? 10 : 0
    if (maxLength === 0) {
        return null
    }
    const input = useRef(null)
    const insert = c => {
        input.current.setRangeText(c, input.current.selectionStart, input.current.selectionEnd, "end")
        input.current.dispatchEvent(new InputEvent("input", { data: c }))
        input.current.focus()
    }

    const bytes = (mod.text ? stringToBytes(mod.text) : mod.ascii) ?? []
    const text = bytesToUnicode(bytes)

    const [[selectionStart, selectionEnd], setCursor] = useState([0, 0])
    useEffect(() => {
        input.current?.setSelectionRange(selectionStart, selectionEnd)
    }, [input, selectionStart, selectionEnd, text])

    const colors = { pixelHeight: 2, pattern: 0xaa }
    return html`
        <${collapsable} summary="Text">
            <${Scale.Provider} value="1">
                <div style="display: flex; gap: 2px; flex-wrap: wrap;">
                    Control characters: 
                    ${ctrlCharDescriptions.map((desc, i) => !desc ? null : html`
                        <a href="javascript:;" title="${desc[0]} (Alt-${desc[1]})"
                        onClick=${() => { insert(unicodeCtrlmap[i]) }}>
                            ${unicodeCtrlmap[i]}
                        </a>
                    `)}
                </div>
                <div style="display: flex; gap: 2px; flex-wrap: wrap;">
                    ${unicodeCharmap.split("").map((c, i) => html`
                        <a href="javascript:;" onClick=${() => { insert(c) }}>
                            <${charView} charset=${charset()} byte=${i} colors=${colors}/>
                        </a>
                    `)}
                    ${Object.keys(asciiReplacements).map(c => html`
                        <a href="javascript:;" onClick=${() => { insert(c) }}>
                            <${charView} charset=${charset()} byte=${c.charCodeAt(0)} colors=${colors}/>
                        </a>
                    `)}
                </div>
                <textarea style="font-size: 18px;" rows="6" cols="40" 
                    ref=${input} value=${text} onInput=${e => {
                        const selectionDelta = e.data ? asciiToUnicode(e.data).length - e.data.length : 0
                        setCursor([e.target.selectionStart + selectionDelta, e.target.selectionEnd + selectionDelta])
                        tracker.group(() => {
                            if (mod.text !== undefined) {
                                delete mod.text
                            }
                            const bytes = stringToBytes(e.target.value)
                            if (bytes.length > maxLength) {
                                bytes.length = maxLength
                            }
                            mod.ascii = bytes
                        })
                    }} onkeydown=${e => {
                        if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                            for (const [i, desc] of ctrlCharDescriptions.entries()) {
                                if (desc && desc[1] === e.key) {
                                    insert(unicodeCtrlmap[i])
                                    e.preventDefault()
                                    return
                                }
                            }
                        }
                    }}/> ${bytes.length} / ${maxLength}
            <//>
        <//>`
}

export const bitmapEditor = ({ colors, bitmap, onChange }) => {
    const scale = 8
    colors = useMemo(() => ({ ...defaultColors, ...(colors ?? {}) }), [colors])
    const [selectedColor, setSelectedColor] = useState(0)

    const changeCollector = useRef({ drawing: false, changes: [] }).current
    const canvasRef = useRef(null)
    const putpixel = useCallback((e) => {
        if (e.type === "pointerdown" && e.isPrimary) {
            changeCollector.drawing = true
            e.target.setPointerCapture(e.pointerId)
        }
        if (!changeCollector.drawing) {
            return
        }
        const x = Math.floor(e.offsetX / (scale * 2))
        const y = Math.floor(e.offsetY / scale)
        let newPixel = x >= 0 && x < bitmap[0].length && y >= 0 && y < bitmap.length
        if (newPixel && changeCollector.changes.length > 0) {
            const prevChange = changeCollector.changes[changeCollector.changes.length - 1]
            if (prevChange.x === x && prevChange.y === y && prevChange.color === selectedColor) {
                newPixel = false
            }
        }
        if (newPixel) {
            changeCollector.changes.push({x, y, color: selectedColor})
            bitmap[y][x] = selectedColor
            const rgba = rgbaFromNibble(selectedColor, x, y, colors)
    
            // plot the pixel on the canvas
            const ctx = canvasRef.current.getContext("2d")
            if ((rgba & 0xff) !== 0) {
                ctx.fillStyle = `rgba(${((rgba & 0xff000000) >> 24) & 0xff} ` +
                                     `${(rgba & 0xff0000) >> 16} ` +
                                     `${(rgba & 0xff00) >> 8})`
                ctx.fillRect(x * scale * 2, y * scale, scale * 2, scale)    
            } else {
                ctx.clearRect(x * scale * 2, y * scale, scale * 2, scale)
            }
        }
        
        if (e.type === "pointerup") {
            onChange(changeCollector.changes)
            changeCollector.changes.length = 0
            changeCollector.drawing = false
        }
    })
    
    useLayoutEffect(() => {
        const canvas = canvasFromBitmap(bitmap, colors)
        const ctx = canvasRef.current.getContext("2d")
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.imageSmoothingEnabled = false
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 
                              0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.strokeStyle = "#333"
        for (let x = 1; x < bitmap[0].length; x ++) {
            ctx.moveTo(x * scale * 2, 0)
            ctx.lineTo(x * scale * 2, scale * bitmap.length)
        }
        for (let y = 1; y < bitmap.length; y ++) {
            ctx.moveTo(0, y * scale)
            ctx.lineTo(bitmap[0].length * scale * 2, y * scale)
        }
        ctx.stroke()
    }, [bitmap, colors, scale])

    return html`
        <div style="display: flex; flex-wrap: wrap; align-items: center;">
            <div style="display: flex;">
                <${Scale.Provider} value="3">
                    ${[0, 1, 2, 3].map(nibble => html`
                        <div style="width: ${16 * 3}px; height: ${16 * 3}px; margin: 2px;
                                    border: 4px dotted ${selectedColor === nibble ? " black" : "transparent"};"
                            onclick=${() => { setSelectedColor(nibble) }}>
                            <div style="${transparencyGridStyle} line-height: 0px;">
                                <${canvasImage} canvas=${canvasFromBitmap(emptyBitmap(2, 16, nibble), colors)}/>
                            </div>
                        </div>`)}
                <//>
            </div>
            <canvas style=${`${transparencyGridStyle} ${scale > 1 ? "image-rendering: pixelated;" : ""}`}
                    width="${scale * (bitmap[0].length * 2)}px" height="${scale * bitmap.length}px"
                    ref=${canvasRef}
                    onPointerDown=${putpixel} onPointerMove=${putpixel} onPointerUp=${putpixel}/>
        </div>`
}

export const trapezoidEditor = ({ obj, tracker }) => {
    const mod = obj.mods[0]
    if (mod.type === "Super_trapezoid") {
        const colors = useMemo(() => ({ ...colorsFromOrientation(mod.orientation), pattern: 15 }), [mod.orientation])
        const w = mod.pattern_x_size + 1
        const h = mod.pattern_y_size + 1
        const bitmap = useMemo(() => trapTextureToBitmap(w, h, (i) => mod.pattern[i]), [mod.pattern])
        const onChange = useCallback(changes => {
            tracker.group(() => {
                for (const change of changes) {
                    const ibyte = Math.floor(change.x / 4) + (change.y * w)
                    const shift = (3 - (change.x % 4)) * 2
                    const byte = mod.pattern[ibyte] & ~(0x03 << shift) | (change.color << shift)
                    mod.pattern[ibyte] = byte
                }
            })
        })
        return html`
            <${collapsable} summary="Trapezoid">
                <div>Texture</div>
                <${bitmapEditor} bitmap=${bitmap} onChange=${onChange} colors=${colors}/>
            <//>`
    }
}
export const randomSlug = () => {
    const validChars = "0123456789abcdefghijklmnopqrstuvwxyz"
    const genChar = () => validChars[Math.floor(Math.random() * validChars.length)]
    return `${genChar()}${genChar()}${genChar()}${genChar()}`
}

export const suffixFromRegionRef = (ref) => ref.replace(/^context-/, "")
export const generateRef = (type, regionRef) => `${type}.${randomSlug()}.${suffixFromRegionRef(regionRef)}`

export const renameRef = (objects, refOld, refNew) => {
    const replace = (obj, field) => {
        if (obj[field] === refOld) {
            obj[field] = refNew
        }
    }
    let wasRegion = false
    for (const obj of objects) {
        if (obj.ref === refOld && obj.type === "context") {
            wasRegion = true
        }
        replace(obj, "ref")
        replace(obj, "in")
        replace(obj.mods[0], "connection")
    }

    if (wasRegion) {
        const oldSuffix = suffixFromRegionRef(refOld)
        const newSuffix = suffixFromRegionRef(refNew)

        for (const obj of objects) {
            if (obj.ref !== refNew && obj.ref.includes(oldSuffix)) {
                const objRefNew = obj.ref.includes(refOld) ? obj.ref.replace(refOld, newSuffix) 
                                                        : obj.ref.replace(oldSuffix, newSuffix)
                renameRef(objects, obj.ref, objRefNew)
            }
        }
    }
}


export const refEditor = ({ obj, objects, tracker }) => {
    const selectionRef = useContext(Selection)
    return html`
        <${collapsable} summary="ID">
            <table>
                <tr>
                    <td>Name</td>
                    <td><${fieldEditor} field="name" obj=${obj}/></td>
                </tr>
                <tr>
                    <td>Ref</td>
                    <td>
                        <input type="text" value=${obj.ref}
                               onChange=${e => { 
                                    if (selectionRef.value === obj.ref) {
                                        selectionRef.value = e.target.value
                                    }
                                    tracker.group(() => renameRef(objects, obj.ref, e.target.value))                                    
                               }}/>
                    </td>
                </tr>
            </table>
        <//>`
}

const directionDropdown = ({ obj, k }) => html`
    <select onChange=${e => { obj[k] = joinReplacements[e.target.value] ?? "" }}>
        <option value="" selected=${obj[k] === ""}>
            [none]
        </option>
        ${["UP", "DOWN", "LEFT", "RIGHT"].map((dir) => html`
            <option value=${dir} selected=${obj[k] === joinReplacements[dir]}>
                ${dir}
            </option>
        `)}
    </select>`

export const bitCheckbox = ({ obj, field, bitmask, children }) => {
    return html`
        <label>
            <input type="checkbox" 
                   checked=${(obj[field] & bitmask) != 0}
                   onChange=${e => { 
                       obj[field] = obj[field] & (~bitmask) | (e.target.checked ? bitmask : 0) 
                   }}/>
            ${children}
        </label>
    `
}

export const booleanCheckbox = ({ obj, field, children }) => html`
    <label>
        <input type="checkbox"
               checked=${obj[field] ?? false}
               onChange=${e => { obj[field] = e.target.checked }}/>
        ${children}
    </label>`

export const regionEditor = ({ obj }) => {
    const mod = obj.mods[0]
    const orientations = ["West is (↑) Top / Top is West", "West is (←) Left / Top is North", 
                          "West is (↓) Bottom / Top is East", "West is (→) Right / Top is South"]
    return html`
        <${collapsable} summary="Region">
            <table>
                ${["North", "East", "South", "West"].map((dir, idir) => html`
                    <tr>
                        <td>${dir}</td>
                        <td><input type="text" value=${mod.neighbors[idir]}
                                   onchange=${e => { mod.neighbors[idir] = e.target.value.trim() }}/></td>
                    </tr>
                `)}
                <tr>
                    <td>Orientation</td>
                    <td>
                        <select onChange=${e => { mod.orientation = parseInt(e.target.value) }}>
                            ${orientations.map((desc, i) => html`
                                <option value=${i} selected=${mod.orientation === i}>${desc}</option>
                            `)}
                        </select>
                    </td>
                </tr>
                <tr>
                    <td>Town direction</td>
                    <td><${directionDropdown} obj=${mod} k=${"town_dir"}/></td>
                </tr>
                <tr>
                    <td>Teleporter direction</td>
                    <td><${directionDropdown} obj=${mod} k=${"port_dir"}/></td>
                </tr>
                <tr>
                    <td>Depth</td>
                    <td><${fieldEditor} field="depth" obj=${mod} defaultValue=${32}/></td>
                </tr>
                <tr><td colspan="2">
                    <${bitCheckbox} obj=${mod} field="nitty_bits" bitmask=${0x01}>Weapons-free<//>
                </td></tr>
                <tr><td colspan="2">
                    <${bitCheckbox} obj=${mod} field="nitty_bits" bitmask=${0x02}>Steal-free<//>                
                </td></tr>
                <tr><td colspan="2">
                    <${booleanCheckbox} obj=${mod} field="is_turf">Is turf<//>                
                </td></tr>
            </table>
        <//>`
}

export const propEditor = ({ objects, tracker }) => {
    const selectionRef = useContext(Selection)
    const regionRef = objects.find(o => o.type === "context").ref
    const obj = objects.find(o => o.ref === (selectionRef.value ?? regionRef))
    if (obj) {
        let itemEditors
        if (obj.type === "item") {
            itemEditors = html`
                <${positionEditor} obj=${obj} objects=${objects} tracker=${tracker} />
                <${containerEditor} obj=${obj} objects=${objects} tracker=${tracker}/>
                <${orientationEditor} obj=${obj}/>
                <${trapezoidEditor} obj=${obj} tracker=${tracker}/>
                <${textEditor} obj=${obj} tracker=${tracker}/>
                <${styleEditor} obj=${obj} objects=${objects}/>`
        } else if (obj.type === "context") {
            itemEditors = html`<${regionEditor} obj=${obj}/>`
        }
        return html`
            <${catcher} filename="${obj.ref} - editor">
                <${jsonDump} heading=${html`<h3 style="display: inline-block">${obj.name} (${obj.ref})</h3>`} value=${obj}/>
                <${refEditor} objects=${objects} obj=${obj} tracker=${tracker}/>
                ${itemEditors}
                <${extraFieldsEditor} obj=${obj}/>
            <//>`
    }
}

const swapItemsAtIndex = (objects, index) => {
    objects.splice(index, 2, objects[index + 1], objects[index])
}

const buttonStyle = "border-radius: 8px; font-size: 16px;"
const disabledStyle = `background-color: #777; color: #ccc; ${buttonStyle}`
const dangerousStyle = `background-color: red; color: white; ${buttonStyle}`
const primaryButtonStyle = `background-color: blue; color: white; ${buttonStyle}`

export const addNewObject = (type, objects, tracker, selectionRef, defaultModValues) => {
    const regionRef = objects.find(o => o.type === "context").ref
    const obj = {
        type: "item",
        ref: `${type}.${randomSlug()}.${regionRef}`,
        name: type,
        in: regionRef,
        mods: [{
            type,
            x: 80,
            y: 32,
            style: 0,
            gr_state: 0,
            orientation: 0,
            ...(defaultModValues[type] ?? {})
        }]
    }
    objects.push(tracker.trackSignal(signal(obj)))
    selectionRef.value = obj.ref
}

export const newObjectButton = ({ objects, tracker }) => {
    const defaultModValues = useJson("default_mod_values.json", {})
    const javaClasses = useMemo(() => [...Object.keys(defaultModValues)].sort(), [defaultModValues])
    const [iclass, setIClass] = useState(0)
    const selectionRef = useContext(Selection)
    return html`
        <button style=${primaryButtonStyle}
                onclick=${() => { addNewObject(javaClasses[iclass], objects, tracker, selectionRef, defaultModValues) }}>
            + Create
        </button>
        <select onchange=${(e) => { setIClass(parseInt(e.target.value)) }}>
            ${javaClasses.map((cls, icls) => html`
                <option key=${cls} value=${icls} selected=${iclass === icls}>${cls}</option>
            `)}
        </select>`
}

export const objectPanel = ({ objects, tracker }) => {
    const selectionRef = useContext(Selection)
    const iselection = objects.findIndex(o => o.ref === selectionRef.value)
    const deleteDisabled = iselection <= 0
    const moveUpDisabled = iselection <= 1
    const moveDownDisabled = iselection <= 0 || iselection >= objects.length - 1
    
    return html`
        <div style="padding: 5px;">
            <a href="javascript:;" onclick=${() => tracker.undo()}>Undo</a> | <a href="javascript:;" onclick=${() => tracker.redo()}>Redo</a>
        </div>
        <fieldset>
            <legend>Objects</legend>
            ${objects.map(o => html`
                <div>
                    <label>
                        <input type="radio" checked=${o.ref === selectionRef.value}
                               onclick=${() => { selectionRef.value = o.ref }}/>
                        ${o.name} (${o.ref})
                    </label>
                </div>
            `)}
            <${newObjectButton} objects=${objects} tracker=${tracker}/>
            <button style="${moveUpDisabled ? disabledStyle : buttonStyle}" disabled=${moveUpDisabled}
                    onclick=${() => { swapItemsAtIndex(objects, iselection - 1)}}>
                ⇧
            </button>
            <button style="${moveDownDisabled ? disabledStyle : buttonStyle}" disabled=${moveDownDisabled}
                    onclick=${() => { swapItemsAtIndex(objects, iselection)}}>
                ⇩
            </button>
            <button style="${deleteDisabled ? disabledStyle : dangerousStyle}" disabled=${deleteDisabled} 
                    onclick=${() => { objects.splice(iselection, 1) }}>
                Delete
            </button>
        </fieldset>`
}

export const registerKeyHandler = (document, tracker, selectionRef, objects) => {
    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
            if (e.shiftKey) {
                tracker.redo()
            } else {
                tracker.undo()
            }
        } else if (e.key === "Escape") {
            selectionRef.value = null
        } else if (e.key.startsWith("Arrow") && selectionRef.value !== null
                   && !(e.target instanceof HTMLInputElement)
                   && !(e.target instanceof HTMLTextAreaElement)) {
            const obj = objects.find(o => o.ref === selectionRef.value)
            if (obj && obj.type === "item") {
                let dx = 0
                let dy = 0
                if (e.key === "ArrowLeft")  { dx -= 4 }
                if (e.key === "ArrowRight") { dx += 4 }
                if (e.key === "ArrowUp")    { dy += 4 }
                if (e.key === "ArrowDown")  { dy -= 4 }
                moveBy(obj.ref, dx, dy, objects, tracker)
                if (dx !== 0 || dy !== 0) {
                    e.preventDefault()
                }
            }
        }
    })
}

export const depthEditor = ({ objects }) => {
    const selectionRef = useContext(Selection)
    const scale = useContext(Scale)
    const region = objects.find(o => o.type === "context")
    if (selectionRef.value !== null && selectionRef.value !== region.ref) {
        return null
    }
    const yDepth = 127 - (region.mods[0].depth ?? 32)
    return html`<div style="position: absolute; left: 0; top: ${yDepth * scale}px; width: 100%; 
                            height: ${scale}px; background-color: red; opacity: 50%; z-index: 10001;
                            pointer-events: none;"/>`
}
