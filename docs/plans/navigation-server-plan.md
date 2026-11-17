# Navigation server pass — implementation plan

The server half of the navigation build: the server becomes able to tell a
client, **as data**, two things and never a third — *your knowledge* (your
map, kept as a copy on the client) and *what you perceive from here, now*
(seven sections) — and `locate` is retired. Executes
[navigation-server-requirements](../requirements/navigation-server-requirements.md)
(AGREED 2026-11-16). **Kind:** feature. **Lead end:** kernel-led; the
**first consumer is the wire drive** (the pane ships later). No client code
changes; the text navigator (`NavigatorBody.tsx`) keeps reading today's
`Whereabouts` card payload unchanged.

Paths below are relative to `packages/server/src/mud/` unless they start
with `packages/` or `docs/`.

## Grounding

Verified at `b0ff414c3` (size-and-carrying merged) by opening the files.

### The map and its writers

- `lib/location/MapClaim.ts` — `MapClaim { kind: 'place'|'edge'|'band',
  place, label?, name?, keywords?, group?, dir?, to?, toLabel?, channel,
  conditional?, where?, toldBy?, firstSeen, lastSeen, recordedBy }`.
  **No position, no way state, no Locality kind.** `place` is the durable
  handle (an identity path); `label` and `toLabel` are template paths.
- ⭐ **One write chokepoint:** `NavigationLogic.recordPlace(viewerKey,
  locality, claims)` (`platform/idea/api/NavigationLogic.ts:971`) →
  `growMap` → `DocumentApi.saveMap`. Every writer goes through it:
  `Cartographer.recordPerceived` / `recordTimetable` / `recordTraversal`
  (`lib/location/Cartographer.ts:257,287,325`) and
  `ChartedMixin.writeClaimsFor` (`lib/expanse/Charted.ts:93` — a chart
  writes `charted`, a pilot `told` with `toldBy`). There is no other
  writer.
- `growMap` keys a claim on `kind|place|dir|toLabel|channel|where|toldBy`:
  **one claim per key**; an identical observation bumps `lastSeen`, a
  differing key appends. It returns the whole array or `null` — not what
  changed.
- A map document is filed per **finest covering Locality**
  (`/home/<key>/map/<locality address>`); `DocumentApi.readMaps(key,
  prefix)` reads by prefix.
- ⚠ **A place with no durable handle writes no claim**
  (`Cartographer.ts:205`). `Stuff.getDurableHandle()` (`lib/stuff/Stuff.ts:669`)
  is `null` when identity equals the row; `Persistable` overrides it to
  `` `${row}#${key}` `` for an explicit key. So today:
  - a **plain keyed room of a copy** (a holding's or a ship-of-a-kind's room
    that keeps no record — `FloorplanWarren.mintKeyed` clones with no
    identity path) writes **no claim at all**. House A and house B do not
    merge on the map; they are absent from it;
  - `ReachPatch`, `BankPatch`, `SeaPatch` override the handle to `null`
    (`packages/content/water/src/location/*.ts`) — no claim in moving
    water.
- ⚠ **A dark `look` still writes claims.** `PerceptionLogic.observePlace`
  (`platform/idea/api/PerceptionLogic.ts:1442`) calls
  `viewer.learnSurroundings(place, dark ? [] : seen)`, which records the
  place and its exits. Drive step 14 requires it to write nothing.
- ⚠ **Arriving writes no place claim.** `recordTraversal` writes one
  `walked` **edge** on the source. The destination's place claim comes from
  the arrival auto-look, channel `seen`. Drive step 2 expects the room you
  walked into as `walked`.
- `PerceiverMixin.learnSurroundings` (`lib/description/Perceiver.ts:192`)
  runs the perception gate first (`obviousExitsFor`); the cartographer only
  ever receives perceived exits.

### Copies and frames

- `FloorplanWarren` (`lib/location/FloorplanWarren.ts`): `warrenKey()`,
  `roomKeyOf(leaf)`, `mintedKeyOf(member)` (the room key, public),
  `laysOutOwnFrame() → true`, `layOut()` sets per-copy coordinates on each
  room (`room.setCoordinates(cell)`, entrance at the origin), and
  `protected zoneFromFor(spec, key)` — default the key; `ShipWarren.ts:281`
  overrides to `<kind row folder>/<key>`. `zoneFromFor` is called with the
  **room** key at mint; the copy's identity is the same function applied
  to the **warren** key.
- `Warren.laysOutOwnFrame()` (`lib/location/Warren.ts:128`) is `false` by
  default; `true` on `FloorplanWarren`, `ReachWarren`, `SeaWarren`;
  `MineWarren` (`packages/content/trade-mining/src/idea/MineWarren.ts:403`)
  overrides back to `false` (its cells are on its zone's grid).
- `Location.holdingFrameOf` (`lib/location/Location.ts:393`) already asks a
  place's warren whether it is in a frame.
- Moving water: `MovingPlaceMixin` (`lib/location/MovingPlace.ts`) over
  `PositionedMixin` (`framePath()`, `framePos()` — `{frame:'line', at:{course,
  km, across}}` or `{frame:'chart', at}`); one `MovingZone` per place whose
  `getAddress()` follows the frame's `siteAt(pos)`. The kernel `LineFrame`
  protocol (`lib/expanse/LineFrame.ts`) has `courseKey()`, `lengthKm()`,
  `localityAddressAt(km)`; **no reach-name read**.

### The push today

- `SaxonbergClientMixin.refreshNavigator()`
  (`lib/connection/SaxonbergClient.ts:693`) computes `whereabouts()` and
  `touchCard(key, {payload:{kind:'navigation', where}})` on every session
  that has the `map` card open; nothing otherwise. Called from
  `lib/spatial/Mobile.ts:580` (teleport) and `:1232` (traverse arrival),
  `ClientLayoutRecallController.ts:60`, `CockpitModeController.ts:127`, and
  `openArrangement`.
- `PerceiverMixin.whereabouts()` (`Perceiver.ts:222`) builds `Whereabouts`
  (`packages/types/src/index.ts:1307`): place, structure name, Localities
  (name + address), coords, exits (`Exit.wayRecord()` + destination name +
  `crossesZone`), conditions, jurisdiction. ⚠ It reads
  `NavigationApi.structureAtNow(place.getTemplatePath())` — wrong for a
  keyed room (`Place.structure()` asks the warren) — and
  `GovernmentApi.governmentAt(address)` — the S11 bug.
- `packages/client/src/components/cards/NavigatorBody.tsx` reads
  `where.place`, `where.structure.name`, `where.localities`,
  `where.coords`, `where.exits` (direction, `crossesZone`, state,
  destination, boundary), `where.conditions`, `where.jurisdiction`. Nothing
  else on the client reads navigation data.

### Wire paths that exist

| path | what it carries | why it does not carry this build |
|---|---|---|
| card wire (`card-opened`/`card-touched`, `CardRegistry`) | a card's body | a card is born only of a command and has a lifetime; `self` was kept off it for the same reason (`card-surface.md § self is NOT a card`) |
| MQL subscriptions (`MqlSubscriptionRegistry`) | Stuff field records; `read` is **sync** | a map is Documents; the ways verdict is async; `Change.fields` is typed to Stuff records |
| forum subscriptions | Documents, own result/delta trio | the precedent that non-Stuff live data takes its own typed envelope |
| `client-state-update` (`ClientState.pushClientStateUpdate`) | `{key, value}`, whole-value replace, no `frameId`, pure-push projections (`social.rules`, `stream.state`) | no deltas, untyped, seven envelopes per move with no way to say they are one beat |
| `Sensor.onEnvelope(template)` / `Interactive.sendEnvelope(template)` | any typed envelope to every session of a body / to one session | ⭐ the seam every registry above already sends through |

`BroadcastFeed` (`backend/BroadcastFeed.ts`) forwards an allowlist only; a
new envelope type does not reach a stream overlay.

The client ignores an unknown envelope type (`packages/client/src/services/websocket.ts`
— falls to the catch-all), so a new type is inert until the pane reads it.

### The dispatch beat

`emitDispatchResponse(ctx)` (`lib/command/CommandGiver.ts:270`) sends one
`dispatch-response` per completed command with every note plus
`prompt-refresh` — the shipped "after every command, refresh chrome" seam.
Controllers return `void`; outcomes ride notes
(`packages/types/src/index.ts:920`, the `Note` union).

### Ways, the cascade and its side effects

- `Exit.wayRecord()` (`lib/boundary/Exit.ts:446`) → `WayRecord {direction,
  state, crossesZone, boundary?}`; sync getters `isOneWay` `isMuffled`
  `getMedia` `isConditional` `isMapped` `getOpening` `getTurn` `clearance`
  `spansOpenGround` `getEdgeMinutes` `isWheelPassable`.
- What `go` runs (`Mobile.traverse`, `lib/spatial/Mobile.ts:446`):
  `preloadActorAnatomy` → `loadMode` → **`LocomotionApi.canTraverseExit`**
  (`platform/idea/api/LocomotionLogic.ts:227`: body plan · posture · hands ·
  awkward load · `exit.canTraverse` · over-your-head · enablement · far-side
  enablement · drive hands · haulage) → `beforeTraverse` hook → conveyance
  → `engageAround` → `crossExit` (`:1016`: `resolveDestination`,
  **the led-animal check `:1049-1060`**, `canExit`/`canEnter` vetoes, the
  move).
- `Exit.canTraverse` (`Exit.ts:1624`): blocked · unbuilt · unpublished ·
  locked · door · exit mode (`floodedFor` may call `resolveDestination`) ·
  **clearance** (`clearanceRefusal` `:899`; words from the private
  `clearanceWords` `:1033`). The guard's `context` carries `refusal`,
  `about` and `lower` only — ⚠ **`pack` and `dismount` survive only in the
  prose.**
- `LocomotionControllerBase.composeRejection`
  (`platform/idea/cmd/movement/LocomotionControllerBase.ts:247`) **re-words**
  body-plan / posture / no-conveyance refusals — the controller words what
  the model decided.
- ⚠ **`canTraverse` overrides are not all side-effect free.** Verified:

  | override | effect when asked |
  |---|---|
  | `BerthExit` (`platform/idea/BerthExit.ts:212`) | `standing()` **stands a sleeping ship up** (`ExpanseApi.standUpCraft`) |
  | `SeaPatchExit`, `ReachExit` (`packages/content/water/src/idea/exits/`) | `resolveDestination()` — **mints a patch / a bank** |
  | `LocomotionLogic.farSideEnablement` (`:391`), `Exit.floodedFor` (`:1474`) | `resolveDestination()` — can mint a house (`LotGateExit.computeDestination`) for a climb/swim/fly probe |
  | `AshoreExit` (`platform/idea/AshoreExit.ts:164`) | `warm()` memoizes the craft path, loads her frame |
  | `SnowboundExit`, `IceCrossingExit`, `FordExit`, `FerryExit` (`packages/content/transport/src/idea/`) | refresh a derived cache (`setBlocked`, `this.ice`), load singletons |
  | `KeptDoor`, `SandboxCrossingExit`, `FloorStairExit`, `UpstairsExit`, `ColumnExit` | reads only |

  Three classes: **materialization** (the first three rows), **derived-cache
  refresh** and **load on use** (the rest — idempotent, the read `go` would
  do anyway).
- ⚠ Unverified by running: `ride <dir>` appears to fail the `exitMode` gate
  before reaching the conveyance step (`Exit.allowsMode('ride')` is false
  for a null-medium mode, `Exit.ts:1185`). W3 checks it first.

### Boundaries

`lib/boundary/Boundary.ts` (sides, `channels`, `transmissivityInto`,
`getOpening`, `stateWord`), `lib/spatial/Sealable.ts` (`setOpen` over
`BistateMixin.setState`), `lib/boundary/Lockable.ts` (`isLocked`,
`setLocked`, `opensFor(mover)`), `platform/thing/Door.ts` (`closesBehind`,
`freeFrom`), `platform/thing/Window.ts` (grime, glazing). **None declares
`subscribableFields`; no state change fires an event; the room card's
`exits` field does not refresh when a door opens.** The gangway is not a
boundary — `BerthExit`/`AshoreExit` compose `Lockable` themselves and read
the ship's lock.

`SubscribableFieldDescriptor` (`api/mql-subscription.ts:69`) is the shipped
"a mixin declares the fields it projects" mechanism — `read(stuff, viewer)`
is per viewer, collected over the class chain by
`MixinApi.getAllSubscribableFields`, projected by the stateless
`MqlSubscriptionApi.projectFields(stuff, names, viewer)`.

### Reads the sections use

- **Zone:** `CartesianZone.getCellSize()`
  (`platform/idea/location/CartesianZone.ts:48`); zone classes are
  `CartesianZone`, `SphericalZone`, `Expanse` subclasses, and the water
  pack's `SeaZone`/`ReachZone` (`MovingZoneMixin(CartesianZone)`).
  `getExtentM()` exists and is never sent.
- **Localities:** `AddressApi.resolveFor(place)` →
  `coverageChainOf(address)`; `Locality` (`platform/idea/Locality.ts`) has
  `getName`, `getAddress`, `getGovernmentKey`; **no kind field, no
  learnable declaration**. 24 rows; addresses are 1–3 segments deep
  (`terminus`, `terminus/city`, `terminus/city/campus`).
- **Jurisdiction:** `GovernmentApi.subjectTo(place)`
  (`platform/idea/api/GovernmentLogic.ts:264`) answers a ship first (port
  chain, then flag state), else the address chain.
- **Ship:** `Place.structure()` (`lib/stuff/Place.ts:314`, asks the warren);
  `Ship.getBerth()`, `getLinePosition()`, `liveFrame()`;
  `LocateController.whereSheLies` (`platform/idea/cmd/perception/LocateController.ts:108`)
  holds the alongside / under-way wording and `reckoningOf` prints the
  reckoning **to anyone aboard**.
- **Horizon:** `PerceptionApi.horizonFor(viewer)` (`api/perception.ts:687`,
  sync, warm state only) → `HorizonView {things: {stuff, bearingDeg,
  rangeNm}[], traffic, atSea}`. `HorizonWatch`
  (`lib/perception/HorizonWatch.ts`) is the only thing that reports a
  change, and only to whoever keeps the watch.
- **Building:** `Structure` (`lib/structure/Structure.ts`): `getStoreys`,
  `storeyOf(path)`, `getEntrance`, `isLandmark`, `getHeightM`,
  `isTitleSold`; `Place.landedStructuresNow()` (`Place.ts:217`).
- **Place:** light band — `perceivedBandImpl` in `PerceptionLogic.ts:1395`
  (module-private; `observe` exposes it but `observe` **teaches**); the
  room listing is `MqlApi.resolveMany('here:i:visible:[not
  mixin.AdornmentMixin] - me')` filtered by `PerceptionApi.perceives`;
  ceiling `Location.getCeilingHeight()` (`lib/location/Location.ts:430`)
  against `Posed.getStature()`; elevation `ZoneApi.elevationFor(scope)`;
  water `WaterPlace.stateNow()`; discovery
  `PerceptionApi` / belief `hasDiscovered`.
- **You:** all sync. Pace `LocomotionApi.defaultModeFor(actor)` (the
  standing pace is the setting; `Mobile.getEngagedMode()` is non-null only
  mid-move or riding); `Posed.getPosture()`; `Attired.handSlots()` /
  `heldThings()` (`lib/slot/Attired.ts:779,795`); `Carrying.freeHands()`
  (`lib/slot/Carrying.ts:314`); `LoadBearing.burdenWords()`
  (`lib/encumbrance/LoadBearing.ts:389`); `Creature.mountedPair()`
  (`lib/creature/Creature.ts:831`); `Hauler.getHauledCart()`
  (`lib/slot/Hauler.ts:101`); the led animal is the **module-private**
  `ledAnimals(mover)` in `Mobile.ts:997`; carried light is
  `getContents().filter(isLightSource)` with `getEmittedFlux() > 0`.
  ⚠ **No "what the load bars" words exist** outside the gates' own
  refusals (`awkwardGate`, `encumbrance`, `breakaway`).
- **Spoilers:** `SpoilerLevels` (`lib/wiki/render.ts:64`), levels 0–3
  (0 open, 3 wizard-only); the wiki deletes by capability and tags by
  appetite.

### `route`

`RouteController` (`platform/idea/cmd/movement/RouteController.ts`) calls
`NavigationApi.routeOnMap` (`:259`, `:464`) and prints MML; `RoutePlan`
(`lib/location/RoutePlan.ts`) is plain data (`nodes`, `legs`, `cost`,
`assumptions`).

### `locate` and `course`

- `locate`: `platform/idea/cmd/perception/LocateController.ts`; view
  `packages/content/platform/content/platform/cmd/perception/locate.yaml`;
  row `…/platform/idea/cmd/perception/LocateController.yaml`; afforded at
  `Perceiver.ts:354`.
- Tests that run it: `platform/idea/__tests__/Ship.aboard.test.ts:317-331`;
  `lib/description/__tests__/Perceiver.test.ts:49`;
  `packages/wire/tests/maritime-space.dirty.wire.test.ts:298-300,599`;
  `packages/wire/tests/river-e.soak.dirty.wire.test.ts:222-223`.
  (`pets.wire.test.ts` only quotes the doctrine.)
  `platform/__tests__/TopicCatalogue.taxonomy.test.ts:164` names it in a
  regex.
- Docs: `perceiver.md:3,20,65` · `senses.md:339,354` · `messaging.md:164` ·
  `card-surface.md:1271` · `ship.md:450,457,553` · `expanse.md:184` ·
  `river.md:289` · `docs/standard-model.md:264` · `docs/roadmap.md:218`.
  Code comments: `Perceiver.ts:3,374`, `Character.ts:17`,
  `ShelledCharacter.ts:12`, `Visible.ts:44`,
  `SingleSenseControllerBase.ts:12,69`, `expanse/Voyaging.ts:25`,
  `expanse/Plot.ts:9`, `location/MovingPlace.ts:52`,
  `packages/content/water/src/location/SeaPatch.ts:17,61`.
- `course`: two views (`cmd/movement/course.yaml` →
  `CourseReadoutController`, `course-steer.yaml` → `CourseController`),
  afforded by a `Helm` to whoever shares its place
  (`platform/thing/Helm.ts:14`). ⚠ **The readout does not check
  `craft.mayBeSteeredBy(giver)`** (only the steer does,
  `CourseController.ts:185`) — a passenger standing at the helm reads the
  reckoning. Drive step 1 needs it refused.

### The wire harness

`packages/wire/src/harness/session.ts`: `Session` captures every
non-message envelope in a ring of 500 **cleared on each `cmd()`**
(`envelopesOf`, `awaitEnvelope`), and `cmd()` returns the dispatch's
`notes`. There is no accumulated client-side model. There is no restart
helper: `size-and-carrying.dirty.wire.test.ts:249` and
`repair.dirty.wire.test.ts:642` each carry their own `restartWorld()` over
`packages/wire/src/runner/boot.ts` (`bootOwnedWorld`, `stopOwnedWorld`).
`harbors.dirty.wire.test.ts:129` records *"a second login replaces the
first"* for the harness, while `connection.md § Multiplexing` describes
two live sessions of one body — W1 settles which is true.

### Drive content, as it stands

| step | site | status |
|---|---|---|
| 2–5 | Sunken Delve, `packages/content/newbie-wilds/content/world/newbie-wilds/delve/` — vestibule (0,0,0), corridor-1..3, the visible diagonal `corridor-3 southeast → vault`, `corridor-2 down → pit-below` (hidden until found), `hidden-cache` in corridor-1 | present |
| 6 | ⚠ **the lounge has no shut or locked door** (its office way is a hidden exit) | use the pump-house door, `packages/content/terminus/content/world/terminus/wharfside/thing/pump-house-door.yaml` (shut, locked, keyway `terminus-works`, `freeFrom` the house) — the boundary drive already uses it |
| 6a, 15 | the steading, `…/newbie-wilds/steading/` — low door (`yard east`), crawlway (`cottage east`), ladder (`yard up`), narrow gate (`yard north`), the mule, panniers | present; ⚠ **no horse is placed** — the drive clones `/system/transport/agent/draft-horse` |
| 7a | `packages/content/terminus/content/world/terminus/hesper/thing/old-chart.yaml`, `chart.yaml` (the Westerlies, two `where`s), in the Hesper's hold | present |
| 8 | `valley-road/the-shoulder` west → Hinkley Hills arrival (a new Locality) | present |
| 9 | two Hinkley lots, bought as `tracts.dirty.wire.test.ts:285` does | present |
| 10–11 | the Hesper at `estuary/estuary-mouth`; `estuary/headland/brow`; the light on Gannet Rock | present |
| 13 | a canoe at Rejection's put-in; ⚠ **there is no `drift` verb** — the current carries a launched boat's patch | `launch`, then wait on the patch |
| 14 | ⚠ **the Delve authors no dark room and no low room** | W4 verifies whether an unlit Delve room at night already reads pitch dark; the low room is the steading's cottage / charcoal pit; a row is authored only if neither reads so |

## ⭐⭐ New substrate

No new mixin, Api, logic singleton, class, registry, document kind,
collection or verb. What is added, each against the slate's ledger:

| # | addition | ledger row | why |
|---|---|---|---|
| N1 | one wire envelope, `navigation-update` | *the push* · *live results* — **genuinely new** | searched: the card wire, MQL and forum subscriptions, `client-state-update` (table in Grounding). None carries a per-body, card-independent, delta-capable, async-computed payload. It rides the shipped `onEnvelope` seam (D1). |
| N2 | `aspect?: 'way'` on `SubscribableFieldDescriptor`, and descriptors on `Sealable`, `Lockable`, `Door`, `Boundary`, `Window` | *boundary projection* (none existed) → **generalizes** *live results* | the shipped per-mixin projection, tagged; a pack's boundary mixin declares its own, no hook (D9) |
| N3 | fields on `MapClaim` (`at`, `state`, `via`, `government`, `localityKind`) and the claim kind `locality` | *a claim* — extend, no new writer | D2–D4 |
| N4 | `Place.mapSubject()`, overridden by `MovingPlaceMixin` | *a claim* · *copy identity* | the place says what a claim about it names and where it is; two implementers (D2) |
| N5 | `Warren.frameIdentityOf(member)`, implemented by `FloorplanWarren` | *copy identity* | the public face of `zoneFromFor`; same shape as `mintedKeyOf`; retires with `laysOutOwnFrame` at zone instancing (D2) |
| N6 | `Perceiver.navigation(names)` | *the push* (`whereabouts`) — generalize | the one composer; `whereabouts()` becomes a projection of it (D7) |
| N7 | `SaxonbergClient.refreshNavigation(names?)`, `pushMapChanges(…)`, `sendNavigationSnapshot(interactive)` + runtime state | *the push* (`refreshNavigator`) — generalize | D1, D7 |
| N8 | `Exit.wayFor(viewer)`, `Exit.wayChanged()`, the `probe` option on `Exit.canTraverse` / `LocomotionApi.canTraverseExit`, `works` on `TraversalGuard` | *a way* — extend | D8 |
| N9 | `Locality.getKind()` (derived), `Locality._learnable` (authored) | *Locality chain* | D3 |
| N10 | `SpatialZone.frameFacts()` | *zone facts* — read only, made a method | three implementers (D7) |
| N11 | `Voyaging.lies()` | *ship position* — moved off `LocateController` | D10 |
| N12 | `Note` kind `route-plan` | *route* | D5 |
| N13 | wire types `TaggedPath`, `NavSections`, `WireClaim`, `WireRoutePlan`, `WayFacts` | *spoilers* — reuse the level vocabulary | D6 |
| N14 | `NavClient` in the wire harness; `restartWorld()` lifted into it | — test tooling | D12 |

## Plan-level decisions

### D1 — Transport: one envelope on the `onEnvelope` seam

**Question.** How the copy and the sections reach the client, regardless of
the `map` card.

**Choice.** One server→client envelope type:

```ts
interface NavigationUpdateEnvelope {
  type: 'navigation-update';
  frameId: number;
  /** Per body, +1 per envelope, in memory. A snapshot states it afresh. */
  rev: number;
  /** A snapshot: replace every section and drop the whole copy. */
  full?: true;
  /** Only the sections that changed (all seven on `full`). */
  sections?: Partial<NavSections>;
  /** Claims upserted by key, per Locality document. */
  map?: { locality: string; claims: WireClaim[] }[];
  /** On `full`: how many further envelopes complete the copy. */
  mapParts?: number;
}
```

- **Deltas.** A claim is one record per growth key, so a delta is a list of
  whole claims upserted by key — the forum delta's `replace`, with no
  remove (nothing is ever removed from a map).
- **Snapshot.** At `Avatar.enter(interactive)`, to **that session only**
  (`interactive.sendEnvelope`): one `full` envelope with all sections and
  `mapParts: N`, then N ordinary envelopes, one map document each. The
  snapshot is chunked by document with no second protocol.
- **Gap, reconnect, restart.** A WebSocket does not drop or reorder within
  a connection, and the pusher never drops — so the only gap is a
  disconnect, and every new session gets a snapshot. `rev` makes
  contiguity **assertable** (the drive asserts it; a break is a defect to
  report, not a repair path). `rev` is runtime state: a restart is a
  reconnect is a snapshot.
- **Second session.** Deltas go through `onEnvelope` (every session of the
  body); a new session's snapshot states the body's current `rev`.
- **Why not the card wire:** needs an open card; the requirement is that
  it flows without one. **Why not MQL:** Documents and an async verdict.
  **Why not `client-state-update`:** whole-value replace (a Locality
  document re-sent per move), no `frameId`, and seven untyped pushes per
  move that cannot say they are one beat.
- The `map` card keeps working: the same flush fills it (D7).

### D2 — Where a claim's position comes from

**Question.** How each writer gets zone, coordinates and level; what a
charted or told claim carries; copies; moving water.

**Choice.** `MapClaim.at?: { zone: string; x?: number; y?: number;
z?: number; level?: number; line?: { course: string; km: number } }`,
written at perception time and never afterwards.

- **The place answers.** `Place.mapSubject(): { place: string; at:
  MapPosition } | null` on `lib/stuff/Place.ts`:
  - `place` — `getDurableHandle()`, else `` `${row}#${mintedKey}` `` when
    its warren minted it under a key (`warren.mintedKeyOf(this)`; the same
    string a `Persistable` room already answers), else `null` (a lounge
    satellite still writes nothing).
  - `at.zone` — `warren.frameIdentityOf(this)` when its warren lays out its
    own frame, else the zone's template path.
  - `at.x/y/z` — `getCoords()` (a copy's rooms already hold the frame's
    coordinates from `layOut`); `level` is `z` on a grid.
- **`Warren.frameIdentityOf(member)`** — default `null`; `FloorplanWarren`
  answers `zoneFromFor(specOf(member), warrenKey())` **when
  `laysOutOwnFrame()`** (so a mine answers `null` and its cells record the
  mine's own zone). Holdings: the holding's key. Ships of a kind:
  `<kind row folder>/<serial>`. Dorm and let units: the unit's parcel
  extent, through `HoldingWarren`. This is the path zone instancing mints.
- **Moving water.** `MovingPlaceMixin` overrides `mapSubject()`:
  `place = framePath()` (the river's or the sea's row), `at.zone` the same,
  and on a line `at.line = { course, km }` rounded to 0.1 km. On the chart
  no position is recorded — a passenger does not know the reckoning
  (requirements § Aboard a ship). One claim per river per Locality
  document, bumped as you drift; never the patch.
- **Charted and told.** `Charted.writeClaimsFor` sets `at.zone` to the
  chart's `of` (the water it is a chart of) and keeps `where` as stated.
  ⛔ It never reads the live node — that would be the index correcting a
  wrong chart. It adds `via` (the chart's template path) and `viaName`
  (its name), so two charts are two sources; `via` joins the growth key.
- **Published.** `PublishedStop` gains an optional `at`, filled by the
  publishing node from its own arrival room when that room is standing;
  otherwise absent.
- **Growth.** `at` is **not** in the growth key. A bump whose claim brings
  an `at` to a held claim that has none fills it; a held `at` is never
  rewritten.
- **Arrival.** `recordTraversal` also writes a `walked` **place** claim for
  the destination (through `mapSubject()` of where the mover now stands),
  beside the walked edge.
- **Dark.** `observePlace` in the dark reads `obviousExitsFor` for the
  render and does **not** call `learnSurroundings` — a dark `look` writes
  nothing.

### D3 — The first-visit Locality claim

A claim of kind `locality`, channel `walked`: `{ kind: 'locality', place:
<address>, name, government?: { key, name }, localityKind?, firstSeen,
lastSeen }`, filed in **that Locality's own** document. Written by the
cartographer when the covering chain of the place it stands in differs from
the chain it last recorded (a runtime field on the mixin — one compare per
perception, a write only on entry).

- `Locality.getKind()` derives from address depth: 1 `realm`, 2
  `settlement`, 3+ `district` — vocabulary `LOCALITY_KINDS` in
  `packages/types`. ⚠ The slate said *realm · city · district*;
  `settlement` is used because depth 2 also holds `narnia/wild` and
  `pair/arid`. **Grain** — see Risks.
- `Locality._learnable` (authored, default `['government', 'kind']`) is
  what a first visit teaches beyond the name; the claim and the Localities
  section both omit what a Locality withholds.

### D4 — A way's state as seen

`MapClaim.state?: WayState` on every edge claim the cartographer writes
(`exit.wayState()` at perception), **in the growth key** — *shut* then
*locked* are two claims, and seeing it shut again bumps the first. The
latest `lastSeen` is what you last knew.

### D5 — A route plan as data: a note

`RouteController` adds `context.note({ kind: 'route-plan', plans })` beside
its prose, where each plan is the `RoutePlan` it printed (`legs`, `cost`,
`assumptions`, the index of the least certain leg) with every node as a
`TaggedPath` plus the name from the claim. A refusal already notes
`controller-rejected`; its `reason` is set to the `RouteRefusalReason` so
data and prose refuse alike. A note because the plan is a command's
outcome and notes are how outcomes travel.

### D6 — Paths among the spoiler levels

Every identity or template path on the wire is a `TaggedPath = { path:
string; spoiler: 1 }`: level 1, the lowest non-open level — appetite, one
click, never a capability. Applies to a claim's `place`, `label`, `to`,
`toLabel`, `via`, `toldBy`, `at.zone`; the zone section's id; a route
node; the building's entrance. A Locality **address** is not a path and
travels bare. Disk is unchanged; tagging is the wire projection
(`WireClaim`).

### D7 — Sections

```ts
interface NavSections {
  zone: ZoneSection; localities: LocalitiesSection; horizon: HorizonSection;
  building: BuildingSection | null; ways: WaysSection; place: PlaceSection;
  you: YouSection;
}
```

Each section value carries `v` (per section, +1 when it is sent).

- **One composer.** `Perceiver.navigation(names)` returns the named
  sections; each read in its own try, a failed read leaving its field
  absent (the `whereabouts` rule). `whereabouts()` is rewritten as a
  projection of `navigation(['localities','building','ways','place'])` plus
  conditions, so the card and the sections cannot disagree and
  `Whereabouts` keeps its exact shape.
- **One flush per beat.** `refreshNavigation(names?)` adds to a dirty set
  and arms one `ScheduleApi.schedule(0, …)`; the flush computes the dirty
  sections, compares each with the last one sent (canonical JSON), sends
  one envelope with only those that differ, and fills the `map` card when
  one is open. A recompute in flight absorbs later marks into the next
  flush.

| trigger | site | sections marked |
|---|---|---|
| arrival (walk, teleport, forced) | `Mobile.ts:580`, `:1232` | all seven |
| session enter | `Avatar.enter` | snapshot |
| your own command completed | `emitDispatchResponse` | `you`, `ways`, `place` |
| a way you can see changed state | `Exit.wayChanged()` (D8) | `ways` |
| the place you are in moved | `MovingPlaceMixin.onFrameMoved`; `Voyage.beat` | `localities`, `zone`, `place` |

- ⛔ **`horizon` is marked only by arrival and enter.**
- ⚠ Crowding and light are read on your beats, not when somebody else
  walks in — the room card is the live view of the room. See Risks.
- **Measure before fixing.** W1 sends the sections as today's reads give
  them and records sizes here; W4 fixes the shapes; step 16 records the
  final numbers.

Section contents (words wherever the game has words):

- **zone** — `{ id: TaggedPath, kind: 'grid'|'sphere'|'chart'|'water',
  cellSizeM?, label }` from `SpatialZone.frameFacts()`; in a copy, the
  copy's identity and its zone's cell. Never extent or levels.
- **localities** — `{ chain: { name, address, kind?, government? }[],
  ship?: { name }, outer?: Lie, jurisdiction: { key, name }[] }`.
- **horizon** — `{ atSea, things: { stuffId, name, landmark, bearingDeg?,
  rangeNm? }[], traffic }`, landmarks first.
- **building** — inside: `{ name, storey?, storeys, entrance?, heightM,
  landmark, titleSold }`; `entrance` is `{ here: true }` or, when your map
  holds it, its name and the first direction of `routeOnMap` to it.
  Outside: `{ landed: { name, landmark }[] }`.
- **ways** — `Exit.wayFor(viewer)[]` (D8, D9).
- **place** — `{ stuffId, name, light, dark, openSky, water?, staged,
  crowd, lowCeiling, elevationM?, searched, found }`.
- **you** — `{ pace, posture, hands: { slot, holds? }[], freeHands, load,
  bars: string[], light?, mount?, led?: string[], cart? }`.

### D8 — *Can you take it now*: the cascade, asked as a probe

- **One function.** The verdict is `LocomotionApi.canTraverseExit(viewer,
  exit, mode, dir, { probe: true })` with `mode = defaultModeFor(viewer)` —
  the function `go` calls.
- **Probe never materializes.** `Exit.canTraverse(mover, mode, opts?)`
  takes `{ probe?: boolean }`. Under probe: `floodedFor` and
  `farSideEnablement` use `peekDestination()` only; `BerthExit` asks
  `ship()` without standing her up; `SeaPatchExit` / `ReachExit` stop after
  their warren's `refusalFor`. A way that cannot be settled without
  materializing answers `{ ok: true, unsettled: true }` and the section
  sends **no verdict** for it. Derived-cache refreshes and loads stay (they
  are the reads `go` does).
- **The led animal joins the cascade.** The check at `Mobile.ts:1049-1060`
  moves into `LocomotionLogic.canTraverseExit` (after the exit's own gate),
  and `ledAnimals` becomes `Carrying.ledAnimals()`. `crossExit` no longer
  runs it; `traverse` reaches it through the cascade. Same words.
- **The model words every refusal.** `composeRejection`'s re-wording of
  body-plan, posture and no-conveyance moves into the gates, so
  `guard.reason` is the sentence printed, and the controller prints it.
- **What would work is data.** `TraversalGuard.works?: { mode?: string;
  command?: string; remove?: { stuffId, name }; dismount?: true;
  freeHands?: number }`, filled where the words are made (`clearanceWords`,
  `handsGate`).
- **Place vetoes** (`canExit` / `canEnter`) are asked when the far side is
  standing; otherwise skipped.
- **Not asked:** `beforeTraverse` (a fight's disengage mutates). Stated in
  Risks.
- **Cost.** Sync gates plus one clearance measure per way; W3 measures the
  ways section on the steading yard (six ways) and records it. Budget: 5 ms
  median per recompute.

### D9 — The boundary, by composition

`SubscribableFieldDescriptor` gains `aspect?: 'way'`. The way's `facts` are
`projectFields` over every `aspect: 'way'` descriptor of the **exit** and of
its **boundary**, merged — a keyed record of words and booleans, no fixed
shape.

| declared on | fields |
|---|---|
| `SealableMixin` | `open` |
| `LockableMixin` | `locked`, `keyHeld` (`opensFor(viewer)`) |
| `Door` | `closesBehind`, `freeHere` (the viewer stands on the free side) |
| `Boundary` | `passes` (the channels it passes toward the viewer's side now), `opening` |
| `Window` | `grime` (its word) |

A gangway's lock shows because `BerthExit`/`AshoreExit` compose `Lockable`.
A pack's new boundary mixin declares its own descriptor and appears with no
kernel edit.

`Exit.wayChanged()` marks `ways` for every client standing in the exit's
source place. Called by `Boundary` for both sides when its state changes
(`platform/thing/Boundary` on `setOpen`; `Door` on `setLocked`) and by
`Ship` for her gangway's two ways.

### D10 — Aboard a ship

- The last crumb is the ship: `localities.ship = { name }` when
  `place.structure()` is a craft.
- `Voyaging.lies(): Lie` — `{ at: 'berth', landing?: string } | { at:
  'river', river: string, km: number } | { at: 'sea' }` — the alongside
  read moved off `LocateController`, plus the river case it never had. A
  body in a moving place with no ship gets the same from the place's
  `framePos()`.
- ⚠ *The reach* is worded as the river's name and the km above the mouth;
  the kernel `LineFrame` has no reach name (Risks).
- Jurisdiction is `GovernmentApi.subjectTo(place)` in the section **and**
  in `whereabouts()` (`jurisdiction` = the first name, so the card reads as
  before ashore and correctly aboard).
- `CourseReadoutController` asks `craft.mayBeSteeredBy(giver)` before the
  reckoning; otherwise it refuses with the steer's sentence.

### D11 — `locate` retired

Delete the controller, the view, the controller row and the contribution;
rewrite the three tests' `locate me` reads to `course` at the helm (or to
the `localities.outer` assertion); fix the docs and comments listed in
Grounding. `MovingPlace.alongsideCraft()` stays (the patch's own read).

### D12 — The wire harness

`NavClient` (`packages/wire/src/harness/nav.ts`), one per `Session`, fed
every `navigation-update` **before** the per-command capture is cleared: it
holds the sections, the copy keyed by claim key, the last `rev`, and an
uncapped log. It offers `section(name)`, `claims(filter)`, `sentSince(mark)`
(which sections a step sent), `bytesSince(mark)`, `assertContiguous()`, and
`assertAllPathsTagged()` (a recursive scan: no bare string matching a
namespace root outside a `TaggedPath`). `restartWorld()` is lifted from the
two tests that carry it into `packages/wire/src/harness/world.ts`.

## ⭐⭐ Host placement

| addition | host | what it claims about the host's other composers |
|---|---|---|
| nav push state (`rev`, last-sent sections, dirty set) | `SaxonbergClientMixin` — runtime fields, not persistent | every composer is a body with sessions (the Avatar family); all of them mean it. It already owns `refreshNavigator`. |
| `navigation(names)` | `PerceiverMixin` | every perceiver can answer *what do I perceive here*; an NPC is never asked. No state. ⚠ If `lint:mixin-clusters` splits it, the composer moves beside `SaxonbergClient` rather than the ceiling rising. |
| `mapSubject()` | `Place` | every place but the void has a position; a place with no handle answers `null`, as it writes no claim today. `MovingPlaceMixin` overrides — every moving place means it. |
| `frameIdentityOf(member)` | `Warren` (default `null`) | ⚠ answers non-null only on `FloorplanWarren` copies. The same profile as `mintedKeyOf` and `laysOutOwnFrame`, which it sits beside and retires with. No guard re-narrows: it is gated on `laysOutOwnFrame()`, the warren's own answer. |
| `at`, `state`, `via`, `government`, `localityKind` | `MapClaim` (a document's data) | optional; absent where the writer does not know. |
| `_learnable`, `getKind()` | `Locality` | every Locality has a depth; every Locality may withhold. Default teaches all — 24 of 24 rows unchanged. |
| `frameFacts()` | `SpatialZone`, overridden by `CartesianZone`, `SphericalZone`, `Expanse`, `MovingZoneMixin` | every spatial zone is a frame of some kind. |
| way descriptors | the mixin that owns each fact | a `Sealable` chest also declares `open` with `aspect: 'way'`; it is only projected when it stands in a way. |
| `wayFor`, `wayChanged`, probe | `Exit` | every exit is a way. |
| `lies()` | `VoyagingMixin` | every craft lies somewhere; `Ship` adds the berth. |
| `ledAnimals()` | `CarryingMixin` | every carrier can hold a lead; most answer `[]` — the answer the private function already gives each of them. |

## Convention conformance

Checked at plan time against `CLAUDE.md` and the tree.

- **Locations, not rooms; `props:`/`cast:`** — no rows authored unless step
  14 needs one (then `props:`, a `Location`).
- **Namespace** — all kernel; nothing new under a pack root. The water
  pack gains one `super.onFrameMoved` call and its two exits honor `probe`.
- **Module scope** — no module-scope statements; the flush is armed through
  `ScheduleApi`.
- **Import boundary** — `Perceiver` keeps its lazy Api imports; the map
  path still never imports the graph (`lint:graph-walks`).
- **Module categories** — no new category, no free helper. `NavClient` is
  harness code outside `src/mud`.
- **Verbs on objects** — every new read is a method on its subject; no new
  Api static takes a world object first (`lint:object-verbs`).
- **P3 refuse/skip/throw** — a section read that fails leaves the field
  absent and warns once per kind; an unsettled way sends no verdict; a
  claim with no subject is skipped; `recordTimetable`'s silent `catch`
  gains the warning `recordPerceived` has.
- **P4 no duck typing** — every narrowing is `MixinApi.isX`; the water
  pack is reached only through `MovingPlace`, `Positioned`, `LineFrame`.
- **P5 the mixin decides** — refusal words move from
  `LocomotionControllerBase` into the gates; `RouteController` and
  `CourseReadoutController` render what the model answered.
- **P6 persistence** — nothing new persists except claim fields in the
  existing map documents and `Locality._learnable` (authored). Push state
  is runtime. No migration: dev worlds are dropped.
- **P7 load on use** — no boot entry; the snapshot reads the map by path
  prefix at enter; a Locality is reached through the coverage chain.
- **P8 names** — `navigation-update`, `mapSubject`, `frameIdentityOf`,
  `wayFor`, `lies`; no class added.
- **P9 predictable from the def** — no command gains hidden behavior.
  `course`'s help gains *"at her helm, by her master"*; `route`'s def is
  unchanged (a note is not an act).
- **P10 metadata as a document** — the Locality kind words are a wire
  vocabulary (three constants), not rows; nothing new is an `Idea`.
- **P11 no caller branches on the destination** — `mapSubject()` is the
  place's own answer; the cartographer calls one method.
- **P12 no synonym** — `refreshNavigator` stays the card fill and is called
  by the one flush; `wayFor` contains `wayRecord`, it does not rename it.
- **P13 the mixin's sentence** — in Host placement.
- **P14 nothing moves or decides invisibly** — the probe materializes
  nothing; the flush sends only what differs.

**Lint gates this build must hold:** `lint:family` whole, and in
particular `lint:graph-walks`, `lint:object-verbs`, `lint:lib-statics`,
`lint:mixin-clusters`, `lint:duck-typing`, `lint:controller-decisions`,
`lint:controller-functions`, `lint:command-views`, `lint:view-keys`,
`lint:controller-rows`, `lint:contribution-keys`, `lint:self-contributions`,
`lint:perceived-surfaces`, `lint:field-meta`, `lint:imports`,
`lint:module-scope`, `lint:test-bootstrap`, `lint:drive-scripts`,
`lint:thin-forwarder`. No ceiling rises without a caller audit.

## Waves

Each wave ends at one commit, passes `pnpm test:near` and `lint:family`,
and is landable alone.

### W0 — `locate` retired; the jurisdiction aboard

D10 (jurisdiction, `course`), D11.

- Delete `LocateController.ts`, `locate.yaml`, `LocateController.yaml`, the
  `Perceiver.ts:354` contribution.
- `Voyaging.lies()` + `Ship` override, with the wording
  `LocateController.whereSheLies` had.
- `Perceiver.whereabouts()`: `GovernmentApi.subjectTo(place)`;
  `place.structure()` in place of `structureAtNow(templatePath)`.
- `CourseReadoutController`: the `mayBeSteeredBy` gate.
- Tests and docs per Grounding.

**Acceptance.** `locate me` is an unknown verb over the wire; `course` at
the Hesper's helm gives the reckoning to her master and refuses a
passenger; with the `map` card open aboard, the card's jurisdiction is the
port. **Commit:** `feat(navigation): retire locate; the jurisdiction aboard is government's`.

### W1 — The envelope, the copy and the harness

D1, D6, D12; sections as today's reads.

- `packages/types/src/index.ts`: `NavigationUpdateEnvelope`, `TaggedPath`,
  `WireClaim`, `NavSections` (first shapes), added to the envelope union.
- `SaxonbergClient`: `refreshNavigation`, the flush, `pushMapChanges`,
  `sendNavigationSnapshot`; `Mobile`'s two call sites and `Avatar.enter`.
- `NavigationLogic.growMap` returns the changed claims; `recordPlace`
  finds the live body by `viewerKey` and calls `pushMapChanges`.
- `Perceiver.navigation` with `localities`, `building` (name), `ways`
  (`wayRecord`), `place` (name) — `whereabouts()` projected from it.
- Harness: `NavClient`, `restartWorld()`.
- Settle multi-session: one test opens two sessions of one character.

**Acceptance.** `packages/wire/tests/navigation-server.dirty.wire.test.ts`
steps 2, 3 (without positions), 17, 18, 19 and the gap case (a session
dropped while a second moves, then reopened, equals the second); the
`map` card unchanged (`client-surface` and `boundary` wire tests green).
**Record the measured sizes in this plan.** **Commit:** `feat(navigation): the copy of your map and the sections reach the client`.

### W2 — What a claim knows

D2, D3, D4.

- `MapClaim` fields; `Place.mapSubject`; `Warren.frameIdentityOf` +
  `FloorplanWarren`; `MovingPlaceMixin` override.
- `Cartographer`: positions, edge `state`, the walked place claim, the
  Locality claim; `Charted`: `at.zone`, `via`; `PublishedStop.at`.
- `growMap`: `state` and `via` in the key; the `at` fill rule.
- `observePlace`: nothing written in the dark.
- `Locality.getKind`, `_learnable`.
- `MapController` renders unchanged — verify `map` and `route` say what
  they said (their tests, plus one that reads a map with the new fields).

**Acceptance.** Steps 2–5, 7a, 8, 9; unit tests for `growMap`
(state appends, `at` fills, never rewrites), `frameIdentityOf` (holding,
ship of a kind, mine → `null`), `mapSubject` (plain keyed room, persistable
room, patch). **Commit:** `feat(navigation): a claim records where the place is, and what you saw`.

### W3 — The ways

D8, D9.

- First: run `ride north` on a mounted body; fix the `exitMode` gate if it
  refuses (a defect in the shipped cascade, recorded as such).
- `probe` through `LocomotionLogic.canTraverseExit`, `Exit.canTraverse`,
  `floodedFor`, `farSideEnablement`, `BerthExit`, `SeaPatchExit`,
  `ReachExit`; every other override accepts and forwards the option.
- The led-animal gate into the cascade; `Carrying.ledAnimals()`.
- Wording into the gates; `TraversalGuard.works`.
- `aspect: 'way'` and the descriptors; `Exit.wayFor`, `Exit.wayChanged`
  and its three call sites.

**Acceptance.** Steps 6 (at the pump-house door) and 6a; a unit test per
override that a probe leaves residency unchanged (no ship stood up, no
patch minted, no house provisioned); a test that for every refusing gate
the probe's `reason` equals `traverse`'s; a test boundary with its own
mixin and descriptor appears in `facts`. **Record the ways cost.**
**Commit:** `feat(navigation): the ways say whether you can take them, in the words trying gives`.

### W4 — The other sections and their triggers

D7, D10.

- `SpatialZone.frameFacts` and overrides; the zone, localities (kind,
  government, ship, `outer`, jurisdiction chain), horizon, building, place
  and you sections.
- The dispatch-beat trigger; `MovingPlaceMixin.onFrameMoved` (and
  `ReachPatch`'s `super` call); `Voyage.beat`.
- The light band read made reachable without teaching (the existing
  `perceivedBandImpl` behind `PerceptionApi`, not a new concept).
- `bars`: the words of the gates that the load currently trips
  (`awkwardGate`, encumbrance, breakaway), asked with no exit.
- Fix the section shapes; re-measure.

**Acceptance.** Steps 10–16. **Commit:** `feat(navigation): the zone, your Localities, the horizon, the building, the place and you`.

### W5 — The route as data

D5. `RouteController` note; refusal reason.

**Acceptance.** Step 7; a unit test that the note's legs equal the prose's.
**Commit:** `feat(navigation): a route plan travels as data`.

### W6 — The drive, the walk-through, the docs

- The whole blocking drive in one file, each checkpoint made to fail once
  (B2).
- Subsystem docs drafted for the sweep: `location-graph.md` (claims, the
  copy), `card-surface.md` (the envelope beside the card), `boundary.md`
  (way facts, probe), `perceiver.md`, `ship.md`, `civics.md`,
  `locomotion.md`.
- `pnpm test` once; the MR.

**Commit:** `test(navigation): the blocking drive`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| the copy | none (a push) | `SaxonbergClient` on the body | map documents | read by path prefix at enter | — |
| deltas | whatever perceives | `Cartographer` on the body | `recordPlace` | the live body by identity path; **no body resident → no push, the next snapshot carries it** | — |
| sections | none | `Perceiver` + `SaxonbergClient` | the reads in Grounding | each read loads what it follows | — |
| way facts | none | the boundary's own mixins | descriptors with `aspect: 'way'` | the boundary is already in hand on the exit | — |
| the verdict | none | `Mobile` (a body that can move) | the cascade | modes load on use | — |
| route data | `route` | unchanged | the note | unchanged | unchanged |
| Locality claim | none | `Cartographer` | `Locality` via the coverage chain | `AddressApi.resolveFor` readies the index | — |
| `course` gate | `course` | the helm (unchanged) | `mayBeSteeredBy` | — | the readout has no arg |

⚠ Silent-failure points to test: a body composing `SaxonbergClient` but
not `Cartographer` (a guest — sections flow, the copy is empty, said by
`mapParts: 0`); a `viewerKey` whose body is asleep; a boundary mixin with
no descriptor (no facts, state still on the way).

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| the client holds its own map, current after a move, a gap, a reconnect, a restart, a second session | W1, W6 |
| every place says where it is; copies are separate | W2 |
| a first visit to a Locality with name, government, kind | W2 |
| a door reads as last seen | W2 |
| a route as data agreeing with the prose | W5 |
| sections; a move sends only what changed | W1, W4 |
| every way says whether and what would work, word for word | W3 |
| every claim says how you know it | W1 (channel, `toldBy`), W2 (`via`) |
| the ship is the last Locality; jurisdiction matches `government` | W0, W4 |
| the horizon on arrival, never standing still | W4 |
| no path untagged; nothing the player does not know | W1, W6 |
| `locate` gone; the reckoning is `course`'s at the helm | W0 |

Nothing is unmapped.

## Test & gate strategy

- **Unit** (`__tests__/` beside the source, importing `test-bootstrap`):
  `growMap`; `mapSubject`; `frameIdentityOf`; the probe's purity per
  override; reason equality probe vs `traverse`; the section differ (only
  changed sections sent, `v` and `rev` monotonic); `Locality.getKind`;
  `Voyaging.lies`; the tagging projection.
- **Only the drive proves:** what arrives on a real socket, across a
  restart and a second session; the firewall across the whole run.
- **Full suite** at code-complete and at `/finalize` only.
- **Browser walk (B3):** nothing new renders; the walk is the existing
  navigator — open the `map` card, walk, board the Hesper — to prove the
  text navigator is unbroken (`e2e/tests/navigation-server-walk.spec.ts`).

**The blocking drive** — `packages/wire/tests/navigation-server.dirty.wire.test.ts`.
No soak drive.

| step | pace | staging |
|---|---|---|
| 1 `locate` gone; `course` | instant | `startLocation` the Hesper's deck; a second character not her master |
| 2 walk into the Delve | instant | a fresh character at the treeline |
| 3 `look` | instant | — |
| 4 the diagonal, the pit | instant | `search` in corridor-2 first (the way down is hidden) |
| 5 `search` the cache | instant | a second character |
| 6 shut, locked | instant | the pump-house door; `hand` a `terminus-works` key to a second character to open it |
| 6a low door, crawlway, ladder | instant | `hand` a backpack, a lantern, a sword |
| 7 `route to` | instant | — |
| 7a the two charts | instant | `startLocation` the Hesper's hold |
| 8 a new Locality | instant | `startLocation` the shoulder |
| 9 two holdings | instant | `funded()` and `title buy` twice, as `tracts.dirty.wire.test.ts` |
| 10 board; put to sea | instant | `stageShip` for the sea leg |
| 11 the headland; nothing pushed | instant | `stageShip` moves the Hesper out of sight while the watcher stands |
| 12 inside and outside a building | instant | Duncan Hall |
| 13 the Kestrel | **short** | launch a canoe at the put-in and wait for the patch to cross a Locality line; `advanceWorldClock` if the reach is long |
| 14 light, dark, hidden, low | instant | `testharness clock` to night; a hidden second character |
| 15 the you section | instant | `hand` a pole; the mule; `clone /system/transport/agent/draft-horse --here` |
| 16 sizes | instant | `bytesSince` |
| 17 restart | short | `restartWorld()` |
| 18 a second session | instant | — |
| 19 the firewall | instant | `NavClient`'s whole log against the set of places the character walked, saw, searched, read or was told |

No step needs a state nothing can stage.

## Risks & opens

1. ⚠ **The lounge has no door** (step 6) and **the Delve has no dark or
   low room** (step 14). The plan drives step 6 at the pump-house door and
   step 14 at the steading and an unlit Delve room at night. If the owner
   wants them where the script says, that is content this build was told
   it does not need.
2. ⚠ **`settlement`, not `city`** for a depth-2 Locality (D3). Grain;
   one constant to change.
3. ⚠ **At sea a claim records the sea and no position** (D2). The
   agreement said *the position on it*; a passenger's position at sea is
   the reckoning, which the requirements keep at the helm. On a river the
   km is recorded.
4. ⚠ **"The reach" is the river's name and km** (D10). A named reach needs
   a `LineFrame` read the water pack alone would implement.
5. ⚠ **Crowding and light are as of your last beat** (D7), not live.
6. ⚠ **The probe does not ask `beforeTraverse`**, and asks a place's veto
   only when the far side stands. Trying can therefore refuse where the
   way said yes, in a fight or at an unloaded veto. Every gate of the way
   and of the body agrees.
7. **Snapshot size** for a large map is unmeasured until W1. If one
   Locality document exceeds 256 KB on the wire, stop and bring the number
   — per-document chunking is already there; per-claim paging would be new.
8. **Two live sessions of one character** may not be supported by the
   harness or the server (`harbors` note). W1 settles it; if a second
   login replaces the first, step 18 becomes *a second login receives the
   same copy* and the owner is told.
9. **Moving the led-animal gate** reorders it ahead of `beforeTraverse` and
   destination resolution. The size-and-carrying drive (step 18) is the
   regression check.
10. **`recordPlace` rewrites the whole document** per look (shipped). The
    Locality claim adds one write per Locality **entry**, not per look.
11. **`ride <dir>`** may be broken today (Grounding). Step 15's mounted
    case depends on it.

Stop and ask rather than guess: any need for a second envelope type; any
gate ceiling that would have to rise; any section read that can only be
had from the location graph.

## Deferred seams

- **A remote way's door name and opening on edge claims (S8)** — attaches
  at `Cartographer`'s edge claim, beside `state` → navigation-server-slate.
- **Zone instancing** — `frameIdentityOf` and `laysOutOwnFrame` retire
  together; `mapSubject().at.zone` becomes `getZone()`'s path →
  zone-instancing-slate.
- **One horizon computation (S20)** — the horizon section's producer is
  `horizonFor`; the geography build changes that function only →
  geography-slate.
- **Movement in progress (S19)** — an eighth section on the same envelope
  → step-beat-slate.
- **The builder lens on the map** → map-slate.
- **A client that declines the copy** (a phone, an overlay) — a session
  capability read at `sendNavigationSnapshot` → client-knowledge-model-slate.
- **The room card's `exits` refreshing on a door** — `wayChanged()` is the
  seam → boundary-slate.
- **A named reach on `LineFrame`** → navigation-server-slate.

## Critical files

Read first, in this order:

1. `docs/requirements/navigation-server-requirements.md`
2. `lib/location/MapClaim.ts`, `lib/location/Cartographer.ts`,
   `platform/idea/api/NavigationLogic.ts` (`recordPlace`, `growMap`)
3. `lib/description/Perceiver.ts` (`whereabouts`, `learnSurroundings`)
4. `lib/connection/SaxonbergClient.ts` (`refreshNavigator`),
   `lib/message/Sensor.ts` (`onEnvelope`), `lib/character/Avatar.ts`
   (`enter`)
5. `lib/boundary/Exit.ts` (`wayRecord`, `canTraverse`, `clearanceRefusal`,
   `clearanceWords`), `platform/idea/api/LocomotionLogic.ts`
   (`canTraverseExit`), `lib/spatial/Mobile.ts` (`traverse`, `crossExit`)
6. `lib/location/FloorplanWarren.ts`, `lib/location/Warren.ts`,
   `platform/idea/ShipWarren.ts`, `lib/location/MovingPlace.ts`,
   `lib/expanse/Positioned.ts`
7. `api/mql-subscription.ts` (`SubscribableFieldDescriptor`,
   `projectFields`), `lib/boundary/Boundary.ts`, `lib/boundary/Lockable.ts`,
   `lib/spatial/Sealable.ts`, `platform/thing/Door.ts`
8. `platform/idea/api/GovernmentLogic.ts`, `platform/idea/Locality.ts`,
   `platform/idea/cmd/perception/LocateController.ts`,
   `platform/idea/cmd/movement/CourseReadoutController.ts`
9. `packages/types/src/index.ts` (`Whereabouts`, `WayRecord`, the envelope
   union, `Note`)
10. `packages/wire/src/harness/session.ts`, `world.ts`;
    `packages/wire/tests/size-and-carrying.dirty.wire.test.ts`,
    `boundary.dirty.wire.test.ts`, `tracts.dirty.wire.test.ts`
11. `packages/client/src/components/cards/NavigatorBody.tsx` (what must not
    break)

## Drive record

*(appended at build time)*
