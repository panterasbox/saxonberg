# Apartments — implementation plan

An apartment is the **rich rung** of the residence ladder (the
[dorm](./dorm-plan.md) is the simple rung): a **leased, multi-room,
empty-at-move-in** residence you **furnish with real owned goods** that
**persist with you**. It is the **domestic-economy integrating vertical** —
parcels + banking + crafting + persistence + residency woven into the
furnish-and-keep loop. Read the requirements
(`docs/requirements/apartment-requirements.md`) in full before starting.

**This build is downstream of the dorm build.** The dorm cycle lands the two
foundations both rungs share — the **D1 multi-instance persistence spine**
and the **parcel lease surface** (`grants[]` + `childParcelsOf`/`retire` +
the lazy-Warren provisioning pattern). This plan **assumes them landed and
green** and does not re-specify them; it delivers the apartment-specific
engine work (**chattel-title + owner-based persistence** — property 0b's back
half) and the multi-room leased content on top.

## Relationship to the dorm build (the conflict check, resolved)

The two rungs **share one substrate and diverge on exactly one axis** — *who
holds title to the furniture* — which is the new engine work here. There is
**no architectural conflict**; the reconciliation is:

| Concern | Dorm (simple rung) | Apartment (rich rung) | Shared? |
|---|---|---|---|
| Multi-instance persistence (D1) | room state keyed on unit parcel | unit fixtures keyed on unit parcel | **shared spine** |
| Lease | use-grant on `grants[]`, revert | same use-grant, revert-to-storage | **shared** |
| Building | elastic keyed `Warren` (`DormWarren`) | elastic keyed `Warren` (`ApartmentBuilding`) | **same pattern** |
| Room shape | one room per unit | a live-ref **cluster** of rooms per unit | apartment extends |
| Personalization | **parcel-keyed** prose overlay (theme) on invariant fixtures | **owner-keyed** real chattel (place field) | **orthogonal** |
| Furniture title | university's (unowned, respawns) | the tenant's (owner-stamped, persists) | divergence |

The **one place they touch is host Container-slice capture.** A dorm room's
host record captures its fixtures (all unowned → all captured host-side). The
apartment adds a rule — **host capture skips owner-stamped chattel** (it
persists owner-side, closing the guest-drop leak). **This rule is a no-op for
dorms** (dorm fixtures carry no owner stamp), so it is additive and
dorm-safe. The two personalization mechanisms are **orthogonal persistence
scopes over one spine** (parcel-keyed room state ⊥ owner-keyed chattel) and
never double-own a field. **Conflict check: clean.**

## Grounding (facts established by investigation)

- **The spine** (`lib/persistence/`, `obj/api/PersistableLogic.ts`,
  `api/persistable.ts`): the record is `{scope, owner, state, place}`, keyed
  `(scope, owner)` (`PersistedRecord.ts:36`). `state` is per-mixin slices
  (`FieldsSlice`/`ContainerSlice`/`SlottedSlice`). The **Container slice**
  captures each directly-held item as `{templatePath, state, placement}` for
  a plain item, or `{ref, placement}` for a **nested host** (composes
  `Persistable`) — the nested host persists itself, keyed separately
  (`PersistableLogic.ts:283`, `PersistenceSlice.ts:39`). Restore clones each
  item via the **gated `StuffApi.clone`** path as the record's `owner`
  principal (`PersistableLogic.ts:329`).
- **The record's `place`** (`HostPlacement | null`) is the *host's* durable
  spawn/recall location (Warren ref or container path), captured only for a
  Containable host (`PersistableLogic.ts:123`). **This is not the per-item
  chattel `place` this build adds** — they're distinct fields at distinct
  cardinalities; the plan names the new one to avoid overload.
- **Owner derivation** (`ownerOfScope`, `PersistableLogic.ts:53`): Avatar
  (`HasInteractive`) → scope itself; else `ParcelApi.ownerOf(scope)`; else
  scope. Chattel-title reuses this exact rule shape, one cardinality down (an
  *item* instead of a *path*).
- **No chattel-title today.** `Thing` has no `owner` field; `GiveController`
  is a pure `ContainmentApi.move` (no title); there is no possession
  registry/index; `claim`/`sell` don't exist. `ParcelRecord.grants[]` is the
  real-property title/lease side (inert 0a seams the dorm lights up).
- **Owner-based capture is genuinely new.** Today's Container-slice capture
  only grabs items **currently in the host's container**. Owned furniture
  **placed in a room** is in the *room's* container, not the avatar's — so
  it would (wrongly) ride the room's host record. Owner-based persistence must
  (a) **skip** owner-stamped items in host capture and (b) **walk the
  owner-index** to capture owned items *wherever they sit*, each tagged with
  its `place`.
- **Warren** (`lib/location/Warren.ts`): `_members` is an anonymous `Set`;
  keyed members require a subclass-side `Map` (the dorm's `_unitsByKey`
  precedent). `createMemberSerialized`/`addMember`/`wireHubExit`/`reconcile`/
  `teardown`/`notifyPopulationChange` are the reused seams; host machinery is
  null-guarded (`ApartmentBuilding` keeps `_hostMember` null like `DormWarren`).
- **`subdivide` mints a `FolderZone`, not a spatial zone**
  (`SubdivideController.ts:87`). So a multi-room unit is **not** a per-unit
  `CartesianZone` — it is a **live-ref room cluster** (the lounge/dorm
  pattern: non-coordinate room clones wired by `keepLiveDestination` exits),
  which also dodges the deferred spatial-carve-out gap and stays consistent
  with the dorm. Intra-unit rooms connect by **cardinal** live-ref exits
  (always accepted); the unit **front door** is the lease-gated `enter`-break
  off the building corridor (the `DormDoor` precedent).
- **Duncan Hall** is a `CartesianZone` (lobby/steps/cistern), YAML-only, no
  domain classes yet. The apartment building is new content in the same
  eternal-university area, or a downtown Terminus building (a seed decision).

Constraints honored throughout: no apartment subsystem; **no
`PossessableMixin`** (ownership is a relation — a field + rebuildable index);
owner/actor from `ExecutionContextApi`, never a param; title transfer through
one gated chokepoint; `clone()` untouched; no `Named` on generic objects; new
Apis end with `SecurityApi.decorateApiClass`; logic gated with `FromModule`;
single quotes; no `.js` extensions; `noUncheckedIndexedAccess` on.

---

## Decisions

- **DECISION A — chattel-title = a field on the ownable base + a gated
  transfer chokepoint + a rebuildable owner-index (no mixin).** Per the
  capability-vs-relation guardrail, *being owned is a relation*, so **no
  `OwnableMixin`.** The stamp is a durable **`owner: string | null`** field on
  the movable-good base (`Thing`; `Creature`/pets a later consumer), persisted
  as ordinary instance state (captured as-is by the spine). Write only through
  a **single gated title chokepoint** (`PossessionApi.transferTitle`);
  player-visible verbs (`claim`/`give`/`sell`) funnel through it. A **durable
  per-item id** (a small field conferred by ownership) keys the owner-index.
- **DECISION B — a `PossessionApi`/`PossessionLogic` pair (general engine, not
  apartment content).** Chattel-title is the possession substrate's second
  registry (sibling of `ParcelApi`'s real-property title), **not** an
  apartment module. `api/possession.ts` (`PossessionApi`) forwards to
  `obj/api/PossessionLogic.ts` (gated `FromModule('/api/possession#PossessionApi')`):
  `ownerOfItem(item)` (`stamp ?? templatePath-under-parcel ?? unowned`, the
  `ownerOfScope` rule one cardinality down), `transferTitle(item, toPrincipal)`
  (the chokepoint, actor/consent from context), `claim(item)`,
  `ownedBy(principal)` (the rebuildable owner-**index** query, not a store —
  derived over live holders + persisted records), `placeOfItem`/`setPlaceOf`
  (D3). This is an existing module category (Api + logic singleton); *confirm
  the name at build* — it is not a new taxonomy entry.
- **DECISION C — owner-based persistence: a per-item `place` + owner-keyed
  capture, additive to host-keyed capture.** Each owned item carries a
  **`place: string`** (a residence room path / `'inventory'` / `'storage'`;
  default `'storage'` = owned-but-unplaced). Two additive spine changes:
  1. **Host Container-capture skips owner-stamped items** (`captureContainer`
     filters `MixinApi`-ownable items whose `owner` is set → they persist
     owner-side). **No-op for the dorm** (fixtures unowned).
  2. **Owner-keyed capture** walks `PossessionApi.ownedBy(principal)` and
     records each owned item as a `{templatePath, state, place}` entry in the
     owner's record (a new `OwnedChattelSlice`, sibling of the Container
     slice), independent of the item's current container.
  On **materialize**: an owner's items route by `place` — `'inventory'` →
  the avatar's container; `'storage'` → left dormant (owned-but-unplaced, not
  cloned into the world); a **room path** → re-placed **when that room is
  live** (below). Eviction/lease-end forces `place → 'storage'` and **never
  destructs owned chattel**.
- **DECISION D — the room↔chattel re-placement seam.** A residence room, on
  materialize (via the D1 host record for its fixtures), **additionally**
  queries `PossessionApi.ownedBy`-by-place for items whose `place` == this
  room path, and clones-and-places each (gated `StuffApi.clone` as the
  *owner* principal, then `ContainmentApi.move`). This is the **owner-keyed
  overlay on top of the host-keyed fixture respawn** — the two scopes compose,
  neither owns the other's fields. Order: fixtures first (host record), then
  the owned-chattel overlay. A room going dormant captures nothing
  owner-side (the owner's record is authoritative for chattel); it only
  captures its own fixture host record.
- **DECISION E — the guest-drop leak fix falls out of C+D.** Dropping an
  owned item in a *foreign* residence sets its `place` to that foreign room
  **but the item persists owner-side** (skipped by the host record). So the
  host's record never carries it; the dropper's record does. On the foreign
  room's next materialize it re-appears (place matches) — "left my book at a
  friend's" — recoverable by the owner via `get`/recall-to-storage, never a
  data leak into the host's record.
- **DECISION F — the multi-room unit is a live-ref cluster, keyed on the unit
  parcel.** `ApartmentBuilding extends Warren` (`SingletonMixin`, content, the
  `DormWarren` precedent) keeps `_unitsByKey: Map<unitExtent, MemberStuff>`
  (the **entry/living room** = the keyed Warren member + the D1 fixture host)
  and `_corridorsByFloor` (runtime scaffold). Each unit's **other rooms**
  (bath/kitchen/bed) are **satellite room clones** wired to the living room by
  **cardinal live-ref exits** (`keepLiveDestination`), materialized together
  by `admit(unitKey)` and torn down together on reap. Each room's **place
  identity** (the chattel `place` target) is `unitExtent/<roomrole>` (living /
  bath / kitchen / bed) — a stable string, no new field (the extent-encoding
  precedent from the dorm's slot). Built-in fixtures (sink/counter) are the
  rooms' Container content, respawned from the floorplan template (host-keyed);
  the unit materializes **empty of movable goods**.
- **DECISION G — furnishing rides title-aware containment verbs.** `place`/
  `put`/`drop` an owned good → `ContainmentApi.move` (custody) + `setPlaceOf`
  to the room (title stays); `get`/`take` → custody back + `place` follows;
  `take` a good you don't hold title to without consent → **theft** (custody
  without title, recoverable); `give` → the combined custody+title transfer
  (bilateral consent) via `transferTitle`. New verbs only where there's no
  custody analog: `claim` (title-only) and `sell` (title+custody+`settle`
  payment, the `OrderController` precedent). Function is fixed by the backing
  class throughout.
- **DECISION H — the lease is the dorm's lease, revert evicts to storage.**
  Provisioning mints the unit sub-parcel (`ParcelApi.subdivide`, no spatial
  backing zone — the extent is the key) + `grantUse` (the dorm surface).
  End-lease: `revokeUse` → force every owned item with `place` under the unit
  to `'storage'` (`PossessionApi`, never destruct) → `markForRevert` +
  destruct the live rooms (the dorm's DECISION B seam) → `deleteAllFor` the
  fixture records → `retire` the parcel. The shell re-leases clean; the
  ex-tenant's furniture waits in storage for their next unit.
- **DECISION I — command categories.** `inventory` for the title-aware
  furnish verbs (`claim`/`place`/`give`; `take`/`get`/`drop` made
  title-aware); `sell` in `banking` (it settles). The admin
  `provision`/`unprovision` in `system` (next to the dorm's, `subdivide`
  precedent). No player `decorate` verb (apartments furnish, not theme;
  prose-on-items is a deferred slice).

---

## Phase 0 — Dependency: the dorm build (not built here)

The dorm cycle lands and greens: **D1** (`PersistableApi.capture/materialize`
gain a `key` param; `owner = key`; the key stash; `multiInstance` relaxing
`assertSingletonScope`; `postRegister` no longer auto-driving; Avatar migrated)
and the **parcel lease surface** (`UseGrant` on `grants[]`;
`grantUse`/`revokeUse`/`hasUseGrant`/`heldUnitOf`/`childParcelsOf`/`retire`;
the elastic keyed-Warren provisioning pattern). This plan **starts from that
green baseline.** If the apartment cycle runs before the dorm merges, rebase
onto it first.

---

## Phase 1 — Chattel-title: the owner-stamp, resolution, transfer chokepoint

The possession substrate's second registry (property 0b back half), **no
apartment content yet** — a general engine primitive.

### Files

**`mud/lib/spatial/Thing.ts`** (or the movable-good base) — add the durable
stamp: `owner: string | null = null` (persistent field), a durable per-item
**`itemId`** (conferred on first `claim`/craft; the owner-index key), and the
**method surface only** (`getOwner()`/`getOwnerStamp` read; the *write* is
`ApiOnly`-gated — `setOwnerStamp` reachable only from `PossessionLogic`). No
mixin (DECISION A/guardrail).

**`mud/api/possession.ts` (`PossessionApi`)** — the thin forwarding shell:
`ownerOfItem(item)`, `transferTitle(item, toPrincipal)`, `claim(item)`,
`ownedBy(principal)`, `placeOfItem(item)`/`setPlaceOf(item, place)` (D3 lands
the last two in Phase 2). Ends with `SecurityApi.decorateApiClass`.

**`mud/obj/api/PossessionLogic.ts`** — the gated logic singleton
(`extends ApiLogic`, `@internal`, methods `@CallSecurity(FromModule('/api/possession#PossessionApi'))`):
- `ownerOfItemImpl(item)` = `getOwnerStamp(item) ?? parcelExtentOwner(item.getTemplatePath()) ?? unowned` — the `ownerOfScope` rule (PersistableLogic:53) one cardinality down, reusing `ParcelApi.ownerOf` for the extent rung.
- `transferTitleImpl(item, to)` — **the single write chokepoint**: resolve actor from `ExecutionContextApi`, enforce consent/authority (owner or gifting principal), stamp `setOwnerStamp(item, to)`, update the owner-index. Every verb funnels here.
- `claimImpl(item)` — title-only stamp of an *unowned* item to the acting principal (mint `itemId` if absent).
- `ownedByImpl(principal)` — the **rebuildable owner-index** query: derive over live holders + the owner's persisted records (no dedicated store — the banking `ledger→cache` shape). First cut: an in-memory index warmed at boot + maintained at the transfer chokepoint.

**Verbs** (`mud/cmd/inventory/` + `obj/command/inventory/`,
`mud/cmd/banking/sell.yaml` + controller):
- `claim` → `PossessionApi.claim`.
- `give` (make the existing `GiveController` title-aware) → `ContainmentApi.move` + `transferTitle` (bilateral consent).
- `sell` → `transferTitle` + `ContainmentApi.move` + banking `settle` (atomic, the `OrderController` precedent).
- `take`/`get`/`drop` (existing) → gate on title (theft = custody without title, allowed-but-flagged + recoverable; owned items you hold title to move freely).

### Tests (`lib/spatial/__tests__/`, `api/__tests__/possession`)

- `claim` stamps an unowned item to the actor; re-claim by another → refused.
- `ownerOfItem` resolves stamp → parcel-extent → unowned.
- `give`/`sell` transfer title (consent / payment) through the chokepoint; a
  direct `setOwnerStamp` from a non-`PossessionLogic` caller throws.
- `ownedBy(principal)` lists exactly the actor's stamped items.
- Function-fixed: no verb changes an item's class.

---

## Phase 2 — Owner-based persistence: the `place` field + owner-keyed capture

The reframe's central engine work — additive to host-keyed capture, **verified
no-op for the dorm/Avatar**.

### Files

**`mud/lib/spatial/Thing.ts`** — add the per-item **`place: string`**
(persistent; default `'storage'`), `getPlace()`/set via
`PossessionApi.setPlaceOf` (gated). Distinct from the record's `HostPlacement`
`place` (documented at the site).

**`mud/lib/persistence/PersistenceSlice.ts`** — add an **`OwnedChattelSlice`**
(sibling of `ContainerSlice`): `{ items: { templatePath, state, place }[] }`
— the owner's owned goods captured *wherever they sit*, each carrying `place`.

**`mud/obj/api/PersistableLogic.ts`** — the two additive changes:
- **`captureContainer` skips owner-stamped items** — filter items where
  `PossessionApi.ownerOfItem(item)` is a set stamp; they persist owner-side,
  not in the host's Container slice. (Guarded so a dorm/Avatar with no
  stamped items is byte-identical.)
- **Owner-keyed capture** — when capturing a principal that owns chattel
  (`HasInteractive` avatars in v1), after the existing slices, walk
  `PossessionApi.ownedBy(principal)` and emit the `OwnedChattelSlice` (each
  item's `templatePath`/`state`/`place`), independent of current container.
- **Materialize routing** — restore the `OwnedChattelSlice` by `place`:
  `'inventory'` → clone into the avatar container; `'storage'` → **do not
  clone** (dormant, owned-but-unplaced — recorded live in the owner-index
  only); a **room path** → defer to the room's re-placement seam (Phase 3 /
  DECISION D). All clones through the gated `StuffApi.clone` as the owner.

**`mud/api/persistable.ts`** — no new gated surface (the changes are internal
to the logic); the owner-index consultation is via `PossessionApi`.

### Tests (`lib/persistence/__tests__/`)

- **Skip rule:** a host (room) containing an owner-stamped item captures the
  item **not** in its Container slice; an unowned fixture **is** captured.
- **Owner-keyed round-trip:** an avatar owning a chair (place `'inventory'`)
  + a desk (place `'storage'`) → capture → destruct → re-materialize → the
  chair is in inventory, the desk is *not* cloned but is live in the
  owner-index (place `'storage'`).
- **Dorm/Avatar regression (named):** an Avatar with carried inventory + worn
  gear (no owner stamps beyond self) captures/restores byte-identically to
  today (the skip rule + owner-keyed slice are no-ops for un-stamped content).
- **Eviction never vaporizes:** forcing `place → 'storage'` on eviction leaves
  the item in the owner-index, un-cloned, recoverable.

---

## Phase 3 — Content: `ApartmentBuilding`, the multi-room unit cluster, fixtures, door

The apartment's spatial content, reusing the dorm's elastic keyed-Warren
pattern with a **cluster** member.

### Content classes (`mud/domain/eternal/duncan-hall/apartments/…` or a Terminus building)

- **`ApartmentBuilding`** — `SingletonMixin(Warren)`, the `DormWarren`
  precedent: `_unitsByKey: Map<unitExtent, MemberStuff>` (the **living room**
  = the keyed member + D1 fixture host), `_corridorsByFloor`, `_hostMember`
  null. `admit(unitKey)` clones the living room (`createMemberSerialized`) →
  D1 restore-or-seed its **fixtures** (host record) → **materializes the
  satellite rooms** (bath/kitchen/bed) wired by cardinal live-ref exits →
  **runs the owner-keyed chattel overlay** (DECISION D: query `ownedBy`-by-place
  for each of the unit's four room paths, clone-and-place) → wires the front
  door's return leg → caches. `ensureFloor`/`ensureUnitDoor`/`reconcile`
  (dormancy reap + top-down corridor reap)/`teardown` mirror the dorm; reap
  captures **only fixture host records** (chattel is owner-authoritative).
- **`ApartmentRoom`** — extends `Location` (non-coordinate), composing
  `PersistableMixin(WarrenMemberMixin(PostRegistrationMixin(AdornableMixin(
  DetailedMixin(VisibleMixin(ExitableMixin(Location)))))))` for the **living
  room** (the keyed member); the satellites are a lighter
  `PersistableMixin(...)` non-member variant sharing the fixture-host pattern,
  each with a `roomRole` (`living`/`bath`/`kitchen`/`bed`) so its `place`
  string is `unitExtent/<role>`. `static multiInstance = true`;
  `persistentFields = []` (fixtures ride the Container slice, chattel rides the
  owner). Population witness folded in (overrides `onContainableAdded/Removed
  → notifyPopulationChange`) for reap. **No `Named`.**
- **Built-in fixtures** — `Sink`/`Counter` (`SurfacedMixin`),
  `Cupboard` (`ContainerMixin`) etc. — university-owned, unowned-stamp,
  respawned from template (host-keyed, like the dorm's Bed/Desk). Seeded
  imperatively by `installFixtures()` per room role on first materialization.
- **`ApartmentDoor`** — the dorm's `DormDoor` reused/subclassed: a runtime
  clone per provisioned unit on its floor corridor, `open()` lease-gated via
  `ParcelApi.hasUseGrant(unitExtent, actor)`, fronting the lazy entry exit
  (`resolveDestination → ApartmentBuilding.admit(unitKey)`). No `Named`.
- **`LazyFloorExit`** — reused from the dorm (or a shared `lib/location/`
  primitive if the dorm already generalized it; else duplicate the thin
  `Exit` subclass).

### Templates (seeds)

- Floorplan templates: `ApartmentRoom.yaml` (per role via `roomRole` default),
  fixtures, `ApartmentDoor.yaml` — classes + `hydratorClass` + generic prose,
  **no `populates:`** (fixtures imperative, doors/rooms runtime clones).
- A `dorms`-style **`apartments` parent parcel** under the building, `owner:
  {kind: group, name: <proprietor>}` — the extent units subdivide under. No
  unit rows (minted at provisioning). Nothing pre-seeded but the lobby +
  classes.

### Tests (`domain/.../apartments/__tests__/`)

- `admit(unitKey)` clones a four-room cluster wired by cardinal live-ref
  exits; the front door lease-gates; the unit materializes **empty of movable
  goods** (only fixtures).
- Two units from one floorplan keep distinct fixture records (D1
  multi-instance, keyed on unit parcel).
- Reap: an empty unit past grace captures its fixture records + reaps;
  re-`admit` re-materializes fixtures **and** re-places owned chattel.

---

## Phase 4 — The furnish loop: provisioning, place, persistence end-to-end

### Provisioning (`system`, the dorm's `ProvisionController` precedent)

`provision <player> [--floorplan studio|onebed]` → gate to the building-parcel
owner → lowest-free slot → `ParcelApi.subdivide(unitExtent, apartmentsExtent,
owner)` (no backing zone) → `ParcelApi.grantUse(unitExtent, playerPath, null)`
→ `ensureUnitDoor(unitExtent)` (immediate door if the floor's live). No room
materialization (lazy on entry).

### The furnish loop (verbs from Phase 1, now over a residence)

- Tenant walks in (lease-gated door → `admit` → empty furnished-with-fixtures
  cluster) → `place <owned chair>` → `ContainmentApi.move` + `setPlaceOf(chair,
  unitExtent/living)` → the chair persists owner-side with that `place`.
- Dormancy + restart → re-enter → the cluster reconstitutes (fixtures from
  template) **and the chair re-appears** (owner-keyed overlay, DECISION D).
- `get <chair>` → custody back, `place` follows to `inventory`.

### End-lease (`system`, DECISION H)

`unprovision <unit>` → `revokeUse` → force every owned item placed under the
unit to `'storage'` (`PossessionApi`, intact) → `markForRevert` + destruct the
live rooms (dorm DECISION B) → `deleteAllFor` the fixture records → `retire`
the parcel. Re-provision → clean shell; the ex-tenant's furniture waits in
storage.

### Tests

- **Furnish + persist:** lease → place three owned goods across rooms →
  restart → all three re-placed in the right rooms; a non-leaseholder can't
  open the door.
- **Guest-drop (DECISION E):** a visitor drops an owned item in the unit →
  it's titled to the visitor with `place` = the unit; the **unit's** fixture
  record does **not** carry it; the visitor recalls it from storage.
- **Revert-to-storage:** unprovision a furnished unit → the tenant's goods are
  in storage (intact, titled), the shell reverts clean; re-provision → empty.
- **Moving:** unprovision → re-provision a *different* slot → `place` from
  storage re-furnishes the new unit.

---

## Phase 5 — Documentation (acceptance) + sweep

Extend **`docs/subsystems/residence.md`** (the dorm's page) with the apartment
half, or add a sibling section:

- **Chattel-title** (the owner-stamp field + `PossessionApi`/`PossessionLogic`
  + the transfer chokepoint + the rebuildable owner-index; ownership as a
  relation, no mixin).
- **Owner-based persistence** (the per-item `place`, the `OwnedChattelSlice`,
  the host-capture skip rule, the room re-placement overlay, storage =
  owned-but-unplaced, the guest-drop leak fix) — and how it **composes**
  orthogonally with the dorm's parcel-keyed room state over one spine.
- **The multi-room leased unit** (the live-ref cluster, `roomRole` place
  identity, the reused elastic keyed-Warren + lease).
- **The furnish loop** as the domestic-economy vertical; the deferred seams.

Cross-link `persistence.md` (the owner-keyed scope), `parcel.md` (chattel =
the second title registry; the lease reused), `crafting.md` (maker's-mark →
owner-stamp at craft), `banking.md` (`sell` settles),
`dorm`/residence (the sibling rung). Run `finalize` to graduate the plan +
requirements and settle slate retention.

---

## Deferred seams (clean attach points, not stubs)

- **The compute-as-energy / stewardship loop** — property Phase 1; stewardship
  stays derived-on-read, never a flag. This build ships the persisting
  furnished home, not the energy meter over it.
- **Rent economics** — payment schedules, metered sub-allowance, sublease
  markets, the proprietor-as-Business P&L. The lease *relationship* ships; the
  *economics* attach at `settle` + the Business account.
- **Prose-on-owned-items personalization** (DECISION D5 in requirements) — the
  whole-document write on an item's expressive prose fields; attaches at a
  `PROSE_FIELDS` allowlist + the spine (instance state, carried free). Needs
  chattel (this build) first.
- **The holodeck portal fixture** — the skinnable wardrobe into `/home/`; its
  own sandbox slate. The apartment is designed to contain one (a placeable
  chattel fixture) — attaches as ordinary owned furniture with a
  `SandboxPortalMixin`.
- **Owned homes (title, not lease)** — the rung above; `transfer` of the unit
  parcel title instead of a use-grant. The custody/title axis already carries
  it.
- **Pets as ownable `Creature` chattel** — the `owner` stamp bottoms out at
  `Creature`; v1 scopes to `Thing`. Attaches by lifting the field to the
  `Creature` branch.
- **Co-lease / roommate** — a use-grant of a use-grant (property §K sublet);
  v1 is single-leaseholder.
- **The owner-index as a persisted rebuildable cache** — v1 warms in-memory at
  boot + maintains at the chokepoint; a `possession`-collection materialized
  cache (the `renown`/`bank_accounts` shape) attaches if boot-scan cost bites.
- **Spatial-zone carve-outs on `subdivide`** — units use live-ref clusters
  (no per-unit `CartesianZone`); minting a spatial zone on subdivide is the
  deferred parcel work, only needed if a unit ever wants grid geometry.

---

## Critical files for implementation

- `packages/server/src/mud/lib/spatial/Thing.ts` — the `owner` stamp + `place`
  + `itemId` fields + gated write surface (chattel-title's carrier).
- `packages/server/src/mud/api/possession.ts` +
  `obj/api/PossessionLogic.ts` — the possession registry (title resolution,
  the transfer chokepoint, the owner-index) — the one new engine Api.
- `packages/server/src/mud/obj/api/PersistableLogic.ts` +
  `lib/persistence/PersistenceSlice.ts` — the owner-keyed capture (the
  `OwnedChattelSlice` + host-capture skip + place routing) — Phase 2's core.
- `packages/server/src/mud/domain/.../apartments/{ApartmentBuilding,
  ApartmentRoom,ApartmentDoor}.ts` — the multi-room leased content (the
  `DormWarren`/`DormRoom`/`DormDoor` precedents, cluster member).
- `packages/server/src/mud/obj/command/inventory/{ClaimController,
  GiveController}.ts` + `banking/SellController.ts` + `system/{Provision,
  Unprovision}Controller.ts` — the title-aware furnish + admin verbs.
- `packages/server/src/mud/lib/location/Warren.ts` +
  `domain/lounge/LoungeWarren.ts` + the dorm's `DormWarren.ts` — the
  keyed-Warren precedents (consumed unchanged).
- `packages/server/src/mud/lib/parcel/` + `api/parcel.ts` — the lease surface
  (from the dorm build) reused for provisioning/revert.
</content>
