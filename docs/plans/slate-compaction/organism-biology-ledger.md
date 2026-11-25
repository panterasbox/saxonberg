# Slate compaction ledger — organism-biology /finalize

Branch `build/organism-biology` (MR !652). Verified against the code on this branch.

## docs/slates/engine/organism-biology-slate.md  — 315 → 264  · Status UNBUILT → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## 1. The grammar — body plans composed from modules` (12 lines, heading kept as a pointer) — code: `packages/server/src/mud/lib/species/Body.ts`, `BodyModule.ts`, 56 `body-modules/*.yaml`; doc: `body.md § Modules and the Body`
- § 2 bullet *governs* (1 line) — code: `Body.ts` (`governs` MIN); doc: `body.md § Modules and the Body`
- § 2 bullet *Retired: sensoryPorts … Species.production[]* (3 lines) — code: `BodyPlan.ts:61` (ports retired), `Producing.ts:347` (`taps()` reads the body's producers); docs: `senses.md § Sense organs are parts`, `taps.md § The vocabulary` (graduated, below)
- § 3a bullet *Modules give every species a cut map for free* (3 lines) — code: `Body.yieldLines`, `Butcherable.ts`; doc: `butchery.md § What comes off derives from the body`
- § 4 the min · mean · max table (5 lines + blank) — code: `Body.ts` (`sustains`), kidneys on `torso-*` modules, `filtration`; doc: `body.md § Modules and the Body`, `vitals.md § The body's state, part by part`
- § 6 bullet *Sex — dimorphism as module deltas … the ox* (3 lines) — code: `Species.variants`/`formsOf`, `udder-*.yaml`, `trade-medicine/.../operations/castration.yaml`, `Organism.getVariant`; docs: `body.md § Variants`, `harm.md § The body decides operate`, `taps.md` (`activeIn` lactating)
- § 10 bullet *A species may declare a body plan per stage … mass carries* (3 lines) — code: `Species.development`, `VitalsMixin.reconcileForm`, `Species.massAt` (stage `massFactor`); doc: `body.md § Variants … Development`
- § 10 bullet *The cocoon is the larva's own silk* (3 lines) — code: `trade-sericulture/src/lib/Rearing.ts` (`GLAND_SHARE_REFERENCE`), `src/__tests__/silk-gland.test.ts`; doc: `sericulture.md § One worm, three bodies`

### Graduated (SHIPPED · UNDOCUMENTED) — then cut
- § 3 paragraph *New tissue materials* (5 lines) — code: `base-library/content/stuff/idea/material/tissue/{keratin,chitin,cartilage,dentine,enamel,ivory,fur,feather,scale,skin,shell,kidney,eye,udder,gonad,swim-bladder}.yaml`, `trade-fishing/.../material/{blubber,spermaceti,whale-oil}.yaml`, `trade-sericulture/.../material/silk-gland.yaml` → inserted at `race.md § The body's own tissues (organism-biology D4)` (15 lines). The dielectric clause is unbuilt and is the mana pack's (plan conflict 10; `mana-economy-design-pack.md` ~1258–1282 carries it); the build-1 collision note is moot (material decomposition merged).
- § 3a bullet *Skinning is its own step* (3 lines) — code: `lib/craft/Butcherable.ts` `flawThePelt` (`PELT_FLAW`, skinner's hand `nicked`, skin-before-cuts `slashed`, winter pelt grade), `Body.yieldLines` (outside first) → inserted at `butchery.md § What comes off derives from the body` (14 lines)
- § 5 bullet *Regrowth is stopped by the wound's channel* (2 lines) — code: `Vitals.ts` `siteOnPresent` (~2825), regrowth skip on `sealed` (~2888) → inserted at `body.md § The body's state: the delta` ("Why a stump seals", 7 lines)
- § 7 bullet *A module's fill* (3 lines) — code: `ConditionLogic.ts` ~1464 (`response.fill.sparse` / `.hollow`), `__tests__/material-response.fill.test.ts` → inserted at `body.md § The integument and fill` (new section, 18 lines, also carrying the integument-as-armor why: `ConditionLogic.ts` ~1446 `integumentAt(site).skin.form`)
- (supporting, no slate paragraph cut for it alone) the coat as insulation — code: `ThermalRegulation.ts` `coatInsulation`/`layerClo`/`tapFill` → inserted at `thermal.md § A body's own coat (organism-biology D3)` (15 lines), before § Immersion. The § 3 table stays (faces row unbuilt).
- (supporting) the species `body:` delta (`Species.ts:837`, `setBody`) and the von Bertalanffy growth curve (`Species.massAt`, `GROWTH_B`/`GROWTH_K_T`) → inserted at `body.md § Modules and the Body` (4 lines) and `body.md § Variants` (8 lines). The § 6 *Age* bullet stays (drives by stage and square-cube capability are unbuilt).
- (supporting) taps D2 — `Producing.ts` `taps()`/`glandFactor` → `taps.md § The vocabulary` (17 lines). ⚠ **Fixed a statement the code proves false**: taps.md said *"`TapSpec` on `Species.production[]`"*; `production[]` is deleted — the sentence now says a gland part's `produces`.

### Superseded — cut
- `## Reuse ledger for the plan` (27 lines) — consumed by the build: its verdicts became the plan's § New substrate and are now `body.md`; heading left as a one-line pointer.

### Kept (UNBUILT)
- `## 0. The principle` — **Doctrine** (see below)
- `## 2` bullets *serves* (acuity from eye size unbuilt — `bandShift` stays declared, B36, `body.md § Open`) and *produces* (venom metering / the dry bite, ink, musk, sweat, the mana organ unbuilt)
- `## 3` intro + four-systems table (faces row: tattoos and henna unbuilt — `Faced` not composed on creatures)
- `### 3a` *Glands become named yields* (spermaceti and silk shipped; venom, ink, musk, mana organ not) and *The by-product web* (the trades)
- `## 4` *A part's function has four sources* (mark, contents, charge unbuilt; seam `VitalsMixin.ownFunction`, plan D14)
- `## 5` state table (regrowing by binding, *added*, antler/molt cycling unbuilt), *A severed part becomes a Thing* (shipped except the kappa bargain-back — reattachment), fragmentation, cycling (antlers, shed hunting, eclipse molt; the winter pelt shipped)
- `## 6` *Age* (curve, stage proportions and integument shipped; drives by stage and square-cube capability not), *Reproductive states* (pregnant/with-young staged only; *a mother never quits* not), game law / herdbook
- `## 7` square-cube bullet (`lint:scaling` shipped; *giants only where the field pays* = payer validation, mana pack), skeletons and zombies
- `## 8`, `### 8a`, `## 9` (denning, rut satiation and phenology shipped; hyperphagia, fear override, denning-woken danger, ectotherm speed/strength, cryptobiosis not), `## 10` *Capabilities swap* (diet does not swap; `Species.diet` has no consumer), giant caterpillar, the curse, `## 11`, `## 12` and its *Still open*

### Doctrine
- `## 0. The principle` — capability derives from parts. Shipped in part; `body.md` carries the thesis in one line without the derive/declare split.

### Uncertain — kept
- `## 2` *produces* says *"a gland fills a reserve (the shipped reserve axis)"* — **contradicts** the shipped D2 decision (the store stays `ProducingMixin.tapState`, not a `Reserve`; now in `taps.md`). Kept verbatim because venom metering is unbuilt; requirements should reconcile.
- `## 11` last bullet *"A permanent polymorph is a setter"* — **contradicted** by `## 12` ruling 3 (*there is no permanent polymorph*) in the same slate.
- Overlaps (kept in both, for the cluster pass): § 8 new senses ↔ `senses-slate.md` (echolocation, electroreception); § 11 polymorph ↔ `spellbook-slate.md`; § 7 skeletons/zombies ↔ `spellbook-slate` / `decomposition-slate`; § 12 ruling 1 (fat's dielectric) and the mana sense ↔ `mana-economy-design-pack.md` (~1266 *"Where in the body (ruled 2026-11-09)"*); kappa, hydra, troll, dragon breath, werewolf ↔ `bestiary-slate.md`; § 3 tattoos ↔ `cosmetics-slate.md`; § 3a musk ↔ `butchery-slate.md` / `pharma-slate.md`; § 6 pregnancy/young ↔ `ranching-slate.md` (plan § Deferred seams); § 5 bargain-back ↔ `physiology-slate.md § 7h`. Unique to this slate (no other slate carries them): cryptobiosis, antlers/shed hunting, hyperphagia, the eclipse molt, the forcing principle (§ 8a), repercussion/Bisclavret, the giant caterpillar.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: "everything below … ready for requirements" → the 17-item list now in the block (one per kept section/paragraph)
- Size: "a build, and the substrate of the bestiary catalog …" → "no longer one build — waves riding the senses / concealment-by-channel build, the mana economy, the spellbook and the bestiary catalog, plus a small phenology tail"

## docs/slates/engine/respiration-slate.md  — 181 → 155  · Status TAIL → PARTIAL

### Cut (SHIPPED · DOCUMENTED)
- `## 2. ⚠ The defect: a body standing still is never re-checked` (22 lines, heading kept as a one-line pointer so § 3's *"fires § 2's fan-out"* still resolves) — code: `packages/server/src/mud/lib/biome/Atmospheric.ts` ~1017–1031 (`setAtmosphere` on a tag change → every `isRespiration` content `reassess()`, fire-and-forget, caught, one containment level); doc: `respiration.md § The reassess triggers` (trigger 5, *the air changes*)
- § 1 bullet *The reassess triggers are exactly three* (3 lines) — falsified by the code (five triggers: traverse, move, the beat, `setConferredBreathing`, the atmosphere setter); doc: `respiration.md § The reassess triggers`
- § 6 Open Q3 *The fan-out depth* (4 lines) — resolved: one containment level (`Atmospheric.ts`, `self.getContents()`); doc: `respiration.md § The reassess triggers`. Left as a one-line pointer.

### Kept (UNBUILT)
- `## 1. What is true today` (remaining bullets) · `## 3. The air reserve as a breathable read` (its floor crossing becomes the fan-out's second caller) · `## 4. The reach's oxygen can be pulled down` · `## 5. Named non-goals` · `## 6. Open` Q1, Q2 · the trailing *Continuous evaporation of an open volatile* bullet

### Uncertain — kept
- § 1 bullet 1 (*"the opt-out is `respires: false` on the body plan"*) and bullet *Amphibians ship* (*"the shore crab's plan is `breathableMedia: [water, air]`"*) — both now stale: `respires`/`breathing` on the plan retired (organism-biology D10, `respiration.md § Compose, don't absorb`); breathing derives from organs. Kept because the rest of each paragraph (a plant is not a breather; no amphibian clock, which § 5 names) is still true.
- § 1 *Seams laid, unconsumed* — the conferred-media half now has `setConferredBreathing` (a held working confers a medium, `respiration.md`); the `'channel'` cause is still unconsumed. Mixed; kept.

### Handoff (belongs in a doc outside my list)
- none

### Status block
- Left: "the in-place trigger · the air reserve as a breathable read · a BOD term · three named non-goals with destinations" → "the air reserve as a breathable read · a BOD term on the reach's oxygen · the named non-goals with destinations (§ 5) · continuous evaporation of an open volatile" (the last was in the body and unrepresented; § 5 holds five non-goals, not three)
- Size: "a tail — one small kernel build plus one watershed line" → "a tail — one small kernel item plus one watershed line"
