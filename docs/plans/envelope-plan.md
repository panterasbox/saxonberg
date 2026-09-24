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
  1 m²). ⭐ So the content pass is not "convert noon values" — the sky
  is derived for every sky-exposed row (D4) and the pass is "give every
  interior a source, and delete the stray values that meant *lit by
  day*"; `look` on a dark street will *change* for the better at the
  first wave boundary with no row edit.
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
`analyze`; untouched — ⚠ `feel` is **not** theirs: it is the shipped
perception verb this build extends with the cause line, D3e, the same
read saying where its number came from, not a new instrument); build-4
`design/clinical-medicine` (Disciplines; untouched); master detached on
`design/guild-player-institution`.

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

Anchored to the shipped table (a sky-lit room's **noon** lumens, derived
as `80 × sizeScale` or authored): a 9 m² cell at 720 lm reads 80 lux `bright` at a summer noon (sin 71° =
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
309, summer night ≈ 301. **Settled: approved by the user 2026-09-24** as
a product-visible change — summers get hot, winters get cold, everywhere
outdoors — closing the gap the requirements' survey missed (Risks &
opens #1 carries the reasoning); without it S4, acceptance 8 and 15
cannot be observed. A fresh build agent does not stop to ask. ⚠ Not
widened: one latitude means one climate — Terminus and Rejection get the
same winter on the same day — and the per-zone `celestialProfile`
override stays unexercised and out of scope (the biome-normalization
slate's business).

*3b. The envelope.* ⭐⭐ **The rule that keeps the cascade honest:
authors author CAUSES, not EFFECTS.** A room declares its construction,
its openings and what burns in it; its warmth is derived. `_temperature`
is the **exception** mechanism (a cellar, a cave), never the normal one,
and every exception is listed and ratcheted (D15). **The biome line:** a
biome may say what the outside **air** is doing (an underground biome's
285 K is the air of the mine); it may **never** say how well a structure
holds heat. Construction is a fact about the room, climate is a fact
about the air, and construction on a biome would give `biome:
warm-tavern` rooms warm with no fire in them, cascading to every row
that references it. `lint:envelope` clause (c) refuses construction keys
on any biome row.

⭐⭐ **The envelope derives from what the room is MADE OF.** You cannot
author *well-insulated*; you author *granite* and the physics decides.
A U-value somebody picked is still an effect. Two shipped things make
the honest version cheap:

- `Material.thermalConductivity` — a real `W/(m·K)` on `Material`
  (`lib/material/Material.ts:206`), authored on **154 content rows**
  (0.025 insulator · 0.5–0.6 masonry · 80 iron), and its own comment
  says *"no live consumer yet — seeded ahead per the reality-shaped
  discipline"*. The envelope is the consumer it was seeded for — the
  third dead seam this build joins (sun→light, fuel→lamp, and this).
  `getDensity()` and `getSpecificHeat()` (`Material.ts:800, 821`) give
  the fabric's heat capacity the same way.
- `FloorSpec` (`lib/stuff/Location.ts:38`) is the authoring shape: *"the
  Location's own say in what its floor is, without authoring a floor
  row… a room that just wants cobbles, laid writes three words here."*
  Mirror it exactly.

New on **`Location`** (beside `floor`, same file, same doctrine):
`fabric: FabricSpec | null`, `FabricSpec = { material: string /* a
Material path */, thicknessM?: number }`, authorable, persistent; and a
class hook `fabricDefaults(): FabricSpec` (the `floorDefaults` shape) so
a room kind can say what it is built of (`SealedCellar` → the rock).
⚠ **A Location stays SPACE, not matter** (`Location.ts:90`): it is not
`Tangible` and gains no mass — it *names* a material, exactly as it
already names its floor's. A `Vessel` needs no spec: it IS `Tangible`
and its fabric is its own `getMaterial()`.

The ladder, resolved once at the async temperature resolve (D3c) and
cached transiently on the host (`_envelopeResolved: { kWmK, rhoKgM3,
cJkgK, thicknessM, materialPath }`): (1) the room's own `fabric` spec;
(2) the class hook `fabricDefaults()`; (3) a `Vessel`'s own material;
(4) the universe default, `envelope.defaultFabric` (a Material path —
masonry) + `envelope.defaultThicknessM 0.3` in `settings/envelope.yaml`.
The material lookup is the sync catalogue read (`MaterialCatalogue`), so
the cache is a convenience, not a necessity.

**What is derived:** `U_fabric = (k / t) × A`, `A = 5 · extent²` (walls
+ roof of a cube cell). Masonry 0.6 / 0.3 m → 2 W/m²K; timber 0.12 /
0.15 → 0.8; an insulator 0.025 / 0.1 → 0.25; iron sheet 80 / 0.005 →
16 000 — a tin shed is the street, honestly. `C = C_air + ρ · c · A ·
activeDepthM` — the skin of the fabric that answers within the hour
(masonry at 0.01 m ≈ 810 kJ/K → τ ≈ 2.5 h shut; the stone holding the
day is literally this term).

**What survives as an authored knob, and why:** the room's `fabric`
(material + thickness — a **cause**, ordinary, needs no list);
`envelope.openingUPerM3` (air exchange through an open doorway is a flow
constant, not a material property — a universe dial, not per room);
`envelope.activeDepthM` (the one rate dial, playtest-tuned, universe
only); the two universe defaults above. **Gone:** `fabricUPerM2`,
`fabricMassFactor`, any per-room or per-zone `_envelope` override —
there is no honest need for a raw U-value when "well-insulated" is a
material and a thickness.

**This dissolves the agreement problem instead of working around it.**
There is no building in this model — a zone guarantees only that its
Locations are contiguous and share a coordinate system (a closet in a
mansion may be its own zone; an office block may be carved by floor), a
Locality is an address prefix, a Parcel is title and ground. A granite
shopfront with a timber stockroom behind it is not dishonest: it is a
stone shop with a timber lean-to. The dishonesty was never *rooms
differ*; it was *rooms differ for no reason*, and **a material is a
reason**. No zone default: a fabric is one line, `cellSize` is per-zone
because a zone is a coordinate carve-up and geometry is what it owns,
and `FloorSpec` has no zone rung either — the material is the room's,
like its floor's. (See Deferred seams for the Structure concept this
build does not need.)

Runtime fields on `AtmosphericMixin`: `envelopeTemperatureK`,
`envelopeClockStamp`, `envelopeOutsideK` (persistent, `runtimeState`)
and the transient `_envelopeResolved`. Methods:

- `envelopeApplies(): boolean` — `getVolume() !== null && this._temperature
  === null && !BiomeApi.isSkyExposed(this)`. An authored own
  `_temperature` wins (the cellar / the cave that is the same all year —
  lens 2's bespoke case stays a row).
- `reconcileEnvelope(): void` (sync, reads `_envelopeResolved`): `U =
  U_fabric + U_open` with `U_fabric` derived from the fabric as above;
  `U_open = openingUPerM3 × V × nOpenToOutside` (an open door is air
  exchange, not conduction); `C = 1.2 · 1005 · V + ρ · c · A ·
  activeDepthM`. `P = Σ spaceHeatOutputW()` over
  contents composing `SpaceHeatingMixin` (D5). `T_ss = outside + P/U`;
  `T ← Decay.toward(T, T_ss, elapsed, C/U)` — exact for piecewise-constant
  inputs, the `ThermalMixin` shape. No far-past guard (a room left
  overnight IS cold in the morning); the elapsed gap integrates at the
  heat input as read now (a hearth that burnt out mid-gap over-credits
  the room for one read; bounded, self-correcting, noted in thermal.md).
  For a 3 m masonry cell: `U_fabric = 2 × 45 = 90 W/K`, `C ≈ 33 + 810
  ≈ 843 kJ/K`, `τ_closed ≈ 2.6 h`; one open street door adds `6 × 27 =
  162 W/K` (`τ ≈ 56 min`); a 1.5 kW hearth holds +17 K over outside shut
  and +6 K with the door open — *a heated room with the door open is
  expensive* falls out of the arithmetic, and a timber cell (U 36 W/K)
  holds +42 K from the same fire, which is why a timber cabin is warm and
  a stone hall is cold.
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
becomes: run the chain **in full** (a biome's temperature is the air's —
Rejection's `underground/upper-workings` 285 K is honest and stays); if
the scope is an envelope host and the trace's own-override step did not
answer, `outside` = the chain's answer **+ the weather deviation** (type
+ solar) iff the answer came from the universe or a SkyExposed biome (a
zone- or underground-biome-authored temperature is rock, not sky, and
gets no weather); resolve the fabric ladder into `_envelopeResolved`;
stamp `envelopeOutsideK`; `reconcileEnvelope()`; return
`envelopeTemperatureK`.
The indoor decree is removed by **content** (delete `_defaultTemperature`
from `indoor/baseline.yaml`) and kept out by **lint** (`lint:envelope`
clause (d): no row under the `/stuff/idea/biome/indoor/` admin subtree
authors `_defaultTemperature` — "indoor" is the folder that means *an
enclosure*, and an enclosure's temperature is a structure's, which a
biome may not claim). Sky-exposed scopes are byte-identical to today
plus 3a. The trace variant reports provenance `'envelope'` with
`{outsideK, heatInputW, uWperK, openings, hottestSource, fabricMaterialPath}`
— the shape `feel` reads (3e).

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

*3e. The cause is named in-world.* `FeelController`'s bare form
(`cmd/perception/feel.yaml`, this build's — build-3 owns `measure`/
`analyze`, not `feel`) already prints *"The air feels {band}."* from
`TouchModality.touchAt(location)`; it now appends **why**, from
`BiomeApi.traceResolveTemperatureFor(location)`: provenance `'envelope'`
with `heatInputW > 0` → *"warm from the hearth"* (the hottest
`SpaceHeating` source's presentation); no input, above outside → *"the
granite still holds the day"* (the fabric material's name — derived, so
it is never a lie); below outside → *"the timber still holds the night's
cold"*; within a degree of outside with an open exterior opening
→ *"as cold as the street — the door stands open"*; provenance the
room's own `_temperature` → *"this place keeps its own temperature, the
year round"*; sky-exposed → nothing added (the weather is the sky's own
line). The same read, saying where its number came from — no new
instrument, and a room that is warm for no reason a player can be told
is self-reporting the dishonesty.

**D4 — Sky-lighting is DERIVED; only the exceptions are authored.** A
sky-exposed room **is** sky-lit by definition (`BiomeApi.isSkyExposed`
is a shipped sync predicate), so authoring it on 41 rows is 41 chances
to disagree with the biome. `AmbientLitMixin` gains
`ambientSource: 'sky' | 'glow' | 'none' | null` (authorable) and
`ambientOpening: string | null` (a detail id). `isSkyLit()` =
`ambientSource === 'sky' || (ambientSource === null &&
BiomeApi.isSkyExposed(this))`. The **noon flux is derived too**:
`skyNoonFlux()` = the authored `ambientIntensity` if > 0, else
`light.sky.noonLux (80) × getSizeScale()` — so the five dark Terminus
streets light up with **no row edit**, and an authored value is a
calibration override (kept: authorial control; warned below `lit`). The
walk's leg (a) reads `skyNoonFlux() × skyFactorNow() × weatherDimFactor`
for a sky-lit room and the raw `ambientIntensity` for a `glow` room. The
three authored values are the **exceptions the census lists**: `sky` on
an enclosed room (a skylight — must name `ambientOpening`, a detail the
row authors: the claim "through an opening" made checkable); `glow` (an
inherent, always-on, non-sky ambient — the holodeck floor, a luminous
cave); `none` (a sky-exposed room that somehow is not lit — a deep
well). Each list is ratcheted. Runtime never narrows silently: an
`ambientIntensity` on an enclosed room with no `ambientSource` still
emits; the lint refuses it. The weather fan-out stamps the dim factor on
`isSkyLit()` rooms, not only SkyExposed ones. Same shape as the heat
side: derive the common case, author the cause, list the exception.

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
existing garment rows. `Offstage` needs **no decree**: it extends
`Location` directly, `getVolume()` is null, so no envelope applies and
a parked cast member reads the 295 K universe base with no weather — an
off-stage parking room is not a place, and the geometry already says so
(the D15 ceiling stays at 5).

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

**D12 — The light census is one script, `lint:light-sources`
(`scripts/check-light-sources.ts`), census-then-ratchet, and it lists
exactly the exceptions.** Clauses: (a) every Location/Vessel row with
`ambientIntensity > 0` that is **not** sky-exposed (statically: own
`_biomePath` → the zone's → none) declares `ambientSource` — ceiling
starts at today's count of such rows (the ~43 interiors) and must be
**0** by W6; (b) an authored `ambientSource: sky` on an enclosed row
names `ambientOpening` and that id exists in its `details:`, and is
listed in `SKYLIT_INTERIORS` (curated, ceiling = the list's length); (c)
`glow` rows in `INHERENT_GLOWS` (curated ceiling); `none` rows in
`DARK_UNDER_THE_SKY` (curated ceiling); (d) a sky-lit row whose noon
band at its own scale reads below `lit` — authored calibration overrides
are warned, never gated (authorial control); (e) a row declaring
`publicLighting` lists no LightSource-composing row in
`props:`/`adornments:`, and no class under `platform/thing/` or any pack
`src/` is named `*Lamppost*`/`*StreetLamp*` (acceptance 6: no lamp
object anywhere); (f) no row authors `celestialProfile` (D1's guard at
build time); (g) a row on `Lamp`/`Hearth` authors `lit:`. A stale list
entry (a path that no longer authors the exception) fails, so paying the
debt is what deletes the line. Self-enrols via `lint:family`.

**D15 — The heat census mirrors it: `lint:envelope`
(`scripts/check-envelope.ts`).** Today the light half has a gate and the
heat half has nothing — that asymmetry is the hole. Census at plan time:
**exactly five rows author `_temperature`** —
`terminus/.../goods-yards/vintner/location/floor.yaml:29` (285),
`goods-yards/crowsfoot/location/floor.yaml:29` (289),
`goods-yards/brewing/location/floor.yaml:29` (288),
`goods-yards/brewing/location/cold-store.yaml:25` (279),
`trade-hospitality/.../location/cellar.yaml:33` (285) — all cellars, all
legitimate (maturation depends on them). Clauses: (a) every
Location/Vessel row authoring `_temperature` is in
`AUTHORED_TEMPERATURES` — a curated list **in the script**, each entry
`{ path, reason }`, ceiling **5**, may fall never rise, a stale entry
fails (the `check-ground.ts` shape) — `_temperature` is the one way to
bypass the derivation, so it is the one thing that needs a paragraph;
(b) a room authoring `fabric` is **ordinary and unlisted** (a material is
a reason), but its `fabric.material` must resolve to a `Material` row
(the `lint:template-census` clause (b) list gains `fabric.material`) and
that row must author `thermalConductivity > 0` — an unauthored
conductivity reads `0`, which is an infinite insulator, silently; (c) ⭐
**the biome line:** no row whose class extends `Biome` authors `fabric`,
`thicknessM` or any envelope key; (d) no row under
`/stuff/idea/biome/indoor/` authors `_defaultTemperature` (the decree
cannot come back); (e) `FabricSpec` keys are a closed vocabulary
(`material`, `thicknessM`) — no `uPerM2`, no `insulation:` word can be
typed into a row. There is no `ROOM_CONSTRUCTION_OVERRIDES` list: there
is nothing to override.

*Why the reason is a list in the script and not a `reason:` key on the
row:* a `data:` key the Hydrator does not write is dropped **silently**
(the grain-chain drive found 49 such rows), so a `reason:` on the row
would be a field nothing reads and nothing can miss; the list is a diff
a reviewer reads, which is the whole point — a sixth cellar costs
somebody a paragraph in a file whose ceiling they must also raise. The
row keeps a YAML comment beside `_temperature` as courtesy; the list is
the gate.

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
| `ambientSource`, `ambientOpening` fields, `isSkyLit()`, `skyNoonFlux()` | `AmbientLitMixin` (→ every `Location`) | *Every place that can have ambient light derives it from the sky where the sky is, and says so where it is an exception.* True of every Location; null = derived. Not on `Vessel` (not AmbientLit today; the coach row's dead field is a content fix, not a host change). |
| `fabric: FabricSpec` + `fabricDefaults()` hook | `Location` (beside `floor`, `lib/stuff/Location.ts`) | *A place names what it is built of, as it names its floor* — and stays space, not matter (no `Tangible`, no mass). Never on a `Biome` (the biome line, lint clause (c)), never on a zone (a zone is a coordinate carve-up, not a structure — the rooms of a zone are **not** built alike, and the plan makes no such claim), never on `Locality` or a Parcel. A `Vessel` needs none: its fabric is its own material. |
| `skyFactorNow()` memo | `CelestialLogic` singleton (instance fields) | The sky is one thing for the whole realm (guarded, D1). No host in the world carries it. |
| `envelopeTemperatureK` / `envelopeClockStamp` / `envelopeOutsideK` / transient `_envelopeResolved` + `reconcileEnvelope` / `envelopeTemperatureSync` | `AtmosphericMixin` (→ `Location`, `Vessel`) | *Every scope that can carry an atmosphere can hold a state different from its outside.* True of a room and of a wardrobe or a coach cabin; **inert where `getVolume()` is null** (Offstage, plain Location, an un-extented Vessel) — that is the mixin's own geometry answering, not a guard. A new `EnvelopeMixin` would compose on exactly the same two hosts, which is the tell that it is the same concern. The **state** is the scope's; the **fabric** is the Location's named material or the Vessel's own. |
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
anywhere in the envelope; a path test on a biome inside the chain walk
(the lint carries the indoor rule, the walk trusts the chain); a
construction field on `Biome`, a zone, `Locality` or a parcel record; a
raw U-value or "insulation" knob anywhere (author the material);
`TangibleMixin` on `Location`;
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
  confirm), `lint:drive-scripts` (no `scripts/drive-*.ts`), and the two
  new gates `lint:light-sources` and `lint:envelope`.

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
`isSkyLit()`, `skyNoonFlux()`); `platform/idea/modalities/VisionModality.ts`
(leg (a) reads `skyNoonFlux() × skyFactorNow() × weatherDim` for
`isSkyLit()` rooms — derived, no row needed; `perceiveFor` zero-signal
rule); `lib/perception/Light.ts` (band phrase table);
`platform/idea/cmd/perception/LookController.ts` (the light line, D10);
`platform/idea/api/WeatherLogic.ts:750` (`isSkyLit()` instead of `sky`
for the dim stamp); `lib/fire/Furnace.ts` (`getEmittedFlux` gate);
`platform/thing/Lamp.ts` (deleted); `scripts/check-light-sources.ts` +
`package.json` `lint:light-sources`; `packages/content/platform/content/settings/light.yaml`;
`species-and-names/.../homo/koboldus.yaml` (`bandShift: +1`).
**Content in this wave.** Almost none: the 41 outdoor-biome rows are
sky-lit **by derivation** (D4) — the five dark Terminus streets light up
with no row edit. The only touches are the outdoor rows whose authored
`ambientIntensity` mis-calibrates against their own scale (mayfield
`street.yaml` 500 lm on 9 m² is fine; check each; delete a value rather
than retune it where the derived 80 lux is what was meant). Interiors
are untouched (they keep reading as today; the lint ceiling counts
them).
**Tests.** `CelestialLogic` sky-factor curve at the eight anchor times
(unit); `VisionModality` sky × dim × zero-shift (unit, the existing
`__tests__` file); `Look` light line per band (controller test);
`Furnace` flux gate (the existing furnace tests).
**Acceptance.** `look` on the crossing at noon and midnight differ; a
sealed cellar reads `pitch-black` to a kobold; `lint:light-sources`
passes with ceiling = today's count; every wire test still green
(`ground.wire`, `platform-smoke`).
**Commit.** `build(envelope W0): the sky is a sync memo; a dark room says so`
→ **DONE** `a7d335740`. 53 lint gates pass (the new one self-enrolled);
1077 near-tests green.

⭐ **What W0 decided that the plan did not.**
- **No card opens in the dark.** D10 said *withhold the long
  description* and did not say where the card stood. Opening one would
  put the room's name and description in the client's right-hand column
  while the transcript said it was pitch dark — the carded-prose split
  working exactly backwards. Lens 3 chose it: an honest sim does not
  show you a room you cannot see. The light line at `dim`/`blinding`
  rides its own **uncarded** scene ahead of the room, the shape the
  help-wanted sign established.
- **The cloud dim follows `isSkyLit()`, not sky EXPOSURE** — a skylight
  is dimmed by cloud like a yard is — **and an enclosed skylit room
  asks for the exposed sample explicitly**, because `computeResolved`
  runs the procgen sky field only for exposed scopes and would
  otherwise dim a shop window by a biome baseline nobody is standing
  under.

⚠⚠ **The curve as D2 literally wrote it was discontinuous.** `sin(α)`
above the horizon and `0.1 · 10^(α/3)` below means the factor steps from
0 **up** to 0.1 as the sun sets — a street that gets brighter at sunset.
The sun term is now `0.1 + 0.9·sin(α)` above and `0.1 · 10^(α/3)` below:
a diffuse skylight floor plus the direct beam, continuous at zero. D2's
own worked anchors (*"dim at sunset (0.1 → 8 lux)"*) already assumed
this, so it is the arithmetic the plan meant. Found by the anchor test,
which is what it is for.

**The census, for W6 to spend against.** 176 atmospheric rows; **38**
follow the sky by derivation; **50** enclosed rows emit ambient light
and name no source. Two things in that list a reader should know:
- ⚠ **The whole of Rejection authors no biome at all.** Nine rows at
  8000 lm — the pithead yard, the hillside, the fuel yard — are outdoors
  in the fiction and the realm does not know it, so they get no weather
  either. A `_biomePath` line each and the constant deleted.
- The rest sort by their own numbers: a big value (a barn at 300, a
  bakery at 400) meant *lit by day*; a small one (a cellar at 15, a
  corridor at 9) meant *there is a lamp in here* and should have one.

⭐ **Clause (g) paid for the gate on its first run.** Four shipped rows
relied on `FurnaceMixin.lit` defaulting TRUE. The campfire and the
practicum brazier mean it and now say so. `still.yaml` and
`small-still.yaml` shipped **lit** against their own prose (*"the
firebox swept and ready"*) and their own class docstring (*"lit with
`ignite`"*); nothing observable depended on it, because they carry no
fuel reserve and every consumer of `isLit()` also asks `fuelRemaining()
> 0` — which is exactly why it survived the whole of the distilling
build's life.

### W1 — Cold is a cost, not a corpse

**Goal.** Measure the cold branch, retune it, dress the cast — before
any room is allowed to get cold.
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
`grep -rl "equipment/Garment" packages/content`). No offstage edit: an
`Offstage` room has no volume and gets no envelope (D9).
**Tests.** The bench (gym, not in `pnpm test`); unit tests on the cap and
the drift target; an `NPC.wears` test beside `lib/npc/__tests__`.
**Acceptance.** Bench: a dressed biped at 281 K for 12 game hours ends
alive, conscious, satiation > 40 %; naked at 294 K ends alive; the
existing thermal suite green (`Thermal.test.ts`,
`ThermalRegulation.*.test.ts` — expect band-number assertions to move;
re-derive them from the physics, do not pin the old numbers).
**Commit.** `build(envelope W1): the cold branch measured and retuned; the cast dressed by its rows`

### W1 measurement — the cold bench

⚠⚠ **Worse than the finding recorded, and different in kind.** The
2026-09-21 note said *a naked body at 294 K spends ~24 %/h and starves
at 4.5 h*. The bench says that is the GOOD case. Before the retune,
with `CLO_TO_KELVIN=2.5` and `COLD_SPEND_PER_DEGREE=0.05`:

```
  air                              kit                    %/h(1st)  sat@12h  core
  21 °C — the old indoor decree    naked                     21.20        0   32.5
  21 °C — the old indoor decree    outfit + wool coat         8.70        0   36.3
  8 °C — a winter night outdoors   outfit (as the cast ships) 47.45        1   26.9
  −5 °C — a bad one                outfit + wool coat        73.70        1   21.8
```

**Every one of the sixteen rows was dead inside twelve game hours** —
including a body in a wool coat in a 21 °C room. And clothing barely
registered: at 8 °C, naked cost 53.7 %/h and a wool coat 41.2 %/h,
because 2 clo bought 5 K against a 21 K gap.

After the retune:

```
  air                              kit                    %/h(1st)  sat@12h  core  alive
  21 °C                            naked                      3.20       70   36.9   yes
  21 °C                            outfit (1 clo)             1.20       99   36.9   yes
  8 °C — a winter night            naked                      6.17       28   33.4   yes
  8 °C — a winter night            outfit (1 clo)             4.45       53   36.9   yes
  8 °C — a winter night            outfit + wool coat         2.45       81   36.9   yes
  0 °C — a hard frost              outfit + wool coat         4.45       53   36.9   yes
  −5 °C — a bad one                naked                      6.12       28   28.3   yes
  −5 °C — a bad one                outfit + wool coat         5.70       35   36.9   yes
```

**What changed, and why each is a reason rather than a taste.**

- `CLO_TO_KELVIN` **2.5 → 8**, which is the number the unit is *defined
  by*: a naked body's comfort floor here is 302 K (29 °C — the real
  thermoneutral zone for an unclothed human), and one clo is by
  definition comfort at 21 °C, so one clo must be worth 8 K. The bench's
  `21 °C / 1 clo` row now costs **basal metabolism and nothing else**,
  which is the definition made observable.
- `COLD_SPEND_PER_DEGREE` **0.05 → 0.005**, calibrated jointly with the
  cap below so that `cap ÷ rate` — the gap shivering can actually close
  — is **20 K**. Also not arbitrary: it puts a naked body's drift target
  on an 8 °C night at 301 K, which is exactly the shipped
  `survivableMin`. *A naked human outdoors on an 8 °C night is on the
  hypothermia line*, and the arithmetic says so without being told.
- ⭐⭐ **A new cap, `COLD_SPEND_MAX_BASAL_MULT = 5`** — shivering peaks
  at about five times resting metabolism. The shipped cold branch was
  linear in the gap and **uncapped**, so a cold enough room drained the
  tank at whatever rate the arithmetic asked and the body **starved to
  death in a snowdrift**. That is the wrong death twice: cold kills by
  cooling you, and hypothermia is rescuable — somebody can carry you
  inside, and `warm` already exists for it. Past the coverable gap the
  body now drifts toward `ambient + coveredGap`: the fuel is buying
  something, just not enough. Named against `METABOLIC_DEFAULTS.
  BASAL_SATIATION_PER_MIN` rather than written as a bare rate, so
  retuning resting metabolism moves the ceiling on shivering with it.
- **Worn `clo` now enters `bodyTau()`.** It did not: a body in a parka
  cooled at exactly the rate a naked one did the moment its fuel ran
  out — backwards, since insulation matters most once you have stopped
  generating heat. Same `SHED_BODY_CLO` reference the shedding term
  uses, so one garment number does both jobs.

⚠⚠ **The bench measured the wrong thing three times before it measured
the right one, and that is the note worth keeping.**
1. It averaged the spend over all twelve hours. Every row read **8.3
   %/h** — a naked body at 21 °C and a coated one at −5 °C alike. That
   is not a fact about temperature; it is `100 % ÷ 12 h`. Every row
   emptied the tank, so the average measured the TANK. The
   clothing-matters assertion would have passed vacuously against a
   completely broken model.
2. It read liveness with `isAlive()`, which is `lifecycleState ===
   'alive'` and **defaults to the empty string** on a fixture nothing
   birthed — so it reported a body at 99 % satiation and a 36.9 °C core
   as DEAD. `Organism.ts` documents the trap in as many words.
   `!isDead()` is the question.
3. Two assertions were true of the old model and false of the new one
   for good reasons: at the cap, two bodies both shivering flat out
   spend the same, and the warmer one burns marginally MORE basal for
   being warmer — so fuel is not monotone in clo and the CORE column is
   where clothing's win is unambiguous. And the cap means a −5 °C spend
   can never be twice a 21 °C spend; what keeps falling is the core.

⭐ **Two plan numbers moved, both recorded here rather than silently.**
D8 proposed `CLO_TO_KELVIN 7`, `COLD_SPEND_PER_DEGREE 0.01` and a cap of
4× basal; the measured values are 8, 0.005 and 5×, derived as above. D8
also predicted *"naked at 294 K ≈ 4.8 %/h"* — measured **3.2 %/h**.

### W1 — dressing the cast

**`wearGarments` lives on `Character`, not on `NPC`.** Both rungs of
person need it — `TestHooks` was already carrying a private copy to stop
wire characters collapsing of cold — and nothing below a person does: an
animal is not dressed. The FIELD is on `NPC`, because a player dresses
at enroll. TestHooks' copy is deleted and calls the shared recipe, so
this build removed a duplicate rather than adding one.

**45 cast rows dressed**, and three packs (`saxonberg-lounge`,
`trade-haulage`, `newbie-wilds`) gained a `generic-objects` dependency
they needed to name commons clothing. The outfits are by trade, not by
uniform: a shirt, trousers and shoes for everyone; a field jacket for
the eleven who work outdoors or underground; a blazer for the counting
houses and the registry; a white coat for the physician; hide and boots
for the two fighters; nothing extra for the smith, the baker and the
smelterman, who stand at furnaces. The wolf wears nothing.

⚠ **What is NOT yet proven: what those outfits are worth in clo.**
`bodyInsulation()` is surface-weighted over the body plan, so shirt +
trousers + shoes covers ~72 % of a biped and the number depends on each
garment's derived `getClo()`. A unit fixture has no Template store and
cannot clone the real rows, so **the drive (W7) is where the cast's
actual insulation is read in a live world.** If it comes back under
~0.8 clo the answer is more content — a second layer on the outdoor
trades — not another dial.

⭐ `lint:census` clause (b) now reads `wears`, so a misspelt garment is
a build error rather than one silent layer of insulation a character
does not have. It took the field refs from 1736 to 1896.

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
→ **DONE.** 53 lint gates pass; 1234 near-tests green; the terminus pack
suite green (132).

⭐⭐ **The reachability risk the plan flagged was real, and it was the
affordance link.** `FurnaceMixin` declared its verbs under `peers` only
— *siblings, and one passable exit away*. That is the whole story for a
forge, an oven and a kiln, none of which is ever picked up: a furnace
standing in a room **is** your sibling. But **you are your lamp's
CONTAINER, not its peer**, so a carriable light composing `FurnaceMixin`
would have had `ignite` die at the affordance link the moment it left
the floor — `light lantern` answering *"you don't see any 'lantern'
here"* with the lamp in the player's hand, while every controller test
stayed green, because a controller test never runs the binder.

`ignite`/`douse` now also ride `environment` (outward, to whoever carries
it). ⚠ The plan proposed adding them to `self` instead; `self` grants
the verb to the *lamp*, not to the holder, so that would not have worked.
`ChargedMixin` — the mana wand you hold — has declared both buckets
since it shipped, and is the precedent. `pump`, `heat`, `boil` and `warm`
stay `peers`-only: they are for a furnace you are standing at.

The new affordance test was **verified to fail on revert** before it was
kept.

**Row changes.** The lantern (0.15 %/min, a game night) and the torch
(0.3 %/min, half a night for a third of the light — the whole trade) move
to `/platform/thing/Lamp` with `lit: false` and a `fuel` reserve.
`PortableLight` stays and is narrowed *to what it is for*: a light that
burns **nothing** — the glowcap jar and its fixture, which are a fungus.
Its header said fuel was *"the combustion build's concern"*; the
combustion build shipped and nobody came back until a dark realm made it
matter.

⚠ **Two content tests pinned the old class and now assert the new
mechanism** rather than being re-pinned: `general-store-content` checks
the row is a `Lamp` with `lit: false` and fuel in it, and
`general-store-standup` drives `ignite`/`douse` on the live object
instead of `switchOn`/`switchOff`.

⚠ **`furnaceNowSeconds()` returns null unless the clock registry
singleton is REGISTERED at its template path** — importing the module is
not enough. Without it the fuel reconcile is a silent no-op, and the
first draft of `Lamp.test.ts` read 100 % fuel after six hours of burning
and would have passed for the wrong reason. It also has to step in
game-HOUR chunks: `reconcileFurnaceFuel` drops any gap over
`MAX_REASONABLE_GAP_SEC` (4 h) as a logout, so a single twelve-hour jump
measures nothing. Both are written into the test.

### W3 — Outside gets a night and a winter; the room is an envelope

**Goal.** Outside gets its approved night and winter (the solar term
ships in this wave, D3a — settled, not gated); indoor temperature is
derived from what the room is made of and what stands open, drifts
toward outside, and bodies feel it and are told why.
**Decisions.** D3 (a–e), D15.
**Files.** `platform/idea/api/WeatherLogic.ts` (the solar term in
`deviatedFieldFor`; memo); `settings/weather.yaml` (two dials);
`lib/stuff/Location.ts` (`FabricSpec`, `fabric` + `fieldMeta`,
`fabricDefaults()`, `getFabric()`); `lib/biome/Atmospheric.ts` (the
three stamps, `_envelopeResolved`, the fabric ladder, `envelopeApplies`,
`reconcileEnvelope`, `envelopeTemperatureSync`,
`openExteriorOpenings()`); `hearthworks/src/.../SealedCellar.ts`
(`fabricDefaults()` → the rock, if the row does not author `fabric`);
`scripts/check-template-census.ts` (clause (b) + `fabric.material`);
`platform/idea/api/BiomeLogic.ts` (`resolveTemperatureFor` + the trace
variant with the envelope provenance shape; `outsideTemperatureFor`);
`platform/idea/cmd/perception/FeelController.ts` (the cause line, 3e);
`base-library/.../biome/indoor/baseline.yaml` (delete
`_defaultTemperature`); `lib/thermal/Thermal.ts`
(`refreshAmbientFromEnvelope` in `reconcileThermal`);
`lib/thermal/ThermalRegulation.ts` (the cached offset);
`WeatherLogic.runBoundaryFanout` (re-resolve outside for occupied
envelope rooms); `scripts/check-envelope.ts` + `package.json` `lint:envelope` (the five
cellars listed with reasons, ceiling 5; fabric materials resolve and
conduct; the biome line; the indoor rule; the closed `FabricSpec`
vocabulary); YAML comments beside the five `_temperature` lines;
`settings/envelope.yaml` (`defaultFabric`, `defaultThicknessM`,
`openingUPerM3`, `activeDepthM`).
**Tests.** `lib/biome/__tests__/Atmospheric.envelope.test.ts`: τ shut vs
one open exterior door; a 1.5 kW input's steady state; an authored
`_temperature` wins; `getVolume() === null` → no envelope; a zone-authored
temperature gets no weather; a granite room and a timber room of the
same size differ in U by the ratio of their conductivities and in τ by
their `ρ·c`; a tin shed reads the street; a Vessel derives from its own
material; no `fabric` → the universe default; the class hook beats the
default and the row beats the hook.
`BiomeLogic` trace provenance `'envelope'`. `Feel` bare form names the
cause in each of the five states (controller test).
`Thermal.test.ts`: a loaf in a warming room follows it with no restamp.
`ThermalRegulation`: a body in a warming room stops paying cold with no
restamp. `WeatherLogic`: the solar term at four anchors.
**Acceptance.** `feel` in the general store at night reads `cool` and
says the door stands open, and at noon `warm`; `feel` in the hospitality
cellar says it keeps its own temperature; a body standing in the cold
store pays the cold branch and its cue fires; `lint:envelope` passes at
its ceiling; the Hearthworks suite green (the sealed cellar: check the
row — if its fiction needs a steady temperature the rock fabric alone
cannot give, it authors `_temperature` and enters `AUTHORED_TEMPERATURES`
with its reason, and the initial ceiling is set to the count at W3 — the
ratchet starts from the truth, not from the number 5).
**Commit.** `build(envelope W3): the room holds a state different from outside, at a cost`
→ **DONE.** 1542 near-tests green across biome, thermal, weather, stuff,
the api logic tier and the perception verbs.

⭐⭐ **Two places the plan's own arithmetic did not survive the shipped
content, both found by running it.**

1. **The default fabric path did not exist.** D3b named
   `/stuff/idea/material/stone/granite`; the row is at
   `/stuff/idea/material/rock/granite`. It would have fallen through to
   the "material not found" floor and every unauthored room in the realm
   would have been built of nothing in particular — silently, because
   the resolver degrades rather than throwing. `lint:envelope` clause
   (b) now refuses exactly this for an authored `fabric.material`, and
   `lint:census` resolves it too.

2. ⭐⭐ **`U = (k/t)·A` omits the air films, and the shipped materials
   make that fatal.** The plan's worked numbers assumed brick masonry at
   `k = 0.6`; the shipped granite row authors the real **2.9 W/(m·K)**.
   With no film term a 3 m stone cell computes to **435 W/K** — a 1.5 kW
   hearth would lift it three degrees — and an iron sheet computes to
   **16 000 W/K**, which is not a number about anything.

   The fix is real physics, not a fudge: still air clings to both faces
   of a wall and carries about **0.17 m²K/W** between them, in series
   with the fabric's own conduction (`envelope.surfaceResistanceM2KPerW`,
   the standard building-physics figure). With it: granite ≈ 165 W/K
   (τ ≈ 1.7 h, a hearth +9 K), oak ≈ 43 W/K (τ ≈ 4.6 h, a hearth +35 K),
   and the tin shed ≈ 265 W/K — *a terrible building, which is true,
   instead of a hole in the world, which is not.* The plan's headline
   claims all survive: a timber cabin is warm, a stone hall is cold, an
   open door is expensive.

⭐ **`SpaceHeatingMixin` moved from W4 to W3** — re-planned in place. The
envelope reads a room's heating sources, so W3 cannot compile without
the mixin, and a wave has to be independently landable. The **substrate**
(the mixin, `Mixins.SpaceHeating`, `MixinApi.isSpaceHeating`) is W3's;
the `Hearth` class, `Campfire`'s composition and the rows stay W4's.

**Decisions the plan did not make.**
- **A per-DETAIL temperature read keeps the plain chain.** `feel stove`,
  the shaded corner, the ice bath — none of those is the room's own air,
  so the envelope applies to the bare read only.
- **`envelopeCoefficients()` is extracted** so the integration and the
  provenance `feel` reads come from one arithmetic. A second copy of
  that formula would be a room whose stated reason disagreed with its
  own temperature — the exact failure the cause line exists to expose.
- **`AnalyzeAtmosphereController` gained the `'envelope'` arm.** The
  trace's source union is exhaustively switched, so the compiler
  demanded it, which is the gate working.
- **The `SealedCellar` hook authors a metre of granite, not a
  temperature.** Declaring the temperature would bypass the envelope and
  put the row on the ratchet; declaring the ROCK lets the physics
  answer, and the answer is a cellar that runs cool and steady because
  it is underground and massive.
- **Two exemplar `fabric:` rows ship in W3** (the woodshed in oak
  boards, the smithy in thick granite) rather than waiting for W6.
  ⚠ Otherwise `lint:envelope` clause (b) would have had **zero
  coverage** — a gate that answers "no" to every question, which is the
  failure class the derived family exists to prevent.

⚠ **Seven shipped tests pinned absolute outdoor temperatures** and the
solar term moves them. They were re-derived as **deltas against a
clear-sky baseline measured on the same clock**, which is what the
weather seam actually claims, rather than re-pinned to new constants —
the pins were on the calendar, not on the coupling. One draft of that
baseline helper short-circuited when weather was inactive and measured
the baseline in a world without a solar term, which is worth knowing:
the helper has to CREATE the weather singleton to be comparable.

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
→ **DONE.** 54 lint gates; 1176 near-tests; hearthworks and
generic-objects packs green.

⚠ **Reduced scope, because W3 took the substrate.** `SpaceHeatingMixin`,
`Mixins.SpaceHeating` and `MixinApi.isSpaceHeating` landed in W3 (the
envelope reads them, so W3 could not compile otherwise). W4 is what is
left: the `Hearth` class, `Campfire`'s composition, the rows, and the
tests that prove the distinction.

**⭐ Two heating objects for the price of none.** `stove.yaml` and
`brazier.yaml` are `Hearth` ROWS — a closed firebox that puts more into
the room off the same fuel and casts almost no light (2200 W, 0.15
%/min, 8 lm), and a basket of coals that warms whoever is nearest (700
W). Neither needs a line of code, which is the S-test for the class
being right.

**The test that matters most in the file is the one that proves a lit
forge changes NOTHING** — and it passes by composition rather than by a
guard. Nothing anywhere asks *is this a forge*; `Forge` simply does not
compose the mixin, so the envelope's contents walk never counts it.

⭐ The cookhouse now has a hearth **beside** its oven, which is the
distinction made visible in content: a cook works at a lit oven in a
cookhouse that is cold until somebody lights the fire.

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
+ a `lamps` detail each), and one street the town **never lit**
(`delight-road/crossroads` declares no `publicLighting`, so `look at
the lamps` finds no lamps to speak of; and `hearts-delight`'s
`valley-gate` declares `publicLighting` under a locality that authors
no `_publicLighting` — lamps standing, nobody paying, "standing cold").
The **lapsed** case (a funded service the treasury can no longer cover)
is the unit test's, not the drive's: one treasury per currency means
draining it would darken every extent at once.
**Tests.** `PublicLighting.test.ts`: lit iff night ∧ funded; the detail
line in each state. `Locality.lighting.test.ts`: seniority order under a
short balance; one `appropriation` leg per night; no double settle on
re-arm; the treasury's own short-refusal leaves every street dark.
**Acceptance.** Drive steps 6–7 and 14; `lint:light-sources` (e) passes.
⚠ Record in the wave's commit and in `civics.md` at the sweep: v1 is the
realm appropriating for the town (one treasury per currency); the
locality treasury is a deferred seam, not this build's.
**Commit.** `build(envelope W5): street lighting is a property of the street and a bill on the extent`
→ **DONE.** 2221 near-tests green; the terminus pack green (132);
`check-light-sources` reports **5 streets publicly lit and no lamp
object anywhere** — acceptance 6, mechanised.

⭐⭐ **`Locality` does NOT look up its own streets — it is handed them,
and the split is the design rather than plumbing.**

Finding them means `StuffApi.findByMixin`, which is gated to a reviewed
`(template, method)` allowlist: *being handed a slice of the world has
to be asked for by name.* Rather than widening that gate for a Stuff
class, the walk moved to `AddressLogic.settleStreetLighting`, which
already owns the question **"what does this extent cover?"** — one walk
for the whole realm per game night, bucketed by locality and sorted by
seniority, and each extent handed its own queue.

What stays on the extent is what is actually the extent's: **the order,
the money, and the record of what it lit.** That needs nothing but its
own fields.

**Three extents fund lighting, and they are three different localities**
— `terminus-city` (the wharfside bank), `university-avenue` (the
crossing), `counting-houses` (its own row first, the market square
second). Seniority is per street, so the square is the one that goes
dark when the money is short, and **that order was written down before
anybody knew there would be a shortfall.**

⭐ **Mayfield Row is the lamps nobody pays for**, and it is honest
fiction rather than a contrivance: the street addresses
`terminus/mayfield-row`, *outside* the city, so its covering locality is
the realm — which funds no lighting. The standards are there and they
stand cold every night. `look at the lamps` says exactly that, which is
a different sentence from a street that never had any (`delight-road`
declares nothing and has no lamp detail at all).

⚠ **The `civic:lighting` schedule is armed by DAY, not by a recomputed
sunset**, and that is deliberate: sunset drifts through the year, but a
settle is idempotent per night (`_lightingNight` guards it), so a fixed
daily cadence from the first sunset lands inside the right night
everywhere. A **boot-time settle** covers the reboot-at-midnight case —
a restart in the evening must not leave the town unlit until tomorrow.

⭐ **A street lamp reads `lit`, not `bright`** — 400 lm over a 9 m² cell
is ~44 lux. That is the right band and the reason S1's claim holds: the
difference between moonlight and a lit street is **reliability, not
brightness**. The moon gives you `very-dim` when it is up and clear; the
town gives you `lit` every night it pays.

### W6 — The content pass

**Goal.** Every shipped room has a source or is deliberately dark;
businesses keep hours; the lint ceilings reach zero.
**Decisions.** D4 (rows), D9 (remaining cast), D13.
**Rows.** Every one of the ~150 interior rows: (i) a source decision —
nothing at all for interiors lit by spill (any room with a doorless exit
to a sky-exposed room reads daylight at full strength already — the
largest class; verify by running the walk in a boot test), an authored
`sky` + `ambientOpening` (a window detail) only for the windowed
interior with no spill (listed), a lamp or hearth in `props:` for
interiors that must be usable after dark (the terminal hall, the
infirmary, the general store, the lounge bar — a hearth; the dorm rooms
— a candle row exists), `glow` for the sandbox `CircleFloor` and
Rejection's glowcap caves (listed), and **deleting** the stray
`ambientIntensity` on enclosed rooms that meant "lit by day" (the
decree); a `fabric:` line on rooms not built of the universe default
(the woodshed and the barn are timber; the cellars are the rock; the
Rejection assay shed is boards) — one line each, ordinary, unlisted;
(ii)
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
**Acceptance.** `lint:light-sources` clause (a) ceiling = 0; every
exception list in both gates holds exactly its curated entries;
acceptance 13 and 16 (a second town = rows: prove it by authoring one
street + one interior in `world-seed`'s Narnia with no code and no
`ambientSource` — the sky is derived).
**Commit.** `build(envelope W6): every room authored with a source; hours that bite`
→ **DONE.** `lint:light-sources` reports **0/0 undeclared** — the census
opened at fifty and is paid in full. 54 gates; 343 near-tests; the
terminus, hearthworks, generic-objects, trade-cooking and
trade-distilling packs green.

**The fifty, by what each turned out to be:**
- **8 were OUTDOORS and the realm did not know.** Rejection's whole
  surface authored 8000 lumens and *no biome at all*, so it got no
  weather either. Plus the farm yard and the Duncan Hall steps. A
  `_biomePath` line each, the constant deleted, and they follow the sun.
- **19 are lit by SPILL** — a doorway standing open onto a yard, a
  street, a square. They now author **nothing**: the light walk carries
  daylight one hop at full strength, so they are bright by day and dark
  at night for free. ⭐ A unit test was added for the mechanism itself,
  because nineteen rows now depend on it.
- **16 are lit through a NAMED OPENING** — a window, a fanlight, roof
  lights, and the gaps between a woodshed's boards. Each names a detail
  a player can walk up to and look at, and each is a line in
  `SKYLIT_INTERIORS` with its reason.
- **5 are dark on purpose** — two interior corridors, a back bedroom
  with no window, a cellar, a cold store. ⭐ The Duncan Hall corridor
  authored **nine lumens**, which was a room already admitting it had no
  light.
- **1 is an inherent glow** — the holodeck floor, which is itself the
  light.
- **1 was a DEAD FIELD** — the transport coach authored forty lumens and
  is a `Vessel`, which does not compose `AmbientLit` at all.

**S8 — hours that bite.** 22 businesses moved off `[0, 24]` onto real
hours by trade: a baker at `[4, 14]`, a farm at `[5, 19]`, works floors
at `[6, 18]`, a tailor at `[8, 18]`. ⭐ **The gazette keeps its `[0,
24]`, and now says why**: a press runs to a *deadline* rather than an
opening time, and an editor off shift when the news arrives is an editor
who misses it. One house awake in a realm that otherwise shuts.

⚠ **The plan's boot-level census test was not written.** It would clone
every Location row and read `signalAt` at noon — which needs a full
content boot, and that is what the wire tier already is. The static
census is the lint's; the live one is the drive's (W7). What was added
instead is the unit test for the **spill** mechanism, which is the thing
nineteen rows now rest on and which no static check can see.

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
**The drive.** Boots a wizard session and a plain session; reads the
realm treasury (`treasury`) and asserts it covers at least one
street-night before step 6; walks the 15
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
| the sky | none (a `look`) | — | **derived** from the row's biome chain (`isSkyExposed`); no row edit | the celestial singleton is `singletonSync`-created on first read; the memo seeds itself | — |
| the room's warmth, and why | `feel` (bare) — ships; now names the cause | — | `fabric:` optional (a Material path that authors `thermalConductivity`); universe default applies | none; reconcile-on-read; the fabric resolves at the first async read | `requires: any` |
| the body's cold | `look` body line / the `self.body` cue — ship | — | dials | — | — |
| public lighting | `look at lamps` — `look` ships; the detail is the row's | `PublicLightingMixin.getDetail` | `publicLighting:` on street rows + `_publicLighting` on the locality + the realm treasury + a supplier Business with a primary account | `civic:lighting` registered in `registerSystemSchedules`; the boot-time settle | — |
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
| 1 | two descriptions, noon vs midnight, unauthored | W0 (D1, D4 — the crossing is sky-lit by derivation, no row edit; D10) |
| 2 | full moon: move, door, a presence; not read, not a face | W0 (D2 `very-dim`), `read` refuses (ships) |
| 3 | moonless/overcast: needs a light, and the game says so | W0 (D2 + D10's pitch-black line + `too-dark-to-read`) |
| 4 | lantern works; out → dark immediately | W2 (the walk reads flux live) |
| 5 | lit street needs no lantern; unlit does | W5 |
| 6 | unlit street dark; lamps "standing cold"; **no lamp object** | W5 + `lint:light-sources` (e) + the `Lamp.ts` retirement in W0 |
| 7 | no room shows light without a source; census refuses a new one | W0 scaffold → W6 ceiling 0; the heat twin `lint:envelope` (W3) refuses a sixth decree |
| 8 | unheated room in winter: cold from prose + body line | W3 (D3a/b, `feel` + its cause line (D3e), the shiver cue, the `look` body line — add a *"You are cold"* clause to `Creature.bodyBuildPhrase`'s mirror in W3 if the cue alone is judged insufficient at the drive) |
| 9 | hearth warms gradually; just-lit ≠ long-lit | W4 |
| 10 | open door costs warmth; shut stops it | W3 (+ the general store's new door row in W6) |
| 11 | fire runs out; room cools | W4 (furnace burnout edge ships) |
| 12 | forge does not warm its room; smith works | W4 (composition), forge-couple tests |
| 13 | shut at night, staff gone, street emptier | W6 (D13) |
| 14 | dawn: light returns, lamps out, shops open | W0 + W5 + W6 |
| 15 | a full game day kills nobody of cold | W1 (bench, dials, the cast dressed) + W3 (envelope on) + W6 (remaining outfits, hours that park the cast offstage) + W7 (the drive's last step) |
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
- **Lints:** the family, plus the two new gates — `lint:light-sources`
  (the undeclared-interior ceiling → 0 at W6; the three exception lists
  curated) and `lint:envelope` (the reasoned cellars at their ceiling,
  fabric materials that resolve and conduct, the biome line, the indoor
  rule, the closed `FabricSpec` vocabulary).
- **Full suite:** once before the MR opens, once at `/finalize`. A green
  run holds until a source file changes.
- **What only the drive proves:** the prose of a dark street in a
  browser (the wire asserts the envelope; textiles found three defects
  in the browser after 15/15 on the wire), `light lantern` on a held
  lamp through the binder, the budget actually funded at sunset, the
  cast alive after a day.

---

## Risks & opens

1. **Recorded decision — the requirements assumed a winter that did not
   exist in the temperature.** Weather deviates by *type* only (clear 0
   · overcast −1 · rain −3 · storm −5 K, `WeatherType.ts:131`) over the
   295 K universe base; `SEASON_BIAS` (`WeatherType.ts:333`) biases
   snowfall **frequency**, not temperature, so a mid-winter 3 a.m. read
   290 K (17 °C) and S4's "an unheated room in winter is cold" had
   nothing to be cold *from*. D3a's stateless solar term (annual ±10 K,
   diurnal ±4 K, a pure function of the sun's position) closes that gap
   in the requirements' own spirit ("the sun is low, therefore it is
   cold … the same fact"). It is a product-visible change the
   requirements did not name — summers hot, winters cold, everywhere
   outdoors — and **the user approved it on 2026-09-24**. Not widened:
   one latitude, one climate; the per-zone profile stays out of scope.
   The reasoning stays here because a reviewer will want it; the gate is
   gone.
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
   author `lit: false`; `lint:light-sources` clause (g) (D12) fails a
   row on `Lamp`/`Hearth` without `lit:`.
8. **`heatContents` on a Lamp.** The fire tick deposits toward 330 K into
   Meltables beside a lit lamp (ice, wax). Honest at that temperature;
   note it in fire.md.
9. **A hearth in the Lounge.** Warren-minted lounge rooms have volume
   and no hearth; the bar gets one. If minted rooms read cold at night
   and that is judged wrong for the off-map lounge, the `Lounge` room
   template authors `_temperature` (the bespoke case — it enters
   `AUTHORED_TEMPERATURES` with its reason and the ceiling moves to the
   truth) — a content call at W6, recorded either way.
10. **Do not** add a Discipline, touch `measure`/`analyze`, or name coal
    or peat rows. Fuel is `reserves.fuel` on the row; when extraction
    lands, its rows fill the reserve — no code here knows a fuel's name.
11. **Do not** scope in a building/structure concept (there is none in
    this model, and S6's room-to-outside scope means this build does not
    need one — see Deferred seams), a biome-catalogue normalization (the
    user is taking it as its own slate), or template inheritance
    (`ref-shapes.md`: a platform feature; the arithmetic here does not
    need it). If a reviewer asks "where is the building", the answer is:
    nowhere, honestly; each room names its own fabric, as it names its
    floor, and a material is a reason two rooms may differ.
12. **The biome line is the one that cascades.** If construction ever
    lands on a biome, one row warms every room that references it with
    no fire in them; `lint:envelope` clause (c) exists so the failure is
    a build error, and `feel`'s cause line exists so it would read as
    *warm for no reason* in the fiction before anyone ran the gate.

---

## Deferred seams

Each leaves as a slate line, not a plan section.

- **Fuel as mass** — `heatOutputW` and `fuelBurnRatePerMin` derived from
  the fuel's `heatOfCombustion` and a real mass reserve (the energy
  build; `power-utility-slate`).
- **⭐⭐⭐ A Structure concept — and this entry is UPGRADED at review
  (2026-09-24), because `structure-slate` now exists (branch
  `design/2026-09-24-structure`) and it answers the question this build
  had to answer without it.**

  Nothing in this model says *"these rooms are one building"*: a zone is
  a coordinate carve-up (a closet can be its own zone, an office block
  can be carved by floor), a Locality is an address prefix, a Parcel is
  title and ground, and ⚠ a `Warren` is **not** it either (a Warren
  coordinates clones of ONE room template that bud and merge; a building
  is heterogeneous rooms).

  ⚠⚠ **What the original entry got wrong.** It said this build "does not
  need the concept," and that is true only of the features S6 scopes
  out. It is false of the thing the build could not avoid: **a
  controlled atmosphere has to start and stop somewhere, and with no
  structure tier to draw that line on, this build drew it at the ROOM.**
  Four consequences, all shipped, none of them separately decided:

  1. **Every interior room is its own envelope, leaking straight to the
     weather.** `outsideKFor` walks the biome chain and adds the weather
     deviation; nothing asks how deep in a building the room is. A
     corridor in the middle of a bank with no exterior wall at all pays
     the same loss to the sky as the shopfront.
  2. **Every room presents five faces.** `area = 5 · ∛V²` — four walls
     and a roof — **unconditionally**, whether or not any of them is
     actually on the outside.
  3. ⚠ **So subdividing makes a building colder.** One hall of volume V
     exposes `5V^⅔`; the same hall cut in two exposes `6.3V^⅔`. Adding
     interior walls should not raise heat loss, and here it does,
     monotonically.
  4. **A hearth warms exactly one room.** Interior openings count for
     nothing by design (S6), so the room next door to a blazing hall
     sits at outdoor temperature with its door wide open.

  ⭐⭐ **And `openExteriorOpenings()` is already a threshold predicate,
  written ad hoc.** It decides *is this exit a hole in the envelope* by
  asking `BiomeApi.isSkyExposed(dest)` — the far side is outdoors. The
  slate's `isThreshold(exit) = structureOf(near) !== structureOf(far)`
  is the principled form of that exact test, and the two disagree
  precisely where the slate says they will: a **glazed atrium** reads as
  "outside" to this build, so every door onto it is an exterior opening
  and the whole building leaks to a room that is indoors; and a door
  between two terraced buildings reads as interior when it is a
  threshold.

  ### The five attach points, for whoever builds the tier

  All in `lib/biome/Atmospheric.ts` but one, which is the value that
  feeds it:

  | seam | today | with a structure tier |
  |---|---|---|
  | `envelopeApplies()` | `!BiomeApi.isSkyExposed(scope)` | membership; sky-exposure becomes the **census check** the slate describes, not the predicate |
  | `BiomeLogic.outsideKFor` | the biome chain + weather, always | the **structure's** temperature for an interior room; only shell rooms see the weather |
  | `envelopeCoefficients()` `area` | `5 · ∛V²`, every face | the faces actually on a threshold |
  | `openExteriorOpenings()` | `isSkyExposed(dest)` | `structureOf(near) !== structureOf(far)` |
  | `resolveFabric()` | row → class hook | row → **structure** → class hook (a third rung in an existing ladder; no caller changes, no migration) |

  ⭐ That last row is why none of this is foreclosed: the resolver is a
  fall-through ladder and the tier inserts as a rung. And only **two
  rows** author `fabric:` today, so the slate's *"~100 rooms the
  expensive way"* debt has barely started.

  ⚠ **A name to settle before that build, not during it.** `FabricSpec`
  already exists in `lib/material/Construction.ts` — textiles' woven /
  knit / felted forms. Two exported interfaces, one name, unrelated
  meanings. The slate uses *fabric* for building composition too, so the
  domain word is right and the TYPE name has to give way. One type and
  two rows today.

  → `structure-slate`. ⭐ It asks for *"the first consumer a kernel
  substrate must name"*; the envelope is one, already shipped, and every
  numbered item above is the bill.
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
   `platform/idea/api/BiomeLogic.ts` (lines 230–300, 470–560, 720–800),
   `lib/material/Material.ts` (lines 190–230, 790–830 — the conductivity
   seam, density, specific heat)
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
    `api/banking.ts` (lines 230–320, 400–500),
    `platform/idea/api/BankingLogic.ts` (`appropriateImpl` line 737,
    `transfer`, `payWage`), `platform/idea/WorldClockRegistry.ts`
    (`registerSystemSchedules`)
11. `packages/server/src/mud/platform/location/Crossing.ts`,
    `lib/location/CartesianLocation.ts` (lines 50–75, 190–240),
    `lib/stuff/Location.ts` (lines 36–130 — `FloorSpec`, the space-not-
    matter doctrine, `floorDefaults` at ~352)
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

The W1 bench output is recorded above, under W1. This is W7's drive:
`packages/wire/tests/envelope.dirty.wire.test.ts`, run against a booted
world on 2012.

### ⭐⭐ What the drive found that nothing else could

Thirteen runs. **The run that stands is run 13: 14 checkpoints, 14
green.** Almost every run before it found a defect no unit test and no
lint gate could see, which is the whole argument for the drive's
existence — and the last two findings were the best two.

**1. ⚠⚠ The vision modality is warmed LAZILY, and `look` never warmed
it.** `PerceptionApi.modalityByName('vision')` reads a cache that only
`preloadForSenseGate` fills. `lookAtTarget` called it; `lookAtLocation`
never had to, because until this build nothing in the room-level render
asked a modality anything. So on a fresh world the band read threw *"no
modality 'vision' loaded"*, the defensive catch swallowed it, and
**every room in the realm described itself at midnight** — the build's
headline feature, silently absent. `analyze light` failed outright for
the same reason and was fixed with it.

⭐ **No unit test can catch this class**: a fixture calls
`buildAllModalities()` in `beforeEach`, so its cache is always warm.
This is the **boot** link of the five, and the one the project has now
paid for four times. Recorded in `antipatterns.md` and
`perception.md`.

**2. ⚠⚠ The one shipped dynamic-detail precedent was broken, and this
build copied it.** `look <detail>` calls `getDetailFor(viewer, id)`,
whose signature defaults `sense` to `'vision'` — so a guard written
`senseOrParent !== undefined` returns the static text *every time*.
`Crossing.getDetail` has carried that guard since it landed, which
means **the University Avenue clock tower's live reading has never
once rendered**. The street-lamp detail inherited it from that file.
Both fixed; recorded in `antipatterns.md`.

**3. ⚠ The boot-time lighting settle ran before the packs installed.**
`registerSystemSchedules` fires during the clock's restore, so an
immediate settle walked a world with no localities in it, lit nothing,
and stamped the night as already-settled — leaving the town dark until
a sunset two real hours away. Every funded street read *"the lamps
stand cold"*. Now deferred by a game minute.

**4. ⚠ The wire world restores its clock from the database.** The first
run's night assertions all failed because it was **the middle of the
afternoon**. Nothing in a wire session may set the clock (`setScale` is
an operator act; the eval sandbox exposes only four Apis), so the file
now **asserts the precondition** and says to drop the DB — a drive that
silently tests the wrong hour is worse than one that stops.

**5. ⚠⚠ A reentry cycle across four subsystems, each individually
correct.** `reconcileEnvelope` walks the room's contents asking each
heat source for its output → `spaceHeatOutputW()` asks `isLit()` →
`reconcileFurnaceFuel()`'s burnout edge calls `restampHeated()` →
`ThermalMixin.restamp()` → `effectiveAmbient()` →
`BiomeApi.resolveTemperatureFor(container)` → **this room's envelope
again**. `ThermalMixin` has had `_thermalReconciling` for exactly this
reason; the envelope needed its own. It surfaced as a `feel` in the
cookhouse that never answered — thirty seconds of a socket going round
a ring of four subsystems.

**6. ⭐⭐ A fresh realm SHIPS BROKE, so its streets ship DARK — and that
is the mechanism working.** The boot log of a fresh world is full of
`EmploymentLogic: … opened with no advance — treasury-short 50
zorkmids`. There is one treasury per currency, it starts empty, and
`settleStreetLighting` computes `n` from the balance **first** — so
`n = 0` and nothing is lit.

⭐ That is requirements S3 observed live: *"When the town does not pay,
the streets go dark — that is the failure mode and it is the point."*
⚠ It also means the **lit** half cannot be driven over a socket:
funding the treasury needs `BankingApi`, which the eval sandbox does not
expose. The drive asserts the broke-realm outcome — every funded street
standing cold, and a never-lit street with no lamps at all, which is the
*different sentence* that matters — and the lit half is proven by
`PublicLighting.test.ts` and `Locality.lighting.test.ts`.

⚠ **Worth the user's eye, and it is an ECONOMY observation rather than a
bug in this build**: with an empty treasury nothing the realm funds can
run. Street lighting is simply the first public service visible enough
to show it.

**7. ⭐⭐ A LIT LANTERN IN YOUR HAND LIT NOTHING.** The walk's contents
leg reads the ROOM's contents, and a carried lamp is in the CARRIER's —
so a player could light a lantern, stand in the pitch dark, and have the
street read exactly as black as before. **Acceptance 4 — *a player who
lights a lantern can work by it* — was false.**

⚠ It is pre-existing (a `PortableLight` had the same problem) and never
mattered, because until this build nowhere was dark enough to notice.
The walk now looks one level into a room occupant, which is the mirror
of a rule the perception gate already has: *what you HOLD you see in
the light of where you stand, not in the dark of your own pocket.* The
light travels the other way for the same reason. **One level and only
through a person** — a lamp sealed in a chest in a pack lights nothing,
and a general recursion would make the hot path walk the world.

⭐ Found only because the drive stopped asserting the verb's bookkeeping
(`light` → ok) and started asserting the OUTCOME (`analyze light` reads
brighter). The verb had been returning `ok` all along.

**8. ⚠⚠ The room→body→room ring, properly closed.** Two reentry guards
were not enough, because the cycle runs through an `await`: a body's
reconcile called `envelopeTemperatureSync()`, which integrates, which
walks the room's contents, which restamps the bodies in it. The rule is
now **the room integrates itself; bodies READ it**
(`envelopeTemperatureLast()`), and it costs a body nothing in accuracy —
the room re-integrates whenever anything resolves its temperature, which
includes every `feel` and every `measure`.

**9. ⭐⭐⭐ THE "DEADLOCK" WAS AN AMBIGUOUS KEYWORD, and it took three
runs and a unit test to see it.** `feel` in the cookhouse stopped
answering after `light hearth`. It looked exactly like a reentry cycle —
and the envelope *does* have cycle-shaped paths, so two guards went in
(both of them right, neither of them the cause) and then the
integration/reader split went in on top.

What it actually was: the cookhouse's **oven row already claims the
keyword `hearth`** (its prose calls it *"a clay hearth"*). W4 placed a
second, genuine `Hearth` in the same room, so `light hearth` became
ambiguous, the session sat on a **disambiguation prompt nobody
answered**, and every subsequent command waited on it.

⭐ A *player* would have hit exactly the same thing, so this is a real
content defect and not a test artefact. The hearth moved to the general
store's shop floor — a shop with a street door that opens all day is the
room that most obviously wants one.

⚠⚠ **The lesson is the diagnosis, not the fix.** A socket that stops
answering is not evidence of a deadlock; it is evidence that *something
is waiting*. Three runs went into the plausible story because the
plausible story was about the code I had just written. What settled it
was **reproducing it in a unit test in ten seconds** — and the unit test
*passed*, which is what finally said "look somewhere else."

⭐ The two guards stay. They are correct, the ring they describe is
real, and `envelopeTemperatureLast()` is the better design regardless —
but they are recorded here as **fixes for a problem that was not the
one being chased.**

**10. ⭐⭐⭐ `douse` HAD NEVER WORKED ON ANY FURNACE.**
`DouseController` admits `isCombustible(s) || isFurnace(s)` at the
binder and in `MqlApi.effectiveTarget` — and then the very next line
narrowed to `isCombustible` **alone** before calling `douse()`, throwing
the furnace half away. A forge, an oven, a kiln, a campfire: every one
of them has a working `FurnaceMixin.douse()`, every one of them is
reachable by the verb, and **every one of them answered "that isn't
burning" while burning.** The method was unreachable from the only verb
that calls it.

⭐ It is not a lantern defect and it did not ship in this build — it has
been true since the fire build shipped the furnace appliance arm. It
surfaced here only because a lantern is now a furnace, so `douse` got
pointed at one on a thing a player *carries* rather than at a fixture
nobody had thought to put out. The fix is one clause;
`DouseController.test.ts` is new and fails on a revert.

⚠ And the *reason it stayed invisible* is the same shape as the rest of
this list: the controller test suite asserted the refusal note, which
was exactly the refusal the bug produced.

**11. ⚠⚠ A `.dirty.` drive must ESTABLISH its preconditions, not assume
them.** Run 12 failed two checkpoints that had nothing wrong with the
product: the shop's `before` read came back *"warm from the open
hearth"* because an **earlier run of this same file had lit it**, and
the lux `before` was taken with the lantern still burning from the test
above. A file that declares itself non-idempotent cannot then assert
against a clean world. Both steps now put the fire out first — which
costs one command and, as a bonus, proves `douse` reaches a *fixture*
furnace as well as a carried one.

### ⭐ A finding recorded rather than fixed

**`look <detail>` runs no perception gate at all.** `lookAtDetail` asks
`getDetailFor` and renders; only *objects* are gated (`canSee`) and only
the room-level render is banded. So a player in the pitch dark cannot
see the barrels but **can still read the wall**.

That is real and it is **not this build's to close**: the requirements
scope the room line and the object gate, and a detail gate touches every
`look` in the game. Offered to the perception slate.

### Three of my own steps were wrong, and each taught something

- `read sign` came back *"I don't understand 'read'"* — a **parse**
  failure wearing a darkness failure's costume. An assertion that cannot
  tell those apart cannot fail honestly; `ground.wire.test.ts` learned
  the same lesson and its `NOT_FOUND` pattern says so.
- `light lantern` on the **shop floor** bound the store's own stock
  while `douse` bound the one in hand: `ok` then `not-burning`, which
  read as a product failure and was a targeting one. The step moved to a
  street, where there are no other lanterns.
- Backdating `envelopeClockStamp` through `eval --on here` wedged the
  session for thirty seconds. Dropped: the warming CURVE belongs to
  `Atmospheric.envelope.test.ts`, which can move a clock; what the drive
  asserts is that lighting the hearth **changes the room's stated
  reason** for being the temperature it is, which is what a player
  reads.

### The run that stands — run 13, 14 of 14 green

```
 ✓ night is real — and it is a NEW MOON
   ✓ step 8  — a moonless midnight on an unlit road is genuinely dark
   ✓ step 4  — a DETAIL is not light-gated, and that is a finding
   ✓ step 7  — a road the town never lit has no lamps to speak of
 ✓ the town lights its streets — and a broke town does not
   ✓ a FUNDED street on a broke realm is dark, and its lamps STAND COLD
   ✓ steps 5+7 — Mayfield Row: lamps NOBODY EVEN FUNDS, on a dark street
 ✓ a lantern you light, and that runs out
   ✓ step 4  — light it and the dark lifts; douse it and it comes back
   ✓ step 4  — and the room is measurably brighter for it
   ✓ the AFFORDANCE reaches a HELD lamp — the link that dies silently
   ✓ a lantern is a FURNACE, so the fuel verbs reach it
 ✓ the room holds a state different from outside, at a cost
   ✓ step 9  — `feel` reports the cold AND names the cause
   ✓ a CELLAR keeps its own temperature, and says so
   ✓ step 10 — light the hearth and the room says the hearth is why
   ✓ step 12 — a FORGE does not warm the smithy
 ✓ the body feels it
   ✓ step 9  — the body line is there to read, and nobody has died of it

 Test Files  1 passed (1)
      Tests  14 passed (14)
```

⭐ The instrument line the drive prints at the top is worth keeping in
view, because it is the build's whole thesis in one sentence — a dark
crossroads at midnight, lit only by what the neighbouring streets spill
over the boundary:

```
[drive] crossroads: Light analysis at the valley crossroads :
  total: 0.65 lux  color temperature: 5800 K  contributing sources:
   - the valley gate : 80.0 lumen @ 5800 K
   - the bench lane  : 80.0 lumen @ 5800 K
   - the lower climb : 48.0 lumen @ 5800 K
```

Three named sources, no ambient term, and a number under one lux. The
`pitch-black` band's own sentence is what `look` renders, and the reason
is on the record.

### ⚠ And the full suite found two more, which is the point of running it

The pre-MR `pnpm test` came back **red at the server package**, on two
things seven waves of `test:near` never touched:

1. **`TestHooks.test.ts` had been broken since W1.** W1 moved the
   dressing recipe out of the backend hook and onto
   `Character.wearGarments` — correct, and what let authored NPC rows
   use it — but the hook's unit test stubs `StuffApi.clone` with a bare
   `{ save }` object, so the new call landed on a stub that had no such
   method (`TypeError: avatar.wearGarments is not a function`). ⚠ It
   also asserted `clone` was called *once per garment*, which was a
   claim about the old design: the hook no longer clones garments, the
   mudlib does. Both fixed — the stub gains `wearGarments`, and the
   assertion now follows the outfit to where it actually goes.
   **`src/backend/` is outside every `test:near` this build ran**, which
   is exactly the gap the full run exists to close.
2. **The wiki spoiler-fields snapshot moved by eleven lines** — every
   new persistent field this build declared. Each was reviewed against
   the file's own question (*is this a spoiler?*) and every one is
   level 0: a room's light source, what it is made of, its temperature
   and the reason for it, a street's lighting service and what an NPC
   wears are all things a player can observe by standing there. The
   snapshot is updated rather than annotated.

3. **⭐⭐ A shipped pack test asserted the authored number this build
   made derived.** `trade-forestry`'s `hanging-wood.test.ts` reads the
   Rejection rows off disk and required **every file in
   `rejection/location/` to author an `ambientIntensity`**. W6 took
   those numbers away on purpose — six of those rooms are outdoor and
   are now lit *because their biome says they are open to the sky*, and
   the other six are **interiors**, which the old test had been quietly
   asserting were daylit.

   ⭐ The rewrite says what S2 actually claims — *every room's light has
   a named source* — rather than *every room authors a number*: a
   sky-lit room clears `dim` at its own cell, and an enclosed one
   authors no ambient at all and is honestly dark. It computes noon lux
   the way `skyNoonFlux()` does (the authored calibration if there is
   one, else `light.sky.noonLux` × area, **read from the shipped
   setting** so moving the dial moves the test), which keeps every
   original claim true: the hill is still brighter than the treeline,
   and it is now brighter *without authoring a number*, while the wood
   keeps its calibration because a canopy is a reason to be darker than
   the sky.

   ⚠ Worth a reviewer's eye: this is the one place the build changed
   what another pack's test was entitled to assume.

4. **⭐⭐⭐ THE PLANTS. A sky-lit room has a NIGHT, and a growth model
   was sampling one instant of it.** `eternal-university`'s dorm
   houseplant suite went red: the peace lily on the desk was
   light-limited, and the room read **0.078 lux**.

   The room is not wrong — it is a dorm room with a window, W6 gave it
   `ambientSource: sky` + the named opening, and at midnight a room with
   a window is dark. What was wrong is **who was reading it.**
   `GrowingMixin` integrates growth over windows and samples the light
   **once per window** (`Growing.sampleLux`). Before this build that was
   indistinguishable from the truth, because a scope's lux was an
   authored constant. Now it is a curve that goes to zero every night,
   and the sample reads *whatever o'clock the window happened to close
   at* — so **a lily on a sunny windowsill starves of light because its
   owner waters it in the evening**, which is not a thing sunlight does.

   ⭐ **The fix, and why it is `peak` and not `mean`.** A profile's
   `luxHappyAt` is a claim about a PLACE — *a windowsill suits a peace
   lily, a corridor does not* — and every one of the 22 plant rows in
   the tree was authored against constants. Reading the day's **mean**
   (≈0.26 of noon at latitude 42) would silently rebalance all of
   farming downward by 4×; reading the day's **peak** preserves every
   authored number and still answers the question the profile is
   asking. So:

   - `CelestialApi.skyFactorDailyPeak()` — the brightest the sky gets
     today, memoized per game day beside `skyFactorNow()`. Found by a
     coarse scan plus a refinement pass across the winning sample's
     neighbours. ⚠ Without that second pass the grid straddles solar
     noon and under-reports by ~0.2%, so `signalAt` at noon came out
     **above** `peakSignalAt` — and a peak a reading can exceed is not
     a peak. The unit test is the one that caught it.
   - `Modality.peakSignalAt(loc)` — *the strongest signal this place
     gets in a day*. Default is `signalAt`, which is right for every
     modality whose field has no day in it; **vision overrides it**.
   - `VisionModality.peakSignalAt` walks with the peak sky factor.
     ⭐ **Only the sky leg moves** — a lamp reads the same either way,
     because a lamp does not have a day. `signalAt` and the whole of
     perception are untouched: a player sees what is there now.
   - `Growing.luxAt` takes the peak read.

   ⚠⚠ **This is the finding of the build with the longest reach**, and
   it is the same shape as the forestry one: *a consumer of light that
   was written when light was a constant.* The kernel now distinguishes
   the two questions — **what is it doing now** and **how good is this
   place** — and anything that asks the second must say so.
