import { useBinary, useJson, charset, contextMap } from "./data.js"
import { decodeProp, decodeBody } from "./codec.js"
import { html, catcher } from "./view.js"
import { Scale } from "./render.js"
import { propAnimation, celmaskImage, actionAnimation, charView } from "./show.js"
import { regionImageView } from "./region.js"

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

export const charsetView = ({ colors }) => {
    if (!charset()) { return null }
    const rows = []
    const headers = [html`<th/>`]
    for (let x = 0; x < 16; x ++) {
        headers.push(html`<th>_${x.toString(16)}</th>`)
    }
    rows.push(html`<tr>${headers}</tr>`)
    for (let y = 0; y < 8; y ++) {
        const columns = [html`<td>${y.toString(16)}_</td>`]
        for (let x = 0; x < 16; x ++) {
            columns.push(html`<td><${charView} charset=${charset()} byte=${x + (y * 16)} colors=${colors}/></td>`)
        }
        rows.push(html`<tr>${columns}</tr>`)
    }
    return html`
        <table>
            ${rows}
        </table>`
}

const regionPreview = ({ id }) => {
    const ctx = contextMap()[id]
    if (ctx) {
        return html`
            <a href="region.html?f=${ctx.filename}">
                <${regionImageView} filename=${ctx.filename}/>
                <div>${ctx.name}</div>
            </a>`
    }
}

export const regionGallery = () => {
    const regionRefs = useJson("region_gallery.json", [])
    return html`
        <${Scale.Provider} value="1">
            <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${regionRefs.map(ref => html`<${regionPreview} id=${ref}/>`)}
            </div>
        <//>`
}