# Zone instancing — implementation plan

Executes [zone-instancing-requirements](../requirements/zone-instancing-requirements.md)
(seeded by [zone-instancing-slate](../slates/engine/zone-instancing-slate.md)).
**Kind:** refactor/sweep. **Lead end:** kernel. **First consumer:** the
holdings (Hinkley Hills, Hearts Delight, Seznick House, Duncan Hall); ships
of a kind, moving water and the authored ships follow in the same build.

Every copy of a place a warren makes becomes a zone of its own, minted from
a zone row under an identity its warren derives. A room in a copy is
stamped into the copy's zone, carries authored coordinates on the copy's
grid, and obeys the edge rules like any room. The "frame" workaround
(`laysOutOwnFrame`, the derived layout, the threshold exemption) retires in
the last wave.

Read before building: `CLAUDE.md`, `docs/workflow.md`,
`docs/review-questions.md`, `docs/ref-shapes.md` (identity and lineage),
and `docs/subsystems/{zone,holding,ship,harbor,river,location-graph,boundary}.md`.

---

## Grounding

Verified at plan time (2026-11-16, branch `reqs/zone-instancing` at
`2cd2db68c`). Paths are under `packages/server/src/mud/` unless they start
`packages/` or `docs/`.

### Zone resolution and stamping

- `platform/idea/api/ZoneLogic.ts` — `resolveZoneForPath(path)` (line 207)
  answers `null` when the path is itself a spatial-zone ROW, else walks
  `Template.ancestorPaths(path)` nearest first and returns
  `StuffApi.singleton(ancestor)` for the first ancestor ROW whose class
  extends `SpatialZone`. It consults only rows. `resolveEnclosingZoneForPath`
  (line 189) is the any-Zone sister. `getEnclosingZone(zone)` (line 129)
  walks the ancestors of `zone.getTemplatePath()`.
- `lib/zone/Zone.ts` — `lookupField` reads own, then
  `lookupAncestorField` → `ZoneApi.getEnclosingZone(this)`. The sync twin
  `peekAncestorField` walks `Template.ancestorPaths(this.getTemplatePath())`
  over `StuffApi.findByTemplatePath`. Both key on the TEMPLATE path.
- `api/stuff.ts` — `clone(row, _, { asIdentityPath, zoneFrom, dataOverlay })`:
  line 607 `identityPath = opts.asIdentityPath ?? templatePath`; line 653
  `ZoneApi.resolveZoneForPath(opts.zoneFrom ?? identityPath)`; line 708
  `Stuff._stampZone(obj, zone)`. The Singleton guard keys on the identity
  path, so a Singleton class may be cloned many times under distinct
  identities. `#identityNamespaceOf` asserts a minted identity only for
  classes that declare `static identityNamespace`.
- `platform/idea/location/CartesianZone.ts` =
  `SingletonMixin(LocationZoneMixin(SpatialZone))`. `addLocation(place, x, y, z)`
  registers the grid cell. A room with no coordinates is zone-stamped but
  never `addLocation`ed (see the comment in `removeLocation`).
- `lib/location/Location.ts` — `setCoords` (line 468) is the only path by
  which an authored row joins its zone's grid; it calls
  `zone.addLocation(this, x, y, z)` on the STAMPED zone.
- `lib/zone/LocationZone.ts` — `addLocation` kicks two load-on-use
  stand-ups (`standUpAttached`, `lookOutFrom`). Neither fires for a room
  that is only stamped.

### A minted zone already exists (the water pack)

- `lib/zone/MovingZone.ts` — `MovingZoneMixin`: one zone per moving place,
  "minted with it and reaped with it", geography read off the place's
  frame position, every other field walking to the kind row's chain.
- `packages/content/water/src/location/{ReachZone,SeaZone}.ts` =
  `MovingZoneMixin(CartesianZone)`.
- Three hand-written mints, each
  `StuffApi.clone(<zone row>, undefined, { asIdentityPath })` then
  `zone.adopt(place)`:
  `packages/content/water/src/idea/ReachWarren.ts` `giveZone` (line 574;
  identities `<PATCH_ZONE|BANK_ZONE>/<course>/<n>`, `<STOP_ZONE>/<leaf>`),
  `packages/content/water/src/idea/SeaWarren.ts` `adoptStop` (line 262)
  and `mintPatch` (line 276). Each carries an `identity-keyed-by: lookup`
  marker for `lint:identity-mints`. `reap` destructs the zone with its
  place.
- Zone rows: `packages/content/water/content/system/water/location/reach/{patch,stop,bank}.yaml`
  (class `ReachZone`) and `.../sea/{patch,stop}.yaml` (class `SeaZone`).
  The zone row paths are constants in the warren source.
- So patches are ALREADY one-place zone copies. What they lack is the
  declaration, the shared capability and the frame retirement.

### Frames

- `lib/location/Warren.ts:128` `laysOutOwnFrame()` default `false`.
  Overrides returning `true`: `lib/location/FloorplanWarren.ts:255` (so
  `HoldingWarren`, `ShipWarren`),
  `packages/content/water/src/idea/ReachWarren.ts:160`,
  `packages/content/water/src/idea/SeaWarren.ts:77`. Override returning
  `false`: `packages/content/trade-mining/src/idea/MineWarren.ts:403`.
- Consumers: `lib/location/Location.ts` — `addExit` line 129
  (`crossesHoldingFrame`), `edgeRefusal` line 295 (`holdingFrameOf`), the
  two private helpers (lines 383–397). `FloorplanWarren.layOut()` derives
  per-copy coordinates from the entrance and the copy's cardinal ways and
  calls `setCoordinates` on each room (never `addLocation`). Comments:
  `platform/location/PersistentLocation.ts:80–88`, `lib/stuff/Place.ts:13–14`.
  Tests asserting it: `lib/location/__tests__/FloorplanWarren.test.ts:199`,
  `packages/content/residence/src/__tests__/HoldingWarren.test.ts:405`.
- `lib/boundary/Exit.ts:452` `wayRecord().crossesZone` already compares
  live zones (`far.getZone() !== here`); it needs no change.
- `Location.addExit` compares zones BY PATH
  (`getTemplatePath()` of the source, `exit.getDestinationTemplatePath()`),
  which is why a dorm room and its corridor "resolve to one zone".
  `packages/content/eternal-university/src/duncan-hall/idea/DormWarren.ts`
  (`handDaypack`) records the live failure: *"non-cardinal direction
  'unit-2' requires the destination to be in a different zone"*.

### Copies, and who makes them

- `lib/location/FloorplanWarren.ts` — `wake()` → `wakeRoom(spec)` →
  `mintKeyed(row, key, { zoneFrom: this.zoneFromFor(spec, key), withholdExits })`
  → `wireWays` (the one rewrite rule, read through `mirrorAxis`) →
  `layOut()`. `zoneFromFor` default = the room's full key
  (`<warren key>/<leaf>`). Rooms keep their ROW as identity; uniqueness is
  the persistence key. `teardown()`/`onDestruct()` destruct the rooms;
  `revert()` deletes the records and tears down.
- `lib/location/Floorplan.ts` — reads a plan off its rows (followed from
  the entrance). A one-room plan's room has NO leaf (`single`), so its key
  is the warren's key itself.
- `packages/content/residence/src/idea/HoldingWarren.ts` — key = the
  parcel extent; `wake()` = `refreshKeyway` → `super.wake()` →
  `hangKeyedDoors` → `wakeHouses`; `revert()` ends a lease.
- `platform/idea/ShipWarren.ts` — `planOf()` hands over the ship KIND
  row's `extent`/`entrance`; `zoneFromFor` =
  `<room row folder>/<key>` (line 281); an authored ship copies no plan
  and `adoptResident()`s her row rooms (found by
  `StuffApi.findByIdentityPath(row)`), `releaseRooms()` on destruct.
- `platform/idea/Ship.ts` — `serial()` (line 2139) is the leaf of a minted
  identity `<kind row>/<serial>`, `null` for an authored ship;
  `isOfKind()` = `serial() !== null`. `standWarren()` keys the warren
  `(this.warren ?? AUTHORED_SHIP_WARREN, serial() ?? getTemplatePath())`.
  `isOfKind()` branches: `company`, `commission`, `watchRoomNow`,
  `standKind`, `onDestruct`, `memberExtent`, `liveMembers`,
  `sleepIfEmpty`, `sleep`, `dependentPersistables`, `watchRoom`, and the
  frame-less landing warning (line 1818). A sunk ship stays as a wreck;
  nothing in the tree destroys a ship.
- Serials are `SecurityApi.uuid()`
  (`packages/content/transport/src/thing/HullBook.ts:199`).
- Plans and their zone rows today (all `CartesianZone`):

  | copy | plan owner row | `extent` | zone row at the extent |
  |---|---|---|---|
  | Hinkley house | `packages/content/hinkley-hills/content/world/terminus/hinkley-hills/idea/house-programme.yaml` | `/world/terminus/hinkley-hills/house` | yes (`house.yaml`) |
  | farmstead | `packages/content/hearts-delight/content/world/terminus/hearts-delight/idea/farmstead.yaml` | `/world/terminus/hearts-delight/farmstead` | yes (`farmstead.yaml`) |
  | Seznick unit | `packages/content/terminus/content/world/terminus/mayfield-row/seznick-house/unit-programme.yaml` | `…/seznick-house/location` | yes (`location.yaml`; the corridor row is outside it) |
  | dorm unit | `packages/content/eternal-university/content/world/terminus/eternal/duncan-hall/idea/dorm-programme.yaml` | `…/duncan-hall/location/dormroom` (ONE room row) | **no** — the room shares `duncan-hall/location` with the lobby and corridor |
  | smack | `packages/content/terminus/content/stuff/idea/Ship/smack.yaml` (+ warren row `…/stuff/idea/ShipWarren/smack.yaml`, `data: {}`) | `/stuff/location/ship/smack` | yes (`smack.yaml`) |
  | Hesper, Ostrander | `packages/content/terminus/content/world/terminus/{hesper,ostrander}/structure.yaml` | `/world/terminus/{hesper,ostrander}` | yes (hand-written zones) |
  | Kittiwake, Corrigan | `packages/content/terminus/content/world/terminus/harbor/ships/{ketch,coaster}/structure.yaml` | `…/harbor/ships/{ketch,coaster}` | yes |

- Every way INSIDE every plan above is cardinal (checked row by row,
  including the farmstead's `up`/`northeast`/`southwest`). The named ways
  (`ashore`, `side`, the keyed-door ways, the code-installed `out` and
  `unit-N`) all lead out of the plan.
- The four authored ships' room rows already author `coords:`. No holding
  plan row and no smack row does.
- Holding copies are made by: Hinkley's `PlatWarren`
  (`…/hinkley-hills/idea/lot-holder.yaml`, `programmePath`,
  `parentExtent`), `DormWarren.standUpHolding` (line 245), and the
  `LettingWarren`/`CirculationWarren` family for Seznick. Lot gates are
  cardinal (`…/hinkley-hills/lots.yaml` header).
- A mirrored copy (`FloorplanWarren.mirrorAxis`, set by a plat from the
  side of the road) reflects every copied direction and the derived layout.

### Not copies (untouched)

- `MineWarren` — cells on its own zone's grid; `mintKeyed` with
  `beforeRestore`; `laysOutOwnFrame() → false`.
- `lib/location/CirculationWarren.ts:538` — grown corridors take the cell
  beside a plotted neighbor (`Location.plotBesideNeighbour`) on the parent
  zone's grid.
- `packages/content/water/src/idea/ColumnWarren.ts` — does NOT override
  `laysOutOwnFrame` (so `false`); it sets each budded band's coordinates
  one cell below its surface (`_budOne`, line 127). No frame; untouched.

### Authored ships — what names them and their rooms

- Handle `/world/terminus/hesper/structure` (and the three others) is
  named by: the four register entries
  (`packages/content/platform/content/ships/terminus-city/*.yaml`, `kind`
  and `key`), `…/harbor/idea/harbor.yaml` (`exempt`),
  `…/harbor/thing/charter-book.yaml` (ships and rates), the
  `testharness ship` examples, and `packages/wire/tests/harbors.dirty.wire.test.ts`.
- Room rows are named from outside their own rows by: each ship's company
  (`…/hesper/idea/outfit.yaml`, `…/ostrander/idea/outfit.yaml`,
  `…/harbor/ships/{ketch,coaster}/idea/company.yaml` —
  `operatingLocations`, `rosterSlots[].station`), and by wire tests that
  open a session AT a deck or hold row
  (`harbors.dirty`, `scan-sweep.dirty`, `maritime-space.dirty`,
  `river-d.soak.dirty`, `river-e.soak.dirty`, `sugar.soak.dirty`). No exit
  row elsewhere names one.
- `platform/idea/LocationGraphRegistry.ts` `deriveAttachments` (line 421):
  a Structure row with `warren:` + `extent` is a PLAN and attaches nothing
  (`plans`); otherwise `extent` attaches `structure`, and
  `expanse`/`line`/`berth` attach `craft`. That attachment is what stands
  an authored ship up. The smack row authors no `expanse`/`line`/`berth`.

### The location-graph index

- `lib/location/PlaceNode.ts` — `origin: 'template' | 'plan'`, `zone`,
  `coords`, `edges`, `generation`.
  `LocationGraphRegistry.rebuild()` re-projects every row and
  `sweepStaleGenerations` deletes every node not stamped with the new
  generation. Kinds are deliberately absent; the registry header records
  that slot stubs were NOT shipped because nothing reads one.
- `docs/subsystems/location-graph.md § The durable per-instance handle`:
  a keyed room's handle is `<row>#<key>`. `lib/location/Cartographer.ts`
  keys a map claim on the place's durable handle and groups by address
  (holding rooms are stamped `addressFor` per lot), so two houses already
  group apart on `map`.

### Lints that already police this ground

- `packages/server/scripts/check-location-classes.ts` (`lint:locations`) —
  the "every location plots" rule with four exemption rosters
  (`MINTED_ROWS`, `FURNISHED`, `WARREN_PLACED`, `OWN_FRAME`), the
  non-cardinal-intra-zone rule and the row-level adjacent-cell rule, all
  grouped by the zone ROW over each room row. Plan rows are on the
  exemption rosters today.
- `packages/server/scripts/check-identity-mints.ts` — every
  `asIdentityPath:` site carries an `identity-keyed-by:` marker; ceiling 2.
- `lib/zone/__tests__/SpatialZone.authoredFields.test.ts` — every key a
  zone row authors is declared by its class.

### Staging and the drive

- `packages/wire/tests/harbors.dirty.wire.test.ts` — the precedent for
  funding (`reserve override … to <handle>`), buying a smack at the yard,
  the berth roll, `pay`, `charter`, and the RESTART step (line 694:
  `dev-preflight.mjs` with `PREFLIGHT_GRACE_MS=60000`, then
  `bootOwnedWorld()`).
- `packages/wire/tests/tracts.dirty.wire.test.ts` — `title buy <lot>`.
- `packages/wire/tests/boundary.dirty.wire.test.ts` — Katie provisioning a
  dorm room.
- `packages/wire/src/harness/world.ts` — `stageShip` (line 545), `stage`.
- A wizard read: `eval --parcel <extent> <code>` (precedent
  `packages/wire/tests/cover.dirty.wire.test.ts:248`).
- The navigation-server build (build-2, MR !585) has not built yet: its
  branch is at master. Its requirements (§ *A copy is recorded as itself*)
  record a copy's room under the copy's name; the agreement is by word.

---

## New substrate

The slate carries no reuse ledger; this section is it. Searched:
`asIdentityPath` (every site), `identityNamespace`, `lint:identity-mints`,
`PersistableApi.restoreOrSeed` / `standUpKeyed`, `StuffApi.singleton` /
`findByIdentityPath`, `lookupAncestorField` overrides (none ship),
`MovingZone`, `LocationGraphRegistry`, `GraphInvariants`,
`check-location-classes`, every `Warren` subclass.

| # | piece | ledger row it reuses or generalizes | new? |
|---|---|---|---|
| N1 | Minting a zone from its row under an identity | `StuffApi.clone(row, _, { asIdentityPath })`, exactly as `ReachWarren.giveZone` and `SeaWarren.mintPatch`/`adoptStop` do | reuse, no change to the clone pipeline |
| N2 | The resolver finding a live copy | `StuffApi.findByIdentityPath` (the index `Zone.peekAncestorField` and `ShipWarren.adoptResident` already read) | reuse; **no registry** |
| N3 | A copy inheriting from where it stands | `Zone.lookupField` + `ZoneApi.getEnclosingZone`; the walk switches from template ancestry to identity ancestry | reuse; **no barrier subclass, no override** |
| N4 | Rooms stamped into the copy | `clone`'s `zoneFrom` + `FloorplanWarren.zoneFromFor` | reuse, unchanged strings |
| N5 | Copy identity surviving a restart | the warren's own persistence key (`restoreOrSeed` on the parcel extent / the ship's serial) | reuse; the zone persists nothing |
| N6 | **`MintedZone`** — class, `platform/idea/location/MintedZone.ts`, extends `CartesianZone` | — | **genuinely new**. Searched for a zone class that knows it is a kind: none (`ReachZone`/`SeaZone` are pack classes about motion). It carries the declaration (`mintedBy`) and one behavior: the ROW's own instance refuses rooms |
| N7 | **`ZoneMintingMixin`** — mixin, `lib/location/ZoneMinting.ts` | generalizes the three water mints (N1) plus the per-warren `zoneFromFor` rule; promoted at its fourth and fifth consumers (holdings, ships) | new file, generalizing shipped code |
| N8 | `origin: 'copy'` nodes in `location_graph` + `NavigationApi.recordCopy` / `retireCopy` | `PlaceNode`, `LocationGraphRegistry.writeTemplateNode`/`edgesOf`/`coordsOf`, the `liveStructures` precedent for runtime-attached facts | two forwarding statics + two registry methods; no new collection, no new record class |
| N9 | Declaration checks | `lint:locations` (`check-location-classes.ts`), which already owns the plot rule and its exemption rosters | extends an existing gate; no new `lint:*` |
| N10 | `Ship.serial` — one authored field | `Ship`'s existing minted `serial()` | one field (see D12) |

No new Api, no logic singleton, no hook, no registry, no document kind, no
Mongo collection, no module category, no free helper, no `eslint-disable`,
no lint exemption, no `isWizard` check, no verb.

---

## Plan-level decisions

### D1 — The content shape

**Zone row** (says: my copies are made by a warren, and which kind):

```yaml
class: /platform/idea/location/MintedZone      # or a pack subclass (ReachZone, SeaZone)
data:
  name: the Hinkley house
  cellSize: 6.0
  mintedBy: /world/terminus/hinkley-hills/idea/house-programme   # the warren ROW
```

**Warren row** (says: how copies are named, where they join):

```yaml
class: /system/residence/idea/HoldingWarren
data:
  extent: /world/terminus/hinkley-hills/house     # the plan — and it IS the zone row
  entrance: /world/terminus/hinkley-hills/house/yard
  zoneNaming: key          # key | under-row
  joins: parcel            # parcel | berth | frame
```

- **Which zone a warren copies is its plan's `extent`.** The plan's extent
  IS the zone row (true today for every plan but the dorm's, see D5). It is
  not written a second time. A ship kind's plan is her Ship row's
  (`extent`, `warren:`), as harbors review 3 decided; her warren row carries
  `zoneNaming`/`joins`. A warren that copies no plan (the two water
  warrens) names its zone rows in code as it does today; the declaration
  runs the other way, from each zone row's `mintedBy`.
- **`zoneNaming`** is implemented once, generically, in the mixin — it is a
  real choice, not a per-class constant written into rows:
  `key` → the copy's identity is the warren's key (a path: a parcel
  extent); `under-row` → `<zone row>/<key>` (a ship's serial, a patch's
  `<course>/<n>`).
- **`joins`** selects checked behavior, so it is not decoration:
  `parcel` → the identity must be covered by a parcel at mint (else a typed
  throw) and the copy is indexed; `berth` → no parcel, indexed, the way in
  comes and goes; `frame` → the zone must be a `MovingZone`, the copy is
  never indexed and never kept.
- `mintedBy` is load-bearing at run time, not only in the lint: the mixin
  refuses to mint a zone whose row does not name the minting warren's row.
- Both vocabularies are closed arrays exported beside the mixin
  (`ZONE_NAMINGS`, `COPY_JOINS`), read by the lint.

*Why not a `mints:` block on the warren row repeating the zone:* two copies
of one sentence. *Why a class for the zone row rather than a field on
`CartesianZone`:* a `mintedBy` on every grid in the game answers "none" on
all but a dozen rows (P2).

### D2 — How the resolver learns copies, and how a copy inherits

- **Learning.** `ZoneLogic.resolveZoneForPath` and
  `resolveEnclosingZoneForPath` check, at each ancestor path, for a live
  `MintedZone` copy filed at that identity
  (`StuffApi.findByIdentityPath(ancestor)`, accepting only an instance that
  `isCopy()`), before the row lookup for that ancestor. The self check
  comes first: a path that is itself a live copy answers `null` from
  `resolveZoneForPath` ("a zone is not inside itself") and itself from the
  enclosing resolver. No registry is added.
- **Inheriting.** `ZoneLogic.getEnclosingZone(zone)` and
  `Zone.peekAncestorField` walk the ancestors of
  `zone.getIdentityPath() ?? zone.getTemplatePath()`. A row's own instance
  has identity = template, so nothing changes for any authored zone. A copy
  reads its own fields (hydrated from its row) and then walks **where its
  identity is filed**:
  - `key` naming → the identity is in the world tree
    (`/world/terminus/hinkley-hills/lots/lot-7`), so the walk goes
    `lots` → `hinkley-hills` → `terminus`: the lot's government, weather,
    sky and ground. Never the folder the plan is filed in.
  - `under-row` naming → the identity is under its own row
    (`/stuff/location/ship/smack/<serial>`), so the walk goes to the kind
    row and its chain: a ship's own settings come from her kind. What is
    around her is read where she lies, by the shipped reads
    (`ExpanseApi.leanAtSync`, `GovernmentApi` through `subjectTo`), which
    this build does not touch.
  One rule, no subclass override, and the water zones' answers are
  unchanged (their identity was already under their row).

### D3 — The capability

`ZoneMintingMixin` (`lib/location/ZoneMinting.ts`), composed by exactly the
warrens that mint zones: `HoldingWarren`, `ShipWarren`, `ReachWarren`,
`SeaWarren`. Not on `Warren` (the lounge, a mine and a corridor would
answer "no") and not on `FloorplanWarren` (`MineWarren` extends it and
carves on its own zone's grid).

```ts
export interface ZoneMinting {
  getZoneNaming(): ZoneNaming;            // authored
  getJoins(): CopyJoin;                   // authored
  /** The naming rule, in one place. Throws on a key the scheme cannot name. */
  copyIdentity(zoneRow: string, key: string): string;
  /** The copy's zone, standing: the live one, or minted from its row. Idempotent. */
  wakeCopyZone(zoneRow: string, key: string): Promise<MintedZone>;
  /** The copy sleeps: its zone instance goes (it keeps nothing). The index is untouched. */
  sleepCopyZone(zone: MintedZone): void;
  /** The copy is gone for good: sleep it and retire it from the index. */
  destroyCopy(zoneRow: string, key: string): Promise<void>;
  /** Record the standing copy's rooms in the index (a no-op when `joins` is `frame`). */
  recordCopy(zone: MintedZone, rooms: readonly CopyRoom[]): Promise<void>;
}
```

- `recordCopy` and `destroyCopy` join the mixin in A3, with the registry
  half; the other members land in A1.
- `wakeCopyZone` checks, in this order, each a typed throw: the row's class
  extends `MintedZone`; its `mintedBy` equals this warren's template path;
  the identity names no template row (`Template.findByPath(identity) === null`
  — a copy must not shadow a row); for `joins: parcel`, a parcel covers the
  identity; for `joins: frame`, the class composes `MovingZoneMixin`. Then
  the one mint site:
  `StuffApi.clone<MintedZone>(zoneRow, undefined, { asIdentityPath: identity })`
  with the marker `identity-keyed-by: referenced — a copy's rooms, the
  location-graph copy nodes and players' map claims name it; it is
  re-derived from the warren's own key at every wake`.
- **Wake and sleep of a whole copy** stay `FloorplanWarren`'s (`wake`,
  `teardown`, `revert`). `HoldingWarren.wake` and `ShipWarren.wake` call
  `wakeCopyZone` before `super.wake()`, then assert every woken room's
  `getZone()` is that zone (typed throw), then `recordCopy`. The mixin's
  own `onDestruct` runs after the base's (which tears the rooms down) and
  sleeps every zone it stood up. `FloorplanWarren.revert` is followed, in
  `HoldingWarren.revert`, by `destroyCopy`.
- The water warrens call `wakeCopyZone` in place of their three inline
  clones and `sleepCopyZone` in `reap`.
- **Joining the entrance** stays where it is: the institution hangs the
  gate or door (`PlatWarren`, `DormWarren`, the letting warren), a ship's
  `BerthExit` is hers, a patch's ways are its warren's. The capability adds
  the declaration and the index record; it does not re-solve the wiring.

### D4 — A copied zone's row holds no rooms

`MintedZone.addLocation` throws when called on the row's own instance
(`!isCopy()`): *"`<row>` is copied by `<mintedBy>`; a room joins a copy, never
the row"*. This turns today's silent fallback (a keyed room landing in the
shared row zone) into a loud failure, and it is the runtime half of the
declaration lint. A bare stamp (`_stampZone`, for the things and ideas filed
under a plan's zone row) is unaffected.

`MintedZone.isCopy()` = `getIdentityPath() !== getTemplatePath()`.
`MintedZone.canEvict` vetoes while it holds a location (as `MovingZone`
does).

### D5 — The copy's name is the parent of `zoneFromFor`

- The zone's identity is `copyIdentity(plan.extent, warrenKey())`; a room
  is recorded and stamped under `<zone identity>/<leaf>`. For holdings and
  the smack these are byte-identical to today's `zoneFromFor` strings, which
  is what the navigation build's claims will carry. `ShipWarren.zoneFromFor`
  becomes `${copyIdentity}/${leaf}` (same string for the smack; robust to a
  nested plan).
- **Every plan room has a leaf.** `Floorplan` drops its `single` special
  case: a one-room plan's room takes the last segment of its row path like
  any other. This re-keys the dorm ROOM from `<extent>` to `<extent>/room`;
  the unit extent stays the zone's identity (agreed with build-2).
- **The dorm plan gets a zone row of its own** (the one plan whose extent
  is not a zone): new `…/duncan-hall/unit.yaml`
  (`MintedZone`, `mintedBy` the dorm programme, the `cellSize` of
  `duncan-hall/location`), and the room row moves from
  `…/duncan-hall/location/dormroom.yaml` to `…/duncan-hall/unit/room.yaml`.
  `dorm-programme.yaml` becomes `extent: …/duncan-hall/unit`,
  `entrance: …/duncan-hall/unit/room`. `DormRoom.SCOPE`, the dorm building
  row's `extent`/`entrance`, the `FURNISHED` roster path and the dorm tests
  follow (review question B4: grep `dormroom` across `packages/`).
- The human address is not a key: `HoldingWarren.addressFor` keeps giving a
  one-room plan's room the bare base address (the dorm's
  `terminus/city/campus/duncan-hall`), so no map grouping moves.

### D6 — `Location.addExit` compares the zones that stand

The non-cardinal rule reads the source's own stamped zone (`this.getZone()`,
falling back to the path resolver only when unstamped) and the
destination's stamped zone when it stands (`exit.peekDestination()`),
falling back to `ZoneApi.resolveZoneForPath(destination path)` when it does
not. Because every plan now lies under a zone row of its own, the path
fallback for a sleeping copy answers the plan's row zone — never an outside
place's zone — so a way into a sleeping copy is still a way between zones.
Lands in the frame-retirement wave (B4), where it replaces the exemption.

### D7 — The index

- `PlaceNode.origin` gains `'copy'`. One node per room of a standing copy:
  `identity` = the room's durable handle (`<row>#<key>`, the index's
  standing rule), `template` = the room row, `zone` = the copy's zone
  identity, `coords` = the copy's (mirrored) coordinates, `edges` = the
  copy's ways (inside: rewritten to the sibling's handle; out: as authored),
  `address` = the room's stamped address.
- **Recorded at wake, by upsert** (`NavigationApi.recordCopy(zone identity, rooms)`).
  The warren hands over room specs it has already rewritten and mirrored;
  the registry projects them through its existing `edgesOf`/`coordsOf`, so
  there is one projection and one mirror. A throw is caught and recorded as
  a diagnostic, never failing the wake (the `DomainHook` precedent).
- **Retired at destroy only** (`NavigationApi.retireCopy(zone identity)`,
  from `destroyCopy`). Sleep does not touch it.
- **The rebuild sweep skips `origin: 'copy'`.** Copy nodes are not
  derivable from rows; they leave only by `retireCopy`. If the collection
  is dropped, each copy returns at its next wake.
- `checkGraph` ignores copy nodes: the invariants judge authored content,
  and a copy's soundness is its plan's, checked from the rows by
  `lint:locations`.
- **No inbound stub on the join place.** The copy's entrance carries its
  way out; `LocationGraphRegistry.pointingAt(place)` already answers "which
  copies join here". This follows the registry's own recorded decision that
  a stub with no reader is not shipped.
- `joins: frame` copies are never recorded.
- The firewall is untouched: nothing new imports `PlaceNode`, and the map
  writer is not edited.

### D8 — Persistence

A copy's zone composes no `Persistable` and writes nothing. Its identity is
re-derived at every wake from what already survives a restart: the
holding's record key (the parcel extent), a ship's minted identity (or her
authored `serial`, D12), a stop's own key. Patches are transient as today.
No row chooses persistence in this build (P6).

### D9 — Coordinates are authored; the mirror reflects them

- Every plan room row authors `coords:`, with the entrance at the origin
  and each cardinal way one cell — written once by hand using the rule
  `layOut()` applied, and from then on the row is the truth.
- `FloorplanRoom` gains `coords`; `FloorplanWarren.wakeRoom` passes
  `dataOverlay: { coords: <reflected> }` (`east-west` negates `x`,
  `north-south` negates `y`), so a mirrored copy is laid out reflected on
  its own grid and `setCoords` registers the cell on the copy's zone.
- Transitional (until B4): `layOut()` returns at once when every room of
  the plan authors coordinates. In B4 it is deleted and `Floorplan.load`
  throws on a plan room with none.
- **Exception, stated:** a moving place (reach patch, bank patch, stop, sea
  patch, sea stop) is the single place of its zone and is seated at the
  origin by `MovingZone.adopt`. Those rows author no `coords:` and stay on
  `lint:locations`' `OWN_FRAME` roster. They are cloned before their zone
  exists and stops are restored through the persistence spine, so authoring
  a coordinate would register them on the kind row's own instance, which D4
  refuses. This departs from the coordinator's list ("patch kinds get
  coords") and is flagged in Risks.

### D10 — The declaration lint

`lint:locations` (`packages/server/scripts/check-location-classes.ts`)
gains, as errors with no ceiling:

1. a row whose class extends `MintedZone` authors `mintedBy`, naming a row
   whose class composes `ZoneMintingMixin`;
2. a row whose class composes `ZoneMintingMixin` authors `zoneNaming` and
   `joins` from the closed vocabularies, and at least one zone row names it;
3. a plan owner (a `ZoneMinting` warren row with `extent`, or a Structure
   row whose `warren:` names one) has an `extent` that is a `MintedZone`
   row whose `mintedBy` names that warren;
4. every Location row under a `MintedZone` row authors `coords:` unless it
   is on `OWN_FRAME` — and the plan rows come OFF the plot rule's exemption
   rosters (`WARREN_PLACED`, and the plot-exemption use of
   `MINTED_ROWS`/`FURNISHED`), so the existing intra-zone rules (cardinal
   only, adjacent cells, opposite way back) judge a plan's rows from disk;
5. an authored ship row (a Ship row with `warren:` and any of
   `expanse`/`line`/`berth`) authors `serial`: one segment, unique among
   rows sharing its warren row, and not the leaf of any row under its
   extent.

Census-then-ratchet applies to rule 4 across the waves: the count of plan
rows still exempt from the plot rule is printed, gated at each wave's count
as a ceiling, and reaches zero in B4 (holdings in A1–A2, the smack in B1).

### D11 — Ships of a kind

`ShipWarren` composes the mixin; the smack's zone row becomes a
`MintedZone` (`mintedBy: /stuff/idea/ShipWarren/smack`), the warren row
authors `zoneNaming: under-row`, `joins: berth`; the three room rows author
coordinates (deck `0,0,0`; cabin `0,0,-1`; hold `0,1,-1`). Each smack's
zone is `/stuff/location/ship/smack/<serial>`.

### D12 — Authored ships become single copies of their kind

Read as the requirements define a copy (a set of rooms in a zone, made by a
warren): **her rooms and her zone become a copy made by her warren, exactly
as a smack's are; her own handle stays her row.** Keeping the handle is what
keeps everything harbors shipped keyed as it is — the register entries, the
berth roll, the charter book, the dues, the staging tool.

- Her Ship row gains `warren: /platform/idea/ShipWarren/authored` and
  `serial: <word>` (`hesper`, `ostrander`, `kittiwake`, `corrigan`). Her
  `extent` rows are her plan; her zone row becomes a `MintedZone`
  (`mintedBy: /platform/idea/ShipWarren/authored`). The `authored` warren
  row authors `zoneNaming: under-row`, `joins: berth`. Her copy's zone is
  `<her zone row>/<serial>` — named as every ship's is.
- `Ship`: the private `serial()` is renamed `mintedSerial()` with its body
  and every call site unchanged (so `isOfKind()`, `company`,
  `commission`, `mintCompany`, sleep and `dependentPersistables` keep their
  meaning). A new `copyKey()` = `mintedSerial() ?? this.serial` is used by
  `standWarren` only. `setSerial`/`getSerial` are the field's accessors.
- Deleted (the two shapes for her ROOMS): `ShipWarren.adoptResident`,
  `releaseRooms`, `planRows`, the `AUTHORED_SHIP_WARREN` default
  (every Ship row authors `warren:`), the `isOfKind()` branches in
  `watchRoomNow`, `watchRoom`, `liveMembers`, `standKind`'s early return,
  `onDestruct`, `memberExtent` (always `''` for a ship), and
  `ShipWarren.planOf`'s `isOfKind()` test.
- `deriveAttachments`: `extent` attaches a structure only for a non-plan
  row (unchanged); `expanse`/`line`/`berth` attach a craft for any Structure
  row that authors them. A kind row authors none, so "a kind attaches to no
  sea" still holds, and an authored ship is still stood up by her sea and
  her berth.
- ⭐ **The owner, 2026-11-17: unify behavior; where she came from is a
  separate question.** *"We want both authored content and minted content
  to exist in the game, and to have as much in common as possible."* The
  authored ships are placeholders until the game knows what watercraft it
  wants, so their keys are not worth protecting for their own sake. That
  gives the rule: **no code branches on a ship's origin for what she DOES.**
  - **Sleep is unified.** An authored ship sleeps when nobody interactive
    is aboard and she is not under way, the same rule as a ship of a kind.
    Drop the `isOfKind()` gate on `sleepIfEmpty`/`sleep`. She stands again
    on reference (her berth, her sea, a session at her deck) as any ship
    does. The build verifies what wakes her (her `BerthExit` on the quay,
    `stageShip`, a parked character aboard), and that her lookout and her
    company's standing survive a sleep and a wake. That is a test, not a
    reason to keep the gate.
  - **Origin stays data, not a branch.** Her company is her authored
    `house:` row rather than one minted at commissioning, and she has no
    commissioning, because she was written rather than built. Both are
    facts about where her data came from. The code reads "her company"
    either way, and nothing she does differs.
  - **Her handle stays her row** (no `<kind>/<serial>` re-key). Re-keying
    would only change which string the register, berth roll and charter
    book file her under; it unifies nothing she does.

### D13 — Moving water

`ReachZone` and `SeaZone` extend `MovingZoneMixin(MintedZone)`. The five
zone rows author `mintedBy`; the two warren rows author
`zoneNaming: under-row`, `joins: frame`. `ReachWarren.giveZone`,
`SeaWarren.mintPatch` and `adoptStop` call `wakeCopyZone`; `reap` calls
`sleepCopyZone`. Identities are unchanged. Nothing is recorded in the
index, and no claim names a patch (the navigation build's half).

### D14 — Frames retire last

Deleted in B4: `Warren.laysOutOwnFrame` and its four overrides,
`Location.crossesHoldingFrame` / `holdingFrameOf` and both call sites,
`FloorplanWarren.layOut` and its call in `wake`, the two test assertions,
and the frame language in `PersistentLocation.ts`, `Place.ts`,
`Floorplan.ts`, `FloorplanWarren.ts`, `ShipWarren.ts` and the smack zone
row. D6 lands with it.

### D15 — No migration

Room keys change for the dorm (`<extent>` → `<extent>/room`) and for the
authored ships' holds; dev databases are dropped, not migrated. Build-2 is
told the two changed room paths (the dorm room, and
`<authored ship zone row>/<serial>/<leaf>`); every other claim path is
unchanged.

---

## Host placement

| new thing | host | what composing it claims about the host's other composers |
|---|---|---|
| `mintedBy` | `MintedZone` | every `MintedZone` row is copied by a warren — true by construction; the lint and `wakeCopyZone` hold it. `CartesianZone`, `SphericalZone`, `FolderZone` do not gain it |
| the rooms refusal (D4) | `MintedZone.addLocation` | claims a copied zone's row never holds a room. True for every such row after the dorm restructure (four holding plans, five ship plans, five water kinds); the things and ideas filed under those rows are only stamped |
| identity-ancestry walk | `ZoneLogic.getEnclosingZone`, `Zone.peekAncestorField` | applies to EVERY zone, and changes none of them: identity = template for every authored zone. Not a field and not a guard |
| `zoneNaming`, `joins`, the four methods | `ZoneMintingMixin` on `HoldingWarren`, `ShipWarren`, `ReachWarren`, `SeaWarren` | all four mint zones and answer yes to every member. `MineWarren`, `CirculationWarren`, `DormWarren`, `PlatWarren`, `ColumnWarren`, the lounge: do not compose it |
| `coords` on `FloorplanRoom` | the value interface in `Floorplan.ts` | every plan room has one after B4 (`load` throws otherwise) |
| `serial` | `Ship` | read by `copyKey()` only. Four of the five Ship rows (the authored ships) mean it; the one kind row leaves it empty because each smack takes hers at the yard |
| `origin: 'copy'` | `PlaceNode` (a value of an existing field) | — |

Guards considered and refused: a `laysOutZone`-style boolean on `Warren`
(the frame mistake again); `mintedBy` on `SpatialZone`; the capability on
`FloorplanWarren` with the mine opting out.

Quiet-form check (P2): of the hosts composing `ZoneMintingMixin`, four of
four answer yes. Of the rows on `MintedZone`, all are copied.

P13 (the header sentence): `ZoneMintingMixin` — "this warren makes copies of
a zone: it names each, stands it up and puts it to sleep, and records it".
Every member is about that sentence. Plan reading, room keying and ways stay
on `FloorplanWarren`, whose sentence they belong to.

---

## Convention conformance

Checked against `CLAUDE.md` and the tree at plan time.

- **`props:` / `cast:`** — untouched; plan rows keep theirs.
- **Locations, not rooms** — every plan room is a `Location`-rooted class;
  no new place class.
- **`<root>/<branch>/` paths** — `MintedZone` is an instanceable `Idea` at
  `platform/idea/location/` beside `CartesianZone`; the mixin is substrate
  at `lib/location/`. Pack zone classes stay in their pack
  (`/system/water/location/`).
- **Module scope declares** — no module-scope statements; the vocabularies
  are `const` arrays.
- **Import boundary** — packs import the mixin and `MintedZone` by package
  specifier (`@saxonberg/server/mud/lib/location/ZoneMinting`,
  `…/platform/idea/location/MintedZone`); check both are reachable through
  the server's `exports` map.
- **Verbs on objects** — no `XApi.verb(host, …)`; `wakeCopyZone` is a
  method of the warren. `NavigationApi.recordCopy`/`retireCopy` are
  orchestration over the registry (their first parameter is a path, not a
  world object — check `lint:object-verbs`).
- **Mixins** — `Mixins.ZoneMinting` added (`lint:mixin-names`);
  `_mixinName = 'ZoneMintingMixin'`; file `ZoneMinting.ts`. Add
  `MixinApi.isZoneMinting` only if a call site narrows on it (none is
  planned; `lint:unconsumed-seams`).
- **Member privacy** — mixin state is TypeScript `private` (a Stuff host).
- **American English** throughout.

Review questions P3–P14:

- **P3 refuse / skip / throw.** Typed throws, checked first: a zone row
  that is not a `MintedZone`; a `mintedBy` that names another warren; an
  identity that shadows a row; `key` naming with a key that is not a path;
  `parcel` join with no covering parcel; a room joining a copied zone's row
  (D4); a woken room not in its copy's zone; a plan room with no coordinates
  (B4). Skip: `recordCopy` under `joins: frame`. Refusal: none new — no
  player act changes. A failed index write is recorded as a diagnostic.
- **P4 no duck typing.** The packs reach the capability through the mixin's
  typed interface and `instanceof MintedZone`. No `?.()` on an undeclared
  name is added; the existing structural casts in `ReachWarren.reap`
  (`zone as … { removeLocation }`) are replaced by the typed zone the mixin
  returns.
- **P5 the mixin decides.** No controller is touched. The naming rule lives
  in `copyIdentity` and nowhere else; `ShipWarren.zoneFromFor` calls it.
- **P6 persistence per content.** Nothing new persists. The identity key
  survives a restart because it is derived from a key that already does
  (D8).
- **P7 load on use.** A copy's zone stands when its warren wakes; the
  resolver finds it by its identity in the live index; the index row is
  written at wake. No boot entry, no scan, no reverse search (`mintedBy`
  points from the zone row to the warren row; the mint asserts it forward).
- **P8 names.** `MintedZone` — a zone whose instances are minted (the
  ref-shapes word). `ZoneMintingMixin` — the slate's sentence. `serial` —
  the word the ship register already uses. `copy` in method names is the
  requirements' word. No name collides with a shipped one (`MovingZone`,
  `LocationZone` are distinct concepts).
- **P9 predictable from the command def.** No view, arg or option changes;
  no command does anything new.
- **P10 new metadata a Document?** The two vocabularies select code paths
  in the mixin (two and three words); they are not tables read by name.
  No new `Idea` class with data-only rows (`MintedZone` has behavior — run
  `lint:data-ideas`).
- **P11 callers branching on the destination.** `wakeRoom` calls `clone`
  with `zoneFrom` the same way for every warren; the resolver decides. The
  zone comparison in `addExit` is inside the one method that owns the rule.
- **P12 a new name for an existing call.** `wakeCopyZone` is not a synonym
  for `clone`: it is the three shipped mint sites folded into one, with the
  declaration checks the sites did not make. `recordCopy` writes nodes the
  projection never could.
- **P13** — see Host placement.
- **P14 invisible moves.** The resolver's answer for a copy's path depends
  on whether the copy is awake. It cannot place a room wrongly: only the
  warren clones a copy's rooms, after standing the zone, and asserts the
  stamp; a sleeping copy's row zone refuses rooms (D4).

Lint gates this build must satisfy (run `pnpm -C packages/server lint:family`
at every wave): `lint:locations` (extended), `lint:location-graph`,
`lint:identity-mints` (three sites become one; ceiling unchanged),
`lint:instanceable`, `lint:mixin-names`, `lint:mixin-files`,
`lint:mixin-clusters`, `lint:field-meta`, `lint:boundary-roles`,
`lint:data-ideas`, `lint:object-verbs`, `lint:lib-statics`,
`lint:unconsumed-seams`, `lint:duck-typing`, `lint:schema`,
`lint:imports`, `lint:module-scope`, `lint:graph-walks`,
`lint:template-scans`, `lint:test-bootstrap`; and
`SpatialZone.authoredFields.test.ts`.

---

## Waves

Each wave ends at one commit, staged by name, pushed. Gate each with
`pnpm test:near`, every touched pack's own vitest, and `lint:family`. The
full suite runs once, at code-complete.

### Stage A — kernel, with the holdings as first consumer

#### A0 — A zone can have copies

Goal: the substrate, with no row using it yet (so nothing in the world
changes).

- New `platform/idea/location/MintedZone.ts` (D1, D4): `mintedBy`
  (`fieldMeta`, getter/setter), `isCopy()`, the `addLocation` refusal,
  `canEvict`.
- `platform/idea/api/ZoneLogic.ts`: live-first in `resolveZoneForPath` and
  `resolveEnclosingZoneForPath`; identity ancestry in `getEnclosingZone`
  (D2). `lib/zone/Zone.ts`: identity ancestry in `peekAncestorField`.
  Update the doc comments in `api/zone.ts`.
- Tests (beside the classes, importing `test-bootstrap`): a copy minted at
  an identity in the world tree inherits from the zones enclosing the
  identity and not from its row's parents; a copy under its row inherits
  the row's chain; the resolver returns a live copy for a path beneath its
  identity and the row zone once the copy is destructed; the row's instance
  refuses a room; `MovingZone.test.ts` still passes unchanged.
- Acceptance: the suite near the zone code is green; no content row
  changed.
- Commit: `feat(zone-instancing): A0 — a zone row can be minted as copies`.
- ✅ **Done (71f232009).** As planned. `liveCopyAt` in `ZoneLogic` is a
  module-private function (the `stepOutward` precedent), not a method.

#### A1 — The capability, and Hinkley Hills

Decisions: D1, D3, D5 (naming), D9.

- New `lib/location/ZoneMinting.ts`; `Mixins.ZoneMinting` in
  `lib/mixin.ts`.
- `lib/location/Floorplan.ts`: `FloorplanRoom.coords` read off the row.
  `lib/location/FloorplanWarren.ts`: the reflected `coords` overlay in
  `wakeRoom`/`mintKeyed`; the transitional early return in `layOut`.
- `packages/content/residence/src/idea/HoldingWarren.ts`: compose the
  mixin; `wake` stands the zone first and asserts the stamps. (`recordCopy`
  and `destroyCopy` are added to the mixin in A3 with the registry half —
  no stub lands here.)
- Content (`packages/content/hinkley-hills/…/hinkley-hills/`): `house.yaml`
  → `MintedZone` + `mintedBy`; `idea/house-programme.yaml` → `zoneNaming:
  key`, `joins: parcel`; `coords:` on `house/yard`, `house/garden`,
  `house/indoors/{hall,kitchen,scullery,living,bedroom,bathroom}`
  (yard `0,0,0`; garden `-1,0,0`; hall `0,1,0`; kitchen `1,1,0`; scullery
  `2,1,0`; living `-1,1,0`; bedroom `0,2,0`; bathroom `1,2,0`). Rewrite the
  stale headers of `lots.yaml`, `house.yaml` and `house/yard.yaml`.
- Tests: `HoldingWarren.test.ts` — two holdings of one programme stand in
  two zones named for their extents; a mirrored copy's cells are reflected;
  a room's `lookupField` reads the lot's chain; sleep destructs the zone
  and a second wake mints it again under the same identity.
- Acceptance: on a running world, two sold Hinkley lots are two zones; the
  drive's steps 1–5 can be walked by hand.
- Commit: `feat(zone-instancing): A1 — a holding's copy is its own zone (Hinkley)`.
- ✅ **Done.** Notes for review:
  - **`MintedZone` is resolved through `StuffApi.loadClassByPath`**, both in
    the mint and in the resolver, never by a static import: a pack reaches
    the kernel through its package specifier, and that is a different
    module instance from the one the class loader serves, so `instanceof`
    failed in the residence pack's suite.
  - **The mixin's base is typed `Stuff & { teardown() }`**, not `Warren`
    (TypeScript lost the base members over the abstract `Warren`). It
    sleeps its copies in `teardown()`, which `FloorplanWarren.onDestruct`
    and the institution's sleep both reach, after the rooms are down.
  - **`checkCopyRooms(zone, rooms)` joined the mixin** (not in D3's list):
    the typed throw D3 asks for after the wake, written once for holdings
    and ships.
  - **Decided: `PersistableApi.standUpKeyed` asks the CLASS whether a room
    stands up alone, before cloning** (it used to clone a shell, ask it,
    and destruct it). That shell, cloned from a plan row outside its copy,
    now lands on the zone row, which refuses rooms (D4). Every
    `standsUpAlone` is a constant of its class.
  - **Transitional until A2:** `HoldingWarren.wake` stands a copy zone only
    when its programme authors `zoneNaming`. The other three programmes
    are declared in A2, which removes the condition.
  - A copy's rooms are now sized by the PLAN's zone cell (6 m for the
    house), not the lots' zone; the B54 test is rewritten to say so.

#### A2 — The other holdings

Decisions: D5 (leaf, the dorm restructure), D9.

- `Floorplan.ts`: drop `single`; every room has a leaf.
  `HoldingWarren.addressFor`: a one-room plan keeps the base address.
- Hearts Delight: `farmstead.yaml` → `MintedZone`; `idea/farmstead.yaml`
  declarations; `coords:` on the yard (`0,0,0`), barn (`0,1,0`), house
  (`0,-1,0`), lower meadow (`1,0,0`), orchard close (`1,1,0`), upper bench
  (`0,0,1`). The yard's two keyed doors lead north and south; check the
  far sides' ways back are the opposites.
- Seznick House: `location.yaml` → `MintedZone`; `unit-programme.yaml`
  declarations; `coords:` on hall (`0,0,0`), main (`0,1,0`), bedroom
  (`-1,0,0`), bathroom (`-1,1,0`).
- Duncan Hall (D5): the new `unit.yaml` zone row; move the room row to
  `unit/room.yaml` with `coords: 0,0,0`; `dorm-programme.yaml`; the dorm
  building row; `DormRoom.SCOPE`
  (`packages/content/eternal-university/src/duncan-hall/location/DormRoom.ts`);
  `DormWarren` constants and comments; the dorm suites. Remove the
  now-impossible failure note in `handDaypack` only after a test proves the
  unit door hangs.
- `check-location-classes.ts` rosters: move the paths that moved.
- Acceptance: a dorm unit, a Seznick unit and the farmstead each stand in
  their own zone; the dorm's `unit-N` door and `out` hang with no refusal.
- Commit: `feat(zone-instancing): A2 — farmstead, Seznick and dorm units are copies`.
- ✅ **Done.** Notes for review:
  - The A1 transitional condition is gone: every holding programme
    declares its copies, and an undeclared one throws at wake.
  - **The dorm room moved** to `duncan-hall/unit/room.yaml` under the new
    zone row `duncan-hall/unit.yaml`. Its key is `<unit extent>/room`.
    `DormRoom.isUnit(extent)` now asks which copy the room stands in
    (`getZone().getIdentityPath()`), not its key.
  - **Fixtures converted** to declared copies, each with a `MintedZone`
    row, `zoneNaming`/`joins` and cells: residence `HoldingWarren` and
    `TitleVerb`; terminus `SeznickHouse`; the three dorm suites. The
    TitleVerb one-room plan now has a zone row of its own, so its yard is
    keyed `<lot>/yard`.
  - ⚠ **Owed at Checkpoint A:** six wire drives and two e2e specs open a
    session AT the dorm room ROW (`startLocation: DORM`). The harness
    stands a room row up as a singleton, which now lands on the
    `duncan-hall/unit` row's own instance and is refused (D4, as
    designed). Files: `wire/tests/{avatar-family,documents-path-identity,field-population,field-population.soak,ground,instrumentation}`
    and `e2e/tests/{documents-path-identity-walk,ground-walk}.spec.ts`.
    They are re-homed to a let unit or another interior when a world is
    standing to check them; none of them is in `pnpm test`.
  - `handDaypack`'s note about the `unit-N` refusal stays until drive
    step 6 shows the door hanging in a real world (the fixtures carry no
    corridor zone row, so they cannot prove it).

#### A3 — The index records copies

Decision: D7.

- `lib/location/PlaceNode.ts` (`origin`), `platform/idea/LocationGraphRegistry.ts`
  (`recordCopy`, `retireCopy`, the sweep exemption, `checkGraph` excluding
  copies), `api/navigation.ts` + its logic singleton (two forwarders),
  `packages/server/src/schema/location_graph.yaml` (the doc; run
  `pnpm gen:schema` and commit any generated change).
- `ZoneMinting.recordCopy` / `destroyCopy` wired; `HoldingWarren.revert`
  calls `destroyCopy`.
- Tests: wake records one node per room under the copy's zone; sleep leaves
  them; `revert` removes them; `rebuild()` leaves them; a `frame` copy
  writes none; `pointingAt(<lane>)` names the copy's entrance.
- Commit: `feat(zone-instancing): A3 — the location graph records copies`.
- ✅ **Done.** Notes for review:
  - `CopyRoom` (the warren's hand-over, D7) lives beside `PlaceNode`;
    `FloorplanWarren.copyRooms()` builds it — each room's handle is
    `<row>#<key>` from the key the warren stood it up under, so a room
    that keeps no record (a porch, a farm yard) is named like a furnished
    one (`getDurableHandle()` answers null for those).
  - `removeRow` (a CMS save of a plan row) keeps copy nodes too, not only
    the rebuild sweep.
  - **Pre-existing bug fixed:** `LocationGraphRegistry.projectRow` called
    the GATED `removeRow` on itself, which its own gate refused — so
    re-projecting any row that is not a place had always thrown, and
    `DomainHook` only logged it. Split as `removeRowImpl`, the
    `rebuildImpl` precedent.
  - `recordCopy` failures are written to `DiagnosticApi` (channel
    `location-graph`), never thrown into the wake.

#### A4 — The declaration lint

Decision: D10.

- `packages/server/scripts/check-location-classes.ts`: rules 1–4 (rule 5 in
  B3), the plan-row census with its ceiling at today's count (the smack's
  three rows), and the roster edits. Unit tests beside the script's
  existing ones, each rule made to fail once.
- Acceptance: `lint:locations` green; removing `mintedBy` from one zone row,
  or `coords` from one plan row, fails it.
- Commit: `feat(zone-instancing): A4 — lint:locations checks what content says about copies`.
- ✅ **Done.** `copyDeclarations` (rules 1–4) and `unplottedPlanRows`
  (the census, ceiling 3 = the smack's deck, cabin, hold) in
  `check-location-classes.ts`. The two vocabularies are read off
  `ZoneMinting.ts`'s source, not copied. Rows under a `MintedZone` leave
  the plot rule's rosters (the Hinkley garden and the farmstead's tracts
  and yard came off `WARREN_PLACED`). Proven on real content: deleting
  `mintedBy` from `hinkley-hills/house.yaml` and `coords` from its hall
  each fail the gate.

**Checkpoint A** — write
`packages/wire/tests/zone-instancing.dirty.wire.test.ts` with steps 1–6 and
the holdings half of step 10, and run it. Commit:
`test(zone-instancing): the drive, stage A`.

### Stage B — ships, moving water, the retirement

#### B1 — Ships of a kind

Decision: D11.

- `platform/idea/ShipWarren.ts`: compose the mixin; `zoneFromFor` through
  `copyIdentity`; `wake` stands the zone first for a ship of a kind.
- Content: `packages/content/terminus/content/stuff/location/ship/smack.yaml`
  (class, `mintedBy`, header), `…/stuff/idea/ShipWarren/smack.yaml`
  (declarations), `coords:` on the three room rows.
- Tests: `ShipWarren.test.ts` — two smacks are two zones under the kind
  row; her zone reads the kind row's `cellSize`; she sleeps and wakes under
  the same zone identity.
- Lower the plan-row census ceiling to zero.
- Drive step 7 added and run.
- Commit: `feat(zone-instancing): B1 — each smack's decks are her own zone`.
- ✅ **Done.** Notes for review:
  - **Kernel fix in `StuffApi.clone`:** a COPY of a spatial zone resolves
    its own zone stamp from its ROW (as the row's own instance does —
    "a zone is not inside itself"), not from its identity. Minting a smack's
    copy at `<kind zone>/<serial>` found the row as the identity's nearest
    zone and cloned it from inside its own clone (the cycle guard threw).
    The water mints never hit it only because their row instance always
    stood first.
  - `ShipWarren.zoneFromFor` = `${copyIdentity(<kind zone>, serial)}/${leaf}`
    — byte-identical to the old `<row folder>/<serial>/<leaf>` for the
    smack.
  - **Lint rule 2 narrowed:** a minting warren must be named by a zone row
    once it HAS a plan (its own `extent`, or a row whose `warren:` names
    it). The authored-ship warren row is declared now (`under-row`,
    `berth`) and named by a zone row in B3.
  - The census ceiling is 0; the smack's rows left `WARREN_PLACED`.
  - Five ship suites' fixtures now install the kind zone as a
    `MintedZone` and declare their warren rows.

#### B2 — Moving water

Decision: D13.

- `packages/content/water/src/location/{ReachZone,SeaZone}.ts`,
  `…/src/idea/{ReachWarren,SeaWarren}.ts`, the five zone rows, the two
  warren rows. Remove the three inline mints and their markers.
- Tests: the water pack's vitest; a patch's zone is a `MintedZone` copy
  declared by its row; reaping a patch leaves no zone; nothing is written
  to `location_graph`.
- Drive step 9 added and run.
- Commit: `feat(zone-instancing): B2 — reach and sea patches are short-lived copies`.
- ✅ **Done.** `ReachZone`/`SeaZone` are `MovingZoneMixin(MintedZone)`; the
  three hand-written mints (`ReachWarren.giveZone`, `SeaWarren.adoptStop`,
  `mintPatch`) call `wakeCopyZone(<kind row>, <key under it>)` and both
  `reap`s call `sleepCopyZone` (the structural `removeLocation` casts are
  gone). The five zone rows author `mintedBy`; the two warren rows
  `under-row` / `frame`. Identities are unchanged. The `SeaWarren` and
  `SeaStop` unit tests run with no rows, so they stub the warren's
  `wakeCopyZone` (as they already stubbed `clone`). New
  `water/src/__tests__/ZoneCopies.test.ts`: a patch zone is a declared
  copy, sleeping it leaves none, a frame copy is never recorded, an
  undeclared row is refused.
- Decided: drive steps 7–9 and the ships half of 10 are written and run
  ONCE at B5 (code-complete), not per wave — a fresh-world run costs
  15+ minutes on this machine (load ~13 on 8 cores).

#### B3 — Authored ships

Decision: D12. The riskiest wave: it is last before the retirement, touches
only ship code and ship content, and its files were not touched by B1's
content commit, so it can be backed out to the branch's merge point per
file (`CLAUDE.md` § Worktrees rule 7) without disturbing B4.

Order inside the wave:

1. `Ship.ts`: `mintedSerial()` rename (mechanical), the `serial` field,
   `copyKey()`. Run the ship suites — nothing should change yet.
2. Content, one ship at a time, Hesper first: zone row → `MintedZone`;
   Ship row gains `warren:` and `serial:`; the `authored` warren row gains
   its declarations. `deriveAttachments` change in the same commit step.
3. Delete adoption (`adoptResident`, `releaseRooms`, `planRows`,
   `AUTHORED_SHIP_WARREN`) and collapse the rooms-side `isOfKind()`
   branches listed in D12, plus the sleep gate (D12, the owner's
   2026-11-17 ruling). Then grep `isOfKind()` in `Ship.ts`/`ShipWarren.ts`:
   any branch left must read origin as data (company row, commissioning),
   never change what she does.
4. Lint rule 5.
5. Tests and drives that open a session AT an authored ship's room row
   (the six wire files in Grounding, plus `e2e/`): stand her up first
   (`stageShip(handle, {})`), then enter by her way aboard or by the row
   path. Soak files are edited in the same wave even though the soak lane
   runs them later.

Verify, each with a test: the Hesper stands up from a cold world by her sea
and by her berth; her way aboard appears on the estuary mouth; her company
stands and her lookout is on deck; `charter` at her hold's book works; her
hold's cargo survives a restart; she is not evicted while anyone is aboard;
she sleeps when empty and not under way, and wakes on reference (her berth,
a session at her deck) with her lookout, company and cargo intact; the Ostrander (on the river, `overside`)
and the two harbor ships do the same.

Drive step 8 added and run, with the harbors drive
(`harbors.dirty.wire.test.ts`) re-run whole as the regression proof.

- Commit: `feat(zone-instancing): B3 — the authored ships are single copies of their kind`.
- ✅ **Done.** Notes for review:
  - `Ship`: `serial()` → `mintedSerial()`; a `serial` field (authored);
    `copyKey()` keys her warren for every ship. Collapsed:
    `watchRoomNow`/`watchRoom` (her warren's entry room), `liveMembers`,
    `standKind`'s early return (an authored ship is now ADOPTED BY HER
    FRAME like any ship), `onDestruct`'s release, `memberExtent` (always
    `''`: her rooms are told by her warren). ⭐ **Sleep is unified** (the
    owner, 2026-11-17): `sleepIfEmpty`/`sleep` lost the `isOfKind()` gate.
    Remaining `isOfKind()` reads are origin as DATA only: which company row
    is hers (minted vs her `house:`) and a stand-up warning.
  - `ShipWarren`: `adoptResident`, `releaseRooms`, `planRows`,
    `AUTHORED_SHIP_WARREN` deleted; `planOf` serves every ship.
    `Compartment.joinShip` deleted (every ship room is a warren member).
  - Content: the four authored ships author `warren:` (the `authored` row)
    and `serial:`; their zone rows are `MintedZone`s minted by it.
    `deriveAttachments`: `expanse`/`line`/`berth` attach a craft for any
    Structure row; `extent` attaches a structure only when not a plan.
  - Lint rule 5 (`serial`: one word, unique per warren, shadowing no row)
    — proven by deleting the Hesper's serial.
  - ⭐ **Found and fixed — a person aboard any ship came back nowhere after
    she slept.** A keyed ship room's placement `{container, containerKey}`
    went to the institutions' `admitFor`, which no serial matches (true of
    every SMACK before this build; true of the authored ships after D12).
    `HostPlacement` gains `structure` (the room's warren's structure); a
    restore that no institution covers stands her up
    (`ExpanseApi.standUpCraft`) and takes the room her warren minted under
    the key. Test: `ShipWarren.test` (a smack; shown failing without it).
  - ⚠ **A wizard `goto`/a harness `startLocation` naming an authored
    ship's room ROW while she is asleep is refused (D4)** — accepted, not
    softened: no player path names a row (her way aboard and a saved place
    go through her). The six drives that open sessions at her rows stand
    her up first (`stageShip(handle, {})` — an empty stage now stands her
    up where she lies, with her rooms).
  - The six wire drives + two e2e specs that started AT the dorm row (the
    A2 debt) now start at the furnishing archetype
    `/stuff/location/room/bedroom` — the same kind of orphan interior the
    dorm row used to be, outside any copied zone.
  - Test seams: the mooring/charter/harbor suites build a ship by hand
    around a fixture deck; under D12 her deck is her warren's, so they give
    her a stand-in warren (`standFixtureWarren`: entry room, live rooms,
    membership) — they test lines, berths and books, not instancing.

#### B4 — Frames retire

Decisions: D6, D14.

- Deletions per D14; `Location.addExit` per D6; `Floorplan.load` throws on
  a plan room with no coordinates; `edgeRefusal` loses its frame line, so
  the edge rules judge every way inside a copy.
- Grep `laysOutOwnFrame|crossesHoldingFrame|holdingFrameOf|layOut\(|own frame`
  across `packages/` and `docs/subsystems/` and clear every hit (docs are
  rewritten at the sweep, but a comment in source that describes a retired
  mechanism is fixed here).
- Tests: a non-cardinal way between two rooms of one copy is refused; a
  misplaced plan cell is refused by `edgeRefusal`; the way out of a copy
  (lot gate, dorm `out`, `ashore`) is admitted with the far side standing
  and with it asleep.
- Commit: `refactor(zone-instancing): B4 — frames retire`.
- ✅ **Done.** Deleted: `Warren.laysOutOwnFrame` and its four overrides
  (FloorplanWarren, MineWarren, ReachWarren, SeaWarren),
  `Location.crossesHoldingFrame`/`holdingFrameOf` and both call sites,
  `FloorplanWarren.layOut` and its call, the two test assertions, the
  frame language in six comments. `Floorplan.load` throws on a plan room
  with no cell (`FloorplanRoom.coords` is no longer optional).
  `Location.addExit` (D6) compares the zones that STAND, falling back to
  the path resolver for a side not standing. Notes:
  - ⭐ **Decided: `installExit` takes a fourth parameter, `judgeAs`** — the
    authored way a warren's way is a copy of. The edge rules lived only on
    the applied-from-spec path (`applyExits` → `_refuseIfUntrue`), and a
    copy's inside ways are installed with a live destination, so without
    this they were never judged. `FloorplanWarren.wireWays` passes the plan
    row's spec. Tests (HoldingWarren): a named way inside a copy is refused;
    a misplaced cell is installed unbuilt; a named way out is admitted with
    the far side standing or not.
  - D6's `peekDestination()` read surfaced an over-broad mock in
    `Ship.charter.test` (`findByIdentityPath` answering the charterer for
    every path) — narrowed. `Ship.flooding.test` cloned the deck ROW as
    "ashore" (now refused, D4) — a plain `Locale` instead. Ship and
    floorplan fixtures author cells.

#### B5 — Code-complete

- The whole blocking drive (steps 1–10) green; each checkpoint made to fail
  once on purpose (B2).
- The browser walk `e2e/tests/zone-instancing-walk.spec.ts` (B3): walk a
  Hinkley house from the lane and back, and board the Hesper.
- The Drive record appended below; the MR opens READY; then the one full
  `pnpm test`.

---

## Reachability wiring

No verb, affordance or argument gate is added; the capability is reached by
loading.

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a holding's copy zone | none new (`title buy`, Katie's let, walking in) | unchanged | zone row `MintedZone` + `mintedBy`; programme row `zoneNaming`/`joins`; room `coords` | the institution stands the holding → `HoldingWarren.wake` → `wakeCopyZone`. Fails loudly if the zone row is not declared | none |
| a ship's copy zone | none new (`go <ship>`, the berth roll) | unchanged | as above, on the kind's zone row and warren row; `serial` on an authored ship | `Ship.standWarren` → `ShipWarren.wake`; an authored ship is stood up by the attachment at her `expanse`/`berth` | none |
| a patch's zone | none new | unchanged | `mintedBy` on the five rows | minted by its warren with the place, as today | none |
| the resolver seeing a copy | — | — | — | `findByIdentityPath` on the live index; nothing to warm | — |
| copy nodes in the index | none (never reaches a client) | — | — | written at wake; read by `nodesInZone` / `pointingAt` | — |
| the lint | `pnpm -C packages/server lint:locations` | — | — | derived roster (`lint:family`) | — |

Silent-failure check for each link: an undeclared zone row throws at wake;
a room stamped elsewhere throws at wake; a missing `coords` fails the lint
and (after B4) the plan load; an index write that fails is a diagnostic.

---

## Acceptance-criteria coverage

| acceptance criterion | waves | proved by |
|---|---|---|
| Two copies of one plan are two places on a map, and a wizard reads two zones named by their maker | A0, A1 | drive 1–4; `HoldingWarren.test` |
| A house's rooms answer to the government and weather of its lot | A0 (D2), A1 | drive 4; the inheritance unit tests |
| Every way in and out of a copy behaves as any way does | A2 (dorm door), B4 | drive 2, 5, 6; `Location` tests |
| A plan's rooms carry authored positions; nothing invents one at run time | A1, A2, B1, B4 | `lint:locations` rule 4; `Floorplan.load` |
| Every ship is the same kind of thing; everything harbors shipped still works | B1, B3 | drive 7, 8; the harbors drive re-run |
| A drifting boat's water reads as before; the map never records a patch | B2 | drive 9 (the claim half is the navigation build's) |
| After a restart every kept copy returns under the same name with the same rooms | A1–B3 (D8) | drive 10 |
| A new kind of copy can be added with rows only | A1, A4 | a unit fixture: a second programme and zone row with no code, stood up in `HoldingWarren.test` |

Goals not in the acceptance list: *the index records copies* → A3 (unit
tests; it never reaches a client, so no drive step can read it). *What can
be copied is declared in content* → A4.

Nothing is unmapped. One criterion is read narrowly — see Risks 1.

---

## Test & gate strategy

**Unit** (Vitest, colocated, `test-bootstrap`): the zone substrate (A0);
the mixin's checks, each throw exercised (A1); mirrored coordinates; the
registry's copy nodes and the sweep exemption (A3); each lint rule failing
once (A4); the ship suites (B1, B3); the water pack (B2); the edge rules
inside a copy (B4).

**Only the drive can prove**: a real lot bought and walked; the dorm door;
two smacks side by side; the Hesper end to end; the restart.

**The blocking drive** —
`packages/wire/tests/zone-instancing.dirty.wire.test.ts` (it buys lots and
restarts the world, so it cannot run twice). All ten steps are blocking; no
`span` step and no soak drive.

| # | pace | step | staging tool |
|---|---|---|---|
| 1 | staged | two Hinkley lots sold to two characters, each house standing | funding by the founder's `reserve override … to <handle>` (the `funded` helper in `harbors.dirty`); the sale itself is played, `title buy <lot>` (the `tracts.dirty` precedent) |
| 2 | instant | walk from the lane through every room; `look` in each; each way is where the plan says | none |
| 3 | instant | the second character does the same next door; `map` for the locality lists two houses, neither's rooms under the other | none |
| 4 | instant | a wizard reads the house's zone identity (the lot's extent), and the government and weather read the same in the hall as on the lane | `eval --parcel <lot extent>` by the founder for the zone identity; `government` and the weather reading are player verbs. Assert the eval result is a value, not a refusal |
| 5 | short | step out the front door onto the lane: no refusal, no new line | none |
| 6 | staged | a student is let a Duncan Hall unit, walks in, `look`s, walks out; the unit is its own zone | Katie's let (the `boundary.dirty` precedent); the zone read as in step 4 |
| 7 | staged | a smack at a quay, boarded and walked; a second beside her is a different zone | bought at the yard as `harbors.dirty` stage B does (played); `advanceWorldClock` only if the yard's build takes game time |
| 8 | instant | board the Hesper: the gangway, the berth roll, `pay`, `charter` answer as before; her zone is `<her zone row>/hesper` | `stageShip` only if she must be brought to a berth; the zone read as in step 4 |
| 9 | short | cast off on the Kestrel and drift; the water reads as before | whatever puts a boat on a Kestrel bank in `river-a.soak.dirty` (reuse its staging; do not sail a span) |
| 10 | short · staged | restart; each house, the dorm unit, the smack and the Hesper are back under the same zone identities with the same rooms; the characters' maps still list them | the `harbors.dirty` step 15 restart (`dev-preflight.mjs` with a 60 s grace, `bootOwnedWorld`) |

No state in this drive lacks a staging tool; the build owes no new one.

Step 9's "the map records the river and never the patch" is asserted only
as far as master's `map` goes at build time; the claim rule is the
navigation build's and is not re-implemented here.

**Gates**: `lint:family` at every wave; `pnpm test:near` + the touched
packs' vitest between; `pnpm test` at code-complete and at `/finalize`
only.

---

## Sibling builds — where the files overlap

Checked 2026-11-17 against `docs/plans/navigation-server-plan.md`
(build-2, `build/navigation-server`) and `docs/plans/geography-plan.md`
(build-3, `reqs/geography`). Neither gates this build; the second to merge
reconciles.

**navigation-server.** The one *semantic* overlap.
- It adds `Warren.frameIdentityOf(member)` (its N8), which answers
  `zoneFromFor(spec, warrenKey())` only when `laysOutOwnFrame()`, and reads
  a copy's coordinates from `layOut`. B4 deletes both.
- **If nav merges first:** B4 replaces every call to `frameIdentityOf` with
  the room's stamped zone identity (`place.getZone()?.getIdentityPath()`),
  which is the same string by D5, and deletes the method with
  `laysOutOwnFrame`. Its `getCoords()` read is unchanged, because the
  coordinates are now authored (D9).
- **If this build merges first:** tell build-2 to write `at.zone` from the
  stamped zone's identity and to drop `frameIdentityOf`.
- **Room paths:** the dorm room and the authored ships' rooms (D15) are
  recorded in its plan's Risks. Whichever build merges second updates the
  drive's room paths.
- `Cartographer.ts`: this build only reads it.

**geography.** Textual overlaps only.
- *`LocationGraphRegistry.deriveAttachments`:* geography appends one call
  at its end and one in each of `attachStructure`/`detachStructure`. This
  build's D12 changes the attach rule in its body. Merge both.
- *The authored ship rows:* geography adds `showsLight: true` to all four
  authored ships' Ship (`structure.yaml`) rows. B3 adds `warren:`/`serial:`
  to the same rows and re-classes their zone rows. Merge both. Under D12
  the Ship stays her own row, and only her zone and rooms become a copy,
  so `showsLight` hydrates on her exactly as before. B3 verifies it.
- *Seznick House's address:* geography fixes the base to
  `terminus/city/mayfield-row/seznick-house`, so every unit address
  `HoldingWarren.addressFor` stamps shifts. No step of this drive asserts
  a Seznick address. A2's tests that do, assert the base read from the
  row, never a literal.
- *`ZoneLogic`:* geography's D7 makes `climateSiteFor` fall back to the
  address's latitude when a zone chain declares none. Under D2 a holding's
  chain runs through its lot, as before; a ship's runs through her kind
  row, which declares none, so it falls back to the address. Compatible,
  with no edit on either side.
- *`LocationZone.lookOutFrom`:* geography rewrites it to stand up the
  skyline. Copy rooms now reach `addLocation` (Risk 2), so each copy room's
  wake runs geography's kick. That is unawaited and memoized, so it stays
  a load-on-use cost. Verify that a house's wake does not stand up rooms.
- *`packages/wire/src/harness/world.ts`:* all three builds append staging
  helpers. Append-only.

## Risks & opens

1. **How far "the authored ships become copies" goes (D12).** This plan
   makes her rooms and zone a copy and keeps her handle her row. The
   requirements can also be read as minting the SHIP under
   `<kind row>/<serial>`. That reading re-keys every handle harbors wrote
   (four register entries, berth rolls, the charter book's rates, the
   harbor's exemption, the staging tool, some ten test files), needs a
   stand-up that seeds a minted ship with no record, and an attachment
   that stands a path with no row. Not planned. If the owner wants it, it
   is a follow-up wave after B3, not a change to B3.
2. **Stand-up order for an authored ship's rooms.** After B3 a room row of
   hers stood by path before she stands lands on the kind row's zone and
   throws (D4). In play she is always stood first (her sea, her berth, her
   way aboard). Tests that open a session at her deck are the known
   breakage and are fixed in B3. If a production path is found that names
   her room first, stop and re-plan; do not soften D4.
3. **Rooms in copies join a grid for the first time.** `addLocation` now
   fires for them, so `LocationZone.standUpAttached` and `lookOutFrom` run.
   A keyed room's identity is its row, so attachments are read along the
   PLAN's path. Verify nothing stands a plan's row up and that a house yard
   stands up no more than the lane does.
4. **Eviction.** Confirm how the residency sweep treats a zone that holds
   rooms (`CartesianZone` declares no `canEvict`) and that an authored ship
   with `memberExtent() === ''` is not evicted with people aboard — the
   smack's path is the model.
5. **`location_graph` stops being wholly derived.** Copy nodes survive a
   rebuild and return only at a wake if the collection is dropped. That is
   the crack the owner accepted, kept to one `origin` value.
6. **Ceilings.** `lint:boundary-roles` may count a new `Zone` subclass;
   `lint:mixin-clusters` and `lint:lib-statics` may count the mixin. If a
   ceiling would rise, do the caller audit (`docs/lint-family.md`, ratchet
   lesson 4) before touching the number.
7. **Edge rules inside copies (B4).** Coordinates in this plan were derived
   from the rows' ways; a keyed-door way or a reflected copy may still trip
   the opposite-way-back rule. Each failure is a content fix, not an
   exemption.
8. **Moving places author no coordinates (D9).** A departure from the
   coordinator's list, for the reason given there.
9. **The navigation build (S10, S11).** S10 wants a ship to be a Locality;
   S11 wants the jurisdiction aboard to be read through `subjectTo`. This
   build gives each ship exactly one zone instance, which is where S10 can
   put a ship's address, and it reads no government off a ship's zone, so
   S11's fix is unaffected. Neither build waits on the other. Build-2 must
   be told the two changed room paths (D15).
10. **Test churn.** `FloorplanWarren.test`, `HoldingWarren.test`,
    `ShipWarren.test`, the dorm suites and every fixture that installs a
    plan without a zone row. A fixture that omits the zone row silently
    skips the zone rules (the Seznick `location.yaml` header records this);
    fixtures install the `MintedZone` row.
11. **Mirrored copies in the index.** The warren hands over reflected
    specs; if `edgesOf` re-reads the row instead, a mirrored house is
    recorded unmirrored. Covered by an A3 test.

Stop and ask rather than guess: any production path that requires softening
D4; any need for a second `isOfKind()`-style flag; any lint ceiling rise.

---

## Deferred seams

- **A ship's own identity as a minted copy** (Risk 1) → a note for
  [navigation-server-slate](../slates/engine/navigation-server-slate.md)
  S10/S11's follow-up, or a short slate of its own if the owner asks.
- **Copying a whole locality or district** → the requirements' non-goal;
  `ZoneMintingMixin` and `MintedZone` are the attach point (a copy of a
  zone that holds zones is a new `zoneNaming`/`joins` word and a warren
  class). No stub.
- **A destroy path for ships** — nothing destroys a ship today (a wreck
  stands). `destroyCopy` is called by a holding's `revert` only; a
  ship-breaking act would call it.
- **`ZoneMinting` for spherical copies** — `MintedZone` extends
  `CartesianZone`; promote when a spherical copy exists.
- **An inbound edge on the join place** (D7) — add when something reads
  one.

At the sweep the zone-instancing slate retires whole (its six opens are
closed by D1–D15); knowledge graduates into `zone.md` (the "must be an
AUTHORED template row" warning is now false), `holding.md`, `ship.md`,
`river.md`, `location-graph.md` and `boundary.md`.

---

## Critical files

Read first, in this order:

1. `packages/server/src/mud/platform/idea/api/ZoneLogic.ts`
2. `packages/server/src/mud/lib/zone/{Zone,MovingZone,LocationZone}.ts`
3. `packages/server/src/mud/platform/idea/location/CartesianZone.ts`
4. `packages/server/src/mud/api/stuff.ts` (lines 440–730, `clone`)
5. `packages/server/src/mud/lib/location/{Warren,FloorplanWarren,Floorplan,Location}.ts`
6. `packages/content/residence/src/idea/HoldingWarren.ts`
7. `packages/content/water/src/idea/{ReachWarren,SeaWarren}.ts` (the
   existing mints) and `packages/content/water/src/location/{ReachZone,SeaZone}.ts`
8. `packages/server/src/mud/platform/idea/{ShipWarren,Ship}.ts`
9. `packages/server/src/mud/platform/idea/LocationGraphRegistry.ts` and
   `packages/server/src/mud/lib/location/PlaceNode.ts`
10. `packages/server/scripts/check-location-classes.ts`
11. `packages/content/eternal-university/src/duncan-hall/idea/DormWarren.ts`
    and `…/location/DormRoom.ts`
12. The plan rows in the Grounding table, and
    `packages/wire/tests/{harbors,tracts,boundary}.dirty.wire.test.ts`

---

## Drive record

*(appended at build time)*

### Checkpoint A — stage A drive record (2026-11-17)

`packages/wire/tests/zone-instancing.dirty.wire.test.ts`, run on a freshly
dropped `saxonberg_build4` world (`WIRE_PORT=2019`,
`WIRE_FRAME_TIMEOUT=120000` — the machine ran at load ~13 on 8 cores with
sibling suites): **7/7 green** (steps 1–6 and the holdings half of 10).

- 1–2: two Hinkley lots sold; lot-2 is across the lane and its house is
  laid out MIRRORED north–south (door south of the yard, gate north) —
  every room walked in the reflected order.
- 3: `map terminus/hinkley-hills` lists `…/lot-2/<room>` for the owner and
  `…/lot-3/<room>` for the neighbor, neither's under the other.
- 4: the founder's read finds a live `MintedZone` copy at
  `/world/terminus/hinkley-hills/lots/lot-2` (row `…/hinkley-hills/house`,
  8 rooms); `government` names the Hinkley Hills Improvement District in
  the hall as on the lane. (A copy's zone stands only while somebody is in
  it — the read is taken from the hall.)
- 6: Katie lets a unit; `unit-1` opens to the student; their room stands in
  a copy `/world/terminus/eternal/duncan-hall/dorms/f1-r1` of
  `duncan-hall/unit`, the one room `unit/room`. The `unit-N` refusal the
  size-and-carrying drive recorded is gone.
- 10: restart; the house returns as a copy at the same identity with the
  same rooms, the map still lists it, and the student logs back in INSIDE
  their unit, its copy under the same name.

**Found by the drive, fixed (pre-existing, not this build's):**
- `CirculationWarren.admitFor` took a holding's key to be the first
  segment under the institution's parent — `…/hinkley-hills/lots` for a
  Hinkley lot — so a character parked in their yard could not be
  re-entered. Now the covering parcel (`3e212a296`).
- `CirculationWarren.reconcile` reaped a minted corridor with a person
  standing in it once the unit beside it slept, evacuating them to the
  void. A node with an occupant is kept (`5e78eb625`).

**Findings, recorded and NOT fixed here (pre-existing, outside the build):**
- After a restart Duncan Hall's lobby has no `up` until the dorm's warren
  stands, and nothing the lobby loads stands it (the warren is attached to
  its dorms extent, installed in its `onCreate`). A student re-homed to the
  lobby cannot climb. → residence / Duncan Hall.
- A Hinkley reach that is reaped and later re-stood keeps the lane's way
  to it BLOCKED: destructing the reach blocks the inverse of each of its
  ways (`Exitable.onDestruct`), and `PlatWarren.wireCirculationNode` returns
  early when the predecessor already has the onward direction. → residence
  (plat circulation). Only seen on a world that has sold past the first
  reach, which is why the drive runs on a fresh world.
- `terminus/general-store-standup.integration.test.ts` failed once under
  load and passed alone.
