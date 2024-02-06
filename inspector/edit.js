import { createContext } from "preact"
import { useContext, useState, useMemo } from "preact/hooks"
import { signal } from "@preact/signals"
import { html, catcher } from "./view.js"
import { emptyBitmap, decodeProp } from "./codec.js"
import { c64Colors, canvasFromBitmap, canvasImage, Scale } from "./render.js"
import { colorsFromOrientation } from "./neohabitat.js"
import { jsonDump, propAnimation, celmaskImage } from "./show.js"
import { useJson } from "./data.js"
import { propFromMod, imageSchemaFromMod, standaloneItemView } from "./region.js"

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
    
    const update = (obj, key, value, splicing = null) => {
        const result = Array.isArray(obj) ? [...obj] : {...obj}
        if (splicing === null) {
            result[key] = value
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
        sig.value = updateIn(sig.value, place, key, value, splicing)
        history.push({ sig, place, key, value, splicing, previous })
    }

    const change = (sig, place, key, value, splicing = null) => {
        performEdit(sig, place, key, value, splicing, editHistory)
        redoHistory.length = 0
    }

    const undo = (fromHistory = editHistory, toHistory = redoHistory) => {
        const edit = fromHistory.pop()
        if (edit) {
            const splicing = edit.splicing === null ? null : edit.value.length
            performEdit(edit.sig, edit.place, edit.key, edit.previous, splicing, toHistory)
        }
    }
    
    const redo = () => undo(redoHistory, editHistory)

    const dynamicProxy = (targetGetter, handler) => {
        return new Proxy(targetGetter(), {
            ownKeys(target) { return Reflect.ownKeys(targetGetter(target)) },
            getOwnPropertyDescriptor(target, prop) { return Reflect.getOwnPropertyDescriptor(targetGetter(target), prop) },
            ...handler
        })
    }
    const wrapInnerValue = (sig, value, place, refreshParent = () => {}) => {
        if (typeof(value) === "object") {
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
                    return wrapInnerValue(sig, sig.value[property], [property])
                },
                set(target, property, newValue, receiver) {
                    change(sig, [], property, newValue)
                    return true
                }
            })
        }
    }
}

export const positionEditor = ({ obj, regionRef }) => {
    const selectionRef = useContext(Selection)
    const mod = obj.mods[0]
    const inc = (field, delta) => html`
        <a href="javascript:;" onclick=${() => mod[field] = (mod[field] + 256 + delta) % 256}>
            ${delta > 0 ? "+" : ""}${delta}
        </a>`
    const snap = (field, to) => html`
        <a href="javascript:;" onclick=${() => mod[field] = mod[field] - (mod[field] % to)}>
            Snap to cell
        </a>`

    const regionPosition = html`
        <table>
            <tr>
                <td style="width: 100px;">X: ${mod.x}</td>
                <td>
                    [ ${inc("x", -16)} | ${inc("x", -4)} | ${inc("x", -1)} | ${snap("x", 4)} |
                    ${inc("x", 1)} | ${inc("x", 4)} | ${inc("x", 16)} ]
                </td>
            </tr>
            <tr>
                <td>Y: ${mod.y}</td>
                <td>
                    [ ${inc("y", -16)} | ${inc("y", -8)} | ${inc("y", -1)} | ${snap("y", 8)} |
                    ${inc("y", 1)} | ${inc("y", 8)} | ${inc("y", 16)} ]
                </td>
            </tr>
        </table>
        <div>
            <label>
                <input type="checkbox" checked=${mod.y > 127}
                    onclick=${() => { if (mod.y > 127) { mod.y -= 128 } else { mod.y += 128 } }}/>
                Foreground
            </label>
        </div>`
    
    const containedPosition = html`
        <div>
            Inside <a href="javascript:;" onclick=${() => { selectionRef.value = obj.in }}>${obj.in}</a>
            , position ${mod.y}
        </div>
        <button style=${buttonStyle} onclick=${() => { obj.in = regionRef }}>
            Remove from container
        </button>`

    return html`
        <fieldset>
            <legend>Position</legend>
            ${obj.in === regionRef ? regionPosition : containedPosition }
        </fieldset>`
}

export const orientationEditor = ({ obj }) => {
    const mod = obj.mods[0]
    // color, pattern, flip
    const colors = colorsFromOrientation(mod.orientation)
    const flipped = (mod.orientation & 0x01) != 0
    return html`
        <fieldset>
            <legend>Orientation</legend>
            <div style="display: flex">
                ${c64Colors.map((color, icolor) => html`
                    <div key=${`color${icolor}`} 
                        style="width: 48px; height: 48px; margin: 2px;
                                border: 4px dotted ${colors.wildcard === icolor ? " black" : "transparent"};"
                        onclick=${() => { mod.orientation = (mod.orientation & 0x07) | 0x80 | (icolor << 3) }}>
                        <div style="background-color: #${color.toString(16).padStart(6, "0")}; width: 100%; height: 100%;"/>
                    </div>`)}
            </div>
            <div style="display: flex">
                ${[...Array(15).keys()].map((ipattern) => html`
                    <div key=${`pattern${ipattern}`}
                        style="width: 48px; height: 48px; margin: 2px;
                                border: 4px dotted ${colors.pattern === ipattern ? " black" : "transparent"};"
                        onclick=${() => { mod.orientation = (mod.orientation & 0x07) | (ipattern << 3) }}>
                        <${canvasImage} canvas=${canvasFromBitmap(emptyBitmap(2, 16, 1), { pattern: ipattern })}/>
                    </div>`)}
            </div>
            <div>
                <label>
                    <input type="checkbox" checked=${flipped}
                            onclick=${() => { mod.orientation = (mod.orientation & 0xfe) | (flipped ? 0 : 1) }}/>
                    Flip horizontally
                </label>
            </div>
        </fieldset>`
}

export const styleEditor = ({ obj, objects }) => {
    const mod = obj.mods[0]
    const { cls, imageKey } = imageSchemaFromMod(mod) ?? {}
    const prop = propFromMod(mod, obj.ref)
    if (!prop) {
        return null
    }
    const grstateDropdown = prop.animations.length > 0 ? html`
        <select onChange=${e => { mod.gr_state = parseInt(e.currentTarget.value) }}>
            ${prop.animations.map((animation, i) => html`
                <option key=${`anim${i}`} value=${i} selected=${i === mod.gr_state}>
                    ${i} (${animation.cycle ? "cycling" : "non-cycling"}, ${animation.endState - animation.startState + 1} frames)
                </option>
            `)}
        </select>
    ` : html`<em>0 (non-animated)</em>`

    return html`
        <fieldset>
            <legend>Style</legend>
            <div style="display: flex;">
                <table>
                    <tr>
                        <td>Style</td>
                        <td>
                            <select onChange=${e => { mod.style = parseInt(e.currentTarget.value) }}>
                            ${cls[imageKey].map((imgref, i) => html`
                                <option key=${`style${i}`} value=${i} selected=${i === mod.style}>
                                    ${imgref.id}
                                </option>`)}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <td><tt>gr_state</tt> (Animation ID)</td>
                        <td>${grstateDropdown}</td>
                    </tr>
                </table>
                <div style="padding: 10px;">
                    <${catcher} filename=${obj.ref}>
                        <${Scale.Provider} value="1">
                            <${standaloneItemView} object=${obj} objects=${objects}/>
                        <//>
                    <//>
                </div>
            </div>
        </fieldset>`
}

export const containerEditor = ({ objects, obj }) => {
    const selectionRef = useContext(Selection)
    const items = objects.filter(o => o.in === obj.ref).sort((o1, o2) => o1.y - o2.y)
    if (items.length === 0) {
        return null
    }
    return html`
        <fieldset>
            <legend>Container</legend>
            ${items.map(o => html`
                <a href="javascript:;" onclick=${() => { selectionRef.value = o.ref }}>
                    <${standaloneItemView} object=${o} objects=${objects}/>
                </a>`)}
        </fieldset>`
}

export const fieldEditor = ({ field, mod }) => {
    const val = mod[field]
    if (typeof(val) === "number") {
        return html`<input type="number" value=${val} 
                            onInput=${e => { mod[field] = parseInt(e.currentTarget.value) }}/>`
    } else if (typeof(val) === "string") {
        return html`<input type="text" value=${val}
                            onInput=${e => { mod[field] = e.currentTarget.value }}/>`
    } else {
        return html`<tt>${JSON.stringify(val, null, " ")}</tt>`
    }
}

export const extraFieldsEditor = ({ obj }) => {
    const handledFields = new Set(["x", "y", "orientation", "style", "gr_state", "type"])
    const keys = [...Object.keys(obj.mods[0])]
        .filter(k => !handledFields.has(k))
        .sort()
    if (keys.length > 0) {
        return html`
            <fieldset>
                <legend>Fields</legend>
                <table>
                    ${keys.map(k => html`
                        <tr>
                            <td><tt>${k}</tt></td>
                            <td><${fieldEditor} key=${k} field=${k} mod=${obj.mods[0]}/></td>
                        </tr>`)}
                </table>
            </fieldset>`
    }
}

export const propEditor = ({ objects }) => {
    const selectionRef = useContext(Selection)
    if (selectionRef.value != null) {
        const regionRef = objects.find(o => o.type === "context").ref
        const obj = objects.find(o => o.ref === selectionRef.value)
        if (obj && obj.type === "item") {
            return html`
                <${jsonDump} heading=${html`<h3 style="display: inline-block">${obj.name} (${obj.ref})</h3>`} value=${obj}/>
                <${positionEditor} obj=${obj} regionRef=${regionRef} />
                <${containerEditor} obj=${obj} objects=${objects}/>
                <${orientationEditor} obj=${obj}/>
                <${styleEditor} obj=${obj} objects=${objects}/>
                <${extraFieldsEditor} obj=${obj}/>`
        }
    }
}

const swapItemsAtIndex = (sig, tracker, index) => {
    const newValue = [sig.value[index + 1], sig.value[index]]
    tracker.change(sig, [], index, newValue, 2)
}

const buttonStyle = "border-radius: 8px; font-size: 16px;"
const disabledStyle = `background-color: #777; color: #ccc; ${buttonStyle}`
const dangerousStyle = `background-color: red; color: white; ${buttonStyle}`
const primaryButtonStyle = `background-color: blue; color: white; ${buttonStyle}`

export const randomSlug = () => {
    const validChars = "0123456789abcdefghijklmnopqrstuvwxyz"
    const genChar = () => validChars[Math.floor(Math.random() * validChars.length)]
    return `${genChar()}${genChar()}${genChar()}${genChar()}`
}

export const addNewObject = (type, objectList, tracker, selectionRef, defaultModValues) => {
    const regionRef = objectList.value.find(o => o.type === "context").ref
    const obj = {
        type: "item",
        ref: `${type}.${randomSlug()}.${regionRef}`,
        name: type,
        in: regionRef,
        mods: [{
            ...(defaultModValues[type] ?? {}),
            type,
            x: 80,
            y: 32,
            style: 0,
            gr_state: 0,
            orientation: 0
        }]
    }
    tracker.change(objectList, [], objectList.value.length, [tracker.trackSignal(signal(obj))], 0)
    selectionRef.value = obj.ref
}

export const newObjectButton = ({ objectList, tracker }) => {
    const defaultModValues = useJson("default_mod_values.json", {})
    const javaClasses = useMemo(() => [...Object.keys(defaultModValues)].sort(), [defaultModValues])
    const [iclass, setIClass] = useState(0)
    const selectionRef = useContext(Selection)
    return html`
        <button style=${primaryButtonStyle}
                onclick=${() => { addNewObject(javaClasses[iclass], objectList, tracker, selectionRef, defaultModValues) }}>
            + Create
        </button>
        <select onchange=${(e) => { setIClass(parseInt(e.target.value)) }}>
            ${javaClasses.map((cls, icls) => html`
                <option key=${cls} value=${icls} selected=${iclass === icls}>${cls}</option>
            `)}
        </select>`
}

export const objectPanel = ({ objectList, tracker }) => {
    const selectionRef = useContext(Selection)
    const iselection = objectList.value.findIndex(o => o.ref === selectionRef.value)
    const deleteDisabled = iselection <= 0
    const moveUpDisabled = iselection <= 1
    const moveDownDisabled = iselection <= 0 || iselection >= objectList.value.length - 1

    return html`
        <div style="padding: 5px;">
            <a href="javascript:;" onclick=${() => tracker.undo()}>Undo</a> | <a href="javascript:;" onclick=${() => tracker.redo()}>Redo</a>
        </div>
        <fieldset>
            <legend>Objects</legend>
            ${objectList.value.map(o => html`
                <div>
                    <label>
                        <input type="radio" checked=${o.ref === selectionRef.value}
                               onclick=${() => { selectionRef.value = o.ref }}/>
                        ${o.name} (${o.ref})
                    </label>
                </div>
            `)}
            <${newObjectButton} objectList=${objectList} tracker=${tracker}/>
            <button style="${moveUpDisabled ? disabledStyle : buttonStyle}" disabled=${moveUpDisabled}
                    onclick=${() => { swapItemsAtIndex(objectList, tracker, iselection - 1)}}>
                ⇧
            </button>
            <button style="${moveDownDisabled ? disabledStyle : buttonStyle}" disabled=${moveDownDisabled}
                    onclick=${() => { swapItemsAtIndex(objectList, tracker, iselection)}}>
                ⇩
            </button>
            <button style="${deleteDisabled ? disabledStyle : dangerousStyle}" disabled=${deleteDisabled} 
                    onclick=${() => { tracker.change(objectList, [], iselection, [], 1) }}>
                Delete
            </button>
        </fieldset>`
}

export const registerKeyHandler = (document, tracker, selectionRef, objectList) => {
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
                   && !(e.target instanceof HTMLInputElement)) {
            const obj = objectList.value.find(o => o.ref === selectionRef.value)
            if (obj && obj.type === "item") {
                let dx = 0
                let dy = 0
                if (e.key === "ArrowLeft")  { dx -= 4 }
                if (e.key === "ArrowRight") { dx += 4 }
                if (e.key === "ArrowUp")    { dy += 4 }
                if (e.key === "ArrowDown")  { dy -= 4 }
                obj.mods[0].x += dx
                obj.mods[0].y += dy
                if (dx !== 0 || dy !== 0) {
                    e.preventDefault()
                }
            }
        }
    })
}