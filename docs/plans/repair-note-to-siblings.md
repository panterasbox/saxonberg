# From repair (build-3) to rubber, cleanliness and storage-and-ice — 2026-10-17

The four builds start together. Repair's full table of shared files and
resolutions is `docs/plans/repair-plan.md` § *Parallel builds*
(`git show origin/reqs/repair:docs/plans/repair-plan.md`). This note is
only what we ask of each of you, and what we accepted from you.

**Merge order we read from all four plans:** storage-and-ice and repair
W0–W6 first (either order — whoever is ready); then rubber; then
cleanliness (never before rubber — it authors `roof:`); then repair W7
(building upkeep, its own MR, after rubber).

**For everyone:** never hand-merge `field-meta-golden.json` or the
wiki-spoiler `.snap` — resolve code, regenerate; keep every build's
review-log entry in `wiki-spoiler-fields.snapshot.test.ts` (⚠ rubber and
cleanliness: your plans do not mention it — `crosslinking`, and
`StainRecord`'s blood type / `donorIdentityPath`, need an entry);
numeric ceilings are recomputed on the merged tree, never summed;
`docs/slates/README.md` is regenerated with `./tools/slate-index`.
Repair adds **no boot entries**.

## To storage-and-ice (build-4)

All six of your asks are accepted and recorded (repair plan § Parallel
builds, *Repair × storage-and-ice*): the `CraftingLogic` helper re-applied
by the second lander; the grouped `tickBusiness` calls `Roster.evaluate`
per slot with your season clock; the `check-openings` overlap arm is
season-aware; `unpackIntoCold` + `cold:` carried whole into
`receiveBench`; your ice tools become one-piece Keen hosts (a one-line
follow-up makes the spud `bladed` after both land); sawdust is yours and
we author nothing on it. Asks back:
1. Extend your Risk 0 / § Parallel builds to name `FireController.ts`
   (rubber rewrites `runFiring`; your `isComposition` swap at :340/:360
   must be re-applied inside it) and `Pool.ts` (cleanliness adds `bathe`).
2. Pin `unpackIntoCold` with a unit test so a dropped branch fails loudly.
3. Record on storage-slate: a Durable poolable (Timber) keys its
   condition band into `poolKey()`; a store never calls `wear()`.
4. Your wiki-spoiler entry: the store's true `lines` amount and the
   sheet's log are what a keeper learns only by measuring.

## To rubber (build-1)

1. **Rubber boots, gloves and the other rubber goods: standalone rows
   on the family classes** (`/platform/thing/equipment/Garment`, `Tool`),
   **no bill and no `extends: leather-boots`** — a moulded boot is one
   piece; as written it would claim two welted uppers and soles a cobbler
   could re-sole. Never an `Assembled*` class (repair W1 deletes them).
2. **Author the brick material** (`base-library/.../material/ceramic/brick.yaml`
   — density, specific heat, `thermalConductivity`); repair W7 adds its
   weathering fields and leaves brick off (no brick supply yet).
3. Your moulds' `discipline: chemistry` becomes the mending trade of every
   rubber good after repair — keep it deliberate; extend your
   `FireController.mould-shape` test to assert `castDiscipline` once both
   land. `Mould.ts`: you edit `holdsCast`, we edit `carryPayload`.
4. When you compute `lint:biome-sky`'s ceiling on the rebased tree, pay
   repair's new interiors (cobbler shop, tinker yard/offstage) by authoring
   `enclosure:` + `roof:` on them rather than listing them.
5. Don't reshape `getEnclosure()`/`getRoof()` or `Exposure`/`Face`
   without telling us — repair W7 reads them.
6. Fix your structures-slate / biome-normalization-slate notes: places own
   materials; building **upkeep is repair W7's**; erection stays in
   structures-slate. Re-point your cobbler non-goal: *mending* → repair;
   *making* boots (the cordwainer) → textiles-slate.

## To cleanliness (build-2)

1. **`Lantern.ts` is deleted by repair W1** (its behaviour folds into
   `Lamp`). Compose `SoilableMixin` on **`Lamp`**; `Lamp.getEmittedFlux`
   is the one funnel for pane state — our failed panes and your soot both
   scale it through facing lines whose material is glass.
2. **The service seam you need is public**: repair W3 exposes
   `CraftingApi.fulfillingHand(giver, venue, discipline?)` — the optional
   discipline comes from the Tariff row (`serviceDisciplines: {wash:
   textiles}`), never hard-coded (a hard-coded `textiles` would lose your
   bathhouse attendant, who `fulfills [personal-services]`). And
   `Tariff.quoteFor(lines: {key, label, qty}[])` is generic — an unpriced
   key is null, never derived from `repair`. The *nobody here to do the
   work* refusal is one shared constant.
3. Re-ground your W0 on repair W1's recompositions (Chair, Garment, Tool,
   Vat, Receptacle, Timber). On `Timber.ts`, keep our chain and add your
   `seasonPhrase` override.
4. Bleach rot and burns: call `Durable.wear()` so they are mendable and
   our condition word shows them; delete the dead Flued `wear()` branch
   (Hearth/Oven are not Durable in either plan).
5. `SurveyController`: one block per room — holding/fabric lines first,
   then your floor line; no digits.
6. Extend repair's *a priced service is performed by a person* section in
   `retail.md` / `employment.md` rather than writing a parallel one.

## Found among the other three (read by repair's review, 2026-10-17 — for each pair to settle)

**rubber × storage-and-ice**
- `Atmospheric.reconcileEnvelope` (H): one steady-state formula, ice's —
  `T_ss = (U_ext·T_out + ΣU_i·T_i + ΣfixedW + driveW + P_solar(t) + ΣG_j·anchor_j) / (U_ext + ΣU_i + ΣG_j)`
  in `envelopeSteadyStateK(outsideK, atS)`; rubber folds its interior faces
  and solar into it.
- The four hollow-mere interiors need `roof:` — whoever lands second
  authors `{pine, 0.05}` and converts the house to timber·sawdust·timber.
- `FireController.ts:330–362` — the `isComposition` swap re-applied inside
  rubber's `runFiring`.
- `permeability()/wetProperty()`, `Wearable.getClo`'s wet-law migration,
  `wetness.impermeableBelowPct` — one copy each.
- `WaterSurface` turns off rain-puddling (`maintainPuddle`).
- Stale: ice's reply note cites `lint:unhoused` (gone; the gate is
  `lint:biome-sky`); rubber's D12.1 still carries the
  `MaterialLogic`/`MaterialApi` paragraph.

**rubber × cleanliness**
- ⛔ Cleanliness's new rooms author `roof:` (rubber's field) with no
  fallback — cleanliness merges after rubber.
- `enclosure: none` IS allowed by `lint:biome-sky` (it counts missing
  keys); `enclosure: [stone piers]` is not a layer. The lavoir:
  `enclosure: none`, `roof: [{slate, 0.02}]`.
- A place with no walls ventilates as outside; decide what two lone places
  joined by a door mean (rubber's `isThreshold`).
- Sulfur: one row (rubber's); cleanliness authors `heatOfCombustion` ≈
  9.2 MJ/kg and an ignition point ≥ 505 K (the bellows oven reaches
  ~482 K); rubber tests that a firing does not ignite its charge.
- Washing hot shrinks only `textile`/`protein`/`cellulose` fibres — not
  rubber gloves or boots. Lye's `corrosiveTo` never lists `organic`.
- The quarry column: cleanliness's fuller's earth and chalk stay above
  −10 (rubber's sulfur sits at −10.2..−10.4).
- Rubber exposes a named `Face.transmittance()` for cleanliness's later
  glass grime.

**storage-and-ice × cleanliness**
- ⛔ **Sawdust contradicts directly**: ice needs a `Sawdust` stack to stay
  a `Sawdust` stack; cleanliness sweeps it into sweepings. Resolution:
  `sweep` gathers only debris deposits and the strewn layer; a `Sawdust`
  stack on the floor stays one; drop the `sawdust` DirtKind.
- Floors: a `takesTraffic()` floor method (false on `WaterSurface`,
  `IceSheet`), checked by `receiveTraffic`/`soilFeetOf`;
  `cleaningMethod('ice')` → scrape; on a sheet `sweep` refuses and points
  to `scrape`; augmenter order sheet → snow → soil.
- Persisting floor state: cleanliness's fixture slice skips a fixture that
  is itself persistable (the ice sheet keeps its own record).
- The frozen-water refusal becomes ONE method (fishing, washing and
  bathing all call it); `bathe` at a Pool goes through `giveWay`/`swim`,
  not `immerse()` directly.
- Wet sawdust goes to cleanliness's midden once both land.
- Ice declares `SEASONS` in `CLOSED_BY_DESIGN` (`CLOSED_VOCABULARY_CEILING`
  is 5). Ice's two boot entries need the owner's sign-off to raise
  `BOOT_ENTRY_CEILING` (83).
