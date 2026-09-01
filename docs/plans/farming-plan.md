# Farming — implementation plan

**Input:** farming-requirements.md (retired at the Stage-A sweep — its Stage-B material lives in § Stage B below)
(D0–D9 locked with the user; this plan is the HOW). Read alongside:
[husbandry.md](../subsystems/husbandry.md),
[smallholding.md](../subsystems/smallholding.md),
[crafting.md](../subsystems/crafting.md),
[retail.md](../subsystems/retail.md),
[employment.md](../subsystems/employment.md),
[residency.md](../subsystems/residency.md),
[persistence.md](../subsystems/persistence.md),
[zone.md](../subsystems/zone.md), [banking.md](../subsystems/banking.md),
and build-2's `residences-requirements.md` (D16–D18) +
`residences-plan.md` (branch `design/residences`).

**Build discipline:** one MR spanning both stages. `pnpm test:near` +
touched pack suites per wave; ONE full `pnpm test` at finalize. All lint
families green each wave. No migrations — content edits + drop the DB.
Stage by name; push every turn. The Hinkley-yard drive leg *uses*
Hinkley; nothing in this build *edits* Hinkley or residences territory.

**The two stages (requirements § Dependencies):**

- **Stage A** (Waves A1–A7) — independent, buildable now: the spine
  fix, the fruit cycle, the healed gather, harvest-by-ground, the ten
  species + planting stock, the farmers market. **The faucet does NOT
  close in Stage A** (P0 below).
- **Stage B** (Waves B0–B5) — Heart's Delight — **gated on residences
  Waves 0–5 landing on master** (the pack cut, D17 identity +
  `lint:census`, `HoldingWarren`/`PlatPlan`, `HoldingProgramme`,
  the LotHolder rework). B0 is a mandatory re-grounding checkpoint.

---

## Grounding (facts verified this cycle — file refs current at plan time)

- **`GrowingMixin`** (`lib/husbandry/Growing.ts`, 859 lines): profile
  is one plain persistent object; the reconcile step loop computes
  `limiting = min(satWater, satLight, satRoot, satNutrient)`, relaxes
  vigor, accrues `_maturity` above `goodAt`, calls `advanceStage()`
  then `updateFlowering()`; the flowering latch (`mature` + thriving)
  sets one seed per episode via the `onFloweringLatched` host hook
  (`_flowering`/`_seedSet` persistent); `_worstLimiting` is a monotone
  minimum; death latches on the vigor crossing. Harvest surface
  (`harvestTemplatePath`, `nutrientDraw`, `isHarvestable`, `getBed`)
  lives on the mixin. Test harness: `__tests__/Growing.test.ts`
  (GrowFixture + `_setNowProviderForTesting`; `test-bootstrap` import
  mandatory).
- **`HarvestController`** (`platform/idea/cmd/inventory/`): band read
  from `getWorstLimiting()` BEFORE mutation → clone → `crafted.stamp`
  (maker from `ExecutionContextApi.getActingAuthor() ?? giver`) → move
  → `bed.drawNutrient` → destruct → `captureHostOf` → `recordDeed`;
  `bandFor` maps worst → band via the four `husbandry.grade.*At`
  dials. Spec target: `requires: [VisibleMixin, GrowingMixin]`; the
  binder's `requires` supports OR within an entry
  (`ContainerMixin|SurfacedMixin` in put.yaml; entries AND).
- **Crafting's gather** (`platform/idea/api/CraftingLogic.ts` ~265–345):
  `isItemCandidate` excludes `isCrafted` (*"raw matter, not capital or
  a made form"*); `collectCandidate`'s crafted-bulkable branch admits a
  vessel holding a real material — *"the distinction is the material,
  not a flag"* (the D3 precedent, verbatim in code). Tripwire suite:
  `world/hearthworks/__tests__/hearthworks-venues.integration.test.ts`
  (the fine-roast spec feeds a `Provision` to a recipe).
- **`Provision`** = `GradedMixin(Detailed(Thing))`; **`Crop`** =
  `CraftedMixin(Detailed(Thing))`; `CraftedMixin` composes
  `GradedMixin`. ⚠ TS drops an inner mixin's surface through a nested
  generic mixin: swapping Provision's base to Crafted loses
  `setGradeBand` *statically* (the hearthworks test calls it) — fixed
  by a class/interface merge (`interface Provision extends Crafted {}`),
  verified in the discarded branch.
- **The spawn faucet** (`platform/idea/api/ResidencyLogic.ts`):
  candidates = template rows whose `data` has `censusKey` and whose
  class composes `Circulating`; target `regionTarget ?? 3`;
  `SpawnTable.draw` skips at-target (`count >= target`), so
  **`regionTarget: 0` is never drawn** while census + ask vocabulary
  survive. Zone `stocks:` overrides per region (the wild/foraging
  seam, deliberate).
- **Persistence** (`lib/spatial/Container.ts` `captureSlice`;
  `platform/idea/api/PersistableLogic.ts`): the container slice
  filters live avatars (`isHasInteractive`) and owner-stamped goods
  (`ChattelApi.isOwnerPersisted` + `noteOwnedGood`) in ONE ordering
  shared with the Slotted slice. **The commuting-cast defect is
  verified live**: a `Behaved` NPC captured into two persistable
  rooms' slices restores twice → boot dies `expected singleton,
  found 2`. The fix (three touches — capture skip on `isBehaved`,
  symmetric restore-skip in `restoreItem`, and
  `Persistable.reseedTransientCast()` walking retained
  `_bornWithSpecs` after `materializeImpl`'s restore) was built and
  boot-verified in the discarded branch; `_bornWithSpecs` is retained
  on `PersistableMixin`, and `applyPopulates` resolves a spec's class
  via `Template.findByPath` + `StuffApi.loadClassByPath`.
- **Brains** (`lib/behavior/consigns.ts`, `restocks.ts`): literal
  verbs via `CommandApi.forceCommand`; ⚠ `get 1 <kw>` never bare
  (greedy binding; fat-inventory quadratic — 54% of a live profile);
  bounded loops; teleport home in `finally`; `restocks` reads
  `stockSheetFor` and goes wherever a par line's `supplier` points.
  ⚠ `put`'s target scope is `peers` — a held container is not a valid
  put target (live-drive finding).
- **Selling machinery** (`retail.md`, `ConsignController`): consign
  gates on ownership (or as-the-business with the house card), a bank
  account, and `retail.consignment.listingCap` (AppSetting, default
  24, read per consignor per shelf). `EmploymentApi.buysFor` includes
  the business a giver is **proprietor** of; the house card is dealt
  at hire/roster-materialization to non-Avatar holders of
  `purchases: true` positions. The `residual` compensation basis +
  `draw` verb (`BankingApi.payDraw`, resolves via
  `businessOfProprietor`) ship.
- **The lounge's produce pars**: `saxonberg-lounge/...idea/business.yaml`
  parLines for lime/lemon/orange/grapefruit/mint/cherry/olive/cranberry,
  all `supplier: /trade/distilling/idea/business` today.
- **Spherical substrate**: `SphericalZone`
  (`SingletonMixin(SpatialZone)`; explicit named exits only; lossy
  `focusIndex` — **overlap is NOT enforced by the zone**),
  `SphericalCoordinatesMixin` (`[rho, theta, phi]` + `radius`, both
  persistent **and authorable**), concrete
  `platform/location/SphericalLocation`. ⚠ Unverified: whether
  `radius` drives the photometric/air/ranged size scale the way
  cartesian `extent` does (B2 verifies and wires).
- **The Hydrator reflects every persistent field from `data`**
  (`authorable` is only the Studio flag) — authored grown state (D7)
  is plain YAML.
- **Transport for drives**: `goto`/self-`teleport` are access-gated
  (title), not wizard-gated — even founder+all-groups was refused
  live; test sessions spawn where needed via test-login's
  `startLocation`. The TPA ride (`teleport crossroads`) worked for a
  fresh character.
- **Ten species taxonomy paths** (species-and-names, the wallisii row
  shape, `_parentCladePath: /stuff/idea/species/plantae` — the shallow
  link is deliberate): citrus ×4 (sapindales/rutaceae/citrus/
  {latifolia,limon,sinensis,paradisi}), prunus/avium, olea/europaea,
  mentha/spicata, vaccinium/macrocarpon, vitis/vinifera,
  juniperus/communis (pinopsida).

---

## Plan-level decisions

### P0 — The faucet closes at the SWITCHOVER, not in Stage A

The requirements lock the closure; the plan sequences it. Between
Stage A and Stage B the bar must stay supplied, so Stage A ships
everything *up to* the closure and leaves the census lane running.
Wave B4 is the atomic switchover: exemplar farm live → keeper
re-pointed to the market → crate rows to `regionTarget: 0` → the old
trade-farming island (the packing-shed floor, `farm-stock`, Wen and
her `consigns` config, the crate `props:`) **retires** in the same
wave. No interim half-state ships.

### P1 — The fruit cycle rides the flowering latch; cycle fields are the polycarp marker

`GrowthProfileData` gains two optional scalars: `fruitSetCount?` and
`fruitFillDays?` (both > 0 ⇔ polycarp — no flag). New persistent
state: `_fruitFill` (accumulated fill fraction 0..1), plus the shipped
`_flowering`/`_seedSet` reused as the cycle latch. The step loop:
when polycarp and `_flowering` latches (mature + thriving — the
shipped rule), the episode **sets the crop** instead of dropping a
seed (`onFloweringLatched` is NOT invoked for polycarps — the yield
is the crop; ornamentals/monocarps are byte-identical); `_fruitFill`
advances by `(limiting × dt) / (fruitFillDays × DAY)` while set;
**`_worstLimiting` re-seeds to 1 at the moment of set** (the cycle
window = set → harvest; a monocarp never re-seeds — whole life, D2).
Ripe ⇔ `_fruitFill ≥ 1`. Presentation: ripe reads *"heavy with
fruit"* (outranks the flowering phrase); filling reads the flowering
phrase. `isHarvestable()`: polycarp → mature ∧ alive ∧ ripe. Death
zeroes the cycle. Dials-with-homes (thinning, alternate bearing,
over-ripe) are comment-documented seams, no fields.

### P2 — Harvest: the cycle branch, ground-targeting, `pick`

`harvest.yaml`: verbs `[harvest, pick]`; target
`requires: [VisibleMixin, GrowingMixin|CultivableMixin]` (the put.yaml
OR). Controller: a Cultivable target resolves to its first
harvestable growing occupant, else its first growing occupant (so the
refusal names the stage), else *"nothing is growing in it"*. Polycarp
branch: band from `getWorstLimiting()` (the cycle window per P1) →
mint `fruitSetCount` clones of `harvestTemplatePath` → stamp each
(`isCrafted` → full stamp with maker; else `isGraded` → band) → move
to giver → `drawNutrient(nutrientDraw)` (the full authored draw — a
ripe pick takes the whole set; no pro-rating needed under
ripe-only) → `settleCycle()` (clear set/fill, `_flowering` false so
the next latch opens a new window) → **no destruct**; capture bed AND
plant (it survives, its own host). Deed difficulty: `'easy'` for a
polycarp pick (a routine act must never grade `hard` — levelling
mill); annual keeps `transplantDifficulty()`. Refusals: mature-but-
unripe polycarp → *"nothing ripe on it yet"* (`nothing-ripe`), dead →
dead, else the stage.

### P3 — Matter-not-mark lands as one predicate edit + the Provision swap

`isItemCandidate` admits a Crafted discrete whose **material is
edible** — `!MixinApi.isCrafted(c) || isEdibleMatter(c)` where
`isEdibleMatter` reads the Tangible's material edibility (the
`ConsumableMaterial.edibility` surface `FeedController`/metabolism
already consume). Everything else in the predicate (tools, containers,
bulkables, organisms, makers) is untouched — the anvil never feeds the
forge. `Provision`'s base swaps `GradedMixin` → `CraftedMixin` with
the class/interface merge (Grounding). Targeted tests: a marked lime
gathers; a marked knife never does; a marked roast gathers
(leftovers are deliberate); the hearthworks + bar suites green.

### P4 — The farmers market: a square, a stall, a municipal operator

Content (in the **Terminus tree wherever it lives at build time** —
world-seed today, the `terminus` locality pack after residences
Wave 0; pure relocation either way): a **market square** room off the
counting-houses block (cross-zone exit pair, both sides explicit — the
cash-and-carry precedent), holding **the produce stalls** — one
`ConsignmentShelf`-composing counter (the cash-and-carry `counter`
shape, no stockLines) — plus a **market Business** row (municipal,
proprietor-absent, `banksAt: goodkin`, `operatingLocations:
[the stalls]` — the city-budget shape) so commission/attribution
resolve. **`ConsignmentShelf` gains an authored per-shelf
`listingCapOverride`** (nullable; falls back to the global
`retail.consignment.listingCap`): loose produce means dozens of
listings per seller, and the market stall authors a generous cap
(200) while every other shelf keeps the default — an authored,
per-venue fact, not a global raise. Square name/prose: content, build
agent's pen; exact placement flagged in Opens.

### P5 — The farmer: proprietor + one `purchases` position; the producer brain

The exemplar farm's Business row names the farmer NPC as
**proprietor** (`residual` — income accrues to the operating account;
the farmer `draw`s), AND rosters the farmer in a `purchases: true`
position on the same business — zero kernel change to get the house
card dealt (the shipped hire-time deal), so the brain's selling tail
is the proven consigns shape (`wallet use house`, `consign … --ask`)
with the payout landing on the business account the draw reads. The
**producer brain** (`lib/behavior/farms.ts`, kernel — the roadmap's
production brain): per beat, in the grove/fields — read each ground
(`soilMoistureFraction`/`nutrientFraction`, the player's own reads),
`fill can from standpipe` + `water <row>` / `feed <row> with sack` as
needed (bounded); `pick <row>` for each ripe occupant (bounded);
`get 1 basket`-load the take; teleport to the market; `wallet use
house`; `consign <fruit> --ask <n>` per item (bounded by the stall
cap read, the consigns-brain headroom pattern); occasionally
`draw <n>` (the residual made visible — one beat in N); teleport
home in `finally`. Every consigns-brain guard is inherited verbatim.
Stage A ships the brain + its bounded-and-literal source-shape tests;
its first live host is Stage B's farmer.

### P6 — Stage B re-grounds before it builds (B0 is mandatory)

Stage B was planned against residences' *plan*, not its landed code.
B0: rebase over master post-residences-merge; verify the actual
surfaces of `HoldingWarren` / `HoldingProgramme` / `PlatPlan` /
`FrontDoorExit` / `lint:census` / the pack layout; re-map every B-wave
file target; surface deviations to the user **before** B1 if the
break-ground interface (runtime-added outdoor members) didn't survive
their build as expected.

### P7 — Break-ground: a programme-level act over a field ledger

On the landed `HoldingProgramme` base: the farm holding's programme
carries the **field ledger** — `fields: [{leaf, name, areaM2, focus,
radius}]`, persistent instance state, so placement is durable, the
overlap assertion is pure ledger arithmetic, and wake re-wires exits
deterministically from geometry — and buds each field as a keyed
member — `(scope = the authored field row, key =
<holdingExtent>/<leaf>)` — into the district's fields
`SphericalZone`. The **break-ground act** (`break ground <name>
--area <n>`; category with the cultivation verbs; `requiresEmbodied`;
input = a name and an area, nothing else — placement is derived,
per the auto-packed-foci ruling): title check (the actor holds the
holding) → area checks (Σ fields + homestead reserve ≤ holding area;
`areaM2 ≤` the **per-field cap**, an authored dial ~4 ha that keeps
one room honest — wanting more means breaking a second field; the
giant contiguous staple field is phase 4's aggregate-density
question) → an **engagement** over real game-time (the crafting
ManualBuild shape; duration scales with area) → append the ledger →
bud the room → wire the gates.

**Placement is TANGENT PACKING, and the graph IS the geometry** (user
ruling): the first field's sphere is placed tangent to the
homestead's anchor; every later field is placed tangent to an
existing sphere, spiraling outward — **no overlap and connectivity
both by construction**. Exits derive from the same facts: touching
spheres get a lateral exit; fields tangent to the anchor get the
homestead gate. Depth is emergent, never authored — a 3-field croft
is a star off the yard; a 12-field spread is a spiral web where the
back forty is a real walk through intervening fields (von Thünen
inside one farm). `radius = √(areaM2/π)`.

**Cross-holding separation**: each holding's anchor is a fixed
projection of its lot's plan slot, reserving a disc bounded by the
holding's known area (`√(2A/π)` — packing headroom); anchor spacing
keeps discs disjoint by construction, and the act asserts it anyway
(the zone deliberately doesn't). **One zone per district, one room
per field, always**: all holdings' fields share the single district
fields zone (forced by shared-row zone resolution; what makes
region-level facts resolve); a holding never gets its own zone; a
second rural district ships its own fields zone in its own pack.

`radius` → size-scale wiring lands here if B0's verify finds it
absent. Field retirement: deferred seam, comment only.

**Soil at the mint — no roll, no check, a fact of the place** (user
ruling): a discipline check on break-ground would violate three
doctrines at once (uncertainty.md's resolutional ban; nothing gates
on a band; *competence never multiplies yield*). What the minted
field gets: soil **volume** from the chosen area (the bulk model);
reserves **full** — the **sod dividend**, real agronomy (virgin
ground under old grass is nitrogen-rich; the field then depletes
harvest by harvest until `feed` becomes the discipline — the nutrient
lesson taught by the initial condition itself); soil **quality
variation deliberately absent** (husbandry's deferred seam — phase
4's six-reserve soil), and when it arrives it derives from **place**:
a district **ground-character seam named now** as a comment-documented
field home on the fields-zone/biome row (the real Valley of Heart's
Delight was famed for its alluvium — the name does the work). Skill
enters as the **deed**: break-ground credits `agriculture` at
`standard` (honest labor, never `hard` — world-derived difficulty per
the advancement rule); the **engagement's duration scales with area**,
the difficulty class doesn't.

### P8 — The exemplar farm ships as authored history (D7's authoring path)

The `hearts-delight` pack pre-sells one holding (manifest title claim,
the lot-1 move) and its programme row seeds the field ledger (3–4
fields) in data; the field/plant rows author grown state
(`growthStage: mature`, `_maturity`, `_flowering: true`,
`_fruitFill: 1.0`, `_vigor: 0.75`) under D7's model-consistency rule —
states the reconcile could have produced, asserted by a content test.
Beds/rows author soil FULL (`interiorMaterial` + `interiorAmount` —
the Hinkley pour-the-soil trap, dodged in data).

### P9 — Packaging (requirements D5 sub-item, applied)

- **`hearts-delight`** (new locality pack, root
  `/world/terminus/hearts-delight`, the D18 shape): the district zone
  rows (cartesian town + the fields SphericalZone), Murphy's Station,
  the lane, plat book + holder rows (branched plan), title claims
  (`landUse: agricultural`, areas), the exemplar holding's programme +
  field content, the farmer NPC + farm Business. Depends on
  `residence`, `trade-farming`, platform.
- **`trade-farming`**: the ten species' plant/seed/produce/material
  rows; the producer-brain config lives on the farmer row
  (hearts-delight) but the brain is kernel. The old island content
  retires in B4.
- **`species-and-names`**: the ten species rows (the snake-plant
  precedent).
- **Terminus tree** (wherever it lives): the market square/stalls/
  business; the general store's seed stockLines.
- **Kernel**: Growing/Harvest/gather/spine edits, the brain, the
  break-ground act + field-budding logic (or `residence`-pack `src/`
  if B0 finds the programme extension belongs beside the programme —
  B0 decides under D18's membership tests).

### P10 — Inputs, water, incorporation, disciplines (the pre-greenlight scan, user-approved)

**The v1 input set is medieval and exactly four things**: water,
compost (bought sacks — at medieval tech compost IS the fertilizer;
synthetic N is a far-future unlock; **manure is ranching's return
leg**, never faked early), seed (retail), and hands. **No weeds/pest
axis** — the slate's audit found it entirely net-new; it arrives as
the adversarial reserve in phase 4/6, and the medieval answer is the
hoe, not chemicals. pH/amendments ride phase 4's six-reserve soil.
The vine trellis is prose.

**Water: a dug well, and what it's hiding.** Mechanically every water
source in the game is the same `WaterFixture` over `UnboundedSource`
("NOT a regenerating well… deferred", its own docstring) — our farm's
is no different, and honestly so. Fiction: each holding's water is a
**dug well, part of the provision, priced into the lot** — the real
Valley of Heart's Delight was sold on its artesian water; the well is
the plat book's pitch made object. **Named seams**: the
finite-but-regenerating source is where water becomes an economy
(rights, drilling, irrigation — the user's deferral), and the aquifer-
as-commons in an unincorporated district is precisely what Heart's
Delight farmers would first incorporate over.

**Unincorporated is modelled by absence** — the civics substrate's own
shape: government is a data Idea with Locality-declared jurisdiction,
and Heart's Delight ships **no Government row**. Title works without
government (property is Compact-level). ⚠ B1 verify: how civics READS
the absence (no jurisdiction claimed vs. inherited), so the district's
prose is honest.

**One discipline: `horticulture`** — every act here (plant, water,
feed, pick, break ground) credits the practised leaf; `agriculture`
stays the uncredited spine parent. Fix in passing (Wave A3): the
shipped `HarvestController` credits `'agriculture'` where husbandry.md
says the leaf — align to `'horticulture'`. **No conferrals, per the
shipped stance** — the tech ladder (irrigation, grafting, the
nursery, instruments) arrives later as conferrals + known-of→can-make
recipes gated on exercised competence: **trades ship at medieval tech
and advance as players exercise disciplines** (the user's
trade-progression doctrine, recorded here for successor builds).

---

## Stage A

### Wave A1 — The commuting-cast persistence fix

Re-land the verified edits: `Container.captureSlice` third skip
(`isBehaved` — comment tells the two-rooms story);
`PersistableLogic.restoreItem` symmetric skip (a record written before
the rule may carry a cast entry; resolve the entry's class, skip
Behaved); `Persistable.reseedTransientCast()` (walk `_bornWithSpecs`;
Behaved-resolving entries with zero live instances re-mint and move
in) called from `materializeImpl` after a successful restore.
**Tests:** the discarded branch's `CastReseed.test.ts` (capture skip;
reseed mints-once; live cast conserved) + the spine suites untouched
(`lib/persistence`, `lib/spatial`, duncan-hall, hearthworks — 265
tests, verified green against these edits once already).
**Docs:** persistence.md § the third skip (text exists from the
discarded branch).

### Wave A2 — The fruit cycle (kernel)

Per P1, in `lib/husbandry/Growing.ts`: profile fields, `_fruitFill`
(+fieldMeta), the set-instead-of-seed latch branch, fill accrual,
window re-seed at set, ripe/presentation/`isHarvestable`, death
zeroing, `isPolycarp()` + `settleCycle()` + `getFruitFill()` surface.
**Tests:** new `Fruiting.test.ts` (GrowFixture): monocarp profile
byte-identical (no fields → no branch); latch sets and suppresses the
seed-drop for polycarps only (ornamental still drops its seed — the
phase-1 pin); fill scales with limiting; window re-seeds at set, not
harvest; ripe at fill 1; settle re-opens; death zeroes; fieldMeta
round-trip. `Growing.test.ts` itself untouched.

### Wave A3 — Harvest + `pick` + ground-targeting

Per P2: `harvest.yaml` (platform pack) + `HarvestController` — and
the P10 alignment: the deed discipline string `'agriculture'` →
`'horticulture'` (the doc's practised leaf), with the advancement
test updated.
**Tests:** extend `HarvestVerb.test.ts` — polycarp mints setCount,
each graded off the cycle window; survives with a fresh window (second
cycle regrades clean); nutrient draw on pick; bed-target resolves the
ripe occupant over a bare one; empty-bed `nothing-growing`;
`nothing-ripe` on an unripe polycarp; annual assertions untouched.

### Wave A4 — Matter, not mark

Per P3: `CraftingLogic.isItemCandidate` + `Provision` swap.
**Tests:** the predicate trio (lime/knife/roast) in a new
`lib/craft`-side or CraftingLogic test; hearthworks + retail suites
green (the tripwire).

### Wave A5 — Species + flora + planting stock

Ten species rows (species-and-names); per-species
plant/seed/produce/material rows in trade-farming (`thing/plant/`,
`thing/seed/`, produce `thing/<kind>.yaml`, `idea/material/` — grape
+ juniper materials/produce are new; profiles: trees
`fillDays 20–30, setCount 12`, mint `fillDays 5, setCount 12`,
per-species moisture/root curves — the discarded branch's tuned set,
re-cut for cycle fields). General store gains the ten seed packets on
the gardening line (stockLines + prices — ⚠ coordinate: residences
Wave 7 also edits `counter.yaml`; whoever lands second rebases).
**Tests:** a trade-farming annex test (the libations-annexes shape):
every family resolves (seed→plant→produce→material), polycarp fields
authored on all ten, carrot has none; the store lines resolve.

### Wave A6 — The farmers market

Per P4: the square + stalls + market Business +
`listingCapOverride` (a small `ConsignmentShelf` field + the
`ConsignController` cap read honoring it). **Tests:** cap override
honored per shelf while others keep the default; a seller consigns
loose produce at their own ask; commission attributes to the market
business. **Drive (checkpoint A):** the Hinkley-yard invariant leg —
spawn at the yard (`startLocation`), buy a lime seed at the general
store, plant in the yard bed, operator-advance the clock, `pick`,
carry to the market, consign, and a second session buys it. Every
step farm-free (D0's acceptance).

### Wave A7 — The producer brain + Stage A docs

Per P5: `lib/behavior/farms.ts` + source-shape tests (bounded, literal,
`get 1`, finally-home — the tends.bounded pattern) + a fixture-world
behavior test (a thirsty bed watered; a ripe row picked; listings
appear). Docs: husbandry.md gains § The fruit cycle (from the locked
D1/D2 text); smallholding's perennial seam annotated. Push; Stage B
waits on residences.

---

## Stage B (after residences Waves 0–5 land; B0 gates the rest)

### Wave B0 — Re-ground + rebase (mandatory checkpoint)

Per P6. Deliverable: a short delta note appended to this plan (what
moved, any interface surprises), surfaced to the user before B1 when
material.

### Wave B1 — The `hearts-delight` pack + the district

Per P9/P8: pack scaffold (the locality-pack shape); the cartesian
district zone (rural cells), Murphy's Station + the lane, the
generative plat book (branched plan; hectare bands; raw lots cheap,
the pre-sold worked holding priced as old ground) + holder rows;
the fields `SphericalZone` row; title claims
(`landUse: agricultural`); the walk-in wiring (station ↔ lane ↔ the
crossroads/TPA end — the cash-and-carry both-sides-explicit pattern;
exact host edge per B0's landed map). **Tests:** pack annex tests —
claims, plan shape, rows resolve; fresh-DB boot installs.

### Wave B2 — Break ground + spherical fields

Per P7: the field row (authored template — composition per B0:
`SphericalLocation` + Container + the cultivable-ground surface),
the programme-member budding, the ledger, the act + engagement, anchor
projection + ring-packing + the no-overlap assertion, radius →
size-scale wiring if absent. **Tests:** ledger arithmetic (area budget,
homestead reserve); bud → keyed member in the fields zone with honest
focus/radius; no-overlap refusal; the gate wires; restore re-buds from
the ledger; land use resolves via the key; a second holding's anchor
never collides.

### Wave B3 — The exemplar farm

Per P8 + P5: the pre-sold holding (fields seeded in data, established
+ ripe under model-consistency, asserted by test); the farmer NPC
(proprietor + purchases position; the brain config; a basket, can,
sacks via `props:`); the farm Business. **Drive (checkpoint B1):**
spawn at the farm — the farmer's beat waters/picks/sells at the
market; buy a raw lot (Governor-funded, the hinkley e2e pattern),
break ground, plant, water.

### Wave B4 — The switchover (atomic)

Per P0: lounge produce par lines → the market business; crate rows
`regionTarget: 0` + `props`/`container` removed; the old
trade-farming island retires (floor, stock, Wen, her config; the
libations-annexes spawn-shape expectations re-cut for farming's
departure — the carve verified in the discarded branch). **Tests:**
no produce spawn candidate remains; the keeper's sheet resolves the
market; the annex suites re-cut.

### Wave B5 — Drives, docs, finalize runway

Full drives: the farm loop (fresh boot → farmer supplies the market →
keeper buys → a lime daiquiri with a grown, graded, marked lime); the
player loop (buy raw land → break → plant → pick → sell); the
Hinkley-yard leg re-run; restart persistence (the cast fix proven
live). Docs: husbandry.md final; a hearts-delight README; retail.md
market note; slates annotated. The finalize runway: source-change
check, ONE full suite, lints, push — stop for the user's MR review
(the /finalize sweep is its own phase).

---

## Acceptance-criteria coverage

| Criterion (requirements) | Waves |
|---|---|
| Polycarp two-cycle grade + death | A2, A3 |
| Annual/phase-1/2 suites untouched | A2–A4 (pins) |
| Graded + marked produce; healed gather; tool never gathers | A3, A4 |
| Faucet closed; no unpicked produce | B4 |
| Nitrogen export/feed loop | A3 (+shipped) |
| The market path to the bar + the drink | B3–B5 |
| Player picks + sells at the market | A6 (garden), B3 (farm) |
| Hinkley-yard leg, farm-free | A6 |
| Break ground, honest placement data | B2 |
| Authored ≡ player ground (equivalence) | B2/B3 tests + B5 drive |
| Docs | A7, B5 (sweep items at finalize) |

## Risks & opens

**OPEN for the user — RESOLVED 2026-08-31: defaults accepted on all four.**
1. **Market square placement + name** — off the counting-houses block
   is the plan's default (demand-side, von Thünen); name is content.
   Say the word if you want it elsewhere (or named now).
2. **The stall cap** as an authored per-shelf override (P4) — confirm;
   the alternative (raising the global cap) leaks to every shelf.
3. **The farmer's name/character** — yours when B3 nears.
4. **P0's sequencing** (faucet closes at B4, not Stage A) — flagged
   because the requirements say "closed" without a stage; this is the
   no-half-state reading.

**Risks (managed):** Stage B is planned against residences' plan, not
landed code — B0 exists to catch drift, and the break-ground interface
note is already on their table. The counter.yaml touch (A5) can
conflict with residences Wave 7 — mechanical rebase. The spherical
size-scale wiring is unverified until B0/B2. The market cap override
touches `ConsignController` — the consignment suite is the pin.

---

## Checkpoint A — the drive record (appended at build time, 2026-08-31)

Stage A built as planned (A1–A7, one commit per wave on `build/farming`).
The checkpoint-A drive ran as `e2e/tests/drive-farming.spec.ts` over 26
live iterations at a compressed clock (world_state scale 6000×; above
~10000× the schedulers starve the event loop). **Grow→pick proved live
end to end** — fund → bank → the store kit → title-buy a fresh lot →
pour the soil → plant → the watering season → the ripe pick off the
living plant. The market legs (consign/buy at the stalls) were cut down
by harness artifacts (finally: a broken founder fixture on the dev DB —
its `look` never answers) and stand on the unit/fixture suites plus the
same consign controller running nightly in Wen's live loop; re-run the
spec on a fresh DB to close them live.

Drive-found defects fixed in this build: two unguarded
`getInteractives().size` reads that crashed command dispatch (one rode
every display refresh), and the large pot being unbuyable by keyword.
Drive-found seams for the slates: substring keyword matching makes
compound nouns ambiguous (`pot` ⊂ "potting soil" ⊂ "plot" — MQL's
"which target?" prompt then swallows the next commands); a fresh bed
ships capacity but no soil (the pour-the-soil flow is the true first
act — its prose should stop claiming otherwise); and dev-preflight's
kill-by-kind reaches across worktrees.

**Post-checkpoint ruling (2026-09-01):** the producer brain does NOT
stay kernel — it ships in the pack, at
`packages/content/trade-farming/src/behavior/farms.ts`, addressed
`/trade/farming/behavior/farms` (the first shipped pack brain on the
capability rung; P5's kernel placement is superseded). Stage B's farmer
rows must name that path, never `/lib/behavior/farms`.
