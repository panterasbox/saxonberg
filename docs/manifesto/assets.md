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

## Palette (dark chalkboard)

- canvas `#1e1e1e` · default ink `#ced4da` · neutral node fill `#26282b`
- **green = supports / lit / matters** stroke `#69db7c` fill `#163a23` text `#8ce99a`
- **red = objects-to / blocked** stroke `#ff8787` fill `#3a1f1f` text `#ffc9c9`
- **gray/neutral = casual / responds-to / dim** stroke `#adb5bd`

---

## Ch 3 — "The argument, not the crowd"  *(exemplar — in progress)*

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

### Beat 3 — reputation-blind  ⬜ not built
Reuses the Beat-2 map; names/authorship absent (a "nobody" node = a "big name" node). *Plan: a variant of `map-2`.*

### Beat 4 — dissent can't be buried / the unfarmable metric  ⬜ not built
Reuses the map with an **unanswered objection flagged ⚠ open** + an open-objection counter ticking to zero only as objections are answered.

### Beat 5 — the live floor  ⬜ not built
Debate stage: floor-bot, speakers, gallery; arrow carrying claims *down* into the map.

### Beat 6 — the scale frontier  ⬜ not built
Map drowning in near-duplicates → an AI "librarian" proposes a merge (human confirms ✓); originals persist. *(AI named exactly once — here.)*

### Beat 7 — land + hand forward  ⬜ not built
The 2×2 grid again with "match the mode to the moment."

---

## Other segments — not built yet

Build order TBD. Each segment's per-beat visual spec lives in its own cue sheet:

- **Intro** (`intro.md`) — full-screen face, no diagrams.
- **Ch 0** (`chapter-0.md`) — origin motifs, world card, apathy-graveyard + engagement stack, content→record, lineage/EVE, machine-underneath, money inset.
- **Ch 1** (`chapter-1.md`) — duct-tape→container, three-meter person, the gauges hero (2-of-3), the firewall/whale. *(first-pass assets were deleted; rebuild from scratch.)*
- **Ch 2** (`chapter-2.md`) — meter callback, conferred-by-others + ghost accounts, the conviction "weight that gets heavier" hero.
- **Ch 4** (`chapter-4.md`) — code/human split, the lifecycle pipeline, the administration, build-it-it's-yours/property, judiciary two faces.
- **Ch 5** (`chapter-5.md`) — real-world-vs-digital contrast, the tamper-evident chain hero, crypto-minus-casino, sealed-by-math, detectable-not-impossible + fork.
- **Ch 6** (`chapter-6.md`) — already-a-government overlay, the floor (three slabs), the dial, graduated participation, the founder mechanism + ratification.
- **Outro** (`outro.md`) — full-screen face; light insets only (callback montage, make/fund/play, draft card).
