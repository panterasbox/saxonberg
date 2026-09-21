# Slate-compaction pass — maturation batch ledger

One slate. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `maturation.md`
only. **No inserts were made** — everything that shipped from this slate
was already documented, but in OTHER subsystem docs (chattel.md,
employment.md, corpo.md, content-packs.md, crafting.md, encumbrance.md,
magic-items.md), never in maturation.md specifically (maturation.md
already carries the durative-transform mechanism in full depth from the
fermentation build). Those graduations belong to other agents' write
lists; recorded below as Handoff for completeness, though in every case
the target doc already has the material (nothing to insert — see each
entry).

Code verified in `packages/server/src/mud/**`, `packages/content/
trade-distilling/`, `trade-farming/`, `trade-winemaking/`,
`trade-brewing/`, `trade-hospitality/`, `trade-milling/`,
`corpo-vionne/`, `corpo-hollis/`, `distribution/`, and
`saxonberg-lounge/`.

**Headline finding: this slate shipped almost in its entirety.** The
supply chain it designed — delete the magic bottles, a durative
ferment/age transform, fungible consignment, the store as the
consign/buy hinge, a business that can buy, the four-rung spot-market→
firm progression's first rung, and the martini's full farm-to-glass
chain with a competing Crowsfoot/Vionne/Hollis cast — all exists in the
tree today, cross-verified line by line against the slate's own
step-by-step tables (Part 6's producer/brand table, the martini
sequencing table, the build order). What differs from the design is
narrow and named below (Part 2's mechanism shipped simpler than
designed; malt stays an imported faucet rather than a milled-grain
pipeline, a deliberate documented choice in `maturation.md` itself).

---

## docs/slates/tails/supply-chain-slate.md — 549 → 217 lines · Status PARTIAL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `# Part 0 — the magic is four lines, and the fix is a deletion` (full
  body, ~30 lines) — code: `packages/content/saxonberg-lounge/content/
  world/lounge/location/bar.yaml` (no `populates:` bottles; comment:
  *"the rail is stocked by the keeper BUYING against the par sheet"*),
  the `restocks` brain; doc: `employment.md § restocks — the keeper reads
  the par sheet and buys` (line ~402). Heading + pointer left.
- `# Part 1 — the durative transform` (full body minus the slate's own
  already-embedded "✅ OVERTAKEN" callout, ~45 lines) — code:
  `lib/maturation/` (`MaturingMixin`, ex-`FermentingMixin`); doc:
  **maturation.md itself** (already carries growth-accretes/
  maturation-converts, the overshoot-to-vinegar stakes at D3, the cold
  cellar as a PLACE). The magic-items cross-reference ("follow
  husbandry, not metabolism") is independently documented at
  `magic-items.md:343-345`. Heading + pointer left.
- `# Part 3 — the store is the hinge` → the alternating consign/buy
  table and prose, `## The one gap: a business cannot buy`, `## The
  chain is exactly as long as there are playable JOBS` (~60 lines) —
  code: `ConsignController.ts`, `BuyController.ts` (`buysFor`, `wallet
  use house` resolving the active business as buying principal),
  `trade-distilling/` (the middle as one pack); doc: `employment.md §
  wallet use house` (line ~424), `content-packs.md`'s `trade-distilling`
  row (line ~1164). Verified: `BuyController.buyerOf` resolves a live
  Business from the settlement receipt's routing account. Heading +
  pointer left.
- `# Part 6 — the martini, end to end` (full body: the cast table, Lane
  A, Lane B, the bar end, the grade seam, the sequencing table, "what is
  genuinely new all in" — ~110 lines) — code: `corpo-vionne/`,
  `corpo-hollis/`, `trade-distilling/` (`crowsfoot-gin.yaml`, the
  `veshko-yard` + `hollis-*` rows), `trade-winemaking/` (vermouth
  fortification), `trade-hospitality/content/recipes/{martini,
  daiquiri}.yaml`; doc: `corpo.md:78,160-174` (the Crowsfoot/Vionne/
  Hollis rivalry cast, named identically to the slate's Part 6 table),
  `content-packs.md:1164-1174` (`trade-distilling`, `trade-winemaking`
  rows — the vermouth-needs-spirit B2B leg named explicitly),
  `maturation.md § the transfer seam carries the batch's identity`
  (grade carry-across), `crafting.md § the glass pool, the technique,
  ice, garnish` (the rail rule, the glass pool). Heading + pointer left.
- `# Build order` (7-item table) — every item shipped or absorbed into
  the Parts above. Heading + pointer left.
- Open questions 1 (mixin's own subsystem — `lib/maturation/` exists), 2
  (crop count — ten families ship in `trade-farming`, including barley/
  juniper/grapes/limes for this exact chain), 3 (bulk vs sealed bottles
  — resolved as bottles, `GradedReceptacle`, per `maturation.md`), 4
  (per-draw settlement — resolved as leaned: bottles, not per-pour), 5
  (store commission — resolved yes, `BuyController` takes it as taxable
  revenue) — five one-line pointers left; each verified against code
  named above.

### Superseded — cut
- `# Part 2` → `## The change` table, `## ⭐⭐ Refreshed 2026-08-05` (the
  `stackIdentityFields`/consignor argument), `## ⭐⭐ Why this is a
  prerequisite, not a nicety` (the warehouse-receipt/document-of-title
  argument), `### ⚠⚠ CORRECTION to the merge hazard`, `## chattel.md
  already supplies the alternative` (~140 lines) — by the code: the
  slate designed **segregated per-consignor lots** (a `stackIdentityFields`
  consignor tag, or a warehouse-receipt document of title) as the fix.
  What shipped is simpler and needs neither: `consign` splits **one
  unit** off a stack and titles it (`ConsignController.ts`); a lot of
  one cannot merge, so there is nothing to segregate. Documented at
  `chattel.md § a stack cannot bear title; a lot of one can` (lines
  153-171), which even tells the same "a mill could weave cloth it
  could never sell" story this slate anticipated. The warehouse-receipt/
  collateral hope is superseded twice over — the logistics batch's own
  ledger records that the bearer receipt (`BearerReceipt`) was cut
  before merge; the receipt is a record only. One consolidated note left
  citing both docs; the `### ⚠ A gap this surfaces: the offer layer has
  no currency` subsection (still genuinely open) is KEPT verbatim below
  it, unlike the rest of Part 2.

### Kept (UNBUILT)
- `### ⚠ A gap this surfaces: the offer layer has no currency` (Part 2)
  — verified still true: `packages/server/src/mud/lib/commerce/
  PricedOffer.ts`'s `prices` field is `Record<string, number>`, no
  currency. Kept verbatim, with one line appended noting the file
  checked (not a rewrite of the design paragraph itself — the file
  citation is new, the design text is untouched).
- `# Part 4 — the stepping stone: spot market → contracts → the firm`
  (the full table + Coase paragraph) — kept **whole**, mixed status: it
  is genuine doctrine (transaction-cost economics explaining why the
  four-rung ladder exists at all) AND it names two things that remain
  open — rungs 2–4 have no authored example even though every mechanism
  each rung needs already ships (`buy` at any counter, `contract.md`
  clauses, employment + parcel title). A short "Verified 2026-09-20"
  paragraph is appended stating rung 1 shipped and rungs 2-4 are content
  gaps, not design gaps — this is new text (a verification note, in the
  ledger's own voice), not a rewrite of the kept design prose above it.
- `## Freight is the OPTIMIZATION, not the prerequisite` (Part 5's
  closing subsection, the Von Thünen paragraph) — Doctrine, overlapping
  with `freight-slate`'s own Von Thünen doctrine (kept there too by the
  logistics-batch pass — see Uncertain below).
- Open question 6 (*what stops the store being the only market
  forever?*) — doctrine/philosophical, no code resolves it either way.

### Uncertain — kept
- None new. (The Part 4 / Part 5 doctrine overlaps with `freight-slate`
  are the same overlap the logistics batch already flagged in its own
  ledger; not re-litigated here since neither file is in this batch's
  write list.)

### Doctrine — kept, labelled
- `# Part 4` (the Coase/transaction-cost table) — see Kept above (mixed:
  doctrine + two named open items).
- `## Freight is the OPTIMIZATION, not the prerequisite` (Von Thünen) —
  see Kept above.

### Handoff (belongs in a doc outside my list)
Every graduation this slate could have produced was **already present**
in the target doc before this pass touched anything — verified, not
inserted. Listed for completeness; no action needed by another agent
unless a doc is judged to be missing something on inspection:
- → `employment.md` — nothing to add; `§ restocks` and `§ wallet use
  house` already carry Part 0 and Part 3's business-buying decision.
- → `chattel.md` — nothing to add; `§ a stack cannot bear title; a lot
  of one can` already carries Part 2's shipped shape.
- → `corpo.md` — nothing to add; the Crowsfoot/Vionne/Hollis rivalry
  cast (lines 78, 160-174) already carries Part 6's cast table.
- → `content-packs.md` — nothing to add; the `trade-distilling` and
  `trade-winemaking` pack rows (lines 1164-1174) already carry Part 6's
  lane structure and the vermouth B2B dependency.
- → `crafting.md` — nothing to add; `§ the glass pool, the technique,
  ice, garnish` already carries the rail rule and glass-pool mechanics
  Part 6 depended on.
- → `encumbrance.md` — nothing to add; the haulage-has-a-cost claim in
  Part 5 is the shipped `LoadBearing` mechanism, undisputed.
- → `magic-items.md` — nothing to add; lines 343-345 already carry the
  "follow husbandry, not metabolism" cross-reference from Part 1.
- → `logistics.md` — nothing to add from this slate; Part 5's haulage-
  as-a-gig claim is fully covered by the separate logistics-batch
  compaction pass (`docs/plans/slate-compaction/logistics.md`).

### Status block
- Status: PARTIAL → PARTIAL (real design remains, but it shrank from
  "fungible consignment · a business account that can buy · rung 2 ·
  rung 4" to "an offer-currency gap · rungs 2-4 as CONTENT gaps, not
  design gaps · one doctrine question" — the first two Left items were
  shipped, the rungs were reclassified from "unbuilt mechanism" to
  "unauthored content over shipped mechanism")
- Left: *fungible consignment · a business account that can buy · rung
  2, direct farmer→distiller purchase · rung 4, the firm* → *the offer
  layer has no currency (Part 2) · rung 2 — a direct farmer→distiller
  purchase has no authored example (Part 4) · rung 3 — a forward
  contract on a crop has no authored example (Part 4) · rung 4 —
  vertical integration has no authored example (Part 4) · what stops the
  store being the only market forever (Open question 6, doctrine)*.
  Rung 3 is newly named — the original `Left` list omitted it even
  though Part 4's own table always listed it as a stage; the body wins.
- Size: a wave → a tail (almost everything shipped; what remains is
  small and mostly content-authoring, not design)

---

## Batch totals

| | supply-chain-slate |
|---|---|
| lines | 549 → 217 (−332) |
| cut (SHIPPED · DOCUMENTED) | 6 entries (~375 lines) |
| graduated → `maturation.md` | 0 (everything already documented, elsewhere) |
| superseded | 1 entry (~140 lines) |
| kept UNBUILT | 4 sections (1 verbatim-with-citation, 1 whole+doctrine, 1 doctrine, 1 open question) |
| uncertain | 0 |
| doctrine | 2 (Part 4, Part 5's Von Thünen close) |
| handoff | 8 docs, all already carrying the material (no inserts needed) |

`git diff --stat`: `docs/slates/tails/supply-chain-slate.md` −429/+97;
`docs/subsystems/maturation.md` untouched (0 lines changed); this ledger
new. No file outside these two was touched.
