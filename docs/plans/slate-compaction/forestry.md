# Slate compaction ledger — forestry

Held out of the big pass because its build was in flight; run
2026-09-23, after the `trade-forestry` pack merged (MR !262, 2026-09-18).
Subsystem doc writable by this pass: `docs/subsystems/forestry.md` only.

## `docs/slates/tails/forestry-slate.md` — 638 → 390 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)

- The second, narrative framing blockquote *(the original framing, kept
  for the record)* (15 lines) — every claim in it is now false: the
  coppice is no longer `trade-fuel`'s by accident
  (`packages/content/trade-forestry/content/trade/forestry/thing/hazel-stool.yaml`;
  `trade-fuel` retains only charcoal/ash/brands/clamp), and *"there is no
  forestry vocation in the register"* is contradicted by
  `docs/vocations.md` lines 123–124 (**forester / woodcutter** and
  **coppicer**, both *shipped*). One status block survives, per the
  skill's calibration.
- `## What actually ships today` (25 lines) — the pre-build inventory.
  Code: eight wood materials at
  `packages/content/base-library/content/stuff/idea/material/wood/{oak,ash,hazel,beech,elm,willow,pine,yew}.yaml`
  (the *"only oak"* finding is spent); the flagged content defect —
  hazel cordwood made of oak — is fixed in
  `packages/content/trade-forestry/content/trade/forestry/thing/cordwood.yaml`
  (`_materialPath: /stuff/idea/material/wood/hazel`). Doc:
  `forestry.md § The wood vocabulary — closed, and minted here`.
- `## Where it lives` (14 lines) — the pack decision and the missing
  vocation. Code: `packages/content/trade-forestry/` exists with the
  coppice inside it and `trade-fuel` as its customer. Doc:
  `forestry.md` (opening paragraph, `/trade/forestry`),
  `docs/vocations.md` rows *forester / woodcutter* · *coppicer* ·
  *charcoal burner / collier* (*"the mine's timber comes off the same
  stand — which is the FORESTER's since the forestry build"*), and
  `content-packs.md`'s pack roster.
- `## ⚠ What the metallurgy drive handed over (2026-09-16)` (39 lines) —
  all three items answered by the build. (1) *the coppice afforded
  nothing* → `trade-forestry`'s `Panel`
  (`packages/content/trade-forestry/src/thing/Panel.ts`), and the lesson
  *a crop propped on the floor is scenery* is already carried by
  `smallholding.md` (lines 59–61). (2) *nothing authors a GROWN plant* →
  `hazel-stool.yaml` authors `growthStage: mature`, `_vigor`,
  `_flowering`, `_seedSet`, `_fruitFill`; doc: `forestry.md § The panel`
  (*"ready on a fresh boot"*). (3) *the rotation is uncompressed* →
  `fruitFillDays: 360`, one game year; doc: `forestry.md § The panel`
  (the rotation + the charcoal arithmetic).
- `## Open questions` bullets — **Q1 rotations** (coppice = one game
  year, standard = fifteen) → `forestry.md § The panel` +
  `§ Coppice with standards` (`daysToStage.mature: 5400`); **Q3 planting
  is a deed** → `forestry.md § Coppice with standards — planting, and the
  deed`; **Q6 the hazel/oak cordwood mismatch** → fixed, above;
  **Q8 the Discipline** → `silviculture.yaml` (ISCED-F 0821),
  `forestry.md § Coppice with standards`. Replaced by one pointer line.
- `### ⭐ A tree has three representations` table (13 lines) — superseded
  in substance by the build's own four-representation table, which
  *rejects* the record and gives *place* to the stand:
  `forestry.md § The four representations of a tree`. The treehouse
  column the slate's table introduced survives in `### Anatomy`, kept.
- `## Scope guardrails` (10 lines) — all four bullets govern the build
  that shipped: *reuse the growth model* (the `Panel` is a `GardenBed`,
  the stools run `GrowingMixin`), *no new Mongo collections* (a standing
  repo rule; the stand and the panel persist into `holder_snapshots`),
  *the wood species rows are the cheapest high-value work* (all eight
  shipped), *if cut for scope, cut conversion before the stand* (moot —
  the stand shipped and conversion was cut).
- `### Gaps the plan carries knowingly` — the bullet **"The bole is not
  persisted and no act hauls it"**: the first half is false in code —
  `forestry.md § fell` records `stampChattel` + `followCustody` and a
  cold-restart proof. The bullet was cut and **replaced by a corrected
  one-line bullet** in the same list (*no act hauls the bole … the
  transport pack's day*), so the haul item is not lost from the body.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut

- `## ⭐⭐⭐ The crop you inherit — and it dissolves the timescale
  problem` (34 lines) — code: the two rotations
  (`hazel-stool.yaml` `fruitFillDays: 360`; `plant/oak-standard.yaml`
  `daysToStage.mature: 5400`). The doc stated both numbers and neither
  why → inserted into `forestry.md § Why the wood is shaped this way`
  (*Two crops, two timescales*).
- `## ⭐⭐ Deforestation is the lesson, and it must be allowed to happen`
  (21 lines) — code: `trade-forestry/src/lib/Stand.ts` (`cut` settles
  and stamps; nothing but the increment and planting restores). The doc
  stated the mechanism and not the lesson → inserted into
  `forestry.md § Why the wood is shaped this way` (*A wood may be
  destroyed*).
- `## ⭐⭐ The structural bet — an authored forest is a forest; the stand
  is the one thing that moves` (66 lines) — code: there is no land-use
  conversion, no room generator and no per-tree simulation anywhere in
  `trade-forestry/src/`; the doc's opening line states the invariant with
  no argument behind it → inserted into
  `forestry.md § Why the wood is shaped this way` (*An authored wood is
  always a wood*), including *assarting is a thing an author does, not a
  verb* and *getting lost is authored*. ⚠ Its closing ⭐ paragraph
  (expression as an inelastic resource) is realm-level and goes to
  **Handoff**, not into `forestry.md`.

### Superseded — cut

- `## ⭐ A stand is a record — the pattern's fourth consumer` (16 lines)
  — by the code: the build rejected the filed-record shape and made the
  stand a **cover on the ground** (`StandMixin` on `Wood`). Note left in
  the slate pointing at
  `forestry.md § The four representations of a tree` +
  `§ The stand — StandMixin`. Its two surviving claims (seeded ×
  derived; no regrowth timers) are carried by the doc and by the kept
  open question on the seeded half.

### Kept (UNBUILT)

- `## Wood's consumers — the deepest demand list in the game` — the
  multi-product gap in content form: oak bark → the tanner
  (`trade-dyeing`'s `tannin.yaml` still has no source), mast/pannage,
  seasonal bark stripping. `forestry.md § Deferred seams` names
  *multi-product plants* with no content behind it.
- `## Silviculture — what the discipline actually is` — species by site
  (the seeded site character is deferred), rotation length (shipped),
  **thinning**, **regeneration + browse**, **stool longevity**. The
  Discipline row shipped; its curriculum did not.
- `## Conversion, and seasoning is the interesting half` — ⚠ verified:
  there is **no `trade-sawing` pack** (`ls packages/content` — 47 packs,
  none). Cleaving vs sawing, water-powered sawing, and seasoning as a
  capital asset that appreciates are unbuilt and live only here.
- `## The law — and this is where estovers finally lands` — housebote /
  haybote / firebote, *reasonableness*, the woodward, and the *vert and
  venison* shared-enforcement argument. Unbuilt.
- `## What must not happen` — kept as a standing guardrail over the
  remaining tail (the stand, partial yield, and the sawing build);
  short, and it governs work that has not happened.
- `## Open questions` — Q2 (seeded × derived: the seeded half is
  deferred — `forestry.md § Deferred seams`, *the seeded site character
  for a Wood*), Q4 (the sawmill in `trade-sawing`, the
  RGO → conversion → maker chain), Q5 (one enforcement design → the
  land-use covenant; only the `epoch` half shipped), Q7 (where the first
  forest is — see Uncertain).
- `## Lens pass (2026-09-17)` — kept whole for its three ⚠ gaps, two
  still open: **wayfinding as a Discipline has no home**, and
  **Rejection has no woodward seat** (the third — the room/object light
  disagreement — shipped, `forestry.md § Daylight, and no night`).
- `### ⭐ Anatomy — a tree's parts are five primitives, not one class` —
  the Christmas tree end-to-end and the treehouse column. Verified
  unbuilt: no `hanging` posture (`Postures` in
  `packages/server/src/mud/lib/slot/Postured.ts` is
  stand/sit/lie/kneel/mounted), no tree-in-a-stand row, no treehouse
  venue. The primitives it rides are real (`Climbable.ts`,
  `platform/thing/Window.ts`, `SlottedMixin`).
- `### Bigness — a tree is the first Thing whose product exceeds a body`
  — kept as one table: the bole row shipped, but *it burns as a whole*
  (fire on the stand) and *several products over a year* are ❌ and the
  prop-grows-into-a-place row is ⏸. Not splittable below the table.
- `### The axes, and where each lives` — leaf habit → `coldStopK`,
  conifer vs broadleaf, masting, the unread
  `Species.sexDeterminationSystem`, the nursery ladder, form as a stamp.
  All named in `forestry.md § Deferred seams` as words only.
- `### Gaps the plan carries knowingly` — minus the bole bullet: no age
  structure in the record, shade asserted not modelled, browse, hauling
  the bole.

### Uncertain — kept

- `## Open questions` **Q7 — where the first forest is.** Its first half
  shipped (the Hanging Wood above Rejection —
  `packages/content/rejection/content/world/rejection/hanging-wood*`),
  but two parts are live: *newbie-wilds' dark wood is the second forest*
  is not in the tree (`second-wood.test.ts` is a test, not a venue), and
  ⚠ **the bullet says the wood is `landUse: wild`, which the shipped
  build contradicts** — `forestry.md § Coppice with standards` states the
  title is `agricultural`, NOT `wild`, *because `wild` admits no
  cultivation*. Kept verbatim; requirements must reconcile the commons
  framing with the title the panel needs.
- **Four `Left` items have no body section at all** — `analyze wood` +
  the per-wood roll-up, partial yield below ripe, the Cover seam, and a
  planted standard folding into `mix[].standing`. They exist only in the
  status stamp and in `forestry.md § Deferred seams` (which says *"each
  a line in `forestry-slate.md`"* — not true of these four). The
  body-wins rule would delete real backlog, so they are **kept in
  `Left`** with a pointer to the doc. Coordinator call: leave as is, or
  give them a two-line body section.
- Cluster note: `land-use-covenant-slate` names the **woodward** (lines
  116, 216, 248) but carries no estovers / housebote / haybote /
  firebote design, and `hunting-slate` is cited for shared enforcement.
  Thematic neighbours, not duplicated open design — **nothing merged**.

### Doctrine

| section | outcome |
|---|---|
| `## ⭐⭐⭐ The crop you inherit` | GRADUATED → `forestry.md § Why the wood is shaped this way` |
| `## ⭐⭐ Deforestation is the lesson` | GRADUATED → `forestry.md § Why the wood is shaped this way` |
| `## ⭐⭐ The structural bet` (the forest-is-authored argument) | GRADUATED → `forestry.md § Why the wood is shaped this way` |
| `## ⭐⭐ The structural bet` (the closing *expression is inelastic* paragraph) | MOVED → handoff (`design-philosophy.md`) |
| `## What must not happen` | STAYS — it constrains the unbuilt tail (sawing, partial yield, the stand) |
| `## Lens pass` | STAYS — two of its gaps are open backlog |

### Handoff (belongs in a doc outside my list)

- → `docs/design-philosophy.md § The fidelity axis` (the doc owns the
  fidelity axis; the word *inelastic* appears in no top-level doc today).
  Verbatim, from `## ⭐⭐ The structural bet`:

  > ⭐ **The doctrine underneath, worth carrying to every RGO:** expression
  > is an **inelastic resource** — NetHack, Dwarf Fortress and the board
  > games spend a fixed alphabet with great care — and the game's dynamism
  > comes from *everyone being an author*, so the code is always changing,
  > not from one codebase simulating every outcome. Abstract the parts of a
  > lifecycle that are meaningful to the player and that the platform can
  > persist and compute; leave the rest to the next author.

- → `docs/subsystems/spatial.md` (pointer only; the design stays in the
  forestry slate's `### Anatomy` until someone builds it). The slate
  says the gap is *"filed there, not forestry's"* — it is **not** filed:
  `spatial.md` has no `under` concept. Verbatim, from `### Anatomy`:

  > **there is no *under*** — the spatial model has *in* and *on* only,
  > and that is a spatial-substrate question (under the bed, under the
  > floorboards), filed there, not forestry's

### Inserted into `docs/subsystems/forestry.md`

- New `## Why the wood is shaped this way`, inserted before
  `## Deferred seams`: three short subsections (two crops two
  timescales · a wood may be destroyed · an authored wood is always a
  wood). No existing sentence in the doc was edited.

### Status block

- Left: (old) `analyze wood` + per-wood roll-up · partial yield · the
  Cover seam · a planted standard folding into `mix[].standing` · the
  § Dimensions axes · the seeded site character — plus a trailing
  sentence on conversion/law/carpentry
  → (new) the same four doc-deferred seams, plus the body's own open
  work now represented: multi-product wood (oak bark, mast) · the
  silviculture curriculum (thinning, regeneration, browse, stool
  longevity) · conversion + seasoning → `trade-sawing` · forest law
  (estovers, the woodward) → the covenant · the seeded half of the
  seeded × derived model · the wayfinding Discipline's home · a
  woodward seat for Rejection · a second authored wood · the tree
  anatomy tail (the `hanging` posture, the tree-in-a-stand, the
  treehouse column) · fire on the stand · the tree axes · shade, browse,
  age structure, hauling the bole.
- Size: a tail → a tail (several small ones; `trade-sawing` and the
  covenant remain their own builds and are not counted here).

---

## Coordinator (2026-09-23) — handoffs applied

- `design-philosophy.md § The fidelity axis` — *expression is an
  inelastic resource* inserted after *Where the philosophy lands on this
  axis*, with a closing sentence tying it to the ladder above (verified:
  the word appeared in no top-level doc). Its source section was already
  graduated-and-cut, so no pointer is owed in the slate.
- `spatial.md` — no insert: the handoff is a correction of the slate's
  own claim (*there is no `under`, filed there*) and the design stays in
  the slate until someone builds it. Recorded here so the next spatial
  pass knows the gap is unfiled.
- Left standing for requirements: Q7's `landUse: wild` vs
  `forestry.md § Coppice with standards`'s `agricultural` title (⚠ `wild`
  admits no cultivation) — the commons framing and the title the panel
  needs must be reconciled.
