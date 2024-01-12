import { signal } from "@preact/signals"
import { parse } from "./mudparse.js"
import { parseHabitatObject } from "./neohabitat.js"

export const errorBucket = signal([])
export const logError = (e, filename) => {
    console.error(e)
    const err = { e, filename, msg: e.toString(), stacktrace: e.stack ? e.stack.toString() : "(no stacktrace)" }
    // do NOT access errorBucket.value inside of an erroring component, as it will retrigger in an infinite loop
    requestAnimationFrame(() => {
        errorBucket.value = [...errorBucket.value, err]
    })
}

export const promiseToSignal = (promise, defaultValue) => {
    const sig = signal(defaultValue)
    promise.then((x) => { sig.value = x })
    return sig
}

export const lazySignal = (defaultValue, promiseGetter) => {
    const cache = {}
    return () => {
        if (!cache.value) {
            cache.value = promiseToSignal(promiseGetter(), defaultValue)
        }
        return cache.value.value
    }
}

const fetchCache = {}
export const fetchAndCache = (url, handler, defaultValue, onError = logError) => {
    if (!fetchCache[url]) {
        const doFetch = async () => {
            const response = await fetch(url, { cache: "no-cache" })
            if (!response.ok) {
                console.error(response)
                throw new Error(`Failed to download ${url}: ${response.status}`)
            }
            return await handler(response)
        }
        const sig = promiseToSignal(doFetch().catch((e) => onError(e, url)), defaultValue)
        fetchCache[url] = sig
    }
    return fetchCache[url].value
}

export const useBinary = (url, decoder, defaultValue, onError = undefined) => {
    return fetchAndCache(
        url, 
        async (response) => decoder(new DataView(await response.arrayBuffer())), 
        defaultValue, 
        onError)
}

export const useJson = (url, defaultValue, onError = undefined) => {
    return fetchAndCache(url, (response) => response.json(), defaultValue, onError)
}

export const useHabitatJson = (url, onError = undefined) => {
    return fetchAndCache(url, async (response) => parseHabitatObject(await response.text()), [], onError)
}

export const betaMud = lazySignal(null, async () =>
    parse(await (await fetch("beta.mud")).text())
)

export const contextMap = lazySignal({}, async () =>
    await (await fetch("db/contextmap.json", { cache: "no-cache" })).json()
)