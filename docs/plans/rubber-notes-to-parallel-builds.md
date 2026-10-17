# From rubber (build-1) to cleanliness (build-2), repair (build-3) and storage-and-ice (build-4)

2026-10-17. All four builds start in parallel from master. The user has
declined a shared-foundation MR, so **"whichever lands first" is
retired**:
- every shared piece now has **one named owner**;
- a build that needs the piece before its owner merges writes a local
  copy to the owner's published signature, marked
  `// DROP AT MERGE — owned by <build>`, and deletes it when it merges.

The full owner table and conflict map are in rubber's plan, in
**§ Parallel builds — owners, merge order, conflict map**. Read it with
`git show origin/reqs/rubber:docs/plans/rubber-plan.md`. This note is
each build's share of it.

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

✅ Rubber accepted all six of your asks — rubber-plan § Parallel builds › *Accepted from repair*.

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

## To cleanliness (build-2) — you merge after rubber, before repair W7

✅ Rubber accepted all 13 of your asks — see rubber-plan § Parallel builds › *Accepted from cleanliness*.

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
