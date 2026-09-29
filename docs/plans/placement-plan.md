# Placement — implementation plan

Executes [placement-requirements](../requirements/placement-requirements.md)
(the product half) over the agreed design in
[containment-partition-slate](../slates/builds/containment-partition-slate.md).
**Kind:** feature. **Lead end:** kernel — first consumers are an icebox
(`generic-objects`, placed in two kitchens, filling the kitchen
archetype's declared `cold` capability) and a meat hook (`trade-cooking`,
placed by the Hearthworks cookhouse).

The build names the relation *where inside its container a thing sits*
(**Placement**), renames the shipped `Surfaced` machinery onto it, makes
the relation a row-extensible vocabulary (`on` · `in` · `from`), moves the
`looseContents` presentation read onto `Container`, repairs the
`coldStorage` satisfier so a kitchen's cold capability answers honestly,
and cashes it for the two objects that have been waiting: an icebox whose
cold is ice you carry in, and a hook you hang a ham from.

⚠ Written 2026-09-27 on `build/placement`, worktree `build-3`, off master
`75b544dd5`; **W3/W4 re-planned the same day against the amended
requirements (`2af1fac34`)**. Every path below is relative to
`packages/server/src/mud/` unless it starts with `packages/` or `docs/`.
⚠ The larder is a **non-goal** and is untouched; the grounding below keeps
its facts only because the icebox shares its kitchens.

---

## Grounding

Verified by opening the file this cycle. Line numbers are at plan time.

### The shipped model

- `lib/spatial/Surfaced.ts` — `SurfacedMixin<TBase extends MixinConstructor>`,
  `_mixinName = 'SurfacedMixin'`. Fields: `userFacingDetail`,
  `airExposure` (both `persistent + authorable`). `:96-106`
  `__validateComposition__` throws when the host lacks `ContainableMixin`.
  `:113-129` `getResting()` is the lazy walk: `env.getContents()` filtered
  on `c.getRestingOn() === this`. `:140-145` `canRest(item): boolean`
  defaults `true`. `:64-80` the `airExposure` docstring names the meat
  hook as a thing rows should be able to make.
- `lib/spatial/Containable.ts:215` `_restingOn: { ref: 'instance',
  lifetime: 'weak' }`; `:270` `protected _restingOn: (Stuff & Surfaced) |
  null`; `:377` `getRestingOn()`; `:393` `_setRestingOn()` gated
  `FromContainmentApi`. ⚠ `:259-269` docstring says "not persistent;
  resets to null on hydrate" — **stale**: `Container.captureSlice` records
  it (below).
- `lib/spatial/Container.ts:84` optional witness `canAddContainable?(thing):
  VetoResult` (asserted by `ContainmentLogic.move` at `:216-221`; **no
  shipped class implements it** — nothing refuses a put into a shut chest).
  `:168-217` `captureSlice` records `placement.restingOnIndex` = index of
  the Surfaced sibling in the same slice. `:349-365` the inspection-card
  `contents` projection filters through `ContainmentApi.looseContents`.
- `lib/persistence/PersistenceSlice.ts:44-51` `interface Placement {
  restingOnIndex?: number }` with the docstring that already carries the
  design's structural insight (*"a Surfaced **sibling** in the same
  contents list"*). `ContentEntry` carries `placement: Placement`.
- `platform/idea/api/PersistableLogic.ts:714-728` the restore "surface
  pass": after every entry is restored, re-`placeOn`s each item whose
  `restingOnIndex` is set. `:639` `captureItem(item, placement)`.
- `api/containment.ts:258-260` the comment that read-wrappers "were
  removed: those reads live on the objects themselves"; `:272-278`
  `looseContents(items: readonly Stuff[])`, twelve lines later. `:246-252`
  `placeOn(item, surface)` forwards to the logic singleton.
- `platform/idea/api/ContainmentLogic.ts:110-137` `placeOn`: env = the
  surface's container; `canRest` veto; `move` (**a no-op when the container
  is unchanged**, its own comment says so); then `_setRestingOn`. `:236`
  `move` clears `_restingOn` on a container change; `:248` fires `onMoved`.
- `lib/stuff/Location.ts:132` `AddressableMixin(AmbientLit(Atmospheric(
  Adornable(Container(PostRegistration(Stuff))))))` — **no `Containable`**,
  so `SurfacedMixin(Location)` throws at registration today (refusal 1
  ships). `lib/boundary/Exitable.ts:276` `ExitableMixin<TBase extends
  MixinConstructor<Stuff & Container>>` — requires Container, says nothing
  about Surfaced, so **nothing stops a Surfaced host being Exitable today**
  (refusal 2 is build work). `platform/thing/Oven.ts:29`
  `SurfacedMixin(ContainerMixin(Thing))` — a placement host that IS a
  container, correctly.
- `lib/mixin.ts:216` `Surfaced: 'SurfacedMixin'` in the `Mixins` const;
  `:689` its refusal phrase `"{} isn't a surface you can put things on"`.
  `api/mixin.ts:952` `isSurfaced`. `:936-946` `isOpenContainer` — the one
  openness rule `canReach`, the `peers` scope walk and `VisionModality`
  share (a Container that is not a body, and not a closed Sealable).
- `api/mixin.ts:2080-2092` `assertComposable` calls every own-static
  `__validateComposition__` up the chain, dispatched from
  `api/stuff.ts:999` at first registration of a concrete class — so a
  composition refusal throws on the first `StuffApi.create` / `clone`, not
  at import.

### The verb and the binder

- `packages/content/platform/content/platform/cmd/inventory/put.yaml` —
  `verbs: [put, place]`; target arg `scope: peers`, `prepositions: [in,
  on]`, `requires: [VisibleMixin, ContainerMixin|SurfacedMixin]`. Item arg
  `requires: ContainableMixin`.
- `platform/idea/cmd/inventory/PutController.ts` — already
  preposition-driven: `model.target.prep` is the consumed word (lowercased
  by the binder, `CommandLogic.ts:2392-2400`); `inferMode` when none typed
  (Container→`in`, Surfaced→`on`, both→`null`); refusals
  `preposition-ambiguous`, `wrong-preposition`, `cannot-rest`,
  `slot-host-not-container`, `cursed-will-not-release`. The slot branch
  (`openSlotFor`) fires when `prep !== 'on'`. Prose is hard-coded
  `You put X ${mode} Y.` / `puts`.
- `platform/idea/api/CommandLogic.ts:2848-2860` `requires:` entries split
  on `|` — `ContainerMixin|PlacingMixin` is an alternation the binder
  already understands. `:2054-2060` the `pending-operand` branch cites
  `put`'s alternation by name in a comment (English only).
- `docs/mql-grammar.md:262,306` — `:i` is *immediate contents (Container)*;
  `here:bookcase:book ≡ here:bookcase:i:book`. `:432` `mixin.X` is a
  boolean predicate over the registered mixin name — so a mixin rename
  reaches into MQL text.

### The four load-bearing content occurrences (and the comments)

Load-bearing — the binder or MQL reads these; a rename that misses one
fails **closed and silent**:

1. `packages/content/platform/content/platform/cmd/inventory/put.yaml:34`
   `requires: [VisibleMixin, ContainerMixin|SurfacedMixin]`
2. `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/butcher.yaml:50`
   `default: "reachable:[mixin.SurfacedMixin and mixin.ContaminableMixin]"`
   — **MQL text inside a content row**
3. `…/butcher.yaml:52` `requires: [SurfacedMixin]`
4. ⭐ `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/dry.yaml:51`
   `requires: [SurfacedMixin]` — missed by the slate, and on the verb this
   build's drive depends on. Its arg is `prepositions: [on, onto]`,
   `default: "reachable:[class.DryingRack]"`. ⭐ Its own comment reads
   *"**hanging** a thing in the open air works, it is simply slower"* — the
   word was already in the prose where the mechanism did not exist.

Comment-only (sweep for accuracy, nothing reads them): `trade-hospitality`
`back-bar.yaml:1`, `well.yaml:1`, `tap.yaml:1`, `racking.yaml:1`,
`bar.yaml:39`, `README.md:7`; `distribution/…/racking.yaml:1`;
`trade-distilling/…/racking.yaml:1`; `trade-smithing/…/workbench.yaml:1`;
`generic-objects/…/bed.yaml:3`, `table.yaml:4-5`, `counter.yaml:3`.

`onto:` in `props:` — ten lines in three files: `trade-hospitality/…/location/bar.yaml:44-49,53-54`
(8), `saxonberg-lounge/…/location/bar.yaml:143` (1),
`eternal-university/…/duncan-hall/location/dormroom.yaml:60` (1).
`lib/stuff/Staged.ts:111-121` (`PropSpec.onto`), `:269`, `:342-360`
(`placed.get(onto)`, `isSurfaced` check, `placeOn`).

### Blast radius, measured

79 files reference `Surfaced | restingOn | placeOn | looseContents |
getResting | canRest | isSurfaced` (`packages/server/src`,
`packages/content`, `packages/wire`; **zero in `packages/client`,
`packages/types`**). Of those: 25 test files, 5 pack `src/` classes
(`trade-hospitality/src/thing/Tap.ts`, `BarStation.ts`;
`trade-cooking/src/thing/ButcherBlock.ts`, `DryingRack.ts`,
`SmokeChimney.ts`, `SaltingTrough.ts`; `eternal-university/src/duncan-hall/thing/Bed.ts`,
`Desk.ts`), 2 pack controllers (`ButcherController.ts`, `DryController.ts`),
~12 content yaml (above). Kernel semantic call sites, each one line:

| file:line | reads | becomes |
|---|---|---|
| `lib/thermal/Thermal.ts:665` | `getRestingOn()` for the furnace couple (pot on campfire) | `getPlacement()?.host` |
| `lib/thermal/Thermal.ts:583,692` | `getContainer()` as the ambient scope | `getEnclosingScope()` (D5) |
| `lib/material/WaterActivity.ts:208` | `getRestingOn().getAirExposure()` | `getPlacement()?.host.getAirExposure()` |
| `platform/idea/api/ElectricityLogic.ts:270` | `getRestingOn()` (raised off the floor medium) | `getPlacement()?.host` |
| `lib/employment/Condition.ts:260` | `getRestingOn()` (delivered onto a counter) | `getPlacement()?.host` |
| `platform/idea/api/ContractLogic.ts:220,359,585` | `isSurfaced` / `getResting()` | `isPlacing` / `getPlaced()` |
| `lib/fire/Furnace.ts:330-331` | heats what rests on it | `getPlaced()` |
| `lib/behavior/restocks.ts:431-432` | bench `getResting()` | `getPlaced()` |
| `lib/archetype/Archetype.ts:523` | `'surface' in need` → `isSurfaced(i)` | ⚠ `isPlacing(i) && i.getPlacements().includes('on')` — a Chamber must not satisfy a kitchen's *surface* need |
| `platform/idea/cmd/perception/LookController.ts:323,515-519` | `looseContents`; drill-in `── On it:` | `getLooseContents()`; grouped by placement, heading from the row |
| `platform/idea/cmd/perception/SenseController.ts:201,255-259` | same | same |
| `lib/spatial/Container.ts:363` | card projection | `getLooseContents()` |
| `lib/stuff/Staged.ts:342-360` | `onto:` | the preposition key (D9) |
| `platform/idea/api/PersistableLogic.ts:716-728` | `restingOnIndex` re-`placeOn` | `hostIndex` + `placement` re-`place` |
| `platform/idea/cmd/inventory/PutController.ts` | whole controller | D6 |
| `trade-cooking/src/idea/cmd/crafting/DryController.ts:92-120,197` | `isSurfaced`, `canRest`, `placeOn`, `getRestingOn` | D11 |

Composers of `SurfacedMixin` (kernel): `platform/thing/Surface.ts`
(`SurfacedMixin(DetailedMixin(Thing))`, `fixedInPlace = true`),
`Oven.ts:29`, `Hearth.ts:60`, `Campfire.ts:46`; packs: the eight above.
`canRest` overrides: found by the compiler when the signature changes
(D4) — do not hunt by grep.

### The thermal path the icebox has to be cashed on

- `platform/thing/Provision.ts:68-69` — every food composes
  `WaterActivity(ThermalDose(Freshness(Thermal(Detailed(Thing)))))`.
  `lib/material/Freshness.ts:623-633` reads the host's **own** `Thermal`
  temperature; `:286,393` the Arrhenius terms.
- `lib/thermal/Thermal.ts:677-708` `restamp()` — the one async mutation:
  `heatSourceK()` wins, else `BiomeApi.resolveTemperatureFor(this.thermalHost.getContainer())`.
  `:580-587` `refreshAmbientFromEnvelope()` — pull side: asks
  `getContainer()` for `envelopeTemperatureLast()` when it is Atmospheric.
  `:716-740` `onMoved` restamps on container change **only** — a placement
  change inside one container fires nothing (the slate's "one addition").
- `lib/biome/Atmospheric.ts:261-263` ⚠⚠ **`AtmosphericMixin<TBase extends
  MixinConstructor<Stuff & Container>>`** — the mixin's base constraint
  requires Container. Eleven `const self = this as unknown as Stuff &
  Container` casts; three walk `self.getContents()` (`:455`
  `restampThermalContents`, `:786`, `:936` — the last two inside the
  envelope integration, which never runs for a Thing: `:609-614`
  `envelopeApplies()` is false when `getVolume()` is null (`:1056`,
  Location subclasses alone override) **or when `_temperature` is
  authored**).
- `:276` `_temperature: { persistent, marshaller: K, authorable }` — the
  **authored-cold exception** the requirements name (*"a cellar, a cave"*).
  Rows using it today: `trade-hospitality/…/location/cellar.yaml:33` (285),
  `terminus/…/brewing/location/cold-store.yaml:24` (279), and three
  goods-yard floors. ⭐ `packages/server/scripts/check-envelope.ts:120`
  `AUTHORED_TEMPERATURES` — every row authoring `_temperature` must be
  listed **with a reason**; the list is a ratchet (`lint:envelope`).
- `platform/idea/api/BiomeLogic.ts:256-281` `resolveTemperatureFor(scope:
  Stuff & Container)` → envelope (`:921`) else `resolveQuantityFor` →
  `runChainWalk` (`:1214`) → `syncChainWalk` (`:1129-1160`): cursor starts
  AT `scope`, and at each step an Atmospheric cursor's **own `_temperature`
  wins first** (`ownGetter`), else `stepOutward` (`:683-691`: `isContainable
  ? getContainer() : null`). Nothing in the walk needs the cursor to be a
  Container except the TypeScript type. ⭐ So a Containable, Atmospheric,
  non-Container thing with an authored `_temperature` resolves to that
  number on the first step — the cellar mechanism works for a compartment
  the moment the types let it in.

### The craft gather walk (why `cook` at home survives, and why a shut icebox hides its food)

`platform/idea/api/CraftingLogic.ts:462-497` `gatherMatter(location,
maker)` iterates `location.getContents()` and descends **one level** into
any inanimate, un-crafted container that is **not a closed Sealable**
(`(!MixinApi.isSealable(c) || c.isOpen())` — its own clause, the same
answer as `isOpenContainer`). So two Sealable containers in one room with
opposite lids already read opposite ways: the open larder's contents
gather; a shut box's do not. `LookController.ts:546-551` shows a
container's contents only when it is not a closed Sealable — the same
rule, a third time.

### ⭐⭐ The archetype's cold capability — what is actually broken

- `lib/archetype/Archetype.ts:495-571` `satisfyingItem(need, pool,
  spaces)` — one branch per need. ⭐ **`coldStorage` HAS a satisfier**: the
  unlabelled fall-through after `vesselKind` (`:563-571`): a space that is
  `MixinApi.isThermal(sp) && sp.getTemperature() <= COLD_K` (`COLD_K =
  283`, `:575`), else `pool.find(isThermal(i) && isSealable(i))`.
  `platform/__tests__/ArchetypeSatisfaction.test.ts:61` proves it with
  `class ColdBox extends ThermalMixin(SealableMixin(ContainerMixin(ThingBase)))`
  (`:246-255` — a studio corner with a `ColdBox` reads as a kitchen;
  `:257-272` — without one, `cold` is the only thing short). An earlier
  draft of the requirements said nothing could satisfy it; corrected
  `44740c717`. What the code says is worse in one direction and looser in
  the other:
  - ⚠⚠ **The SPACE rung is dead.** No `Location` composes `ThermalMixin`
    (`lib/stuff/Location.ts:132`; `grep ThermalMixin platform/location/`
    is empty) — a Location is `Atmospheric`, and its air is
    `_temperature` (authored) or `envelopeTemperatureLast()` (integrated),
    both sync. So the brewing cold store at **279 K**
    (`terminus/…/brewing/location/cold-store.yaml:24`), whose own row says
    *"`coldStorage` reads the SPACE"* (`:11`), satisfies the brewhouse's
    `cold` (`trade-brewing/content/archetypes/brewhouse.yaml:20`) **never**.
    The doc at `Archetype.ts:103` promises exactly this rung.
  - ⚠⚠ **The HOLDER rung checks no temperature.** `isThermal && isSealable`
    is every `Bottle` (`platform/thing/Bottle.ts:39-40` over
    `GradedReceptacle`, which is `ThermalMixin(…)` at `:60`), every `Flask`
    / `Thermos` (`Flask.ts:30` `ThermalMixin(SealableMixin(BulkableMixin(Thing)))`).
    Dave's Bar's hospitality `cold` (`trade-hospitality/content/archetypes/hospitality.yaml:20`)
    reads **MET today by the empty ice bin at room temperature**
    (`IceBin extends Thermos`, `trade-hospitality/src/thing/IceBin.ts`;
    placed by `…/location/bar.yaml:57`), and a bag of ice lying on any
    floor (`trade-bottling/…/thing/ice-bag.yaml`, `class: /platform/thing/Bottle`)
    is "cold storage" for that room.
  - The two kitchens read `cold` **unmet** today for the right reason by
    accident: neither places a Sealable+Thermal thing (`CraftVessel` —
    the oil bottle, the tallow crock — is `Thermal` + `Container` +
    `Bulkable`, not `Sealable`; `CraftVessel.ts:113-117`).
- Declarers of `coldStorage`: `generic-objects/content/archetypes/kitchen.yaml:22`,
  `trade-hospitality/…/hospitality.yaml:20`,
  `trade-brewing/…/brewhouse.yaml:20`, `trade-winemaking/…/winery.yaml:26`.
  Four. All must be re-read after the repair (D18).
- `Archetype.satisfies()` (`:449-470`) — pool = each space's `getContents()`
  + fixtures; **reported, never enforced** (`:445-448`).
  `platform/idea/cmd/perception/SurveyController.ts:137-153` prints one
  line per archetype: `<label>: yes | not quite | no — has key (by), …;
  wants key, …`. Room archetypes are every catalogue archetype with no
  industry (`:159-168`); a room needs no binding — `survey` evaluates all
  of them.

### Ice, melting, and what a cold box would be made of

- `lib/thermal/Meltable.ts` — `MeltableMixin<MixinConstructor<Stuff>>`,
  composed OUTSIDE `Thermal`; reads the material's `meltingPoint` /
  `latentHeatOfFusion`; phase + latent accumulator written only through
  the gated `_absorbLatent` / `_setMeltPhase`, whose one caller is
  `Thermal.ts:842` inside `reconcileMelt` (`:833-848`): at/above the
  melting point the overshoot heat goes into latent and the temperature
  is clamped back (the plateau); at `mass × L` the solid destructs and
  its mass flows to the scope's `Floor` as a pool (`doMelt`, `:851-870`;
  a scope with no `Floor` — the inside of a box — drops the water).
  Composers: `platform/thing/Casting.ts:21`
  (`AlloyedMixin(MeltableMixin(ThermalMixin(Thing)))` — the re-meltable
  cast lump any material freezes into), `Ingot.ts:28`, and
  trade-smelting's `Bloom`. **No ice block ships.**
- `reconcileBulkPhase` (`:878-925`) freezes a liquid bulk into a `Casting`
  clone and boils one to nothing. ⚠ **There is no bulk MELT rung**: the
  bagged ice (`ice-bag.yaml` — 5.45 L of `ice` material as interior bulk
  in a `Bottle`) warms past 273 K and stays "ice" at 290 K. The ice
  material row (`trade-bottling/…/idea/material/ice.yaml`) carries
  `meltingPoint: 273`, `latentHeatOfFusion: 334000`, density 917,
  specific heat 2100.
- `Thermal.ts:403-405` `getTau() = effectiveR() × thermalCapacity()`;
  `effectiveR()` (`:~560`) = medium R + wall R from the body's OWN
  material and barrier (`setBarrier('vacuum')`, `:365`; a closed
  `Sealable` host reads vacuum, `:522`). **No seam lends a holder's
  insulation to a body inside it.** `heatSourceK()` (`:653-666`) is the
  one "what holds me outranks the chain" read, and it is hot-only
  (`isFurnace`).
- Who supplies ice: nobody retails it. `saxonberg-lounge/…/idea/business.yaml:167`
  has an `ice` par line (`level: 10 kg`, supplier the distributor,
  exemplar `ice-bag`); the bags sit in the bottling floor's stock
  (`ice-bag.yaml` `container: /world/terminus/goods-yards/bottling/thing/stock`);
  Mara refills the bin (`agent/mara.yaml:75`). Nothing puts ice where a
  kitchen's player can buy it.

### Content the build lands on

- `packages/content/generic-objects/content/stuff/thing/fixture/larder.yaml`
  — `class: /platform/thing/Chest` (`Staged(Sealable(Container(Detailed(Thing))))`,
  `platform/thing/Chest.ts`), `open: true`, `keywords: [larder, pantry,
  cupboard, chest]`, `mass: 95`. **Untouched by this build.** Placed by
  `hinkley-hills/content/world/terminus/hinkley-hills/lots/kitchen.yaml:32`
  and `trade-cooking/content/trade/cooking/location/kitchen.yaml:62`
  (both `FurnishableRoom`s; `props:` at `:29-32` and `:59-70`) — the two
  rooms the icebox goes into, beside it.
- `packages/content/hearthworks/content/world/terminus/hearthworks/location/cookhouse.yaml:43-125`
  `props:` — already places `/trade/cooking/thing/drying-rack`,
  `butcher-block`, `salting-trough`, `smoke-chimney`, and the
  `pantry-chest` (a `Chest`, `open: true`, holding `prime-cut` +
  `ration-stock`). ⭐ Hearthworks already depends on `trade-cooking`, so a
  hook line costs no new pack dependency. **There is no smokehouse** —
  the slate's "smokehouse" is the cookhouse.
- `packages/content/trade-cooking/src/thing/DryingRack.ts` —
  `extends Surface`, `commandContributions.peers: ['trade/cooking/cmd/crafting/dry.yaml']`
  — the class affords `dry`; a row cannot (a row's `commandContributions:`
  is dead). `trade-cooking/pack.yaml` `root: /trade/cooking`; `src/` has
  `idea/cmd/`, `thing/`, `__tests__/` and **no `lib/`**.
- `packages/content/platform/content/platform/idea/LocomotionMode/walk.yaml`
  — the singleton-Idea row shape (`class: /platform/idea/LocomotionMode`,
  `hydratorClass: …/PersistentHydrator`, `data: { name: walk, … }`).
  `platform/idea/ReadingCatalogue.ts` — the self-warming catalogue shape
  (`PostRegistrationMixin(Idea)`; `warm()` selects rows by
  `Template.findByPathInfix` across **every root** and keeps those whose
  `class` extends the Idea; `warmed()` lazily warms on first miss;
  `peek()` is the sync cold read; `invalidateCache()` for go-live).
  Booted by `packages/content/platform/pack.yaml:85`
  `boot: - { template: /platform/idea/ReadingCatalogue, role: sync-read, … }`
  plus the row `content/platform/idea/ReadingCatalogue.yaml`.
- `lib/social/EmoteGrammar.ts:150-162` — a row's prose is ONE Liquid
  template rendered per audience by `ProseApi.format(template, ctx)` with
  audience-bound `actor` / `target` / `s` / `es` variables — the precedent
  for prose on a vocabulary row.
- `packages/server/package.json:6-16` `exports` — `./mud/platform/thing/*`
  is a glob, so renaming `Surface.ts` → `Fitting.ts` needs no exports edit;
  the five pack imports of `@saxonberg/server/mud/platform/thing/Surface`
  do change.
- `packages/server/scripts/check-object-verbs.ts:43-51` — `ContainmentApi`
  is in `EXEMPT_APIS` as a two-object transfer orchestrator; `place(item,
  name, host)` passes exactly as `move` and `placeOn` do.
- `packages/server/scripts/check-mixin-names.ts` — clauses: no duplicate
  `_mixinName` across kernel + every pack `src/`; every declaration
  readable; every kernel name in `Mixins`. **It reads TypeScript only**;
  a mixin name inside a yaml `requires:` or an MQL `default:` string is
  invisible to it today.
- `packages/wire/src/harness/session.ts` — `Session.cmd(text)` returns
  `{ status, notes, text, prose }`; `:10` *"Everything waits on a frame,
  never on a clock"* — **the harness has no game-clock control**, and
  `wire/tests/food-safety.dirty.wire.test.ts:16-22` records why a wire
  drive must not prove a slow arc by turning the clock up.

### Name collisions checked

`Placement` is exported today by `lib/persistence/PersistenceSlice.ts:48`
(the struct this build renames to `ContentPlacement`) and by
`lib/combat/AimResolution.ts:70` (`type Placement`, combat's aim×answer
grid, imported by `CombatLogic.ts:94`). Two exports named `Placement` in
different modules are legal and the module registry keys on identity;
combat's stays untouched. No `Placing`, `Fitting`, `Chamber` or
`PlacementCatalogue` exists anywhere in `src/`.

---

## ⚠ Findings against the agreed design

The design holds. The things below are wrong as engineering facts — in
the slate, and one in the amended requirements — and the plan corrects
them; none reopens the product.

0. ⚠⚠ **`coldStorage` HAS a satisfier** (the requirements said it had
   none; corrected 2026-09-28, `44740c717`, which now describes this
   two-sided defect). `Archetype.ts:563-571` is the branch (the unlabelled
   fall-through after `vesselKind`, which is why a read looking for
   `if ('coldStorage' in need)` misses it), and
   `ArchetypeSatisfaction.test.ts:246-272` proves a `Thermal + Sealable`
   container satisfies `cold`. What IS broken is two-sided and worse than
   "unmeetable": the **space rung is dead** (no `Location` is `Thermal`,
   so the 279 K brewing cold store satisfies nothing though its row says
   it should), and the **holder rung is temperature-blind** (every
   `Bottle`, `Flask` and `Thermos` is `Thermal + Sealable`, so Dave's
   Bar's `cold` reads MET by an empty ice bin and any room with a bag of
   ice on the floor has "cold storage"). The requirements' observable —
   *every kitchen reports cold unmet today* — happens to hold only because
   no kitchen places a Sealable+Thermal vessel. D18 repairs both rungs.
   ⭐ Acceptance criterion 2 is now *a kitchen with a WARM icebox reports
   cold unmet; put ice in it and the same kitchen reports MET* — the
   proof that the holder rung's temperature check landed, and W5's
   B-block asserts both halves in that order.
1. ⚠⚠ **`Chamber = Atmospheric(Placing(Detailed(Thing)))` does not compile.**
   `AtmosphericMixin`'s base constraint is `Stuff & Container`
   (`Atmospheric.ts:261-263`), and `BiomeApi.resolveTemperatureFor` takes a
   `Stuff & Container`. The chain walk itself needs nothing but
   `isContainable → getContainer()` and `getZone()`, both on any Stuff. So
   the composition is right and the *types* are wrong; making it compile
   is a widening of `AtmosphericMixin` to `MixinConstructor<Stuff>` plus a
   retype of the biome walk's cursor. ⭐ **Decided by the project owner
   (2026-09-28): the icebox is a plain insulated container (D10), so
   nothing in this build composes `Chamber`, and `Chamber` + the widening
   drop out of the build entirely.** The full specification and the
   reasoning live in § Deferred seams, owned by the fridge pack; nothing
   here is conditional.
2. ⚠ **The cost claim undercounts.** Adding a relation is one row **plus
   one word per verb whose arg accepts a placement host** — today `put`'s
   `target` and `dry`'s `rack`; `cure`/`smoke` declare no prepositions.
   After the rename `dry ham on hook` works and `dry ham from hook`
   does not until `dry.yaml` gains the word. The plan adds it (W4), states
   the corrected claim, and ships the roster that tells an author which
   verbs those are (D8).
3. **Only one of the "two sites that must consult `encloses`" needs an
   edit.** `PerceptionLogic.canReach` (`:290-310`) must refuse an item
   whose enclosing placement host is shut — that is the reach half of
   *address freely, refuse with a reason*. `VisionModality` (`:202-215`)
   reads the light where the item's **container** is; an item placed in a
   region of a room has `container = the room` and reads the room's light
   with no change. It gets a comment, not code.
4. **Three prose fields per member is one too many** — the slate suspected
   it. `EmoteGrammar` already renders one Liquid template per audience with
   `{{s}}`-style agreement, so a member carries `prose` (one template) and
   `heading` (D7).

5. **`CoolboxMixin` is not "~40 lines and the only new code."** The mixin
   is about that size, but it needs two seams `Thermal` does not have:
   contents must read a shut cold holder's interior (the cold twin of
   `heatSourceK`, which is hot-only), and the ice inside must warm against
   the ROOM through the box's walls rather than against an interior that
   is its own temperature (no seam lends a holder's insulation to a body
   inside it). Both are in `Thermal.ts`, ~40 lines together, and they are
   where the work is (D19).
6. **Ice does not melt in a bag.** `reconcileBulkPhase` has no melt rung,
   so bagged ice (bulk in a `Bottle`) warms and stays ice. A discrete
   `Meltable` block melts through the shipped plateau. The icebox's cold
   is a block (D20).

---

## Plan-level decisions

**D1 — Names.** `PlacingMixin` (`lib/spatial/Placing.ts`, `_mixinName =
'PlacingMixin'`, `Mixins.Placing`, `MixinApi.isPlacing`) replaces
`SurfacedMixin`. Its read is `getPlaced(name?: string): readonly (Stuff &
Containable)[]` (all placements on this host, or one named). `Containable`
gets `getPlacement(): { host: Stuff & Placing; name: string } | null` and
the gated setter `_setPlacement(host, name)` / `_setPlacement(null)`.
`ContainmentApi.placeOn(item, surface)` becomes **`place(item, name, host)`**.
`ContainmentApi.looseContents` is deleted; `Container.getLooseContents()`
replaces it. `platform/thing/Surface` becomes **`Fitting`** (the bare host:
a shelf, a hook, a rail); `Chamber` (the compartment) is **not** in this
build — see § Deferred seams. The persisted struct `Placement` becomes `ContentPlacement { placement?:
string; hostIndex?: number }`. The vocabulary Idea is `Placement`
(`/platform/idea/Placement/<name>`), warmed by `PlacementCatalogue`.

**D2 — Two fields, not a struct.** `Containable` carries
`_placementHost: (Stuff & Placing) | null` (`fieldMeta: { ref:
'instance', lifetime: 'weak' }` — the R2.3 self-heal is the proxy get trap
on a field that holds a Stuff) and `_placementName: string` (`''` when
none). `getPlacement()` normalises the pair: a healed-to-null host reads as
no placement whatever the name says.

**D3 — (retired into § Deferred seams.)** The `AtmosphericMixin` widening
and the `occupants()` seam are not built; their specification is kept in
full under *Deferred seams § `Chamber` and the `Atmospheric` widening*,
because it is the most expensive thing in this plan to rediscover.

**D4 — `canPlace(item, name): VetoResult` replaces `canRest(item):
boolean`** on `PlacingMixin`. Default body, in order: `name` not in
`getPlacements()` → `{ ok: false, reason: 'no-such-placement' }`; the
member `encloses` and the host is a closed `Sealable` → `{ ok: false,
reason: 'shut' }`; else `{ ok: true }`. Subclasses that override today's
`canRest` (the compiler lists them) return a `VetoResult` with their own
reason. `ContainmentLogic.place` asserts it; the verbs read the reason
into the refusal prose.

**D5 — `Containable.getEnclosingScope(): Stuff | null`** — the placement
host when `getPlacement()` names a member whose `encloses` is true, else
`getContainer()`. This is the slate's `ambientScopeOf` in its first
consumer-driven half; **stepping outward through a non-atmospheric
container is NOT this build** (narrowing slate finding #2). Readers:
`Thermal.restamp` and `refreshAmbientFromEnvelope` (the ambient scope),
`PerceptionLogic.canReach` (a shut enclosing host refuses). It lives on
`Containable` because *what stands between me and my container* is a
spatial fact, and the slate's own definition of `encloses` is "for air,
sight and reach".

**D6 — `PutController` resolution, precisely.** Inputs: `target`, `item`,
`prep` (the consumed word or `undefined`).

1. Build the **offers**, in this order:
   - region zero — `{ kind: 'zero', words: ['in'] }` iff
     `MixinApi.isContainer(target)` and the target is not a body
     (`!isOrganism && !isCommandGiver && !isHasInteractive`, the
     `isOpenContainer` exclusions);
   - one per name in `target.getPlacements()` when `isPlacing(target)` —
     `{ kind: 'placement', name, words: row.getPrepositions() }`, from
     `ContainmentApi.placement(name)`; a name with no live row is skipped
     and logged once (`console.warn`).
2. The **slot rule stays first and unchanged in spirit**: when `prep` is
   `undefined` or `'in'` and `openSlotFor(target, item)` finds a slot →
   mode `slot`. (Today's guard is `prep !== 'on'`; with N words it becomes
   *the region-zero words or none*.)
3. `prep` typed: pick offers whose **primary** word (`words[0]`) equals
   `prep`; if none, offers whose `words` **include** `prep` (this is how
   `put ham on hook` resolves `from` at a host offering only `from`, whose
   row lists `[from, on]`). One match → it. Zero → `wrong-preposition`,
   prose *"You can't put things {prep} {target} — it takes {primaries,
   joined 'or'}."* Two or more → `preposition-ambiguous` (only possible
   when two members share a primary word — an authoring collision
   `lint:placement-words` refuses, so in practice unreachable).
4. `prep` absent: one offer → it. Two or more → `preposition-ambiguous`,
   prose *"Put it {primaries in offer order, 'in, on or from'} {target}?"*
   Zero → cannot happen (the arg gate admits only Container|Placing) but
   refuse `wrong-preposition` defensively.
5. Dispatch. `zero`: if `isSealable(target) && !target.isOpen()` →
   `controller-rejected reason: 'shut'`, prose *"{target} is shut."*;
   else the cursed-release gate, then `ContainmentApi.move` and today's
   prose. `placement`: `target.canPlace(item, name)` → on veto,
   `controller-rejected reason: <veto.reason>` with prose by reason
   (`shut` → *"{target} is shut."*, else *"{item} won't go {word} {target}."*);
   else the cursed-release gate, then `ContainmentApi.place(item, name,
   target)` and the row's `prose` rendered per audience (D7). Chattel
   `followCustody` after either, as today.

So: *one region and many regions are the same thing* — a table (offers
`['on']`) and a chest (offers zero) resolve with no preposition exactly as
today; an oven (zero + `on`) still asks *in or on?*; a hook (`['from']`)
takes `put ham on hook` and says *hang … from*.

**D7 — Prose on the row: two fields.** `prose` is one Liquid template
rendered through `ProseApi.format` with `actor`, `item`, `host` (Mml
presentations, per audience) and the agreement variables `EmoteGrammar`
already binds (`s`, `es`): `"{{ actor }} put{{ s }} {{ item }} on {{ host }}."`,
`"{{ actor }} hang{{ s }} {{ item }} from {{ host }}."`. `heading` is the
drill-in label: `On it` / `In it` / `Hanging from it`. `LookController`
and `SenseController` group `getPlaced()` by name and emit one `── {heading}:
{list}.` line per group, in `getPlacements()` order; a name with no row
falls back to `With it`.

**D8 — The corrected cost claim, and the roster.** *A new way of sitting
costs one row, plus one word on every verb whose argument accepts a
placement host.* The set is defined by the arg gate — every command view
with an arg whose `requires` names `PlacingMixin` — and a new gate
**`lint:placement-words`** (`scripts/check-placement-words.ts`) makes it
findable: (a) every `prepositions:` word on such an arg is carried by some
`Placement` row under any root (a stale or mistyped word fails); (b) no two
rows share a primary word (D6 step 3's collision); (c) `--list` prints the
roster — each support-accepting verb, the members it accepts, and the
members it does not. Two verbs today: `put`, `dry`. **Rejected:** letting a
member row declare the verbs that accept it. It inverts ownership (a view's
grammar is the view's; a row cannot edit `prepositions:`), and every lint
that reads a view's grammar off the file (`binder-models`, `arg-kinds`,
`verb-collisions`) would stop seeing the true grammar. A binder sentinel
(`prepositions: placement`, resolved from the catalogue at bind time) would
make the word cost zero and is the honest next step — recorded as a
deferred seam, not built for two verbs.

**D9 — Authored form.** A `props:` entry places by **the member name as
the key**: `{ template: …, on: …/well }`, `{ template: …, in: …/icebox }`,
`{ template: …, from: …/meat-hook }`. `PropSpec` drops `onto`; `applyProps`
reads the one key that is a placement name (exactly one allowed; a second
is an authoring error), resolves the host from `placed` as today, checks
`isPlacing`, and calls `ContainmentApi.place`. The ten `onto:` lines become
`on:`.

**D10 — The icebox is a `Container`, not a `Chamber`: `Thermal +
Sealable` on a Container is enough, and it is right.** (The coordinator's
question 1, answered explicitly.) By the design's own taxonomy a
`Chamber` is *the compartment inside a holder* — "a steak in the freezer
compartment is in the fridge" — and the icebox is the holder, the fridge's
passive ancestor, with no compartments. You put things IN it and it holds
them: region zero. That is also the shape the satisfier's own doc names
(*"an insulated, sealable holder — `Thermal` + `Sealable`"*) and the shape
the shipped `ColdBox` test fixture already proves. Making it a `Chamber`
so that the `in` row has a composer would be choosing the class for the
vocabulary's sake — the model claiming a compartment that is not there.
`platform/thing/Icebox.ts` = `CoolboxMixin(SealableMixin(ThermalMixin(ContainerMixin(DetailedMixin(Thing)))))`
over `lib/stuff/Thing`; `fixedInPlace = true` (a chest-sized box on
legs; the ice is what you carry, not the box). Row
`packages/content/generic-objects/content/stuff/thing/fixture/icebox.yaml`:
keywords `[icebox, ice-box, box, cold box]`, `open: false` (**seeded
SHUT** — it holds cold by being shut), `_materialPath` a wood, `mass: 60`,
`insulationR` authored (D19), no `props:` (ice is carried in, D20). Both
kitchens add one `props:` line after the larder. Contents read the
interior through the holder rung (D19); `Freshness` reads the food's own
colder `Thermal`. ⭐ *A second cold box is a row naming the same class with
its own walls.*

**D17 — ⭐ `in` ships with NO placement composer, deliberately.** With
the icebox a Container (D10, accepted by the project owner 2026-09-28)
no shipped class composes a host offering `in`; `Chamber` is the fridge
pack's (§ Deferred seams). The `in` row still ships and still has a
reader: **`put`'s region zero** — D6's zero offer takes its words and its
prose from the `in` row when the catalogue has one (`prepositions: [in,
into]`, `"{{ actor }} put{{ s }} {{ item }} in {{ host }}."`) and falls back
to `['in']` + today's prose when it does not. That is *one region and many
regions are the same thing* made literal, and it keeps every `Placement`
field read (`encloses` → `getEnclosingScope`, trivially the container for
region zero) so `lint:unconsumed-seams` is honest. ⚠ **To the build agent:
this is not an oversight to "fix" by making the icebox a `Chamber`** —
that was considered and refused for the reason in D10. A host offering
`in` arrives with the first compartment, not with this build.

**D18 — The `coldStorage` satisfier is repaired on both rungs, inside the
shape its doc names.** In `Archetype.ts:563-571`: the **space** rung reads
a space's own air rather than a `Thermal` it never has —
`MixinApi.isAtmospheric(sp)` and `(sp._temperature ?? sp.envelopeTemperatureLast())`
via the sync method surface (`ownTemperatureLast()`-style getter; add one
if `Atmospheric` exposes only the field) `<= COLD_K`; the **holder** rung
keeps `isThermal && isSealable` and adds the same bar:
`i.getContentsTemperature().rawValue() <= COLD_K`. An empty icebox in a
warm kitchen is not cold storage, and a bag of ice on the floor is not
either (it is not `Sealable`-shut… it is, but it is not a *holder* of
anything: add `MixinApi.isContainer(i)` — a bottle holds bulk, not
things). Not a widening: both rungs are the ones `Archetype.ts:103-105`
already promises, with the temperature test the space rung already has.
⚠ **Every declarer re-read** (four): kitchen — unmet until an icebox with
ice (drive 4-5); hospitality — Dave's Bar flips from a false MET (the
empty ice bin) to honest: MET only while the bin holds ice at ≤ 283 K
(and the bin is a bulk holder, not a container of things — so under the
`isContainer` clause it never satisfies `cold`; its job is the `ice`
capability, which it keeps. **The hospitality `cold` row is the cellar's,
and the cellar at 285 K is above `COLD_K`** — it reports unmet, which is
the truth of a 12 °C cellar under a 10 °C bar); brewhouse — the 279 K
cold store flips to MET through the repaired space rung (the brewing
floor at 288 K stays unmet); winery — its rooms author 285 K, unmet.
`ArchetypeSatisfaction.test.ts` gains: a `ColdBox` at room temperature
does NOT satisfy; a `ColdBox` holding a body at 273 K does; an
`Atmospheric` space with `_temperature: 279` does; a `Bottle` never does.

**D19 — `CoolboxMixin`, and the two `Thermal` seams it needs.**
`lib/thermal/Coolbox.ts`, `CoolboxMixin<MixinConstructor<Stuff & Container & Thermal & Sealable>>`,
`_mixinName = 'CoolboxMixin'`, `Mixins.Coolbox`. One authored field:
`insulationR` (K·s/J-shaped like `effectiveR`'s output; `persistent +
authorable`; default the wall R of a 5 cm softwood box). Two reads:
`coldestMass(): (Stuff & Thermal) | null` — the contained `Thermal` with
the lowest `getTemperature()`, over `getContents()`; and the interior
temperature, which **is the box's own `Thermal`**: `Coolbox.reconcile`
(hooked from the host's `reconcileThermal` via the existing
`refreshAmbientFromEnvelope` override point) sets the box's ambient to
`min(chain ambient, coldestMass().getTemperature())` when shut, and the
chain ambient when open — so `getContentsTemperature()` on the box IS the
interior, the thermos model. The seams in `Thermal.ts`:
(i) **the holder rung** beside `heatSourceK` — `holderK()`: when
`getEnclosingScope()` is a `Coolbox` that is shut and `this` is not its
`coldestMass()`, the ambient is the box's `getContentsTemperature()`;
read in `restamp` and `refreshAmbientFromEnvelope` exactly where
`heatSourceK` is; (ii) **lent insulation** in `effectiveR()` — when the
enclosing scope is a shut `Coolbox` and `this` IS its `coldestMass()`, add
the box's `insulationR` (the ice warms against the room through the
walls; without this the ice reads its own temperature as ambient and
never melts). Open box → neither seam applies; the seal toggle already
restamps (`Thermal.ts:672`). Estimate corrected: mixin ~40 lines, seams
~40, tests. The `Meltable` plateau on the block does the rest with no new
code: at 273 K the block absorbs `4 kg × 334 kJ` of leak before it goes,
and the leak is `(T_room − 273) / (R_block + insulationR)` — the slate's
*"hours to melt"* item falls out of the shipped reconcile.

**D20 — The ice is a discrete block, and the drive seeds it.** Row
`packages/content/generic-objects/content/stuff/thing/ice-block.yaml`,
`class: /platform/thing/Casting` (the shipped re-meltable solid —
`Alloyed(Meltable(Thermal(Thing)))`; its own docstring names ice as an
intended use: *"a cast lump of whatever froze (metal run into a mould,
wax, ice)"*),
`_materialPath: /trade/bottling/idea/material/ice`, `mass: 4`, keywords
`[ice, block, ice-block]`, prose *"a four-kilo block of ice, sweating."*
It melts through `reconcileMelt`; the meltwater has no `Floor` inside the
box and is dropped (`doMelt`'s own rule — noted, not fixed).
⚠ **A knowingly accepted cost, not an oversight — do not "fix" it by
minting `IceBlock`.** `AlloyedMixin` carries `alloying` and `temper`,
load-bearing for metal (an off-spec quench mints a Casting and the alloy
data must survive the re-melt) and **inert on ice** — so the ice block
will claim, on the ungated player-facing `<composition>` panel, that it
can be alloyed and tempered. That is the exact misrepresentation the
narrowing slate catalogues, shipped by this build. `Casting` is taken
anyway: the alternative is a one-row class (the narrowing slate already
counts 103), the owner's rule 3 says err on composing when it is a
tossup, and a re-meltable solid genuinely is the right concept. **Owed:**
a one-line finding for `base-class-narrowing-slate`'s defect register
(the coordinator files it) — *the re-meltable-solid concept is welded to
metallurgy: `Casting`, `Ingot` and `Bloom` all compose `Alloyed`, so
every non-metal thing that freezes inherits alloy fields it cannot use;
`Casting`'s own docstring names wax and ice as intended uses.* **Nobody
sells it**: the requirements allow either placing ice or seeding it, and
this build **seeds** — the drive `clone`s a block into the kitchen with a
wizard act and says so in the record, because retailing ice is the
icehouse-keeper's vocation and the preservation slate's, and stocking a
counter with a good no chain produces would be an authored demand with no
supply (the RGO law). The row exists so that a retail row can name it the
day the trade does.

**D21 — The lid constraint inverts, and the two lids do not collide.** The
larder is a `Chest`, `open: true`: its contents are in the `peers` scope,
in reach, and in the gather walk (`CraftingLogic.ts:474-484`). The icebox
is `open: false`: its contents are **out of all four** (`peers`,
`canReach`, `VisionModality`, `gatherMatter`) — every one of them reads
the same lid — and `put X in icebox` while shut is refused `shut` (W2,
D6). To keep food you open it, put the food in, and shut it; to cook from
it you open it. That is a real icebox and the rule is shipped behaviour:
this build adds no site. Proven by one test with both boxes in one room
(W3). ⚠ `look icebox` lists contents only when open (`LookController.ts:551`)
— the drive's step 7 opens it first.

**D11 — The hook and `dry`.** `trade-cooking/content/trade/cooking/thing/meat-hook.yaml`:
`class: /platform/thing/Fitting`, `placements: [from]`, `airExposure: 1`,
keywords `[hook, meat-hook]` (⚠ not `hooks` — the rack's keywords already
carry it). One `props:` line in the cookhouse after the drying rack.
`dry.yaml`'s `rack` arg: `prepositions: [on, onto, from]`, `requires:
[PlacingMixin]`. `DryController` resolves the member with
`rack.resolvePlacement(prep)` (a `PlacingMixin` method: primary match,
then secondary, else `null`; with no word and one member, that member;
with no word and several, the first — `dry` is not `put`, a rack is not
ambiguous), vetoes through `canPlace`, calls `ContainmentApi.place`, and
its prose says *up to dry {word} {rack}* with the resolved member's primary
word. Its `exposureOf` reads `getPlacement()?.host`. The hook affords
nothing; `dry` is afforded by the rack in the same room, and the passive
drying (`WaterActivity` reading the hook's `airExposure` through the
placement) needs no verb at all — drive step 13 holds on `put` alone.

**D12 — `place()` restamps.** `ContainmentLogic.place`: env = host's
container (throw when none); `canPlace` veto (throw `ContainmentError`
with the reason); `move(item, env)`; `_setPlacement(host, name)`; then
`if (MixinApi.isThermal(item)) void item.restamp()` — because `move` is a
no-op inside one container and a compartment now holds its own cold.

**D13 — The second composition refusal.** `PlacingMixin.__validateComposition__`
keeps the Containable check and adds: `if (MixinApi.hasMixin(ctor,
Mixins.Exitable)) throw new Error(…)` with the maker-facing message from
the slate (*"… a thing you can go inside cannot also be something you put
things on. Put a Fitting or a Chamber in its contents instead (that is how
a boot works), or, if the outside of this vehicle really must carry things,
write the class."*). Both refusals are **proven to throw** by registering a
concrete class through `StuffApi.create` (`assertComposable` runs at first
registration, `api/stuff.ts:999`), never assumed from the types.

**D14 — Persisted shape, no migration.** `ContentPlacement { placement?:
string; hostIndex?: number }`; `Container.captureSlice` writes both;
`PersistableLogic`'s surface pass re-`place`s by `hostIndex` + `placement`.
Old `holder_snapshots` records carry `restingOnIndex`, which the new pass
ignores — placed items would restore loose. ⭐ **Drop this worktree's dev
DB before the drive** (the project's no-migrations rule, and the
`props:` once-guard means the hook line never reaches a booted cookhouse
otherwise).

**D15 — The invisible edit is caught by `lint:mixin-names` clause 4.**
Every token matching `\b[A-Z][A-Za-z]+Mixin\b` inside any command view's
`requires:` entries or `default:` strings (every pack's `content/**/cmd/**/*.yaml`)
must be a declared mixin name (kernel `Mixins` ∪ pack `_mixinName`
statics — the script's existing reader). This would have failed on all
four load-bearing occurrences the day `Surfaced` was renamed.

**D16 — The `Placement` Idea and its catalogue.** `platform/idea/Placement.ts`
= `SingletonMixin(PropertiedMixin(Idea))` (the `LocomotionMode` shape).
Fields, all `persistent + authorable`: `name`, `prepositions: string[]`
(primary first), `encloses: boolean`, `prose`, `heading`. Readers in the
same wave (for `lint:unconsumed-seams`): `name`/`prepositions` → the
catalogue index and `resolvePlacement`; `encloses` → `getEnclosingScope`
and `canPlace`; `prose` → `PutController`; `heading` → `Look`/`Sense`.
Rows at `packages/content/platform/content/platform/idea/Placement/{on,in,from}.yaml`:

| | `on` | `in` | `from` |
|---|---|---|---|
| `prepositions` | `[on, onto]` | `[in, into]` | `[from, on]` |
| `encloses` | false | **true** | false |
| `prose` | put{{ s }} … on | put{{ s }} … in | hang{{ s }} … from |
| `heading` | On it | In it | Hanging from it |

`platform/idea/PlacementCatalogue.ts` — the `ReadingCatalogue` shape:
`warm()` selects `Template.findByPathInfix('/idea/Placement/')` across every
root and keeps rows whose class extends `Placement` (so
`/trade/x/idea/Placement/<name>` qualifies with no kernel edit); indexes by
`name` and by every preposition; `peek(name)` sync; `warmed(name)` lazy;
`invalidateCache()`. Row `content/platform/idea/PlacementCatalogue.yaml` +
a `boot:` entry in `packages/content/platform/pack.yaml` (`role:
sync-read`, reason: *the put/look/thermal paths read a member synchronously
on every dispatch*). `ContainmentApi.placement(name): Placement | null` is
the one sync read door (a forwarding static → `ContainmentLogic` →
`StuffApi.findByTemplatePath(PLACEMENT_CATALOGUE_PATH).peek(name)`); no
lib mixin imports the catalogue.

---

## ⭐⭐ Host placement

| what | host | what composing it claims |
|---|---|---|
| `placements: string[]` (default `['on']`), `airExposure`, `userFacingDetail`, `canPlace`, `getPlaced`, `resolvePlacement` | **`PlacingMixin`** — per-host claims about which relations it offers | every composer (`Fitting`, `Oven`, `Hearth`, `Campfire`, the eight pack classes) offers `on` and nothing else unless its row says otherwise — zero behaviour change |
| `_placementHost`, `_placementName`, `getPlacement`, `_setPlacement`, `getEnclosingScope` | **`ContainableMixin`** — the item's back-reference; it was `_restingOn` | every Containable can be placed; nothing new is claimed |
| `getLooseContents()` | **`ContainerMixin`** — a presentation read over its own list; docstring leads with *the model read is `getContents()`* | a Container can say which of its contents are loose; `Location` inherits it, correctly (a room lists loose things) |
| `coldStorage` satisfier (both rungs, D18) | `lib/archetype/Archetype.ts` `satisfyingItem` — the kernel's, with the other eight | a space satisfies by its own air; a holder by being `Thermal + Sealable + Container` **and cold** |
| `CoolboxMixin` — `insulationR`, `coldestMass()`, the interior-is-my-Thermal reconcile | `lib/thermal/Coolbox.ts`, composed on a `Container & Thermal & Sealable` host | a composer is a holder whose interior follows the coldest thing in it; nothing today composes it but `Icebox` |
| `holderK()` (the cold twin of `heatSourceK`) and the lent-insulation clause in `effectiveR()` | `ThermalMixin` — reads on the BODY being held, where `heatSourceK` already is | every Thermal body asks *what holds me*; a shut Coolbox answers, nothing else changes |
| `Icebox` (`Coolbox(Sealable(Thermal(Container(Detailed(Thing)))))`, `fixedInPlace`) | `platform/thing/Icebox.ts` | the two kitchens' rows; the `ColdBox` fixture's shape made concrete |
| the ice block | a **row** on `platform/thing/Casting` (`Alloyed(Meltable(Thermal(Thing)))`) — no class | `Alloyed` inert on a one-element material; melts through the shipped plateau |
| `Placement` (the vocabulary Idea) | `platform/idea/Placement.ts` — instanceable, rows under any root | — |
| `PlacementCatalogue` | `platform/idea/PlacementCatalogue.ts` — singleton, booted | — |
| `Fitting` (`PlacingMixin(DetailedMixin(Thing))`, `fixedInPlace`) | `platform/thing/Fitting.ts` — `Surface` renamed | the seven rows and five pack subclasses naming `Surface` |
| `ContentPlacement` | `lib/persistence/PersistenceSlice.ts` | — |
| region-zero `shut` refusal | **`PutController`** — the verb's refusal, never `ContainmentApi.move` (brains and restocks move into closed cupboards legitimately) | — |
| enclosing `shut` refusal | `PlacingMixin.canPlace` (write) + `PerceptionLogic.canReach` via `getEnclosingScope` (reach) | — |
| the Exitable refusal | `PlacingMixin.__validateComposition__` | `Location` never composes Placing (refusal 1); no placement host is `Exitable` (refusal 2) |
| `lint:placement-words`, `lint:mixin-names` clause 4 | `packages/server/scripts/` | — |

**Not hosts, deliberately:** `Location` (never Placing; never `Thermal` —
the space rung reads its air, D18); `Chest` (unchanged — region zero with
a lid; the larder and the pantry chest stay chests); `Sealable` (no
`canAddContainable` — a shut chest refuses at the verb); `Vessel`
(untouched; `Atmospheric` off `Vessel` is the narrowing slate's); the
**larder row** (a non-goal; not one key changes); `Thermos`/`IceBin`
(bulk holders — they keep the `ice` capability and never were cold
*storage*); `Bottle` (the ice bag is not made `Meltable` — bulk melt is
its own missing rung, noted).

**The wrong-host tells to watch for in review:** an `isCoolbox` branch
inside `Atmospheric` or `BiomeLogic` (the holder rung is a read on the
body, beside `heatSourceK`); an `isContainer` guard inside
`PlacingMixin` (region zero is `Put`'s composition, not the mixin's); a
Sealable check inside `ContainmentLogic.move`; a `ThermalMixin` on any
`Location` to make the space rung pass (its air is `Atmospheric`'s).

---

## Convention conformance

Checked at plan time against the current tree.

- **`props:` / `cast:`** — the cookhouse and both kitchens use `props:`;
  the hook is one `props:` line. `populates:` is retired and unused here.
- **Locations, not rooms** — nothing new is a Location; both kitchens are
  `FurnishableRoom`s already.
- **Path pattern `<root>/<branch>/`** — `Placement` rows at
  `/platform/idea/Placement/<name>`; a pack's at
  `/<root>/idea/Placement/<name>`; `Fitting` at
  `/platform/thing/…`; the hook at `/trade/cooking/thing/meat-hook`.
  `lint:instanceable`: nothing new under `/lib/` is instanced; the renamed
  mixin file is `lib/spatial/Placing.ts`.
- **Module scope declares** — the catalogue warms in `postRegister`;
  `Placement` rows are content; no module-scope statements.
- **Import boundary** — no new file imports outside `src/mud/`; pack
  classes import `Fitting` by package specifier
  (`@saxonberg/server/mud/platform/thing/Fitting`, the existing glob).
- **Module categories** — one Stuff class (`Placement`), one singleton
  (`PlacementCatalogue`), two concrete twins (`Fitting`, `Icebox`), one
  renamed mixin (`Placing`), one new mixin (`Coolbox`, in `lib/thermal/`
  — heat is what drives it, the `Meltable` precedent), one new lint
  script. **No Api, no logic singleton, no free
  helper, no new category, no `eslint-disable`.** The one static that is
  tempting to write as a helper — resolving a word to a member — is
  `PlacingMixin.resolvePlacement` (a verb on the object) and
  `ContainmentApi.placement` (a forwarding static).
- **Verbs on objects** — `host.canPlace`, `host.getPlaced`,
  `host.resolvePlacement`, `item.getPlacement`, `item.getEnclosingScope`,
  `container.getLooseContents`. `ContainmentApi.place(item, name, host)`
  is orchestration (two objects, a move) and `ContainmentApi` is in
  `EXEMPT_APIS`; `lint:object-verbs` stays at zero.
- **Mixin names** — `Mixins.Placing = 'PlacingMixin'` added and `Surfaced`
  removed in `lib/mixin.ts` (kernel mixin); `Mixins.Coolbox = 'CoolboxMixin'`
  in W3; the refusal phrase at `:689`
  becomes `"{} isn't something you can put things on or in"`. The static
  is declared `static _mixinName: string = 'PlacingMixin'` (widened, per
  the project's `_mixinName` rule).
- **Gates this build must satisfy** (`pnpm -C packages/server lint:family`
  runs all; the ones with teeth here): `lint:mixin-names` (+ the new
  clause), `lint:field-meta` (`_placementHost`, `_placementName`,
  `placements`, the five `Placement` fields), `lint:instanceable`,
  `lint:envelope` (unchanged — no row authors `_temperature`),
  `lint:unconsumed-seams` (every `Placement` field read in W2),
  `lint:binder-models` (no new required or defaulted object arg on `put`;
  `dry`'s `rack` keeps its default — no census change),
  `lint:arg-kinds`, `lint:verb-collisions`, `lint:controller-rows`,
  `lint:lib-statics` (no new static on a lib mixin beyond the existing
  `__validateComposition__` / `fieldMeta` / `_mixinName` shape),
  `lint:object-verbs` (zero), `lint:census`, `lint:test-bootstrap`,
  `lint:drive-scripts` (the drive is a wire file), and the new
  `lint:placement-words`. `docs/lint-family.md` gains a section for the new
  gate at the sweep.

---

## Waves

Five waves, each landable on its own and ending at one commit
(`build(placement W<n>): …`). W1 is the large one; it is mechanical and the
plan says where the semantic lines in it are so review can go straight to
them.

### W1 — the rename: `Surfaced` → `Placing`, one relation named `on`

**Goal.** Every shipped behaviour identical; every name right. After W1 a
placement is a `(host, name)` pair and the only name anything offers is
`'on'`. No vocabulary rows yet — the name is a plain string.

**Implements** D1, D2, D4 (signature only; the `shut` clause lands in W2),
D9, D14, D15, and `Surface → Fitting`.

**Order of work** (commit only at green; the intermediate states do not
land): kernel `lib/` → kernel `platform/` + `api/` → pack `src/` → content
yaml → tests.

1. `lib/spatial/Surfaced.ts` → `lib/spatial/Placing.ts`. `PlacingMixin`,
   interface `Placing`; `placements: string[] = ['on']` (`fieldMeta:
   persistent + authorable`), `getPlacements()` / `setPlacements()`;
   `getPlaced(name?)` (the lazy walk, filtering `getPlacement()` on host
   and, when given, name); `canPlace(item, name): VetoResult` (default:
   name not offered → `no-such-placement`; else ok); `resolvePlacement(word?)`
   (D11's rule, against `getPlacements()` and, for now, a fixed map
   `{ on: ['on','onto'] }` that W2 replaces with the catalogue read).
   `__validateComposition__` keeps the Containable check **and adds the
   Exitable refusal (D13)** — it is one line and belongs with the rename.
2. `lib/spatial/Containable.ts` — the two fields (D2), `getPlacement`,
   `_setPlacement` (`FromContainmentApi`, `@Final`, `@Unshadowable` as
   `_setRestingOn` is), `fieldMeta`; fix the stale "not persisted"
   docstring. `getEnclosingScope()` lands here too, reading `encloses` as
   `false` for everything until W2 wires the catalogue (so it equals
   `getContainer()` in W1).
3. `lib/spatial/Container.ts` — `getLooseContents()`; the card projection
   at `:363` uses it; `captureSlice` writes `ContentPlacement`.
4. `lib/persistence/PersistenceSlice.ts` — `ContentPlacement`.
   `platform/idea/api/PersistableLogic.ts` — `captureItem` type; the
   surface pass re-`place`s by `hostIndex` + `placement`.
5. `api/containment.ts` — `place(item, name, host)` (docstring: the four
   steps); delete `looseContents`; move the `:258` doctrine comment to sit
   above `place`. `platform/idea/api/ContainmentLogic.ts` — `place`
   (D12's restamp is W2; here it is `placeOn` with a name), `move` clears
   the pair.
6. `lib/mixin.ts` (`Mixins.Placing`, the refusal phrase), `api/mixin.ts`
   (`isPlacing`, the type import).
7. Every kernel call site in the Grounding table (Thermal, WaterActivity,
   ElectricityLogic, Condition, ContractLogic, Furnace, restocks,
   Archetype — with its `includes('on')` narrowing, Look, Sense, Staged,
   PutController — mode strings only; D6 is W2), `lib/stuff/Staged.ts`
   (D9), `CommandLogic.ts:2056` comment.
8. `platform/thing/Surface.ts` → `platform/thing/Fitting.ts`; `Oven`,
   `Hearth`, `Campfire` imports; the five pack classes' imports; the seven
   rows' `class:`; `DryingRack`/`ButcherBlock`/`SmokeChimney`/`SaltingTrough`/
   `BarStation`/`Tap`/`Bed`/`Desk`.
9. Content: the **four load-bearing lines** (`put.yaml:34`,
   `butcher.yaml:50,52`, `dry.yaml:51` — `PlacingMixin`; the MQL string
   becomes `reachable:[mixin.PlacingMixin and mixin.ContaminableMixin]`),
   the ten `onto:` → `on:`, the twelve comment mentions.
10. `packages/server/scripts/check-mixin-names.ts` clause 4 (D15) — land
    it **before** step 9 and watch it fail on the four lines, then pass.
11. Tests: rename `Surfaced.test.ts` → `Placing.test.ts`; every test in
    the blast list re-pointed; **new**: both composition refusals throw
    through `StuffApi.create` (a `PlacingMixin(Location)`-shaped class and
    an `ExitableMixin(PlacingMixin(ContainerMixin(Thing)))` class — the
    second must compile, then throw at registration); `getLooseContents`;
    `ContentPlacement` round-trip through capture → materialize with the
    host later in the list than the item; `Staged` `on:` key and the
    two-keys error.

**Acceptance.** `pnpm test:near` + every touched pack's vitest + `lint:family`
green; `git grep -n 'Surfaced\|restingOn\|placeOn\|looseContents\|getResting\b\|canRest\|onto:'`
returns only `Posed.restingOnPath` and history comments. Dave's Bar's
back-bar still hides its eight props (the existing `crafting.md:991`
behaviour, asserted in W5's drive A1-3).

**Commit.** `build(placement W1): Surfaced → Placing — the relation has a name, and one member`

### W2 — the vocabulary, and `put` over N placements

**Goal.** A placement member is a row. `on` is the shipped behaviour
renamed; `in` (`encloses: true`) and `from` exist as vocabulary; `put`
resolves N offers; a shut container refuses with a reason; the thermal
and reach paths consult `encloses`.

**Implements** D5, D6, D7, D8, D12, D16; D4's `shut` clause.

Files: `platform/idea/Placement.ts`, `platform/idea/PlacementCatalogue.ts`,
`packages/content/platform/content/platform/idea/Placement/{on,in,from}.yaml`,
`…/idea/PlacementCatalogue.yaml`, `packages/content/platform/pack.yaml`
(`boot:`), `api/containment.ts` + `ContainmentLogic.ts`
(`placement(name)`; `place` restamps), `lib/spatial/Placing.ts`
(`resolvePlacement` and `canPlace` read the catalogue through
`ContainmentApi.placement`), `lib/spatial/Containable.ts`
(`getEnclosingScope` reads `encloses`), `lib/thermal/Thermal.ts:583,692`
(`getEnclosingScope`), `platform/idea/api/PerceptionLogic.ts:290-310`
(`reachesInto`: an item whose `getEnclosingScope()` is a Placing host that
is a closed Sealable is not reached), `platform/idea/modalities/VisionModality.ts:202`
(a comment: reads the container's light; a region does not change it),
`platform/idea/cmd/inventory/PutController.ts` (D6 in full),
`platform/idea/cmd/perception/LookController.ts` + `SenseController.ts`
(headings by group), `put.yaml` `prepositions: [in, on, from]`,
`packages/server/scripts/check-placement-words.ts` + `package.json`
`lint:placement-words`.

Tests: `PlacementCatalogue.test.ts` (warms the three rows; a row under a
non-platform root qualifies; `peek` cold reads null, `warmed` warms; a
duplicate primary word is named and skipped); `Placement.test.ts` (fields);
`PutController.test.ts` — rewrite over D6: no-prep single offer (table,
chest) · no-prep two offers (oven → `preposition-ambiguous` listing `in, on`)
· typed primary · typed secondary (`on` at a `from`-only host resolves
`from` and the prose says *hang … from*) · typed word nobody offers
(`wrong-preposition` naming what the host takes) · region zero shut
(`'shut'`, target still bound) · enclosing shut via a test-only fixture
composing `Sealable` + `Placing` (`canPlace` → `shut`; `canReach` false;
the `peers` scope still yields it); `Containable.test.ts`
`getEnclosingScope` (enclosing → host; `on` → container; healed host →
container); `Thermal` — `place(item, 'on', host)` inside one container
fires `restamp` (spy) where a plain `move` did not; `Placing.test.ts`
`resolvePlacement`; `check-placement-words` fixture test over a temp view.

**Acceptance.** `put mug on desk`, `put coin in chest`, `put pot on oven`
and the existing wire suites unchanged; `put coin in <shut chest>` refuses
`shut`; `lint:placement-words --list` prints `put` accepting `on, in, from`
and `dry` accepting `on` (missing `from` — W4 closes it).

**Commit.** `build(placement W2): the Placement vocabulary — on, in, from — and put over N regions`

### W3 — the `coldStorage` repair, `CoolboxMixin`, and the icebox

**Goal.** A kitchen's declared cold capability answers honestly, and an
icebox with ice in it is the first thing that meets it.

**Implements** D10, D17, D18, D19, D20, D21. No `Chamber`, no
`Atmospheric` change (§ Deferred seams).

**Order of work.** The satisfier first, on its own commit if the build
agent prefers (`fix(archetype): coldStorage — the space rung reads air,
the holder rung reads cold`), because it is a shipped-defect repair that
stands without the icebox and changes four archetypes' reports.

1. `lib/archetype/Archetype.ts:563-571` — D18. The space rung:
   `MixinApi.isAtmospheric(sp)` and its own air `<= COLD_K` (the sync
   surface: authored `_temperature` first, else `envelopeTemperatureLast()`;
   if `Atmospheric` exposes no method for the authored value, add
   `getOwnTemperatureK(): number | null` beside `envelopeTemperatureLast`
   — a getter, not a new field). The holder rung: `isThermal && isSealable
   && isContainer && getContentsTemperature() <= COLD_K`. Rewrite the
   docstring at `:103-105` to say both rungs and the bar. Extend
   `ArchetypeSatisfaction.test.ts` per D18 (four new cases) and keep the
   two shipped `ColdBox` cases passing by giving the fixture a body at
   273 K where it must satisfy.
   ⚠ Re-read all four declarers (D18) and record what each reports before
   and after in the drive record — the requirements ask for the whole set.
2. `lib/thermal/Coolbox.ts` — `CoolboxMixin` (D19); `lib/mixin.ts`
   `Mixins.Coolbox` + refusal phrase; `api/mixin.ts` `isCoolbox`.
3. `lib/thermal/Thermal.ts` — the two seams (D19): `holderK()` beside
   `heatSourceK()` (`:653-666`), read in `restamp` (`:686-690`) and
   `refreshAmbientFromEnvelope` (`:580-587`) in the same position;
   `effectiveR()` gains the lent-insulation clause. Both consult
   `getEnclosingScope()` (W2), which for region zero is `getContainer()`.
4. `platform/thing/Icebox.ts` (D10);
   `packages/content/generic-objects/content/stuff/thing/fixture/icebox.yaml`;
   `…/stuff/thing/ice-block.yaml` (D20); one `props:` line in
   `hinkley-hills/…/lots/kitchen.yaml` (after `:32`) and
   `trade-cooking/…/location/kitchen.yaml` (after `:62`), each with a
   one-line comment: *seeded shut — it holds cold by being shut; ice is
   carried in*.
5. `docs`: none in-wave (the sweep); but `thermal.md`'s "what holds me"
   paragraph and `Archetype.ts:103` are the two places the truth changes.

**Tests.**
- `Coolbox.test.ts` — an `Icebox` (the real class) in a room at 293 K:
  empty → `getContentsTemperature()` ≈ 293; with an ice block (a `Casting`
  clone with the ice material at 273) → ≈ 273 while shut; open → drifts to
  the room; a `Provision` inside while shut restamps to ≈ 273 (spy on
  `lastAmbientK`), taken out restamps to the room; the block's own
  `getTau()` inside the shut box is larger than outside by the box's
  `insulationR × C` (the lent insulation); the block is `coldestMass()`
  and reads the ROOM as ambient (it must not read itself). ⭐ The melt
  budget: after `(4 kg × 334 kJ) / ((293 − 273) / (R_block + insulationR))`
  seconds of game time the block has destructed and the box reads the
  room — the slate's "hours to melt" item, computed by the sim.
- `Freshness` — two identical `Provision`s held at 273 K and 293 K for
  24 game-hours land in different bands (the arithmetic the live drive's
  step 8 relies on; the only place the outcome is proven fast).
- `ArchetypeSatisfaction.test.ts` — D18's four cases; plus **the whole
  declarer set** re-read through the real catalogue rows: kitchen with an
  empty icebox → `cold` short; with an ice block in the shut icebox → met,
  `by` names the icebox; a room with `_temperature: 279` → met by the
  space; a `Bottle` of ice on the floor → not met.
- **The two lids (D21)** — one room, an open `Chest` holding a
  `Provision` and a shut `Icebox` holding another: `gatherMatter` returns
  the chest's and not the icebox's; open the icebox → both;
  `PerceptionApi.canReach` agrees each time. (In `CraftingLogic`'s own
  suite or `kitchen-affordances.test.ts` — wherever `gatherMatter` is
  already exercised.)
- `Thermal`'s existing suite unchanged (`heatSourceK` still wins for a
  furnace; a body in a plain chest reads the chain).

**Acceptance.** `survey` in a kitchen with no icebox: `a kitchen: not
quite — … wants cold`; with a shut icebox holding an ice block: `a
kitchen: yes — has … cold (an icebox)`. `lint:family` green
(`lint:mixin-names` sees `CoolboxMixin` in `Mixins`; `lint:field-meta`
sees `insulationR`; `lint:unconsumed-seams` — `insulationR` is read by
`effectiveR`'s lent clause; `lint:envelope` unchanged — no row authors
`_temperature`).

**Commit.** `build(placement W3): coldStorage answers honestly — CoolboxMixin and the icebox`

### W4 — the meat hook, and `dry … from`

**Goal.** A new way of sitting added by an author, and the one other verb
that accepts a support learns the word.

**Implements** D11.

Files: `packages/content/trade-cooking/content/trade/cooking/thing/meat-hook.yaml`
(new), `packages/content/hearthworks/content/world/terminus/hearthworks/location/cookhouse.yaml`
(one `props:` line after `drying-rack` at `:119`, with a two-line comment:
*the hook is the one drying support a ham hangs FROM; it affords nothing —
the rack beside it affords `dry`, and a hung ham dries with no verb at
all*), `packages/content/trade-cooking/content/trade/cooking/cmd/crafting/dry.yaml`
(`prepositions: [on, onto, from]`; the `:48-50` comment rewritten:
*hanging is a placement — see `/platform/idea/Placement/from`; the word
is here because this arg accepts a support, which is what
`lint:placement-words` lists*), `packages/content/trade-cooking/src/idea/cmd/crafting/DryController.ts`
(D11), `Dry.test.ts` (from-at-hook: the ham's placement is `(hook,
'from')` and `exposureOf` reads 1; on-at-rack unchanged).

**Acceptance.** `lint:placement-words --list` shows `put` and `dry` each
accepting `on, in, from` (`put`) / `on, from` (`dry`) with nothing
missing; the cookhouse boots with a hook; `put ham on hook` → *"You hang
the ham from the hook."*; `look hook` → *"── Hanging from it: a ham."*;
`look` lists the hook and not the ham; `here:ham` finds it; `dry ham from
hook` accepted.

**Commit.** `build(placement W4): the meat hook — a way of sitting added with a row and a word per verb`

### W5 — the drive

**Goal.** The requirements' drive, run, recorded, and kept.

`packages/wire/tests/placement.dirty.wire.test.ts` (dirty: it hangs the
pantry's `prime-cut`, melts an ice block and stocks food in a kitchen's
icebox; none is regenerated). `declareFile({ packs: ['trade-cooking',
'hearthworks', 'trade-hospitality', 'generic-objects'] })`. Checkpoints,
each able to FAIL (assert `status`, a `notes` reason, or a prose regex
that a broken build cannot satisfy):

- **A1-3** in Dave's Bar: `look` prose does not match `shaker|muddler|strainer`;
  `look back-bar` matches `On it:`; `put <held thing> on bar` → prose
  `put … on`; `get` it back.
- **B4-7, 10** in the cooking kitchen (`/trade/cooking/location/kitchen`,
  which places both the larder and the icebox — so the icebox is
  already there, empty and WARM): ⭐ **criterion 2, both halves, in this
  order.** First `survey` → the kitchen line matches `wants .*cold`
  **with the warm icebox present** (this is the assertion that the
  holder rung's temperature check landed; before D18 the box alone would
  have satisfied it). Then the ice is **seeded** (D20): a wizard session
  `clone`s `/stuff/thing/ice-block` into the room — recorded as the one
  non-player act, per the requirements' explicit allowance; `open
  icebox`; `put ice-block in icebox`; `close icebox`; `survey` again →
  matches `cold \(.*icebox` and not `wants .*cold`. Then `open icebox`,
  `put <food> in icebox` → prose `in the icebox`, not `on`; `look` does
  not list the food; `look icebox` lists it (open); `here:<food>` binds;
  `close icebox`. ⭐ **B8's cause, not its outcome**: `open icebox` then
  `measure temperature <food in icebox>` vs `measure temperature <food on
  counter>` read different bands (`content/platform/idea/reading/temperature.yaml`).
  **B10**: `cook <a shipped recipe>` with the icebox shut and the larder
  as shipped — ok; and the negative half: an ingredient that exists only
  in the shut icebox is NOT gathered (status/notes say what is missing),
  and is after `open icebox`.
- **C11-13** in the cookhouse: `get prime-cut` from the pantry chest;
  `put prime-cut on hook` → prose `hang … from the hook`; `look hook` →
  `Hanging from it`; `look` lists `hook` and not the cut; `here:prime-cut`
  binds. **C14**: `dry prime-cut from hook` → `status: ok` and the prose
  names a span (*"In this air it will take about …"*).
- **D15**: `close pantry chest`; `put <thing> in pantry chest` → `notes`
  carries `controller-rejected` with `reason: 'shut'` and the prose says
  shut; the target bound (no `empty-result` note on `target`).
- **E16** is the author's turn on the running game: the record documents
  the recipe — one member row, one word in **each** view
  `lint:placement-words --list` names (`put`, `dry`), `reload`, use it on
  a row that offers it — and shows the roster output as the answer to
  *which verbs*. A manual checkpoint in the drive record, not a wire
  assertion.

Then the **live drive** in a browser against the running game for **B8
and B9** (twelve game-hours is one real hour at the shipped 12× clock;
run it across a session: the bands diverge, and later the block is gone
and the icebox reads the room), and append the record to this plan.

**Commit.** `drive(placement): <what driving found>`. Then `pnpm test`
once, push, open the MR.

---

## Reachability wiring

Five links per capability — verb · affordance · data · boot · arg gate.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| `put <food> in icebox` | `put` (platform, core) | core verb, afforded by nobody — always present | `icebox.yaml` → `Icebox` (a Container: region zero); the `in` row supplies the words + prose (D17) | `PlacementCatalogue` `boot:` entry warms `in`; lazy `warmed()` on a cold miss | `put.yaml` target `requires: [VisibleMixin, ContainerMixin\|PlacingMixin]` — a Container ✓; item `ContainableMixin` ✓ |
| the kitchen reports cold MET | `survey` (platform, core) | none — `survey` evaluates every room archetype | `kitchen.yaml:22` (shipped) + the repaired satisfier + an `Icebox` holding a cold body | `ArchetypeCatalogue` (shipped `boot:` entry) | none |
| the icebox is cold | — | — | `ice-block.yaml` (a `Casting` at 273 K); `insulationR` on the row | — | the shut lid (`open: false` seeded) |
| `put ham on hook` → hang | `put` | core | `from.yaml` row; `meat-hook.yaml` `placements: [from]`; cookhouse `props:` line | catalogue | `put.yaml` `prepositions: [in, on, from]` (the word); `requires` as above |
| `look hook` drill-in | `look` | core | the row's `heading` | catalogue | none |
| `dry ham from hook` | `dry` (`trade-cooking`) | `DryingRack.commandContributions.peers` — the rack in the cookhouse | `dry.yaml` rack arg `prepositions: [on, onto, from]` | catalogue | `requires: [PlacingMixin]` ✓ |
| `butcher … on block` | `butcher` | `ButcherBlock` | `butcher.yaml` `default: reachable:[mixin.PlacingMixin …]` + `requires: [PlacingMixin]` | — | rename only |
| a pack's own member | `put` (+ its own verb if it cannot edit `put.yaml`) | — | `/<root>/idea/Placement/<name>` row + a host row `placements: [<name>]` | the catalogue's infix warm across every root | the one word in each support-accepting view (`lint:placement-words --list` names them) |
| shut refusal, region zero | `put` | — | any `Sealable` Container (the icebox, the pantry chest) | — | none — the verb checks `isOpen()` |
| the two composition refusals | — | — | — | `assertComposable` at first registration | — |

⚠ Every one of these fails closed and silent if missed: a `requires:` still
naming `SurfacedMixin` refuses every target before any controller runs and
no controller test sees it (D15 is the catch); a catalogue with no `boot:`
entry reads `null` for every member on a fresh process until the first
lazy miss (the lazy path is why `peek` is never the only read in a verb);
an icebox row seeded `open: true` would be a cold box that never holds
cold and a `survey` that never flips.

---

## Acceptance-criteria coverage

| # | criterion | wave | proof |
|---|---|---|---|
| 1 | food in the icebox is measurably better kept, and stops being kept once the ice melts | W3 (+ W5 live) | `Freshness` at 273 vs 293 K; `Coolbox.test.ts` melt budget; wire: the temperature reading differs; live drive B8-9 |
| 2 | ⭐ a kitchen with an icebox reports its cold capability as MET | W3 | `ArchetypeSatisfaction` real-row cases; wire B4-5 (`survey` before/after) |
| 3 | a ham hangs from a hook, is described as hanging, found on the hook, not in the listing, dries fully exposed | W2 + W4 | wire C11-14; `Dry.test.ts` exposure = 1 through the placement |
| 4 | a new way of sitting is a row and a word per supporting verb, and the author can find the set | W2 (the mechanism + the roster) · W4 (the exemplar) | `from` ships as the platform's own row; `lint:placement-words --list`; the record replays E16 with a fourth member |
| 5 | nothing that worked stopped; `cook` still works at a kitchen whose larder is untouched and open | W1 · W3 (the two-lids test) · W5 | the whole suite; wire A1-3, B10 |
| 6 | a region can always be named; refusals give a reason | W2 | `PutController.test.ts` shut cases assert the target bound + reason |
| 7 | putting into a shut container is refused and says why | W2 | wire D15 |

Nothing unmapped. Criterion 2 is the amended one (`44740c717`): warm
icebox → unmet, then ice → MET, in that order.

---

## Test & gate strategy

- **Unit** (colocated `__tests__/`, `pnpm test:near` in the loop): the
  renamed suites; the new ones named per wave. ⭐ The two composition
  refusals are proven by **registering a concrete class and catching the
  throw**, in the same file, both directions (a class that must throw, a
  class that must register). An earlier pass asserted one of them from the
  types and was wrong.
- **The satisfier** is proven against the **real archetype rows** (the
  test already reads `generic-objects/content/archetypes/`), for all four
  declarers, before and after — a fixture-only proof would miss that the
  ice bin used to satisfy `cold`.
- **Pack suites**: `trade-cooking` (`Dry.test.ts`,
  `kitchen-affordances.test.ts`), `trade-hospitality` (`menu.test.ts`),
  `eternal-university` (`Bed.lieable`, `DormHouseplant`) — run each
  touched pack's own `vitest` every wave.
- **Wire**: `placement.dirty.wire.test.ts` (W5). It asserts envelopes and
  reasons, never a clock; the one wizard act (seeding the ice block) is
  named in the record.
- **Live**: B8 and B9 in a browser, recorded.
- **Gates**: `lint:family` every wave. The new gate and the new clause land
  in the wave that needs them (W1: mixin-names clause 4 — before the
  content edit; W2: `placement-words`). W3 adds `Mixins.Coolbox`.
- **Full suite** (`pnpm test`, ~15 min) **exactly twice**: before the MR
  opens, and at `/finalize`. Check
  `git status --short | grep -vE '^.. (docs/|CLAUDE\.md|.*\.md$|packages/content/)'`
  is empty before re-running.
- **DB**: drop this worktree's dev DB after W1 (the persisted shape) and
  again before W5 (the kitchens' and cookhouse's `props:` once-guard —
  the icebox and hook lines never reach a booted room otherwise).

---

## Risks & opens

1. **`Chamber` is gone from this build by decision, not by omission.**
   If a review comment asks for a host offering `in`, the answer is
   D17 and § Deferred seams, not a class. Nothing to ask.
2. **D18's holder rung adds `isContainer`.** A `Bottle`/`Flask`/`Thermos`
   holds bulk, not things, and never was cold *storage*; if any wire or
   unit test relied on a vessel satisfying `cold`, it was asserting the
   defect. Grep `ArchetypeSatisfaction` and `wire/tests` for `cold` before
   W3.
3. ⚠ **B8/B9 are live-drive checkpoints, not wire ones.** The harness has
   no clock; the food-safety precedent forbids proving a slow arc with a
   wizard act. The wire proves the cause (the temperature reading, the
   survey flip), the unit tests prove the arithmetic (bands; the melt
   budget), the live drive proves the outcome. `insulationR` and the
   block's 4 kg are content dials: if the block is gone before the bands
   diverge, raise the R or the mass — authoring, not a defect.
4. **Dave's Bar's survey changes** (D18): hospitality's `cold` stops
   reading MET by the empty ice bin. That is the truth (its cellar is
   285 K, above `COLD_K`), and nothing enforces a verdict
   (`Archetype.ts:445-448`), but a wire test somewhere may assert the
   bar's line — grep `wire/tests` for `survey` before W3 and re-point it.
5. **The `Thermal` seams touch the hottest path in the model** —
   `effectiveR()` runs on every reconcile of every Thermal body. Both
   clauses must short-circuit on `getEnclosingScope()` not being a
   Coolbox before any other read; review W3 for that ordering.
6. **The melting block's water is dropped** (`doMelt` finds no `Floor`
   inside a box). Honest enough for v1 (a drip tray is a row somebody
   authors later); recorded on the fridge pack slate.
7. **`from`'s row lists `on` as a secondary word.** A host offering both
   `on` and `from` takes `put X on host` as `on` (primary wins). No such
   host ships; the rule is stated in D6 and tested.
8. **The hook's keyword.** The drying rack's keywords include `hooks`; the
   hook row uses `hook` and `meat-hook`. If `look hook` disambiguates
   against the rack, rename the row's keyword to `meat-hook` only and let
   the prose teach it — decide in W4 by driving.
9. **`Placement` is also combat's `type Placement`.** Different modules,
   no runtime clash. Leave combat alone; note it in the class docstring.
10. **`userFacingDetail` on `Placing` has no reader.** `lib/ground/Floor.ts:105`
    authors it; nothing consumes it. Out of scope; a finding for the
    narrowing slate.
11. **`Posed.restingOnPath`** is the second "resting on" (posture). Not
    merged, not renamed here — the slate already records it.
12. A pack that needs `hang` as its own verb writes it over
    `ContainmentApi.place(item, 'from', host)` — the `cure`/`dry`/`smoke`
    rule. Not needed by this build.

---

## Deferred seams

Clean attach points; the slate each leaves as.

- ⭐⭐ **`Chamber` and the `Atmospheric` widening** — owner:
  [fridge-design-pack](../slates/builds/fridge-design-pack.md) (the
  freezer compartment is the first honest composer); the type finding
  cross-references
  [base-class-narrowing-slate](../slates/builds/base-class-narrowing-slate.md)
  finding #1. Kept in full because it is the most expensive thing here
  to rediscover:
  - **The design as written does not compile.** The partition slate's
    `Chamber = Atmospheric(Placing(Detailed(Thing)))` fails on
    `AtmosphericMixin<TBase extends MixinConstructor<Stuff & Container>>`
    (`lib/biome/Atmospheric.ts:261-263`), and `BiomeApi.resolveTemperatureFor`
    / `BiomeLogic`'s walk are typed `Stuff & Container` throughout
    (`:256`, `:921`, `:994`, `:1129`, `:683`, `:815`). The walk itself
    needs nothing of a Container: `stepOutward` is `isContainable →
    getContainer()`, `outermost.getZone()` is on any Stuff, and
    `syncChainWalk` reads an Atmospheric cursor's own `_temperature` on
    its first step — so a Containable, Atmospheric, non-Container thing
    with an authored `_temperature` resolves correctly the moment the
    types admit it. **The design is right; the types are wrong.**
  - **The fix is a widening plus one seam, never a branch on Placing.**
    `AtmosphericMixin<MixinConstructor<Stuff>>`; the eleven
    `as unknown as Stuff & Container` casts become `Stuff`; the three
    `getContents()` walks (`:455` `restampThermalContents`, `:786`, `:936`
    — the last two inside the envelope integration, which never runs for
    a Thing because `getVolume()` is null) call a new
    `protected occupants(): readonly Stuff[]` whose default is
    `MixinApi.isContainer(self) ? self.getContents() : []`, and **`Chamber`
    overrides it** to `this.getPlaced('in')`. The class whose air is a
    placement is the class that says so; an `isPlacing` branch inside the
    mixin would be the wrong-host tell (a guard re-narrowing the host
    set). `BiomeLogic`'s `resolveTemperatureFor`, `outsideTemperatureFor`,
    `resolveEnvelopeTemperature`, `runChainWalk`, `syncChainWalk`,
    `stepOutward`, `outermostZonePathOf`, `skyExposedWalk`, `outsideKFor`
    and the `BiomeApi` facade retype `scope`/`cursor` to `Stuff` and
    `Stuff & Container & Atmospheric` to `Stuff & Atmospheric`. Semantics
    unchanged. The widening is a claim about every Atmospheric composer
    — none may assume `getContents()` on `this` — and the compiler
    enforces it; `lint:envelope` is untouched. About a dozen signature
    retypes; review for casts, not logic.
  - **`Chamber` itself**: `platform/thing/Chamber.ts` =
    `AtmosphericMixin(PlacingMixin(DetailedMixin(Thing)))`, class default
    `placements = ['in']`, `fixedInPlace = true`, `occupants()` →
    `getPlaced('in')`. A thing placed in it has `container = the outer
    holder` and `getEnclosingScope() = the chamber`; `Thermal.restamp`
    resolves the chamber's own air on the chain walk's first step. Tests:
    registers (both composition refusals silent); `occupants()`; a
    `Provision` placed `in` a Chamber authored at 281 K restamps to 281
    while one `on` a `Fitting` in the same room reads the room's.
  - **Why not now**: with the icebox a plain insulated container (D10)
    nothing in this build would compose it, and a class with no composer
    plus a kernel widening with no reader is the *feel/taste shipped
    without ever running* failure. `in` keeps its reader through `put`'s
    region zero (D17).
- **Stepping outward for ambient** — `getEnclosingScope()` is the seam;
  finding #2's repair (a loaf in a backpack warms) is *step outward through
  a non-atmospheric container until a scope answers* → the narrowing
  slate, finding #2, which this build **unblocks** and does not do.
- **A binder sentinel for placement words** (`prepositions: placement`,
  resolved from the catalogue at bind time, so the per-verb word costs
  zero) → a "Left" line on
  [containment-partition-slate](../slates/builds/containment-partition-slate.md),
  with D8's reasoning for not building it for two verbs.
- **Bulk ice melting** (`reconcileBulkPhase` has freeze and boil, no melt)
  and **the icebox's drip** (`doMelt` with no `Floor`) → the fridge pack.
- **Who sells ice** — the ice block row exists; the retail row and the
  icehouse-keeper are [preservation-slate](../slates/tails/preservation-slate.md)'s.
- **A `Sealable` Chamber** (a compartment with a door) — `canPlace`'s
  `shut` clause and `canReach`'s consult are built and fixture-tested in
  W2; the first shipped class is the fridge pack's.
- **`Posed.restingOnPath` rename**, the **`distinguishing` prompt gap**,
  and **`userFacingDetail`'s missing reader** → recorded on the partition
  and narrowing slates respectively.
- **Grouping identical items in a listing** → legibility-slate Part C
  (unchanged).

---

## Critical files

Read first, in this order:

1. `docs/requirements/placement-requirements.md` (as amended,
   `2af1fac34`) — the drive is the exit.
2. `docs/slates/builds/containment-partition-slate.md` — the design.
3. `packages/server/src/mud/lib/spatial/Surfaced.ts`,
   `Containable.ts:195-400`, `Container.ts:150-270, 340-460`.
4. `packages/server/src/mud/api/containment.ts:240-290`,
   `platform/idea/api/ContainmentLogic.ts:70-140, 200-260`.
5. `packages/server/src/mud/platform/idea/cmd/inventory/PutController.ts`
   + `packages/content/platform/content/platform/cmd/inventory/put.yaml`.
6. `packages/server/src/mud/lib/persistence/PersistenceSlice.ts:1-80`,
   `platform/idea/api/PersistableLogic.ts:630-740`.
7. ⭐ `packages/server/src/mud/lib/archetype/Archetype.ts:95-125, 440-470, 495-575`
   + `platform/__tests__/ArchetypeSatisfaction.test.ts:40-70, 240-275`
   + `platform/idea/cmd/perception/SurveyController.ts:130-170`
   + the four archetype rows (kitchen, hospitality, brewhouse, winery).
8. `packages/server/src/mud/lib/thermal/Thermal.ts:380-450, 560-740, 812-870`,
   `lib/thermal/Meltable.ts`, `platform/thing/Casting.ts`,
   `platform/thing/Flask.ts`, `platform/thing/Bottle.ts:35-45`.
9. `packages/content/trade-bottling/content/trade/bottling/idea/material/ice.yaml`,
   `…/thing/ice-bag.yaml`, `trade-hospitality/…/thing/ice-bin.yaml`,
   `trade-hospitality/src/thing/IceBin.ts`.
10. `packages/server/src/mud/platform/idea/ReadingCatalogue.ts`,
    `platform/idea/LocomotionMode.ts:1-60`,
    `packages/content/platform/content/platform/idea/LocomotionMode/walk.yaml`,
    `packages/content/platform/pack.yaml:51-90`.
11. `packages/server/src/mud/lib/stuff/Staged.ts:100-125, 255-375`.
12. `packages/server/src/mud/lib/social/EmoteGrammar.ts:140-165` (the
    prose precedent).
13. `packages/content/trade-cooking/…/cmd/crafting/dry.yaml`,
    `butcher.yaml:35-60`, `src/idea/cmd/crafting/DryController.ts`,
    `src/thing/DryingRack.ts`.
14. `packages/content/generic-objects/content/stuff/thing/fixture/larder.yaml`
    (read, do not touch), `packages/content/trade-cooking/content/trade/cooking/location/kitchen.yaml:55-75`,
    `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/lots/kitchen.yaml:25-35`,
    `packages/content/hearthworks/content/world/terminus/hearthworks/location/cookhouse.yaml:40-125`.
15. `packages/server/src/mud/platform/idea/api/CraftingLogic.ts:462-497`
    (the gather walk — the two-lids proof).
16. `packages/server/scripts/check-mixin-names.ts:1-60`,
    `check-placement-words.ts` (new; model on `check-mixin-names`' reader).
17. `packages/wire/tests/food-safety.dirty.wire.test.ts:1-80`,
    `packages/wire/src/harness/session.ts:80-110, 530-600`.
18. `docs/subsystems/spatial.md:258-360`, `spoilage.md:490-510`,
    `thermal.md:60-110`, `crafting.md:985-1010`, `persistence.md:620-630`,
    `fire.md:170-180, 245-250`, `architecture.md:1005-1010` — the
    sentences the sweep rewrites; plus `Archetype.ts:103`.

---

## Wave log

*Written during the build, for the reviewer who has forgotten. One
entry per wave: what landed, what the wave decided, what surprised it.*

### W1 — done (`f9107486f`)

The rename landed whole and every shipped behaviour is identical.
`pnpm build` is type-clean across the monorepo; the touched server
suites plus trade-cooking · trade-hospitality · eternal-university ·
terminus · generic-objects all pass; `lint:family` 56/56; `pnpm lint`
0 errors.

**Decided in the wave.**

- **D9's placement key is the member NAME, not a preposition word.**
  `{ template, on: … }` works; `{ template, onto: … }` now refuses with
  `no-such-placement`, because `onto` is a *word* the `on` member
  accepts, not a member. The reserved keys are `template`, `as`,
  `count`; everything else is read as a member, which is what makes a
  member a pack ships tomorrow work here with no kernel change. One
  shipped test was written with `onto:` and was updated.
- **`getEnclosingScope()` returns the container, flatly.** The plan let
  W1 read `encloses` as false for everything; rather than route the
  read through an Api door that does not exist yet, the W1 body IS
  `getContainer()` with a docstring saying whose claim `encloses` is.
  W2 adds the branch. No stub, no forward-referencing Api method.
- **The drill-in heading is still the literal `On it`.** Grouping by
  member landed in `look`/`sense` (the loop is there), but the heading
  comes off the member's row, which is W2 — and a `headingFor()` helper
  duplicated across two controllers would have been exactly the free
  helper the export discipline refuses. W2 reads
  `ContainmentApi.placement(member)`.

**Surprises.**

- ⭐ **`lint:mixin-names` clause 4 works, and it was worth landing
  first.** Reverting the two `trade-cooking` lines to `SurfacedMixin`
  made it fail on both — including the one inside `butcher.yaml`'s MQL
  `default:` string, which no other gate and no compiler can see. Both
  restored; the negative run is the proof the clause is not vacuous.
- **`Containable`'s docstring was lying about persistence** — it said
  the relation "resets to null on hydrate", which stopped being true
  when `captureSlice` learned to record it. Fixed in passing.
- `scripts/__fixtures__/field-meta-golden.json` is a FROZEN record of
  an old codemod, not a live comparison, so the `Surface.ts` path in it
  was reverted rather than updated — its `className` still reads
  `Surface` and always will.

### W2 — done (`6e4c2e10e`)

The vocabulary ships and `put` resolves N offers. 330 files / 3654
tests across the touched server trees; `lint:family` 57/57 (the new
gate is in the derived roster).

**Decided in the wave.**

- ⭐⭐ **A cold catalogue degrades to the SHIPPED BEHAVIOUR, never to
  silence.** The first cut skipped a member whose row had not warmed —
  and made every `Placing` host unaddressable in any process where the
  roster was cold, which five tests caught at once. A member with no
  live row now answers to its own name everywhere
  (`Placing.resolvePlacement`, `PutController.offersFor`,
  `Containable.getEnclosingScope`, the drill-in heading), so the worst
  case is *the model before the vocabulary*. The consequence is worth
  stating: a member's SECONDARY words are its ROW's claim, so
  `put ham on hook` needs the roster warm, and the cold refusal is
  asserted beside the warm success rather than left to be discovered.
- ⚠ **`lint:placement-words` gates less than the plan sketched, on
  purpose.** D8 asked it to check that every preposition on a
  placement-accepting arg is carried by a member. Written that way it
  immediately flagged `butcher <carcass> at <block>` — where `at` says
  *where you do it*, not *how it sits* — and there is no way to tell a
  verb's own grammar from a stale placement word by inspection.
  Guessing would make the gate refuse correct content, so the gate
  holds the three things that are always wrong (a member with no
  preposition · two members claiming one PRIMARY word · `put` not
  accepting a member's primary word, since `put` is the universal
  placement verb) and the `--list` roster carries the rest. The roster
  is the part an author needs anyway.
- **The `Thermal` ambient scope goes through one function.** Both the
  pull side and the push side call `ambientScopeOf`, because the day
  they disagree is the day a compartment keeps its cold in one path
  and not the other.

### W3 — done (`4c7e6ff51` the satisfier, `52d83a112` the box)

**⚠⚠ D22 — a NEW FINDING, and the melt half of the wave was re-planned
around it.** `reconcilePhase()` had exactly three callers in the whole
tree: a lit `Furnace`'s heat pass, two spell endpoints, and tests. So
**nothing in the world melted from being warm** — a block of ice on a
warm floor sat at its melting point forever with the latent
accumulator untouched. The phase engine was complete and had no
ambient driver, and the plan's *"the melt falls out of the shipped
reconcile"* was wrong. `reconcileThermal` now drives it immediately
after the drift that makes a body warm, narrowed to `Meltable` hosts
(the `Bulkable` freeze/boil rung has its own callers and would
double-run). ⭐ This is a shipped-defect repair riding in the build
that needed it, and it is the single most reviewable line here.

**Other decisions.**

- **The Coolbox interior is a READ, not a cached ambient.** First cut
  stashed it in `lastAmbientK` from the ambient-refresh hook, and
  `restamp` overwrote it from the chain on the next move. It is an
  override of `getContentsTemperature()` now — which is the extension
  point that method's *"a vessel whose Thermal IS its contents"*
  default exists for. The box's walls staying near room temperature is
  not a fudge; it is what a zinc-lined chest of ice is.
- **The `surface` need now asks for a host that offers `on`**
  specifically. Before the vocabulary there was one member and the
  distinction could not be drawn; a compartment and a hook are both
  `Placing` hosts and neither is a work surface.
- `room-archetypes.test.ts` failing twice was that test **working** —
  it exists to force a new fixture class to be declared deliberately,
  and `Icebox` is the second one ever.

### W4 — done (`334dfbcf4`)

The claim cashed: a ham hangs from a hook, and the cost was one
`Placement` row (W2), one `Fitting` row, one `props:` line, and one
word on each of the two views `lint:placement-words --list` names. No
class, no controller, no kernel change.

- **Risk 8 (the hook's keyword) decided without driving.** The rack's
  keywords already carry `hooks`; the hook row takes `hook` and
  `meat-hook` only. The collision is visible in the two rows.
- ⚠ `lint:census` caught `_materialPath: /stuff/idea/material/metal/iron`
  on the new row — a path resolving to no content row (the real one is
  `element/iron`). Exactly the silent content defect the derived family
  exists for, found before the drive rather than by it.

## Drive record

*(appended at build time — the wire run's output and count, the live
drive's B8, and E15 replayed by hand.)*
