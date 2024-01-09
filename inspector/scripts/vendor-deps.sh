#!/usr/bin/env bash
cd "$(dirname "${BASH_SOURCE[0]}")/../vendor"
curl https://unpkg.com/htm/dist/htm.mjs -L -o htm.mjs
curl https://unpkg.com/preact/dist/preact.mjs -L -o preact.mjs
curl https://unpkg.com/preact/dist/preact.module.js.map -L -o preact.module.js.map
curl https://unpkg.com/preact/hooks/dist/hooks.mjs -L -o hooks.mjs
curl https://unpkg.com/preact/hooks/dist/hooks.module.js.map -L -o hooks.module.js.map
curl https://unpkg.com/@preact/signals-core/dist/signals-core.mjs -L -o signals-core.mjs
curl https://unpkg.com/@preact/signals-core/dist/signals-core.mjs.map -L -o signals-core.mjs.map
curl https://unpkg.com/@preact/signals/dist/signals.mjs -L -o signals.mjs
curl https://unpkg.com/@preact/signals/dist/signals.mjs.map -L -o signals.mjs.map