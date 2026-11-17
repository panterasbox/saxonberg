# Navigation server pass — implementation plan

The server half of the navigation build: the server becomes able to tell a
client, **as data**, two things and never a third — *your knowledge* (your
map, kept as a copy on the client) and *what you perceive from here, now*
(seven sections) — and `locate` is retired. Executes
[navigation-server-requirements](../requirements/navigation-server-requirements.md)
(AGREED 2026-11-16). **Kind:** feature. **Lead end:** kernel-led; the
**first consumer of the new data is the wire drive** (the pane ships
later).

⭐ **Revised after owner review (2026-11-17).** The transport is no longer
a new envelope beside the old ones: it is **one subscription protocol for
every state push** (D1). MQL and forum subscriptions migrate onto it and
their envelope types are deleted; your map and where-you-are are two new
sources on it; the navigator card's payload push retires and the text
navigator reads the where-you-are subscription. ⚠ So this build **does
touch client code** — the client's subscription plumbing and the
navigator's data source — kept minimal and behavior-preserving.

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

### Wire paths that exist — state and events

Every server→client message, classified by the owner's rule (*one protocol
for state; events stay events*):

| message | what it is | class | this build |
|---|---|---|---|
| `mql-subscribe` / `-unsubscribe` → `mql-subscription-result` / `-delta` / `-error` | a standing query's records (`MqlSubscriptionRegistry`) | **state** | migrates (D1) |
| `forum-subscribe` / `-unsubscribe` → `forum-subscription-result` / `-delta` / `-error` | a board's entries (`ForumSubscriptionRegistry`) — the same shape, copied | **state** | migrates (D1) |
| `card-touched` with `payload: {kind:'navigation'}` | where you are, pushed by `refreshNavigator` | **state** wearing an event | retires (D1) |
| `client-state-update` + `connection-established.clientState` | a keyed settings store: a snapshot and whole-value replaces by key | **state** | **migrated** in W1 (owner, 2026-11-17: one mechanism for everything) |
| `client-state-write` | the client asking to change a key | a **request** | stays |
| `mql-query` → `mql-query-result` / `-error` | a one-shot read | request / response | stays |
| `dispatch-response`, `prompt`, `activity-update`, `reaction-delta`, `affordance-result` | something happened | **event** | stay |
| `card-opened` / `-touched` / `-arranged` / `-closed` / `-pinned` | the card lifecycle | **event** | stay |

⭐ **Why events stay events.** A subscription keeps a copy current: it has a
snapshot, and a reconnect is repaired by asking for the snapshot again. An
event has no copy to keep — a dispatch outcome, a prompt, an engagement's
progress, a reaction tally flush and a card being born or closed are each
said once, to whoever is there. Re-sending them on reconnect would repeat
history, not repair state. (The card SET is server state on the
`CardRegistry` and is rebuilt by the arrangement, never replayed —
`card-surface.md § Reconnect behavior`.)

What the two shipped subscription paths are, verified:

- **Emit sites are few.** `MqlSubscriptionRegistry.ts:429` (result), `:957`
  (delta), `:1078` (error); `ForumSubscriptionRegistry.ts:184`, `:544`,
  `:565`. Each registry keeps its own per-`Interactive` id table and its own
  `cancelAllForInteractive` (`Interactive.ts:489`, `:510`).
- **Inbound:** `backend/inbound/mql.ts` (`handleMqlSubscribe`,
  `handleMqlUnsubscribe`, `handleMqlQuery`),
  `backend/inbound/forumSubscription.ts`, registered in
  `backend/inbound/index.ts:56-60`.
- ⭐ **A live card holds an MQL subscription the SERVER opens.**
  `CardRegistry.ts:1237` calls `MqlSubscriptionApi.handleSubscribe({…,
  silent: true})`: the first answer rides `card-opened.result`, the
  `instanceId` **is** the subscription id, and later changes ride
  `mql-subscription-delta`. The client's `useCardFeed.ts:214` listens for
  that delta type.
- The one subscription the client opens for itself is `chrome: 'self'`
  (`MqlSubscribeMessage`, `packages/types/src/index.ts:1192`); the message
  has no field that names a card, by design.
- **Client:** `packages/client/src/services/websocket.ts` sends
  `mql-subscribe` (`:799`, `:830`), `mql-unsubscribe` (`:847`),
  `forum-subscribe` (`:809`, `:888`), `forum-unsubscribe` (`:900`), replays
  them on reconnect, and routes `mql-subscription-result` / `-delta`
  (`:1170`, `:1176`); listeners in `components/frame/Shelf.tsx:549`,
  `components/cards/useCardFeed.ts:214`, `store/forumActions.ts:55-64`.
- **Harness:** `packages/wire/src/harness/session.ts:590`, `:952`
  (`Session.subscribe`), `packages/wire/tests/world-scan.dirty.wire.test.ts:116,151`.
- `Sensor.onEnvelope(template)` sends to every session of a body;
  `Interactive.sendEnvelope(template)` to one.
- `BroadcastFeed` (`backend/BroadcastFeed.ts`) forwards an allowlist only.
- ⚠ `backend/inbound/README.md` advises against folding ops into one
  envelope and against a generic key-routed **write** channel. The owner's
  decision supersedes the first for subscriptions (the README is amended in
  W1); the second stands — the protocol is read-only.

The `map` card is `source: { kind: 'payload', producer: 'navigation' }` in
`lib/connection/Cards.ts:436`.

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
  for a null-medium mode, `Exit.ts:1185`). W4 checks it first.

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
two live sessions of one body — W2 settles which is true.

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
| 14 | ⚠ **the Delve authors no dark room and no low room** | W5 verifies whether an unlit Delve room at night already reads pitch dark; the low room is the steading's cottage / charcoal pit; a row is authored only if neither reads so |

## ⭐⭐ New substrate

No new collection, document kind or verb. One new Api, one new mixin and
two new classes — all four are the subscription protocol, which **replaces
two copies of itself** (ten wire types deleted, five added).

| # | addition | ledger row | why |
|---|---|---|---|
| N1 | the subscription protocol on the wire: `subscribe`, `unsubscribe`, `subscription-result`, `subscription-delta`, `subscription-error` | *the push* · *live results* — **generalize both** | the MQL and forum trios are one shape copied twice; a third copy for the map was the first draft's mistake. The ten old types are deleted (D1). |
| N2 | `SubscriptionApi` (`api/subscription.ts`) over `SubscriptionRegistry` (`platform/idea/`) | *live results* — **genuinely new as a class, extracted from two** | holds what both registries each hold: the per-session id table, `rev`, the three emits, disconnect cleanup. Searched: `MqlSubscriptionRegistry`, `ForumSubscriptionRegistry`, `CardRegistry`, `ReactionRegistry` — no shared base exists. |
| N3 | `SubscriptionSourceMixin` (`lib/subscription/SubscriptionSource.ts`) | *live results* — genuinely new | the provider protocol on the model side; four implementers on day one (D1) |
| N4 | `MapCopySource`, `WhereaboutsSource` (`platform/idea/`) + their rows | *the push* — generalize `refreshNavigator` | the two new sources; each holds what it last sent |
| N5 | `aspect?: 'way'` on `SubscribableFieldDescriptor`, and descriptors on `Sealable`, `Lockable`, `Door`, `Boundary`, `Window` | *boundary projection* (none existed) → **generalizes** *live results* | the shipped per-mixin projection, tagged; a pack's boundary mixin declares its own, no hook (D9) |
| N6 | fields on `MapClaim` (`at`, `state`, `via`, `government`, `localityKind`) and the claim kind `locality` | *a claim* — extend, no new writer | D2–D4 |
| N7 | `Place.mapSubject()`, overridden by `MovingPlaceMixin` | *a claim* · *copy identity* | the place says what a claim about it names and where it is; two implementers (D2) |
| N8 | `Warren.frameIdentityOf(member)`, implemented by `FloorplanWarren` | *copy identity* | the public face of `zoneFromFor`; same shape as `mintedKeyOf`; retires with `laysOutOwnFrame` at zone instancing (D2) |
| N9 | `Perceiver.navigation(names)`, `Perceiver.learnReckoning(craft)` | *the push* (`whereabouts`) — generalize | the one composer of the sections; `whereabouts()` retires with its card payload (D1, D7). The reckoning is a third `learn*` beside the two shipped (D2). |
| N10 | `SaxonbergClient.refreshNavigation(names?)`, `mapChanged(changes)` — **no state** | *the push* (`refreshNavigator`, which is deleted) | the body's own verbs that poke its sources (D7) |
| N11 | `Exit.wayFor(viewer)`, `Exit.wayChanged()`, the `probe` option on `Exit.canTraverse` / `LocomotionApi.canTraverseExit` / `beforeTraverse`, and `works` · `flee` · `unseen` on `TraversalGuard` | *a way* — extend | D8 |
| N12 | `Locality.getKind()` (derived), `Locality._learnable` (authored) | *Locality chain* | D3 |
| N13 | `SpatialZone.frameFacts()` | *zone facts* — read only, made a method | three implementers (D7) |
| N14 | `Voyaging.lies()` | *ship position* — moved off `LocateController` | D10 |
| N15 | `Note` kind `route-plan` | *route* | D5 |
| N16 | wire types `TaggedPath`, `NavSections`, `WireClaim`, `WireRoutePlan`, `SubscriptionChange` | *spoilers* — reuse the level vocabulary | D6 |
| N17 | `NavClient` in the wire harness; `restartWorld()` lifted into it; `Session.subscribe(source, params)` | — test tooling | D12 |

**Deleted:** `MqlSubscribeMessage`, `MqlUnsubscribeMessage`,
`MqlSubscriptionResultEnvelope`, `MqlSubscriptionDeltaEnvelope`,
`MqlSubscriptionErrorEnvelope`, the five `Forum*` twins, `CardPayload`'s
`navigation` arm, `Whereabouts` as a wire type,
`SaxonbergClient.refreshNavigator`, `Perceiver.whereabouts`,
`LocateController`.

## Plan-level decisions

### D1 — Transport: one subscription protocol for every state push

**Question.** How the copy and the sections reach the client regardless of
the `map` card — and, from the owner's review, why a new push mechanism
should sit beside the old ones at all.

**Choice.** It does not. One protocol; sources behind it.

```ts
// client → server
{ type: 'subscribe';   subscriptionId: string; source: string; params?: unknown }
{ type: 'unsubscribe'; subscriptionId: string }
// server → client
{ type: 'subscription-result'; frameId; subscriptionId; rev: number; snapshot: unknown }
{ type: 'subscription-delta';  frameId; subscriptionId; rev: number; changes: SubscriptionChange[] }
{ type: 'subscription-error';  frameId; subscriptionId; reason: string; detail?: string }

interface SubscriptionChange { op: 'add' | 'replace' | 'update' | 'remove'; key: string; fields?: unknown }
```

`snapshot` and `fields` are typed per source in `packages/types` (a
`SubscriptionSources` map from source to `{ params, snapshot, fields }`),
so the client and the harness narrow on the source they asked for.

**`rev`.** Per subscription, stamped by the registry: the result states it,
each delta is `rev + 1`. A WebSocket neither drops nor reorders inside a
connection and the registry never drops, so a break in `rev` is a defect to
report, not a repair path. Repair is always the same act: subscribe again,
get a snapshot. That covers a gap, a reconnect and a restart (a restart is
a reconnect), and a second session is simply its own subscriptions.

**The provider contract** — `SubscriptionSourceMixin`, composed by a
singleton `Idea`:

```ts
interface SubscriptionSource {
  /** Answer the snapshot, or refuse in a word. May be async. */
  openSubscription(sub: Subscription, params: unknown): Promise<unknown | SubscriptionRefusal>;
  /** The subscriber is gone. */
  closeSubscription(sub: Subscription): void;
  /** Somebody says this holder's feed may have changed (the body's own poke). */
  pokeSubscriptions(holder: Stuff, hint: unknown): void;
}
```

A `Subscription` is the registry's handle: `id`, `interactive`,
`holder()`, `push(changes)` (stamps `rev`, sends the delta), `fail(reason)`
(sends the error and closes), and a `state` slot the source owns. The
source never builds an envelope and never keeps an id table.

**Where providers live, and how one is found.** A source is named on the
wire by **its template path**, and the registry loads it on use
(`StuffApi.singleton`) — there is no list of sources, in the kernel or
anywhere, for a pack to edit. Before loading, the registry reads the row's
class and refuses (`reason: 'source'`) unless it composes
`SubscriptionSourceMixin`, so a client cannot make the server stand up an
arbitrary singleton. A pack's source is a class under its own root and a
row; nothing in the kernel changes.

| source (path) | class | params | snapshot | change key |
|---|---|---|---|---|
| `/platform/idea/MqlSubscriptionRegistry` | shipped; composes the mixin | today's `MqlSubscribeMessage` fields (`query`, `cardinality`, `fields`, `detailKey`, the two dependency flags, `chrome`) | the records | the record's key, as today |
| `/platform/idea/ForumSubscriptionRegistry` | shipped; composes the mixin | `{ scope }` | `{ scope, records }` | the entry's key, as today |
| `/platform/idea/MapCopySource` | new | `{ locality?: string }` — a prefix; absent = the whole map | `{ documents: { locality, claims: WireClaim[] }[] }` | `` `${locality}|${claimKey}` ``, always `replace` |
| `/platform/idea/WhereaboutsSource` | new | none | `{ sections: NavSections }` | the section's name, always `replace` |

The two shipped registries keep their class names and paths (a rename is
its own sweep); only their wire half moves.

**Migration, with no compatibility layer.**

- Server: the three emits in each registry become `sub.push` / the
  returned snapshot / `sub.fail`; their per-session tables and
  `cancelAllForInteractive` halves go to `SubscriptionRegistry`
  (`Interactive.ts:489,510` become one call). Dependency indexing, the
  dirty-set scheduler, diffing and forum projection are untouched.
- Inbound: one `backend/inbound/subscription.ts` (`subscribe`,
  `unsubscribe`); `forumSubscription.ts` and the two subscribe handlers in
  `mql.ts` are deleted; `mql-query` stays where it is.
- ⭐ **Live cards.** `CardRegistry` keeps opening its subscription on the
  server — now `SubscriptionApi.open(interactive, instanceId, source,
  params, { silent: true })`: the snapshot rides `card-opened.result` as it
  does today (it is `rev` 0), and changes ride `subscription-delta` under
  the `instanceId`. The protocol still gives the client no field that names
  a card: `params` for the MQL source is the old message's body, unchanged.
- Client: `websocket.ts` sends and replays `subscribe` and routes the three
  server types by `subscriptionId` to whoever opened it; `Shelf.tsx`,
  `useCardFeed.ts` and `forumActions.ts` change the type they listen for
  and read `snapshot` where they read `result` / `records`. No component
  renders differently.
- The ten old types are deleted from `packages/types`; a stale client
  fails to compile rather than half-working.

**The two new sources, and the navigator.**

- The client subscribes to both **at session start** (the same place it
  opens `chrome: 'self'`) and replays them on reconnect. That is the whole
  of *flows without a card*.
- `refreshNavigator`, its four call sites, the `navigation` arm of
  `CardPayload` and `Perceiver.whereabouts()` are deleted. The `map` card
  becomes a card with no payload whose body (`NavigatorBody.tsx`) reads the
  where-you-are sections from the store. ⭐ To keep the client change
  minimal, one selector builds today's `Whereabouts` shape from the
  sections and `NavigatorBody`'s rendering is untouched; the type moves to
  the client.
- The map copy is held in a store slice and rendered by nothing until the
  pane ships.
- Nobody else's map can be asked for: `MapCopySource` reads
  `sub.holder()`'s own map key and takes no owner parameter.

**Why not keep the first draft's single `navigation-update` envelope:** it
was a third copy of result-and-delta. **Why not `client-state-update`:**
whole-value replace by key, no deltas, no `rev`; it is itself state that
belongs on this protocol later.

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
  and on a line `at.line = { course, km }` rounded to 0.1 km. One claim per
  river per Locality document, bumped as you drift; never the patch.
- **At sea** (the owner, 2026-11-17). The sea is one claim: `place` the
  expanse's row, filed where a chart of that sea files (the rule in
  `Charted.ts`'s `localityOf`, lifted to a method on `Expanse` so both
  writers share it).
  - **A passenger's** claim records the sea alone — `at.zone`, no
    position. Written by the cartographer when it records a place aboard a
    craft on a chart, or a sea patch.
  - **Whoever takes the reckoning** writes it: `at.geo = { latDeg, lonDeg }`,
    `at.reckoned: true`, `at.errorNm` (`craft.reckoningUncertaintyNm()`) and
    the stated bracket in the reader's words. Taking the reckoning is the
    bare `course` at the helm by somebody who may steer her (D10):
    `CourseReadoutController` calls `reader.learnReckoning(craft)` — a third
    `learn*` on `Perceiver` beside `learnSurroundings` and `learnTimetable`
    — which hands the cartographer the reckoning. `reckoned` is in the
    growth key, so the helm's claim sits beside the passenger's, and it is
    never the true position.
  - ⚠ One reckoned claim per sea: the first reckoning's position, bumped
    after. A track of reckonings is the *your map grows* build's trail.
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
  absent. It replaces `whereabouts()`, which is deleted with the card
  payload (D1); the weather, season and daylight it carried move into the
  place section, and the cell into the place section's `at`.
- **One flush per beat, in the source.** The body says
  `refreshNavigation(names?)` (a method on `SaxonbergClient` that pokes
  `WhereaboutsSource`). The source adds to a dirty set per holder and arms
  one `ScheduleApi.schedule(0, …)`; the flush computes the dirty sections
  **once per holder**, compares each with what each of that holder's
  subscriptions was last sent (canonical JSON, kept in `sub.state`), and
  pushes one delta per subscription holding only the sections that differ.
  A recompute in flight absorbs later marks into the next flush. A holder
  with no subscription costs nothing.

| trigger | site | sections marked |
|---|---|---|
| arrival (walk, teleport, forced) | `Mobile.ts:580`, `:1232` | all seven |
| a subscription opens | `WhereaboutsSource.openSubscription` | the snapshot |
| your own command completed | `emitDispatchResponse` | `you`, `ways`, `place` |
| a way you can see changed state | `Exit.wayChanged()` (D8) | `ways` |
| the place you are in moved | `MovingPlaceMixin.onFrameMoved`; `Voyage.beat` | `localities`, `zone`, `place` |

- ⛔ **`horizon` is marked only by arrival and by a snapshot.**
- ⚠ Crowding and light are read on your beats, not when somebody else
  walks in — the room card is the live view of the room. See Risks.
- ⚠ The navigator now refreshes on every trigger, not only on a move — so
  the text navigator's ways update when a door you can see opens. A
  behavior change, and a wanted one; in Risks.
- **Measure before fixing.** W2 sends the sections as today's reads give
  them and records sizes here; W5 fixes the shapes; step 16 records the
  final numbers.

Section contents (words wherever the game has words):

- **zone** — `{ id: TaggedPath, kind: 'grid'|'sphere'|'chart'|'water',
  cellSizeM?, label }` from `SpatialZone.frameFacts()`; in a copy, the
  copy's identity and its zone's cell. Never extent or levels.
- **localities** — `{ chain: { name, address, kind?, government? }[],
  ship?: { name }, outer?: Lie, jurisdiction: { key, name }[] }`.
- **horizon** — `{ atSea, things: { stuffId, name, landmark, glance?:
  { point, closeBy?, roughMiles? } }[], traffic }`, landmarks first — the
  rough direction and miles `scan horizon` says (`PerceptionApi.glance`),
  ⛔ **never `bearingDeg`**: a precise bearing is `measure bearing`'s skill
  (geography plan § Sibling builds; lens 1). Its drive asserts no envelope
  carries a bearing in degrees.
- **building** — inside: `{ name, storey?, storeys, entrance?, heightM,
  landmark, titleSold }`; `entrance` is `{ here: true }` or, when your map
  holds it, its name and the first direction of `routeOnMap` to it.
  Outside: `{ landed: { name, landmark }[] }`.
- **ways** — `Exit.wayFor(viewer)[]` (D8, D9): the `WayRecord` fields the
  navigator reads today, plus `oneWay`, `muffled`, `needs`, `lengthM?`,
  `opening?`, `facts`, and `take`.
- **place** — `{ stuffId, name, at?: { x, y, z }, light, dark, openSky,
  weather?, season?, daylight?, water?, staged, crowd, lowCeiling,
  elevationM?, searched, found }` — `elevationM` is the **total**: the
  zone's elevation plus the room's height within it (z × cell size; owner,
  2026-11-17). Read it as geography's `Place.heightAboveSeaM()` once
  geography merges; until then the zone's elevation alone
  (`ZoneApi.elevationFor`, which stays the GROUND's elevation — wells, taps
  and the stairwell test are about the ground, and geography does not
  change it).
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
  materializing answers `{ ok: true, unseen: true }` (below). Derived-cache refreshes and loads stay (they
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
- **The verdict has three honest forms** (the owner, 2026-11-17), so it
  never says a bare *yes* it cannot keep:

  ```ts
  take:
    | { ok: true; flee?: true; unseen?: true }
    | { ok: false; gate: string; reason: string; works?: Works }
  ```

  - **`flee`** — leaving is fleeing. `beforeTraverse(exit, { probe: true })`
    is asked: `Combatant` answers `{ ok: true, flee: true }` without
    disengaging (the real call still disengages and may draw a parting
    shot); `Beast`'s floor check is already a pure read and answers as it
    does for `go`. Every way out of a fight says *you would be fleeing*.
  - **`unseen`** — *as far as you know*. The far side is not standing, so
    what only it can say was not asked: its `canEnter` veto, a berth's
    sleeping ship, a patch not yet minted. Loading it to ask would break
    load on use and wake the world on every push. The way says yes, as far
    as you know.
  - A plain `{ ok: true }` therefore means every gate `go` runs was run.
- **Place vetoes** (`canExit` / `canEnter`) are asked whenever the far side
  is standing.
- **Cost.** Sync gates plus one clearance measure per way; W4 measures the
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
- Jurisdiction is `GovernmentApi.subjectTo(place)`: fixed in
  `whereabouts()` in W0, and carried as the whole chain in the localities
  section; the client's `Whereabouts` selector takes its first name, so
  the card reads as before ashore and correctly aboard.
- `CourseReadoutController` asks `craft.mayBeSteeredBy(giver)` before the
  reckoning; otherwise it refuses with the steer's sentence. A reckoning
  given is a reckoning learned (D2).

### D11 — `locate` retired

Delete the controller, the view, the controller row and the contribution;
rewrite the three tests' `locate me` reads to `course` at the helm (or to
the `localities.outer` assertion); fix the docs and comments listed in
Grounding. `MovingPlace.alongsideCraft()` stays (the patch's own read).

### D12 — The wire harness

`Session.subscribe(source, params)` replaces the MQL-only one (its callers
pass the MQL source). `NavClient` (`packages/wire/src/harness/nav.ts`), one
per `Session`, subscribes to the two new sources at open exactly as the
client does, and is fed their results and deltas **before** the per-command
capture is cleared: it holds the sections, the copy keyed by change key,
the last `rev` of each, and an uncapped log. It offers `section(name)`,
`claims(filter)`, `sentSince(mark)` (which sections a step sent),
`bytesSince(mark)`, `assertContiguous()`, and `assertAllPathsTagged()` (a
recursive scan: no bare string matching a namespace root outside a
`TaggedPath`). `restartWorld()` is lifted from the two tests that carry it
into `packages/wire/src/harness/world.ts`.

## ⭐⭐ Host placement

| addition | host | what it claims about the host's other composers |
|---|---|---|
| the per-session subscription table, `rev` | `SubscriptionRegistry` (singleton `Idea`, runtime fields, `private` not `#`) | one host. State survives an HMR of the Api, as `MqlSubscriptionRegistry`'s does. |
| the provider protocol | `SubscriptionSourceMixin` on four singletons | every composer is a source and means all three methods. `pokeSubscriptions` is a no-op only where a source wakes itself (MQL's event index, the forum's ledger) — two of four; they say so in one line each. |
| what was last sent; the dirty set | `WhereaboutsSource` / `MapCopySource` (in `sub.state` and a runtime `Map` declared non-persistent in `fieldMeta`) | each source is its own host. |
| `refreshNavigation`, `mapChanged` — no fields | `SaxonbergClientMixin` | every composer is a body with sessions. A body nobody subscribed for pokes into nothing. |
| `navigation(names)`, `learnReckoning(craft)` | `PerceiverMixin` | every perceiver can answer *what do I perceive here*; an NPC is never asked. No state. ⚠ If `lint:mixin-clusters` splits it, the composer moves beside `SaxonbergClient` rather than the ceiling rising. |
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
- **Client** — no new component; `websocket.ts`, three listeners, one
  store slice and one selector.
- **Module scope** — no module-scope statements; the flush is armed through
  `ScheduleApi`.
- **Import boundary** — `Perceiver` keeps its lazy Api imports; the map
  path still never imports the graph (`lint:graph-walks`).
- **Module categories** — no new category, no free helper. `SubscriptionApi`
  is an Api (ends `SecurityApi.decorateApiClass`), its state a singleton
  `Idea` gated `FromModule('/api/subscription#SubscriptionApi')`, the mixin
  in `lib/subscription/` with a `Mixins.SubscriptionSource` constant, the
  two sources flat in `platform/idea/` with rows in the platform pack.
  `NavClient` is harness code outside `src/mud`.
- **Verbs on objects** — every new read is a method on its subject; no new
  Api static takes a world object first (`lint:object-verbs`).
- **P3 refuse/skip/throw** — a section read that fails leaves the field
  absent and warns once per kind; a way whose far side cannot be asked says `unseen`; a
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
- **P7 load on use** — no boot entry and no source list: a source is
  loaded by the `subscribe` that names it; the snapshot reads the map by
  path prefix; a Locality is reached through the coverage chain.
- **P8 names** — `subscribe`, `subscription-result`; `SubscriptionSource`
  for the protocol; `MapCopySource`, `WhereaboutsSource` for what they are
  the source of; `mapSubject`, `frameIdentityOf`, `wayFor`, `lies`.
- **P9 predictable from the def** — no command gains hidden behavior.
  `course`'s help gains *"at her helm, by her master"*; `route`'s def is
  unchanged (a note is not an act).
- **P10 metadata as a document** — the Locality kind words are a wire
  vocabulary (three constants), not rows; nothing new is an `Idea`.
- **P11 no caller branches on the destination** — `mapSubject()` is the
  place's own answer; the cartographer calls one method.
- **P12 no synonym** — the old envelope types are deleted, not aliased;
  `refreshNavigator` is deleted, not kept beside `refreshNavigation`;
  `wayFor` contains `wayRecord`, it does not rename it.
- **P1 for the protocol** — a mixin with four implementers and an Api
  holding one concept that two registries each held a copy of. A provider
  with one method would be a method in the wrong place; this one is the
  open / close / poke every source needs.
- **P2 for the protocol** — in Host placement.
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
`lint:thin-forwarder`, `lint:mixin-names`, `lint:mixin-files`,
`lint:instanceable`, `lint:data-ideas`, `lint:pm`. No ceiling rises without a caller audit.

## Waves

Each wave ends at one commit, passes `pnpm test:near`, the touched
packages' own suites and `lint:family`, and is landable alone.

### W0 — `locate` retired; the jurisdiction aboard ✅

> **Done.** `lies()` on `VoyagingMixin` (river + sea) with `Ship` adding the
> berth; the `Lie` type lives in `packages/types` (the localities section's
> `outer` will carry it). The helm gate moved to `CourseControllerBase` and
> the readout uses it for sea AND river (a small boat answers anyone). The
> two wire `locate me` reads in a dinghy were dropped, not rewritten — a
> body in a boat beside her has no helm; where it lies is the subscription's
> to say (W5). `lint:controller-decisions` re-pinned 508→506.

D10 (jurisdiction, `course`), D11.

- Delete `LocateController.ts`, `locate.yaml`, `LocateController.yaml`, the
  `Perceiver.ts:354` contribution.
- `Voyaging.lies()` + `Ship` override, with the wording
  `LocateController.whereSheLies` had.
- `Perceiver.whereabouts()` (alive until W2):
  `GovernmentApi.subjectTo(place)`; `place.structure()` in place of
  `structureAtNow(templatePath)`.
- `CourseReadoutController`: the `mayBeSteeredBy` gate.
- Tests and docs per Grounding.

**Acceptance.** `locate me` is an unknown verb over the wire; `course` at
the Hesper's helm gives the reckoning to her master and refuses a
passenger; with the `map` card open aboard, the card's jurisdiction is the
port. **Commit:** `feat(navigation): retire locate; the jurisdiction aboard is government's`.

### W1 — One subscription protocol; MQL and forums move onto it (first commit ✅)

> **MQL + forums done.** Decisions the build made:
> - **The session's verbs live on `Interactive`** (`subscribe`,
>   `cancelSubscription`, `cancelAllSubscriptions`, `hasSubscription`), not on
>   `SubscriptionApi`: `lint:object-verbs` refuses an Api static whose first
>   parameter is a world object. `SubscriptionApi` keeps `poke` (and a test
>   count). `SubscriptionRegistry` admits the Api and `Interactive`.
> - **Delivery is per SESSION** (`interactive.sendEnvelope`), not
>   `holder.onEnvelope` (every session of the body): a second session must
>   never see another's `rev`s. Test capture moved to the session.
> - **A source's open may be sync**: a live card opens synchronously and
>   needs the MQL source standing, so `CardApi.needs` names it (stood at boot).
>   A suite stands it through `MqlSubscriptionApi._clearAllForTesting()`.
> - Each source keeps its own internal index (MQL's dependency index and
>   `cancelAllForScope`, the forum's board/thread index); the registry's table
>   is the protocol's, the source's is what the subscription MEANS.
>   `sub.end()` is the source closing quietly (holder gone, a circle reaped);
>   `sub.fail()` sends the error and closes.
> - Error reasons: `duplicate` and `source` are the registry's; the rest
>   (`parse`, `resolve`, `permission`, `closed`) are each source's own.
> - Risk 16 resolved: `StuffApi.classForRef` reads a row's class (loads the
>   module, instantiates nothing).
> - The client keeps `subscribeMql` / `subscribeForum` as the two shipped
>   sources' typed doors onto one `subscribe(source, params)`;
>   `unsubscribeForum` is gone (one `unsubscribe`).
>
> **Second commit ✅ — client state and the press ticker.**
> - `ClientStateSource` and `PressFeedSource` (platform/idea, rows in the
>   platform pack). The SERVER opens both for every played session at entry,
>   silently (ids `SESSION_SUBSCRIPTIONS.clientState` / `.pressFeed`), and
>   their snapshots ride `connection-established.clientState` /
>   `.releaseWindow` — so the settings' first render is unchanged. Changes
>   ride `subscription-delta`.
> - `pushClientStateUpdate(key, value)` is now a poke; the boot-time DI seam
>   (`setClientStateUpdatePush`, a sanctioned `eslint-disable` exception) and
>   `client-state-update` are gone. The press fan pokes with a `null` holder
>   (the answer is everyone's): `pokeSubscriptions(holder: Stuff | null, …)`.
> - Nothing else turned up as state wearing an event (the card lifecycle,
>   prompts, activity, reactions and dispatch stay events).

D1 (the protocol and the migration only — **no new source yet**).

- `packages/types`: the five protocol types, `SubscriptionChange`,
  `SubscriptionSources` with the MQL and forum entries; delete the ten old
  types.
- `api/subscription.ts`, `platform/idea/SubscriptionRegistry.ts` (+ row),
  `lib/subscription/SubscriptionSource.ts`, `Mixins.SubscriptionSource`,
  `MixinApi.isSubscriptionSource`.
- `MqlSubscriptionRegistry` and `ForumSubscriptionRegistry` compose the
  mixin; their emits, id tables and disconnect halves move as D1 says.
  `MqlSubscriptionApi.handleSubscribe` / `handleUnsubscribe` and the forum
  twins lose their wire-facing halves; `handleQuery` is untouched.
- `CardRegistry.ts:1237` opens through `SubscriptionApi.open(…, { silent:
  true })`.
- `backend/inbound/subscription.ts`; delete `forumSubscription.ts` and the
  two handlers in `mql.ts`; `index.ts`; amend `inbound/README.md`.
- Client: `services/websocket.ts`, `components/frame/Shelf.tsx`,
  `components/cards/useCardFeed.ts`, `store/forumActions.ts` and their
  tests.
- Harness: `Session.subscribe(source, params)`; `world-scan` test's two
  type assertions.
- ⭐ **Every other state push moves too** (owner, 2026-11-17: *"one
  mechanism that works for everything"*): `client-state-update` (with
  `connection-established.clientState` as its snapshot) becomes a
  `ClientState` source, `client-state-write` staying the request; the
  press ticker's `releaseWindow` + `publication.press` becomes a source.
  Classify anything else that turns up the same way; events stay events.
  Land these as a second commit inside W1 after MQL and forums are green.
- `packages/rodney`: verified 2026-11-17 — its `src/` speaks none of the old
  types; only `PLAN.md` names them (update the prose).

**Acceptance — nothing changed.** Green, with assertions changed only
where they name an envelope type or the `result`/`records` field: the
`api/__tests__/mql-subscription.*.test.ts` and `card-*.test.ts` families,
`Application.mql-subscribe.test.ts`, `ForumSubscriptionRegistry.test.ts`,
`inbound/__tests__/forumSubscription.test.ts`,
`lib/sandbox/__tests__/escape/subscriptions.escape.test.ts`; the client
suite (`pnpm -C packages/client test`); the wire tests `world-scan`,
`client-surface`, `boundary`, and the forum wire test; `e2e` `shelf`,
`inspect`, `panes`, `cockpit`. New unit tests: `rev` contiguity; a source
path whose class does not compose the mixin is refused **without being
loaded**; disconnect closes every subscription of every source. Grep
proves no `mql-subscri` / `forum-subscri` / `client-state-update` string is
left in `src`; the client's settings render first as before (the first-
render ordering the old snapshot gave).
**Commit:** `refactor(subscription): one protocol for state pushes; MQL and forums move onto it`.

### W2 — Your map and where-you-are, as sources ✅

> **Done.** Decisions the build made:
> - **A map write pokes by OWNER KEY, not by body** (`poke(mapCopy, null,
>   {ownerKey, locality, claims})` from `recordPlace`): a shade files under
>   the person it is worn by, and no body lookup is needed. So there is no
>   `SaxonbergClient.mapChanged`; `refreshNavigation(names?)` is the body's
>   only new verb (N10 shrinks to one method).
> - **The wire projection stays inside `NavigationLogic`** (`wireClaim`,
>   private; the poke carries projected claims; `NavigationApi.readMapCopy`
>   reads the snapshot): `lint:object-verbs` counts `MapClaim` as a world
>   object, so no Api static takes one.
> - `MapClaim` gained its W3 fields (`at`, `state`, `via`, `viaName`,
>   `government`, `localityKind`, kind `locality`) as TYPES now; W3 writes
>   them. `route` skips `locality` claims.
> - The `map` card is `source: { kind: 'client' }`; the client renders it
>   from the store (`NavigatorCardBody` → `whereaboutsOf(sections)`), and
>   `Whereabouts` moved to `client/src/store/navSlice.ts`.
> - The client replays EVERY subscription as unsubscribe-then-subscribe on
>   each connection-established (a welcome re-sent on the same socket after
>   the sandbox crossing would otherwise be refused as a duplicate).
> - The section differ stores the unstamped JSON; `v` is per section per
>   subscription, 1 on the snapshot.
> - ⚠ The drive steps, the multi-session question and the size record are
>   run at W7 against one standing world (one boot, not one per wave).

D1 (the new sources, the navigator), D6, D7 (first shapes), D12.

- `platform/idea/MapCopySource.ts`, `WhereaboutsSource.ts` + rows;
  `SubscriptionSources` entries; `TaggedPath`, `WireClaim`, `NavSections`.
- `Perceiver.navigation` with `localities`, `building` (name), `ways`
  (`wayRecord` + destination), `place` (name, cell, conditions) — every
  field the navigator reads today.
- `SaxonbergClient.refreshNavigation`, `mapChanged`; delete
  `refreshNavigator` and its call sites (`Mobile.ts:580,1232`,
  `ClientLayoutRecallController.ts:60`, `CockpitModeController.ts:127`,
  `openArrangement`); delete `Perceiver.whereabouts`, the `navigation` arm
  of `CardPayload`, and make the `map` card payload-free in `Cards.ts`.
- `NavigationLogic.growMap` returns the changed claims; `recordPlace` finds
  the live body by `viewerKey` and calls `mapChanged`.
- Client: subscribe to both at session start; a nav store slice; the
  `Whereabouts` selector; `NavigatorBody.tsx` reads the selector.
- Harness: `NavClient`, `restartWorld()`.
- Settle multi-session: one test opens two sessions of one character.

**Acceptance.** `packages/wire/tests/navigation-server.dirty.wire.test.ts`
steps 2, 3 (without positions), 17, 18, 19 and the gap case (a session
dropped while a second moves, then reopened, equals the second). The text
navigator shows what it showed: `e2e/tests/navigation-server-walk.spec.ts`
(open `map`, walk, board the Hesper) and the `client-surface` and
`boundary` wire tests' card assertions, rewritten to read the
subscription. **Record the measured sizes in this plan** — a snapshot of
sections, a typical move, a map snapshot — and re-check them against the
MQL shelf subscription's for scale. **Commit:** `feat(navigation): your map and where you are, as subscriptions; the navigator reads one`.

### W3 — What a claim knows ✅

> **Done.** `Place.mapSubject()` (+ `MovingPlaceMixin` override),
> `Warren.frameIdentityOf` / `FloorplanWarren` (zone-instancing has not
> merged — the sibling rule applies when it does), `Expanse.mapLocality()`
> (the one filing rule for a chart, a passenger's sea and a reckoning),
> `Locality.getKind()` / `_learnable`, `Perceiver.learnReckoning` →
> `Cartographer.recordReckoning`, called by the helm's readout. Decisions:
> - The reckoned claim's channel is `seen` (it is what the navigator made out
>   at the helm); `reckoned` in the growth key keeps it beside a passenger's.
> - A Locality claim is written when the covering chain CHANGES (a runtime
>   field on the cartographer), for every Locality in the chain — the first
>   visit appends, later entries bump.
> - `map` (the verb's rendering) skips Locality claims, so it says what it
>   said; `route` skips them too.
> - `recordTimetable` and `recordTraversal` now warn instead of swallowing.

D2, D3, D4.

- `MapClaim` fields; `Place.mapSubject`; `Warren.frameIdentityOf` +
  `FloorplanWarren`; `MovingPlaceMixin` override.
- `Cartographer`: positions, edge `state`, the walked place claim, the
  Locality claim, the sea claim; `Perceiver.learnReckoning` and its call
  in `CourseReadoutController`; `Expanse` gains the chart's filing rule;
  `Charted`: `at.zone`, `via`; `PublishedStop.at`.
- `growMap`: `state`, `via` and `reckoned` in the key; the `at` fill rule.
- `observePlace`: nothing written in the dark.
- `Locality.getKind`, `_learnable`.
- `MapController` renders unchanged — verify `map` and `route` say what
  they said (their tests, plus one that reads a map with the new fields).

**Acceptance.** Steps 2–5, 7a, 8, 9; at sea, the master's `course` writes a
claim with `reckoned`, a position and an error, and a passenger's copy
holds the sea with no position (asserted in step 10). Unit tests for
`growMap` (state appends, `at` fills, never rewrites), `frameIdentityOf`
(holding, ship of a kind, mine → `null`), `mapSubject` (plain keyed room,
persistable room, patch). **Commit:** `feat(navigation): a claim records where the place is, and what you saw`.

### W4 — The ways ✅

> **Done.** Decisions the build made:
> - **The mode words its own refusals** (`LocomotionMode.refusals`, a row
>   field — fly, ride, climb, drive, swim): the five controllers'
>   `composeRejection` overrides are deleted and the base prints
>   `guard.reason` (its switch holds only fallbacks for reasonless
>   guards). `canTraverseExit` applies the mode's words over any gate it
>   words. So the probe's reason and `go`'s are one string.
> - The probe's place veto is the one `go` actually has: `WaterPlace.canExit`
>   (declared on its interface, asked through `isWaterPlace`). `canEnter`
>   has no implementer anywhere — not probed (`lint:duck-typing`).
> - `beforeTraverse` is asked for a `Combatant` only (`flee`); `Beast`'s
>   floor check honors the probe (reads only a standing far side) but the
>   verdict does not ask it.
> - Way facts by composition: `Boundary` (`state`, `opening`, `swingsShut`),
>   `LockableMixin` (`locked`, `keyHeld`), `Door` (`freeHere`), via
>   `MqlSubscriptionApi.projectAspect`. `wayChanged` from `Boundary.setOpen`
>   (platform twin), `Door.setLocked`, `Ship.setGangwayLocked`.
> - `ride <dir>` unverified until the drive (step 15).

D8, D9.

- First: run `ride north` on a mounted body; fix the `exitMode` gate if it
  refuses (a defect in the shipped cascade, recorded as such).
- `probe` through `LocomotionLogic.canTraverseExit`, `Exit.canTraverse`,
  `floodedFor`, `farSideEnablement`, `beforeTraverse` (`Combatant`,
  `Beast`), `BerthExit`, `SeaPatchExit`, `ReachExit`; every other override
  accepts and forwards the option.
- `flee` and `unseen` on the guard and the way record.
- The led-animal gate into the cascade; `Carrying.ledAnimals()`.
- Wording into the gates; `TraversalGuard.works`.
- `aspect: 'way'` and the descriptors; `Exit.wayFor`, `Exit.wayChanged`
  and its three call sites.

**Acceptance.** Steps 6 (at the pump-house door) and 6a; a unit test per
override that a probe leaves residency unchanged (no ship stood up, no
patch minted, no house provisioned) and leaves a fight engaged; a test
that for every refusing gate the probe's `reason` equals `traverse`'s; a
way out of a fight carries `flee`; a way to an unloaded place carries
`unseen` and loses it once the place stands; a test boundary with its own
mixin and descriptor appears in `facts`. **Record the ways cost.**
**Commit:** `feat(navigation): the ways say whether you can take them, in the words trying gives`.

### W5 — The other sections and their triggers ✅

> **Done.** All seven sections; triggers: arrival (all), the dispatch beat
> (`you`, `ways`, `place`, in `emitDispatchResponse`), a moving place moving
> (`MovingPlaceMixin.onFrameMoved` base + `ReachPatch`'s `super`), a voyage's
> watch (`Voyage.beat`). Decisions and gaps:
> - The light read is `PerceptionApi.lightBandFor(viewer, place)` → `{band,
>   dark}`; the dark judgement stays beside the band (a second `.includes`
>   of the dark list was a new closed vocabulary to `lint:closed-vocabularies`).
> - Horizon `glance.point` is the compass word `PerceptionApi.glance` gives;
>   `closeBy` under a mile, else `roughMiles`; landmarks first; traffic a count.
> - ⚠ **Gaps, recorded:** `you.bars` (the words the load trips, asked with no
>   exit) and `place.staged/searched/found` are not computed; the building's
>   `entrance` says only `{ here: true }` (the name + first direction toward
>   it, from your map, waits for the pane). The `you.hands` pairing is by
>   order (held things against hand slots).
> - Elevation: `ZoneApi.elevationFor(place)` + `z × cellSize` on a grid — the
>   total (geography's `heightAboveSeaM` replaces it when it merges).

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

### W6 — The route as data ✅

> **Done.** `route` notes `route-plan` (`RoutePlanNote`, `WireRoutePlan`) on
> both render paths, the assumptions in the prose's own words. The least
> certain leg is the PLAN's (`RoutePlan.leastCertain`, set where plans are
> made in `NavigationLogic`) — a controller deciding it rose
> `lint:controller-decisions`. Refusals already noted their reason.

D5. `RouteController` note; refusal reason.

**Acceptance.** Step 7; a unit test that the note's legs equal the prose's.
**Commit:** `feat(navigation): a route plan travels as data`.

### W7 — The drive, the walk-through, the docs

- The whole blocking drive in one file, each checkpoint made to fail once
  (B2).
- Subsystem docs drafted for the sweep: a new `subscription.md` (the
  protocol and the provider contract); `mql-subscription.md` and
  `forums.md` (their wire half moved); `card-surface.md` (live cards on
  the protocol; the navigator); `client-shell.md`; `location-graph.md`
  (claims, the copy); `boundary.md` (way facts, probe); `perceiver.md`,
  `ship.md`, `civics.md`, `locomotion.md`.
- `pnpm test` once; the MR.

**Commit:** `test(navigation): the blocking drive`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a subscription | none (`subscribe` on the wire) | any session | the source's own | ⭐ the source is loaded by the `subscribe` that names its path; its class is checked **before** it is loaded | `source` must be a row whose class composes `SubscriptionSourceMixin`; `params` validated by the source |
| a live card | the card's command | `opens_card:` (unchanged) | the MQL source | `SubscriptionApi.open` from `CardRegistry` | — |
| the copy | none | a body with a map key (`Cartographer`) | map documents | read by path prefix at open | `locality` is a prefix of the holder's own map only |
| copy deltas | whatever perceives | `Cartographer` | `recordPlace` → `mapChanged` | the live body by identity path; **no body resident or no subscription → nothing sent, the next snapshot carries it** | — |
| the sections | none | `Perceiver` on the holder | the reads in Grounding | each read loads what it follows | — |
| way facts | none | the boundary's own mixins | descriptors with `aspect: 'way'` | the boundary is already in hand on the exit | — |
| the verdict | none | `Mobile` (a body that can move) | the cascade | modes load on use | — |
| route data | `route` | unchanged | the note | unchanged | unchanged |
| Locality claim | none | `Cartographer` | `Locality` via the coverage chain | `AddressApi.resolveFor` readies the index | — |
| the reckoned claim | `course` (bare) | the helm (unchanged) | `craft.reckonedNow()` | — | `mayBeSteeredBy` |

⚠ Silent-failure points to test: a source row that exists with a class
that does not compose the mixin (an error, never a load); a subscriber
whose holder does not compose `Perceiver` or `Cartographer` (a guest — the
sections flow, the copy's snapshot is empty and says so); a `viewerKey`
whose body is asleep; a boundary mixin with no descriptor (no facts, the
state still on the way); a client that never subscribes (nothing is
computed for it).

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| the client holds its own map, current after a move, a gap, a reconnect, a restart, a second session | W1 (the protocol), W2, W7 |
| every place says where it is; copies are separate | W3 |
| a first visit to a Locality with name, government, kind | W3 |
| a door reads as last seen | W3 |
| a route as data agreeing with the prose | W6 |
| sections; a move sends only what changed | W2, W5 |
| every way says whether and what would work, word for word | W4 — ⭐ see below |
| every claim says how you know it | W2 (channel, `toldBy`), W3 (`via`, `reckoned`) |
| the ship is the last Locality; jurisdiction matches `government` | W0, W5 |
| the horizon arrives on arrival and never while standing still | W5 |
| no path untagged; nothing the player does not know | W2, W7 |
| `locate` gone; the reckoning is `course`'s at the helm | W0 |

⭐ **How *the ways cannot disagree with trying* holds, honestly.** The
requirement's decision is that *can you take it* is the check moving runs,
asked without moving. Three statements, each tested in W4:

1. **A refusal is the refusal.** Every gate `go` runs before it moves is
   run by the probe through the same function, and the reason is the same
   string.
2. **A plain yes is kept.** `{ ok: true }` with no marker is sent only when
   every gate was asked — including the far place's veto, because it was
   standing.
3. **A yes that depends on something says what.** `flee` — you may go, and
   going is fleeing the fight, with what that costs. `unseen` — nothing
   you can perceive refuses you; the far side has not been asked.

So the way never says something trying contradicts: it says *no* in
trying's words, *yes*, or *yes, as far as you know*. Drive steps 6 and 6a
assert (1) and (2); W4's unit tests assert (3).

Nothing is unmapped.

## Test & gate strategy

- **Unit** (`__tests__/` beside the source, importing `test-bootstrap`):
  the registry (`rev`, refusal without load, disconnect); `growMap`;
  `mapSubject`; `frameIdentityOf`; the probe's purity per override; reason
  equality probe vs `traverse`; `flee` / `unseen`; the section differ
  (only changed sections pushed, per subscription); `Locality.getKind`;
  `Voyaging.lies`; the tagging projection.
- **Migration proof (W1):** the existing MQL, card and forum suites and
  the client suite, changed only where they name a type or a field.
- **Only the drive proves:** what arrives on a real socket, across a
  restart and a second session; the firewall across the whole run.
- **Full suite** at code-complete and at `/finalize` only. ⚠ W1 is large
  and structural and is still gated by `test:near`, the server, client and
  wire packages' own suites and the lints — not by a full run.
- **Browser walk (B3):** `e2e/tests/navigation-server-walk.spec.ts` — the
  shelf's figures tick, a live room card updates, a forum board updates,
  and the navigator follows a walk, a door opening and boarding the
  Hesper. This build changes what the client is fed, so the walk is not
  optional.

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
| 10 board; put to sea | instant | `stageShip` for the sea leg; the master's bare `course`, a passenger beside |
| 11 the headland; nothing pushed | instant | `stageShip` moves the Hesper out of sight while the watcher stands |
| 12 inside and outside a building | instant | Duncan Hall |
| 13 the Kestrel | **short** | launch a canoe at the put-in and wait for the patch to cross a Locality line; `advanceWorldClock` if the reach is long |
| 14 light, dark, hidden, low | instant | `testharness clock` to night; a hidden second character |
| 15 the you section | instant | `hand` a pole; the mule; `clone /system/transport/agent/draft-horse --here` |
| 16 sizes | instant | `bytesSince` |
| 17 restart | short | `restartWorld()`, then subscribe again |
| 18 a second session | instant | — |
| 19 the firewall | instant | `NavClient`'s whole log against the set of places the character walked, saw, searched, read or was told |

No step needs a state nothing can stage.

## Risks & opens

⚠ **Sibling rules (collision check, 2026-11-17).**
- **zone-instancing (build-4):** if this build merges first, their wave B4
  replaces every `frameIdentityOf` call with the room's stamped zone
  identity (`place.getZone()?.getIdentityPath()`, the same string) and
  deletes it with `laysOutOwnFrame`. If they merge first, write `at.zone`
  from the stamped zone identity and **do not add `frameIdentityOf`**.
  `getCoords()` stays valid either way (copy rooms get authored
  coordinates).
- **geography (build-3):** owns `PerceptionLogic`'s horizon computation
  and the `HorizonSighting`/`HorizonView` block; this build only
  serializes it (never `bearingDeg`). Height: geography adds
  `Place.heightAboveSeaM()` = zone elevation + z × cell size;
  `ZoneApi.elevationFor` stays the ground's (geography Q7 asks the owner
  whether pressure or magic's Δh should read the total). Geography also adds
  a Wharfside Locality and moves Mayfield Row under the city
  (`terminus/mayfield-row` → `terminus/city/mayfield-row`): maps are filed
  per finest Locality, so ~25 rooms' claims file under different documents —
  whichever merges second fixes any wire assertion on those paths.


⚠ **Zone instancing (build-4, `docs/plans/zone-instancing-plan.md` on
`reqs/zone-instancing`, D5/D12/D15)** changes two kinds of room path: a dorm
room gains a leaf (`<unit extent>/room`; the zone key stays the extent),
and the authored ships' decks (Hesper, Ostrander, Kittiwake, Corrigan)
become warren copies at `<her zone row>/<serial>/<leaf>`. Holdings and the
smack are byte-identical. Whichever build merges second updates the
drive's paths; no players, so no migration.


1. ⚠ **W1 rewires every live surface on the client** — the shelf, live
   cards, forums. It is behavior-preserving by construction (the registries'
   indexing, scheduling and diffing are untouched), and its acceptance is
   the existing suites; but it is the wave most able to break something the
   navigation drive never visits. The browser walk covers it.
2. ⚠ **A source is named by a template path on the wire.** Engine paths,
   known to the client as constants. If the owner would rather a short
   word, the rule would be a path convention (`<root>/idea/subscription/<word>`)
   and the two shipped registries would move — a rename sweep, not done
   here.
3. ⚠ **W1's blast radius grows** with `client-state-update` (~20 push
   sites, the settings' first render) and the press ticker. Second commit
   inside W1, after MQL and forums are green, so a failure is isolated.
4. ⚠ **The text navigator now refreshes on a door change and after each of
   your own commands**, not only on a move. Wanted, but new.
5. ⚠ **The lounge has no door** (step 6) and **the Delve has no dark or
   low room** (step 14). Driven at the pump-house door, and at the steading
   and an unlit Delve room at night (accepted 2026-11-17).
6. **`settlement`** for a depth-2 Locality (accepted). Grain; one constant.
7. ⚠ **"The reach" is the river's name and km** (D10). A named reach needs
   a `LineFrame` read the water pack alone would implement.
8. ⚠ **Crowding and light are as of your last beat** (D7), not live.
9. ⚠ **One reckoned claim per sea** (D2) — the first reckoning's position.
10. **`unseen` will be common.** Residency evicts the cold tail, so the far
    side of many ways is not standing. If the drive shows most ways marked,
    bring the count — the marker is honest, but a pane full of *as far as
    you know* is a product question.
11. **Snapshot size** for a large map is unmeasured until W2. The
    `locality` prefix param lets a client ask per Locality; if one document
    exceeds 256 KB on the wire, stop and bring the number.
12. **Two live sessions of one character** may not be supported
    (`harbors` note). W2 settles it; if a second login replaces the first,
    step 18 becomes *a second login receives the same copy* and the owner
    is told.
13. **Moving the led-animal gate** reorders it ahead of `beforeTraverse` and
    destination resolution. The size-and-carrying drive (step 18) is the
    regression check.
14. **`recordPlace` rewrites the whole document** per look (shipped). The
    Locality claim adds one write per Locality **entry**, not per look.
15. **`ride <dir>`** may be broken today (Grounding). Step 15's mounted
    case depends on it.
16. **Reading a row's class before loading it** (D1's guard) needs a
    template read that does not instantiate. If none exists, stop and ask —
    the fallback is a path convention (risk 2), not loading first.

Stop and ask rather than guess: any state push that cannot be a source;
any gate ceiling that would have to rise; any section read that can only
be had from the location graph.

## Deferred seams

- **A remote way's door name and opening on edge claims (S8)** — attaches
  at `Cartographer`'s edge claim, beside `state` → navigation-server-slate.
- **Zone instancing** — `frameIdentityOf` and `laysOutOwnFrame` retire
  together; `mapSubject().at.zone` becomes `getZone()`'s path →
  zone-instancing-slate.
- **One horizon computation (S20)** — the horizon section's producer is
  `horizonFor`; the geography build changes that function only →
  geography-slate.
- **Movement in progress (S19)** — an eighth section of the same source →
  step-beat-slate.
- **The builder lens on the map** → map-slate.
- **The room card's `exits` refreshing on a door** — `wayChanged()` is the
  seam → boundary-slate.
- **A named reach on `LineFrame`**; **a trail of reckonings** →
  navigation-server-slate, the *your map grows* build.
- **Renaming the two shipped registries to sources** → a naming sweep.

## Critical files

Read first, in this order:

1. `docs/requirements/navigation-server-requirements.md`
2. `api/mql-subscription.ts`, `platform/idea/MqlSubscriptionRegistry.ts`
   (the three emits, the id table, `cancelAllForInteractive`),
   `platform/idea/ForumSubscriptionRegistry.ts`,
   `platform/idea/CardRegistry.ts:1225-1250` (the silent open),
   `backend/inbound/index.ts`, `mql.ts`, `forumSubscription.ts`,
   `platform/idea/Interactive.ts:480-550`
3. `packages/types/src/index.ts` (the MQL and forum messages and
   envelopes, `CardPayload`, `Whereabouts`, `WayRecord`, `Note`)
4. `packages/client/src/services/websocket.ts`,
   `components/frame/Shelf.tsx`, `components/cards/useCardFeed.ts`,
   `store/forumActions.ts`, `components/cards/NavigatorBody.tsx`
5. `lib/location/MapClaim.ts`, `lib/location/Cartographer.ts`,
   `platform/idea/api/NavigationLogic.ts` (`recordPlace`, `growMap`)
6. `lib/description/Perceiver.ts` (`whereabouts`, `learnSurroundings`),
   `lib/connection/SaxonbergClient.ts` (`refreshNavigator`),
   `lib/connection/Cards.ts` (the `map` card)
7. `lib/boundary/Exit.ts` (`wayRecord`, `canTraverse`, `clearanceRefusal`,
   `clearanceWords`), `platform/idea/api/LocomotionLogic.ts`
   (`canTraverseExit`), `lib/spatial/Mobile.ts` (`traverse`, `crossExit`),
   `lib/combat/Combatant.ts` (`beforeTraverse`)
8. `lib/location/FloorplanWarren.ts`, `lib/location/Warren.ts`,
   `platform/idea/ShipWarren.ts`, `lib/location/MovingPlace.ts`,
   `lib/expanse/Positioned.ts`, `lib/expanse/Charted.ts`
9. `lib/boundary/Boundary.ts`, `lib/boundary/Lockable.ts`,
   `lib/spatial/Sealable.ts`, `platform/thing/Door.ts`
10. `platform/idea/api/GovernmentLogic.ts`, `platform/idea/Locality.ts`,
    `platform/idea/cmd/perception/LocateController.ts`,
    `platform/idea/cmd/movement/CourseReadoutController.ts`
11. `packages/wire/src/harness/session.ts`, `world.ts`;
    `packages/wire/tests/size-and-carrying.dirty.wire.test.ts`,
    `boundary.dirty.wire.test.ts`, `tracts.dirty.wire.test.ts`
12. `docs/subsystems/mql-subscription.md`, `card-surface.md`
    (§ One birth path, § Reconnect behavior), `forums.md`

## Drive record

`packages/wire/tests/navigation-server.dirty.wire.test.ts`, `WIRE_BOOT=1
WIRE_PORT=2013`, 2026-11-17. Seven runs; what each found:

1. **Defect (fixed, f-commit `fix(navigation-server): your map's copy read…`)**:
   every map subscription answered an error — `readMapCopy` called the
   gated `readMap` on itself and the gate refused it. A unit test had mocked
   the read; an unmocked one now reads the copy through the Api.
2. **The drive's premise was wrong for the Delve**: it is pitch black even
   by day past its mouth and covered by no Locality, so a walk there writes
   nothing (correctly). Steps 2–8 moved to lit, addressed Terminus (the bank
   → the market square); step 14 drives the dark corridor for exactly that.
   **Duncan Hall has no Building row** — step 12 moved to the chandlery.
3. **Defect (fixed)**: the building section's name was `getName()` (empty for
   a Building) — now `getPresentation()`.
4. **The harness read too early**: a flush lands on its own beat after the
   command. `NavClient.settle()` waits for quiet; step 2 polls for the
   arrival's `walked` claim (written after the walked edge).
5. Run 4: **15/16** (only the lit-vestibule premise); run 5: **15/16** (only
   step 2's timing, fixed); runs 6–7 under sibling load (load average ~20 on
   8 cores): a boot past 420 s and 30 s subscribe timeouts — every failing
   step had passed in run 4 or 5.

**What the record shows** (run 4/5):
- 1 · `locate` unknown; a passenger at the helm: *Only her master takes the
  helm*.
- 2–3 · the square `walked` with `{zone (tagged), x, y, z, level}`; edges
  with their state; zone `{kind: grid, cellSizeM: 3, label}`, no extent.
- 6 · the pump-house door: `{ok:false, gate:locked, reason: "The pump-house
  door is locked."}`, facts `{locked, keyHeld:false, state, opening, …}` —
  and `go pumphouse` says those words.
- 6a · the low door: `{gate: clearance, reason: "You'd have to stoop —
  \`stoop east\`.", works: {mode: stoop, command: stoop east}}`; `go east`
  says it word for word; `stoop east` goes through.
- 7 · `route to the bank`: the note's legs equal the prose.
- 8 · localities: Terminus (realm, the Realm of Terminus) › Terminus
  (settlement, the City of Terminus) › The Counting-Houses (district).
- 10 · aboard: ship *the Hesper*, outer `{at: berth, landing: the mouth of
  the estuary}`, jurisdiction the City then the Realm — as `government` says.
- 12 · the chandlery: name, entrance-here, 7 m, not a landmark, title unsold.
- 14 · the square bright, elevation 35 m; the Delve corridor pitch-black,
  `dark: true`, and a `look` there adds nothing to the copy.
- 16 · **sizes**: where-you-are snapshot 3.8 KB, map snapshot 6.3 KB (36
  claims); a cross-zone move 3.8 KB sending six sections (not `you`); a
  `look` that changes nothing sends nothing.
- 17 · restart: 36 claims before, 36 after, none missing, none doubled.
- 18 · a second session of one character opens (two live sessions ARE
  supported — risk 12 settled) and holds the same 36 claims.
- 19 · no untagged path anywhere in the log; `rev` contiguous.

**Not driven (recorded):** 4 (the Delve's levels — dark), 7a (charts), 9
(two holdings), 11 (horizon at the headland), 13 (the Kestrel), 15's
mounted/led/pole cases. Their substrate is unit-tested (W3 copy identity,
W4 probe and led animals, W5 sections).
