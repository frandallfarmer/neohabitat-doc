import { createContext } from "preact"
import { useContext, useState, useMemo } from "preact/hooks"
import { signal } from "@preact/signals"
import { html, catcher } from "./view.js"
import { emptyBitmap } from "./codec.js"
import { c64Colors, canvasFromBitmap, canvasImage, Scale } from "./render.js"
import { colorsFromOrientation } from "./neohabitat.js"
import { jsonDump } from "./show.js"
import { useJson } from "./data.js"
import { propFromMod, imageSchemaFromMod, standaloneItemView, trapCache } from "./region.js"

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
    let currentEditGroup = 0
    let groupLevel = 0
    
    const commitGroup = () => {
        if (groupLevel === 0) {
            currentEditGroup ++
        }
    }

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
        },
        registerListener(listener) {
            editListeners.push(listener)
        },
        group(callback) {
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
                              "height", "pattern", "pattern_x_size", "pattern_y_size"])
    const trapClasses = new Set(["Trapezoid", "Super_trapezoid"])
    if (trapKeys.has(key) && place[0] === "mods" && place[1] === "0" && place.length === 2 && 
        trapClasses.has(sig.value.mods[0].type)) {
        trapCache[sig.value.ref] = null
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

export const fieldEditor = ({ field, obj }) => {
    const val = obj[field]
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
    const handledFields = new Set(["x", "y", "orientation", "style", "gr_state", "type", "port_dir", "town_dir"])
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
                            <td><${fieldEditor} key=${k} field=${k} obj=${obj.mods[0]}/></td>
                        </tr>`)}
                </table>
            </fieldset>`
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
        <fieldset>
            <legend>ID</legend>
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
        </fieldset>`
}

export const propEditor = ({ objects, tracker }) => {
    const selectionRef = useContext(Selection)
    const regionRef = objects.find(o => o.type === "context").ref
    const obj = objects.find(o => o.ref === (selectionRef.value ?? regionRef))
    if (obj) {
        let itemEditors
        if (obj.type === "item") {
            itemEditors = html`
                <${positionEditor} obj=${obj} regionRef=${regionRef} />
                <${containerEditor} obj=${obj} objects=${objects}/>
                <${orientationEditor} obj=${obj}/>
                <${styleEditor} obj=${obj} objects=${objects}/>`
        } else if (obj.type === "region") {
            // TODO
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

const swapItemsAtIndex = (sig, tracker, index) => {
    const newValue = [sig.value[index + 1], sig.value[index]]
    tracker.change(sig, [], index, newValue, 2)
}

const buttonStyle = "border-radius: 8px; font-size: 16px;"
const disabledStyle = `background-color: #777; color: #ccc; ${buttonStyle}`
const dangerousStyle = `background-color: red; color: white; ${buttonStyle}`
const primaryButtonStyle = `background-color: blue; color: white; ${buttonStyle}`

export const addNewObject = (type, objectList, tracker, selectionRef, defaultModValues) => {
    const regionRef = objectList.value.find(o => o.type === "context").ref
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