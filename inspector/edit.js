import { createContext } from "preact"
import { useContext, useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from "preact/hooks"
import { signal, batch, useSignal } from "@preact/signals"
import { html, catcher, collapsable } from "./view.js"
import { emptyBitmap, trapTextureToBitmap } from "./codec.js"
import { c64Colors, canvasFromBitmap, canvasImage, defaultColors, rgbaFromNibble, Scale, compositeSpaces, translateSpace } from "./render.js"
import { colorsFromOrientation, javaTypeToMuddleClass, joinReplacements } from "./neohabitat.js"
import { jsonDump, charView } from "./show.js"
import { useJson, charset, betaMud } from "./data.js"
import { propFromMod, imageSchemaFromMod, standaloneItemView, trapCache, useLayout } from "./region.js"
import { makeCanvas } from "./shim.js"

export const transparencyGridStyle = (() => {
    const canvas = makeCanvas(16, 16)
    const ctx = canvas.getContext("2d")
    ctx.fillStyle = "#f4f4f4"
    ctx.fillRect(0, 0, 16, 16)
    ctx.fillStyle = "#ddd"
    ctx.fillRect(0, 0, 8, 8)
    ctx.fillRect(8, 8, 8, 8)
    return `background-image: url("${canvas.toDataURL()}");`
})()

export const EditState = createContext(signal({}))
export const editStateDefaults = {
    selection: null,
    showZFighting: true,
    showDepthMarker: true,
    overlayOpacity: 0.5
}
export const useEditState = (explicitStateSig = null) => {
    const stateSig = explicitStateSig ?? useContext(EditState)
    return { 
        ...editStateDefaults,
        ...stateSig.value,
        set(key, value) {
            stateSig.value = { ...stateSig.value, [key]: value }
        },
        hidden(ref) {
            return this[`hideObj-${ref}`]
        },
        toggleHidden(ref) {
            this.set(`hideObj-${ref}`, !this.hidden(ref))
        },
        setSelection(selection) { this.set("selection", selection) },
    }
}

export const createEditTracker = () => {
    const editHistory = []
    const redoHistory = []
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
    
    const mergeEdit = (edit, history) => {
        if (edit.splicing === null) {
            const group = edit.group
            for (let i = history.length - 1; i >= 0; i --) {
                const prevEdit = history[i]
                if (prevEdit.group !== group) {
                    break
                }
                if (prevEdit.sig === edit.sig && 
                    prevEdit.key === edit.key && 
                    prevEdit.place.length === edit.place.length &&
                    prevEdit.place.every((e, i) => edit.place[i] === e)) {
                    history.splice(i, 1)
                    edit.previous = prevEdit.previous
                    break
                }
            }
        }
        history.push(edit)
    }

    const performEdit = (sig, place, key, value, splicing, history) => {
        const obj = valueAt(sig, place)
        const previous = splicing === null ? obj[key] : obj.slice(key, key + splicing)
        if (previous === value) {
            return
        }
        sig.value = updateIn(sig.value, place, key, value, splicing)
        const edit = { sig, place, key, value, splicing, previous, group: currentEditGroup }
        mergeEdit(edit, history)
    }

    const change = (sig, place, key, value, splicing = null) => {
        performEdit(sig, place, key, value, splicing, editHistory)
        redoHistory.length = 0
        commitGroup()
    }

    const undo = (fromHistory = editHistory, toHistory = redoHistory) => {
        let group = null
        batch(() => {
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
        })
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
                    sig.value // subscribe if needed
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

export const moveBy = (ref, dx, dy, objects, tracker) => {
    const obj = objects.find(o => o.ref === ref)
    const mod = obj.mods[0]
    const container = objects.find(o => o.ref === obj.in)
    const containerMod = container?.mods?.[0]
    const inc = (o, fd, delta) => o[fd] = (o[fd] + 256 + delta) % 256
    tracker.group(() => {
        if (containerMod?.type === "Glue") {
            inc(containerMod, `x_offset_${mod.y + 1}`, Math.floor(dx / 4))
            inc(containerMod, `y_offset_${mod.y + 1}`, -dy)
        } else if (container?.type === "context") {
            inc(mod, "x", dx)
            inc(mod, "y", dy)
        }
    }, `objmove-${ref}`)
}
export const findRegionRef = (objects) => objects.find(o => o.type === "context").ref
export const positionEditor = ({ obj, objects, tracker }) => {
    const regionRef = findRegionRef(objects)
    const editState = useEditState()
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
            Inside <a href="javascript:;" onclick=${() => { editState.setSelection(obj.in) }}>${obj.in}</a>
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
export const startDrag = (e, callback, state = {}) => {
    state.downPageX = e.pageX
    state.downPageY = e.pageY
    const pointerId = e.pointerId
    document.body.onpointermove = e => { 
        if (e.pointerId === pointerId) { 
            callback(e, state) 
        } 
    }
    document.body.onpointerup = e => {
        if (e.pointerId === pointerId) {
            document.body.onpointermove = null
            document.body.onpointerup = null
            callback(e, state)
            document.body.releasePointerCapture(pointerId)
        }
    }
    document.body.setPointerCapture(pointerId)
    callback(e, state)
}

export const dragDelta = (e, state, scale) =>
    [Math.floor((e.pageX - state.downPageX) / (scale * 2)),
     Math.floor((e.pageY - state.downPageY) / scale)]

export const trapezoidCornerInteraction = ({ object, layout, tracker }) => {
    const scale = useContext(Scale)
    const mod = object.mods[0]
    if (mod.type !== "Trapezoid" && mod.type !== "Super_trapezoid") {
        return null
    }
    const space = compositeSpaces(layout.frames)
    const xOffset = (layout.x + space.minX) * 4
    const calcLeft = (field) => (((mod[field] + (layout.x * 4)) % 256) - (xOffset)) * 2 * scale
    const makeHandle = (drag, position, cursor) => html`
        <div onpointerdown=${drag}
             style="position: absolute; ${position}
                    background-color: black; border: 1px white solid; cursor: ${cursor};
                    width: 6px; height: 6px; margin-left: -3px;"/>`
    const makeCorner = (field) => {
        const bottom = field.startsWith("lower")
        const moveCorner = useCallback((e, state) => {
            const [dx, dy] = dragDelta(e, state, scale)
            tracker.group(() => {
                mod[field] = ((state.x + dx) + 256) % 256
            }, `trapezoid.${object.ref}.${field}`)
            e.preventDefault()
        }, [object, field, scale])
        const dragCorner = useCallback(e => {
            if (e.isPrimary) {
                startDrag(e, moveCorner, { x: mod[field] })
            }
        }, [moveCorner])
        return makeHandle(dragCorner, `${bottom ? "bottom" : "top"}: -3px; left: ${calcLeft(field)}px;`, "col-resize")
    }
    const moveHeight = useCallback((e, state) => {
        const [dx, dy] = dragDelta(e, state, scale)
        tracker.group(() => {
            // high bit means "draw border"; preserve it
            mod.height = Math.min(Math.max(2, (state.height & 0x7f) - dy), 127) | (state.height & 0x80)
        }, `trapezoid.${object.ref}.height`)
        e.preventDefault()
    }, [object, scale])
    
    const dragHeight = useCallback(e => {
        if (e.isPrimary) {
            startDrag(e, moveHeight, { height: mod.height })
        }
    }, [moveHeight])

    return [makeCorner("lower_left_x"), makeCorner("lower_right_x"),
            makeHandle(dragHeight, `top: -3px; left: ${(calcLeft("upper_left_x") + calcLeft("upper_right_x")) / 2}px;`, "row-resize"),
            makeCorner("upper_left_x"), makeCorner("upper_right_x")]
}

export const highlightZFighting = ({ object, objects, layout }) => {
    const editState = useEditState()
    const regionRef = findRegionRef(objects)
    if (object.in === regionRef && editState.showZFighting) {
        const isFighting = objects
            .filter(o => (!editState.selection || editState.selection === regionRef || o.ref === editState.selection)
                         && o.in === regionRef && o.ref !== object.ref 
                         && o.mods[0].y === object.mods[0].y)
            .some(o => {
                const space = translateSpace(compositeSpaces(layout.frames), layout.x, layout.y)
                const otherLayout = useLayout(o.ref)
                if (otherLayout) {
                    const otherSpace = translateSpace(compositeSpaces(otherLayout.frames), otherLayout.x, otherLayout.y)
                    const left = space.minX < otherSpace.minX ? space : otherSpace
                    const right = left === space ? otherSpace : space
                    return left.maxX > right.minX
                }
                return false
            })
        if (isFighting) {
            return html`
                <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; 
                            background-color: #ff000040; border: 3px dotted red; pointer-events: none;"></div>`
        }
    }
}

export const makePointerInteraction = (objects, tracker) => ({ object, layout, children }) => {
    const editState = useEditState()
    if (editState.hidden(object.ref)) {
        return null
    }
    const container = objects.find(o => o.ref === object.in)
    const scale = useContext(Scale)
    const moveObj = useCallback((e, state) => {
        const mod = object.mods[0]
        const containerMod = container?.mods?.[0]
        const isGlued = containerMod?.type === "Glue"
        const x = isGlued ? (containerMod[`x_offset_${mod.y + 1}`] * 4) : mod.x
        const y = isGlued ? containerMod[`y_offset_${mod.y + 1}`] : (mod.y & 0x7f)
        if (e.type === "pointerdown") {
            state.startX = x
            state.startY = y
        }
        const [dxAbs, dyAbs] = dragDelta(e, state, scale)
        const xNew = state.startX + dxAbs
        const yNew = isGlued ? state.startY + dyAbs : Math.max(0, Math.min(127, state.startY - dyAbs))
        moveBy(object.ref, xNew - x, isGlued ? y - yNew : yNew - y, objects, tracker)
        if (dxAbs !== 0 || dyAbs !== 0) {
            state.moved = true
        }
        e.preventDefault()
        if (e.type === "pointerup" && !state.moved) {
            editState.setSelection(null)
        }
    }, [object, container, scale, editState])

    const drag = useCallback(e => {
        if (e.isPrimary) {
            if (editState.selection === object.ref) {
                startDrag(e, moveObj)
            } else {
                editState.setSelection(object.ref)
            }
        }
    }, [moveObj, editState])
    const trap = editState.selection !== object.ref ? null 
               : html`<${trapezoidCornerInteraction} object=${object} tracker=${tracker} layout=${layout}/>`
    return html`
        <div onpointerdown=${drag}>
            ${editState.selection === object.ref ? html`
                <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; 
                            background-color: #00ff0040; border: 1px solid green; cursor: move;"></div>
                ` : null}
            ${children}
        </div>
        ${trap}
        <${highlightZFighting} object=${object} objects=${objects} layout=${layout}/>`
}

export const borderStyle = (selected) => 
    `border: ${selected ? "4px solid green" : "1px dotted grey"}; 
     padding: ${selected ? "1px" : "4px"}; margin: 2px;`

export const patternSelector = ({ selected, onSelected }) => html`
    <div style="display: flex">
        ${[...Array(15).keys()].map((ipattern) => html`
            <div key=${`pattern${ipattern}`}
                style="width: 48px; height: 48px; ${borderStyle(selected === ipattern)}"
                onclick=${() => onSelected(ipattern)}>
                <${canvasImage} canvas=${canvasFromBitmap(emptyBitmap(2, 16, 1), { pattern: ipattern })}/>
            </div>`)}
    </div>`

export const isClashingColor = (icolor) => icolor === 0 || icolor === 6 || icolor === 10
export const colorSelector = ({ selected, onSelected }) => html`
    <div style="display: flex">
        ${c64Colors.map((color, icolor) => html`
            <div key=${`color${icolor}`} 
                style="width: 48px; height: 48px; ${borderStyle(selected === icolor)}"
                onclick=${() => onSelected(icolor)}>
                <div style="background-color: #${color.toString(16).padStart(6, "0")}; width: 100%; height: 100%;
                            text-align: center; color: #f00;">
                    <b>${isClashingColor(icolor) ? "!" : ""}</b>
                </div>
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
            ${!isClashingColor(colors.wildcard) ? "" :
              "If you don't want this colour to clash with the background, choose the matching colour from the bottom row."}
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
                    <div style="${borderStyle(mod.gr_state === i)}"
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
                            <div style="${borderStyle(mod.style === istyle)}"
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

export const itemSlotEditor = ({ objects, tracker, slot, capacity, containerRef, refToInsert }) => {
    const editState = useEditState()
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
                    <a href="javascript:;" onclick=${() => { editState.setSelection(o.ref) }}>
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
    const regionRef = findRegionRef(objects)
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

export const wordFieldEditor = ({ prefix, obj, tracker }) => {
    const val = (obj[`${prefix}_lo`] ?? 0) | ((obj[`${prefix}_hi`] ?? 0) << 8)
    const onChange = e => {
        const newVal = parseInt(e.currentTarget.value)
        tracker.group(() => {
            obj[`${prefix}_lo`] = newVal & 0xff
            obj[`${prefix}_hi`] = (newVal >> 8) & 0xff
        })
    }
    return html`<input type="number" value=${val} onChange=${onChange}/>`
}

export const extraFieldsEditor = ({ obj, tracker }) => {
    const handledFields = new Set(
        ["x", "y", "orientation", "style", "gr_state", "type", "port_dir", "town_dir", 
         "neighbors", "nitty_bits", "is_turf", "depth", "text", "ascii", "pattern", "realm"]
    )
    for (let i = 1; i <= 6; i ++) {
        handledFields.add(`x_offset_${i}`)
        handledFields.add(`y_offset_${i}`)
    }
    const allKeys = [...Object.keys(obj.mods[0])]
        .filter(k => !handledFields.has(k))
        .sort()
    const keys = allKeys.filter(k => !k.endsWith("_lo") && !k.endsWith("_hi"))
    const prefixes = allKeys
        .filter(k => k.endsWith("_lo"))
        .map(k => k.slice(0, -3))
        
    if (keys.length > 0) {
        return html`
            <${collapsable} summary="Fields">
                <table>
                    ${prefixes.map(p => html`
                        <tr>
                            <td><tt>${p}</tt></td>
                            <td><${wordFieldEditor} key=${p} prefix=${p} obj=${obj.mods[0]} tracker=${tracker}/></td>
                        </tr>
                    `)}
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
            e.target.releasePointerCapture(e.pointerId)
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
                        <div style="width: ${16 * 3}px; height: ${16 * 3}px; ${borderStyle(selectedColor === nibble)}"
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
    const fields = [html`<div><${bitCheckbox} obj=${mod} field="height" bitmask=${0x80}>Border<//></div>`]
    
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
        fields.push(html`
            <div>Texture</div>
            <${bitmapEditor} bitmap=${bitmap} onChange=${onChange} colors=${colors}/>
        `)
    }
    return html`
        <${collapsable} summary="Trapezoid">
            ${fields}   
        <//>`

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
    const editState = useContext(EditState)
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
                                    if (editState.selection === obj.ref) {
                                        editState.setSelection(e.target.value)
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

export const editStateCheckbox = ({ field, children }) => {
    const editState = useEditState()
    return html`
        <label>
            <input type="checkbox"
                checked=${editState[field] ?? false}
                onChange=${e => { editState.set(field, e.target.checked) }}/>
            ${children}
        </label>`
}

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
                    <td>Realm</td>
                    <td><${fieldEditor} field="realm" obj=${mod} defaultValue=""/></td>
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
    const editState = useEditState()
    const regionRef = findRegionRef(objects)
    const obj = objects.find(o => o.ref === (editState.selection ?? regionRef))
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
                <${extraFieldsEditor} obj=${obj} tracker=${tracker}/>
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

export const addNewObject = (type, objects, tracker, editState, defaultModValues) => {
    const regionRef = findRegionRef(objects)
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
    editState.setSelection(obj.ref)
    return obj
}

export const newObjectButton = ({ objects, tracker }) => {
    const defaultModValues = useJson("default_mod_values.json", {})
    const javaClasses = useMemo(() => [...Object.keys(defaultModValues)].sort(), [defaultModValues])
    const [iclass, setIClass] = useState(0)
    const editState = useEditState()
    return html`
        <button style=${primaryButtonStyle}
                onclick=${() => { addNewObject(javaClasses[iclass], objects, tracker, editState, defaultModValues) }}>
            + Create
        </button>
        <select onchange=${(e) => { setIClass(parseInt(e.target.value)) }}>
            ${javaClasses.map((cls, icls) => html`
                <option key=${cls} value=${icls} selected=${iclass === icls}>${cls}</option>
            `)}
        </select>`
}

export const cloneItem = (object, objects, tracker, editState) => {
    const type = object.mods[0].type
    const defaults = { [type]: JSON.parse(JSON.stringify(object.mods[0])) }
    addNewObject(type, objects, tracker, editState, defaults)
}

export const hideObjectButton = ({ obj }) => {
    if (obj.type !== "item") {
        return null
    }
    const editState = useEditState()
    return html`<a href="javascript:;" onclick=${() => { editState.toggleHidden(obj.ref) }}>
        ${editState.hidden(obj.ref) ? "🙈" : "👁"}
    </a>`
}

export const objectPanel = ({ objects, tracker }) => {
    const editState = useEditState()
    const iselection = objects.findIndex(o => o.ref === editState.selection)
    const deleteDisabled = iselection <= 0
    const moveUpDisabled = iselection <= 1
    const moveDownDisabled = iselection <= 0 || iselection >= objects.length - 1
    const dupDisabled = iselection < 0 || objects[iselection].type !== "item"

    return html`
        <div style="padding: 5px;">
            <a href="javascript:;" onclick=${() => tracker.undo()}>Undo</a> | <a href="javascript:;" onclick=${() => tracker.redo()}>Redo</a>
        </div>
        <fieldset>
            <legend>Objects</legend>
            <div style="display: grid; grid-template-columns: auto 3ch">
                ${objects.map(o => html`
                    <label key=${o.ref}>
                        <input type="radio" checked=${o.ref === editState.selection}
                                onclick=${() => { editState.setSelection(o.ref) }}/>
                        ${o.name} (${o.ref})
                    </label>
                    <div key=${`hide-${o.ref}`} style="justify-self: end"><${hideObjectButton} obj=${o}/></div>
                `)}
            </div>
            <button style="${dupDisabled ? disabledStyle : buttonStyle}" disabled=${dupDisabled}
                    onclick=${() => { cloneItem(objects[iselection], objects, tracker, editState) }}>
                Clone
            </button>
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
            </button><br/>
            <${newObjectButton} objects=${objects} tracker=${tracker}/>
        </fieldset>`
}

export const registerKeyHandler = (document, tracker, editStateSig, objects) => {
    document.addEventListener("keydown", (e) => {
        const editState = useEditState(editStateSig)
        if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
            if (e.shiftKey) {
                tracker.redo()
            } else {
                tracker.undo()
            }
        } else if (e.key === "Escape") {
            editState.setSelection(null)
        } else if (e.key.startsWith("Arrow") && editState.selection
                   && !(e.target instanceof HTMLInputElement)
                   && !(e.target instanceof HTMLTextAreaElement)) {
            const obj = objects.find(o => o.ref === editState.selection)
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
    const editState = useEditState()
    const scale = useContext(Scale)
    const region = objects.find(o => o.type === "context")
    if (!editState.showDepthMarker) {
        return null
    }
    const yDepth = 127 - (region.mods[0].depth ?? 32)
    return html`<div style="position: absolute; left: 0; top: ${yDepth * scale}px; width: 100%; 
                            height: ${scale}px; background-color: red; opacity: 50%; z-index: 10001;
                            pointer-events: none;"/>`
}

export const overlayImageView = (_) => {
    const editState = useEditState()
    const scale = useContext(Scale)
    const blinkSignal = useSignal(false)
    useEffect(() => {
        const timer = window.setInterval(() => {
            if (editState.overlayBlink) {
                blinkSignal.value = !blinkSignal.value
            }
        }, 500)
        return () => { window.clearInterval(timer) }
    })
    if (editState.overlayImageUrl && (!editState.overlayBlink || blinkSignal.value)) {
        return html`
            <div style="width: ${320 * scale}px; height: ${128 * scale}px; position: absolute; top: 0; pointer-events: none; 
                        opacity: ${editState.overlayOpacity ?? 0.5}; z-index: 10000; overflow: clip;">
                <img style="width: 100%; ${editState.overlayCrop ? "aspect-ratio: 320/200; position: absolute; bottom: 0px;": "height: 100%"}"
                      src=${editState.overlayImageUrl} />
            </div>`
    }
}

export const overlayImageEditor = ({ cropstyle = "region" }) => {
    const editState = useEditState()
    return html`
        <label>
        Image overlay: <input type="file" accept="image/*" onchange=${e => {
            if (e.target.files.length > 0) {
                if (editState.overlayImageUrl) {
                    URL.revokeObjectURL(editState.overlayImageUrl)
                }
                editState.set("overlayImageUrl", URL.createObjectURL(e.target.files[0]))
            }
        }}/>
        </label><br/>
        ${editState.overlayImageUrl
            ? html`<input type="range" max="1" step="any" value=${editState.overlayOpacity ?? 0.5}
                        oninput=${e => { editState.set("overlayOpacity", parseFloat(e.target.value)) }}/>
                   <button onClick=${() => editState.set("overlayOpacity", 0.5)}>Reset to 50%</button><br/>
                   ${cropstyle === "region" ? html`<${editStateCheckbox} field="overlayCrop">Hide top area<//><br/>` : ""}
                   <${editStateCheckbox} field="overlayBlink">Blink<//>`
            : null}`
}
