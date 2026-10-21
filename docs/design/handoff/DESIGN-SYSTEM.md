# Design system

## The direction

**A neoclassical civic frame containing storybook narrative.** Saxonberg is a
metaphor for founding a republic, so the chrome is Rome and Washington — ink,
marble, brass, engraved capitals, hairline rules — and never any single genre,
because the game is genre-plural by design.

Storybook warmth is **quarantined**. It appears only where an author supplied an
illustration (a *plate*), never as a theme over the terminal. See "Registers".

## Colour

The three official colours are exact and non-negotiable.

```
Old Glory Blue   #002868   (PMS 281 C)
Old Glory Red    #BF0A30   (PMS 193 C)
White            #FFFFFF
```

**Red never touches blue.** The flag holds them apart with white, and so do we —
every red element carries white between it and the field. Red is reserved for:
the seal, the flag rule, the single committing action per screen, and live/alert
states. If an element cannot carry white separation, it is not brand red.

Old Glory Blue is a **canton, not the whole cloth** — at full saturation it is
unreadable under dense text, so it holds mastheads, seals and panels while the
reading ground is a deepened navy drawn from it.

### Ink (dark, default)
```
--ground:#071224   --surface:#0d1c38   --raised:#15274a   --sunken:#040b17
--line:#22355e     --line-soft:#132441
--fg:#f2f5fa       --fg-dim:#9fb0cc    --fg-mute:#8494b3
--accent:#c9a227   --accent-ink:#171204        /* brass */
--good:#4a9d8f     --warn:#c9a227      --bad:#BF0A30      --info:#5b8fd6
--paper:#f2ebdc    --paper-ink:#2a2418 --paper-line:#d8cdb4
```

### Marble (light)
```
--ground:#eceae4   --surface:#f7f6f2   --raised:#FFFFFF   --sunken:#dcd9d0
--line:#c4c0b4     --line-soft:#e0ddd4
--fg:#0b1830       --fg-dim:#42506b    --fg-mute:#5c6880
--accent:#8a6d1f   --accent-ink:#fffdf5
--good:#2f6d62     --warn:#6e5510      --bad:#BF0A30      --info:#002868
--paper:#f7f1e3    --paper-ink:#2a2418 --paper-line:#ddd3bc
```

> Contrast is computed against **`--surface`**, the tighter of each theme's two
> grounds. Check new values there, not against `--ground`.

## Type

Four voices, only ever two on screen at once.

| Role | Face | Where |
|---|---|---|
| Engraved capitals, display | **Spectral** 500, uppercase, `letter-spacing:.19em` | Section labels, headings, wordmark, binomials |
| All UI and dense text | **Public Sans** | Everything chrome. The US federal design system's face — civic by provenance |
| World prose only | **Newsreader** | Terminal prose, plate captions |
| Commands, measurements, ids | **IBM Plex Mono** | You and the machine |

```html
<link href="https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Newsreader:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Mono:wght@400;500;600&display=swap" rel="stylesheet">
```

> Request Newsreader **without** the `opsz` axis, exactly as above. With `opsz`
> in the tuple the face silently fails to load and falls back to Times.

This replaces the Source Serif / Source Sans / Source Code Pro trio in
`styles/faces.ts`. **The three-voice model is kept and extended to four** — only
the faces change. If the team prefers to keep the Source family, the designs
survive the substitution; the voice assignment matters more than the faces.

## Registers

- **Civic** is the default and covers nearly everything — the terminal included.
  Ink ground, brass accent, squared corners, engraved capitals.
- **Narrative** is *not* a theme over the terminal. The terminal is the one
  constant across every mode, so it never carries a mode's dress. World prose
  keeps the **serif voice** on the neutral ground.
- **Plates** are the only warm surface: an author-supplied illustration in a
  paper mount with a hairline border and an italic caption, sitting inline in
  the feed. That is where the storybook lives.

## Scale

- **Radius** 3px everywhere. Engraved, not friendly.
- **Spacing** 4 / 6 / 9 / 12 / 16 / 22px
- **Type** 10px engraved labels · 11.5–12.5px secondary · 13–14px body chrome ·
  15–17px world prose · 19–26px display
- **Mobile tap targets never below 44px.** Use `min-height:44px` and control
  visual weight with *padding*, never by shrinking the box.
