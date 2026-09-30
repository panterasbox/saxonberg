# Slate-compaction pass — bulk batch ledger

Two slates. Branch `design/slate-compaction`. Procedure:
`.claude/skills/compact-slate/SKILL.md`. Write list: `bulk.md` only.
Line numbers below are the ORIGINAL file's. Originals saved under the
scratch dir `bulk/orig/` for diffing. Code was verified in
`packages/server/src/mud/lib/bulk/**`, `api/bulk.ts`,
`platform/idea/api/BulkableLogic.ts`, `platform/thing/**`,
`platform/idea/cmd/bulk/**`, `lib/metabolism/Metabolic.ts`,
`packages/content/trade-bottling/**`, `packages/content/arcana/src/**`
and the `docs/subsystems/` that own each seam.

Four things a reviewer should know first:

1. **Two `Left` items were false on arrival.** bulkable-slate named
   *"`Container`+`Bulkable`"* — it shipped as `CraftVessel`
   (`Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`, the garnish
   a `Containable` in `contents`, the drink the interior slot, ice a bulk
   credit on the same slot) plus `Feeder`, `PlantPot`, `GardenBed`; and
   bulk.md's own *Deferred tails* still said *"documented, not built"*.
   aluminium-can named *"a `category` home a `Crate` can reach"* — the
   home exists (`lib/bulk/VesselKind.ts`, bulk.md § ✅ RESOLVED); what
   remains is that `Crate` (`CirculatingMixin(StagedMixin(ContainerMixin(…)))`,
   `platform/thing/Crate.ts:20`) still does not compose it. Re-worded.
2. **Three statements in bulk.md were proven false by the code and
   fixed by minimal insert** (each logged under the slate that surfaced
   it): the `ingest` seam is no longer a no-op (`MetabolicMixin.ingest`,
   `lib/metabolism/Metabolic.ts:1236`, composed on `Creature.ts:161`;
   metabolism.md l.66 says so); `Container`+`Bulkable` is built (above);
   the `bulk/` verb category has nine verbs, not five (`eat` / `feed` /
   `water` / `vomit` joined — `platform/idea/cmd/bulk/`).
3. **One dangling cross-reference healed.** magic-items.md § *Potions
   ride the MATERIAL* points at *"bulk.md § `getContentsDescriptionFor`"*,
   which did not exist; the slate's *Naming & presentation* decision
   (the short is authored, never composed; the long gets one per-viewer
   contents sentence) is SHIPPED · UNDOCUMENTED and now lives there.
4. **The aluminium-can slate is a stress test, mostly doctrine.** Only
   § 4 (the rows) and § 6's ✅ paragraphs were cuttable; § 1's ledger
   table is kept whole (one paragraph, rows mixed) with its stale rows
   named under *Uncertain*, and § 7 is kept and labelled *Doctrine* with
   a suggested home for the coordinator.

---

## docs/slates/tails/bulkable-slate.md — 900 → 409 · Status PARTIAL → PARTIAL

The thermos slice shipped as designed and bulk.md is a faithful operational
reference for it; what the slate still carried was (a) the shipped design
restated, (b) three tails that have since shipped in OTHER builds
(`Container`+`Bulkable`, the contents augmenter, the `ingest` seam) and
(c) the genuinely open tails. Grep: `lib/bulk/{Bulkable,UnboundedSource,
VesselKind,Utensil}.ts`, `api/bulk.ts`, `platform/idea/api/BulkableLogic.ts`
(`requiredClosureFor` :88 still returns `liquidTight` for everything —
granular is unbuilt), nine controllers under `platform/idea/cmd/bulk/`
(no `scoop`, no engagement), `surfaceBulk: true` on six rows — all
floors.

### Cut (SHIPPED · DOCUMENTED)
- second status blockquote *"Shipped (thermos slice)"* (11–17, 7) — history; the canonical block is kept and re-stamped
- the *Reframe (2026-06-11)* blockquote (24–34, 11) — doc: bulk.md intro (*bulk is not a Stuff … attribute of its holder*). One-line note left
- `## Principle` body incl. `### The discrete / continuous split` (61–102, 42) — code: `lib/bulk/Bulkable.ts`; doc: bulk.md intro (the holder attribute, the glob/bulk split). The ice-cube illustration shipped as `CraftVessel` (graduated, below). Heading + pointer left
- `### The slot is per-affordance, not per-Stuff` body (128–159, 32) — code: `Bulkable.ts` (`interiorBulk`/`surfaceBulk` flags :425–510, `getBulk(affordance?)` :607), `BulkableApi.slotFor`; doc: bulk.md § The model (the two-slot table, *independent of the spatial mixins*), § `BulkSlot`. Two clauses shipped in a different shape and the pointer says so: a both-host declares its slots by authored flag, not automatically; the affordance rides `via.bulk`, not the on/in preposition
- `## Source and sink` → the Sink bullet + the floor-fallout paragraph (232–241, 10) — code: `BulkableLogic.transfer` (`to: null` discards), `floorSurfaceNear`; doc: bulk.md § `BulkableApi.transfer`, § The Floor. Note left; the Source bullet is KEPT (regenerating sub-bullet)
- `## The transfer primitive` body (247–283, 37) — code: `api/bulk.ts`, `BulkableLogic.ts` (the five-step pipeline); doc: bulk.md § `BulkableApi.transfer` (over `BulkSlot`, not `Stuff & Bulkable`; the same glob note kinds). Heading + pointer left; the verb table's unshipped rows (`scoop`, `draw from well`) are carried by the kept *Verb roster* and *Source and sink*
- `## Capacity` → the *Unbounded holders … `remaining() === ∞`* paragraph (318–319, 2) — doc: bulk.md § `BulkSlot` (`remaining()` ∞ when uncapped)
- `## Surfacing vs containment` body (365–397, 33) — code: `platform/thing/Floor.ts`; doc: bulk.md § The Floor (an `Adornment` fixture, NOT `Surfaced`; containment flat; the puddle an attribute). Heading + pointer left; the *Adjacent future work* blockquote (the inversion) is KEPT
- `## Material gains identity` → paras 1–2, the numbered list, scoping bullets 1–2 (413–443, 31) — code: `lib/material/Material.ts` (`PerceptibleMixin` + `appearance`); doc: bulk.md § Material identity (*never leak into room scope*). Heading + pointer left; the amount-aware bullet is KEPT
- `### The potion, worked` (488–505, 18) — code: `packages/content/arcana/src/thing/Potion.ts`, `PotableMixin`, `Bulkable.getContentsDescriptionFor` → `describeFor`; doc: magic-items.md § Potions ride the MATERIAL (identification past the glass; decant still a potion; dose from the measure). Heading + pointer left
- `### The payoff` (524–535, 12) — prose over the shipped potion; magic-items.md
- `## MQL resolution & dispatch` body incl. `### What reaches the controller`, `### The two surface syntaxes`, `### Grammar lift — :{N unit}` (606–675, 70) — code: `api/mql/scope-walk.ts:313–330` (`pushBulkMaterials`), `api/mql/{lexer,parser,desugar,types}.ts`, `api/quantity.ts` (`resolveUnitToken`/`isUnitToken`); doc: bulk.md § MQL surface (every bullet). Heading + pointer left
- `## Verb roster` → the *Thermal note* (692–696, 5) — code: `CraftVessel` / `GradedReceptacle` compose `ThermalMixin`, a paper-cup `Receptacle` does not; doc: thermal.md, bulk.md § `Sack` (*`GradedReceptacle` gained `ThermalMixin`*)
- `## What carries over from stack (substrate reuse)` (764–777, 14, heading too) — doc: bulk.md § `BulkableApi.transfer` (*no new note kinds*), § MQL surface (the `measure` variant)
- `## Resolved decisions (settled this cycle)` body (783–816, 34) — every bullet is a statement in bulk.md; the pointer left names the three that shipped in a different shape (capacity interim ON the slot; flags not prepositions; `liquidTight` a rung not a boolean)
- `## Open questions` → Q2 *`liquidTight` defaults + drain cascade* (825–827, 3) — resolved: default `liquidTight` (bulk.md § Closure scale), one-level drain-through (§ transfer step 3); Q3 *`desk:b` on a both-host* (828–830, 3) — resolved: `:b` stamps `affordance: 'interior'` (§ MQL surface), bare `getBulk()` throws on a both-host (§ `BulkSlot`). Each replaced by a one-line *Resolved:* entry
- `## v1 acceptance roster (for shape)` (854–881, 28) — history; the shape shipped
- two stray lines `</content>` / `</invoke>` (899–900, 2) — tool-output junk committed into the file; not slate content

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- `## Composition with Container / Surfaced — orthogonal slots` paras 1–4 (325–346, 22) — code: `platform/thing/CraftVessel.ts:11–23` (`Crafted(Thermal(Bulkable(Container(Detailed(Thing)))))`, *the "ice cube floating in water" choice … made here*), `Feeder.ts`, `PlantPot.ts`, `GardenBed.ts` → inserted at bulk.md as a new `### Container + Bulkable — orthogonal slots` under § The model, after § Closure scale (17 lines: the independence, the shipped composers, no constraint to police, ice as bulk not the discrete half, where the melt hook actually landed). **One existing bulk.md sentence changed** because the code proves it false: the deferred-tail bullet *"`Container` + `Bulkable` (ice cube in water) — documented, not built; the demo vessels are fluid-only"* → *"— shipped as `CraftVessel` (§ above); the demo vessels stay fluid-only"*. Heading + pointer left
- `## Naming & presentation` → the *Forward-looking* blockquote, the worry, *No — because mechanism and presentation are separate layers* (453–466, 14) — code: `Bulkable.ts:649–680` `getContentsDescriptionFor(viewer, affordance?)`, `:782–822` `bulkContentsAugmenter` (*"It holds …"*, *"A puddle of …"*, *"The <kind> is empty."*); product rows author their own short (`trade-bottling/…/can-of-cola.yaml`) → inserted at bulk.md as a new `### getContentsDescriptionFor — the contents augmenter` under § Material identity (22 lines: short authored never composed, the long's per-slot sentence, per-viewer via `describeFor`, payload-appearance-then-material, the `lib/craft` import boundary, amount-aware not built). This also heals magic-items.md § Potions ride the MATERIAL, which already pointed at *"bulk.md § `getContentsDescriptionFor`"*. Heading + pointer left
- `## The ingestion seam — designed for, not built` (702–735, 34) — code: `lib/metabolism/Metabolic.ts:1236` `ingest(material, amount, phase, payload)` (reconcile, cap by sub-volume, return accepted litres, `routeIntake`), composed on `Creature.ts:161`; `EatController` → `ingestSolid`; `Creature.ts:402` comment *the `ingest` seam now lives on `MetabolicMixin`*. metabolism.md l.66 documents it, but bulk.md § The ingest seam still said *v1 is a deliberate no-op* and the deferred tail said *stays a no-op until Dave's bar* → inserted a ⭐ *Plugged in since the metabolism build* paragraph at bulk.md § The ingest seam (11 lines) and **changed the deferred-tail bullet** to *"shipped: `MetabolicMixin.ingest`"*. The slate's three properties (payload rich enough; consequence on the actor not a registry; one seam for drink and eat) all held. Heading + pointer left
- `## Verb roster` → the `eat` line's decision (the list itself is KEPT because `scoop` is in it) — code: `platform/idea/cmd/bulk/{Eat,Feed,Water,Vomit}Controller.ts` + their views, none in bulk.md's five-verb table → inserted a paragraph at bulk.md § Verbs after the table (12 lines: the four later verbs with their doc homes, `scoop` not built, none durative)

### Superseded — cut
- `## Universal reception` → *Containers — universal reception, retention gated by tightness* + its bullets + *So "not all vessels…"* (179–195, 17) — by the code: a `liquidTight` boolean with a v2 drain cascade shipped as the ordered closure scale `open < liquidTight < sealed` with a one-level drain-through → bulk.md § Closure scale, § transfer step 3. Note left
- `### Phase-transition hook (future, Thermal)` (350–359, 10) — by the code: ice in a glass is `ice` BULK (moved from an ice bin) with a melt plateau crediting the same slot (`CraftVessel.setIce` :211, `iceMeltK`; crafting.md § The glass pool); the *Thing destructs into bulk* shape shipped for cast Things — `Meltable` → molten floor pool, liquid → cast Thing (thermal.md l.350–355, fire.md). Heading + note left
- `### Three naming registers` (470–484, 15) — by the code: register 2's gestalt/unidentified flip is `describeFor` over an `Identifiable` material (magic-items.md); registers 1 and 3 are authored shorts, never composed. Note left; the *half-empty mug* quantity rendering is the amount-aware `appearance` tail, still open in the same slate
- inside the per-affordance cut (above): *carries both slots automatically — no declaration* and *selected by the on/in preposition* → authored `interiorBulk`/`surfaceBulk` flags and `via.bulk.affordance`

### Kept (UNBUILT)
- the status block (re-stamped) · the *Working slate for bulk* framing · *See also* · `## Cross-references`
- `## Bulkable — cohesive machinery, pulled in per affordance` paras 1–2 — the universal-reach lean (not built: `Container.ts` / `Surfaced.ts` do not reference `Bulkable`) and the slot definition (see Uncertain for the natural-measure clause)
- `## Universal reception` → intro, *Surfaces — universal, no opt-out* (only floors carry `surfaceBulk: true`: `default-floor`, `forge-floor`, `weeping-floor`, `heath-floor`, `flooded-floor`, `brine-floor` — no desk, no counter), *Atmosphere — the third flavor*, `### Wiring — auto-compose vs require-companion`
- `## Source and sink` → intro + the Source bullet with the *Regenerating* sub-bullet (`lib/bulk/UnboundedSource.ts:20`: *"This is NOT a regenerating well"*; bulk.md § The model: *deferred*)
- `## Capacity — a holder property, not a bulk property` paras 1–4 (the collision unification + volume/density + the shared discrete/bulk budget — see Uncertain)
- `## Surfacing vs containment` → the *Adjacent future work* blockquote (the containment inversion; bulk.md § Deferred tails)
- `## Material gains identity` → the *Open: amount-aware* bullet (`bulkContentsAugmenter` has no quantity band)
- `### Variations, each surfacing a wrinkle` (mixed list, kept whole): thrown/shattered vial SHIPPED (ranged.md l.327–335, *a potion only acts if its `route` is `contact`*, the blistering draught) and wine/ale SHIPPED (libations); poison `coat`/`apply` (no verb — the `coat` hits are clothing), lamp oil (no `interiorBulk` lamp row), crafted potion (no arcana brewing recipe) are not
- `## Material fidelity` + `### Influences` — Doctrine (below)
- `## Verb roster` list (`scoop` unbuilt; `eat` shipped as a discrete-item verb) + the *durative* paragraph (see Uncertain)
- `## Authoring guidance — discrete Thing vs bulk` paras 1–2 (Doctrine) + para 3 (see Uncertain)
- `## Open questions` Q1 (wiring), Q4 (capacity↔collision), Q5 (atmosphere), Q6 (amount-aware), Q7 (mixing — see Uncertain), Q8 (displacement), Q9 (gas pressure), Q10 (concurrent activities)

### Doctrine — kept, labelled
- `## Material fidelity — demand-driven, not aspirational` + `### Influences (the design DNA)` (539–600) — the *model at the granularity its interactions read* rule, the three-layer stack (substrate · the game's legible rule layer · the education dial), the MUD/NetHack/Larian lineage. bulk.md § Material identity carries only the parenthesis *"fidelity is demand-driven"*. Suggested home: a *Why* on bulk.md, or `docs/design-philosophy.md`
- `## Authoring guidance — discrete Thing vs bulk` paras 1–2 (739–749) — content-author guidance (the linguistic tell *three Xs* vs *some X*). Suggested home: bulk.md, next to the model

### Uncertain — kept
- `## Bulkable` → the slot's `amount` *is the material's natural measure … not always volume* — the code stores litres only (`BULK_VOLUME_UNIT`, `assertVolume`, bulk.md *canonical storage unit is L*) and bulk.md § `Sack` says a sack of flour is *nominal litres*. Kept because it is the granular/gas tail's design; it contradicts the shipped canonical unit and requirements must reconcile it
- `## Capacity` paras 1–3 — say capacity lives on the spatial affordance and *`Bulkable` never stores capacity*; the code stores `interiorCapacity`/`surfaceCapacity` ON the mixin and `Bulkable.ts:34` calls that *interim … folds into collision's volume-kind capacity*. Kept as the unification target (Q4, bulk.md deferred tail); contradicts the interim. Two-slates overlap with `tails/collision-slate.md`
- *Atmosphere — the third flavor* — the mine damps shipped as named atmosphere TABLES (`_atmosphere` on `AtmosphericMixin`, `BiomeLogic` `blackdamp`/`stinkdamp` — mining.md l.295, respiration), not a concentration reservoir; kept, the adjacent shipped shape noted so the reservoir design is judged against it
- `## Verb roster` → *Most are durative* — none of the nine shipped bulk controllers uses an engagement (grep `Engage|SchedulerApi` under `cmd/bulk/`: none). Kept; contradicted by the code; requirements decide whether durative bulk verbs are still wanted
- `## Authoring guidance` para 3 — the discrete↔bulk crossing machinery shipped (thermal.md: `Meltable` melts to a floor pool, liquid solidifies to a cast Thing); `cut` exists as tailoring's verb, `mill` as milling's (`ComminutingMixin`); `grate`/`grind`/`freeze` do not. Kept whole
- Q7 *Mixing / solutions* — blends shipped THROUGH CRAFT: `BulkPayload.composition` + `mix`/`muddle`/`strain` in trade-hospitality (bulk.md § `BulkPayload`, § Composition flows THROUGH a blend), while `transfer` still rejects `material-mismatch` (`BulkableLogic.ts:244`). Kept; the open question is now narrower — pouring two materials together outside a recipe
- Overlaps for the cluster pass: capacity/displacement ↔ `collision-slate`; the regenerating source ↔ watershed's `Conduit`/`SupplyState` (not examined in depth); temperature ↔ `thermal-slate`; the inversion ↔ its own future slate

### Handoff
- none — every graduation landed in bulk.md

### Status block
- Status line: added *"then the libations, arcana and metabolism builds took `Container`+`Bulkable` (`CraftVessel`), the per-viewer contents augmenter and a real `ingest` seam"*
- Left: *mixing/solutions · the `sealed` gas level + the phase→closure map · `Container`+`Bulkable` · universal auto-compose · amount-aware `appearance` · the containment inversion* → *mixing/solutions · the `sealed` gas level + the phase→closure map (granular → `open`) · universal reception on surfaces + the auto-compose wiring · regenerating sources · capacity↔collision unification (volume+density, displacement) · atmosphere-as-reservoir · amount-aware `appearance` · `scoop` + durative bulk verbs · the poison `coat` / lamp-oil / potion-craft content · the containment inversion* (`Container`+`Bulkable` dropped — shipped; five items added because the body carried them unrepresented)
- Size: a wave → a wave

---

## docs/slates/tails/aluminium-can-slate.md — 391 → 344 · Status PARTIAL → PARTIAL

A stress test, not a build list — the brief's *"largely doctrine; keep
and label"* held. Grep for every Left item: `requiredClosureFor` returns
`liquidTight` for all (`BulkableLogic.ts:88–92`); no `deposit`/`bottle-bill`
under `lib/contract` or civics; trade-bottling's only recipe is
`recipes/soft-drink.yaml` (a serving, not a canning `fill`); `remelt`
appears only in a comment on `aluminium.yaml`; `Recipe.ts` has
`requiresHeatK` + `holdS` and no energy field; `carbonated` is read only
as a prose tag (`CraftVessel.ts:306`, `BlendLabel.ts:124`) and never
expires; `cola.yaml` has `nutrients: [water, sugar]` and no caffeine;
`Crate.ts:20` composes no `VesselKindMixin` (only `Sack`, `CraftVessel`,
`Vat`, `Bottle` do); logistics.md has cart/wagon/barge and no pallet;
`wiki-starter` has no can article; no bauxite/alumina/forming anywhere.
So the backlog is real and the cuts are the two shipped stretches.

### Cut (SHIPPED · DOCUMENTED)
- `## 4. The ideal can, as rows` body (132–156, 25) — code: `packages/content/trade-bottling/content/trade/bottling/thing/can.yaml` (`category: can`, `closure: sealed`, `open: true`, `interiorCapacity: 0.33`, `_materialPath: …/element/aluminium`) + `can-of-cola.yaml` (`open: false`, `interiorMaterial`/`interiorAmount`, `censusKey: mixer:cola-can`); doc: bulk.md § `category` (*the empty vessel row `/trade/bottling/thing/can` and the product row … the shared `category` string IS the relationship*). Heading + pointer left; the pointer names the two authoring differences (`_materialPath`; the empty authors no `censusKey`, the census derives `vessel:<category>`)
- `## 6.` → the *✅ DONE in the libations MR* paragraph (172–182, 11) — code: the eight vessel rows, `Bottle.getCensusKey()` state-derive, `base-library/…/element/aluminium.yaml`, the bottling README; doc: bulk.md § `category` (census bullet), residency.md (the census). Replaced by one pointer line
- `## 6.` → the *✅ `jute` added to the fibre vocabulary* paragraph (197–198, 2) — code: `base-library/content/stuff/idea/material/textile/jute.yaml`, named by `trade-cooking`'s `salt-sack`/`coffee-sack` rows; a content row is its own record, but textiles.md never names the fibre → Handoff (one line)

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- none — bulk.md § `category` already carries the empty↔product decision and its why (*template inheritance does not exist*), the three readers, and the move to `VesselKindMixin`

### Superseded — cut
- `## 6.` → the *✅ The empty↔product relationship is now expressed (`category`, lifted from `CraftVessel` onto `BulkableMixin`)* paragraph (184–195, 12) — by the bulk decomposition: the kind moved OFF `BulkableMixin` (it had handed a par key to every puddle, bed, pot and air tank) onto `VesselKindMixin` (`lib/bulk/VesselKind.ts`) → bulk.md § `category` ⚠. Folded into the § 6 pointer line

### Kept (UNBUILT)
- the status block (re-stamped) · the italic framing paragraph
- `## 1. The ledger — what each system says about the can` — ONE table, rows mixed; kept whole (see Uncertain for the rows the code has since answered)
- `## 2. What we are NOT simulating` — five named choices; `Recipe.energyKWh` still unbuilt
- `## 5. The wooden pallet` — no pallet anywhere; logistics.md's ladder stops at cart · wagon · barge
- `## 6.` → the ⚠ granular-gap paragraph (Left item 1), the ⚠ crate follow-up paragraph (see Uncertain), the *Later, in order* paragraph (the backlog, verbatim)
- `## 7.` — Doctrine (below)

### Doctrine — kept, labelled
- `## 0. The object, in the real economy` (22–59) — the real loop, primary and secondary, and what differs outside the US. Not a mechanism; it is the source text the table row *the wiki* says should BE the `can` article. Suggested home: stays with the slate until `wiki-starter` takes it
- `## 3. The content-pack organising principle, tested by the can` (110–128) — *trade = process* applied (bottling fills, it does not make cans or smelt; the deposit is the polity's content, never a trade pack's; the scavenger is an emergent, not a row); *corpo = capital*; *the standard is the exemplar row + README, not inheritance*. The first two are decided doctrine (content-packs.md, corpo.md); the third restates ref-shapes' *template inheritance does not exist* for pack authors. Suggested home: content-packs.md's authoring guidance, if the coordinator wants it out of the slate
- `## 7. The can as civic curriculum` — 7.1 (a collective-action problem you can hold; *choosing what to simulate at fidelity is choosing which moral intuitions you can recruit for free*), 7.2 (price / mandate / norm, and the fourth move — Keep America Beautiful, discoverable through shipped press + `authoring_events`), 7.3 (the Pfand collector — vocations.md's demand test passed only by law), 7.4 (⚠⚠ the keystone: the empty must be an ambient, collective burden), 7.5 (⭐⭐⭐⭐⭐ the can and the blood — price works / price backfires; Titmuss; Gneezy & Rustichini), 7.6 (model the mechanism, never the verdict — the five counter-lessons), 7.7 (why this medium). Nothing here is a mechanism; 7.5 is the concrete argument for measurement.md's *engine measures · subject values · polity imposes* layering and for the standing-mint slate. Suggested home: 7.4 + 7.5 → measurement.md § Why (or `docs/design-philosophy.md`); the rest stays with the slate as the curriculum design

### Uncertain — kept
- `## 1.` table rows the code has since answered, kept because the table is one paragraph: **the vessel** (*wrong — narrates state, no material*) → fixed by the libations MR (`can.yaml`); **census** (*wrong — emptied can still counts*) → fixed (`Bottle.getCensusKey()` derives; bulk.md § `category`); **the empty** (*wrong — counts as product*) → fixed, and *"an empty can"* is the augmenter's *"The can is empty."*; **distribution** (*gap for the rest — the hand teleports*) → logistics shipped (logistics.md: induced lanes, the Route/Journey, the depot; `transport/src/thing/{Barge,HaulageRig}.ts`), though the pallet and a truck are still absent; **the product** → `can-of-cola` exists. The *to build* column of every other row still stands
- `## 6.` → the ⚠ crate follow-up paragraph (212–221) — says *"the vessel kind lives on `BulkableMixin`, so a `Crate` … cannot carry it"* and points at *bulk.md § OPEN — `category` has no home a `Crate` can reach*. Both are stale: the kind is on `VesselKindMixin` (depends on nothing) and bulk.md's section is now headed *✅ RESOLVED — `category` now has a home a `Crate` can reach*. What is TRUE in it is the consequence — `Crate.ts:20` still composes `CirculatingMixin(StagedMixin(ContainerMixin(DetailedMixin(Thing))))`, no vessel kind, so an emptied crate still derives `vessel:<primaryKeyword>` and empties do not converge. Kept verbatim; Left re-worded to the remaining act (*`Crate` composes the vessel kind*). ⚠ bulk.md's own ✅ RESOLVED section is internally contradictory (it announces the mixin, then lists *"a small dedicated mixin"* among *the real candidates, for whoever picks this up*) — a doc defect outside a cut-only pass; flagged for the coordinator
- `## 2.` → *Market-specific standards … the can is 330 mL because the shipped world is not America* — `interiorCapacity: 0.33` shipped; the *locality decides by law* half has no code (no legal-code substrate). Kept as doctrine-with-a-shipped-default
- Overlaps for the cluster pass: the deposit ↔ `builds/legal-code-slate.md` (law as content) + `contract.md`'s escrow leg; the pallet/truck ↔ `logistics-slate` / `freight-slate`; primary production + `Recipe.energyKWh` ↔ `metal-chain-slate` / `mining-slate` (iron+steel shipped, aluminium's Bayer/Hall–Héroult has no owner); carbonation-goes-flat ↔ the spoilage/thermal reconcile-on-read pattern; 7.5 ↔ `builds/blood-slate.md` + `builds/standing-mint-slate.md` (the slate already points there)

### Handoff (belongs in a doc outside my list)
- → `textiles.md` (the fibre vocabulary / the `cellulose` tag passage, l.226–233), verbatim from the cut § 6 paragraph:

  > ✅ **`jute` added to the fibre vocabulary** (founder's call) — hessian is
  > jute, and all four sack rows now name it.

  (Row: `base-library/content/stuff/idea/material/textile/jute.yaml`; the sack rows in `trade-cooking` and `trade-bottling`.)

### Status block
- Status line: *"the empty↔product `category`"* → *"the empty↔product vessel kind (`category`, now on `VesselKindMixin`)"* + the bulk.md § pointer
- Left: *the granular bulk phase (`requiredClosureFor`, so a sack is honestly open) · the deposit as law + a contract leg · the `fill` recipe · `remelt` + `Recipe.energyKWh` · carbonation going flat · a `category` home a `Crate` can reach · the pallet, with freight* → *the granular bulk phase (`requiredClosureFor`, so a sack is honestly open) · the deposit as law + a contract leg · the `fill` (canning) recipe · `remelt` + `Recipe.energyKWh` + smelting · the metal-forming trade · carbonation going flat · caffeine on the mixers · `Crate` composes the vessel kind (empties converge on `vessel:crate`) · the pallet, with freight · the `can` wiki article* (the `category` home item re-worded — the home shipped; three items added because § 1 and § 6's *Later* list carry them unrepresented)
- Size: a wave → a wave

---

## Batch totals

| slate | before | after | Status | Left | Size |
|---|---|---|---|---|---|
| `tails/bulkable-slate.md` | 900 | 409 | PARTIAL → PARTIAL | 6 → 10 | a wave → a wave |
| `tails/aluminium-can-slate.md` | 391 | 344 | PARTIAL → PARTIAL | 7 → 10 | a wave → a wave |

Classes across both: 18 cut SHIPPED · DOCUMENTED · 4 graduated into
bulk.md (`### Container + Bulkable`, `### getContentsDescriptionFor`,
the ⭐ *Plugged in* paragraph at § The ingest seam, the four-verbs
paragraph at § Verbs — 62 lines net, plus two deferred-tail bullets
corrected because the code proves them false) · 5 superseded · 0 absorbed
· 1 handoff (textiles.md, two lines) · 3 doctrine blocks labelled.

`bulk.md` grew 484 → 547. No file outside `docs/slates/tails/{bulkable,
aluminium-can}-slate.md`, `docs/subsystems/bulk.md` and this ledger was
touched. Nothing committed.
