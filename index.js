import { decodeProp, decodeBody } from "./codec.js"
import { docBuilder, showAll, decodeBinary, textNode, propAnimationShower, celmaskShower, actionShower } from "./show.js"

const showProp = (prop) => {
    if (prop.filename == 'heads/fhead.bin') {
        return textNode("CW: Pixel genitals")
    } else if (prop.animations.length > 0) {
        return prop.animations.map(propAnimationShower(prop))
    } else {
        return prop.celmasks.map(celmaskShower(prop))
    }
}

const showBody = (body) => actionShower(body)("walk")

const displayFile = async (doc, container, filename, decode, show) => {
    const value = await decodeBinary(filename, decode)
    if (value.error) {
        container.parentNode.removeChild(container)
        doc.showError(value.error, filename)
    } else {
        try {
            showAll(doc, container, filename, [value], show)
        } catch (e) {
            container.parentNode.removeChild(container)
            doc.showError(e, filename)
        }
    }
}

const displayList = async (doc, indexFile, containerId, decode, show) => {
    const response = await fetch(indexFile, { cache: "no-cache" })
    const filenames = await response.json()
    const container = document.getElementById(containerId)
    for (const filename of filenames) {
        const fileContainer = document.createElement("div")
        fileContainer.style.border = "1px solid black"
        fileContainer.style.margin = "2px"
        fileContainer.style.padding = "2px"
        fileContainer.style.display = "inline-block"
        fileContainer.appendChild(doc.linkDetail(textNode(filename, "div"), filename))
        container.appendChild(fileContainer)
        displayFile(doc, fileContainer, filename, decode, show)
    }
}

export const displayBodies = (indexFile, containerId) =>
    displayList(docBuilder({ detailHref: "body.html", errorContainer: document.getElementById("errors") }), 
                indexFile, containerId, decodeBody, showBody)

export const displayProps = (indexFile, containerId) =>
    displayList(docBuilder({ detailHref: "detail.html", errorContainer: document.getElementById("errors") }),
                indexFile, containerId, decodeProp, showProp)
