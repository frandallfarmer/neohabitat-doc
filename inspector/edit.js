import { createContext } from "preact"
import { useContext } from "preact/hooks"
import { signal, effect } from "@preact/signals"
import { html } from "./view.js"
import { emptyBitmap } from "./codec.js"
import { c64Colors, canvasFromBitmap, canvasImage } from "./render.js"
import { colorsFromOrientation } from "./neohabitat.js"
import { jsonDump } from "./show.js"

export const Selection = createContext(signal(null))
export const selectionInteraction = ({ object, children }) => {
    const selectionRef = useContext(Selection)
    return html`
        <div onclick=${() => selectionRef.value = object.ref}>
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
    
    const update = (obj, key, value) => {
        const result = Array.isArray(obj) ? [...obj] : {...obj}
        result[key] = value
        return result
    }

    const updateIn = (obj, place, key, value) => {
        if (place.length == 0) {
            return update(obj, key, value)
        } else {
            return update(obj, place[0], updateIn(obj[place[0]], place.slice(1), key, value))
        }
    }

    const valueAt = (sig, place) => {
        let value = sig.value
        for (const placeKey of place) {
            value = value[placeKey]
        }
        return value
    }
    
    const performEdit = (sig, place, key, value, history) => {
        const previous = valueAt(sig, place)[key]
        sig.value = updateIn(sig.value, place, key, value)
        history.push({ sig, place, key, value, previous })
    }

    const change = (sig, place, key, value) => {
        performEdit(sig, place, key, value, editHistory)
        redoHistory.length = 0
    }

    const undo = (fromHistory = editHistory, toHistory = redoHistory) => {
        const edit = fromHistory.pop()
        if (edit) {
            performEdit(edit.sig, edit.place, edit.key, edit.previous, toHistory)
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

export const positionEditor = ({ obj }) => {
    const mod = obj.mods[0]
    const inc = (field, delta) => html`
        <a href="javascript:;" onclick=${() => mod[field] = (mod[field] + 256 + delta) % 256}>
            ${delta > 0 ? "+" : ""}${delta}
        </a>`
    const snap = (field, to) => html`
        <a href="javascript:;" onclick=${() => mod[field] = mod[field] - (mod[field] % to)}>
            Snap to cell
        </a>`

    return html`
        <fieldset>
            <legend>Position</legend>
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
            </div>
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

export const propEditor = ({ objects }) => {
    const selectionRef = useContext(Selection)
    if (selectionRef.value != null) {
        const obj = objects.find(o => o.ref === selectionRef.value)
        if (obj && obj.type === "item") {
            return html`
                <${jsonDump} heading=${html`<h3 style="display: inline-block">${obj.name} (${obj.ref})</h3>`} value=${obj}/>
                <${positionEditor} obj=${obj}/>
                <${orientationEditor} obj=${obj}/>`
        }
    }
}

export const objectChooser = ({ objects }) => {
    const selectionRef = useContext(Selection)
    return html`
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
        </fieldset>`
}
