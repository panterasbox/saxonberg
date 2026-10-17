# From cleanliness (build-2) to rubber, repair and storage-and-ice — 2026-10-17

Supersedes `cleanliness-note-to-rubber-and-ice.md`. The four builds start
together and land one at a time in an order nobody can promise
(cleanliness probably last — but every shared piece below works whichever
lands first). The full per-file table, the shared contracts and the
per-wave re-check list are in our plan: `git show
origin/reqs/cleanliness:docs/plans/cleanliness-plan.md` § *Parallel builds*.
This note is only what we ask of each of you, and what we took from you.

**The merge rule (same as yours):** the build that lands second merges
`origin/master` first, resolves each shared file by hand as the table
says, **regenerates** generated artifacts rather than merging them
(`lint:field-meta --snapshot`, the wiki-spoiler `.snap` with every
build's review-log entry kept, `pnpm install` for the lock,
`./tools/slate-index`), recomputes numeric ceilings on the merged tree
(never summed, never raised), and re-runs the named tests and drives.

## What we took from you (already in our plan)

- **Repair:** `Lantern.ts` is gone → Soilable on `Lamp`, the soot in
  `Lamp.getEmittedFlux` (glazed share only); the service seam is yours —
  `CraftingApi.fulfillingHand(giver, venue, discipline?)` with the
  discipline read off the Tariff row (`serviceDisciplines: {wash:
  textiles}`), `Tariff.quoteFor(lines)`, `collectMinor`, one collector,
  one durative helper, one refusal constant; Soilable/Labelled composed
  OUTERMOST on your recomposed `Chair`/`Garment`; `seasonPhrase()` added
  to your `Timber` chain; bleach rot and vitriol burns call
  `wear(dose, 'corrosion')`; the dead Flued `wear()` deleted; the survey
  block order holding → fabric → floor; `retail.md`/`employment.md`
  extend your section; the bank exit is a named `lavoir`.
- **Storage-and-ice:** sweep never touches a `Sawdust` good (strew
  consumes it; the `sawdust` and `shavings` DirtKinds are dropped,
  `crumbs` got a producer); `takesSoil() = !supportIsSlotted()` keeps mud
  off a water surface and an ice sheet; `cleaningMethod` is an exhaustive
  `Record<GroundKind, …>` with `ice`; `soilAugmenter` runs after
  `snowAugmenter`; our fixture-state slice skips any fixture that is
  itself Persistable (the sheet's log is safe); `immerse(parts?)`; the
  cookhouse files are disjoint; `bathe` in a pool goes through your
  support state, never `immerse()` directly; `Tub = Bulkable(Thermal(Chair))`.
- **Rubber:** construction in your exact shape (`enclosure: none` is
  legal; a layer is `{material, thicknessM}`; pre-rubber one layer per
  key, converted at your merge); the drying ground authors a sky biome;
  the bathhouse takes `north` off the square (your awning `east`); the
  quarry bands split nothing and stay above −10; the Cleanser `vitriol`
  uses `agent: acid` and `burns`/`rots` derive from `corrosiveTo`, so
  your narrowing can never disagree with a wash; lye's `corrosiveTo`
  never lists `organic`/`textile`; the urine tub lives in a shut room
  until ventilation is confirmed; the airing feature-detects
  `exposure()`.

## To rubber (build-1)

1. **`onGrade`.** Keep floor MATERIAL resolution (rung 3 ground-beneath,
   rung 4 `floorDefaults`) on today's answer, or prove the ground kind
   byte-identical for every structure member — as written, the
   terminal's six rooms and every `Ship` cabin (one implicit storey) flip
   from boards to earth, which changes our `cleaningMethod` and
   `soilFeetOf`. We pin the drive floors' kinds after your merge either way.
2. **`ambientSource: sky`.** Say in D4/W1 that an AUTHORED `ambientSource`
   rung is NOT multiplied by `skyLightFraction()` — 19 window-lit
   interiors (the Hinkley kitchen, the cookhouse, the byre, Duncan Hall)
   would otherwise go dark and our drive steps 12, 16, 17 lose their light.
   And whether open sides (`wallsNone`) count as transmitting faces for
   an awning's or a lavoir's daylight.
3. **Ventilation.** `airChangesPerHour` = ∞ (or the outdoor answer) when
   `exposure().wallsNone` — an awning or a lavoir must not hold gas like
   a shut room. Until then our ammonia tub sits in a shut back room.
4. **One face-transmittance METHOD** (`Face.transmittance()` or
   `Exposure.faceTransmittance(face)`) that both `skyLightFraction()` and
   the solar-gain sum read — we defer grime on construction glass to it;
   the stove house (a sooty stove under a glass roof → less gain → colder
   → the latex tap closes) is its first consumer.
5. **Sulfur.** We author `combustionProducts` + `heatOfCombustion 9.2`
   + `autoignitionTemperature 505` on your `mineral/sulfur` row (without
   `heatOfCombustion > 0` `stoke` refuses it, `Burner.ts:868`); make the
   won row `class: /platform/thing/Firewood` (coal's shape) so it stokes;
   test that vulcanize/scorch never reach 505 K.
6. **Stretch (D16).** Read the construction form — `felted` (and any
   boiled/fulled form) contributes ~zero stretch — else a felted, shrunk
   wool jumper still fits and our drive 8 has no consequence.
7. **Fix the wet-law contradiction** (D12.1 vs W5's file list and the
   host-placement row still naming `MaterialLogic`): one home,
   `Material.permeability()` / `wetProperty()`.
8. **Strike `consumed?` on `RecipeInputSlot`** from your host table (your
   D10 dropped it) — we add `Recipe.soils` to the same file.
9. **Re-grep `BiomeApi.isSkyExposed` callers at merge time**: if we land
   first, `Soilable.reconcileAiring` has one, marked `// rubber: migrate`.
10. **Keep `roof` authored-only and `_exposure` transient** (never
    `runtimeState`): our `PersistentCartesianLocation` round-trips every
    runtimeState field of a venue room.
11. **Your drive after ours lands:** the oven and the stove-house stove
    gain flues that soot and can catch (`fire.flue.ignitesAtKg` 0.5);
    check `flueSoot` across your cures and stoked nights, or sweep it.
12. **`stampTheHand`** now applies `TapSpec.soils`; author nothing on the
    Hevea row unless you want latex on the hands. No rubber code change.
13. Regenerate `field-meta-golden.json` (your plan never names it) and
    add a wiki-spoiler review-log entry for `crosslinking`.

## To repair (build-3)

1. **`fulfillingHand` restricts candidates to the tariff's own house**
   (`presentFulfillers` collects every fulfilling employee of any house in
   the room; the lavoir and the bathhouse are two-house rooms).
2. **Expose the house account and a pay check on `PricedOffer`**:
   `houseAccount()` (the self-first walk `collect` already does) and
   `canSettle(charge)` — our `indemnify` pays from the same account, and
   both arms check the customer can pay BEFORE acting (pay-after-perform
   gives a free mend, or a free wash plus an indemnity).
3. **Name the loss before consent** in the repair quote (*reforging will
   cost it its name*) — the same consent rule our laundress's quote follows.
4. **W7 D27:** exclude `lots/yard` (outdoors) from the Hinkley
   enclosure/roof authoring; rebase on our `kitchen.yaml` Window (and its
   dropped `ambientSource: sky`) if we landed first.
5. **W7 `Material.ts` / `wood/oak.yaml`:** expect our `ashFraction`,
   `combustionProducts`, `flammableLimit`, `vapourLPerLPerHour`; union.
   ⚠ `wood/ash.yaml` is the TREE; our residue is `organic/ash.yaml`.
6. **W7 `SurveyController`:** put `fabricReport` lines after the holding
   line and before our floor line; the digit regex covers both.
7. Optional: a spread form of `wear()` on `AssembledMixin` for chemistry
   that soaks every line of one fibre; otherwise we document the
   single-line limit.
8. Cobbler shop: consider `PersistentCartesianLocation` once we land
   (its traffic-soiled floor survives a restart); author `enclosure:` +
   `roof:`. Your call.

## To storage-and-ice (build-4)

1. **The frozen gate becomes ONE shore method**: we add
   `ShoreMixin.drawAt(key, room): {draw} | {refusal: 'frozen', line}` and
   `WaterRead.underIce?: WaterDraw` (274 K, the reach's hardness; built in
   your read builder's `frozen ? … : …` expression). Fishing's `reachFor`
   is refactored onto it by whoever lands second; a frozen read's `draw`
   is null, so a copied gate passes and then finds no water to wash in.
2. **Expose the immersion fold as a body method**,
   `ThermalRegulation.exchangeWithWater(waterK, dtS)`, used by
   `effectiveAmbient` — our tub and shore `bathe` call it once per
   `BATHE_S`, so a river bathe chills by the law a pool swim does (no
   second formula). We add it beside your fold in your arithmetic if you
   have not.
3. **Keep `immerse(parts?)` side-effect-only (wet)**; our rinse line goes
   INSIDE it (climbing out of a river rinses mud and sweat; grease and a
   set stain stay).
4. **W10 drive:** read the dug-out sawdust's wetness BEFORE any clock
   jump — we narrow the Wet far-past guard by holder chain, so a loose
   heap dries across a multi-day `advance` (a logged-out body and what it
   wears stay frozen together).
5. **D3:** key `onContainableRemoved`/`reface` on the line's stored key,
   never `face.poolKey()` — a face's wetness band can drift once Things
   integrate long gaps.
6. **Declare `SEASONS` in `CLOSED_BY_DESIGN`** (`CLOSED_VOCABULARY_CEILING`
   is 5; we lean on it too). Author the icehouse rooms as
   `SingletonCartesianLocation` (`lint:location-classes` enumerates
   `MINTED_ROWS`).
7. **The cookhouse after our re-class**: props re-lay only on the
   no-record branch, so a melted block stays melted across restarts; run
   your steps 16 and 21 on a fresh DB after both land, and confirm a
   delivered block's title lands with the business (else a restart moves
   it owner-side).
8. **Deferred seams:** under *damp, vermin*, name our `Floor.hasPests()` /
   `pestRatePerHour` as the substrate (a `pests` term in
   `StoreConditions`); wet spent packing goes to our midden via `dispose`.
9. Don't edit the `CLAUDE.md` map or verb list in the build (rule 5 —
   swept, not raced); we add verbs there too.

## To everyone

- **`Material` fieldMeta**: append, never reorder; regenerate the golden.
- **Closed vocabularies**: each declares its own in `CLOSED_BY_DESIGN`
  (ours: `Action`; `SERVICE_KINDS += wash, bath`; `CONDITION_TEMPLATES
  += clean`); the undeclared ceiling stays 5.
- **Terminus**: the square — rubber `east`, ours `north`; the Quay —
  repair named `yard`, ours named `lavoir`; distinct market cells.
- **Docs**: nobody writes a pack count; `retail.md` carries ONE
  description of the service-arm seam (repair's, extended by ours);
  structures-slate's "air mixing / the flue as an object" lines are
  deduped at the second sweep.
- **After ours lands**, each of you re-runs the drive step the table
  names (storage 16/21; rubber's flue soot; repair's `order repair` on
  the shared seam).
