# Slate-compaction ledger — batch `smallholding`

Slates: `docs/slates/builds/zoning-slate.md`,
`docs/slates/tails/development-slate.md`. Insert-only target:
`docs/subsystems/smallholding.md`.

## Findings (pre-pass)

- `stewardship-slate.md` (referenced by zoning-slate as "lives on another
  branch, not on master") is now **present on master** — the branches
  merged. The closed six land use (`residential · agricultural ·
  commercial · industrial · civic · wild`) ships in
  `packages/server/src/mud/lib/parcel/LandUse.ts` exactly as
  smallholding.md documents (capability + ceiling, `wild` fail-closed,
  band checked only at `subdivide`).
- `packages/server/src/mud/lib/parcel/ParcelRecord.ts` carries `area`
  (declared, `0` = undeclared) and `landUse` — both shipped, both
  documented in smallholding.md. `extent` remains an identity **path**,
  never an area.
- A **per-location extent** field did ship, but for a different consumer
  than zoning-slate anticipated: `Location.getLinearExtent()` /
  `CartesianLocation`'s persistent `extent` override, feeding the combat
  band ladder, `getSizeScale()` and `getVolume()` (`ranged.md § The arena
  caps the ladder`). Zoning's own consumer (outdoor parcel acreage) was
  resolved differently — `parcel.area` is **declared**, explicitly
  **not** derived from room/zone geometry (smallholding.md § Area is
  DECLARED, never derived — which names the identical danger
  `ranged.md` also flags for `getSizeScale()`).
- `Watercourse`'s directional topology (`upstream`/`downstream`, direction
  derived from authored topology) shipped — `docs/subsystems/watershed.md
  § Watercourse — topology authored, direction derived`. This is exactly
  the "one new relation" zoning-slate's emission model asked for on the
  water channel.
- `docs/settlement-model.md` (2026-09-03, later than zoning-slate's
  2026-07-31 capture) restates — near-verbatim in places — zoning-slate's
  site-driven/exit-driven taxonomy (§ 2), the density/Tiebout workshop
  argument incl. the burgage-plot table and the allowance-cascade note
  (§ 4). It is the doctrine successor for that material; per the task
  brief a top-level doc counts as a documenting source, so this content
  is cut from zoning-slate as superseded-by-doctrine rather than kept
  duplicated in two places.
- No code anywhere implements an emission/nuisance model
  (`emissionAt`, boundary caps, odour testimony, nonconforming-use
  bookkeeping, a derived settlement-type/use-profile, a necropolis
  cumulative-ceiling class, or any stockyard/abattoir content). All of
  zoning-slate's `Left` items are confirmed still open.
- `ParcelApi.spaceOf`/`workableAreaOf` shipped (`ParcelRegistry.spaceOf`)
  and cover **coverage** (lot tier) and an **area-based** efficiency
  (building tier) — documented in `furnishing.md § The space account`,
  which explicitly flags development-slate as the source of the still-
  open refinements: a **measured**, cell-counted efficiency (`lettable
  cells ÷ built cells`), splitting ground vs floor conservation, and the
  subdivide-ceiling productive-children fix. `FAR` itself (gross floor ÷
  land) is not computed anywhere.
- `ParcelRegistry.childAreaTotal` sums **every** child unconditionally —
  confirmed the "only productive children should draw" correction is
  still unbuilt.
- The land-draw formula (`draw = Σ productive objects' landRequirementM2`,
  authored on the bed, only productive things draw) shipped verbatim in
  smallholding.md § The land draw. The **"over-draw has no penalty"**
  rule is still what ships and is still tested
  (`GardenBed.test.ts`: *"⭐ over-draw carries NO penalty — crowding is
  the limiting factor"*). Development-slate's later correction (extent is
  hard, refuse placement beyond available land) has **not** been applied
  — this directly contradicts smallholding.md's shipped/documented
  behavior and is logged as Uncertain, not silently resolved either way.
- The hermit test ("a shack and a garden in an unparcelled forest, zero
  numbers") shipped and is documented **twice already** —
  smallholding.md § Unparcelled ground is NOT policed, and
  furnishing.md's "Unmeasured land is not policed" line — matching
  development-slate's "hermit test" section close to verbatim.

---

## docs/slates/builds/zoning-slate.md — 495 → 394 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED / SUPERSEDED)
- `⚠ stewardship-slate.md lives on another branch` callout (7 lines) —
  SUPERSEDED: that branch is now on master
  (`docs/slates/builds/stewardship-slate.md` exists, PARTIAL); the closed
  six it flagged ships in `packages/server/src/mud/lib/parcel/LandUse.ts`
  and is documented at `smallholding.md § Land use — the closed six`.
- `## Acreage — and the dependency two live sessions share` (27 lines) —
  SUPERSEDED: `ParcelRecord.area` shipped as a **declared** field (never
  derived from geometry) — `smallholding.md § Area is DECLARED, never
  derived` — the opposite of this section's "derive it, don't store it"
  proposal. The per-location extent field itself also shipped, but for
  ranged/light/volume, not outdoor acreage —
  `ranged.md § The arena caps the ladder` (`Location.getLinearExtent()`).
- `### ⭐⭐ Exit-driven — and the symmetry` (21 lines, minus a 4-line
  pointer left in place) — SUPERSEDED by
  `settlement-model.md § 2` (site-driven/exit-driven taxonomy, the
  suburb/industry-town exit symmetry, the burial-ban third motive —
  Colma, Union Stock Yards' Town of Lake — restated there near-verbatim).
- `### ⭐⭐⭐ And the reason underneath all of it is DENSITY` +
  `### Site-driven — the other half` (40 lines, minus a 5-line pointer)
  — SUPERSEDED by `settlement-model.md § 4` (density/Tiebout, the
  burgage-plot workshop table, home occupation, the allowance cascade)
  and `§ 2` (resource town / node town), both restated there
  near-verbatim.
- `#### ⭐ Water is the one directional channel` (11 lines, minus a
  5-line pointer) — SHIPPED · DOCUMENTED: `Watercourse`'s
  authored-topology/derived-direction `upstream`/`downstream` relation —
  `watershed.md § Watercourse — topology authored, direction derived`.
- `[ranged-slate](./ranged-slate.md) (the shared extent dependency)` —
  dropped from the *Related* list; its only reason for the link (the
  Acreage section's three-consumer dependency) was cut above.

### Kept (UNBUILT)
- `## ⭐⭐ What makes industrial categorically different` +
  `### ⭐ Which is why zoning exists at all` +
  `### ⭐⭐ And here nuisance is measurable`
- `## Where industry goes — the map already decides` +
  `### ⭐ The stockyard is the first zoning fight`
- `### ⭐⭐ "Few permanent residents" is the defining political fact`
  (company towns, Pullman, the commuter franchise)
- `### ⭐ The necropolis, mechanically`
- `### ⭐ Weird legacies have a mechanical explanation: path dependence`
- `### ⭐ Settlement type is DERIVED, not declared`
- `## ⭐⭐ Somebody has to host the abattoir (the LULU problem)`
- `## ⭐ Nonconforming use — free from the founding fiction`
- `## The emission model` and every subsection except the water-relation
  one cut above (not a new propagation system; three kinds of
  externality; `signalAt`-shaped measurement; odour-by-testimony; the
  activity emits not the building; the instrument reads the total; cap
  at the boundary; remedies)
- `## Open questions` items 4–7 (use-profile caching, nonconforming-use
  bookkeeping, grave permanence vs. residency, commuter voice)

### Uncertain — kept
None for this slate — no kept section contradicts a shipped decision.

### Handoff (belongs in a doc outside my list)
None — every superseding/shipping source found (`settlement-model.md`,
`watershed.md`, `ranged.md`) already carries the material; nothing
needed inserting.

### Status block
- Left: *the emission/nuisance model over `signalAt` · the cap at the
  boundary · the LULU host problem · nonconforming use · derived
  settlement type · industrial premises + the stockyard fight* →
  *the emission/nuisance model over `signalAt` (minus the water
  relation) · the cap at the boundary · the LULU host problem ·
  nonconforming use · derived settlement type (incl. use-profile
  caching) · industrial premises + the stockyard fight · the necropolis
  as a cumulative-ceiling land use, mechanically · path-dependence as a
  zoning-history mechanic · commuter voice / company-town franchise*
  (grown — three UNBUILT body sections were unrepresented)
- Size: a build → a build (unchanged; the core emission-model build is
  still the bulk of the remaining work)

---

## docs/slates/tails/development-slate.md — 282 → 229 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- Second `> **Status: design captured 2026-08-01, not built.**` blockquote
  (8 lines) — a second status block per the pilot calibration; the
  canonical one at the top of the file stands. Its origin narrative (the
  D17 review question) is fully covered by the sections that follow it.
- `## The hermit test — no burden on authors who don't care` body (27
  lines, minus a 5-line pointer; the `### The CMS should propose the
  numbers` subsection is kept) — code: `ParcelApi.ownerOf` (total, falls
  back to state), `ParcelRegistry` acreage check degrading on `area ===
  0`; doc: `smallholding.md § Unparcelled ground is NOT policed` and
  `furnishing.md`'s "Unmeasured land is not policed" line — both state
  the identical "hermit in a forest, zero numbers" test.
- `## Land's job is to make production scarce` intro + `### The draw
  rides the productive object` (37 lines, minus a 4-line pointer; the
  `### Density is soft...` and `### Unused capacity...` subsections are
  kept) — code: `Cultivable.landRequirementM2`,
  `ParcelRegistry.childAreaTotal`; doc: `smallholding.md § The land draw
  — what makes production scarce` (near-verbatim: the draw formula,
  "only productive things draw", the cell-count/per-zone-declaration
  honesty argument).
- `## Corrections … ` item 2 (the ceiling-is-a-maximum-not-usable-area
  note, 3 lines) — doc: `furnishing.md § The space account` now states
  this plainly ("`area × storeys` is a ceiling… nobody plans against a
  maximum").
- `- **Minted identity may already unblock per-room extent.**` open
  question (7 lines) — SUPERSEDED: the `asTemplatePath` minting channel
  it depended on is retired, and the shipped answer went the other way
  — a lot's room is a plain `FurnishableRoom`, deliberately **not**
  `CartesianLocation`, precisely because a per-lot-minted room cannot
  safely be a grid member (`smallholding.md § A lot's room is NOT on the
  street's grid`). Kept as a struck-through, answered bullet rather than
  silently deleted, matching this slate's own convention elsewhere.

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- The "It slots into property-slate's standing doctrine — two conserved
  scarcities, never collapsed, coupled only at the parcel — as the
  missing leg: land prices production, compute prices liveness" sentence
  (3 lines, part of the cut "Land's job" section above) — code: the
  shipped land-draw mechanism itself; doc: inserted at
  `smallholding.md § The land draw — what makes production scarce`
  (4 lines, right after the "no penalty mechanic" warning).

### Kept (UNBUILT)
- `## The governing rule`
- `## Three planes, four ratios` — kept whole; **3 of its 4 ratios have
  partial shipped equivalents in a different shape** (see Uncertain,
  below), but the table is the doc's vocabulary spine for the genuinely
  open `FAR` ratio and everything downstream, so it stays intact rather
  than being split at the row.
- `## Never model the tissue`
- `## Zones overlap — so the remainder is a BUDGET, not a partition`
- `### Density is soft. Extent is hard. They are not the same thing.`
  — see Uncertain, below
- `### Unused capacity is indefinite`
- `### The CMS should propose the numbers, not demand them`
- `## Entitlement vs built`
- `## Open questions` — Zone extent · which uses are productive? · does
  rent count as production? · regulation vs engine
- `## What this slate does NOT cover`
- `## Corrections …` item 1 (`subdivide`'s ceiling — confirmed still
  unbuilt: `ParcelRegistry.childAreaTotal` sums every child
  unconditionally, no productive/`landUse` filter)

### Uncertain — kept
- `### Density is soft. Extent is hard.` (and the reasoning it corrects
  in "Land's job is to make production scarce") — **directly contradicts
  the shipped, documented, and TESTED behavior**: smallholding.md's own
  "⚠ Over-draw is permitted and there is NO penalty mechanic … there is a
  test asserting the draw is inert to growth", backed by
  `GardenBed.test.ts`'s `"⭐ over-draw carries NO penalty — crowding is
  the limiting factor"` (still passing). This section is a *later*,
  unapplied correction (build-2) proposing a hard refusal when a
  productive object's land requirement would exceed the parcel's
  available area. Nothing in the code implements the refusal — the
  contradiction is live, not resolved either way. Requirements needs to
  pick a side rather than inherit the ambiguity.
- `## Three planes, four ratios` — **coverage** (footprint ÷ land, lot
  tier) and an **area-based** efficiency (unit floor ÷ gross floor,
  building tier) shipped via `ParcelApi.spaceOf`/`workableAreaOf`
  (`ParcelRegistry.spaceOf`), documented in `furnishing.md § The space
  account`. But furnishing.md's own text explicitly frames this
  slate's **cell-counted** efficiency (`lettable cells ÷ built cells`)
  as still-pending refinement, and nothing computes **FAR** (gross floor
  ÷ land) anywhere. So the table is genuinely mixed: two of four ratios
  have a shipped-but-cruder equivalent elsewhere, one (draw) shipped
  exactly as specified (cut above), and one (FAR) is wholly open.

### Handoff (belongs in a doc outside my list)
None — the only SHIPPED·UNDOCUMENTED item found (the conserved-
scarcities sentence) belongs in smallholding.md, which is in scope, and
was inserted there directly.

### Status block
- Left: *coverage / FAR / efficiency as derived ratios · the `subdivide`
  ceiling correction (only productive children draw) · a consequence for
  over-draw (inert today) · the CMS proposing the numbers · entitlement
  vs built* → *FAR + a cell-counted efficiency ratio (coverage and an
  area-based efficiency already ship via `ParcelApi.spaceOf`) · the
  `subdivide` ceiling correction (still unbuilt) · the hard extent cap on
  over-draw (contradicts today's shipped inert-over-draw behavior,
  unresolved) · unused capacity as a land-banking/legislative dial · the
  CMS proposing the numbers · entitlement vs built* (narrowed on the
  ratios line to reflect what actually shipped; grown by one item —
  unused capacity — that was in the body and unrepresented)
- Size: a wave → a wave (unchanged)
