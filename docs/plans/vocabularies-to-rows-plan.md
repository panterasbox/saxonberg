# Smell and taste, and the word lists behind them — implementation plan

Executes [vocabularies-to-rows-requirements](../requirements/vocabularies-to-rows-requirements.md)
(seeding slate: [vocabularies-to-rows-slate](../slates/builds/vocabularies-to-rows-slate.md),
whose **Decided at requirements** section overrides its older leans, and
whose reuse ledger every row of § New substrate answers). **Kind:**
refactor/sweep. **Lead end:** kernel. **First consumers:** every material row
(384), the whiskey chain's peat/cask/kiln rows, the 11 dirt rows, spoilage,
the corpse, the cooking pack's 8 medium recipes.

What gets built: one model of smell (a source emits in **odor units**, the
air carries it one band fainter per hop, a nose reads it through its species,
its adaptation and its training), the same model at zero distance for taste
with real strengths, the person behind both (a seeded palate, exposure,
aversion, a signed liking read), aroma words as rows in a tree any pack
extends, a recipe medium derived from the material that carries it, and the
closed-vocabularies gate at 3. Planned against master `6c0182abd`; the
sibling-branch reconciliation is in § Risks.

---

## Grounding

Every fact below was verified by opening the file this cycle. Paths are
under `packages/server/src/mud/` unless they start with `packages/` or
`docs/`.

### Smell today — four systems

**The air walk.** `platform/idea/modalities/SmellModality.ts` (284 lines).
`signalAt(loc)` runs `walkAt` on the shared `lib/location/Traversal.ts`
(`order: 'depth-first'`, `bound: { hops: MAX_HOPS }`, one threaded `visited`
set). Legs are `smellLegs` (boundary `SmellConduit`s, then doorless obvious
exits at `EXIT_TAU`); `ownSmell(loc)` reads two legs only: (b) direct
contents — `Soilable.soilOdour()` then `SmellSource` emission — and (c)
`Adornable.getFixtureSmellSources()`. **It does not descend into containers,
carried inventory or vessels.** `finalize` sums ppm per free-text identity,
picks the dominant by strict `>` (so ties go to walk order, pinned by the
golden), merges sources per `stuffId`, caps at `SMELL_SOURCE_CAP = 3`.
`lib/perception/Modality.ts`: `MAX_HOPS = 2`, **`EXIT_TAU = 1.0`** — a
doorless exit attenuates nothing today, which the requirements' "distance
reduces it at every hop" reverses. The doc block there invites a
per-modality knob as an accessor on the singleton (*"a read, not a
mechanism"*). Doors and windows expose `conduitKind: 'smell'`
(`platform/thing/Door.ts:274`, `Window.ts:470`).

**The value.** `lib/perception/Smell.ts`: `concentration: Quantity<'ppm'>`,
`identity: string`, `sources: SmellSourceRef[] {stuffId, concentration,
identity}`; `add`/`attenuate`/`from`/`of`; `Smell.ZERO`. Runtime-only.

**The nose.** `platform/idea/cmd/perception/SmellController.ts`:
`ACUITY_THRESHOLDS = {keen: 1, normal: 10, dull: 100, none: ∞}` ppm, read
off `Species.olfactoryProfile.acuity` (`platform/idea/species/Species.ts:188`,
`OlfactoryProfile { acuity }`, 20 of 85 species rows author it).
`senseLocation` compares **total** ppm to the flat threshold and renders
`You smell <identity> — from <up to 3 presentations>` naming sources through
walls. `senseTarget` handles only `SmellSource` (*"<thing> smells of
<identity>"*) and otherwise falls to the base's `<sense channel="smell">`
prose. `Modality.perceiveFor(viewer, loc, signal)` exists with a null
default, and `PerceptionApi.perceiveAt(viewer, loc, modality)`
(`api/perception.ts:163`) forwards to it — the seam the one nose goes
behind. `requiresSmell` (`lib/command/validators/requiresSmell.ts`) gates the
organ and the medium.

**Emitters.** `lib/perception/SmellSource.ts`: `emittedConcentration` (ppm)
+ `odorIdentity` (free text), witness hook `onSmellSourceChanged` reached by
a structural `typeof hook === 'function'` check (duck typing, P4). Composed
by exactly two classes: `packages/content/trade-chandlery/src/thing/Candle.ts:51`
(`adoptMaterialSmell` stamps the material NAME at `CANDLE_SMELL_PPM = 40`)
and `packages/content/trade-ceramics/src/thing/BrickClamp.ts:79`
(`SmellSourceMixin(ContainerMixin(Firebox))`, overrides both getters:
`CLAMP_SMOKE_PPM = 400` while `isLit()`, identity `<fuel name> smoke`). Both
are already `Firebox`es whose fuel bed is a material (`lib/fire/Firebox.ts`:
`isLit()`, `fuelMaterials(): Material[]`, `fuelBed: Record<path, kg>`).
`lib/boundary/Adornable.ts:364` lists fixtures by a smell-source marker.

**Dirt.** `lib/cleanliness/Soilable.ts:587` `soilOdour()` sums
`load × row.odour.ppmPerLoad` per `DirtKind.odour.identity` (free text).
`dirtKind(kind)` (`:525`) is the load-on-use precedent: sync
`StuffApi.findByTemplatePath(DIRT_KIND_ROOT + kind)`, else a fire-and-forget
`StuffApi.singleton(...)` kick, `null` on a cold read; `soil()` primes it.
`platform/idea/DirtKind.ts`: `odour: DirtOdour | null` (`:57`),
`DIRT_KIND_ROOT = "/platform/idea/DirtKind/"` (`:160`), `descriptor()`
validates and warns. The soil augmenter (`:817`) prints *It smells/reeks of
<identity>* past the dial `AppSettingKeys.cleanlinessOdourNoticedPpm` (10;
*reeks* at 100). 11 dirt rows at
`packages/content/platform/content/platform/idea/DirtKind/`; 5 author
`odour` (blood→*old blood* 15, grease→*rancid fat* 10, manure→*dung* 80,
milk→*sour milk* 30, sweat→*stale sweat* 40); `trade-mining`'s `dust` does
not.

**Rot.** `lib/material/Freshness.ts`: `FreshnessBand = fresh|tainted|
spoiled|rotten` (`:87`), `FRESHNESS_CHANNELS = ['vision','smell']` (`:151`),
`FRESHNESS_PHRASE` (`:154`, three fixed sentences), `freshnessAugmenter`
(`:168`) on `FreshnessMixin.markupAugmenters`, and the bulk twin
`Freshness.senseLine(filter)` (`:728`). `Freshness.bandFor(load)` (`:492`),
`Freshness.hostTemperatureK(host)` (`:645`, Thermal or the ambient dial).
`FreshnessMixin` composes on **`platform/thing/Provision.ts` only** (39 rows
name it); `lint:perishable` holds that narrowing. `_microbialLoad` is public,
`setMicrobialLoad` public (the staging seam).

**Corpse.** `lib/mortality/Postmortem.ts:156` `getDecayStage()` →
`DECAY_STAGES = ['fresh','stale','decomposed','spent']`
(`lib/mortality/MortalArc.ts:58`, one stage per `DECAY_STAGE_SEC = 3600`
game-seconds from `diedAtGameSec`). `platform/thing/Corpse.ts:110` composes
`Postmortem ∘ Concealable ∘ Contaminable ∘ Container ∘ Thermal ∘ Vitals ∘
… ∘ Organism(Thing)` — a corpse has a temperature, a species and NO
`Freshness`, so decay has no smell today.

**Drinks.** `lib/metabolism/DissolvedAromatics.ts`: `AROMAS` (11 ×
`{type, thresholdMgL}`: smoke .02, vanilla .1, oak .07, char .3, fruit .05,
floral .5, grain 1.0, honey .2, spice .03, solvent 5.0, sulphur .01);
`INTENSITIES` log steps 1·30·300·2000·8000 → barely·faintly·clearly·strongly·
overpoweringly; `isAroma`, `thresholdFor`, `render(tags, band)` (untrained/
novice: dominant word, no intensity; competent+: every over-threshold tag
with intensity); the slot gauge `tags()`/`raw()`/`stamp()`; and the
`declare module` that puts `dissolvedAromatics?: AromaTag[]` on
`BulkPayload`. Validated in `lib/craft/Recipe.ts:434` (`imparts`, sync, run
at pack install by `PackLogic.DOCUMENT_VALIDATORS.recipe`) and
`lib/material/Material.ts:2324` (`validateCombustionImparts`, sync setter,
throws at clone/hydrate). Other readers: `lib/metabolism/Palatable.ts:160`
(`render` in `renderPalate`), `lib/fractionation/Fractionating.ts:173`
(the still's draw read), `lib/maturation/Maturing.ts:1150` (cask `imparts`
→ payload), `lib/material/Faced.ts:491` (`absorbedAromas` on a vessel
face, read by `lib/bulk/Bulkable.ts:1096,1131`),
`platform/idea/api/BulkableLogic.ts:133,526,646` (the pour fold),
`platform/idea/api/CraftingLogic.ts:1638-1765` (`fireImpartsFor` reads
`combustionImparts`; `imparts` added additively on output),
`packages/content/trade-milling/src/idea/cmd/milling/MillController.ts:567`
(carry on grind). Blend arithmetic is `lib/bulk/Concentration.ts`
(`@internal`, `blend`/`isClean`). Content: **0 rows author
`dissolvedAromatics`, 0 recipes author `imparts`**; 3 Vat rows author
`imparts` (oak 25, vanilla 3) and 3 materials `combustionImparts` (peat 30,
jute 40, hemp 40). Only smoke/vanilla/oak/char are used structurally.

### Taste today

`lib/material/Material.ts:104` `BASIC_TASTES` (5, declared closed by
design); `tastes: string[]` (`:991`), `setTastes` drops unknown words
**silently** (`:2022`). 72 class rows author it, as a word list. `tastes`
is on every Material; `edibility: boolean` (`:851`) is the edible flag
(156 true / 210 false / 2 absent); `Tangible.isEdible()`
(`lib/material/Tangible.ts:327`) reads it. The arg gate
`lib/command/validators/mustBeEdible.ts` passes a thing MADE of edible
matter or HOLDING some (`holdsEdibleMatter` via `MaterialApi.blendEdibility`).

`lib/metabolism/Palatable.ts`: `palateAugmenter` filter-gated to
`taste`/`smell`, reads the interior slot's payload (`makeup`,
`dissolvedAromatics`, `maturedDays`, discipline via
`CraftingApi.blendDiscipline(payload)` → `BlendIdentity.disciplineOf`),
`tastesOf` = the UNION of ingredients' words, `bandFor(viewer, discipline)`
off the sync `competenceDigestCached()`; composes on
`platform/thing/ServingVessel.ts` and nowhere else (its header records the
two wrong hosts). `TasteController.ts` is a 12-line shim over
`SingleSenseControllerBase`; `taste.yaml` has `requires: any`, target
optional, default `$focus`, so `taste stool` is legal and prints the stool.
The taste modality row `packages/content/platform/content/platform/idea/modalities/taste.yaml`
names the base `Modality` class — **there is no `TasteModality.ts`** (the
senses doc's layout is stale on this).

### The dose path

`lib/metabolism/Metabolic.ts`: `canIngest()` (`:1588`, the airway),
`eat(food, utensils)` (`:574`; dish arm via `Freshness(slot).ingestPayload()`
+ `BulkableApi.ingestSolid` + `BulkableApi.transfer(slot, null, measure)`;
discrete arm via `Fresh.ingestPayload()` + `ingestSolid` + `StuffApi.destruct`;
`EAT_PORTION_LITRES = 0.4`), `ingest(material, amount, phase, payload,
hostKg)` (`:1597`) → `routeIntake` (`:1631`: nutrients, toxins by serving,
**dissolved toxins × litres**, formed toxins, then `exposeToPathogens`
`:1709`, which afflicts when `load ≥ infectiousDose`). `EatController`
(`platform/idea/cmd/bulk/EatController.ts:62-70`) words *You eat
<what> <with…>* and nothing about how it went. `SipController`
(`SIP_LITRES = 0.03`) is the small-measure precedent. Nutrient routes:
`carb/sugar/fat → "satiation"`, `water → "hydration"` (`:364-367`) — **the
hunger reserve is `satiation`** (`ReservedMixin.getReserve('satiation')`).
Species rows author `reserves:`.

⚠ `build/controllers-are-io` (!527, in review, HEAD `e1922e1ed`) moves
`eat`/`claimUtensil`/`leaveCrumbs`/`EatOutcome` into a new
`lib/metabolism/Eating.ts` (`EatingMixin`, host `Creature` as
`EatingMixin(MetabolicMixin(…))`, `MixinApi.isEating`); `canIngest`/`ingest`
stay on `Metabolic`. It adds `category: perception` to every perception view
(required after merge), drops `look`'s aliases, and adds
`check-duck-typing`/`check-controller-decisions`/`check-mixin-files`
gates. It does not touch any smell/taste/aroma file. Full collision table in
§ Risks.

### Materials and the opt-in pattern

`platform/idea/material/`: `Material.ts` (the concrete twin),
`ConsumableMaterial.ts` (`extends Material {}` — taxonomy only, no fields),
`Muscle.ts` (`MuscleMixin(Material)`), `RadioactiveMaterial.ts`
(`RadioactiveMixin(Material)` — the pattern the owner ruled for smell),
`Fabric.ts` (an `Idea`, not a Material). `packages/content/arcana/src/idea/material/PotionMaterial.ts:39`
`PotableMixin(IdentifiableMixin(ArcaneMixin(ConsumableMaterial)))`. Census
(verified by the content survey, 4,208 rows parsed): **384 material rows** —
248 Material, 105 ConsumableMaterial, 11 Muscle, 3 Potion, 1 Radioactive;
368 by `class:` + 16 by `extends:` only. `heatOfCombustion` on 61 (+5
inherited). `smokePoint` on 3 (olive-oil 463, tallow 478, animal-fat 478);
`boilingPoint` on 46; **no row has both**. Per-pack table in § W7.
`Material.fieldMeta` carries `tastes`, `combustionImparts`,
`smokePoint`, `boilingPoint` (`:1103-1176`).

### Species, identity, seeding

`platform/idea/species/Species.ts` (not `lib/`): `olfactoryProfile`
(`:789`), `bloodGroups` (`:832`, `{alleles, system?}`), `innateMixins`,
`visionProfile`/`vitalProfile`/`facultyProfile`. **The seeded-trait
precedent is derived on read, never stored**: `lib/vitals/Vitals.ts:1014`
`resolvedBloodGenotype()` = pinned `bloodGenotype` field, else
`Seeded.unit(seedFromString(getIdentityPath()), i)` over the species'
alleles (`lib/Seeded.ts`: `mix`, `unit`; FNV-1a fold). Chargen
(`platform/idea/cmd/charactergen/EmbodyController.ts:656-729`) clones with
`{ dataOverlay: overlay, asIdentityPath: path }` after setting
`_speciesPath`; a Cast is a singleton whose identity is its row path; ⚠ an
`Extra` has no identity stamp (`lib/npc/Cast.ts:36` says it keeps its own
identity, but `getIdentityPath()` falls back to `getTemplatePath()`,
`lib/stuff/Stuff.ts:553`) — so two sentries from one row would draw the same
genotype and the same palate. Parents do not exist as records; the
household-lifecycle slate is design.

### Persistence

`PersistableMixin` on `Avatar` (`lib/character/Avatar.ts:167`); a mixin's
`static fieldMeta { x: { persistent: true, runtimeState: true } }` is
captured per mixin layer (`platform/idea/api/PersistableLogic.ts:651`,
`MixinApi.getPersistenceContributors`) into `holder_snapshots`; JSON
round-trip, so the sanctioned shape for keyed state is a plain `Record`
replaced on write (`Soilable.deposits`/`washes`, `Wardrobe.wardrobes`), never
a `Map`. `Avatar.save()` (`:846`) is the capture; NPCs (`Cast`/`Extra`,
`lib/npc/NPC.ts:36` composes no `PersistableMixin`) are re-seeded from rows
at restore and keep no mixin state across a reboot. The 49 collections are
fixed (`lib/persistence/Collections.ts`, `lint:schema`); there is no generic
per-person ledger (`chronicles` is the public record, `beliefs` is an upsert
store). Presence freeze: `Metabolic.reconcileMetabolism` (`:763-819`)
re-stamps on linkdead and on a gap over `MAX_REASONABLE_GAP_SEC = 4 h`.

### The applier's silent drop

`platform/idea/TemplateApplier.ts:154` iterates **declared** persistent
fields, so an undeclared `data:` key is never visited; `reportUnapplied`
(`:258-305`) records a **warning** diagnostic at mint only (not go-live, not
restore). `lint:instanceable` invariant 12 ratchets orphan keys at
`ORPHAN_DATA_KEY_CEILING = 306` (`scripts/check-instanceable-placement.ts:323`)
— a misspelled key passes under the ceiling. A declared `instruction`/`seed`
field with no method throws. Setter dispatch is awaited (`:189-204`), so an
async `set<Field>` is legal. `fieldMeta ref: 'identity:constituent'` awaits
`StuffApi.ensureConstituent` before the set on mint, go-live and restore.

### The reading ladder

`lib/instrument/Reading.ts`: row fields `channel/kind/scope/subjectRequires/
discipline/instrument/instrumentNoun/handTool/eyeCeiling/bench/improves/
stakes`; `runAnalyze` (`:369`) and `runMeasure` (`:402`) resolve the subject,
narrow tools by `Tooled.capabilities` word (`narrow`, `:975`), band =
`lower(bandOf(actor, tool), ceilingOf(tool))`; hooks `analyze`/`measure`/
`benchRead`; `observe(value, band, seed)` is the honest bracket; `decline`/
`report`. `ReadingCatalogue.warmed(channel)` is what `AnalyzeController`/
`MeasureController` call. Precedents: `platform/idea/reading/CleanlinessReading.ts`
(eye rung only, `subjectRequires: [SoilableMixin]`) and
`AtmosphereReading.ts` (`measure` rung with `instrument: gas-analysis`;
`analyze` capped `eyeCeiling: competent`). The gas analyzer is a ROW over
`/platform/thing/Tool` with `capabilities: [gas-analysis]`
(`packages/content/generic-objects/content/stuff/thing/instrument/gas-analyzer.yaml`),
propped in Duncan Hall's lobby. Views `analyze.yaml`/`measure.yaml`/
`readings.yaml` take `channel` (string), `subject` (greedy object), `tool`
(greedy objects, `requires: [ToolMixin]`). 52 reading rows ship.
`lib/quantity.ts:52` `Unit` has no odor unit (`ppm` exists).

### Media

`lib/craft/Recipe.ts:98` `RECIPE_MEDIA = ['water','fat']`, `mediumFrom`
(`:665`) throws on any other word; `getMedium()` (`:777`).
`platform/idea/api/CraftingLogic.ts:885` `mediumCapK(medium, material)` =
smoke point if `fat` else boiling point; `findMediumMaterial` (`:900`) by the
medium's TAG on the material; `capClears` (`:913`); `pickCandidate` prefers a
fat that takes the heat (`:938`); `resolveMediumCaps` (`:2310`) iterates
`RECIPE_MEDIA` over banked contributions; the mint clamp (`:2819`); the
match floor (`:3378`). 8 recipes in `packages/content/trade-cooking/content/recipes/`
author `medium` (6 water, 2 fat). No shipped material tabulates both limits.

### Competence and disciplines

`lib/advancement/Advancement.ts`: `competenceBandFor(discipline)` (async),
`competenceBandCached` / `competenceDigestCached` (sync), on `Character`.
`lib/advancement/CompetenceBand.ts`: `COMPETENCE_BANDS`, `atOrAbove`,
`rank`, `FLOOR`. Disciplines are rows at
`packages/content/platform/content/platform/idea/Discipline/<key>.yaml`
(43 platform + packs' own). Staging: `practice <discipline> hard success`
(test-only verb, one Transcript row per call; 8–12 calls climb a band).

### Counts, places, gates, harness

Species: 85 rows (41 plants, 3 fungi, 1 construct, 16 homo with
`bloodGroups`, 24 animals: cat, hog, wolf, bullfrog, 6 fish, dog, cow, goat,
sheep, pig, chicken, draft horse, pit pony, canary, bee, silkworm, 3
rejection fauna). Places the drive names (all shipped): tannery yard
`packages/content/terminus/content/world/terminus/wharfside/tannery/location/yard.yaml`
(props: tanpit, leat); byre `hearts-delight/.../dairy/location/byre.yaml`
(pails, water-butt, butcher block — no animal rows propped; the cows arrive
through ranching's `cast:`/herd); knacker's `terminus/.../wharfside/knackers/location/yard.yaml`
(tallow-crock, cook-pot); Veshko distillery
`terminus/.../goods-yards/veshko/location/distillery.yaml` (still, mash-tun,
vats, bottles, dry-logs); chandlery floor
`terminus/.../wharfside/chandlery/location/floor.yaml` (dip-pot, soap-kettle,
Hearth, rain-butt); Duncan Hall lobby (the eleven instruments incl. the gas
analyzer); peat cutting `world-seed/content/world/moor/turf-bank.yaml`
(`Turbary`); **no smokehouse location** (the smoke-chimney is propped in
`hearthworks/.../cookhouse.yaml` — the cookhouse is the smelliest kitchen);
**no "salt shore"** — the nearest are `terminus/.../estuary/estuary-mouth.yaml`
(a `Shore` with salt pans) and `salt-house.yaml`. The Hearth row names
`/platform/thing/Campfire`; ovens/forges are `Firebox`es.

`lint:closed-vocabularies` is `packages/server/scripts/check-closed-vocabularies.ts`
(`CLOSED_VOCABULARY_CEILING = 5` at `:111`, `CLOSED_BY_DESIGN` at `:123`,
the detector walks `isAroma`'s `.includes`-less loop deliberately); its test
is `scripts/__tests__/check-closed-vocabularies.test.ts`. The golden
`scripts/__tests__/golden/perception-characterization.json` pins `ppm` +
`smell` identity per place (132 entries, all `null` today — nothing smells
at rest); regenerate with `PERCEPTION_GOLDEN_UPDATE=1 pnpm test:gym`
(`scripts/__tests__/perception-characterization.gym.test.ts:34,335`).
`lint:family` is derived from `package.json`'s `lint:*` scripts.

Wire harness (`packages/wire/src/harness/`): `Session.open(handle, { startLocation, wizard, committees: ['/extent[:owner]'], offices, parcels })`,
`s.cmd(line)` → `expectOk/expectRefused/expectNote`, `r.said()`,
`advanceWorldClock('6 hours')` (over a day refused outside soak),
`hand(s, template, dataOverlay)`, `nourish(s)`, `eval --parcel <p> [--on
<expr>] <code>` (wizard + a committee seat; no `;`), `practice`, the restart
recipe in `cleanliness.dirty.wire.test.ts:739-752` (`dev-preflight.mjs` then
`bootOwnedWorld()`). E2E walks: `e2e/tests/<feature>-walk.spec.ts` with
`openWorldAs(browser, prefix, { startLocation, wizard, committees })`,
`runCommand`, `sayAwaiting(page, cmd, regex)`.

---

## ⭐⭐ New substrate

Every line cites the slate's reuse ledger row, or says *genuinely new* and
what was searched. Short list is the goal; this is it.

| new thing | kind | ledger row | note |
|---|---|---|---|
| `Aroma` (`platform/idea/Aroma.ts`) + rows `/stuff/idea/aroma/<word>` | Idea singleton class + row family | *word to row, no boot* (`DIRT_KIND_ROOT + kind`) + *tree + inherited threshold* (`extends:`) | replaces `AROMAS`; `DirtKind` is the shape (`descriptor()`, root const, load by path) |
| `'OU'` on `Unit` | one unit word | *dissolved aroma* (the amounts stay; the unit the nose and the analyzer share becomes the threshold multiple — the real-world **odor unit**, EN 13725) | replaces `ppm` on `Smell` only; `ppm` stays for the atmosphere |
| `Scent` (declared in `lib/perception/Smell.ts` beside `Smell`, the `Light` + its bands precedent: one subject, signal and percept) | value object (percept) | *the air walk* (`Smell` is the signal; `Modality.perceiveFor` already returns a percept, null today) | what a nose made of a `Smell`: notes with the name at the reader's depth, OU after acuity and adaptation, `sourceName`, no digit. ⚠ Not folded into `Smell`: a `Smell`'s OU is physics, a `Scent`'s is after a nose, and mixing the two is how ppm-vs-threshold got confused |
| `Flavor` + `Savor` (`lib/perception/Flavor.ts`) + `TasteModality` (`platform/idea/modalities/TasteModality.ts`) | value objects (the tongue's signal; what a tongue made of it) + the row's class | *taste union* (replaced) + the shipped `taste` modality row that names the base class today | `Flavor = { tastes: Note[]; aromas: Note[] }` at zero distance; `Savor = { tastes: Note[]; scent: Scent; liking: Liking }`. ⚠ Four value objects considered against three: `Savor` reuses `Scent` for its nose half rather than a third percept shape, and the two signals cannot merge because their ladders differ (D7). Fewer is not honest |
| `Liking` (type + the six-word ladder, declared in `lib/metabolism/Palate.ts`) | value type | *liking* (genuinely new, as above) | `{ score: −1..1; word }`; the palate's read, so it lives with the palate |
| `OdorTag` (`lib/material/Odorous.ts`), `TasteTag` (`lib/material/Material.ts` beside `BASIC_TASTES`) | row-field types | *dissolved aroma* (`AromaTag`'s shape) | `{ word, strength }` in OU/kg; `{ type, amount }` in g/kg |
| `OdorousMixin` (`lib/material/Odorous.ts`), `OdorousMaterial`, `OdorousConsumableMaterial` | mixin + two thin classes | *material opt-in* (`RadioactiveMaterial`) — the owner's ruling | `smells` (cold) + `burning` (what burning gives the AIR); `combustionImparts` untouched |
| `OlfactoryMixin` (`lib/perception/Olfactory.ts`) | mixin on the body (D21) | *species threshold* (`ACUITY_THRESHOLDS` moved onto the body as a multiplier) + *a seeded trait at birth* (the per-aroma sensitivity) + *adaptation* (**genuinely new** — searched `lib/perception`, `lib/metabolism`, `lib/behavior`, `lib/trait`, `lib/belief`; nothing models habituation) | **the nose of a body**: `nose()`, acuity, adaptation, the place stamp, `onMoved`/`onLinkdead` |
| `PalateMixin` (`lib/metabolism/Palate.ts`) | mixin on the body (D21) | *a seeded trait at birth* (blood's derive-on-read) + *exposure and aversion* (`Soilable.deposits` record shape on the spine) + *liking* (**genuinely new**, searched as above; nothing models a hedonic read) | **the mouth of a person**: `tongue()`, born offsets, exposure, aversion, `liking()`, the `heritage()` seam |
| `mustBeTastable` (`lib/command/validators/mustBeTastable.ts`) | arg validator | *who can be tasted* (re-hosted: the gate is *could it reach your mouth*, D15) | three arms; `mustBeEdible` stays `eat`'s |
| `CorrosionInflictSpec.bare?: true` | one optional flag on a shipped spec | — (the shipped corrosion seam, `Material.corrodeOnContact`) | an ingested caustic skips the covering stack (D15) |
| `AromaReading` (`platform/idea/reading/AromaReading.ts`) + row `aroma.yaml` | Reading subclass + row | *the reading ladder* (`CleanlinessReading`, `AtmosphereReading`, the gas analyzer) | eye rung = the nose, deliberate; instrument rung = OU with a bracket |
| `lint:aromas` (`scripts/check-aromas.ts`) | content gate | *silent field drop* | words resolve to rows in a pack the namer depends on; `smells:` only on Odorous classes; a recipe's `medium` tag is carried by some material in reach |
| `Provision.bites` + its augmenter | one field on an existing class | — | *a small bite that shows on it*; no mixin |

Not substrate: `SmellModality`'s internal accumulator (today's
`ConcentrationAccumulator`) stays internal; `emissionOf(thing)` returns a
`Smell` (hop-0 sources), so there is no `Emission` type.

Retired by this build: `AROMAS`, `RECIPE_MEDIA`, `SmellSourceMixin` (+ its
observer hook and `Adornable.getFixtureSmellSources`), `PalatableMixin`
(`ServingVessel` keeps its name and its meaning as a kind; it composes
nothing extra), `ACUITY_THRESHOLDS`, `CANDLE_SMELL_PPM`, `CLAMP_SMOKE_PPM`,
`AppSettingKeys.cleanlinessOdourNoticedPpm`, `FRESHNESS_PHRASE`'s smell
sentences (the vision phrase stays), `TemplatePaths`-less free text
identities everywhere.

No new Api. No new logic singleton. No new document kind. No new
collection. No new module category. No free helper.

---

## Plan-level decisions

Numbered so waves and commits can cite them. D1–D11 answer the eleven
engineering questions the planner was handed, in order.

### D1. The unit under one nose: odor units, and four factors

**The quantity is the odor unit (OU): a source's strength as a multiple of
its aroma word's detection threshold.** 1 OU = just detectable by a normal
nose; the intensity ladder `INTENSITIES` (1·30·300·2000·8000) is kept
verbatim and now reads OU everywhere. `Smell` becomes per-word:
`notes: readonly { word; ou }[]` (sorted descending), `strength` = the top
note's OU, `sources: { stuffId; word; ou; hops }[]` (hops added so the nose
can tell same-room from beyond). `Quantity<'OU'>` is added to `Unit`. `ppm`
leaves `Smell`, `SmellSource`, `Soilable` and the golden.

How each source yields OU, all in one function (D3):

- **A substance** (`OdorousMixin.smells: [{word, strength}]`): `strength`
  is authored as **OU of one kilogram at 293 K in the open**.
  `ou = strength × f_amount × f_heat`.
- **`f_amount = sqrt(kg / 1 kg)`** — the compressive scale the owner
  accepted; a spoonful (10 g) is 0.1×, a barrel (100 kg) 10× — two bands
  apart on the ladder.
- **`f_heat = 2^((T − 293) / 10)`** for a host that composes `Thermal`
  (vapor pressure roughly doubles per 10 K; clamped to [1/64, 64]); 1 for
  anything without a temperature. A warm loaf at 330 K reads 13×; a frozen
  carcass at 253 K 1/16× — under one band, *barely*. No vapor model, one
  line.
- **A dissolved aroma** (`dissolvedAromatics` mg/L): at zero distance
  (`taste`, `smell <glass>`) `ou = amount / threshold(word)` exactly as
  `render` reads today, so every shipped whisky read keeps its words. As a
  ROOM source an open vessel contributes `ou × OPEN_VESSEL_TAU × f_amount(L)
  × f_heat` with `OPEN_VESSEL_TAU = 1/30` (one band under the glass) — a
  dram scents a room faintly, a 200 L cask clearly. One constant on
  `SmellModality`, named, no physics claimed.
- **Dirt**: `DirtKind.odor = { word, ouPerLoad }`; `ou = Σ load × ouPerLoad`
  per word. The five shipped `ppmPerLoad` figures carry over ×10 (a
  dung-caked boot at half load should read *clearly*, not *faintly*).
- **Rot**: band → the `rot` word at 30 (tainted) · 300 (spoiled) · 3000
  (rotten) OU, × `f_amount` × `f_heat`. Both arms (`FreshnessMixin` on a
  Provision, `Freshness` on a bulk slot).
- **A corpse**: stage → `blood` 30 (stale), `decay` 3000 (decomposed),
  `decay` 30 (spent), × `f_amount` × `f_heat`; `fresh` emits only the
  species' living smell.
- **A living animal**: `Species.smells` × `f_amount(body mass)`.
- **A fire**: a lit `Firebox`'s fuel bed → each fuel material's `burning`
  words × `sqrt(bed kg)`; unlit → nothing (the clamp rule, generalized).
- **Ground and water**: the location's floor is a content item (ground.md
  mints one per Location) and reads through its material like any Tangible;
  a `WaterPlaceMixin` location adds its water material's smell at
  `f_amount(100)`.
- **Containers**: a `Container` item's contents are walked (depth-first,
  the same accumulator); a container that `isSealable` and `!isOpen()`
  contributes nothing from inside; a `Bulkable` vessel's interior likewise.
  A body is a Container, so what you carry counts, and a sealed box in your
  pack holds it in.
- **Distance**: `SmellModality.hopTau() = 1/30` — one band per hop through
  a doorless exit (the per-modality accessor `Modality.ts` invites; the
  shared `EXIT_TAU = 1.0` stays for sound/vision); a boundary's
  `SmellConduit.transmissivity` multiplies on top. `MAX_HOPS = 2` stays.

**The gas analyzer's figure is OU**, per note, with the honest bracket — the
quantity the nose reads, as a number (D8 of the requirements' lens 5).
`Soilable`'s ppm, `SmellSource`'s ppm and `Smell`'s ppm all become OU; the
atmosphere channel's `ppm` is untouched.

### D2. Where the one nose lives: on the body, behind `perceiveFor`

`OlfactoryMixin.nose(signal: Smell, opts: { self?: Stuff; deliberate?: boolean }): Scent`
(D21) is the one read. It applies, in order: species acuity (D1's threshold shift:
`keen ×10`, `normal ×1`, `dull ×0.1`, `none` → empty), adaptation (D4),
drops notes under 1 OU (**nobody** reads sub-threshold), sorts by OU
(dominance = furthest past threshold), names each note at the depth the
reader's competence allows (D12), and keeps `untrained 1 · novice 2 ·
competent 3 · proficient 4 · expert all` notes (`deliberate` = `analyze`,
which keeps all the reader can name). `SmellModality.perceiveFor(viewer,
loc, signal)` forwards to `viewer.nose(signal)` when `MixinApi.isOlfactory(viewer)`
and returns null otherwise (today's default). So `smell`, `analyze aroma`,
`taste` (for the retronasal half, through `PalateMixin.tongue`) and a later
brain all call `PerceptionApi.perceiveAt(viewer, loc, smell)` or
`viewer.nose(...)`, and there is one place to be wrong. The controller words the `Scent`
(`Scent.phrases()` gives `<intensity> of <name>` strings, no digit; the
controller composes the sentence and the source naming, D13). No Api
method takes a world object first (`lint:object-verbs`).

### D3. Who answers "what do you emit": one derivation over kernel mixins, no new mixin on things

`SmellModality.emissionOf(thing: Stuff): Emission` (an accumulator of
`{word, ou}` by source) composes the D1 legs over the mixins the thing
ALREADY composes, each narrowed with `MixinApi.isX`: `isTangible` (material
→ `isOdorous(material)`), `isThermal` (heat), `isBulkable` (interior
material + `dissolvedAromatics`, sealed check via `isSealable`), `isFresh` /
the bulk `Freshness` (rot), `isSoilable` (dirt), `isPostmortem` (decay),
`isOrganism` (species), `isFirebox` (fuel burning), `isContainer` (+
`isSealable` closure, recursion). No duck typing, no `?.()`, no structural
cast (P4). No `SmellableMixin` on `Thing`: every leg is a mixin that already
means something, so no host answers an honest "no" to a field it carries
(P2) — the derivation answers "nothing" for a plain thing without the thing
carrying anything. `SmellSourceMixin` retires: both composers derive from a
`Firebox` fuel bed now, so an authored stored emission has zero consumers
after this build (never invent the third; the flowers slate re-adds an
authored emission on the flower when it arrives, and that is the honest
time). `Adornable.getFixtureSmellSources` retires with it; the fixture leg
(c) calls `emissionOf` on each fixture.

### D4. Adaptation: exposure is the body's presence in the air, reconciled on read, no tick

Staying counts whether or not anyone types `smell`. So exposure is read off
**where the body has been**, not off its reads. Two pieces of runtime state
on `OlfactoryMixin` (D21), neither persistent (a restart brings a fresh
nose, which the requirements' restart step permits):

- **`placeStamp: { placeId: string; sinceS: number } | null`** — when this
  body arrived in its current place. Written in the mixin's `onMoved(from,
  to)` (the `Containable` post-move witness, `lib/spatial/Containable.ts:165`;
  chained inner-first exactly as `ThermalMixin.onMoved` does at
  `lib/thermal/Thermal.ts:1987`) with `sinceS = WorldClockApi.getNow()`.
  There is no general arrival stamp on a body today — verified: the only
  one is per-place, `WaterPlace.arrivedAtS(thing)` (`lib/location/WaterPlace.ts:363`),
  and `Mobile.autoSenseOnArrival` shows, it does not stamp. A stamp is not a
  walk: nothing smells the air on arrival.
- **`adaptation: Record<word, { level: number; lastAt: number }>`** —
  `level` in bands (0..`ADAPT_MAX = 2`), `lastAt` the last read that found
  the word.

On a nose read at `now` for every word `w` present, with `stay = now −
sinceS` (`sinceS = now` when the stamp is null — a body never moved reads
as just arrived):

1. no record for `w` → `level = min(MAX, stay / RISE)` — **time in place
   counts on a first read**, so someone who stood in the tannery an hour
   and only then typed `smell` reads it faint;
2. `lastAt ≥ sinceS` (the last read was during this stay) → `level +=
   (now − lastAt) / RISE` — **continuous however long the gap**;
3. `lastAt < sinceS` (the last read was in an earlier stay) → `away =
   sinceS − lastAt`; `level = max(0, level − away / FALL)`, then `level =
   min(MAX, level + stay / RISE)`.

Clamp; stamp `lastAt = now`. A word absent from a read is not stamped and
ages into case 3 by itself. `RISE = FALL = 600` game-seconds per band (a
few steps over minutes). Effective OU = `ou / 30^level`.

**Moving between two places that share a smell** (the yard to the next
room): the stamp resets at the door, so `away` is only the walk between
the last read there and arriving here — near zero — and the new stay then
counts; a person who walks out, waits twenty game-minutes somewhere the
smell is not, and walks back has `away ≈ 20 min` and reads it strong
again. **Time away is measured from the last read that found the word to
the start of the current stay**; a stay in which the word was never read
counts as a stay away from it — the one approximation, written down: the
nose tracks stays, not every room's air, because the alternative is a walk
on every arrival, which is out of scope.

**Offline is frozen.** `OlfactoryMixin.onLinkdead()` (the shipped override
hook) stamps `frozenAtS = now`; the next read adds `now − frozenAtS` to
`sinceS` and to every `lastAt` and clears it, so neither rising nor
falling happens while nobody is in the body. A restart (runtime state gone)
reads as a fresh nose. ⚠ So does a **deliberate sign-out**: !527's D30 saves and
destructs a signed-out body (a bare drop stays linkdead where it stands), so
adaptation and the place stamp go with it, and only a linkdead body freezes.
`exposures`/`aversions` must be in the save that precedes the destruct; they
are `persistent` and the round-trip test covers it. A signed-out player also
stops being a source in the room.

**Your own smell starts adapted**: notes whose only hop-0 sources are the
viewer's own body (`stuffId === viewer.stuffId`) read at `ADAPT_MAX`; a
carried thing is not you. Nothing runs on real time; every stamp is
`WorldClockApi.getNow()`.

### D5. The profile, exposure and aversion: derived where it can be, a bounded record where it cannot

- **Born profile**: a pure function of identity + species, **stored
  nowhere** (the blood precedent). Each mixin draws its own half from the
  same seed: `OlfactoryMixin.bornSensitivity(word)` (a threshold shift per
  aroma word, ±0.5 band) and `PalateMixin.bornOffset(word): { sensitivity;
  liking }` (per taste and per word, ±0.5 band and ±0.3 of liking) =
  `Seeded.unit(seedFromString(identityPath), hash(salt + word))` scaled into
  `±Species.palate.spread`. The **parents seam**: `PalateMixin.heritage()`
  → `null` today → the species draw; the household build supplies the
  parents' offsets as the center and the same spread, and the nose reads
  the same seam through `isPalate`. One function, two inputs; no parents
  invented.
- **Exposure**: `exposures: Record<word, { times: number; lastAt: number }>`,
  `persistent + runtimeState`, written by the body's own `eat` and `taste`
  (ingestion only), bounded at 64 keys (evict the oldest `lastAt`).
- **Aversion**: `aversions: Record<foodKey, number /* symptomsAt */>`,
  `persistent + runtimeState`, bounded at 32. `foodKey` =
  `payload.recipeId ?? material.getTemplatePath()` (what `lastMealLabel`
  already derives from). **Written in `Metabolic.routeIntake`** at the
  moment the dose is known to hurt — a pathogen load ≥ `infectiousDose` on
  an `infect` organism, or any formed toxin — stamped with the condition's
  `symptomsAt`, so the aversion *reads* only once symptoms arrive (the
  Garcia effect without a new hook). No new collection; on an Avatar the
  spine captures both records; on an NPC they die at reboot (documented in
  § Risks).
- **Cheap on a body with no history**: both records default `{}`; the born
  profile costs one hash per word read.

### D6. The liking read: signed, per person, a curve per word

`PalateMixin.liking(notes: readonly Note[], opts: { foodKey?: string }): Liking { score: number /* −1..1 */; word }`.
Per note with `L = log10(ou)` (≥ 0): a hedonic curve `{ peak, width, valence }`
→ `h = valence × (1 − ((L − peak) / width)²)` clamped to [−1, 1] (the hump:
past the peak it goes negative — *badly made is the same curve past its
peak*); plus the born liking offset (D5) and `min(0.3, 0.03 × exposures[w].times)`.
Score = the L-weighted mean. Then **hunger**: `score += 0.6 × (1 − satiation)²`
off `getReserve('satiation')`. Then the overrides: a note with
`valence = −1` at ≥ 300 OU (rot, decay, a `fault` row) caps the score at
−0.6 — *everyone agrees about a rotten one*; an aversion whose `symptomsAt`
has passed caps it at −0.6. Words: `revolting ≤ −0.6 < unpleasant < −0.2
≤ indifferent ≤ 0.2 < good < 0.6 ≤ delicious`. **Authored where**:
the five tastes' default curves are `TASTE_HEDONICS` beside `BASIC_TASTES`
(physiology, closed with it); an aroma row carries its own `liking:`
(default `{peak: 1.5, width: 2, valence: 1}` when absent; `rot`, `decay`,
`solvent`, `sulfur` author `valence: −1`); **`Species.palate: { spread, curves: Record<word, curve> }`**
overrides per word (the grain: a realm authors a different species). The
food stores no score; nothing judges the dish.

### D7. Taste strengths: amounts on `Material`, thresholds in physiology, blends by mass fraction

`Material.tastes` changes shape from `string[]` to `TasteTag[] { type, amount }`
with `amount` in **g/kg** of the substance (sucrose in sugar ≈ 1000, NaCl in
salt ≈ 1000, in brine ≈ 250, in a seasoned stew ≈ 2). `TASTE_THRESHOLDS`
(g/kg: sweet 5, salty 1, sour 0.5, bitter 0.005, umami 0.3 — order-of-
magnitude literature figures) sit beside `BASIC_TASTES` and `TASTE_HEDONICS`;
`ou = amount / threshold`. The taste ladder is its own and less compressive
(`1·3·10·30·100` → the same five words), because taste perception is
(Stevens exponent ≈ 1). **A blend**: `amount_t = Σ fraction_i × amount_i`
over `payload.makeup` (mass fractions already carried; linear in g/kg) — a
pinch of salt reads *barely*, brine *overpoweringly*, and 0.05 g/kg quinine
reads *clearly* bitter through 100 g/kg sugar with no rule written for it.
**Host: stays on `Material` until decomposition.** `Muscle` (edible, not a
`ConsumableMaterial`) is the proof the taste host is a decomposition
question, not this build's: moving `tastes` onto `ConsumableMaterial` would
strand meat. `setTastes` stops dropping unknown words silently and throws
(P3). `Flavor` = the tastes' notes + the aromas at zero distance
(dissolved at full OU; an Odorous material at `strength × 1`; rot's note);
`PalateMixin.tongue(flavor, opts): Savor` applies the born sensitivity per
taste, runs the aromas through `nose`, and attaches `liking`.

### D8. Failing loudly: a lint at CI, a resolving setter at load, a diagnostic at the nose

Three layers, none silent:

1. **`lint:aromas`** (`scripts/check-aromas.ts`, in `lint:family` by
   derivation) walks every pack's rows and refuses: an aroma word (in
   `smells`, `burning`, `combustionImparts`, `imparts`, `charredImparts`,
   `dissolvedAromatics`, `DirtKind.odor.word`, `Species.smells`, and the
   kernel's own constants `rot`/`decay`/`blood`) that does not resolve to a
   row at `/stuff/idea/aroma/<word>` in a pack the namer depends on (the
   `lint:pack-extends` dependency rule); a `smells:`/`burning:` key on a row
   whose class does not compose `OdorousMixin`; a `tastes:` entry in the
   old word-list shape; a recipe `medium:` tag no material row in the
   recipe's pack or its dependencies carries in `tags`. Zero exemptions.
2. **The setter resolves its words**: `OdorousMixin.setSmells` /
   `setBurning`, `Species.setSmells`, `DirtKind`'s odor setter and
   `Material.setCombustionImparts` become async, validate shape, then
   `await StuffApi.singleton(TemplatePathPrefixes.aroma + word)` for each
   word — **load on use by following the authored reference** (P7; the
   material loads when a thing is made of it, and its words load with it),
   and a missing row throws at mint, go-live and restore, naming the word
   and the row. `Recipe.fromData` (sync, at install) validates shape only;
   its words are the lint's.
3. **The nose never skips quietly**: `Aroma.resolve(word)` (sync
   `findByTemplatePath`, kick `singleton` on a miss, the `dirtKind` shape)
   returning null at read time records a `DiagnosticApi` **error** naming
   the word and the source, and the note is dropped from that read only.
   With layers 1–2 this cannot happen on shipped content; it is the seam a
   live author sees in `errors`.

The `lint:instanceable` orphan-key ratchet is not relied on (a misspelled
key passes under 306).

### D9. The passes: five batches by pack, one shape each, audited claims, verbatim edits

Who: the build agent fans out one subagent per batch (disjoint files; each
agent edits only the keys named, with `Edit` old/new pairs, never a rewrite
of a row). Truth: every strength and every word is an order-of-magnitude
claim about a real substance; each batch agent returns a per-row line
*(row · word · basis)* which the build commits in the wave's MR note (not in
the YAML), and the build agent spot-checks ten rows per batch against the
basis before committing (**Audit authored factual claims**). Batches and
rules in § W7.

### D10. The drive: one wire file, one walk, staging named per step

`packages/wire/tests/vocabularies-to-rows.dirty.wire.test.ts` (dirty: it
bites apples and spoils meat the world does not regenerate) +
`e2e/tests/vocabularies-to-rows-walk.spec.ts`. Harness: `Session.open` with
`committees: ['/world/terminus/wharfside']` etc. for the `eval` seats;
never `parcels:` on a group's extent. Per-step tools and the two tools this
build owes are in § Test & gate strategy.

### D11. Wave order: the unit and the words first, then sources, then the nose, then the tongue, then the person

The fault line is **one unit under one read**: a world where the walk says
ppm and the drink says mg/L-multiples disagrees with itself. So W0 lands
the unit and the rows with every shipped read unchanged in words; W1 makes
every source speak OU through one derivation while the controller still
applies a flat species nose; W2 is the nose; W3 the ladder; W4 the tongue;
W5 the person; W6 media; W7 content; W8 the drive. After every wave the
game is honest: no wave leaves an old read and a new read of the same
thing disagreeing.

### D12. The tree and naming depth

An aroma row's `extends:` chain IS the tree (`peat smoke extends smoke`;
`sour milk extends sour`). `Aroma.onCreate` reads its own row
(`Template.findByPath(this.getTemplatePath())`, `lib/stuff/Template.ts:452`)
and keeps `ancestry: string[]` (words, root first) at runtime; `threshold`,
`discipline` and `liking` inherit through the effective `data`. The reader's
band in `max(payload.discipline (the maker's), row.discipline (the aroma's
own), walked up the chain)` → depth: untrained 0 (the root word), novice 1,
competent 2, proficient 3, expert the leaf. Two notes that name to the same
word at the reader's depth merge (their OU add) — an untrained nose reads
*smoke* once, not *smoke* and *smoke*.

### D13. Naming the source

A `Scent` note carries `sourceName: string | null`. **The nose resolves it,
not the controller** (the rule of an act lives with the act: !527's
`lint:controller-decisions`, and P5). For a bare read, a note is named only
when **every** hop-0 source of that word is one visible thing
(`PerceptionApi.canPerceive`/`VisionModality.canSee(viewer, thing)` — the
existing light gate) and there is exactly one; beyond hop 0, never. The
controller only words the `Scent`. `smell
<thing>` reads `emissionOf(thing)` at zero distance and always names it. In
the dark nothing is named. `smell me` is `smell <self>` through the own-smell
adaptation (D4), so it reads low; `smell <other>` reads them at full.

### D14. The reading channel

`aroma.yaml`: `channel: aroma`, `kind: fact`, `scope: [here, subject]`,
`discipline: ''` (the nose bands per WORD, D12, so the Reading's own band is
not used for the eye rung), `instrument: gas-analysis`, `instrumentNoun: a
gas analyzer`, `eyeCeiling: expert`. `analyze` = `nose(signal, { deliberate: true })`
worded as a list; `measure` = per note `observe(ou, band, seed)` → *smoke:
410 OU ± 20* etc. (the `head` channel's rule: the bracket is quoted off the
reading). `readings aroma` lists both rungs like every channel. The Duncan
Hall analyzer gains the channel with no row change (it already carries
`gas-analysis`).

### D15. Tasting is contact with a cost — and the gate is not edibility

**The gate.** `mustBeEdible` cannot be it: lye (`packages/content/trade-chandlery/content/trade/chandlery/idea/material/lye.yaml`)
is `edibility: false`, `toxicity: []`, `corrosiveTo: [protein, tissue]`, and
the requirements want it tasted. A new validator
**`lib/command/validators/mustBeTastable.ts`** — *anything you could get
into your mouth* — passes a bound Stuff on any of three arms, in the
binder's words when none holds (*you can't taste <the floor>*):

| arm | predicate | the mouthful it takes |
|---|---|---|
| **edible matter** | `isTangible && isEdible()` (`mustBeEdible`'s first arm, reused) | a **bite**: `TASTE_KG = 0.01` off the mass, `Provision.bites += 1`; an item bitten to nothing is destroyed like an eaten one |
| **held matter** | `isBulkable && hasInteriorBulk() && !isBulkEmpty('interior')` — whatever a vessel holds, liquid or powder, edible or not (a stew, a lye flask, the foreshots, wash water, a sack of flour, a sack of arsenic) | a **sip**: `TASTE_LITRES = 0.01` out of the slot via `BulkableApi.transfer(slot, null, { kind: 'measure', litres })` |
| **a solid that would do something** | `isTangible` and its material has a `toxicity` tag with `amount > 0` or `getCorrosiveTo()` naming `tissue`/`protein` (a lump of quicklime — `packages/content/trade-quarrying/content/trade/quarrying/thing/quicklime.yaml` over `caustic/quicklime`, `corrosiveTo: [tissue, …]`; a cake of caustic soap). ⚠ Not a lead pig: `element/lead.yaml` authors `toxicity: [{lead, amount: 0}]` — its dose comes by the leach, so a lick of it is inert and arm 3 refuses it honestly | a **lick**: nothing taken, no bite, the dose or the burn only |

Refused: a floor (stone), a table knife (steel), a chair, a book, a brick —
any solid of inert matter. **Inedible toxic solids are tastable and dose
you** — that is the point of arm 3; an inert solid is not, which is what "a
floor and a knife cannot" means. (A tallow candle passes arm 1 if its row's
tallow is `edibility: true`, as a cooking fat is; a bite of candle is a
bite of tallow, which is honest.)

**The act is the body's, on `PalateMixin`**: `taste(food): TasteOutcome`, in
`lib/metabolism/Palate.ts` rather than beside `eat`. It tastes with the
tongue the mixin already owns, and it calls `canIngest` and `ingest` as
`EatingMixin` does, so **it touches neither `Metabolic.ts`'s act surface nor
!527's `Eating.ts`** and that collision is gone. `PalateMixin` composes over
`MetabolicMixin` (typed to it, the `Eating` precedent) and contributes
`taste.yaml` (`static commandContributions`, moved off `Perceiver`; `smell`
stays there). `TasteOutcome` follows !527's D4 convention: `{ok:false, reason}`
with a reason union (`airway` carries its `line`, the `EatOutcome` precedent),
`{ok:true, ...facts}`, no `Mml`; the controller's wording is an exhaustive
`switch`. A bulk mouthful goes through the same slot path as
`SipController` (`BulkableApi.slotFor`, `isEmpty`, `new Freshness(slot).ingestPayload()`,
`BulkableApi.transfer`), so a tap and a well answer as they do for `sip` once
water-supply lands. The act: `canIngest` gate; `Flavor` via `TasteModality.flavorOf(food)`; the
mouthful per the arm above; the dose through **the one path**:
`ingest(material, TASTE_LITRES, phase, ingestPayload, hostKg = the
mouthful's kg)` → `routeIntake`, so per-serving toxins scale by the
mouthful's mass (`MaterialApi.blendToxicity(payload, material, kg)` already
takes it), dissolved toxins scale by litres (foreshots dose a fortieth of a
drink), pathogens expose as they do for `eat`; then `tongue(flavor)` →
`Savor`; the controller words it, and `TasteOutcome.burned` when the
corrosive leg landed. **A bare `taste` is refused by the controller**, in
words: *You'd need something in reach to taste.* The arg stays `required:
false` with no `default`. ⛔ Not a `missing:` key (the first draft's idea):
the command schema has no such key and is `additionalProperties: false`, so
it would fail the view, and with it the platform pack's install; and a
required arg with no default refuses in engineer's words (`missing required
arg`) or silently (instrumentation.md). `lint:command-views` holds this.

**The caustic mouthful — one path for `taste`, `eat`, `drink` and `sip`.**
`routeIntake` gains a **corrosive leg** beside the toxin legs: for the
intake's material and every `payload.makeup` part's material
(`StuffApi.findByTemplatePath`, as `Palatable.ingredientsOf` does today), a
material whose `getCorrosiveTo()` names `tissue` or `protein` calls its own
`corrodeOnContact(self, { site: 'body.head', energy: min(1, litres /
SIP_LITRES), bare: true })` (`lib/material/Material.ts:2075` — the shipped
substance-contact seam, which routes a `CorrosionInflictSpec` through
`ConditionApi.inflict`). The wound is the **`caustic` trauma**
(`platform/idea/api/ConditionLogic.ts:83` maps `corrosion → 'caustic'`;
harm.md § the ten behaviors still lists caustic as *reserved* — stale, and
the sweep corrects it; `corrodeOnContact`'s own doc says the wound *grows on
its own clock and `rinse` resolves* — `cmd/medical/rinse.yaml` ships). The
body plan has no mouth part (biped's parts are `body.head`, `body.torso`,
the limbs); the wound sits at **`body.head`**. ⭐ **`bare: true` is new on
`CorrosionInflictSpec`** (`api/condition.ts:179`): `inflictThroughStack`
(`ConditionLogic.ts:1227`) resolves the covering stack at the site for every
insult, so without it a hat would shed the lye you swallowed; `bare` makes
the stack empty (the agent is already inside). One optional flag, one `if`
in the fold, documented in harm.md. No condition ROW is needed — a trauma is
not a Condition row; the `caustic` behavior exists in code.

**How the drive observes it** (step 23): the taste's self line carries the
outcome (*You taste the lye. It burns.*), `analyze patient me` (the
`trade-medicine` `patient` reading) names a caustic wound at the head, and
`rinse` resolves it. A `drink` from the same flask burns at full energy by
the same leg — asserted once, so nobody later "fixes" tasting into the only
way lye hurts.

### D16. Rot and decay keep vision, lose their fixed smell sentences

`FRESHNESS_PHRASE` keeps the vision line (*It looks off / has gone bad /
is rotten, crawling and foul*) under `filter.includes('vision')` only; the
smell leg of `freshnessAugmenter` and `Freshness.senseLine`'s smell arm are
deleted — rot reaches the nose only through D1's source (so a rotten side
of beef reaches the next room, which three fixed sentences never could).
`Postmortem` gets no augmenter; the corpse smells through D1.

### D17. Media derived

`Recipe.medium: string` is any tag (shape-validated: a lowercase slug);
`RECIPE_MEDIA` and `RecipeMedium` go. `mediumCapK(material)` = the lower of
`smokePoint` and `boilingPoint` among those > 0; 0 if neither. `findMediumMaterial(medium, …)`
unchanged in shape (by tag). `resolveMediumCaps` returns `Map<tag, cap>` over
every tag of every banked contribution (tags are few) and `matchBuild`
consults `caps.get(recipe.getMedium())`. `pickCandidate`'s fat rule reads
the same way for any tag. Content: the 8 recipes keep their words
(`water`/`fat` are tags already); three new trade-cooking recipes — a brine
boil (`medium: brine`), a poach in wine (`medium: wine`), a sand roast
(`medium: sand`) — over material rows that carry those tags (`salt-water`
gains `brine`; a `wine` ConsumableMaterial carries `wine`; `earth/sand`
carries `sand`; verified per row by the lint's media arm).

### D18. The gate ends at 3, and the three name where they go

Delete `AROMAS` (W0) and `RECIPE_MEDIA` (W6); `CLOSED_VOCABULARY_CEILING = 3`
after W6 (4 between). The gate gains a `MIGRATING: Record<name, slate path>`
beside `CLOSED_BY_DESIGN` that the `--report` prints and the test checks
(a stale entry fails, like a stale `CLOSED_BY_DESIGN`): `MATURATION_MECHANISMS
→ docs/slates/builds/material-decomposition-slate.md`, `DISPLAY_KINDS`/
`DISPLAY_PAIRINGS → docs/slates/tails/display-manifestation-slate.md`. None
enters `CLOSED_BY_DESIGN`.

### D19. American English

`sulphur` → `sulfur` as the row is minted; `DirtKind.odour` → `odor`,
`Soilable.soilOdour` → `soilOdor`, `DirtOdour` → `DirtOdor`, the 5 dirt rows'
key; `cleanlinessOdourNoticedPpm` retired outright. The deliberate sweep
the language rule asks for, scoped to the field this build touches.

### D20. What does not move

`combustionImparts` (what fire puts INTO food) stays on `Material`,
validated by D8's lint and setter; `Maturing`/`Fractionating`/`Faced`/
`BulkableLogic`/`CraftingLogic`/`MillController` keep their `AromaTag` mg/L
arithmetic untouched (they read thresholds only through `Aroma`); `sense`
on arrival (`Mobile.ts:623`) untouched; `MATURATION_MECHANISMS`,
`DISPLAY_KINDS`, `DISPLAY_PAIRINGS` untouched; the shared `Traversal`
frontier and walk order untouched (the golden still pins order; only its
unit and its values change).

### D21. Two mixins on the body, not one: the nose and the palate

The first draft put the nose, adaptation, the tongue, the born profile,
exposure, aversion and liking on one `PalateMixin` — named for the mouth
while holding the nose. That is the shape controllers-are-io is carving out
of `Metabolic`/`WaterPlace`/`Organization` (its `lint:mixin-clusters`,
`origin/build/controllers-are-io:packages/server/scripts/check-mixin-clusters.ts`:
*a mixin is one idea; two ideas that never touch are two mixins* — connected
components of `this.X` co-use among instance members, field and accessors
folded to one node; its `lint:mixin-files`: one factory per file named for
it). Read as that heuristic would: the nose's members (`nose`, `adaptation`,
`placeStamp`, `frozenAtS`, `onMoved`, `onLinkdead`, the acuity read, the
per-word sensitivity offset) co-use each other and nothing of the tongue's;
the tongue's (`tongue`, `liking`, `exposures`, `aversions`, `recordExposure`,
`recordAversion`, the taste sensitivity offset, `heritage`) co-use each other
and reach the nose only through one call on `this` narrowed by a predicate.
Two clusters. So:

- **`OlfactoryMixin`** (`lib/perception/Olfactory.ts`, `_mixinName =
  'OlfactoryMixin'`, `MixinApi.isOlfactory`, `Mixins.Olfactory`) — **the
  nose of a body**: `nose()`, species acuity, the born per-aroma
  sensitivity, adaptation, the place stamp, `onMoved`, `onLinkdead`. Lives
  in `lib/perception` beside `Smell`/`Scent`: it is the perception side.
  Named for the sense, as `Species.olfactoryProfile` already is.
- **`PalateMixin`** (`lib/metabolism/Palate.ts`, `_mixinName =
  'PalateMixin'`, `MixinApi.isPalate`, `Mixins.Palate`) — **the mouth of a
  person**: `tongue()`, the born per-taste sensitivity and per-word liking
  offsets, `liking()`, `exposures`, `aversions`, the `heritage()` seam.
  `tongue` narrows `this` on `isOlfactory` for the retronasal half (both
  compose on `Creature`; a body without a nose still tastes salt). Lives in
  `lib/metabolism` beside `eat`'s dose path, which is what writes to it.

P1: each cites its ledger rows (§ New substrate). P2: both compose on
`Creature` and every Creature is honestly both (a frog smells and tastes; a
species with `acuity: none` composes the nose and reads nothing, which is
an empty read, not a guard). Both pass the branch's two gates by
construction (one cluster each, one factory per file named for it). The
name `Palate` is now honest — it holds the tongue and what it likes, which
is what a palate is.

### D22. Build against what !527 becomes (re-read at `9f1814e12`, 2026-11-07)

!527 is 1,778 files and will probably land during this build. Branch off
master and don't wait for it (never gate on a sibling). **The day it lands:
merge master at once, `pnpm install`, `lint:family`.** Until then write new
code in its shape, so the merge is a rename and not a redesign:

| !527 | what this build does |
|---|---|
| D4 one outcome convention: no `Mml` on an act, a reason union, an exhaustive `switch` in the controller | `TasteOutcome`; `Scent`/`Savor` are percepts, with no sentences on the body |
| D5/D26 `lint:controller-decisions`, `-functions`, `-mutations` | `SmellController`, `TasteController`, `EatController` read and word: no arithmetic, no thresholds, no module functions, no mutators. Ceilings may only fall |
| D6 `Eating.ts`/`isEating` | W5's `eat` edits land there; `taste` is on `PalateMixin`, clear of it |
| D16 one word; D24 `category:` required; `lint:command-views` hard-fails a bad view | `taste.yaml` one word, `category: perception`, no unknown keys |
| `ignite` → `light`; `make` → `do`; `boil`, `scrub`, `pour` views unified | the drive and walk use the post-merge word; check every verb in the walk again on the merge |
| renames: `lib/craft/Tool`, `lib/bulk/Cutlery`, `lib/reserve/Reserved` | import from wherever master has them at the time |
| D22 keywords only, no name tiers | aroma rows are not targets; `taste apple` and `smell <one>` resolve by keyword; assert in the drive |
| D27 a crowded place is a requirement | `smell` recurses into every body in reach (D1, MAX_HOPS 2). It runs only when typed, never on a move. Add a `smell` timing to `crowd.soak.wire.test.ts`; if that is slow, the fix is the walk |
| D30 signed-out bodies are destructed | D4's note; the soak's long jumps and step 32 exercise the save |

### D23. Water supply (re-read at `c291df5fc`, 2026-11-07)

Water is carrying what the tongue should read, and it adds one thing that
must stay silent:

- ⭐ **`salinityPpt` rides the payload** (`lib/supply/WaterChemistry.ts`), so a
  well going salty is a state this build can tell you about. 1 ppt is 1 g/kg,
  so `flavorOf` reads it directly as `salty`, and when a payload carries it, it
  wins over the material row's own amount. A player can then taste a well
  turning, with no rule written for it. pH and hardness are not read in this
  build (a tongue would notice very acid water, but no consumer is asking).
- ⛔ **Fouled water announces itself to no sense**: `watershed.md` says so, and
  it is the epidemiological point of the water design (the only way to find a
  source is to compare outcomes). `fouled-water` and `tainted-water` get no
  `smells` and no `tastes`, and the drive asserts it. Lead from a pipe (`leaches`)
  stays silent the same way.
- `salt-water.yaml`: its toxicity type becomes `salt-poisoning` on that branch,
  so a taste of it doses that. W6 adds a tag to the same row; trivial merge.
- `lib/quantity.ts` and `lib/mixin.ts` gain entries beside ours; trivial.
- `CraftingLogic` (13 lines, the mend cap) is clear of D17.

---

## ⭐⭐ Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else on that host.

| what | host | what composing it claims — and the P2 count |
|---|---|---|
| `OdorousMixin` (`smells`, `burning`) | `OdorousMaterial`, `OdorousConsumableMaterial`, `Muscle` (direct), `PotionMaterial` (arcana opts in) | *this substance has a smell.* Rows choose it; a plain `Material` holds no smell data at all. Of the 384 rows the pass judges, roughly 200 will move to an Odorous class (every food, fuel, fat, resin, dung, tar, soap, every edible muscle); iron, glass, clean water, stone stay plain. Every Odorous row answers yes by construction. |
| `Material.tastes: TasteTag[]` (shape change) | `Material` (unchanged host) | already there; `[]` is the honest sparse default on 220 inedible rows. Moving it waits for decomposition (D7). |
| `TASTE_THRESHOLDS`, `TASTE_HEDONICS` | `lib/material/Material.ts` beside `BASIC_TASTES` | physiology, closed with the list it extends; not content. |
| `Species.smells: OdorTag[]`, `Species.palate` | `Species` (platform/idea/species) | *a kind of body smells of something and has a native curve.* 24 animal rows author `smells`; 41 plants, 3 fungi and the construct author nothing (null = no smell, no override) — an honest default on a row that already carries nine nullable profiles. |
| `Aroma` | its own class at `/platform/idea/Aroma`, rows at `/stuff/idea/aroma/<word>` | a vocabulary row; nothing else composes it. |
| `OlfactoryMixin` (`nose`, acuity, born sensitivity, `adaptation`, `placeStamp`, `onMoved`, `onLinkdead`) | **`Creature`** (`lib/creature/Creature.ts`, beside `PerceptibleMixin`) | *every living body has a nose of its own.* Every `Creature` is an `Organism` with a species whose body plan declares its sensory ports; a species with `acuity: none` reads an empty `Scent` — an empty read, not a guard. The naming-by-competence leg narrows on `isAdvancing` (Character only) exactly as `Palatable.bandFor` does today — a read, not a re-narrowing. `Corpse` is on the Thing branch and does not compose it (a corpse smells, it does not smell things). |
| `placeStamp` (runtime, the arrival stamp) | on `OlfactoryMixin` | *when this body arrived where it stands.* Written by the mixin's own `onMoved`; read only by the nose. Not on `Containable` (every containable thing would carry a stamp nothing reads — the honest-"no" shape) and not on `Mobile` (a stamp is not movement). The day a second reader wants it (satiety, the mind build's "how long have you been here"), it moves up to `Creature`-level state; one reader today, one owner. |
| `PalateMixin` (`tongue`, born offsets, `liking`, `exposures`, `aversions`, `heritage`) | **`Creature`** (beside `MetabolicMixin`, which writes to it) | *every living body has a mouth that reads food and learns what it likes.* Every Creature eats through `Metabolic` and has `satiation`; `Character`/`Avatar`/`NPC`/`KeptAnimal` all answer yes. |
| `exposures`, `aversions` (persistent records) | on `PalateMixin` | state of a body; captured by the spine on an Avatar; re-seeded on an NPC (§ Risks). |
| `adaptation`, `placeStamp`, `frozenAtS` (runtime) | on `OlfactoryMixin` | a fresh nose after a restart (D4). |
| `CorrosionInflictSpec.bare` | `api/condition.ts` + the fold in `ConditionLogic.ts` | one optional flag on the shipped corrosion spec; every existing producer leaves it unset and is unchanged. |
| `Provision.bites` | `Provision` | *every food can be bitten* — true of all 39 rows. |
| `AromaReading` | a `Reading` subclass; row in the platform pack | one channel; `subjectRequires: []` (the subject may be anything that emits, including a place). |
| `TasteModality.flavorOf` | the taste modality singleton | the contact-sense twin of `SmellModality.emissionOf`. |
| `SmellModality.emissionOf`, `hopTau`, `OPEN_VESSEL_TAU` | the smell modality singleton | the field's physics, where `signalAt` already lives. |
| `PalateMixin.taste` | `PalateMixin`, composed over `MetabolicMixin` | the body does the act; true of every `Creature`. Not on `Metabolic` or `Eating` (D15). |
| `Unit 'OU'` | `lib/quantity.ts` | one word in the closed unit vocabulary (kernel-led build; the `head` channel's reason for not adding a unit was a pack's preference, this is the kernel's one quantity). |

Guard test: no new code re-narrows a host set. The only `isAdvancing` check
is a read that degrades to the floor, as shipped. Honest-default test: the
only "no on most hosts" is `Species.smells` on plants, which is null, costs
nothing and is on a row class whose every profile is nullable.

---

## Convention conformance

Checked at plan time against the current tree, not recalled.

- **`props:` / `cast:`** — no new place; the drive's staged animals arrive by
  `clone --here`. No `populates:`, no `container:`.
- **Locations, not rooms** — no new Location; the water leg narrows on
  `WaterPlaceMixin`.
- **Path pattern** — rows `/stuff/idea/aroma/<word>` (commons, shipped by
  `base-library`; the kernel names the root as `TemplatePathPrefixes.aroma`
  exactly as `TemplatePaths.rootBiome` names `/stuff/idea/biome/universe`);
  class `/platform/idea/Aroma` (file `platform/idea/Aroma.ts`, the mirror);
  `platform/idea/material/OdorousMaterial.ts` + `OdorousConsumableMaterial.ts`;
  `platform/idea/modalities/TasteModality.ts` (the row's class changes to it);
  `platform/idea/reading/AromaReading.ts` + `content/platform/idea/reading/aroma.yaml`;
  mixins in `lib/material/Odorous.ts`, `lib/metabolism/Palate.ts`; value
  objects `lib/perception/Smell.ts` (`Smell` + `Scent`),
  `lib/perception/Flavor.ts` (`Flavor` + `Savor`); the body's two mixins
  `lib/perception/Olfactory.ts`, `lib/metabolism/Palate.ts`.
- **Persistence per content** — the aroma rows are staged content (rows);
  `exposures`/`aversions` are body state on the spine; `adaptation` is
  runtime; nothing persists per class (P6). The identity key is the body's
  `getIdentityPath()`, never a template path.
- **Module scope declares** — constants are `const` declarations;
  `Aroma`'s ancestry is read in `onCreate`.
- **Import boundary** — nothing outside `api/**` + `platform/idea/api/**`
  imports outside `src/mud`; `check-aromas.ts` is a script. The arcana pack
  reaches `OdorousMixin` through the server `exports` map
  (`mud/lib/material/Odorous` added to `packages/server/package.json`
  `exports` — the pack import profile).
- **Verbs on objects** — `nose`/`tongue`/`liking`/`taste` live on the body;
  `emissionOf`/`flavorOf` on the modality singletons; no `XApi.verb(host)`.
- **Mixin registry** — `Mixins.Odorous`, `Mixins.Olfactory`, `Mixins.Palate`
  in `lib/mixin.ts` with `MixinApi.isOdorous`, `isOlfactory`, `isPalate`;
  `MixinRefusals` for all three (`lint:arg-kinds`); `SmellSource` entries
  removed. One factory per file, named for it; one idea per mixin (D21) —
  the sibling branch's `lint:mixin-files` and `lint:mixin-clusters` pass by
  construction.
- **One view, one word** — no synonym verbs, no `spit`, no `sniff`/`lick`;
  `taste` is the small mouthful, `eat` the meal.
- **P3 refuse/skip/throw** — a bare `taste` is refused by the binder's
  controller, in words and an inert solid by `mustBeTastable`'s own line; a
  sub-threshold note is skipped; an unknown aroma word throws at the
  setter, fails the lint, and records a diagnostic at the nose; `setTastes`
  throws on an unknown word instead of filtering; a caustic mouthful lands
  a wound through the one injury door and never a quiet nothing.
- **P4 no duck typing** — `SmellSourceObserver`'s `typeof hook ===
  'function'` goes with the mixin; `BulkableLogic.ingestSolid`'s structural
  `eater.ingest?.` is pre-existing and untouched (not this build's).
- **P5 the mixin decides** — the body's `nose`/`tongue`/`taste` decide;
  controllers resolve the target and word the outcome; `AromaReading` calls
  the nose; nothing gates twice.
- **P7 load on use** — words load by path when a material/species/dirt row
  that names them loads (the async setter); the nose's `Aroma.resolve` is
  sync over resident rows and kicks a load on a miss. **No new boot entry**
  (`lint:boot-entries` unchanged); no `ReadingCatalogue`-style warm scan.
- **P8 names** — `Aroma` (the concept), `Scent` (what a nose made of it),
  `Flavor` (the tongue's signal), `Savor` (what a tongue made of it),
  `Olfactory` (the body's nose, the word `Species.olfactoryProfile` already
  uses), `Palate` (the person's mouth and what it likes; `Palatable`
  retires, so the pair reads one way), `Odorous` (the material's
  capability, adjective-suffixed because it IS a mixin; the classes are
  `OdorousMaterial`/`OdorousConsumableMaterial` on the `RadioactiveMaterial`
  precedent), `mustBeTastable` (the validator family's shape). No class
  named for a mixin's word.
- **Lint gates this build must pass**: `lint:family` (all), and specifically
  `lint:closed-vocabularies` (ceiling → 3), the new `lint:aromas`,
  `lint:mixin-names`, `lint:arg-kinds` (the `taste` view's `requires`),
  `lint:instanceable` (two new instanceable classes, one new Idea; no
  `/lib/` row), `lint:field-meta`, `lint:module-scope`, `lint:imports`,
  `lint:object-verbs`, `lint:lib-statics` (no new `lib/` statics beyond the
  value objects' factories — `Scent.phrases` is an instance method),
  `lint:perishable` (Provision still the only Fresh host), `lint:pathogens`,
  `lint:schema` (no collection change), `lint:boot-entries` (no change),
  `lint:topics` (no new topic), `lint:verb-collisions`, `lint:authored-prose`
  (the new row prose), `lint:test-bootstrap`, `lint:drive-scripts`.

---

## Waves

Each wave lands on its own, ends at a commit, and leaves every shipped read
honest. `build(vocab W<n>): …` commits; `test:near` + touched packs' vitest
+ `lint:family` green before each.

### W0 — The unit and the words

**Goal.** Aroma words are rows; `Smell` is per-word OU; every shipped read
keeps its sentences.

**Implements.** D1 (unit), D8 (lint + diagnostic), D12 (tree), D18 (first
step), D19 (`sulfur`).

**Files.**
- `lib/quantity.ts` — `'OU'` on `Unit` (+ `QuantityMarshaller` passthrough
  like `ppm`).
- `lib/paths.ts` — `TemplatePathPrefixes.aroma = '/stuff/idea/aroma/'`.
- `platform/idea/Aroma.ts` — `extends SingletonMixin(Idea)`; fields
  `threshold` (mg/L, `persistent`), `discipline` (`''`), `liking`
  (`{peak,width,valence} | null`), runtime `ancestry: string[]`; `static resolve(word)`
  (sync, the `dirtKind` shape), `static ensure(word)` (async), `word()`,
  `ancestry()`, `nameAt(depth)`; `onCreate` reads
  `Template.findByPath(path)?.chain` into `ancestry` (words = path leaves).
- `packages/content/base-library/content/stuff/idea/aroma/*.yaml` — the
  eleven (`sulphur` minted as `sulfur`) with their thresholds and
  `liking:` (`solvent`, `sulfur` valence −1); the five dirt words
  (`stale sweat extends sweat`, `dung`, `sour milk extends sour`,
  `old blood extends blood`, `rancid fat extends rancid`); `rot`, `decay
  extends rot`; `wood smoke`/`peat smoke`/`coal smoke`/`tallow smoke`
  `extends smoke`; `tar` (+ `pine tar`, `coal tar`). ~30 rows, each with a
  one-line `description`. Thresholds: literature order of magnitude per
  compound class (the `AROMAS` comments carry the eleven; the pass author
  cites the rest).
- `lib/metabolism/DissolvedAromatics.ts` — delete `AROMAS`; `thresholdFor(word)`
  → `Aroma.resolve(word)?.threshold ?? null` (diagnostic on null);
  `isAroma(word)` becomes a shape check (slug) **and** is renamed
  `isAromaWord` to make every caller re-read; `render` stays for W1 to
  delete; header rewritten (the PROVISIONAL block goes).
- `lib/craft/Recipe.ts:434`, `lib/material/Material.ts:2312` — shape check
  only; `setCombustionImparts` becomes async and `await Aroma.ensure(word)`
  per tag (D8 layer 2).
- `lib/perception/Smell.ts` — `notes`/`strength`/`sources{hops}`; `ppm` out.
- `platform/idea/modalities/SmellModality.ts` — accumulator per word in OU;
  `hopTau()` = 1/30; sources carry `hops`. Legs unchanged this wave (still
  `Soilable` + `SmellSource`, both converted to emit `{word, ou}` — `DirtKind.odor
  = {word, ouPerLoad}`, `SmellSource.emission: {word, ou}` as a bridge
  that W1 deletes).
- `platform/idea/DirtKind.ts`, `lib/cleanliness/Soilable.ts`, the 11 dirt
  rows — `odor`, `soilOdor`, words → the row words; the soil augmenter's
  smell line reads through `Aroma` with the OU ladder (no dial).
- `platform/idea/cmd/perception/SmellController.ts` — reads `Smell.notes`,
  acuity as a multiplier (D1), words via `INTENSITIES`; still names
  sources as today (W2 fixes that).
- `scripts/check-aromas.ts` + `package.json` `lint:aromas`;
  `scripts/check-closed-vocabularies.ts` ceiling 4 + `MIGRATING`; its test.
- `scripts/__tests__/golden/perception-characterization.json` —
  `ppm` → `ou`, `smell` → the dominant word; regenerate with
  `PERCEPTION_GOLDEN_UPDATE=1 pnpm test:gym` and commit the diff **after
  reading it** (every shipped place is still `null` — nothing in W0 adds a
  source; the diff is the key rename only).
- `lib/mixin.ts`, `api/mixin.ts` — no change yet.

**Acceptance.** `lint:closed-vocabularies --report` reads 4; `lint:aromas`
green; the whiskey wire test reads the same sentences; a `smell` in the
chandlery beside a lit candle reads *tallow* (bridge) as before; a dung
boot reads *clearly of dung*. Unit tests: `Aroma` ancestry from a three-deep
chain; `thresholdFor` through a child row inheriting its parent's threshold;
`Smell` per-word add/attenuate.

**Commit.** `build(vocab W0): aroma words are rows; Smell reads odor units`.

### W1 — Every source speaks through one derivation

**Goal.** `SmellModality.emissionOf(thing)` composes the D1 legs; carried
and open-container contents count; a closed container holds it in; heat
and amount apply; rot, corpse, species, fire and ground emit; the two
emitters derive; `SmellSourceMixin` retires.

**Implements.** D1 (sources), D3, D16, D20.

**Files.**
- `lib/material/Odorous.ts` — `OdorousMixin`: `smells: OdorTag[]`,
  `burning: OdorTag[]` (`persistent`), async setters resolving rows (D8),
  `getSmells()`, `getBurning()`; `_mixinName = 'OdorousMixin'`.
- `platform/idea/material/OdorousMaterial.ts`, `OdorousConsumableMaterial.ts`;
  `Muscle.ts` → `OdorousMixin(MuscleMixin(Material))`;
  `packages/content/arcana/src/idea/material/PotionMaterial.ts` opts in
  (`OdorousMixin(PotableMixin(…))`) — potions smell; the server `exports`
  map gains `./mud/lib/material/Odorous`.
- `lib/mixin.ts` (`Mixins.Odorous`; `Olfactory` lands in W2, `Palate` in W4,
  `SmellSource` removed), `api/mixin.ts` (`isOdorous`; `isSmellSource`
  removed), `MixinRefusals`.
- `platform/idea/species/Species.ts` — `smells: OdorTag[]` (async setter).
- `platform/idea/modalities/SmellModality.ts` — `emissionOf` (the legs of
  D1/D3, recursion into `Container`/`Bulkable` with the `Sealable` closure),
  `OPEN_VESSEL_TAU`, `ownSmell` → `emissionOf` over contents and fixtures.
- `lib/material/Freshness.ts` — `FRESHNESS_CHANNELS = ['vision']`,
  the smell sentences deleted (D16); `rotNote(band, kg, T)` static the
  modality calls; bulk twin on `Freshness`.
- `lib/mortality/Postmortem.ts` — `decayNote()`; `lib/mortality/MortalArc.ts`
  gets the stage → `{word, ou}` table.
- `lib/fire/Firebox.ts` — `burningNotes()` over `fuelMaterials()` and the
  bed mass (lit only).
- `packages/content/trade-chandlery/src/thing/Candle.ts`,
  `packages/content/trade-ceramics/src/thing/BrickClamp.ts` — drop
  `SmellSourceMixin`, `adoptMaterialSmell`, the two PPM consts and both
  getter overrides; the candle row's tallow bed and the clamp's fuel bed
  are the smell.
- `lib/perception/SmellSource.ts` deleted; `lib/boundary/Adornable.ts`
  loses `getFixtureSmellSources` and its marker; `docs/subsystems/senses.md`
  file layout.
- `lib/metabolism/Palatable.ts` — the aroma line now comes from
  `emissionOf`; `renderPalate` keeps only the taste/parts/grade/age lines
  until W4 retires the mixin.
- `lib/fractionation/Fractionating.ts:173` — the still's draw read calls
  `DissolvedAromatics.render` → replaced by `Scent` in W2; this wave leaves
  it on `render` (still correct: same words).
- Content this wave (so the walk is honest the day it lands): `OdorousMixin`
  on the materials the shipped drive places need — tallow, peat, dung is a
  dirt word, bark/tan liquor (tannery), hide, fish, cattle/goat species rows,
  wood/coal/peat `burning`, whisky spirit rows (dissolved aromatics are
  already there). The full pass is W7.
- Golden regenerated and READ: the tannery yard, the chandlery, the
  cookhouse now carry values; the diff must list only places that gained a
  source.

**Acceptance.** Unit tests on `emissionOf` for each leg (a 10 g and a 100 kg
tallow block two bands apart; a 330 K loaf vs 253 K carcass; sealed vs open
barrel; a sealed box in a carried pack; a lit vs cold hearth; rot at each
band; a corpse at each stage; a cow). The candle and clamp wire/vitest
suites pass with their words from the fuel material. `lint:family` green.

**Commit.** `build(vocab W1): one emission over the kernel mixins; SmellSource retired`.

### W2 — The nose

**Goal.** `OlfactoryMixin.nose` behind `SmellModality.perceiveFor`; species
acuity, adaptation, competence depth and separation, dominance, source
naming; `smell`, `smell <thing>`, `smell me`.

**Implements.** D2, D4, D12, D13.

**Files.**
- `lib/perception/Olfactory.ts` — `OlfactoryMixin` (D21) with `nose`, the
  acuity multiplier, `bornSensitivity(word)` (seeded, stored nowhere),
  `adaptation` + `placeStamp` + `frozenAtS` (runtime, D4), `onMoved(from,
  to)` chaining the inner witness as `ThermalMixin.onMoved` does,
  `onLinkdead()`, the D4 constants, the own-smell rule; `_mixinName =
  'OlfactoryMixin'`.
- `lib/creature/Creature.ts` — `OlfactoryMixin` composed beside
  `PerceptibleMixin`.
- `lib/perception/Smell.ts` — `Scent` declared beside `Smell`: `notes:
  {word, name, ou, hops, sourceName}`, `dominant`, `phrases()`, `isEmpty`.
- `platform/idea/modalities/SmellModality.ts` — `perceiveFor` forwards.
- `platform/idea/cmd/perception/SmellController.ts` — no module-level
  functions and no arithmetic (`renderSmellProse` and `actorAcuityThreshold`
  go; !527's `lint:controller-functions`, `lint:controller-decisions`). Bare:
  `PerceptionApi.perceiveAt`, words the `Scent` with its source names (D13),
  *You smell <clearly of peat smoke> …*; target:
  `emissionOf(target)` → `nose(signal, { self: target === actor ? actor : undefined })`;
  falls to the base's prose only when the nose reads nothing AND the
  room authored `<sense channel="smell">` prose (bespoke case kept).
- `lib/fractionation/Fractionating.ts` — the draw read through
  `nose` (the viewer is in hand); `DissolvedAromatics.render` deleted.
- `lib/mixin.ts`/`api/mixin.ts` — `Mixins.Olfactory`, `isOlfactory`.
- Golden: unchanged (the golden pins the signal, not the percept).

**Acceptance.** Unit: keen vs normal at a fixed signal; **adaptation from
presence** — (a) a body moved into a place at `t0` whose first read is at
`t0 + 30 min` reads two bands under with no prior read; (b) a read at
`t0 + 1 min` then one at `t0 + 21 min` with nothing typed between reads two
bands under (continuous however long the gap); (c) a read, a move out, 20
min, a move back, a read: full strength (away = 20 min); (d) a read in the
yard, a move straight to the next room, 20 min, a read: still adapted
(away ≈ 0, the stay counts); (e) `onLinkdead` then a read an hour later:
the level neither rose nor fell; own-smell at max; depth by band over a
three-deep chain; separation counts; dominance of a 50 OU sulfur over a
2000 OU grain **after** both are read (sulfur threshold is 0.01 mg/L, so a
little sulfur is many OU — assert it on OU, not mg/L). Wire: steps 1–6,
14–15 of the drive.

**Commit.** `build(vocab W2): one nose on the body — acuity, adaptation, naming by competence`.

### W3 — The ladder

**Goal.** `analyze aroma`, `measure aroma with <gas analyzer>`, `readings aroma`.

**Implements.** D14.

**Files.** `platform/idea/reading/AromaReading.ts`,
`packages/content/platform/content/platform/idea/reading/aroma.yaml`; a
`help` topic rides the row like every channel.

**Acceptance.** Unit: the measure rung's bracket contains the OU truth and
is quoted off the reading; the eye rung returns the nose's deliberate read.
Wire: steps 16–17.

**Commit.** `build(vocab W3): the aroma channel on the reading ladder`.

### W4 — The tongue

**Goal.** Tastes with strengths; `Flavor`; `taste` as contact with a cost on
anything edible; `Palatable` retired.

**Implements.** D7, D15.

**Files.**
- `lib/material/Material.ts` — `TasteTag`, `TASTE_THRESHOLDS`,
  `TASTE_HEDONICS`, `tastes: TasteTag[]`, `setTastes` throws on an unknown
  word or a non-positive amount; `getTastes()`.
- The 72 rows authoring `tastes:` — converted to the new shape **in this
  wave** (B4: a rename reaches the content before the wave commits) with
  provisional amounts the W7 pass audits; `lint:aromas`' taste arm refuses
  the old shape.
- `lib/perception/Flavor.ts`; `platform/idea/modalities/TasteModality.ts`
  (`flavorOf(thing)`: material tastes × makeup, ⭐ the payload's `salinityPpt`
  as `salty` when the payload carries it (D23), dissolved aromas at full OU,
  Odorous `strength × 1`, rot's note); the taste modality row's `class:`.
- `lib/metabolism/Palate.ts` — `PalateMixin` (D21) with `tongue(flavor):
  Savor` (+ `liking` stub returning `indifferent` until W5), the per-taste
  born sensitivity; composed on `Creature` beside `MetabolicMixin`;
  `Mixins.Palate`, `isPalate`.
- `lib/perception/Flavor.ts` — `Flavor` and `Savor` together (decided: one
  module for the tongue's signal and its percept, the `Smell`/`Scent`
  shape).
- `lib/metabolism/Palate.ts` — `taste(food): TasteOutcome` (D15, the three
  mouthfuls), `TASTE_LITRES`, `TASTE_KG`; `Perceiver.ts` loses `taste.yaml`.
- `lib/metabolism/Metabolic.ts` — **`routeIntake`'s corrosive
  leg** (D15) calling `material.corrodeOnContact(self, { site: 'body.head',
  energy, bare: true })` for the intake material and each makeup part.
- `api/condition.ts` — `CorrosionInflictSpec.bare?: true`;
  `platform/idea/api/ConditionLogic.ts` `inflictThroughStack` — an empty
  covering stack when `bare`; `lib/material/Material.ts` `corrodeOnContact`
  forwards `bare`; `docs/subsystems/harm.md` (the caustic behavior is live,
  not reserved; the `bare` flag).
- `platform/thing/Provision.ts` — `bites` (`persistent`, `runtimeState`) +
  augmenter line.
- `platform/idea/cmd/perception/TasteController.ts` — resolves, calls
  `giver.taste(target)`, words `Savor` (tongue first, then the nose's
  phrases, then the parts/grade/age lines a competent+ maker's palate adds —
  moved here from `renderPalate`) and *It burns.* on `burned`; `taste.yaml`
  per D15 (+ `category: perception` if !527 has merged).
- `lib/command/validators/mustBeTastable.ts` — the three arms (D15);
  `mustBeEdible` untouched and still `eat`'s.
- `lib/metabolism/Palatable.ts` deleted; `platform/thing/ServingVessel.ts`
  loses the composition (keeps the class and its header's reasoning, which
  now records why the palate moved to the PERSON).
- `docs/subsystems/metabolism.md` cask-rule paragraph (an open cask smells).

**Acceptance.** Unit: brine vs pinch; bitter through sugar; a blend's
amounts from makeup; `mustBeTastable` — a floor, a knife and a lead pig refused, a lye
flask, a sack of flour and a lump of quicklime passed; a bite reduces mass and
increments `bites`; a lick takes nothing; the dose reaches `routeIntake` at
0.01 L with `hostKg` the mouthful's; **a sip of lye lands a `caustic`
trauma at `body.head` through a worn hat (`bare`), and a `drink` of it lands
a larger one by the same leg**; `rinse` resolves it. Wire: steps 18–23
(22's *no salt on `smell`* is W1's fact, asserted here).

**Commit.** `build(vocab W4): taste has strengths; tasting is contact and costs a mouthful`.

### W5 — The person

**Goal.** Born profile, exposure, aversion, liking with hunger; `eat` says
how it went down.

**Implements.** D5, D6.

**Files.**
- `lib/metabolism/Palate.ts` — `bornOffset` (seeded; the nose's
  `bornSensitivity` reads the same `heritage()` seam through `isPalate`),
  `exposures`, `aversions` (fieldMeta persistent runtimeState),
  `recordExposure`, `recordAversion`, `liking` (D6), `heritage()` returning
  null.
- `platform/idea/species/Species.ts` — `palate: { spread?, curves? } | null`.
- `lib/metabolism/Metabolic.ts` — `routeIntake` writes the aversion (D5).
- `lib/metabolism/Eating.ts` (`Metabolic.eat` until !527 lands; D22) — `eat`
  records exposure per note and returns `liking` as a fact on `EatOutcome`;
  `taste` does the same on `TasteOutcome`.
- `platform/idea/cmd/bulk/EatController.ts` — *You eat the stew with your
  fingers. It goes down well / It is unpleasant, but you are starving and
  it goes down* — one sentence from `liking.word` and the hunger term.
- Species rows: `palate.curves` on the 16 homo rows only where a realm
  wants a difference (grain: none shipped; the test pack authors one).
- Persistence: the Avatar capture covers both records via fieldMeta;
  a unit test round-trips through `PersistableApi.capture/materialize`.

**Acceptance.** Unit: two identities, same species, different offsets; an
oversalted soup negative for both; rot negative for both; hunger lifts a
plain meal; an aversion stamped `symptomsAt` in the future reads nothing
until then; exposure raises liking by the cap. Wire: steps 25–29, 32.

**Commit.** `build(vocab W5): the palate — born, exposed, averse; liking read with hunger`.

### W6 — Media derived

**Goal.** `RECIPE_MEDIA` gone; the ceiling from the carrying material; the
gate at 3.

**Implements.** D17, D18.

**Files.** `lib/craft/Recipe.ts`, `platform/idea/api/CraftingLogic.ts`
(the six sites in § Grounding), `scripts/check-closed-vocabularies.ts`
(ceiling 3), its test, `scripts/check-aromas.ts` (media arm);
`packages/content/trade-cooking/content/recipes/` — three new rows (brine
boil, wine poach, sand roast); material rows gain tags (`brine` on
`salt-water`, `sand` on the sand row, `wine` on the wine rows);
`docs/subsystems/crafting.md` § medium.

**Acceptance.** Unit: cap = min of two limits when both tabulated; 0 when
neither; the brine boil's ceiling is salt water's elevated boiling point.
`lint:closed-vocabularies --report` reads 3 with three `MIGRATING` lines.
Wire: step 24.

**Commit.** `build(vocab W6): a recipe's medium is any tag; the gate reads 3`.

### W7 — The full passes (content)

**Goal.** Every material judged; every fuel's smoke; every edible's taste
amounts; every animal species' smell; the word tree complete.

**Implements.** D9.

**Batches** (disjoint by pack; one subagent each; the build agent audits
ten rows per batch against the returned basis lines):

| batch | packs | rows | shape to author |
|---|---|---|---|
| A | base-library (143: alloy, bulk, caustic, ceramic, earth, element, food, gas, glass, glaze, mineral, organic, rock, textile, tissue, muscles, wood) | 143 | `class:` → Odorous twin where it smells; `smells`; `burning` on the 31 fuels; `tastes` amounts on the 27 edibles |
| B | trade-distilling (27), trade-brewing (8), trade-winemaking (12), trade-bottling (7), trade-hospitality (4), trade-malting (2), trade-sugar (6) | 66 | spirits/beers/wines smell of `spirit`/`beer`/`wine` + their dissolved notes already there; `burning` on distilling's 13 fuels |
| C | trade-cooking (9), trade-dairying (15), trade-baking (5), trade-milling (4), trade-farming (23), trade-forestry (5), trade-fishing (2), trade-ranching (7), trade-apiculture (3) | 73 | every food's `smells` + `tastes` amounts; milk/cheese/bread/fish/honey words |
| D | trade-chandlery (9), trade-potash (3), trade-painting (23), trade-dyeing (4), trade-textiles (3), trade-tanning (1), trade-sericulture (8), trade-papermaking (2), trade-printing (2), trade-ceramics (6), trade-glass (1), trade-medicine (7), trade-fuel (8), trade-mining (1), water (2), waponi-woo (1), arcane-library (3), platform (2) | 86 | tallow/soap/lye/turpentine/linseed/tar/ink/clay/naphtha words; `burning` on fuel's 7 and painting's 4; potions |
| E | the aroma tree (base-library `/stuff/idea/aroma/`) + species rows (85; 24 animals get `smells`) + the 11 dirt rows' figures | ~60 + 85 + 11 | the words batches A–D asked for, with thresholds and `liking`; `cattle`/`goat`/`horse`/`dog`/`hog`/`wet wool`/`fish`/`bee`… under `animal` |

**Rules for every batch agent** (verbatim in its brief): edit only
`class:`, `smells:`, `burning:`, `tastes:` (and for E `threshold`,
`liking`, `extends`, `description`); `Edit` with exact old/new; never
rewrite a row; a word you need that E has not shipped goes in your return
as a request, not a row you invent; ⛔ `fouled-water` and `tainted-water` author **no** smell and no taste (D23); plain things (iron, glass, clean water,
stone, cullet) get **no** key; every strength is OU per kg at 293 K; every
taste amount g/kg; return one line per row *(path · word · strength ·
basis)*. The build agent runs `lint:aromas` after each batch lands and
reconciles E's words last.

**The 16 `extends:`-only rows** inherit their parent's `class:` and keys;
a brash row that must differ (pine brash's smoke) states only the key.

**Acceptance.** `lint:aromas` green; `pnpm -C packages/server lint:family`
green; the golden re-read: every shipped place's dominant word is one a
person standing there would agree with (the build agent walks the list);
the requirements' collision list (tannery, byre, knacker's, distillery,
chandlery, cookhouse) checked for a smell that drowns the room — a figure
over 8000 OU at hop 0 that is not a fire or a midden is a row to lower.
Wire: steps 10–13.

**Commit.** one per batch, `content(vocab W7<letter>): …`, then
`build(vocab W7): the full pass audited`.

### W8 — The drive, the walk, the docs

The wire file (all blocking steps), the e2e walk (the browser half: the
tannery, the glass, `taste apple`, the analyzer), the soak file for 34–37
(`vocabularies-to-rows.soak.dirty.wire.test.ts`), `docs/subsystems/senses.md`
(smell physics rewritten: OU, the legs, the nose, the file layout),
`metabolism.md` § Aroma rewritten, `spoilage.md`/`mortality.md`/
`cleanliness.md` smell paragraphs, `instrumentation.md` the channel,
`crafting.md` media, `content-packs.md` (a pack ships an aroma word),
`lint-family.md` (`lint:aromas`), `race.md` (`Species.smells`/`palate`),
`CLAUDE.md`'s one-line map pointers only where a doc's pointer changed
truth. Then the MR, READY.

**Commit.** `drive(vocab): what driving found`, `docs(vocab): …`.

---

## Reachability wiring

The five links per capability — verb · affordance · data · load · arg gate —
each fails closed and silent.

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| `smell` (bare, target, `me`) | shipped `smell.yaml` | shipped on the body (perception category) | aroma rows; `Species.olfactoryProfile`; D1 sources | words load with the material/species/dirt row that names them (async setter); `Aroma.resolve` kicks on a miss | `requiresSmell`; target `requires: any` (anything emits or does not) |
| `taste <thing>` | shipped verb, view rewritten | shipped on the body | `Material.tastes` amounts; aroma rows; `corrosiveTo` on the caustics | as above; `TasteModality` row's class now `TasteModality` (the row exists; `PerceptionLogic.preloadModalities` walks `MODALITY_NAMES` which already names `taste`) | `requiresTaste` + **`mustBeTastable`** (three arms, D15); **`required: true` with a the controller refusal** (the `assay` lesson) |
| `analyze aroma` / `measure aroma` / `readings aroma` | shipped flat verbs | shipped | `aroma.yaml` row | `ReadingCatalogue` warms by `/idea/reading/` infix (shipped mechanism; no new boot) | `subject` greedy; `tool` narrowed by `gas-analysis` |
| `eat` liking line | shipped | shipped | `Species.palate`, `TASTE_HEDONICS`, aroma `liking` | with the rows | unchanged |
| a pack's new word (`pine tar extends tar`) | — | — | the row at `/stuff/idea/aroma/pine tar` in the pack's own content, `requires` base-library | loads when a material of that pack names it | `lint:aromas` refuses a word named across a missing dependency |
| a pack's new medium | — | — | `medium: <tag>` + a material carrying the tag | the recipe's inputs are the load | `lint:aromas` media arm |
| the gas analyzer's new reading | `measure` | the Tool's `capabilities: [gas-analysis]` (shipped) | `aroma.yaml` | catalogue | the Reading's own `narrow` |

Mixin wiring: `Mixins.Odorous`/`Mixins.Olfactory`/`Mixins.Palate`
registered (`lint:mixin-names`); `OlfactoryMixin` and `PalateMixin` composed
on `Creature` (the stamp's `onMoved` fires because `Creature` composes
`ContainableMixin`, whose `setContainer` chokepoint fires the witness);
`OdorousMixin` on the two twins, `Muscle`, `PotionMaterial`;
`MixinRefusals` for all three; the arcana pack's import through `exports`.
The corrosive leg reaches every mouth because every ingest route (`eat`,
`taste`, `drink`, `sip`) arrives at `routeIntake`. Nothing composes `SmellSource` after W1 (the
`Mixins` entry is removed with it, or `lint:mixin-names` fails).

---

## Acceptance-criteria coverage

| requirement AC | waves |
|---|---|
| a person smells what is there in any shipped venue, no room text | W1 (sources) + W7 (the pass) + W2 (the read) |
| find a rotten thing or a fire by strength, never direction or who | W1 (`hopTau`, rot, fire) + W2 (D13 naming) |
| stop noticing, notice again after being away | W2 (D4) |
| a filthy person cannot tell, another can | W2 (own-smell) |
| novice and practiced read the same strength; practiced names deeper and separates more | W2 (D12) |
| dog-nosed notices what a person cannot; below threshold nobody | W2 (acuity multiplier; the 1 OU floor) |
| no digit from a nose or tongue; the analyzer's figure does | W2/W4 (`phrases`) + W3 (OU with bracket) |
| a cook tells a pinch from a handful | W4 (D7) |
| anything edible can be tasted, visibly uses some, danger has an effect | W4 (`mustBeTastable`, `bites`/litres, `ingest`; the corrosive leg for lye, the dissolved dose for foreshots) |
| two people disagree about one soup; everyone agrees about a rotten one | W5 (D6 offsets; the −1 valence cap) |
| starving likes it more | W5 (hunger term) |
| food poisoning changes how it reads afterward | W5 (D5 aversion) |
| all of it survives a restart | W5 (spine fieldMeta) + W4 (`bites` persistent) + the drive's restart step |
| a pack adds a word, a smelly material, a medium with no kernel change | W0 (rows by path) + W1 (`OdorousMaterial` is a class any pack's row names) + W6; proved by the drive's test pack (step 30) |
| mistyped words and media fail loudly; a smell is never silently dropped | W0/W6 (`lint:aromas`), W1 (async setters), W2 (the diagnostic) |
| iron, glass, clean water smell of nothing | W7 (no key on plain rows; `lint:aromas` cannot force absence — the batch rule and the audit do) |
| the gate reads 3; each remaining list names its destination | W0 + W6 (D18 `MIGRATING`) |

Nothing in the requirements' Goals is unmapped. The requirements' step 13
names a *salt shore* and a *smokehouse floor*; neither place ships (§
Grounding) — the drive uses the estuary mouth's salt pans and the Hearthworks
cookhouse, which is the fact the requirements meant. Flagged in § Risks.

---

## Test & gate strategy

**Unit tests** (`__tests__/` siblings, `test:near` loop): `Aroma`
(ancestry, inherited threshold, resolve/ensure, missing-row throw at the
setter), `Smell` (per-word arithmetic), `SmellModality.emissionOf` (one
test per leg), `Palate.nose` (acuity, adaptation, depth, separation,
dominance, own-smell), `Scent.phrases` (no digit), `TasteModality.flavorOf`
(makeup blend), `Palate.tongue`/`liking` (offsets, hunger, caps, aversion
timing, exposure cap), `Palate.taste` (mouthful, bites, dose, the outcome's reasons),
`AromaReading` (bracket invariant), media cap (both/one/neither), the
spine round-trip of `exposures`/`aversions`, `check-aromas` fixtures (each
refusal arm), `check-closed-vocabularies` (ceiling + `MIGRATING`). The gym
golden: regenerated in W0, W1 and W7, each diff read.

**Lint gates**: § Convention conformance. `pnpm test` runs twice: before
the MR opens and at `/finalize`.

**The blocking drive** (the exit criterion; instant · short · staged only).
Places are shipped; "practiced" is `practice <discipline> hard success ×12`.
Tools named per step; `eval` is from a wizard session seated on the place's
committee (`committees: ['/world/terminus/wharfside']` etc.), `--on` the
subject, no `;`.

| step | pace · how | what stages it |
|---|---|---|
| 1 | instant · player — tannery yard, untrained `smell` | nothing (the tanpit + hides are props; W7 gives them words) |
| 2 | instant · staged — practiced tanner | `practice leatherwork hard success` ×12 |
| 3 | short · player — `smell`, `testharness clock advance 20m` **without typing anything else**, `smell`: fainter; walk two places away (out of the yard's smell), advance 20m, walk back, `smell`: strong. A second character who stood in the yard 30 game-min and never typed `smell` reads it faint on their first read | the clock; the arrival stamp (D4) |
| 4 | instant · player — neighboring place, `smell`; walk back | nothing |
| 5 | instant · staged — a keen-nosed character at hop 2 | `Session.open` as an `orcus` (keen) vs `sapiens` |
| 6 | instant · staged — sulfur + grain in one room | `clone` a sulfur lump and six grain sacks `--here` |
| 7 | instant · staged — tar pot lid; tallow in an open pouch vs a sealed box | `clone` a tar pot (a `Sealable` Flask/Barrel row over `coal-tar`), `close`/`open`; `hand` tallow into a pouch, then into a sealed chest |
| 8 | instant · staged — warm loaf vs cold; frozen carcass | `hand(s, loaf, { stampedTemperatureK: 330 })` and `{ 273 }`; `hand(s, carcass, { stampedTemperatureK: 253 })` |
| 9 | instant · staged — lit hearth; next room; put out | `light`/`douse` the chandlery Hearth (`ignite` on master until !527 lands, D22), `smell` next door |
| 10 | staged · player — rotten side of beef next door; pathogens planted on a fresh cut | `eval --on <cut> self.setMicrobialLoad(0.95)`; `eval --on <cut> self.setPathogenLoads({...})` — **nothing reports them at any band** |
| 11 | staged · player — a corpse at each stage through a door | `eval --on <corpse> self.diedAtGameSec = <now − n×3600>` (the fishing precedent) |
| 12 | instant · player — a stew smells of its ingredients | `cook` the shipped hearty stew in the cookhouse |
| 13 | instant · player — the byre (animals + dung); the turf bank; the estuary mouth's salt pans | nothing |
| 14 | instant · staged — three farmhands with dung; one leaves; lights out | `clone` three Extras `--here`, `eval --on <each> self.soil('manure', 0.6, null, 'body.feet')`; `testharness clock advance` to night and the Hearth out |
| 15 | instant · player — `smell me` low, another `smell <me>` high | soil self the same way |
| 16 | instant · player — `analyze aroma` in the distillery and on a glass; `readings aroma` | nothing |
| 17 | instant · player — Duncan Hall: `measure aroma with gas analyzer` | nothing (the analyzer is propped) |
| 18 | instant · player — bare `taste`, `taste floor`, `taste knife`, `taste <lead pig>` refused in the validator's words; `taste <quicklime>` is a lick that burns | `hand` a lead pig (`generic-objects/.../stuff/thing/lead-pig.yaml`, amount-0 toxicity) and a lump of quicklime (`trade-quarrying/.../thing/quicklime.yaml`) |
| 19 | instant · player — `taste apple`, cheese, loaf; `look` shows the bite | `hand` each |
| 20 | instant · staged — a pinch vs a handful of salt; brine | two stews via `pour` measures into the pot; `hand` brine |
| 21 | instant · staged — a little bitter in a sweet dish | a syrup with a measure of a bitter row |
| 22 | instant · player — peated whisky `taste`; `smell` salt water: no salt; a salty well's water tastes salty and fouled water tastes and smells of nothing (D23) | `hand` the shipped peated spirit; the estuary's water; a pail drawn with a staged `salinityPpt`; `fouled-water` |
| 23 | staged · player — `taste <lye flask>`: *It burns.*; `analyze patient me` names a caustic wound at the head while wearing a hat; `rinse` resolves it; `drink` from the flask burns worse; a taste of foreshots doses less than a drink of them | `hand` a flask over `/trade/chandlery/idea/material/lye` and a bottle of foreshots (dissolved toxins); `analyze patient` (trade-medicine's reading) |
| 24 | instant · staged — brine boil, wine poach, sand roast from rows; ceilings differ | `cook` each with `analyze`/`measure temperature` of the pot |
| 25 | instant · staged — two staged profiles taste one soup; oversalted and rot bad for both | **owed tool** `@TestOnly PalateMixin.stagePalate(offsets)` via `eval` |
| 26 | instant · player — `eat` says how it went down | nothing |
| 27 | staged · player — starving vs full | `eval --on self self.adjustReserve("satiation", r.current.scale(-0.9))` (pets precedent) vs `nourish` |
| 28 | staged · player — food poisoning leaves the dish reading worse | **owed tool** `@TestOnly PalateMixin.stageAversion(foodKey, symptomsAt)` via `eval` — staging the state; the clock's part is step 37 |
| 29 | instant · player — two new enrollments read differently | two `Session.open`s |
| 30 | instant · staged — a test pack adds `pine tar extends tar` and a medium | `packages/content/testworld-vocab/` (test content, `lint:test-content`) installed by the wire world's pack list |
| 31 | instant · staged — misspelled word, misspelled medium, `smells:` on a plain class refused | `lint:aromas` fixtures (a lint is where content is checked) + a `clone` of a test row with a bad word refused at the setter |
| 32 | short · player — restart; profiles, exposure, aversions, the bitten apple read back | the cleanliness restart recipe |
| 33 | instant · player — tannery, byre, chandlery, distillery at night | `testharness clock advance` to night |

**Owed tools** (a state nothing can stage is a tool this build owes, marked
`@TestOnly`): `stagePalate` (25), `stageAversion` (28). Competence,
freshness, decay, dirt, temperature, hunger each have a tool above.

**The soak drive** (span; never run before merge; the MR names it):
`vocabularies-to-rows.soak.dirty.wire.test.ts` — 34 bitter food over game
weeks raises its liking (its staged twin is 25's exposure cap in a unit
test); 35 food left out moves through the rot bands and reaches the next
room (twin: 10); 36 a corpse moves through its decay smell (twin: 11); 37 an
aversion survives a long game time (twin: 28 + the persistence of the
record).

**B2** before trusting green: make each wire checkpoint fail once (an
assertion that matches `/smell/` matches the refusal too — assert the
sentence).

**B3**: the e2e walk runs once at code-complete beside the blocking drive.

---

## Risks & opens

**Owner, 2026-11-07: every question marked Q below takes its plan default.** The
drive uses the estuary mouth and the Hearthworks cookhouse; Extras from one row
share a palate; the taste ladder and the analyzer's odor units stand; a mouthful
wounds `body.head`. The owner also expects mouths to become real anatomy, possibly
as the next refactor, so keep the site in one named constant.

Questions for the owner are marked **Q**. The build does not stop on a
risk; it stops on a Q only if it reaches a wave that cannot proceed without
the answer, and none of these does.

1. **`build/controllers-are-io` (!527) is the collision that matters.**
   See D22; re-read against its branch at `9f1814e12`. With `taste` on
   `PalateMixin` and source naming on the nose, the remaining exposure is
   **W5** (`Eating.ts`, `EatController`) and small reconciles: `category:` on
   changed views, `Creature`'s composition, `lib/mixin.ts`, `Soilable` (+77
   lines, not the odor code). `check-duck-typing` must pass on our code; note
   it counts `x.name?.()`, so chain witnesses as `Thermal` does. `CraftingLogic`:
   its diff does not touch the medium code.
   `reqs/water-supply` touches `CraftingLogic.ts` (14 lines, the mend cap
   and `fitImpl`) and `Bulkable.ts` (pH on the payload) — no overlap with
   D17's sites. `build/client-surface` rewrites `look` — we add nothing to
   `look`'s augmenters; `Provision.bites` is a one-line augmenter on a
   non-vision-filtered path, so it will land on `look` **by design** (a
   bite is seen).
2. **Extras share an identity path** (`Cast.ts:36` vs `Stuff.ts:553`).
   Every sentry from one row draws the same born profile, as it already
   draws the same blood genotype. Pre-existing; this build inherits it and
   writes it down. **Q:** is that the identity build's to fix, or should
   `PalateMixin.bornOffset` salt with `stuffId` for an un-minted Extra (a
   one-line divergence from the blood precedent)? Plan default: inherit
   the precedent, salt nothing.
3. **NPC exposure and aversion die at reboot** (no `PersistableMixin` on
   `NPC`). The requirements say NPCs have profiles and noses after this
   build and nothing reads them; the born profile survives (derived). Stated
   in the docs; no fix here.
4. **The requirements name two places that do not ship**: a *salt shore*
   and a *smokehouse floor* (step 13, § Collisions). The drive uses the
   estuary mouth (a `Shore` with salt pans) and the Hearthworks cookhouse
   (where the smoke chimney is propped). **Q:** confirm those are the
   intended places, or name others.
5. **The hop attenuation changes every shipped place's reach.** With
   `EXIT_TAU = 1.0` today, nothing ever faded; at 1/30 per hop a fire two
   rooms away reads two bands under. The golden will say so and the
   collision list is walked in W7; the figure is one constant.
6. **Unit choice.** OU replaces ppm on `Smell`; the gas analyzer reports
   OU. The requirements' lens-5 sentence (*an instrument gives a figure*) is
   met; the figure is a real industry unit, not mg/L. If the owner wants a
   mass concentration printed instead, `measure` can multiply by the word's
   threshold (mg/L-equivalent) — a wording change, not a model change.
7. **`taste` on a Provision reduces mass by 10 g.** A 5 g item (a pinch
   row) would go negative; `taste` clamps to the item's mass and an item
   bitten to nothing is destroyed like an eaten one. Stated so nobody
   "fixes" it into a refusal.
8. **The async setters.** `setSmells` awaiting aroma rows during a
   material's hydration is new in kind (the `ref:` ensure is the precedent).
   A row that names a word in a pack not installed fails that material's
   load loudly — which is the requirement — but it fails the *thing's*
   load with it. The lint keeps shipped content clean; the risk is a live
   author's `clone` failing with a clear message, which is correct.
9. **`Material.setTastes` throwing on an unknown word** is a behavior
   change on a setter that silently filtered; 72 rows convert in W4 and the
   lint holds the shape; a pack row with a typo fails at load (loudly, as
   required).
10. **The ladder for tastes (1·3·10·30·100) vs aromas (1·30·…·8000)** is a
    plan decision from Stevens exponents, not a requirement. **Q:** fine as
    the grain? Plan default: yes; both are one const each.
11. **Hunger's weight (0.6 at starving)** and the −0.6 caps are dials with
    no dial row; they are consts in `Palate.ts` with their reasons, as the
    adaptation constants are. Not escalated to `AppSettings` (memory: do not
    escalate dials to the kernel).
12. **Words the kernel names** (`rot`, `decay`, `blood`) are commons rows
    base-library ships; the kernel already names `/stuff/` rows
    (`TemplatePaths.rootBiome`, `mortalityCorpse`), so this is precedented,
    and `lint:aromas` checks the kernel's own three.
13. **Adaptation tracks stays, not every room's air** (D4): a stay in which
    the word was never read counts as time away from it. The honest fix is
    a walk on every arrival, which the requirements put out of scope; the
    approximation is written in the doc and the unit tests pin it.
14. **Drinking lye now burns.** The corrosive leg is new behavior on
    `drink`/`sip` as well as `taste` (one path); nothing shipped drinks
    lye, but the chandlery's soap-boil and the potash brains handle it —
    their verbs are `pour`/`stir`, not `drink`, so no brain is affected.
    `CorrosionInflictSpec.bare` is a one-flag kernel change at the injury
    door; every existing producer leaves it unset. **Q:** `body.head` as
    the mouthful's site (the body plans have no mouth part) — accept, or
    should the identity/anatomy owner add `body.head.mouth` first? Plan
    default: `body.head`; a mouth part is an anatomy build's.

---

## Deferred seams

Attach points, not stubs; each with the slate it leaves as.

- **Parents.** `PalateMixin.heritage(): { offsets } | null` returns null;
  `bornOffset` and the nose's `bornSensitivity` center on it when present →
  [household-lifecycle] (memory slate; the identity build names it).
- **A second reader of the arrival stamp** (satiety, the mind build's "how
  long have you been here"): `OlfactoryMixin.placeStamp` moves up to a
  `Creature`-level stamp the day one appears → mind-slate / wellbeing.
- **NPCs reading smells, trails, tracking.** `PerceptionApi.perceiveAt(npc,
  loc, smell)` returns a `Scent` for any `Creature` now; a brain consumes
  it → [senses-slate](../slates/builds/senses-slate.md) § NPCs reacting to
  smell.
- **Stress / the equanimity meter.** `Liking.score` is the signed input →
  [mind-slate](../slates/builds/mind-slate.md), [wellbeing-slate](../slates/builds/wellbeing-slate.md).
- **Satiety, wanting vs liking, aging tastes.** `exposures` is the record
  satiety reads → wellbeing.
- **An authored emission on a thing that is not its material** (a flower,
  a perfume) → [flowers-slate](../slates/builds/flowers-slate.md); the
  shape is a `smells:` field on the flower's class, read by one more leg of
  `emissionOf`.
- **Touch and hearing** — nothing; `Flavor` carries no mouthfeel → senses
  slate.
- **The taste host and the Odorous twins' retirement** →
  [material-decomposition-slate](../slates/builds/material-decomposition-slate.md):
  a family composes `OdorousMixin` and `tastes` moves with edibility.
- **`MATURATION_MECHANISMS`, `DISPLAY_*`** → their slates, named in
  `MIGRATING`.
- **The masking rule** (senses.md § Masking, unbuilt) — the per-word OU
  signal is the input it wanted; untouched.

---

## Critical files

Read first, in this order.

1. `docs/requirements/vocabularies-to-rows-requirements.md`, the slate's
   **Decided at requirements** + reuse ledger.
2. `platform/idea/modalities/SmellModality.ts`, `lib/perception/Smell.ts`,
   `lib/perception/Modality.ts`, `lib/location/Traversal.ts`.
3. `lib/metabolism/DissolvedAromatics.ts`, `lib/metabolism/Palatable.ts`,
   `lib/bulk/Concentration.ts`, `lib/bulk/Bulkable.ts` (`BulkPayload`).
4. `platform/idea/cmd/perception/SmellController.ts`, `TasteController.ts`,
   `SingleSenseControllerBase.ts`; the views under
   `packages/content/platform/content/platform/cmd/perception/`.
5. `lib/cleanliness/Soilable.ts` (`dirtKind`, `soilOdour`),
   `platform/idea/DirtKind.ts` — the load-on-use shape to copy.
6. `lib/material/Material.ts` (tastes, combustionImparts, phase limits,
   fieldMeta), `platform/idea/material/*`, `lib/material/Tangible.ts`,
   `lib/command/validators/mustBeEdible.ts`.
7. `lib/material/Freshness.ts`, `lib/mortality/Postmortem.ts`,
   `lib/fire/Firebox.ts`, `lib/spatial/Sealable.ts`, `lib/thermal/Thermal.ts`
   (`onMoved` at `:1987`), `lib/spatial/Containable.ts:155-180` (the
   `onMoved` witness contract).
7a. `lib/material/Material.ts:2060-2095` (`corrodeOnContact`),
   `api/condition.ts:150-202` (the inflict union), `platform/idea/api/ConditionLogic.ts:70-90, 1225-1260`
   (corrosion → `caustic`; the covering fold), `docs/subsystems/harm.md`,
   `packages/content/trade-chandlery/content/trade/chandlery/idea/material/lye.yaml`,
   `packages/content/platform/content/platform/cmd/medical/rinse.yaml`.
8. `lib/metabolism/Metabolic.ts` (`canIngest`, `ingest`, `routeIntake`,
   `exposeToPathogens`), `platform/idea/cmd/bulk/EatController.ts`,
   `SipController.ts`.
9. `lib/vitals/Vitals.ts:1014` (`resolvedBloodGenotype`), `lib/Seeded.ts`,
   `platform/idea/species/Species.ts`, `lib/creature/Creature.ts`.
10. `lib/instrument/Reading.ts`, `platform/idea/reading/CleanlinessReading.ts`,
    `AtmosphereReading.ts`, the `aroma`-adjacent rows under
    `packages/content/platform/content/platform/idea/reading/`.
11. `lib/craft/Recipe.ts` (`RECIPE_MEDIA`, `mediumFrom`),
    `platform/idea/api/CraftingLogic.ts:872-950, 2300-2325, 2750-2830, 3374-3400`.
12. `packages/server/scripts/check-closed-vocabularies.ts`,
    `check-perishable.ts` (the content-lint shape), `check-pack-extends.ts`
    (the dependency rule), `scripts/__tests__/perception-characterization.gym.test.ts`.
13. `platform/idea/TemplateApplier.ts:150-305`, `lib/stuff/Template.ts`
    (`chain`, `findByPath`), `docs/subsystems/templates.md` § extends.
14. `packages/wire/tests/cleanliness.dirty.wire.test.ts` (restart,
    soiling), `fishing.dirty.wire.test.ts:549` (decay eval),
    `pets-offer.dirty.wire.test.ts:203` (reserve eval),
    `e2e/tests/paint-walk.spec.ts`.
15. `docs/subsystems/senses.md`, `metabolism.md` § Aroma,
    `instrumentation.md`, `spoilage.md`, `cleanliness.md` § Knowing,
    `mixins.md` § pack mixins, `content-packs.md` § capability rung.

---

## Drive record

*(appended at build time, not at plan time)*
