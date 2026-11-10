# OBS setup — the show's scenes

How OBS is set up for the weekly stream. The design is
[broadcast-ready-slate](../../../docs/slates/builds/broadcast-ready-slate.md);
this is the hands-on half. Written against **OBS 32.1.2 on Windows** with
obs-websocket 5.7.3 (built in) and Elgato's Stream Deck plugin installed.

## The canvas

1920 × 1080, 60 fps. Every number below follows from one rule: a 1520-wide
16:9 content area.

```
x=0                                  x=1520      x=1920
┌────────────────────────────────────┬───────────┐ y=0
│ DISPLAY CAPTURE  1520 × 855        │ sidebar   │
│                                    │ (Rodney)  │
├────────────────────────────────────┼───────────┤ y=855
│ lower third (Rodney) 1520 × 225    │ CAMERA    │
│                                    │ 400 × 225 │
└────────────────────────────────────┴───────────┘ y=1080
```

⭐ The camera block is exactly 400 × 225 — 16:9 — so the camera fills the
corner with no crop.

A 2560 × 1440 monitor scales to 1520 × 855 exactly (× 0.59375); any other
16:9 monitor scales cleanly too.

## ⚠⚠ The privacy rule

**A privacy cover is the absence of a source, never a layer over it.** If the
overlay page fails to load, a cover drawn by it fails too — so the scenes that
must not show the desktop, the camera or the microphone simply **do not
contain** them. Put the **microphone in the scenes as a source**, not as a
global audio device, for the same reason: Away has no mic because Away does
not contain one.

## 1. Sources, made once

Create each once, then add it to scenes with **Add → Existing** (so every
scene shares the same source and its settings).

| source | type | settings |
|---|---|---|
| `Desktop` | Display Capture | the shared monitor; capture cursor on |
| `Camera` | Video Capture Device | your camera; 1280×720 or 1920×1080 |
| `Mic` | Audio Input Capture | your microphone |
| `Rodney Standby` | Browser | `http://localhost:5200/standby.html`, 1920 × 1080 |
| `Rodney Live` | Browser | `http://localhost:5200/live.html`, 1920 × 1080 — transparent where the display and camera show through |

Both browser sources: **Shutdown source when not visible: off**; **Refresh
browser when scene becomes active: off**; **Page permissions: Advanced access
to OBS** — ⭐ this is what lets the overlay switch scenes. Add `?mock` to
either URL to see it filled with canned chat and show data and no server.

**The feed.** Both URLs need your token: in the game type `stream token`
and put the token it shows (once) in `packages/rodney/.env.local` as
`VITE_BROADCAST_TOKEN`, with `VITE_SAXONBERG_WS`. The old shared
`BROADCAST_TOKEN` still works for the founder during the changeover.

**Scene switching.** Add `&switch` to the **Rodney Standby** URL only (it is
in Starting, Away and Ending, and with *Shutdown source when not visible*
off it keeps running under Live): the overlay then follows the game —
`stream start` → Starting, `stream live`/`back` → Live, `stream away …` →
Away, `stream end` → Ending, and a reason row may name its own scene. If
the source lacks Advanced access, set obs-websocket instead (Tools →
WebSocket Server Settings) and give Rodney `VITE_OBS_WS_URL`
(`ws://localhost:4455`) and `VITE_OBS_WS_PASSWORD`; with neither, the page
switches nothing and says so in its top-left corner. ⭐ A dropped feed
changes nothing: the scene holds, and Rodney never goes Live on its own —
the Elgato Privacy button still cuts with the server down.

**Show profiles.** `?show=<key>` picks the show (default `saxonberg`, the only
one so far). A music stream — a Keysight capture, the camera on the player,
chat — is a scene of its own, designed separately.

Settings → Audio: set **Mic/Auxiliary Audio** to *Disabled* (the `Mic`
source replaces it). Keep Desktop Audio only if you want system sound on
stream — it carries every notification chime.

## 2. Scenes

| scene | contains, bottom to top | position |
|---|---|---|
| **Starting** | `Rodney Standby` | full canvas |
| **Live** | `Desktop` · `Camera` · `Mic` · `Rodney Live` | Desktop at 0,0 sized 1520×855 · Camera at 1520,855 sized 400×225 · Rodney Live full canvas on top |
| **Away** | `Rodney Standby` | full canvas — ⛔ no Desktop, no Camera, no Mic |
| **Ending** | `Camera` · `Mic` · `Rodney Standby` | Camera as in Live |

To place exactly: right-click a source → **Transform → Edit Transform**, type
the position and size, bounding box *Scale to inner bounds*.

## 3. Output — one encode, two platforms

Settings → Output → **Output Mode: Advanced**, Streaming tab:

- Encoder **NVIDIA NVENC H.264**, rate control **CBR**, **6000 Kbps**,
  keyframe interval **2 s**, preset *Quality*.
- Audio: AAC 160.

Settings → Stream: Twitch, as today.

**YouTube alongside:** install **Aitum Multistream** (OBS forum →
Resources; take the build for OBS 32), then in its dock add a YouTube
destination with the stream key and **share the main encoder** — one encode,
two outputs. ⚠ Keep YouTube at the same quality as Twitch: Twitch's
simulcast terms require it not look better elsewhere.

## 4. Stream Deck — the hard cuts

Elgato's **OBS Studio** actions, which talk to OBS and nothing else, so they
work with the game server down:

| button | action |
|---|---|
| ⭐ **Privacy** | Scene → **Away** |
| Back | Scene → **Live** |
| Mic | Mute → `Mic` |
| Go live | Start/Stop Stream |

The game-command buttons (`stream away bathroom`, `stream away privacy`,
`stream back`, `stream next`) go through pblive with a control token
(`stream token --control` in the game) — they run `stream …` as you and
nothing else.

## 5. Before the first show

- ⚠⚠ **Read Twitch's current simulcasting terms** — conditions are quality
  parity and not sending viewers away from Twitch. ⚠ Whether a **combined
  chat** may appear on the Twitch stream is disputed in the secondary sources
  (penalties reportedly dropped February 2026; the written rule reportedly
  unchanged) — the overlay's unified chat depends on the answer.
- Start Rodney: `pnpm --filter @saxonberg/rodney dev` from the repo root.
- A private test stream to each platform; check the camera corner, the
  scene cuts and the Privacy button.
