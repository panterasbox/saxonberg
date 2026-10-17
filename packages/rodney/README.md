# Rodney

The livestream overlays that run **beside** Saxonberg — OBS browser sources
driven by the server's broadcast feed. Part of the distro since 2026-10-17
(it was the sibling repo `pbox-stream`, imported with its history).

⭐ **The name.** Rodney was the program that ran beside the MUD at End of the
Line — FTP, fail2ban and the rest — named for NetHack's Wizard of Yendor. A
borrowed name passed on: this Rodney is the thing that runs beside Saxonberg
when somebody goes live.

The default skin is the **Pantera's Box parent brand** (navy/white/crimson,
Borromean-rings seal, scholarly-society tone), distinct from saxonberg's
watercolor in-world style. The engine (feed client, scenes, the rules that
pick them) is platform; the skin is one streamer's, and becomes a theme the
day a second streamer runs Rodney. See
[broadcast-ready-slate](../../docs/slates/builds/broadcast-ready-slate.md).

## Overlays

| Page | Purpose |
| --- | --- |
| `/standby.html` | Standby / AFK: the monastery archive, a waving PB banner, a countdown. |

## Run

```bash
pnpm install                          # from the repo root (workspace)
pnpm --filter @saxonberg/rodney dev   # http://localhost:5200/standby.html
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
