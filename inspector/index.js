import { useBinary, useJson } from "./data.js"
import { decodeProp, decodeBody } from "./codec.js"
import { html, catcher } from "./view.js"
import { propAnimation, celmaskImage, actionAnimation } from "./show.js"

export const propView = ({ filename }) => {
    if (filename == 'heads/fhead.bin') {
        return html`<span>CW: Pixel genitals</span>`
    }
    const prop = useBinary(filename, decodeProp, null)
    if (prop == null) {
        return null
    } else if (prop.animations.length > 0) {
        return prop.animations.map(a => html`<${propAnimation} prop=${prop} animation=${a}/>`)
    } else {
        return prop.celmasks.map(c => html`<${celmaskImage} prop=${prop} celmask=${c}/>`)
    }
}

export const bodyView = ({ filename }) => {
    const body = useBinary(filename, decodeBody, null)
    if (body) {
        return html`<${actionAnimation} body=${body} action="walk"/>`
    }
}

export const fileView = ({ filename, href, children }) => html`
    <${catcher} filename=${filename}>
        <div style="border: 1px solid black">
            <a href=${`${href}?f=${filename}`}>
                <div>${filename}</div>
                ${children}
            </a>
        </div>
    <//>`


export const fileList = ({ indexFile, childView, href }) =>
    html`
        <div style="display: flex; flex-wrap: wrap; justify-content: space-evenly; align-items: center; gap: 10px;">
            ${useJson(indexFile, []).map(filename => html`
                <${fileView} filename=${filename} href=${href} key=${filename}>
                    <${childView} filename=${filename}/>
                <//>`)}
        </div>`
