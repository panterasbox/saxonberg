# Base-class narrowing, phase 2d — the Location branch

Addendum to [base-class-narrowing-clusters-plan](./base-class-narrowing-clusters-plan.md)
and [base-class-narrowing-agent-plan](./base-class-narrowing-agent-plan.md)
on branch `build/narrowing` (MR !303). Cites the CROSS-BRANCH decisions
D1–D9, D13–D14 and the Agent pass's E1/E12/E13 and does not re-argue
them. Its own decisions are numbered **L1…L12**; its waves **L0…L8**.
Written at `44f0036d6`; every file fact below was taken by opening the
file this cycle.

⚠ **Another planner holds the Idea branch in parallel.** This plan
touches no `lib/stuff/Idea.ts`, nothing under `platform/idea/**`, and
not `docs/subsystems/zone.md`. Where the analysis reached one of those
it is written under § Cross-branch notes for the coordinator, never as
a wave.

**The headline, verified:** the Location root is *too narrow*, not too
wide. Six mixins compose on `lib/stuff/Location.ts:135-141` and the
owner's criterion keeps all six. What the criterion ADDS is the three
description mixins every concrete room composes by hand — 141 of 144
rows author `Visible`'s fields, 143 author `keywords` — and **three
shipped rows author their keywords into a void today** because their
class forgot to (`corridor.yaml`, `dormroom.yaml`, the Hush gallery).
Three class docstrings had already written the finding down (*"every
room class built directly on `Location` has to remember"*). The rest of
the branch's work is naming: a bar that says it is on a grid and is not,
a dorm room that is the room class it does not extend, two rows
describing themselves in keys the Hydrator discards, and two verbs
afforded by nothing.

---

## The waves at a glance — start at L0

| wave | one line | ends at |
|---|---|---|
| **L0** | `Visible`, `Detailed`, `Perceptible` onto the `Location` root as two named intermediates; nine classes drop their own wraps; `look`'s non-Visible fallback retired; the void's row gets its two sentences; orphan ceiling 412 → measured (≤ 407) | `build(narrowing L0)` |
| **L1** | two `fieldMeta` flags: `CartesianCoordinatesMixin.coordinates` loses `authorable`; `Location.suppressesMagic` gains it | `fix(narrowing L1)` |
| **L2** | the naming pass: `Bar` re-based onto `SingletonCartesianLocation` and deleted (its row's `coords:` is dead today — Dave's Bar is in no grid); `DormRoom extends FurnishableRoom`; six stale docstrings and two stale test headers | `refactor(narrowing L2)` |
| **L3** | the dead keys: `cellar.yaml` + `venue.yaml` `name:`/`description:` → `shortDescription:`/`longDescription:`; `CircleFloor.yaml` `name:` dropped; three moor rows `address:` → `_address:`; ceiling re-pinned | `fix(narrowing L3)` |
| **L4** | `lock`/`unlock` afforded on `MobileMixin.self` beside `open`/`close`, with the coordinator's affordance census in the commit body | `fix(narrowing L4)` |
| **L5** | docs: `location.md`, `architecture.md`, `residence.md`, `sandbox.md`, `lifecycle.md`; wiki pages `exitable` / `perceptible` | `docs(narrowing L5)` |
| **L6** | the drive, part H | `drive(narrowing L6)` |
| **L7** | the composition census re-run and its delta | `tools(narrowing L7)` |
| **L8** | the slate: L3's Slotted seam, L4's `coords`/`coordinates`, the spherical `Staged` gap, the locomotion and `fold` affordances, filed as lines | `slate(narrowing L8)` |

Every wave lands green on `lint:family` + `pnpm test:near` + each touched
pack's vitest; `pnpm test` once before the MR returns to review.

---

## Grounding

### The root, measured against the criterion

- `lib/stuff/Location.ts:135-141` —
  `Addressable(AmbientLit(Atmospheric(Adornable(Container(PostRegistration(Stuff))))))`.
  ⚠ Its own docstring at `:11` still says
  `AmbientLitMixin(AdornableMixin(ContainerMixin(Stuff)))` — three
  layers short of the truth. `:96-134` records why `AmbientLit` and
  `PostRegistration` sit at the base (*"it had to move down rather than
  be added to a seventh class"* — the same argument L1 makes for the
  three description mixins).
- **My own slice of the census** (`pnpm -C packages/server
  composition-census --json`, this cycle, matrix at
  `scratchpad/matrix-loc.json`): **21 Location classes, 144 rows** —
  the coordinator's 22/201 includes `CartesianZone` (57) and
  `SphericalZone` (1), which are not on this branch (L5), and omits
  `/world/substation/FloodedCell` (1 row). Per-mixin, rows-with /
  rows-authoring / classes:

  | layer | rows | authoring | classes | reading |
  |---|---:|---:|---:|---|
  | `AtmosphericMixin` | 144 | 63 | 21 | kept — well authored, and `feel`/`smell`/`listen`/`trace atmosphere` all key off it (21 reader sites) |
  | `AmbientLitMixin` | 144 | 55 | 21 | kept — `light.md`; derived by default, authored only as the exceptions |
  | `AddressableMixin` | 144 | 53 | 21 | kept — sparse null-default by design (`Addressable.ts:8-9`); the resolve-walk reads it off ancestors |
  | `VisibleMixin` | 143 | **141** | 20 | **mandatory** — L1 |
  | `PerceptibleMixin` | 140 | 140 (+3 rows into a void) | 17 | **mandatory** — L1 |
  | `DetailedMixin` | 142 | 77 | 19 | goes with `Perceptible` — D8, L1 |
  | `Location` own (`floor`, `noDefaultFloor`, `suppressesMagic`) | 144 | 4 | 21 | reading 3 — three opt-out seeds |
  | `StagedMixin` | 137 | *0 by the instrument* | 16 | ⚠ 83 rows author `props:`, 47 `cast:` — the instrument cannot see instruction fields (below) |
  | `AdornableMixin` | 144 | *0 by the instrument* | 21 | 8 rows author `adornments:` — same blindness; and the mixin is what mints every floor |
  | `ContainerMixin` | 144 | 0 | 21 | no authorable field; the branch's definition |
  | `SlottedMixin` | 144 | 0 | 21 | reading 3 with a flag defect — L3 |
  | `CartesianCoordinatesMixin` | 126 | 0 | 14 | the instrument is right and the FLAG is wrong — L4 |
  | `CartesianLocation` own (`coords`, `extent`) | 124 | 116 | 12 | the authored shape of the coordinate — L4 |
  | `ExitableMixin` | 141 | *invisible* | 19 | 102 rows author `exits:`; the layer does not appear in the census at all |

- ⚠⚠ **The instrument's blind spot on this branch is INSTRUCTION
  fields, and it is wider than the Agent pass found.** The census builds
  each class's layer list from `getPersistenceContributors`
  (`check-composition-census.ts:22-27`), which lists a layer's
  PERSISTENT fields. `exits`, `props`, `cast` and `adornments` are
  `instruction: true` (`Exitable.ts:296-302`, `Staged.ts:257-262`,
  `Adornable.ts:140-141`) — so `Staged` and `Adornable` read as *"no
  authorable field"* while being authored on 83 and 8 rows, and
  `Exitable` — 102 rows authoring `exits:` — has no layer row anywhere
  in the matrix. The coordinator's *"No authorable field at all:
  `Adornable`, `Container`, `Staged`"* is that artefact. Every verdict
  below on those four is taken from the row keys
  (`scratchpad/matrix-loc.json`'s `rows[]`), not from the layer table.

### The three that are authored into a void

`check-instanceable-placement --orphans` run this cycle (ceiling
412/412), filtered to this branch:

```
duncan-hall/location/corridor.yaml:  data.keywords  — Corridor declares no such field
duncan-hall/location/dormroom.yaml:  data.keywords  — DormRoom declares no such field
rejection/hush/gallery.yaml:         data.details, data.keywords, data.primaryKeyword
                                     — SingletonSphericalLocation declares no such field
saxonberg-lounge/…/location/bar.yaml: data.coords   — /world/lounge/location/Bar declares no such field
trade-hospitality/…/cellar.yaml:     data.description, data.name — SingletonCartesianLocation …
platform/location/venue.yaml:        data.description, data.name — CartesianLocation …
platform/location/sandbox/CircleFloor.yaml: data.name
world-seed/…/moor/{stormy-heath,turf-bank,weeping-chamber}.yaml: data.address
```

- `Corridor.ts:30-32` — `Exitable(Detailed(Visible(Location)))`, no
  `Perceptible`; its row authors `keywords: [corridor, dorm]`.
- `DormRoom.ts:46-49` — `Persistable(WarrenMember(Exitable(Detailed(Visible(Staged(Location))))))`,
  no `Perceptible`; its row authors `keywords`.
- `platform/location/SingletonSphericalLocation.ts` →
  `SphericalLocation.ts:33-34` — `Exitable(SphericalCoords(Visible(Location)))`,
  no `Perceptible`, no `Detailed`; the Hush gallery authors
  `primaryKeyword: hush`, `keywords`, and a `details.flutes` block.
- ⭐ **`lint:presentation` clause (d) could not see any of them**
  (`check-presentation.ts:246-262`): it checks that an authored
  `primaryKeyword` is in `keywords`, never that the class can hold
  either. Invariant 12 counted them into its ceiling the day it landed
  (the clusters plan § The unknown-key gate — the same shape as `long:`
  and `material:`).
- ⭐ **The tell was already written down, three times.**
  `Offstage.ts:18-22`, `Bar.ts:40-44`, `Lounge.ts:33-37`:
  *"`PerceptibleMixin` — a room is addressable by keyword. ⚠ It is
  composed per class because `Location` does NOT carry it (only
  `CartesianLocation` does), so every room class built directly on
  `Location` has to remember. These rows were authoring `primaryKeyword`
  into a void until 2026-09-11."* And `FurnishableRoom.ts:116-125`:
  *"when authored content asserts a field the class does not declare,
  the class is wrong, not the content."* Two classes did not remember.

### The line — the Location branch's `Corpse`

- `platform/location/Offstage.ts:29-31` —
  `Singleton(Offstage(Detailed(Visible(Perceptible(Location)))))`;
  docstring `:8-9`: *"deliberately not `Exitable` — nothing walks out
  of it."* `lib/employment/Offstage.ts:13-16`: *"a marker plus the one
  invariant of the role — an offstage room is never `Exitable`"*, and
  `Offstage.test.ts:73` pins it. Three rows, every one authoring
  `keywords`, `shortDescription`, `longDescription`, `register`.
  ⭐ **Offstage composes ALL of the three description mixins and NONE
  of `Exitable` / `Staged` / a coordinate mixin.** That is exactly the
  `Corpse` shape (E13): the class that shows where the root ends and
  the rung begins. The root ends at *a place you can see, name and
  point at*; *a place you can walk out of* is the next thing.
- `platform/location/VoidLocation.ts:30` — `SingletonMixin(Location)`,
  nothing else. Its row (`void.yaml`) authors only `noDefaultFloor:
  true`, and its header says *"the look command renders this as the
  bare minimum … until the look command grows a more elegant fallback
  for non-Visible Locations."* `LookController.ts:159-166` grew one:
  *"A bare `Location` … (the void on a fresh login) degrades to the
  'indistinct surroundings' fallback."* This is the branch's
  `BoundaryAnchor` (D13): the one row composing none of the three, and
  it is the exception that shows the rule — a body evacuated to the
  void DOES look, and the engine had to hand-write the sentence the
  row could not author. Reading **2** for the void (write the row);
  L1 lets it.

### The classes, one by one (compositions verified)

| class | file | composition over the root | rows |
|---|---|---|---|
| `lib/location/CartesianLocation` | `:64-70` | `Staged(Detailed(Perceptible(Exitable(CartesianCoords(Visible(·))))))` + `coords`/`extent`, the cardinal-rule `addExit`, geometry | via twins |
| `platform/location/CartesianLocation` | twin, empty (`:52`) | — | 3 |
| `platform/location/SingletonCartesianLocation` | `SingletonMixin(lib CartesianLocation)` | — | 94 |
| `platform/location/SphericalLocation` | `:33-34` | `Exitable(SphericalCoords(Visible(·)))` — ⚠ no `Staged`, no `Detailed`, no `Perceptible` | 0 (the Singleton twin has 1) |
| `platform/location/Street` | `:40-42` | `PublicLighting(SingletonCartesianLocation)`; its header is the project's own host test applied on this branch (*"the guard at the top of that hook … a mixin re-narrowing its own host set"*) | 4 |
| `platform/location/Crossing` | `extends Street` + a live `getDetail('tower')` | real code | 1 |
| `platform/location/Offstage` | above | the line | 3 |
| `platform/location/VoidLocation` | above | bare | 1 |
| `platform/location/sandbox/CircleFloor` | `:32-35` | `Staged(Detailed(Perceptible(Exitable(Visible(·)))))` — ⚠ docstring `:5-7` says *"`CartesianLocation` composes `SingletonMixin`"*, false since the tiers split | 1 |
| `platform/location/FurnishableRoom` | `:112-136` | `Persistable(WarrenMember(Exitable(Detailed(Visible(Perceptible(Reserved(Staged(·))))))))` + `postedAs`; ⚠ docstring `:23-36` says *"`CartesianLocation` plus three layers"* and `:81-107` says *"NOT CARTESIAN … plain `Location`"* — the second is true and `LocationTiers.test.ts:56` pins it | 10 |
| `world/lounge/location/Bar` | `:52-58` | `Singleton(Staged(CartesianCoords(Exitable(Detailed(Visible(Perceptible(·)))))))` — **the mixin set of `SingletonCartesianLocation` restated on plain `Location`**; docstring `:31-38`: *"Cartesian, because every location plots … the bar is its origin"*; its row authors `coords: {0,0,0}` with the comment *"`coords:` is the MEMBERSHIP operation"* — and the class declares no `coords` field, so the Hydrator discards it. **Dave's Bar is in no grid.** `/world/lounge` IS a `CartesianZone` (`saxonberg-lounge/content/world/lounge.yaml:20`). No production import of the class (`grep`: none); seven lounge tests import it | 1 |
| `world/lounge/location/Lounge` | `:44-51` | `Exitable(CartesianCoords(Detailed(Visible(Perceptible(LoungeMixin(WarrenMember(·)))))))` — the warren stamps coordinates by duck-typed `addLocation` (`LoungeWarren.ts:188-208`); the row declares none. This is D14's shape — compose the one mixin you want — and stays | 1 |
| `world/substation/FloodedCell` | `extends SingletonCartesianLocation` + `onEntered` | real code | 1 |
| `hearthworks/src/location/SealedCellar` | `Reserved(SingletonCartesianLocation)` + `enclosureDefaults` | real code | 1 |
| `eternal-university/…/Corridor` | `:30-32` | `Exitable(Detailed(Visible(·)))` + `canEvict` | 1 (minted many) |
| `eternal-university/…/DormRoom` | `:46-49` | above; `SCOPE`/`ADDRESS` statics; a population witness **byte-identical to `FurnishableRoom.ts:191-217`**, which says so (*"the DormRoom fold, generalized"*) and `FurnishableRoom.ts:44-48`: *"the shipped dorm room already had exactly this stack … `DormRoom` IS a room archetype (a bedsit)"* | 1 (minted many) |
| `trade-farming/…/Field` | `:174-188` | `Persistable(WarrenMember(Improvable(Sward(Soil(Reserved(CartesianLocation))))))` | 3 |
| `trade-forestry/…/Wood` | `:81-86` | `Persistable(Stand(Soil(Reserved(SingletonCartesianLocation))))`; ⚠ docstring `:13-16` cites `PersistentCartesianLocation` in the present tense — a class the first phase deleted | 3 |
| `trade-mining/…/AuthoredWorking` | `:33` | `Working(SingletonCartesianLocation)` | 7 |
| `trade-mining/…/MineRoom` | `:37` | `Persistable(WarrenMember(Working(CartesianLocation)))` | 4 |
| `trade-quarrying/…/OpenWorking` | `:33-35` | `Persistable(OpenWorking(SingletonCartesianLocation))` | 2 |
| `trade-quarrying/…/Turbary` | `:65-67` | `Persistable(Improvable(OpenWorking(SingletonCartesianLocation)))`; `:39`: *"No guard anywhere re-narrows the host set, which is the test"* | 1 |

### `Slotted` — where it comes from and who reads it on a room

- No Location class composes `SlottedMixin` directly. It arrives through
  `lib/boundary/Adornable.ts:131` — `class AdornableMixin extends
  SlottedMixin(Base)` — *"Pattern C: derives its slot universe from the
  live fixture map"* (`:16-24`, `slot.md:73`). `getSlotNames`/`getSlotSpec`
  are overridden (`:340-348`); `occupy`/`vacate` route to
  `addFixture`/`removeFixture` (`:354-380`). ⚠ `getAllOccupants`,
  `isSlotOccupied`, `isSlotFull` are NOT overridden and read the base
  `slots` map, which `:224` says *"stays empty for Adornable hosts"*.
- `Slotted.ts:247-257` — `staticSlots: { persistent: true, authorable:
  true }`, *"only used by the default `getSlotNames` … Hosts that
  override the universe surface (BodyPlanSlots, Adornable) leave this
  empty."* So every room offers `staticSlots:` in the studio, and a
  value written there is ignored.
- Readers that can see a room as a `Slotted` host (`grep isSlotted(`):
  `Container.ts:129` (`wornOccupantIds` — reads the empty map, harmless),
  `PutController.ts:357` (`openSlotFor(target)` — a room is `Slotted`
  and not `Vitals`, so it walks the fixture slot names and `isSlotFull`
  answers false for every one), `PersistableLogic.ts:738,803` (the
  slotted slice on a persistable room captures an empty map).
- `api/mixin.ts:768-800` — `getAllFieldMeta` merges *"property-level,
  first-declaration-wins … booleans first-wins is a union (nothing
  declares `false`)"*. Retracting `authorable` from an outer layer would
  mechanically work and would be the tree's first declared `false`.

### `CartesianCoordinatesMixin` — the census is right, the flag is wrong

- `lib/location/CartesianCoordinates.ts:29-31` — `coordinates: {
  persistent: true, authorable: true }`. **No row authors it** (the one
  `coordinates` hit in the branch is the spherical gallery).
- `lib/location/CartesianLocation.ts:73-76` — `coords: { persistent:
  true }` (⚠ no `authorable`), authored by **116 rows**, and
  `:238-325` bridges it: `setCoords` → `zone.addLocation` →
  `setCoordinates`. `location.md:326-331`: *"`coords` and `coordinates`
  are distinct fields by design … Unifying them is out of scope."*
- So the census's `CartesianCoordinatesMixin 126/0` is a **true
  measurement of a false offer**: an author writing `coordinates:
  [1,2,0]` on a cartesian row would set the tuple with no zone
  registration — silently wrong. The authored shape is the class's
  `coords`, which the census counts under the `CartesianLocation` layer
  (124/116).
- The inverse defect on the same class: `Location.ts:146` declares
  `suppressesMagic: { persistent: true }` with no `authorable`, while
  `:154-160` says *"Authored in room seeds"* and one row does.

### `SingletonCartesianLocation` vs `CartesianLocation` — a real pair

- `lib/stuff/Singleton.ts:1-16` — enforcement is in `StuffApi.clone()`
  (*"the second clone throws before construction starts"*);
  `TemplateApi.validateSingletonContainerTarget` and
  `StuffApi.singletonOrClone` (`location.md:501-504`) dispatch on the
  CLASS. A flag on the row could not do any of the three.
- `lib/location/SingletonCartesianLocation.ts:1-27` and
  `platform/location/CartesianLocation.ts:1-51` each argue the
  asymmetry (*"the mixin SUBTRACTS, so the permissive class holds the
  unmarked name"*); `LocationTiers.test.ts:88-98` pins it; the census
  `--siblings` mode stopped pairing them at `c32cb4db9`.
- 94 rows vs 3 is the right proportion: an authored place is one place
  by default; the three permissive rows are the three the
  `lint:locations` roster names as minted (`MINTED_ROWS`,
  `check-location-classes.ts:202-206`).

### Zones — not on this branch

- `lib/zone/Zone.ts:47` — `export abstract class Zone extends Idea`.
  `SpatialZone extends Zone` (`lib/zone/SpatialZone.ts:28`);
  `platform/idea/location/CartesianZone.ts:31` —
  `extends SingletonMixin(SpatialZone)`. The matrix lists
  `CartesianZone`'s mixins as `[SingletonMixin]` and nothing of the
  Location root. The census has no branch column; the coordinator's
  bucket was the `/location/` path segment.
- ⚠ Two docs draw them elsewhere: `location.md:14-17` (*"sit here under
  `lib/location/`"*) and `zone.md:70-72` (`lib/spatial/`). The first is
  this plan's to fix (L5); the second is the Idea planner's
  (§ Cross-branch notes).

### The arg gates and affordances on this branch

- **Arg gates** (`grep requires:` over `packages/content/**/cmd/**/*.yaml`):
  no view names `class:Location`; the only Location-branch mixins
  named are `CultivableMixin` ×5 (a pot or bed — Thing branch in
  practice), `SealableMixin` ×2 (`open`/`close`), `LockableMixin` ×2
  (`lock`/`unlock`), `SwitchableMixin` ×1, `ContainerMixin` ×3
  (`put`, `equip`, `trace`), `PlacingMixin` ×1. **Nothing on this
  branch is gated by `Visible`, `Perceptible`, `Detailed`, `Exitable`,
  `Staged`, `Adornable`, `Atmospheric`, `AmbientLit` or `Addressable`
  at the binder.** So no move in this plan can be caught by an arg
  gate; every one fails silent if wrong, and § Test & gate strategy
  names what catches each instead.
- **Affordances on Location hosts**: `Improvable.ts:269-280`
  (`grub`/`ditch`/`lime`, `self` + `inventory`), `Field.ts:207-210`
  (`plough`), mining `Working.ts:290-302` (`hew`/`drive`/`sink`/`raise`/`shore`),
  quarrying `Working.ts:270-273` (`dig`). ⭐ The bucket that makes a
  ROOM's verb reach the player standing in it is **`inventory`**
  (`api/command.ts:305-310`: *"everything nested inside it, at any
  depth"*; `CommandLogic.ts:3374-3382` walks it). `self` on a room is
  inert (a room is never the giver) and `Improvable.ts:259-262`
  explains the pair as *"the ground you are STANDING IN"*. None of the
  three description mixins carries a contribution (`Visible.ts:142-146`
  is target-shape only; `Perceptible`, `Detailed`, `Exitable`, `Staged`
  declare none), so L0 moves no verb.
- **`lock`/`unlock`** (the coordinator's census, verified):
  `platform/cmd/boundary/lock.yaml:21` and `unlock.yaml:21` gate on
  `LockableMixin`; `grep -rn "boundary/lock.yaml\|boundary/unlock.yaml"`
  over every `commandContributions` static finds **nothing**.
  `open`/`close` are afforded at `lib/spatial/Mobile.ts:229-230` on
  `self`. `LockableMixin` composes on `platform/thing/Door.ts` only
  (`lib/Bistate.ts:27`: `Door = Lockable(Sealable(Boundary))`). A
  locked door in the drive's loaded packs:
  `terminus/…/university-avenue/thing/campus-gate-door.yaml`
  (*"closed + LOCKED Door"*) on the crossing's north exit.

### The drive can reach

`packages/wire/tests/base-class-narrowing.dirty.wire.test.ts:54-70`
loads thirteen packs — not `saxonberg-lounge`, `trade-hospitality` or
`rejection`. `LOBBY` (`duncan-hall/location/lobby`) and the
university-avenue crossing (`terminus`) are reachable; the dorm
corridor and dorm room are minted only when `DormWarren` provisions a
unit; the Hush gallery is `rejection`'s. Part H therefore adds
`saxonberg-lounge` and `trade-hospitality` to `declareFile` (L6 says
why) and proves the Corridor/gallery half by unit test and census.

---

## Plan-level decisions

### L1 — `Visible`, `Detailed` and `Perceptible` go onto the Location root

**The owner's criterion, applied.** *Strip the root to the bare bones;
if a mixin is mandatory, that tells you the whole branch wants it.* On
the Thing branch that removed two; here it adds three, and the numbers
are the same shape the Thing branch called mandatory (`Visible` 597/599,
`Perceptible` 598/599 — D13's table): `Visible` **141/144**,
`Perceptible` **140/140 plus three rows authoring it into a void**,
`Detailed` 77/142 under D8's rule (*"`Detailed` goes with anything
`Perceptible`; every branch wants `Perceptible` on its base except
Idea"* — the owner's F2, ruled). The three rows that today lose their
keywords are the receipts, and the fix is the one `AmbientLit` and
`PostRegistration` already took on this class (`Location.ts:96-134`):
compose at the base rather than remember on the seventh subclass.

**The composition.** Two named intermediates, because
`Location.ts:207-213` records that *"a fourth mixin layer on this class
collapses TypeScript's inference"* and `Field.ts:174` / `Wood.ts:81`
name the cure (*"inference through nested generic mixin factories
collapses to `never`" — name the ground first*):

```ts
// lib/stuff/Location.ts
const LocationSeen = VisibleMixin(
  DetailedMixin(PerceptibleMixin(PostRegistrationMixin(Stuff))),
);
const LocationBase = AddressableMixin(
  AmbientLitMixin(AtmosphericMixin(AdornableMixin(ContainerMixin(LocationSeen)))),
);
```

`Visible(Detailed(Perceptible(·)))` is the Thing root's order (D13);
innermost of the six because `Atmospheric` and `Adornable` constrain
their base to `Stuff & Container` and the `onDestruct` chain
(`Adornable` → `Location` → `Stuff`) must not gain a layer between.
None of the three defines `postRegister` or `onDestruct` (verified by
grep over `lib/description/{Visible,Detailed,Perceptible}.ts`: no
match) and none of the six defines `getDetail`, `getKeywords` or
`getMarkupLong`; the build agent re-runs that grep in L0 and cites it.

**What changes for each class.** The nine classes that wrap any of the
three drop the wrap and the import (the W0 procedure): lib
`CartesianLocation`, `SphericalLocation`, `Offstage`, `CircleFloor`,
`FurnishableRoom`, `DormRoom`, `Corridor`, `Bar`, `Lounge`. The three
void-keyword rows go live with no row edit. `SphericalLocation` gains
`Detailed` and `Perceptible` (its one row authors both). `VoidLocation`
gains all three and its row gains two sentences — the fallback
`LookController.ts:159-166,213-216` hand-wrote for it moves into
`void.yaml` as `shortDescription: nowhere` / `longDescription`, and the
fallback branch is retired (see § Test & gate strategy: this is not a
weakening; the guard is now structurally unreachable on a `Location`).

**What composing the three on the root claims about everything on
it:** *every place can be described, addressed by keyword, and has
parts you can look at.* True of a street, a cellar, a mine face, a
dorm corridor, a holodeck floor, an offstage office, and — with two
authored sentences — of the void. ⚠ The project's test: **if any
Location subclass ever needs `if (MixinApi.isVisible(this))` to behave,
the mixin is on the wrong host** — write it down, do not guard.

### L2 — `Exitable`, `Staged` and the coordinate mixins stay per class; no rung is minted

`Offstage` is the line (Grounding): every description mixin, no way out.
`VoidLocation` is the second class with no way out, for the same reason
(*"nothing walks out of it"*). Two classes deliberately declining a
mixin, each with the reason in its own docstring and a test pinning it
(`Offstage.test.ts:73`), is a legitimate boundary, not a content gap.
`Exitable` is therefore the first mixin of the rung, not of the root.

**Is there a missing superclass between?** The consumers of
`Exitable(…(Location))` with no coordinate mixin, after L0 and L7, are
lib `CartesianLocation`, `SphericalLocation`, `CircleFloor`,
`FurnishableRoom`, `Lounge` and `Corridor`; of those, only `CircleFloor`
and `FurnishableRoom` also compose `Staged` (`DormRoom` folds into
`FurnishableRoom` in L7). ⭐ *A shared capability chain is not a shared
rung* (the Firebox lesson): `Exitable` alone is one mixin, and D14's
rule is to compose it; the `Exitable(Staged(·))` pair has two
consumers, and *promote at the third consumer* declines it. The name
such a rung would need — a walkable, self-stocking non-coordinate
place — is *Room*, which `CLAUDE.md` reserves for the interior somebody
furnishes. **Declined, with the count.**

### L3 — `Slotted` 144/0 is reading 3, with a flag defect that is `slot.md`'s to fix

`Slotted` is not composed by any Location; it is the substrate
`AdornableMixin` is BUILT on (Pattern C — the fixture map IS the slot
universe, and the floor every room mints at `postRegister` lives in
slot `floor`). A room's slots are its fixtures: that is D7's shape (*a
body's slots come from its `BodyPlan`, a floor's postures from
`Postured`'s defaults*), so the zero on `staticSlots` is behaviour with
no authored surface, and the `<composition>` panel saying *Slotted* of a
room is true.

**What is false** is the OFFER: `staticSlots` is `authorable` on every
room and `Adornable` ignores it — the `Zone.stocks` shape
(`SpatialZone.ts:33-43`: *"an `authorable` field on the base offers
exactly that … in the studio's composition panel"*). And the Pattern C
surface is half-implemented: `getSlotNames` reads fixtures while
`getAllOccupants`/`isSlotFull` read the empty base map, so
`PutController.openSlotFor` (`:357-364`) sees every fixture slot of a
room as open. Neither is narrowing and neither is this branch's host:
`SlottedMixin` is `slot.md`'s and the Attired/Slotted split is in
flight. Two fixes exist — `Adornable` declares `staticSlots: {
authorable: false }` (mechanically sound, `api/mixin.ts:786-790`, but
the tree's first declared `false` against a stated convention) or the
split gives `Adornable` a fixture map that is not a `Slotted` — and
**both are the owner's call**. Filed (L8) with the receipts; no code.

### L4 — two `fieldMeta` flags lie; fix the flags, not the fields

`CartesianCoordinatesMixin.coordinates` loses `authorable`
(`CartesianCoordinates.ts:30`): the authored shape is `coords` on the
class, bridged by `setCoords`, and an author offered `coordinates`
would bypass zone registration silently. `Location.suppressesMagic`
gains `authorable: true` (`Location.ts:146`): its docstring says it is
authored, one row does, and the studio does not offer it. The
`coords`/`coordinates` duplication itself (`location.md:326-331`) is a
naming seam filed at L8, not a narrowing; the spherical twin's
`coordinates` IS the authored shape there (the gallery authors it) and
is untouched.

### L5 — zones are on the Idea branch; the honest answer is "not this plan's"

`Zone extends Idea`. The 58 zone rows are in the coordinator's count
only by path. Nothing here narrows or names them; what this plan owes
is the correction to `location.md` (L5 wave) and the cross-branch note.
⚠ `platform/idea/FolderZone` (9 rows), `WikiNamespaceZone` (5) and
`HomeZone` (1) appeared in my path-bucketed slice too; same answer.

### L6 — `CartesianLocation` / `SingletonCartesianLocation` is a real pair

Grounding says why: the mixin is class-level behaviour three
mechanisms dispatch on, both docstrings argue the asymmetry, the census
no longer pairs them, and 94:3 is what *"one row IS one place by
default"* looks like. Not the `DraftHorse`/`PitPony` shape (byte-identical
classes in two packs); the pair differs by the one mixin that
subtracts. **No change.**

### L7 — the naming pass

| group | one thing or two | do |
|---|---|---|
| `Bar` · `SingletonCartesianLocation` | **the same composition, restated on the wrong base** — and its row's `coords:` is discarded, so the class's own claim (*"the bar is its origin"*) is false in the running world. No production importer; `postRegister` identical to lib `CartesianLocation:120-127`; the comment about the Business stand-up is a row comment | L2: `bar.yaml` `class:` → `/platform/location/SingletonCartesianLocation`; delete `Bar.ts`; the seven lounge tests that import the class build a `SingletonCartesianLocation` at the bar path instead (`Bench`, `DraftHorse` precedent). `lint:locations` then SEES the bar (today it is invisible to `unzonedCoords`, `:390-397`, because the class is not cartesian) |
| `DormRoom` · `FurnishableRoom` | **the same chain plus two statics** — `FurnishableRoom.ts:44-48` says the dorm IS the archetype the class was mirrored from; the population witness is duplicated verbatim; `DormRoom` is missing `Perceptible` (dead keywords) and `Reserved` (inert); a dorm is furnished by a tenant, which is `lint:locations`'s roster question | L2: `export default class DormRoom extends FurnishableRoom { static SCOPE; static ADDRESS; }`, the witness removed (inherited), `dormroom.yaml` added to `FURNISHED` (`check-location-classes.ts:213`). `DormWarren` reaches it only by `DormRoom.SCOPE` (`DormWarren.ts:56,263`); `ProvisionController.ts:133` by `ADDRESS` |
| `Lounge` | **D14 — composes exactly the mixin it wants** (`CartesianCoordinates`, warren-stamped) and its docstring says why the row declares none | no change; docstring loses the "has to remember" paragraph in L0 |
| `Corridor` | `Exitable(·)` + `canEvict`; real | no change beyond the wrap drop |
| `CircleFloor` | real (a circle-born, non-coordinate entry room); docstring `:5-7` false | L2: docstring |
| `Field` · `MineRoom` · `Wood` · `OpenWorking` · `Turbary` · `AuthoredWorking` | **six things.** The two chains they restate — *the held minted cell* `Persistable(WarrenMember(X(CartesianLocation)))` and *the durable singleton cell* `Persistable(X(SingletonCartesianLocation))` — cannot be classes, because `Persistable` must be outermost (`Persistable.ts:11-13`) and each consumer's `X` sits INSIDE it. `location.md:72-99` already rules this (*"a SHAPE, not a class"*) and records the class that tried and had no consumer. `Turbary.ts:32-39` argues its own separateness from `OpenWorking`; `MineRoom.ts:1-9` from `AuthoredWorking` (the clusters plan cites it). ⚠ `MineRoom` keeps its name: *room* is the mining term (room-and-pillar), not the furnishing vocabulary | no change; `Wood.ts:13-16` stops citing a deleted class as if it stood (L2) |
| `Street` · `Crossing` · `FloodedCell` · `SealedCellar` | each carries real code | no change |
| `SphericalLocation` · `SingletonSphericalLocation` | the spherical pair, same argument as L6; ⚠ `SphericalLocation` composes no `Staged`, so a spherical venue cannot author `props:` — nobody has wanted to (0 rows); filed | no change |
| `Offstage` · `VoidLocation` | the line (L2) | the void gets its two sentences (L0) |

### L8 — the dead keys, W8's shape

`cellar.yaml` and `venue.yaml` describe themselves in `name:` /
`description:` — neither is a field on any Location class (`Visible`
declares `shortDescription`/`longDescription`; nothing on the branch is
`Named`). The hospitality cellar has rendered with no description since
it shipped. `CircleFloor.yaml` authors `name:` beside a real
`shortDescription` (drop it). The three moor rows author `address:` —
`SpatialZone`'s field (`SpatialZone.ts:36`), not `Addressable`'s
`_address` — so three moor places declare an address the resolve-walk
never reads. Ceiling: 412 − 5 (L0's three rows) − 1 (the bar's `coords`,
L2) − 8 (this wave) = **≤ 398**, measured at the wave, never copied.
`turf-bank.yaml`'s `alternateNames` is one of the 45-row family the
clusters plan named as the next burn-down; left alone here for
consistency with that list.

### L9 — `lock`/`unlock` are afforded beside `open`/`close`, on `MobileMixin.self`

The coordinator's census is verified (Grounding). Two candidate sites:
`LockableMixin.peers` (the Agent wave's `Haulable` pattern — the door
stands beside you) or `Mobile.self` beside the shipped `open`/`close`
pair. **`Mobile.self`**, for the reason the coordinator named the tell:
the two halves of one door verb set should come from one place, and a
door verb is the MOVER's act on a boundary (`lock north` binds by
direction, `lock.yaml:1-8`), which is why `open`/`close` were put there.
A `peers` affordance on `Lockable` would also light `lock` only when a
Door THING is a sibling, and the campus gate is reached as the
crossing's exit. Own wave (L4), census in the commit body. ⚠ Out of
scope and filed: `fold`/`unfold` (`slot.md`'s), `walk`/`swim`/`fly`/
`dismount` (`locomotion.md`'s).

### L10 — the census blind spots this plan states rather than inherits

(i) Instruction fields are invisible (Grounding) — so `Exitable`,
`Staged`, `Adornable` and `Container` can never show a delta in L7, and
their evidence is the row keys and `MixinApi.hasMixin` in tests.
(ii) `FloodedCell` is a Location class the coordinator's slice missed.
(iii) `Lounge` and `Corridor` are minted many times from one row each,
so their 1-row counts understate their live population. (iv) `Animate`'s
lesson holds: a class no row names (none here after L2 — `Bar` is gone
and every other class has rows) would be invisible.

### L11 — the wiki pages the drive reads

`wiki-starter/content/wiki/main/exitable.md` and `perceptible.md`, in
`branded.md`'s shape (a `subject.kind: mixin` page carrying
`<composition kind="mixin" of="…"/>`). Without them part H has no
inverse panel to read the claim from (D16, E17). ⚠ `Perceptible` is on
~980 rows: the panel answers by CLASS past 40 rows (part E's fix), so the
assertions match class paths.

### L12 — content gaps leave as slate lines (D17)

Filed by L8: the `staticSlots` offer and the half-surface (L3); the
`coords`/`coordinates` pair (L4); the spherical `Staged` gap (L7); the
locomotion and `fold` affordances (L9); `alternateNames` ×45; the
structure tier (already on the slate, *"blocks location naming"*).

---

## ⭐⭐ Host placement

| what | host | what composing it claims about everything else on that host |
|---|---|---|
| `VisibleMixin` · `DetailedMixin` · `PerceptibleMixin` | **`lib/stuff/Location`** (the root), innermost of the six | *every place can be described, has keywords a player can point at, and has parts.* True of all 21 classes; the void needs two sentences to make it true and gets them. ⚠ The test: a subclass that needs `if (MixinApi.isVisible(this))` is the finding, never the guard. Nothing on `Idea`, `Thing`, `Agent` or the zones changes. |
| `ExitableMixin` · `StagedMixin` · `CartesianCoordinatesMixin` · `SphericalCoordinatesMixin` | **unchanged**, per class | `Offstage` and `VoidLocation` are the two places with no way out and say so; `Lounge` and `Corridor` are placed by a warren, not a row. A rung would need the name the vocabulary reserves. |
| `SlottedMixin` (via `Adornable`) | **unchanged** | reading 3; the flag defect is filed for `slot.md` (L3). |
| `DormRoom` | **re-based onto `platform/location/FurnishableRoom`** | *a dorm room is a furnished interior* — which `furnishing.md`'s four archetypes already say of a bedsit. Gains `Perceptible` (its keywords go live) and `Reserved` (inert, no `reserves:` authored). Claims nothing new of `FurnishableRoom`'s other rows. |
| `Bar` | **deleted; the row names `SingletonCartesianLocation`** | *Dave's Bar is one place at the origin of `/world/lounge`'s grid* — what its row and docstring already claimed and the Hydrator was discarding. Gains `coords`/`extent`, the cardinal-rule `addExit` (its two exits, `north` and the warren-wired `south`, are cardinal), and zone-narrowed geometry. |
| `lock.yaml` / `unlock.yaml` | **`lib/spatial/Mobile.ts` `commandContributions.self`**, beside `open`/`close` | not a host — an affordance: *every mover can try a lock.* The refusal for the wrong target is the binder's (`requires: LockableMixin`), by name. |
| `coordinates.authorable` (off) · `suppressesMagic.authorable` (on) | the mixin and the class that own the fields | not hosts — offers. |

Nothing lands on `Stuff`, `Idea`, `Thing`, `Agent`, `Zone` or any pack
class beyond the two named.

---

## Convention conformance

Checked against the tree this cycle:

- **Paths** — no new file. `Bar.ts` and its `world/lounge/location/`
  slot are deleted (a locality's own class namespace; the row moves to
  the kernel twin, `<root>/<branch>/` unchanged). No new `lib/` class,
  no twin, no `PALETTE_BASE_CTORS` change (`Location` is already offered,
  `StudioLogic.ts:96`).
- **Module categories** — none new. No Api, no logic singleton, no
  helper, no `eslint-disable`.
- **Module scope declares** — `Location.ts` keeps its one sanctioned
  `_registerTopLevelBranch` tail; the two named `const` intermediates
  are pure value construction.
- **Locations, not rooms** — the rung L2 declines would have been called
  *Room*; `MineRoom` keeps the mining term; `DormRoom` becomes a
  `FurnishableRoom`, which is the one place the word is right.
- **props:/cast:** — the moved rows use `props:` already
  (`bar.yaml`, `dormroom.yaml`); no `populates:`.
- **Import boundary** — `DormRoom.ts` will import
  `@saxonberg/server/mud/platform/location/FurnishableRoom`; the server
  `exports` map exposes `./mud/platform/location/*`
  (`packages/server/package.json:16`), which is how `AuthoredWorking.ts:31`
  already reaches `SingletonCartesianLocation`. `lint:imports` confirms.
- **Verbs on objects** — no Api static changes; `lint:object-verbs` at 0.
- **Inter-Stuff contract** — nothing new reads a field; `LookController`
  keeps its method reads.
- **Kernel mixin names** — none added.
- **Gates this build must pass** (all via `lint:family`, 58 today):
  `lint:instanceable` (invariant 3 on `bar.yaml`'s new class; invariant
  12's ceiling re-pinned twice, in L0 and L3 — the gate's own test
  asserts the invariant, not the number), `lint:locations` (the bar
  becomes a cartesian row with coords under a `CartesianZone`;
  `dormroom.yaml` joins `FURNISHED`), `lint:presentation` (clause (d) on
  the gallery, which authors `primaryKeyword: hush` ∈ `keywords` ✓),
  `lint:field-meta` (the two flag edits), `lint:light-sources`
  (untouched — no ambient authored or removed), `lint:envelope`
  (untouched), `lint:imports`, `lint:module-scope`, `lint:lib-statics`
  (no static on the root), `lint:census` (the `_address` values on the
  moor rows must resolve — check `UNREAD_PATH_FIELDS` does not list
  `address`), `lint:mass` (Locations are not `Tangible`; unaffected),
  `lint:test-content`.

---

## Waves

### L0 — the root: a place can be seen, named and pointed at

1. `lib/stuff/Location.ts`: the two intermediates per L1; imports for
   the three; docstring `:1-22` rewritten to the nine-layer truth and to
   state the claim + the host test; the *"every room class built
   directly on `Location` has to remember"* paragraph moves here, past
   tense.
2. Drop the wrap + import in: `lib/location/CartesianLocation.ts:64-70`
   (keep `Staged`, `Exitable`, `CartesianCoordinates`),
   `platform/location/SphericalLocation.ts:33-34`, `Offstage.ts:29-31`,
   `sandbox/CircleFloor.ts:32-35`, `FurnishableRoom.ts:112-136`,
   `eternal-university/…/Corridor.ts:30-32`, `DormRoom.ts:46-49`,
   `world/lounge/location/Bar.ts:52-58`, `Lounge.ts:44-51`. ⚠ The
   multi-line wraps (`FurnishableRoom`, `Lounge`, `Bar`) leave a dangling
   `,` or `)` — the W0 lesson; `tsc` catches it, a formatter is not the
   fix.
3. Docstrings: every `Visible`/`Detailed`/`Perceptible` mention in the
   nine composition comments (the W0 lesson: *"a rename that skips
   comments leaves the doc lying"*). The three "has to remember" blocks
   are deleted.
4. `platform/idea/cmd/perception/LookController.ts:155-216`: `hasVisible`
   and the *"Your surroundings are indistinct."* branch are retired —
   `context.location` is a `Location`, which is now `Visible` by type.
   ⚠ Keep `hasExits`/`hasName`: those are still per-class. ⚠ This file
   is under `platform/idea/cmd/` — a controller, not the Idea branch's
   class tree; if the coordinator's fence is read as the whole
   directory, leave the branch in place with a comment that it is
   unreachable, and say so in the commit.
5. `platform/content/platform/location/void.yaml`: `shortDescription:
   nowhere`, `register: definite`, `longDescription:` (two sentences —
   *where a body waits before it is anywhere*; the row's own header has
   the words), `keywords: [void, nowhere]`; the header's *"until the look
   command grows a fallback"* sentence goes.
6. `scripts/check-instanceable-placement.ts:276`: re-pin
   `ORPHAN_DATA_KEY_CEILING` to the measured count (five keys go live:
   corridor `keywords`, dormroom `keywords`, gallery `details` /
   `keywords` / `primaryKeyword` → ≤ 407).
7. Tests. `lib/stuff/__tests__/Location.test.ts:1-7` header (*"bare
   Location is just `ContainerMixin(Idea)`"* — false twice) rewritten;
   gains *is `Visible`, `Detailed`, `Perceptible`; is NOT `Exitable`,
   `Staged`, `Slotted`-by-composition-of-its-own* via
   `MixinApi.hasMixin(Location, Mixins.X)`. `Offstage.test.ts:69-75`
   unchanged (still true; add `isPerceptible(room) === true`). New
   assertions in `platform/location/__tests__/LocationTiers.test.ts`:
   `hasMixin(VoidLocation, Mixins.Visible)`, `hasMixin(SphericalLocation,
   Mixins.Perceptible)`, and the fail-open invariant of this branch —
   `hasMixin(Location, Mixins.Exitable) === false`. A test for
   `LookController` that pins *"Your surroundings are indistinct"* —
   **none does** (`grep -rln indistinct` over every `*.test.ts` finds only
   a veil description in `Charged.wear.test.ts:158`) — so the retirement
   changes no test; L0 adds one that clones `void.yaml` and reads its
   authored line through `look here`.
8. Gates: `lint:family`; `pnpm test:near` over `lib/stuff`, `lib/description`,
   `lib/location`, `platform/location`, `platform/idea/cmd/perception`,
   `world/lounge`, `lib/employment`; `eternal-university`'s vitest.
   ⚠ Persistence: `DormRoom` (a persistable host) gains `keywords`/
   `primaryKeyword` as persistent fields; a dev DB is dropped, never
   migrated. `pnpm -C packages/server composition-census` — `Location`'s
   layer list reads nine on every class; `SphericalLocation` and
   `Corridor` show `PerceptibleMixin` for the first time.

Commit: `build(narrowing L0): a place can be seen, named and pointed at — three mixins onto the Location root`

### L1 — two flags

1. `lib/location/CartesianCoordinates.ts:30`: `coordinates: { persistent: true }`.
2. `lib/stuff/Location.ts:146`: `suppressesMagic: { persistent: true, authorable: true }`.
3. `lint:field-meta`; a census re-run shows `CartesianCoordinatesMixin`
   with no authorable field and `Location` own 144/4 with three
   authorable.

Commit: `fix(narrowing L1): two fieldMeta flags that lied about what an author may write`

### L2 — the naming pass

1. **The bar.** `saxonberg-lounge/content/world/lounge/location/bar.yaml`
   `class:` → `/platform/location/SingletonCartesianLocation` (its
   `extends:` parent already is); the row comment about `coords:` is now
   true. Delete `world/lounge/location/Bar.ts`; the seven tests
   (`lounge-fixtures.ts`, `lounge-floors`, `landing.integration`,
   `LoungeWarren`, `startLocation`, `sanctuary`, `bar-office-reveal`)
   build the bar as a `SingletonCartesianLocation` at
   `/world/lounge/location/bar`. `location.md:389` (the file table) and
   `docs/subsystems/location.md § The pieces` lose the `Bar.ts` row.
   ⚠ Before deleting, `grep -rn "location/Bar\b"` over `packages/` and
   `docs/` and cite the count. ⚠ The bar's `postRegister` was
   `verifyOutboundExits` — lib `CartesianLocation.ts:120-127` does the
   same; nothing is lost.
2. **The dorm room.** `DormRoom.ts`: `import FurnishableRoom from
   '@saxonberg/server/mud/platform/location/FurnishableRoom'`;
   `export default class DormRoom extends FurnishableRoom` keeping
   `SCOPE`, `ADDRESS`, `fieldMeta = {}`; the population witness
   (`:70-101`) deleted — `FurnishableRoom.ts:191-217` is the same code.
   `scripts/check-location-classes.ts:213` `FURNISHED` gains
   `eternal-university/content/world/terminus/eternal/duncan-hall/location/dormroom.yaml`
   with the roster's own question answered in the comment (*a tenant
   furnishes it — theme prose and props*). Docstring `:1-27` redrawn.
3. **Docstrings that stopped being true**: `CircleFloor.ts:5-7`
   (`CartesianLocation` is not singleton); `Wood.ts:13-16`
   (`PersistentCartesianLocation` is retired — cite `location.md:72-99`,
   the rule); `FurnishableRoom.ts:23-36` (says *"`CartesianLocation`
   plus three layers"* while `:81-107` says the opposite — keep the
   second, delete the first); `LocationTiers.test.ts:1-19` (names the
   authored pair `CartesianLocation`/`SphericalLocation` where it means
   the `Singleton…` twins); `lib/stuff/Location.ts:11` (done in L0);
   `Lounge.ts:1-22` composition line.
4. `grep -rn "PersistentCartesianLocation" packages/` → zero outside
   the two plan docs.
5. Gates: `lint:locations` (the bar now checked; the dorm row on the
   roster), `lint:instanceable` (ceiling −1 for `bar.yaml coords`),
   `lint:imports`; `saxonberg-lounge` is kernel `world/` — `test:near`
   over `world/lounge`; `eternal-university` vitest (`DormWarren`,
   `DormResidence`, `DormHouseplant`, `provision-command`).

Commit: `refactor(narrowing L2): the bar is on the grid it said it was on, and a dorm room is the room it always was`

### L3 — the dead keys

1. `trade-hospitality/content/trade/hospitality/location/cellar.yaml`:
   `name: a cellar` → `shortDescription: cellar`, `register: indefinite`;
   `description:` → `longDescription:`.
2. `platform/content/platform/location/venue.yaml`: same two renames.
3. `platform/content/platform/location/sandbox/CircleFloor.yaml:14`:
   drop `name:` (a `shortDescription` is authored).
4. `world-seed/content/world/moor/{stormy-heath,turf-bank,weeping-chamber}.yaml`:
   `address:` → `_address:`; verify each value is an address path the
   resolve-walk can root (`address.md` — a `Locality` covering `moor/…`
   must exist, or the declaration resolves to nothing and the rename is
   honest but inert; say which in the commit).
5. `ORPHAN_DATA_KEY_CEILING` re-pinned to the measured count (≤ 398).
6. Drive part H reads the cellar (below).

Commit: `fix(narrowing L3): a cellar and a venue get their descriptions back, and the moor its addresses`

### L4 — ⛔ REVERSED BY RECONCILIATION: `lock`/`unlock` are NOT wired

⚠⚠ **This wave is cancelled, and the reason is the Idea planner's,
verified independently before the reversal.**

Both branch plans were told to treat the twelve dead verbs as a standing
check, and both verified the same facts about `lock`/`unlock`. This plan
concluded *wire them onto `MobileMixin.self` beside `open`/`close`*. The
Idea plan concluded *wire nothing*, and it is right:

- `lib/boundary/Locked.ts:15-27` calls itself a **STOPGAP** in its own
  docstring, names the model that supersedes it (`lib/lock/` — a `Lock`
  value object plus `Key` on `CredentialWalletMixin`, *"the door checks
  a key, not identity"*), and says in terms: **"Do NOT grow this into a
  second lock system."**
- `LockController.ts:60-90` checks `isLocked()` and calls `lock()`.
  **No key, no credential, no title.**

⭐ So wiring the affordance would ship *any player locks any door they
can reach, keylessly*, while residence's `KeyedDoorExit` already models
the real thing through `presentsKey`. **The unwired affordance was the
system telling the truth about a verb that should not exist in this
form** — and a verb nobody can reach is a better state than a verb that
works and should not.

⚠ The general lesson, which is worth more than the wave: *a dead
affordance is a finding, not automatically a bug.* Twelve verbs came
back from the census; four were genuinely wired wrong and got fixed
(`hitch`/`unhitch`/`mount`/`ride`, A6), two are a stopgap whose own
docstring forbids the fix, and six belong to other owners. **The census
is the census; the disposition is per verb.**

Filed for the credential build's reconciliation. The drive OBSERVES the
current refusal and does not assert it — the `Creature.branded.test.ts`
lesson: never pin a known defect as an invariant.

<details>
<summary>The original L4, kept for the record</summary>

### L4 (original) — `lock` and `unlock` are afforded

1. `lib/spatial/Mobile.ts:224-240`: `'platform/cmd/boundary/lock.yaml'`,
   `'platform/cmd/boundary/unlock.yaml'` beside `open`/`close`, with a
   comment stating the pair rule and L9's choice of bucket.
2. Commit body: the coordinator's twelve-verb census as a table, this
   wave's two, and the ten filed by owner (`fold`/`unfold` → `slot.md`;
   `walk`/`swim`/`fly`/`dismount` → `locomotion.md`).
3. Tests: `platform/idea/cmd/boundary/__tests__/LockController.test.ts`
   already exercises the controller; add to `lib/spatial/__tests__/`
   (beside the `Mobile` tests) an assertion that
   `CommandApi.collectContributions(Mobile-shaped ctor, 'self')` includes
   both files — the shape `hearthworks-venues.integration.test.ts:338-339`
   uses for `Menu`.
4. `lint:verb-collisions` (two views naming one verb each — no
   collision), `lint:family`.

Commit: `fix(narrowing L4): lock and unlock are afforded by the mover, beside open and close`


</details>

### L5 — the documentation and the wiki pages

- `docs/subsystems/location.md`: `:27-34` the nine-layer composition;
  `:54-71` the subclass compositions (`CartesianLocation` =
  `Staged(Exitable(CartesianCoords(Location)))` now, `SphericalLocation`
  = `Exitable(SphericalCoords(Location))`); `:14-17` and `:155-159` the
  concrete zones live at `platform/idea/location/`; `:175,223`
  `addRoom` → `addLocation`; `:389` the `Bar.ts` row; a new short
  section *The line: Offstage* stating L2 and the host test.
- `docs/architecture.md:834` the branch line gains *(describable,
  addressable, Detailed — like matter, minus Tangible)*; `:1023` the
  `Location` row of the table (six layers listed as four today; write
  nine); `:1127` `PerceptibleMixin` *"Composed by … `Location`"*.
- `docs/subsystems/residence.md` (`DormRoom` composes `FurnishableRoom`),
  `sandbox.md:419` (`CircleFloor` composition if drawn),
  `lifecycle.md:364` (still `SingletonMixin(Location)` — true),
  `furnishing.md` (the dorm as the fifth row over the class),
  `boundary.md` (the `lock`/`unlock` affordance and its bucket),
  `employment.md:474-477` (still true; add that `Offstage` is the branch's
  line). `CLAUDE.md` is left to the sweep (rule 5).
- Wiki pages per L11.

Commit: `docs(narrowing L5): the Location root in every doc that drew it, and the two pages the drive reads`

### L6 — the drive, part H

Appended to `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts`
as `suite('H — a place can be seen, and a bar is where it said it was')`.
⚠ `declareFile.packs` gains `'saxonberg-lounge'` and
`'trade-hospitality'` — the bar and the cellar are this branch's two
player-visible findings and neither pack is loaded today; the shared
boot unions every file's list, so the cost is boot time, and `DIRTY_REASON`
gains *"…; walks into Dave's Bar and the hospitality cellar"*. Each
checkpoint can fail.

```
beforeAll (240 s):
  reader    = founder                                   // parts A–G's session
  drinker   = at('/world/lounge/location/bar', 'drinker')      // startLocation: a singleton `goto` cannot reach
  cellarman = at('/trade/hospitality/location/cellar', 'cellarman')
  gatekeep  = at('/world/terminus/university-avenue/location/crossing', 'gatekeep', true)
  drain, wait 2 s, drain (the part E lesson: a clone/arrival echo lands on the next frame)

H1  ⭐⭐ the panels — what the world claims after L0
    perceptible = inverse(reader, 'perceptible')
      matches /platform\/location\/Offstage/                  (positive first)
      matches /duncan-hall\/location\/Corridor/               ← the class that could not hold its keywords until L0
      matches /platform\/location\/SphericalLocation|SingletonSphericalLocation/
    exitable = inverse(reader, 'exitable')
      matches /platform\/location\/SingletonCartesianLocation/  (positive)
      not /platform\/location\/Offstage/ ; not /platform\/location\/VoidLocation/
    ⚠ by CLASS past 40 rows; `Perceptible` is ~980 rows, so match class paths, never row paths

H2  ⭐ the cellar has a description again (L3 — `look sextant`'s shape)
    said = roomText(cellarman)                            // `look here`, never bare `look`
    matches /steel racking|markedly cooler|kegs stand/i
    → before L3 the row's `description:` was discarded and the room rendered its keywords and nothing else

H3  ⭐⭐ Dave's Bar is one place on a grid (L2)
    said = roomText(drinker)
    matches /Dave.s Bar/ and /north/                       // the row's prose and its authored north exit
    r = drinker.cmd('trace atmosphere')                    // requires ContainerMixin — a Location is one
    expectOk(r); said(r) matches /m³|volume|cubic/i
    → a plain `Location` has no geometry (`getVolume` → null, `Location.ts:168-170`); a
      `CartesianLocation` in a zone answers `cellSize³`. This is the checkpoint that could not pass
      before L2: the bar's `coords:` was dead, so it was in no zone and reported no size.
    ⭐ Verified this cycle: `TraceAtmosphereController.ts:126-135` prints the `volume:` line only when
      `getVolume() !== null`, and a bare `Location`'s is null (`location.md:48-52`) — so the line is
      the instrument. The fallback if the zone's `cellSize` is unset is the room's `north` exit
      surviving the cardinal rule (a non-cardinal exit into its own zone throws at postRegister).

H4  ⭐ `lock` and `unlock` exist (L4)
    r = gatekeep.cmd('unlock gate')                        // the campus gate: a real locked Door on the north exit
    NOT expectNote(r, 'unknown-command') — the verb parses
    said(r) matches /locked|key|gate/i                     // the controller answered, by name
    r2 = gatekeep.cmd('lock gate') ; NOT unknown-command ; said(r2) matches /already|locked/i
    r3 = drinker.cmd('lock north')                          // no door there: the arg gate or the controller refuses BY NAME
    expectRefused(r3) ; said(r3) not empty
    → before L4 all three answered "I don't understand 'lock'."

H5  the void, stated rather than faked
    No session can be placed in the void from the wire (it is the evacuation fallback, `Container.cleanupOnDestruct`).
    The void's authored line is proved by `LocationTiers.test.ts` (`isVisible(VoidLocation)`) and by
    `look here` in a unit test that clones `void.yaml` — recorded here so nobody reads H as covering it.
```

Recorded under `§ Drive record` the part E way: what it found in the
PRODUCT, what it found in the DRIVE, what it could not prove (the dorm
corridor's keywords — provisioning a unit is the residences drive's;
the Hush gallery — `rejection` is not loaded; both proved by test and
census).

**Harness facts, learned the hard way and binding here:** bare `look`
binds the FOCUS not the room (use `look here`, `roomText()`); `goto`
binds through MQL so it cannot reach a singleton room nobody has visited
(use `startLocation`, as `at()` does); `search` is durative; a `clone`'s
description lands on the next command's frame (drain, wait, drain); bind
carried things with `me:i:`; a cloned thing lands in your INVENTORY and
inventory is not `peers` (`drop` it before a peer affordance can fire);
an unlit room renders things as "something"/"someone" and the wire world
boots at midnight — the bar and the cellar are interiors, check their
`ambientSource` before matching on a listing; ⚠⚠ **the clone gate**: a
row with no live instance is gated by `canAtPath`, a row WITH one is
gated through that instance's ZONE — part H clones nothing, so it does
not meet it; if a later checkpoint needs a clone, one per run.

Commit: `drive(narrowing L6): part H — the cellar describes itself, the bar has a volume, and lock is a word`

### L7 — the measurement, re-run

`pnpm -C packages/server composition-census --json` before L0 (the
*before* is `scratchpad/matrix-loc.json`, this cycle) and after L6,
diffed over the 21 Location classes:

- `VisibleMixin` 20 → 21 classes (the void), rows 143 → 144;
  `PerceptibleMixin` 17 → 21, rows 140 → 144, **authoring 140 → 143**
  (the three rows that were writing into a void); `DetailedMixin`
  19 → 21, rows 142 → 144, authoring +1 (the gallery's `flutes`);
- `Bar` gone (21 → 20 classes; `SingletonCartesianLocation` 94 → 95
  rows); `DormRoom` now lists `ReservedMixin` and `PerceptibleMixin`;
- `CartesianCoordinatesMixin` authorable `[]`; `Location` own authorable
  three;
- ⚠ `Exitable`/`Staged`/`Adornable`/`Container` read **identically
  before and after by construction** (L10) — say so, and cite the row
  keys instead.

Commit: `tools(narrowing L7): the census after — three rooms stopped writing their keywords into a void`

### L8 — the slate

Appended to `docs/slates/builds/base-class-narrowing-slate.md § Deferred,
with destinations`:

- **`staticSlots` is offered on every room and is dead there** (L3):
  `Adornable` is built on `Slotted` and ignores the field; the Pattern C
  surface is half-implemented (`getSlotNames` reads fixtures,
  `getAllOccupants` reads an empty map; `PutController.openSlotFor`
  sees every fixture slot as open). Two fixes, both `slot.md`'s and the
  owner's: a declared `authorable: false` (the tree's first) or the
  Slotted split giving `Adornable` a fixture map of its own.
- **`coords` / `coordinates`** (L4): two storages of one fact on every
  cartesian room, bridged by `setCoords`; the spherical pair authors the
  tuple directly. `location.md:326-331` calls unification out of scope;
  the day a third coordinate system arrives is the day to do it.
- **A spherical venue cannot author `props:`** (L7): `SphericalLocation`
  composes no `Staged`; 0 rows want it; a one-line addition when one
  does.
- **Ten verbs still afforded by nothing** (L9): `fold`/`unfold`
  (`slot.md`), `walk`/`swim`/`fly`/`dismount` (`locomotion.md`) — with
  the coordinator's table.
- **`alternateNames` ×45** — the next dead-key burn-down, as the
  clusters plan filed it; `turf-bank.yaml` is one of them.
- **The structure tier** — already filed; L1 does not touch it.
- **The lounge on plain `Location`** — D14-honest today; if
  `lint:locations`'s *every location plots* rule ever wants the lounge's
  satellites on the roster, the exemption is `WarrenMember`, not a class.

Commit: `slate(narrowing L8): what the Location pass found and did not decide`

---

## Reachability wiring

The five links, each of which fails closed and silent, for every
capability this plan moves:

| link | after L0–L4 | what would break it |
|---|---|---|
| **verb** | `look`, `look <keyword>`, `feel <room>.<detail>`, `trace atmosphere`, `lock`, `unlock` — all pre-existing views; **no new verb** | — |
| **affordance** | `look` is `Perceiver.self` (unchanged); `lock`/`unlock` gain `Mobile.self` (L4) — the ONLY affordance this plan adds; `grub`/`ditch`/`lime`/`plough`/`hew`/`dig` stay on their ground classes' `inventory` bucket | a `self`-only affordance on a Location host (inert — a room is never the giver); L4 put on `environment` (would grant `lock` to the DOOR's containers, not the mover — the `wash` mistake) |
| **data** | `bar.yaml` → `SingletonCartesianLocation`; `void.yaml` two sentences; `dormroom.yaml` on the roster; eight keys renamed (L3) | a row left naming `/world/lounge/location/Bar` fails `lint:instanceable` invariant 3 before boot; a renamed key that matches no field is counted by invariant 12 and the re-pin catches a miss |
| **boot** | `Location.postRegister` chain unchanged — the three added mixins define no hook (verified); `DormRoom` inherits `FurnishableRoom`'s chain, which terminates at the base `PostRegistration` exactly as its own did | a `PostRegistration` composed above the base in any of the nine touched classes swallows the floor (`Location.ts:118-134`) — the W2 roster test guards it |
| **arg gate** | none names a moved mixin (Grounding) — `lock.yaml:21` `LockableMixin` on the Door ✓ | nothing here is caught by a gate; the catches are `lint:instanceable` 12, `lint:locations`, `Location.test.ts`, `LocationTiers.test.ts`, and part H |

⚠ **Which moves have NO gate to catch them**, said plainly: L0 (a class
that lost `Perceptible` in the sed would show only as its rows'
keywords going dead again — the orphan ceiling would RISE, which the
gate's own test forbids; that is the catch), L2's `DormRoom` re-base (a
wrong base compiles; `DormResidence.test` and `lint:locations`'s roster
are the catch), and L4 (an affordance on the wrong bucket parses fine;
H4 is the only thing that sees it).

---

## Acceptance-criteria coverage

The requirements doc's AC1–AC8 stay green (drive parts A–G). This
branch's own, against the owner's ruling and the requirements' AC6/AC8:

| criterion | wave |
|---|---|
| every place can be described and pointed at, and three rows that could not be are now | L0, H1 |
| a place with no way out is still a place (Offstage, the void) — nothing gains `Exitable` | L0 (test), H1's negatives |
| the panel names no Location under `exitable` that has no exits, and every Location under `perceptible` | L5, H1 |
| a cellar and a venue describe themselves; the void has words | L0, L3, H2 |
| Dave's Bar is on the grid its row and docstring claim | L2, H3, `lint:locations` |
| a dorm room is a furnished room | L2 (`DormResidence.test`, roster) |
| `lock` and `unlock` are words the game knows | L4, H4 |
| no doc or docstring cites a deleted class as standing (`Wood.ts`) — AC6 | L2, L5 |
| nothing that worked stopped working — AC8 | parts 0, A–G unchanged; `Offstage.test`, `LocationTiers.test`, the lounge and dorm suites |

---

## Test & gate strategy

**Tests that change, and why each is not a weakening:**

| test | change | why it is not a weakening |
|---|---|---|
| `lib/stuff/__tests__/Location.test.ts:1-7` | header rewritten; three positive `hasMixin` assertions and the `Exitable`/`Staged` negatives added | the header claimed `ContainerMixin(Idea)` — false on both counts for two years; the additions pin the new root and the line |
| any test pinning *"Your surroundings are indistinct"* | becomes *the void renders its authored sentence* | the fallback existed for one class; the class can now say it |
| the seven lounge tests importing `Bar` | build a `SingletonCartesianLocation` at the bar path | the class was empty after L0; the tests exercised the warren's exits and the bar's stock, none of which was the class's |
| `platform/location/__tests__/LocationTiers.test.ts:1-19` | docstring names corrected; assertions added | the assertions (`:56`, `:88-98`) are untouched and still pin the tiers |
| `eternal-university` dorm suites | none expected; `DormRoom` keeps `SCOPE`/`ADDRESS` | if one pins `instanceof`-free composition (e.g. `hasMixin(DormRoom, Mixins.Reserved) === false`), it pinned the missing half of a move nobody made — cite and invert |
| `check-instanceable-placement`'s own test | `ORPHAN_DATA_KEY_CEILING` re-pinned twice | the test asserts the invariant (≤ high-water, ≥ 0), never the number |
| `Offstage.test.ts:69-75` | gains `isPerceptible(room) === true` | addition only; `isExitable === false` stays |

**Tests added:** the L0 assertions above; L4's contribution assertion.
Every class-level assertion uses `MixinApi.hasMixin(Class, Mixins.X)`
(the `Creature.chattel.test.ts` shape) — never the census, which cannot
see four of the mixins on this branch.

**Gates** — the ones a wave can trip, all via `lint:family`:
`lint:instanceable` (invariants 3, 12), `lint:locations`, `lint:presentation`,
`lint:field-meta`, `lint:imports`, `lint:census`, `lint:verb-collisions`,
`lint:lib-statics`, `lint:test-content`.

**`pnpm test` once**, before the MR returns to review; `test:near` and
each touched pack's vitest per wave.

---

## Risks & opens

1. **TypeScript inference on the root** (L0). Nine generic mixin
   factories over `Stuff`; `Location.ts:207-213` says the class already
   sits at the edge. The two named intermediates are the known cure;
   if `tsc` still collapses a member to `never`, split once more
   (`LocationSpace = Adornable(Container(LocationSeen))`) — the shape,
   not the mixins, is the variable.
2. **Composition order relative to the six** (L0). The three added
   mixins own fields and readers only (verified: no `postRegister`,
   `onDestruct`, `canDestruct`, `getPresentation` override); the six own
   no `getDetail`/`getKeywords`/`getMarkupLong`. A shadow registered
   against a mixin NAME resolves the same. Mitigation: `test:near` over
   the nine directories plus parts A–G before L2 starts.
3. **`DormRoom` gaining `Reserved`** (L2): `FireLogic` reads
   `hasReserve('air')` and treats absence as open air
   (`FurnishableRoom.ts:52-57`); no dorm row authors `reserves:`, so
   nothing changes. If a dorm test lights a range in a dorm and expects
   it to smother, that test is wrong about what it authored.
4. **`Bar` on the cardinal rule** (L2): the bar's authored exits are
   `north` (to the office) and the warren-wired `south`; both cardinal,
   accepted unconditionally. A future semantic exit from the bar into
   `/world/lounge` would throw at `postRegister` — which is the rule
   working, and the same rule every other room in the zone lives under.
5. **`trace atmosphere` as H3's instrument**: if it reports a volume
   for a zoneless room, H3's fallback is the exit surviving the
   cardinal rule; read `TraceAtmosphereController` before writing the
   assertion, and do not weaken it to *"the room renders"*.
6. **The moor `_address` values** (L3): if no `Locality` roots `moor/…`,
   the rename is honest and inert; the commit says which.
7. **`LookController` is under `platform/idea/cmd/`** (L0 step 4): a
   controller, not the Idea branch's class tree. If the coordinator's
   fence covers it, the branch stays with a comment and a line in the
   commit; the plan prefers the deletion.
8. **Stop and ask** only for: a D1 grep in L0 that finds a reader
   narrowing `isVisible`/`isPerceptible`/`isDetailed` on a Location to
   DENY something (none expected — every reader found falls through on
   the negative), or `Adornable`'s `authorable: false` if the owner
   wants L3 fixed in this build rather than filed.

---

## Deferred seams

Filed by L8 (above): the `staticSlots` offer and the Pattern C
half-surface; `coords`/`coordinates`; the spherical `Staged` gap; the
ten unafforded verbs by owner; `alternateNames` ×45; the lounge's
warren-placed exemption. None stays in this file after the sweep.

---

## Cross-branch notes for the coordinator

For the Idea planner, none of which is a wave here:

1. **Zones are not on the Location branch** (L5): `Zone extends Idea`
   (`lib/zone/Zone.ts:47`), `CartesianZone` composes only
   `SingletonMixin`. The 58 zone rows in the coordinator's 201 are the
   Idea branch's; `FolderZone` (9), `WikiNamespaceZone` (5), `HomeZone`
   (1) likewise. Nothing to narrow that this plan can see:
   `SpatialZone.ts:33-43` already applied the owner's host test to the
   region fields (*"only a region IN SPACE can stock goods"*) and
   `Zone.elevation` is authored 72/73.
2. `docs/subsystems/zone.md:70-72` draws `CartesianZone`/`SphericalZone`
   in `lib/spatial/`; they live at `platform/idea/location/`. Idea
   planner's doc, Idea planner's fix. (`location.md:14-17` has the same
   error and L5 fixes that half.)
3. `platform/idea/cmd/perception/LookController.ts:155-216` carries a
   non-Visible-Location fallback that L0 makes unreachable; L0 step 4
   retires it and says so, unless the coordinator wants that file left
   to the Idea pass.
4. `platform/idea/cmd/inventory/PutController.ts:357-364`
   (`openSlotFor`) treats a room as a `Slotted` target and reads a
   half-implemented surface (L3). Not a defect a player can reach
   today (the candidate must be an `Adornment`), but the reader is on
   the Idea planner's tree and the fix is `slot.md`'s.
5. `lib/Bistate.ts` composes `Lockable` on `platform/thing/Door` only;
   `lock north` binds the door on an exit (an `Exit` is an Idea). L4
   affords the verb from the mover's side and needs nothing from `Exit`.

---

## Critical files

Read first, in this order:

1. `docs/plans/base-class-narrowing-clusters-plan.md` (D1–D9, D13–D14, § The second pass) · `…-agent-plan.md` (E1, E12, E13, § Blast radius) · this plan
2. `packages/server/src/mud/lib/stuff/Location.ts` (all of it) · `lib/location/CartesianLocation.ts:1-80,238-325` · `lib/location/SingletonCartesianLocation.ts` · `platform/location/{SphericalLocation,Offstage,VoidLocation,FurnishableRoom,Street}.ts` · `platform/location/sandbox/CircleFloor.ts`
3. `packages/server/src/mud/world/lounge/location/{Bar,Lounge}.ts` · `world/lounge/idea/LoungeWarren.ts:180-210` · `packages/content/eternal-university/src/duncan-hall/location/{Corridor,DormRoom}.ts` · `…/idea/DormWarren.ts:50-60,255-270`
4. `packages/server/src/mud/lib/description/{Visible,Detailed,Perceptible}.ts` (fieldMeta, statics, no hooks) · `lib/boundary/Adornable.ts:1-60,130-170,336-380` · `lib/slot/Slotted.ts:1-30,247-260` · `lib/location/CartesianCoordinates.ts`
5. `packages/server/src/mud/platform/idea/cmd/perception/LookController.ts:150-220` · `lib/spatial/Mobile.ts:220-245` · `api/command.ts:300-335` · `packages/content/platform/content/platform/cmd/boundary/{lock,unlock}.yaml`
6. the rows: `platform/location/{void,venue}.yaml` · `sandbox/CircleFloor.yaml` · `saxonberg-lounge/…/location/bar.yaml` · `trade-hospitality/…/location/cellar.yaml` · `eternal-university/…/location/{corridor,dormroom}.yaml` · `rejection/…/hush/gallery.yaml` · `world-seed/…/moor/*.yaml` · `terminus/…/university-avenue/thing/campus-gate-door.yaml`
7. `packages/server/scripts/check-instanceable-placement.ts:13-56,270-280` · `scripts/check-location-classes.ts:1-110,200-230,390-430` · `scripts/check-presentation.ts:236-262` · `scripts/check-composition-census.ts:1-140`
8. `packages/server/src/mud/lib/stuff/__tests__/Location.test.ts` · `platform/location/__tests__/LocationTiers.test.ts` · `lib/employment/__tests__/Offstage.test.ts:55-80`
9. `packages/wire/tests/base-class-narrowing.dirty.wire.test.ts:1-235,979-1060`
10. `docs/subsystems/location.md:25-115,155-235,326-331,381-408` · `architecture.md:826-850,1020-1026,1127` · `slot.md:60-80` · `furnishing.md` · `residence.md:40-95`
11. `docs/slates/builds/base-class-narrowing-slate.md § Deferred, with destinations`

---

## Drive record

*(appended at build time)*
