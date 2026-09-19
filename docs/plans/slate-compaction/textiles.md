# Slate-compaction pass — textiles batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `textiles.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `textiles/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/{material,slot,concealment,magic}/**`,
`packages/server/src/mud/platform/thing/equipment/Garment.ts`,
`packages/content/trade-{textiles,dyeing,tailoring,farming}/**`,
`packages/content/species-and-names/**` and the docs each class cites.

Three things a reviewer should know first:

1. **One `Left` item was false on arrival, in cosmetics.** *"the dye-plant
   crop rows"* shipped in `trade-farming` (`thing/plant/{madder,weld,woad,
   flax}.yaml`, `thing/crop/*`, `thing/seed/*`, `idea/material/*`).
   Dropped from `Left`.
2. **The maker's authored garment prose did NOT ship, and a docstring says
   it did.** `trade-tailoring/src/idea/cmd/tailoring/SewController.ts:11-18`
   claims *"the maker's authored `DetailedMixin` prose is routed onto the
   instance through the `recordAuthoring` gate"*; the pack contains no
   `recordAuthoring`, `setDetail` or `details` call (grep, whole `src/`).
   The textiles slate's *"skin economy, done honestly"* is therefore KEPT as
   unbuilt and added to `Left`; the docstring is code, not my remit —
   flagged for the coordinator.
3. **`textiles.md` named the wrong host twice.** `wornStack` /
   `coveringAt` / the impression augmenter live on `AttiredMixin`
   (`lib/slot/Attired.ts:101-215, 305, 529`), not `SlottedMixin` — the
   Attired split (`slot.md`) moved them. Two existing sentences were
   corrected (l.88, l.315); `embodiment.md:45` carries the same stale
   `SlottedMixin` clause and is outside my list → Handoff.

---

## docs/slates/builds/textiles-slate.md — 1337 → 556 · Status PARTIAL → PARTIAL

The chain shipped (MR !236): `Garment` =
`Wearable(Slottable(Crafted(Durable(Constructed(Dyed(Detailed(Thing)))))))`
(`platform/thing/equipment/Garment.ts:66-70`, no `Armor` class — l.8);
`COVERING_FORMS` + `TEXTILE_RESIST_PROFILE` + `ConstructionDomain =
'covering' | 'weapon-delivery'` (`lib/material/Construction.ts:75,132,168`);
`Fabric` rows (`base-library/content/stuff/idea/fabric/{woven,knit,felted}.yaml`,
`trade-textiles/…/idea/fabric/{sackcloth,fine-woven}.yaml`); the covering
stack on `Attired.ts`; `DyedMixin` (`lib/material/Dyed.ts`); fit
(`lib/slot/Wearable.ts:248-268`); species `baseMass` + `stature` on all ten
`species-and-names/…/homo/*.yaml`; `conspicuous`
(`lib/concealment/ConcealmentLevel.ts:11`); `attentionFactor` read by
`lib/magic/Charged.ts`; `'worn'` in `DETAIL_FIELDS`
(`api/mql-subscription.ts:123`); `equip set` (`platform/cmd/inventory/equip.yaml:39,63`);
`measure figure` (`cmd/perception/measure.yaml:275`); eight verbs in three
packs (`trade-textiles/…/cmd/textiles/{scutch,spin,weave}.yaml`,
`trade-dyeing/…/cmd/dyeing/{mordant,dye}.yaml`,
`trade-tailoring/…/cmd/tailoring/{cut,sew,alter}.yaml`); retting +
bleaching as `MaturationProfile` rows (`trade-textiles/…/idea/maturation/`);
the demonstrator brain (`trade-tailoring/src/behavior/tailors.ts`). Not
found: `full`, `tan`, any leatherwork pack, `livery`, a pattern artifact,
`SoilableMixin`, a magic garment, hair dye, any maker-prose routing.

### Cut (SHIPPED · DOCUMENTED)
- `> ## ✅ BUILT — this slate is now the UNBUILT TAIL only` + the reversal table (10–42, 33) — the second status block; *"in review"* is stale (merged) and every reversal row is in `textiles.md` (`full` § What this build deliberately does not ship; `mordant`/`alter`/`measure figure` § The chain, as it ships; cotton § does not ship; the deleted event § The soiling seam; 2 × 4 + woad § Dye, wash and fade (graduated, below); no `CoveringApi` § The covering stack; ten species `race.md § Size`)
- the *"Captured 2026-09-02, design session in `build-1` … Status: decided design, pre-requirements"* paragraph (60–64, 5) — a third status line; history
- `## The gap — audited against the shipped tree, 2026-09-02` + `### The chain is a stub with both ends missing` + `### Two hooks already cut and sitting unused` (85–152, 68) — the defect is closed: `Garment.ts` composes the six mixins, `generic-objects/src/__tests__/clothing-rows.test.ts` gates the rows, `coveringAt` is the one walk; doc: `textiles.md` opening paragraph (the audit verbatim), § The object, § The covering stack (*three logic singletons hand-rolled the same walk*). Heading removed (nothing kept refers to it)
- `## ⭐⭐ Decision 2 — one covering vocabulary, not two` body (197–213, 17) — code: `Construction.ts:29,132` (`'covering'`, `quilted`); doc: `textiles.md § The covering vocabulary — two sources, one ladder`. Heading + pointer left
- `## ⭐⭐ Decision 3 — the covering stack resolves PER BODY PART` + `### The layer order` + `### What the stack resolves` (217–269, 53) — code: `Attired.ts` (`coveringAt`, `insulationAt`, `bodyInsulation`, `windproofing`), `Construction.getLayerDepth`, `WearController`'s `layer-order` refusal; doc: `textiles.md § The covering stack` (form sets the band; capacity 4), § Insulation, `thermal.md § Worn insulation is SURFACE-WEIGHTED PER PART`. Heading + pointer left
- `## ⭐⭐ Decision 4` → *Flax and the dye plants are `trade-farming` rows* bullet (305–309, 5) — code: `trade-farming/content/trade/farming/thing/plant/{flax,madder,weld,woad}.yaml`; doc: `textiles.md § The chain, as it ships` (the diagram's `trade-farming` box)
- `## ⭐⭐ Decision 4` → *A kernel wave comes first* bullet (313–314, 2) — history
- `## ⭐ Decision 5` → `### ⭐ The tool ladder` (387–396, 10) — code: `DyeVat.ts:1-15`, `trade-tailoring/…/thing/{shears,cutting-table}.yaml`; doc: `textiles.md § The tooling: every verb has two rungs`
- `## ⭐⭐ Decision 6 — fit, and the `baseMass` find` + `### ⚠⚠ The find: every species masses 70 kg` + `### The model — measurements derive` + `### ⭐⭐ The lineage seam — build the consumer, not the variance` (402–474, 73) — code: every `homo/*.yaml` authors `baseMass` + `stature` (gnome 30/1.0 … dragonborn 125/2.0); `Species.getStature`; `Wearable.ts:248-268` (`cutToBodyPlan/Stature/Girth`); doc: `race.md § Size — baseMass + stature, and why it is one accessor` (incl. the 70 kg finding and the table), `embodiment.md § Fit — two derived numbers and one stamp`, `textiles.md § Fit` (*the lineage seam is one line*). Heading + pointer left
- `## ⭐⭐ Decision 7` → the corrected-intro paragraph + the room-condition contract table + *the apron gets stronger* (480–501, 22) — the table restates `room-condition-design-pack.md`'s decisions (that slate owns them); textiles' consumption is `outermostAt` (`Attired.ts:614`); doc: `textiles.md § The soiling seam` (act-deposited, freezes, no gauge, the apron seamed). Heading + pointer left
- `### ⚠⚠ Corrected again — "soiled" is TWO concepts wearing one word` → the two-concepts table + the cooking paragraph (505–521, 17) — doc: `textiles.md § Dye, wash and fade` last paragraph (*a different concept sharing a word … a test says so*). Heading + pointer left; the `dressingQuality` paragraph KEPT
- `### ⭐ The wash/fade loop still stands` body (560–569, 10) — code: `DyedMixin.fastness`, `wash`'s launder branch; doc: `textiles.md § Dye, wash and fade` (*each wash strips colour in proportion to 1 − fastness*). Heading + pointer left; the naming/livery paragraph KEPT
- `## ⭐⭐⭐ Decision 8 — a garment's PURPOSE is which channel it intercepts` → intro, the rule, the channel table, the worked examples (580–629, 50) — doc: `textiles.md § ⭐⭐ The governing idea` (apron, lab coat verbatim); hi-vis → `concealment.md § The scale extends DOWNWARD`; camouflage → `textiles.md § does not ship` (*the search slate's*). Heading + pointer left. The three "unused channel" rows are noted under Uncertain
- `## Decision 9 — the social half: legibility, one brain, no kernel gauge` + `### ⚠ Where the line is drawn` (649–694, 46) — code: `Attired.ts:229-312` (impression clauses fold grade/condition/fit/colour/brand), `tailors.ts` (*"There is no kernel gauge from dress to regard, and there must not be"*); doc: `textiles.md § The presentation`, `§ The social and arcane seams` (*engine measures; subject values … a brain, in a pack*). Heading + pointer left; `livery` → `Left`
- `## ⭐⭐ Decision 10 — the concealment seam` + `### What textiles takes` (700–756, 57) — code: `Concealable.getConcealment` + `Attired.concealmentOffset`, `ConcealmentLevel.ts`; doc: `concealment.md § The scale extends DOWNWARD — conspicuous`, `textiles.md § The social and arcane seams`, `§ does not ship` (the viewer half). Heading + pointer left
- `### Magic in the SUPPLY CHAIN leaves no residue — Kell's Partition` (780–808, 29) — doc: `arcane-science.md` (Kell's Partition, the economic corollary), `textiles.md § Magic` (*a magically-fixed colour is a binding, so it fades*); the *mage is capital* line rides the Lens-1 graduation (below). Heading removed
- `### ⭐⭐ The interlock worth building: the hood subsidizes the veil` body (858–868, 11) — code: `Charged.ts` reads `wearer.attentionFactor()`, `Charged.attention.test.ts`; doc: `magic-items.md § The attention term — a mundane hood makes an arcane veil cheaper`, `textiles.md § The social and arcane seams`. Heading + pointer left
- `## ⭐⭐⭐ Decision 12` → `### What the audit actually found` + `### The card ENUMERATES; the prose SUMMARIZES` + `### Decided` + `### Why the UX goes first` (895–977, 83) — code: `'worn'` in `DETAIL_FIELDS`, `impressionAugmenter` (`Attired.ts:305`); doc: `textiles.md § The presentation` (the enumerate/summarize rule verbatim), `card-surface.md § worn vs contents — a PARTITION`. One pointer left under the heading
- `### Lens 1 · Pedagogy` → the spinning-bottleneck paragraphs (1046–1065, 20) — code: `mill-throughput.bench.test.ts`; doc: `textiles.md § Throughput at bed scale` (6× by hand, 2× with the wheel, the jenny). Heading + pointer left
- `### Lens 2 · Creative expression` → the forms-enum hole + the proposed split (1078–1096, 19) — shipped as the split proposed: `COVERING_FORMS` closed, `Fabric` rows open; doc: `textiles.md § The covering vocabulary`, `materials-response.md § The covering domain has TWO sources`. Heading + pointer left; the patterns paragraph KEPT
- `### Lens 3 · Roleplay & immersion` body (1106–1123, 18) — code: `equip.yaml` `set` / `sets` stanzas; doc: `textiles.md § The presentation` (*getting dressed is one command*). Heading + pointer left
- Open questions **2** (`dyeing` its own Discipline — `trade-dyeing/…/idea/Discipline/dyeing.yaml`), **3** (2 × 4 + woad — `two-chemistries.test.ts`; graduated below), **4** (flax only — `textiles.md § does not ship`), **5 + 5b** (`stature` a scalar — `race.md § Size`: *deliberately a SCALAR, not two axes*), **8** (a negative-requirement dial `concealment.level.conspicuous` seeded −2, `obvious` stays 0 — `concealment.md`), **9** (the two-source split — `textiles.md § The covering vocabulary`), **13** (spin 3 h / weave 0.5 h — `textiles.md § Throughput`), **14** (`equip set`) (1187–1200, 1208–1209, 1213–1217, 1235–1240; 33) — each replaced by a one-line *Resolved →* pointer

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## ⭐⭐⭐ Decision 1` → *Grade is staple length* bullet (183–186, inside the 156–193 cut) — code: `trade-textiles/src/thing/TextileStock.ts:10-18` (*that band IS the staple length — there is no separate staple field*), `line.yaml:3`, `spin.yaml:11` → inserted at `textiles.md § The chain, as it ships` after the eight-verbs paragraph (9 lines: no staple field and why; `scutch` trades purity against it; `yarnCount` is `spin`'s one number). The rest of Decision 1 is Superseded (below)
- `## ⭐ Decision 5` → the rule paragraph *A verb exists where a decision exists* + the dressing/retting reasoning (318–329, 12) — code: three `trade-textiles` verbs, zero for `prepare`/`finish` (`retting.yaml`, `bleaching.yaml` are `MaturationProfile` rows); `textiles.md` said *zero verbs* without the rule → inserted at `textiles.md § The chain, as it ships` (8 lines: the rule, break/scutch/hackle fold into `scutch`, the clock steps spend no verb, *a new decision, never a new motion*)
- `### ⚠ On adults-only content — no seam needed` + the lingerie worked example (626–643, 18) — the decision is a negative one the tree confirms (no gating seam; `SAXONBERG_PACKS` is the unit of review — `content-packs.md`) → inserted at `textiles.md § What this build deliberately does not ship` as a new bullet (8 lines: signal-only garments complete the model; depiction not existence; a pack is the seam). Judgment call: classified as a shipped decision rather than doctrine because it is *don't build X* and X was not built
- `### ⭐⭐⭐ Textiles is the trade where magic is LEAST useful — and that is the point` (767–778, 12) + the *what that makes a mage: capital* paragraph of the Kell section (801–808) — code: no spinning spell; `spin` is instrument-conferred; the bench prints the jenny rate; `textiles.md § Magic` had the three-trade shape but not *why magic cannot spin* → inserted at `textiles.md § Magic` after the opening paragraph (13 lines: no grid cell for motor work over hours; magic does not shortcut the bottleneck, capital does; a mage is the same category as the wheel). Heading + pointer left
- `### Lens 1` → *Populate `composition` / `chemistry` on the fibre rows* (1067–1074, 8) + Open question 3's chemistry — code: `linen.yaml:11-16,47-54` (`cellulose` *"is a load-bearing TAG"*, `chemistry: C6H10O5`), `DyeController.ts:140-143,206` (cellulose + no tannin → thin), `MordantController.ts:45`, `Dyestuff` rows `chemistry: mordant | vat`, `two-chemistries.test.ts`; `textiles.md` showed *woad (vat)* in a table and never stated the two chemistries or the fibre axis (`trade-dyeing/README.md` does) → inserted at `textiles.md § Dye, wash and fade` after *Four independent entries per dye* (14 lines: mordant exhausts / vat builds; 2 × 4 + woad; the `cellulose` tag → tannin first; wool takes alum directly). ⚠ The `wool.yaml` row still carries `composition: [] chemistry: null` — wool is unbuilt and rides its `Left` item

### Superseded — cut
- `## ⭐⭐⭐ Decision 1 — the chain walks CONSTRUCTION, not material` (156–193, 38) — by the code: the textile forms are NOT *a third domain in `lib/material/Construction.ts`*; they are `Fabric` template rows under `/stuff/idea/fabric/` (class `/platform/idea/material/Fabric`) beside a closed kernel `COVERING_FORMS` → `textiles.md § The covering vocabulary — two sources, one ladder`. The bullets: felting → the unreachable `felted` row (`§ does not ship`); retting's ruin window → `retting.yaml` + `rotted-flax.yaml` (`§ The chain` diagram *over-ret ▶ ruined*, `maturation.md` l.51); the `wool.yaml` bug → fixed (`appearance: soft springy wool`; `linen.yaml:22` *a material must not assert a CONSTRUCTION*). Heading + pointer left
- `## ⭐ Decision 5` → the verb table + *"Eight verbs, four packs"* (331–344, 14) — by the code: `full` and `tan` do not ship, `mordant` / `alter` / `measure figure` do → `textiles.md § The chain, as it ships`. Folded into the Decision 5 pointer
- `### ✅ dress — resolved with build-3, and nobody spends a verb` (346–385, 40) — by the code: the wardrobe set shipped as `wear set` and moved to `equip set <name>` when `equip` landed → `textiles.md § The presentation`, `slot.md`. Folded into the Decision 5 pointer
- `### ⭐⭐ Ship the SEAM, not the mechanism — cooking's pattern, adopted` body (530–552, 23) — by the code: the *pre-registered producer event* (W5) was deleted — no emitter, no listener, `EventApi` is a bus not a ledger; the seam is the METHOD `outermostAt` → `textiles.md § The soiling seam` (*⚠⚠ And no `soil.*` event either*). Heading + pointer left; the coordination note KEPT
- `## Proposed wave structure` (1157–1176, 20) — by the build's A1–A10 / B1–B5 waves (plan retired at `/finalize`; `docs/plans/` has no textiles plan). Heading + pointer left

### Kept (UNBUILT)
- the status block (re-stamped) · `> ## ⏳ THE UNBUILT TAIL` table (the remaining-work index; every row verified absent from code except *individual body variance*, which is lineage's) · the framing blockquote (owns fibre → cloth → garment; not searching; consumes cosmetics)
- `## ⭐⭐ Decision 4` → the diamond diagram, *parallel input trades*, *Tanning lives inside `trade-leatherwork`* — the leatherwork design; no leatherwork pack, no `tan`, `hide-stock.yaml` still a `generic-objects` prop nothing produces
- `### ⚠⚠ Corrected again` → *`DressingMixin.dressingQuality` … should land on `Soilable` when that ships* — `Dressing.ts:37` still carries `dressingQuality`; no `SoilableMixin` in the tree (only a test name mentions it). Added to `Left`; overlaps `room-condition-design-pack`
- `### ⭐⭐ Ship the SEAM` → the *Coordination note* (two builds wait on room-condition) — still true
- `### ⭐ The wash/fade loop` → *⚠ Naming. "Outfit" is taken … A uniform concept must be called livery* — `farm-outfit.yaml` is still a `Business`; no `livery` anywhere (grep hits are `delivery`). `livery` → `Left`
- `### ⭐ The honest "yes" is PROVENANCE, not physics` — no mage-woven mark exists; kept under the magic-garments item
- `### ⚠ The one genuine tension — dyeing is chemistry` — OQ16 open
- `### Casting garments — the machinery is complete; garments are an unused host` — every shipped wearable magic item is still jewelry (`arcane-library/…/ring-of-veil`); OQ19 open
- `### ⭐⭐ The skin economy, done honestly` — see the batch finding: `SewController.ts` claims the routing and does not perform it. Added to `Left`; OQ17 open
- `### Lens 2` → *Patterns are silent, and shouldn't be* — `SewController.ts:24` `PATTERNS` is a four-entry map (*⚠ A pattern is a RECIPE*); nothing player-designable. OQ10 open
- `## Open questions` 1, 6, 7, 10, 11, 12, 15, 16, 17, 18, 19 — verbatim
- `## Cross-references` — verbatim (every linked slate exists; no link points at a cut section)

### Doctrine — kept, labelled
- `### Which grid cells the trade actually touches` — the 5 × 13 footprint table; *`create·arcana` is magic-items' business* (Decision 11)
- `### ⚠ The market: Fortnite's model is a MINT, and cannot be imported` (Decision 12) — the conserved-economy thesis and *a garment here can mean more than a skin*
- `### ⚠⚠ Re-sort the build around the BUYER` (Decision 12) — *overwhelmingly buy, not make*; *dyeing is the customization market's core loop*. `DyeVat.ts:9-15` carries the *domestic trade* half of this (evenness is what the dyehouse sells; you recolour at home) — the doc does not; a candidate for `textiles.md § The three businesses`
- `## The four-lens pass (2026-09-02)` intro — the framing for the kept lens sections
- `### Lens 4 · Gamification & self-improvement — the thinnest lens` — the player-knowledge loop (*you learn it by being cold*) and the solvability defence as a design constraint (*a parka merely worse in heat collapses the question*). Feeds OQ15

### Uncertain — kept
- Open question **1** *Which locality gets which trade?* — three-quarters answered: mill + dyehouse at Wharfside, tailor off Mayfield Row, dye plants at Hinkley (`textiles.md § Siting`); the **tannery's** siting is genuinely open and is the tail table's last row. One list item, kept whole
- Open question **18** (impression-line variety) — the augmenter shipped with phrasing *seeded rather than drawn* (`Attired.ts:229`); whether the variety suffices is a tuning question no test answers. Kept
- Decision 8's channel table named three channels *shipped and unused by anything wearable* — light into the eyes (goggles), sound (ear protection), air quality (respirator / veil over `breathableMedia`). Still true (no wearable reads `SenseChannel` or `breathableMedia`). Cut with the table because the slate never claimed them as its work; flagging so they are not lost as latent content
- Overlaps for the cluster pass: `dressingQuality` → `Soilable` and OQ11/12 ↔ `room-condition-design-pack`; hide's faucet (OQ7) ↔ `ranching-slate` (`ranching.md` l.280 *the hide is a stated seam*); hair dye ↔ `cosmetics-slate` (below); the tannery ↔ `zoning-slate`; the viewer-side equipment term ↔ `search-slate`

### Handoff (belongs in a doc outside my list)
- → `embodiment.md § The covering stack — one walk, on the wearer` (l.45): the sentence *"`SlottedMixin` answers about its own slots:"* is false since the Attired split — `wornStack`/`coveringAt`/`insulationAt`/`outermostAt`/`windproofing`/`concealmentOffset`/`attentionFactor`/`wouldLayerViolate` are declared on `AttiredMixin` (`lib/slot/Attired.ts:101-215`); l.125 of the same doc already says `Attired.insulationAt`. Same one-word fix I made in `textiles.md`
- → coordinator, code not docs: `trade-tailoring/src/idea/cmd/tailoring/SewController.ts:11-18` docstring *"The maker's prose … is routed onto the instance through the `recordAuthoring` gate"* describes a routing the controller never performs (no `recordAuthoring`/`setDetail`/`details` in the pack's `src/`). Either the docstring goes or the feature ships; the slate now carries the feature under `Left`

### Status block
- Status line: *"the chain shipped 2026-09-03"* → *"the chain shipped 2026-09-03 (MR !236)"*
- Left: *leatherwork + tanning (blocked on a hide faucet) · wool and its left edge — felting, fulling, knitting (blocked on ranching) · patterned weaving · piece bleaching · magic garments · hair dye* → *leatherwork + tanning (blocked on a hide faucet) · wool and its left edge — felting, fulling, knitting, scouring (blocked on ranching) · cotton and silk · synthetics, mills, mass production · patterned weaving · piece bleaching · player-designable patterns as artifacts · livery · the maker's authored garment prose (the customization product) · magic garments (a garment as an item host; mage-woven as a mark) · hair dye (cosmetics-slate) · individual body variance (lineage phase 2) · the tannery's nuisance siting · `DressingMixin.dressingQuality` onto `Soilable` (room-condition)* — the body wins: the tail table's rows were unrepresented, and two unbuilt designs (livery, maker prose) were in the body with no `Left` entry
- Size: a build → a build (wool's left edge and leatherwork are each a pack with a kernel seam)

---

## docs/slates/builds/cosmetics-slate.md — 316 → 270 · Status PARTIAL → PARTIAL

The slate's load-bearing finding (*dye is a textiles input; cosmetics is
a second customer*) is what the textiles build acted on, and it is KEPT
verbatim as the premise. Verified: the dyeing pack dyes **cloth only**
(`dye.yaml` `requires: DyedMixin`; `Garment`, `CutPieces`, `TextileStock`
compose it — nothing on a body does); `personal-services` is a shipped
Discipline (`…/idea/Discipline/personal-services.yaml`, ISCED-F 101) with
**no** verb, no barber, no haircut, no tattoo anywhere in `packages/`;
there is no appearance substrate on a `Creature` (no `Looks`, hair or eye
field — lineage phase 1 has not shipped it). So the carrier, the
vocation, hair dye and tattoos are all UNBUILT; the dye chain beneath
them shipped.

### Cut (SHIPPED · DOCUMENTED)
- `> **Status: design conversation, captured. Not requirements.**` (29, 1 + blank) — the second status line; history
- `# The chain` → the step table + *"Every gap here is a Discipline the roster already demanded"* + `## Substrate it rides, all shipped` (91–116, 26) — grow: `trade-farming/…/thing/plant/{madder,weld,woad}.yaml` (the *"crop roster is one row (carrot)"* clause is long stale); extract + mordant: `dyeing.yaml` Discipline, `mordant.yaml` / `dye.yaml`, `Dyestuff` rows; apply to cloth: `DyeController`; the bath as a bulk liquid: `DyeVat extends Vat` (`trade-dyeing/src/thing/DyeVat.ts:26`); selling: the dyehouse is a walk-in service (`textiles.md § The three businesses`). Doc: `textiles.md § The chain, as it ships`, `§ The tooling`. Heading + the `grow → extract → mordant → apply` diagram kept; one pointer left naming the unshipped **apply to hair / skin** step
- `# ⭐⭐⭐ The mordant — why this is a trade and not a vending machine` body (122–144, 23) — code: `madder.yaml` shades (alum *a clear red* · iron *a dark maroon* · tannin *a soft brick* · none *will not hold*), `Colour.ts`; doc: `textiles.md § Dye, wash and fade` (*authors author dyes rather than colours*; *four independent entries per dye … the metal ion is part of the chromophore*; the scarcity-is-structural point is the fastness/craft paragraph). Heading + pointer left
- Open question **1** (`apothecary` vs its own — resolved *own*: `dyeing.yaml` exists, no `apothecary` Discipline in the catalogue; the slate's lean was wrong), **2** (how many — 2 × 4 + woad, `two-chemistries.test.ts`), **3** (does fibre participate — yes, the `cellulose` tag → tannin; `DyeController.ts:140-143`), **4** (does colour fade — yes, per wash × `1 − fastness`, `textiles.md § Dye, wash and fade`), **9** (where the first content lands — Wharfside + Hinkley + Mayfield Row, `textiles.md § Siting`) (275–291, 312–316; 22) — each replaced by a one-line *Resolved →* pointer. Q3's *make hair a fibre* and Q4's *does `Looks` drift back* are hair-side residues and are named in the pointers rather than lost

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none of its own — the two-chemistries / fibre-axis paragraph graduated from the textiles slate (above) is the doc statement Q2 and Q3 now point at

### Superseded — cut
- Open question **1**'s lean (*`apothecary` with a `specializes` link*) — by the code: `dyeing` is its own Discipline. Named in Q1's pointer

### Kept (UNBUILT)
- the status block (re-stamped) · the *Captured 2026-08-25* framing + both user quotes · *Related* (every link still resolves; `bulk.md` / `husbandry.md` / `smallholding.md` stay because the carrier's hair dye still rides them)
- `# ⭐ The problem this exists to solve` — spine
- `# ⭐⭐⭐ The act is GRADED and MARKED — and the grading already ships` + `## What is actually new: the carrier, not the grade` + `## ⭐ What grading gives the vocations test` — the carrier design. `Grade` / `CraftedMixin` / `renderVerdict()` ship (`lib/craft/Crafted.ts:100,160`, `crafting.md` l.58, l.137-139) but nothing carries a `{grade, maker}` on an appearance field. The shipped-substrate table (117–121) stays because the *"So it is observable … who did it"* argument reads off it (paragraph rule)
- `# What is changeable, and what is not` — proposal, no code; added to `Left`
- `# ⚠ What this slate does NOT decide` — spine
- `# Open questions` 5, 6, 7, 8 — verbatim

### Doctrine — kept, labelled
- `# ⭐⭐⭐ The load-bearing find: dye is not a cosmetics input` — the premise; now a shipped fact for cloth and the standing rule for hair and leather. Candidate home: `textiles.md § The chain, as it ships` (*dyeing is a customer of textiles first*) or `vocations.md`'s `barber / tailor` row
- `## ⭐⭐⭐ Why this does not collide with *never selectable*` — *the rule protects what you did not CHOOSE, not what you PRESENT*; keep-it-descriptive. Candidate home: `identity.md` or `lineage-slate`'s *describable, never selectable* section

### Uncertain — kept
- `# ⭐⭐⭐ The load-bearing find` says *"Leather is dyed"* and *"One chain, four demands"* — leather has no faucet and no dye path yet (`textiles.md § does not ship`); the count is aspirational, not false. Kept inside the paragraph
- `## ⭐ What grading gives the vocations test` names `homemaker` as *killed* by universal self-service — I did not verify that ruling (`vocations.md` is outside my grep); kept as written
- Overlaps for the cluster pass: hair dye ↔ `textiles-slate` `Left`; the `Looks` cell / eye colour ↔ `lineage-slate`; the `barber` promotion ↔ `vocations.md`'s demand test + `trade-roster-slate`

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Status line: *"the dye chain (dyestuff × mordant, fastness, overdyeing as arithmetic) shipped with textiles"* → adds *× fibre* and *the dye-plant crops*, and *"cosmetics is now the second customer it was designed to be"*
- Left: *the appearance-mark carrier on a body (the `Looks` cell) · the personal-services vocation + graded cuts · tattoos · the dye-plant crop rows* → *the appearance-mark carrier on a body (the `Looks` cell — a cut, a dye job and a tattoo share it) · the personal-services vocation + graded cuts · hair dye as the dye chain's second customer · tattoos · what is changeable and what is not (eye colour never)* — the crop rows shipped (`trade-farming`); hair dye and the changeable table were in the body and unrepresented
- Size: a build → a wave (the chain that made it a build has shipped; what remains is a carrier, a vocation and its verbs, and it is blocked on lineage phase 1's appearance substrate rather than on its own supply chain)

---

## Batch totals

| | before | after | cut |
|---|---|---|---|
| `textiles-slate.md` | 1337 | 556 | 781 |
| `cosmetics-slate.md` | 316 | 270 | 46 |
| `textiles.md` (doc) | 595 | 648 | +53 |

Sections: 22 cut as SHIPPED·DOCUMENTED · 5 graduated (one shared by both
slates) · 6 superseded · 16 kept UNBUILT · 7 doctrine · 6 uncertain ·
2 handoffs (one doc sentence, one code docstring). Two existing
`textiles.md` sentences corrected (`SlottedMixin` → `AttiredMixin`, l.88 and
l.315) because `lib/slot/Attired.ts` proves them false.
