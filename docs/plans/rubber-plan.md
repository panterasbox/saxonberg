# Rubber — implementation plan

Executes [rubber-requirements](../requirements/rubber-requirements.md).
**Kind:** feature. **Leads from:** kernel — the construction model (what
is over and around a place), two material properties, the cure as a
function of composition × temperature × time, and four corrections to
shipped readers — with its first consumers shipping in the same build:
the `trade-rubber` capability pack, the rubber works and its stove house
in the Terminus goods yards, the Hill Quarry's sulfur band, and the
Drowned Substation as the proving ground.

The plan is in nine waves. W0–W3 are the kernel construction model and
its consequences (rain · light · sky view · wind · heat, solar gain,
heat between members of one structure) and are behaviour-preserving for
every place that has not yet said what is over it. W4 is materials and
the cure. W5 is the four
corrections. W6 is supply. W7 is the pack, the works, the content pass
and the drive file. W8 is stretch, first to cut.

---

> ✅ **BUILD GATE CLEARED 2026-10-17.** Dairy merged (`b18743d80`) and
> `reqs/rubber` caught up (`a2e688ff1`); D10 and D13.2 are re-grounded on
> its merged mould code. The sibling plans have settled and agree:
> **storage-and-ice** (build-4) puts the wet law on `Material` as instance
> methods and adds `Attired.immerse()` — this plan consumes both shapes
> (D12.1); ice OWNS them and merges first (§ Parallel builds, below); **repair** (build-3) W7 (building upkeep,
> D20–D27) is gated on THIS build and consumes D1a/D2/D4 exactly as
> written — ⚠ so `getEnclosure()`/`getRoof()` returning a spec, a list,
> `'none'` or `null`, and materials never on `Structure`, are now a
> **contract with another build**: do not reshape them without telling it.

## ⚠⚠ Parallel builds — owners, merge order, conflict map (2026-10-17)

Four builds run in parallel from master: **rubber** (build-1,
`reqs/rubber`, this plan), **cleanliness** (build-2,
`origin/reqs/cleanliness`, `docs/plans/cleanliness-plan.md`), **repair**
(build-3, `origin/reqs/repair`, `repair-plan.md`), **storage-and-ice**
(build-4, `origin/reqs/storage-and-ice`, `storage-and-ice-plan.md`). The
user declined a shared-foundation MR. **"Whichever lands first" is dead:
every shared piece has ONE named owner.** A non-owner that needs an
owner's piece before it merges writes a byte-compatible local copy to
the owner's published signature, marks it in code
`// DROP AT MERGE — owned by <build>`, and deletes it when it merges
master. All four sessions read this section.

### Merge order (owner decision, 2026-10-17)

1. **storage-and-ice** and **repair W0–W6**, in either order;
2. **rubber**;
3. **cleanliness**;
4. **repair W7** (building upkeep) after rubber, as its own MR.

Rubber consumes ice's wet law (`Material.permeability()/wetProperty()`),
`Attired.immerse()` and the envelope heat protocol (`RoomHeatExchange`,
`envelopeSteadyStateK`); cleanliness and repair W7 consume rubber's
`roof:`, `Exposure` and `lint:biome-sky`, and cleanliness rubber's
narrowed `corrosiveTo`. ⚠ Repair W0–W6 lands BEFORE rubber, so rubber
merges master over repair's `AssembledGarment` deletion and its
`castDiscipline` on `carryPayload`: rubber's goods are one-piece
`Garment`/`Tool` casts and its moulds get `castDiscipline` for free —
re-verify both at rubber's merge. **Shared ratchet set by the owner:**
storage-and-ice's two boot entries are approved, `BOOT_ENTRY_CEILING`
83 → 85; rubber boots nothing and must not move it.

### Accepted from repair (build-3), 2026-10-17

From `origin/reqs/repair:docs/plans/repair-note-to-siblings.md` § To
rubber (repair answered all ten of ours in its plan § Parallel builds →
"Repair × rubber"). All accepted:

1. **Rubber goods are standalone rows on the family classes**
   (`/platform/thing/equipment/Garment`, `/platform/thing/Tool` for the
   packing) — no bill, no `extends: leather-boots`, never an
   `Assembled*` class.
2. **Rubber authors `base-library/.../material/ceramic/brick.yaml`**
   (density, specific heat, `thermalConductivity`, wAC); repair W7 adds
   its weathering fields.
3. **The moulds' `discipline: chemistry` is deliberately the mending trade
   of every rubber good.** At rubber's merge (repair W0–W6 already in),
   `FireController.mould-shape.test.ts` gains an assertion that the cast
   carries `castDiscipline: chemistry`. `Mould.ts`: rubber edits
   `holdsCast`, repair edits `carryPayload`.
4. **`lint:biome-sky`'s ceiling is computed on the rebased tree**, and
   repair's new interiors (the cobbler shop; the tinker's rooms — Offstage
   rows are excluded anyway) are **paid by authoring `enclosure:` +
   `roof:` on them**, never by listing them.
5. **`getEnclosure()`/`getRoof()` and `Exposure`/`Face` are a contract
   with repair W7** — no reshaping without telling repair.
6. **Slate notes fixed** (structures-slate, biome-normalization-slate):
   places own materials; building upkeep is repair W7's; erection stays in
   structures-slate. The requirements' cobbler non-goal is re-pointed —
   *mending* → repair, *making* (the cordwainer) → textiles-slate.

### Owner table

| piece | owner | signature / path | what non-owners do |
|---|---|---|---|
| the wet law: `Material.permeability(): number` (0 when `wAC ≤ dial('wetness.impermeableBelowPct', 2)`, else `min(1, wAC / dial('textiles.clo.absorptionReference', 40))`), `Material.wetProperty(dry, fluid, saturation): number` (`dry + saturation × permeability() × (fluid − dry)`); the setting `wetness.impermeableBelowPct` (2) + its `AppSettings` key; cloth's `k_void` migration in `Wearable.getClo` | **ice** (its W1) | `lib/material/Material.ts`; `settings/wetness.yaml` | rubber: a local DROP-AT-MERGE copy of the two methods + the setting if W5 needs them before ice merges; **never touch `getClo`**. cleanliness consumes. |
| `Attired.immerse(parts?)` — WITH an optional part filter that also limits the body's wetting to those parts (ice's plan has no filter: rubber has asked ice to add the optional param) | **ice** (its D11) | `lib/slot/Attired.ts` | rubber's flooded cell calls `immerse(foot parts)`; until ice adds the filter rubber's copy is DROP-AT-MERGE. cleanliness's `bathe` calls it. |
| the envelope heat formula: `lib/thermal/RoomHeatExchange.ts` `{ fixedW, conductanceWperK, anchorK }` summed in `reconcileEnvelope`, and `AtmosphericMixin.envelopeSteadyStateK(outsideK, atS)` as the ONE formula `T_ss = (U_ext·T_out + Σ fixedW + driveW + Σ G_j·anchor_j) / (U_ext + Σ G_j)`, `τ = C / (same denominator)` | **ice** (its W2) | `lib/biome/Atmospheric.ts`, `lib/thermal/RoomHeatExchange.ts` | rubber builds W2/W3 on that shape from the start: D6 solar is a `fixedW` contribution per segment (evaluated at `atS`); D7 interior faces are `{ conductanceWperK: U_i, anchorK: neighbour.envelopeTemperatureLast() }` contributions. Local DROP-AT-MERGE copy of the protocol plumbing if ice has not merged. ⚠ **Merge-time step for rubber:** ice's `envelopeSteadyStateK` must fold in rubber's two term kinds after both land; re-run ice's icehouse arithmetic and rubber's hothouse tests. |
| the ice material at `/stuff/idea/material/bulk/ice` (moved from bottling) | **ice** (its W0) | `base-library/.../material/bulk/ice.yaml` | rubber's `lightAbsorption ≈ 2/m` on ice is a MERGE-TIME one-liner on whichever path exists; rubber does not edit the ice row in its waves. |
| `/stuff/idea/material/ceramic/brick` and `/stuff/idea/material/textile/canvas` (honest k/ρ/c/wAC) | **rubber** (W0) | `base-library/.../material/{ceramic/brick, textile/canvas}.yaml` | repair W7 adds `weatheringDays`/`laying` to them after (brick stays `weathers: false`). Stone: nobody — cleanliness uses `rock/granite` or `rock/limestone`. |
| `/stuff/idea/material/mineral/sulfur`, authoring `heatOfCombustion` (≈ 9.3 MJ/kg) and `autoignitionTemperature` (≈ 505 K) honestly — rubber's bellowsed oven ≈ 482 K < 505, so the charge does not ignite | **rubber** (W4) | `base-library/.../material/mineral/sulfur.yaml` | cleanliness later adds `combustionProducts` (SO₂) to the same row. |
| `Attired.exposeToRain(delta)` (rain on the outer layer) | **rubber** (W5) | `lib/slot/Attired.ts` | cleanliness reads it. |
| ONE named per-face transmission method on `Exposure` — `faceTransmittance(face): number` — that `skyLightFraction()` AND the solar term both call | **rubber** (W2) | `lib/spatial/Exposure.ts` | cleanliness multiplies grime into it later (its deferred Risk 6). |
| `lint:biome-sky` + its ceiling list | **rubber** (W0) | `packages/server/scripts/check-biome-sky.ts` | every other build's new interiors author BOTH `enclosure:` and `roof:` (or, outdoors, carry a sky `_biomePath` / `none`+`none`) and re-census at merge; repair W7 and cleanliness edit the ceiling list. |
| the rubber goods rows `/trade/rubber/thing/{rubber-boots, rubber-gloves, rubber-apron, rubberized-coat, rubber-sheet, packing, hose}` | **rubber** (W7) | `packages/content/trade-rubber/content/trade/rubber/thing/` | cleanliness reads those exact paths (gloves/apron in its doffing). |

### Conflict map — every file two or more builds touch

| file / region | owner of the region | merge rule |
|---|---|---|
| `lib/material/Material.ts` fieldMeta + getters | all four append (ice `getCastTemplate`/wet law; rubber `lightAbsorption`, `elasticity`, `crosslinking`; cleanliness `ashFraction`, `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`; repair `weathers`, `weatheringDays`, `laying`) | keep all; the wet methods exist ONCE (ice's) |
| `lib/slot/Attired.ts` | rubber `exposeToRain`; ice `immerse`; cleanliness `doff` + a soil clause in the impression | keep all; ONE `immerse` (ice's, with the part filter) |
| `lib/slot/Wearable.ts` | ice `getClo` migration; rubber `fitOn` stretch (W8); cleanliness shrink stamps | separate regions. ⭐ NOTE: rubber's stretch term ABSORBS cleanliness's wool shrink (a shrunk knit that still stretches fits) — an intended interaction, recorded, not a bug |
| `lib/biome/Atmospheric.ts` `reconcileEnvelope` | **ice owns the formula**; rubber contributes terms by the protocol | fold rubber's `fixedW`/conductance terms into `envelopeSteadyStateK` at rubber's merge |
| `platform/idea/cmd/device/FireController.ts` | rubber (`runFiring` hold + mould seam + crosslink branch); ice W0's `Alloyed` → `isComposition` split may touch `:325–362` | ice keeps rubber's merge-block shape; rubber re-applies the `isComposition` swap inside its rewritten `runFiring` if it lands after ice's edit |
| `lib/mould/Mould.ts` | rubber `holdsCast`; repair `carryPayload` (`castDiscipline`) | separate hunks; keep both; re-run `Mould.test.ts`; rubber's mould-shape test asserts `castDiscipline` once repair lands |
| `lib/ground/Floor.ts` (+ `platform/thing/Floor.ts`) | rubber `isOnGrade`/snow gate/`floorDefaults`; ice `bears`/`supportIsSlotted` + `WaterSurface`/`IceSheet`; cleanliness soil/strewn | adjacent; ⚠ ice's `IceSheet` snow override must NOT call rubber's `rainReaches()` gate (a sheet on a mere is open sky by its own rule) |
| `platform/idea/cmd/perception/SurveyController.ts` | rubber `waysideSpaces`; repair holding/fabric lines; cleanliness floor line | separate methods; one readout block per room; the last lander adds a test that all appear |
| `lib/husbandry/Producing.ts` | rubber the `weather` window's air read; cleanliness `stampTheHand` | separate regions |
| `lib/config/AppSettings.ts` + settings yamls | separate families; ONE `wetness.impermeableBelowPct` (ice's) | keep all; second skips the shared key |
| `platform/idea/api/BiomeLogic.ts` | rubber (the six sky gates, `outsideKFor`, `resolveEnvelopeTemperature`); ice near `:1196` (`outsideSegmentsSince`) | adjacent; keep both |
| `scripts/check-light-sources.ts` | rubber rewrites `isSkyExposedRow`; cleanliness adds SKYLIT list rows | keep both |
| `scripts/check-biome-sky.ts` | rubber creates; repair W7 + cleanliness edit the ceiling list | union of additions minus union of removals; re-run the script |
| `scripts/__fixtures__/field-meta-golden.json` + the wiki-spoiler snapshot | generated | **REGENERATE, never hand-merge** (`pnpm -C packages/server lint:field-meta --snapshot`; the wiki snapshot with `-u` once every build's review-log entry is in); rubber regenerates in W0, W2, W4 |
| `terminus/.../general-store/counter.yaml` | rubber/repair/cleanliness append stock lines + prices | keep all |
| `terminus/.../market/square.yaml` exits | rubber's awning = `east`; cleanliness's bathhouse = `north` (existing: northeast, south, west) | keep both |
| `rejection/.../idea/deposit/quarry-hill.yaml` | rubber: coal −9…−10, sulfur −10…−10.4, halite −10.4…−12; cleanliness's chalk / fuller's earth go ABOVE coal and must not move coal or anything below −10 | keep both bands; rubber's quarry test digs −10.2 (sulfur) and −11 (salt) |
| `base-library/.../material/bulk/vitriol.yaml` | rubber narrows `corrosiveTo`; cleanliness adds a `vitriol` tag on the `tags:` line | keep both |
| root `package.json` + `terminus/package.json` + `pnpm-lock.yaml` | rubber adds the `trade-rubber` importer + terminus dep; ice adds `trade-ice`/`hollow-mere`; repair needs terminus→trade-forestry; cleanliness terminus→trade-fuel | keep all deps; **lockfile: re-run `pnpm install`, never hand-merge** |
| docs (`thermal.md`, `ground.md`, `mould.md`, `crafting.md`, `textiles.md`, `light.md`, `glass.md`, `fire.md`, `content-packs.md` pack count, `structures-slate.md`, `slates/README.md`, `CLAUDE.md` map) | each adds | section by section; `/finalize` sweeps resolve |

### Shared ratchets

`lint:biome-sky`'s list, `PURE_REPEAT_CEILING` (⚠ rubber's three Hevea
stems use `count:`/`as:` on one props line, never three near-identical
rows), `lint:lib-statics`, `lint:unconsumed-seams`, `lint:boot-entries`
(rubber adds none), `CLOSED_VOCABULARY_CEILING`. Each branch green alone
may fail after a merge; the merging build re-counts and writes the
merged tree's ACTUAL count, ≤ master's — it never raises a ceiling
without a caller audit.

### Known cross-feature interactions to keep (not bugs)

- cleanliness narrows the `Wet` far-past guard to bodies, so **worn
  garments DRY across rubber's 6 h drive steps** — rubber's drive asserts
  wetness within the step in which it rains, never a step later.
- washed leather boots conduct in the brine cell (the wet law, both
  readers).
- a mould charged with solids reads *holding* per rubber's `holdsCast`
  fix, and a cast rubber good carries repair's `castDiscipline:
  chemistry` — the cobbler quotes rubber boots as beyond him.
- cleanliness's `Flued` soot on `Hearth`/`Oven` applies to rubber's works
  oven and both stoves.
- rubber's stretch (W8) absorbs cleanliness's wool shrink (above).

### Accepted from cleanliness (build-2), 2026-10-17

From `origin/reqs/cleanliness:docs/plans/cleanliness-note-to-siblings.md`
§ To rubber. All accepted; each is a decision this build implements.

1. **The floor's MATERIAL does not move (amends D4/W1's `onGrade`).**
   `Floor.isOnGrade()` keeps today's derivation for floor-material
   resolution (rung 3 ground-beneath, rung 4 `floorDefaults`); W1 does
   NOT route it through `exposure().onGrade`. The only floor `Exposure`
   changes is an `on:` storey's — a roof terrace's floor is the roof
   below. A test pins the ground kind byte-identical for every shipped
   structure member (the terminal's six rooms, every `Ship` cabin).
2. **An authored `ambientSource` rung is NOT multiplied by
   `skyLightFraction()` (amends D4/D5/W1).** `AmbientLit.isSkyLit()`
   keeps `ambientSource: sky`/`glow`/`none` exactly as today (the 19
   window-lit interiors); `skyLightFraction()` decides only a place that
   authors no `ambientSource`. **Open sides transmit daylight**: an
   exterior wall face with no wall (`wallsNone`, or an open side through a
   doorless exit to the outside) has transmittance 1 in
   `faceTransmittance`, weighted by `light.solar.sideWeight`.
3. **Ventilation (amends D4/W1).** `airChangesPerHour` returns the outdoor
   answer (∞) when `exposure().isOutside()` OR `wallsNone` — an awning or
   a lavoir does not hold gas like a shut room; `addAtmosphereContent`
   likewise returns 0 there.
4. **One face-transmission method** — `Exposure.faceTransmittance(face)`
   (already D5): `skyLightFraction()` and the solar-gain sum both call it;
   cleanliness multiplies grime into it; the stove house is its first
   consumer.
5. **Sulfur (amends D13.4).** `mineral/sulfur` authors
   `heatOfCombustion: 9.2` (MJ/kg) and `autoignitionTemperature: 505`
   (cleanliness adds `combustionProducts` to the same row); the won row
   `/trade/quarrying/thing/sulfur` is `class: /platform/thing/Firewood`
   (coal's shape) so `stoke` takes it. A test asserts the vulcanize
   recipe's `maxHeatK` (455) and the works oven bellowsed (≈482 K) both
   stay below 505 K.
6. **Stretch (amends D16).** The construction form contributes: `felted`
   (and any fulled or boiled form) gives ~zero stretch whatever the
   fibre; the allowance is `elasticity/100 · formStretch`, with
   `formStretch` 0 for felted, 1 + loft for knitted, 1 otherwise.
7. **The wet law has ONE home** — `Material.permeability()` /
   `wetProperty()`, owned by ice; no `MaterialLogic` copy (fixed in D12.1,
   W5 and Host placement).
8. **`roof` is authored-only and `_exposure` is transient** — never in
   `runtimeState`; cleanliness's `PersistentCartesianLocation`
   round-trips every runtimeState field of a venue room.
9. **At rubber's merge, re-grep `BiomeApi.isSkyExposed` callers** —
   cleanliness may add one (`Soilable.reconcileAiring`, marked `// rubber:
   migrate`) if it lands first; migrate each to `exposure()`.
10. **Terminus exits** — awning `east` off the market square; the
    bathhouse `north`.
11. **`consumed?` on `RecipeInputSlot` is struck** (D10 dropped it);
    cleanliness adds `Recipe.soils` to the same file.
12. **After cleanliness lands**, the works oven and the stove-house stove
    gain flues that soot (`fire.flue.ignitesAtKg` 0.5): cleanliness's
    merge re-runs rubber's drive and checks `flueSoot` stays under the
    threshold across the cures and the stoked nights (or the drive
    sweeps).
13. **The Hevea row authors no `TapSpec.soils`** (latex on the hands is
    not wanted).
14. **Regenerate `field-meta-golden.json`** and add a wiki-spoiler
    review-log entry for `crosslinking` (and the other new fields).

### Accepted from storage-and-ice (build-4), 2026-10-17

From `docs/plans/storage-and-ice-note-to-rubber-2026-10-17.md` (committed
here) and `origin/reqs/storage-and-ice:docs/plans/storage-and-ice-note-to-siblings.md`
§ To rubber. All accepted. Ice lands before rubber, so in every "whoever
lands second" case below **rubber is second** and does the fold.

1. **One steady-state formula, ice's:** `AtmosphericMixin.
   envelopeSteadyStateK(outsideK, atS)` —
   `T_ss = (U_ext·T_out + ΣU_i·T_i + ΣfixedW + driveW + P_solar(t) +
   ΣG_j·anchor_j) / (U_ext + ΣU_i + ΣG_j)`, `τ = C /` the same
   denominator; the occupant term is the `RoomHeatExchange` protocol
   (`SpaceHeating` +, the store −), replacing the `isSpaceHeating` sum.
   Rubber's D6 supplies `P_solar(t)` (via `faceTransmittance`) and D7 the
   `ΣU_i·T_i` interior faces; at rubber's merge, its terms fold into
   ice's version and any local copy is deleted.
2. **`Attired.immerse(parts?: (partKey: string) => boolean)`** — ice
   adopted the optional filter; side-effect only (it wets). Rubber's
   flooded cell calls `immerse(foot parts)`; its local copy, if any, is
   DROP AT MERGE.
3. **The wet law** is exactly D12.1's — `Material.permeability()`,
   `Material.wetProperty(dry, fluid, saturation)`,
   `wetness.impermeableBelowPct` = 2, `textiles.clo.absorptionReference`
   hoisted. Ice writes it; rubber skips it (local DROP-AT-MERGE copy only
   if W5 needs it before ice merges). `MaterialLogic.contactResistanceImpl`
   stays only as the electrical CALLER.
4. **The ice material** moves to `/stuff/idea/material/bulk/ice`
   (base-library) and the bottling row is deleted; rubber authors
   `lightAbsorption ≈ 2/m` on the new row at its merge.
5. **`lint:biome-sky` and the icehouse rooms** — they author `enclosure:`
   (0.4 m sawdust fill; pine) without `roof:`. At rubber's merge, rubber
   **authors `roof:` on them** (an opaque, honestly thick roof) rather
   than letting the census ceiling rise. The platform and house share one
   Structure, so they couple through their shared wall under D7
   (symmetric conductance); the control shed is a Structure of its own.
6. **`FireController.runFiring`** — ice's W0 turns the alloy-merge
   narrowings (`:340`, `:360`) into `isComposition`; rubber KEEPS that
   when it rewrites `runFiring` (its crosslink branch and mould seam sit
   beside it, and a composition-only lump keeps its fractions).
7. **Also shared:** `Material.ts` fieldMeta (keep all; regenerate the
   field-meta golden, never hand-merge), `Wearable.getClo` (ice's
   migration — rubber never touches it), `Floor.ts` (ice's `bears` /
   `supportIsSlotted` and the `WaterSurface`/`IceSheet` subclasses beside
   rubber's isOnGrade/snow changes; the `IceSheet` row authors
   `onGrade: false`, and its snow override stays self-contained).
8. **The shared-file rule:** the build that lands second merges
   `origin/master` first, resolves by hand, then re-runs the named tests
   and drives.

## Grounding

Every fact below was verified by opening the file this cycle
(2026-10-16, branch `reqs/rubber` at `91f763b05`). Paths are under
`packages/server/src/mud/` unless they start with `packages/`.

### Sky exposure — one bit, five questions

- `lib/biome/SkyExposed.ts` — `SkyExposedMixin`, a trait with no fields;
  `isSkyExposed(): true`. `platform/idea/SkyExposedBiome.ts` —
  `SkyExposedBiome extends SkyExposedMixin(Biome)`.
- `api/biome.ts:441` `BiomeApi.isSkyExposed(scope)` →
  `platform/idea/api/BiomeLogic.ts:710` `skyExposedWalk`: a containment
  walk outward (`stepOutward`, `CONTAINMENT_DEPTH_CAP`) to the first
  `Atmospheric` ancestor whose **own** `getBiome()` is non-null (it
  reads `_biomePath` only — `lib/biome/Atmospheric.ts:559`; no zone
  step), then `MixinApi.isSkyExposed(biome)`; `false` when nothing
  resolves. ⚠ So a room authoring no `_biomePath` reads *not sky-exposed*
  today, and an interior is simply a room the walk answers `false` for.
- Also in `BiomeLogic`: the weather-deviation gates at `:306` (pressure),
  `:615`/`:643` (`airFor`/`airSegmentsFor`), `:1071`/`:1105` (traces),
  `:1281` (`resolveQuantityFor`), `:1723` (`liveDeviation`);
  `outsideKFor` (`:977`) — the F1 nested-envelope seam, then the chain,
  then the climate when the chain fell to the root, else the weather
  folded iff `isSkyBiomePath(trace.sourcePath)` (`:1157`);
  `resolveEnvelopeTemperature` (`:1172`) with its per-scope
  `envelopeResolving` reentry set.
- **Every caller outside `BiomeLogic`** (grep, non-test):
  `lib/biome/Atmospheric.ts` `:834` (`addAtmosphereContent` — under the
  sky nothing accumulates), `:974` (`airChangesPerHour` → `Infinity`),
  `:1046` (`envelopeApplies`), `:1102` (`isThreshold(far)`, the
  documented attach point, docstring names
  `structureOf(this) !== structureOf(far)`); `lib/perception/AmbientLit.ts:336`
  (`isSkyLit()` falls through to the walk when `ambientSource` is null);
  `lib/husbandry/Soil.ts:514` (`_rainSkyExposed` stamped at the rain
  reconcile); `lib/ground/Floor.ts:398` (`isOnGrade()` default) and
  `:688` (snow lies only under the sky, re-checked every read, not
  memoised); `platform/idea/api/WeatherLogic.ts:905` (boundary fan-out:
  thermal restamp for sky rooms; `:941` notes the light dim follows
  `isSkyLit`), `:1420` (`runStormFanout`), `:1605`/`:1628`
  (`computeResolved` callers — `skyExposed` decides whether the procgen
  sky field or the biome baseline answers, and `precipitationHere`);
  `platform/idea/api/PerceptionLogic.ts:1256`/`:1280`
  (`horizonAtSea`/`horizonAshore`);
  `platform/idea/cmd/perception/SurveyController.ts:195`
  (`waysideSpaces`); `platform/idea/reading/WeatherReading.ts:232`
  (*snow lying: none* line); `packages/server/scripts/check-biome.ts:163`
  and `check-light-sources.ts:303-320` mirror the walk from rows.
- `WeatherLogic.wetOccupants` (`:1321`) wets every `Wet` **room
  content** by one segment's accrual — worn garments are slot occupants
  of the body, not room contents, so rain never reaches a garment today.
  `maintainPuddle` (`:1365`) fills the room's `Floor` surface pool.
- `WeatherLogic.computeResolved` (`:760`): a `_weatherPin` on a scope
  (`weeping-chamber.yaml`, four Localities) answers regardless of sky;
  with no pin an indoor scope reads the biome baseline and
  `precipitationHere: 'none'`.

### The envelope

- `lib/spatial/Enclosed.ts` — `EnclosureSpec { material?, thicknessM? }`
  (closed; `lint:envelope` clause (e)), `EnclosureDefaults`,
  `ResolvedEnclosure`, the `Enclosed` interface (implemented by
  `AtmosphericMixin`; the file explains why there is no `EnclosedMixin`
  — TS inference depth). Its own docstring: *"No `roofed`. Derivable,
  and already derived… which is what `BiomeApi.isSkyExposed` answers."*
- `lib/biome/Atmospheric.ts`: `enclosureDefaults()` (`:527`, universe
  default from `enclosure.defaultMaterial`/`defaultThicknessM`),
  `resolveEnclosure()` (`:1130`, cached in `_resolvedEnclosure`),
  `envelopeApplies()` (`:1042`: volume ∧ no authored `_temperature` ∧
  not sky-exposed), `openExteriorOpenings()` (`:1058`, obvious
  `open-only` exits whose far side `isThreshold`), `openingsByKind()`
  (`:990`, exterior vs interior for `airChangesPerHour`),
  `reconcileEnvelope()` (`:1182`: `T ← Decay.toward(T, outside + (P +
  drive)/U, Δt, C/U)`, segmented by the supply trajectory, breakpoints
  into `envelopeLog`), `envelopeExposedAreaM2(volume)` (`:1375`:
  `5·side²`, **five faces unconditionally** — docstring names the buried
  corridor and the subdividing-is-colder defects and says *"This method
  is the attach point"*), `envelopeCoefficients()` (`:1379`: `U = A /
  (t/k + R_films) + openingUPerM3·V·n`, `C = 1.2·1005·V +
  ρ·c·A·activeDepth`), `envelopeTemperatureSync()`/`Last()`
  (`:1492`/`:1516`), `envelopeOutsideK` (persistent runtime state,
  `:489`).
- Dials: `packages/content/platform/content/settings/envelope.yaml`
  (`enclosure.defaultMaterial` granite, `enclosure.defaultThicknessM`
  0.3, `envelope.surfaceResistanceM2KPerW` 0.17, `envelope.openingUPerM3`
  6, `envelope.activeDepthM` 0.01); keys at
  `lib/config/AppSettings.ts:1572-1593`.
- `lib/boundary/ExitableVessel.ts`: `enclosureDefaults()` (`:182`, the
  vessel's own material at `VESSEL_WALL_M`), `envelopeApplies()`
  (`:205`, **roofed by declaration**: volume ∧ no `_temperature`, no sky
  walk), `openExteriorOpenings()` (`:230`, shut seal ⇒ 0),
  `resetWeatherLocality()` on move (`:351`).
- Seven rows author `enclosure:`: hearthworks `smithy` (granite 0.45) and
  `woodshed`, general-store `cold-room` (pine 0.15), infirmary
  `blood-fridge` and `freezer-box`, apiculture `hive` and `thick-hive`.
- `lint:envelope` (`packages/server/scripts/check-envelope.ts`) clauses
  (a)–(e): authored `_temperature` ratchet list, enclosure material
  exists and conducts, the biome line, no indoor `_defaultTemperature`,
  closed spec keys.

### Structures and attachments

- `platform/idea/Structure.ts` — `DetailedMixin(VisibleMixin(Perceptible
  (Named(Singleton(Idea)))))`; fields `extent` (template-path prefix;
  `hasMember(path)` on a segment boundary), `entrance`, `landmark`,
  `heightM`; **no material, no storeys**; `canEvict` vetoes (*a structure
  stands while the zone that names it does*). `platform/idea/Ship.ts` —
  `Ship extends Structure` adds `deckHeightM`, the position and voyage.
- ⚠ The brief's "zones name structures (`structures:`)" is **stale**:
  the scan sweep retired it. Attachments are DERIVED in
  `platform/idea/LocationGraphRegistry.ts:437-440` — a row whose class
  is a Structure and authors `extent` is attached to that extent (kind
  `'structure'`; `expanse` → `'craft'`). `NavigationApi.structureAt(path)`
  (async, stands the attached structures up) / `structureAtNow(path)`
  (sync; `platform/idea/api/NavigationLogic.ts:306-316`,
  `innermostStructure`); `attachedNow` is `[]` before the first
  derivation. `lib/zone/LocationZone.ts:60-88` — `addLocation` kicks
  `standUpAttached` (a `StuffApi.singleton` per attached path, never
  awaited) and `lookOutFrom`. Nothing is booted.
- Three Structure rows exist: `packages/content/terminus/content/world/
  terminus/terminal/structure.yaml` (extent `/world/terminus/terminal`,
  entrance `…/location/arrival-gate`, landmark, 25 m — its rooms are
  `terminal/location/{arrival-gate, departure-gate-a|b|c, hall, office}`),
  `hesper/structure.yaml` (a `Ship`), `gannet-rock/structure.yaml`.
- `lib/stuff/Location.ts:185-205` — `noDefaultFloor`, `horizon`
  (authorable); `lib/location/CartesianLocation.ts:171-215` — `extent`
  override, else the zone's `cellSize`; volume and `getSizeScale` derive
  from it. `AtmosphericMixin._biomePath` is `authorable, ref:
  'identity:constituent'` (`Atmospheric.ts:404`).

### Light

- `lib/perception/AmbientLit.ts` — `ambientSource: 'sky'|'glow'|'none'|
  null`, `ambientOpening`, `_weatherDimFactor` (transient, stamped by the
  boundary fan-out), `isSkyLit()` (`:333`), `skyNoonFlux()` (`:350`: an
  authored `ambientIntensity` wins, else `light.sky.noonLux` (80) ×
  `getSizeScale()`).
- `platform/idea/modalities/VisionModality.ts` — `ownFlux` (`:407`;
  `:426` `isSkyLit() ? skyNoonFlux × skyFactor × weatherDim :
  ambientFlux × weatherDim`), `lightLegs` (`:339`: boundary conduits
  with `transmissivity` and optional `transmittanceColour`, exits at
  `EXIT_TAU`), `walkFluxAt` (`:541`). `CelestialApi.skyFactorNow()` is a
  per-game-minute memo over `skyIlluminanceFactor(profile, lat, t)`
  (`api/celestial.ts:452`), one sky for one world; `solarAltitudeDeg`
  (`:238`) exists.
- `platform/thing/Window.ts` — `baseTransmissivity`, directional
  overrides, `colorTint`, `glazeR/G/B`, `lightTransmittance(): Colour`.
  `lib/perception/Colour.ts` — `Colour.of(r,g,b)`, `UNDYED`, `stack`.
- `packages/content/trade-glass/src/lib/Tinted.ts:98-117` —
  Beer–Lambert **per channel** over the piece's `AlloyedMixin` iron and
  carbon fractions × `thicknessFactor()` (0.5 pane / 1.0 bottle), dials
  `glass.colour.*`. The glass material row
  (`base-library/…/material/glass/glass.yaml`) carries no optical field.
- ⚠ **The cafeteria atrium does not exist as a place.** The only rows
  containing *atrium* or *cafeteria* in the whole content tree are the
  two biome rows `base-library/…/biome/indoor/cafeteria.yaml` and
  `cafeteria-atrium.yaml` (the latter a `SkyExposedBiome`); **no
  location row references either**, and the University pack has no
  dining room (its rooms: Duncan Hall's lobby, corridor, dormroom,
  cistern, steps; the campus farm and field). See Risks & opens 1.
- The market awning is prose: `terminus/…/market/square.yaml:94` has a
  `bunting/canvas/awnings` detail and the fish stall's description says
  *under a striped awning*; no room is under an awning. The coach
  (`transport/content/system/transport/thing/coach.yaml`) authors
  `interiorVolume: 5`, `open: false`, no `_materialPath` comment-flagged.

### Supply & cure

- `packages/content/base-library/content/stuff/idea/material/organic/
  rubber.yaml` — density 1100, specificHeat 2000, k 0.16, hardness 5,
  toughness 20, `electricalConductivity: 1.0e-13`,
  `waterAbsorptionCapacity: 0.5`, `tags: [organic, elastomer,
  insulating, synthetic]`; nothing names it.
- `lib/material/Material.ts` `fieldMeta` — the Quantity fields
  (`density`, `thermalConductivity`, `specificHeat`, `hardness` MPa,
  `toughness` MJ/m³, `electricalConductivity` S/m,
  `waterAbsorptionCapacity` %, `meltingPoint`, `latentHeatOfFusion`,
  `castTemplate`, `ruinedByFreezing`, …), `tags`, `corrosiveTo`,
  `composition`. Units: `'%'` exists in `lib/quantity.ts`; **no `1/m`
  unit** today.
- `lib/material/Alloyed.ts` — `AlloyedMixin` per-instance fractions
  (`fractionOf`, `setFractionOf`, `getAlloying`/`setAlloying`).
- Materials that matter: leather toughness 10 / σ 1e-9 / wAC 15; wool
  4 / 1e-11 / 33; linen 3 / 1e-11 / 20; glass toughness 0.5 / wAC 0.1.
- No sulfur material. The Hill Quarry column
  (`rejection/content/world/terminus/rejection/idea/deposit/quarry-hill.yaml`,
  class `/system/ground/idea/Deposit`): bands `toZ` −1 drift, −2 clay,
  −6 granite, −9 limestone, −10 coal, −12 halite (wins bulk salt), −400
  granite; `waterTable: -12`. `packages/content/ground/src/idea/Deposit.ts:56-81`
  — `StratumBand { toZ, host, wins? }`, `wins` a thing row or (by the
  `/idea/material/` infix) a bulk material. The won-coal exemplar is
  `trade-quarrying/content/trade/quarrying/thing/coal.yaml` (a row with
  `_materialPath` and a mass). `dig` is the platform's
  (`platform/idea/cmd/ground/DigController.ts`).
- `platform/idea/species/Species.ts:432-540` — `TapSpec { key, yieldRow,
  perGameDay, behaviour, windowDays, window?, yieldShape?, … }`;
  `TapWindowSpec` kinds `always | event | photoperiod | biome | weather
  {daylightFrom, daylightTo, rising?, minK, maxK} | freeze-thaw`.
  `lib/husbandry/Producing.ts:353-392` — the `weather` kind reads the
  **host's own** `getTemperature()` when `MixinApi.isThermal(self)`
  (absent ⇒ open); `:437-452` the refusal words (`cold` → *it is too
  cold for anything to run*). `freeze-thaw` reads the AIR
  (`WeatherApi.dailyRangeAt`). The maple exemplar: species
  `trade-forestry/…/acer/saccharum.yaml` (`production: [{key: sap,
  yieldRow: /stuff/idea/material/food/maple-sap, perGameDay: 2,
  behaviour: accrue, windowDays: 4, yieldShape: volume, window:
  {kind: freeze-thaw}}]`), tree row `trade/forestry/thing/plant/
  maple-standard.yaml` (`class: /trade/forestry/thing/SapStandard` =
  `ProducingMixin(Plant)`, `spiles`, `profile`), standing stems in
  rejection's hanging wood `extends:` it with `growthStage: mature`,
  `mass: 290`. `platform/thing/Plant.ts:51` — `Plant` composes
  `ThermalMixin` (so a tree HAS a body temperature; a 290 kg stem's τ is
  hours).
- Crops: `platform/thing/Plant.ts` rows with `harvestTemplatePath`
  (read in `lib/husbandry/Growing.ts`); `platform/thing/Crop.ts:43`
  `Crop extends Provision`; `trade-farming/content/trade/farming/thing/
  plant/madder.yaml` → `crop/madder-root.yaml` (`_materialPath:
  /trade/farming/idea/material/madder`) is the root-crop exemplar.
- `lib/craft/Recipe.ts` — `inputSlots` (`kind: 'item'` slots: `category`
  tag, `count`, consumed; bulk slots `measureL`), `toolCapabilities`,
  `outputTemplate`, `outputMaterial`, `outputApplication`, `requiresHeatK`,
  `holdS`, `maxHeatK`, `massYield`, `difficulty`, `discipline`. No
  non-consumed slot flag.
- `platform/idea/cmd/device/FireController.ts` — `FIRE_MS = 60_000`
  (`:77`); `firingsFor` (`:198`) matches every catalogue recipe with
  `requiresHeatK > 0` whose slots are all `item` against the chamber's
  Tangibles by material tag; refuses `mixed-charge`, `not-lit`,
  `insufficient-heat` (`held < wanted`, `:162`); `runFiring` (`:303`)
  consumes `batches × count`, applies `massYield`, merges the consumed
  charge's `Alloyed` fractions mass-weighted onto an Alloyed output
  (`:330-362`), lands the output in the kiln. **It never reads `holdS`
  or `maxHeatK`.** `fire.yaml` arg `kiln` defaults to
  `reachable:[mixin.BurnerMixin]`.
- `holdS` readers (grep): `CraftingLogic.ts` (`donenessAtMint :1029`,
  the kill `:1203`, `:1657`), `ThermalDose.ts`, `Freshness.ts`,
  `Contaminable.ts`, `Texture.ts`. **Recipes authoring `holdS`**: only
  baking/cooking rows (`flatbread`, `lean-loaf`, `dog-loaf`,
  `black-pudding`, `hearty-stew`, `seared-cut`, `warmed-through`) — all
  craft-resolve (`make`/`cook`) recipes; **no `fire` recipe** (`glass-
  batch`, `glass-batch-amber`, `remelt-cullet`, lime, pots) authors it.
- `lib/thermal/ThermalDose.ts` — `rateAt(T) = 10^((T−Tref)/z)` above a
  floor, `integrate(fromK, ambientK, Δt, τ)` (Simpson over
  `Decay.toward`), `wantedDoseS(T, holdS)`, `bandFor`; dials
  `thermal.dose.*`; composed only on `platform/thing/Provision.ts:68`.
- `platform/thing/Oven.ts:28` — `Oven = ContainerMixin(PlacingMixin(
  Firebox))`; the brine hearth (`trade-quarrying/…/thing/brine-hearth.yaml`)
  is the exemplar `Oven` row (`burnTemperatureK: 450`, `bellowsMultiplier
  1`). `lib/fire/Burner.ts:614` — held K = `burnTemperatureK × (bellows
  ? bellowsMultiplier : 1)`. Space heating is `SpaceHeatingMixin`,
  composed by `platform/thing/Hearth.ts` and `Campfire.ts`; rows
  `generic-objects/…/stuff/thing/{stove, brazier, Hearth}.yaml`.
- `lib/craft/Epoch.ts` + `Tooled.getEpoch()`: the stamp has **no
  reader**. The requirements forbid a gate; none is added.
- `SmeltController.ferrousMaterialFor` (`trade-smelting/src/idea/cmd/
  smelting/SmeltController.ts:686`) — a code table from fraction to
  material; the shape the cure must NOT copy.
- Maturation: `MaturationProfile` rows under any root's `idea/maturation/`
  (`trade-forestry/…/idea/maturation/maple-sap.yaml`: `inputCategory`,
  `mechanism: evaporative`, `stallBelowK`, `happyK`, `damageAboveK`,
  `productMaterial`, …); mechanisms are a CLOSED five
  (`lib/maturation/MaturationProfile.ts:56-66`: microbial · chemical ·
  evaporative · enzymatic · one more) under `lint:closed-vocabularies`'s
  ceiling. A `Bulkable & Thermal` vessel's pool **solidifies** below its
  material's `meltingPoint` into the material's `castTemplate`
  (thermal.md § Phase change both ways; the climate build widened it to
  `Bulkable & Thermal` hosts).

### Demand

- `platform/idea/api/ElectricityLogic.ts` — `groundContactInsulated`
  (`:241`): foot parts' coverings via `body.coveringAt(part)`; insulated
  iff any covering's material σ ≤ `electricity.insulator.maxConductivity`
  (0.001); **dry conductivity, wetness ignored**. `isWet` (`:355`):
  immersed in a conducting pool ⇒ wets the BODY and returns true; else
  the body's wetness band. `pathResistance` (`:382`): per worn
  `Constructed` material, σ ≥ poolMin ⇒ ×skinFactor, σ ≤ insulatorMax ⇒
  `+ MaterialApi.contactResistance(mat)`. `MaterialLogic.contact
  ResistanceImpl` (`:878`): `clamp(geo/σ, 0, max)`, `geo` 0.01.
- The Drowned Substation: `world/substation/FloodedCell.ts` (a kernel
  world class; `onEntered` conducts from every energized content),
  rows `world-seed/content/world/substation/{flooded-cell, flooded-floor
  (concrete, surface pool salt-water 40 L), live-wire (120 V), stun-baton}`.
- `lib/slot/Attired.ts` — `coveringAt(part)` outside-in (`[0]` is
  outermost), `outermostAt`, `insulationAt` (clo × `(1 − looseness ×
  penalty)` via `fitOn`), `bodyInsulation` (Meeh surface shares),
  `windproofing`. `lib/wetness/Wet.ts` — `wet(delta)`, `getWetness()`,
  `getWetnessBand()`; composed at the matter baselines (Thing, Vessel,
  Agent) so a garment is `Wet`. `lib/slot/Wearable.ts` — `getClo()`
  floods the loft by wetness × `min(1, wAC/ABSORPTION_REFERENCE(40))`;
  `fitOn(wearer): FitReading { cut, distance, looseness, tightness }`,
  `cutToBodyPlan/Stature/Girth`; readers `Attired.insulationAt:633`,
  `LoadBearing.ts:287` (tightness surcharge), `ConditionLogic.ts:1252`
  (seam wear), the wear verb's `fit-impossible` refusal.
- `lib/pump/Pumping.ts:413-435` — `completePump` calls
  `wearPacking(dial(pump.wearPerStroke, 0.06))`; `PackingCondition`
  bands (`:108`: sound · worn (<0.55) · leaking · perished · gone);
  material-blind. `trade-tanning/content/trade/tanning/thing/packing.yaml`
  (a `Tool`, `capabilities: [packing]`, leather, 0.3 kg) + its recipe.
- Corrosion: `base-library/…/material/bulk/vitriol.yaml:27`
  `corrosiveTo: [metal, organic, tissue, leather, textile]`; quicklime
  spares metal. `ConditionLogic.ts:143` folds the corrosion channel only
  through `Constructed` occupants whose construction `isCovering()`;
  `:1235` a corroded layer wears `response.corrosion.wearPerContact`.
  Rubber's `organic` tag puts it in vitriol's set.
- Garments: `platform/thing/equipment/{Garment, AssembledGarment,
  DisguiseGarment}.ts`; the boots row `generic-objects/…/stuff/thing/
  armor/leather-boots.yaml` is an `AssembledGarment` (`slotClaims` feet,
  `constructionForm: hide`, `bill` of uppers welted to soles). Aprons
  and coats: `trade-tailoring/content/trade/tailoring/thing/{apron,
  coat}.yaml`. The general store's counter
  (`terminus/…/general-store/counter.yaml:30-58`) stocks
  `/stuff/thing/armor/leather-boots` at par 2. The gas bladder
  (`trade-fuel/…/thing/gas-bladder.yaml`) is a `Flask`, jute,
  `closure: sealed`.
- The goods yards: `terminus/…/goods-yards/{yard.yaml, oilworks.yaml
  (a CartesianZone, cellSize 3), oilworks/{location/floor, agent/hand,
  idea/outfit, thing/stock}}`. The terminus pack already depends on
  twenty-seven trade packs (its `package.json`).

### Pack conventions and the drive harness

- A capability pack: `pack.yaml` (`id`, `root`, `requires.title`,
  `boot`, `maintainers`; closed key set), `package.json` whose
  `@saxonberg/content-*` lines ARE `dependsOn`, `src/` in the kernel
  taxonomy (`thing/`, `idea/cmd/<cat>/`, `idea/reading/`, `lib/`,
  `__tests__/`), `content/<root>/…`, `content/recipes/`,
  `content/settings/`. Exemplar: `packages/content/trade-glass/`.
- The lint roster is derived (`lint:family`); gates that will see this
  build: `lint:envelope`, `lint:biome`, `lint:light-sources`,
  `lint:closed-vocabularies`, `lint:unconsumed-seams`, `lint:reachability`
  (arm R: every thing row reached; arm A: every view afforded),
  `lint:capabilities`, `lint:instanceable`, `lint:mixin-names`,
  `lint:field-meta`, `lint:imports`, `lint:module-scope`,
  `lint:object-verbs`, `lint:lib-statics` (a ratchet), `lint:mass`,
  `lint:perishable`, `lint:test-bootstrap`, `lint:drive-scripts`.
- `packages/wire/tests/*.dirty.wire.test.ts` — the drive shape
  (`assembly.dirty.wire.test.ts`: `declareFile({file, packs,
  dirtyReason})`, `Session`, `expectOk/expectNote/expectRefused`,
  `query()`, `prose()`, `advanceWorldClock('1 day')` through
  `/auth/test-clock`, `bootOwnedWorld`). `WIRE_PORT=2014` in this
  worktree. The clock scale is 12 (one real minute = twelve game
  minutes); a wire run cannot wait out days except by `advanceWorldClock`.
  **There is no verb that sets the weather**; the climate drive reads
  `analyze weather` and compares wet/dry after clock jumps.

---

## Plan-level decisions

### The construction model (D1–D7)

**D1 — Vocabulary: `enclosure:` stays the WALLS; `roof:` is its new
sibling; `none` is a legal value for either.** `Enclosed.ts` already
argued *enclosure* over *walls* (a fence is not a wall) and seven rows
author it; renaming buys nothing. Both specs are the same closed shape
`{ material?, thicknessM? }`; the literal `none` means *no such part*
(an awning has `enclosure: none`; a roofless yard-within-a-building has
`roof: none`). **The type is the same for BOTH parts:** `EnclosureSpec |
EnclosureSpec[] | 'none'` (D1a), and `getEnclosure()` / `getRoof()`
return the RAW authored form — a spec, a list, `'none'`, or `null` when
the row authors nothing — never a resolved or normalised shape; that
return contract is what repair W7 reads (`LayerState` seeds from it),
so it does not change without telling repair. `lint:envelope` clause (e)
grows to hold `roof` shut the same way. ⚠ `Enclosed.ts`'s *"No `roofed`"* paragraph is rewritten: the
roof is now a declared part because the sky bit is leaving the biome.

**D1a — A part is ONE layer or a LIST of layers, outside-in (added
2026-10-16 after reading build-4's storage-and-ice requirements).**
Their icehouse wall is a sawdust-filled double wall (timber · sawdust ·
timber); a hothouse may be double-glazed. So `enclosure:` and `roof:`
each accept today's single `{ material, thicknessM }` **or** a list of
them, outermost first; the single form is a one-element list and every
shipped row stays valid unchanged. `ResolvedEnclosure` becomes a list of
resolved layers plus three derived figures the readers use:
`resistanceM2KW = Σ tᵢ/kᵢ` (heat — layers in series), `transmittance =
Π e^(−αᵢ·tᵢ)` (light, D5), and `capacityJPerKM2` from the **innermost**
layer's skin (the active-depth term stays the skin that answers within
the hour — the room sees its lining, not the brick behind it).
`lint:envelope` clause (e) validates every layer. ⭐ The layer list is
also the seam a building's **bill of goods** would read (material × face
area × thickness = a mass of material per layer) — not built here; see
Deferred seams.

**D2 — ONE PLACE or A SET (user, 2026-10-16): the place owns every
material; the structure owns only relations.** What bounds a place is a
fact the place decides alone, so `enclosure:` (walls) and `roof:` — each
one layer, a list of layers (D1a) or `none` — live ONLY on the place:
`AtmosphericMixin` implements `Enclosed`, as today, and gains `roof`
beside `enclosure`. The rung ladder is unchanged and has no structure
rung: **row → class hook → universe.** `enclosureDefaults()` keeps
answering the universe default; the new `roofDefaults()` answers
`null` on a `Location` — *undeclared* — which is what hands the sky
answer to the legacy biome discriminator for a row that has not yet
said what is over it (D4, D14). `ExitableVessel` overrides both hooks to
its own material at `VESSEL_WALL_M` when it declares an
`interiorVolume`, and to `none` when it does not (an open boat): a
vessel is its own material all round and is never undeclared.
`Structure` carries **no** `enclosure`, **no** `roof`; it says which
places are its members and which stand on which (D3), and nothing
about what anything is made of. A lone hut, a single pen and an
icehouse standing apart are complete with no structure at all; a
structure with no member places (a castle on the horizon) is still a
structure.

**D3 — Storeys are a small tree of RELATIONS on the structure;
membership is the longest storey prefix; no `storeys` means one
implicit storey; there is no `open` flag.**

```yaml
storeys:
  - { key: ground,  extent: /world/terminus/goods-yards/rubber-works/location/ground }
  - { key: works,   extent: …/location/ground/works }           # longest prefix wins
  - { key: wing,    extent: …/location/ground/wing }
  - { key: loft,    extent: …/location/loft,    on: works }
  - { key: tower,   extent: …/location/tower,   on: wing }
  - { key: terrace, extent: …/location/terrace, on: loft }
```

A storey with no `on` stands on the ground. Whether a storey is
**enclosed** is not a storey fact and is never authored on it: a storey
is enclosed for the face rule iff a member place of it has walls or a
roof of its own (read off that place's `Enclosed`). So a roof terrace
is simply a member place authoring `enclosure: none` and `roof: none`
in a storey standing `on:` another; its floor **is** the roof of the
place it stands on, found through the `on` relation (the member of the
storey below that an exit joins it to, else that storey's first
member). An author carves prefixes as finely as the stacking needs —
the loft stands on the works room, not on the whole ground floor, so
the works room is its own storey. A structure may author no `storeys`
and an `extent` that covers no place at all (a landmark): nothing in
the model requires members. `lint:envelope` gains clause (f): every
`on` names a key, no cycle, every storey extent lies inside the
structure's extent — and nothing more.

**D4 — One rule decides every face, computed once per room into an
`Exposure` value object, synchronously.** `lib/spatial/Exposure.ts` (a
named value object, the module category `Light`/`Quantity` use) is the
construction answer:

```ts
interface Face { material: ResolvedEnclosure | null; areaM2: number; exterior: boolean;
                 neighbour?: Stuff; exit?: Exit }   // exit: the opening that joins them, if any
interface Exposure {
  structure: Structure | null;  // the set this place belongs to, if any
  storey: string | null;        // its storey key within it
  declared: boolean;            // the ROOF came from the row or the class hook —
                                // false ⇒ the legacy biome discriminator answered (D14's census)
  top: 'open' | 'roof' | 'ceiling';
  roof: Face | null;            // the top face when 'roof'
  walls: Face[];                // the place's walls less its openings (see below)
  wallsNone: boolean;           // `enclosure: none`
  openSides: number;            // doorless exterior exits — an open-fronted barn's missing wall
  onGrade: boolean;             // see below
  floorIsRoofOf: (Stuff & Atmospheric) | null;  // a terrace: the place below, via `on`
  rainReaches(): boolean;       // top === 'open'
  skyLightFraction(): number;   // D5 — 1 when open, 0 when ceiling
  skyVisible(): boolean;        // skyLightFraction() > 0
  windEnters(): boolean;        // wallsNone || top === 'open' || an exterior exit stands open
  isOutside(): boolean;         // top === 'open' && (wallsNone || every side open)
  exteriorAreaM2(): number;     // Σ exterior face areas (replaces 5·side²)
  interiorFaces(): Face[];      // the member-to-member couplings (D7)
}
```

The face rule, exactly as the requirements state it: a face is exterior
unless the space across it is an enclosed place of the same structure —
one that has walls or a roof of its own. Concretely, for a place `R`
(in structure `S` at storey `k`, or in none):

- **the place's own construction** — `enclosure` and `roof` resolve
  through the ladder of D2 (row → class hook → universe). When the roof
  is **undeclared** (a `Location` row authoring no `roof:`), the legacy
  biome walk (`BiomeApi.isSkyExposed`) decides, exactly as today: a sky
  biome ⇒ `roof = none` and `enclosure = none` (a street has no walls —
  which is also the eventual default, D14, so this half is not debt);
  anything else ⇒ `roof` = the walls' resolved material (today's *one
  material, five faces* — the counted transition, D14). `declared: false` is the one thing that marks
  it, and D14's census counts it.
- **top** — `ceiling` iff `R` is in `S` and some storey `j` with `on: k`
  contains an enclosed member; else `roof` unless `R`'s resolved roof is
  `none`, in which case `open`.
- **walls** — four faces of the cube cell (`side = ∛V`). **Openings are
  exits; there is no per-wall vocabulary.** A face is *interior* for each
  distinct same-storey member of `S` reachable by an obvious exit (it
  carries that exit, and it appears in `walls[]` with `exterior: false`
  — `interiorFaces()` is that filter); a face is an *open side* for each
  doorless obvious exit whose far place is **outside** — `far.exposure().
  isOutside()`, or no `Atmospheric` scope at all (a three-sided shed, an
  open-fronted barn); ⚠ a doorless exit to another ENCLOSED place is not
  an exterior opening: same structure ⇒ an interior coupling, another
  structure or none ⇒ the face stays a solid exterior wall as today. The
  remaining faces are *exterior walls* of the place's own enclosure
  (`max(0, 4 − interior − openSides)`), and `exteriorAreaM2()` = Σ of
  exactly those exterior wall faces plus the roof face when `top ===
  'roof'`. A doored exterior exit is a wall with a door in it: shut, it
  is the wall; open, the shipped `U_open` term already counts it and it
  lets the wind in. A window is a `Window` boundary and passes light by
  its own transmissivity (leg (d)), as today. ⚠ A stated abstraction: the
  engine has no room geometry, so *which wall is shared* is answered by
  *who is next door through an exit*; two members side by side with no
  exit between them are not detected as sharing a wall (each keeps that
  face exterior). A stair or ladder to another storey is an interior face
  too (it couples heat, D7) but consumes no wall.
- **floor** — never a loss face (the ground, or the place below), as
  today. **`onGrade`**: in a structure, true iff `R`'s storey has no
  `on`; a place in no structure keeps today's rule (an open top ⇒ true;
  `z < 0` ⇒ true; else false) unless its `Floor` authors `onGrade`. A
  place in a storey standing `on:` another has `floorIsRoofOf` the
  place below (D3), and its floor's default material is that place's
  roof.
- **a vessel** — its own material all round when it declares an
  interior (roof + four walls, no structure); open when it does not.
- **a place in no structure** — complete on its own: its walls, its
  roof, its openings, every face exterior, the sky from its own roof.
  Nothing in `Exposure` requires a structure, and nothing in it requires
  a structure to have members (a landmark's `Exposure` is never asked).

The method is `AtmosphericMixin.exposure(): Exposure`, cached in a
transient `_exposure` keyed by `(structure stuffId | null, storey key)`
and recomputed whenever `NavigationApi.structureAtNow(path)` answers a
different structure than the cache was built against — the Floor snow
precedent (*re-runs each read until the place answers*), because a
structure stands up asynchronously after its room (`LocationZone.
addLocation` kicks and does not await) and a memo taken before it
stands would say *no structure* forever. Also invalidated by
`restoreFromTemplate`, by `resolveEnclosure`'s own cache reset, and by
a door on one of its exits opening or shutting (the opening count is
re-read, not cached — it is one pass over the obvious exits, the same
pass `openExteriorOpenings` already makes). Cost on the hot path: one
map lookup over the path's ancestors plus, on a miss, one pass over the
place's obvious exits.

**D5 — Light through matter by Beer–Lambert: `Material.lightAbsorption`
in 1/m; absent means opaque.** A new `Quantity<'1/m'>` unit (the
catalog in `lib/quantity.ts` gains it) and a `Material` field with
marshaller; `getLightAbsorption(): Quantity<'1/m'> | null`. A layer of
thickness `t` passes `e^(−α·t)`; a face passes the PRODUCT over its
layers (D1a); a material authoring nothing passes 0, so one opaque layer
makes the face opaque.
Rows that author it this build: `glass/glass.yaml` (α ≈ 8/m: 4 mm clear
glass passes 0.97), `bulk/water` (≈ 0.5/m), `organic/horn` if it exists
(≈ 200/m), and nothing else — every opaque row is opaque by omission,
which is the honest default. ⚠ Ice (≈ 2/m) is a **merge-time one-liner**
on `/stuff/idea/material/bulk/ice` (ice's W0 moves the row there; rubber
does not edit the ice row in its waves — § Parallel builds).
⭐ **One named method, `Exposure.faceTransmittance(face): number`** — the
product over the face's layers — is the only place a face's
transmittance is computed; `skyLightFraction()` and the solar term (D6)
both call it, and cleanliness multiplies grime into it later.
`Exposure.skyLightFraction()` = `min(1, T_top + w_side · Σ T_wall_i)`
for exterior faces, `w_side = light.solar.sideWeight` (0.25): an opaque-
walled glass-roofed hall is lit by its roof; a glass-walled lean-to
under slate by its walls. **Reconciled with `Tinted`**: `Tinted` is the
COLOUR term (iron and carbon per channel, dimensionless thickness
factor, on a piece of glass); `lightAbsorption` is the grey base term on
the material row. They multiply where both exist (a glazed `Window`
already multiplies the pane's colour into the walk); a construction
face has no pane object (glass-slate), so it uses the grey term alone,
and `glass.yaml`'s α is chosen so a clear pane's grey transmittance
matches what `Tinted` reads as *clear*. Nothing in `Tinted.ts` changes.

**D6 — Solar gain is a heat term on the envelope, derived from the sky
the light walk already reads.** `P_solar = I_noon · skyFactor(t) ·
weatherDim · Σ_exterior T_i · A_i · w_i`, with `I_noon =
light.solar.noonIrradianceWm2` (a dial; 700 — a clear temperate noon on
a horizontal surface, ⚠ the one calibration constant, and it is a
setting not a plan decision), `skyFactor(t)` the pure-geometry
`CelestialApi.skyIlluminanceFactor` at the realm's profile and latitude
(sync), `weatherDim` the scope's cached dim factor, `w_top = 1`,
`w_wall = light.solar.sideWeight`, and `T_i = faceTransmittance(face)`
(D5). ⭐ **Delivered through ice's protocol, never a second formula:** the
solar term is a `RoomHeatExchange` contribution `{ fixedW: P_solar(atS),
conductanceWperK: 0, anchorK: 0 }` that `reconcileEnvelope` sums with the
occupants' exchanges and `envelopeSteadyStateK(outsideK, atS)` folds in
(ice owns both; rubber keeps a DROP-AT-MERGE copy of the plumbing if ice
has not merged — § Parallel builds). Evaluated **per segment**: a gap is split into at most
`envelope.solarSegmentsMax` (48) equal segments, each no longer than a
game hour, with the sky factor sampled at the segment's midpoint; a room
with no transmitting exterior face (every opaque building) skips the
split entirely and integrates exactly as today. ⚠ The lux→W/m²
conversion is NOT used: `noonLux` is a MUD-scale number (80), not a
photometric one (light.md § Calibration), so the irradiance is its own
dial and the two share only the sky factor and the dim.

**D7 — Heat between members of one structure: one-hop coupling through
interior faces, each neighbour read as a constant over the gap; the
exit's boundary state decides how strongly.** For each `Face` in
`exposure().interiorFaces()` the coupling is one of two shipped terms,
chosen by the exit that joins the two places — an honest, simple rule,
stated once: **shut ⇒ conduction, open ⇒ flow.** A doored exit whose
door is shut (or a `Window` boundary) couples by conduction through the
party wall — and ⚠ **the conductance must be SYMMETRIC** so heat is
conserved between the two rooms (ice's icehouse platform and house are
the first case): `U_i = A_i / (Σ t/k over BOTH places' own wall layers +
R_films)`, the series sum of the two sides' walls, so each side computes
the same number from the same two rows (D1a; a party wall is the two
places' walls back to back — a `partition:` spec is deliberately NOT a
third vocabulary, see Deferred seams); a doorless exit, an open door or
an open gate couples by air exchange at the same flow constant an open
exterior opening already uses, `U_i = envelope.openingUPerM3 ·
min(V_this, V_far)` (symmetric by the `min`; an open stair between
kitchen and loft is the inside air moving, not a wall conducting — which
is why the loft warms within the hour and a shut door between them makes
it an afternoon). `T_i = neighbour.envelopeTemperatureLast()`. ⭐ Each
interior face is delivered as a `RoomHeatExchange` contribution
`{ fixedW: 0, conductanceWperK: U_i, anchorK: T_i }` into ice's
`envelopeSteadyStateK` (§ Parallel builds) — the protocol's `G_j·anchor_j`
term IS the neighbour coupling; nothing else is added to the formula. The steady state becomes
`(U_ext·T_out + Σ U_i·T_i + P) / (U_ext + Σ U_i)` and `τ = C / (U_ext +
Σ U_i)`; a neighbour whose `Last` is `null` (never resolved) contributes
no term (adiabatic, not exterior). **Bounded and recursion-free:** the
neighbour's `Last` never integrates; the async
`resolveEnvelopeTemperature` additionally resolves `envelopeOutsideK`
for each interior neighbour that has none (one hop, never awaited
recursively), and calls `neighbour.reconcileEnvelope()` once so the
value read is current to this read (the neighbour's own reconcile reads
*this* room's `Last`, and its `_envelopeReconciling` guard holds). A
neighbour not resident is stood up by the obvious-exit resolution that
already loads a destination on use; a neighbour that fails to resolve is
skipped (the five `getObviousNeighbours` guards). What it costs: a read
in an `n`-room building is `O(n)` cached reads and one neighbour
integration per face; what it buys: a warm kitchen warms the room above
it through the stair, and an interior partition loses nothing to the
weather because it is no longer an exterior face (D4), which is the
requirement's second clause with no extra code.

### Materials and the cure (D8–D12)

**D8 — `fire` honours a hold.** `fire.yaml` gains an optional `for
<duration>` arg (`type: string`, `prepositions: [for]`, parsed by the
shipped duration grammar the clock verbs use); the firing's game-time
hold is the arg, else the recipe's `holdS` when `> 0`, else today's
`FIRE_MS` worth of game time. The real engagement stays `FIRE_MS`
unless the hold is longer, in which case the engagement is the hold
divided by the clock scale (the clock ceiling applies: a two-game-hour
cure is ten real minutes; the drive uses `advanceWorldClock` across it
— see D15). **Audit:** no shipped `fire` recipe authors `holdS`, so every
shipped firing is byte-identical; the cooking recipes that author it
run through craft-resolve and are untouched.

**D9 — The cure is DATA on the feedstock material: `Material.crosslinking`,
a `CrosslinkSpec`, evaluated by a value object, never a controller
table.** `lib/material/Crosslinking.ts` (named value object):

```yaml
# on /stuff/idea/material/organic/raw-rubber
crosslinking:
  agent: sulfur            # a material TAG the charge's other inputs carry
  referenceK: 418          # 145 °C — the rate is 1 here
  zK: 12                   # a decade of rate per 12 K (empirical, a setting-free row fact)
  fullDoseS: 1800          # dose-seconds at reference for a full cure at the optimum
  agentOptimum: 0.03       # mass fraction of agent that cures best
  agentOver: 0.20          # at or above, a full cure is the over-range material
  scorchAboveK: 455
  products:
    under: /stuff/idea/material/organic/raw-rubber      # stays what it was, now weeping
    cured: /stuff/idea/material/organic/rubber
    over:  /stuff/idea/material/organic/ebonite
    scorched: /stuff/idea/material/organic/rubber-scorched
```

`Crosslinking.outcome({ agentFraction, heldK, holdS })` returns
`{ material, grade, degree }`: `dose = holdS · 10^((heldK − ref)/z)`,
`degree = min(1, dose/fullDoseS) · min(1, agentFraction/agentOptimum)`;
`degree < 0.6` ⇒ `under`; else `agentFraction ≥ agentOver` ⇒ `over`;
else `heldK > scorchAboveK` ⇒ `scorched`; else `cured`, graded by
distance from `(degree = 1, agentFraction = agentOptimum)` through the
shipped `Grade` band ladder. The agent fraction is **the consumed
charge's agent-tagged mass over its total consumed mass** — the same
mass-weighting `runFiring` already does for alloying, so a player who
weighs sulfur against rubber gets the fraction they weighed. The
ebonite over-range, the under-cure and the scorch each come out as a
**different material row** (lens 2: an author names, prices and
describes each), and the product says so through its material's
`appearance` and the thing's `look`. ⚠ A fourth row,
`rubber-scorched` (`extends: rubber`, worse hardness/toughness, tag
`scorched`, appearance *blistered and brittle-skinned*), is how
*scorched, and it says so* becomes a fact a player can read without a
flag on `CraftedMixin` (which would hang a scorch gauge on every crafted
thing — the *Freshness off every Thing* shape). The requirements count
three materials on the curve; this is a fourth row, not a fourth
chemistry — flagged in Risks & opens 3. `FireController.runFiring`
gains one branch: if any consumed input's material carries a
`crosslinking` spec, the outputs' material is set to the outcome
(`setMaterial`) and their grade to the outcome's — fifteen lines, no
table, and the glass and lime firings never enter it. A test in
`lib/material/__tests__/Crosslinking.test.ts` prints the curve.

**D10 (revised 2026-10-16) — The mould decides the shape, on DAIRY's
mould system; rubber builds exactly one seam of the moulding build and no
more.** Ordering decided by the user: rubber ships before the moulding
build (repair's `moulding-slate`), so it takes the seam that slate's
*"rubber's way"* ruling names — **a firing of a mould's contents asks the
mould for its shape** — and leaves everything else (pressing as a load,
the pour that fails, impressions, consumed moulds, dry/cure/bake as set
processes) to moulding. ⛔ The earlier D10 (`Tool`-row moulds and a
`RecipeInputSlot.consumed` flag) is **dropped**: it was a second mould
concept beside dairy's.

- **Grounded on master after dairy merged (2026-10-17, `a2e688ff1`).**
  `S/lib/mould/Mould.ts`: `MouldMixin` (:136); the `Mould` interface
  (:87–106) is `castTemplateFor(material): string`, **`castInto(pool:
  SetPool): Promise<Stuff|null>`** (it MINTS the cast: clones
  `castTemplateFor(pool.material)`, stamps the material when
  `stampMaterial` or when the row authors none, sets the mass,
  `carryPayload` — maker from `payload.maker` else the mould's, the
  MOULD's grade onto a Crafted cast, freshness/pathogens/moisture if the
  cast composes them, `madeFrom` — then, reusable, moves the cast into
  itself and `wear(wearPerCast)`, else breaks), `holdsCast()`,
  `loadKg()` (needs `PlacingMixin`), `reconcileSetting()`,
  `getMouldDiscipline()`, `setState()`. `SetPool = {material, massKg,
  payload, moisture?, stampMaterial?}` (:58). A broken mould casts a lump
  (:222). `platform/thing/Mould = MouldMixin(DurableMixin(CraftedMixin(
  ThermalMixin(BulkableMixin(ContainerMixin(Good))))))` — **no Placing**.
  `MixinApi.isMould` (`S/api/mixin.ts:1537`), `Mixins.Mould`. The freeze
  edge asks the container first (`Thermal.ts:1386–1396`). ⚠ There is no
  `takeCast`; nothing casts a SOLID charge; `FireController` is untouched
  by dairy (`FIRE_MS` fixed at :77, charge = the chamber's direct
  contents at :115, `firingsFor` :198, `runFiring` :304).
- **The moulds are dairy `Mould` rows** in `trade-rubber` — `boot-mould`,
  `glove-mould`, `sheet-mould`, `ring-mould`, `tube-mould` — each naming
  its `castTemplate` (the boot, the glove…), reusable, crediting
  `discipline: chemistry`. A sixth product is one mould row and one thing
  row; **no recipe row per shape.**
- **One vulcanize recipe** (`trade-rubber/content/recipes/vulcanize.yaml`):
  input slots raw rubber (category `elastomer-raw`) + sulfur (category
  `sulfur`), `requiresHeatK: 400`, `holdS: 1800`, `maxHeatK: 455`, and
  **no `outputTemplate`** — the shape is the mould's. A charge fired with
  no mould comes out as the material's own lump (dairy's fallback rule,
  which is exactly *a plain vessel casts a lump*).
- ⭐ **The seam — ONE call site, written to be moved, not rewritten.**
  `FireController.runFiring` (and `firingsFor`, which must see a charge
  that sits one container down, inside a mould standing in the chamber)
  gains one branch: when the consumed charge stood in a `Mould`
  (`MixinApi.isMould`), the firing hands the mould a pool and lets the
  mould mint the cast — `mould.castInto({ material: outcomeMaterial,
  massKg: consumedMassKg, payload: { maker: firer, … }, stampMaterial:
  true })` — exactly the call the freeze edge makes, so the shape, the
  material stamp, the mass, the maker, the wear and the grade all ride
  dairy's one path. ⚠ `carryPayload` writes the **mould's** grade onto the
  cast; the cure has a grade of its own (D9), so after `castInto` the
  firing lowers the cast's grade to the cure's when that is worse —
  **weakest link** (the smallholding harvest precedent): a fine mould
  cannot rescue a scorched cure, and a cracked mould spoils a fine one.
  Otherwise (no mould) the recipe's `outputTemplate`, else the outcome
  material's own `castTemplate` lump. Rules that keep the moulding build's refactor trivial:
  1. **No rubber word in the seam.** It reads *a mould* and *the outcome
     material*; the cure's `Crosslinking` outcome (D9) only chooses the
     material. Bread in a tin and fired brick use the same branch
     unchanged.
  2. **The seam asks the mould; the mould holds no firing logic.** Nothing
     firing-specific is added to `MouldMixin`. ⚠ One generic correction
     IS needed there: `holdsCast()` is `getContents().length > 0`, so a
     mould charged with solids (raw rubber + sulfur waiting to be fired)
     reads *"what was poured in has set"*. It becomes *holds a thing
     whose template is this mould's cast* — true of every shipped case,
     correct for a solid charge, and moulding's own pressing (a plastic
     charge in a cavity) needs the same answer. When moulding adds pressing (a load) or a
     failed pour, they are reads the mould already answers (`loadKg`) or
     new answers from `castTemplateFor`; the call site does not move.
  3. **Named and pinned.** The branch carries a one-line comment naming
     `moulding-slate § 5` as its owner, and
     `FireController.mould-shape.test.ts` pins the contract: a charge in
     a mould comes out the mould's shape; the same charge in a bare
     chamber comes out a lump; a broken mould casts a lump; the mould
     wears by one cast.
  4. **No pressing.** Compression moulding is honest for rubber and is
     moulding's pressing line; here the charge is simply *in* the mould.
     Recorded in Deferred seams.
- `firingsFor`'s one-level-down reach is the other half of the seam and
  follows the same rules (a mould is the only container it reaches into;
  it asks `MixinApi.isMould`, never a class).

**D11 — Elasticity is a `Material` property: `elasticity`, a
`Quantity<'%'>` — the strain it springs back from.** Rubber 500, raw
rubber 300 (and it creeps — prose), ebonite 2, leather 10, knitted wool
30 (the construction's loft adds to a garment's stretch in D16),
linen 3, glass 0.1, iron 0.2; unauthored reads 0 (rigid), which is
today's behaviour everywhere. Readers: the cure (the product material's
own row carries its elasticity — nothing per instance), the pump
packing's wear (D12.3), and the fit stretch term (D16). ⚠
`lint:unconsumed-seams` counts an unread field: every reader lands in
the same wave as the field or the next.

**D12 — The four corrections, each on the host that already answers
the question.**

1. *Wet conducts.* ⭐ **Aligned with storage-and-ice's plan D9
   (2026-10-17): the law lives on `Material` as INSTANCE methods** —
   `material.permeability(): number` and `material.wetProperty(dry,
   fluid, saturation): number` (verbs on objects; the law is about a
   material) — with the setting `wetness.impermeableBelowPct` (2) and the
   hoisted `textiles.clo.absorptionReference` (40). **Ice owns them** (its
   W1) and migrates cloth's `k_void`; rubber consumes (the owner note
   below). `MaterialApi.contactResistance(material, wet?)` gains
   an optional `{ saturation, fluidSigma }` and `MaterialLogic.
   contactResistanceImpl` computes `σ_eff = material.wetProperty(σ_mat,
   fluidSigma, saturation)`, i.e. `σ_mat + saturation ·
   permeability · (fluidSigma − σ_mat)`, where `permeability = 0` when
   `waterAbsorptionCapacity ≤ wetness.impermeableBelowPct` (2 — rubber
   0.5, glass 0.1, metals 0) else `min(1, wAC / absorptionReference)` (the
   shipped textiles setting — see the THREE-readers note below). `ElectricityLogic.groundContactInsulated`
   and `pathResistance` pass each worn layer's own `getWetness()` and
   the pool's material conductivity when immersed (else fresh water's
   0.01 S/m). Boots wading brine must soak as the feet do — ⭐ **but electricity does
   not wet garments.** storage-and-ice's plan D11 adds `Attired.immerse()`
   (the body and every layer at every exterior part get `wet(1)`), called
   when a body goes INTO water. Wading is the same act below a water line:
   **ice owns `immerse(parts?)`** and has been asked to add the optional
   part filter (`parts?: (partKey) => boolean`, which also limits the
   BODY's wetting to those parts); the flooded cell's entry calls
   `immerse(foot parts)` — the electricity walk then only READS each
   layer's `getWetness()`. Until ice adds the filter, rubber's copy is
   `// DROP AT MERGE — owned by storage-and-ice`. One wetting method, two callers. Leather (wAC 15 ⇒
   permeability 0.375) soaked in salt water (≈ 5 S/m) reads ≈ 1.9 S/m —
   a conductor; rubber stays 1e-13.
   ⭐⭐⭐ **ONE wet law, THREE readers, ONE OWNER — ice (2026-10-17; see
   § Parallel builds).** Water in a material's pores replaces air; that is
   the whole mechanism, and it changes more than one property. The law
   is `Material.permeability()` / `Material.wetProperty(dry, fluid,
   saturation)` on the material row, with the setting
   `wetness.impermeableBelowPct` (2) and the hoisted
   `textiles.clo.absorptionReference` (40 — the ONE existing setting,
   never a second `40`). Its three readers: **thermal conductivity in
   cloth** — already shipped as `k_void = k_air·(1 − s) + k_water·s` in
   `Wearable.getClo` (`lib/slot/Wearable.ts` ~423) and **migrated onto the
   law by ice's W1** (byte-identical by ice's test); **thermal
   conductivity in packing** (ice — the icehouse's soaked sawdust, fluid
   ≈ 0.6 W/m·K); **electrical conductivity** (this build — the boots;
   fluid = the pool or fresh water). ⛔ **Rubber does not own, write or
   migrate any of it.** `MaterialLogic.contactResistanceImpl` is a CALLER:
   `σ_eff = material.wetProperty(σ_mat, fluidSigma, saturation)`. If W5
   runs before ice has merged, rubber writes a local copy of exactly the
   two methods and the setting, to ice's published signatures above,
   marked `// DROP AT MERGE — owned by storage-and-ice`, and deletes it
   when it merges master; it **never touches `getClo`**. The cutoff is
   what makes the boots work: without it a rubber boot (wAC 0.5) soaked
   in 5 S/m brine reads ≈ 0.06 S/m, above the 0.001 insulator cutoff
   (verified 2026-10-16: no shipped textile/leather/hide row has wAC ≤
   2, so the cutoff changes no shipped cloth outcome).
2. *The outermost layer sheds rain.* `Attired.exposeToRain(delta)` (a
   method on the wearer — verbs on objects): **each DISTINCT outermost
   garment is wetted ONCE**, by `delta · (the surface share of the parts
   it is outermost on)` — a coat that is outermost on torso and both arms
   takes one `wet()` call at the summed share, never one call per part —
   and the body takes `Σ_parts delta · share · passThrough`,
   `passThrough = permeability(outer material) · saturation(outer
   after)`; a bare part passes 1. `WeatherLogic.wetOccupants` calls `exposeToRain` for an
   `Attired` occupant and `wet` for anything else. Wool (0.825 × its
   saturation) soaks through as it saturates; rubberized cloth
   (permeability 0) passes nothing; oilskin (linseed-oiled linen row, if
   authored, low wAC) is honest for free.
3. *Wear reads the material.* `Pumping.wearPacking(amount)` multiplies by
   `wearFactor(material) = (pump.referenceToughness / toughness) · (1 −
   min(0.8, elasticity/500 · pump.elasticityWearRelief))`, reference
   toughness = leather's 10, relief dial 0.5: leather ×1.0, rubber
   (toughness 20, elasticity 500) ×0.25. The rubber packing row
   (`/trade/rubber/thing/packing`, a `Tool` with `capabilities:
   [packing]`, the tanning row's twin) outlasts leather four to one on
   the same pump — AC 10 by arithmetic, printed by a test.
4. *Rubber and ebonite resist acid.* **Decided with the user
   (2026-10-16): rubber KEEPS its `organic` tag** — it is chemically
   organic, and falsifying a tag to dodge a reader is the wrong way round.
   Instead **vitriol's and quicklime's `corrosiveTo` lose the coarse
   `organic` entry** and name what they really attack. The build first
   greps every row tagged `organic` that the entry currently catches
   beyond `textile`/`leather`/`tissue` (wood, food, rawhide, wax…),
   records each in the commit, and adds the honest tags (e.g.
   `cellulose`, `protein`, or the existing family tags) to the
   `corrosiveTo` lists and, where missing, to those material rows, so
   every shipped corrosion outcome is unchanged except rubber, ebonite,
   raw rubber and rubber-scorched (tags `[organic, elastomer, insulating,
   polymer]`, plus `synthetic` on the cured three), which nothing in the
   lists names. A test asserts the before/after corrosion outcome for
   every shipped material row is identical bar the elastomers.

### Supply (D13)

**D13.1 — Hevea and the latex tap.** `trade-rubber` ships the species
row `/stuff/idea/species/plantae/tracheophyta/magnoliopsida/malpighiales/
euphorbiaceae/hevea/brasiliensis.yaml` with `production: [{ key: latex,
yieldRow: /stuff/idea/material/bulk/latex, perGameDay: 0.3, behaviour:
accrue, windowDays: 2, yieldShape: volume, window: { kind: weather,
daylightFrom: 0, daylightTo: 1, minK: 291, maxK: 309 } }]` — a
whole-year daylength band (wrapping is legal) and the temperature as
the whole season, which is what a stove house is. The tree row
`/trade/rubber/thing/plant/hevea-standard.yaml` names `class:
/trade/forestry/thing/SapStandard` (`trade-rubber` depends on
`trade-forestry`; the `tap` affordance is that class's static, so the
verb reaches a Hevea with no rubber code). Three mature stems (⚠ ONE
`props:` line with `count: 3` / `as:`, never three near-identical rows —
`PURE_REPEAT_CEILING`, § Parallel builds)
(`extends:` the standard, `growthStage: mature`) are `props:` of the
stove house, the hanging-wood maples' shape. **⚠ The `weather` window
reads the AIR at the host's place, not the host's body** — a 290 kg
stem's own temperature lags the house by hours, and taps.md already
moved `freeze-thaw` to the air for the same reason (*a tree's xylem
follows the air*). `Producing.ts:383-390` changes to read the host's air
scope (`airScopeOf` → `envelopeTemperatureLast()` when an envelope
applies, else the sync chain) and falls back to the body only when no
air answers. Birch outdoors reads the same number either way after its
τ; a test asserts the birch's shipped season is unchanged on the
equinox.

**D13.2 (revised 2026-10-17, grounded on dairy's merged code) — Latex
sets by DRAINING, on dairy's set hook, in a coagulating pan: no new
mechanism, nothing for moulding to refactor.** The earlier
maturation-engine change is **dropped**. ⭐ Latex coagulation is the same
physics as curd — a colloid coagulates and gives up its serum (latex) or
whey (milk). The latex material row (`/stuff/idea/material/organic/latex`)
authors `drainSetting` (`S/lib/material/Material.ts:132`: `{days,
becomes?, moisture: {unloaded, loaded}, loadRef}` — **`loadRef` is
required**; the setter enforces `days > 0`, `0 < loaded ≤ unloaded ≤ 1`,
`loadRef > 0`): `{ days: 1, becomes: …/organic/raw-rubber, moisture:
{ unloaded: 0.6, loaded: 0.4 }, loadRef: 2 }`, and **`nutrientAmounts:
{ water: 600000 }`** — the drain's mass loss reads
`getNutrientAmounts().water / 1e6` (`Mould.ts:320–322`), so without it
the sheet would keep the whole pool's mass (field latex is ~60 % water;
dry rubber content ~35–40 %). The coagulating pan is a `Mould` row
(`/trade/rubber/thing/coagulating-pan`, class `/platform/thing/Mould`,
`interiorBulk: true`, `interiorCapacity: 2`, `closure: liquidTight`,
`castTemplate: /trade/rubber/thing/raw-rubber-sheet`, `reusable: true`,
`discipline: chemistry`, the ice pan's shape). Acts: `tap` into a cup,
`pour cup into pan` (credits the pan's discipline, `PourController`
:134–147), wait (`look pan` — *filled · setting · set*; the set advances
on read and needs the world clock row), `get sheet from pan`.
⚠ **Two corrections from the grounding:**
- **A cup of latex left standing never sets** — the drain set runs only
  in a mould (`reconcileSetting` returns unless the host is a Mould), and
  the lump-beside-it fallback is the FREEZE edge's alone. Stated as the
  abstraction: latex sets in a pan; the drive pours it into one.
- **No press on the pan.** `loadKg()` needs `PlacingMixin`, which
  `platform/thing/Mould` does not compose (only dairy's `Hoop` does, a
  pack class). Pressing the sheet is not a requirement; the pan sets
  unloaded (`moisture.unloaded`). A pressed sheet is a pack class like
  `Hoop` and is left to the moulding build (Deferred seams). `trade-rubber`
  keeps no `src/`.
The sheet (`raw-rubber-sheet`, class `/platform/thing/Thing`, material
raw-rubber, tag `elastomer-raw`) is `Thermal`, so `feel` gives its band
and its description reads *tacky when warm, stiff when cold*; it never
melts back to latex because raw rubber authors no melting point
(moulding-slate § 6). The dandelion route (D13.3) still yields a lump.

**D13.3 — Russian dandelion.** Rows in `trade-farming` (its title extent;
Placement says *a farming crop row*): species
`/stuff/idea/species/plantae/…/asteraceae/taraxacum/kok-saghyz.yaml`,
plant `/trade/farming/thing/plant/kok-saghyz.yaml` (`harvestTemplatePath:
/trade/farming/thing/crop/dandelion-root`; `daysToStage.mature` sized so
roots are dug in their first autumn), seed, and the crop row (material
`/trade/farming/idea/material/kok-saghyz-root`, tags `[rubber-root,
organic]`). Roots to raw rubber by two shipped verbs and two recipe rows
in `trade-rubber/content/recipes/`: `root-pulp` (`mill`, the millstone
capability, like `bone-meal`: item slot `rubber-root` → bulk pulp into a
sack) and `raw-rubber-from-pulp` (`make`, craft-resolve: the pulp item
slot + a `water` bulk slot of 5 L → the raw-rubber lump; prose *the
rubber floats off and is skimmed*). ⚠ The requirements say *milled and
washed*; `wash` is the cleaning verb (`WashController`: dregs, grime,
dye) and is the wrong act, so the washing is the `make` recipe. Flagged
in Risks & opens 4.

**D13.4 — Sulfur is caprock.** `base-library` gains
`/stuff/idea/material/mineral/sulfur.yaml` (tags `[sulfur, mineral]`,
density 2070, meltingPoint 388, k 0.2, yellow, and — rubber owns this
row — `heatOfCombustion: 9.3` MJ/kg and `autoignitionTemperature: 505`
authored honestly: the works' bellowsed oven holds ≈ 482 K < 505, so a
sulfur charge does not ignite in it; cleanliness later adds
`combustionProducts` (SO₂) to the same row); `trade-quarrying` gains
the won row `/trade/quarrying/thing/sulfur.yaml` (the coal row's shape,
mass 2); the Hill Quarry column inserts `{ toZ: -10.4, host:
/stuff/idea/material/mineral/sulfur, wins: /trade/quarrying/thing/sulfur }`
between coal (−10) and halite (now −10.4 … −12). `dig` wins it with no
code. The water table stays at −12.

### The pack, the works, the census and the drive (D14–D15)

**D14 — `trade-rubber` at `/trade/rubber`; the works is Terminus
content; the default is open, and interiors whose construction still
comes from the biome are a counted, falling number.**

- `packages/content/trade-rubber/`: `pack.yaml` (`root: /trade/rubber`,
  `requires.title: [{ extent: /trade/rubber, holder: { organization:
  /compact/trade } }]` — the glass precedent, a placeless trade);
  `package.json` depends on `platform`, `base-library`,
  `generic-objects`, `trade-forestry` (the `SapStandard` class),
  `trade-farming` (the crop), `trade-quarrying` (the sulfur row),
  `trade-tanning` (the packing recipe's shape is mirrored, not
  imported — no dependency needed; drop if nothing imports),
  `trade-tailoring` (the apron/coat rows the rubberized versions
  `extends:`). `src/` holds **nothing** unless a wave needs a class: the
  moulds are dairy `Mould` rows (D10), the oven an `Oven` row, the goods
  **one-piece `Garment` rows** (below), the lump a `Thing` row. If the
  build finds it needs a class, it is `src/thing/<Name>.ts` and nothing
  else.
- ⭐ **The rubber goods are ONE-PIECE CASTS** (agreed with repair, § Parallel
  builds): `rubber-boots`, `rubber-gloves`, `rubber-apron` (and the sheet,
  packing and hose) are standalone rows, `class:
  /platform/thing/equipment/Garment` (exists on master; repair's W1 folds
  `AssembledGarment` into it — verify post-repair), with **no `bill:` and
  no `extends: leather-boots`** — a moulded boot is one piece, so it takes
  repair's monolith mend path and its discipline comes from the mould's
  `castDiscipline` (`chemistry`), never from a recipe. Each carries a
  covering `constructionForm` so the corrosion fold and the shock walk
  (both narrow on `isConstructed` + `isCovering()`) see them: **`hide`** —
  the honest pick from the closed resist set (`plate · mail · padded ·
  quilted · hide`), because a cast sheet is a continuous, unwoven,
  loft-less layer that resists like a hide and not at all like a weave or
  a plate. `rubberized-coat` `extends:` tailoring's `coat` (a sewn cloth
  garment, so it keeps its construction) with material
  `textile/rubberized-cloth`.
- Materials are commons rows in `base-library`: `organic/latex`
  (bulk, tag `latex`), `organic/raw-rubber`,
  `organic/ebonite`, `organic/rubber-scorched`, `mineral/sulfur` (D13.4),
  `textile/rubberized-cloth` (⚠ carries RUBBER's tags — `[organic,
  elastomer, insulating, polymer]` — NOT linen's `cellulose`, so the
  narrowed vitriol list and cleanliness's vitriol cleanser do not eat it;
  wAC 0.5), and — rubber owns them for all four builds — `ceramic/brick`
  (k ≈ 0.7, ρ 1800, c 840, wAC 12) and `textile/canvas` (k ≈ 0.05, ρ 600,
  c 1300, wAC 25) with honest numbers, authored in W0 because the works,
  the terminal and the awning name them; `organic/rubber.yaml` gains
  `elasticity` and `crosslinking` stays on raw-rubber.
- The works and stove house: `packages/content/terminus/content/world/
  terminus/goods-yards/rubber-works/` — `structure.yaml`
  (`/platform/idea/Structure`, `extent: …/rubber-works`, the storeys of
  D3, `entrance: the works floor`; **no material on it**),
  `rubber-works.yaml` (a `CartesianZone` beside the oilworks', cellSize
  3), and six rooms **each authoring its own construction** (D2):
  `location/ground/works/floor.yaml` (`enclosure: brick 0.23`, `roof:
  slate 0.01`; the oven, moulds, a `stove`; ladder exit up to the loft),
  `location/ground/stove-house.yaml` (`enclosure: { material: glass,
  thicknessM: 0.004 }` and `roof: { material: glass, thicknessM: 0.004 }`
  — a glasshouse is glass all round on a brick dwarf wall; a
  `/stuff/thing/stove` prop; three Hevea stems; a door exit to the yard
  that is the vent), `location/ground/wing/store.yaml` (brick, slate),
  `location/loft/loft.yaml` (brick, slate; stair up to the terrace),
  `location/tower/tower.yaml` (brick, slate), `location/terrace/
  terrace.yaml` (`enclosure: none`, `roof: none` — a member place in a
  storey `on: loft`; its floor's default material is the loft's roof,
  slate). The business (`idea/outfit.yaml`) and a works hand are the
  oilworks' shape and are **optional** — nothing in the drive needs
  staff.
- The content pass moves the drive's other places: the **terminal
  hall** authors `roof: { material: glass, thicknessM: 0.004 }` and
  `enclosure: brick` (a station train shed — period-honest; the
  terminal is already a Structure and keeps its one implicit storey),
  and the terminal's other five rooms author `enclosure: brick`, `roof:
  slate` in the same pass so the whole structure leaves the census; the
  **market awning** is a **lone place** — no structure needed — a new
  room `market/location/under-the-awning` off the square with
  `enclosure: none` and `roof: { material: canvas, thicknessM: 0.002 }`;
  the **coach** authors `_materialPath` (ash) so its envelope and its
  rain answer name a real material (a vessel is never undeclared, so it
  was never in the census). The two orphan cafeteria biome rows are
  **deleted** (Risks & opens 1). ⚠ build-4's icehouse may land as a lone
  walled place or as a one-place structure; **either is fine now** —
  housedness is no longer debt, and a lone place with its own walls and
  roof is complete.
- ⭐⭐ **The default is OPEN; the interiors are the debt (user,
  2026-10-16).** Open sky is the absence of construction, and authors
  author causes, so the eventual default for a `Location` that authors
  nothing is **no walls and no roof**: streets, yards and fields are
  correct with no edit, ever. Until every interior has said what it is
  made of, the transition rule in D4 holds: an unauthored place whose
  biome is a `SkyExposedBiome` is open (the new default and today's
  answer agree — **not debt**); an unauthored place whose biome is NOT
  sky-exposed keeps today's one material on five faces (the legacy
  answer — **debt**).
- **`lint:biome-sky`** (`packages/server/scripts/check-biome-sky.ts`,
  picked up by the derived roster; it REPLACES the earlier plan's
  `lint:unhoused`, which is not built): a census-then-ratchet of
  **interiors whose construction still comes from the biome** — every
  Location row that lacks **either** `enclosure:` **or** `roof:` AND
  whose biome (the legacy walk) is not sky-exposed. ⚠ Both keys, because
  at ceiling zero BOTH `Location` defaults flip to `none`: an interior
  that authored only its roof would lose its walls. `ExitableVessel` rows
  answer with their own material and are never counted; sky-biome rows
  are never counted. **The count at W0 is the ceiling** (roughly 170 —
  the script computes it), held as `BIOME_SKY_CEILING` with the list of
  paths; it fails when a listed row has since authored both keys (pay the
  debt, delete the line) and when the count rises (a new interior must
  say what it is made of). **At zero**, `Location.enclosureDefaults()`
  and `roofDefaults()` both answer `none`, the D4 transition branch is
  deleted, and `SkyExposedBiome` retires (biome-normalization slate).
- `SkyExposedBiome` and `SkyExposedMixin` **stay** as the legacy
  discriminator for the counted rows and are retired at ceiling zero —
  the biome-normalization slate carries it (Deferred seams). ⚠ This is
  a sequencing fact, not a scope change: the requirements' *"the biome
  stops deciding the sky"* is true from W1 for every place that has said
  what is over it, and *"keeps the answer its biome gives today"* for
  one that has not is only possible if something still says it.

**D15 — The drive is a wire file, born in W7, and it drives time and
weather with what exists.** `packages/wire/tests/rubber.dirty.wire.test.ts`
(dirty: it buys out stock, clones into the works, moves the clock by
days). Rain: there is no weather verb; the drive advances the clock in
weather-segment steps (`advanceWorldClock('6 hours')`, at most 40 steps)
until `analyze weather` at the yard reports rain, then runs steps 1–3,
5 and 19 in that window; a run that finds no rain in ten game days
fails loudly rather than skipping (⚠ *a checkpoint owns its position*).
Sun: steps 7 and 10 advance to a clear noon by the same loop; step 8
advances to the hour before dawn. The cure (steps 14–17) uses `fire …
for 30 minutes`/`for 2 hours` and `advanceWorldClock` across the hold.
Coagulation (step 11) advances one game day. Each step asserts a STATE
read back (`query`, a reading's figure, a wetness band, a material
name), never only *not refused*.

### Stretch (D16, first to cut)

**D16 — Stretch is a term on `fitOn`, read from the material's
`elasticity` and the construction form's loft; no new flag.**
`Wearable.fitOn` computes an allowance `stretch = elasticity/100 · (1 +
loft)` (a dimensionless fraction of the garment's girth) and subtracts
`min(tightness, stretch)` from `tightness`; `looseness` is taken up by
the same allowance. The allowance is the garment's **material** (a
knitted wool jumper stretches; a linen shirt does not) and its form's
`loft`; an *elastic-waisted* stock garment is a row whose waistband
detail names rubber (`setMaterial(rubber, 'waist')` — the detail-material
override `Tangible` already has), and `fitOn` reads the `waist` detail's
material when one is present, else the bulk material. Cut this wave and
`elasticity` keeps its other two readers.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything else on that host |
|---|---|---|
| **`storeys`** field (relations only) | `platform/idea/Structure` | every Structure — a building, the Hesper, Gannet Rock's light — may say which of its places stand on which. True: a ship's decks are its storeys (`Ship`'s own `deckHeightM` is untouched); a light with no member places authors none and is still a structure. ⛔ NO `enclosure`/`roof` here — a structure says nothing about what anything is made of (D2). No guard re-narrows. |
| `roof` field + `roofDefaults()` hook + `exposure()` | `lib/biome/Atmospheric.ts` (`AtmosphericMixin`, beside `enclosure` — the `Enclosed` implementer, which owns every material of a place) | every scope with air — a Location, an `ExitableVessel`, the `Hive` — has a construction answer of its own, structure or no structure. True of all three (the hive's is its own walls, as its envelope already is). ⚠ NOT on `Location` (the `Enclosed.ts` argument: the mixin could only reach it through a cast), NOT on `Enclosed` as a new mixin (TS inference depth, same file), and NOT on `Structure` (a place decides what bounds it alone). |
| `Exposure` | `lib/spatial/Exposure.ts`, a value object | nothing composes it; it is computed and cached. |
| `lightAbsorption`, `elasticity`, `crosslinking` | `lib/material/Material.ts` | every material may be transparent, may stretch, may crosslink. All three default to the honest zero (opaque, rigid, inert), so every shipped row is byte-identical until it authors one. |
| `CrosslinkSpec` + `Crosslinking` | `lib/material/Crosslinking.ts`, a value object | nothing composes it; `FireController` and the test call it. |
| `for <duration>` | `fire.yaml` + `FireController` | every chamber may be held for a stated time. True of a kiln, a lime clamp, a glass pot. |
| `exposeToRain(delta)` | `lib/slot/Attired.ts` (`AttiredMixin`, on `Creature`) | every body that wears things sheds rain through them. True; a creature wearing nothing passes everything, as today. ⚠ NOT on `Wet` (a cloak is Wet and has no layers) and NOT in `WeatherLogic` (the walk belongs to the body that owns the slots — the three-copies lesson in `Attired.ts`'s header). |
| wet term on `contactResistance` | `MaterialApi`/`MaterialLogic` (exists) — a CALLER of ice's `Material.wetProperty()`; rubber owns no wet law | an optional argument; dry callers are byte-identical. |
| `faceTransmittance(face)` | `lib/spatial/Exposure.ts` (the value object) | one method, two callers (sky light, solar); a third (grime) is cleanliness's. |
| `wearFactor` | `lib/pump/Pumping.ts` (`PumpingMixin`) | every pump wears its packing by the packing's material. True by construction. |
| `lint:biome-sky` | `packages/server/scripts/check-biome-sky.ts` | a gate, not a host. |
| the `weather` window's air read | `lib/husbandry/Producing.ts` | every weather-windowed tap reads the air at its place. True of birch, Hevea, any future row. |
| Hevea rows, the works, the moulds, the goods | content — `trade-rubber`, `terminus`, `trade-farming`, `trade-quarrying`, `base-library` | rows name shipped classes; no class is added unless W7 finds one is needed, and then it is `trade-rubber/src/thing/`. |

**The narrowing test, applied.** Nothing above needs an `if (host is a
building)` guard: a vessel answers the construction question with its
own material (a class hook, not a guard), a place that has not yet said
what is over it answers with the legacy walk (a fallback the census is
shrinking, not a re-narrowing of the host set), a place in no structure
simply has `structure: null`, and a material with no `crosslinking`
simply has none.
The one place a guard was tempting — *is this charge rubber?* in
`FireController` — is answered by the material carrying a spec or not.

---

## Convention conformance

Checked at plan time against the current tree, not recalled:

- **`props:` / `cast:`** — every placed thing in the works is a `props:`
  entry on its room (`populates:` is retired; `container:` is refused by
  `lint:instanceable`). The Hevea stems are `props:` of the stove house.
- **Locations, not rooms** — the works' rooms are
  `SingletonCartesianLocation` rows joining a `CartesianZone` by
  `coords:` (the oilworks' shape). `FurnishableRoom` is not used.
- **`<root>/<branch>/`** — pack rows at `/trade/rubber/{thing,idea}/…`,
  recipes in `content/recipes/`, the works under `/world/terminus/goods-yards/
  rubber-works/…` in the terminus pack (trade = mechanism, locality =
  expression), materials and the species under `/stuff/…` in
  `base-library` / the pack's own `/stuff/idea/species/…` (species rows
  ship from trade packs today — forestry's maple).
- **Module scope declares; lifecycles initialize** — `Exposure` and
  `Crosslinking` are value objects with no module-scope execution; no
  new Api; `check-biome-sky.ts` is a script.
- **Import boundary** — nothing new outside `api/**` imports outside
  `src/mud/`; `Exposure` reaches `NavigationApi` through `api/navigation`
  (a static import from `lib/biome/Atmospheric.ts` — ⚠ check for a cycle;
  `LocationZone.ts` uses a dynamic import of the same module for the
  same reason, and the plan follows it: `exposure()` imports
  `NavigationApi` dynamically once and memoizes the module, or
  `structureAtNow` is reached through a `Stuff`-level seam the build
  finds already exists. The build records which.)
- **No new module category, no free helper** — none planned. If the
  build wants a helper, it folds into the value object or the owning
  class and says so in the commit.
- **Verbs on objects** — `exposeToRain` on the wearer; `exposure()` on
  the scope; `wearPacking` on the pump; `outcome()` on the spec.
- **Methods-only inter-stuff** — a neighbour's temperature is read by
  `envelopeTemperatureLast()`; a place's construction by its own
  `getEnclosure()`/`getRoof()` (raw authored form, D1) and a structure's
  relations by `getStoreys()`; the foot coverings by `coveringAt`.
- **Api ↔ Logic** — the only Api surface touched is
  `MaterialApi.contactResistance` (an optional argument on an existing
  pair) and, if needed, `BiomeApi.exposureOf(scope)` forwarding to
  `BiomeLogic` for scripts and lints that cannot reach a mixin method.
- **No `isWizard`, no migrations, no new collections** — none. Dev DBs
  are dropped (the quarry column changes a seeded Deposit row).
- **Lint gates this build must satisfy:** `lint:envelope` (grown),
  `lint:biome`, `lint:light-sources` (its row-side sky mirror learns
  `roof`), `lint:biome-sky` (new), `lint:closed-vocabularies` (no new
  closed word; `none` is a value of an open spec), `lint:unconsumed-seams`
  (every new field has a reader in its wave), `lint:reachability` (every
  new thing row reached: props, stock lines, recipe outputs, `wins`),
  `lint:capabilities` (`packing` already minted; no `mould` capability is
  minted — a mould is a dairy `Mould` row, narrowed by `MixinApi.isMould`), `lint:instanceable`,
  `lint:field-meta`, `lint:mixin-names`, `lint:imports`, `lint:module-
  scope`, `lint:object-verbs`, `lint:lib-statics` (the two value objects
  hold no statics beyond what the ratchet allows — `Crosslinking` is
  instance methods on a parsed spec, `Exposure` likewise),
  `lint:test-bootstrap`, `lint:schema` (untouched), `lint:drive-scripts`
  (the drive is a wire file).

---

## Waves

Each wave lands green on `pnpm test:near` + touched packs' vitest + the
lint family, at a commit. `pnpm test` runs once before the MR.

### W0 — the construction vocabulary and the `Exposure` answer (behaviour-preserving)

> ✅ **DONE `aa8294069`.** Decided in the build: (1) **the census is 103,
> not ~170** — rows that author no `_biomePath` are counted (the runtime
> walk reads them as interiors, so they are debt, the crossroads meadows
> included), `Offstage` rows are not (no volume), and every row whose
> CLASS overrides `roofDefaults()` is never undeclared — derived by
> scanning sources, not listed: `ExitableVessel`, `Hive`, `ColdStore`,
> `SealedCellar` (a cellar's roof is its metre of granite), all four
> given the hook here. (2) `Exposure.holdsAir()` (top not open AND walls
> not none) is added beside `isOutside()`: it is the predicate the air
> readers want (a walled pen and an awning both hold no air of their own,
> and neither is "outside" by the plan's `isOutside`). (3) `windEnters()`
> does NOT count an open top — the plan's own pen test says a walled pen
> is sheltered. (4) A doorless exit to a non-enclosed place is an open
> side (`walls none ∧ roof none`, read shallowly so two adjacent yards
> cannot recurse). (5) `skyLightFraction()` is 0 for an undeclared
> interior, so a shop with a doorless doorway does not turn sky-lit before
> its row says what it is (cleanliness #2 applies to declared places).
> (6) `ExitableVessel.enclosureDefaults()` answers `none` for an open boat,
> so the hook's return type widens to `EnclosureDefaults | 'none'`.
> (7) `getObviousNeighbours` gains `doors: 'all'` (a shut door is still a
> doorway between two places). (8) The field-meta golden did not move
> (it records statics shape only); the wiki-spoiler snapshot did.
> (9) The memberless-structure case is covered in `Exposure.test.ts`
> rather than a separate `Structure.storeys.test.ts`.

Implements D1, D1a, D2, D3, D4, D14 (the census).

Files:
- `lib/spatial/Enclosed.ts` — a part is `EnclosureSpec | EnclosureSpec[]`
  (D1a, outermost first; the single form is a one-element list);
  `resolveEnclosure` returns the resolved layers + `resistanceM2KW` and
  the innermost skin, and `reconcileEnvelope`'s `U` reads the series sum
  (byte-identical for every one-layer row — a test asserts it); add
  `RoofSpec` (= `EnclosureSpec | EnclosureSpec[] | 'none'`),
  `StoreySpec { key, extent, on? }` (no `open`), `roofDefaults():
  RoofSpec | null` on the `Enclosed` interface (`null` = undeclared);
  rewrite the *No `roofed`* paragraph.
- `lib/spatial/Exposure.ts` — NEW value object (D4).
- `platform/idea/Structure.ts` — ONE new field, `storeys` (persistent,
  authorable); `getStoreys`, `storeyOf(path)` (longest prefix; the
  implicit storey when none), `storeysStandingOn(key)`,
  `membersOf(key)` (resident members only — a sync read over the zone's
  locations, never a template search). ⛔ No `enclosure`, no `roof`.
- `lib/biome/Atmospheric.ts` — `roof` field + `getRoof/setRoof`,
  `roofDefaults()` (`null`), `resolveRoof()` (row → hook → the legacy
  biome discriminator when `null`, stamping `declared`), `exposure()`
  with the cache rule; `envelopeExposedAreaM2` **unchanged this wave**.
- `lib/boundary/ExitableVessel.ts` — `roofDefaults()` override (own
  material when `interiorVolume`, `'none'` otherwise).
- `packages/server/scripts/check-envelope.ts` — clause (e) admits `roof`
  with the same two keys and `none`, and a list of layers for either
  part, **on place rows only** (a Structure row authoring `enclosure` or
  `roof` FAILS — the one-place-or-a-set line); clause (f) the storey tree
  (keys, `on`, extents inside the structure's; nothing about openness).
- `packages/server/scripts/check-biome-sky.ts` — NEW; `package.json`
  `lint:biome-sky`.
- `base-library/.../material/{ceramic/brick, textile/canvas}.yaml` — NEW
  commons rows rubber owns for all four builds (D14).
- Generated artefacts: `pnpm -C packages/server lint:field-meta
  --snapshot` (fields `roof`, `storeys`) and this build's review-log
  entry in `src/mud/__tests__/wiki-spoiler-fields.snapshot.test.ts` +
  regenerated `.snap` — never hand-merged (§ Parallel builds).
- Tests: `lib/spatial/__tests__/Exposure.test.ts` (a fixture structure
  with the D3 tree: works floor → ceiling; stove house → roof; wing →
  ceiling; loft → roof; terrace → open, floor is the loft's roof; a
  three-sided shed → one open side, three exterior walls; **a lone hut
  with walls and slate → complete, every face exterior, dry; a lone pen
  with `enclosure` and `roof: none` → open top, wind does not enter; a
  row authoring nothing under a sky biome → open; under an indoor biome
  → five exterior faces of its enclosure, `declared: false`**; a coach
  → its own material, no structure), `Structure.storeys.test.ts`
  (**a structure with no `storeys` and an `extent` covering no place
  loads by the horizon route — `LocationZone.lookOutFrom` →
  `attachedWithin` → `StuffApi.singleton` — and is sighted; nothing in
  `Exposure` or either lint is asked about it**), the lints' fixtures.

Acceptance: every existing test green with no reader moved; `exposure()`
for every shipped room reproduces `isSkyExposed`'s answer in
`isOutside()`; the memberless structure test passes; `lint:biome-sky`
prints the ceiling and the list; `lint:envelope` refuses a Structure row
authoring a material.

Commit: `feat(construction): a place says what bounds it, a structure says what stands on what; Exposure answers the five faces`

### W1 — the five readers move onto the construction

> ✅ **DONE `551ae88cd`.** Decided: (1) the air/weather gates read
> `holdsAir()` (no air of its own), not `isOutside()` — under the plan's
> `isOutside` a walled pen or an awning would lose the weather's deviation;
> `isOutside()` is kept for the wayside survey ("outdoor ground").
> (2) `computeResolved` takes `{air, rain}` — two answers, as planned.
> (3) `BiomeApi.isSkyExposed` stays as the LEGACY discriminator with two
> readers only: `construction()`'s undeclared branch and `Floor.isOnGrade`'s
> shipped derivation (cleanliness #1). (4) An undeclared interior has no
> open sides (its doorway stays the `U_open` term) so every legacy shop's
> heat is byte-identical. (5) The exposure cache keys on the legacy sky bit
> — the Floor snow test caught a memo taken before the biome resolved.
> (6) `isThreshold(far)` = the far side holds no air; a doorway to another
> structure's enclosed room stays interior (no party threshold yet).
> ⚠ The shipped wire drives (envelope, climate, fire, glass, taps) are run
> once after W3 rather than per wave — W1–W3 all move the envelope.

Implements D4's second half; the biome stops deciding the sky for every
place that has said what is over it (which, until W7, is only the
vessels — so this wave is behaviour-preserving for every Location row,
except where a structure's membership turns a face interior).

Files (each caller from Grounding, in this order):
- **air & heat** — `Atmospheric.ts`: `addAtmosphereContent` (`exposure().
  top === 'open'` ⇒ 0), `airChangesPerHour` (open ⇒ ∞; exterior/interior
  openings by `isThreshold`), `envelopeApplies` (`!exposure().isOutside()`),
  `isThreshold(far)` → `structureOf(this) !== structureOf(far) ||
  far.exposure().isOutside()` (the documented one-liner),
  `envelopeExposedAreaM2` → `exposure().exteriorAreaM2()` (⚠ this is the
  first behavioural change for structure members: the terminal's and the
  Hesper's interiors lose through fewer faces where an exit joins two
  members; a place in no structure is byte-identical because its
  exposure is five exterior faces).
- **rain** — `WeatherLogic.ts`: the two `computeResolved` callers pass
  `exposure().rainReaches()` as `skyExposed` for `precipitationHere` and
  keep the sky-field decision on `isOutside()` (an atrium under glass is
  inside for the air and under the sky for the light — two questions,
  two answers); `wetOccupants`/`maintainPuddle` gated on `rainReaches()`;
  `runStormFanout` on `top === 'open'`; the restamp fan-out at `:905` on
  `isOutside()`. `Soil.ts:514` and `Floor.ts:688` → `rainReaches()`.
  `Maturing.ts:1303` already reads `airSegmentsFor` → its `rainMmPerH`
  must be 0 under a roof: `BiomeLogic.airSegmentsFor` gates rain on
  `rainReaches()`.
- **light** — `AmbientLit.isSkyLit()` → `exposure().skyVisible()` when
  `ambientSource` is null (the `'sky'`/`'glow'`/`'none'` rungs keep
  winning); `VisionModality.ownFlux` multiplies the sky term by
  `exposure().skyLightFraction()` (1 for open, so every street is
  byte-identical; the fraction only bites in W2 when glass authors an
  absorption — until then a roof passes 0 and a roofed place is dark
  unless lit, which is today's answer).
- **view** — `PerceptionLogic.horizonAtSea/Ashore`, `SurveyController.
  waysideSpaces`, `WeatherReading` → `skyVisible()`.
- **ground** — `Floor.isOnGrade()` default → `exposure().onGrade` (root
  storey for a member; today's rule for a place in no structure);
  `floorDefaults(onGrade)` for a place standing `on:` another reads that
  place's roof material (`floorIsRoofOf`).
- **weather deviation** — `BiomeLogic`'s six `skyExposedWalk` gates →
  `exposure().isOutside()`; `outsideKFor`'s `fromSky` unchanged (it is
  about the chain's provenance).
- Lints: `check-biome.ts` and `check-light-sources.ts` row-side mirrors
  learn: a row authoring `roof:` takes its sky answer from it (`none` ⇒
  open; a material ⇒ roofed) and, under a Structure's storeys, a
  ceiling; the legacy class check holds for a row authoring none.
- `BiomeApi.exposureOf(scope)` (+ `BiomeLogic`) if any script or test
  needs it without a mixin in hand.

Acceptance: the shipped drives `envelope`, `climate-and-water`, `fire`,
`glass`, `taps` unchanged (run their wire files); `Exposure.test.ts`
extended with each reader's answer; the terminal hall (authoring nothing
yet) keeps its biome answer; a fixture member under an enclosed storey
reads a ceiling.

Commit: `refactor(sky): the five readers answer from the construction; the biome keeps only what has not said`

### W2 — Beer–Lambert and solar gain

> ✅ **DONE `1c2f4d173`.** Decided: the solar term rides a
> `RoomHeatExchange` `fixedW` through `steadyStateOf` — one closed form,
> `τ = C/(U+ΣG)` — and `lib/thermal/RoomHeatExchange.ts` +
> `envelopeSteadyStateK` are DROP-AT-MERGE copies (ice had no code on its
> branch yet). `CelestialApi.skyFactorAt(t, lat)` was added (the sky curve
> at any instant; the gap may span a night). Open sides contribute no
> solar term (only faces with a material do). The `1/m` unit needed its
> `QuantityMarshaller` seed row (`1-per-m.yaml`) — the seeds test is what
> would have caught a live-only failure.

Implements D5, D6.

Files: `lib/quantity.ts` (`'1/m'`), `lib/material/Material.ts`
(`lightAbsorption`), `base-library` material rows (`glass`, `bulk/water`,
`organic/horn` if present — ⚠ NOT the ice row: that is a merge-time
one-liner on ice's `bulk/ice`), `lib/spatial/Exposure.ts`
(`faceTransmittance(face)`, `skyLightFraction`), `AmbientLit.ts`/
`VisionModality.ts` (the fraction now bites), `Atmospheric.ts`
(`solarGainW(atS)` delivered as a `RoomHeatExchange` `fixedW` contribution
per segment into ice's `envelopeSteadyStateK(outsideK, atS)` — with a
`// DROP AT MERGE — owned by storage-and-ice` copy of
`lib/thermal/RoomHeatExchange.ts` and the plumbing if ice has not
merged; `envelopeCoefficients` untouched), the field-meta golden +
wiki-spoiler entry regenerated (`lightAbsorption`), `lib/config/AppSettings.ts` +
`packages/content/platform/content/settings/envelope.yaml` (`light.solar.
noonIrradianceWm2`, `light.solar.sideWeight`, `envelope.solarSegmentsMax`),
`lint:envelope` clause (b) sibling: a transparent `roof`/`enclosure`
material (α authored) may be thin; an opaque one at 4 mm is warned.
Tests: `Exposure.light.test.ts` (glass roof passes ≈ 0.97; slate 0;
glass walls under slate 0.9 × 4 × 0.25 capped 1), `Atmospheric.solar.
test.ts` (a 3 m glass cell at a clear noon, stove out, lands above its
outside; the same cell at midnight falls to it; an opaque cell is
byte-identical to W1 — the gym prints the day curve).

Acceptance: `measure light` in a glass-roofed fixture reads daylight; the
same room is warmer than its outside at noon and equal before dawn.

Commit: `feat(light): matter passes light by Beer–Lambert; the sun warms a room through a transparent face`

### W3 — heat between rooms of one building

> ✅ **DONE `2f09b6539`** (+ `b123890b7`). Decided: the conduction area is
> the SMALLER cell's face (symmetric); a room with no exterior face still
> integrates; a piece coupled to nothing that has resolved holds.
> `feel` names the sun and the warm room next door. ⚠⚠ **The first wire
> run found the hot path**: `exposure()` resolved every neighbour on every
> call, and `envelopeApplies`/`isThreshold`/`airChangesPerHour` call it
> many times per command — the neighbour pass is now re-checked at most
> once a real second (structure and the legacy bit stay per call).
> ⚠ **The shipped-drives run (fire 23/23 · glass 7/7 green)** was
> confounded: the machine ran at load ≈ 80 (four builds), `climate`'s and
> `envelope`'s failures were a roster timeout and *"the clock is not in the
> small hours"* (dirty files run in ONE world, and climate moved the clock
> days first — envelope needs a fresh world of its own), the lantern's
> `no-fuel` is the clone's own stock, and `taps` died on its own
> `eval --parcel` mint (a shape testing.md already records as taking the
> server down) after its "till is broken" FINDING inverted — the till was
> fixed upstream. None reads a construction answer. **Envelope and taps
> are re-run alone, on a fresh world, before the rubber drive (W7).**

Implements D7.

Files: `Atmospheric.ts` (each interior face delivered as a
`RoomHeatExchange` `{ conductanceWperK: U_i, anchorK: T_i }` contribution
into ice's `envelopeSteadyStateK` — the DROP-AT-MERGE copy of the
protocol if ice has not merged, as in W2; `envelopeCoefficients` returns
`uInteriorWperK` beside `uWperK`; `traceOf`/the `feel` cause line names
the warmest neighbour), `BiomeLogic.resolveEnvelopeTemperature`
(neighbours' outside resolved one hop), `Exposure.ts` (`interiorFaces()`
carries the neighbour and the joining exit; the symmetric partition
conductance of D7). Tests:
`Atmospheric.coupling.test.ts` — two rooms of one fixture structure, a
`SpaceHeating` stove lit in the lower: the upper's `Last` rises within a
game hour and sits above an identical unheated control; **the same pair
with the stair's door shut couples by conduction and warms slower (shut
⇒ conduction, open ⇒ flow)**; an interior partition's U does not appear
in `uWperK`; a cycle of three rooms reconciles without recursion
(`Thermal.freeze.test.ts`'s ticking clock).

Acceptance: AC 7 by test; the works' loft in the drive (W7) by the drive.

Commit: `feat(envelope): rooms of one building share heat through their interior faces`

### W4 — materials, the hold, and the cure

> ✅ **DONE `db90d0a97`.** Decided: (1) **the cure consumes the WHOLE
> matched charge** (one product, its agent fraction the weighed one) —
> counted batches would decide the fraction for the player. (2) The
> vulcanize recipe DOES name an `outputTemplate` (`rubber-lump`): the
> Recipe contract refuses a row without one, and the no-mould fallback is
> the outcome material's own `castTemplate` lump anyway (`fire` reads that
> first). (3) A long hold is sealed down: the effort is a minute's stoking
> spread over the hold, so a two-hour cure exhausts nobody. (4) `for
> <duration>` parses the world clock's grammar (`N second|minute|hour|day`)
> in a private static on the controller (PressController's precedent).
> (5) `maxHeatK` is authored and NOT read by `fire` — the bellows scorching
> past 455 K is the point. (6) The scorched material is NAMED **burnt
> rubber** (`rubber-scorched` path): `scorched` is a spellbook descriptor
> word, and `lint:descriptors` refuses a material name that collides.
> (7) `holdsCast()` = a thing of the mould's shape OR its material's own
> cast (a cracked mould's lump); the dairy/mould test stubs now stamp the
> template path a real clone carries. (8) The moulds, the goods and the
> pan's sheet are NOT in W4: `lint:reachability` (ceiling 0) refuses a row
> nothing places, so they land with the works in W7. (9) `rubber.yaml`'s
> orphan `chemistry: null` came off (burnt rubber would inherit it):
> orphan-key ceiling 387 → 386. Pack count 61 → 62 (⚠ ice adds packs too:
> at the second merge the number is the SUM).

Implements D8, D9, D10, D11.

Files: `lib/material/Material.ts` (`elasticity`, `crosslinking` with a
validating setter), `lib/material/Crosslinking.ts` (NEW), `platform/idea/cmd/device/FireController.ts`
(the hold; the crosslink branch; **the mould seam** — `firingsFor`
reaches one level into a `Mould` in the chamber, `runFiring` asks it for
the shape and has it mint the cast with `castInto`, D10; the
`holdsCast` correction in `lib/mould/Mould.ts`), `trade-rubber` mould rows
(dairy `Mould` rows, one per shape) + the one `vulcanize` recipe, `packages/content/
platform/content/platform/cmd/device/fire.yaml` (the `for` arg + help),
`base-library` rows
(`raw-rubber`, `latex`, `ebonite`, `rubber-scorched`,
`mineral/sulfur`, `elasticity` on rubber/leather/wool/linen/glass/iron/
raw-rubber/ebonite), `lib/material/__tests__/Crosslinking.test.ts`
(prints the curve: 3 % sulfur at 418 K for 1800 s → rubber `fine`; 1 %
for 600 s → under; 25 % for 3600 s → ebonite; 3 % at 470 K → scorched),
`FireController.mould-shape.test.ts` (D10's four-case contract), `FireController` tests (a recipe
with `holdS` runs its hold; `for 2 hours` runs two game hours; a glass
batch is byte-identical), the field-meta golden + wiki-spoiler entry
regenerated (`elasticity`, `crosslinking`). ⚠ The mould seam's owner
comment: `moulding-slate` lives on the repair branch; if repair has not
merged when rubber does, the comment cites it by branch path
(`origin/reqs/repair:docs/slates/builds/moulding-slate.md § 5`) and is
re-pointed to the master path at repair's merge.

Acceptance: AC 2 and 3 in unit tests with a fixture oven and mould;
`pnpm lint:closed-vocabularies` unchanged; `lint:unconsumed-seams`:
`elasticity` has its first reader (the curve test is not a reader —
W5's pump is; the field lands here and the gate's ceiling is checked,
not raised: if it trips, `elasticity` moves to W5).

Commit: `feat(cure): a hold on fire; the crosslink curve as data on the feedstock; a firing asks the mould for its shape`

### W5 — the four corrections

> ✅ **DONE `efc201c33`.** Decided: (1) the vitriol/quicklime narrowing uses
> **`once-living`** — the biological-origin tag 26 of the caught rows
> already carried — and fifteen rows the old `organic` entry caught gain it
> (peat, gut, herbs, the tars, charcoal/coke/ash, puddings, leaf fat);
> `corrosion-narrowing.test` reads every shipped row and proves the caught
> sets are unchanged bar the four elastomers (seven FOODS are newly named —
> sap, milk, eggs, fat — which no covering is made of, so no outcome
> moves). The `analyze` preview's reference agent follows lime. (2) The
> wet law, `immerse(parts?)` and `wetness.impermeableBelowPct` are
> DROP-AT-MERGE copies (ice had no code); rubber never touched `getClo`.
> (3) Electricity reads each LAYER (its own wetness), not each material.
> (4) Wading is the flooded cell's `onEntered`: it immerses the foot parts
> before the walk reads them, only when the floor holds water.

Implements D12.

Files: `api/material.ts` + `platform/idea/api/MaterialLogic.ts`
(`contactResistance(material, wet?)` as a CALLER of ice's
`Material.wetProperty()` — if ice has not merged, a local copy of
`permeability()`/`wetProperty()` + the `wetness.impermeableBelowPct`
setting to ice's signatures, marked `// DROP AT MERGE — owned by
storage-and-ice`; `getClo` untouched), `platform/idea/api/
ElectricityLogic.ts` (`groundContactInsulated`, `pathResistance`; the
flooded cell's entry calls ice's `Attired.immerse(foot parts)` — the
same DROP-AT-MERGE rule for the part filter), `lib/slot/Attired.ts` (`exposeToRain`),
`platform/idea/api/WeatherLogic.ts` (`wetOccupants`), `lib/pump/
Pumping.ts` (`wearFactor`), `packages/content/platform/content/settings/
{pump,wetness,electricity}.yaml` (`pump.referenceToughness`,
`pump.elasticityWearRelief`, `wetness.impermeableBelowPct`), the narrowed
`corrosiveTo` lists on vitriol and quicklime + the honest tags on the rows
they must still catch, a grep record of every `organic`-tagged row the old
entry caught in the commit, and a before/after corrosion-outcome test. Tests: `ElectricityLogic.wet-boots.test.ts`
(leather boots dry in the brine cell: insulated; the same boots after
`isWet` immersion: shocked; rubber boots: insulated wet or dry),
`Attired.rain.test.ts` (wool coat: body wets as the coat saturates;
rubberized coat: body dry after ten segments), `Pumping.wear.test.ts`
(leather to `worn` in N strokes; rubber at N strokes reads `sound`),
`ConditionLogic.corrosion.test.ts` (vitriol on a linen apron wears it;
on a rubber apron, residual 0 and no wear).

Acceptance: AC 8–11 by unit test; the substation integration test
(`world/substation/__tests__/FloodedCell.integration.test.ts`) extended
with the two boots.

Commit: `fix(garments): wet matter conducts, the outer layer sheds rain, wear reads the material, rubber shrugs acid`

### W6 — supply

> ✅ **DONE `81d641992`.** Decided: (1) the caprock band is a FULL METRE
> (−10 … −11; halite −11 … −12), so a dig from the coal floor reaches it.
> (2) The won nodule is 50 g — a cure is weighed by COUNTING nodules against
> rubber (3 lumps of 0.5 kg + 1 nodule = 3.2 %). (3) The air read is
> `Producing.windowAirK`: the enclosing scope's own temperature (envelope
> last or authored) else `BiomeApi.airFor(scope).tempK`, the body only when
> nothing encloses it. (4) The stand, pan and sheet rows moved to W7 with
> the stove house (reachability ceiling 0).

Implements D13.

Files: `lib/husbandry/Producing.ts` (the `weather` window's air read;
test the birch unchanged), `trade-rubber` species + tree + stems +
the coagulating-pan `Mould` row + the raw-rubber sheet row, `drainSetting` on the
latex material (D13.2 — dairy's set hook; no engine change) (the pack skeleton lands here with `pack.yaml`
and `package.json`), `trade-farming` dandelion species/plant/seed/crop +
root material, `trade-rubber/content/recipes/{root-pulp, raw-rubber-
from-pulp}.yaml`, `trade-quarrying/…/thing/sulfur.yaml`, `rejection/…/
deposit/quarry-hill.yaml` (the band), `base-library` `mineral/sulfur`
(if not landed in W4). Tests: `trade-rubber/src/__tests__/latex.test.ts`
(a stem in a 300 K scope: open; at 285 K: `cold`; a cup of latex left a
game day in the coagulating pan sets into a raw-rubber sheet in the pan;
left in a plain cup it does not set at all (the drain runs only in a
mould); a warm sheet never melts
back to latex), `trade-farming` row test (the crop
mills to pulp; the `make` recipe mints the lump with water in reach),
the quarry column test (`dig` at −10.2 wins sulfur; −11 wins salt).

Acceptance: AC 1 by test (every input obtainable with nothing granted);
AC 4's tap half by test.

Commit: `feat(rubber): latex from a Hevea under glass, rubber roots from a field, sulfur from the caprock`

### W7 — the works, the content pass, the goods, the drive

> ✅ **Content DONE `3194f1fac`; the drive is being run.** Decided:
> (1) **the Hevea stand in TUBS** — an unpotted plant has no soil, so
> `satWater` is 0 and a tree would wither over ~44 game days with nothing a
> player could do: a time bomb. `hevea-tub` (a `PlantPot`, the starter
> pot's shape, the tree in its own `props:`) holds 8 L and wants watering —
> tending is the fuel contest's second chore. (2) The stems ship MATURE
> with two cuts open (`spiles: 2`), so `tap` draws without an auger/spile
> (rows only). (3) The stove house's vent is a ONE-WAY door onto the yard —
> the yard's only free direction (`west`) is the works floor's door.
> (4) The substation gains a CATWALK room above the cell: the cell's hazard
> fires on a crossing and the only way in was a teleport (no crossing).
> (5) The coach already authored `_materialPath` (oak) — nothing to do.
> (6) The rubberized coat is stocked at the general store (reachability),
> beside rubber boots and gloves; the gas bladder is rubberized cloth.
> (7) The scorched material is NAMED burnt rubber (a spellbook descriptor
> collision). (8) Doc pointers: thermal, biome, light, ground, fire, mould,
> glass; `content-packs.md`'s pack COUNT is left to the finalize sweep (it
> was already stale at "fifty-eight").

Implements D14, D15 (and the general-store and gas-bladder collisions).

Files: `terminus/…/goods-yards/rubber-works/**` (structure — storeys
only — zone, six rooms each authoring its own `enclosure`/`roof` per
D14, the oven `/trade/rubber/thing/oven` — an `Oven` row,
`burnTemperatureK: 430`, `bellowsMultiplier: 1.12` so the bellows is
how you scorch — five dairy `Mould` rows (one per shape, D10) and the coagulating pan, a
`stove` prop in the stove house, a stove in the works floor, the three
stems (one props line, `count: 3`), the raw-rubber lump's cast row, the
goods rows `/trade/rubber/thing/{rubber-boots, rubber-gloves, rubber-apron,
rubber-sheet, packing, hose}` — **one-piece `Garment`/`Tool` casts, no
bill, no `extends:`, `constructionForm: hide` on the three garments**
(D14) — and `rubberized-coat` (`extends:` tailoring's `coat`, material
`textile/rubberized-cloth` with rubber's tags); the terminal hall's glass
roof + the other five terminal rooms' brick and slate; the awning as a
lone place off the square (exit `east` from the square — cleanliness's
bathhouse takes `north`); the coach's `_materialPath`; the general
store's two stock lines; the gas bladder's material →
`rubberized-cloth`; deletion of the two cafeteria biome rows;
**`check-light-sources.ts`'s lists** (the terminal hall now reads skylit
through its roof — its row-side mirror and any `SKYLIT_INTERIORS` entry
agree); **root `package.json` (the `@saxonberg/content-trade-rubber`
importer) + `terminus/package.json` (the terminus → trade-rubber dep) +
`pnpm install`** (the lockfile is regenerated, never hand-edited);
`packages/wire/tests/rubber.dirty.wire.test.ts` (steps 1–22).
`trade-rubber/README.md`. Docs: `docs/subsystems/construction.md` (NEW —
the model's permanent home; thermal.md § The envelope, biome.md §
SkyExposedMixin, light.md § The sky, ground.md § onGrade each gain a
pointer paragraph), `docs/subsystems/rubber.md` (NEW), `glass.md` (the
grey `lightAbsorption` term beside `Tinted`'s colour), `fire.md` (`fire …
for <duration>`), `mould.md` (`holdsCast` + the firing seam),
`content-packs.md` (the pack count).

Acceptance: `lint:reachability` arm R zero (every new row reached by a
prop, a stock line, a recipe output or a `wins`); `lint:biome-sky`
falls by the terminal's six rooms and the awning (they now say) and
does not rise for the works' six (new rows that say from birth); **the
drive runs 22/22 against a freshly dropped world** (the exit
criterion), and it `query`s each visited place's `declared` and
structure; AC 5, 6, 12, 13, 15.

Commit: `feat(rubber): the works and its stove house in the goods yards; the drive's buildings placed; rubber on the shelf`

### W8 — stretch (first to cut)

> ✅ **BUILT, not cut** (the no-scope-splits rule: scope stays in, only
> order varies). Decided: (1) **the give is round the body** — the
> allowance takes up the GIRTH term of the misfit, both ways, and so the
> refusal distance too; a tall body is still short in the leg. (2) **Worn
> at a fraction of the spring-back strain** — `elasticity/100` at face
> value gave rubber a 500 % allowance (every body in one waist), so the
> allowance is `elasticity × textiles.fit.stretchWornFraction (0.04) ×
> form stretch`: rubber 0.2, knitted wool 0.017, linen 0.001. (3) **Form
> stretch is a FABRIC ROW field** (`stretch`, absent = 1; felted 0, knit
> 1.45), not a kernel list of form words — a pack must never need a kernel
> list edit. (4) **`wear` says how it sits** — "It is tight on you." /
> "It hangs loose on you." past 0.05 — because fit already costs (burden,
> seam wear, the air gap) and nothing said so; that line is what makes AC
> 14 observable. (5) The garment is `/trade/rubber/thing/elastic-trousers`
> (`extends:` the tailor's trousers, waist detail rubber), stocked beside
> a plain stock pair at the general store (8 and 10 — a newcomer's twenty
> buys both). The drive's body is a **half-orc** walked through intake
> (92 kg / 1.88 m: plain 0.09 tight, elastic 0.04).

Implements D16. Files: `lib/slot/Wearable.ts` (`fitOn` stretch term),
an elastic-waisted stock garment row in `trade-rubber` (or tailoring),
drive step 23, `Wearable.stretch.test.ts`. Acceptance: AC 14. Cut
cleanly: nothing in W0–W7 references it.

Commit: `feat(fit): a garment stretches by its material; an elastic waist serves a band of bodies`

---

## Reachability wiring

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| the sky from construction | none (`look`, `feel`, `measure light/temperature`, `analyze weather` exist) | — | each place's own `enclosure`/`roof`; a Structure row's `storeys` (relations only); exits as openings | none — a structure loads with its zone (`LocationZone.standUpAttached`; a memberless one by `lookOutFrom`), the cache recomputes when it stands; **no boot warming, no template search** | — |
| `fire … for 2 hours` | `fire`/`burn` (exists) | `BurnerMixin` default (exists) | the `for` arg | — | ⚠ the arg is `required: false`, `type: string`, `prepositions: [for]` — a required arg with no default fails closed and silent (instrumentation.md); test the bare `fire` still binds |
| the cure | `fire` | the oven is a `BurnerMixin` host in reach | one `vulcanize` recipe row (`RecipeCatalogue` warms `recipe` documents at boot — exists); dairy `Mould` rows per shape; `crosslinking` on raw-rubber | the pack's `recipes/` are installed like glass's | the chamber must hold raw rubber + sulfur + a mould; `mixed-charge` if two moulds — the drive puts one in |
| `tap` a Hevea | `tap` (forestry's) | `SapStandard.commandContributions.peers` (the class static — a row's `commandContributions:` is dead silently) — the stem row names that class | species `production`, window `weather` | none (species resolve by identity ref) | `yieldShape: volume` ⇒ a vessel is needed; the drive carries a cup |
| latex → lump | none (time) | — | `drainSetting` on the latex material + the coagulating-pan `Mould` row (D13.2) | materials warm by `MaterialCatalogue`'s infix; a mould row is a prop of the stove house | the pan is a dairy `Mould` (`Bulkable & Thermal & Container`) |
| dandelion → pulp → lump | `mill`/`grind` (trade-milling), `make` (platform) | millstones in reach; craft-resolve | two recipe rows; the crop's material tag `rubber-root` | — | `make` needs water in reach: a bulk slot `measureL: 5` |
| sulfur | `dig` (platform) | the quarry face | the band's `wins` | — | depth: the drive digs from the coal floor |
| rubber boots/gloves | `buy` | the store's counter | two `stockLines` | the store's sweep clones par | the names are two words — `buy "rubber boots"` quoting exists; keywords carry the phrase |
| `lint:biome-sky` | — | — | the ceiling list in the script | the derived roster | — |

Each of these is asserted by the drive as a state change, not a
non-refusal.

---

## Acceptance-criteria coverage

| AC | waves | proof |
|---|---|---|
| 1 every input obtainable | W6, W7 | drive 11–13; `latex.test`, the quarry test |
| 2 the cure's four outcomes describe themselves | W4, W7 | drive 14–17; `Crosslinking.test` |
| 3 nothing gates the attempt | W4 | no knowledge/epoch read in `FireController`; a test fires as a fresh character |
| 4 the stove house's temperature and the tap | W2, W3, W6, W7 | drive 7–10; `Atmospheric.solar.test`, `latex.test` |
| 5 rain: atrium/awning/coach/covered room dry; terrace/street wet | W1, W7 | drive 1–3, 5 |
| 6 light, sky view, wind, heat loss agree with construction | W1, W2 | drive 1, 2, 6; `Exposure.test` |
| 7 heat between rooms; interior wall loses nothing | W3 | drive 4; `Atmospheric.coupling.test` |
| 8 leather soaked shocks; rubber does not | W5 | drive 18; `wet-boots.test`, the substation integration test |
| 9 rubberized coat dry; wool wet | W5 | drive 19; `Attired.rain.test` |
| 10 rubber packing outlasts leather | W5 | drive 20; `Pumping.wear.test` |
| 11 vitriol eats linen, not rubber | W5 | drive 21 |
| 12 boots and gloves buyable | W7 | drive 22 |
| 13 every drive place answers from what it says it is made of and its structure (if any); the biome-sky count does not rise | W0, W7 | `lint:biome-sky`; the drive `query`s each visited place's `declared` and structure |
| 14 (cut-first) elastic fits | W8 | drive 23 |
| 15 a lone place is complete; a memberless structure still stands | W0, W7 | `Exposure.test` (lone hut, lone pen), `Structure.storeys.test` (the horizon route); the awning in the drive (a lone place, step 2) and `look horizon:tower` from the yard |

Nothing unmapped.

---

## Test & gate strategy

- **Unit (per wave, `pnpm test:near`):** `Exposure` over a fixture
  structure (the whole face rule in one file); the solar gym (prints a
  day); the coupling test with a ticking clock; the crosslink curve
  (prints the table — the number a reviewer reads); the four
  corrections each with a dry/wet or leather/rubber pair; the tap window
  at two temperatures; the quarry column.
- **Row tests in packs:** `trade-rubber/src/__tests__/` (latex, recipes,
  the works' rows resolve); `terminus` row test for the structure's
  storeys (every member room under a storey); `test-bootstrap` imported
  by anything touching the wired runtime.
- **Lints:** the family, with `lint:envelope` (f) and `lint:biome-sky`
  new; run `pnpm -C packages/server lint:family` at every wave.
- **The drive:** `packages/wire/tests/rubber.dirty.wire.test.ts`, run
  against a freshly dropped world (`WIRE_BOOT=1 WIRE_PORT=2014`) before
  the MR opens and after every review fix (⚠ *re-run the drive after
  every review fix*; ⚠ a checkpoint that accepts two outcomes proves
  neither).
- **Only the drive can prove:** the stove house's day (sun in, cold
  before dawn, stove opens the tap), the loft warming through the ladder,
  the terrace wet while the loft is dry, the glass roof's daylight on a
  real `measure light`, the general store selling boots, the gas bladder
  reading rubberized.
- **`pnpm test` at exactly two moments:** before the MR and at
  `/finalize`. Nothing in between.

---

## Risks & opens

1. ✅ **RESOLVED 2026-10-16 — the terminal hall** (user). ~~The cafeteria atrium does not exist.~~ The requirements name it
   in *Collisions* and drive step 1; the only rows are two orphan biome
   rows no location references, and the University has no dining room.
   The plan's answer (D14): the **terminal hall** is the glass-roofed
   room (a train shed; the terminal is already a Structure), and the two
   biome rows are deleted. **This is the user's call** — the
   alternatives are to author a cafeteria at the University (the
   University only teaches, but a cafeteria is not a trade venue) or to
   use the stove house for step 1 as well. Decide before W7.
2. ✅ **RESOLVED — default open, count the interiors (user,
   2026-10-16).** `SkyExposedBiome` does not retire this build; it
   decides only for interiors that have not yet authored `enclosure:` and
   `roof:` (~170, D14), and retires when `lint:biome-sky` reaches zero and
   both `Location` defaults flip to `none`. Outdoor rows are never debt.
3. ✅ **RESOLVED — keep the fourth row** (user took the lean). `rubber-scorched` (D9) — the requirements'
   curve has three materials and *scorched* as a worse grade that says
   so. A row is how it says so without a flag on every crafted thing. If
   the user prefers *grade only*, the branch collapses to `cured` at
   `poor` and the firing's narration carries the word.
4. **`wash` vs `make`** (D13.3) — the requirements say the roots are
   *milled and washed*; `wash` is a cleaning verb. The washing is a
   `make` recipe with water in reach. Wording only.
5. **The `weather` window reads the air** (D13.1) — a behaviour change
   for the birch, asserted unchanged by test; if the test disagrees on
   the equinox, the plan keeps the body read for `rising` rows and the
   air read otherwise, and says so.
6. ✅ **RESOLVED — no retag; vitriol's and quicklime's lists narrow instead** (D12.4, user). ~~The `organic` tag retag~~ — readers of the tag must be
   grepped; if `Combustible` or spoilage keys on it, rubber must still
   burn (it does, in life) and never spoil (it does not). The build
   records each reader's behaviour in the commit.
7. **Glass as an enclosure** — 4 mm glass conducts (k ≈ 1) so the stove
   house's `U` is film-dominated (≈ 5.7 W/m²K): it leaks hard, which is
   true of a glasshouse and is why it freezes before dawn. The risk is
   the other way: with `activeDepth` 0.01 m of glass the skin capacity is
   tiny and the house swings fast — honest, and the drive's clock steps
   must be sized to it (the solar gym prints the curve first).
8. **The drive and the weather** — no verb sets the weather; the clock
   loop (D15) may take many segments to find rain in a dry stretch. The
   loop is bounded and fails loudly. If it proves flaky, the honest
   fallback is a drive-only Locality with a `_weatherPin` (the weeping
   chamber's shape) for the rain steps — recorded here so it is not
   invented silently.
9. **Cache staleness in `exposure()`** — a structure standing up after
   its rooms; the recompute-on-identity-change rule covers it, but a
   room read in the gap gets the no-structure answer once (every face
   exterior — which is the lone-place answer, so nothing is wrong, only
   one read early). Pinned by a test that reads before and after the
   singleton stands.
10. **TS inference depth** — `Enclosed.ts` records that one more mixin
    layer on `Location` blew the chain. The plan adds no layer: `roof`
    and `exposure()` ride `AtmosphericMixin`, and `Structure`'s fields
    are plain.
11. **The import graph** — `Atmospheric.ts` reaching `NavigationApi`
    (`api/navigation` → `NavigationLogic` → the registry) may cycle;
    `LocationZone.ts` already uses a dynamic import for exactly this.
    The build follows it and records the cycle or its absence.
12. **`lint:lib-statics` is a ratchet** — the two value objects must be
    instance-shaped (`new Exposure(...)`, `Crosslinking.parse(spec).
    outcome(...)` with `parse` being the one static the pattern allows,
    or a constructor). If the ratchet trips, the answer is to restructure,
    never to raise it.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **`SkyExposedBiome`/`SkyExposedMixin` retirement at `lint:biome-sky` =
  0; the pass that gives every remaining place a `roof:` line** →
  biome-normalization-slate (job 2's tail).
- **Detecting a shared wall between two members with no exit between
  them** (a solid party wall) → structures-slate; the engine has no room
  geometry, and *who is next door through an exit* is the stated
  abstraction.
- **Air mixing between rooms of one building; the flue as an object;
  fire spread through storeys** → structures-slate.
- **Sun direction; a south-facing glass face** → biome-normalization-slate
  (the `w_wall` weight is where azimuth would enter: one face weight
  becomes four).
- **A partition spec distinct from the walls** (an interior stud wall in
  a stone building) → structures-slate; today the party wall is the
  place's own wall, and the exit's boundary state decides conduction vs
  flow (D7).
- **Glazing as pane objects on a construction face; hail** → glass-slate.
- **A woodland canopy as a roof of leaves** → forestry (rows only, once
  `roof:` exists).
- **Per-channel absorption on faces (a stained roof colouring a hall)** →
  glass-slate; the grey term is the seam.
- **The stove house's stoker and vent brain; standing instructions** →
  standing-instructions-slate (the fuel contest's sixth claimant is
  content, not code).
- **Synthetic rubber, plastics, tyres** → destructive-distillation-slate,
  drilling-slate (the `CrosslinkSpec` is the seam: a second polymer is a
  spec on a second feedstock).
- **A `cure` discovery loop / the published curve** → inquiry-slate.
- **Compression moulding** (a load on the rubber charge in its mould), a
  failed cure pour, consumed moulds, the *cure* set process for plaster →
  moulding build (`moulding-slate`, on the repair branch until repair
  merges: `origin/reqs/repair:docs/slates/builds/moulding-slate.md`; the
  seam's code comment cites that path and is re-pointed at repair's
  merge). Rubber's seam (D10) is the call site those extend; the latex
  drain (D13.2) is already on the shipped set hook and needs nothing.
- **A pressed coagulating pan** (a stone on the setting latex) — the
  platform `Mould` composes no `PlacingMixin`; a pressing pan is a pack
  class like dairy's `Hoop` → moulding build.
- **A cup of latex that sours and sets on its own** — the drain set runs
  only in a mould; a set process for a plain vessel is moulding's.
- **Radiation to a clear night sky** (ice in pans on clear nights; a
  hothouse losing heat faster under stars than under cloud) →
  weather-slate. ⭐ The attach point is this build's: an exterior top face
  with `skyVisible()` gains a radiative loss term weighted by the cloud
  dim — the same face, a third heat path beside conduction and solar
  gain. build-4 defers its pan ice to the same slate.
- **A building's bill of goods** — **upkeep → repair W7** (its own MR,
  after rubber, reading D1a's layers); **erection** paid in RGO outputs →
  structures-slate. The seam
  is D1a: each place owns its layers, a structure sums its members, and
  each layer's material × face area × thickness is a line of the bill;
  settling and rot are upkeep on a layer. Who erects, who pays and what decays is an economic design of
  its own (assembly-shaped).

---

## Critical files

Read first, in this order:

1. `docs/requirements/rubber-requirements.md`
2. `lib/biome/Atmospheric.ts` (the envelope: `:1042-1110`, `:1130-1260`,
   `:1340-1440`) and `lib/spatial/Enclosed.ts`
3. `platform/idea/api/BiomeLogic.ts` (`:700-746`, `:977-1035`,
   `:1172-1240`) and `api/biome.ts`
4. `platform/idea/Structure.ts`, `platform/idea/LocationGraphRegistry.ts:425-450`,
   `lib/zone/LocationZone.ts:55-130`, `platform/idea/api/NavigationLogic.ts:300-330`
5. `lib/boundary/ExitableVessel.ts:175-240`
6. `lib/perception/AmbientLit.ts:325-375`, `platform/idea/modalities/VisionModality.ts:339-460`
7. `platform/idea/api/WeatherLogic.ts:755-800, 900-915, 1315-1375, 1395-1430`
8. `lib/ground/Floor.ts:390-410, 680-700`, `lib/husbandry/Soil.ts:505-520`
9. `platform/idea/cmd/device/FireController.ts`, `lib/craft/Recipe.ts`,
   `lib/thermal/ThermalDose.ts`, `lib/material/Material.ts`, `lib/material/Alloyed.ts`
10. `platform/idea/api/ElectricityLogic.ts:225-445`, `platform/idea/api/MaterialLogic.ts:878-900`
11. `lib/slot/Attired.ts:570-670`, `lib/slot/Wearable.ts`, `lib/wetness/Wet.ts`
12. `lib/pump/Pumping.ts:100-120, 400-445`
13. `platform/idea/species/Species.ts:430-545`, `lib/husbandry/Producing.ts:340-452`,
    `packages/content/trade-forestry/…/acer/saccharum.yaml`, `…/thing/plant/maple-standard.yaml`
14. `packages/content/rejection/…/idea/deposit/quarry-hill.yaml`, `packages/content/ground/src/idea/Deposit.ts:56-86`
15. `packages/content/trade-glass/{pack.yaml, package.json, src/lib/Tinted.ts, content/recipes/glass-batch.yaml}`
16. `packages/content/terminus/content/world/terminus/{terminal/structure.yaml, goods-yards/oilworks.yaml, goods-yards/oilworks/location/floor.yaml, general-store/counter.yaml}`
17. `packages/server/scripts/{check-envelope.ts, check-light-sources.ts, check-biome.ts}`
18. `packages/wire/tests/assembly.dirty.wire.test.ts`, `packages/wire/src/harness/index.ts`
19. `docs/subsystems/{thermal, biome, weather, light, taps, electricity, textiles, embodiment, pump, crafting, content-packs}.md`, `docs/testing.md § Two tiers`

---

## Drive record

*(appended at build time — the output of `packages/wire/tests/
rubber.dirty.wire.test.ts` against a freshly dropped world, run count,
and what each run found.)*

Each run is `reset:db` → a fresh world on 2014 → the whole file. What the
runs found, in the order they found it (✔ = fixed and committed):

| run | finding | fix |
|---|---|---|
| 1–3 | the harness's own grammar: `put` takes from the hand into a peer; `stoke <fuel> into <burner>`; quoted MQL args break, so one-word keywords (`boot-mould`, `raw-rubber`); `get boots from boot-mould` binds the mould too | ✔ the drive |
| 1–3 | a founder `clone --into <handle>` falls back to the founder, and the clone gate reads the FIRST live instance's zone — once a lump is in a player's hands every later clone is refused | ✔ clone `--here` then `get`; all stock cloned up front; anything already live is BOUGHT |
| 4 | an under-cured boot read exactly like a good one (the boot row's prose is authored for the good cure) | ✔ `FireController`: an off-cure cast appends *"It is \<appearance\>."* |
| 5 | ⭐ the Hevea read its OWN 290 kg body, not the house: a planted tree stands in its pot's SLOT, and `windowAirK` only walked `getContainer()` | ✔ `windowAirK` steps out through `getOccupiedHost()` |
| 5 | cloned raw rubber came out at a `Casting`'s pour heat — it scalded the hand and would not move | ✔ the four cast rows stamp 290 K |
| 6 | killed by Claude Code: the machine ran out of memory (four worktrees' servers) | — |
| 7 | ⭐ the tree read the LAST integrated envelope (`getOwnTemperatureK`), so it tapped in a house its own thermometer called 284 K | ✔ `windowAirK` reads `envelopeTemperatureSync()` |
| 7 | a stem with every cut open and an empty pail answered *"will not take another spile at this girth"* | ✔ `SapStandard`: *"Nothing has run into it yet"* (the girth lesson kept for a player holding a spile) |
| 7 | the tap window is SAMPLED AT THE READ (taps.md's stated abstraction): a ten-hour wait outlasted the stove's coal and billed the whole wait as shut | ✔ the drive taps while the stove burns |
| 7 | a firing never said what heat it held, which is the input the cure turns on | ✔ *"settle in to hold it at about 430 K"* |
| 7 | step 18's rubber boots were cloned — refused (step 22's pair is live); dressing is engaged and `down` straight after it walked in barefoot | ✔ bought; dressing waited out |
| 7 | the rain hook (ten logins) ran out of its 15 minutes on a loaded machine | ✔ 30 minutes |
| 8 | a newcomer's Arrival Note does not cover a counter price on its own (*"You can't cover …"*) — economic-bootstrap's shape, not rubber's | ✔ step 23 banks and funds the half-orc |
| 8 | ✅ steps 16 (ebonite) and 17 (burnt) pass; the oven says *"about 430 K"* | — |
| 8 | ⭐⭐ **two readers of one room disagreed**: the thermometer (`resolveTemperatureFor`) refreshes the room's OUTSIDE temperature before integrating; the envelope's sync read integrates against the outside it last fetched. A tree asked at dawn, after a night nobody measured, used the afternoon's outside air — 283 K on the thermometer, open to the tree | ✔ `Producing.bringTapAirCurrent()`, awaited by `planTap` before the window is read |
| 8 | step 15 read the WRONG boots: `get` has no `from` — its tail is one greedy object list — so `get boots from boot-mould` also lifted step 14's pair off the floor | ✔ the drive names insides with MQL (`here:boot-mould:i:boots`) |
| 8 | by early afternoon the sun AND the stove take the glass past 309 K, where Hevea shuts down in the heat — honest, and the step tapped into it | ✔ step 9 lights the stove at dawn |
| 8 | intake shoes every newcomer in canvas shoes, so `wear boots` found the feet taken | ✔ the waders take them off first |
| 8 | the machine is swapping (3.5 of 4 GB, three ~3 GB worlds from sibling worktrees): logins and dispatches stall for minutes | the drive's per-step budgets are 10 minutes; recorded, not a code defect |
| 9 | `here:oven:i:…` named nothing: a bareword after `here` is a DETAIL of the room; the room's THINGS are `here:i` | ✔ `here:i:<thing>:i:<thing>` (probed live: `here:i:tub:i` lists the three trees) |
| 9 | an embodied character is called by its NAME — `reserve override … to <handle>` found nobody | ✔ the half-orc is named and funded by name |
| 9 | from a ~270 K dawn the stove alone holds the glass at 286 K after two hours | ✔ step 9 warms four hours, the morning sun joining |
| 9 | ⭐ the window still opened at 273 K once; probed live it reads right — but the read had a hole: every rung tested `!== null`, and a proxy no-op answers `undefined`, which compares false against both bounds and reads OPEN | ✔ only a finite number is a temperature; a failed refresh now says so in the log |
| 10 | ✅ **all four cures pass** — under-cured, cured in the boot's shape, ebonite, burnt (steps 14–17) | — |
| 10 | a novice's thermometer is a seeded guess within its bracket (±1 to ±8 K seen): a dawn house AT the tree's 291 K line decides nothing | ✔ step 8 asserts only when the whole bracket is on one side, and says when it is not |
| 10 | four hours of stove and morning sun took the glass to 312 K, past the tree's 309 | ✔ three hours |
| 10 | in the substation's dark `inventory` names everything "something" | ✔ the waders dress in the lit shop |
| 10 | a counter takes the account, not loose coin: the half-orc's twenty must be banked first (`bank deposit coins`) | ✔ step 23 walks the newcomer's real path |

