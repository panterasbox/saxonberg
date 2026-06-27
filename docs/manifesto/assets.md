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

## Ch 0 — "A government in a game"  *(all beats built ✅)*

All single static assets (no staged reveals).

| PNG | Source | Beat | Shows | Lands on cue |
|---|---|---|---|---|
| `ch0-beat1-origin` | `ch0-beat1-origin.excalidraw` | 1 | a MUD terminal + a livestream chat, side by side — "where the ideas came from" | "the text-based MUDs… and the livestreaming communities of today" |
| `ch0-beat2-world` | `ch0-beat2-world.excalidraw` | 2 | a stylized world card (prose + art hint) + two differentiators: educational core / the people run it (laws·treasury·courts) | "an MMO… educational core… the people who live in it run it" |
| `ch0-beat3-graveyard` | `ch0-beat3-graveyard.excalidraw` | 3 | DAOs / online democracies / token voting as empty, zero-turnout rooms — "built the rules, died of apathy" | "built the rules and waited for a crowd that never came… died of apathy" |
| `ch0-beat3-stack` | `ch0-beat3-stack.excalidraw` | 3 | GOVERNMENT slab riding on the PLAY base — "the engine they never had" | "the government rides on the play… the engine every one of those experiments was missing" |
| `ch0-beat4-record` | `ch0-beat4-record.excalidraw` | 4 | prose / image / action → a ledger of blocks (one = "vote 60-40") — "recorded exactly, can't be faked" | "everything is just information… recorded exactly… nobody can quietly fake" |
| `ch0-beat5-lineage` | `ch0-beat5-lineage.excalidraw` | 5 | EVE / players-vote / text-world-ballots → the apparatus (assembly) + "votes you can't buy" + "juries by lot" | "games have been laboratories… old ideas… what's new is the assembly" |
| `ch0-beat6-machine` | `ch0-beat6-machine.excalidraw` | 6 | "THE MACHINE" base with your game + ghosted communities + a DRAFT constitution card | "the machine underneath it… any community could pick up and run… a draft" |
| `ch0-beat7-money` | `ch0-beat7-money.excalidraw` | 7 | a money-bag looming over "the apparatus" with a big "?" | "what stops whoever brings the most money from owning the whole thing?" |

---

## Ch 2 — "Power is earned and spent, never owned"  *(all beats built ✅)*

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch2-beat1-standing` | `ch2-beat1-standing.excalidraw` | — | one meter labeled STANDING (callback to Ch1's meters) | "your voice in this is something we call standing" |
| `ch2-beat2-conferred-1` | `ch2-beat2-conferred-1.excalidraw` | 1/2 | other people's engagement arrows fill YOUR make meter | "standing is conferred by other people" |
| `ch2-beat2-conferred-2` | `ch2-beat2-conferred-2.excalidraw` | 2/2 | + a cluster of ghost accounts whose arrows land empty | "a thousand fake accounts earn you nothing" |
| `ch2-beat3-conviction-1` | `ch2-beat3-conviction-1.excalidraw` | 1/3 | a YES stance committed at day 1 — "weight: 1×" | "the way you use it is conviction" |
| `ch2-beat3-conviction-2` | `ch2-beat3-conviction-2.excalidraw` | 2/3 | the same stance held to day 7, grown bold — "weight: 5×" | "the longer you hold it, the more it weighs" |
| `ch2-beat3-conviction-3` | `ch2-beat3-conviction-3.excalidraw` | 3/3 | a flip → NO snaps back to "weight: 1×" | "flip, and the weight starts over… a last-second swing doesn't" |
| `ch2-beat3-fullweight` | `ch2-beat3-fullweight.excalidraw` | — | full weight on Issues A/B/C at once vs a crossed-out sliced pie | "full weight on every question, not a budget you spread thin" |
| `ch2-beat4-teaser` | `ch2-beat4-teaser.excalidraw` | — | a proposal + two claim nodes — "how does a community argue it out?" | "none of it says how a community actually argues something out" |

---

## Ch 4 — "Governing is shipping software"  *(all beats built ✅)*

All single static assets.

| PNG | Source | Beat | Shows | Lands on cue |
|---|---|---|---|---|
| `ch4-beat1-inert` | `ch4-beat1-inert.excalidraw` | 1 | "DECISION: ✓ passed" on a page → "…now what?" | "a decision is just words until something starts running" |
| `ch4-beat2-split` | `ch4-beat2-split.excalidraw` | 2 | CODE (small, mechanical) vs PEOPLE (the bigger half) | "code handles the mechanical; people handle everything else" |
| `ch4-beat3-pipeline` | `ch4-beat3-pipeline.excalidraw` | 3 | legislature→executive→judiciary (decide→build→check) + law at 3 sizes (broad / nerf-NPC / exact) | "the legislature decides… requirements at any size" |
| `ch4-beat4-admin` | `ch4-beat4-admin.excalidraw` | 4 | the executive = a whole administration; engineering is one box among many | "the administration… building code is one specialty" |
| `ch4-beat5-property` | `ch4-beat5-property.excalidraw` | 5 | build in a sandbox → YOUR CLAIM (property); executive can oversee ✓ / seize ✗ (due process); a play-only figure untouched | "property, not politics — held, not governed" |
| `ch4-beat6-judiciary` | `ch4-beat6-judiciary.excalidraw` | 6 | the two faces — VERIFICATION (✓ conforms / ✗ diagnostic remand) + APPEAL; jury by lot | "code review, but for whether the law came true… court judges, executive builds" |
| `ch4-beat7-synth` | `ch4-beat7-synth.excalidraw` | 7 | legislature decides · executive makes it real · people check → "who holds all that power?" | "the legislature decides, the executive makes it real, the people check all of it" |

---

## Ch 5 — "Don't trust — verify"  *(all beats built ✅)*

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch5-beat1-levers` | `ch5-beat1-levers.excalidraw` | — | THE EXECUTIVE holding every lever (votes/records/courts) + "what stops them lying?" | "an enormous amount of power in one place… what stops them lying?" |
| `ch5-beat2-contrast` | `ch5-beat2-contrast.excalidraw` | — | the real world (witnesses/paper/footage) vs a digital world (only 1s and 0s, no outside) → control the record = control what happened | "we have no outside… the writing-down IS the vote" |
| `ch5-beat3-chain-1` | `ch5-beat3-chain-1.excalidraw` | 1/2 | a tamper-evident chain intact → "check it yourself → 60–40 ✓" | "you check it yourself, from the raw record" |
| `ch5-beat3-chain-2` | `ch5-beat3-chain-2.excalidraw` | 2/2 | a past block altered (70–30) → the chain visibly breaks red | "change a single past entry and the whole thing visibly breaks" |
| `ch5-beat4-casino` | `ch5-beat4-casino.excalidraw` | — | KEEP the verifiable ledger ✓ / DISCARD the casino (coins·charts·pump) ✗ crossed out | "the idea crypto was built on, minus the casino" |
| `ch5-beat5-sealed` | `ch5-beat5-sealed.excalidraw` | — | the keeper reaching for the archive, blocked by a padlock — "sealed by math" | "its honesty comes from math… the keeper can't forge the books" |
| `ch5-beat6-detectable` | `ch5-beat6-detectable.excalidraw` | — | operator deletes/hides/forks → an ALARM (always visible) → you take your stuff and leave | "detectable, not impossible — they can't get away with it" |
| `ch5-beat7-handforward` | `ch5-beat7-handforward.excalidraw` | — | the liar → caught ✓; the honest holder of all the power → ? | "can a community ever be free of the person who runs it?" |

---

## Ch 6 — "A dial on an honest floor"  *(all beats built ✅)*

| PNG | Source | State | Shows | Lands on cue |
|---|---|---|---|---|
| `ch6-beat1-switch` | `ch6-beat1-switch.excalidraw` | — | a person + an ON/OFF switch ("somebody always has root") + "can a community be free of whoever runs it?" | "somebody has root… anyone who claims they've abolished power is selling something" |
| `ch6-beat2-floor` | `ch6-beat2-floor.excalidraw` | — | three bedrock slabs: money-can't-buy-power · record-can't-be-faked · you-can-always-leave | "three things guaranteed in every copy… bedrock" |
| `ch6-beat3-moderation` | `ch6-beat3-moderation.excalidraw` | — | you-already-run-a-government mapping (operator→exec, mods→police, rules→law, appeals→courts, mod-log→record) + "rules take the heat, not you" | "you're already running a government — you just call it moderation" |
| `ch6-beat3-dial` | `ch6-beat3-dial.excalidraw` | — | the dial slider (operator ↔ full republic) sitting on the floor; ghosted communities each set their own | "turn the dial as far as you trust your people" |
| `ch6-beat4-graduated` | `ch6-beat4-graduated.excalidraw` | — | operator hands a call down; a member delegates the vote (revocable) — "nobody carries the whole load" | "an operator can defer… a member can hand their vote to someone they trust" |
| `ch6-beat5-founder` | `ch6-beat5-founder.excalidraw` | — | pre-ratification across the 3 counts (patron match+1 / producer diluting / consumer none) → RATIFICATION → outcomes (offboard / sunset / keep-match / autocrat) → floor holds | "before a community ratifies… then ratification, the community decides… the floor holds" |
| `ch6-beat6-landing` | `ch6-beat6-landing.excalidraw` | — | the series motifs assembled (meters · map · pipeline · chain · floor · dial) → "THAT'S THE DESIGN" → hard-cut to the Outro | "that's the whole thing… that's the design" |

---

## Other segments — not built yet

Build order TBD. Each segment's per-beat visual spec lives in its own cue sheet:

- **Intro** (`intro.md`) — full-screen face, no diagrams.
- **Outro** (`outro.md`) — full-screen face; light insets only (callback montage, make/fund/play, draft card).
