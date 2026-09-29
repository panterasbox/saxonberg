# Base-class narrowing — implementation plan

Executes [base-class-narrowing-requirements](../requirements/base-class-narrowing-requirements.md).
**Kind:** refactor/sweep with one shipped-defect repair. **Leads from:**
kernel; first consumer is the wiki's `<composition>` panel (what a player
reads), and for the thermal repair a perishable in a worn bag.

Five waves, all kernel-side except one content row (the coach) and three
wiki-starter pages. Nothing new is invented except **an authored interior
volume on `ExitableVessel`**; everything else is subtraction, one moved
mixin, and one repair.

⚠⚠ **Read § Where this plan departs from the requirements before
building.** Six findings from grounding change the shape of the work,
two of them because the requirements doc states a fact about the code
that is not true.

---

## Grounding

Every fact below was taken by opening the file this cycle, against
`164c2d2ad` (branch `build/narrowing`).

### The `Atmospheric`-on-`Vessel` claim (register #1)

- `lib/stuff/Vessel.ts:59` — `const VesselBase = AtmosphericMixin(ContainerMixin(Thing))`.
  `:110` overrides `enclosureDefaults()` (the vessel IS matter; wall
  `VESSEL_WALL_M = 0.01`). That override and its `EnclosureDefaults`
  import are orphaned the moment the mixin leaves — they move with it.
- **Fifteen composers**, all verified by `grep "extends Vessel\|(Vessel)"`:
  kernel `platform/thing/Vessel.ts` (the twin), `TipJar`, `equipment/Pack`,
  `BankCounter`, `equipment/Handcart`, `lib/retail/Stock`,
  `lib/boundary/ExitableVessel`; packs `trade-hospitality/CheckRack`,
  `trade-shopkeeping/ConsignmentShelf`, `eternal-university/Footlocker`,
  `trade-haulage/Warehouse`, `trade-haulage/DepotCounter`,
  `transport/Barge`, `transport/HaulageRig`, `transport/Coach`.
- **37 rows** name one of those classes (the census said 38; an
  `extends:` child may account for the one). **Zero** of them author any
  atmospheric field (`_temperature`/`_pressure`/`_humidity`/`_wind`/
  `_gravity`/`_atmosphere`/`_biomePath`/`enclosure`/`weatherPin`/
  `_detail*`) — grepped over all 37.
- ⚠⚠ **Only `Coach` extends `ExitableVessel`.** `transport/src/thing/Barge.ts:29`
  is `VehicularMixin(BulkableMixin(DrivableMixin(SlottedMixin(MobileMixin(Vessel)))))`
  and `HaulageRig.ts:46` is `VehicularMixin(BulkableMixin(HaulableMixin(Vessel)))`.
  Both are plain `Vessel`s. The requirements' *"`ExitableVessel` ships
  three composers — `Coach`, `Barge`, `HaulageRig`"* is false.
- ⭐ **Nobody's `context.location` is ever a plain `Vessel`.** A driver
  or rider occupies a SLOT on the vessel and stands in the room
  (`lib/spatial/Mobile.ts:466-471` — *"only an occupant that stands
  OUTSIDE the mover rides the ripple"*; `MountController.ts` occupies a
  slot, never moves the rider into the vessel). The only way to be
  *inside* a vessel is `go <vessel>` through `ExitableVessel.getEntryExit()`.
  So the four sense reads that key off `isAtmospheric(context.location)`
  are only ever reached inside a `Coach`.
- The four reads, verified: `FeelController.ts:151` (`feelAmbient` —
  falls to the base *"You don't perceive anything notable here"* when the
  location is not atmospheric), `:200` (`temperatureCause`), `:239`
  (`feel <host>.<detail>` touch band); `SmellModality.ts:98` and
  `SoundModality.ts:93` (`inlineAtmosphere` — returns `null` for a
  non-atmospheric scope, which is *default air*, not silence);
  `TraceAtmosphereController.ts:86,126,129` (biome path + derived
  volume/ceiling lines; the six trace lines themselves come from
  `BiomeApi.traceResolveAll`, which walks outward and never needs the
  scope to be atmospheric). **Only `feel` goes silent.**
- `lib/biome/Atmospheric.ts:1077` `getVolume()` returns `null`; only
  `lib/location/CartesianLocation.ts:226` and
  `platform/location/SphericalLocation.ts:90` override it. `:623`
  `envelopeApplies()` is `getVolume() !== null && _temperature === null && !BiomeApi.isSkyExposed(self)`.
- ⚠ `BiomeLogic.ts:632` `skyExposedWalk` walks OUTWARD to the nearest
  atmospheric ancestor with a biome. A coach with no `_biomePath` parked
  in a street inherits the street's sky-exposed biome, so **the shipped
  `envelopeApplies` would say `false` for a coach on the road** — the
  envelope would never run, even with a volume.
- `Atmospheric.ts:639` `openExteriorOpenings()` counts an obvious exit
  with no door (or an open door) whose far side is sky-exposed.
  `ExitableVessel`'s synthesized `out` exit carries `this.getDoor()`;
  the coach row authors **no `door:`**, it authors `open: false`
  (`SealableMixin` — `Coach.ts:90`). **The shipped count would read a shut
  coach as standing open.**
- `Atmospheric.ts:1023-1038` — the weather-locality memo
  (`_weatherLocalityPath` / `_weatherLocalityResolved` /
  `_weatherLocalityPromise`) is `private` and resolved ONCE. Correct for a
  room; stale for a vessel that crosses a locality boundary.
- `BiomeLogic.ts:921` `resolveEnvelopeTemperature(scope)` applies the
  envelope only when `scope` itself is atmospheric with an envelope;
  `:877` `outsideKFor` runs the chain (`syncChainWalk`, `:1214`
  `runChainWalk`) from the scope outward through `stepOutward`
  (`:683` — `getContainer()`, any container, atmospheric or not) and adds
  weather only when the answer came from the sky.
- The coach: `packages/content/transport/content/system/transport/thing/coach.yaml`
  — `class: /system/transport/thing/Coach`, `mass: 700`, `open: false`,
  `controllerSlot: "driver:1"`, no `_materialPath`, no atmospheric field,
  and an author's comment reasoning FROM the composition (*"`Vessel` is
  `Atmospheric(Container(Thing))`"*). ⚠ **No locality places a coach.**
  The only reference is `transport/content/archetypes/passenger-conveyance.yaml`
  (`materializesOnto: /system/transport/thing/coach`) and its own
  comment: *"no coach line does [ship]"*. The drive has to clone one.
- Tests pinning the old shape: `lib/biome/__tests__/Atmospheric.persistence.test.ts:28`
  (*"Vessel composes AtmosphericMixin"*). `Thermal.restamp.test.ts` and
  `Coolbox.test.ts` do not use a Vessel as the atmospheric holder
  (Coolbox says so at `:8`).

### The thermal defect (register #2)

- `lib/thermal/Thermal.ts:318` `ambientScopeOf(host)` = `host.getEnclosingScope()`
  (`lib/spatial/Containable.ts:414` — the enclosing placement host when
  the member `encloses`, else `getContainer()`). Used by three readers:
  `enclosingCoolbox` (`:332`, the immediate holder — must stay immediate),
  `refreshAmbientFromEnvelope` (`:676`, the pull side) and `restamp`
  (`:843`, the push side).
- `:677` — `if (scope === null || !MixinApi.isAtmospheric(scope)) return;`
  then `scope.envelopeTemperatureLast()` (`Atmospheric.ts:998` — `null`
  unless the envelope applies). So a loaf whose scope is a bag never
  updates `lastAmbientK`: today because the bag is atmospheric with no
  envelope; after the move because the bag is not atmospheric. **The move
  alone repairs nothing.**
- Push side `:843-855` — `BiomeApi.resolveTemperatureFor(scope)` on the
  bag: the chain walks outward for the biome value but
  `resolveEnvelopeTemperature(bag)` returns `null`, so a loaf restamped
  inside a bag inside a warm shop gets the biome default, not the shop's
  envelope. Same defect, other path.
- ⚠⚠ **A worn bag's container is the wearer, not the room.** A creature
  is a `Container` (`Creature.ts:145`), so bag → carrier → room is TWO
  steps, and the carrier is not atmospheric either. The requirements'
  own drive (steps 4–6, *"put it in the bag … carry it somewhere"*) is
  the worn-bag case. **"One step" cannot satisfy the requirements' own
  drive.** See § Departures, item 3.
- `restamp` fires from `Thermal.onMoved` (`:888`), from
  `ContainmentLogic.place` (`:148`) and from
  `BiomeApi.restampThermalContentsOf` (`WeatherLogic.ts:731`, sky rooms
  only, immediate contents only). A loaf in a carried bag is never
  restamped by the carrier walking — the PULL side is the only thing
  that can track the world for it.
- `Touch.ts:40-46` bands: `cold` <273 K · `cool` <290 · `comfortable`
  <305 · `warm` <320 · `hot` <345 · `scalding`.

### `Branded` (register #3)

- `lib/creature/Creature.ts:139-140` — `ChattelMixin(BrandedMixin(PostmortemMixin(…)))`,
  outermost. The comment at `:120-123` justifies it as *"branding
  livestock is what marks were invented for"*. `Creature` reads it
  nowhere.
- Readers of the mixin anywhere: `CorpoLogic.ts:45` `brandKeyOf(obj)`
  (duck-typed `getBrandKey()`), `CraftingLogic.ts:541` `carriesBrand`
  (via `CorpoApi.brandOf`), and the mixin's own `markupAugmenters`
  (*"a product of Veshko"*). No `isBranded(` narrowing anywhere, no view
  `requires: BrandedMixin`. Other composers: `NeonSign.ts:27`,
  `GradedReceptacle.ts:61` — untouched.
- Descendants of `Creature`: `platform/agent/Corpse.ts:21` (`extends Creature`),
  `lib/creature/KeptAnimal.ts:82` (base `NamedMixin(Creature)`),
  `lib/character/Character.ts:116` (→ `Avatar` → `Shade`, `Cast`, `Extra`),
  `trade-ranching/src/agent/Livestock.ts:60` (`HandledMixin(HandlingMixin(Creature))`),
  `trade-ranching/src/agent/WorkingAnimal.ts:30` (`HandledMixin(KeptAnimal)`),
  `trade-fishing/src/agent/Fish.ts:42` (`ContaminableMixin(KeptAnimal)`).
- Rows on the animal rungs: `/stuff/agent/cat` and
  `/trade/mining/agent/canary` (`KeptAnimal`), `/trade/ranching/agent/livestock`
  + `ox` (`Livestock`), `farm-dog` (`WorkingAnimal`). None authors
  `_brandKey`.
- ⚠ `Livestock.ts:18-22` docstring: *"branding it inherits from `Creature`,
  which gained `ChattelMixin` and `BrandedMixin` in this same wave"* —
  the ranching build's stated reason for the composition. Moving the
  mixin to `KeptAnimal` **alone** strips it from the one class the
  justification names. `Livestock` does not extend `KeptAnimal`.
- `KeptAnimalBase` (`:91`) has `PersistableMixin` OUTERMOST on purpose
  (the `pinsResidency` note); anything added goes inside it.

### The seven row-less classes (register #6)

All seven: **zero `class:` rows** (grep over every yaml in `packages/content`
and `packages/server/src`), **zero non-test imports** (every non-test hit
is a comment, a doc, or an unrelated identifier — the client's
`StartScreen`, `check-ground.ts`'s comment, `PressBoard`'s *"Window length"*).

| class | composes | non-test references | what else exercises the substrate |
|---|---|---|---|
| `platform/thing/Bench.ts` | `extends Chair` (empty body) | `Chair.test.ts:11,37` imports it; `ArchetypeCatalogue.test.ts:30` defines its OWN `class Bench` | `Chair`, `FoldingChair` rows |
| `platform/thing/Candle.ts` | `LightSource(Combustible(Thermal(Reserved(Thing))))` | `Furnace.ts:221` comment; `Candle.test.ts`; `LightSource.test.ts`, `VisionModality.shadow.test.ts`, `Window.integration.test.ts`, `Furnace.test.ts:102` (comment). `Door.light.test.ts:26` and `SmellModality.test.ts:26` define their OWN local `Candle` | `Firewood.ts:15` composes `Combustible`; `Lamp`, `PortableLight`, `Campfire`, `Forge`, `Oven`, `Hearth`, `Still`, `SconceLamp`, `ManaLamp` compose `LightSource`. Neither subsystem dies. |
| `platform/thing/Remote.ts` | `Detailed(Thing)` (empty body) | `Screen.ts`; `Display.test.ts` | the `remote` pairing policy on `DisplayMixin` is data (`remote:` names any row path) — it needs no class |
| `platform/thing/Screen.ts` | `Display(PostRegistration(Fixture(Detailed(Thing))))` | `Remote.ts`; `Display.test.ts`, `WatchController.test.ts:31,182,198`, `GetController.test.ts:138` (comment) | `Tablet.ts:12` composes `DisplayMixin` and has two rows (`saxonberg-lounge` + `trade-hospitality` `house-tablet.yaml`); `tpa/TpaTerminal.ts:85` too. **`watch … on <screen>` keeps a proof: the tablet.** |
| `platform/thing/Window.ts` | `Sealable(Boundary)` + four conduits | comments in `Door.ts`, `Boundary.ts`, `Conduit.ts`, `SmellConduit.ts`, `SoundConduit.ts`, `CartesianLocation.ts:270`, `api/boundary.ts:13`, `Light.ts:34` (*"Today's only user is `Window.colorTint`"*); tests `Window.test`, `Window.smell.test`, `Window.setAttachedHosts.test`, `Window.integration.test`, `declarativeContent.integration.test` | `Door` is the shipped `Boundary`; `ColorTag` in `Light.ts` loses its only user |
| `platform/location/PersistentCartesianLocation.ts` | `Persistable(SingletonCartesianLocation)` | `Wood.ts:13` comment; `check-location-classes.ts:84` (a lint root list); `Location.floor.test.ts:26,443`; its own test | `trade-forestry/Wood` composes `Persistable` inside its own stack; `location.md:72` and `forestry.md:36` cite this class as *the rule* for a durable singleton room |
| `world/lounge/location/GlassAlley.ts` | `Singleton(Staged(Exitable(Detailed(Visible(Location)))))` + a bespoke `onEntered` | comments in `FloodedCell.ts`, `Hazard.ts`, `HazardDelivery.ts`, `Mobile.ts:521`, `Location.ts:122`, three newbie-wilds rows, `injury.wire.test.ts:427-429`; tests `GlassAlley.integration.test`, `lounge-floors.test`, `Location.floor.test.ts:450` | `HazardMixin` (`hazard.md`) is the generalization; `injury.wire.test.ts` is the live proof of cut → bleed → limp → dress → clot |

Docs that call them shipped (the sweep list): `display.md:9,35,102,174`;
`fire.md:146,208,274`; `light.md:41,75,78,89,630-660,910`;
`architecture.md:1132-1134` (also wrong today — `Candle` does not compose
`Meltable`/`Furnace`); `boundary.md:19,41,44,658,718-836`;
`location.md:72,372`; `forestry.md:36`; `harm.md:599-641,862`;
`hazard.md:4`; `standard-model.md` (hand list, already disclaimed);
`roadmap.md` (Window). `content-packs.md:557,1221` mentions the lounge
sports booth *"with a `Screen` + `Remote`"* — that booth ships no row.

### The instrument the acceptance reads through

- `lib/wiki/components/composition.ts:337` — the mixin panel's inverse
  (*composed by*) scans `Template.findDescendants('/obj')`. ⚠⚠ **No row
  lives under `/obj`** (the path pattern is `<root>/<branch>/`; the only
  `/obj` strings left in the tree are three stale comments). `findDescendants`
  (`lib/stuff/Template.ts`) is a `^prefix/` regex, so `'/'` scans
  everything. **Every mixin page today reads `composed by: (nothing yet)`.**
  The panel the requirements call *"the claim this build is about"* has
  never shown a claim.
- `INVERSE_SCAN_CAP = 400` distinct classes (`:23`); the content tree
  names **683** distinct `class:` paths. Fixed to `/`, the scan truncates.
- The forward panel (`kind="template"`) loads the row's class and lists
  its mixins — that path works; `wiki-starter/content/wiki/main/oak.md`
  is the shipped example. `lib/wiki/__tests__/composition.test.ts:124-201`
  seeds fixtures at `/obj/Oak`, `/obj/x`.
- `packages/wire/tests/platform-smoke.wire.test.ts:129` reads a starter
  page with `founder.prose('wiki saxonberg')`.

### `lint:object-verbs` (register #10)

- `scripts/check-object-verbs.ts:348-375` `mentionsSubject` walks EVERY
  identifier inside the type node with `ts.forEachChild`; a
  `readonly Stuff[]` reaches the `Stuff` identifier and matches. **There
  is no array hole.** `ContainmentApi` is in `EXEMPT_APIS` (`:52`) — that
  is how `looseContents` slipped. The gate runs at 0 today
  (`lint:object-verbs`: *0 subject-first Api static(s) … exemptions: 57*).
  `Container.getLooseContents()` exists (`lib/spatial/Container.ts:97`).

### Other facts the waves lean on

- `feel.yaml`: `target` optional, `default: "$focus"`, `scope: ["$focus", "reachable"]`,
  `requires: any`. The envelope drive learned to send `feel here`
  (`envelope.dirty.wire.test.ts:429`).
- `close.yaml`/`open.yaml` (boundary): target `scope: reachable`,
  `requires: SealableMixin`.
- `clone.yaml` (author): both args `scope: [reachable]`; the envelope
  drive clones with `me.cmd('clone /world/terminus/general-store/thing/lantern')`.
- Space-heating rows (class `Campfire`/`Hearth`, `SpaceHeatingMixin`):
  `/stuff/thing/brazier`, `/stuff/thing/stove`, `/stuff/thing/Campfire`,
  `/stuff/thing/Hearth`, `/world/practicum/brazier`. A hearth's useful
  share is 1.5 kW (`SpaceHeating.ts:56`).
- Outdoor rooms with an outdoor biome: `/world/terminus/mayfield-row/street`
  (`_biomePath: /stuff/idea/biome/outdoor/baseline`), the envelope drive's
  `CROSSING`, `CROSSROADS`. Indoor rooms with an envelope and a hearth:
  `/world/terminus/hearthworks/location/cookhouse` (placement drive),
  `CELLAR` (authored `_temperature: 285`).
- YAML authors a `Quantity` field as a bare number in the field's unit
  (`_temperature: 285`, `cellSize: 4.0`); `QuantityMarshaller.pathFor('m³')`
  exists (`quantity.biome-units.test.ts:125`). A row's material is
  `_materialPath: /stuff/idea/material/wood/oak`.
- Wire harness (`packages/wire/src/harness/index.ts`): `Session.open(handle, { startLocation, wizard? })`,
  `s.cmd`, `s.prose`, `expectOk/expectRefused/expectOkOr/expectNote/expectNoNote`,
  `declareFile({ file, packs, dirtyReason })`. Game time passes with a
  local `idle(session, gameSeconds)` (`nutrition-fitness.dirty.wire.test.ts:100`).
  `ditch`/`lime` refusals and `look herdbook` are driven in
  `farmstead.dirty.wire.test.ts:139-176` from `YARD = /world/terminus/eternal/campus-farm/location/yard`.
- Gates this build touches: `lint:locations` (`check-location-classes.ts:84`
  lists `PersistentCartesianLocation` as a cartesian root), `lint:instanceable`,
  `lint:field-meta`, `lint:mixin-names`, `lint:envelope` (curates rows
  authoring `_temperature` — the coach authors none), `lint:test-bootstrap`,
  `lint:object-verbs`. Full roster: 57 (`lint:family --list`).

---

## ⚠⚠ Where this plan departs from the requirements

Each is a fact found by opening a file, not a re-decision of scope. The
user should read these before the build runs.

1. **Only `Coach` is an `ExitableVessel`.** `Barge` and `HaulageRig` are
   plain `Vessel`s, and nobody ever stands inside a plain `Vessel` (riders
   occupy a slot from the room). So the requirements' collision entry
   *"the build must look at all three and let a row say it has no
   interior"* has ONE real member. The barge does not decline an interior;
   it is not on the class that has one. The row-level decline is still
   built (D4) — it is the default for any second `ExitableVessel` row —
   but AC3 is exercised on a cloned coach row with `interiorVolume`
   unset, not on the barge.

2. **There is no coach to get into.** No locality places one
   (`passenger-conveyance.yaml`: *"no coach line does"*). The drive clones
   `/system/transport/thing/coach` into an outdoor street as the founder,
   the way the envelope drive cloned a lantern. The requirements' D12
   *"Ride the coach somewhere. Haulage still hauls"* is driven as `drive`
   on the cloned coach plus the shipped logistics wire test, which already
   proves haulage.

3. ⚠⚠ **"One step outward" contradicts the requirements' own drive.** A
   worn bag's container is the wearer (a `Creature` is a `Container`), so
   bag → carrier → room is two steps and the carrier is not atmospheric.
   The requirement's INTENT — *a carried thing reads the air of the
   nearest thing that has air* — is what this plan builds (D6): the
   thermal reads resolve to the **nearest atmospheric enclosing scope**,
   walking `getEnclosingScope()` outward under the same
   `CONTAINMENT_DEPTH_CAP` discipline the biome chain already uses for
   every other atmospheric value (`BiomeLogic.syncChainWalk`). That is not
   a new mechanism; it is the chain's existing walk applied to the
   envelope. The non-goal *"a general step outward until a scope answers"*
   is, read literally, exactly this, and the drive cannot pass without it.
   **If the user wants the letter of "one step", steps 5–6 of the drive
   must change to a bag on the floor, and a worn bag stays frozen.**

4. **AC2 needs something burning.** A 5 m³ cabin behind 1 cm of timber has
   U ≈ 250 W/K and τ ≈ 75 s; with nothing inside it, its air IS the
   street's air and the band cannot differ. What a shut coach honestly
   reports that the street does not is the envelope's CAUSE sentence
   (*"nothing is burning here; it is as cold as outside"* vs. the bare
   band on the street) and `trace atmosphere`'s `derived: volume` line.
   To move the BAND, the drive lights a brazier inside the coach — the
   carriage foot-warmer, historically exact — 1.5 kW over 250 W/K is
   +6 K, `cool` → `comfortable`. Opening the door adds an opening and the
   difference collapses. The requirement is met; it is met with a heater,
   and the plan says so rather than pretending an empty box is warm.

5. **The `lint:object-verbs` "array hole" does not exist.** The matcher
   already walks arrays; `looseContents` slipped because `ContainmentApi`
   is exempt. There is nothing to close. The zero holds and is re-asserted
   at every wave by `lint:family`. No gate change is made — a clause that
   catches nothing is a gate-shaped comment.

6. ⚠⚠ **The public claim has been reading "(nothing yet)".** The wiki's
   inverse panel scans a root that does not exist. Fixing it is W0 because
   every checkpoint in drive part A reads through it; without W0 the
   drive's "the panel stops lying" would pass vacuously on a panel that
   says nothing. Flagged because it is a defect the requirements did not
   know about and the fix is in a component the build otherwise would not
   touch.

7. **`Branded` lands on two hosts, not one.** `KeptAnimal` alone would
   strip the mixin from `Livestock`, the class whose docstring is the
   reason it was ever put on `Creature`. D7 composes it on `KeptAnimal`
   (kernel) AND `Livestock` (ranching's own class composing a kernel
   mixin, as it already does with `HandlingMixin`). A kept animal and a
   herded animal can be marked; a person, a corpse and a shade cannot.

8. **"Nothing claims it is a place"** (AC3) is read as *nothing claims it
   has its own air*. The composition panel is per-CLASS; a second
   `ExitableVessel` row that declines an interior still shows `Atmospheric`
   in its capability list, and that is true — it is a thing you go inside
   and there is air in it (the outside's). What it does not show is an
   envelope: no `derived: volume` line, no cause sentence, and `feel`
   reads the street. The alternative — a second class without the mixin —
   would make that row's interior sense-silent, the defect this build
   exists to fix.

---

## Which register verdicts this plan acts on

The user's first instruction was to say which surviving verdicts I trust.

| # | verdict | acted on? | how re-verified |
|---|---|---|---|
| 1 | `Atmospheric` off `Vessel`, onto `ExitableVessel` | **yes** (W3) | 15 composers listed by grep; 37 rows, 0 authoring; only `Coach` enterable; `feel` is the one read that goes silent |
| 2 | frozen ambient in a bag | **yes** (W4), reshaped per Departure 3 | read both thermal paths and the biome chain; the worn-bag case is two hops |
| 3 | `Branded` off `Creature` | **yes** (W1), onto two hosts | no reader on the Creature stack; the ranching docstring names `Livestock` |
| 6 | the seven row-less classes | **yes** (W2), with the doc sweep | zero rows, zero non-test imports, per class; the substrates each have another composer |
| 10 | `lint:object-verbs` array hole | **no — misdiagnosed** | matcher walks arrays; the slip was an exemption; the gate is at 0 |
| 4, 5, 8 | `Concealable` / `Persona` / `MineRoom` | **no** | not re-measured against channels 6–7; the requirements say so |
| ~~7~~ | `Improvable` / `Registrar` | ⛔ **never** | live; `ditch`/`grub`/`lime` and the registers are drive step 0 |

Two things the census could not see, found here and now on the register
for the slate: the dead `/obj` scan root (Departure 6), and the shut
coach reading as open to the envelope (Grounding). **Assume a ninth.**

---

## Plan-level decisions

**D1 — Wave order: Branded · dead classes · Atmospheric · thermal · drive.**
W1 has no dependency and lands in an hour; W2 is pure subtraction; W3
must precede W4 (before the move a bag IS atmospheric and no outward
walk ever fires); the drive is last because it reads every wave. W0 is
the instrument and goes first because part A of the drive reads through
it.

**D2 — `AtmosphericMixin` moves from `Vessel` to `ExitableVessel`, with
`enclosureDefaults()` and `VESSEL_WALL_M`.** `Vessel` becomes
`ContainerMixin(Thing)` and keeps `transmissionFactor`. The override
cannot stay on `Vessel` (no `super` to call, no interface to implement).

**D3 — Interior volume is an authored field on `ExitableVessel`.**
`interiorVolume: Quantity<'m³'> | null`, default `null`, fieldMeta
`{ persistent: true, marshaller: QuantityMarshaller.pathFor('m³'), authorable: true }`,
accessor pair owning the invariant (finite, > 0), `getInteriorVolume()` /
`setInteriorVolume()` for the Hydrator's Phase-1 `set<Field>` dispatch.
`getVolume()` overrides to return it; `getCeilingHeight()` stays `null`
(its only reader is the trace line). A second coach is a row
(`interiorVolume: 5`). ⚠ Not `interiorCapacity` — that name is
`Bulkable`'s liquid capacity (the barge authors `interiorCapacity: 12000`);
the two are documented side by side so nobody conflates a cabin with a
tank.

**D4 — Declining an interior = leaving `interiorVolume` unset.** The
mixin stays; the envelope never applies; `feel` inside reads the chain,
which steps outward to the street and adds the weather. Honest silence
about an envelope, never silence about the air. See Departure 8.

**D5 — Two overrides on `ExitableVessel` make the envelope run at all.**
(a) `envelopeApplies()` = `getVolume() !== null && _temperature === null`
— no sky walk: a vessel that states an interior is roofed by
declaration, and one open to the sky declines one. (b)
`openExteriorOpenings()` returns `0` when `MixinApi.isSealable(this) && !this.isOpen()`,
else `super` — for a vessel the seal IS the door. Both are the class
answering for itself; neither narrows a host set. Plus (c) a public
`resetWeatherLocality()` on `AtmosphericMixin`, called from
`ExitableVessel.onMoved`, so a vessel that crosses a locality re-resolves
its weather (the memo fields are `private`; a room never calls it).

**D6 — The thermal repair resolves to the nearest atmospheric enclosing
scope.** In `Thermal.ts`, beside `ambientScopeOf`, a module-private
`airScopeOf(host)`: start at `ambientScopeOf(host)`; while the cursor is
non-null, not `Atmospheric`, and `Containable`, step to
`cursor.getEnclosingScope()`; cap at the biome chain's depth (import or
mirror `CONTAINMENT_DEPTH_CAP`); return the cursor or `null`. Used by
`refreshAmbientFromEnvelope` (pull) and `restamp` (push) — both sides
the same function, per the doc's rule. `enclosingCoolbox` keeps
`ambientScopeOf`: what holds you outranks the room, and the holder is
immediate. Not a new module category: a module-private function in the
file that already has two.

**D7 — `BrandedMixin` composes on `lib/creature/KeptAnimal` (inside
`Persistable`) and on `trade-ranching/src/agent/Livestock`.** `Creature`
keeps `Chattel` (not in scope; noted for the slate). `WorkingAnimal` and
`Fish` inherit from `KeptAnimal` — a fishmonger's tank fish becomes
brandable, which is the slate's rule 3 (err on composing for a tossup).

**D8 — W0 fixes the instrument.** `composition.ts:337` scans `'/'`;
`INVERSE_SCAN_CAP` rises to 1000 (683 classes today); the test's
`/obj/…` fixtures are re-pathed. Render cost is measured in the drive
record. Three wiki-starter pages ship so the drive reads panels a player
can read.

**D9 — Each deleted class takes its docs, its tests and its lint-list
entry.** Per-class dispositions in W2. Where a test used the class as a
fixture for OTHER substrate, the fixture is swapped for a live class
(`Tablet` for `Screen`, `Lamp`/`Firewood` for `Candle`, `Door` for
`Window`), never deleted with the class.

**D10 — The coach row authors `interiorVolume: 5` and `_materialPath: /stuff/idea/material/wood/oak`.**
Without a material the envelope names the universe default in `feel`'s
cause sentence (*"the stone still holds the day"* — in a coach). The
row's stale composition comment is rewritten.

---

## ⭐⭐ Host placement

| new thing | host | what composing it claims about everything on that host |
|---|---|---|
| `AtmosphericMixin` (moved) | `lib/boundary/ExitableVessel` | *a thing you can go inside is a place with air.* Today one composer (`Coach`). Every future enterable vessel — a wardrobe, a fridge you walk into, a caravan — gets air; a bag, a till, a counter, a barge, a wagon no longer do. **Not** on `Vessel` (a bag is not a place); **not** kept on `Vessel` with a guard (*"if enterable"* is the re-narrowing tell). |
| `interiorVolume` | `lib/boundary/ExitableVessel` | *an enterable vessel may state how much air it holds; unset means none.* Not on `AtmosphericMixin` (a `Location` derives volume from geometry and must not grow an authored one); not on `Vessel` (a bag has no interior). |
| `envelopeApplies` / `openExteriorOpenings` overrides | `lib/boundary/ExitableVessel` | *a vessel's roof is its declaration and its lid is its door.* A `Location` keeps the sky walk and the exit walk untouched. |
| `resetWeatherLocality()` | `lib/biome/Atmospheric` (public method) | *any atmospheric scope may be told its address changed.* Rooms never call it; only `ExitableVessel.onMoved` does. On the mixin because the memo is the mixin's private state. |
| `BrandedMixin` (moved) | `lib/creature/KeptAnimal` + `trade-ranching/src/agent/Livestock` | *a kept or herded animal can carry a mark.* Off `Creature`, so `Character`, `Avatar`, `Cast`, `Extra`, `Shade`, `Corpse` stop advertising it. `Fish` and `WorkingAnimal` inherit it through `KeptAnimal`. |
| `airScopeOf` | module-private in `lib/thermal/Thermal.ts` | not a host — a function beside `ambientScopeOf` in the file that owns the question. |
| `enclosureDefaults` + `VESSEL_WALL_M` (moved) | `lib/boundary/ExitableVessel` | *an enterable vessel's wall is its own material at a centimetre.* Follows the mixin. |

Nothing lands on `Thing`, `Creature`, `Location` or `Stuff`.

---

## Convention conformance

Checked at plan time against the current tree:

- **Paths** — `<root>/<branch>/`: the coach row is `/system/transport/thing/coach`
  (system root, `thing` branch); wiki pages ride the `wiki` contribution
  kind at `wiki-starter/content/wiki/main/`. No new roots.
- **`lib/` is substrate only** — `ExitableVessel` and `KeptAnimal` are
  `lib/` classes that are only inherited (the platform twins
  `platform/thing/Vessel`, `platform/agent/KeptAnimal` absorb rows).
  Deleting `platform/thing/{Bench,Candle,Remote,Screen,Window}` and
  `platform/location/PersistentCartesianLocation` removes instanceable
  twins nothing instances; `world/lounge/location/GlassAlley` is a parked
  content class.
- **Module scope declares** — `airScopeOf` is a function declaration; no
  module-scope statements. `INVERSE_SCAN_CAP` is a `const`.
- **Import boundary** — `CONTAINMENT_DEPTH_CAP = 32` is a non-exported
  module `const` declared separately in `BiomeLogic.ts:135`,
  `AddressLogic.ts:29` and `ZoneLogic.ts:35`. `Thermal.ts` declares its
  own `const AIR_SCOPE_DEPTH_CAP = 32` with a comment naming the three
  twins — the pattern the tree already uses; nothing is exported and no
  import crosses a tier.
- **Verbs on objects** — no Api static gains a world-object first
  parameter; `lint:object-verbs` stays at 0.
- **Inter-Stuff contract** — `interiorVolume` is read through
  `getInteriorVolume()`; `ExitableVessel`'s overrides read `this._temperature`
  (host-internal, same chain). `airScopeOf` calls `getEnclosingScope()`
  (a method).
- **Boolean field naming** — none added. `interiorVolume` is a noun;
  `setInteriorVolume` / `getInteriorVolume`.
- **No new module category, no exported helper, no `eslint-disable`.**
- **Gates named** (all 57 run via `lint:family` at every wave):
  `lint:instanceable` (deleted classes, coach row's `class:` still
  resolves), `lint:locations` (root list edited), `lint:field-meta`
  (`interiorVolume` entry well-formed), `lint:mixin-names` (no new kernel
  mixin), `lint:envelope` (no new `_temperature` row), `lint:imports`
  (`Thermal.ts`), `lint:test-bootstrap` (new tests import it),
  `lint:object-verbs` (0), `lint:census` (nothing points at a deleted
  row — none existed), `lint:drive-scripts` (the drive is a wire file).

---

## Waves

Every wave: `pnpm test:near` + the touched pack's vitest + `pnpm -C packages/server lint:family`
green, then ONE commit, then push.

### W0 — the instrument: the composition panel scans the real roots ✅ DONE

> **Landed.** Root `'/obj'` → `'/'`; cap 400 → 1000. The test asserted
> the dead root (`toHaveBeenCalledWith('/obj')`) and passed, so the
> gate that should have caught this was itself pointed at `/obj` —
> the new case asserts a `/trade/...` row is found. Three starter
> pages ship (`backpack`, `atmospheric`, `branded`); `atmospheric.md`
> is deliberately written to read correctly BOTH before and after W3,
> so the drive's part A is a real before/after and not a rewrite.
> ⚠ Surprise: nothing else in the tree referenced `/obj` except three
> stale comments — the root was never real, not merely stale.

Goal: the panel every part-A checkpoint reads is alive.

- `packages/server/src/mud/lib/wiki/components/composition.ts:337`
  `Template.findDescendants('/')`; `INVERSE_SCAN_CAP` → `1000` with a
  comment recording 683 classes at 2026-09-28 and why a truncated inverse
  is a lie the reader cannot see. Update the header's *"scan-capped at
  400"* sentence.
- `lib/wiki/__tests__/composition.test.ts` — re-path the `/obj/Oak` /
  `/obj/x` fixtures under `/stuff/…`; add one case: a mixin composed by a
  row under `/trade/...` appears in *composed by* (the case the old root
  missed).
- Three starter pages in `packages/content/wiki-starter/content/wiki/main/`,
  frontmatter as `oak.md`: `backpack.md` (subject
  `template:/stuff/thing/gear/backpack`, forward panel), `atmospheric.md`
  (subject `mixin:AtmosphericMixin`, inverse panel), `branded.md`
  (subject `mixin:BrandedMixin`, inverse panel). Two lines of honest prose
  each — an encyclopedia, not a fixture.
- `docs/subsystems/wiki.md` — a history note: the inverse scanned a dead
  root from its first commit.

Acceptance: `wiki atmospheric` in a booted world lists
`/stuff/thing/gear/backpack` under *composed by* (it still does — the move
has not happened) and carries no *truncated* row. Commit:
`build(narrowing W0): the composition panel scans the real roots`.

### W1 — `Branded` off `Creature` (D7) ✅ DONE

> **Landed.** `Creature` keeps `Chattel` and loses `Branded`;
> `KeptAnimal` composes it INSIDE `Persistable` (which stays outermost
> for `pinsResidency`); `Livestock` composes the kernel mixin itself,
> because it extends `Creature` and not `KeptAnimal`. Two tests state
> the claim so it can fail — `Creature.branded.test.ts` (a person and a
> corpse are not somebody's stock) and ranching's
> `livestock-branded.test.ts` (the half-done move is what it catches).
> ⚠ The composition expression in `Creature.ts` closes with nine bare
> `)` lines; removing one factory means removing one of them, and
> nothing but `tsc` tells you which.


- `lib/creature/Creature.ts:139-140` — drop `BrandedMixin(` from the
  chain; delete the import; rewrite the `:107-123` comment (Chattel stays,
  and says why Branded left).
- `lib/creature/KeptAnimal.ts:91` — `PersistableMixin(BrandedMixin(BehavedMixin(…)))`;
  a comment: *inside `Persistable`, for the reason above it*.
- `packages/content/trade-ranching/src/agent/Livestock.ts:60` —
  `HandledMixin(HandlingMixin(BrandedMixin(Creature)))`; rewrite the
  docstring at `:18-22`.
- Tests: `lib/creature/__tests__/` — one test that `Avatar`/`Cast`/`Corpse`
  do NOT compose `Branded` and `KeptAnimal` does (`MixinApi.hasMixin`);
  ranching's own suite — `Livestock` composes it.
- Docs: `ranching.md:235`, `architecture.md:1140` (*"Composed by content
  onto branded objects … not every Stuff"* — now true again, name the
  animal rungs), `corpo.md § The mark` (one line), `pets.md` (a kept
  animal can be marked — one line).

Acceptance: `lint:family` green; the two tests. Commit:
`refactor(creature): Branded off Creature — KeptAnimal and Livestock`.

### W2 — the row-less classes, with their documentation (D9) ✅ DONE — **SIX, not seven**

> **Landed, with one class kept and the departure recorded as D11.**
>
> **Deleted (6):** `Bench` · `Candle` · `Remote` · `Screen` ·
> `PersistentCartesianLocation` · `GlassAlley`.
>
> ⭐⭐ **D11 — `Window` STAYS, and the plan was wrong to list it.** The
> census test was *"no row names it"*, which is true of `Window` and was
> the wrong test for this one class. Three facts, each found by opening a
> file this wave:
>
> 1. **`Window.setAttachedHosts` is the only hydrator-dispatched async
>    setter that resolves other Stuff via `StuffApi.singleton`** —
>    `PersistentHydrator.ts:106` names it as *the* example of why that
>    loop `await`s. Every other `public async set*` in the tree is a
>    registry/logic method, not a `set<Field>` applier. Deleting the
>    class leaves a documented framework seam with **no end-to-end
>    proof**, and `declarativeContent.integration.test.ts` — which
>    hydrates a boundary from a declarative row — cannot be re-pointed,
>    because a test-local class has no loadable module path.
> 2. **`baseTransmissivity` / `directionalOverrides` exist nowhere
>    else.** `Door.transmissivity` is binary (0 or 1), so partial
>    attenuation, one-way glass and the multi-hop `MAX_HOPS` chain lose
>    their only exerciser.
> 3. **Lens 2 decides it.** With the class, a window between two rooms
>    is a row an author writes; without it, it is a kernel MR. `Window`
>    is not a dead class — it is an **unused authoring surface**, which
>    is a different thing from `Bench` (an empty subclass), `Screen`
>    (which `Tablet` covers) or `GlassAlley` (which `HazardMixin`
>    superseded).
>
> ⚠ The half of the finding that DID hold is the documentation half, and
> it is the half the requirements' goal actually names: `boundary.md`,
> `light.md` and `roadmap.md` present a window as shipped when **no row
> has ever existed**. That is corrected in the same wave — the true
> sentence is *authorable, unauthored*.
>
> **Other departures from the plan's W2 table, all smaller:**
> - `Candle`'s fixture swaps were unnecessary — `LightSource.test.ts`
>   and `VisionModality.shadow.test.ts` already define their own local
>   `class Candle`. Only its own test went. ⭐ And a candle IS a `Lamp`
>   row (`Furnace(LightSource(Detailed(Reserved(Thermal(Thing)))))`); the
>   general store's torch is already one.
> - `Display.test.ts` needed a local `Remote` fixture (2 lines) because
>   the `remote` pairing is data — which is the argument for deleting the
>   class, stated in code.
> - ⚠ `Screen` → `Tablet` loses `Fixture`'s `seatIn:` self-seating, which
>   no shipped `Display` composer carries. Recorded in `display.md`: the
>   day a wall-TV row wants it, it is one mixin on `Tablet`, not a class.
> - `harm.md § The demonstrator` was rewritten rather than annotated: it
>   was 45 lines presenting a class + integration fixture as the proof of
>   the injury loop, and the proof is `injury.wire.test.ts` now.
> - `location.md`'s durable-singleton-room bullet became **the shape,
>   written out** — `Wood` could never `extend` the class anyway (it
>   needs mixins inside the outermost `Persistable`), which is itself the
>   evidence the rule was load-bearing and the class was not.


Per class — delete the file, then:

| class | tests | docs / lints |
|---|---|---|
| `Bench` | `Chair.test.ts:37` case deleted (it tested inheritance of an empty subclass) | `glossary.md:75` is *the Bench* of a court — unrelated, leave |
| `Candle` | delete `Candle.test.ts`; `LightSource.test.ts`, `VisionModality.shadow.test.ts`, `Window.integration.test.ts` (goes with Window), `Furnace.test.ts:102` comment → swap the fixture for `Lamp` (a lit light source) or `Firewood` (a combustible), whichever the assertion needs. `Door.light.test.ts` and `SmellModality.test.ts` keep their LOCAL `class Candle` | `fire.md:146,208,274`, `light.md:910`, `architecture.md:1132-1134` (also strike the false `Meltable`/`Furnace` claims), `Furnace.ts:221` comment |
| `Remote` | `Display.test.ts` — the `remote` policy case uses a plain `DetailedMixin(Thing)` fixture (the policy is data) | `display.md:9,35,102,174` |
| `Screen` | `WatchController.test.ts:31,182,198` → `Tablet` (the shipped `Display`; `fixedInPlace` is a `Containable` field any Thing can set); `GetController.test.ts:138` comment; `Display.test.ts` → `Tablet` | `display.md:9,174` (the wall-TV archetype row → *unshipped; `Tablet` is the Display*), `spatial.md:762`, `antipatterns.md:3698` (history — keep, past tense), `content-packs.md:557,1221` (the booth ships no row), `lint-family.md:809` (a comment about the gate — keep), `check-ground.ts:533` comment |
| `Window` | delete `Window.test`, `Window.smell.test`, `Window.setAttachedHosts.test`; `Window.integration.test` and `declarativeContent.integration.test` → `Door` where they test the conduits, else delete the Window-only cases | `boundary.md:19,41,44,658,718-836` (§ Window → *Door is the one shipped Boundary; a window is a row on the day somebody authors one, and its shape is Door's*), `light.md:41,75,78,89,630-660`, comments in `Door.ts:48,127`, `Boundary.ts:14,33,164`, `Conduit.ts:14`, `SmellConduit.ts:10`, `SoundConduit.ts:10`, `CartesianLocation.ts:270`, `api/boundary.ts:13`, `Light.ts:34` (`ColorTag` keeps — vocabulary; note it is unconsumed), `roadmap.md`, `standard-model.md` |
| `PersistentCartesianLocation` | delete its test; `Location.floor.test.ts:26,443` → drop the row from its class table | ⚠ `location.md:72` — keep the RULE, lose the class: *"a durable singleton room composes `Persistable` inside its own stack (the Wood's shape); a durable room over the permissive base would share ONE snapshot scope across every mint"*; `forestry.md:36` same; `Wood.ts:13` comment; `check-location-classes.ts:84` remove from `CARTESIAN_ROOTS` |
| `GlassAlley` | delete `GlassAlley.integration.test.ts`, the `lounge-floors.test.ts` and `Location.floor.test.ts:450` references; `injury.wire.test.ts:427-429` comment → the wire test IS the proof now | `harm.md:599-641,862` (§ The demonstrator → a history paragraph: generalized into `HazardMixin`, the class retired, the loop proven by `injury.wire.test.ts`), `hazard.md:4` (past tense), `location.md:372`, comments in `FloodedCell.ts:10`, `Hazard.ts:12`, `HazardDelivery.ts:9,18,137`, `Mobile.ts:521`, `Location.ts:122`; the three newbie-wilds row comments may stay (they cite a failure mode) |

Also: `platform/thing/Screen.ts` imports `FixtureMixin` — check nothing
else in the build loses its last composer of `Fixture` (`CheckRack`
composes it; fine).

Acceptance: every venue boots (`pnpm wire` smoke), `lint:family` green
including `lint:locations`, no doc names a deleted class as shipped
(`grep -rn` over `docs/` for the seven names shows only history notes and
slates). Commit: `refactor(platform): seven classes no row names, and the docs that called them shipped`.

### W3 — `Atmospheric` moves to `ExitableVessel`, and an interior is real (D2–D5, D10) ✅ DONE

> **Landed as planned.** `Vessel` is `ContainerMixin(Thing)`;
> `ExitableVessel` is
> `PostRegistration(DoorBearing(Exitable(Adornable(Atmospheric(Vessel)))))`
> with `interiorVolume`, `getVolume`, `enclosureDefaults` + `VESSEL_WALL_M`,
> the two envelope overrides and `resetWeatherLocality()` on `onMoved`.
> The coach row authors `interiorVolume: 5` and oak.
>
> ⭐⭐ **A ninth channel, and the plan told me to assume one.**
> `envelopeApplies()` written as `getVolume() !== null &&
> getOwnTemperatureK() === null` blows the stack on the first read:
> `getOwnTemperatureK()` falls through to `envelopeTemperatureLast()`,
> which asks `envelopeApplies()`. It is the **same ring**
> `envelopeTemperatureLast`'s own docstring warns about (*the room
> integrates itself; bodies READ it*) arriving from a new direction — an
> override, not a caller. The base reads the FIELD `this._temperature`
> for exactly this reason and the override now does too, with a comment
> saying so. ⚠ Nothing type-checks this: the getter is public, the field
> is public, and both compile.
>
> **Test fixture renames are the interesting half of the diff.**
> `biome.vesselWalk.test.ts` and `biome.isSkyExposed.test.ts` each had
> `class TestVessel extends Vessel {}` standing in for a ship's cabin, a
> submarine and a bell jar. They are `TestCabin extends
> AtmosphericMixin(Vessel)` now — the `ExitableVessel` shape without the
> exit machinery, which needs an async clone a sync fixture cannot do —
> and `vesselWalk` gains the case that states the change: a plain vessel
> is a transparent step, and `'setTemperature' in bag` is `false`.
> `Atmospheric.persistence.test.ts:28` is inverted rather than deleted.
>
> ⚠ **`Quantity.of(NaN, …)` throws a TypeError before any setter sees
> it**, so the invariant test asserts 0 and negative only; NaN cannot
> reach the accessor.


- `lib/stuff/Vessel.ts` — `const VesselBase = ContainerMixin(Thing)`;
  remove the `AtmosphericMixin` and `EnclosureDefaults` imports, the
  `enclosureDefaults` override and `VESSEL_WALL_M`; rewrite the header
  (*matter from the outside; a place from the inside is `ExitableVessel`'s
  claim*).
- `lib/boundary/ExitableVessel.ts` —
  `PostRegistrationMixin(DoorBearingMixin(ExitableMixin(AdornableMixin(AtmosphericMixin(Vessel)))))`
  (Atmospheric innermost of the additions: `Adornable` and `Exitable`
  read nothing off it, and `openExteriorOpenings` needs `isExitable(self)`
  to be true on the composed class, which it is regardless of order);
  `interiorVolume` field + accessor pair + fieldMeta + `get/set`;
  `getVolume()` override; `enclosureDefaults()` moved here verbatim with
  `VESSEL_WALL_M`; `envelopeApplies()` and `openExteriorOpenings()`
  overrides per D5; `onMoved` calls `this.resetWeatherLocality()` before
  the existing anchor migration.
- `lib/biome/Atmospheric.ts` — `resetWeatherLocality(): void` (clears the
  three memo fields; a no-op when a walk is in flight — let it finish and
  then clear, or simply clear `_weatherLocalityResolved` so the next read
  re-walks). Add to the `Atmospheric` interface at `:150` region.
- `packages/content/transport/content/system/transport/thing/coach.yaml`
  — `interiorVolume: 5`, `_materialPath: /stuff/idea/material/wood/oak`;
  replace the composition comment with one that reads the new truth.
- Tests: `Atmospheric.persistence.test.ts:28` → *`Vessel` does NOT
  compose Atmospheric; `ExitableVessel` does*. New
  `lib/boundary/__tests__/ExitableVessel.interior.test.ts`: (a) unset
  volume → `getVolume() === null`, `envelopeApplies() === false`; (b)
  `interiorVolume` set → `envelopeApplies()` true even when the vessel
  sits in a sky-exposed room (the D5a point); (c) a shut `Sealable` vessel
  reports `openExteriorOpenings() === 0`, open reports the `out` exit;
  (d) `setInteriorVolume` rejects `<= 0` / non-finite. Transport pack:
  the coach row hydrates `interiorVolume` (5 m³) and its material.
- Docs: `spatial.md:48,75` (the table and the tree), `architecture.md:927,949,1085`,
  `biome.md:6,226,242,379-395,562,573,695` (*"Locations and Vessels"* →
  *Locations and enterable vessels*; the *Vessel cases* section becomes
  *ExitableVessel cases*), `boundary.md:33` (composition string),
  `thermal.md` (the enclosure rung for a vessel), `logistics.md:283`.
  `bulk.md` gets one sentence: `interiorCapacity` (a tank) vs
  `interiorVolume` (a cabin).

Acceptance: `lint:family` green; `wiki atmospheric` *composed by* no
longer lists `/stuff/thing/gear/backpack` and does list
`/system/transport/thing/coach`; inside a cloned coach `feel here`
answers with a cause sentence. Commit:
`refactor(spatial): Atmospheric off Vessel — an enterable vessel is a place with air`.

### W4 — a thing in a bag reads the nearest air (D6)

- `lib/thermal/Thermal.ts` — `airScopeOf(host)` beside `ambientScopeOf`
  (`:318`); `refreshAmbientFromEnvelope` (`:676`) and `restamp` (`:843`)
  call it; `enclosingCoolbox` (`:332`) unchanged. Rewrite the
  `ambientScopeOf` docstring so the two functions' different questions
  are one paragraph apart: *what holds you* vs *what air reaches you*.
- `lib/spatial/Containable.ts:140-149` — the `getEnclosingScope` docstring
  says the outward walk *"is NOT this; see the narrowing slate finding
  #2"*. Update: the walk lives in `Thermal.airScopeOf`, and this method is
  its step.
- Tests: `lib/thermal/__tests__/Thermal.bagged.test.ts` — a `Thermal`
  loaf in a `ContainerMixin(Thing)` bag: (a) bag on the floor of a room
  with an authored `_temperature` → after `reconcileThermal`,
  `lastAmbientK` equals the room's; change the room, reconcile, it
  follows; (b) bag WORN by a creature (bag's container is the creature)
  → same; (c) a loaf in a bag inside a SHUT `Icebox` reads the room, not
  the cold (documented limit — the holder read is immediate) — assert
  the current behaviour so the limit is visible, not hidden.
- Docs: `thermal.md:115-130` (the *same question, same order* passage
  gains the walk), `spatial.md:380-400` (the enclosing-scope section
  names its two readers).

Acceptance: the three tests; `Coolbox.test.ts` and
`Thermal.furnace-couple.test.ts` unchanged and green. Commit:
`fix(thermal): a thing in a bag reads the nearest air — the frozen-ambient repair`.

### W5 — the drive

`packages/wire/tests/base-class-narrowing.dirty.wire.test.ts` (dirty:
clones a coach and a brazier into a street and burns the brazier's fuel;
neither is produced again). `declareFile({ packs: ['platform', 'wiki-starter', 'generic-objects', 'transport', 'trade-farming', 'trade-ranching', 'hearthworks'] })`.
Sessions: `founder` (wizard, for `clone`), `farmer` at the farmstead
`YARD`, `walker` at `/world/terminus/mayfield-row/street`.

Checkpoints, each able to FAIL (assert a specific string, never
*"defined"*):

- **0.** `farmer`: `ditch` / `lime` answer as `farmstead.dirty.wire.test.ts:139-142`
  asserts today (the refusal text, not `expectOk`); `look herdbook`
  matches `/hide-bound|ruled columns/`.
- **A1.** `founder.prose('wiki backpack')` — the forward panel's `mixins`
  row does not match `/Atmospheric/`. `wiki atmospheric` — *composed by*
  does not contain `/stuff/thing/gear/backpack`, `/platform/thing/BankCounter`-
  backed rows, or any `/trade/haulage/` row; contains
  `/system/transport/thing/coach`; no *truncated* row.
- **A2/A3.** `wiki branded` — *composed by* contains `/stuff/agent/cat`,
  `/trade/mining/agent/canary`, `/trade/ranching/agent/livestock`; matches
  no `/agent/` path under `/world/` and no `/platform/agent/`.
- **B4–B6.** `walker` clones a loaf (a `Provision` row — the build picks
  one that composes `Thermal`; the placement drive's `prime-cut` or a
  bakery loaf) and a backpack; `feel loaf` → note the band; `wear backpack`,
  `put loaf in backpack`, `feel loaf` (or `feel me:i:loaf` if the binder
  needs the seed) still answers a band; walk to the cookhouse, `light hearth`
  (douse first — the envelope drive's lesson at `:437-441`), `idle` a
  game-hour, `feel loaf` → the band has risen (`cool` → `comfortable`).
  ⚠ Choose the cold start so a band boundary is actually crossed — check
  the street's temperature at the drive's game hour first, as the
  envelope drive did.
- **C7–C10.** `walker` at the street: `feel here` → bare band, no cause.
  `founder`: `clone /system/transport/thing/coach`, `clone /stuff/thing/brazier`,
  `put brazier in coach` (or `go coach` then drop it — whichever the
  binder allows; record which). `walker`: `go coach`, `close coach` (from
  inside if `reachable` includes the location, else `out`, `close coach`,
  `go coach` — record which), `feel here` → a cause sentence
  (`/nothing is burning|as cold as outside|oak/`). `light brazier`,
  `idle` ten game-minutes, `feel here` → `/warm from .*brazier/` and a
  higher band than the street. `open coach`, `idle`, `feel here` →
  `/door stands open|as cold as the street/`. Then the decline case:
  `founder` clones a second coach and `setInteriorVolume`-clears it via
  the CMS/`studio` if that surface exists, else the drive asserts the
  decline on a unit test only and SAYS SO in the record (a checkpoint
  that cannot run is reported, not faked).
- **D11–D12.** `look`/`put`/`get` at the bar counter, a shop till and the
  cookhouse rack as `placement.dirty.wire.test.ts § A` does; `drive coach`
  one exit from the driver's slot; the logistics wire file stays green
  (haulage).
- **Four reads inside the coach:** `feel here`, `smell`, `listen`,
  `trace atmosphere` each return a non-refusal with a scope line naming
  the coach.

Append the run's output, counts and every failure to § Drive record.
Commit: `drive(narrowing): <what driving found>`.

---

## Reachability wiring

This build adds no verb, so the five links are checked for the two
capabilities it makes reachable and the one it moves.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| a coach interior with air | `feel`/`smell`/`listen`/`trace atmosphere` (shipped) | `context.location` is the coach after `go coach` (`ExitableVessel.getEntryExit`) | `coach.yaml` `interiorVolume: 5` + `_materialPath` | the transport pack is in the wire world's `SAXONBERG_PACKS`; ⚠ **no locality places a coach** — the drive clones one; a shipped coach is a content task on the slate | `feel`'s `requires: any`; `close`/`open` `requires: SealableMixin` (Coach composes it) |
| a bagged perishable tracks the air | `feel <thing>` (shipped) | `reachable` reaches into an open worn bag — verify in the drive; fall back to `me:i:` | the loaf row composes `Thermal` | — | `requires: any` |
| a marked animal | none (the mark is authored, rendered by `markupAugmenters`) | `_brandKey` on a `KeptAnimal`/`Livestock` row | no row authors one today — a content gap, recorded | the kept animal pins residency | — |
| the composition panel | `wiki <page>` | a page carrying `<composition>` | three starter pages | `wiki-starter` installed (smoke test proves) | — |

Fails-closed checks the build must run, not assume: `lint:instanceable`
after each deletion; `wiki atmospheric` after W0 (if it reads
*(nothing yet)* the root fix did not take); `feel here` inside the coach
after W3 (if it reads *"You don't perceive anything notable here"* the
mixin did not move).

---

## Acceptance-criteria coverage

| AC | wave | how it is observed |
|---|---|---|
| 1 backpack, till, jar, rack, footlocker, handcart, counter stop claiming weather | W3 (+W0 instrument) | `wiki backpack` forward panel; `wiki atmospheric` inverse |
| 2 a closed vessel reports a different warmth; opening collapses it | W3 | drive C — cause sentence shut vs open; band with the brazier lit (Departure 4) |
| 3 a row with no interior keeps the honest answer | W3 | unit test (a) in W3; drive C's decline case if a surface exists to clear the field, else reported |
| 4 a perishable in a bag changes with the world | W4 | drive B; `Thermal.bagged.test` |
| 5 person/corpse/shade stop advertising branding; a kept animal still does | W1 | `wiki branded` inverse; unit test |
| 6 nothing refers to the deleted classes; no doc calls them shipped | W2 | boot + grep in W2 acceptance |
| 7 `ditch`/`grub`/`lime` and the registers still work | W5 step 0 | the farmstead assertions re-run |
| 8 nothing that worked stopped; the four reads answer in a coach | W3, W5 D | drive D + the four-reads checkpoint |

Unmapped: none. ⚠ AC3's drive-level exercise depends on an authoring
surface the plan has not verified (`studio`/CMS edit of a live clone); if
none, the criterion is met by the unit test and the record says so.

---

## Test & gate strategy

- **Unit** (`test:near` at each wave): `ExitableVessel.interior.test`,
  `Thermal.bagged.test`, the `Branded` composition test, the re-pathed
  `composition.test`, the swapped fixtures in W2. Every new test imports
  `test-bootstrap` (`lint:test-bootstrap`).
- **Pack suites**: `transport` (coach row hydration), `trade-ranching`
  (`Livestock` composes `Branded`).
- **Only the drive can prove**: the four sense reads inside a coach, the
  band moving on a bagged loaf, the panel's *composed by* in a booted
  world (the inverse needs `Template` rows and class loads — a wire probe,
  as `check-mixin-census.ts`'s header says).
- **Gates**: `lint:family` (57) at every wave. `pnpm test` exactly twice:
  before the MR and at `/finalize`.

---

## Risks & opens

- **The inverse panel's render cost.** 683 class loads on first read of
  `wiki atmospheric`. Node caches modules, so the second read is
  `queryMixins` × 683. Measure in the drive record; if a page takes
  seconds, the fix is a memo on the component (module-private `Map`
  invalidated on hot reload — a `ModuleApi` question) and belongs on the
  slate, not in this build.
- **`envelopeApplies` without the sky walk** (D5a) means an
  `ExitableVessel` row with an interior parked INSIDE a warm room drifts
  toward `outsideKFor(coach)`, which walks the chain and gets the room's
  BIOME value, not the room's envelope — nested envelopes are the
  structure-tier gap the slate already carries. Right for every shipped
  case (a coach on a road).
- **A bag in a shut icebox** reads the room (the holder read is
  immediate). Asserted as a limit in W4's test (c); the slate gets the
  line.
- **`reachable` and a worn bag** — if `feel loaf` cannot see into the
  bag the drive uses `me:i:loaf` (the nutrition drive's seed); if neither
  binds, that is a binder finding to file, and the checkpoint uses a bag
  on the floor while saying so.
- **`close coach` from inside** — the boundary verb's `reachable` scope
  may not include the actor's own location. Two routes are written into
  the drive; the record says which ran.
- **`Fish` becomes brandable** through `KeptAnimal`. Rule 3; noted.
- **`Chattel` stays on `Creature`** — a person is *ownable* by the same
  reasoning the census used against `Branded`. Not this build's; on the
  slate.
- **`ColorTag`** in `Light.ts` has no user after `Window` goes. Left as
  vocabulary; `lint:unconsumed-seams` counts `platform/idea/**` fields
  only, so it will not fire.
- **The weather-locality reset** clears a memo mid-walk if `onMoved`
  fires during the async address resolution; the implementation must
  either await the in-flight promise or let the walk's `finally` see a
  cleared flag and re-run. Read `Atmospheric.ts:1040-1070` before writing
  it.
- **Stop and ask** only for: a compliant path that does not exist (none
  found), or a deletion in W2 that turns out to have a row a fresh grep
  finds (re-verify each with `grep -rn "class: .*/<Name>$"` before `rm`).

---

## Deferred seams

Each leaves as a line on `docs/slates/builds/base-class-narrowing-slate.md`
at the sweep, never as a section here:

- **A passenger is a heat source.** A body emits ~100 W; a full coach is
  warm. `SpaceHeating` on the agent chain is a host-placement decision
  (lens 3 wants it; the agent chain is at the instantiation ceiling).
- **A shipped coach.** No locality places one; `passenger-conveyance`
  waits on distance. Until then the interior is provable only by clone.
- **Nested envelopes** (a coach in a coach-house; a room in a building)
  — the structure tier.
- **The holder read is immediate** — a bag in an icebox.
- **The inverse panel's cost** and a memoized class index.
- **`Chattel` on `Creature`** — the same test the census applied to
  `Branded`.
- **`ColorTag`** — vocabulary with no user.
- **The census's eighth and ninth channels** — a dead scan root in a
  read-time panel; an exit count that does not know a seal is a door.
- **The `Improvable`/`Registrar` rows** stay struck; the seven-channel
  tool is `pnpm -C packages/server mixin-census`.

---

## Critical files

Read first, in this order:

1. `docs/requirements/base-class-narrowing-requirements.md`
2. `docs/slates/builds/base-class-narrowing-slate.md` (§ The rules the fixes obey · § Rejected approaches)
3. `packages/server/src/mud/lib/stuff/Vessel.ts` · `lib/boundary/ExitableVessel.ts`
4. `packages/server/src/mud/lib/biome/Atmospheric.ts` (`:140-270` the interface; `:600-700` the envelope; `:1020-1085` the memo and `getVolume`)
5. `packages/server/src/mud/platform/idea/api/BiomeLogic.ts` (`:632` `skyExposedWalk`; `:683` `stepOutward`; `:877-1000` `outsideKFor` / `resolveEnvelopeTemperature`; `:1214` `runChainWalk`)
6. `packages/server/src/mud/lib/thermal/Thermal.ts` (`:300-345`; `:660-700`; `:830-860`)
7. `packages/server/src/mud/lib/spatial/Containable.ts:140-150,414-423` · `lib/spatial/Mobile.ts:440-500`
8. `packages/server/src/mud/platform/idea/cmd/perception/FeelController.ts` · `platform/idea/cmd/system/TraceAtmosphereController.ts`
9. `packages/server/src/mud/lib/creature/Creature.ts:100-160` · `lib/creature/KeptAnimal.ts:60-120` · `packages/content/trade-ranching/src/agent/Livestock.ts`
10. `packages/server/src/mud/lib/wiki/components/composition.ts` · `lib/wiki/__tests__/composition.test.ts` · `packages/content/wiki-starter/content/wiki/main/oak.md`
11. `packages/content/transport/content/system/transport/thing/coach.yaml` · `packages/content/transport/src/thing/Coach.ts`
12. `packages/wire/tests/envelope.dirty.wire.test.ts` · `placement.dirty.wire.test.ts` · `farmstead.dirty.wire.test.ts` · `packages/wire/src/harness/index.ts`
13. `packages/server/scripts/check-location-classes.ts:70-90` · `scripts/check-object-verbs.ts:340-380`
14. `docs/subsystems/spatial.md` (§ Placement) · `thermal.md` · `biome.md` · `boundary.md` · `display.md` · `harm.md § The demonstrator` · `location.md:60-80`

---

## Drive record

*(appended at build time — the output of W5, the count, and what each
failure was. A drive that was written and not run is a drive that
claims.)*
