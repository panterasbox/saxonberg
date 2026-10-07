# Glass — implementation plan

**Kind:** feature · **Lead end:** content-led, with four thin kernel seams
**Executes:** `docs/requirements/glass-requirements.md` (closed scope)
**Seeded by:** `docs/slates/builds/glass-slate.md` · boundary with
`docs/slates/builds/optics-slate.md` (ships **no** optics)

A new capability pack, `trade-glass` at `/trade/glass`, makes glass
*makeable*: sand won from a graded pit + the collier's ash + lime, fired
in the shipped kiln through the shipped `fire` verb, gathered on a
blowpipe and worked hot through a closing window, cracked off as a bottle
or a sheet, cut cold on a bench, set in the game's first authored window,
and re-melted as cullet that only ever goes greener. Four kernel seams
carry it — colour on `Light`, a firing that carries its charge, a salvage
branch for meltable non-metals, and a light-strike term on spoilage — and
every one of them has its first consumer inside this build. The build
runs **Stage A** (kernel, three waves, each independently landable) then
**Stage B** (the pack, the venue, the drive).

---

## Grounding

Everything below was opened and read on `design/glass` at `ba09d96b4`.

### What exists

| area | file | what it does today |
|---|---|---|
| glass material | `packages/content/base-library/content/stuff/idea/material/glass/glass.yaml` | `hardness: 550, toughness: 0.5`, tags `glass amorphous solid brittle`, `composition: []`. **No `meltingPoint`, no `latentHeatOfFusion`** — `MeltableMixin.getMeltingPointK()` (`lib/thermal/Meltable.ts:87`) reads `0`, so nothing made of glass can melt or re-melt. |
| batch materials | `…/material/earth/sand.yaml` (tags `granular solid earth`), `…/material/caustic/quicklime.yaml` (tags `mineral caustic alkali liming`), `packages/content/trade-fuel/content/stuff/idea/material/organic/ash.yaml` (tags `organic mineral residue`; **the collier's residue**). ⚠ `…/material/wood/ash.yaml` is the **ash tree's timber** — the "two ash rows" collision is a wood/residue name clash; the batch names `organic/ash` by a tag only it carries. |
| furnace | `packages/content/generic-objects/content/stuff/thing/Kiln.yaml` → `/stuff/thing/Kiln`, class `/platform/thing/Oven` (= `ContainerMixin(PlacingMixin(Firebox))` — a chamber), `burnTemperatureK: 1200`, `bellowsMultiplier: 1.25` (→ 1500 K held with the bellows), fuel reserve, `lit: false`. |
| the melt hook | `packages/server/src/mud/platform/idea/cmd/device/FireController.ts` — `fire <kiln>` reads the chamber, asks `RecipeCatalogue` which recipe the charge satisfies, holds the chamber for `FIRE_MS` (60 game-s) on an `attention` `ManualBuildStep`, then **clones `outputTemplate` into the kiln and destructs the consumed items**. ⚠⚠ Two facts the slate did not have: (1) `firingsFor` admits a recipe **only if every slot is `kind: item`** (`slots.some(s => s.kind !== 'item') → skip`, L203) — a mixed item+bulk batch recipe **cannot fire at all**; (2) `runFiring` carries **nothing** from the charge onto the output — not mass, not composition (L296–299 keeps a read "because a later recipe may want it" and uses it for nothing). |
| recipe shape | `packages/server/src/mud/lib/craft/Recipe.ts` — `inputSlots[].kind: 'item' \| 'bulk'`, `requiresHeatK`, `maxHeatK`, `holdS`, `outputApplication`, `outputResidue`, `difficulty`, `discipline`; exemplars `packages/content/trade-quarrying/content/recipes/burn-lime.yaml` (item → tangible via `fire`) and `packages/content/trade-brewing/content/recipes/lager-mash.yaml` (bulk → bulk via the craft path). The craft path (`CraftingLogic.ts:2339–2372`) matches item and bulk slots side by side; **the firing path does not.** |
| per-instance minor constituents | `packages/server/src/mud/lib/material/Alloyed.ts` — `AlloyedMixin`: `alloying: CompositionEntry[]` (`{materialPath, fraction}`), `fractionOf()`, `setFractionOf()`, `setAlloying()`, `getEffectiveComposition()`; composed on `Ingot`, `platform/thing/Casting.ts` (`AlloyedMixin(MeltableMixin(ThermalMixin(Good)))`) and smelting's `Bloom`. Its own header: *"the tin in a bronze is this field and not a second one."* This is the vehicle for the iron in a piece of glass. `ComposedMixin` (`lib/metabolism/Composed.ts`) is the **food** composition (servings) and composes on `Provision` only — not this build's. |
| salvage | `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:2752–2839` — `salvageImpl` flattens the **Material row's** `elementalComposition()` (never the instance's), yields `mass × fraction × crafting.salvageRate (0.5)`, branches `c.material.hasTag('metal')` → `/stuff/thing/Casting` else → `/stuff/thing/Scrap` (0.1 kg units); conservation asserted against `rate`. Glass today → half its mass as scrap, no iron history. |
| melt/freeze edge | `packages/server/src/mud/lib/thermal/Thermal.ts:1199–1236` — `reconcileMelt` → `doMelt` **destructs the solid first (L1226) and only then looks for a scope floor** (L1228); a Meltable inside a floorless `Container` (a kiln, an oven) **vanishes**. `reconcileBulkPhase` (L1245) freezes a pool into `mat.getCastTemplate()` (`Material.castTemplate`, L468, default `/stuff/thing/Casting`). `ThermalMixin.effectiveR()` is `protected` (L753) — a subclass may lengthen its own τ; `mediumConductivity()` reads `air = 0.026` (`BiomeLogic.ts:75`); `R_GEOMETRY_MEDIUM = 0.0075` (L106) tuned for an open mug. `setContentsTemperature(k)` (L652) is public and ungated; `heatSourceK()` (L980) pins a body IN or ON a lit, fuelled `Burner` at its held temperature — a pot in a lit kiln stays hot. |
| the colour halves | `packages/server/src/mud/lib/perception/Colour.ts` — transmittance `{r,g,b}`, `over()`, `atStrength()`, `static stack()`, `depth()`, `lightness()`, `nearestTag()`, `dimmed()`, `toHex()`; palette of 27 words = `DYE_COLOR_TAGS` (`@saxonberg/types`; the client maps them). **No `magenta`.** `packages/server/src/mud/platform/thing/Window.ts` — `colorTint: ColorTag` (L168–193) read **by nothing in production**; `baseTransmissivity` (L80); `transmissivity()` (L211) scalar; `canSeeThrough = transmissivity > 0` (L219). `packages/server/src/mud/lib/perception/Light.ts` — `{intensity, colorTemperature, sources}`; `add()` (L382) additive, flux-weighted temperature; `attenuate()` (L399) scalar; **no `Colour`**. `lib/material/Dyed.ts` is the per-instance colour exemplar (copies a transmittance triple onto the instance rather than looking a row up). ⚠ Its header claims a pack may hold no `lib/` — stale; `CLAUDE.md` and `content-packs.md § The capability rung` allow a pack `lib/`. |
| the light walk | `packages/server/src/mud/platform/idea/modalities/VisionModality.ts` — `FluxAccumulator {flux, sources}` (L50); `walkFluxAt` legs (a)–(e); leg (d) (L433–452) reads `conduit.transmissivity(otherSide, side)` and pushes `{sub, tau, area}`; `mergeCapped` (L536) scales and `mergeAttenuated` (L495) multiplies `flux` and each source by `tau`; `walkLight` (L95–110) builds the `Light` with `Light.from({intensity, colorTemperature, sources})`. `LightConduit` (`lib/boundary/Conduit.ts:46`) is a scalar interface. `LookController.ts:421–427` renders `LIGHT_BAND_PHRASE[band]` on its own `sense.survey` scene ahead of the room. |
| spoilage | `packages/server/src/mud/lib/material/Freshness.ts` — `Freshness.growthRate(material, tempK, water)` = `μ_max · f_T · f_aw`, `0` for an inert material (no `spoilActivationEnergy`); `advance()` (L452); `advanceFreshnessOverHost(host, …)` (L770) integrates over the HOLDER's temperature trajectory; the bulk gauge (`Freshness.load()`, L664) reconciles through `slot.getHolder()` — **the vessel**. ⚠ `trade-brewing`'s `ale.yaml` / `lager.yaml` (`ConsumableMaterial`) tabulate **no** `spoilActivationEnergy`: beer is inert to the microbial clock today. A multiplier on `μ` would therefore multiply zero. |
| activity | `packages/server/src/mud/api/scheduler.ts` — `Engagement` / `DurativeActivity` / `SustainedEngagement`, `ScheduledEmission`, `SchedulerApi.start/cancel/complete`; `lib/craft/ManualBuildStep.ts` (`{actor, slots, durationMs, onComplete, onAbort?, host?, effortW?}`); `platform/idea/cmd/crafting/ManualBuildController.ts` (`engageStep(ctx, {durationMs, effortW, beginSelf, beginPeers?, onComplete, onAbort?})`, `bestInstrument(model, cap)`, `paceMs`, `declineStep`). Pack exemplars: `packages/content/trade-fishing/src/lib/FishingEngagement.ts` (a pack-owned `SustainedEngagement` hosted by a tool, ticking on game time, completed by `SchedulerApi.complete(this)`), `lib/husbandry/OfferEngagement.ts` (lazy revalidation at `onComplete`). Lazy revalidation at the commit point is the framework's own doctrine (`docs/subsystems/activity.md § Pre-completion mid-flight validity`). |
| deposits | `packages/content/ground/src/idea/Deposit.ts` — `stratigraphy[]` (`{toZ, host, wins?}`), `lode` (a plane with `thickness`, `strikeExtent`, `dipExtent`, `gangue`, `halo?`), `zones[]` (`GradeBand {toZ, mineral, meanGrade, spread, alongFrom?, alongTo?}`), `sampleAt(at, seed) → GroundSample {hostPath, mineralPath, grade, …}` (seeded, never drawn), `seedFor(address)`. `packages/content/trade-quarrying/src/lib/Working.ts` — `OpenWorkingMixin`: the wall is the column; `mintWinnings` (L588) clones `band.wins`, restamps the host material, stamps chattel — **and consults no grade at all** (a quarry wins the host). Exemplar rows: `packages/content/rejection/content/world/terminus/rejection/idea/deposit/quarry-hill.yaml`, `…/quarry.yaml` (a zone naming its `deposit:`), `…/quarry/pit.yaml` (the `OpenWorking` row with `props:` tools and `spoilTo`). |
| readings | `packages/server/src/mud/lib/instrument/Reading.ts` — abstract singleton `Idea`; row fields `channel, kind, scope, subjectRequires, discipline, instrument, instrumentNoun, handTool, eyeCeiling, bench, improves, stakes`; hooks `analyze(ctx, target, band, handTool, param)` / `measure(…)` / `benchRead(…)`; `ReadingCatalogue` warms by class under the `/idea/reading/` infix. Pack exemplar: `packages/content/trade-mining/content/trade/mining/idea/reading/strike.yaml` + `src/idea/reading/StrikeReading.ts`. |
| affordances | A verb an object affords is a **static on its class**: `packages/content/trade-smithing/src/thing/Anvil.ts` (`commandContributions: {environment, peers}`), `trade-fishing/src/thing/Rod.ts` (`environment` = whoever holds it), `trade-quarrying/src/lib/Working.ts:270` (`self`/`inventory` for the ground you stand in). A row's `commandContributions:` is **dead** (memory: residences build). |
| packs | `packages/content/trade-quarrying/{pack.yaml,package.json,tsconfig.json,vitest.config.ts}` — the skeleton to copy; `packages/content/trade-fishing/content/settings/fishing.yaml` — a pack's dials (`settings` kind, merge-missing; every key has a seeded literal at the call site). Pack mixins declare `static _mixinName` + `static _mixinRefusal` (`trade-apiculture/src/lib/Colony.ts:149`) and are federated at discovery, so a view's `requires:` may name them. |
| archetypes | `packages/server/src/mud/lib/archetype/Archetype.ts:94–140` — `needs:` vocabulary `tool · heatK · bulkSource · surface · seating · coldStorage · rest · presence · lightLux · cultivation`; exemplars `trade-quarrying/content/archetypes/quarrying.yaml`, `trade-brewing/content/archetypes/brewhouse.yaml`. |
| the venue | `packages/content/rejection/` — ships no TypeScript; `world/terminus/rejection/hanging-wood.yaml` (a `CartesianZone`, the forestry wood: `hanging-wood/{ride,oak-clearing,hazel-cant,sugarbush,treeline}.yaml` on `/trade/forestry/location/Wood`), `location/fuel-yard.yaml` (outdoor, the clamp, four baskets of charcoal as a bounded prop, exits to `pithead-yard` and `smelter`), `idea/fuel-yard-business.yaml` (the `Business` row shape), `agent/collier.yaml`. `package.json` already depends on forestry, fuel, mining, quarrying, smelting, smithing, shopkeeping, transport. |
| verbs already claimed | `lint:verb-collisions` (allowlist with reasons; a fresh collision fails): **`score`** (`platform/cmd/social/score.yaml` — the profile card, afforded to everyone), **`blow`** (`world/terminus/university-avenue/cmd/blow.yaml` — a whistle, carried), **`gather`** (`trade/ranching/cmd/ranching/gather.yaml` — eggs), **`cut`** (tailoring). Unclaimed as of this grounding: `snap`, `shape`, `crack`, `groze`, `glaze`, `reheat`, `marver`, `break`. Not checked: `dip`, `scribe`, `flatten` — the builder runs the gate before the first view lands. |
| drive harness | `packages/wire/tests/extraction.dirty.wire.test.ts` — `declareFile({file, packs: […]})`, `Session`, `uniqueHandle`, `expectOk`, `engagementIdOf`; `.dirty.` for a drive that consumes what the world does not regenerate. |
| the clock | 12× (`docs/subsystems/time.md § Why 12×`): one real second is twelve game seconds; engagement timers and `ScheduledEmission`s run on game time. |

### What does NOT exist

- No glass trade, Discipline, glasshouse, blowpipe, pane, cullet, sand
  good (no row names `material/earth/sand` as a thing's material), sand
  deposit, or Window row anywhere in content.
- No `Colour` on `Light`; no per-channel transmittance on any conduit; no
  consumer of `Window.colorTint`.
- No way for a firing to carry mass or composition from its charge.
- No `light-sensitive` notion anywhere in spoilage.
- No `magenta` in the palette (the drive's wording); the arithmetic is
  asserted on channels, the prose uses the nearest palette word.
- No glow/incandescence vocabulary in `lib/thermal` or `lib/fire` — the
  hot-work watch narrates its own four bands.

### Where the requirements and the code disagree

1. **"Multi-slot recipes with a bulk output into a vessel and a residue
   already work"** — true of the *craft* path, false of the *firing* path
   the lime-burner's comment points at: `fire` admits item-only recipes
   and clones its output cold. The requirement's *product* claim (sand +
   ash + lime → glass at a furnace, by a recipe row) still holds; the
   plan reshapes the melt so it is **item-only in, a tangible "pot of
   melt" out**, and adds the one carry the firing path lacks (D3, D6).
2. **"Cullet widens the existing melt-down path"** — the branch is on
   `metal`, but the path also halves the mass and forgets the instance.
   Widening the branch alone would ship cullet at half mass with no iron
   history, violating two acceptance criteria. The widening is a branch
   with its own rate and a carry (D7).
3. **"Light-strike is a modifier on the existing spoilage rate"** — beer
   is inert to that rate (no `Ea`), so a multiplier multiplies zero, and
   authoring an `Ea` onto ale would make every keg in every bar go off in
   a game day and a half — a product change far outside this scope. The
   term is **additive** on the same gauge, gated by a material tag (D8).
   Still a modifier on the rate, still no new clock, still no new ledger.

None of these reopens product scope; each is an engineering placement.
No requirement is wrong.

---

## Plan-level decisions

**D1 — Where a glass object's colour lives (⭐⭐ host placement).**
*Question:* a bottle from dirty sand is green, from pure sand clear; two
bottles of one material differ. Where is that number?
*Choice:* the iron is a per-instance minor constituent — `AlloyedMixin`'s
`alloying: [{materialPath: '/stuff/idea/material/element/iron', fraction}]`
— on every glass **good** the trade mints (sand, the melt, the gather,
the bottle, the sheet) and on the kernel `Casting` cullet already composes
it. The **colour is derived, never stored**: a pack mixin
`TintedMixin` (`packages/content/trade-glass/src/lib/Tinted.ts`,
`/trade/glass/lib/Tinted`) reads `fractionOf(iron)` (and `carbon`, the
amber colourant) and answers `lightTransmittance(): Colour` by
Beer–Lambert per channel. No colour word is ever written to an instance.
*Reasoning:* `Alloyed` is the shipped vocabulary for "what is dissolved in
THIS piece" and its header names the frozen pool and bronze's tin as
members; `Composed` is food. A stored colour would be exactly the
decorative colour the immersion firewall forbids. The Dyed precedent
(copy a triple onto the instance) is rejected here because the triple is
a *function of the iron*, and the iron is what re-melting mixes.

**D2 — `Light` gains a `Colour`; emitters add, filters multiply.**
*Choice:* `Light.colour: Colour` (default `Colour.UNDYED`), normalised so
its largest channel is 1 (the hue; `intensity` stays the photometric
total). `Light.filter(c)` multiplies per channel and scales intensity by
the fraction passed; `Light.add()` mixes the two colours **flux-weighted
per channel** and re-normalises, so a red and a blue window on one room
give high-r, low-g, high-b on the floor. `colorTemperature` is untouched
and never conflated. The walk carries chroma through the pane
(`LightConduit.transmittanceColour?()`); `Window` answers it. See
§ Waves W0 for the exact signatures.

**D3 — The melt is a tangible "pot of molten glass", fired item-only.**
*Choice:* the batch recipe is three **item** slots (sand ×2 by tag
`silica`, ash ×1 by tag `potash`, quicklime ×1 by tag `alkali`) fired in
the kiln through the platform's `fire`; `outputTemplate` is
`/trade/glass/thing/melt` — a `Melt` (`Good` + `ThermalMixin` +
`AlloyedMixin`, **not** `Meltable`, **not** `Bulkable`) that is the pot
and its glass as one object, held at the kiln's temperature while it sits
in the lit chamber and stiffening when it is taken out. `dip` draws
gathers from it by mass; a cold melt refuses the pipe and is simply
re-fired with the remelt recipe. *Reasoning:* the firing path is
item-only and clones cold; making the melt bulk would need a bulk output
seam the firing path does not have and would route a cooling pot into
`reconcileBulkPhase`'s cast edge. One tangible with mass is honest (a
medieval pot *was* consumed with its campaign) and needs no new kernel
machinery beyond D6.

**D4 — The sand pit's grade uses the deposit's existing fields.**
*Choice:* the contaminant is the lode and it is everywhere: a flat-lying
lode as thick as the sand band (`dip: 0`, `thickness` = the band,
extents covering the pit, `gangue: sand`) with `zones` naming
`element/iron` at `meanGrade 0.004–0.012` and a **lateral window**
(`alongTo` / `alongFrom`) that makes the heart of the pit clean and its
fringe dirty. `sampleAt()` then answers `{mineralPath: iron, grade}` for
every cell with no change to `Deposit.ts`. The quarrying mint stamps that
sample onto a won unit that composes `Alloyed` (W3). *Reasoning:* "the
host itself has a grade" is representable as "a lode co-extensive with
the host" — a new shape, existing fields, which is the slate's own
phrase. Two `OpenWorking` rooms at two coordinates in one zone give the
drive its clean and dirty faces.

**D5 — glass melts at 1300 K; the working floor is derived, not a field.**
*Choice:* `glass.yaml` gains `meltingPoint: 1300` (the soda-lime
liquidus) and `latentHeatOfFusion: 150000`, with a comment that the mix
melts far below any of its parts (quartz's own row says the other half).
The batch recipe wants `requiresHeatK: 1400` (the reaction needs more
than the liquidus — the bellows), the remelt `1200` (cullet needs no
bellows: cheaper, observably). A gather is workable at or above
`glass.hotwork.workingFraction` (dial, 0.75) × the material's melting
point (≈ 975 K); a melt takes a gather at or above `0.9 ×` (≈ 1170 K).
*Reasoning:* no dead field — the smithing precedent gates heat on a
fraction of what the material already tabulates.

**D6 — The firing carries its charge (kernel).** *Choice:* `Recipe` gains
`massYield` (`0` = unauthored, byte-identical to today; `> 0` ⇒ the
output's mass is the consumed charge's summed mass × `massYield` ÷
batches), and `FireController.runFiring` merges the consumed items'
`alloying` onto an `Alloyed` output, mass-weighted, on top of whatever
the output row authored. `burn-lime` authors neither and is untouched.
*Reasoning:* conservation — a remelt that minted an authored mass from
any lump would counterfeit glass. The absent-means-as-before pattern is
the one `holdS` and `maxHeatK` already use.

**D7 — Salvage: meltable non-metals come back whole, and remember.**
*Choice:* in `salvageImpl`, `metal` → `Casting` at `salvageRate`
(unchanged); **else if the material's melting point is > 0** → `Casting`
at rate **1.0**, with the item's `alloying` copied onto the lump when
both compose `Alloyed`; else `Scrap` as today. The conservation assert
becomes per-branch. And `doMelt` checks for a scope floor **before**
destructing (a Meltable in a floorless container holds at its melting
point rather than vanishing — a pre-existing defect this build would
otherwise trip on the first cullet lump in a kiln). *Reasoning:* the
requirement decides glass pays its entropy in colour, not mass; "breaking
is not melting" is physically true of glass and wax alike, and the
one-way sink the doctrine protects is kept by D9. `crafting.md` gets the
sentence.

> ⚠ **W1 re-plan — the `doMelt` floor-guard sub-item was DROPPED.** The
> guard (hold a Meltable at its melting point when its container has no
> floor, rather than destruct) *broke the shipped Coolbox abstraction* —
> ice in an icebox is meant to melt away over its computed budget, the
> meltwater abstracted, not freeze forever at 273 K. And the premise was
> false: the glass build never trips passive `doMelt`. Cullet re-melts
> through the **`fire` recipe** (`remelt-cullet` consumes the cullet item
> and mints a `Melt`), not through thermal melting; and that recipe's
> kiln holds **1200 K, below glass's 1300 K melting point**, so a cullet
> `Casting` never passively melts in the first place. So the one-line
> `doMelt` change was reverted and its test removed; D6 (the carry) and
> the D7 salvage branch stand unchanged. The conservation ceiling for
> salvage is `massKg × the best branch rate used` (not Σ fraction×rate),
> which keeps the rigged-composition guard that a naïve per-constituent
> sum would have lost.

**D8 — Light-strike is an additive term on the spoilage rate, by tag.**
*Choice:* a material tagged `light-sensitive` (ale, lager — content tags
on `trade-brewing`'s rows; wine and oil may follow) gains a second rate
term `μ_light = freshness.lightStrike.ratePerHour × (lux / lux_ref) ×
t_blue`, where `lux` is the vision modality's signal at the holder's air
scope and `t_blue` is the **holder's** blue transmittance read through a
structural shape `LightFilter { lightTransmittance(): Colour }` (declared
beside `Colour`; the pack's `Tinted` and the kernel `Window` both answer
it; a holder that does not answer is opaque → `t_blue = 0`). `Freshness.
advance()` takes it as an optional `extraRatePerHour` added to a
non-negative microbial rate; the kill curve is unaffected. *Reasoning:*
see Grounding § disagreement 3. Photochemistry lives in the blue, which is
why brown protects and clear does not, derivably.

**D9 — Cullet goes greener by mixing and by the pot.** *Choice:* remelting
merges alloying by mass (D6) — mixed cullet can never be cleaner than its
cleanest input — **and** every firing into a `Melt` adds the pot's own
iron: `Melt` composes `onCreate`-side nothing; instead the remelt and
batch recipes' output rows author `alloying: [{iron, glass.pot.ironPickup}]`
(0.0005), which D6 merges on top of the charge. So a single clean piece
re-melted alone still comes back one step greener. *Reasoning:* the
requirement's arrow must hold for one piece, not only for a mixed bin;
pot corrosion adding iron per campaign is real; it is a row value, not
code. (Decolorisers — manganese — are the arrow's twin and are a
follow-on.)

**D10 — The hot-work window (⭐⭐ the one new mechanism).** *Choice:* two
engagements over one decaying fact, and the fact is Thermal cooling:

- A `Gather` (`/trade/glass/thing/Gather`: `Good` + `ThermalMixin` +
  `AlloyedMixin`, fields `form` and `massKg` via Tangible) cools by the
  kernel's own Newton drift the moment it leaves the pot. `isWorkable()`
  = `getTemperature() ≥ workingFloorK()`. `Gather` overrides the
  protected `effectiveR()` by `glass.hotwork.gatherRFactor` (dial, 10)
  so a 0.4 kg blob's τ lands near 1000 game-s: from 1450 K to the 975 K
  floor in ≈ 470 game-s ≈ **40 real seconds**. (The lumped `R_GEOMETRY`
  is tuned for an open mug; a compact blob on a pipe loses heat slower
  per kilogram, and the factor is the playtest dial for "you have
  seconds".)
- `HotWorkWatch` (`/trade/glass/lib/HotWork.ts`, a `SustainedEngagement`,
  type `glasswork`, slots `['attention']`, `getHost()` = the blowpipe,
  one `ScheduledEmission` every `glass.hotwork.tickGameS` (45 game-s))
  is started by `dip`. Each tick reads the gather's temperature and
  narrates a **band crossing** only (white-hot → yellow → orange → "the
  glow is going; it is stiffening"). When the temperature falls below the
  floor the piece is **lost**: the gather is converted to cullet (a
  `/stuff/thing/Casting` of glass, full mass, alloying copied), the loss
  is narrated, a `glasswork` failure deed is credited, and the watch
  completes itself (`SchedulerApi.complete(this)`). `cancel glasswork`
  stops the watching, not the cooling — the lump stays on the pipe.
- Every hot act (`shape`, `reheat`, `crack`) is a `ManualBuildStep` on
  `hands` (via `ManualBuildController.engageStep`, host = the gather)
  whose `onComplete` **re-validates `isWorkable()` at the commit point**
  and, if the gather has gone past working during the step, does the
  same lose-it conversion. That is the framework's lazy-revalidation
  doctrine applied to a precondition that decays continuously.
- `reheat` (at a lit, fuelled `Burner` bound as a declared arg) is a
  short step whose completion sets the gather to the furnace's held
  temperature (`setContentsTemperature`), re-opening the window.

*Reasoning:* nothing new is invented for time — the gather's clock is
the thermal substrate every object already runs, read at the two moments
the activity framework already defines (a tick, a commit). The product
fact "you have seconds" is one dial.

**D11 — The verb names, after the collision gate.** `gather`, `blow`,
`score` and `cut` are claimed. The trade's eight views are: hot shop
**`dip`** (a gather; help says glassmakers call it a gather) ·
**`shape <bottle|cylinder>`** (the blow and the jacks in one durative
step) · **`reheat`** · **`crack`** (crack off the pipe — a formed hot
gather becomes its product, anything else becomes cullet); cold shop
**`scribe`** (score a line — a sheet, or a cylinder for flattening) ·
**`snap`** (part a scribed sheet in two) · **`groze`** (nibble an edge) ·
**`flatten`** (a scribed cylinder at a lit furnace → a pane) ·
**`glaze <pane> in <window>`**. All nine were checked against every
`verbs:` line in content at plan time and are unclaimed (`ladle` /
`etch` / `spread` are the recorded fallbacks should something land on
master first). The builder still runs `lint:verb-collisions` before the
first view lands. **Never a new allowlist line.**

**D12 — `glasswork`, one Discipline, rostered id 0722.**
`/trade/glass/idea/Discipline/glasswork`, `iscedf: "0722"`, credited by
the recipes (`discipline: glasswork`), the hot steps (standard; a lost
piece is a failure deed — a bad blow costs fuel, not material) and the
cold steps (easy).

**D13 — The first Window rows are the venue's, and the glaze act copies.**
`Window` gains three persistent scalars `glazeR/G/B` (`null` = unglazed)
with `setGlazing(colour | null)` / `getGlazing()`, and
`lightTransmittance()` = glazing ?? `Colour.fromTag(colorTint)` ??
`UNDYED`. `glaze` copies the pane's transmittance onto the window and
consumes the pane. Two rows in Rejection connect the new glazier's hut to
two sunlit yards so the drive's second colour is a second window on the
same room. *Reasoning:* a window is not an alloy; it remembers the glass
it was given (the Dyed copy pattern), and `colorTint` — the ordinary
authored case the slate names — is finally read.

**D14 — Where the first glasshouse lives.** Rejection: the furnace in a
clearing of the Hanging Wood (fuel-bound, outside the walls — the LULU
reading in prose), the sand pit as its own small zone off the ride (two
faces), and the cold bench in a hut between the fuel yard and the pithead
yard (in town, by the customer). The venue pack already depends on the
quarrying trade and ships no code; it gains a dependency on
`trade-glass`. A second glasshouse is a copy of these rows.

**D15 — Amber is a second batch, not a second mechanism.** A
`glass-batch-amber` recipe adds charcoal (tag `charcoal`, trade-fuel's)
and outputs `/trade/glass/thing/amber-melt`, whose row authors
`alloying: [{carbon, 0.003}, {iron, pickup}]`; `Tinted` folds a carbon
term that absorbs blue hard. Brown bottles for the beer step come from
the batch, never from a colour word.

**D16 — The `lint:lib-statics` ceiling rises by 2 (build-time).** W0
adds two statics to the `Colour` value object — `fromTag` (palette word
→ transmittance position) and `normalised` (a Colour from raw, unclamped
channel sums). *Caller audit:* both are construction/lookup OF the type
(the gate's own documented "belongs here as a value-static" category),
not world logic — `fromTag` serves `Window.lightTransmittance`,
`normalised` serves the light walk and `Light.add`. A `*Logic` singleton
or an Api would be the wrong home for a value-object factory. So the
ceiling moves 337 → 339 with the audit written at the constant, and the
ratchet still only falls from there. *(Decided per the build contract,
lens-free: a convention adjustment with a recorded audit, not a scope
change.)*

---

## ⭐⭐ Host placement

Every new field, mixin and class, its host, and what composing it claims
of everything else on that host. The test throughout: *if a guard has to
re-narrow the host set, the host is wrong.*

| what | host | what composing it claims | guard needed? |
|---|---|---|---|
| `Light.colour: Colour` | the `Light` value object (kernel) | every light has a hue, white by default — true of sunlight, a lamp (`colorTemperature` stays its own axis) and spill through a pane | none |
| `LightConduit.transmittanceColour?(from, to)` | the conduit **interface** (optional method) | a boundary *may* colour what passes; a `Door` answers nothing and the walk reads `UNDYED` | none |
| `Window.glazeR/G/B` + `setGlazing` + `lightTransmittance()` | `platform/thing/Window` (kernel) | every window may have been glazed with coloured glass — the class already claimed exactly this with `colorTint` | none |
| `LightFilter { lightTransmittance(): Colour }` | a structural interface beside `Colour` (kernel); answered by `Window` and by the pack's `Tinted` | nothing — a shape, not a mixin; whoever answers it is a filter | none (duck-typed probe, the `TravelNode` precedent) |
| `Recipe.massYield` | `lib/craft/Recipe` (kernel data) | a recipe *may* state what fraction of its charge comes out; absent = as before | none |
| the firing carry (mass + alloying merge) | `FireController.runFiring` (kernel) | an `Alloyed` output inherits its charge's minor constituents; a `Tangible` output under an authored `massYield` inherits its charge's mass | the two `isAlloyed`/`massYield` tests are *feature* tests, not host re-narrowing |
| the meltable-non-metal salvage branch | `CraftingLogic.salvageImpl` (kernel) | a material with a melting point and no `metal` tag comes back whole as a `Casting` carrying the piece's alloying | none (a material-property branch beside the existing one) |
| `Freshness.advance(…, extraRatePerHour)` + the `light-sensitive` tag read | `lib/material/Freshness` (kernel); the tag on `trade-brewing`'s ale/lager rows | a material may spoil under light; a holder may filter it | none — a holder that is not a `LightFilter` is opaque, which is the honest default for a keg |
| `TintedMixin` (`lightTransmittance`, `getColour`, `colourBand`, an augmenter) | **the pack's `lib/`**, composed on `GlassBottle` and `Sheet` only | a glass good's colour is a function of its alloying; its composers are all glass by construction | ⚠ **deliberately NOT on kernel `Vessel`/`Bottle`/`Thing`** — a clay pot or a steel flask would need a "is it glass?" guard, which is the tell. Composers share one pack ancestor ⇒ pack `lib/`, not kernel. |
| `AlloyedMixin` on `Sand`, `Melt`, `Gather`, `GlassBottle`, `Sheet` (pack classes) | each pack class | "this piece can say how its minor constituents came out" — true of every one | none |
| `Sand` (`AlloyedMixin(Good)`) | `/trade/glass/thing/Sand` | a won load of sand carries its assay | none |
| `Melt` (`AlloyedMixin(ThermalMixin(Good))`, `isFluid()`, `takeGather(kg)`) | `/trade/glass/thing/Melt` | a pot of glass has a temperature and a composition and is not itself a liquid pool (not `Bulkable`, not `Meltable` — D3) | none |
| `Gather` (`AlloyedMixin(ThermalMixin(Good))`, `form`, `isWorkable()`, `effectiveR()` override) | `/trade/glass/thing/Gather` | a blob on a pipe cools and has a form | none |
| `Blowpipe` (`ContainerMixin(Tool)`, capability `blowpipe`, `commandContributions.environment` = dip/shape/reheat/crack) | `/trade/glass/thing/Blowpipe` | a pipe holds one gather and affords the hot shop to whoever holds it | none |
| `GlassBottle` (`TintedMixin(AlloyedMixin(Bottle))`, `thicknessFactor 1.0`) | `/trade/glass/thing/GlassBottle` over kernel `platform/thing/Bottle` | a bottle the trade blew is tinted by its sand and holds liquid like any bottle (`VesselKind` category `bottle` keeps the empties census honest) | none |
| `Sheet` (`TintedMixin(AlloyedMixin(Good))`, `form: 'cylinder' \| 'pane'`, `scribed`, `thicknessFactor 0.5`; affords `glaze` when `form = pane`) | `/trade/glass/thing/Sheet` (rows `cylinder`, `pane`) | flat glass is tinted, scribable, and a pane can be set | the `form` test inside `glaze` is the verb reading its own field, not a host narrowing |
| `ScribingWheel` / `GrozingPliers` (`Tool` subclasses, capabilities `scribing` / `grozing`; affordances scribe+snap+flatten / groze+`platform/cmd/crafting/salvage.yaml`) | `/trade/glass/thing/…` | the cold shop's instruments afford its acts (the Anvil pattern) | none |
| `HotWorkWatch` | `/trade/glass/lib/HotWork.ts` (pack `lib/`, a plain class — not a Stuff) | n/a | n/a |
| `IronReading` | `/trade/glass/idea/reading/IronReading` (pack Reading subclass; row `…/reading/iron`) | `analyze iron <thing>` on anything `Alloyed` | `subjectRequires: [AlloyedMixin]` is the Reading's own contract |
| the quarry assay stamp | `trade-quarrying/src/lib/Working.ts#mintWinnings` | a won unit that composes `Alloyed` remembers the sample at the face | the `isAlloyed(thing)` test is the feature, not a narrowing: a block of granite composes nothing and is stamped nothing |
| `cullet` | **no new class** — `/stuff/thing/Casting` of material glass, minted by the lost gather, the moil, `crack` of an unformed/cold gather, and kernel `salvage` | a lump of glass is a casting that re-melts, exactly like a lump of iron | none |

Deliberately **not** done, and why: no `Tinted` on kernel `Vessel`
(above); no colour field on `Material` (the fibre-colour wish in `Dyed`
is a different build); no `Composed` on anything here (food's); no new
`Reading` on the kernel; no pack Api, logic singleton or free helper.

---

## Convention conformance

- **Path pattern** `<root>/<branch>/`: pack root `/trade/glass`; classes
  at `/trade/glass/thing/*`, `/trade/glass/idea/reading/*`,
  `/trade/glass/idea/cmd/glass/*Controller`; views at
  `/trade/glass/cmd/glass/*.yaml` (one category `glass` — the
  `trade/<x>/cmd/<category>/` shape fishing and smithing use); rows at
  `/trade/glass/thing/*`, `/trade/glass/idea/Discipline/glasswork`,
  `/trade/glass/idea/reading/iron`; archetypes at
  `content/archetypes/{glasshouse,cold-bench}.yaml`; recipes at
  `content/recipes/*.yaml`; dials at `content/settings/glass.yaml`.
  Pack `lib/` at `src/lib/{Tinted,HotWork}.ts` (`/trade/glass/lib/*`,
  never instanced).
- **Module scope declares; lifecycles initialize.** No module-scope
  statements; the pack mixin registers at discovery by its static.
- **Import boundary:** pack code imports the kernel by package specifier
  only (`@saxonberg/server/mud/lib/…`, `…/api/…`,
  `…/platform/thing/Bottle`, `…/platform/thing/Window`,
  `…/platform/idea/cmd/crafting/ManualBuildController`); the venue pack
  imports nothing. Pack controllers write absolute `FromModule` strings
  if they gate anything.
- **Verbs live on objects:** `isWorkable()`, `takeGather()`,
  `lightTransmittance()`, `setGlazing()` are methods; `SchedulerApi`
  stays the orchestrator (doctrine-exempt).
- **`props:` / `cast:`** on the venue rows; affordances are **statics on
  classes**; locations are `SingletonCartesianLocation` /
  `OpenWorking`, never "rooms".
- **Scalar-default persistence:** `Window.glazeR/G/B` three scalars,
  `Gather.form` a string, no structured field without a marshaller.
- **Boolean field/getter naming:** `scribed` / `isScribed()`.
- **Mongo:** no new collection; no migration (a renamed row is a dropped
  dev DB).
- **The lint gates this build must satisfy** (`pnpm -C packages/server
  lint:family`, every gate; the ones it will *exercise*):
  `lint:verb-collisions` (D11), `lint:capabilities` (`blowpipe`,
  `scribing`, `grozing` each minted by a view's instrument arg and the
  archetypes), `lint:instrument-args` (the furnace, the pipe, the wheel
  and the window are **declared args**, never hunted), `lint:arg-kinds`,
  `lint:binder-models`, `lint:controller-rows`, `lint:instanceable`
  (pack `lib/` modules only inherited; every `src/` class named by a
  row), `lint:gates`, `lint:imports` (the pack tier), `lint:module-scope`,
  `lint:field-meta`, `lint:mixin-names` (`TintedMixin` unique),
  `lint:lib-statics` (no new statics in `lib/`), `lint:object-verbs`
  (census stays zero), `lint:unconsumed-seams` (`massYield` is read by
  `FireController`; `glazeR/G/B` by `lightTransmittance`),
  `lint:light-sources` (the glazier's hut is lit by boundary spill — a
  named source — and authors no ambient; the kiln row authors `lit:`),
  `lint:untitled` (the new sand-pit zone sits under Rejection's extent),
  `lint:mass` (every new thing row authors a mass), `lint:authored-prose`,
  `lint:ground`, `lint:perishable` (unchanged: no `Ea` is added),
  `lint:test-bootstrap`, `lint:test-content`, `lint:drive-scripts`
  (the drive is a wire file, never a script).

---

## Waves

Each wave ends at one commit and is landable alone. Stage A is kernel;
Stage B is the pack, the venue, the drive.

### Stage A

#### W0 — Colour on Light (kernel) · `build(glass W0): Colour on Light — a pane colours what passes through it` ✅ DONE

> **Built.** `Colour.fromTag`/`normalised`/`normalise` + `LightFilter`
> interface; `Light.colour` (ctor/of/from/toJSON), `filter` (multiply),
> `add` (flux-weighted colour mix), `attenuate`/`withColour` keep hue;
> `LightConduit.transmittanceColour?`; `Window.glazeR/G/B` +
> `setGlazing`/`getGlazing`/`lightTransmittance` + the conduit wrapper;
> the vision walk threads `chroma` (flux-weighted per-channel sums,
> white-direct, multiplied through a coloured pane), `walkLight`
> normalises it onto the Light; `LookController` emits the tint line
> gated on `light.tintLegibleAt` (dial added, default 0.25).
> Tests: Colour (fromTag/normalise), Light (filter/add/attenuate/ZERO/
> toJSON), Window (glaze wins over tint, shut = white, conduit colour),
> and two walk tests in `Window.integration` (a red pane MULTIPLIES, a
> red + a blue window ADD to magenta). 69 perception/window tests + 55
> modality tests green; server tsc clean; `lint:family` green.
> **Decision recorded (D16):** `lint:lib-statics` ceiling 337 → 339 for
> the two type-level `Colour` statics (`fromTag`, `normalised`) — a
> caller-audited value-object factory/lookup, the category the gate
> documents as belonging on the value object; an Api home would be
> wrong. Rationale written inline at the ceiling constant.

**Goal.** Light carries a hue; a boundary may colour what it passes; the
walk multiplies through a pane and adds across panes; `look` says so.

**Files.**
- `packages/server/src/mud/lib/perception/Colour.ts` — add
  `static fromTag(tag: ColorTag): Colour | null` (the palette entry as a
  transmittance triple; `null` for an unknown word) and `static
  normalised(r,g,b)`/`normalise(): Colour` (divide by the max channel;
  `UNDYED` for all-zero); export `interface LightFilter {
  lightTransmittance(): Colour }`.
- `packages/server/src/mud/lib/perception/Light.ts` — `readonly colour:
  Colour`; `Light.of(intensity, colorTemperature?, source?, colour?)`;
  `LightDataShape.colour?: Colour`; `Light.ZERO.colour = UNDYED`;
  `filter(c: Colour): Light` (new colour = `this.colour.over(c)`
  normalised; intensity × `(over.lightness() / this.colour.lightness())`;
  sources scaled by the same factor); `withColour(c)`; `add()` mixes
  colours as `(this.colour × I₁ + other.colour × I₂)` per channel then
  normalises; `attenuate()` keeps the colour; `toJSON()` adds
  `colour: hex`.
- `packages/server/src/mud/lib/boundary/Conduit.ts` — `LightConduit.
  transmittanceColour?(from, to): Colour` (optional; absent = white).
- `packages/server/src/mud/platform/thing/Window.ts` — fields
  `glazeR/glazeG/glazeB: number | null` (persistent, not authorable —
  the glaze act writes them; `colorTint` stays the authorable word);
  `getGlazing(): Colour | null`, `setGlazing(c: Colour | null)`,
  `lightTransmittance(): Colour` (glazing ?? `Colour.fromTag(colorTint)`
  ?? `UNDYED`; `UNDYED` when shut); `lightConduitFor` adds
  `transmittanceColour` → `window.lightTransmittance()`; the header
  comment's *"Atmospheric only; does not propagate"* is deleted.
- `packages/server/src/mud/platform/idea/modalities/VisionModality.ts` —
  `FluxAccumulator` gains `chroma: {r,g,b}` (flux-weighted sums; a white
  contribution adds `flux` to each); `addContribution` writes it; leg (d)
  reads `conduit.transmittanceColour?.(otherSide, side) ?? UNDYED` and
  pushes it with the spill; `mergeAttenuated(parent, sub, tau, colour)`
  multiplies `chroma` per channel by `tau × colour` and adds; `flux`
  through a coloured pane becomes the mean of the three; `walkLight`
  passes `colour: Colour.normalised(chroma)` into `Light.from`.
- `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
  (L421 region) — after the band phrase, when `signal.colour.depth() ≥
  light.tintLegibleAt` (kernel dial, default 0.25) and the band is not
  too dark to describe: one `sense.survey` line, *"The light here comes
  &lt;tag&gt;-tinted through the glass and lies &lt;tag&gt; on the floor."*
  with `nearestTag()`.
- `packages/content/platform/content/settings/light.yaml` (or wherever
  the light dials live — the builder locates `lightLux`'s siblings) —
  `light.tintLegibleAt: "0.25"`.
- Tests: `lib/perception/__tests__/Light.test.ts` (filter, add-mixes-to-
  high-r-high-b, attenuate keeps colour, ZERO), `Colour.test.ts`
  (`fromTag`, `normalise`), `platform/thing/__tests__/Window.test.ts`
  (glazing wins over tint; shut window is white and dark), and a walk
  test in `VisionModality`'s suite: two synthetic rooms, a red window and
  a blue window onto one room, assert `colour.r > 0.8`, `colour.b >
  0.8`, `colour.g < 0.3`, and that a single red pane multiplies (g, b
  fall) rather than adds.

**Acceptance.** `pnpm test:near` green; `lint:family` green; the two-
window test proves add-not-multiply across panes and multiply-not-add
through one. No content row changed. Nothing in the world is yet tinted
(the first consumer lands in W7) — the kernel seam has a kernel test as
its first exerciser and the venue rows as its first *authored* consumer,
both inside this build.

#### W1 — The firing carries its charge; salvage returns a meltable whole (kernel) · `build(glass W1): a firing carries its charge; a meltable non-metal salvages whole` ✅ DONE

> **Built.** `Recipe.massYield` (field + `getMassYield` + fromData
> `[0,1]` validation + toData); `FireController.runFiring` carries the
> charge — sets the output mass from `Σ consumed × yield ÷ batches`
> when `massYield > 0 && isTangible`, and merges the charge's `alloying`
> (mass-weighted) onto an `isAlloyed` output on top of the row's own; the
> dead "first slot material" read is gone. `CraftingLogic.salvageImpl`
> gains the meltable-non-metal branch (melting point > 0, no `metal` tag
> → a whole `Casting` at rate 1.0 carrying the piece's alloying), and the
> conservation ceiling is now `massKg × max branch rate used` (keeps the
> rigged-fraction guard). `crafting.md` updated.
> **Re-plan:** the `doMelt` floor-guard sub-item was dropped (see D7
> note above) — it broke the Coolbox melt-away abstraction and the glass
> build never trips passive `doMelt`. Tests: Recipe.schema (massYield
> default/validate/round-trip), FireController carry (mass override,
> mass-weighted alloying merge, unauthored keeps template mass),
> salvage (glass comes back whole + remembers iron). 41 thermal/craft/
> salvage tests green; server tsc clean.

**Goal.** D6 and the D7 salvage branch. *(The `doMelt` floor guard was
dropped in W1 — see the D7 re-plan note.)*

**Files.**
- `packages/server/src/mud/lib/craft/Recipe.ts` — `massYield: number =
  0` (`fieldMeta` persistent, spoiler 1), `fromData` validates `0 ≤ v ≤
  1`, `toData`, `getMassYield()`.
- `packages/server/src/mud/platform/idea/cmd/device/FireController.ts` —
  in `runFiring`, after each clone: if `recipe.getMassYield() > 0` and
  `isTangible(made)`: `made.setMass(Σ consumed mass × yield / batches)`;
  if `isAlloyed(made)`: `made.setAlloying([...made.getAlloying(),
  ...mergedCharge])` where `mergedCharge` = for each consumed item that
  `isAlloyed`, each entry × (item mass / Σ consumed mass). The dead
  "material of the first slot" read (L296–299) is replaced by this
  comment. ⚠ A unit test proves `burn-lime` output mass is unchanged
  (no `massYield`).
- `packages/server/src/mud/platform/idea/api/CraftingLogic.ts` —
  `salvageImpl`: the three-way branch of D7; `recoveredKg` asserted
  against `massKg × max(rate, meltableRate)` per branch; the lump gets
  `setAlloying(item.getAlloying())` when both are `Alloyed`;
  `crafting.md § salvage` gains the sentence *"a meltable non-metal
  (glass, wax) comes back whole and pays its entropy elsewhere"*.
- `packages/server/src/mud/lib/thermal/Thermal.ts` — `doMelt`: resolve
  the scope floor **first**; with no floor, return without destructing
  (the solid holds at its melting point — the plateau keeps clamping it).
  One test: a Meltable in a floorless `Container` above its melting
  point still exists after `reconcilePhase()`.
- Tests beside each.

**Acceptance.** `test:near` + `lint:family` green; `lint:unconsumed-
seams` sees `massYield` read; the extraction wire test's lime step is
unaffected (its row authors no yield).

#### W2 — Light-strike (kernel + two content tags) · `build(glass W2): light-strike — a light-sensitive material spoils under the light its vessel lets in` ✅ DONE

> **Built.** `Freshness.advance` gains `extraRatePerHour` (added to a
> non-negative μ; the kill curve ignores it), so a `light-sensitive`
> material with no `Ea` still spoils under light. The module function
> `lightStrikeRatePerHour(holder, material)` computes
> `ratePerHour × min(lux/refLux, 1) × blueTransmittance`, gated on the
> material's `light-sensitive` tag AND the holder answering the
> `LightFilter` duck-probe (opaque holders → 0); lux is `vision.signalAt`
> at the holder's enclosing container scope. `advanceFreshnessOverHost`
> samples it ONCE per reconcile and applies it across every thermal
> sub-step. Two dials + two `AppSettingKeys`; `light-sensitive` tag on
> `ale`/`lager` (no `Ea` added → `lint:perishable` untouched). `spoilage.md`
> documents the third driver + the once-per-reconcile limit.
> **Decision (follows the plan's own precedent):** `lightStrikeRatePerHour`
> is a MODULE FUNCTION, not the `static` D8 named — the `lint:lib-statics`
> ceiling is held (the `advanceFreshnessOverHost` pattern), so W0's +2 is
> the only rise. Tests: `advance` drives an inert material via the extra
> rate, a brown holder (b≈0.17) spoils far slower than a clear one, and
> the thermal-death curve is untouched. 26 freshness tests green.
> The full tag·filter·lux·blue gating integration lands with `GlassBottle`
> in W4 and the beer-in-the-yard drive step in W8 (per the plan's
> first-consumer staging).

**Goal.** D8.

**Files.**
- `packages/server/src/mud/lib/material/Freshness.ts` — `advance(load,
  elapsedS, material, tempK, water, extraRatePerHour = 0)` adds the extra
  to a non-negative `μ`; `static lightStrikeRatePerHour(holder: Stuff |
  null, material: Material | null): number` — `0` unless
  `material.hasTag('light-sensitive')` and the holder answers
  `LightFilter` (duck probe: `typeof holder.lightTransmittance ===
  'function'`); reads the holder's air scope (`getEnclosingScope()`
  walk, the `airScopeOf` shape) and the vision modality's `signalAt`
  (the archetype's `lightLux` read is the precedent for reaching the
  modality from `lib/`), then `dial('freshness.lightStrike.ratePerHour',
  30) × min(lux / dial('freshness.lightStrike.referenceLux', 50000), 1) ×
  colour.b`; `advanceFreshnessOverHost` passes it to each stretch
  (sampled once at reconcile — stated as a limit in `spoilage.md`).
  `AppSettingKeys` gains the two keys; the platform settings file gains
  the two dials.
- `packages/content/trade-brewing/content/trade/brewing/idea/material/ale.yaml`
  and `lager.yaml` — tag `light-sensitive` appended (a one-tag content
  edit; `lint:perishable` is untouched because no `Ea` is added).
- `docs/subsystems/spoilage.md` — the third driver, its tag, the
  holder-shape seam, the once-per-reconcile sampling limit.
- Tests: `Freshness.test.ts` — an inert material with the tag in a clear
  filter at 50 klux reaches `tainted` inside 15 game-minutes; the same at
  `b = 0.17` takes > 1 game-hour; an opaque holder (no probe) is
  unchanged; the kill curve ignores the term.

**Acceptance.** `test:near` + `lint:family` green. The first consumer
(the pack's `GlassBottle`) lands in W4; the kernel `Window` already
answers the shape, which is how the test exercises it.

### Stage B

#### W3 — Content fields and the quarry's assay stamp · `build(glass W3): glass melts; sand and ash answer the batch; a won load remembers its assay` ✅ DONE

> **Built.** `glass.yaml` gains `meltingPoint: 1300` + `latentHeatOfFusion:
> 150000` (with the soda-lime comment); `sand.yaml` tagged `silica`;
> `organic/ash.yaml` tagged `potash` (the collier's residue, not the ash
> tree's timber). `trade-quarrying`'s `OpenWorkingMixin.mintWinnings`
> stamps the deposit's `sampleAt` mineral+grade onto any `isAlloyed` won
> good (a new `stampAssay` instance method — not a static, ceiling held),
> seeded by the covering locality's address with a try/catch fallback to
> the base seed so the win never fails on an unaddressed/unmocked ground.
> `mining.md` documents it. Tests: two in `OpenWorking.test.ts` — a won
> Alloyed sand carries the deposit's iron grade; grade-0 ground stamps
> nothing. 72 quarrying tests green.



**Files.**
- `packages/content/base-library/content/stuff/idea/material/glass/glass.yaml`
  — `meltingPoint: 1300`, `latentHeatOfFusion: 150000`, a comment
  quoting steel's *alloying is not averaging* and quartz's own line.
- `…/material/earth/sand.yaml` — tag `silica` appended.
- `packages/content/trade-fuel/content/stuff/idea/material/organic/ash.yaml`
  — tag `potash` appended (the batch's flux; `wood/ash` is a timber).
- `packages/content/trade-quarrying/src/lib/Working.ts` — `mintWinnings`:
  after the material restamp, if `MixinApi.isAlloyed(thing)` and the
  deposit resolves, sample `deposit.sampleAt([x, y, −floor − half the
  band], Deposit.seedFor(address))` (metres from the room's `coords` ×
  the zone's `cellSize`, the mining `SurveyReading.metresAt`/`seedAt`
  reads copied) and `thing.setAlloying([{materialPath: sample.
  mineralPath, fraction: sample.grade}])` when `grade > 0`. A pack
  test with a synthetic deposit and a synthetic Alloyed row.
- `docs/subsystems/mining.md` or the quarrying section it holds — one
  paragraph: *a won unit that can remember its assay does.*

**Acceptance.** quarrying's pack suite green; `lint:family` green; the
extraction wire test still passes (its won rows compose no `Alloyed` and
are stamped nothing).

#### W4 — The pack: matter, recipes, the Discipline, dials, archetypes, the reading · `build(glass W4): trade-glass — sand, melt, gather, bottle, sheet; the batch and the remelt; glasswork` ✅ DONE

> **Built.** The `trade-glass` pack: skeleton (pack.yaml/package.json/
> tsconfig/vitest/README), enlisted in the root deployment manifest.
> `src/lib/Tinted.ts` (`TintedMixin` — colour derived from iron/carbon by
> Beer–Lambert, `colourBand`, the gated augmenter); thing classes `Sand`,
> `Melt` (isFluid/takeGather), `Gather` (isWorkable/workingFloorK/
> `effectiveR` ×dial), `Blowpipe`, `GlassBottle`, `Sheet` (form/scribed/
> thin), `ScribingWheel`, `GrozingPliers`; `IronReading` + row. Rows:
> sand/melt/amber-melt/gather/blowpipe/bottle/cylinder/pane/scribing-wheel/
> grozing-pliers/marver; recipes glass-batch (0.72)/amber/remelt-cullet
> (1.0); `glasswork` Discipline; `glass.yaml` dials; glasshouse + cold-bench
> archetypes. Content tag edit: `charcoal` on trade-fuel's charcoal (the
> amber colourant, specific so coal doesn't stand in).
> **Decisions:** (a) the affordance `commandContributions` on Blowpipe/
> Sheet/wheel/pliers are deferred to W5/W6 (when their views exist) so W4
> lands with no dangling view refs — the archetype slots satisfy
> `lint:capabilities` for `blowpipe`/`scribing`/`grozing` meanwhile, as
> the plan anticipated. (b) `fieldMeta` is declared plain `static` (NOT
> `static override`): the `check-instanceable-placement` parser's regex
> matches `static [readonly] fieldMeta` only, so `override` hid `form`
> and tripped the orphan-key ratchet (393) — found and fixed. (c) No
> standalone IronReading unit test — its behavior (`analyze iron` band +
> figure) is the W8 drive's step 2 over the same code path, and the row
> is lint-validated; a stubbed Reading-dispatch unit would test the same
> path. Pack suite 14 green (Tinted colour arithmetic, Melt fluid/
> takeGather, Gather τ≈10× + workable floor, recipes parse/shape); pack
> tsc clean; `lint:family` green (instanceable/capabilities/mass/
> mixin-names/field-meta all pass).



**Files (all under `packages/content/trade-glass/`).**
- `pack.yaml` (`id: trade-glass`, `root: /trade/glass`, `requires.title:
  [{extent: /trade/glass, holder: {organization: /compact/trade}}]` —
  the quarrying precedent for a placeless trade), `package.json`
  (`@saxonberg/content-trade-glass`; deps: platform, base-library,
  generic-objects, ground, trade-quarrying, trade-fuel, server, types),
  `tsconfig.json`, `vitest.config.ts` (copies of quarrying's),
  `README.md`.
- `src/lib/Tinted.ts` — `TintedMixin` (`_mixinName = 'TintedMixin'`,
  `_mixinRefusal = '{} is not a piece of glass'`), requires an `Alloyed`
  host: `lightTransmittance(): Colour` = per channel
  `exp(−(k_c^iron · Fe% + k_c^carbon · C%) · thicknessFactor())`, dials
  `glass.colour.iron.{r,g,b}` (1.6, 0.35, 1.1), `glass.colour.carbon.
  {r,g,b}` (0.3, 1.2, 6.0); `getColour()` alias; `colourBand(): 'clear'
  | 'pale green' | 'green' | 'bottle-green' | 'amber'` by `Fe%` edges
  (`glass.colour.band.{paleAt 0.08, greenAt 0.2, bottleAt 0.6}` and
  `C% ≥ 0.1 → amber`); `protected thicknessFactor(): number` (1.0;
  `Sheet` overrides 0.5); a markup augmenter *"The glass is
  &lt;band&gt;."* gated on `PerceptionApi.canMakeOutMarks` like `Dyed`'s.
- `src/thing/Sand.ts` (`AlloyedMixin(Good)`), `src/thing/Melt.ts`
  (`AlloyedMixin(ThermalMixin(Good))`; `isFluid()` ≥ 0.9 × material
  melting point; `takeGather(kg): CompositionEntry[]` debits mass,
  returns alloying, destructs itself when under half a gather), `src/
  thing/Gather.ts` (`AlloyedMixin(ThermalMixin(Good))`; `form:
  'gather'|'bubble'|'bottle'|'cylinder'` persistent; `isWorkable()`;
  `workingFloorK()`; `protected override effectiveR()` × dial),
  `src/thing/Blowpipe.ts` (`ContainerMixin(Tool)`; the affordance static
  for W5's views), `src/thing/GlassBottle.ts`
  (`TintedMixin(AlloyedMixin(Bottle))` over `@saxonberg/server/mud/
  platform/thing/Bottle`), `src/thing/Sheet.ts`
  (`TintedMixin(AlloyedMixin(Good))`; `form`, `scribed`/`isScribed()`;
  the `glaze` affordance static), `src/thing/ScribingWheel.ts`,
  `src/thing/GrozingPliers.ts` (`Tool` subclasses; affordance statics for
  W6's views + `platform/cmd/crafting/salvage.yaml` on the pliers).
- `src/idea/reading/IronReading.ts` + row `content/trade/glass/idea/
  reading/iron.yaml` (`channel: iron`, `kind: fact`, `scope: [subject]`,
  `subjectRequires: [AlloyedMixin]`, `discipline: glasswork`,
  `eyeCeiling: proficient`, `instrument: ''`, `improves`/`stakes`
  authored): `analyze` renders the iron fraction bracketed by band — the
  floor band says *"pale and clean / tinged / rusty with it"* and names
  what it can make (clear ware · green bottles); `proficient` adds the
  bracketed number. On a glass good it adds *"it came out of
  &lt;band&gt; sand"*.
- Rows `content/trade/glass/thing/`: `sand.yaml` (material `earth/sand`,
  mass 4), `melt.yaml` + `amber-melt.yaml` (material glass, nominal
  mass, `stampedTemperatureK: 1450`, `alloying: [{iron, 0.0005}]`
  (+ `{carbon, 0.003}` on amber) — D9/D15), `gather.yaml`,
  `blowpipe.yaml` (`capabilities: [blowpipe]`), `bottle.yaml`
  (`GlassBottle`, `category: bottle`, capacity 0.75 L), `cylinder.yaml`
  + `pane.yaml` (`Sheet`, `form`), `scribing-wheel.yaml`
  (`capabilities: [scribing]`), `grozing-pliers.yaml`
  (`capabilities: [grozing]`), `marver.yaml` (a `Placing` surface, a
  plain row on a kernel surface class — the archetype's `surface`).
- Recipes `content/recipes/`: `glass-batch.yaml` (`silica ×2`, `potash
  ×1`, `alkali ×1`; `requiresHeatK: 1400`, `maxHeatK: 1900`,
  `massYield: 0.72`, `outputApplication: tangible`, output `melt`,
  `difficulty: standard`, `discipline: glasswork`),
  `glass-batch-amber.yaml` (+ `charcoal ×1`, output `amber-melt`),
  `remelt-cullet.yaml` (`glass ×1` item, `requiresHeatK: 1200`,
  `massYield: 1.0`, output `melt`, `difficulty: easy`). ⚠ A whole bottle
  in the kiln also matches `remelt-cullet` — correct, and said in the
  row's comment.
- `content/trade/glass/idea/Discipline/glasswork.yaml` (D12).
- `content/settings/glass.yaml` — every dial named above plus
  `glass.hotwork.{workingFraction 0.75, gatherRFactor 10, tickGameS 45,
  gatherKg 0.4}`, `glass.pot.ironPickup 0.0005`.
- `content/archetypes/glasshouse.yaml` (`melting: {heatK: 1400}`,
  `gathering: {tool: blowpipe}`, `marvering: {surface: true}`, `fuel:
  {presence: charcoal}`) and `cold-bench.yaml` (`scribing: {tool:
  scribing}`, `grozing: {tool: grozing}`, `bench: {surface: true}`).
- Tests `src/__tests__/`: `Tinted.test.ts` (0.01 % → clear; 0.4 % →
  green-ish with `g` the highest channel; amber has `b` lowest; remelt
  of two differing lumps lands between them + the pickup), `Melt.test.
  ts` (fluid at 1450, not at 1100; `takeGather` conserves), `Gather.
  test.ts` (τ ≈ 1000 game-s with the factor; workable crossing near
  470 game-s from 1450 K in a 295 K room — `WorldClockApi.advance` as
  the test seam), `recipes.test.ts` (the batch fires through the real
  `FireController` on a lit synthetic kiln with the bellows; the output's
  alloying equals the sand's; `burn-lime` still mints quicklime at its
  row mass), `IronReading.test.ts`.

**Acceptance.** The pack boots (`SAXONBERG_PACKS` including it; the
rung check reports every class named by a row); pack suite + `lint:
family` green; `lint:capabilities --list` shows `blowpipe`, `scribing`,
`grozing` wanted (archetypes) — their verb consumers arrive in W5/W6, so
**this wave must land together with W5 before the gate's
declared-never-consumed ceiling is checked in CI**, or the archetype
need alone satisfies it (it does: the gate counts archetype slots as
consumers).

#### W5 — The hot shop · `build(glass W5): the hot shop — dip, shape, reheat, crack, and the window that closes` ✅ DONE

> **Built.** `HotWorkWatch` (SustainedEngagement on `attention`, hosted by
> the pipe, one tick per `tickGameS`, narrating glow-band crossings and
> losing the piece when it goes cold, self-completing when the gather is
> gone; `onAbort` does NOT lose — cancel stops watching, not cooling).
> Controllers `Dip`/`Shape`/`Reheat`/`Crack` (ManualBuildController steps
> on `hands`; shape/crack re-validate `isWorkable` at the commit point —
> lazy revalidation of a decaying precondition; crack mints the product
> at mass − moil with the gather's alloying and STAMPS the maker, mints
> the moil as cullet). Views + controller template rows + Blowpipe's
> `commandContributions`.
> **Decisions:** (a) `glowBand` and the loss logic moved onto `Gather` as
> instance methods (`glowBand()`, `loseToCullet()`) — a pack `lib/` may
> not export a free function (instanceable invariant 8), and the verb
> belongs on the object anyway (OO convention); no new lib statics. (b)
> Each controller needs a trivial template row (`class:`/`data: {}`) —
> `controller:` is a template path, and a controller with no row dies on
> dispatch (`lint:controller-rows`). (c) The `reheat` furnace arg declares
> `requires: [BurnerMixin]` (arg-kinds: every object arg declares a
> constraint; the `fire` precedent). (d) `loseToCullet`/the watch guard
> their narration on `isSensor` so an NPC glassblower loses silently
> rather than crashing. Pack suite 17 green (hotwork: glow bands, cullet
> conversion keeps mass+iron); pack tsc clean; `lint:family` green
> (controller-rows, arg-kinds, verb-collisions, capabilities,
> instrument-args, binder-models all pass).



**Files.**
- `src/lib/HotWork.ts` — `HotWorkWatch` (D10): constructor
  `{actor, pipe, gather}`; `emissions` one tick; `lost()` converts the
  gather to cullet (`StuffApi.clone('/stuff/thing/Casting')`, material
  glass, mass, alloying; placed where the gather was) and completes;
  `bandOf(tempK)` four words; narration only on a crossing.
- Controllers `src/idea/cmd/glass/`: `DipController` (`dip [from
  <melt>] [with <pipe>]` — declared args `melt` (reachable,
  `requires: AlloyedMixin`, controller narrows `instanceof Melt`) and
  `pipe` (`[capability.blowpipe]`); refuses a stiff melt in words that
  say *work the bellows and fire it again*; mints the `Gather` into the
  pipe at the melt's temperature with the melt's alloying; starts the
  watch; a pipe already holding a gather refuses), `ShapeController`
  (`shape <bottle|cylinder>` — a `ManualBuildStep` on `hands`, 10 game-s,
  `effortW 250`, host = the gather; `onComplete` re-validates
  `isWorkable()` → `form`; else `lost()` through the watch),
  `ReheatController` (`reheat [at <furnace>]` — declared arg `furnace`
  reachable `requires: BurnerMixin`; refuses unlit/unfuelled; 3 game-s
  step; completion `setContentsTemperature(min(held, 1450))`),
  `CrackController` (`crack` — 3 game-s step: a workable gather with
  `form` bottle/cylinder mints `/trade/glass/thing/bottle` or
  `…/cylinder` with the gather's mass minus a moil (`glass.hotwork.
  moilFraction` 0.05, minted as cullet beside you) and alloying,
  credits `glasswork` standard; anything else becomes cullet; the watch
  completes). All extend `ManualBuildController`.
- Views `content/trade/glass/cmd/glass/{dip,shape,reheat,crack}.yaml`
  with `validators` as the smithing views, args declared, help text
  that teaches the window.
- `Blowpipe.commandContributions.environment` = the four views.
- Tests: `hotwork.test.ts` — dip → shape within the window → crack →
  a bottle whose alloying is the sand's; dip → advance the clock past
  the window → the watch's tick narrates the loss and a cullet lump
  exists at full mass; dip → shape, advance mid-step past the floor →
  `onComplete` loses it; reheat re-opens the window; `cancel glasswork`
  leaves the gather on the pipe.

**Acceptance.** Pack suite + `lint:family` (verb-collisions, capabilities,
instrument-args, arg-kinds, binder-models, controller-rows) green.

#### W6 — The cold shop · `build(glass W6): the cold shop — scribe, snap, groze, flatten, glaze; salvage on the bench`

**Files.**
- Controllers: `ScribeController` (`scribe <sheet> [with <wheel>]` —
  sets `scribed`; `easy` deed), `SnapController` (`snap <sheet>` —
  refuses unscribed; two `Sheet`s at half mass, alloying copied; the
  snap costs nothing but a crack can run: `glass.cold.snapLossChance` is
  **not** a roll — it is `0` and stays so; a failed snap is a future
  rung), `GrozeController` (`groze <sheet> [with <pliers>]` — nibbles
  `glass.cold.grozeKg` (0.02) off as cullet dust lost below the
  Scrap floor; sets a `grozed` flag read by `look`; `easy` deed),
  `FlattenController` (`flatten <cylinder> [at <furnace>]` — a scribed
  cylinder at a lit furnace holding ≥ `glass.cold.flattenK` (900);
  6 game-s step; mints a `pane` of the same mass and alloying),
  `GlazeController` (`glaze <pane> in <window>` — the window a declared
  arg, reachable, the controller narrows `instanceof Window`; copies
  `pane.lightTransmittance()` via `window.setGlazing`; consumes the pane;
  `standard` deed).
- Views `{scribe,snap,groze,flatten,glaze}.yaml`; affordance statics on
  `ScribingWheel` (scribe, snap, flatten), `GrozingPliers` (groze,
  salvage), `Sheet` (glaze, `environment`).
- Tests: `coldwork.test.ts`; a `Window` test in the pack suite: glaze a
  green pane → `window.lightTransmittance().g` is the highest channel;
  `salvage bottle` on the bench → a `Casting` of glass at the bottle's
  full mass with its alloying (exercises W1 from the pack).

**Acceptance.** Pack suite + `lint:family` green.

#### W7 — The venue · `build(glass W7): the glasshouse in the Hanging Wood, the sand pit, the glazier's hut, the first windows`

**Files (all under `packages/content/rejection/`).**
- `package.json` — add `@saxonberg/content-trade-glass`; `pack.yaml`
  description gains the glasshouse.
- `content/world/terminus/rejection/sand-pit.yaml` (a `CartesianZone`,
  `cellSize: 10`, `address: terminus/rejection/sand-pit`, `deposit:
  …/idea/deposit/sand-pit`), `idea/deposit/sand-pit.yaml` (D4: drift
  0…−0.5 `wins: /trade/quarrying/thing/spoil`; sand −0.5…−6 host
  `earth/sand`, `wins: /trade/glass/thing/sand`; clay below; `lode`
  flat through `[25,0,−3]`, `thickness 6`, `strikeExtent 60`,
  `dipExtent 60`, `gangue: earth/sand`; `zones: [{toZ: −6, mineral:
  element/iron, meanGrade: 0.0003, spread: 0.0002, alongTo: 20},
  {toZ: −6, mineral: element/iron, meanGrade: 0.012, spread: 0.003,
  alongFrom: 20}]`; `waterTable: −8`), `sand-pit/clean-face.yaml` at
  `coords {x: 2, y: 0}` (|along| = 5 m → the clean band) and
  `sand-pit/dirty-face.yaml` at `{x: 6, y: 0}` (|along| = 35 m → the
  dirty band), both `/trade/quarrying/location/OpenWorking` with
  `props: [/trade/quarrying/thing/spade]`, `spoilTo` the tips, exits
  between them and to `hanging-wood/ride`.
- `hanging-wood/glasshouse.yaml` — a `SingletonCartesianLocation` in the
  wood zone (`_biomePath` woodland, a clearing: `ambientIntensity`
  authored as the ride's neighbours do), prose that says fuel is why it
  is here and the town is why it is not in it; `props: [/stuff/thing/
  Kiln, /trade/glass/thing/blowpipe, /trade/glass/thing/marver,
  /trade/glass/thing/sand ×0, four baskets of charcoal (the fuel-yard
  shape, bounded), /trade/quarrying/thing/quicklime ×2 (a starting
  condition, bounded), /trade/fuel/thing/ash ×2 (same)]`; exits to
  `hanging-wood/ride` and `sand-pit/clean-face`. ⚠ The kiln row authors
  `lit: false` (`lint:light-sources` clause g).
- `location/glaziers-hut.yaml` — interior, no authored ambient (lit by
  spill), `props: [/trade/glass/thing/scribing-wheel, /trade/glass/
  thing/grozing-pliers, a bench surface]`, exits to `location/fuel-yard`
  and `location/pithead-yard`.
- `thing/hut-window-west.yaml` + `thing/hut-window-south.yaml` — class
  `/platform/thing/Window`, `baseTransmissivity: 0.9`, `open: true`,
  `attachedHosts: [glaziers-hut, fuel-yard]` / `[glaziers-hut,
  pithead-yard]` — **the game's first authored windows**. The hut row
  lists them under `props:`.
- `idea/glasshouse-business.yaml` (`Business`, one `glassblower`
  position, `operatingLocations: [glasshouse]`, `banksAt: goodkin`) and
  `agent/glassblower.yaml` (a `Cast`, `idles` brain, prose) — the
  provisioning-business/collier shape.
- Exits added on `hanging-wood/ride.yaml` (east → glasshouse), `location/
  fuel-yard.yaml` and `location/pithead-yard.yaml` (→ hut).
- `docs/subsystems/glass.md` — new; the first draft of the subsystem
  doc (the trade, the window, the colour arithmetic, the cullet arrow,
  the two archetypes, the kernel seams and their first consumers).
  `light.md § Window` loses *"nothing authors it"*; `crafting.md`,
  `spoilage.md`, `thermal.md` (the `doMelt` guard, `effectiveR` as an
  override point), `mining.md`/the quarrying section get their lines.
  `CLAUDE.md`'s map line is **left to the sweep** (index files are swept,
  not raced).

**Acceptance.** A fresh dev DB boots with the pack set (memory: a `pack
FAILED … owned by pack` line means drop and reboot); the rung check
prints trade-glass's class origins; `lint:family` green (`light-sources`,
`untitled`, `ground`, `mass`, `authored-prose`); walking the venue in a
browser shows the furnace, the pit faces and the hut's two windows.

#### W8 — The drive, then the MR · `drive(glass): …what driving found`

- `packages/wire/tests/glass.dirty.wire.test.ts` (`DIRTY_REASON`: wins
  sand from a persisted pit, burns the kiln's fuel, consumes the bounded
  props). The eleven requirement steps, each a checkpoint **that can
  fail**: assert reasons and the arithmetic (`analyze iron` text contains
  the band word; the bottle's `look` says *green* from the dirty face and
  *clear* from the clean; the cullet remelt's `analyze iron` band is one
  step greener; after `glaze` the hut's `look` carries the tint line;
  with the second window glazed blue the line's word is not the first
  word; beer in the clear bottle in the yard reads `tainted` after
  advancing 15 game-minutes and the amber one does not; a dawdled gather
  narrates its loss and a lump exists; `competence` shows `glasswork`
  moved). ⚠ A `.dirty.` file: declare the packs; the premise of every
  checkpoint is proved in the helper (memory: `if (x) { expect }` is
  vacuous).
- Run it; fix what it finds; append the **Drive record** below with the
  output and the count; run `pnpm test` **once** (the pre-MR moment);
  push; open the MR against `master`.

---

## Reachability wiring

The four links (verb · affordance · data · boot) plus the fifth (the
binder's arg gate), per new capability. Each fails closed and silent.

| capability | verb (view) | affordance (a static on which class) | data (what must exist) | boot (what warms it) | arg gate (`requires:`) |
|---|---|---|---|---|---|
| win sand | platform `dig` | `OpenWorkingMixin` (`self`/`inventory`) + the spade | the sand-pit zone + deposit + two `OpenWorking` rows; `wins:` → `/trade/glass/thing/sand`; the won class composes `Alloyed` | the zone's `deposit:` resolves at first `singleton` | `dig`'s own |
| read the grade | platform `analyze iron <thing>` | none needed (flat over channels) | the `iron` Reading row + `IronReading` class | `ReadingCatalogue` warms by class under `/idea/reading/` | `subjectRequires: [AlloyedMixin]` (the Reading's) |
| the batch | platform `fire <kiln>` | `BurnerMixin` (the appliance) | `glass-batch.yaml` (+ amber, remelt) under `content/recipes/`; `silica`/`potash`/`alkali`/`charcoal`/`glass` tags on the materials; the `melt` rows | `RecipeCatalogue` warms recipe documents at install | `fire`'s (`BurnerMixin`) |
| dip / shape / reheat / crack | `trade/glass/cmd/glass/*.yaml` | `Blowpipe.commandContributions.environment` | the blowpipe row with `capabilities: [blowpipe]`; a fluid `Melt`; a lit furnace for `reheat` | the view documents install with the pack (`command-view` kind) | `melt: AlloyedMixin` (narrowed in code), `pipe: [capability.blowpipe]`, `furnace: BurnerMixin` |
| the window closes | — (a tick) | — | `glass.hotwork.*` dials (seeded literals at the call site) | the world clock | — |
| scribe / snap / flatten | `…/{scribe,snap,flatten}.yaml` | `ScribingWheel.commandContributions.environment` | the wheel row `capabilities: [scribing]`; a `Sheet` | pack install | `sheet: TintedMixin` (federated name), `wheel: [capability.scribing]`, `furnace: BurnerMixin` |
| groze / salvage | `groze.yaml` + `platform/cmd/crafting/salvage.yaml` | `GrozingPliers.commandContributions.environment` | the pliers row `capabilities: [grozing]` | pack install | `sheet: TintedMixin`; salvage's `TangibleMixin` |
| glaze | `glaze.yaml` | `Sheet.commandContributions.environment` (whoever holds a pane) | a `Window` row attached to two Adornable hosts | the hut's `props:` mint the windows through `singleton` | `pane: TintedMixin`; `window` narrowed in code |
| coloured light | platform `look` | — | a glazed or tinted open `Window`; sky on the far side | the walk is per-look | — |
| light-strike | — (the gauge) | — | `light-sensitive` on ale/lager; a `LightFilter` holder; a lit scope | reconcile-on-read | — |
| advancement | — | — | the `glasswork` Discipline row; every recipe/step names it | `DisciplineCatalogue` warms by class | — |
| the archetypes | `archetype`/business reads | — | `glasshouse.yaml`, `cold-bench.yaml`; the business row's industry | the `archetype` document kind at install | — |

⚠ The three things a pack author has to know, restated for the builder:
a row's `commandContributions:` is dead; a bound arg is `MqlOneResult`,
never a `Stuff` (`model.x?.stuff`); a `requires:` naming a mixin the
target does not compose refuses before any controller runs and no
controller test sees it — the wire drive is the only instrument.

---

## Acceptance-criteria coverage

| requirement AC | wave(s) | the drive step |
|---|---|---|
| make glass from sand, ash, lime at a furnace; re-melt cullet more cheaply | W1, W3, W4 | 3, 8 (`requiresHeatK` 1400 vs 1200 — the bellows) |
| colour determined by the sand's iron and the cullet, visibly, never decoratively | W3, W4 (D1, D9, D15) | 2, 7, 8 |
| a hot gather is workable only briefly; dawdling loses the piece | W5 (D10) | 4 |
| flat glass scribes-and-snaps and grozes; a thrown glass vessel shatters, steel does not | W6 (+ shipped `throw`) | 6 |
| cullet returns full mass, moves one way toward green; mixed cullet cannot make clear | W1 (D7), W4 (D9) | 8 |
| a stained window colours its room; two windows add; the first authored window, lit through | W0 (D2), W6, W7 (D13) | 9 |
| beer in clear glass in sunlight spoils faster than in brown | W2 (D8), W4 (D15) | 10 |
| a `glasswork` Discipline exists and advances | W4 (D12), W5 | 11 |
| a second glasshouse from rows alone | W7 (every class is the pack's; the venue ships none) | the directory listing |

---

## Test & gate strategy

- **Unit, beside the code**: W0 `Light`/`Colour`/`Window`/walk; W1
  `Recipe`/`FireController`/salvage/`doMelt`; W2 `Freshness`; W3
  quarrying's mint; W4–W6 the pack's suite (`test-bootstrap` imported
  everywhere the runtime is wired).
- **`pnpm test:near`** after every wave; the pack's own `vitest` for
  every pack touched (trade-glass, trade-quarrying, rejection has none);
  `lint:family` after every wave.
- **`pnpm test` exactly once**, before the MR opens (and again only at
  `/finalize`). Never in the background.
- **The drive** is the wire file in W8, run against the booted game
  (`WIRE_PORT` per worktree — build-4 picks an unused one and records
  it), and **re-run after every review fix**.
- **Gates this build adds:** none. It satisfies the existing roster; the
  one ratchet it moves is none (object-verbs census stays 0).
- **A live browser pass** after the wire drive is green (memory: the
  wire drive is not the live drive — textiles found three the wire could
  not).

---

## Risks & opens

1. **`gatherRFactor` and the window length are playtest numbers.** The
   formula is pinned by a test (τ, the crossing time); the real-second
   feel is the dial. If 40 s is too tight at the keyboard, the dial is
   the knob — not the clock scale.
2. **`Light.of` / `Light.from` signature growth** touches tests across
   perception; keep the new parameter last and optional so no existing
   call site changes.
3. **`hasMaterialTag` is the MATERIAL's tag set**: the recipe categories
   (`silica`, `potash`, `alkali`, `charcoal`, `glass`) are material tags,
   never instance facts. A whole bottle in the kiln remelts — intended.
4. **The whistle's `blow`.** The glassblower's word is taken by a
   university-avenue whistle that any carried whistle affords. D11 keeps
   `shape`; if review wants `blow`, the collision ladder's answer is a
   kernel `Blowable` interface over whistle, horn and pipe — a different
   build.
5. **The palette has no `magenta`.** The drive asserts channels; the
   prose says the nearest word (`pink`/`violet`). Adding a word is a
   `@saxonberg/types` + client-tint change — flagged, not done.
6. **`lint:light-sources` and the hut.** A room with no authored ambient
   lit only through two windows is clause-legal ("spill through an open
   boundary"); if the gate's clause list disagrees, author the hut's
   ambient as a lamp-less interior and say so in the row.
7. **Light-strike samples the light once per reconcile**, not integrated
   across the gap; a bottle carried from sun to cellar is aged at the
   cellar's light for the whole stretch. Stated in `spoilage.md`; the
   trajectory integration is a follow-on.
8. ~~`GradedReceptacle`'s composition~~ — verified:
   `platform/thing/GradedReceptacle.ts:60` is
   `ThermalMixin(BrandedMixin(CraftedMixin(BulkableMixin(Good))))`, and
   `Bottle` = `VesselKindMixin(CirculatingMixin(SealableMixin(GradedReceptacle)))`,
   so `GlassBottle` holds, cools, is sealable and counts in the empties
   census. ⚠ It is also `Crafted` and `Branded` — `crack` must stamp the
   maker (`CraftedMixin`'s mint seam) the way the smithing mint does, or
   the bottle credits nobody.
9. **The federated `requires: TintedMixin`** depends on discovery
   registering the pack's static before view parsing — the shipped path
   (`content-packs.md § the federated mixin`); if the offline preload
   does not see it, the arg gate falls back to `AlloyedMixin` with an
   in-controller narrowing, recorded here.
10. **Two melt rows share one class** (`melt`, `amber-melt`); the batch
    recipes name them. A third colourant (cobalt) is a third row and a
    third `Tinted` term — rows, one constant.

---

## Deferred seams

Each is a clean attach point this build leaves, and the slate it lives
on. **None is a plan section** — at the sweep these lines go to their
slates and this doc is retired.

| seam | the attach point this build leaves | lives on |
|---|---|---|
| optics (`refractiveIndex`, the grind, lens blanks, acuity) | the glass material row (a field beside `meltingPoint` when its reader arrives); the cold bench (`ScribingWheel`'s sibling `grind` on the same `Sheet`); a disc is an ordinary `Sheet` | `optics-slate` |
| molds (one recipe → N products by a tool) | `ShapeController`'s `form` vocabulary is where a mold would substitute for the jacks; `Gather.form` → product row map is one table | the dairy build (the cheese hoop first) |
| the buy-side `sell` counter (cullet as a commodity) | a `Casting` of glass is already the commodity; `GlassBottle.category = bottle` keeps the `vessel:*` census honest | retail |
| the returns/empties loop + the crate defect | same | the glass follow-on, after retail |
| the converter / tube / instrument bench | `Gather.form` gains `tube`; a `lampwork` archetype with a bench torch; the thermometer/hydrometer/gas-analyzer rows are the customers | the glass epoch follow-on |
| the light/sight clarity split | `Window.canSeeThrough` untouched; `LineOfSight` is the interface that grows a clarity | `senses-slate` |
| the composed stained panel (area-weighted filter) | `Window.setGlazing` takes one `Colour`; a panel act folds N grozed pieces by area and calls it once | the glass follow-on |
| decolorisers (manganese, the arrow's twin) | a third `Tinted` term with a negative sign; a batch row with `pyrolusite` | the glass follow-on |
| the glasshouse outrunning its wood | `forestry.md`'s coppice `Panel`; the kiln's fuel reserve is the coupling point | `forestry.md` note / rgo-unification |
| the crushed-sandstone route | a `sandstone` material row + a crushing act; the sand pit's `wins:` is the same field | the trade |
| a failed snap / the breakage rate at the bench | `glass.cold.snapLossChance` is `0` and not a roll — a competence-priced failure rung needs the uncertainty doc's provenance answer first | the glass follow-on |

---

## Critical files (read first)

Kernel: `packages/server/src/mud/lib/perception/{Colour,Light}.ts` ·
`packages/server/src/mud/lib/boundary/Conduit.ts` ·
`packages/server/src/mud/platform/thing/Window.ts` ·
`packages/server/src/mud/platform/idea/modalities/VisionModality.ts` ·
`packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
(L220–430) · `packages/server/src/mud/lib/craft/Recipe.ts` ·
`packages/server/src/mud/platform/idea/cmd/device/FireController.ts` ·
`packages/server/src/mud/platform/idea/api/CraftingLogic.ts` (L2741–2839) ·
`packages/server/src/mud/lib/thermal/{Thermal,Meltable}.ts`
(`effectiveR` L753, `setContentsTemperature` L652, `heatSourceK` L980,
`doMelt` L1219) · `packages/server/src/mud/lib/material/{Alloyed,Freshness,
Dyed}.ts` · `packages/server/src/mud/api/scheduler.ts` ·
`packages/server/src/mud/lib/craft/ManualBuildStep.ts` ·
`packages/server/src/mud/platform/idea/cmd/crafting/ManualBuildController.ts`
· `packages/server/src/mud/lib/instrument/Reading.ts` ·
`packages/server/src/mud/lib/archetype/Archetype.ts` ·
`packages/server/src/mud/platform/thing/{Bottle,Casting,Tool,Oven}.ts`.

Packs: `packages/content/ground/src/idea/Deposit.ts` ·
`packages/content/trade-quarrying/{pack.yaml,package.json,vitest.config.ts}`
+ `src/lib/Working.ts` + `content/recipes/burn-lime.yaml` +
`content/archetypes/quarrying.yaml` +
`content/trade/quarrying/idea/Discipline/quarrying.yaml` ·
`packages/content/trade-fishing/src/lib/FishingEngagement.ts` +
`src/thing/Rod.ts` + `content/settings/fishing.yaml` ·
`packages/content/trade-smithing/src/thing/Anvil.ts` +
`src/idea/cmd/crafting/HammerController.ts` ·
`packages/content/trade-mining/src/idea/reading/StrikeReading.ts` +
`content/trade/mining/idea/reading/strike.yaml` ·
`packages/content/trade-apiculture/src/lib/Colony.ts` (a pack mixin's
statics).

Venue: `packages/content/rejection/{pack.yaml,package.json}` ·
`content/world/terminus/rejection/{quarry.yaml,quarry/pit.yaml,
hanging-wood.yaml,hanging-wood/ride.yaml,location/fuel-yard.yaml,
idea/fuel-yard-business.yaml,idea/deposit/quarry-hill.yaml,agent/collier.yaml}`.

Content rows to edit: `packages/content/base-library/content/stuff/idea/material/{glass/glass,earth/sand}.yaml`
· `packages/content/trade-fuel/content/stuff/idea/material/organic/ash.yaml`
· `packages/content/trade-brewing/content/trade/brewing/idea/material/{ale,lager}.yaml`.

Docs: `docs/subsystems/{light,crafting,spoilage,thermal,activity,mining,
instrumentation,content-packs,settlement-model,lint-family}.md` ·
`docs/workflow.md` · `docs/testing.md` ·
`packages/wire/tests/extraction.dirty.wire.test.ts` (the harness shape).

---

## Drive record

*Appended at build time (W8): the wire file's path, the run's output,
the count passed/failed, and what each failure was.*
