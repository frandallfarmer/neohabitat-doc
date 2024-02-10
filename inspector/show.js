import { createContext } from "preact"
import { useMemo } from "preact/hooks"
import { celsFromMask, frameFromCels, framesFromAction, 
         framesFromLimbAnimation, framesFromPropAnimation, defaultColors ,
         animatedDiv, canvasImage, bitmapFromChar, canvasFromBitmap } from "./render.js"
import { html, catcher } from "./view.js"

export const Colors = createContext(defaultColors)

export const propAnimation = ({ prop, animation, ...options }) =>
    html`<${animatedDiv} frames=${framesFromPropAnimation(animation, prop, options)}/>`

export const limbAnimation = ({ limb, animation, ...options }) =>
    html`<${animatedDiv} frames=${framesFromLimbAnimation(animation, limb, options)}/>`

export const actionAnimation = ({ body, action, ...options }) =>
    html`<${animatedDiv} frames=${framesFromAction(action, body, options)}/>`

export const celmaskImage = ({ prop, celmask, ...options }) =>
    html`<${canvasImage} canvas=${frameFromCels(celsFromMask(prop, celmask), options).canvas}/>`

export const celImage = ({ cel, ...options }) =>
    html`<${canvasImage} canvas=${frameFromCels([cel], options).canvas}/>`

const propFilter = (key, value) => {
    if (key != "bitmap" && key != "data" && key != "canvas") {
        return value
    }
}

export const jsonDump = ({ heading, value }) =>
    html`<details>
            <summary>${heading}</summary>
            <pre>${JSON.stringify(value, propFilter, 2)}</pre>
         </details>`

export const jsonDownload = ({ value, children }) =>
    html`<a href="data:application/json;base64,${btoa(JSON.stringify(value, null, 2))}">${children}</a>`

export const viewList = ({ children }) => 
    html`<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 10px;">
            ${children.map(v => v ? html`<div style="border: 1px solid black; padding: 5px;">${v}</div>` : null)}
         </div>`

const uncaughtCharView = ({ charset, byte, colors }) => {
    const canvas = useMemo(() => {
        const bitmap = bitmapFromChar(charset, byte, colors)
        return canvasFromBitmap(bitmap)
    }, [charset, byte, colors?.halfSize])
    return html`<${canvasImage} canvas=${canvas}/>`
}

export const charView = (props) => html`
    <${catcher} filename=${`char:${props.byte}`}>
        <${uncaughtCharView} ...${props}/>
    <//>`
