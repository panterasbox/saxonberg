# Rodney

The livestream overlays that run **beside** Saxonberg — OBS browser sources
driven by the server's broadcast feed. Part of the distro since 2026-10-17
(it was the sibling repo `pbox-stream`, imported with its history).

⭐ **The name.** Rodney was the program that ran beside the MUD at End of the
Line — FTP, fail2ban and the rest — named for NetHack's Wizard of Yendor. A
borrowed name passed on: this Rodney is the thing that runs beside Saxonberg
when somebody goes live.

The skin follows the brand guide in `docs/design/` — Old Glory Blue, white
and Old Glory Red (red never touches blue), the Pantera's Box hex and the
Saxonberg rings from `docs/design/brand/`, and two of the civic voices
(Spectral for engraved capitals, Public Sans for chrome). The engine (feed client, scenes, the rules that
pick them) is platform; the skin is one streamer's, and becomes a theme the
day a second streamer runs Rodney. See
[broadcast-ready-slate](../../docs/slates/builds/broadcast-ready-slate.md).

## Overlays

| Page | Purpose |
| --- | --- |
| `/standby.html` | Standby / AFK: the monastery archive, two hanging banners (the Pantera's Box hex, the Saxonberg rings), the unified chat between them, the countdown and an inscription below. |
| `/live.html` | Live: the frame around the desktop — the sidebar (brand, topic and agenda, chat) and the lower third (a weighted rotation over a crawl). Transparent where OBS's display capture and camera show through. The rotation's panels are rows in `src/scenes/live/panels.tsx`. |

## Run

```bash
pnpm install                          # from the repo root (workspace)
pnpm --filter @saxonberg/rodney dev   # http://localhost:5200/standby.html
```

Point an OBS **Browser Source** at `http://localhost:5200/standby.html` (1920×1080).
**Three brands, three jobs.** The *show* (Saxonberg, a game, music) is a
profile — `src/show/profiles.ts`, chosen with `?show=<key>`, default
`saxonberg` — and owns the sidebar's brand block, the topic label, the
rotation's panels and the standby's right banner. The *studio* (Pantera's Box)
is the frame and the left banner. The *person* (Bobalu Smallberries,
`src/show/channel.ts`) is the nameplate — *Bobalu Smallberries @ Pantera's
Box*, flush right so the studio's hex meets the word BOX — on the camera in
Live, in the corner on standby. A new show is a profile row.

Set the countdown target with `?until=<epoch_ms>` when no feed is configured.
Add `?mock` to feed the chat canned lines, so the page can be looked at with no
server. Every scene lays out on a fixed 1920×1080 stage scaled to the window.

The banners' faces are painted at runtime from the brand SVGs
(`src/scenes/standby/bannerTexture.ts`), so a change to a mark in
`docs/design/brand/` is copying the SVG into `public/brand/`.

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

`src/tokens/palette.ts` is `docs/design/handoff/DESIGN-SYSTEM.md` § Colour (the Ink
theme); `src/tokens/faces.ts` is its § Type, two voices. Fonts are self-hosted under
`public/fonts/` (copied from saxonberg's client, no CDN — safe for OBS).
