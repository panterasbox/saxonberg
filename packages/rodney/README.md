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
| `/live.html` | Live: the frame around the desktop — the sidebar (brand, topic and agenda, chat) and the lower third (a weighted rotation over a crawl). Transparent where OBS's display capture and camera show through. The rotation's panel ROWS come from the game (`lower-third-panel` documents in the platform pack, sent on the feed); `src/scenes/live/panels.tsx` keeps the bespoke renderers by key, and a row with none renders its title and body. |

## Run

```bash
pnpm install                          # from the repo root (workspace)
pnpm --filter @saxonberg/rodney dev   # http://localhost:5200/standby.html
```

Point an OBS **Browser Source** at `http://localhost:5200/standby.html` (1920×1080).
**Three brands, three jobs.** The *show* (Saxonberg, so far) is a
profile — `src/show/profiles.ts`, chosen with `?show=<key>`, default
`saxonberg` — and owns the sidebar's brand block, the topic label, the
rotation's panels and the standby's right banner. The *studio* (Pantera's Box)
is the frame and the left banner. The *person* (Bobalu Smallberries,
`src/show/channel.ts`) is the nameplate — *Bobalu Smallberries @ Pantera's
Box*, flush right so the studio's hex meets the word BOX — on the camera in
Live, in the corner on standby. A new show is a profile row.

## The feed

Each overlay reads ONE streamer's feed. In the game, a streamer types
**`stream token`** and gets a token, shown once; set it as
`VITE_BROADCAST_TOKEN` with `VITE_SAXONBERG_WS` (e.g. `ws://localhost:2010`)
in `packages/rodney/.env.local`. Issuing again rotates it — the old one stops
working. The server's env `BROADCAST_TOKEN` still opens the founder's feed
during the changeover (it names the first id in `STREAMER_PLAYER_IDS`); move
to `stream token` the first week.

The feed carries the streamer's own show — the phase (offline, starting,
live, standby, ending), the standby reason, the timers, the topic and agenda,
the client's foreground and mode and the VERB of the last command (never its
arguments) — plus players online, the build's date, the panel rows, the
streamer's own Twitch/YouTube/Kick chat, and *"Welcome, <name>!"* for every
new player (*"straight from the stream"* when they came by the Saxonberg
card's link, which carries `?from=stream`). ⭐ When the feed drops the page
holds its last scene; it never infers *live*.

**Scene switching.** `src/show/rules.ts` is the table: starting → Starting,
live → Live, standby → Away, ending → Ending, offline → Away; a reason row's
`scene` overrides; live with Saxonberg not in front adds the game-summary
layer. A page with `?switch` applies the scene through OBS itself
(`window.obsstudio`, the browser source's **Advanced access to OBS**), else
through obs-websocket (`VITE_OBS_WS_URL`, `VITE_OBS_WS_PASSWORD`), else it
switches nothing and says why in its top-left corner. Put `?switch` on one
source per page (see `docs/obs-setup.md`).

Set the countdown target with `?until=<epoch_ms>` when no feed is configured.
Add `?mock` to feed the chat and the show canned data (`?fg=`, `?mode=`,
`?verb=` vary the client facts; `?pin=<panel>` holds the rotation), so the
page can be looked at with no server. Every scene lays out on a fixed 1920×1080 stage scaled to the window.

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
