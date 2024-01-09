// import "https://esm.sh/preact/debug"
import htm from "htm"
import { h } from "preact"
import { useState, useId, useCallback, useMemo } from "preact/hooks"

export const html = htm.bind(h)

const search = (query, items) => {
    const term = query.toLowerCase().trim()
    return items
            .filter(({ label }) => label.toLowerCase().includes(term))
            .toSorted((l, r) => {
                const lindex = l.label.toLowerCase().indexOf(term)
                const rindex = r.label.toLowerCase().indexOf(term)
                if (lindex != rindex) { return lindex - rindex }
                return l.label.toLowerCase().localeCompare(r.label.toLowerCase())
            })
}
export const searchBox = ({ label, onSelected, items }) => {
    const id = useId()
    const [query, setQuery] = useState("")
    const [focussed, setFocussed] = useState(false)
    const selectItem = item => {
        setQuery("")
        onSelected(item)
    }
    const shouldQuery = query.trim() != ""
    const results = useMemo(() => shouldQuery ? search(query, items) : [], [query, items])
    const visibleItems = results.map(
        item => html`<li key=${item}><a href="javascript:;" onMouseDown=${() => selectItem(item) }>${item.label}</a></li>`
    )
    return html`
        <form onSubmit=${e => { 
            if (results.length > 0) {
                selectItem(results[0])
            }
            e.preventDefault()
        }}>
            <label for=${id} style="width: 150px; display: inline-block">${label}</label>
                <span style="position: relative; display: inline-block;">
                    <input type="search"
                        id=${id}
                        placeholder="Search..."
                        onFocus=${() => setFocussed(true)}
                        onBlur=${() => setFocussed(false)}
                        onInput=${e => { setQuery(e.target.value) }}
                        value="${query}" />
                    <ul style="display: ${!focussed || results.length == 0 ? "none" : "block"}; z-index: 10; background: white; border: 1px solid black; position:absolute; width: 600px; height: 400px; overflow: scroll; top: 20px">
                        ${visibleItems}
                    </ul>
                </span>
            
        </div>
    `
}