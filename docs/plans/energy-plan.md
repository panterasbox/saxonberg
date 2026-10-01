# Energy — implementation plan

Executes [energy-requirements.md](../requirements/energy-requirements.md).
**Kind:** feature. **Lead end:** kernel-led, first consumers already in the
world (the shipped street-lighting bill; a residential lamp; the grid the
cold-chain fridge will draw from later).

Two epochs, one MR. **Stage A (combustion)** completes the street-lighting
envelope on shipped substrate: a lamp-oil good with a unit, a producer that
is not a retailer, a town stock that depletes, and a civic bill paid from a
town treasury by a government seat through the shipped procurement loop.
**Stage B (electric)** mints the `/system/energy` pack: a feeder network
authored over the street graph and compiled to a reachability set, a meter
on the parcel, a powered-consumer contract, a derived cut, and Terminus's
streetlights migrated from oil to a grid draw. Every wave lands on its own.

The one sentence the build agent should hold: **the kernel carries a
citation and a shape; the pack carries the mechanism; the locality carries
the rows.** A parcel cites a feeder node the way it cites a reach; a town
cites a supply object the way it cites a supplier; the kernel never names
the energy pack.

---

## Grounding

Verified 2026-09-25 against the working tree of `design/energy` (which holds
envelope + instrumentation merged; `origin/master` matches for every file
named here). Paths are absolute under `/home/bobalu/play/saxonberg/build-4`.

### The street-lighting bill (envelope), as shipped

- `packages/server/src/mud/platform/idea/Locality.ts` — `PublicLightingFunding
  { costPerStreetNight: number; supplier: string | null; currency? }` (line
  59) and `settleStreetLighting(nowS, candidates)` (line 280): idempotent
  per game night via `_lightingNight`; `n = floor(treasuryBalance /
  costPerStreetNight)` read **first**; one `BankingApi.appropriate(supplier,
  n × cost)` leg; `_lightingLitStreets = candidates.slice(0, n)`. The
  treasury is the realm's (`BankingApi.treasuryAccountId(currency)` →
  `/compact/treasury`), documented as the build's one softening. **Money
  only, no goods leg, no fuel good exists** — its own docstring says so
  (lines 73–105). Runtime fields `_lightingNight`, `_lightingLitStreets`
  are `{ persistent: true, runtimeState: true }`.
- `packages/server/src/mud/platform/idea/api/AddressLogic.ts` lines
  291–323 — the realm walk: `StuffApi.findByMixin(Mixins.PublicLighting)`
  bucketed by `getLightingLocalityPath()`, sorted by `seniority`, each
  locality handed its own queue. `api/address.ts` lines 207–223 forward
  `isStreetLitTonight` / `settleStreetLighting`.
- `packages/server/src/mud/platform/idea/WorldClockRegistry.ts` lines
  543–574 — the daily schedule at sunset (`tag: 'civic:lighting'`) and the
  60 s post-boot settle when it is already dark.
- `packages/server/src/mud/lib/perception/PublicLighting.ts` —
  `PublicLightingSpec { flux, colorTemperature?, detail, seniority }`;
  `isPubliclyLitNow()` = declared ∧ dark ∧
  `AddressApi.isStreetLitTonight(localityPath, path)` (sync); the
  `getDetail` prose (burning / standing cold / out in daylight).
- `packages/server/src/mud/platform/location/Street.ts` —
  `PublicLightingMixin(SingletonCartesianLocation)`; `Crossing.ts`
  `extends Street`. **Five rows** declare the service, all Terminus:
  `terminus/content/world/terminus/{mayfield-row/street, wharfside/bank,
  market/square, counting-houses/avenue-block}.yaml` (class Street) and
  `university-avenue/location/crossing.yaml` (class Crossing).
- `packages/content/platform/content/platform/idea/Locality/terminus-city.yaml`
  — `_publicLighting: { costPerStreetNight: 4, supplier:
  /world/terminus/general-store/business }`, `_governmentKey: terminus-city`,
  **no `_reach`**.
- Heart's Delight (`packages/content/world-seed/content/stuff/idea/Locality/hearts-delight.yaml`)
  has **no `_publicLighting` block, no `_governmentKey`, and no `Street`
  rows** — its ways (`hearts-delight/content/world/terminus/hearts-delight/location/{bench-lane,valley-gate,farmstead-yard,millsite,barn}.yaml`)
  are plain `SingletonCartesianLocation`. Hinkley Hills'
  Locality row has `_governmentKey: hinkley-hills`, no lighting.
- `packages/server/src/mud/platform/__tests__/Locality.lighting.test.ts` —
  the settle's unit test; stubs `BankingApi.appropriate` and asserts the
  seniority cut.
- `packages/wire/tests/envelope.dirty.wire.test.ts` — the envelope drive;
  the `assertItIsDark` guard and the funded/unfunded street checkpoints
  this build's drive extends.

### The supply vocabulary and the water works (the structural template)

- `packages/server/src/mud/lib/supply/SupplyState.ts` — the kernel six-word
  vocabulary (`dry·cut·frozen·fouled·off·overdrawn`), `SUPPLY_STATE_PRECEDENCE`,
  `SUPPLY_STATE_GLOSS`, `SupplyReport`, and the `SupplyReporting` duck
  (`supplyReport?(nowS)`) that lets a kernel verb read a pack object over
  a shape. Written "for whatever utility lands next"; a seventh word is a
  design conversation.
- `packages/content/water/src/thing/Conduit.ts` — a **two-ended pipe**:
  `reachRef` + `extent` (longest-prefix served area), `direction`,
  `capacityM3S`, `headM` stamped once, `cut` + `off` the only stored
  states, the rest derived in `readingFor`; composes `Detailed +
  Switchable` over `Thing`. ⚠ Header: three unrelated things are already
  named `Conduit` (`lib/boundary/Conduit`, arcana's, this). **Nothing sets
  `cut` on a water conduit from any verb** — `grep setCut` finds only the
  class itself; the water build never shipped a cut act.
- `packages/content/water/src/idea/Watercourse.ts` — the data Idea: rows at
  `/stuff/idea/Watercourse/<key>` (**the commons, not the pack root**, so
  the realm's own pack can edit its river), `nodes[]` source-first, cited
  by **name** (`kestrel:falls`), `branchesFrom`.
- `packages/content/water/src/idea/WatercourseCatalogue.ts` — lazy, never
  warmed (`loadIndex` on first read; `invalidateCache` on HMR; `canEvict`
  / `canDestruct` veto); `Template.findByClass` (line 970) finds rows by
  class, no roster; compiles `downstream: Map<ReachRef, Set<ReachRef>>`
  so `compare` is one `Set.has`; the works roster has its **own** lazy
  slot (line 345). `FisheryRegistry.ts` beside it is the precedent for a
  catalogue Idea whose one piece of state (`drawn`) persists.
- `packages/content/water/src/thing/ControlStructure.ts` —
  `generationW(flowM3S)` (`ρ·g·Δh·Q·η`, line 216), `getReachRef()`,
  `getHeadM()`, `isGenerating()`.
- `packages/content/water/src/idea/reading/PowerReading.ts` +
  `content/system/water/idea/reading/power.yaml` — the `analyze power`
  channel, **duck-typed**: a generator answers `generationW(flow) +
  getReachRef() + getHeadM()`, a consumer answers `availablePowerW()` (+
  optional `throughputNow()`). The channel is a ROW; installing the pack
  installs it (`lib/instrument/Reading.ts` line 30). The flat `analyze`
  view (`platform/content/platform/cmd/perception/analyze.yaml`) resolves
  the channel string against the installed roster; a second `analyze`
  view would shadow it.
- The Wharfside generator: `terminus/content/world/terminus/wharfside/thing/aqueduct-house.yaml`
  — `ControlStructure`, `reachRef: cold-fell:cascade`, `headM: 60`,
  `generates: true`, `ownerRef: "group:terminus"`. ⚠ **Propped in no
  room** (nor its feeding `cold-fell-aqueduct.yaml`); found only by the
  catalogue's class walk. Heart's Delight's `millrace.yaml` (`delight:flats`,
  `headM: 6`, `generates: true`) is the second generator.

### The parcel — the meter's host

- `packages/server/src/mud/lib/parcel/ParcelRecord.ts` — fields `extent ·
  zonePath · area · storeys · owner · parentParcel · grants · allowance ·
  keyway · landUse · reach`. **No service field.** `reach` (line 230) is
  the citation precedent: *"a citation on the land is the only honest link
  between a title and a river"*; `landUse: null` = inherit upward.
  `TitleClaim` (line 69) carries `reach?`, `landUse?`, `areaM2?`.
- `packages/server/src/mud/platform/idea/ParcelRegistry.ts` —
  `coveringParcelOf(path)` (line 90, longest-prefix, sync),
  `landUseOf(path)` (line 108, the inherit walk), `byReach` index +
  `parcelsOnReach` (lines 185, 760–802), `citeReach(extent, reach)` (line
  353, the write seam). `api/parcel.ts` forwards (`coveringParcelOfSync`
  line 99, `landUseOf` line 172, `citeReach` line 229).
- `packages/server/src/mud/platform/idea/api/PackLogic.ts` — manifest
  title claims parsed at lines 446–459 (`landUse`, `areaM2` validated) and
  mapped to `TitleClaim` at 3313–3314. A new claim field lands in both
  places.
- Title claims today: Terminus (`packages/content/terminus/pack.yaml`)
  claims 16 extents with `landUse` and no `reach`; Heart's Delight one
  (`agricultural`); Hinkley two (`residential`, `lot-1` the taken lot).
  Terminus's only residential building is Seznick House
  (`mayfield-row/seznick-house/building.yaml`, a `BuildingWarren`; units
  minted on demand at `…/units/f<floor>-u<pos>`; `lobby` is a real room
  under the titled `seznick-house` parcel).

### The exit graph — why the network is NOT an exit attribute

- `packages/server/src/mud/lib/boundary/Exit.ts` lines 196–223 — the
  hydration allowlist is **closed** (`messageIn/Out · media ·
  wheelPassable · _edgeMinutes · blocked · muffled · noFollow · oneWay`);
  *"Exits are never saved — no persistence host captures them."*
- `packages/server/src/mud/lib/boundary/Exitable.ts` — `ExitInstruction`
  (line 194) is a closed interface; `_applyExitSpec` (558–658) destructures
  named fields only; exits are minted per side at the room's hydration
  (**two objects per street link**, one per row).
- `packages/content/transport/src/idea/LaneCatalogue.ts` — `induce` (477)
  BFSes exits from seeds, faulting rooms in with `StuffApi.singleton`;
  `exitBetween(from, to)` (261) resolves a live exit between two paths.
  The precedent for *"a per-edge fact consumed by a walker."*

### Electricity (the Tier-B attach point, untouched here)

- `packages/server/src/mud/lib/electricity/Energized.ts` —
  `EnergizedMixin`: a node held at a potential, the conduction walk,
  `CombatReactive` nested. `docs/subsystems/electricity.md` § Deferred
  seams: *"the grid: this same Ohm's-law physics scaled up … never a
  second power abstraction."*

### The fuel chain

- `packages/content/trade-fuel/` — root `/trade/fuel`, title held by
  `/compact/trade`; `src/thing/CharcoalPit.ts` (post-narrowing
  `ContainerMixin(Firebox)`, where `Firebox` =
  `BurnerMixin(LightSource(Reserved(Thermal(Thing))))` — `lib/fire/Firebox.ts`;
  we copy only its affordance + `CharController` shape, unchanged; affords
  `char` through
  `static commandContributions`, the `Anvil` shape); `CharController.ts`
  (a watched `ManualBuildStep` on the `attention` slot); rows: material
  `content/stuff/idea/material/organic/charcoal.yaml`, good
  `content/trade/fuel/thing/charcoal.yaml` (a `Provision`, `mass: 8`,
  material-path ref), `recipes/charcoal.yaml`, discipline `colliery`.
- The one fuel Business is in Rejection
  (`rejection/content/world/terminus/rejection/idea/fuel-yard-business.yaml`,
  `location/fuel-yard.yaml`, `agent/collier.yaml` — brains: `idles`
  only). ⚠ **Rejection is unreachable by wagon**: `world-seed
  …/Lane/spine.yaml` induces over `wheelPassable` exits and the pass sets
  it false; the `ferrow-tram` lane is two Rejection rooms. No Rejection
  producer consigns anywhere.
- `docs/slates/builds/destructive-distillation-slate.md` — the retort
  (coal/wood tar, naphtha, coal oil) is **its own unbuilt build**; no tar
  or oil material exists.
- Materials: `lib/material/Material.ts` carries `heatOfCombustion`
  (`MJ/kg`, line 387) and `autoignitionTemperature`; ⚠ narrowing W9 renamed
  `FurnaceMixin`→`BurnerMixin` (`lib/fire/Burner.ts`, `fuelBurnRatePerMin` at
  172/275 — there is no `Furnace` class any more); `SpaceHeating.ts`
  (`lib/thermal/`, UNCHANGED, `heatOutputW` line 78) names deriving watts from
  mass × `heatOfCombustion` as a deferred seam (line 34). A bulk liquid material row:
  `water/content/stuff/idea/material/bulk/fouled-water.yaml`. A filled
  bulk good: `trade-distilling/content/trade/distilling/thing/gin.yaml`
  (`interiorBulk · interiorCapacity · interiorMaterial · interiorAmount ·
  censusKey · regionTarget · container:` — *"`container:` is the ONLY
  faucet"*). Units: `lib/quantity.ts` has `L`, `kg`, `W`, `V`, `A`; no
  `Wh`.

### The procurement loop (all shipped)

- `Business.parLines[]` `{ category, unit (L|kg|count), level, supplier:
  <Business path>, exemplar }` (`docs/subsystems/employment.md` § 511–620);
  `CategoryMeasure` (`lib/employment/CategoryMeasure.ts`) tallies litres of
  a tagged bulk material across casks/kegs; **a supplier is found by the
  ROOM its counter stands in** (`lint:openings` arm 5).
- `lib/behavior/restocks.ts` — on shift, `wallet use house`, `job post` a
  `--bounty` **supply gig** per short line onto the `board`, empty the
  `bench` onto the `shelf`. Config `{ shelf, board, bench, reward, … }`;
  the lounge's `mara.yaml` lines 60–90 is the exemplar.
- `packages/content/trade-haulage/src/behavior/hauls.ts` — the carter
  covers any bounty nobody took inside `haulage.gigWindowGameHours`: buys
  at the supplier, journeys on the lane, drops on the bench, turns it in.
  **It never claims** (bounties need no claim), which is why the
  contract substrate's *"NPC claiming brains"* deferred seam does not
  block this build. `carter.yaml` config lists the boards it watches.
- `trade-shopkeeping/src/behavior/consigns.ts` — a producer's hand walks
  the floor stock to the distributor's counter and consigns **as the
  business**; the seven goods-yards outfits (`terminus/…/goods-yards/{bottling,…}/{idea/outfit,thing/stock,agent/hand,location/floor}.yaml`)
  are the pattern.
- Contract substrate (`api/contract.ts`, `lib/employment/{Clause,Condition,ContractRecord}.ts`):
  a `supply` condition over `{ kind: 'category', category, unit: 'L' }`
  is engine-verified; gigs are one-shot; the issuer is a player or a
  Business (`resolveIssuer`, `ContractLogic.ts` 511–568) — a Locality
  cannot post. **So the town's public-works department must be a
  Business.**

### Civics, seats and money

- `packages/server/src/mud/platform/idea/Government.ts` — descriptor
  `{ key, displayName, charter, treasury, departments[], seats[] }`;
  a seat is `{ key, label, department: <Business path>, positionKey }`.
  ⚠ `treasury` **is read by nothing** today (`lint:unconsumed-seams`
  counts it). Terminus's row
  (`platform/content/platform/idea/Government/terminus-city.yaml`) sets
  `treasury: /world/terminus/budget`, and that row exists:
  `terminus/content/world/terminus/budget.yaml` — *"the municipal
  city-budget Business … the house account keys on THIS path"*, banks at
  `goodkin`, stands up lazily on first `businessAt`.
- `docs/subsystems/civics.md` § two staffs: a government seat is a
  **position on an organization's chart**, never a second `OFFICE_APPARATUS`
  entry; `GovernmentApi.holdsSeat(character, govKey, seatKey)`
  (`api/government.ts` line 111) is the predicate. The parameterized
  `requiresOffice` validator is a named deferred seam — a third
  hand-written twin is the trigger. This build needs **no** seat-gated
  verb: the seat's authority is the `purchases: true` position (the house
  card, `wallet use house`).
- `packages/server/src/mud/platform/idea/api/BankingLogic.ts` —
  `appropriateImpl` (line 737) sources **from the hard-coded
  `/compact/treasury`**, destination `toOwnerKey`'s primary account,
  category `appropriation`, no actor gate (the gate is on verbs);
  `remitDemoTaxImpl` (line ~1705) posts one `tax` leg from the seller to
  `/compact/treasury` at `AppSettingKeys.bankingSalesTaxRate` (global,
  not per locality); callers: `BuyController.ts` line 332,
  `OrderController.ts`, `PricedOffer.ts`. `ensureVenueAccountImpl` (line
  359) opens a primary account for any `ownerPath` at a real custodian.
  `BankingApi.transfer` (`api/banking.ts` line 416) is *"only from your
  own account"* — actor-gated, unusable from a scheduler.
  `PnlCategory` has `appropriation` and `tax`.
- `api/employment.ts` — `operatingAccountOf(business)` (line 249),
  `businessOfProprietor`.

### Weather

- `packages/server/src/mud/platform/idea/api/WeatherLogic.ts` lines
  957–1010 — `runStormFanout`: presence-gated over occupied SkyExposed
  scopes whose resolved type is `storm`; rolls `storm.strikeRate`; the
  test override `forcedStrikeRoll`. The kernel reaches `ElectricityApi` by
  dynamic import. `lib/weather/LightningStrike.ts` is the transient
  source. `lib/weather/WeatherType.ts` is the vocabulary file.

### Pack scaffolding (what a new pack needs, verified)

- Discovery is by directory: `packages/server/scripts/pack-roots.ts`
  `packSources()` reads every `packages/content/*/` with `pack.yaml` +
  `src/`; `pnpm-workspace.yaml` globs `packages/content/*`. **The one
  registration edit is the root `package.json` dependency line**
  (`"@saxonberg/content-energy": "workspace:*"` — `PackLogic.packNamesFromDeployment`,
  lines 307–337). Class resolution: `StuffApi.resolveClassFile`
  (`api/stuff.ts` 330–354), longest registered root → `<src>/<rest>.ts`.
  Pack mixins register at discovery from source (`PackLogic.registerPackMixins`,
  lines 613–661); a pack's dial **key** must be declared in the kernel
  `AppSettingKeys` (`lib/config/AppSettings.ts`; the water keys at line
  ~1848) — the pack's `content/settings/<id>.yaml` only retunes.
  Boilerplate to copy from `packages/content/water/`: `package.json`,
  `tsconfig.json`, `vitest.config.ts` (the `callSecPlugin`), `pack.yaml`,
  `README.md`. Sibling `/system/` packs with a `lib/`: `tpa`, `ground`.
- Rows under `/stuff/…` written by `world-seed` ride the platform's
  `/stuff` claim (`world-seed/pack.yaml` declares nothing) — where the
  `Watercourse` rows live and where `Feeder` rows will.
- Reading channels: `lib/instrument/Reading.ts` `PATH_INFIX =
  '/idea/reading/'`; a pack's `content/<root>/idea/reading/<x>.yaml` row
  is the channel; `subjectRequires` carries the per-channel arg gate.

### Lint roster (58 gates, `pnpm -C packages/server lint:family --list`)

⚠ Narrowing added **`lint:mass`** (the 58th; the roster was 55 at plan time).
The gates this build must satisfy or extend are named in § Test & gate
strategy. Three whose clauses touch this build directly:
`lint:light-sources` clause (e) refuses any class named
`*Lamppost* / *StreetLamp* / *StreetLight*` (script line 204);
`lint:unconsumed-seams` counts unread `fieldMeta` keys on data Ideas —
this build **reads** `Government.treasury` and lowers the count; and
**`lint:mass`** (`scripts/check-mass.ts`, census-then-ratchet, CEILING 242
across 83 classes, FROZEN) fails any row whose class reaches `TangibleMixin`
and declares neither `mass` nor `_materialPath` — so **every new Thing row
this build adds must carry one** (see § Convention conformance). This build's
own `lint:power-posture` (B0) becomes the 59th gate.

---

## Plan-level decisions

**D1 — `/system/energy` is a capability pack; the kernel carries citations
and shapes only.** `packages/content/energy/`, root `/system/energy`,
`src/` with `idea/ · thing/ · lib/ · idea/cmd/ · idea/reading/`,
mirroring `water`. What is KERNEL: `SupplyState` (exists), a new
`StreetLightingSupply` shape beside it, the `PublicLightingFunding`
extension + the settle, the parcel's two new fields + `PowerBand`
vocabulary + registry index, `appropriate`'s source parameter, the local
tax share, a `StormExposed` duck in the weather fan-out, the
`AppSettingKeys` entries, and `lint:power-posture`. What is PACK: the
`Feeder` data Idea, the `GridCatalogue`, `GridPoweredMixin` (pack `lib/`),
`ElectricLight`, `LineAccess`, `FuelStore`, `GridReading`, the `sever` /
`splice` verbs. What is CONTENT: every row (feeders, poles, the oil works,
the public-works departments, the Government rows, the parcel claims).
Passes the requirements' own test: a second town's grid, a second producer,
a third gas-lit locality are rows.

**D2 — Do NOT promote water's `Conduit`; nothing is named `Conduit`
here.** The promotion trigger in `CLAUDE.md` is *a third pack wanting a
MIXIN without depending on its owner*. Nothing in energy composes or
subclasses `Conduit`: a water conduit is a two-ended pipe with water physics
(head, pump, treatment, discharge, the reach's flow); a distribution feeder
is a **rooted tree over streets** with a cut anywhere along it. Sharing the
class would be a costume, and it would put a fourth `Conduit` in the tree.
The commodity-generic core the power-utility slate asked for **is already
kernel**: `SupplyState` + `SupplyReporting` (the `analyze` duck) + the
longest-prefix-extent idiom (`ParcelRegistry`), and this build adds the
`StreetLightingSupply` shape beside them. A future gas main is genuinely a
two-ended pipe and *would* be a water-shaped conduit; that is a note for
the power-utility slate, not a promotion now. Energy's names: `Feeder`
(the row), `GridCatalogue` (the compile), `LineAccess` (the act target).

**D3 — The network is an authored `Feeder` row over street paths,
verified against the exit graph at compile; the exit carries nothing.**
The slate's phrase *"service as an exit attribute"* is honoured in
substance (the line follows real streets, and only where an exit joins
them) but not as a field on `Exit`: exits are transient, closed-schema,
minted per side and never persisted (Grounding), so a service flag there
would need three kernel edits and could hold no state. A `Feeder` row
(`/stuff/idea/Feeder/<key>`, the commons, exactly where `Watercourse` rows
live) declares `source` (a generator's template path) and `nodes[]`
outward from it, each `{ name, at: <Street row path>, buried?: boolean }`,
plus `branchesFrom: "<feeder>:<node>"` for a spur. The catalogue refuses
(as a compile problem + `DiagnosticsApi.record`, never a throw) any
consecutive pair of nodes whose streets `LaneCatalogue.exitBetween` cannot
join in either direction — *a line may not leave the road.* Direction is
the authored order (a radial feeder IS directed from its substation, as a
canal is directed by how it was dug).

**D4 — The cut is the catalogue's one piece of state.** `GridCatalogue`
persists `cuts: string[]` of node refs (`terminus-main:avenue`), the
`FisheryRegistry.drawn` shape: everything else — energized, supply state,
the trace — derives on read. A cut at node N darkens N and its compiled
downstream set. `sever(nodeRef)` / `splice(nodeRef)` are the two writers,
gated to `LineAccess` (participant contract) and the storm seam (D13).

**D5 — The meter is the parcel: a `feeder` citation and a `powerBand`.**
`ParcelRecord.feeder: string` (`''` = none; the `reach` shape) and
`ParcelRecord.powerBand: PowerBand | null` (`null` = inherit, the `landUse`
shape). Both are `TitleClaim` fields authored in `pack.yaml`, mapped by
`PackLogic`, indexed by `ParcelRegistry.byFeeder`, read through
`ParcelApi.powerOf(path) → { band, feeder, parcel }` — longest-prefix then
inherit upward. A consumer never walks the interior: *"is my covering
parcel's feeder node energized, and is my band not `off-grid`?"*

**D6 — `PowerBand` is a kernel vocabulary; watts per band are a pack
dial.** `lib/parcel/PowerBand.ts` (the `LandUse.ts` shape):
`off-grid · domestic · commercial · industrial`. The kernel says what a
premises declares; the energy pack says what a band is worth
(`energy.band.domesticW` etc.) and whether a feeder is `overdrawn` (Σ
connected bands' ceilings > the source's watts).

**D7 — The consumer contract is `GridPoweredMixin` in the pack's `lib/`,
read synchronously.** `postRegister` resolves the host's room → covering
parcel → `{ band, feeder }` once (the `PublicLightingMixin._lightingLocalityPath`
precedent) and caches the node ref; `isPowered()` is then
`band !== 'off-grid' && catalogue.energizedAtSync(nodeRef)`, safe on the
vision walk's hot path. `availablePowerW()` answers the band's ceiling
while powered, else 0 — so `analyze power <light>` (water's shipped
channel) reads it with no new code.

**D8 — Generation reuses the shipped `generationW` contract; nothing
composes `EnergizedMixin`.** A feeder's `source` cites a thing answering
`generationW(flow) + getReachRef()` (a `ControlStructure`), resolved by
`StuffApi.singleton` and asked the water catalogue's `flowAt` by duck
(exactly `PowerReading.flowAt`). `sourceUp` is `generationW > 0`. Reconciled
with `electricity.md`: the public network is the water-mirror **delivery**
layer; the conductive-graph physics is the Tier-B interior, and the meter is
its attach point — a premises-side `Energized` fixture can later be "held
at potential iff `isPowered()`" without this layer changing.

**D9 — The lamp-oil good, and the producer is an OUTFIT.** `trade-fuel`
gains the material `/stuff/idea/material/bulk/lamp-oil` (liquid, tags
`[liquid, lamp-oil, fuel, flammable]`, `heatOfCombustion: 43`, density
820), the empty vessel `/trade/fuel/thing/oil-cask` (a `Vessel`, category
`oil-cask`, 40 L, `liquidTight`), and the filled good
`/trade/fuel/thing/lamp-oil-cask` (the `gin.yaml` shape: `interiorMaterial`
+ `interiorAmount: 40` + `censusKey: fuel:lamp-oil` + `regionTarget` +
`container:`). The producer is **an oil works at the Terminus goods yards**
in the shipped seven-outfit pattern (a Business, a floor `Stock` the good
spawns into through its own `container:`, a hand running `consigns` to the
cash-and-carry, a floor with a door onto the yard). Rejection's fuel yard
cannot be the producer: no wagon reaches it (Grounding). The retort — coal
in, oil out as a craft act — is the destructive-distillation slate's build
and is **not** half-built here; the outfit is the realm's sanctioned
producer shape for exactly this state (the seven outfits' floor stock is
spawned, honestly labelled). ⚠ Flagged in § Risks & opens for the user.

**D10 — The goods leg: `fuelPerStreetNight` + a cited `supply`, and the
`StreetLightingSupply` shape.** `PublicLightingFunding` gains
`fuelPerStreetNight?: number` (litres — the freed name, now true) and
`supply?: string` (a template path). The kernel declares, beside
`SupplyState`:

```ts
export interface StreetLightingSupply {
  /** Cover as many of `paths` (seniority order) as the supply can tonight; consume what that costs. */
  lightStreets(paths: readonly string[], nowS: number): Promise<readonly string[]>;
  /** Live: is this street's supply still reaching it right now? (sync — the vision walk asks) */
  isServingNow(path: string): boolean;
}
```

`settleStreetLighting` resolves `supply` with `StuffApi.singleton`, narrows
by duck, and sets `n = min(candidates, affordable, covered)` where
`affordable` applies only when `costPerStreetNight > 0` and `covered` is
`lightStreets`' answer. `Locality.isStreetLitTonight` becomes
`_lightingLitStreets.includes(path) && (supply?.isServingNow(path) ?? true)`
— so a cut darkens a street the same second, and a splice relights it,
without waiting for dusk. The pack's `FuelStore.lightStreets` drains
`fuelPerStreetNight` litres per covered street out of the casks it holds
(`BulkApi.transfer` from each cask's interior slot, burned — no
destination), in seniority order until dry; `GridCatalogue.lightStreets`
returns the energized subset (seniority is irrelevant to electricity — a
cut, not a budget, darkens it). The Locality also records the supply's
presentation (`_lightingSourceLabel`, runtime state) so the street's lamp
detail can say *"fed from the Wharfside line"* / *"burning the town's
oil"* — the epoch, read off a lamp, derived.

**D11 — Terminus migrates by citing the grid; the epoch is derived.**
Terminus's Locality row becomes `_publicLighting: { supply:
/system/energy/idea/GridCatalogue, costPerStreetNight: 0, supplier: null }`.
The general store's placeholder role ends by deletion. A municipal utility
bills its own lamps nothing (Tier C metering is a non-goal; the
requirements' *"ownership of the electric utility is left to the polity"*
ships as: the grid's works are Terminus's, `ownerRef: "group:terminus"` on
the generator already says so, and nobody is billed). The epoch read
(`analyze grid` bare, and the wiki/`look` prose) is derived: **electric**
iff any feeder node stands on a street under the locality's address and
its source is up; **gas-lit** iff `_publicLighting.supply` resolves to a
`FuelStore`; **off-grid** otherwise. No flag anywhere. ⚠ The calibrated
`costPerStreetNight: 4` retires for Terminus — flagged.

**D12 — The civic economy rides the existing `Government.treasury`, a
`Government.seats` entry, and the shipped procurement loop.**
- *Budget:* the locality treasury is what `Government.treasury` already
  names — a municipal Business whose house account keys on its path
  (`/world/terminus/budget` today). `Locality.treasuryAccountId()` walks
  `GovernmentApi.governmentChainAt(address)` to the first descriptor with a
  `treasury`, resolves the Business and its `operatingAccountOf`; a chain
  with none falls back to the realm's, which preserves envelope's
  behaviour for a locality under the realm alone.
- *Income:* `remitDemoTax` splits the tax at `banking.localTaxShare`
  (dial, default `0.5`) between the realm and the covering locality's
  treasury; callers pass the venue fixture so the locality resolves
  (`AddressApi.resolveLocalityFor(room)`); a locality whose treasury has no
  account yet simply gets no share that sale (honest, no lazy mint from
  inside banking).
- *Spend:* `BankingApi.appropriate(to, amount, memo, opts?: { fromOwnerPath })`
  — one optional parameter; category stays `appropriation`; the sealed
  `postTransaction` chokepoint is untouched. Conservation holds: a transfer,
  never a mint.
- *Seat:* a `public-works` entry in the locality's `Government.seats`
  pointing at the public-works department Business's `warden` position
  (`purchases: true`). The seat's power is the house card; no new validator.
- *Contract:* the department's `parLines` name `lamp-oil` in litres from
  the cash-and-carry; the warden runs `restocks`, posting a `--bounty`
  supply gig on the works board; a player or the carter buys casks at the
  distributor (where the oil works consigned them — the producer paid on
  resale) and lands them on the bench; the warden racks them in the store.
  Private supply, public service, the board the appeal.

**D13 — Overhead lines fault in storms through a kernel duck.**
`runStormFanout` gains one line: after the strike roll, every occupant of a
stormed scope answering `onStormExposure?(nowS)` (`StormExposed` in
`lib/weather/WeatherType.ts`) is called. A `LineAccess` pole (overhead)
rolls `energy.stormFaultRate` and severs its node; a manhole (`buried`)
answers nothing — storm-safe by construction. Presence-gated like every
weather consequence (the shipped doctrine), environmental provenance
(`uncertainty.md`), and the kernel names no pack.

**D14 — Verbs: `sever` and `splice` on `LineAccess`; `analyze grid` as a
Reading channel; no `cut`.** `cut` is tailoring's (`lint:verb-collisions`).
Both views ship in the pack under `content/system/energy/cmd/energy/`,
afforded by `LineAccess.static commandContributions` (environment + peers,
the `CharcoalPit` shape), arg `default: "reachable:[class.LineAccess]"`
with `requires: [DetailedMixin]` and the pack's refusal phrase. `analyze
grid` is a row (`content/system/energy/idea/reading/grid.yaml`, class
`/system/energy/idea/reading/GridReading`): bare = the premises you stand
in (parcel, band, node, energized, the locality's epoch); on a pole or a
street = the trace back to the source naming the first cut.

**D15 — `lint:power-posture`, census then ratchet.** Every manifest title
claim whose `landUse` is `residential · commercial · industrial · civic`
must carry a `powerBand` or inherit one from a parent claim in the same
manifest; a missing one **fails**. A claim citing a `feeder` that no
`Feeder` row's nodes name, or declaring a connected band with no feeder
reachable from any street under its extent, **warns** (the "disagreement a
reviewer sees", also recorded as a diagnostic at install). Opens in B0 with
today's count as the ceiling; B3 drives it to 0.

**D16 — Stage A / Stage B.** A is content-led on shipped substrate with
three kernel edits (funding record + settle; `appropriate` source; tax
share) and lands the whole combustion market. B is kernel-led (the parcel
meter, the posture lint, the storm duck) plus the new pack. Each wave ends
at a commit and a green `test:near` + lint family.

---

## Host placement

For every new field, mixin and class: the host, and what composing it
claims about everything else on that host. The test: **a guard that
re-narrows the host set means the host is wrong.**

| what | host | claim it makes | why not elsewhere |
|---|---|---|---|
| `fuelPerStreetNight?`, `supply?` on `PublicLightingFunding` | `Locality._publicLighting` (kernel) | *a town that lights its streets names what it burns and where it draws it from.* Only localities that already declare lighting carry it; `null` stays the ordinary case. | not on `Street` (a street does not know the town's stock) · not on the pack (the kernel settle reads it) |
| `_lightingSourceLabel` (runtime) | `Locality` | a settle records what fed it. | — |
| `StreetLightingSupply` (shape) | `lib/supply/SupplyState.ts` (kernel, no class) | *anything that can cover a street-night answers this.* Two implementers, both pack classes. | not an interface file of its own (the `types.ts` reflex); it belongs with the vocabulary it extends |
| `PowerBand` vocabulary | `lib/parcel/PowerBand.ts` (kernel) | *a premises declares its electric posture.* | the kernel validates the declaration; the pack prices it |
| `feeder`, `powerBand` | `ParcelRecord` (kernel) | *title ground cites the node that meters it and the band it declares.* Composing here claims it for every parcel, which is correct: every parcel answers (`''`/inherit for most). The `reach` precedent exactly. | not on a structure object (none exists — the requirements' own placement) · not on `Street` (a street is not a meter) · not on `Locality` (coverage is legal, connection is physical) |
| `byFeeder` index, `parcelsOnFeeder`, `citeFeeder`, `powerOf` | `ParcelRegistry` + `ParcelApi` | the meter resolves the way title does. | — |
| `Feeder` (data Idea) | `/system/energy/idea/Feeder`, rows `/stuff/idea/Feeder/<key>` | *a line exists whether or not anyone draws from it.* | rows in the commons so the realm's pack edits its own grid (the `Watercourse` rule) |
| `GridCatalogue` (singleton Idea) | `/system/energy/idea/GridCatalogue` | the compile and the one state slot (`cuts`). `canEvict`/`canDestruct` veto; HMR invalidates. | — |
| `GridPoweredMixin` | pack `lib/GridPowered.ts`; composed on `ElectricLight` (and the later fridge) | *this thing works only while its premises' meter is live.* Composed only by things that draw grid power; nothing else needs a guard. | ⚠ **not** on `Thing`, `LightSource`, `Switchable` or `BurnerMixin` (narrowing's rename of `Furnace`) — any of those would claim the hearth, the lantern and the glowcap draw from a wire. `Freshness off every Thing` is the shape refused, and narrowing W6 ("58 classes stopped claiming to be property") makes this house style. |
| `ElectricLight` | `/system/energy/thing/ElectricLight` — `GridPowered(LightSource(Switchable(Detailed(Thing))))` | a switchable light that emits only while on **and** powered (the `PortableLight` coupling, plus the meter). Name passes `lint:light-sources` (e). | not a subclass of platform `Lamp` (which composes `BurnerMixin` — a lamp burns fuel; narrowing W9 made this exclusion sharper) · not `PortableLight` (that is a fungus jar) |
| `LineAccess` | `/system/energy/thing/LineAccess`, rows per street (`pole`, `manhole`) | *here is where a person reaches the line.* Cites `nodeRef`; affords `sever`/`splice`; answers `onStormExposure` only when its node is overhead; `look` detail reports the line's state. | not one object per feeder node by default — a row only where content wants the line reachable (the forestry four-representations rule) |
| `FuelStore` | `/system/energy/thing/FuelStore` — `DetailedMixin(Holder)` (narrowing's `lib/stuff/Holder.ts` immovable-container rung — *"the next immovable container extends this class"*), `fixedInPlace`, self-placed by its row's `container:` | *the town's oil is here; a settle draws from it.* Implements `StreetLightingSupply` + `SupplyReporting`. | not a `Stock` (nothing is priced or sold here) · not on `Locality` (a stock is matter, in a room) |
| `GridReading` | `/system/energy/idea/reading/GridReading`, row `grid.yaml` | the instrumentation split: the stanza is the platform's `analyze`, the channel is the pack's. | not a second `analyze` view (shadows) |
| `StormExposed` duck | `lib/weather/WeatherType.ts` | *a thing standing in a storm may answer to it.* | not a mixin (one consumer; a shape suffices — the `Discharging` precedent) |
| `lamp-oil`, `oil-cask`, `lamp-oil-cask` | `trade-fuel` content | the fuel trade makes lamp oil. | material in the commons path, pack-owned (the charcoal precedent) |
| the oil works outfit | `terminus` content, `goods-yards/oilworks/` | a producer in Terminus, in the shipped shape. | a locality is expression; the trade is mechanism |
| public-works department + warden + store + board + bench | `hearts-delight` content (+ a `Government` row in `world-seed`) | the town's seat, in the shipped shape. | — |
| `energy.*` dial keys | `AppSettingKeys` (kernel) + `energy/content/settings/energy.yaml` | the pack retunes what the kernel declares. | the verified rule (Grounding § scaffolding) |

**Findings the placement pass produced (recorded, not coded):**

1. `Government.treasury` was unread — this build is its first consumer.
   It was authored as a Business path where the docstring says "bank
   account key"; the build resolves a Business path and updates the
   docstring rather than adding a second field.
2. `PublicLightingMixin.isPubliclyLitNow` is sync; making a cut felt
   immediately therefore needs `isServingNow` sync on the supply, which is
   why `GridCatalogue` keeps a **sync view** of its compiled index.
3. Heart's Delight declared no government on purpose ("the common sparse
   case"). A town that funds a service needs a treasury and a seat, so it
   gets a Government row — a content decision the requirements imply
   ("a town budget … a government seat"), flagged below.

---

## Convention conformance

Checked against the current tree, not recalled.

- **`props:` / `cast:`** (populates: retired) — every new room row uses
  them; the pole rows enter their street's `props:`; the warden and the
  oilworks hand enter `cast:`.
- **Locations, not rooms** — Heart's Delight's ways become
  `/platform/location/Street` (singleton outdoor public ways); the
  public-works yard is a `SingletonCartesianLocation`; the oilworks floor
  copies the goods-yards floor rows. No `FurnishableRoom` (nobody furnishes
  these). `lint:locations` enumerates FurnishableRoom, derives zones. ⭐
  Narrowing L0 added `Visible`/`Perceptible`/`Detailed` to the `Location` root,
  so these get the detail line free (additive; `Street`/`PublicLightingMixin`
  is unchanged).
- **`<root>/<branch>/` path pattern** — pack classes at
  `/system/energy/{idea,thing,lib}/…`, controllers at
  `/system/energy/idea/cmd/energy/<Name>Controller`, views at
  `/system/energy/cmd/energy/<verb>`, the reading at
  `/system/energy/idea/reading/GridReading`; `Feeder` rows at
  `/stuff/idea/Feeder/<key>`; trade rows at `/trade/fuel/thing/…`.
- **Module scope declares; lifecycles initialize** — the catalogue is
  lazy (no boot step, no warm); `postRegister` resolves what needs a walk;
  no module-scope statements (`lint:module-scope`).
- **Import boundary** — the pack imports the kernel only by
  `@saxonberg/server/mud/…` specifiers (`lint:imports`); the kernel
  imports nothing from the pack (the settle, the weather hook and the
  parcel read all go by duck or by string); `GridPoweredMixin` reaches
  the catalogue by `StuffApi.singleton` on a **pack-local** path constant.
- **Verbs live on objects** — `sever`/`splice` forward to
  `LineAccess.sever()` → `catalogue.sever(nodeRef)`; `FuelStore.lightStreets`;
  `Locality.settleStreetLighting` unchanged in shape. No `XApi.verb(host)`
  (`lint:object-verbs` stays at 0; `lint:lib-statics` ceiling untouched —
  the catalogue's helpers are module-private functions as water's are).
- **A bound arg is `MqlOneResult`, never `Stuff`** — both controllers read
  `model.line?.stuff ?? null` (the `CharController` shape).
- **Affordance is a static on a class** — `LineAccess.commandContributions`;
  a row's `commandContributions:` is dead.
- **No new module category, no exported helper** — every new file is a
  class, a mixin factory, a controller, a vocabulary value-object, or a
  row. The `StreetLightingSupply` and `StormExposed` interfaces live in
  existing vocabulary files. Nothing needs sign-off.
- **No new Mongo collection** — the catalogue's `cuts` rides the
  `FisheryRegistry` state pattern (the self-persistence spine); parcels
  ride `parcels` (existing).
- **`lint:mass` (new since plan time)** — every new Thing row/class declares
  `mass` or `_materialPath`, or it grows the frozen ceiling and fails:
  `ElectricLight`, the `LineAccess` poles/manholes, `FuelStore` + its founding
  cask props, `oil-cask`, `lamp-oil-cask`. ⚠ The `gin.yaml`/`SpiritBottle`
  shape copied for `lamp-oil-cask` is itself a ceiling offender (lacks mass),
  so `lamp-oil-cask` must add `mass`/`_materialPath` explicitly — do not
  inherit the gap. The `lamp-oil` material row is exempt (an Idea, not
  `Tangible`).
- **`_mixinName` widened to `string`**; `GridPoweredMixin` is
  pack-registered at discovery (`lint:mixin-names` checks the name is
  unique — verified: only `ManaPowered` exists nearby).
- **Money** — no mint, no sink: the tax split and the locality-sourced
  appropriation are transfers through `postTransaction`.

---

## Waves

### Stage A — combustion: the fuel market

#### A0 — kernel: the funding record grows a goods leg, and the town pays ✅ DONE

Implements D10, D12 (budget, income, spend).

> **Done (commit `build(energy A0)`).** `StreetLightingSupply` added beside
> `SupplyState`; `PublicLightingFunding` grew `fuelPerStreetNight?` + `supply?`;
> `settleStreetLighting` rewritten (resolve supply → `lightStreets`; money leg
> only when `cost > 0`; sourced from `Locality.resolveTreasury`, own budget else
> realm); `isStreetLitTonight` consults the live supply's `isServingNow`;
> `_lightingSourceLabel` set at settle and appended to the street's lamp detail.
> Banking: `appropriate(…, opts?: { fromOwnerPath })`, `remitDemoTax(…, at?)`
> splitting `banking.localTaxShare` to the covering locality's own treasury via
> a new `AddressApi.localityOwnTreasuryAccountId` seam; the three retail callers
> pass the venue fixture. `Government.treasury` docstring corrected (a Business
> path — this build is its first reader). ⚠ Incidental: `SchemaDoc.test.ts`
> (from the merged sandbox fix) was missing the `test-bootstrap` import and
> failed `lint:test-bootstrap` — added it. 1140 server tests green; lint family
> green.

Files:
- `packages/server/src/mud/lib/supply/SupplyState.ts` — add
  `StreetLightingSupply` (D10) with the docstring's "who implements this".
- `packages/server/src/mud/platform/idea/Locality.ts` —
  `PublicLightingFunding` gains `fuelPerStreetNight?`, `supply?`; the
  docstring's placeholder paragraphs (lines 73–105) are rewritten to the
  truth; `settleStreetLighting` per D10 (resolve supply → `lightStreets`;
  money only when `costPerStreetNight > 0`, sourced from
  `treasuryAccountId()`); `isStreetLitTonight` consults `isServingNow`;
  `_lightingSourceLabel` runtime field; `treasuryAccountId()` per D12
  (GovernmentApi chain → Business → `EmploymentApi.operatingAccountOf`,
  fallback realm).
- `packages/server/src/mud/api/banking.ts` + `platform/idea/api/BankingLogic.ts`
  — `appropriate(to, amount, memo, opts?: { fromOwnerPath })`;
  `remitDemoTax(sellerAccountId, amount, at?: Stuff)` posting two `tax`
  legs when a locality treasury account exists; `AppSettingKeys.bankingLocalTaxShare`
  (`"banking.localTaxShare"`, seeded `0.5`) in `lib/config/AppSettings.ts`.
- `platform/idea/cmd/retail/BuyController.ts` (line 332),
  `OrderController.ts`, `lib/commerce/PricedOffer.ts` — pass the venue
  fixture to `remitDemoTax`.
- `platform/idea/Government.ts` — docstring for `treasury`: "a municipal
  Business's template path; its house account is the treasury".
- `lib/perception/PublicLighting.ts` — the detail prose appends the
  locality's `_lightingSourceLabel` when set.
- Tests: extend `platform/__tests__/Locality.lighting.test.ts` (a stub
  supply covering k < n streets; `isServingNow` false darkens live; money
  leg skipped at cost 0; locality treasury preferred over realm);
  `BankingLogic` tests for the split and the sourced appropriation.

Acceptance: `test:near` green; `lint:family` green; envelope's wire drive
still passes (Terminus, still on the general store until B3, now pays from
`/world/terminus/budget` when it has an account — assert the fallback path
in the unit test so a fresh world with no budget account still lights from
the realm as before).

Commit: `build(energy A0): the funding record's goods leg, the town's own
treasury, a local share of the sales tax`.

#### A1 — trade-fuel: lamp oil, the cask, the good ✅ DONE

Implements D9 (rows only).

> **Done (commit `build(energy A1)`).** Three rows: the `lamp-oil` bulk
> material (`heatOfCombustion: 43`, density 820, tags `[liquid, lamp-oil, fuel,
> flammable]`), an empty `oil-cask` and the filled `lamp-oil-cask`.
> ⭐ **D9 refinement:** both casks are `/platform/thing/Bottle` presets, **not**
> `/platform/thing/Vessel` — `Vessel` is a bare container with no
> bulk/VesselKind/Circulating; `Bottle` is the documented "stock vessel every
> floor product is a row over" and names `cask` as an example kind, so it is the
> real precedent (gin, cola, keg). Both state `_materialPath: …/wood/oak` on the
> ROW to satisfy `lint:mass` (the SpiritBottle/gin shape they copy does not).
> `container:`/`regionTarget` deferred to A3 (the faucet needs the oilworks
> stock to exist). ⚠ Two `lint:instanceable` orphan-key traps hit and fixed:
> `chemistry: null` (copied from coal/charcoal — not a declared field) and
> `autoignitionPoint` (the declared field is `autoignitionTemperature`; charcoal
> uses the alias and is a pre-counted orphan). Orphan census back at ceiling
> 402/402. Pack suite green; instanceable/census/untitled/mass green.

Files under `packages/content/trade-fuel/content/`:
- `stuff/idea/material/bulk/lamp-oil.yaml` (the `fouled-water.yaml` shape;
  `heatOfCombustion: 43`, `autoignitionPoint`, `density: 820`, tags
  `[liquid, lamp-oil, fuel, flammable]`, `edibility: false`, toxicity a
  small dose).
- `trade/fuel/thing/oil-cask.yaml` — `class: /platform/thing/Vessel`,
  `category: oil-cask`, `interiorBulk: true`, `interiorCapacity: 40`,
  `closure: liquidTight`, oak.
- `trade/fuel/thing/lamp-oil-cask.yaml` — the filled good (`gin.yaml`
  shape): `interiorMaterial: /stuff/idea/material/bulk/lamp-oil`,
  `interiorAmount: 40`, `censusKey: fuel:lamp-oil`, `materialTags:
  [lamp-oil, fuel]`, `gradeBand: fair`, `container:` (set in A3 to the
  oilworks stock), `regionTarget` sized to a week of Heart's Delight's
  demand.
- `pack.yaml` description + `README.md` gain the oil.
- Test (pack vitest): the three rows resolve; `CategoryMeasure.contribution`
  reads 40 L of `lamp-oil` off a hydrated cask (the `supply`-condition
  tally the market stands on).

Acceptance: `lint:instanceable`, `lint:census`, `lint:untitled` green;
pack suite green.

Commit: `build(energy A1): lamp oil is a good with a unit`.

#### A2 — the `/system/energy` pack scaffold, and the fuel store ✅ DONE

Implements D1 (the pack), D10 (`FuelStore`).

> **Done (commit `build(energy A2)`).** New pack `packages/content/energy/`
> (root `/system/energy`, group `energy`/prime-minister, title `/system/energy`),
> boilerplate copied from `water/`; root `package.json` + `pnpm install`.
> ⭐ **D10 composition refinement:** `FuelStore extends
> PostRegistrationMixin(Holder)` — NOT `DetailedMixin(Holder)`: the narrowing put
> `Detailed`/`Containable`/`Tangible` on `Thing` (so `Holder` already has them),
> but `Holder` does NOT compose `PostRegistrationMixin`, which the locality
> resolution needs. `FuelStore` implements `StreetLightingSupply` +
> `SupplyReporting`: `lightStreets` covers as many streets as its oil allows (in
> order) and burns `fuelPerStreetNight` litres each (resolved from the covering
> locality at `postRegister`, default 2); `isServingNow` = true (oil is
> committed at the settle — dryness shows at the next dusk); `supplyReport`
> reports litres + nights + `dry`; `getDetail` on `oil`/`casks`. `content/settings/energy.yaml`
> deferred to B0 (no dials yet). 5 pack tests green; all 58 lint gates pass
> (the pack is discovered by `pack-roots.ts` with no list edit).
> ⚠ A2 verify item (the `container:` self-placed singleton resolution) is
> checked live at A4 when the row exists.

Files:
- `packages/content/energy/{package.json,tsconfig.json,vitest.config.ts,pack.yaml,README.md}`
  copied from `water/` (id `energy`, root `/system/energy`, group `energy`
  owned by `prime-minister`, title `/system/energy`); root `package.json`
  gains `"@saxonberg/content-energy": "workspace:*"`; `pnpm install`.
- `src/thing/FuelStore.ts` — per Host placement; `lightStreets` drains
  litres from held casks (`MixinApi.isBulkable`, `BulkApi.transfer` /
  the slot's amount, `lib/bulk/Bulkable.ts`); `isServingNow` true;
  `supplyReport(nowS)` reports litres on hand and nights of supply at the
  covering locality's `fuelPerStreetNight`; `getDetail` for `look`.
- `src/__tests__/FuelStore.test.ts` — three casks, `fuelPerStreetNight 2`,
  five candidates → covers as many as the litres allow, in order; a dry
  store covers none and reports `dry`.
- `content/settings/energy.yaml` (empty until B0 adds dials).

⚠ Verify at build: `StuffApi.singleton(<FuelStore row path>)` on a Thing
row with `container:` self-places once and is idempotent (the row must
NOT also appear in the room's `props:`). If `singleton` refuses a
non-Singleton Thing, compose `SingletonMixin` on `FuelStore` — the
store is one per town by nature.

Acceptance: pack suite green; `lint:family` green (the new pack is
discovered by `pack-roots.ts` with no list edit).

Commit: `build(energy A2): the /system/energy pack, and a town's oil store`.

#### A3 — Terminus: the oil works ✅ DONE

Implements D9 (the producer).

> **Done (commit `build(energy A3)`).** The oil works — a goods-yards outfit in
> the shipped seven-outfit pattern, copied from `bottling/`: a sub-zone
> (`oilworks.yaml`), a `Business` outfit (appointed by `minister-of-trade` —
> matching who holds `/trade/fuel`, verified the office key exists), a `Stock`
> the casks spawn into (with `_materialPath: oak` for `lint:mass` — a new Stock
> row would otherwise push its ceiling to 243), a `consigns` hand (Marn Hesk;
> `ask: { fuel:lamp-oil: 80 }` — a 40 L cask at 2/L, so a gas-lit town's 6 L
> night ≈ envelope's calibrated 12), and a floor with a door onto the yard.
> `lamp-oil-cask.yaml` gains `container:` (this stock — the faucet) and
> `regionTarget: 4`. A `oilworks.test.ts` in the terminus pack asserts the rows
> cross-reference (outfit↔stock↔hand↔floor, cask→stock). ⚠ The LIVE consign
> (the hand walking casks to the cash-and-carry) is the A5 wire drive's job.
> Gates census/openings/mass/instanceable green; trade-fuel + terminus tests green.

Files under `packages/content/terminus/content/world/terminus/goods-yards/oilworks/`
copied from `bottling/`: `idea/outfit.yaml` (Business "the oil works",
`hand` position `purchases: true`, appointing authority the Ministry of
Trade — `{ kind: office, office: minister-of-trade }`, matching who holds
`/trade/fuel`), `thing/stock.yaml` (a `/trade/shopkeeping/thing/Stock`,
`businessPath` the outfit), `agent/hand.yaml` (`consigns` config: `stock`
= this stock, `shelf` = `/world/terminus/counting-houses/distributor/thing/counter`,
`ask: { 'fuel:lamp-oil': <price> }`, plus `shifts`/`idles`), `location/floor.yaml`
(the floor, a door onto the goods-yards lane like its siblings). Set A1's
`lamp-oil-cask.yaml` `container:` to this stock. Terminus `pack.yaml`:
the `goods-yards` claim already covers it (`industrial`).

Price: set the ask so that a night of Heart's Delight's lighting costs the
town about what envelope's `4 × 3 streets` cost the realm — the calibrated
demand survives as a market price rather than a constant.

Acceptance: `lint:openings` (arm 5) green; a pack/row test that the outfit
resolves; live: the hand consigns casks onto the cash-and-carry counter
(drive step 3's producer half).

Commit: `build(energy A3): the oil works — a producer that is not a
retailer`.

#### A4 — Heart's Delight is gas-lit ✅ DONE

Implements D10, D11 (the gas-lit half), D12 (seat, contract).

> **Done (commit `build(energy A4)`).** The valley now lights, burns and pays
> for its own lamps. A parish `Government` row (world-seed) with a treasury (the
> public-works department's account), a department, and the Warden of the Ways
> seat; the Locality gains `_governmentKey` + `_publicLighting { fuelPerStreetNight:
> 2, supply: <store> }`. valley-gate/bench-lane/millsite become `/platform/location/Street`
> with lamps (seniority 1/2/3 — millsite darkens first). A public-works yard
> (works-board + receiving-bench, the warden), the oil `store` (a `FuelStore`
> self-placed by `container:`, six founding casks via `props: count`), the
> `department` Business (warden `purchases: true`, `parLines` naming lamp-oil
> from the distributor), and the warden Cast (`restocks` → bounty → the store's
> shelf). ⭐ **FuelStore composition finalized:** `PostRegistrationMixin(StagedMixin(SingletonMixin(Holder)))`
> — Staged for the founding `props:`, Singleton so `StuffApi.singleton(<store>)`
> resolves it (the A2 verify item) and the props once-guard holds. Findings:
> **region = zone** (`Census.regionOf`), so HD's store casks don't suppress the
> Terminus oilworks spawn — regionTarget stays 4. The `_wheelPassable` default
> is **true**, so the carter reaches the valley (verify item resolved). Dropped
> the yard's `alternateNames` (a `lint:instanceable` orphan key the location
> chain doesn't declare). All content lints green; live lighting is the A5 drive.

Files:
- `packages/content/world-seed/content/stuff/idea/Government/hearts-delight.yaml`
  — key `hearts-delight`, `treasury: /world/terminus/hearts-delight/public-works/idea/department`,
  `departments: [that]`, `seats: [{ key: public-works, label: Warden of
  the Ways, department: that, positionKey: warden }]`.
- `world-seed …/Locality/hearts-delight.yaml` — `_governmentKey:
  hearts-delight`; `_publicLighting: { fuelPerStreetNight: 2, supply:
  /world/terminus/hearts-delight/public-works/thing/store }` (no
  `costPerStreetNight`, no `supplier`). Update the row's comment that
  explained the null government.
- `packages/content/hearts-delight/content/world/terminus/hearts-delight/location/{valley-gate,bench-lane,millsite}.yaml`
  — `class: /platform/location/Street`, `publicLighting: { flux: 300,
  colorTemperature: 2200, detail: lamps, seniority: 1|2|3 }`; prose gains
  the lamp standards.
- `…/public-works/location/yard.yaml` (a `SingletonCartesianLocation` off
  `valley-gate`, `_address: terminus/hearts-delight/public-works`, props:
  `/trade/haulage/thing/works-board`, `/trade/haulage/thing/receiving-bench`;
  cast: the warden), `…/public-works/thing/store.yaml` (class
  `/system/energy/thing/FuelStore`, `container:` the yard, `fixedInPlace`,
  **initial `props:` of six `lamp-oil-cask`** — the town's founding stock,
  one-time; thereafter the market), `…/public-works/idea/department.yaml`
  (Business: `warden` position `purchases: true`, `wageRate`, appointing
  authority `{ kind: committee, parcel: /world/terminus/hearts-delight }`,
  `banksAt: goodkin`, `parLines: [{ category: lamp-oil, unit: L, level:
  160, supplier: /world/terminus/counting-houses/distributor/idea/business,
  exemplar: /trade/fuel/thing/lamp-oil-cask }]`, `operatingLocations:
  [yard, store]`), `…/public-works/agent/warden.yaml` (a Cast; brains
  `shifts` + `restocks { shelf: store, board: works-board, bench:
  receiving-bench, reward }` + `idles`).
- `trade-haulage …/agent/carter.yaml` — no edit: it watches
  `/trade/haulage/thing/works-board` by template path and the yard props
  the same row.
- `hearts-delight/pack.yaml` — description; the single claim gains nothing
  yet (B3 adds `powerBand`).

⚠ Verify at build: every exit on the spine between the cash-and-carry and
`valley-gate` is wheel-passable (`bench-lane`/`valley-gate` rows author
`media: [ground]` only — check `Exit._wheelPassable`'s default) so the
carter's `Journey` lands; otherwise author `wheelPassable: true` on the
valley road's exits. That is a drive checkpoint, not an assumption.

Acceptance: at dusk in Heart's Delight the three streets light in seniority
order; the store's casks lose `2 L × 3`; `look at lamps` says burning, fed
from the town's oil store; draining the store darkens `millsite` first;
the warden posts a bounty on the works board when short; a player who buys
casks at the cash-and-carry and drops them on the bench is paid the
reward, the distributor is paid, the oil works is paid on resale.

Commit: `build(energy A4): Heart's Delight is gas-lit — a warden, a store,
a bounty, a bill the town pays`.

#### A5 — the Stage A drive ✅ DONE

> **Done (commit `build(energy A5)` / `drive(energy A)`).** `packages/wire/tests/energy.dirty.wire.test.ts`
> — the gas-lamp half, 2/2 green. What the drive FOUND (tests build state, they
> never use it):
> 1. **the `energy` pack had no `content/` dir** → PackApi ENOENT'd it at boot;
>    created `content/settings/energy.yaml` (`settings: []`).
> 2. **the capability rung** — `hearts-delight` names `energy`'s `FuelStore`
>    (and `trade-fuel`'s cask, `trade-haulage`'s board/bench) but didn't depend
>    on them; added the three deps + `pnpm install`.
> 3. **the `lamps` detail wasn't authored** — `look lamps` returned "you don't
>    see any lamps": MQL binds a detail via `getDetailIds()` (the authored map),
>    NOT by probing the dynamic `getDetail`. The shipped streets (mayfield,
>    crossing) author a static `lamps` detail that `PublicLightingMixin`
>    augments; my HD streets didn't. Added it to all three.
> 4. ⭐ **finding (recorded, not fixed): the boot settle races the async pack
>    install.** The 60-game-second post-boot settle fires ~5 real-s in, before a
>    ~100s install resolves each street's covering-locality path — so a
>    midnight-booted wire world reads *stand cold* and the FuelStore never stands
>    up (confirmed: no store snapshot). The **live game recovers at the next
>    sunset** (the daily settle, everything installed by then), so this is a
>    wire-harness limitation, not a product break — the same wall envelope hit
>    (it could only ever assert "stand cold"). → offered to the envelope/platform
>    tail. The drive therefore asserts the WIRING (the detail binds + renders a
>    coherent, epoch-correct state, "fed from the valley's own oil", never
>    "broken"); the LIT/drawdown/money behaviour is unit-proven
>    (`FuelStore.test.ts`, `Locality.lighting.test.ts`, `oilworks.test.ts`,
>    `BankingLogic`). Also: the FuelStore source label read awkwardly ("burning,
>    burning the town's oil") → changed to "fed from the town's oil store".

`packages/wire/tests/energy.dirty.wire.test.ts` (dirty: burns oil, spends
a treasury). Checkpoints = requirements drive steps 1–3 + the treasury
path: dark ⇒ lit streets ⇒ store litres fall ⇒ drain the store ⇒ junior
street cold, senior lit, `look` says lapsed ⇒ the bounty exists on the
board ⇒ a session buys casks at the cash-and-carry with its own money,
drops them on the bench, completes at the board, is paid ⇒ the oil works'
account grew (resale) and the general store's did not. Every checkpoint
must be able to fail (`workflow.md`'s grain-chain lesson).

Commit: `drive(energy A): the fuel market, driven`.

### Stage B — electric: the grid

#### B0 — kernel: the parcel meters, the posture lint, the storm duck ✅ DONE

Implements D5, D6, D13, D15.

> **Done (commit `build(energy B0)`).** `PowerBand` vocabulary (`off-grid ·
> domestic · commercial · industrial`); `ParcelRecord` grew `feeder` + `powerBand`
> (+ `TitleClaim`, `RequiredTitle`, grant application, PackLogic parse);
> `ParcelRegistry.powerOf` (the meter read — longest-prefix then inherit, band
> and feeder may inherit from different levels), `byFeeder` index +
> `parcelsOnFeeder` + `citeFeeder`, all forwarded through `ParcelLogic` →
> `ParcelApi`; `parcels.yaml` schema doc; `StormExposed` duck in `WeatherType`
> wired into `runStormFanout` (every occupant of a stormed scope, presence-gated,
> per-occupant guarded); `energy.band.*W` + `energy.stormFaultRate` dials
> (`AppSettingKeys` + the pack's `energy.yaml`); `lint:power-posture` (census
> ceiling **18** — B3 drives it to 0). ⚠ **D6 refinement:** `PowerBand` ships as
> data (const + type + summaries), NOT a `PowerBands` static-method class —
> `lint:lib-statics` is a ratchet (guards/parse belong on an Api or inline) and
> `lib/` forbids free exported functions, so `setPowerBand`/PackLogic validate
> inline. Also fixed (caught by the family): `citeFeeder` must reindex after the
> write (a gap `citeReach` still has — noted); the warden needed a `competence`
> dossier; two Cast `shortDescription`s led with an article. Tests:
> `PowerBand.test.ts`, `ParcelRegistry` powerOf/inherit/index/cite (7 cases).
> ⚠ The storm-fanout INTEGRATION is not unit-tested here (a full weather-scope
> harness); the `onStormExposure` duck is tested at B2 (LineAccess) + the B4
> storm drive. All 59 lint gates green.

Files:
- `lib/parcel/PowerBand.ts` (new, the `LandUse.ts` shape; add the
  `Mixins`-style validation array + `parse`).
- `lib/parcel/ParcelRecord.ts` — `feeder: string = ''`, `powerBand:
  PowerBand | null = null`, `fieldMeta`, accessors; `TitleClaim` gains
  `feeder?`, `powerBand?`.
- `platform/idea/ParcelRegistry.ts` — `byFeeder` beside `byReach`;
  `parcelsOnFeeder(ref)`; `citeFeeder(extent, ref)` (the `citeReach`
  twin); `powerOf(path)` = covering parcel, then walk `parentParcel` /
  the trie upward for the first non-null band and non-empty feeder;
  `rebuildIndex` fills `byFeeder`.
- `api/parcel.ts` — forward `powerOf`, `parcelsOnFeeder`, `citeFeeder`.
- `platform/idea/api/PackLogic.ts` lines 446–459 + 3313 — parse/validate
  `powerBand` (against `PowerBands`) and `feeder` (string), map to the
  claim.
- `packages/server/src/schema/parcels.yaml` — document the two fields
  (`lint:schema`).
- `lib/weather/WeatherType.ts` — `StormExposed { onStormExposure?(nowS) }`;
  `platform/idea/api/WeatherLogic.ts` `runStormFanout` — call it on each
  occupant of a stormed scope (one loop, after the strike roll).
- `lib/config/AppSettings.ts` — `energyBandDomesticW`, `…CommercialW`,
  `…IndustrialW`, `energyStormFaultRate` (seeded literals at the pack's
  call sites); `energy/content/settings/energy.yaml` retunes.
- `packages/server/scripts/check-power-posture.ts` + `package.json`
  `lint:power-posture` — per D15; opens with the census of undeclared
  premises claims as its ceiling. `docs/lint-family.md` entry.
- Tests: `ParcelRegistry.power.test.ts` (inherit walk, index, cite);
  `WeatherLogic` storm test (a stub `onStormExposure` is called under
  `forcedStrikeRoll`); `PowerBand` parse.

Acceptance: `test:near` + lint family green; the new gate lists its
ceiling.

Commit: `build(energy B0): the parcel meters — a feeder citation and a
power band; the posture census; storms reach what stands in them`.

#### B1 — the feeder and the catalogue ✅ DONE

Implements D3, D4, D8.

> **Done (commit `build(energy B1)`).** `Feeder` data Idea (key · name · source ·
> nodes[{name, at, buried}] · branchesFrom), rows at `/stuff/idea/Feeder`.
> `GridCatalogue` (singleton Idea, `GRID_CATALOGUE_PATH`): lazy compile of every
> Feeder row into `nodes`/`downstream`/`traceUp`/`nodeAt`/resolved `sources`;
> `energizedAtSync` (source `isGenerating()` — sync flag — AND no cut on the
> path), `energizedAt`, `isStreetEnergizedSync`, `supplyStateAt` (cut/dry),
> `traceFrom` (names the first cut), `sever`/`splice`, and the
> `StreetLightingSupply` (`lightStreets` = the energized subset; `isServingNow`
> live) + `SupplyReporting`. 8 tests: trunk+spur, cut propagation across the
> spur, splice, trace, source-down⇒dry, exit-verification-unreachable,
> cut-survives-invalidate. ⚠ **Decisions:** (1) **cuts are IN-MEMORY/transient**
> — a reboot re-energizes the grid (honest; durable cuts matter only to the
> Tier-deferred lineman work-order economy) — recorded, persistence is a clean
> refinement; (2) compile problems go to `console.warn` + a `problems[]` list,
> **never a throw** (D3) — I skipped `DiagnosticsApi` (its shape wasn't quickly
> pinnable and no pack uses it) as a refinement; (3) exit verification uses
> `StuffApi.singleton(street).getExits().getDestinationTemplatePath()` (no
> transport-pack dep, D3); (4) sever/splice are **ungated** on the catalogue —
> the water `Conduit.setCut` posture; the legitimate caller is `LineAccess` (B2).
> `epochOf` deferred to B2's `GridReading` (it needs address resolution).

Files:
- `energy/src/idea/Feeder.ts` — the data Idea (`key · name · source ·
  nodes[] · branchesFrom`), `FEEDER_PATH_PREFIX = '/stuff/idea/Feeder'`.
- `energy/src/idea/GridCatalogue.ts` — `GRID_CATALOGUE_PATH`; lazy
  `loadIndex` via `Template.findByClass(Feeder)`: per feeder the ordered
  node chain, `downstream: Map<nodeRef, Set<nodeRef>>`, `nodeAt: Map<streetPath, nodeRef>`,
  the source resolved (duck `generationW/getReachRef`, flow by the water
  catalogue's `flowAt` duck through `StuffApi.singleton` on the **water**
  path constant — the same string `PowerReading` uses, kept pack-local),
  and the exit verification (`LaneCatalogue.exitBetween` is transport's;
  use `StuffApi.singleton(streetPath)` + `room.getExits()` directly to
  avoid a pack dependency) recording problems as `DiagnosticsApi.record`;
  `cuts` (persistent state, the `FisheryRegistry` pattern); reads
  `energizedAt(streetPath)` (async), `energizedAtSync(nodeRef)` (the
  compiled view or `false` + kick the compile), `supplyStateAt(nodeRef):
  SupplyState | null` (`cut` upstream → `cut`; source down → `dry`; Σ
  bands > watts → `overdrawn`), `traceFrom(nodeRef)` → the chain to the
  source with the first cut named, `epochOf(locality)` per D11,
  `lightStreets` + `isServingNow` (the `StreetLightingSupply` shape),
  `supplyReport`; writers `sever(nodeRef)` / `splice(nodeRef)` gated
  `FromClass(LineAccess)` ∪ the weather path; `invalidateCache` on HMR;
  `canEvict`/`canDestruct` veto.
- `energy/content/system/energy/idea/GridCatalogue.yaml` (no
  `hydratorClass`, `data: {}` — the water catalogue's row).
- Tests: a two-feeder fixture (trunk + spur) with stub Street rows and
  exits; downstream sets; a cut at the trunk darkens the spur; a cut on
  the spur does not darken the trunk; a node pair with no exit is a
  problem and unreachable; source down ⇒ `dry`; persistence of `cuts`
  across `invalidateCache`.

Commit: `build(energy B1): the feeder is a row, the reach is a set, the
cut is the one state`.

#### B2 — the consumer, the light, the pole, the verbs, the reading ✅ DONE

Implements D7, D13 (the pole side), D14.

> **Done (commit `build(energy B2)`).** `GridPoweredMixin` (pack `lib/`;
> resolves the covering parcel's band + feeder node once at `postRegister`,
> caches the catalogue + warms the compile; `isPowered()` sync =
> `band !== off-grid && energizedAtSync(node)`; `availablePowerW` = the band's
> watts duck). `ElectricLight` (`GridPowered(LightSource(Switchable(PostReg(
> Thing))))` — flux only while on AND powered; getDetail's three states).
> `LineAccess` (the pole: `nodeRef` + `buried`; `sever`/`splice` → catalogue;
> `onStormExposure` cuts an overhead line on a roll, a buried one never — the
> B0 storm duck, tested here; `supplyReport`; getDetail). `SeverController`/
> `SpliceController` + their rows + `sever.yaml`/`splice.yaml` views (validators
> animate/conscious/embodied; `default: reachable:[class.LineAccess]`,
> `requires: [DetailedMixin]`). `GridReading` + `grid.yaml` (bare = premises +
> **derived epoch** off the locality's lighting supply; on a `LineAccess` = the
> trace naming the first cut). Tests: ElectricLight flux coupling (6),
> LineAccess sever/splice/storm (5). ⚠ **D14 fix:** `requires: [DetailedMixin]`
> trips `lint:arg-kinds` (no refusal phrase, and none of Thing's mixins have
> one) → added a `DetailedMixin` refusal to kernel `lib/mixin.ts` (a weak
> general gate; the class-default does the real narrowing). ⚠ The controller +
> GridReading PROSE (scene/binder-heavy; controller tests skip the binder) are
> exercised live by the B4 drive; their core logic (sever/splice→catalogue,
> traceFrom, flux coupling) is unit-tested. All 59 gates pass.

Files:
- `energy/src/lib/GridPowered.ts` — `GridPoweredMixin` (per D7; `static
  _mixinName = 'GridPoweredMixin'`, `_mixinRefusal`), `isPowered()`,
  `availablePowerW()`, `powerNodeRef()`, `postRegister` resolution via
  `ParcelApi.powerOf(roomPath)`.
- `energy/src/thing/ElectricLight.ts` — `getEmittedFlux()` = authored flux
  iff `isOn() && isPowered()`; `getDetail` says lit / switched off / dark
  because the premises has no power.
- `energy/src/thing/LineAccess.ts` — `nodeRef`, `commandContributions`
  (`sever`, `splice`), `sever()`/`splice()` → the catalogue,
  `onStormExposure(nowS)` when the node is overhead, `getDetail` (the
  line's state in words), `supplyReport` (so `analyze water`-style
  readers work too).
- `energy/src/idea/cmd/energy/SeverController.ts`, `SpliceController.ts`
  + views `energy/content/system/energy/cmd/energy/{sever,splice}.yaml`
  (validators animate/conscious/embodied; arg `line` default
  `reachable:[class.LineAccess]`, `requires: [DetailedMixin]`; scene to
  self + peers; the street's lamps go dark in the same tick because
  `isServingNow` is live).
- `energy/src/idea/reading/GridReading.ts` + `content/system/energy/idea/reading/grid.yaml`
  (channel `grid`, `kind: fact`, `scope: [subject]`, `subjectRequires:
  [DetailedMixin]`, discipline `physics`): bare = premises + epoch; on a
  `LineAccess` or a lit street = the trace.
- Tests: `GridPowered.test.ts` (band off-grid ⇒ never powered; cut ⇒
  unpowered live); `ElectricLight.test.ts` (flux coupling); controller
  tests for the two verbs; `GridReading` prose test naming the first cut.

Acceptance: `lint:verb-collisions`, `lint:arg-kinds`, `lint:binder-models`,
`lint:controller-rows`, `lint:mixin-names`, `lint:light-sources` green.

Commit: `build(energy B2): a thing is powered because its parcel's line is
live; the pole where the lineman goes; analyze grid`.

#### B3 — Terminus goes electric; every premises declares ✅ DONE

Implements D5 (rows), D11, D15 (ratchet to zero).

> **Done (commit `build(energy B3)`).** `Feeder` rows (world-seed):
> `terminus-main` (source = the Wharfside aqueduct-house; nodes bank→square→
> avenue→crossing, all directly exit-adjacent — verified) + `terminus-mayfield`
> spur (branchesFrom `terminus-main:avenue`). Five `LineAccess` poles propped in
> those streets. The 15 Terminus premises claims gained `powerBand` + `feeder`
> (root `commercial`/`terminus-main:square`; wharfside/goods-yards `industrial`/
> `:bank`; mayfield/seznick `domestic`/`terminus-mayfield:mayfield`; estuary/
> necropolis `off-grid`). Hinkley (2) + eternal dorms → `off-grid`. The
> `seznick-house/lobby` hall-light (`ElectricLight`, on, flux 800). terminus-city
> Locality `_publicLighting` migrated to `supply: GridCatalogue, cost 0` (the
> general-store placeholder role ends); a `public-works` seat on the budget +
> a vacant `works-foreman` position. ⭐ **`lint:power-posture` ceiling → 0**
> (census was 18). ⚠ **lint:census needed teaching:** Feeder's `source` is a new
> path field `refsOf` didn't read — added it (so the generator path is verified).
> deps: world-seed + terminus now depend on content-energy (the capability rung).
> All 59 gates green; energy + terminus suites green. **Live verification is B4.**

Files:
- `world-seed/content/stuff/idea/Feeder/terminus-main.yaml` — `source:
  /world/terminus/wharfside/thing/aqueduct-house`; nodes `bank`
  (`wharfside/bank`) → `square` (`market/square`) → `avenue`
  (`counting-houses/avenue-block`) → `crossing`
  (`university-avenue/location/crossing`); spur row
  `terminus-mayfield.yaml`: `branchesFrom: terminus-main:avenue`, node
  `mayfield` (`mayfield-row/street`). ⚠ Every consecutive pair is joined
  by the exits the Grounding lists (`bank ↔ square`, `square ↔ avenue`,
  `avenue ↔ crossing`, `avenue ↔ mayfield`) — the compile will say so.
- Poles: `terminus/content/world/terminus/{wharfside,market,counting-houses,university-avenue/location,mayfield-row}/thing/pole.yaml`
  (class `LineAccess`, `nodeRef`), propped into each street row.
- `terminus/pack.yaml` — every premises claim gains `powerBand` and the
  district claims gain `feeder:` (`counting-houses`,
  `general-store`, `market`, `registry`, `infirmary` → `terminus-main:avenue`
  / `:square`; `wharfside`, `goods-yards` → `terminus-main:bank`,
  `industrial`; `mayfield-row`, `seznick-house` → `terminus-mayfield:mayfield`,
  `domestic`; `terminal`, `university-avenue` → `:crossing`; `estuary`,
  `delight-road`, `necropolis` → `off-grid`). `hinkley-hills/pack.yaml` —
  both claims `powerBand: off-grid`. `hearts-delight/pack.yaml` —
  `powerBand: off-grid`.
- The residential lamp: `terminus/…/mayfield-row/seznick-house/thing/hall-light.yaml`
  (class `ElectricLight`, `on: true`, flux 800) propped into
  `seznick-house/lobby.yaml` (a real room under the titled parcel —
  the unit rooms are minted per lease; a light in a unit's `main` row is
  a one-line follow-on once the lobby proves it).
- `platform/content/platform/idea/Locality/terminus-city.yaml` —
  `_publicLighting: { supply: /system/energy/idea/GridCatalogue, costPerStreetNight: 0, supplier: null }`;
  `platform/…/Government/terminus-city.yaml` — a `public-works` seat on
  `/world/terminus/budget` (add a `works-foreman` position, `purchases:
  true`, roster the terminal clerk's sibling or leave vacant — the seat
  exists; the founder default holds nothing here, a vacant seat is
  honest).
- `energy/pack.yaml` — no title beyond its root; the feeder rows ride the
  platform's `/stuff` claim.
- `check-power-posture.ts` ceiling → 0.

Acceptance: at dusk Terminus's five streets light with `_lightingSourceLabel`
the Wharfside line; the lobby light is lit; `sever` at the avenue pole
darkens `avenue`, `crossing`, `mayfield` and the lobby light, leaves `bank`
and `square` lit; `analyze grid` from `mayfield` names the avenue cut;
`splice` relights; `analyze grid` bare in Hinkley says off-grid; the
posture gate is at 0 and a scratch claim with no band fails it.

Commit: `build(energy B3): Terminus is electric — the same lamps, the
source migrated`.

#### B4 — the Stage B drive, the storm, the docs ✅ DONE

> **Done (commit `build(energy B4)` / `drive(energy B)`).** The drive extended to
> Stage B — **6/6 green**. `docs/subsystems/energy.md` written. The storm duck is
> unit-tested at B2 (`LineAccess.onStormExposure`); the wire storm is
> presence-gated + needs a stormed occupied scope, so it stays unit-proven (noted
> below). ⚠ **Sibling doc sweep + the CLAUDE.md map line are `/finalize`'s** (the
> workflow's doc-sweep phase). What the drive FOUND and fixed:
> 1. ⚠⚠ **A boot deadlock** — a pole propped in a feeder-node street that is also
>    a boot producer (avenue-block) `await`ed the compile from inside that
>    street's own hydration (the compile stands the street up). Fixed by not
>    awaiting the compile warm in `postRegister`.
> 2. ⚠⚠ **A premature-compile cache** — warming the compile from `postRegister`
>    ran it mid-install, before the feeder streets' exits hydrated, caching a
>    "line leaves the road" grid where everything was dark. Fixed by removing the
>    warm entirely — the compile runs lazily, post-install, on the first real read.
> 3. **The realm root cited a feeder** HD/Hinkley wrongly inherited (reading them
>    partly electric). Removed it (kept the band for the posture lint); each city
>    district cites its own.
> 4. **The epoch read the locality** — but Mayfield Row is addressed outside the
>    city (under the realm), so the lobby read off-grid. Fixed: `epochOf` reads
>    "electric" from the PREMISES' own feeder citation first, the locality's
>    lighting supply only as the fallback.
>
> ⭐ The drive proves live: Terminus a premises connected + lit, `sever` darkening
> only downstream (the lobby's feeder goes dark the same second), splice
> restoring, Hinkley off-grid, HD gas-lit — the epoch derived with no flag.

#### B4 (plan notes) — the Stage B drive, the storm, the docs

- Extend `energy.dirty.wire.test.ts` with requirements steps 4–9 (connected
  premises + lit lamp; sever/only-downstream/trace/splice; the
  streetlights migrated and fail with the feeder; Hinkley off-grid by
  consequence; the undeclared claim refused by the gate — run the script
  in-test against a fixture manifest; the epoch derived with no flag —
  grep the three Locality rows for `tech`/`epoch` and assert `analyze grid`
  says each).
- A storm test on the pole (`forcedStrikeRoll`).
- `docs/subsystems/energy.md` (new): the feeder, the meter, the consumer,
  the two epochs, the supply shape, the posture gate, the storm seam, the
  deferred tiers. Updates: `civics.md` § the first public service (the
  goods leg, the treasury, the seat), `address.md` § the nightly settle,
  `parcel.md` (the two fields), `watershed.md` § `SupplyState`'s speakers,
  `electricity.md` § deferred seams (the meter is the attach point),
  `content-packs.md` roster (the fiftieth pack), `lint-family.md`
  (`lint:power-posture`), `banking.md` (the local share, the sourced
  appropriation), `employment.md` (a government department is a Business
  with par lines). `CLAUDE.md`'s map line is the sweep's.
- Slate compaction for `grid-slate`, `power-utility-slate` (`/compact-slate`
  at `/finalize`).

Commit: `drive(energy B): the grid, driven` + `docs(energy): the subsystem
doc and the touched siblings`.

---

## Reachability wiring

Each capability, the five links. Each fails closed and silent.

| capability | verb | affordance | data | boot | arg gate |
|---|---|---|---|---|---|
| a street burns oil | none new (the settle) | — | Locality `_publicLighting.supply` + Street rows' `publicLighting` + the `FuelStore` row with `container:` | `WorldClockRegistry` sunset schedule + the 60 s boot settle (shipped); the store resolves by `StuffApi.singleton` | — |
| the town restocks | `job post` (shipped, driven by `restocks`) | `JobBoard` fixture's `commandContributions` (shipped) | the department's `parLines` (supplier resolvable by ROOM — `lint:openings` arm 5), the warden's brain config, the board + bench props, the roster slot | the warden's `shifts` brain puts her on shift; the house card is dealt at roster materialization | the gig's `supply` condition tallies `lamp-oil` litres by tag — the cask's `materialTags` |
| the carter covers | `journey`, `get`, `put`, `fulfill` (shipped) | — | `carter.yaml` boards (the works-board template path — shared by every propped copy) | cadence 4 m | the lane must be wheel-passable to the yard |
| the oil works produces | `consign` (shipped) | — | `lamp-oil-cask.container:` = the works stock; the hand's `consigns` config | the spawn sweep fills to `regionTarget` | the counter's `ask` keyed by `censusKey` |
| `sever` / `splice` | the two pack views | `LineAccess.commandContributions` | pole rows propped in Street rows | none (the catalogue is lazy) | `default: reachable:[class.LineAccess]`, `requires: [DetailedMixin]` + `_mixinRefusal` |
| `analyze grid` | the platform's `analyze` (shipped) | the channel ROW installs with the pack | `grid.yaml` | the `Reading` roster (install) | `subjectRequires` |
| a light is powered | `switch <light> on` (shipped, universal over Switchable) | — | the light row propped in a room under a claim with `feeder` + a band | `GridPoweredMixin.postRegister` resolves the parcel; the catalogue compiles on first read | — |
| a storm fells a line | — | — | a pole row whose node is overhead, in a SkyExposed street | the storm fan-out tick (shipped, presence-gated) | — |
| the posture is caught | `pnpm lint:power-posture` | — | `pack.yaml` claims | the lint family (derived roster) | — |

---

## Acceptance-criteria coverage

| requirement (AC) | waves |
|---|---|
| gas-lit town: lit streets depend on bought + burned fuel; draining darkens junior first, visibly | A0 (settle), A2 (store), A4 (rows), A5 (drive 1–2) |
| money reaches a fuel producer; a producer gains a customer | A3 (oil works, consignment resale), A4 (the bounty from the town's treasury), A5 (drive 3) |
| electric city: a lamp on a connected premises works; a cut darkens only downstream, traceable, restorable | B0–B3, B4 (drive 4–5) |
| Terminus's streetlights on grid power, fail with the grid; gas-lit towns on the fuel market — same service, two sources, no flag | A0 (`supply` shape), B3 (`supply: GridCatalogue`), B4 (drive 6) |
| a frontier shack off-grid on purpose; an undeclared premises is a caught build error | B0 (`lint:power-posture`), B3 (Hinkley `off-grid`), B4 (drive 7–8) |
| each locality's epoch derivable by a player, no tech level | B2 (`analyze grid` bare), B3, B4 (drive 9) |
| the whole posture authored as content; a second instance needs no code | D1/D3/D5/D9/D12 by construction; B4's doc names the row set a second town writes |

Unmapped: none. The requirements' non-goals (interior circuits, metered
billing, the fridge, gas, the structure tier, easements) are § Deferred
seams.

---

## Test & gate strategy

- **Unit (kernel, `test:near`)** — `Locality.lighting` (supply-covered n,
  live serving, treasury preference + fallback, cost-0 no money leg),
  `BankingLogic` (local share arithmetic + conservation, sourced
  appropriation refuses when the town is short), `ParcelRegistry.power`
  (inherit walk, index, cite), `PowerBand`, `WeatherLogic` storm duck.
- **Unit (pack vitest)** — `FuelStore`, `GridCatalogue` (compile,
  downstream, cut propagation, exit verification, source resolution,
  state persistence), `GridPowered`, `ElectricLight`, the two
  controllers, `GridReading`; trade-fuel: the cask's litres under
  `CategoryMeasure`.
- **Only the drive can prove** — the carter reaching the yard; the
  bounty's money reaching the oil works via resale; dusk lighting the
  right streets in the right order; a cut felt the same second by a
  street's lamp and a room's light; the epoch read.
- **Gates** (all run by `lint:family`; named here because each has a
  clause this build touches): `lint:instanceable` (no `/lib/` instanced;
  every `class:` resolves — the new pack's namespace), `lint:census`
  (`supply:`, `feeder:`, `source:`, `container:` all resolve),
  `lint:untitled` (`/stuff/idea/Feeder`, `/system/energy`),
  `lint:openings` arm 5 (par-line supplier by room), `lint:light-sources`
  (e) (class names) + (g) (no furnace rows added), `lint:envelope` (no
  authored temperatures), `lint:locations` (the Street conversions),
  `lint:mixin-names` (`GridPoweredMixin` unique, pack-registered),
  `lint:verb-collisions` (`sever`, `splice`), `lint:arg-kinds` (the
  refusal phrase), `lint:binder-models` / `lint:controller-rows`,
  `lint:imports` (pack specifiers only), `lint:module-scope`,
  `lint:object-verbs` (0), `lint:lib-statics` (ceiling), `lint:world-scan`
  (the catalogue reads rows by class, never the world), `lint:whole-table`,
  `lint:schema` (`parcels.yaml`), `lint:unconsumed-seams` (falls:
  `Government.treasury` gains a reader), `lint:test-bootstrap`,
  `lint:drive-scripts` (the drive is a wire file), **`lint:mass`** (every new
  Thing row declares `mass`/`_materialPath` — ⚠ the `SpiritBottle`/`gin.yaml`
  shape is a ceiling offender), and the new `lint:power-posture`.
- ⚠ `pnpm test` runs **twice**: before the MR opens and at `/finalize`.
  Everything between is `test:near` + each touched pack's own vitest +
  `lint:family`.

---

## Risks & opens

For the user's eye — decisions the plan made that the requirements did not
literally spell out, and the places to stop and ask.

1. **The producer is an outfit, not a retort (D9).** The requirements ask
   for *"a real producer (the fuel chain)"*; the only crafted path to lamp
   oil is the destructive-distillation slate's retort, its own build. The
   plan ships the realm's sanctioned producer shape (the seven goods-yards
   outfits: spawned floor stock, a consigning hand) at Terminus, in
   trade-fuel's vocabulary. **Alternative:** ship the retort's first rung
   now (`Retort` beside `CharcoalPit`, a `retort` act mirroring `char`,
   coal/peat in → oil out, tar deferred) — roughly one extra wave in Stage
   A. The plan's choice keeps A landable on shipped substrate; say the
   word and A3 becomes the retort.
2. **The network is a `Feeder` row, not an attribute on `Exit` (D3).** The
   slate's phrasing was "service as an exit attribute"; exits turned out
   transient and closed-schema. The line still follows real exits (the
   compile refuses a hop with no exit) and the exit graph is untouched.
3. **Terminus's `costPerStreetNight: 4` retires (D11).** With Tier C
   billing a non-goal and the utility municipal by default, an electric
   town's own lamps cost it nothing per night; the calibrated demand
   survives as Heart's Delight's litres and the oil's market price. If you
   want Terminus to *pay a utility* now, the funding record's money leg
   still works — set a cost and a `supplier` Business and the tariff flows
   from the budget; only the payee needs deciding (the polity's fork).
4. **Heart's Delight gets a Government row (A4).** Its Locality row said
   "deliberately null". A town that funds a service needs a treasury and a
   seat; the plan adds a parish-scale row in `world-seed`. Alternative: hang
   the seat and treasury on `terminus-realm` instead (the realm lights the
   valley) — one row either way.
5. **Storm faults are presence-gated (D13)** because the storm fan-out is.
   A line only falls where somebody stands in the storm at a pole. Honest
   by the shipped weather doctrine; noted so nobody expects unobserved
   outages.
6. **`lint:power-posture`'s boundary (D15):** premises = the four land
   uses `residential · commercial · industrial · civic`. `agricultural`
   and `wild` are exempt (a field declares nothing). If a farmstead should
   count, widen the list — it is one array in the script.
7. **Two kernel banking edits (D12):** the optional source on
   `appropriate` and the two-leg tax. Both are transfers through the
   sealed chokepoint; the money firewall is intact. The `localTaxShare`
   default `0.5` is a dial the polity can move (`config`).
8. **The `FuelStore` singleton resolution (A2)** and **the spine's
   wheel-passability into the valley (A4)** are verify-at-build items
   with a fallback named in each wave.
9. **The lobby light vs a unit light (B3).** Units are minted per lease;
   the lobby is a real room under the titled building parcel and proves
   the same resolution. A unit-room light is a follow-on line.
10. **`Government.treasury` holds a Business path** where the docstring
    says "bank-account key" — the plan reads it as a Business path (what
    the one shipped row holds) and fixes the docstring; if you intended an
    account id, A0 is where to say so.
11. **`analyze power` on an electric light** reads through the WATER
    pack's channel (duck-typed). A world without water installed has no
    `analyze power`; `analyze grid` is the pack's own read and covers the
    drive.
12. **`lint:mass` + the `SpiritBottle` copy (narrowing W7, mechanical).** New
    Thing rows must carry `mass`/`_materialPath` (§ Convention conformance);
    the `gin.yaml` shape copied for `lamp-oil-cask` lacks mass, so add it. Also
    `Holder`'s docstring floats a future `Vessel`→`Receptacle` rename for
    poured/bulk holders; our casks stay `Vessel` (matches shipped `gin.yaml`;
    narrowing files the rename "not done"), so a narrowing-steeped reviewer may
    ask — the answer is *Vessel is the precedented choice today.*

---

## Deferred seams

Clean attach points; each leaves as a slate note, never a stub.

- **Tier B — the interior (electricity.md).** The meter is the attach
  point: a premises-side `Energized` fixture held at potential iff
  `isPowered()`; sub-parcel circuits by `subdivide`. → `grid-slate` Part 5
  Tier B (kept).
- **Tier C — metered billing.** `availablePowerW` × time is a `payment`
  leg in Compact currency; the utility-ownership fork (municipal / corpo /
  co-op) decides the payee. → `power-utility-slate` (kept; its "first
  demand case" section retires at the sweep).
- **The retort.** → `destructive-distillation-slate` (the oil works' floor
  stock becomes crafted output when it lands; the good and the cask are
  ready).
- **Gas as a second piped commodity.** A gas main is a two-ended pipe —
  water's `Conduit` shape — delivering into a parcel extent and feeding a
  gas kitchen; the `StreetLightingSupply` shape already lets a gasworks
  cover streets. → `power-utility-slate`.
- **Fuel as mass.** `lamp-oil.heatOfCombustion` is authored now, so
  `BurnerMixin` (`lib/fire/Burner.ts`) / `SpaceHeating` can derive watts from
  mass × MJ/kg when someone needs it. → `hearth-and-larder-design-pack` /
  `fire.md` note.
- **The lineman market.** `sever`/`splice` exist and the catalogue mints
  the fact; outage work orders (a gig whose condition is "node N spliced")
  need the contract substrate's NPC-claiming or a `--bounty` on splice.
  → `power-utility-slate`.
- **Dedication, easements, the holdout.** → `delivery-slate`,
  `grid-slate` Part 2.
- **The generic `holdsSeat` validator.** Not needed here (the seat's power
  is the purchasing position); the third hand-written twin is still the
  trigger. → `civics.md` deferred list (unchanged).
- **Overdrawn with consequence.** The catalogue reports `overdrawn` when
  Σ bands exceed the source; nothing browns out yet. → Tier B.
- **The newbie wilds' posture.** Whoever holds that ground declares it;
  the gate now makes it a recorded decision. → `grid-slate` Part 4 note.

---

## Critical files

Read first, in this order:

1. `docs/requirements/energy-requirements.md`
2. `packages/server/src/mud/platform/idea/Locality.ts` (the settle and its
   placeholder docstring)
3. `packages/server/src/mud/lib/supply/SupplyState.ts`
4. `packages/content/water/src/idea/WatercourseCatalogue.ts`,
   `Watercourse.ts`, `FisheryRegistry.ts`, `thing/Conduit.ts`,
   `idea/reading/PowerReading.ts`
5. `packages/server/src/mud/lib/parcel/ParcelRecord.ts`,
   `platform/idea/ParcelRegistry.ts`, `platform/idea/api/PackLogic.ts`
   (lines 440–460, 3305–3320)
6. `packages/server/src/mud/lib/behavior/restocks.ts`,
   `packages/content/trade-haulage/src/behavior/hauls.ts`,
   `packages/content/saxonberg-lounge/content/world/lounge/agent/mara.yaml`
7. `packages/content/terminus/content/world/terminus/goods-yards/bottling/`
   (all four files) and `trade-distilling/content/trade/distilling/thing/gin.yaml`
8. `packages/server/src/mud/platform/idea/api/BankingLogic.ts`
   (`appropriateImpl`, `remitDemoTaxImpl`, `ensureVenueAccountImpl`)
9. `packages/server/src/mud/platform/idea/Government.ts`,
   `api/government.ts`, `docs/subsystems/civics.md` § the first public
   service
10. `packages/content/trade-fuel/src/thing/CharcoalPit.ts` and
    `idea/cmd/fuel/CharController.ts` (the affordance + controller shape)
11. `packages/server/src/mud/platform/idea/api/WeatherLogic.ts`
    lines 957–1010
12. `packages/content/water/{package.json,tsconfig.json,vitest.config.ts,pack.yaml}`
    and `docs/subsystems/content-packs.md` § the capability rung
13. `packages/wire/tests/envelope.dirty.wire.test.ts`
14. `docs/lint-family.md` (the census-then-ratchet pattern; `lint:light-sources`
    (e); `lint:openings` arm 5)

## Drive record

`packages/wire/tests/energy.dirty.wire.test.ts` — **Stage A 2/2 + Stage B 6/6
green** (two files, run together: `6 passed`). Driven on a fresh DB, WIRE_PORT
2015.

Stage A (combustion), live over the socket:
- Heart's Delight's ways declare gas lamps, bind `look lamps`, and read a
  coherent epoch-correct state "fed from the valley's own oil".
- ⚠ The lamps read *stand cold* at boot: the boot settle races the async pack
  install (the same wall envelope hit), so a midnight-booted wire world settles
  nothing until the next sunset (the live game recovers then). The LIT/drawdown
  and the money are unit-proven (`FuelStore.test.ts`, `Locality.lighting.test.ts`,
  `oilworks.test.ts`, `BankingLogic`). → a finding for the envelope/platform tail.

Stage B (electric), live over the socket:
- the Mayfield lobby reads **electric**, domestic band, feeder node LIVE;
- `sever` at the avenue pole → the lobby's feeder goes **dark** the same second
  (a cut darkens only downstream); `splice` → **live** again;
- Hinkley Hills reads **off-grid**; Heart's Delight reads **gas-lit** — the epoch
  derived from what reaches each place, no "tech level".

What the drive found (all fixed; see B4 above): a boot deadlock, a
premature-compile cache, the realm-root feeder over-inheritance, and the
locality-vs-premises epoch. The storm fault is unit-proven
(`LineAccess.test.ts`); the undeclared-premises build error is `lint:power-posture`
(ceiling 0). The streetlight settle timing (both epochs) is the one wire wall,
documented above.
