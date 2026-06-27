# Manifesto video — asset manifest

The index of every diagram asset: **what each file is, which beat/cue it lands
on, and the reveal order.** Keep this current as assets are built — it's the
source of truth for the Descript edit.

## Conventions

- **Source vs export.** `.excalidraw` = editable source (tracked in git).
  `.png` = export (gitignored — regenerate from source, never hand-edit).
- **Naming:** `ch<N>-beat<M>-<slug>[-<k>].excalidraw`.
  - `-1`, `-2`, … = **cumulative reveal states in order**; highest number = the
    final/full state. Shared elements keep identical coordinates across states so
    a cross-dissolve holds them still.
  - **No number** = a single static asset (no build).
  - The PNG export uses the **same basename** (`ch3-beat2-map-2.png`).
- **Export recipe:** open in Excalidraw **LIGHT mode** (colors are baked literal;
  light mode = no inversion) → *Export image* → **Background OFF**, **3× scale** →
  transparent PNG.
- **Compositing:** drops onto the charcoal **`#1e1e1e`** Descript canvas. Diagrams
  are corner/no-face; **full-screen camera only in intro + outro** (no diagrams
  there).
- **Animating a build:** place state `-1`, then cross-dissolve to `-2`, `-3`… at
  the cue line. Identical coords → only the new/changed parts move.
- **Export anchors (critical for staged builds).** Excalidraw export **crops to
  the content bounding box** — so if a later state is bigger, an earlier state
  exports at a different size/position and the dissolve jumps. Every state of a
  build whose extent grows includes two invisible, locked corner-anchor rects
  (opacity 0) at the **full diagram's extent**, so all states export at identical
  dimensions and shared elements stay pixel-aligned. (Single-extent builds like
  the Beat-1 grid don't need them; the claim-graph states do.)

## Palette (dark chalkboard)

- canvas `#1e1e1e` · default ink `#ced4da` · neutral node fill `#26282b`
- **green = supports / lit / matters** stroke `#69db7c` fill `#163a23` text `#8ce99a`
- **red = objects-to / blocked** stroke `#ff8787` fill `#3a1f1f` text `#ffc9c9`
- **gray/neutral = casual / responds-to / dim** stroke `#adb5bd`

---

## Ch 3 — "The argument, not the crowd"  *(exemplar — all beats built ✅)*

### Beat 1 — the four rooms (2×2 grid)  ✅ built
Reveal: **grid-1 → (dissolve) → grid-2**.

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat1-grid-1` | `ch3-beat1-grid-1.excalidraw` | 1/2 | 2×2 (async/sync × unstructured/structured), all four cells neutral | "…there are four, sorted by two questions" |
| `ch3-beat1-grid-2` | `ch3-beat1-grid-2.excalidraw` | 2/2 (final) | the two **structured** cells light green; casual two stay neutral (dim by contrast) | "…the moment something has to be decided" |

### Beat 2 — the living voter guide (claim-graph)  ✅ built
Reveal: **pamphlet → (dissolve) → map-1 (spine) → (build) → map-2 (full)**.

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat2-pamphlet` | `ch3-beat2-pamphlet.excalidraw` | pre | "VOTER GUIDE" card: Proposal / FOR / AGAINST / REBUTTAL (For=green, Against=red — pre-maps to the graph) | "every ballot measure comes with a voter guide" |
| `ch3-beat2-map-1` | `ch3-beat2-map-1.excalidraw` | 1/2 | claim-graph **spine only** (the proposal) | "…the proposal as the spine" |
| `ch3-beat2-map-2` | `ch3-beat2-map-2.excalidraw` | 2/2 (final) | full graph: 2 supports (green), 1 objection (red), 1 response (neutral), typed arrows + labels | "…support, an objection, or a question" |

### Beat 3 — reputation-blind  ✅ built
Cross-dissolve from `map-2` (shares its extent/anchors → map stays still, the redaction bars + caption fade in).

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat3-blind` | `ch3-beat3-blind.excalidraw` | — | the full map + a **curtain-pull**: dashed callouts reveal one support is from *"the biggest name here · 1.2M"* and the objection from *"a first-day nobody"* + caption "the map can't tell them apart" | "the map doesn't know who you are… a nobody sits in the same place as the biggest name" |

### Beat 4 — dissent can't be buried / the unfarmable metric  ✅ built
Reveal: **open-1 → (response slides in) → open-2**.

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat4-open-1` | `ch3-beat4-open-1.excalidraw` | 1/2 | objection flagged **OPEN** (red badge), no response yet, counter **"1 open objection"** | "an unanswered objection just sits there, flagged, in the open" |
| `ch3-beat4-open-2` | `ch3-beat4-open-2.excalidraw` | 2/2 | the response slides in → badge flips to **ANSWERED** (green), counter **"0 open objections"** | "the only way to clear the flag is to answer it" |

### Beat 5 — the live floor  ✅ built
Reveal: **floor-1 (the room) → floor-2 (+ it feeds the record)**.

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat5-floor-1` | `ch3-beat5-floor-1.excalidraw` | 1/2 | THE LIVE FLOOR: floor-bot + speaking queue, two neutral speaker heads, the gallery row | "a bot runs the floor… a few debate, everyone else watches from the gallery" |
| `ch3-beat5-floor-2` | `ch3-beat5-floor-2.excalidraw` | 2/2 | + down-arrow → mini argument-map (the durable record) + caption "live surfaces; async decides" | "what the debate does is surface claims into the map… live surfaces, async decides" |

### Beat 6 — the scale frontier (AI librarian)  ✅ built
Reveal: **scale-1 (the flood) → scale-2 (librarian proposes a merge, human confirms)**. *(The one place AI is named in the whole video.)*

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat6-scale-1` | `ch3-beat6-scale-1.excalidraw` | 1/2 | a cluster of ~6 near-duplicate claim nodes — "the same claim, a thousand times; the map drowns" | "ten thousand, and it drowns in near-identical claims" |
| `ch3-beat6-scale-2` | `ch3-beat6-scale-2.excalidraw` | 2/2 | a dashed "AI librarian" cluster → **proposes** one merged claim (×6); "a human confirms — not the AI; originals kept"; caption "AI as a librarian, never a judge" | "a model proposes a merge… a person confirms… librarian, never a judge" |

### Beat 7 — land + hand forward  ✅ built

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch3-beat7-callback` | `ch3-beat7-callback.excalidraw` | — | the 2×2 grid recalled (structured cells lit) + creed "match the mode to the moment" | "chat where it's casual, argue where it counts… match the mode to the moment" |

---

## Ch 1 — "Three voices, none supreme"  *(all beats built ✅)*

### Beat 1 — scale forces self-organization
| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch1-beat1-container` | `ch1-beat1-container.excalidraw` | — | a taped-together mess (mods/rules/drama, tan tape) → arrow → clean "how the community decides" container | "held together with duct tape… real infrastructure instead" |

### Beat 2 — three dimensions of each person
| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch1-beat2-meters` | `ch1-beat2-meters.excalidraw` | — | one person + three meters MAKE/FUND/PLAY at different heights | "three things almost everyone does… each earns its own kind of say" |

### Beat 3 — three counts, 2-of-3  (hero)
Reveal: **hero-1 (bars) → hero-2 (+ pass line) → hero-3 (+ verdict)**.
| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch1-beat3-hero-1` | `ch1-beat3-hero-1.excalidraw` | 1/3 | three aggregate bars: MAKERS / FUNDERS / PLAYERS | "it counts three ways at once" |
| `ch1-beat3-hero-2` | `ch1-beat3-hero-2.excalidraw` | 2/3 | + the pass line | "to pass…" |
| `ch1-beat3-hero-3` | `ch1-beat3-hero-3.excalidraw` | 3/3 | + ✓/✗ marks → "PASSES — 2 of 3 (money's count lost, it still carries)" | "you win two of the three… money buys nothing in the other two" |

### Beat 4 — the firewall  (hero)
Reveal: **firewall-1 (whale's empty meters) → firewall-2 (+ $ fills FUND, + compute) → firewall-3 (+ wall blocks REAL POWER)**.
| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch1-beat4-firewall-1` | `ch1-beat4-firewall-1.excalidraw` | 1/3 | a whale: FUND empty, MAKE/PLAY ~zero | "money's welcome…" |
| `ch1-beat4-firewall-2` | `ch1-beat4-firewall-2.excalidraw` | 2/3 | $ fills the FUND meter + a dashed "$ → compute (grows the world for everyone)" | "it buys exactly two things: compute… and a voice in the funders' count" |
| `ch1-beat4-firewall-3` | `ch1-beat4-firewall-3.excalidraw` | 3/3 | a wall blocks $ from REAL POWER (make/play/winning); caption "a funder's voice — never a maker, player, or winner" | "still can't make you a maker, a player, or a winner" |

### Beat 5 — hand-forward teaser
| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch1-beat5-teaser` | `ch1-beat5-teaser.excalidraw` | — | one figure running a single meter sky-high — "can they own it?" | "what stops the most relentless person from piling up one whole count?" |

---

## Other segments — not built yet

Build order TBD. Each segment's per-beat visual spec lives in its own cue sheet:

- **Intro** (`intro.md`) — full-screen face, no diagrams.
- **Ch 0** (`chapter-0.md`) — origin motifs, world card, apathy-graveyard + engagement stack, content→record, lineage/EVE, machine-underneath, money inset.
- **Ch 2** (`chapter-2.md`) — meter callback, conferred-by-others + ghost accounts, the conviction "weight that gets heavier" hero.
- **Ch 4** (`chapter-4.md`) — code/human split, the lifecycle pipeline, the administration, build-it-it's-yours/property, judiciary two faces.
- **Ch 5** (`chapter-5.md`) — real-world-vs-digital contrast, the tamper-evident chain hero, crypto-minus-casino, sealed-by-math, detectable-not-impossible + fork.
- **Ch 6** (`chapter-6.md`) — already-a-government overlay, the floor (three slabs), the dial, graduated participation, the founder mechanism + ratification.
- **Outro** (`outro.md`) — full-screen face; light insets only (callback montage, make/fund/play, draft card).
