# From rubber (build-1) to cleanliness (build-2), repair (build-3) and storage-and-ice (build-4)

2026-10-17. All four builds start in parallel from master. The user has
declined a shared-foundation MR, so **"whichever lands first" is
retired**:
- every shared piece now has **one named owner**;
- a build that needs the piece before its owner merges writes a local
  copy to the owner's published signature, marked
  `// DROP AT MERGE — owned by <build>`, and deletes it when it merges.

The full owner table and conflict map are at the end of this note,
**§ Parallel builds — owners, merge order, conflict map** (moved here
from rubber's plan when the plan retired at rubber's sweep). The rest of
this note is each build's share of it. Rubber's DECISIONS live in
[construction.md](../subsystems/construction.md) and
[rubber.md](../subsystems/rubber.md), and the build's record is MR !379.

## Merge order (owner decision, 2026-10-17): storage-and-ice and repair W0–W6 (either order) → rubber → cleanliness; repair W7 after rubber, as its own MR

- Rubber consumes ice's wet law, `immerse` and heat protocol.
- Repair W7 and cleanliness need rubber's `roof:` field, `exposure()`
  and `lint:biome-sky`. Cleanliness's rows author `roof:`, which fails
  `lint:envelope` until rubber has landed.
- Each build, when its turn comes, merges master in, resolves, re-counts
  the shared ratchets and regenerates the goldens.

## Owners (everyone)

| piece | owner |
|---|---|
| `Material.permeability()` and `wetProperty(dry, fluid, saturation)`; setting `wetness.impermeableBelowPct` (2); cloth's `k_void` migration in `Wearable.getClo` | **ice** |
| `Attired.immerse(parts?)` | **ice** |
| the envelope heat formula: `RoomHeatExchange {fixedW, conductanceWperK, anchorK}`, `envelopeSteadyStateK` | **ice** |
| the ice material's move to `/stuff/idea/material/bulk/ice` | **ice** |
| `enclosure:`/`roof:` on places (layered, `'none'` legal for both, getters return the RAW authored form); `Structure.storeys`; `exposure()`; `lint:biome-sky` and its ceiling list | **rubber** |
| `/stuff/idea/material/ceramic/brick`, `/stuff/idea/material/textile/canvas`, `/stuff/idea/material/mineral/sulfur` | **rubber** |
| `Attired.exposeToRain` (rain on the outermost layer, each distinct garment wetted once by its covered share) | **rubber** |
| one per-face transmission method on `Exposure`, which sky light and solar gain both call | **rubber** |
| `/trade/rubber/thing/{rubber-boots, rubber-gloves, rubber-apron}`: one-piece casts with no bill and a covering construction form | **rubber** |

Every other shared piece is "keep both". The conflict map lists them.

---

## To storage-and-ice (build-4) — you merge FIRST

1. **You own the wet law, `immerse`, the heat protocol and the ice
   move outright.** Nobody else mints `wetness.impermeableBelowPct` or
   touches `getClo`. Rubber writes a DROP-AT-MERGE copy only of what its
   W5 needs before you merge.
2. **Please give `immerse` an optional part filter, `immerse(parts?:
   (partKey: string) => boolean)`, that limits the body's wetting as
   well as the layers' to those parts.**
   - Rubber's flooded substation calls it for the feet: wading, not
     swimming.
   - With no argument it behaves exactly as your plan says.
3. **Rubber builds its solar gain and room-to-room heat as terms in your
   `RoomHeatExchange` protocol:**
   - solar gain is a `fixedW` per segment;
   - each interior face is `{conductanceWperK, anchorK: neighbour's last
     temperature}`.
   
   Keep the protocol's names as your plan states them. When rubber
   merges after you, it folds its terms into `envelopeSteadyStateK`.
   Your store sees the same room temperature the room reconciles to.
4. ⚠ **Rubber's census counts your four icehouse interiors.** It counts
   interiors (non-sky biome) that lack either `enclosure:` or `roof:`.
   - `icehouse-platform`, `icehouse-house`, `small-house` and `shed`
     author `enclosure:` only. **Author `roof:` on each** (opaque, e.g.
     thatch or slate; the icehouse roof is honestly thick).
   - **Your outdoor hollow-mere rows** (`shore`, `pool`, `far-bank`,
     `road`) name no `_biomePath`. Give them
     `/stuff/idea/biome/outdoor/baseline` like every shipped outdoor
     row. Unauthored, they read as interiors and also fail the
     snow/rain/sky reads your IceSheet needs.
5. **Your icehouse Structure's extent.** Membership is the extent prefix.
   With flat siblings under `…/hollow-mere/location/`, an extent of
   `…/location` pulls in the shed (your empty control), the small house
   and the pool. Nest the icehouse's rooms under their own prefix (e.g.
   `…/location/icehouse/{platform, house}`), or keep the icehouse a lone
   place.
   - ⚠ Once rubber lands, a house that is a member with an interior face
     to the platform couples heat to it. The lone shed doesn't. Your
     *"house reads colder than the same room without stock"* comparison
     then differs by construction as well as by stock. Compare like with
     like.
6. **The shared wall between platform and house.** Rubber's room-to-room
   conductance through a shut door is now symmetric (the same U from
   both sides), so the platform really does borrow the house's cold
   through it.
7. **The ice material's light absorption** is a one-line edit rubber
   makes at its merge, on your moved row. Rubber won't touch the
   bottling row.
8. **The Alloyed split (your W0).** If it reaches
   `FireController.ts:325–362` (the alloy merge), keep that block's
   shape. Rubber's cure branch and its mould seam sit right there.
9. **Your `Casting` cast fallback.** Rubber's raw-rubber, rubber,
   ebonite and rubber-scorched rows will author their own
   `castTemplate`, so they never fall to `/stuff/thing/Casting`.
10. **Floor.** Rubber reroutes snow cover on a floor through
    `exposure().rainReaches()`. Your IceSheet snow override should stay
    self-contained, not call the base gate.

## To repair (build-3) — W0–W6 merge FIRST (beside ice); W7 after rubber, its own MR

✅ Rubber accepted all six of your asks — § Parallel builds › *Accepted from repair* (below).

1. **W7's contract with rubber is current, with three updates:**
   - `'none'` is legal for **both** `enclosure:` and `roof:`.
   - The getters return the **raw authored form** (spec · list ·
     `'none'` · `null`).
   - `Exposure.walls[]` includes interior faces with `exterior: false`,
     and wall area = Σ exterior wall faces.
   - Read the raw getters, never `resolveEnclosure()`, for layers.
2. ⚠ **An exit is now an open side only when the place across it is
   outside.** A doorless exit to another enclosed room (the dorm
   corridor) is no longer a missing wall. Your per-room wall area is
   right again.
3. **Brick and canvas are rubber's rows**, at
   `/stuff/idea/material/ceramic/brick` and
   `/stuff/idea/material/textile/canvas`, in base-library. Add
   `weatheringDays`/`laying` to them after rubber lands. Your `thatch`
   and `lime-plaster` belong in **base-library** with every other
   material, not generic-objects.
4. ⚠ **W7 must edit `packages/server/scripts/check-biome-sky.ts`.**
   - Rubber's lint fails when a listed row has since authored both keys.
   - D27 authors both on the dorm and Seznick rooms, so W7 deletes those
     lines from the ceiling list.
   - Add the script to W7's file list.
5. ⚠ **D27 "steps likewise".** Duncan Hall's `steps.yaml` is an outdoor
   room (`outdoor/baseline`, its light follows the sun). A slate roof
   would make it dry and dark. Leave it open.
   - Hinkley's `lots/yard.yaml` is outdoor too.
   - The shared `/stuff/location/room/{living, bedroom, bathroom}` rows
     feed every programme. Authoring layers there changes Seznick's
     bathroom as well.
   - `cistern.yaml` is the drown-here proof room. Check its tests if it
     gains an enclosure.
6. **Rubber's goods are one-piece casts.** Rubber boots, gloves and apron
   don't `extend` leather-boots and carry no bill. So you mend them by
   your monolith path, under the boot-mould's `castDiscipline`
   (chemistry), and a moulded boot is never mended as stitched leather.
   - They are the first real content consumers of `castDiscipline`, so
     your "no shipped cast composes Crafted except the Wheel" no longer
     holds once rubber lands.
   - Rubber's cure grade is applied after `castInto` (weakest link), so
     it composes with your `carryPayload` line.
7. **Same-tag donors.** Rubber keeps the `organic` tag, so leather or oak
   could mend a rubber good under your soft-goods donor rule. A patch of
   raw rubber is the honest mend, and it's in neither plan. Record it as
   your seam.
8. **Moulds as things to mend.** Rubber's five moulds and its coagulating
   pan will state their material (iron for the moulds, so your metal path
   applies).
9. **Shared files.** `Mould.ts` (rubber changes `holdsCast`, you change
   `carryPayload`: separate hunks), the general-store counter (keep all
   lines), `terminus/package.json` (you need `trade-forestry`; it isn't a
   dependency today, so add it), the lockfile (re-run `pnpm install`), and
   the field-meta golden and wiki-spoiler snapshot (regenerate).
10. **`moulding-slate.md` lives only on your branch.** Rubber's mould seam
    cites it by branch path until you merge; fix the citation at your
    merge.

## To cleanliness (build-2) — you merge after rubber

✅ Rubber accepted all 13 of your asks — see § Parallel builds › *Accepted from cleanliness* (below).

1. **Your note to rubber is accepted.**
   - Rain on the outer layer is rubber's `exposeToRain`.
   - Sulfur's burn product goes on rubber's row: you add
     `combustionProducts`. Rubber authors `heatOfCombustion` (~9.3 MJ/kg)
     and `autoignitionTemperature` (~505 K) so `stoke … with sulfur`
     isn't refused as not-fuel.
   - Rubber exposes **one** per-face transmission method on `Exposure`
     for your grime.
   - Rubber's gloves, boots and apron have a covering construction form
     so caustic delivery sees them, at
     `/trade/rubber/thing/{rubber-gloves, rubber-boots, rubber-apron}`.
2. ⚠ **Stale rubber shapes in your docs:**
   - `lint:unhoused` is gone. It is now **`lint:biome-sky`**, counting
     *interiors* that lack `enclosure:` **or** `roof:`.
   - A walled room does **not** have to stand in a building. A lone place
     with its own walls and roof is complete; a Structure is relations
     only (members, storeys).
   - Your requirements § Collisions and CR:67/239–241 need that change.
3. ⚠ **The lavoir (your D27) gets three things wrong:**
   - `enclosure: none` **is** legal; the lint only counts rows *lacking*
     a key. Rubber's own awning is `enclosure: none` with a canvas roof.
   - Layers are objects, outermost first: `[{material, thicknessM}]`,
     never words like `stone piers`.
   - There is no `stone` material. Use `rock/granite` or `rock/limestone`.
   
   The drying ground needs a sky `_biomePath`, or `enclosure: none` +
   `roof: none`.
4. **D21 must read `exposure().skyLightFraction()`, not
   `BiomeApi.isSkyExposed`.** After rubber lands, the biome walk is the
   legacy answer only for interiors that haven't declared their
   construction.
5. **Two caustic tables.**
   - `Material.corrosiveTo` (rubber narrows `organic` out of vitriol's
     and quicklime's lists, into honest tags) and your
     `Cleanser.damages` state one chemistry twice and can disagree.
     Derive one from the other, or test that they agree.
   - Your new lye `corrosiveTo` must use rubber's honest tags, never
     `organic` or `elastomer`.
   - Vitriol has no `vitriol` tag today. Your edit to add one sits on the
     line next to rubber's `corrosiveTo` edit: keep both.
6. **`textile/rubberized-cloth`** carries rubber's tags, not linen's
   `cellulose`, so neither the narrowed vitriol list nor your vitriol
   cleanser eats the coat.
7. **Intended interactions, not bugs:**
   - Narrowing the Wet far-past guard to bodies makes worn garments
     **dry** across rubber's 6-hour drive steps. Rubber's drive asserts
     wetness within the step where it rains.
   - Washed leather boots will conduct in the brine cell.
   - Rubber's stretch allowance (elasticity × loft) absorbs your wool
     shrink, so a shrunk jumper may still fit. Your shrink AC should
     use linen.
   - Your Flued oven and hearth soot applies to rubber's works oven and
     its two stoves.
8. **Heat between rooms.** Your bathhouse (vestibule, baths, gym) and
   chandlery are lone places, so their hearths warm only their own room.
   If you want the baths' hearth to warm the vestibule, author a
   Structure row (relations only) naming them.
9. **Fixed positions in shared rows:**
   - `market/square.yaml`: rubber's awning takes **`east`**; take
     **`north`** for the bathhouse.
   - `quarry-hill.yaml`: rubber puts coal −9…−10, **sulfur −10…−10.4**,
     halite −10.4…−12. Your chalk and fuller's earth go above coal and
     must not move coal or anything below −10.
   - `general-store/counter.yaml`: append your lines and keep everyone's.
   - `terminus/package.json`: you add `trade-fuel`, rubber adds
     `trade-rubber`. Re-run `pnpm install` for the lockfile.
10. **Shared ratchets.** At your merge, re-count `lint:biome-sky` (your
    lavoir, bathhouse and laundress rooms author both keys or carry a
    sky biome), `PURE_REPEAT_CEILING` (use `count:`/`as:` for the
    washboards, lines and tubs), `lint:lib-statics` and
    `CLOSED_VOCABULARY_CEILING`. Also regenerate the field-meta golden
    and the wiki-spoiler snapshot.
11. **"Cure" now has four meanings:** food curing, rubber's vulcanising
    cure, your soap cure by seasoning, and moulding's set process. Name
    yours explicitly in docs.

---

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
