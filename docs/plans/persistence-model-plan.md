# Persistence model — implementation plan

Executes [persistence-model-requirements](../requirements/persistence-model-requirements.md)
(AGREED 2026-11-23, revised at plan review, `eb036ffab`) under the slate's
[§ 0 plan-review rulings](../slates/engine/persistence-model-slate.md).
**Kind:** refactor/sweep with behavior changes. **Lead end:** the kernel.
First consumers: the test scaffold's venue (a locker, a consignment shelf),
the dorm and letting buildings, ships, kept animals, the water commons'
history, a business's cap table, and every business that names `offstage:`.

**Revision 3 (2026-11-23)** applies the owner's rulings on revision 2: the
lounge regulars' windows hold exactly (D15), a sellable building is authored
with kept rooms (D4), a reservoir's level and the ice sheet's patch log are
things, ledgers follow the nightly reset as the records they replace did,
and `lint:instanceable` holds "only containers and bodies keep".

**Revision 2 (2026-11-23).** Revision 1 put a `keeps:` field on every
container and built the staged lifecycle. Both are gone. What keeps is a
container's CLASS; the staged lifecycle (policies, restage on unload, the
multi-place stage, prevent, staff clearing strays) is the staging slate's;
unloading stays in `observe`. This revision adds the four kinds: things ride
their container, history moves to ledgers in this build, bodies keep
themselves, the derived is never kept.

Constraints that bind every wave: no migrations (dev databases are dropped);
no new Mongo collection; no new `isWizard` check; no new module category, no
exported free helper, no new `eslint-disable`; the Api↔Logic split kept;
verbs on objects; refuse/skip/throw, never silent; `MixinApi.isX`, never a
structural cast; load on use, never a boot entry; game clock only; American
English; one view one word; never `pnpm dev:server`; stage files by name.
Dave's Bar and the lounge behave as today: the bar's occupancy over a day
is unchanged (D15).

## Grounding

Roots: `K` = `packages/server/src/mud`, `P` = `packages/content`.

### Opened and read

**The spine.**
- `K/lib/persistence/Persistable.ts` — `PersistableMixin`: key + explicit
  flag (`:234-289`), `shouldPersist()` = `!_reverting` (`:263-265`),
  `capturesAtShutdown()` false with no key (`:279-289`),
  `dependentPersistables()` (`:343-345`), `seedBornWith` (`:389-399`),
  `reseedCast` (`:406-426`), the destruct backstop (`:456-467`). Composes
  outermost.
- `K/api/stuff.ts:891-932` — `StuffApi.singleton` is the keyless
  establishing context (restore, else seed and first capture). A
  non-singleton prop is a plain `StuffApi.clone`
  (`K/lib/stuff/Template.ts:617-618`): no key, so it never captures at
  shutdown and never restores. That is the consignment shelf's gap.
- `K/lib/stuff/Template.ts:523-702` — `_stageEntries`: `as` is a list key
  (`:543-555`, `:699-700`); the singleton branch (`:612-616`).
- `K/lib/spatial/Container.ts` — `captureSlice` (`:751-813`) skips
  interactive bodies, `Behaved` NPCs and owner-persisted chattel
  (`ctx.noteOwnedGood`); `canEvict` (`:716-732`); destruct-as-dormancy
  (`:869-873`). `fitRefusal` (`:427-475`) runs the volume sum only when a
  side is closed (`:463-472`); `closedSidesOf` (`:1203-1216`); `fillOf`
  (`:1263-1268`).
- `K/platform/idea/api/PersistableLogic.ts` — `captureItem` (`:814-837`): a
  nested `Persistable` is emitted `{ ref, key? }`, anything else nests its
  state; `captureImpl` → `prepareCapture` → `serialRecordWrite`
  (`:1300-1417`); the shutdown sweep writes chunks of 25 and counts
  failures with `console.error` (`:795-800`).
- `packages/server/src/backend/PersistenceManager.ts:807-838` — `saveMany`
  is one `bulkWrite({ ordered: false })`; any throw is logged and rethrown,
  so one refused record fails its chunk.
- `P/platform/content/settings/residency.yaml:5-6` —
  `residency.eviction.mode: observe`. It stays.

**The estate and what feeds it.**
- `K/lib/chattel/Estate.ts:230-304` — one slice holds `entries`,
  `escheatedAt`, `beneficiary`. Only `Avatar` composes it
  (`K/lib/character/Avatar.ts:174-182`). `PlayerLogic` reads and writes the
  two succession fields through its getters and setters
  (`K/platform/idea/api/PlayerLogic.ts:339-468`).
  `avatar-family.wire.test.ts:270-294` proves only that the beneficiary
  write is accepted.
- `K/platform/idea/api/ChattelLogic.ts` — `followCustodyOnce` (`:241-284`)
  derives a fresh good's title and writes `place`; `applyPlace`
  (`:385-405`); `pinOf` (`:414-426`); `evictToStorage` (`:459-481`, one
  caller: `P/residence/src/lib/LettingWarren.ts:241`); `pinned`
  (`:485-496`); `syncEstate` (`:519-541`).
- `isOwnerPersisted`: 15 sites in 8 files. `captureDetached`,
  `restoreDetached` and the overlay functions: 27 sites in 6 files.
- The promoted tier has one promoter, `K/lib/husbandry/Bonded.ts:664-707`
  (`takeName`). `hasChosen` (`:709-718`).
  `K/lib/creature/KeptAnimal.ts:115-137` pins residency.
  `ResidencyLogic.pinNow` (`:832-861`) reads `ChattelApi.pinned()`.

**Custody and lease end.**
- `K/lib/retail/HeldGoods.ts` — `HeldGoodsMixin`: `accepts` hook (default
  accepts anything, `:193`); `checkIn(item, by)` stamps an untitled good to
  `by`, moves it in, hands `by` a ticket (`:197-217`).
  `P/trade-hospitality/src/thing/CheckRack.ts` =
  `PersistableMixin(HeldGoodsMixin(FixtureMixin(Holder)))` + a weapons-only
  `accepts`. View `P/platform/content/platform/cmd/retail/rack.yaml`.
- `LettingWarren.endLet` (`:218-250`); the dorm's verb is `unprovision
  <tenant>`.
- `K/platform/idea/ShipWarren.ts:188-240` — `stow`. Untouched by this plan.

**Ledgers.**
- `K/lib/document/Registrar.ts:52-77` — a register declares prefix, owner
  and one kind; `DocumentApi.saveToRegister` (`K/api/document.ts:258-265`)
  is its gated write ("you file; you do not hold the pen"). The harbor's
  berth book is the precedent for a system filing its own record
  (`P/transport/src/idea/Harbor.ts:192-205`, kind `harbor-book`).
- `DocumentApi.saveAsBusiness` (`K/api/document.ts:296-322`) writes a
  document owned by a Business under its own branch; its kinds are a closed
  list in `DocumentLogic.ts` (`BUSINESS_DOCUMENT_KINDS`, `:228-293`).
- ⚠ Kinds are still a kernel table (`K/lib/document/DocumentKinds.ts`;
  `document-store.md § The closed kind vocabulary`). The owner's
  free-text-kinds ruling is not built. This plan adds entries to the table.
- The history fields today: `Aquifer.drawnM3`, `aquiferStamp`
  (`P/water/src/idea/Aquifer.ts:44-45`); `Gate.turnStamp`, the opening
  curve and a `workLog` capped at 24 (`P/water/src/thing/Gate.ts:95`,
  `:188-214`); `Conduit.deliveryLog` (`Conduit.ts:152`, `:452-462`);
  `StorageNode.levelM3`, `levelStamp` (`StorageNode.ts:95`, `:102`);
  `ReachWarren.stops` (`ReachWarren.ts:131`); `CapTableMixin.capTable`
  (`K/lib/employment/CapTable.ts:168-236`); `HullBook.sold`
  (`P/transport/src/thing/HullBook.ts:86-94`).

**Employment.**
- `K/platform/idea/api/EmploymentLogic.ts:1016-1040` — off shift: teleport
  to `business.getOffstage()`; no `offstage` moves nobody.
- `K/lib/behavior/frequents.ts` and `BrainMoves.ts:102-118` (`stage`).
  The lounge's four regulars author `frequents` with `place: …/bar`,
  windows of two or three hours on some evenings, and `home:
  /world/lounge/location/offstage`
  (`P/saxonberg-lounge/content/world/lounge/agent/mara.yaml:51-59`). So
  today a regular is in the bar only inside a window.
- Eleven Business rows author `offstage:`; nine rows are `class:
  /platform/location/Offstage`; the ice company's points at a real shed.

**Legibility and tooling.**
- `packages/types/src/index.ts:1560` — `PlaceSection.staged?: boolean`,
  unfilled, no client reader. `K/lib/description/Perceiver.ts:504-556`.
- `K/lib/shell/Environment.ts:144-170` — per-character settings.
- `K/api/test-harness.ts` — `stage(path, method, args)`,
  `failDatastore(calls)` (whole calls), `advanceClock`, `stageShip`.
- `P/test-fixtures/` — the hall and shop are plain `Hall` rows; the shop has
  a `Stock` counter and a `ConsignmentShelf`. `WIRE_CONTENT_CEILING = 113`.
  `zone-instancing.dirty.wire.test.ts` already stands in Duncan Hall and
  aboard a minted ship and restarts.

### Carried from the survey — re-open before relying

`PersistenceSlice.ts:154-246`; the overlay bodies
(`PersistableLogic.ts:1466-1616`); `patchStoredEstate`; the `homes` brain
and the trail; the client `PlaceBody`
(`packages/client/src/components/nav/sections.tsx:246-292`); the count "31
of ~46 shelves in plain rooms".

### The four kinds — every `PersistableMixin` composer

42 files compose it. Container = composes `ContainerMixin` (checked per
class).

| class | kind | where its state goes |
|---|---|---|
| `PersistentHall`, `PersistentLocale`, `PersistentShore`, `PersistentLocation` (+ `PersistentRoom`, `DormRoom`), `Hold` | kept container (place) | its own record — unchanged |
| `MineRoom`, `Tract`, `Wood`, `OpenWorking`, `Turbary`, `Band`, `ReachStop`, `SeaStop` | kept container (place) | its own record — unchanged |
| `FloorplanWarren` (→ `HoldingWarren`, `ShipWarren`, `MineWarren`) | kept container (the holding) | its own record — unchanged; gains its buildings' state (below) |
| `Stock`, `ConsignmentShelf`, `CheckRack`, `Stockpile` | kept container (thing) | its own record; as a prop in a plain place it is keyed by its part name (D2) |
| `PermanentBed`, `Panel`, `HouseTray` | kept container (thing): `GardenBed` and `RearingTray` compose `Container` | its own record — unchanged. They are the kept twins of the bed and the tray |
| `TpaTerminal` | kept container (thing): a `Holder` with slots; a singleton fixture | its own record — unchanged. Its charge and cell are stuff; it has no history field |
| `Avatar`, `KeptAnimal`, `DraftAnimal`, `Ship` | body | itself. `KeptAnimal` is re-keyed on the bond (D8) |
| `Plant` | thing | nests in its bed's or pot's record; no record of its own |
| `PersistentWell` (a `Well` is a container, but the ruling retires it) | thing | nests in the ground it was dug on; class retired, rows → `Well` |
| `PersistentWaterStore` (`Bulkable`, not a container) | thing | nests in its place's record; class retired, rows → `WaterStore` |
| `Wellhead` (`Bulkable` `Good` at a ground point) | thing | nests in the place it stands on; `PersistableMixin` removed |
| `Field` (a soil `Thing` adorned to its tract) | thing | nests in its `Tract`'s record (it is the tract's dependent today); `PersistableMixin` removed (owner: it rides its tract) |
| `Building`, `HoldingBuilding` | thing (a structure's coat and condition) | `HoldingBuilding` → a slice of its `HoldingWarren`'s record. `Building` → a slice of its first kept room's record (D4); `PersistableMixin` removed from both |
| `PersistentConduit` | thing + history | `cut`, `headM` nest in its place; `deliveryLog` → the water ledger; class retired, rows → `Conduit` |
| `PersistentGate` | thing + history | lock and seal nest in its place; the opening curve, `workLog`, `turnStamp` → the water ledger; class retired, rows → `Gate` |
| `PersistentAquifer` | history (an Idea, in no container) | `drawnM3`, `aquiferStamp` → the water ledger; class retired, rows → `Aquifer` |
| `StorageNode` | thing (owner): a reservoir's level is water standing somewhere | `levelM3`, `levelStamp` nest in its place's record; `PersistableMixin` removed |
| `ReachWarren` | history/index (`stops`) | → the water ledger; `PersistableMixin` removed if nothing else needs it (its stops are kept places that capture themselves) |
| `ColumnWarren` | none (holds no record of its own) | `PersistableMixin` removed; its bands capture themselves |
| `PersistentBusiness` | history (the cap table) | → a `cap-table` document filed by the business; class renamed `Company`, no `PersistableMixin` |
| `HullBook` | history (`sold`) | → a `hull-sale` document filed by the selling house, unless it derives from the ship register — D7 |
| `IceSheet` | thing + derived (owner) | the patch `log` (cut, scraped, fallen through) nests in the pond's place; thickness is derived and never kept; `PersistableMixin` removed |

After the build, a `PersistableMixin` composer is a container or a body,
and `lint:instanceable` holds it there (N19).

## ⭐⭐ New substrate

| # | item | kind | ledger row / why new |
|---|---|---|---|
| N1 | `Container.isKept()`; `Creature` override | method | *the kept marker*, *a container that keeps*. No field: it reads the class and walks the chain |
| N2 | the part-name key in `Template._stageEntries` | 10 lines in a shipped walk | *part identity* — shrunk to a key derived at staging time. No stamp, no mixin, no registry |
| N3 | `K/platform/thing/Locker.ts` = `PersistableMixin(HeldGoodsMixin(FixtureMixin(Holder)))`; `CheckRack` re-bases onto it | class | *a rented locker / coat-check*. A kept container class, by the owner's twin list |
| N4 | `P/water/src/idea/WaterLedger.ts`: a `Registrar` singleton filing one document per subject; document kind `water-ledger`; an `onReset: 'wipe'` key on a kind entry, read by `ResetPolicy` | class (pack Idea) + kind + one kind key | *history → ledger*. Genuinely new class; searched `WaterRightRegistry` (rights, a different kind — a register writes one kind) and `Harbor`'s book (the shape copied) |
| N5 | document kinds `cap-table` and `hull-sale` on the business-paper transport | 2 kind entries | *a business's books*. Reuses `DocumentApi.saveAsBusiness` |
| N6 | `K/platform/idea/Company.ts` (renames `PersistentBusiness`): `CapTableMixin(BusinessEntity)` | class rename | the old name would lie once it holds no record |
| N7 | `FloorplanWarren` `structures` slice; a `structure` slice on a kept room that is its building's first | slices on shipped classes | *a sold building's condition rides its holding*; owner ruling on sellable buildings |
| N8 | `PersistedRecord.pinned` + partial index; `PersistableApi.pinned()` | field + Api static | *a kept animal*; replaces `ChattelApi.pinned()` and `chattel.pin` |
| N9 | `Bonded.isKept()`, `Bonded.keepSelf()` | methods | *a kept animal* — re-keyed on the bond |
| N10 | save-failure report in `PersistableLogic`; `DiagnosticApi` channel `persistence` | function in a logic singleton | *a failed save* |
| N11 | `Avatar.teachOnce(key, line)`; setting `hints.kept` | method + setting | *a once-per-character line* — genuinely new (searched `hint`, `tutorial`, `once` under `lib/shell`, `lib/command`, `api/shell.ts`) |
| N12 | `PlaceSection.kept` (renames the unfilled `staged`); `Container.keepWords()` | wire field + method | *the kept marker* |
| N13 | `Dimensions.footprintWithin()`; the ground-area branch in `fitRefusal` | value-object method | slate § 6.2 |
| N14 | `Business.offShift: out` (replaces `offstage: <path>`); `EmployedMixin.calledTo(nowS)`, `enterNarrative(place)`, `leaveNarrative()`; `BrainStatics.callsAt(config, nowS)` (a pure schedule read, implemented by `frequents`) | field + 3 methods + one brain static | *shift → home*: the teleport retires. One entrance for a shift and a visit |
| N15 | `LettingWarren.boxGoods()`; `storeroom:` on the letting programme row; `HeldGoods.checkIn` `{ ticket }` | method + field + option | *lease end* — re-pointed |
| N16 | `packages/server/scripts/record-sizes.ts` (`records:sizes`) | operator script | *measuring record sizes* — genuinely new |
| N17 | `TestHarnessApi.failSavesOf`, `.captureBatch`; `testharness save`, `save-fail` | TestOnly statics + subcommands | tools the drive owes |
| N18 | test-fixtures rows: a locker, a clerk with a shift, a cat | content | requirements § Placement |
| N19 | `lint:instanceable` invariant: a class composing `PersistableMixin` composes `ContainerMixin` or is on the body roster (`Avatar`, `KeptAnimal`, `DraftAnimal`, `Ship`) | one invariant in a shipped gate | owner ruling |

**Retired:** the estate's goods half (`EstateEntry`, the entries map and
slice), `syncEstate`, `flushSkippedOwnedGoods`, `patchStoredEstate`,
`overlayOwnedGoods`, `putBackWithin`, `storedEstateEntry`,
`captureDetached`, `restoreDetached`, `noteOwnedGood`, `isOwnerPersisted`,
the chattel `place` field with `setPlace` / `evictToStorage` / `placedIn` /
`placedUnder` / `pinned` / `pinOf` and both indexes; the promoted tier in
`Bonded.takeName`; `MarketStalls`'s keyless-restore workaround;
`PersistentAquifer`, `PersistentGate`, `PersistentConduit`,
`PersistentWell`, `PersistentWaterStore`; `PersistableMixin` on `Plant`,
`Wellhead`, `Field`, `Building`, `HoldingBuilding`, `StorageNode`,
`IceSheet`, `HullBook`, `ReachWarren`, `ColumnWarren`; `isTitleSold()` as a
persistence gate (`Building.shouldPersist`, `persistsCoats`); `OffstageMixin`,
`platform/location/Offstage`, `Mixins.Offstage`, `MixinApi.isOffstage`,
`Business.getOffstage`, `BrainMoves.stage`, nine `Offstage` rows.

**Unchanged, by ruling:** every place twin; `StagedMixin`, its once-flags,
`seedBornWith`, `reseedCast`; the reset sweep, `Stock`, `ToolRack`;
`ShipWarren.stow` / `fitOut` / `shortOf`; the eviction sweep and its mode.

**Slate ledger rows now out of scope** (→ staging slate): a part recalled
or re-minted, restaging a place, unload as restage, a stage's staff tidying
strays, cast duplication for Extras.

### P9–P14, per item

| # | P9 predictable | P10 a Document | P11 no destination branching | P12 no synonym | P13 fits its host | P14 nothing invisible |
|---|---|---|---|---|---|---|
| N1 | `look` and the card say it | n/a | asks the container, never names a class | the one read | Container: "holds things" | a read |
| N2 | n/a | n/a | n/a | uses `restoreOrSeed` as shipped | the staging walk is the prop's establishing context | a key, nothing moves |
| N3 | `rack check` / `rack reclaim`; help loses "weapon" where the fixture takes anything | n/a | controllers bind `HeldGoodsMixin` as today | `CheckRack` re-bases; one custody class | a `Holder` that holds for named people | goods move only on check, reclaim, or the landlord's boxing, each told |
| N4 | n/a | yes: the history IS documents; the class is the registrar, "a pointer, not a database" | n/a | one `file` and one `read` | lives with the water pack | written on the act that makes history |
| N5 | `title transfer … shares` unchanged | yes | n/a | reuses `saveAsBusiness` | the business files its own paper | n/a |
| N6 | n/a | n/a | n/a | a rename, old name gone | named for what it is | n/a |
| N7 | n/a | n/a | n/a | replaces a dependent record | the holding keeps what stands on it | n/a |
| N8 | n/a | n/a | n/a | replaces `ChattelApi.pinned` | the record says "stand me up at boot" | the boot roll, as today |
| N9 | n/a | n/a | n/a | n/a | Bonded: "the bond, the home" | the animal's own act starts its record |
| N10 | plain words to the player; `errors` lists it | n/a | n/a | n/a | the spine owns its writes | once per failing streak |
| N11 | prose, not a command effect | a setting | n/a | n/a | Avatar is who is taught | at most twice |
| N12 | the chip and the `look` tag | n/a | n/a | renames `staged` | "the place you stand in" | a read |
| N13 | reuses `no-room` and its row | n/a | inside `fitRefusal` | n/a | `Dimensions` owns geometry | refuses at `put` / `drop` |
| N14 | n/a | n/a | the tick asks the hand where it is called; it never branches on shift vs visit | one entrance (`enterNarrative`) for both; `moveForShift`'s placement body moves into it | Business says whether hands leave; the hand owns coming and going; a brain only declares its hours | a hand enters and leaves through the place's door with the shipped arrival and departure lines |
| N15 | `unprovision` help gains a sentence; `rack reclaim` returns the goods | n/a | `checkIn` called plainly | reuses `checkIn` | LettingWarren owns end-let | the tenant is told what was boxed and what did not fit |
| N16 | not in game | n/a | n/a | n/a | scripts | read-only |
| N17 | `testharness` help lists both; test world only | n/a | n/a | n/a | TestHarnessApi | acts when called |
| N18 | n/a | rows | n/a | n/a | n/a | n/a |
| N19 | n/a | n/a | n/a | n/a | the gate that already owns "what may be instanced how" | n/a |

## Plan-level decisions

**D1 — Kept is a container's class; the read walks the chain.** A
container keeps when its class composes `PersistableMixin` and it has an
established record. `Container.isKept()`: *record-capable, `shouldPersist()`
and a persistence key* → true; else its container's `isKept()`; a place with
neither → false. `Creature` overrides: a body is kept iff it is
record-capable and `shouldPersist()` (an Avatar that is not a guest, a kept
animal, a draft animal), and never by standing in a kept room — cast is
skipped by `captureSlice` today. No field, no lint, no new composition. The
teaching the owner wants is the shipped one: the classes that compose
`PersistableMixin` are exactly the ones that keep.

**D2 — A kept container standing as a prop is keyed by its part name.**
In `_stageEntries`, an entry whose class composes `PersistableMixin` and
`ContainerMixin` and is not a singleton is established with
`PersistableApi.restoreOrSeed(inst, "<host handle>/<part name>")` in place
of the bare clone. Host handle: `host.getDurableHandle()`, else its template
path. Part name: the entry's `as`; else its template path; a repeat of one
path takes `~2`, `~3`; `count: N` appends `#1…#N`. Both halves are authored,
so the key survives a restart; two shelves of one row in two shops are two
records. Nothing is stamped on the instance and nothing is indexed: the key
is derived where the prop is minted. In a kept host the same key rides the
host's `{ ref, key }` entry, which `captureItem` already writes for an
explicit key. `MarketStalls`'s workaround goes. Singleton props keep their
shipped path through `StuffApi.singleton`.

**D3 — Things ride their container.** Each class in the table's *thing*
rows drops `PersistableMixin`; its state is then nested by `captureItem`
(contents), the `Slotted` slice (a plant in a bed's slot) or the `Adornable`
slice (a field on its tract), each of which nests anything that is not a
host. Sites that took a `{ ref }` path for these (`Bonded.ts`, `Soil.ts`,
`Panel.ts`, `Standard.ts`, `SoilReading.ts`, `Store.ts`, the residency
sweep) are audited in the wave that converts each class. Consequence, and
intended: a plant in a plain bed in a staged park restages; the same row in
a `PermanentBed` or on a kept tract is as left.

**D4 — A building rides what it stands on.** `HoldingWarren` stops
listing its `HoldingBuilding`s as dependents; `FloorplanWarren` captures each
standing building's state under its extent in a `structures` slice and hands
it back at the wake that stands the building up. The kernel `Building` (an
authored singleton) loses `PersistableMixin` and its `isTitleSold()` gate:
its coat and condition ride the record of **its first kept room** — the
`entrance` if that room is a kept container, else the first room under its
extent that is — as a `structure` slice that room contributes (through the
mixin by which a place already resolves its structure for exposure;
`construction.md`). A building with no kept room is staged and comes back as
authored. **A building that can be sold is authored with kept rooms**
(owner): the seller is the keeper before the sale and the buyer after, so
nothing changes at the sale. The twelve kernel `Building` rows, by their
rooms today:

| building | rooms | change |
|---|---|---|
| `wharfside/cottage` | 1 `Hall` | sellable dwelling → `PersistentHall` |
| `hollow-mere/small-house` | 1 `Hall` | sellable dwelling → `PersistentHall` |
| `mayfield-row/seznick-house` | lobby `Hall`, a `Room`, 3 `PersistentRoom` unit rows minted per let | its units sell/let → the lobby (its `entrance`) → `PersistentHall`, so the coat has a room that always stands |
| `wharfside/chandlery` | 1 `PersistentHall` | none; rides it |
| `goods-yards/sugar-house` | 1 `Hall` (the entrance), 2 `PersistentHall` | none; rides the first kept one |
| `waponi-woo/boiling-house` | 2 `PersistentHall` | none |
| `hollow-mere/icehouse` | 2 `Hall` | a house's premises, not for sale: stays staged |
| `hollow-mere/shed` | 1 `Hall` | stays staged |
| `terminus/terminal` | 6 `Hall` | stays staged |
| `goods-yards/rubber-works` | 5 `Hall`, 1 `Locale` | stays staged |
| `terminus/gannet-rock` | 4 `Locale` | stays staged |
| `testbed/building` | 3 `Hall` | stays staged (the scaffold must restage) |

The three switches are the dwellings and the letting house; the build
confirms the list against what the realm actually offers for sale (the
title book's listings) and switches any other offered building the same
way.

**D5 — The water commons' history is the water ledger.** `WaterLedger`
(`/system/water/idea/WaterLedger`, a `Registrar` singleton: owner
`/system/water`, prefix `/system/water/ledger`, kind `water-ledger`) holds
one document per subject at `<prefix><subject's durable handle>`. Two
methods: `file(subject, data)` and `read(subject)`. A subject (an aquifer, a
gate, a conduit, the reach warren) reads its entry once when
it is created and files after every act that changes its history. Writes are
single-flight per subject, latest state wins (the `serialRecordWrite`
idiom), so a burst of draws is one upsert. The document carries what the
record carried — the running total and stamp, the opening curve and work
log, the delivery log, the stops — so the integrals read exactly
the numbers they read today. **Every** gate, conduit and aquifer files, not
only the rows that named a `Persistent*` twin: history is never staged, and
a second ledgered gate needs no code. A draw is on the ledger when it
happens, where today it waited for a shutdown capture. **The nightly
reset treats a ledger as it treated the record it replaces:**
`holder_snapshots` is `reset: wipe`, while a declared document kind is kept,
so a kind entry gains `onReset: 'wipe'` and `ResetPolicy` honors it;
`water-ledger`, `cap-table` and `hull-sale` set it; `schema/documents.yaml`
says so; `pnpm gen:schema`.

**D6 — A business's cap table is a paper it files.** `cap-table` joins the
business-paper kinds. `CapTableMixin` reads its table from
`<the business's branch>/cap-table` on first use (a minted company:
`…/cap-table/<serial>`) and files after every sale, gift or transfer; the
authored `capTable:` is the table until a paper exists. `PersistentBusiness`
becomes `Company` with no record; `Ship.dependentPersistables` stops listing
her company.

**D7 — The hull book's sales.** A hull slot sold is history. First ask
whether it derives: if a ship on the register carries the book's slot or
serial, `sold` is a read of the register and the field goes. If it does not,
the book files a `hull-sale` paper through its selling house. Either way
`HullBook` loses `PersistableMixin`. The build decides by reading
`HullBook.ts:86-160` and the ship document's fields, and records which.

**D8 — A kept animal's record starts when it first chooses somebody.**
`Bonded.isKept()` = it has ever followed a bonded person or earned a home
(`followedKeys.length > 0 || homeEarnedDay >= 0`; derived). `keepSelf()`
runs at that transition (`rememberFollowed`, and where `homeEarnedDay` is
set): mint the explicit key and capture. `KeptAnimal.shouldPersist()` →
`isKept()`. `takeName` keeps the name, the title stamp and the witnesses and
loses the key and place lines. The pin moves to the record: capture writes
`pinned: true` when `pinsResidency()` and the key is explicit; `pinNow`
reads `PersistableApi.pinned()` and calls the shipped `standUpKeyed`. A
kept animal captures when it changes place (`onMoved`, fire-and-forget
through D10's reporting path) — the write `applyPlace` made before.

**D9 — The estate's goods half retires; succession stays on a slimmed
`EstateMixin`.** `lib/chattel/Estate.ts` keeps `escheatedAt` and
`beneficiary` as declared persistent fields with their getters and setters,
so `PlayerLogic`, `WalletBeneficiaryController` and `avatar-family` step 8
are untouched. `Container.captureSlice`, `Adornable`, `Slotted` and
`Containable` lose their owner-persisted branches: an Avatar record is its
carried tree, and a kept container's record is everything in it, whoever
holds title. `followCustody` survives as title derivation only.
`chattel.place`, `chattel.pin` and their indexes leave the schema doc;
`pnpm gen:schema`.

**D10 — A failed save is reported where it is written.** In
`PersistableLogic`: one batch writer for the shutdown sweep and the harness
batch — on a throw it re-writes that chunk one record at a time, so only the
refused record fails; `reportSaveFailure`: `DiagnosticApi.record({ path:
scope, severity: 'error', channel: 'persistence', … })` and, on the first
failure of a streak, one line to whoever it concerns (the host when it is a
connected body, else each connected body standing in the kept place);
`captureImpl` reports, then rethrows. `Avatar.retireSignedOutBody` destructs
after a reported failure — the last good record stands, the body never
stays. The residency sweep still declines to cull a kept place whose capture
failed. No size check: physics bounds a record.

**D11 — Lease end boxes into a `Locker`.** The letting programme row names
`storeroom:`, the template path of a `Locker` row standing in the letting
office; its inside is the business's kept storeroom.
`LettingWarren.boxGoods(unit, tenant)`, called by `endLet` in place of
`evictToStorage`: wake the unit; the tenant's goods are what stands in its
rooms that the room's own `props:` did not lay down (a room row's listed
templates and their born-with contents are the shell; everything else,
including what lies inside the shell's containers, is the tenant's); for
each good that passes `locker.fitRefusal`, `locker.checkIn(good, tenant, {
ticket: false })`. A good that does not fit stays and is lost with the
unit; the tenant is told which and a diagnostic records it. The former
tenant uses the shipped `rack reclaim <thing>` at the office. The locker is
free custody.

**D12 — The teaching line.** In `ChattelLogic.followCustodyOnce`, after
title: when the stamped owner is the acting person, is a connected Avatar,
and the good has come to rest off any body in a container whose `isKept()`
is false, `owner.teachOnce('kept', line)`. `Avatar.teachOnce` reads the
setting `hints.kept` (the game days it was shown, at most two) and speaks
only when it is empty or holds one earlier day. A second cup the same day
says nothing; the line returns once on a later day, then never.

**D13 — The marker.** `PlaceSection.kept` = `place.isKept()`. The card
shows a *kept* / *not kept* chip with a client-source tooltip. `look` at a
place carries the two words as a tag on its title line; `look <container>`
says whether its inside is kept (the chain read, so a chest in your room
reads kept). A body shows nothing.

**D14 — Ground takes ground; bodies do not.** In `fitRefusal`, a place
that closes no side runs the capacity test on area: the sum of
`footprintWithin(interior)` over what lies there, **agents excluded**, plus
the arrival's, against `ext²` → `no-room`. An arriving body is never
refused by it. It applies to every open place (a keeping guard in
`fitRefusal` would make physics depend on persistence); a footprint is
clipped to the ground, so one oversized thing still lies in an empty field.

**D15 — Out of the narrative is null; a hand comes and goes by its own
act, on a schedule.** `moveForShift` is deleted. Three methods on
`EmployedMixin` replace it:
- `calledTo(nowS): string | null` — where this hand is called now: on
  shift, its station (the seat's `station`, else the house's first operating
  location that is a place — the shipped rule); else the first place one of
  its own behaviors declares through `BrainStatics.callsAt(config, nowS)`, a
  pure read of that brain's hours (`frequents`: the `place` while a `visits`
  window is open); else `null`.
- `enterNarrative(place)` — arrive at `place` from wherever it is,
  including from no environment, with the shipped arrival line. This is the
  body of today's on-shift branch, moved onto the hand.
- `leaveNarrative()` — `ContainmentApi.move(self, null)` with the shipped
  departure line.

The roster tick (hourly, shipped) asks each hand `calledTo(now)` and, when
it answers a place the hand is not in, calls `enterNarrative`. **A shift
starting and a visit window opening are the same act through the same
call**; no brain runs in null (one check at the beat), and reading a
brain's declared hours is not running it. At a shift's end a hand whose
house says `offShift: out` and who is called nowhere calls
`leaveNarrative()`; a hand of any other house does nothing, as today.
`frequents`, at a window's end with no `home` authored, goes back to where
it set out from — and when it set out from nowhere, that is
`leaveNarrative()`. Content:
- nine houses with an `Offstage` room: `offstage:` → `offShift: out`, the
  room row deleted;
- the lounge: `offstage:` → `offShift: out`, its `Offstage` row deleted;
  each regular's `home: /world/lounge/location/offstage` line deleted (a
  visit now ends by leaving the narrative, which is what that line meant).
  A regular is at the rail on shift, on a stool in their windows, and out of
  the narrative otherwise: the bar's occupancy over the day is today's;
- the ice company: `offstage:` deleted and no `offShift`; its hands gain a
  `frequents` spec for the shed (every day, every hour), which already
  walks and already stands down on shift. The shed row is untouched;
- every house that never named `offstage`: nothing changes.

**D16 — The size reading is a script.** `records:sizes` reads
`holder_snapshots` with `$bsonSize`: scope, key, bytes, direct content
count, and with `--entries` each direct content's template path. No field
values. `--scopes` lists distinct scope prefixes, which is how the drive
shows no plant, gate or well has a record.

**D17 — Wave order.** The keyed part and the locker first (they make kept
insides work in plain places); then things ride, then ledgers; the estate
retires only after lease end has somewhere to put goods. Every wave lands
alone.

## ⭐⭐ Host placement

| new member | host | what it claims of the host's other composers | do they mean it? |
|---|---|---|---|
| `isKept()`, `keepWords()` | `ContainerMixin` | every container can say whether what is in it is kept | yes: each answers truthfully by its class or its chain. It is a read, not a capability |
| the body override | `lib/creature/Creature` | a body is kept iff it has a record | yes |
| part-name key | `Template._stageEntries` | — (a walk, not a host) | — |
| `structures` slice | `FloorplanWarren` | every plan-warren may hold buildings | a holding and a mine: a holding yes; a ship and a mine author no `buildings:` and write an empty slice. Accepted: `buildings` is already a field of this class |
| `file` / `read` | `WaterLedger` | — (one class) | — |
| the ledger read at create | `Aquifer`, `Gate`, `Conduit`, `ReachWarren` | every one has history | yes, by D5 |
| cap-table paper | `CapTableMixin` | every cap-table holder files it | yes: one composer (`Company`) |
| `pinned` | `PersistedRecord` | any record may ask to be stood up at boot | few; a sparse field with a partial index |
| `isKept`, `keepSelf` | `BondedMixin` | every bonded animal can become kept | yes |
| `teachOnce`, `hints.kept` | `lib/character/Avatar` | every played person is taught once | yes |
| `kept` | `PlaceSection` | every place card says kept or not | yes |
| `offShift` | `Business` | a house says whether its hands leave | nine houses today; absent = the engine does nothing, which is true of every other house |
| `calledTo`, `enterNarrative`, `leaveNarrative` | `EmployedMixin` | every hand answers where it is called and comes and goes itself | yes: every hand has a shift; most answer the station or nothing |
| `callsAt` | `BrainStatics` (optional) | a brain may declare hours at a place | one today (`frequents`). Accepted by ruling: it is what lets a visit and a shift share one entrance, and it declares, never acts |
| `structure` slice | the place-side structure mixin | a kept room that is its building's first carries the building's coat | one room per building; every other room writes nothing |
| `onReset` | a `DocumentKinds` entry | a kind may ask to be wiped at the nightly reset | three kinds; absent = kept, as today |
| `storeroom` | `LettingWarren` | every letting programme has somewhere to box goods | yes, required: `endLet` refuses with a typed reason, checked first, when it is missing |

No guard re-narrows a host. No new member is placed on a base class to
serve a few of its descendants.

## Convention conformance

- **`props:` / `cast:`** — unchanged; `as:` gains its second job (the key).
- **Places, not rooms** — `Locker` is a thing; the storeroom is its inside.
- **Namespace axes** — `WaterLedger` at `/system/water/idea/`; its
  documents under `/system/water/ledger/`; kernel classes at
  `/platform/<branch>/`.
- **Module scope declares** — nothing new at module scope.
- **Import boundary / categories** — two instanceable classes, one pack
  Idea, one script: existing categories. No new Api, no logic singleton in
  a pack: `WaterLedger` is a Registrar Idea calling `DocumentApi`.
- **Verbs on objects** — `isKept`, `keepSelf`, `boxGoods`, `file`, the
  off-shift act are methods on what they act on.
- **P3** — a good that does not fit the store: skip, tenant told,
  diagnostic. A failed save: reported, rethrown. `endLet` with no
  `storeroom`: typed refusal. A ledger read that finds nothing: skip (the
  row's authored state stands). A ledger write that fails: reported through
  `DiagnosticApi`, never swallowed. A duplicate part name: throw at staging
  (shipped).
- **P4** — residence reaches the locker through `MixinApi.isHeldGoods`;
  trade-hospitality extends `Locker` by package specifier; water subjects
  call `WaterLedger` inside their own pack.
- **P5** — no controller gains a decision.
- **P6** — kept or staged is the class a ROW names; no class keeps what it
  merely hosts beyond its own inside. Keys are authored on both halves.
- **P7** — a subject loads its ledger entry by its own path when it is
  created; the cap table by the business's branch on first use. No boot
  entry; the pin roll already exists.
- **P8** — `Locker`, `Company`, `WaterLedger`, *kept*, `offShift`.
- **Lint gates:** `lint:family` whole; in particular `lint:instanceable`
  (retired classes leave no row), `lint:mixin-names` (`Offstage` removed),
  `lint:field-meta`, `lint:schema` (after `gen:schema`), `lint:view-keys`,
  `lint:one-word`, `lint:subcommand-words`, `lint:command-views`,
  `lint:content-refs`, `lint:silent-catch`, `lint:floating-promises`,
  `lint:test-seams`, `lint:wire-content` (no rise), `lint:kept-animals`,
  `lint:data-ideas` (`WaterLedger` has behavior), `lint:duck-typing`,
  `lint:water-citations`, `lint:locations`, `lint:person-keys`.

## Waves

Each wave ends at a commit with `pnpm test:near`, each touched pack's
vitest and `pnpm -C packages/server lint:family` green.

### Build progress (branch `build/persistence-model`)

⚠ The phase guard refuses `lint:family` outside `suite`; each wave ran
the gates it moves by name, and the whole family runs at code-complete.

- **W0 ✅ `c651b2621`.** Harness tools are routes + wire helpers
  (`failSavesOf`, `saveBatch`) over two TestOnly `PersistableApi` seams
  (`refuseSavesOf`, `captureBatch`); the `testharness` subcommands were not
  added — the drive uses the helpers, a second door is a P12 synonym. The
  batch writer (`writeBatch`: one `saveMany`, retried one record at a time
  on a throw) landed here because the drive tool needs it (D10's
  isolation). Clerk (08–18) and cat in the testbed.
- **W1 ✅ `1440aafd6`.** D1/D2/N3 as planned. ⭐ Decided: `Container.keepWords()`
  is dropped (it only wrapped `isKept()` and made a second cluster in
  `ContainerMixin` — `lint:mixin-clusters`); `look` and the card word
  `isKept()`. Stockpile's keyless hydration source went with MarketStalls'
  (it seeds from its row in `seedBornWith`).
- **W2 ✅ `281884ba1`.** D11 as planned, with two decisions:
  `storeroom:` names the OFFICE PLACE (its first non-sale `Locker` is the
  store), and ⭐ a vacant unit is reaped while an end-let awaits, so
  `boxGoods` reads its rows first and then moves every good into the store
  with no await between. Only chattel goods box (reclaim authorizes on
  title). Duncan Hall's lobby has a storeroom cage, Seznick's a boxroom.
- **W3 ✅ `3e43c847c`.** Things ride: Plant, Field, StorageNode, IceSheet
  lose `PersistableMixin`; PersistentWell/PersistentWaterStore retire.
  ⭐ New, beyond the plan: **riders** — `PersistableApi.adoptRider(host,
  name, rider)` (state under `@riders` in the host's record; a rider adopted
  after the restore takes its state then; `captureHostOf` hops through a
  rider) replaces N7's two bespoke slices: HoldingBuilding rides its
  holding, the kernel Building rides its entrance when that is kept.
  `Adornable.adoptRestoredState` gives a fixture minted after its host's
  restore its slot's state (a tract's marked field, a pool's sheet).
  `capture()` now refuses a non-host. ⭐ Decided against the plan:
  **Wellhead keeps** (it composes `ContainerMixin` — a pump is set in it;
  only containers keep, and drilling banks depth); the district tank (a
  plain lane) and the ice pond (a plain `Pool`) now restage at reboot —
  the model the player is shown, R5 closed that way; Building rides its
  ENTRANCE only (sugar-house's entrance is already kept). Forestry's
  planting deed keys on a new `Standard.plantingKey`. PersistentConduit /
  PersistentGate's physical fields move with their classes in W4.
- **W4 ✅ `a64e5beec`** (`99876c908` carried only the deletions — a bad
  pathspec killed the add). WaterLedger, three kinds + `onReset: 'wipe'`
  (`RESET_KEPT_DOCUMENT_KINDS`), Company + the cap-table paper, the
  hull-sale paper (⭐ D7 decided: the register records no hull slot, so the
  sale does not derive). ⭐ Decided: a Gate files on a HAND's setting only —
  the rota's turns re-derive from the filed `turnStamp` on read (reading
  never writes). ReachWarren's `stops` went to the ledger; ColumnWarren
  held nothing.
- **W5 ✅ `5b740586b`.** Invariant 15, proved red on StorageNode.
- **W6 ✅ `580751bbc`.** As planned, plus: a fixture somebody HUNG rides its
  host's fixtures slice whole (`hung`) and re-hangs at the restore (the
  estate used to carry it); `Containable.getKeptWithin` retired (its two
  users were the estate). The `promoted` flag on a naming survives as the
  WORDING switch (an animal is named, a thing labelled) — no persistence.
  Six estate/overlay suites retired; one new suite.
- **W7 ✅ `7580e1c66`.** As planned.
- **W8 ✅ `d80b31cf2`.** The card's `kept` row (a tooltip, every row
  always) and `look`'s line as their own uncarded scenes (the card never
  renders handed prose); `look in <thing>` says its inside. Teach-once on
  the game clock.
- **W9 ✅ `a38a97e0c`.** ⭐ Re-planned in place: no new EmployedMixin
  methods — the entrance/exit is `placeOffShift` in EmploymentLogic (one
  caller) and the hours are `Behaved.calledToAt` over `BrainStatics.callsAt`.
  An `out` house's off-shift hands are placed EVERY tick (a visit opening
  on the hour), which retires "parked once" for those houses.
- **Master merge `bfee8bbe0`** — the naming overhaul made document kinds
  ROWS (`content/kinds/<name>.yaml`) and the `documents` collection
  keep-all. ⭐ So D5's per-kind `onReset: 'wipe'` is DROPPED with the kernel
  table: `water-ledger` (water pack), `cap-table` and `hull-sale` (platform)
  are kind rows, and the ledgers survive the nightly reset like every other
  declared document — a deviation from D5, flagged for review.
- **Code-complete `c2e33b356`** — lint:family green. ⚠ For review:
  `lint:counters` rose 4 → 5 (Locker, a stated rise); three reason rows
  added for hydration-source outcome codes.

### W0 — tools and scaffold

- `TestHarnessApi.failSavesOf(handle, on)` (a TestOnly set of record ids
  `PersistableLogic` refuses) and `captureBatch(handles)`; harness helpers
  `failSavesOf`, `saveBatch` in `packages/wire/src/harness/world.ts`;
  subcommands `testharness save-fail <name> [off]`, `testharness save
  <name>…`.
- `records:sizes` (D16).
- test-fixtures: a `clerk` seat on the venue with a day shift and its agent
  row in the shop's `cast:`; a cat row modeled on the shipped `cat.yaml`;
  `scaffold.ts` constants.
- **Accept:** `records:sizes` lists today's records. **Commit:**
  `build(persistence-model): W0 tools and scaffold`.

### W1 — kept containers in plain places (D1, D2, N3)

- `Container.ts`: `isKept`, `keepWords`. `Creature.ts`: the override.
- `Template._stageEntries`: the part-name key. Delete the `MarketStalls`
  workaround.
- `K/platform/thing/Locker.ts`; `CheckRack extends Locker`; `rack.yaml`
  help worded for any held good; `HeldGoods.checkIn` `{ ticket }`.
- test-fixtures: `thing/lockers.yaml` (`class: /platform/thing/Locker`,
  fixed in place) in the hall's `props:` as `lockers`.
- **Accept (units):** a consignment shelf in a plain `Hall` round-trips a
  consigned good across a simulated restart; two shelves of one row in two
  places are two records; the locker round-trips; `isKept` is true for a
  chest in a kept room and false for one in a plain room. **Commit:**
  `feat(persistence): a kept container keeps wherever it is staged`.

### W2 — lease end (D11)

- `LettingWarren.boxGoods`, `storeroom:`, `endLet` calling it; a `Locker`
  row in each letting office (grep rows over `DormWarren` /
  `BuildingWarren`); `unprovision` help sentence.
- **Accept:** after `unprovision` the goods are held in the office locker
  and `rack reclaim` returns each; an oversized good is reported and lost.
  **Commit:** `feat(residence): lease end boxes into the house's store`.

### W3 — things ride their container (D3, D4)

One commit per class group, each with its row re-pointing and its `{ ref }`
site audit:
- `Plant` (32 rows keep their class; the lazy key at `Plant.ts:711` goes).
- `PersistentWell`, `PersistentWaterStore` (rows → `Well`, `WaterStore`).
- `Wellhead`.
- `Field` (out of `Tract.dependentPersistables`; verify the tract's
  `Adornable` slice nests it).
- `HoldingBuilding` and the `structures` slice; `Building` and the
  `structure` slice, with D4's three room rows switched to their kept twin.
- `StorageNode` (level nests in its place); `IceSheet` (the `log` nests in
  the pond's place; thickness stays a read of the field).
- Before each: check where the shipped rows stand — the two `Wellhead`
  rows, the one `PersistentWaterStore` row, the storage nodes, the ice
  ponds, and the gates and conduits whose lock or cut state matters. One
  that should keep and stands on plain ground has its place row switched to
  the kept twin (content), and the wave's commit lists each.
- `PersistentConduit`'s and `PersistentGate`'s physical fields (the classes
  go in W4 with their history).
- **Accept (units):** each restores inside a kept container's record and
  writes no record of its own; a plant in a plain bed in a plain place is as
  authored after a simulated restart. **Commit:** `refactor(persistence):
  things ride their container`.

### W4 — ledgers (D5, D6, D7)

- `K/lib/document/DocumentKinds.ts`: `water-ledger`, `cap-table`,
  `hull-sale` (if D7 files); `BUSINESS_DOCUMENT_KINDS`.
- `P/water/src/idea/WaterLedger.ts` and its row; `Aquifer`, `Gate`,
  `Conduit`, `ReachWarren` read at create and file on change; delete the
  three `Persistent*` water classes, re-point their seven rows; drop
  `PersistableMixin` from `ReachWarren` and `ColumnWarren`.
- `onReset: 'wipe'` on the three kinds; `ResetPolicy`;
  `schema/documents.yaml`; `pnpm gen:schema`.
- `CapTable.ts`: read and file; `PersistentBusiness` → `Company` (five
  rows; `Ship.ts:2263`).
- `HullBook` per D7.
- **Accept (units):** an aquifer drawn, a gate opened and a conduit's
  deliveries read the same numbers after a simulated restart as before it
  (the existing water tests' integrals, re-run across a reset); a share
  sale survives; a plain `Gate` row files too. **Commit:**
  `refactor(persistence): history moves to ledgers`.

### W5 — only containers and bodies keep (N19)

- `packages/server/scripts/check-instanceable.ts`: the invariant. It can
  only pass once W3 and W4 are in, which is why it is its own wave.
- **Accept:** the gate fails on a scratch class composing
  `PersistableMixin` over a plain `Thing`, and passes on the tree.
  **Commit:** `lint(instanceable): only containers and bodies keep`.

### W6 — the estate retires; kept animals (D8, D9)

- Slim `lib/chattel/Estate.ts`; delete `EstateEntry` and the place
  vocabulary from `PersistenceSlice.ts`; the owner-persisted branches in
  `Container`, `Adornable`, `Slotted`, `Containable`; the flush, patch,
  overlay and detached functions and `noteOwnedGood` in `PersistableLogic`;
  `captureDetached` / `restoreDetached` (and `placeIdOf` if no caller is
  left) in `api/persistable.ts`; place and pin in `ChattelLogic`,
  `Chattel.ts`, `ChattelRecord.ts`, `ChattelRegistry.ts`, `api/chattel.ts`;
  `schema/chattel.yaml`, `schema/holder_snapshots.yaml` (`pinned`);
  `pnpm gen:schema`.
- `PersistedRecord.pinned`, `PersistableApi.pinned()`, `pinNow`.
- `Bonded.ts`, `KeptAnimal.ts` per D8.
- Rewrite or delete the estate and overlay tests; keep
  `Estate.succession-state.test.ts` against the declared fields.
- **Accept (units):** an Avatar record's entries are its carried tree; an
  owned good left in a kept place round-trips in that record and is absent
  from its owner's; a bonded unnamed animal has a record and the pin roll
  stands it up; the succession fields round-trip. **Commit:**
  `refactor(persistence): the estate, the overlay and the promoted tier
  retire`.

### W7 — failed saves (D10)

- `PersistableLogic`: the batch writer, `reportSaveFailure`, the streak
  flag; `Persistable.cleanupOnDestruct` and `ResidencyLogic` route through
  it; `Avatar.retireSignedOutBody`.
- **Accept (units):** one refused record in a batch fails alone and is
  named; a refused Avatar save puts a row in the diagnostics store and one
  line to the player, a second failure no second line; a sign-out with a
  failing save destructs the body. **Commit:** `fix(persistence): a refused
  save is told, isolated, and never keeps a body`.

### W8 — legibility and the ground (D12, D13, D14)

- `packages/types` (`kept`), `Perceiver.placeSection`, the client chip and
  tooltip, the `look` tag and container line.
- `Avatar.teachOnce`, `hints.kept`, the call in `followCustodyOnce`.
- `Dimensions.footprintWithin`; the area branch in `fitRefusal`.
- **Accept:** units for the two-showings rule on the game clock and for the
  footprint sum with a crowd standing in it; a render test for the chip.
  **Commit:** `feat(persistence): kept, said once; ground takes ground`.

### W9 — off shift (D15)

- `Business.ts` (`offShift`); `Employed.ts`: `calledTo`, `enterNarrative`,
  `leaveNarrative`; `EmploymentLogic`: the roster tick calls them and
  `moveForShift` is deleted; `brain.ts` (`callsAt`), `frequents.ts`
  (`callsAt`, and leaving to nowhere when it set out from nowhere); the
  beat's null check; delete `lib/employment/Offstage.ts`,
  `platform/location/Offstage.ts`, `Mixins.Offstage`, `MixinApi.isOffstage`,
  `BrainMoves.stage`; fix the comments that cite `Offstage`.
- Content per D15: nine `Offstage` rows deleted, eleven `offstage:` lines
  replaced or deleted, four lounge `home:` lines deleted, the ice hands'
  `frequents` spec.
- **Accept:** the testbed clerk has no environment off shift and is at the
  counter on shift; a unit walking a lounge regular through a game day —
  at the rail on shift, nowhere after, on a stool when a window opens,
  nowhere when it closes — against the same day under today's code for
  occupancy; an ice hand walks to the shed. **Commit:**
  `refactor(employment): a hand comes and goes by its own act — Offstage is
  axed`.

### W10 — the drive, the walk, the docs

- `packages/wire/tests/persistence-model.wire.test.ts` (testbed). The
  steps that need the dorm, a ship, the water commons, a company or the
  lounge go in as suites titled `persistence-model — …` in files that
  already name that content and already restart
  (`zone-instancing.dirty.wire.test.ts` for the dorm and the ship; grep the
  counted files for the Delight valley and for `/world/lounge`), so
  `lint:wire-content` does not rise.
- `e2e/tests/persistence-model-walk.spec.ts`: the chip in a kept and a
  not-kept place, the teaching line, `rack reclaim` at the locker.
- Make every checkpoint fail once on purpose.
- Fix `persistence.md:672-677` (the `owner` column holds the key) and
  `retail.md:435-441` (the gap closes). File the two out-of-scope issues.
- Order per `/build`: the MR opens READY when W9 lands green (test:near +
  touched packs + lint:family); this wave's drive, walk and the one full
  suite (`tools/suite`) run alongside review, and their findings are
  commits on the open MR. **Commit:** `test(persistence-model): the drive
  and the walk`.

## Reachability wiring

| capability | verb | affordance | data | load | arg gate |
|---|---|---|---|---|---|
| a kept container in a plain place | ordinary `put` / `get`, `shelf consign` | unchanged | a row over a kept container class, listed in `props:` | the staging walk keys it (D2) | none |
| the locker | `rack check` / `rack reclaim` (shipped) | `Locker.commandContributions` copied from `CheckRack` — without it the verb is not afforded | `class: /platform/thing/Locker` | prop of its place | `thing` requires `ChattelMixin`, `inventory`; `rack` defaults to `reachable:[mixin.HeldGoodsMixin]` — confirm `Locker` reports the mixin |
| lease-end reclaim | `rack reclaim` at the office | as above | `storeroom:` on the programme row | `boxGoods` stands the office up by path and finds the locker among its props | the reclaimer is the holding's `consignorKey` or the owner |
| the water ledger | none (the acts that draw, open, deliver) | none | the `WaterLedger` row; kind in `DocumentKinds` | each subject reads its entry in `onCreate`; the ledger singleton by path | none |
| the cap table | `title transfer … shares` (shipped) | unchanged | kind `cap-table` in the business-paper list | first use | none |
| a kept animal | none | none | none | the pin roll reads `pinned` records | none |
| off shift, and a visit | none | none | `offShift: out`; a `frequents` spec's `visits` | the roster tick asks `calledTo`; the brain module is resolved for its `callsAt` only | a hand not on any roster is never asked — every `frequents` host today is employed |
| the teaching line | none | none | `hints.kept` in Avatar's settings schema | the custody record after a move | the actor is the stamped owner |
| the marker | `look`; the card | none | the container's class | `placeSection` on every push | none |
| the size reading | `pnpm -C packages/server records:sizes` | `package.json` | `holder_snapshots` | `MONGODB_URI` | none |
| the harness tools | `testharness save` / `save-fail` | `testOnly` view | — | test world | `requiresTestWorld`; give a missing arg a typed refusal |

## Acceptance-criteria coverage

| criterion | waves |
|---|---|
| a thing is where its keeping says; only a kept animal differs | W1, W3, W6 |
| only containers keep; no plant, well, gate or building has a record | W3, W4; held by W5's gate; read by `records:sizes --scopes` |
| history survives | W4 |
| keeping is visible; the line at most twice | W8 |
| a player's record holds only what they carry | W6 |
| no `Offstage`; off-shift staff nowhere except where content places them; the bar and lounge unchanged | W9 |
| a refused save is reported, isolated, never keeps a body | W7 |
| lease end; the ship's stow | W2; the stow is untouched and re-proved by the drive |
| nothing regresses | every wave's gate; W10 compares the shutdown line against `db-performance.baseline.json` |

Nothing is unmapped.

## Test & gate strategy

**Units:** `isKept` along a chain; the part-name key and its restore; the
locker; `boxGoods` with a good that does not fit; each converted thing
nesting; the ledger read-file round trip and its single-flight write; the
cap-table paper; `isKept` / `keepSelf` on an animal; the batch writer's
isolation and the streak flag; `teachOnce` on the game clock; the footprint
sum with bodies present; the off-shift act and the null beat.

**Blocking drive:**

| step | pace | wave | staged by |
|---|---|---|---|
| 1 a cup set down, the line once, a second cup silent; venue not kept, dorm kept | instant | W8 | `hand` for the cups |
| 2 goods on the dorm table, in a dorm chest, on the shop's shelf, in the venue locker; a bonded unnamed cat follows; sign out | instant | W1, W6 | `provision`; `shelf consign`; `rack check`; `stage()` on the cat's own setters for regard, handling and home (the pets drive's helpers) |
| 3 the commons draws and opens a gate; a business sells a share | instant | W4 | the shipped acts where a drive can reach them (`adjust` a gate, pump a well on the aquifer, `title transfer … shares`), else `stage()` on the subject's own mutator |
| 4 restart: dorm, shelf and locker as left; venue as authored, cups gone; the cat exists and walks home; draws, openings and the sale on record | short | W1–W6 | `restartWorld()` |
| 5 the size reading | instant | W0, W3, W4, W6 | the test runs `records:sizes --json --entries --scopes` |
| 6 one save fails: `errors` has it, the player is told, the batch-mate is saved, the failing player signs out and the body is gone | instant | W7 | `failSavesOf(A)`, `saveBatch([A, B])` |
| 7 the lease ends; goods in the store; reclaimed at the office | short | W2 | `unprovision` by a staff seat the drive is given |
| 8 gear loose on deck; she sleeps and wakes; gear in her hold | instant | none (shipped) | whatever `zone-instancing.dirty` uses to sleep a minted ship; if nothing stages a sleep, `stageShip` gains `asleep` — a tool this build then owes |
| 9 a shopkeeper's shift ends; he is nowhere; at his station next shift | short | W9 | `testharness clock-advance` across the boundary |
| 10 a lounge regular's shift ends; they are in Dave's Bar in their window as today, and nowhere outside it | short | W9 | `clock-advance` to the shift's end and into a window |
| 11 restart: staged places as authored, kept containers as left, every Cast member once | short | all | `restartWorld()` |

No span step; no soak drive. `killed === false` is asserted at both
restarts.

**Gates:** `test:near` + pack vitest + `lint:family` per wave; `pnpm test`
at W10 and at `/finalize` only.

## Risks & opens

- **R1 — a visit opens on the hour.** The roster tick is hourly, and it is
  now what brings a regular in. Every shipped `visits` window starts on a
  whole hour, so occupancy matches; a window authored at a half hour would
  open late.
- **R2 — `callsAt` has one implementer** (`frequents`). It is the price of
  one entrance for a shift and a visit; a second scheduled brain would be
  its second.
- **R3 — which buildings are for sale** is not marked in content. D4 names
  three by what they are (two dwellings, the letting house); the build
  confirms against the title book's listings.
- **R4 — a `HoldingBuilding` or `Building` first stood after its room's
  record was written** must still find its slice: the room hands it over
  when the building stands, not only at the room's restore.
- **R5 — the ice pond and the reservoir.** Their patch log and level now
  ride their place. If the pond or the tank stands in a plain place, a
  reboot heals the ice and refills the tank, where today each kept a record.
  W3 checks each row and switches the place where it should keep.
- **R6 — a thing that rides a staged container restages.** W3 checks,
  and switches the place row to its kept twin where the thing should keep: the two `Wellhead` rows and any
  player-spudded wellhead (a wellhead on plain ground is lost at reboot, and
  drilling banks depth); the one `PersistentWaterStore` row; conduits and
  gates whose lock or cut state mattered. Where the ground is somebody's,
  the fix is content: the place row names its kept twin.
- **R7 — the reset key is new surface on the kinds table.** Three kinds
  set `onReset: 'wipe'`; `lint:schema` must agree with `documents.yaml`.
- **R8 — ledger write volume.** Filing on every act replaces a write at
  shutdown. The single-flight write bounds it to one in flight per subject;
  watch `db-performance` in `test:near` scope at W4.
- **R9 — document kinds.** The plan adds entries to the kernel kinds table
  because that is what ships. If free-text kinds land first, the three
  entries become rows.
- **R10 — the hull book** may turn out to derive from the ship register
  (D7); the build records which way it went.
- **R11 — `ColumnWarren` and `ReachWarren`** lose `PersistableMixin` only
  if their members' captures do not depend on the warren's
  (`dependentPersistables`). If they do, the warren stays a host and only
  `stops` moves.
- **R12 — goods that do not fit the landlord's store are lost** (ruled).
  Size the store rows generously.
- **R13 — the footprint bound applies to every open place** (D14), wider
  than "open kept places". Bodies are excluded, so a crowd is unaffected.
- **R14 — a visit by somebody on no roster** is not brought in by the
  tick. None exists; the first one is the staging slate's call sheet.

## Deferred seams

- **The staged lifecycle** (policies, restage on unload, the multi-place
  stage, prevent, staff clearing strays, Extras duplicating, turning
  eviction to `enforce`) → [staging-slate](../slates/platform/staging-slate.md).
  Attach point: the part name D2 derives is the name a part stamp would
  carry.
- **A priced locker** → the retail slate; attach point `HeldGoods.checkIn`.
- **Free-text document kinds** → [records-as-documents-slate](../slates/tech-debt/records-as-documents-slate.md).
- **Unloading a kept animal; who may honor a pin** →
  [eager-residency-slate](../slates/tech-debt/eager-residency-slate.md) and
  the issue W10 files.
- **Where a record lands in a circle** →
  [sandbox-overlay-plan](./sandbox-overlay-plan.md) D6.

## Critical files

1. The requirements; the slate's § 0 and § 8;
   `docs/subsystems/document-store.md` (§ The register transport),
   `docs/slates/tech-debt/records-as-documents-slate.md`.
2. `K/lib/persistence/Persistable.ts`, `PersistenceSlice.ts`,
   `K/platform/idea/api/PersistableLogic.ts` (`:795-837`, `:1300-1417`,
   `:1466-1616`), `K/api/persistable.ts`, `K/api/stuff.ts:891-932`.
3. `K/lib/stuff/Template.ts:523-702`, `K/lib/spatial/Container.ts`
   (`:427-475`, `:716-912`).
4. `K/lib/chattel/Estate.ts`, `K/platform/idea/api/ChattelLogic.ts`,
   `K/lib/chattel/Chattel.ts`.
5. `K/lib/retail/HeldGoods.ts`,
   `P/trade-hospitality/src/thing/CheckRack.ts`,
   `P/residence/src/lib/LettingWarren.ts`.
6. `K/lib/document/Registrar.ts`, `DocumentKinds.ts`, `K/api/document.ts`,
   `K/platform/idea/api/DocumentLogic.ts:228-300`,
   `P/transport/src/idea/Harbor.ts:180-210`.
7. `P/water/src/idea/Aquifer.ts`, `thing/Gate.ts`, `thing/Conduit.ts`,
   `thing/StorageNode.ts`, `idea/ReachWarren.ts`, `thing/IceSheet.ts`.
8. `K/lib/employment/CapTable.ts`, `K/platform/idea/PersistentBusiness.ts`,
   `P/transport/src/thing/HullBook.ts`, `K/platform/idea/Ship.ts:2263`.
9. `K/platform/thing/Plant.ts`, `Well.ts`, `WaterStore.ts`,
   `P/trade-drilling/src/thing/Wellhead.ts`,
   `P/trade-farming/src/thing/Field.ts`, `location/Tract.ts:550`,
   `K/platform/idea/Building.ts`, `P/residence/src/idea/HoldingBuilding.ts`,
   `HoldingWarren.ts:356`, `K/lib/location/FloorplanWarren.ts:488`.
10. `K/lib/husbandry/Bonded.ts`, `K/lib/creature/KeptAnimal.ts`,
    `K/platform/idea/api/ResidencyLogic.ts:832-861`.
11. `K/platform/idea/api/EmploymentLogic.ts:977-1080`,
    `K/lib/employment/Employed.ts`, `K/lib/behavior/frequents.ts`,
    `BrainMoves.ts`, the lounge's agent rows and `business.yaml`.
12. `K/lib/character/Avatar.ts` (`:1462-1476`, `:1700-1825`),
    `backend/PersistenceManager.ts:807-838`.
13. `K/api/test-harness.ts`, `packages/wire/src/harness/`,
    `P/test-fixtures/`, `zone-instancing.dirty.wire.test.ts`.

## Drive record

`packages/wire/tests/persistence-model.dirty.wire.test.ts` on the testbed,
`WIRE_BOOT=1 WIRE_PORT=2014`, run 4 (fresh worktree DB): **5 of 5 green**.

| step | result |
|---|---|
| 1 the hall says *not kept*; the first notebook set down teaches the line, the second says nothing | ✓ |
| 2 a notebook checked into the hall's lockers; *Kept* for the lockers' inside | ✓ |
| 6 one save refused: it alone fails in its batch, the batch-mate saved, the player told | ✓ |
| 9 the day clerk out of the narrative after 18:00, at the counter after 08:00 | ✓ |
| 4/11 restart (`killed === false`): the hall restaged, the lockers kept — `rack reclaim` returns it | ✓ |

What it found (each fixed and re-run):
- ⭐ **The refused-save line threw** — `Scene.send()` requires a topic, and
  the unit test's mock had none, so nobody was ever told. Fixed; the mock
  now insists on a topic (`f2…`, see log).
- The drive's own clock jumps landed inside the shift (aimed at real hours
  now), and the restart needs ~7 min to boot this world (timeout 15 min).
- ⚠ **Pre-existing, found by the lockers keeping across drive runs:**
  `HeldGoods.resolveHeld` answers a keyword tie with the FIRST held good,
  whoever it is held for, so `rack reclaim notebook` with two people's
  notebooks in one locker refuses the second person ("isn't yours to
  take"). ⭐ **Fixed after the walk hit it too** (#155): a shared kept locker is
  this build's own content, so the bug is this build's to close.
  `HeldGoods.resolveHeldFor(actor, keyword)` names among the goods the
  reclaimer may dispose of first, else any held good (a stranger's is
  still named and refused); `CheckRack.test` has the two-owner case, red on
  the old resolve.
- Checkpoint proof (B2): steps 6, 9 and 4/11 each went red on a real defect
  or a wrong setup before going green; 1 and 2 were not deliberately
  broken.

Steps the testbed cannot stand (the dorm's lease end, the ship's stow, the
water ledger across a restart, a share sale, the lounge regular's window,
the size reading) are covered by unit suites this build added; their live
twins are owed in the content drives (`zone-instancing.dirty`, the water
and lounge drives) — not run in this cycle. No soak drive (no span step).

### The full suite (code-complete)

`tools/suite`, one run, 38 min: **55 of 56 packages green**; `server` had 2
failures, both stale tests of rules this build changed — the sign-out test
asserted the retired "a failed save keeps the body" (D10), and the
composition-field snapshot predated `offShift`, `EstateMixin`'s two fields,
`PersistedRecord.pinned` and the chattel `place`/`pin` cut. Both fixed in
`994858c2c`; the two files re-run green. (The second full run is /finalize's.)

### The browser walk

`e2e/tests/persistence-model-walk.spec.ts`, against a test world on 2014 +
vite on 5174: **green** (run 3). It walks the hall's Explore-card place row
(*not kept*, tooltip), `look`'s *Not kept* line, the teaching line once and
never twice, `look in lockers`' *Kept* line, and `rack check`/`rack reclaim`
at the lockers.

What it found:
- ⭐ **#155 live**: the lockers held earlier walkers' notebooks, and
  `rack reclaim notebook` refused this walker — fixed (above); run 3 reclaimed
  its own with three strangers' notebooks in the lockers.
- The check line said *"at the rack"* at a bank of lockers — it names the
  fixture now (*"at a bank of lockers"*).
- Not fixed (wording, shared with the shelf, not this build's question):
  the reclaim line says *"back off the rack"* at the lockers.
- The walk's first cut matched on the echoed command; its replies are read
  with the echo stripped now (B2: it went red on #155 once it was).

### /finalize — the second drive run (2026-11-24)

On `4526c08c2`, master not ahead (left 0), fresh worktree DB:
- **The blocking drive** (`persistence-model.dirty`): **5 of 5 green.**
- **Sibling restart drives.** Each red file was re-run **alone** on a fresh
  DB, on the branch and on `origin/master` (`bb43d6cd0`, a temporary
  detached checkout with its own database). Each gave the same red steps on
  both, so none is this build's:

  | drive | branch | master |
  |---|---|---|
  | `db-performance` (shutdown speed) | green | — |
  | `harbors.dirty` + `zone-instancing.dirty` | 13 of 34 red | the same 13 |
  | `reachability.dirty` | 9 of 22 red | the same (MQL `here` is `[]` over the wire) |
  | `pets` + `cold-storage.dirty` + `trades-and-labor-content.dirty` | 6 of 26 red | the same 6 |

  ⭐ harbors step 15 (*she keeps across a restart*) and zone-instancing's
  dorm steps are **green** alone; they failed only in the first, shared-world
  batch, where an earlier file's clock jumps and purchases leaked in. Filed
  as #161.
- **The browser walk**: green at code-complete. Since then the only changes
  under it are `resolveHeldFor`'s actor check and comments.
