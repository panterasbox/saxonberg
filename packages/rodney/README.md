# pbox-stream

Pantera's Box livestream overlays — a **sibling production** to `saxonberg`, not part
of it. These are OBS browser sources representing the **Pantera's Box parent brand**
(navy/white/crimson, Borromean-rings seal, scholarly-society tone), distinct from
saxonberg's watercolor in-world content style.

## Overlays

| Page | Purpose |
| --- | --- |
| `/standby.html` | Standby / AFK: the monastery archive, a waving PB banner, a countdown. |

## Run

```bash
pnpm install
pnpm dev          # http://localhost:5200/standby.html
```

Point an OBS **Browser Source** at `http://localhost:5200/standby.html` (1920×1080).
Set the countdown target with `?until=<epoch_ms>` (later: pushed from saxonberg's
`awayUntil` over WebSocket).

## Art generation

```bash
pnpm gen          # -> public/monastery.png via OpenAI gpt-image-1 (PB cinematic style)
```

Reuses saxonberg's image provider/key but **overrides** its locked watercolor style
with a Pantera's Box cinematic prompt (see `tools/generate-image.mjs`).

## The cloth engine

`src/engine/` is a TypeScript port of [flagwaver](https://github.com/krikienoid/flagwaver)'s
Jakobsen Verlet cloth. The physics primitives port nearly verbatim; the geometry/render
layer was **rebuilt on `BufferGeometry`** because `THREE.Geometry` / `ParametricGeometry`
were removed from three.js in r125. Material upgraded to `MeshStandardMaterial` (PBR).

## Brand tokens

`src/tokens/faces.ts` and `src/tokens/palette.ts` mirror saxonberg's `faces.ts` so the
chrome and the game share one typographic + color system. Fonts are self-hosted under
`public/fonts/` (copied from saxonberg, no CDN — safe for OBS).
