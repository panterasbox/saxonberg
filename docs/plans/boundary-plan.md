# Boundary — implementation plan

Executes [boundary-requirements](../requirements/boundary-requirements.md): every way between two
places becomes ONE `Boundary` shared by both places, each place's exit is a SIDE of it, the four
models of today ([boundary-slate § 1](../slates/builds/boundary-slate.md)) fold into it, the zone
invariants are stated for the edge, and one wire shape tells every screen a way's whole state.
**Kind:** refactor/sweep. **Lead end:** kernel (`lib/boundary/`), with pack rows and five pack-owned
exit classes following. No new verbs. No migrations (dev DBs are dropped).

⚠ **Sequencing.** This build lands AFTER `origin/build/controller-liquidity` (build-2). W0 merges it;
the plan is written against build-2's end state (its W3 locking contract is on the branch now; its
W2 and W8 are pending at plan time — see § Grounding → build-2).

## Grounding

Verified at plan time on `reqs/boundary` @ 529e77a9c (master b06d790b8) and
`origin/build/controller-liquidity` @ 6f40bac0d. Paths are under `packages/server/src/mud/`
unless marked.

### The four models, as code

- **Model 1 — Door hung on an exit.** `platform/thing/Door.ts` = `LockableMixin(SealableMixin(Boundary))`
  with `closesBehind`, `stateWord()` (locked > open/closed), `getKeywords()` folding the
  `shortDescription` tokens, five conduit wrappers all gated on `isOpen()`, and `attachedTo: Set<Exit>`
  (`attachExit`/`detachExit`). `lib/boundary/Exit.ts` L506–528: `_door` + accessor pair that registers
  into `attachedTo`; L1265–1290 `canTraverse` lock gate (`door.isLocked() && !door.opensFor(mover)`
  → `gate:'locked'`) then shut gate (`!isOpen() && !swingsShut()` → `gate:'door'`); L352–361
  `plainWay()` renders *a way north; the oak door is closed* from `door.stateWord()`, else *it is
  locked* when the EXIT itself is Lockable. `lib/boundary/Exitable.ts` L450–472 `addExit`/`removeExit`
  maintain `attachedTo`; L601–609 `getExitDoors()`; L647–730 `addBidirectionalExit` installs the same
  door on both sides and calls `BoundaryApi.attachExistingBoundary` for the anchor pair; L751–898
  `_applyExitSpec` resolves `spec.door` via `StuffApi.singleton` (one live door per row), idempotency
  compares `sameDest && sameDoor` and THROWS on mismatch, defaults `bidirectional: false` and
  `oneWay: true` on the one-way branch.
- **Model 2 — the anchor pair.** `lib/boundary/Boundary.ts` (extends `Thing`; `anchorA`/`anchorB`
  `{ref:'instance', lifetime:'owned'}`, minted at `onCreate` by cloning `/platform/thing/BoundaryAnchor`,
  `getConduits()` registry, `getOtherSide/getOtherAnchor/getOtherHost`); `lib/boundary/BoundaryAnchor.ts`
  (`AdornmentMixin(Thing)`, `_isBoundaryAnchor` marker + `BoundaryAnchor.is`); the row
  `packages/content/platform/content/platform/thing/BoundaryAnchor.yaml`; `platform/thing/BoundaryAnchor.ts`
  twin; `api/boundary.ts` + `platform/idea/api/BoundaryLogic.ts` (`attachExistingBoundary`, `create`,
  `destruct`, `mintKeyway`; `installBoundary` does `hostA.addFixture(anchorA)`). Readers of anchors:
  `platform/idea/modalities/VisionModality.ts` L462–490 (leg (d) via fixtures, (e) via
  `getObviousNeighbours()` which SKIPS doored exits — order (d) then (e) is held by the golden
  `scripts/__tests__/golden/perception-characterization.json` /
  `scripts/__tests__/perception-characterization.gym.test.ts`), `SoundModality.ts` L133–150,
  `SmellModality.ts` L125–140 (+ L244 skipping anchors when summing fixture emissions),
  `lib/perception/AudienceGather.ts` L68 (own marker copy), L131–139 `directionThroughBoundary`
  (matches `exit.getDoor() === boundary`), L170–185; `platform/idea/api/FireLogic.ts` L594–601 (soot on
  glazing through anchors) and L798–806 (closed door = firebreak); `lib/boundary/Adornable.ts`
  L340 `getFixtureBoundaries()`; `test-bootstrap.ts` L101 registers the anchor row.
- **Model 3 — exits with their own lock.** `packages/content/residence/src/idea/KeyedDoorExit.ts`
  (`LockableMixin(Exit)`, `getLock()` reads `HoldingWarren.keyway()`, `boltedByDefault() → true`,
  `canTraverse` override), `.../FrontDoorExit.ts` (`LockableMixin(DeferredDestinationExit)`, keyway from
  `CirculationWarren.keywayOf(holdingKey)` — `lib/location/CirculationWarren.ts` L264),
  `packages/content/eternal-university/src/duncan-hall/idea/DormDoor.ts` (same shape, `DormWarren.keywayOf`),
  `.../residence/src/idea/LotGateExit.ts` (no lock; `wiresItsOwnInverse`), `platform/idea/BerthExit.ts` +
  `AshoreExit.ts` (build-2 state: `LockableMixin(DeferredDestinationExit)`, `isLocked/setLocked/getLock`
  overrides delegate to `Ship.isGangwayLocked/setGangwayLocked/getGangwayKeyway`; the berth way keeps
  `lockedWhenAsleep`/`keywayWhenAsleep`). Minted by: `HoldingWarren.fitExit` L208 (`instanceof KeyedDoorExit`
  on exits the copied plan room installs with `kind: /system/residence/idea/exits/keyed-door` —
  3 rows: `hinkley-hills/.../house/yard.yaml:92`, `hearts-delight/.../farmstead/location/yard.yaml:22,31`;
  ⚠ the plan authors the way BACK as a plain passage, so a guest leaves without a key),
  `BuildingWarren.entryEdgeFor` L172–190 + `wireHubExit` (`out` as a plain passage),
  `DormWarren.entryEdgeFor` L237–258 + `wireHubExit` L292–308, `PlatWarren.entryEdgeFor` L280–296,
  `Ship.installBerth` L1867–1890 (`installExit<BerthExit>` on the landing; `configureBerth`), the deck
  rows' `kind: /platform/idea/exits/ashore` (5: hesper, ostrander, coaster, ketch, smack). Ship fields
  `gangwayKeyway`/`gangwayLocked` are persistent + authorable (`Ship.ts` L254–255), written by
  `setGangwayLocked` L1591 → `persistMooring()`.
- **Model 4 — Window.** `platform/thing/Window.ts` = `SoilableMixin(SealableMixin(Boundary))` with
  `baseTransmissivity`, `aToBOverride`/`bToAOverride`, `colorTint`, `glazeR/G/B`,
  `setAttachedHosts` (Phase-1 setter, resolves both hosts and installs anchors). Rows: 3
  (`rejection/.../thing/hut-window-west.yaml`, `hut-window-south.yaml` with `attachedHosts`;
  `generic-objects/content/stuff/thing/fixture/window.yaml` without). Narrowed on by
  `packages/content/trade-glass/src/idea/cmd/glass/GlazeController.ts` L34 (`instanceof Window`).
- **The two shapes at the edges.** `lib/boundary/DoorBearing.ts` (`door` weak ref; composed only by
  `lib/boundary/ExitableVessel.ts` L100, whose `rebindVesselExits` L286–319 passes it to the
  synthesized `out`/`in`; ⚠ NO row authors `door:` on a vessel — the coach's shut state is its own
  `Sealable`, read by `openExteriorOpenings` L245); `platform/idea/KeptDoor.ts` (an `Exit` whose
  `canTraverse` asks a doorman brain; 1 row `terminus/.../counting-houses/exits/parlor-arch.yaml`).

### Content census (verified)

8 `door:` ways, all `class: /platform/thing/Door`: `rubber-works/.../works/floor.yaml` north
(glass-door, `bidirectional: true`), `rubber-works/.../stove-house.yaml` east (vent, `oneWay: true`,
the yard authors no way back), `wharfside/bank.yaml` `pumphouse` (pump-house-door; the house row
authors `out → bank` with NO `door:`, so leaving ignores the lock today), `duncan-hall/location/lobby.yaml`
south (front-doors, bidirectional), `rejection/.../foundry.yaml` north (yard-door; `foundry-yard.yaml`
authors `south → foundry` with no `door:`), `university-avenue/.../crossing.yaml` north
(campus-gate-door; far side unbuilt), `brickfield/.../potters-shop.yaml` west + south (shed-door,
shop-door, both bidirectional). The other four `door:` hits are `details:` entries or a direction
named `door` (towpath). Keyed-exit rows: `residence/.../exits/{keyed-door,front-door,lot-gate}.yaml`,
`duncan-hall/idea/exits/dorm-door.yaml`, platform `exits/{berth,ashore,kept-door}.yaml`.

⚠ **The Rejection hut as authored cannot satisfy drive step 5.** `glaziers-hut` (2,2),
`fuel-yard` (1,1), `pithead-yard` (0,0), `smelter` (2,1), `hillside` (0,2), zone
`rejection/location.yaml` `CartesianZone cellSize 10`. The hut's walkable `west → fuel-yard` is
geometrically southwest (the yard already answers `northeast → glaziers-hut`), its `south →
pithead-yard` is two cells away, and both windows name the SAME rooms as the walkable ways. See
§ Requirements gaps.

### What reads a way's state (every non-test site)

`getDoor()`/`getExitDoors()` callers outside `lib/boundary/`: `api/mql/resolver.ts` L706–716 and
`api/mql/scope-walk.ts` L81–97 (doors as candidates, deduped by `stuffId`, exits as candidates);
`platform/idea/api/MqlLogic.ts` L171–190 `effectiveTarget` (the `getDoor()` rung);
`platform/idea/api/PerceptionLogic.ts` L389, L455; `platform/idea/api/CommandLogic.ts` L3886
(affordance reach through a shut door); `lib/biome/Atmospheric.ts` L1134, L1206
(`getObviousNeighbours({doors:'open-only'})`), L1455 (`'all'`), L1525, L1777 (face conductance);
`lib/description/Perceiver.ts` L265–275 (`WhereaboutsExit` producer: `crossesZone`, `door {name, open}`);
`lib/boundary/Exitable.ts` L386–422 (`subscribableFields.exits` → `StuffExitRecord` with `door
{stuffId, displayName, open, primaryKeyword?}`); `platform/idea/cmd/perception/LookController.ts`
L991–1030 and `SenseController.ts` L285–300 (`formatExits`: `north (the oak door, locked)` via
`door.stateWord()`); `tools/illustrate.ts` L74, L92. Wire shapes: `packages/types/src/index.ts` L1319
`WhereaboutsExit`, L1982 `StuffExitRecord` + `StuffExitDoor`. Client readers:
`packages/client/src/components/cards/NavigatorBody.tsx` L124–137 (`crossesZone` split, `door.name`,
dashed arm when `!door.open`), `CardBodies.tsx` L786–830 (exit chips, direction only),
`phone/ButtonBar.tsx` L56–70 (direction only), `InspectionBody.tsx` L409–412 (hides the exits
segment when the navigator is docked — no door read).

### The zone rules today

`lib/location/Location.ts` L108–141 `addExit`: cardinal → allowed; non-cardinal → both paths
resolved through `ZoneApi.resolveZoneForPath`, same zone → THROW (`crossesHoldingFrame` L270–284
exempts a holding's own frame). No adjacency, no opposite-side, no opening check anywhere.
`Location.getExtent()` L217 = `_extent ?? zone.getCellSize()`; `NavigationApi.directionOffset(dir)`
(`platform/idea/api/NavigationLogic.ts` L257) and `invertDirection` L240 exist.
`packages/server/scripts/check-location-classes.ts` (`lint:locations`): `Row {file, cls, coords:
boolean, exits: [dir, dest][]}` L190–196; `sameZoneNamedExits` L515–553 is the static twin of the
runtime rule; `CARTESIAN_ROOTS` L90–95. `verifyOutboundExits` (`Exitable.ts` L388–396 doc) is the one
place both sides of an authored pair meet at runtime.

### build-2 (`origin/build/controller-liquidity`) — what this plan assumes

- **Landed (W3, D9):** `lib/boundary/Lockable.ts` — `lock(by)`/`unlock(by)` → `LockAnswer`
  (`already-locked | already-unlocked | no-key`), `setLocked` stays an ungated setter (D9a),
  `boltedByDefault()` hook kept, `getLock()` policy seam kept. `cmd/boundary/LockController.ts` and
  `UnlockController.ts` call `MqlApi.effectiveTarget(target, isLockable)` then `lockable.lock(giver)`
  and word the refusal. `BerthExit`/`AshoreExit` keep `isLocked/setLocked/getLock` delegations to the
  ship (their `lock()`/`unlock()` overrides are gone). `cmd/boundary/OpenController.ts` calls
  `effectiveTarget(target, isSealable)` then `sealable.canOpen(giver)`.
- **Pending (W2):** `api/mql/resolver.ts`/`scope-walk.ts` reach rewrite (`getEnclosingPlace`,
  `depth`, `visibleInside` for shut things). **This plan's W1 touches the same two files** (the
  door-candidate loops); W0 re-grounds those line numbers after the merge.
- **Pending (W8):** `OpenController` → `Openable.openPlanFor`-shaped model call. This plan does not
  change the open/close controllers; it changes what `effectiveTarget` returns to them.

**Wave dependencies on build-2:** W0 ← build-2 merged to master. W1 ← build-2 W3 (Lockable
contract) and W2 (resolver line positions). W3 ← build-2 W3 (Berth/Ashore shape). W5 ← build-2 W8
only if it changes `OpenController`'s target resolution (re-check at W5).

## New substrate

| new | kind | ledger row | note |
|---|---|---|---|
| `platform/thing/Boundary` | class twin | *the edge object* — generalize | the name-sharing twin of `lib/boundary/Boundary` (12th on the CLAUDE.md list); rows instance it |
| `Boundary.sideA/sideB`, `channels`, `opening`, `attach/detach` | fields + methods on the lib base | *the edge object* · *channels* · *zone invariant* | replace the anchor pair and the five conduit interfaces |
| `Door.freeFrom` | field | *keyed ways made by code* — fold | the side that needs no key, named by the PLACE; replaces the keyed exits' one-way lock |
| `Exit.boundary` | field | *the side* — reuse | replaces `Exit.door` |
| `WayRecord` + `WayState` | wire type (`@saxonberg/types`) | *a way's state on the wire* — generalize | one shape; `StuffExitRecord` and `WhereaboutsExit` become aliases of it |
| `EdgeRefusalError` | error class in `lib/errors.ts` | **genuinely new** (searched `lib/errors.ts`: `DestructError`, `DetachedError`, `VetoResult`; nothing names an authored-edge refusal) | the typed throw `_applyExitSpec` catches to make a bad edge a diagnostic, not a boot crash |
| kind rows `/platform/thing/boundaries/{door,gate,hatch,grating,curtain}` | content rows | *the edge object* | authored ways `extends:` one |

Retired: `platform/thing/BoundaryAnchor` (+ row, + `lib/boundary/BoundaryAnchor.ts`), the five
`Conduit` interfaces (`Conduit.ts` keeps `BoundarySide` and gains the `BoundaryChannel`
vocabulary; `SoundConduit.ts`/`SmellConduit.ts` deleted), `DoorBearingMixin` (+ `Mixins.DoorBearing`,
`MixinApi.isDoorBearing`), `Door.attachedTo`/`attachExit`/`detachExit`, `Exit.door`,
`Window.attachedHosts`, `Adornable.getFixtureBoundaries`, `BoundaryApi.attachExistingBoundary/create`,
`KeyedDoorExit` (class), `LockableMixin` on `FrontDoorExit`/`DormDoor`/`BerthExit`/`AshoreExit`.
No new Api, no new hook, no new registry, no new document kind, no new mixin.

## Plan-level decisions

**D1 — `Boundary` is a Thing; lib base + platform twin; `Door` and `Window` are its two subclasses.**
A boundary has a material, a mass, grime (`Soilable` on `Window`) and is seen and named — all
`Thing`'s. It is never in a container (the fixture pattern already). `lib/boundary/Boundary.ts`
stays the base (sides, channels, keywords, `stateWord`, `opening`, `canEvict`); `platform/thing/Boundary.ts`
= `SealableMixin(BoundaryBase)` is the instanceable twin (a curtain, a shutter you cannot bar);
`platform/thing/Door.ts` = `LockableMixin(platform Boundary)` + `closesBehind` + `freeFrom` (door, gate,
hatch, grating, gangway — everything with a bolt; "door" is already this project's generic word:
the YAML key is `door:`); `platform/thing/Window.ts` extends the platform twin (+ `Soilable` +
glazing; the glass trade narrows on it). Base-class-narrowing D13 (the anchor as an Idea) is settled
by the anchor's deletion. Lens 5: a hatch, a portcullis and an airlock are one `Door` row apart.

**D2 — channels are DATA on the row, one method on the class.** `channels: { open: {movement,
light, sight, sound, smell}, shut: {…} }` with 0..1 values; the vocabulary is CLOSED (`BoundaryChannel`
in `Conduit.ts`; an unknown key throws at hydrate). `Boundary.transmissivity(channel, from, to)`
reads `isOpen()` to pick the table; `Window` overrides light with its `aToB/bToA` overrides,
glazing and grime exactly as today; `Door.canPassThrough` keeps `isOpen() || (closesBehind &&
!isLocked())`. Defaults on the kind rows reproduce today's numbers (door: all 1 open / 0 shut;
window: movement 0/0, light `baseTransmissivity`, sight/sound/smell 1 open / 0 shut — today's
`Window` gates all four on the shutter; curtain: movement 1/1, sight 0/0, light 0.2/0.2, sound 1/1,
smell 1/1). The senses slate owns the numbers; this build owns the shape. ⚠ **Water is not a
channel this build** — no reader exists (the water pack's `AirPocket.ts` L131 reads a thing's
`Sealable`, not a way), and the owner's rule is *only where a reader exists*. The closed vocabulary
refuses `water:` loudly rather than carrying it dead.

**D3 — how a side references its boundary.** `Exit.boundary: {ref:'instance', lifetime:'weak'}`;
`Boundary.sideA/sideB: {ref:'instance', lifetime:'weak'}`; a side's tag is DERIVED
(`boundary.sideOf(exit)`: A = first attached). Nothing owns across the pair: an authored `door:`
boundary is a row singleton like a Door today (`canEvict` vetoes while either side's source lives,
mirroring `Exit.canEvict`); a minted boundary is owned by its minter (D6). `Exit.onDestruct` clears
its slot on the boundary; `Boundary.onDestruct` clears both sides' refs. The light walk needs no
host pointer: it iterates a room's exits and asks each side's boundary (D10). Why not `symmetric`:
R2.2 is 1:1 and a boundary has two sides; why not an identity path: a minted gangway has no row,
and the walks are sync.

**D4 — `door:` names the boundary ROW; both sides must agree; `attachedHosts` retires.** The
exits-map key stays `door:` (requirements: *one `door:` stays one `door:`*) and names a boundary row
of any kind (a window, a curtain). `_applyExitSpec` resolves it via `StuffApi.singleton` on EACH side
that authors it, so two rows naming one path get one instance; `bidirectional: true` installs the far
side with the same boundary as today. ⭐ The rule: a way with a boundary is authored either as
`bidirectional: true` on one side (the far side authors nothing for that direction) or as the same
`door:` on both. When `verifyOutboundExits` links two sides whose boundaries differ (one `null`), it
sets `blocked` on the boundary-less side and emits a `DiagnosticApi` error naming both rows — a wall
until the author fixes it, never a silent half-lock. Content: the pump house, the foundry yard add
the matching `door:`; the stove-house vent stays one-way (no way back exists). Windows are authored
as `door:` on the place's exits map in a cardinal direction (W2 re-authors the hut; D14).

**D5 — the free side.** `Door.freeFrom: string` (`ref:'identity:relation'`, persistent, authorable):
the identity path of the PLACE whose side opens with no key. `Door.opensFor(mover)` = the key fits
OR the mover's enclosing place's identity path equals `freeFrom`. This is what keeps *a guest let in
is never trapped* and *leaving your own house needs no key* once the lock is one object both sides
share (today the plans get it by authoring the way back as a plain passage). Warrens set it to the
inside room's identity path at mint; an authored door may set it (the pump house: the house). A
door with no `freeFrom` is keyed from both sides, as every authored door is today.

**D6 — code-minted boundaries: the minter mints and owns.** `HoldingWarren.fitExit` (matches the
kind path `/system/residence/idea/exits/keyed-door`, whose row's `class:` becomes
`/platform/idea/Exit`; `KeyedDoorExit` is deleted), `BuildingWarren`/`DormWarren` (`entryEdgeFor` +
`wireHubExit`), `PlatWarren.entryEdgeFor` and `Ship.installBerth` each `StuffApi.clone` a FRESH
boundary from a kind row (`/system/residence/thing/boundaries/keyed-door` — `extends` the platform
door kind with `locked: true`; `/system/residence/thing/boundaries/lot-gate` — a gate, unlocked;
`/platform/thing/boundaries/gangway` — a door kind), stamp the keyway (`setKeyway(warren.keyway())`;
`refreshKeyway` re-stamps every boundary it minted, so a re-key still re-keys every door), set
`freeFrom`, and `BoundaryApi.attach(boundary, nearSide, farSide)`. The minter holds them in a
`Map<key, Door>` with `{ref:'instance', lifetime:'owned'}` (`Ship.gangway` is a single owned field).
`FrontDoorExit` and `DormDoor` keep only `computeDestination` (they are `DeferredDestinationExit`s);
`LotGateExit` unchanged but for the gate it is handed; `BerthExit`/`AshoreExit` lose `LockableMixin`
and the lock overrides — the lock IS the gangway boundary attached to the berth way and the deck's
`ashore` way; `BerthExit` keeps `lockedWhenAsleep`/`keywayWhenAsleep` as the one named fallback for a
ship that is asleep (her boundary is gone with her; the way reads the lock she was left with, as
harbors decided). `Ship` keeps `gangwayKeyway`/`gangwayLocked` as its persisted, authorable
fields: the boundary is minted FROM them at stand-up and `persistMooring()` copies the boundary's
bolt back before capture — per-content persistence (P6): the ship's record carries her gangway; a
holding's keyed doors re-bolt at stand-up exactly as today (exits were never saved).

**D7 — `BoundaryApi` is `attach`/`detach`/`mintKeyway`.** `attach(boundary, a: Exit, b: Exit)` refuses
a third side, a side already on another boundary, and `a === b`; `detach(boundary)` clears both.
`attachExistingBoundary`/`create` and `installBoundary`'s fixture wiring go. The instance seams
(`Boundary._attachSide`, `Exit._setBoundary`) are `FromModule('/api/boundary#BoundaryApi')`-gated;
`_applyExitSpec` and the warrens call the Api.

**D8 — the edge invariants gate twice: `Location.addExit` and `lint:locations`.** In `Location.addExit`,
when the exit carries a boundary and the two places share a zone AND a holding frame (the existing
checks): the direction must be cardinal, the destination's coords must equal source coords +
`NavigationApi.directionOffset(direction)` (adjacency), an already-installed inverse on the far
side must have direction `invertDirection(direction)` (opposite), and `boundary.getOpening()` width
and height must each be ≤ `this.getExtent()` (the face). Across zones or frames: a threshold —
free name, opening from the kind or authored, no check. Refusal throws `EdgeRefusalError` with the
reason; `_applyExitSpec` catches it as it catches *template not found* (`Exitable.ts` L792–800):
the side installs unbuilt (`canTraverse` → `gate:'unbuilt'`), and `DiagnosticApi` names the row,
the direction and the reason. `lint:locations` gains `boundaryEdges(rows)`: for every row exit with
`door:` whose destination row is cartesian under the same zone, the same three checks from the rows'
`coords:` and the boundary row's `opening` (a `Row` gains `exits: [dir, dest, door?]` and the
boundary rows' `opening` are read from their files). The runtime refusal is what drive step 10
exercises (an author's go-live); the lint is what CI sees.

**D9 — one wire shape.** In `packages/types/src/index.ts`:
```ts
export type WayState = 'open' | 'shut' | 'locked' | 'window';
export interface WayRecord {
  direction: string;
  state: WayState;
  crossesZone: boolean;            // the threshold — kept under its shipped name
  destination?: string;            // where it leads, by name (the whereabouts producer only)
  boundary?: { stuffId: string; name: string; primaryKeyword?: string };
}
export type StuffExitRecord = WayRecord;
export type WhereaboutsExit = WayRecord;
```
`Exit.wayState()` derives it: no boundary → `open`; a boundary whose movement channel is 0 in both
tables → `window`; else `boundary.stateWord()` (`locked` > `shut` > `open`; `Door.stateWord`
generalized onto the base with `isLocked` asked only of a Lockable). Both producers
(`Exitable.subscribableFields.exits`, `Perceiver.ts` L265) emit `WayRecord`; `crossesZone` is
computed in both from `exit.peekDestination()?.getZone() !== here` (the inspection producer gains it;
the navigator already had it). `StuffExitDoor` is deleted.

**D10 — the walks read sides, one hop, today's rule.** `VisionModality.lightLegs`, `SoundModality.soundLegs`,
`SmellModality.smellLegs`, `AudienceGather`'s leg builder and `FireLogic`'s soot/firebreak loops
become ONE loop over `loc.getObviousExits()`: a side with a boundary contributes `tau =
boundary.transmissivity(channel, farSide, nearSide)` (and the light colour from `Window`), a side
without contributes `EXIT_TAU`; `getObviousNeighbours`' `doors:` option becomes `through: 'open' |
'all'` (`'open'` = no boundary, or `isOpen() && movement passes when open` — a window never counts
as an opening, as today; `'all'` = every way) and only `Atmospheric` calls it. The ambient walks
stay bounded by `MAX_HOPS` and never chain across a zone through a boundary beyond today's hop
(nothing in the walk reads zones; the one-hop rule is `EXIT_TAU`'s and `MAX_HOPS`'s, unchanged).
⚠ The golden characterization may shift ORDER (legs (d) and (e) were two passes; now one in
declared-exit order): re-baseline only if the drive's *rooms as lit as before* holds and the diff is
order-only — a magnitude change is a defect.

**D11 — `KeptDoor` stays a side; `DoorBearingMixin` retires.** The attendant's veto is a `canTraverse`
on the side (unchanged). No row authors a vessel door, so `ExitableVessel` loses the `door` option
and `rebindVesselExits` passes no boundary; the coach's `out` is a side with none (drive step 9).
`ExitableVessel` keeps `Adornable` (fixtures are not only anchors) — removing it is a wider claim
and a deferred cleanup.

**D12 — the side owns its words; `effectiveTarget` generalizes.** `Exit.getKeywords()` = authored ∪
direction ∪ short forms ∪ `boundary.getKeywords()` (the base `Boundary.getKeywords()` keeps Door's
description-token fold, named DERIVED); `Exit.plainWay()` = *a way north; the oak door is locked*
from `boundary.presentationPhrase()` + `stateWord()`, or *a way west; the west window* for a window.
`MqlLogic.effectiveTarget` L180–187: `bound.isExit()` → `bound.getBoundary()`. The resolver and
scope-walk stop emitting doors as candidates (`getExitDoors` deleted; the `stuffId` dedupe goes with
it): `open door` binds the SIDE by the boundary's keyword and `effectiveTarget` answers the boundary.
`CommandLogic` L3886, `PerceptionLogic` L389/L455, `Atmospheric` L1525/L1777, `FireLogic` L802,
`illustrate.ts` read `getBoundary()`.

**D13 — `canTraverse` reads the boundary.** Lock gate: `MixinApi.isLockable(b) && b.isLocked() &&
!b.opensFor(mover)` → `gate:'locked'`; shut gate: `!b.isOpen() && !(b.swingsShut?.())` → `gate:'door'`;
⭐ impassable: `b.transmissivity('movement', …) === 0` with the boundary open (a window) → `gate:'door'`,
reason `${cap(name)} is not a way through.` No new gate value. `Mobile.traverse`'s `closesBehind`
read moves to `boundary.swingsShut()` (only `Exit.ts` L1283 reads it today).

**D14 — the Rejection hut (content, rejection pack).** Proposal, pending the owner (§ Requirements
gaps): move `glaziers-hut` to (1,2); its doorway `south` ↔ `fuel-yard` `north` (replacing the
mis-authored `west`/`northeast` pair); the west window becomes the side `west` ↔ `hillside` (0,2)
`east` (both rows author `door: /world/terminus/rejection/thing/hut-window-west`); the south
window is RETIRED into the hut's `enclosure:` as a glass pane (sky light — the owner's rule) and
its row deleted, so the glass drive's *both glazed* step reads one window. `look west` shows the
hillside through the window; `go west` is refused (D13).

## Host placement

| field / class | host | what composing it claims |
|---|---|---|
| `sideA/sideB`, `channels`, `opening`, `transmissivity()`, `stateWord()`, `getKeywords()` fold, `canEvict` | `lib/boundary/Boundary` (base) | every boundary has two sides, a channel table and an opening — true of a door, a window, a curtain, a gangway. ⭐ Not on `Thing`: a boundary is the ONE thing with another side; the `Freshness off every Thing` shape is exactly what putting sides on `Thing` would be. |
| `SealableMixin` | `platform/thing/Boundary` (twin) | every instanceable boundary opens and shuts (a curtain is drawn, a shutter closed, a grating… is fixed — it authors `open: true` and `canOpen` refuses by row; the one honest "no", flagged) |
| `LockableMixin`, `closesBehind`, `freeFrom` | `platform/thing/Door` | a thing with a bolt: door, gate, hatch, grating, gangway. ⚠ NOT on the base: a curtain cannot lock and `lock curtain` must not light up (the `lock` view's `requires:` is `LockableMixin`); P2's "honest default answers no on most hosts" is why the twin exists |
| glazing, `Soilable`, light overrides | `platform/thing/Window` | unchanged |
| `boundary` | `lib/boundary/Exit` | every way MAY have something in it, and most answer `null` — this is the model (*an open way has no boundary*), not a capability claim; the same shape as `conditional` |
| `WayRecord` producers | `Exitable.subscribableFields` · `Perceiver` | unchanged hosts |
| minted-boundary maps | `HoldingWarren`, `BuildingWarren`, `DormWarren`, `PlatWarren` (residence / eternal-university packs), `Ship.gangway` (kernel) | the minter owns what it mints; no kernel class gains a field for a pack's door |
| `EdgeRefusalError` | `lib/errors.ts` | a typed throw, caught by the one applier |
| `boundaryEdges` check | `scripts/check-location-classes.ts` | the gate that already owns the zone rules |

The guard test: no `MixinApi.isX` re-narrowing is added anywhere a boundary is read; a reader asks
`exit.getBoundary()` and then the boundary's own methods. `isLockable(boundary)` in `canTraverse`
is a narrowing on the TARGET's composition (door vs window), which is the correct use.

## Convention conformance

- `props:`/`cast:` untouched; Locations not rooms (`Location`/`Locale`/`Hall`); rows under
  `<root>/<branch>/` (`/platform/thing/boundaries/<kind>`, `/system/residence/thing/boundaries/<kind>`);
  a pack's classes stay in its `src/` (`FrontDoorExit`, `DormDoor`, `LotGateExit`); no new pack `lib/`.
- Module scope declares (no module-scope statements added); the import boundary holds (packs import
  the kernel by `@saxonberg/server/mud/…`; `BoundaryApi` is kernel; the warrens call it).
- Verbs on objects: `boundary.lock(by)`, `exit.canTraverse`, `exit.wayState()`; `BoundaryApi` only
  orchestrates the two-sided wiring (`attach`/`detach`) and minting (`mintKeyway`).
- P3 refuse/skip/throw: an unknown channel key throws at hydrate; a mismatched pair BLOCKS the
  boundary-less side + diagnostic; a bad edge installs unbuilt + diagnostic; `attach` on a third
  side throws; a window on `go` refuses with the reason; a sleeping ship's berth way answers its
  remembered lock (named).
- P4 no duck typing: the warrens narrow on `MixinApi.isLockable`/`isSealable` over the kernel's
  `Door`; `AudienceGather`'s private marker copy (L68) is deleted with the anchor; no new
  predicate — `Boundary.swingsShut()` lives on the base (default `false`, `Door` overrides) so
  `canTraverse` needs no narrowing to ask it, and `isLockable(boundary)` is the existing predicate.
- P5 mixin decides: the controllers are untouched; `effectiveTarget` hands them the boundary.
- P6 persistence per content: the ship's gangway on the ship's record; holdings' keyed doors
  re-minted bolted; authored doors re-seeded from their rows; nothing new persists.
- P7 load on use: `door:` loads its row when the exits map applies, as today; the minters mint at
  stand-up; no boot entry; no reverse search (a boundary knows its sides, a side its boundary).
- P8 names: `Boundary` (noun, the edge), `Door` (the project's generic word for a barred closure),
  `WayRecord`/`WayState` (the product word), `freeFrom`, `EdgeRefusalError`.
- Lint gates this build must pass: `lint:family` whole; named: `lint:instanceable` (twin placement,
  no `/lib/` rows, `container:` absent), `lint:mixin-names` (`DoorBearing` removed from `Mixins`),
  `lint:field-meta` (`freeFrom` as `identity:relation`; the weak refs), `lint:locations` (extended),
  `lint:location-graph`, `lint:imports`, `lint:module-scope`, `lint:object-verbs`,
  `lint:command-views`/`lint:one-word` (no view changes), `lint:openings` (untouched),
  `lint:test-bootstrap` (anchor row removed from the bootstrap list), `lint:lib-statics`.

## Waves

### W0 — merge build-2; re-ground
Merge `master` after `build/controller-liquidity` lands (never the branch directly — rule 8). Re-verify:
`Lockable.ts` contract, `BerthExit`/`AshoreExit` shape, `MqlLogic.effectiveTarget` lines, the
resolver/scope-walk door loops (build-2 W2), `OpenController` (build-2 W8). Update § Grounding line
numbers in place. `pnpm -C packages/server lint:family`, `pnpm test:near` on `lib/boundary`.
Commit: `plan(boundary): W0 — merged build-2, grounding re-verified`.

### W1 — the side carries its boundary (D1, D3, D4, D5, D7, D12, D13)
- `lib/boundary/Boundary.ts`: sides (`sideA/sideB` weak), `sideOf`, `otherSide`, `channels`
  table + `transmissivity(channel, from, to)`, `opening`, `stateWord()`, `getKeywords()` fold,
  `swingsShut()` default, `canEvict`. Keep the anchor fields and `ensureAnchors` THIS wave so the
  walks still run (deleted in W2).
- `platform/thing/Boundary.ts` (new twin, `SealableMixin`), `platform/thing/Door.ts` (extends the
  twin; `Lockable`, `closesBehind`, `freeFrom`, `opensFor` override, `canPassThrough`; delete
  `attachedTo`/`attachExit`/`detachExit`/conduit wrappers), `platform/thing/Window.ts` (extends the
  twin; keep glazing; `attachedHosts` kept until W2).
- `lib/boundary/Conduit.ts`: `BoundaryChannel` vocabulary + `BoundarySide`; delete the five
  interfaces, `SoundConduit.ts`, `SmellConduit.ts` once no reader is left in W2 (W1 may keep them as
  type-only shims).
- `lib/boundary/Exit.ts`: `boundary` replaces `door` (`ExitOptions.boundary`, `bind`/`rebind`,
  `onDestruct`), `getKeywords`, `plainWay`, `canTraverse` (D13), `wayState()`.
- `lib/boundary/Exitable.ts`: `addExit`/`removeExit` lose the `attachedTo` bookkeeping;
  `addBidirectionalExit({ boundary })` calls `BoundaryApi.attach`; `_applyExitSpec` resolves `door:`
  to a boundary and attaches on each side (idempotency compares `sameBoundary`);
  `verifyOutboundExits` applies the D4 mismatch rule; `getExitDoors` deleted;
  `getObviousNeighbours({ through })`.
- `api/boundary.ts` + `BoundaryLogic.ts`: `attach`/`detach`/`mintKeyway`.
- Readers: `MqlLogic.effectiveTarget`, `resolver.ts`/`scope-walk.ts` (drop the door candidates),
  `PerceptionLogic`, `CommandLogic`, `Atmospheric` (L1134/1206/1455 → `through`, L1525/L1777),
  `FireLogic` L802, `LookController`/`SenseController.formatExits` (→ `exit.wayState()` +
  boundary name), `illustrate.ts`, `lib/boundary/ExitableVessel.ts` (drop `door` — D11),
  `lib/boundary/DoorBearing.ts` deleted, `Mixins.DoorBearing`/`isDoorBearing` deleted.
- Rows: `/platform/thing/boundaries/{door,gate,hatch,grating,curtain}.yaml` (channels, opening,
  keywords); the 8 door rows gain `extends: /platform/thing/boundaries/door` (data unchanged);
  pump house `house.yaml` `out` and `foundry-yard.yaml` `south` gain the matching `door:`;
  `pump-house-door.yaml` gains `freeFrom: /world/terminus/wharfside/pumphouse/location/house`.
- Tests: `lib/boundary/__tests__/Boundary.test.ts` (sides, channels, attach refusals, keywords),
  `Exit.test.ts` (wayState, canTraverse through a window / a locked door / a free side),
  `Exitable.applyExits.test.ts` (both-sides-agree, mismatch blocks + diagnostic), `Door.test.ts`
  (`freeFrom`), MQL `effectiveTarget` test, the two controllers' tests (unchanged behaviour).
- Acceptance: every existing door drive row still opens/shuts/locks; `lock pumphouse` from the bank
  locks it from the house; `go out` from the house with no key passes (free side).
- Commit: `build(boundary W1): the side carries its boundary; door is a kind of boundary`.

### W2 — the walks read sides; the anchors retire (D10, D14)
- `VisionModality.lightLegs`, `SoundModality.soundLegs`, `SmellModality.smellLegs` (+ L244),
  `AudienceGather` (delete the marker copy and `directionThroughBoundary` → `exit.getBoundary() === b`),
  `FireLogic` L594–601 (soot on `exit.getBoundary()` when it is a `Window`): one loop over exits.
- Delete `BoundaryAnchor` (lib + platform twin + row + `TemplatePaths.boundaryAnchor` +
  `test-bootstrap.ts` L101 + `Adornable.getFixtureBoundaries`), `Boundary.anchorA/B`/`ensureAnchors`/
  `_detachAnchorsOnly`/`_detachAndDestructAnchors`, `Window.setAttachedHosts`, `ExitableVessel`'s
  anchor migration (`onMoved` L372–392, `setDoor`, `installVesselDoorBoundary`).
- Rejection rows per D14 (hut coords, exits on hut/fuel-yard/hillside, `hut-window-south` → enclosure).
- Tests: the three modality tests + `AudienceGather` tests re-pointed; `ExitableVessel.light.test.ts`
  (a shut coach still darkens by its own seal); golden re-baselined only under D10's condition.
- Acceptance: drive steps 5 and 8 pass on a fresh world; the glass trade's `glaze pane in window`
  test still passes.
- Commit: `build(boundary W2): the light walk reads the side's boundary; the anchor pair retires`.

### W3 — keyed ways: the minter mints the boundary (D6)
- `residence`: `KeyedDoorExit.ts` deleted, `exits/keyed-door.yaml` `class: /platform/idea/Exit`,
  `thing/boundaries/{keyed-door,lot-gate}.yaml`; `HoldingWarren.fitExit` mints/attaches/stamps
  (`refreshKeyway` re-stamps); `BuildingWarren` (`entryEdgeFor` + `wireHubExit` share one door,
  `freeFrom` = the entry room); `PlatWarren` hands the gate; `FrontDoorExit` slimmed.
- `eternal-university`: `DormWarren` likewise; `DormDoor` slimmed (`dorm-themes.yaml`/
  `dorm-programme.yaml` comments updated).
- kernel: `/platform/thing/boundaries/gangway.yaml`; `Ship.gangway` (owned), minted at stand-up from
  `gangwayKeyway/gangwayLocked`, attached in `installBerth` and to the deck's `ashore` exit (found
  via the entrance room's exit of kind `ashore`); `persistMooring` copies the bolt back;
  `BerthExit`/`AshoreExit` lose `LockableMixin` and the lock overrides (sleep fallback kept on
  `BerthExit`); `platform/idea/exits/{berth,ashore}.yaml` unchanged.
- Tests: residence/eternal-university pack vitest (a tenant's key opens; a stranger's does not; a
  guest leaves without a key; re-key re-keys), `Ship` gangway (lock from the deck → locked ashore;
  asleep → remembered), `BerthExit`/`AshoreExit` tests, `packages/wire/tests/lock-reconciliation.wire.test.ts`
  re-pointed if it reads a keyed exit's lock.
- Acceptance: drive steps 3 and 4.
- Commit: `build(boundary W3): a holding's keyway keys its boundary; the gangway is one boundary`.

### W4 — the edge invariants (D8)
- `lib/errors.ts` `EdgeRefusalError`; `Location.addExit` adjacency / opposite / opening ≤ face
  for a boundary within a zone and frame; `_applyExitSpec` catches → unbuilt + diagnostic;
  `check-location-classes.ts` `boundaryEdges` (+ `Row.exits` carries `door`, boundary rows' `opening`
  read); `lint:locations` message text with the fix (adjacent cells; opposite sides; a smaller
  opening or a threshold).
- Tests: `Location.test.ts` (each refusal, with reason), `Exitable.applyExits.test.ts` (unbuilt +
  diagnostic on refusal), `scripts/__tests__/check-location-classes.test.ts` (one fixture per
  invariant, passing and failing).
- Acceptance: drive step 10 (a curtain row between two adjacent cells walks and does not see; a
  non-adjacent or non-opposite way is refused with the reason); `lint:locations` green on every pack.
- Commit: `build(boundary W4): a boundary joins adjacent cells through their shared face`.

### W5 — one wire shape; every screen (D9)
- `packages/types/src/index.ts`: `WayState`, `WayRecord`, aliases; delete `StuffExitDoor`.
- Producers: `Exitable.subscribableFields.exits`, `Perceiver.ts` L265.
- Client (minimal, the rose is NOT in scope): `NavigatorBody.tsx` (`exit.boundary?.name`, arm style
  from `state`, title `— through the oak door (locked)`, a window arm not clickable as `go`),
  `CardBodies.tsx` exit chips (`north (locked)` / `west (window)` suffix), `phone/ButtonBar.tsx`
  (same suffix), `InspectionBody.tsx` untouched.
- `LookController`/`SenseController.formatExits` already read `wayState()` since W1; make the
  rendering match the chips (`north (the oak door, locked)`, `west (the west window)`, a threshold
  marked `→` as the navigator does).
- Tests: `packages/types` compiles; the two producers' unit tests; client component tests for the
  three readers (`packages/client` vitest).
- Acceptance: drive step 7.
- Commit: `build(boundary W5): one WayRecord; every screen tells a way's whole state`.

### W6 — the drive, the walk, the docs
- `packages/wire/tests/boundary.dirty.wire.test.ts` (steps 1–11 below; `declareFile` packs:
  `world-seed`, `terminus`, `eternal-university`, `rejection`, `residence`, `transport`,
  `hearts-delight`; dirty reason: locks and open states changed on shipped doors, a holding
  provisioned, a ship berthed).
- `e2e/tests/boundary-walk.spec.ts` (the `water-supply-walk.spec.ts` shape): bank pump-house door
  from both sides, Duncan Hall front doors, the hut window, the navigator/chips/exits line agreeing,
  a dorm door shown locked.
- Docs: `docs/subsystems/boundary.md` (§ The Cast, § Doors, § Boundary Substrate, § Window, § Doors
  are wired transitively — rewritten for the side/edge model; keyed exits; the edge invariants;
  `WayRecord`), `light.md` § propagation walk pseudocode L388–412, `mql.md` § Doors and exits
  L702–730, `location.md` (the edge rules beside the cardinal rule), `construction.md` (one line:
  a window to the sky is enclosure, a window to a place is `boundary.md`'s), `ship.md`/`harbor.md`
  (the gangway), `residence.md` (the keyed boundary + `freeFrom`), `ref-shapes.md` exemplar table
  (`Exit.boundary`, `Boundary.sideA`). CLAUDE.md's map line for `boundary.md` is the sweep's.
- Commit: `build(boundary W6): the drive and the walk; docs graduated`.

## Reachability wiring

No new verb. For each capability, the five links:

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| lock/unlock a way from either side | `lock`/`unlock` (unchanged views) | `requires: LockableMixin` — satisfied by the `Door` the side's `effectiveTarget` yields | the boundary row's `locked`/`keyway`/`freeFrom` | `door:` loads the row with the exits map; a minter clones at stand-up | the side binds by the boundary's keywords or its direction (W1 `getKeywords` union) — no new arg |
| open/close | `open`/`close` | `requires: SealableMixin` via `effectiveTarget` → the twin | row `open:` | as above | as above |
| go through / refused by a window | `go` | the side (`here:exits`) | `channels.open.movement` | as above | `canTraverse` D13 |
| a new kind of way with no code | — | — | a row `extends: /platform/thing/boundaries/<kind>` + `door:` on both sides | the exits map | `lint:locations` + `addExit` refuse a bad edge |
| a way's state on a screen | `look` (exits line), the room card, the navigator, the phone bar | — | `WayRecord` from both producers | the existing `exits` subscription + whereabouts push | — |

The silent-failure check per link: a kind row with a misspelled channel key throws at hydrate (not
silently 0); a `door:` on one side only BLOCKS the other with a diagnostic; a window side never
answers `go` with "You can't walk that way" but with its reason.

## Acceptance-criteria coverage

| requirement AC | wave |
|---|---|
| a way is one thing; state, words and lock the same from both sides | W1 (authored), W3 (minted) |
| every way opens, shuts, locks, lets light through as before, to the same keys | W1, W2, W3; drive 1–4, 8, 9 |
| every screen shows open / shut / locked / window / threshold, keyed ways included | W5; drive 7 |
| a window into a place passes sight and light, never a body; a window to the sky is enclosure | W1 (D13), W2 (D14); drive 5 |
| inside a zone adjacent + opposite + fits the face; across zones a threshold; refused with reason | W4; drive 10 |
| an ambient flow never chains across a zone through a boundary; moving and looking do | W2 (D10 — unchanged hop rule, asserted by a modality test with a two-zone fixture) |
| a new kind of way with one row and no code | W1 (kinds), W4 (the curtain in drive 10) |
| a fresh world runs the drive end to end, and again after a restart | W6; drive 11 |

Nothing unmapped.

## Test & gate strategy

- **Unit:** every wave's list above; `pnpm test:near` per wave plus each touched pack's vitest
  (`residence`, `eternal-university`, `rejection` has none — rows only, `transport`, `trade-glass`).
- **Lint:** `lint:family` every wave; `lint:locations` is the gate W4 extends.
- **The blocking drive** (`packages/wire/tests/boundary.dirty.wire.test.ts`), every step `instant` or
  `short`, no clock dependence, **no soak drive**:
  1. `instant` `player` — bank: `look pump-house door`, `look pumphouse`; from the house `look out`;
     `open` refused as locked from both sides.
  2. `instant` `staged` — key handed through the test seam (`/auth/test-hand`, the water-supply
     precedent) or the works keeper's seat (`clock on` at the pump house); `unlock`, `open`, go
     through, `close`, `lock` from inside; back round: locked from the bank.
  3. `instant` `player` — a dorm room (`avatar-family` precedent: provisioning hands the key) and a
     Seznick House front door: tenant's key opens, a stranger's does not; `look` and the navigator
     show `locked` first.
  4. `short` `staged` — a berthed ship (`harbors` drive precedent for standing one up): `lock
     gangway` on deck → locked ashore; `unlock hesper` ashore → open on deck.
  5. `instant` `player` — the hut: `look west` (the hillside, through the window); `go west` refused
     *is not a way through*; from the hillside `look east`.
  6. `instant` `player` — Duncan Hall: `look door`, `look south`, `open door`, `go south` bind one
     side; `look south` never names the steps.
  7. `instant` `player` — the `exits` subscription, the whereabouts push and `look`'s line agree on
     `state` for the same way and mark a threshold.
  8. `short` `player` — at night (the clock set by the harness, as `energy` does): the shed door
     open lights the moulding shed from the lit shop; shut, it darkens; the hut's window lets the
     hillside's light in.
  9. `instant` `staged` — the parlor arch's doorman turns away the undressed; the coach: board,
     `go out`.
  10. `instant` `staged` — as an author (`eval --parcel`): a curtain row between two adjacent cells
      of one zone; walk through; cannot see past; then a non-adjacent way with a boundary and a
      non-opposite pair → refused with the reason in `errors`.
  11. `short` `staged` — restart (`Session` reconnect after the harness's world reset); repeat 1, 3, 4.
  Every checkpoint is made to fail once on purpose (B2).
- **The browser walk** `e2e/tests/boundary-walk.spec.ts` — once at code-complete (B3).
- `pnpm test` at code-complete (MR READY first) and at `/finalize` only.

## Risks & opens

- **build-2's pending W2/W8 land on the same files** (`resolver.ts`, `scope-walk.ts`,
  `OpenController.ts`). W0 re-grounds; if build-2's W2 changes how `here:exits` is built, W1's
  door-candidate deletion is re-done against it. Never merge the branch; wait for master.
- **The golden characterization** (D10): an order-only shift is re-baselined with the diff in the
  commit; a magnitude shift stops the wave.
- **Residency:** a row-singleton boundary whose sides are reaped — `canEvict` vetoes while a
  side's source lives; a boundary with no live side is cullable (as a Door today).
- **A sleeping ship's berth way** keeps a remembered lock with no boundary behind it (D6). The
  honest alternative — the berth way goes when she sleeps — reverses a harbors decision; not this
  build's.
- **`freeFrom` compares identity paths**: a minted room's identity path must be stable across a
  restart (`identity-key-must-survive-a-restart`); the warrens key members by `getPersistenceKey()`
  already — assert it in W3's tests.
- **`FrontDoorExit`/`DormDoor` keep their classes** for `computeDestination`; their `exits/*.yaml`
  `class:` lines stay. If the build finds them reducible to `DeferredDestinationExit` + a kind row
  datum, that is a finding for the sweep, not a wave.
- **Ask, don't guess:** D14 (the hut's geometry) and the fixed-grating "cannot open" case (a
  `grating` kind authors `open: true` and refuses `close` — acceptable, or a third twin?).

## Requirements gaps

1. **The Rejection hut** (D14): the requirements' *its two windows become sides of real ways onto the
   yard* and drive step 5 assume the hut's windows and its doorway face different adjacent cells;
   the rows put both on the same non-adjacent rooms. The plan proposes one re-coord and one window
   retired into the enclosure. Needs the owner's yes before W2.
2. **Leaving through a shared lock**: the requirements say *a tenant's key opens what it opened* and
   *nothing a player can do today stops working*; today a guest leaves a holding and a workman
   leaves the pump house because the way back carries no lock. One shared lock makes that a
   regression unless the inside is free — D5 (`freeFrom`) is the plan's answer; it is a small
   model addition the requirements did not name. Flagged, not reopened.

## Deferred seams

- The per-channel NUMBERS by material and construction → `senses-slate` (the `channels` table is
  the attach point; a row authors them today).
- `water` as a channel → with its first reader (an ice hole, a flooded hatch); the closed
  vocabulary is the attach point.
- The opening read by clearances → `size-and-carrying` (`Boundary.getOpening()`).
- Lockcraft (`lockTechnology: none`, picking, master keys) → `lock-slate`.
- `ExitableVessel` composing `Adornable` only for the retired anchors → a cleanup finding.
- The compass rose and interzone list reading `WayRecord` → `map-slate` Wave 1.
- Scenery gates/hatches/gratings as real ways → each locality's rows, any time.

## Critical files

`lib/boundary/{Boundary,Exit,Exitable,ExitableVessel,Conduit,Lockable,DeferredDestinationExit}.ts`,
`api/boundary.ts`, `platform/idea/api/{BoundaryLogic,MqlLogic,PerceptionLogic,CommandLogic,FireLogic}.ts`,
`platform/thing/{Door,Window}.ts`, `platform/idea/{BerthExit,AshoreExit,KeptDoor,Ship}.ts`,
`platform/idea/modalities/{VisionModality,SoundModality,SmellModality}.ts`, `lib/perception/AudienceGather.ts`,
`lib/biome/Atmospheric.ts`, `lib/location/{Location,CirculationWarren,FloorplanWarren}.ts`,
`lib/description/Perceiver.ts`, `api/mql/{resolver,scope-walk}.ts`,
`platform/idea/cmd/perception/{LookController,SenseController}.ts`,
`packages/content/residence/src/idea/{HoldingWarren,BuildingWarren,PlatWarren,KeyedDoorExit,FrontDoorExit,LotGateExit}.ts`,
`packages/content/eternal-university/src/duncan-hall/idea/{DormWarren,DormDoor}.ts`,
`packages/content/trade-glass/src/idea/cmd/glass/GlazeController.ts`,
`packages/server/scripts/check-location-classes.ts`, `packages/types/src/index.ts`,
`packages/client/src/components/cards/{NavigatorBody,CardBodies}.tsx`, `packages/client/src/components/phone/ButtonBar.tsx`,
`docs/subsystems/{boundary,light,mql,location,construction}.md`, the rows named in § Grounding.

## Drive record

*(appended at build time)*
