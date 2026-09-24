# The envelope — implementation plan

Executes [envelope-requirements.md](../requirements/envelope-requirements.md).
**Kind:** feature. **Leads from:** kernel; **first consumer: Terminus**
(the terminal crossing, the general store, the cookhouse, the Hearthworks
smithy, and every one of the realm's location rows in the content pass).

What is being built: the room as an envelope — a place that holds a
**light** and a **heat** state different from outside, at a cost — with a
named source for each: the sky (following the sun, the moon and the
cloud), a lamp somebody filled, a hearth somebody fed, or spill through an
opening. Plus the two things the requirements make non-negotiable around
it: the cold retune that keeps the cast alive, and the content pass that
gives every shipped room a source.

The plan is written for a fresh-context build agent. Read the Grounding
section as the truth of the tree at plan time (2026-09-24); verify
anything you extend.

---

## Grounding

Every fact below was checked by opening the file named. Line numbers are
approximate (±10).

### The light half

- `packages/server/src/mud/platform/idea/modalities/VisionModality.ts` —
  `signalAt(loc)` is **sync**; `walkFluxAt` (line ~215) reads leg (a) as
  `loc.getAmbientFlux().rawValue() * loc.getWeatherDimFactor()`, then (b)
  contents emitters, (c) fixture emitters, (d) `BoundaryAnchor` fixtures
  through a `LightConduit` at its `transmissivity`, (e) doorless obvious
  exits at `EXIT_TAU`. `MAX_HOPS = 2`, `EXIT_TAU = 1.0`
  (`lib/perception/Modality.ts:90`). ⭐ **Spill already works**: the moment
  an outdoor room follows the sun, every room joined to it by an open
  doorless exit or an open door/window follows too, at full strength for
  one hop and still one hop further. `perceiveFor` applies
  `Light.applyBandShift(raw, profile.bandShift)`.
- ⚠ **`applyBandShift` lifts a ZERO signal.** `Light.applyBandShift`
  (`lib/perception/Light.ts:223`) is `Quantity.shiftTag('lux', band, shift)`
  — a positive index shift on the tag table. `signalAt` returns
  `Light.ZERO` for a sealed cellar, `bandFor(0)` is `pitch-black`, and a
  `bandShift: +1` species reads `very-dim` **with no photons at all**.
  Never exercised because nowhere authored a nonzero shift on a playable
  species (S9 will exercise it).
- `packages/server/src/mud/lib/perception/AmbientLit.ts` — fields
  `ambientIntensity` (lumens, default 0) and `ambientColorTemperature`,
  both `{persistent, authorable}`; transient `_weatherDimFactor` with
  `get/setWeatherDimFactor()`. Composed at the **`Location` base**
  (`lib/stuff/Location.ts:110`:
  `AddressableMixin(AmbientLitMixin(AtmosphericMixin(AdornableMixin(ContainerMixin(PostRegistrationMixin(Stuff))))))`),
  so every Location is AmbientLit; `Vessel` is
  `AtmosphericMixin(ContainerMixin(Thing))` (`lib/stuff/Vessel.ts:50`) and
  is **not** AmbientLit (the transport coach row authors
  `ambientIntensity` anyway — the field is dead there; verify at build).
- `packages/server/src/mud/lib/perception/LightSource.ts` —
  `LightSourceMixin` emits its authored `emittedIntensity`
  unconditionally; lit-gating is done per class today:
  `platform/thing/equipment/PortableLight.ts` (`isOn()`),
  `platform/thing/Candle.ts` (`isBurning()`), generic-objects'
  `src/thing/SconceLamp.ts` (`isOn()`).
  ⚠ **`Campfire`, `Forge`, `Oven`, `Kiln` have NO gate**
  (`platform/thing/Campfire.ts` is an empty class body over
  `FurnaceMixin(LightSourceMixin(ReservedMixin(Postured(Slotted(Surfaced(ThermalMixin(Thing)))))))`)
  — a burnt-out campfire still casts its 120 lumens. Every furnace
  composer puts `FurnaceMixin` **outside** `LightSourceMixin`.
- Bands: `LIGHT_BANDS = pitch-black · very-dim · dim · lit · bright ·
  blinding`, thresholds in
  `packages/content/base-library/content/quantity/quantity-tags.yaml:44`
  (`0 · 1 · 5 · 20 · 60 · 200` lux). `REQUIRED_BAND_FOR_DETAIL`: shape
  `very-dim`, figure `dim`, detail `lit`, fine `bright`. `canSee` is what
  makes an object read *"something"* in the dark.
- lux = lumens ÷ `getSizeScale()`; `CartesianLocation.getSizeScale()` =
  `extent²`, extent = own `extent` else the zone `cellSize`
  (`lib/location/CartesianLocation.ts:200`). The Terminus zones ship
  `cellSize: 3.0` (9 m²); Rejection's `pithead-yard.yaml` authors 8000 lm
  against 10 m cells (80 lux, `bright`); the Duncan Hall dorm room authors
  30 lm against a 1 m² plain-Location scale.
- ⚠⚠ **The realm is mostly dark today, streets included.** Census over
  `packages/content` (quoted-glob grep): **195 location rows; 84 author
  `ambientIntensity`; 41 name an outdoor biome, 6 an indoor one.** The
  university-avenue **crossing**, the **market square**, the
  counting-houses **avenue-block**, the **terminal hall** and the
  **general-store shop floor** author **no** `ambientIntensity` — they
  read `Light.ZERO` = `pitch-black` right now, which is why the ground and
  fishing drives saw *"something"* on the streets. Of the 84 that do
  author a value, the calibrations disagree (mayfield `street.yaml` 500 lm
  on a 9 m² cell = 55 lux `lit`; pithead 8000 on 100 m²; dormroom 30 on
  1 m²). ⭐ So the content pass is not "convert noon values" — it is
  "give every outdoor row a calibrated noon value and every interior a
  source", and `look` on a dark street will *change* for the better at
  the first wave boundary.
- `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts`
  renders the room's long description **unconditionally** — there is no
  room-level darkness line anywhere in `platform/idea/cmd/perception/`
  or `lib/description/` (grep for `pitch`, `too dark`, `It is dark`:
  nothing). Only objects are gated (`canSee` → *"You can't see X"*).
  `ReadController.ts:103` already refuses with reason
  `too-dark-to-read` when the light-bound channel fails. `FeelController`
  bare form already prints *"The air feels {band}"* via
  `TouchModality.touchAt(location)`; the Kelvin `thermal` tag table is
  `freezing 0 · cold 263 · cool 283 · warm 293 · hot 305 · scorching 320`
  (`quantity-tags.yaml:80`).
- `VisionProfile` is authored per species under `visionProfile:`
  (`platform/idea/species/Species.ts:509`); every playable `homo/*` row
  in `species-and-names` authors one — `sapiens` `bandShift: 0`,
  `koboldus` `{scotopicMin: very-dim, photopicMax: bright, bandShift: -1}`
  (negative = darker, by `shiftTag`'s index arithmetic). No shipped
  species has a positive shift.

### The sun

- `packages/server/src/mud/platform/idea/api/CelestialLogic.ts` —
  `CAMPUS_LATITUDE = 42` is a module constant (line 27); every
  high-level query is `async` **only** because `profileFor(location)`
  (line 73) awaits `zone.lookupField('celestialProfile')` and falls back
  to `EARTH_LIKE`. The pure geometry (`solarAltitudeDeg`, `moonPhaseFor`,
  `moonAltitudeDeg`, `isDay`, `sunsetSecOfDay`, `seasonFor`…) is
  **sync, plain numbers**, exposed as statics on `api/celestial.ts` (lines
  185–420). `WeatherLogic.ts:146` already calls
  `CelestialApi.seasonFor(EARTH_LIKE, t)` sync from a logic singleton and
  memoizes it in a module-scope `const seasonCache = new Map()` (the
  sanctioned pure-value-construction shape).
- No content row authors `celestialProfile` (grep across
  `packages/content`: none). `docs/subsystems/time.md` § Layer 2 says D6
  (celestial → ambient light) *"waits until the perception branch
  merges"* — the seam this build closes.
- `Lamp.ts` — ⚠ **`packages/server/src/mud/platform/thing/Lamp.ts` is a
  dead street-lamppost class**: `PostRegistration(LightSource(Switchable(Detailed(Thing))))`
  with a fixed `DUSK_HOUR 18 / DAWN_HOUR 6` clock schedule. **No content
  row names `/platform/thing/Lamp`** (grep: none). It is the object the
  requirements reject, already unreachable. The only rows naming a Lamp
  class are arcana's `/system/arcana/thing/ManaLamp` and generic-objects'
  `/generic-objects/thing/SconceLamp`.

### The heat half

- `packages/server/src/mud/lib/biome/Atmospheric.ts` — composed on
  `Location` and `Vessel`. Owns `_temperature` (own override), the detail
  maps, `getVolume()`/`getCeilingHeight()` (null by default;
  `CartesianLocation` overrides as `extent³` / `extent`,
  `lib/location/CartesianLocation.ts:220`). `setTemperature()` fans
  `restamp()` over Thermal contents; ⚠ **zero production callers**
  (grep across `src/mud` excluding tests and the mixin).
- `packages/server/src/mud/platform/idea/api/BiomeLogic.ts` —
  `resolveTemperatureFor` (line 252) → `resolveQuantityFor` (line 743):
  `runChainWalk` (own `_temperature` → detail map → biome ancestors'
  `_defaultTemperature` → zone → universe), then **+ weather deviation
  iff `WEATHER_DEVIATED_FIELDS.has(field) && WeatherApi.isActive() &&
  skyExposedWalk(scope)`**. `skyExposedWalk` (line ~510) is sync: walks
  containment outward to the first Atmospheric ancestor with a biome and
  answers `MixinApi.isSkyExposed(biome)`. `restampThermalContentsOf(room)`
  (line 489) is sync.
- `packages/content/base-library/content/stuff/idea/biome/indoor/baseline.yaml:9`
  authors `_defaultTemperature: { value: 294, unit: K }` — the decree.
  `outdoor/baseline.yaml` authors no temperature. `universe.yaml:11`
  authors 295 K. Other authored temperatures in content: brewing
  `cold-store` 279, vintner floor 285, brewing floor 288, crowsfoot floor
  289, hospitality `cellar` 285, Rejection's `underground/upper-workings`
  biome 285.
- ⚠⚠ **There is no winter in the temperature.**
  `lib/weather/WeatherType.ts:131` `WEATHER_PROFILES` deviate temperature
  by **type** only: clear 0, overcast −1, rain −3, storm −5 (snow/fog
  similar). `SEASON_BIAS` (line 333) biases the **type distribution**
  (winter: `snow: 4`). Season is otherwise global and unused by
  temperature; there is no annual or diurnal term anywhere
  (`grep season|diurnal|annual WeatherLogic.ts`: only the type memo).
  **Outside at midnight in winter is 295 − 5 = 290 K (17 °C).** The
  requirements' survey sentence *"the season biases it — so the realm
  already has a winter"* is true of snowfall and false of temperature.
  See D3 and the report.
- `packages/server/src/mud/lib/thermal/Thermal.ts` — `THERMAL_DEFAULTS`
  (line 62): `MAX_REASONABLE_GAP_SEC 4h`, `DEFAULT_TEMPERATURE_K 295`,
  `R_GEOMETRY_MEDIUM/WALL 0.0075`, `SETPOINT_K 310`, `BAND_HALF_WIDTH_K 8`,
  `COLD_SPEND_PER_DEGREE 0.05` (%/min/K), `HEAT_SPEND_PER_DEGREE 0.06`,
  `CLO_TO_KELVIN 2.5`, `THERMAL_LETHAL_SEC 3h`, `DYING_WINDOW_SEC 300`.
  `getTemperature()` reads cached `lastAmbientK` sync (line 320);
  `reconcileThermal()` (line 517) integrates `Decay.toward` with the
  far-past guard; `restamp()` (line 590) asks `heatSourceK()` (a lit
  furnace holding or supporting the body) before
  `BiomeApi.resolveTemperatureFor(container)`; `onMoved` restamps.
  `getTau() = effectiveR() × thermalCapacity()`; `effectiveR()` (line 490)
  is medium + wall conductivity — **worn clothing is not in a body's
  drift τ**.
- `packages/server/src/mud/lib/thermal/ThermalRegulation.ts` —
  `integrateThermalSlice` (line 287): `lowBand = setpoint − 8 −
  clo·CLO_TO_KELVIN`; cold branch (line 324) spends satiation
  `COLD_SPEND_PER_DEGREE × gap × min`, **linear in gap, uncapped**; out of
  fuel → `driftCore(core, ambient)` (line 423, `Decay.toward` with
  `bodyTau()`). `effectiveAmbient()` (line 440) is async, run at restamp
  only, and caches `effectiveAmbientK`; it folds warming-slot `warmth`,
  wind chill, immersion, wetness. `noteShiver()` (line 724) emits one
  `self.body` cue *"You're shivering."*
- The 2026-09-21 finding (memory `naked-cast-starve-at-room-temperature`):
  a naked body at 294 K has an 8 K gap → 0.4 %/min = **24 %/h** →
  starves at 4.5 h, then drifts; no Cast row wears anything; TestHooks
  now dresses wire characters (`backend/TestHooks.ts:281` `#dress`:
  clone the first aspiration's outfit from `char-gen.yaml`, move onto the
  avatar, `occupyAll(garment, slotClaim)`). Basal satiation drain is
  `0.02 %/min` = 1.2 %/h (`lib/metabolism/Metabolic.ts:217`), so the cold
  branch is ~20× basal — the killer, not hunger.
- **No NPC row can author worn garments.** `wears:`/`worn:`/`outfit:`
  exist on no NPC class (`lib/npc/NPC.ts`, `platform/agent/Cast.ts`,
  `Extra.ts`), on no archetype row, and in no content row. `props:`
  `{template, onto}` places onto a `Surfaced` host only
  (`lib/stuff/Populates.ts:93`). Only 2 rows run the `eats` brain.
- `Offstage` (`platform/location/Offstage.ts:31`) extends `Location`
  directly (no `CartesianLocation`) → `getVolume()` is `null`.

### Fire, furnaces, the hearth

- `packages/server/src/mud/lib/fire/Furnace.ts` — `FurnaceMixin`: fields
  `burnTemperatureK` (default 800), `bellowsMultiplier`, `bellowsActive`,
  `lit` (**default `true`**), `fuelBurnRatePerMin` (0.5 %/min),
  `furnaceFuelClockStamp`. `isLit()`, `fuelRemaining()` (the `'fuel'`
  Reserve), `getHeldTemperatureK()` (the PIN — consults neither lit nor
  fuel), `reconcileFurnaceFuel()` (reconcile-on-read; burnout edge sets
  `lit=false` and `restampHeated()`), `heatContents()` (room-sibling
  Meltables only; called by the fire tick,
  `platform/idea/api/FireLogic.ts:262`, for every lit furnace in an
  occupied room), `restampHeated()` (container + surface bodies),
  `ignite()/douse()` → `FireLogic` (`igniteImpl` line 144: a furnace
  lights iff not lit and `fuelRemaining() > 0`). `getTemperature()` pins
  the held temperature while lit. `commandContributions.peers` affords
  `ignite`/`douse`/`pump`/`heat`/`boil`/`warm`. **Deliberately not
  `Atmospheric`** — the rule *a lit forge must not warm the room it
  stands in* is read on the body (`heatSourceK`), not in `BiomeLogic`.
- Composers: `Campfire` (`Postured` warming seat, `warmth: 9`, row
  `generic-objects/content/stuff/thing/Campfire.yaml` and the practicum
  `brazier.yaml`), `Forge` (row 1300 K), `Kiln`, `Oven`
  (`Container`+`Surfaced`; the kitchen `fixture/range.yaml` at 500 K).
  Rows placing them: hearthworks `smithy.yaml` `props: [/stuff/thing/Forge, …]`,
  `cookhouse.yaml` `props: [/stuff/thing/Oven, …]`, market `bakery.yaml`.
- Verbs ship: `packages/content/platform/content/platform/cmd/device/ignite.yaml`
  (`verbs: [ignite, light, kindle]`, arg `requires: CombustibleMixin|FurnaceMixin`,
  scope reachable), `douse.yaml` (same gate), `switch.yaml`
  (`requires: SwitchableMixin`). `Mixins` refusal phrases:
  `FurnaceMixin: "{} isn't a furnace"` (`lib/mixin.ts:666`).
- `MixinApi.isFurnace / isCombustible / isAmbientLit / isLightSource /
  isSkyExposed / isThermal` all exist (`api/mixin.ts:1158–1580`).
- The general store sells `general-store/thing/lantern.yaml`
  (`class: /platform/thing/equipment/PortableLight`, `on: false`,
  `emittedIntensity: 220`, prose says *"switch lantern on"*) and
  `torch.yaml`; Rejection's `glowcap-jar.yaml` / `glowcap-fixture.yaml`
  are also `PortableLight` — a **fungus glow, no fuel**. The lantern
  burns forever today.

### Streets, civics, money

- `packages/server/src/mud/platform/location/Crossing.ts` — the one
  dynamic-detail precedent: overrides `getDetail(id, …)` and appends the
  clock reading when `id === 'tower'`. A bespoke class per room.
- `DetailedMixin` composes on `CartesianLocation`
  (`lib/location/CartesianLocation.ts:60`:
  `Populates(Detailed(Perceptible(Exitable(CartesianCoordinates(Visible(Location))))))`),
  on `FurnishableRoom` and on `Offstage`; **not** on the `Location`
  base. Details are static strings; no Liquid rendering in details
  (`lib/description/Detailed.ts`: `details:` applier only).
- `packages/server/src/mud/platform/idea/Locality.ts` —
  `PostRegistrationMixin(Idea)`, a live singleton per row, fields
  `name`, `_address`, `_weatherPin`, `_climateLean`, `_governmentKey`,
  `_reach`, catchment. Rows: `platform/content/platform/idea/Locality/{terminus,terminus-city}.yaml`
  (`terminus-city`: `_address: terminus/city`, `_governmentKey:
  terminus-city`) + 12 in `world-seed/content/stuff/idea/Locality/`.
  Streets declare `_address` (mayfield `street.yaml:14`
  `_address: terminus/mayfield-row`).
- `AddressApi.resolveLocalityFor(scope)` is async
  (`platform/idea/api/AddressLogic.ts:139`, a containment/zone walk);
  `AddressApi.coveringLocalityOf(address)` and `coverageChainOf` are
  **sync** for a known address string (`api/address.ts:108`).
- `platform/idea/Government.ts:59` — `treasury: string` (a bank-account
  key); `GovernmentApi.getGovernment(key)` is sync
  (`api/government.ts:120`). The city's treasury is the municipal budget
  Business `terminus/content/world/terminus/budget.yaml`
  (`/world/terminus/budget`; house account = its `getAccountPath()` =
  templatePath, `banksAt: goodkin`, stood up lazily; a first operating
  account gets `treasury.openingAdvance` — `credit.md`).
- `api/banking.ts` — `transfer(from, to, amount, memo)` **refuses unless
  `from.owner === actingActorKey()`** (`BankingLogic.ts:2735`); `settle`
  needs a payer credential; `payWage(employerAccountId, workerKey, …)`
  pays a **person** by key with no acting-owner check (the roster tick
  calls it from a clock frame, `EmploymentLogic.ts:937`). `balanceOf`
  is sync. ⭐ **`BankingApi.appropriate(toOwnerKey, amount, memo)` →
  `appropriateImpl` (`BankingLogic.ts:737`) is the shipped primitive a
  schedule can post:** no acting-owner check; source
  `treasuryAccountIdImpl(currency)`; destination the owner key's primary
  account; **refuses when short** (*"the treasury holds less than …"*);
  posts `postTransaction("appropriation", …)` with category
  `appropriation` — conserving, not a mint. Its only caller today is
  `platform/idea/cmd/banking/TreasuryController.ts:100`. ⚠ **There is
  one treasury per currency** — `TREASURY_PATH = "/compact/treasury"`
  (`BankingLogic.ts:567`) — and no Locality holds an account. The demo
  sales tax already flows seller-collected to that treasury via
  `remitDemoTax` (called from `BuyController`, `OrderController`,
  `lib/commerce/PricedOffer.ts`). `PnlCategory = sales | cogs | wages |
  subsidy | tax | transfer …` (`lib/banking/LedgerEntry.ts:86`).
- System schedules register in
  `platform/idea/WorldClockRegistry.ts:475` `registerSystemSchedules()`
  (weather boundary, storm strikes). `WorldClockApi.every/at/cron`
  exist; `CelestialApi.sunsetSecOfDay`/`nextSolarEvent` are sync.
  `ScheduleApi`-style `every` from a Logic `boot()` is the roster tick's
  shape (`EmploymentLogic.ts:1423`).
- Roster windows: 44 `hours:` entries in content, **27 are `[0, 24]`**
  (dyehouse, mill, gazette, …); the lounge already authors real shifts.
  The `shifts` brain parks off-shift cast in the venue's `Offstage` row
  (`employment.md § The shifts + covers brains`).

### Lints, tests, wire

- 53 `lint:*` scripts; `lint:family` derives the roster. Census-then-
  ratchet exemplars: `scripts/check-ground.ts` (a hand-curated list with a
  ceiling that may only fall, clause (c) fails a stale entry),
  `check-openings.ts` (closed vocabulary over pack rows via
  `pack-roots.ts` `CONTENT`/`packSources()`), `check-template-census.ts`
  (clause (b): every template-path-valued field resolves — the list to
  extend for a new path-valued field).
- Wire: `packages/wire/src/harness/session.ts` (`Session.cmd/prose/
  drainProse/query`, `uniqueHandle`, wizard sessions via
  `{wizard: true}`); dirty files export `DIRTY_REASON`. A wizard `eval`
  is parcel-bound: `eval --parcel <path> [--on <target>] <expr>`
  (`fishing.dirty.wire.test.ts:65,371`). `docs/testing.md § The clock
  ceiling`: 12× and no per-file override — a game hour is 5 real
  minutes; `WorldClockApi.setScale` is `Public` (`time.md`: *"author
  eval in v1 until an admin verb lands"*). The wire world's clock starts
  at `t = 0` = Arienle 1 00:00 = **midnight at the vernal equinox**.
- Gym: `pnpm test:gym` runs `vitest.gym.config.ts` (`*.gym.test.ts`);
  thermal unit tests drive time with
  `WorldClockApi._setNowProviderForTesting`.

### Collisions (verified branch state via `tools/wt-status`)

build-2 `build/extraction` (coal/peat rows land as fuel — nothing here
may name them); build-3 `design/instrumentation` (owns `measure`/
`analyze`; untouched); build-4 `design/clinical-medicine` (Disciplines;
untouched); master detached on `design/guild-player-institution`.

---

## Plan-level decisions

**D1 — The sun is a sync memo, not a stamp.** `CelestialApi` gains one
pure static, `skyIlluminanceFactor(profile, latitudeDeg, t): number`
(plain numbers, the pedagogical seam), and one sync read,
`CelestialApi.skyFactorNow(): number`, forwarding to `CelestialLogic`
where a per-game-minute memo (`{minute, factor}` instance fields on the
singleton — a Stuff, so no module-scope state) computes it from
`EARTH_LIKE` + `CAMPUS_LATITUDE`. `walkFluxAt` leg (a) consumes it
directly. *Why not a weather-style stamp:* the stamp has the documented
staleness flaw (abandoned rooms keep the old value) and covers only
occupied rooms; a pure function of game time has no state to go stale.
**Single-profile guard:** `CelestialLogic.profileFor` throws — loudly, by
name — if a zone ever returns a profile other than `EARTH_LIKE` (*"a
second celestial profile is unsupported while the sky factor is global —
envelope D1"*), and `lint:light-sources` clause (f) refuses any content
row authoring `celestialProfile`. Cloud and sun compose as **two
factors** multiplied: `flux = ambient × skyFactor × weatherDim` — the
cloud dim keeps its stamp and dial (`weather.cloudDimFactor`), the sun
is the memo; neither knows the other.

**D2 — The curve.** With sun altitude α (deg), moon altitude β (deg),
moon phase p ∈ [0,1) (0.5 = full):

```
sun     = α ≥ 0 ? sin(α)                    : 0.1 · 10^(α / 3)     // twilight: ÷10 per 3°
moon    = β > 0 ? 0.03 · k(p) · sin(β)      : 0,   k = ((1 − cos 2πp) / 2)²
stars   = 0.002
factor  = min(1, sun + moon + stars)
```

Anchored to the shipped table (a `sky` row authors its **noon** lumens):
a 9 m² cell at 720 lm reads 80 lux `bright` at a summer noon (sin 71° =
0.95 → 76), `lit` at a winter noon (sin 24° = 0.41 → 33), `dim` at sunset
(0.1 → 8), `very-dim` at −2° (0.02 → 1.7), full moon high (0.03 × 0.9 →
2.2 lux `very-dim` — move, find a door, see a shape; not a face), full
moon under heavy cloud (× 0.4 → 0.9 lux `pitch-black`), quarter moon
(k = 0.25 → 0.5 lux, dark), starlight 0.16 lux (`pitch-black` to a human;
`very-dim` to a `bandShift: +1` species — S9). Dusk for the town's lamps
is `factor < 0.1` (sunset). All four numbers are dials in
`settings/light.yaml` (`light.sky.twilightDecadeDeg 3`,
`light.sky.moonMax 0.03`, `light.sky.starlight 0.002`,
`light.sky.lampDuskFactor 0.1`) — playtest-tuned, not plan decisions.

**D3 — Outside gets a season and a night; the room is a first-order
envelope on `AtmosphericMixin`.**

*3a. The outside term.* `WeatherLogic` folds a **solar temperature
deviation** into `deviatedFieldFor(scope, locality, 'temperature', now)`
beside the type deviation: `−A_year · cos(2π · doy / year) − A_day ·
cos(2π · (secOfDay − 3 h) / day)` with `A_year = 10 K`, `A_day = 4 K`
(dials `weather.solarAnnualSwingK`, `weather.solarDiurnalSwingK`;
coldest at 3 a.m. mid-winter). Same shape as the sky factor: a pure
function of `t` via `CelestialApi.dayOfYear/secondOfDay(EARTH_LIKE, t)`,
memoized per game-minute on the singleton, no state, seeded-not-drawn.
Winter night outside ≈ 281 K (8 °C), winter noon ≈ 289, summer noon ≈
309, summer night ≈ 301. ⚠ This is the one place the plan disagrees with
the requirements' survey (see Risks & opens #1): without it S4,
acceptance 8 and 15 cannot be observed.

*3b. The envelope.* New fields on `AtmosphericMixin` (host argument in
Host placement): authorable `_envelope: { fabricUPerM2?: number,
openingUPerM3?: number, fabricMassFactor?: number } | null`; runtime
`envelopeTemperatureK`, `envelopeClockStamp`, `envelopeOutsideK`
(persistent, `runtimeState`). Methods:

- `envelopeApplies(): boolean` — `getVolume() !== null && this._temperature
  === null && !BiomeApi.isSkyExposed(this)`. An authored own
  `_temperature` wins (the cellar / the cave that is the same all year —
  lens 2's bespoke case stays a row).
- `reconcileEnvelope(): void` (sync): `U = U_fabric + U_open`;
  `U_fabric = fabricUPerM2 × 5 · extent²` (walls + roof of a cube cell;
  default `envelope.fabricUPerM2 = 1.5` W/m²K); `U_open = openingUPerM3 ×
  V × nOpenToOutside` (default `envelope.openingUPerM3 = 6` W/K per m³ per
  open exterior opening — an open door is air exchange, not conduction);
  `C = 1.2 · 1005 · V · fabricMassFactor` (default 15 — the fabric holds
  heat, the air alone would not). `P = Σ spaceHeatOutputW()` over
  contents composing `SpaceHeatingMixin` (D5). `T_ss = outside + P/U`;
  `T ← Decay.toward(T, T_ss, elapsed, C/U)` — exact for piecewise-constant
  inputs, the `ThermalMixin` shape. No far-past guard (a room left
  overnight IS cold in the morning); the elapsed gap integrates at the
  heat input as read now (a hearth that burnt out mid-gap over-credits
  the room for one read; bounded, self-correcting, noted in thermal.md).
  For a 3 m cell: `U_fabric = 67 W/K`, `C ≈ 490 kJ/K`, `τ_closed ≈ 2 h`,
  one open street door adds 162 W/K (`τ ≈ 36 min`); a 1.5 kW hearth
  holds +22 K over outside shut and +6.5 K with the door open — *a
  heated room with the door open is expensive* falls out of the
  arithmetic.
- `nOpenToOutside` = obvious exits (with the light walk's four hazard
  guards) whose destination is sky-exposed (`BiomeApi.isSkyExposed(dest)`,
  sync) and which are doorless **or** whose door `isOpen()`. Interior
  openings count for nothing: S6 says room-to-outside only. Windows are
  light-only in v1 (no Window rows exist in content; a thermal window is
  a deferred seam).
- `envelopeTemperatureSync(): number | null` — reconcile then return
  `envelopeTemperatureK`, or `null` when `!envelopeApplies()` or
  `envelopeOutsideK` was never seeded.

*3c. Integration — one source of truth.* `BiomeLogic.resolveTemperatureFor`
becomes: run the chain; if the scope is an envelope host and the trace's
own-override step did not answer, compute `outside` = **the chain with
non-SkyExposed biome layers skipped** (the indoor decree is deleted from
`indoor/baseline.yaml` *and* ignored by rule, so an `indoor/*` biome can
never re-introduce it) **+ the weather deviation** (type + solar) when
the answer came from the universe or a sky-exposed biome (a zone-authored
temperature is the rock, not the sky — Rejection's `upper-workings`
biome and any mine zone keep their answer and get no weather); stamp
`envelopeOutsideK`, `reconcileEnvelope()`, return
`envelopeTemperatureK`. Sky-exposed scopes are byte-identical to today
plus 3a. The trace variant (`analyze`) reports provenance `'envelope'`
with outside + heat input + U.

*3d. Bodies and food track a warming room without a fan-out (the pull
side).* `ThermalMixin.reconcileThermal()` first calls
`refreshAmbientFromEnvelope()`: if `heatSourceK()` is null and the
container composes `Atmospheric` with `envelopeTemperatureSync() !==
null`, set `lastAmbientK` to it. `ThermalRegulationMixin` caches the
**offset** (`effectiveAmbientK − baseAmbientK`) at restamp and
re-derives `effectiveAmbientK = envelopeTemperatureSync() + offset` at
the top of `reconcileThermalRegulation()` when the room is an envelope
host. Both are three-line edits; both follow weather.md's own advice
(*"prefer the pull side, as wetness does"*). The presence-gated weather
boundary fan-out additionally re-resolves `envelopeOutsideK` for occupied
envelope rooms (not only sky-exposed ones) so a room's outside follows a
front while somebody is in it; an empty room's outside is re-resolved on
the next async read (a body arriving restamps).

**D4 — The named source is a closed field on `AmbientLitMixin`.**
`ambientSource: 'sky' | 'glow' | null` (authorable, persistent) and
`ambientOpening: string | null` (a detail id). Rule: `ambientIntensity >
0` ⇒ `ambientSource` set. `sky`: the authored intensity is the **noon**
value; the walk multiplies by `skyFactorNow() × weatherDimFactor`; on a
room that is not sky-exposed it must name `ambientOpening`, a detail the
row authors (the window you can look at — the claim "through an opening"
made checkable). `glow`: an inherent, always-on, non-sky ambient (the
holodeck floor, a luminous cave) — permitted and **ratcheted**
(ceiling = the count the content pass legitimately needs; may fall,
never rise). Runtime never narrows silently: an undeclared source still
emits; the lint refuses it. The weather fan-out stamps the dim factor on
rooms whose `ambientSource === 'sky'` (new predicate `isSkyLit()`),
not only SkyExposed ones. Calibration rule for `sky` rows: `noon lumens
= 80 × sizeScale` (`bright` at a summer noon); clause (d) of the lint
warns on a sky row that would read below `lit` at noon at its own scale.

**D5 — The hearth is a class over `FurnaceMixin`, and room-heating is a
mixin the class composes; a forge never composes it.** New
`SpaceHeatingMixin` (`lib/thermal/SpaceHeating.ts`, kernel — thermal owns
room heat exchange): authorable `heatOutputW` (default 1500), method
`spaceHeatOutputW(): number` = `isLit() && fuelRemaining() > 0 ?
heatOutputW : 0` (reads the furnace face through the host cast, the
`Furnace.furnaceHost` shape). New instanceable `platform/thing/Hearth.ts`
= `SpaceHeatingMixin(FurnaceMixin(LightSourceMixin(ReservedMixin(ThermalMixin(SurfacedMixin(Thing))))))`
(a pot stands on a hearth; a hearth is not a chamber). Rows in the commons:
`generic-objects/content/stuff/thing/Hearth.yaml` (`/stuff/thing/Hearth`,
`burnTemperatureK 700`, `lit: false`, fuel reserve, `emittedIntensity 60`,
`heatOutputW 1500`), plus `stove.yaml` and `brazier.yaml` variants as
rows only. `Campfire` also composes `SpaceHeatingMixin` (an open fire is
for warmth — the practicum brazier is a Campfire row); outdoors there is
no envelope to warm, and that is the envelope's rule, not a host guard.
`Forge`, `Kiln`, `Oven` do not compose it: *a forge heats what you put in
it* stays true by composition, with no code asking "is this a forge".
The couple on the body (`heatSourceK`) is untouched. Authored watts are
honest for now; deriving them from fuel mass × `heatOfCombustion` is a
deferred seam (the fuel trade lands rows, not code).

**D6 — A lamp that burns fuel is a small furnace with a light.**
`platform/thing/Lamp.ts` is **rewritten** (the dead lamppost body goes;
nothing names it): `FurnaceMixin(LightSourceMixin(DetailedMixin(ReservedMixin(ThermalMixin(Thing)))))`.
It gets ignite/douse, `isLit()`, the fuel reserve, reconcile-on-read
drain and the burnout edge for free; `ignite.yaml`'s
`requires: CombustibleMixin|FurnaceMixin` already admits it (arg gate
satisfied, no view edit). Class default `burnTemperatureK` for a Lamp is
**330 K** — the case temperature, below the 345 K scalding hook so `get`
and `feel` do not burn a hand on a lit lantern — and `fuelBurnRatePerMin`
sized so a full lantern burns a game night (≈ 0.15 %/min). The
lit-gating of flux moves **into `FurnaceMixin`** (`getEmittedFlux()`
chains `super` only while `isLit() && fuelRemaining() > 0`), which also
fixes the shipped Campfire/Forge/Oven/Kiln defect in one place. Rows:
`general-store/thing/lantern.yaml` and `torch.yaml` move to
`/platform/thing/Lamp` with `lit: false` (⚠ `FurnaceMixin.lit` defaults
`true` — a row that forgets it ships lit) and a `fuel` reserve; prose
says *"light the lantern"*. `PortableLight` stays for the fuel-less
glowcap rows and its header is corrected. The town's lamps have no
object; their fuel is D7's bill.

**D7 — Public lighting is a declaration on the street, a bill on the
extent, and a schedule at sunset.**

- `PublicLightingMixin` (`lib/perception/PublicLighting.ts`) composed on
  `CartesianLocation` (over `Detailed`): authorable `publicLighting: {
  flux: number, colorTemperature?: number, detail: string, seniority:
  number } | null`. Reads: `isPubliclyLitNow(): boolean` =
  `publicLighting && skyFactorNow() < lampDuskFactor &&
  locality.isStreetLitTonight(myPath)`; the walk's leg (a′) adds `flux`
  when true with the room as the source ref. `getDetail(id)` override
  (one shared read, the Crossing shape generalized): when `id ===
  publicLighting.detail`, append *"The lamps are burning."* / *"The lamps
  stand cold — nobody has lit them tonight."* / *"The lamps are out; it
  is daylight."*. The locality is resolved **once at `postRegister`**
  (async `AddressApi.resolveLocalityFor`) into a transient path so the
  sync reads use `StuffApi.findByTemplatePath`.
- `Locality` gains authorable `_publicLighting: { fuelPerStreetNight:
  minor, supplier: string /* a Business path */ } | null` — **the town's
  fuel bill is one figure in one place** — and runtime `_lightingNight:
  number`, `_lightingLitStreets: string[]` (persistent runtime state).
  `settleStreetLighting(nowS)`: gather live streets whose covering
  locality is this one (`StuffApi.findAll` narrowed by
  `MixinApi.isPublicLighting`), order by `seniority` (the recorded
  preference — watershed's *"the quota rides the right, ordered by a
  seniority recorded in advance"*; today the founder-default holder is
  the row's author), compute `n = min(count, floor(balance /
  fuelPerStreetNight))` off the **realm treasury**
  (`BankingApi.treasuryAccountId(currency)` → `BankingApi.balanceOf`),
  post **one** appropriation for `n × fuel` to the supplier's owner key,
  record the first `n` paths as lit for `_lightingNight`. No supplier,
  no balance → `n = 0` → dark, and `look at the lamps` says so. Nobody
  is judged at the moment of refusal; the order was written in advance.
- The posting primitive is the **shipped** `BankingApi.appropriate(
  toOwnerKey, amount, memo)`: no acting-owner check, source the
  treasury, destination the supplier's primary account, category
  `appropriation` (the correct accounting name for public lighting), and
  it **refuses when short** — S3's failure mode is the shipped refusal,
  not something this build writes. `n` is computed from the balance
  first so the refusal is the exception, not the path. **No new banking
  primitive, no new gate on the money subsystem.**
- ⚠ **One treasury per currency, none per locality.** `TREASURY_PATH =
  "/compact/treasury"`; no Locality holds an account today. So v1 reads
  as *"the realm appropriates for Terminus's lamps"*, not *"Terminus
  pays its own bill"*: the town's **preference** (which streets, in what
  order) is the extent holder's, as decided; the **money** is the
  realm's until a locality treasury exists (Deferred seams). The
  `Government.treasury` key is read for provenance in the memo only.
- The schedule: `WorldClockRegistry.registerSystemSchedules()` adds
  `civic:lighting`, armed at the next sunset
  (`CelestialApi.nextSolarEvent`, sync, EARTH_LIKE/CAMPUS_LATITUDE — the
  D1 assumption again) and re-armed each fire; the callback is
  `AddressApi.settleStreetLighting()` → `AddressLogic` iterates the
  registry's localities. At boot, if it is night and a locality's
  `_lightingNight` is not tonight's index, settle immediately (a reboot
  at midnight does not un-light the town). Dawn needs no event: lamps
  read out when `skyFactorNow() ≥ lampDuskFactor`. A street that was
  evicted at settle time is not billed that night and reads cold when it
  reloads — recorded, acceptable.

**D8 — The cold retune is measured, then two dials and one cap.** W1
lands a gym bench (`lib/thermal/__tests__/Thermal.cold.gym.test.ts`)
that runs a `biped` body naked / in the char-gen outfit / in a wool coat
at 294 / 283 / 268 K for 12 game hours and prints satiation spend and
core. The candidate changes, applied in this order until the bench and
acceptance 15 pass, the rest going to physiology-slate: (1)
`CLO_TO_KELVIN 2.5 → 7` (1 clo is *defined* as comfort at 21 °C seated);
(2) `COLD_SPEND_PER_DEGREE 0.05 → 0.01` (shivering peaks ≈ 5× BMR); (3)
**a cap** `COLD_SPEND_MAX_BASAL_MULT = 4` — shivering cannot exceed 4×
basal, and beyond the gap it can cover (`cap / COLD_SPEND_PER_DEGREE`,
8 K) the core **drifts toward `ambient + coveredGap`** rather than
holding — the honest hypothermia path replaces the impossible
starvation path; (4) worn `clo` enters the body's drift `R`
(`effectiveR × (1 + clo / SHED_BODY_CLO)`) so a parka'd body cools slower
once out of fuel — today it does not. Expected after (1)–(3): naked at
294 K ≈ 4.8 %/h (survives a night, hungry — the finding's 24 %/h was 5×
too harsh), dressed at 281 K holds the setpoint at ≤ 4.8 %/h, and the
drift only begins below ≈ 14 °C for a dressed body. The bench is the
proof; the drive's step 15 is the exit criterion.

**D9 — The cast gets dressed by its rows, and the offstage rooms decree
comfort.** New authorable `wears: string[]` on `lib/npc/NPC.ts`
(garment template paths), applied at `postRegister` by the `TestHooks.#dress`
recipe (clone → move onto the NPC → `occupyAll(slotClaim)`), idempotent
across re-clone. The template-census gate's clause (b) list gains
`wears[]`. Every `cast:` row in the content pass authors an outfit from
existing garment rows. `Offstage` rows author `_temperature: 294` — an
off-stage parking room is not a place and owes no envelope.

**D10 — `look` narrates the light.** `LookController`'s room render
gains a one-line band phrase before the long description (`pitch-black`:
*"It is pitch dark; you can make out nothing of the place."* and the
long description is withheld; `very-dim`: *"Shapes, no more — …"* and the
long description withheld; `dim`: *"It is dim here."* + description;
`lit`/`bright`: no line; `blinding`: *"The glare is hard to look
into."*), the phrase table beside `LIGHT_BANDS` in `Light.ts`. Exits stay
listed at every band (you can feel for a door). This is what makes
acceptance 1 true without authoring.

**D11 — S9 needs one honest content change and one engine fix.**
`applyBandShift` is applied only when `signal.intensity > 0` (a shift
cannot manufacture photons — W0). `homo/koboldus` is re-authored to a
positive shift (`bandShift: +1`, `scotopicMin: pitch-black`): kobolds
move by starlight. The current `-1` reads as a typo against its own
`scotopicMin: very-dim`; the build records the change in the species
row's comment.

**D12 — The census gate is one script, `lint:light-sources`
(`scripts/check-light-sources.ts`), census-then-ratchet.** Clauses: (a)
every Location/Vessel row with `ambientIntensity > 0` declares
`ambientSource` — ceiling starts at today's count of undeclared rows
(84) and must be **0** by W6; (b) a `sky` row that is not sky-exposed
(by the biome chain, statically: own `_biomePath` → zone → none) names
`ambientOpening` and that id exists in its `details:`; (c) `glow` rows ≤
a curated ceiling; (d) a `sky` row's noon band at its own scale ≥ `lit`
(warn at first, gate at W6); (e) a row declaring `publicLighting` lists
no LightSource-composing row in `props:`/`adornments:` and no class
under `platform/thing/` or any pack `src/` is named `*Lamppost*`/
`*StreetLamp*` (acceptance 6: no lamp object anywhere); (f) no row
authors `celestialProfile` (D1's guard at build time). Self-enrols via
`lint:family`.

**D13 — Hours are content.** S8 is rows only: the 27 `[0, 24]` roster
windows become real shifts; the `shifts` brain already parks off-shift
cast in `Offstage`. The plan names which houses stay open all night
(the terminal, the infirmary, the necropolis) and which shut.

**D14 — The drive is `packages/wire/tests/envelope.dirty.wire.test.ts`**
(`DIRTY_REASON`: it buys a lantern, burns fuel, moves the clock scale and
settles a night's lighting). Time is advanced by a wizard `eval` calling
`WorldClockApi.setScale(720)` for the real seconds needed (a game hour
per five real seconds) and restoring 12× — `time.md` names author
`eval` as the v1 lever. ⚠ If the eval sandbox cannot reach
`WorldClockApi`, the fallback is a test-only route on `TestHooks`
(`backend/TestHooks.ts` is the sanctioned home for test-only seams), not
a new wizard check. Winter is out of a wire drive's reach (a season is
7.5 real days); the drive uses **night** for every cold step and the unit
tests pin the winter numbers. Recorded in Risks.

---

## ⭐⭐ Host placement

| new thing | host | what composing/adding it claims about every other composer |
|---|---|---|
| `ambientSource`, `ambientOpening` fields | `AmbientLitMixin` (→ every `Location`) | *Every place that can have ambient light must say where it comes from.* True of every Location; inert (null) by default. Not on `Vessel` (not AmbientLit today; the coach row's dead field is a content fix, not a host change). |
| `skyFactorNow()` memo | `CelestialLogic` singleton (instance fields) | The sky is one thing for the whole realm (guarded, D1). No host in the world carries it. |
| `_envelope` spec + `envelopeTemperatureK` / `envelopeClockStamp` / `envelopeOutsideK` + `reconcileEnvelope` / `envelopeTemperatureSync` | `AtmosphericMixin` (→ `Location`, `Vessel`) | *Every scope that can carry an atmosphere can hold a state different from its outside.* True of a room and of a wardrobe or a coach cabin; **inert where `getVolume()` is null** (Offstage, plain Location, an un-extented Vessel) — that is the mixin's own geometry answering, not a guard. A new `EnvelopeMixin` would compose on exactly the same two hosts, which is the tell that it is the same concern. |
| `SpaceHeatingMixin` (`heatOutputW`, `spaceHeatOutputW()`) | `Hearth` (new), `Campfire` | *This fire exists to warm where you stand.* Never on `FurnaceMixin` (that would claim it of the forge and reintroduce the "is it a forge" guard), never on `Forge`/`Kiln`/`Oven`. Composed outermost so it reads the furnace face; the envelope narrows contents with `MixinApi.isSpaceHeating`. |
| `Hearth` class | `platform/thing/Hearth.ts` (instanceable), rows at `/stuff/thing/Hearth` in generic-objects | A commons object: a second inn's fireplace is a row. |
| `Lamp` class (rewritten) | `platform/thing/Lamp.ts` | *A light that burns fuel.* The lantern and the torch; not the glowcap (stays `PortableLight`), not the mana lamp (arcana's, on `ChargedMixin`), not the sconce (generic-objects', switchable — a candidate to move onto `Lamp` in the content pass if its fiction is oil). |
| `getEmittedFlux()` lit-gate | `FurnaceMixin` | *A fuelled appliance casts light only while lit.* True of all five composers (Campfire, Forge, Oven, Kiln, Lamp, Hearth); chains `super` only if the base emits. Fixes the shipped campfire defect. |
| `PublicLightingMixin` (`publicLighting`, `isPubliclyLitNow`, the `getDetail` line) | `CartesianLocation` (over `Detailed`) | *Any cartesian cell may be lit by a funded public service.* Inert unless declared. Not on `Location` (no `Detailed` there) and not on `FurnishableRoom` (interiors are where objects earn their place — S3). |
| `_publicLighting` (fuel rate + supplier) + `_lightingNight` + `_lightingLitStreets` + `settleStreetLighting()` | `Locality` | *An extent may fund a service and keep the record of what it lit.* The same tier that carries `_weatherPin`, `_governmentKey`, `_reach`. The verb is on the object; `AddressApi.settleStreetLighting()` only iterates. |
| `wears: string[]` | `NPC` (`lib/npc/NPC.ts` → `Cast`, `Extra`) | *Any non-player person can be authored dressed.* Honest of both rungs. Not on `Agent`/`Creature` (an animal is not dressed by a row) and not on `Avatar` (players dress at enroll). |
| solar temperature term | `WeatherLogic` (`deviatedFieldFor`) | *Weather is sky dynamics*; the sun's annual/diurnal temperature is the same term the type deviation is. Reaches sky-exposed scopes through the existing fold and envelope hosts through D3c; nothing else. |
| cold cap + drift clo | `ThermalRegulationMixin` (`integrateThermalSlice`, `driftCore`) and `THERMAL_DEFAULTS` | Dials on the body; no host change. |
| light band phrase table | `lib/perception/Light.ts` beside `LIGHT_BANDS` | Vision-modality vocabulary, where `bandFor` lives. |

⚠ **Guards to refuse if you find yourself writing them:** `if (isForge)`
anywhere in the envelope; `if (!skyExposed) return 0` in the light walk
(the lint carries that rule, the walk emits what the row says);
`if (room is Offstage)` in the envelope (Offstage has no volume — let the
geometry answer); a `wears` applier that checks the NPC's species.

---

## Convention conformance (checked at plan time)

- **`props:` / `cast:`** — current designation on every row this build
  touches (`smithy.yaml:41,54`; `populates:` appears nowhere in content).
  New hearth placements go under `props:`.
- **Locations, not rooms** — every new class is a `Thing`; the only
  location-side changes are mixins on `CartesianLocation`/`Location`
  bases. `FurnishableRoom` is untouched (`lint:locations`).
- **Paths** — `/platform/thing/Hearth`, `/platform/thing/Lamp` (kernel
  classes); rows `/stuff/thing/Hearth` (generic-objects), lantern/torch
  stay `/world/terminus/general-store/thing/*`; settings at
  `packages/content/platform/content/settings/{light,envelope,weather}.yaml`;
  new mixins in `lib/thermal/SpaceHeating.ts` and
  `lib/perception/PublicLighting.ts` — subsystem folders, no `lib/mixins/`.
  `lint:instanceable` for the two classes and their rows.
- **Module scope declares; lifecycles initialize** — the memos are
  instance fields on logic singletons; the lighting schedule registers in
  `registerSystemSchedules`; `Lamp` no longer arms anything at
  `postRegister`. `lint:module-scope`.
- **Import boundary** — all new code under `src/mud/`; the Api facade
  statics forward to logic; `lint:imports`, `lint:thin-forwarder`.
- **Verbs on objects** — `locality.settleStreetLighting()`,
  `room.reconcileEnvelope()`, `hearth.spaceHeatOutputW()`; the only Api
  statics added are forwarding shells (`skyFactorNow`,
  `settleStreetLighting`); the bill posts through the shipped
  `BankingApi.appropriate`. `lint:object-verbs` stays at zero.
- **Mixins registry** — `Mixins.SpaceHeating`, `Mixins.PublicLighting` +
  refusal phrases (`"{} doesn't warm a room"`, `"{} isn't a street the
  town lights"`), `MixinApi.isSpaceHeating` / `isPublicLighting`;
  `lint:mixin-names`. `_mixinName` statics widen to `string`.
- **No new module category, no free helper, no new collection, no new
  Mongo anything, no new banking primitive** — the lighting record is
  fields on `Locality` (an existing persisted Stuff); the bill is a
  shipped `appropriation` leg.
- **`fieldMeta`** for every new field (`lint:field-meta --lint`);
  `runtimeState: true` on the stamps.
- **`_mixinName` widening**, `SecurityApi.decorateApiClass` on any touched
  Api tail — unchanged files.
- **Lint gates this build must satisfy:** `lint:family` (all), and
  specifically `lint:instanceable`, `lint:locations`, `lint:mixin-names`,
  `lint:field-meta`, `lint:module-scope`, `lint:imports`,
  `lint:object-verbs`, `lint:template-census` (the `wears[]` clause),
  `lint:no-authored-faucet`, `lint:schema` (no schema change expected —
  confirm), `lint:drive-scripts` (no `scripts/drive-*.ts`), and the new
  `lint:light-sources`.

---

## Waves

Each wave is independently landable, ends at one
`build(envelope W<n>): …` commit, and leaves the realm playable. Mid-build
gating is `pnpm test:near` + every touched pack's own vitest +
`pnpm -C packages/server lint:family`; `pnpm test` runs once before the MR.

### W0 — The sky, and a realm that can be dark honestly

**Goal.** Outdoor light follows the sun, moon and cloud; a dark room
reads as dark; the census gate exists with today's count as its ceiling.
**Decisions.** D1, D2, D4 (field + walk), D10, D11 (engine half), D12
(scaffold), the `FurnaceMixin` flux gate from D6, the dead `Lamp.ts`
retirement (the rewrite lands in W2; W0 deletes the lamppost body and
leaves the file absent — nothing imports it: verify with grep).
**Files.** `api/celestial.ts`, `platform/idea/api/CelestialLogic.ts`
(`skyIlluminanceFactor`, `skyFactorNow`, the profile guard);
`lib/perception/AmbientLit.ts` (`ambientSource`, `ambientOpening`,
`isSkyLit()`); `platform/idea/modalities/VisionModality.ts` (leg (a)
multiplies by the sky factor for `sky` rows; `perceiveFor` zero-signal
rule); `lib/perception/Light.ts` (band phrase table);
`platform/idea/cmd/perception/LookController.ts` (the light line, D10);
`platform/idea/api/WeatherLogic.ts:750` (`isSkyLit()` instead of `sky`
for the dim stamp); `lib/fire/Furnace.ts` (`getEmittedFlux` gate);
`platform/thing/Lamp.ts` (deleted); `scripts/check-light-sources.ts` +
`package.json` `lint:light-sources`; `packages/content/platform/content/settings/light.yaml`;
`species-and-names/.../homo/koboldus.yaml` (`bandShift: +1`).
**Content in this wave.** All 41 outdoor-biome rows get `ambientSource:
sky` and a calibrated noon `ambientIntensity` (`80 × extent²`; the five
dark Terminus streets get theirs — the crossing, the square, the
avenue-block, the wharf bank, delight road); rows with an existing value
are re-calibrated. Interiors are untouched (they keep reading as today;
the lint ceiling counts them).
**Tests.** `CelestialLogic` sky-factor curve at the eight anchor times
(unit); `VisionModality` sky × dim × zero-shift (unit, the existing
`__tests__` file); `Look` light line per band (controller test);
`Furnace` flux gate (the existing furnace tests).
**Acceptance.** `look` on the crossing at noon and midnight differ; a
sealed cellar reads `pitch-black` to a kobold; `lint:light-sources`
passes with ceiling = today's count; every wire test still green
(`ground.wire`, `platform-smoke`).
**Commit.** `build(envelope W0): the sky is a sync memo; a dark room says so`

### W1 — Cold is a cost, not a corpse

**Goal.** Measure the cold branch, retune it, dress the cast, decree the
offstage rooms — before any room is allowed to get cold.
**Decisions.** D8, D9.
**Files.** `lib/thermal/__tests__/Thermal.cold.gym.test.ts` (the bench —
written first, run, its numbers pasted into the plan's drive record
section as *"W1 measurement"*); `lib/thermal/Thermal.ts`
(`THERMAL_DEFAULTS`: `CLO_TO_KELVIN`, `COLD_SPEND_PER_DEGREE`,
`COLD_SPEND_MAX_BASAL_MULT`); `lib/thermal/ThermalRegulation.ts` (the cap
and the covered-gap drift target in `integrateThermalSlice`; clo in
`bodyTau()`); `lib/npc/NPC.ts` (`wears`, the postRegister applier);
`scripts/check-template-census.ts` (clause (b) + `wears[]`); every
`cast:` agent row in `terminus`, `hearthworks`, `saxonberg-lounge`,
`rejection`, `hearts-delight`, `hinkley-hills`, `eternal-university`
(`wears:` from existing garment rows — list them from
`grep -rl "equipment/Garment" packages/content`); the offstage rows
(`_temperature: 294`).
**Tests.** The bench (gym, not in `pnpm test`); unit tests on the cap and
the drift target; an `NPC.wears` test beside `lib/npc/__tests__`.
**Acceptance.** Bench: a dressed biped at 281 K for 12 game hours ends
alive, conscious, satiation > 40 %; naked at 294 K ends alive; the
existing thermal suite green (`Thermal.test.ts`,
`ThermalRegulation.*.test.ts` — expect band-number assertions to move;
re-derive them from the physics, do not pin the old numbers).
**Commit.** `build(envelope W1): the cold branch measured and retuned; the cast dressed by its rows`

### W2 — The lamp burns fuel

**Goal.** A lantern you light goes out.
**Decisions.** D6.
**Files.** `platform/thing/Lamp.ts` (the fuelled light);
`platform/thing/equipment/PortableLight.ts` (header only);
`general-store/thing/{lantern,torch}.yaml` (class, `lit: false`, `reserves.fuel`,
`burnTemperatureK`, prose); `lib/mixin.ts` (no new mixin — `Lamp`
composes shipped ones); the general-store keeper's price rows if the
class change touches `stockLines` (verify with `lint:template-census`).
**Tests.** `platform/thing/__tests__/Lamp.test.ts`: light → flux; burn a
game night → out and dark; `feel` a lit lamp is below scalding; `ignite`
refuses an empty lamp with `not-flammable`.
**Acceptance.** Drive steps 4–5 in a unit-level controller test (`light
lantern`, `douse lantern`) and the wire smoke still green.
**Commit.** `build(envelope W2): a lantern is a small furnace with a light, and it runs out`

### W3 — Outside gets a night and a winter; the room is an envelope

**Goal.** Indoor temperature is derived, drifts toward outside at a rate
the construction and the openings set, and bodies feel it.
**Decisions.** D3 (a–d).
**Files.** `platform/idea/api/WeatherLogic.ts` (the solar term in
`deviatedFieldFor`; memo); `settings/weather.yaml` (two dials);
`lib/biome/Atmospheric.ts` (`_envelope`, the three stamps,
`envelopeApplies`, `reconcileEnvelope`, `envelopeTemperatureSync`,
`openExteriorOpenings()`); `platform/idea/api/BiomeLogic.ts`
(`resolveTemperatureFor` + the trace variant; `outsideTemperatureFor`);
`base-library/.../biome/indoor/baseline.yaml` (delete
`_defaultTemperature`); `lib/thermal/Thermal.ts`
(`refreshAmbientFromEnvelope` in `reconcileThermal`);
`lib/thermal/ThermalRegulation.ts` (the cached offset);
`WeatherLogic.runBoundaryFanout` (re-resolve outside for occupied
envelope rooms); `settings/envelope.yaml` (three dials).
**Tests.** `lib/biome/__tests__/Atmospheric.envelope.test.ts`: τ shut vs
one open exterior door; a 1.5 kW input's steady state; an authored
`_temperature` wins; `getVolume() === null` → no envelope; a zone-authored
temperature gets no weather. `BiomeLogic` trace provenance `'envelope'`.
`Thermal.test.ts`: a loaf in a warming room follows it with no restamp.
`ThermalRegulation`: a body in a warming room stops paying cold with no
restamp. `WeatherLogic`: the solar term at four anchors.
**Acceptance.** `feel` in the general store at night reads `cool`, and at
noon `warm`; a body standing there pays the cold branch and its cue
fires; the Hearthworks suite green (the sealed cellar reads its own
authored temperature — verify the row; if it has none, author 285 K in
this wave, the bespoke case).
**Commit.** `build(envelope W3): the room holds a state different from outside, at a cost`

### W4 — The hearth warms its room; the forge still does not

**Goal.** S5 in code and in the Hearthworks.
**Decisions.** D5.
**Files.** `lib/thermal/SpaceHeating.ts`; `platform/thing/Hearth.ts`;
`platform/thing/Campfire.ts` (composes `SpaceHeatingMixin`);
`lib/mixin.ts` (`Mixins.SpaceHeating` + refusal phrase);
`api/mixin.ts` (`isSpaceHeating`); `generic-objects/content/stuff/thing/{Hearth,stove,brazier}.yaml`;
hearthworks `cookhouse.yaml` `props:` (+ `/stuff/thing/Hearth`); the
`Hearth` entry in `lib/paths.ts` only if a `TemplatePaths` constant is
needed (it is not).
**Tests.** `Hearth.test.ts`: lit → `spaceHeatOutputW > 0`; burnout → 0; a
room with a lit hearth climbs over game-minutes; a room with a lit
`Forge` does not move; the forge couple test stays green.
**Acceptance.** Cookhouse warms over a game hour with the hearth lit and
cools when the door to the yard is open; the smithy with a roaring forge
reads outside temperature; the smith still works (`heat`/`forge` gates
read `reachableHeatK`, untouched).
**Commit.** `build(envelope W4): a hearth heats where you stand; a forge heats what you put in it`

### W5 — The town lights its streets, and pays

**Goal.** S3: a declaration on the street, a bill on the extent, dark
when unpaid.
**Decisions.** D7.
**Files.** `lib/perception/PublicLighting.ts`;
`lib/location/CartesianLocation.ts` (composition);
`platform/idea/modalities/VisionModality.ts` (leg (a′));
`platform/idea/Locality.ts` (fields + `settleStreetLighting`, calling
the shipped `BankingApi.appropriate`); `api/address.ts` +
`platform/idea/api/AddressLogic.ts` (`settleStreetLighting` iterate);
`platform/idea/WorldClockRegistry.ts` (`civic:lighting`);
`lib/mixin.ts`, `api/mixin.ts`; `scripts/check-light-sources.ts`
(clause (e)); content: `terminus-city.yaml` (`_publicLighting:
{ fuelPerStreetNight, supplier: /world/terminus/general-store/business }`),
the lit streets (`crossing`, `avenue-block`, `square`, `mayfield street`,
`wharfside bank`: `publicLighting: { flux: 400, detail: lamps, seniority }`
+ a `lamps` detail each), and one street deliberately **not** lit
(`delight-road/crossroads`) plus one whose service has lapsed for the
drive (a locality with `_publicLighting` but an empty treasury —
`hearts-delight`'s `valley-gate`, funded by a government with no
account; verify the row resolves a government at all, else it is simply
"never lit").
**Tests.** `PublicLighting.test.ts`: lit iff night ∧ funded; the detail
line in each state. `Locality.lighting.test.ts`: seniority order under a
short balance; one `appropriation` leg per night; no double settle on
re-arm; the treasury's own short-refusal leaves every street dark.
**Acceptance.** Drive steps 6–7 and 14; `lint:light-sources` (e) passes.
⚠ Record in the wave's commit and in `civics.md` at the sweep: v1 is the
realm appropriating for the town (one treasury per currency); the
locality treasury is a deferred seam, not this build's.
**Commit.** `build(envelope W5): street lighting is a property of the street and a bill on the extent`

### W6 — The content pass

**Goal.** Every shipped room has a source or is deliberately dark;
businesses keep hours; the lint ceilings reach zero.
**Decisions.** D4 (rows), D9 (remaining cast), D13.
**Rows.** Every one of the ~150 interior rows: (i) an `ambientSource`
decision — `sky` with `ambientOpening` (a window detail) for interiors
with windows, nothing for interiors lit by spill (any room with a
doorless exit to a `sky` room reads daylight at full strength already —
the largest class; verify by running the walk in a boot test), a lamp or
hearth in `props:` for interiors that must be usable after dark (the
terminal hall, the infirmary, the general store, the lounge bar — a
hearth; the dorm rooms — a candle row exists), `glow` for the sandbox
`CircleFloor` and Rejection's glowcap caves (the ratchet ceiling); (ii)
doors on exterior exits where the fiction wants a shut shop (the general
store's `south` gets a `door:` row so its light and heat close at
night); (iii) `_temperature` on the two cellars and the brewing/vintner
floors already authored (keep — they are the cellar case); (iv) the 27
`[0, 24]` roster windows → shifts (keep 24/7: terminal clerk, infirmary,
necropolis); (v) remaining `cast:` outfits; (vi) `ambientIntensity`
removed from the coach row (dead field) unless transport's `Coach` is
made AmbientLit — leave it to the transport pack. Land in **three
commits** by pack cluster (terminus+world-seed; hearthworks+lounge+
university; rejection+hearts-delight+hinkley-hills+trades) so each is
reviewable; the ceiling in `check-light-sources.ts` falls with each.
**Tests.** A boot-level census test in `platform/idea/__tests__` that
clones every Location row and asserts `signalAt` at noon ≥ `dim` unless
the row is in the deliberately-dark list (the list is the second ratchet).
**Acceptance.** `lint:light-sources` clause (a) ceiling = 0, (d) gates;
acceptance 13 and 16 (a second town = rows: prove it by authoring one
street + one interior in `world-seed`'s Narnia with no code).
**Commit.** `build(envelope W6): every room authored with a source; hours that bite`

### W7 — The drive, and the docs

**Goal.** The requirements' 15-step drive run against the running game;
the subsystem docs changed by this build updated.
**Decisions.** D14.
**Files.** `packages/wire/tests/envelope.dirty.wire.test.ts`;
`docs/subsystems/{light,thermal,time,weather,biome,fire,ground}.md`
(light: ambient as a derived quantity, the source vocabulary, the
census; thermal: the envelope term, the **narrowed** ventilation
non-goal, the retuned dials and the cap; time: D6 closed; weather: the
solar term and the second dim sibling; biome: the indoor decree gone;
fire: the hearth and the lamp; ground: the floor as part of the envelope,
coverings still its seam); `CLAUDE.md` map lines are **left to the
sweep**.
**The drive.** Boots a wizard session and a plain session; funds the
budget if needed (`treasury appropriate` or a wizard eval); walks the 15
steps with the clock at 720× between them (D14); asserts the envelope
(`ok`/`declined` + reason codes: `too-dark-to-read`) and the prose
(`squash(...)` matches: *"lamps are burning"*, *"stand cold"*, *"The
air feels cool"*, the body cue). Step 15 is the last: after a full game
day at 720× (2 real minutes) the wire log shows no `(dead)` Cast and
`query` over the cast returns conscious bodies.
**Commit.** `drive(envelope): <what driving found>` then
`docs(envelope): subsystem docs for the envelope build`.

---

## Reachability wiring

The five links, per new capability. Each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| light a lantern / hearth | `ignite.yaml` `[ignite, light, kindle]` — ships | `FurnaceMixin.commandContributions.peers` affords `ignite`/`douse`/`pump`/`heat`/`boil`/`warm` — ships; **a Lamp in your hand** is `self`, not `peers`: verify `light lantern` resolves a held lamp (the `reachable` scope includes inventory; if the affordance is peers-only for a held item, add `ignite`/`douse` to `self` on `FurnaceMixin`) | lantern/torch rows on `Lamp`; `Hearth.yaml` in generic-objects; `props:` in cookhouse | nothing to warm — Things clone with their rooms | `requires: CombustibleMixin\|FurnaceMixin` — **satisfied** |
| douse | `douse.yaml` — ships | same | same | — | same |
| the sky | none (a `look`) | — | `ambientSource: sky` on 41 rows | the celestial singleton is `singletonSync`-created on first read; the memo seeds itself | — |
| the room's warmth | `feel` (bare) — ships | — | `_envelope` optional; defaults apply | none; reconcile-on-read | `requires: any` |
| the body's cold | `look` body line / the `self.body` cue — ship | — | dials | — | — |
| public lighting | `look at lamps` — `look` ships; the detail is the row's | `PublicLightingMixin.getDetail` | `publicLighting:` on street rows + `_publicLighting` on the locality + a government with a treasury + a supplier Business | `civic:lighting` registered in `registerSystemSchedules`; the boot-time settle | — |
| the town pays | none (a schedule) | — | the realm treasury (`/compact/treasury`, `BankingApi.appropriate`) + a supplier Business with a primary account (**a treasury holding less than one street-night lights nothing** — the shipped refusal) | the clock boots before packs finish? Verify `registerSystemSchedules` runs after the address registry is warm; if not, the callback resolves lazily on first fire | — |
| hours | `clock on/off` ship; the roster tick | `shifts` brain on each cast row (`behaviors:`) | roster `schedule` windows | `EmploymentLogic.boot` arms the tick — ships | — |
| S9 night vision | none | — | `koboldus.yaml` `bandShift: +1` | species catalogue — ships | — |
| dressing the cast | none | — | `wears:` on cast rows; garment rows exist | `NPC.postRegister` | — |

⚠ The two links most likely to ship dead: (1) `light lantern` on a
**held** lamp — controller tests skip the binder; prove it on the wire
in W2; (2) the realm treasury funded and the supplier holding a primary
account at the first sunset — the drive reads `treasury` before step 6
(the `treasury` verb is the shipped read).

---

## Acceptance-criteria coverage

| # | criterion | waves |
|---|---|---|
| 1 | two descriptions, noon vs midnight, unauthored | W0 (D1, D10) + the crossing's `sky` row |
| 2 | full moon: move, door, a presence; not read, not a face | W0 (D2 `very-dim`), `read` refuses (ships) |
| 3 | moonless/overcast: needs a light, and the game says so | W0 (D2 + D10's pitch-black line + `too-dark-to-read`) |
| 4 | lantern works; out → dark immediately | W2 (the walk reads flux live) |
| 5 | lit street needs no lantern; unlit does | W5 |
| 6 | unlit street dark; lamps "standing cold"; **no lamp object** | W5 + `lint:light-sources` (e) + the `Lamp.ts` retirement in W0 |
| 7 | no room shows light without a source; census refuses a new one | W0 scaffold → W6 ceiling 0 |
| 8 | unheated room in winter: cold from prose + body line | W3 (D3a/b, `feel`, the shiver cue, the `look` body line — add a *"You are cold"* clause to `Creature.bodyBuildPhrase`'s mirror in W3 if the cue alone is judged insufficient at the drive) |
| 9 | hearth warms gradually; just-lit ≠ long-lit | W4 |
| 10 | open door costs warmth; shut stops it | W3 (+ the general store's new door row in W6) |
| 11 | fire runs out; room cools | W4 (furnace burnout edge ships) |
| 12 | forge does not warm its room; smith works | W4 (composition), forge-couple tests |
| 13 | shut at night, staff gone, street emptier | W6 (D13) |
| 14 | dawn: light returns, lamps out, shops open | W0 + W5 + W6 |
| 15 | a full game day kills nobody of cold | W1 (bench) + W3 (envelope on) + W6 (offstage decree, outfits) + W7 (the drive's last step) |
| 16 | a second town = rows only | W6 (the Narnia proof), D5/D6/D7 shapes |

Nothing unmapped.

---

## Test & gate strategy

- **Unit** (in `pnpm test`): the sky curve; the walk's factor
  composition and zero-signal rule; the envelope's τ, steady state,
  override precedence, opening count; the outside resolve's provenance;
  the pull-side refresh in both thermal mixins; the cold cap and drift
  target; `Lamp`, `Hearth`, `SpaceHeating`; `PublicLighting` state
  table; `Locality.settleStreetLighting` seniority + one `appropriation`
  leg + the short-treasury refusal; `NPC.wears`; the boot-level light
  census.
- **Gym** (`pnpm test:gym`, not in `pnpm test`): the cold bench (W1) —
  its output is pasted into this plan's drive record.
- **Wire** (`pnpm wire`): `envelope.dirty.wire.test.ts` (W7). Per-worktree
  `WIRE_PORT`; never `dev:server` beside a driving sibling.
- **Lints:** the family, plus the new `lint:light-sources` with two
  ratchets (undeclared-source ceiling → 0 at W6; `glow` ceiling curated).
- **Full suite:** once before the MR opens, once at `/finalize`. A green
  run holds until a source file changes.
- **What only the drive proves:** the prose of a dark street in a
  browser (the wire asserts the envelope; textiles found three defects
  in the browser after 15/15 on the wire), `light lantern` on a held
  lamp through the binder, the budget actually funded at sunset, the
  cast alive after a day.

---

## Risks & opens

1. ⚠⚠ **The requirements assumed a winter that does not exist in the
   temperature.** Weather deviates by type (−1..−5 K); season only biases
   snowfall. D3a adds a stateless solar temperature term (annual ±10 K,
   diurnal ±4 K). It is small and in the requirements' own spirit ("the
   sun is low, therefore it is cold … the same fact"), but it is a
   product-visible change the requirements did not name: summers get
   hot, winters get cold, everywhere outdoors. **The user should confirm
   before W3.** If declined, S4 collapses to "the room drifts toward a
   17 °C outside" and acceptance 8 is unobservable.
2. ⚠ **"Dressed as it ships" ships naked.** No Cast row wears anything
   and no row *can*; D9 adds `wears:` and dresses the cast in the content
   pass. That is a kernel field and ~40 row edits the requirements did
   not enumerate (they said "the content pass … gives every shipped room
   its light and its warmth"); the alternative — dials soft enough that a
   naked body at 8 °C is fine for a night — is dishonest physics.
3. **The realm's streets are dark today** (the crossing, the square, the
   hall author no ambient). W0 lights them by day; before W0 nothing
   changes. If a reviewer expects "convert noon values", point at the
   census in Grounding.
4. **The wire drive cannot reach winter.** Night carries the cold steps;
   the unit tests carry winter. If `eval` cannot call
   `WorldClockApi.setScale`, the fallback is a `TestHooks` route — not a
   wizard check.
5. **The lighting bill's account.** The realm treasury
   (`/compact/treasury`) is the payer — one per currency, none per
   locality — so v1 is *"the realm appropriates for Terminus's lamps"*,
   a softening of S3's *"the town's treasury buys the fuel"* recorded in
   D7 and at the sweep. The supplier Business (the general store) must
   hold a primary account at the first sunset; verify at W5 and let the
   drive read the treasury balance first.
6. **Cost of the envelope reconcile on the vitals read.** Every cockpit
   poll now walks the room's exits and asks `isSkyExposed` per exit. If
   the bench shows it, cache `openExteriorOpenings()` per game-minute on
   the room. Measure, do not pre-optimize.
7. **`FurnaceMixin.lit` defaults `true`.** Every new Lamp/Hearth row must
   author `lit: false`; add a clause to `lint:light-sources` (g): a row on
   `Lamp`/`Hearth` without `lit:` fails.
8. **`heatContents` on a Lamp.** The fire tick deposits toward 330 K into
   Meltables beside a lit lamp (ice, wax). Honest at that temperature;
   note it in fire.md.
9. **A hearth in the Lounge.** Warren-minted lounge rooms have volume
   and no hearth; the bar gets one. If minted rooms read cold at night
   and that is judged wrong for the off-map lounge, the `Lounge` room
   template authors `_temperature` (the bespoke case) — a content call
   at W6, recorded either way.
10. **Do not** add a Discipline, touch `measure`/`analyze`, or name coal
    or peat rows. Fuel is `reserves.fuel` on the row; when extraction
    lands, its rows fill the reserve — no code here knows a fuel's name.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **Fuel as mass** — `heatOutputW` and `fuelBurnRatePerMin` derived from
  the fuel's `heatOfCombustion` and a real mass reserve (the energy
  build; `power-utility-slate`).
- **Thermal windows** — a Window as a thermal opening (no Window rows
  exist); with the covering ladder → `field-substrate-slate` (coverings
  as insulation).
- **A fuelled generalization of the reserve drain** — Furnace, Combustible,
  MechanicalMovement and now Lamp each carry a reconcile-on-read drain
  over a `Reserve`; a `Reserve.drainPerGameMin` would fold four copies
  into one. Kernel, later (`thermal-slate` or a new `reserve` line).
- **Room-to-room air mixing** — still a non-goal (S6). `thermal-slate`.
- **The lamplighter as a trade; a fuel market** — energy build.
- **Who decides which streets go dark first** — seniority on the row
  today; the extent's committee tomorrow (`institutions-slate`).
- **A locality-level treasury** — an account (free:
  `BankingApi.ensureVenueAccount(ownerPath, …)` mints one for any owner
  path), income (the demo sales tax already flows seller-collected to
  the realm treasury via `remitDemoTax` from `buy`, `order` and
  `PricedOffer` — routing it to the locality where the sale happened is
  the obvious seam), and an appropriating primitive generalized from
  *the* treasury to *an appropriating body's account*. Destination:
  `livelihood-slate` §7 (*"the state's appropriation primitive + civic
  wages/procurement/bounties"*) and `credit-slate` (*"where taxes come
  from"*, Q8). Not scoped into this build.
- **Frostbite, sleep, cold as injury** — `physiology-slate` (Part 7g).
- **A compressed-clock wire boot group** — `wire-suite-growth-slate`.
- **Per-zone celestial profiles** — the D1 guard names the seam;
  `time.md § Future work`.
- **Business hours driving a house's own lamp** (a keeper lights the shop
  at dusk) — a brain, when the labor build wants it (`crew-slate`).

---

## Critical files

Read first, in this order:

1. `docs/requirements/envelope-requirements.md`
2. `docs/subsystems/light.md`, `thermal.md`, `fire.md`, `time.md`
   (§ Layer 2, § The clock tower is prose), `weather.md` (§ Wave 2),
   `biome.md` (§ SkyExposedMixin, the chain walk), `civics.md`,
   `governance.md § Seat-held title`, `docs/lint-family.md`,
   `docs/testing.md § Two tiers`, § The clock ceiling
3. `packages/server/src/mud/platform/idea/modalities/VisionModality.ts`
4. `packages/server/src/mud/lib/perception/{AmbientLit,Light,LightSource}.ts`
5. `packages/server/src/mud/platform/idea/api/CelestialLogic.ts`,
   `api/celestial.ts`
6. `packages/server/src/mud/lib/biome/Atmospheric.ts`,
   `platform/idea/api/BiomeLogic.ts` (lines 230–300, 470–560, 720–800)
7. `packages/server/src/mud/lib/thermal/{Thermal,ThermalRegulation}.ts`
8. `packages/server/src/mud/lib/fire/Furnace.ts`,
   `platform/idea/api/FireLogic.ts` (lines 140–160, 250–270),
   `platform/thing/{Campfire,Forge,Oven,Candle,Lamp}.ts`,
   `platform/thing/equipment/PortableLight.ts`
9. `packages/server/src/mud/platform/idea/api/WeatherLogic.ts`
   (lines 100–160, 700–760), `lib/weather/WeatherType.ts` (lines 80–160,
   330–340)
10. `packages/server/src/mud/platform/idea/Locality.ts`,
    `platform/idea/Government.ts`, `api/address.ts`, `api/government.ts`,
    `api/banking.ts` (lines 400–500), `platform/idea/api/BankingLogic.ts`
    (`transfer`, `payWage`), `platform/idea/WorldClockRegistry.ts`
    (`registerSystemSchedules`)
11. `packages/server/src/mud/platform/location/Crossing.ts`,
    `lib/location/CartesianLocation.ts` (lines 50–75, 190–240),
    `lib/stuff/Location.ts` (lines 86–130)
12. `packages/server/src/mud/lib/npc/NPC.ts`,
    `packages/server/src/backend/TestHooks.ts` (lines 270–310)
13. `packages/server/scripts/{check-ground,check-openings,check-template-census,pack-roots}.ts`
14. `packages/content/platform/content/platform/cmd/device/{ignite,douse,switch}.yaml`,
    `cmd/perception/{read,feel}.yaml`
15. Content exemplars: `terminus/.../university-avenue/location/crossing.yaml`,
    `mayfield-row/street.yaml`, `general-store/{shop-floor,thing/lantern}.yaml`,
    `hearthworks/.../location/{smithy,cookhouse,cellar}.yaml`,
    `generic-objects/content/stuff/thing/{Campfire,Forge}.yaml`,
    `base-library/.../biome/{universe,indoor/baseline,outdoor/baseline}.yaml`,
    `platform/content/platform/idea/Locality/terminus-city.yaml`,
    `terminus/content/world/terminus/budget.yaml`
16. `packages/wire/tests/{ground.wire,fishing.dirty.wire}.test.ts`,
    `packages/wire/src/harness/session.ts`

---

## Drive record

*(appended at build time — the W1 bench output, then the W7 drive: the
run, the count, what each failure was.)*
