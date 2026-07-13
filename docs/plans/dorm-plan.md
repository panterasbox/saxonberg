# Dorms — implementation plan

A dorm is a **leased, furnished, theme-personalizable, persistent single room** — a real room you **walk into**, in an **elastic building that grows on demand**. Duncan Hall's dorms wing is a **`Warren`** (the shipped centrally-managed room-collection substrate): it starts as **just the ground-floor lobby** and provisions nothing in advance. **Provisioning** a dorm (the lease/assignment act) is the growth trigger — the first provision creates floor 1 (its corridor) and the first room; rooms fill a floor up to `ROOMS_PER_FLOOR` (~12–15, a tunable knob), then the next floor is created. Floors and corridors are **runtime** (they reap when empty and reconstitute lazily); the **durable truth** is the set of provisioned units + their stored slots + each room's persisted state.

The engine work is **D1 — the unified persistence-key pattern** (the *orthogonal* persistence axis that makes each room's state durably its own, keyed on the unit parcel). The spatial side reuses the Warren wholesale via a **`DormWarren` content subclass** — exactly as `LoungeWarren` consumes the Warren from `domain/lounge/`. **Verified: the base `Warren` needs no changes** — the two-tier elastic structure maps as *rooms = keyed Warren members; corridors + doors = `DormWarren`-managed runtime scaffold in the subclass's own maps, outside `_members`*; every base seam that could break is null-guarded or an override point. **There is no dorm subsystem** — no `DormApi`, no `DormLogic`, no `lib/dorm/`; `DormWarren` is content, like `LoungeWarren`.

Read the requirements (`docs/requirements/dorm-requirements.md`) in full before starting.

This plan is grounded in the real code. Key facts established by investigation:

- The spine (`lib/persistence/Persistable.ts`, `obj/api/PersistableLogic.ts`, `api/persistable.ts`, `lib/persistence/PersistedRecord.ts`) keys a record on `(scope = host.templatePath, owner)`, derives `owner` internally via `ownerOfScope`, and today `PersistableMixin.postRegister` **auto-drives** materialize/capture.
- **The only production `PersistableMixin` composer is `Avatar`.** Every other composer is a test fixture. This makes D1's migration surface tiny.
- `assertSingletonScope(scope)` in `PersistableLogic` **throws** when `findAllByTemplatePath(scope).length > 1` — the guard that must relax for multi-instance hosts.
- `restoreItem` already clones each captured content item **from its current `templatePath`** then applies captured state — "respawn function from the current template + overlay the persisted prose" for free (Hazard 3).
- **Warren (`lib/location/Warren.ts`, verified):** `_members` is a private `Set` written only by `addMember`; nothing auto-enrolls a clone, so `DormWarren`-managed corridor/door clones stay invisible to the base. The host machinery (`getHost`/`_resolveHost`/`designateHost`) fires *only* from placement/arrival entry points, is fully null-guarded, and `DormWarren` never triggers it (`_hostMember` stays null). `wireHubExit` no-ops on a null host (so `DormWarren` overrides it). **`teardown()` is the one hazard** — it destructs only `getMembers()` + host, so it must be overridden to also destruct the out-of-`_members` corridor/door clones; it's public + polymorphic, so this is ordinary subclassing. `wireHostFixtures` (LoungeWarren.ts) is the `addBidirectionalExit`+`keepLiveDestination` primitive for wiring a room to another room by live ref. `LoungeMixin.onContainableAdded/Removed → notifyPopulationChange → reconcile` is the population-witness precedent.
- Parcels: `ParcelRecord` (`lib/parcel/ParcelRecord.ts`) has `grants[]` (the lease seam) and `persistentFields`; `findAll()` filters on `parentParcel`. `ParcelRegistry.subdivide` is storage-only (the caller mints the backing zone separately in `SubdivideController`). `ParcelApi`/`ParcelLogic`/`ParcelRegistry` are the gated three-tier surface.
- Duncan Hall already exists: `mud/seeds/domain/eternal/duncan-hall.yaml` is a `CartesianZone` with `lobby` [0,1,0], `steps` [0,0,0], `cistern`, `front-doors` leaves. Its own comment says *"future floors / corridors layer in as content grows"* — the dorms wing is exactly that growth. `Lounge` (`domain/lounge/Lounge.ts`) is the precedent for a multi-instance, non-coordinate room.
- `VisibleMixin` persists `shortDescription`/`longDescription` (setters `setShortDescription`/`setLongDescription`); `DetailedMixin` persists `details`. **These are the prose fields the theme overlay writes** — already persistent, so the spine captures/restores them with no new field work.

Constraints honored throughout: no `Named` on dorm objects; owner/actor from `ExecutionContextApi`, never a param; `clone()` untouched; persistence via the spine only; new Apis end with `SecurityApi.decorateApiClass`; logic methods gated with `FromModule`; single quotes; no `.js` import extensions; `noUncheckedIndexedAccess` on.

---

## Decisions

- **DECISION A — materialization is the `DormWarren`'s job.** Not a bespoke Api, not a command. `DormWarren extends Warren` (content, `domain/eternal/duncan-hall/`, `SingletonMixin`, the `LoungeWarren` precedent) is the room-collection manager. It keeps two maps — `_unitsByKey: Map<unitExtent, MemberStuff>` (the keyed live **rooms**, the true Warren members) and `_corridorsByFloor: Map<number, Corridor>` (the runtime **floor** scaffold, outside `_members`). Rooms materialize via `admit(unitKey)`; floors via `ensureFloor(n)`. No `ResidencyApi.materializeResidence`, no `ResidenceEntryExit`, no `DormApi`.
- **DECISION B — reverting a *live* room on lease-end.** A tiny general per-instance opt-out on `PersistableMixin` — `markForRevert()` sets a `_reverting` flag folded into `shouldPersist()` — so the end-lease path can `markForRevert(room) → destruct → deleteAllFor(unitExtent)` with no recapture. A general spine seam, not dorm code.
- **DECISION C — command category.** `residence` for player-facing verbs (`decorate`/theme-pick, `remodel`); the admin `provision`/`unprovision` verbs in `system`, next to `subdivide`/`transfer`.
- **DECISION D — fixture seeding.** In-room fixtures (bed/desk/footlocker) are **content of the `DormRoom` host** (captured in the spine's Container slice), seeded **imperatively once** on first materialization by `DormRoom.installFixtures()`, restored on every wake by the spine's `restoreItem`. Avoids the `populates:` seed-then-persist gate (a no-op for multi-instance hosts). A content method, not a subsystem.
- **DECISION E — walkable entry via a `DormDoor`.** Each unit has a **lockable `DormDoor`** in its floor corridor (a runtime clone, one per provisioned unit on that floor — see DECISION I, not a seeded singleton). Its `open()` lease-gates (actor from `ExecutionContextApi`, `ParcelApi.hasUseGrant`) — can't open, can't pass. The door fronts a **lazy entry exit** (`Exit.resolveDestination()` → `DormWarren.admit(unitKey)`). The **return** leg (room → corridor) is wired by the overridden `wireHubExit` (one-way, `keepLiveDestination`), so the two never duplicate. Door impl notes to settle at build: (1) `open()` throw-to-reject vs. a general `canOpen` hook (lean throw); (2) door stays open after unlock (a follower could tail in — acceptable v1); (3) the lazy exit is a thin `Exit` subclass holding no materialize logic.
- **DECISION F — the building is ELASTIC, grows on provisioning (supersedes the earlier fixed-scope).** Start = **just the lobby**, nothing provisioned. Provisioning creates floors/rooms on demand; a floor fills to `ROOMS_PER_FLOOR` (~12–15, tunable) then the next floor is created. **No pre-seeded units, no pre-seeded corridors.** Floors/corridors are runtime clones (multiple floors = multiple corridor clones); they **reap when empty and reconstitute** (DECISION I). Vertical travel is **stairs** (`up`/`down` cardinal exits between floor corridors — the building's existing `down`-to-cistern convention), **no elevator mechanism**. Deferred: a real elevator (moving room / `Switchable`); bespoke **quest rooms** that will pin floor 1 to always-exist (no code now — leave the seam).
- **DECISION G — persistence is orthogonal to the Warren.** The Warren manages the *collection* (runtime graph; stores **no** member state); a room's *state* persists via D1 (`PersistableMixin`, keyed on the unit parcel) independently — the Warren neither reads nor writes it. Base Warren stores members anonymously; `DormWarren` keeps its own keyed `Map`. Promoting keyed members into `Warren.ts` (~100 non-breaking lines) is deferred until a second keyed consumer appears.
- **DECISION H — corridors are runtime clones, never the Warren host.** `DormWarren` keeps `_hostMember` **null forever** (drives entry via `admit`, never the placement kernel) and **overrides** `wireHubExit(m)` to wire each room's one-way return leg to *its floor's* corridor (`addBidirectionalExit`/one-way + `keepLiveDestination`, the `wireHostFixtures`/Dave's-Bar primitive), `wireHostFixtures` → no-op, and **`teardown()`** to also destruct the out-of-`_members` corridors + doors. Corridors are **not** Warren members, so they don't get `WarrenMemberMixin`'s free eviction veto — the `Corridor` class carries a one-line `canEvict → { ok: false }` (the `DormWarren` owns its lifecycle, so residency must not cull the stair chain). Zero `Warren.ts` change; `LoungeWarren` untouched.
- **DECISION I — the elastic two-tier structure (rooms = members, floors = scaffold).** `DormWarren`:
  - **Rooms** are keyed Warren members (`_unitsByKey`), added via `addMember`, persisted via D1. `admit(unitKey)` returns the cached live room, else clones `DormRoom` (`createMemberSerialized`), D1 restore-or-seeds, wires the return leg to its floor corridor, caches.
  - **Floors** are runtime `Corridor` clones (`_corridorsByFloor`), created by `ensureFloor(n)`: clone the corridor template, wire its `down`↔the floor below (lobby for floor 1, else `ensureFloor(n-1)`; `keepLiveDestination` between clones), clone the `DormDoor`s for the provisioned units whose slot is on floor n.
  - **Lazy materialization** rides two `Exit.resolveDestination` seams (content, not base): the **`LazyFloorExit`** (the lobby's `up` and each corridor's `up`) → `ensureFloor(n+1)` (impassable when that floor has no provisioned units); the **`DormDoor` entry exit** → `admit(unitKey)`.
  - **Reap** hangs on `reconcile()`, driven by `DormRoom`'s **folded-in population witness** (it overrides `onContainableAdded/Removed` to fire `notifyPopulationChange` — the `LoungeMixin` behavior as a concrete-class override, no separate mixin; `admitArrival` is a trivial no-op — dorms don't population-bud). Room dormancy = capture-then-reap (empty past grace → `capture(room, unitKey)` → tear down return leg → `removeMember` → `destruct` → drop from `_unitsByKey`). **Corridor reap is strictly top-down**: reap floor n only if it has no live room **and** no live corridor above it — this keeps `lobby↔c1↔…↔c_top` contiguous and guards both hazards (a corridor never reaps under a live room, and a middle floor never reaps out from under an occupied floor above it). `teardown()` (HMR/shutdown) reaps all corridors + doors.
- **DECISION J — provisioning + the stored slot (fits parcels, minimal new machinery).** The durable slot `(floor, position)` lives on the **minted unit `ParcelRecord`**, encoded in its extent: `…/dorms/f<floor>-r<pos>` (**zero new field** — the extent *is* the slot, and already the D1 key + the Warren member key). Reconstitution = enumerate child parcels of the dorms extent and parse `f/r`. **Provisioning** = compute the **lowest-free slot** (reuse gaps left by unprovision before a new floor) → `ParcelApi.subdivide(unitExtent, dormsExtent, owner)` (used as-is, **minus the backing-zone mint** — a unit needs no `Zone`, its extent is just the key string) → `ParcelApi.grantUse(unitExtent, holder)`. **Materialize lazily** — provisioning writes only durable truth; the corridor/door/room reconstitute on first entry. New parcel surface required: **`ParcelApi.childParcelsOf(dormsExtent)`** (a thin gated forwarder over `ParcelRecord.findAll` filtered on `parentParcel`) for reconstitution + lowest-free-slot, and a gated **retire** (frees the slot on unprovision). *(Build alternative: a typed `slot` field on `ParcelRecord` instead of extent-encoding, if a stable opaque unit id is preferred — one `persistentFields` entry. Extent-encoding is the recommended default.)*

---

## Phase 1 — D1: the unified persistence-key pattern + Avatar migration

The spine change, landed and fully green with Avatar migrated, **before any dorm content**. Everything downstream depends on multi-instance persistence. **Unchanged by the elastic reframe** — the room is still the keyed persistent host; building growth is orthogonal to the spine.

### Files modified

**`mud/api/persistable.ts` (`PersistableApi`)** — add the `key` param to the four gated methods:

- `static capture(host: Stuff, key?: string): Promise<void>`
- `static materialize(host: Stuff, key?: string): Promise<void>`
- `static hasRecord(scope: string, key?: string): Promise<boolean>`
- `deleteAllFor(owner: string)` — unchanged signature (already keyed on `owner`, which is now the explicit key).

Forward `key` to the logic. Keep `SecurityApi.decorateApiClass(PersistableApi)`.

**`mud/obj/api/PersistableLogic.ts`** — the substantive change:

- Thread `key?: string` through `capture`/`materialize`/`hasRecord` (each still gated `@CallSecurity(PersistableApiCallers)`), forwarding to the module-private impls.
- **`captureImpl(host, key?)`**: compute the record owner as `key ?? host.getPersistenceKey() ?? await ownerOfScope(scope, host)` (explicit key wins; else the stashed key; else today's derivation — preserving singleton/Avatar behavior exactly). When resolved, `host.setPersistenceKey(resolvedKey)`. Write `rec.owner = resolvedKey`, upsert on `(scope, resolvedKey)` via `PersistedRecord.findByScopeAndOwner`. **`assertSingletonScope(scope, host)`** now skips the >1-instance throw when `isMultiInstanceHost(host)`.
- **`materializeImpl(host, key?)`**: `assertSingletonScope(scope, host)` (skips for multi-instance). If `key` given: `host.setPersistenceKey(key)`, restore the single `findByScopeAndOwner(scope, key)` record; if none, no-op. If `key` omitted: keep today's `findByScope(scope)` loop (byte-identical legacy path). Restore body (principal frame + drift guard + hydrate + gated clone + `{ref}` follow) is unchanged.
- **`hasRecordImpl(scope, key?)`**: `key ? (findByScopeAndOwner !== null) : findByScope(scope).length > 0`.
- Keep `ownerOfScope` — now the **default-key derivation** used only when no key is supplied (the singleton auto path).

**`mud/lib/persistence/Persistable.ts` (`PersistableMixin`)** — the host-side changes:

- Add the **key stash**: `protected _persistenceKey: string | null = null`; `getPersistenceKey(): string | null`; `setPersistenceKey(key: string): void`. Declare `getPersistenceKey`/`setPersistenceKey`/`markForRevert` on the `Persistable` interface.
- Add the **multi-instance marker**: a `static multiInstance = false` on the mixin's returned class, plus a typed reader `MixinApi.isMultiInstanceHost(host)`. Content hosts set `static multiInstance = true`.
- Add **`markForRevert()`** (DECISION B): sets `protected _reverting = false → true`; fold into `shouldPersist()` default (`return !this._reverting`).
- **`postRegister` stops auto-driving.** Delete the `hasRecord ? materialize : capture` block; collapse the override to chaining `super.postRegister(context)`. The establishing context decides when to materialize.
- **`applyPopulates` seed gate**: keep the `hasRecord(scope)`-gated seed-skip for **singleton** hosts (byte-identical). For **multi-instance** hosts make `applyPopulates` a **no-op** (bare shell; the establishing context drives seed vs. restore). This is why `DormRoom` seeds fixtures imperatively (DECISION D).
- `cleanupOnDestruct` and the residency sweep continue to call `PersistableApi.capture(stuff)` **with no key** — they reuse the stashed `getPersistenceKey()`.

**`mud/api/mixin.ts`** — add `isMultiInstanceHost` (mirroring `isPersistable`).

**`mud/obj/Avatar.ts` — the migration.** Replace the trailing `await super.postRegister(context)` auto-drive with an **explicit** drive:

```
if (this.shouldPersist()) {
  const key = this.getTemplatePath();            // /obj/Avatar/<playerId> (== today's self-owner)
  if (await PersistableApi.hasRecord(key, key))  // scope === key for a self-owned singleton
    await PersistableApi.materialize(this, key);
  else
    await PersistableApi.capture(this, key);
}
await super.postRegister(context);               // now a no-op drive; preserves the chain
```

`Avatar.save()` → `PersistableApi.capture(this, this.getTemplatePath())`; `Avatar.restore()` → `PersistableApi.materialize(this, this.getTemplatePath())`. Because the key equals today's self-derived owner, the `owner` column and the account-deletion cascade (`deleteAllFor('/obj/Avatar/<pid>')`) stay byte-identical.

### Hazard 2 accounting (every PersistableMixin composer)

- **Avatar (production)** — migrated to explicit login materialize (above). Regression-tested.
- **Test fixtures** (`RoomHost`, `HostChest`, `MovableHost`, `GuestLikeHost`, `AvatarLike`; `SnapHost`, `RecallHost`) — update each call site to the explicit-key form; where a test relied on `postRegister` auto-materialize, call `PersistableApi.materialize(host, key)` explicitly. No other production hosts exist.

### Tests (`lib/persistence/__tests__/`)

- **Multi-instance acceptance:** two hosts sharing one `multiInstance` templatePath, materialized with distinct keys `k1`/`k2`, write **distinct records**; `materialize(host, k1)` restores k1 only; `assertSingletonScope` does **not** throw with two live instances.
- **Singleton guard intact:** two live instances of a non-multi-instance host still throw.
- **Default-key path unchanged:** capture/materialize with no key derive owner via `ownerOfScope` exactly as before.
- **Avatar regression (named acceptance):** clone an avatar, add carried inventory + worn gear + a spawn location, capture, destruct, re-clone, confirm login `postRegister` restores gear + inventory + location.
- **Stashed-key reuse:** materialize with a key, then `capture(host)` (no key) writes to the same `(scope, key)` record.

---

## Phase 2 — The lease + provisioning on the parcel substrate

The lease (a use-grant on `grants[]`), plus the **provisioning** surface the elastic building needs: mint a unit, assign a slot, and enumerate/retire units for reconstitution and gap reuse.

### Files

**`mud/lib/parcel/ParcelRecord.ts`** — type the grant + helpers:

- `export interface UseGrant { kind: 'lease'; holder: string; grantedAt: number; expiresAt: number | null }` (`holder` = the tenant's durable player templatePath; `null` = indefinite).
- Narrow `grants: UseGrant[]` (keep in `persistentFields`).
- Pure helpers: `activeGrantFor(record, holder, now)`, `hasActiveGrant(record, holder, now)`.
- Slot lives in the **extent** (`…/dorms/f<n>-r<p>`, DECISION J) — pure helpers `slotOfExtent(extent)` / `extentForSlot(dormsExtent, floor, pos)` to parse/format. *(Alt: a typed `slot` field — build option.)*

**`mud/obj/ParcelRegistry.ts`** — add gated methods (same `@CallSecurity(AnyOf(FromModule(...ParcelApi), FromTemplate('/obj/api/parcel')))` as existing): `grantUse(extent, holder, expiresAt)`, `revokeUse(extent, holder)`, `hasUseGrant(extent, holder)`, `heldUnitOf(holder)` (scan; note the deferred index), **`childParcelsOf(parentExtent)`** (over `ParcelRecord.findAll` filtered on `parentParcel` — for reconstitution + lowest-free-slot), and **`retire(extent)`** (delete the unit row so its slot frees). Grants are current-state on the row; a grant-event log is a deferred seam.

**`mud/obj/api/ParcelLogic.ts`** — forward each behind `@CallSecurity(ParcelApiCallers)`, degrading gracefully.

**`mud/api/parcel.ts`** — thin `ParcelApi` forwarders: `grantUse`, `revokeUse`, `hasUseGrant`, `heldUnitOf`, `childParcelsOf`, `retire`. Keep `SecurityApi.decorateApiClass`.

Actor is derived from `ExecutionContextApi` inside the Registry for any event; `holder` is passed as data (the *subject* of the grant, resolved by the calling controller).

### Tests (`lib/parcel/__tests__/`)

- Grant → `hasUseGrant` true; `heldUnitOf(holder)` returns it; other player → false. Expiry in the past → inactive. Revoke clears it. Round-trips through `save`/`findByExtent`.
- `childParcelsOf(dormsExtent)` returns exactly the minted unit rows; `retire` removes one; a re-mint reuses the freed extent.

---

## Phase 3 — Content: the elastic `DormWarren`, `Corridor`, `DormRoom` + fixtures, `DormDoor`, `LazyFloorExit`

The two-tier manager and its content classes — the heart of the build.

### Content classes (`mud/domain/eternal/duncan-hall/…`)

- **`DormWarren`** (`DormWarren.ts`) — `SingletonMixin(Warren)`, content, the **two-tier room-collection manager**. Holds `_unitsByKey: Map<unitExtent, MemberStuff>` (rooms = the true Warren members) and `_corridorsByFloor: Map<number, Corridor>` (floor scaffold, outside `_members`); `_hostMember` stays **null**. `ROOMS_PER_FLOOR` = a `dorm.roomsPerFloor` AppSetting (with a `static` fallback).
  - `admit(unitKey)` — cached live room, else `createMemberSerialized()` (clone `DormRoom`) → `addMember()` → D1 restore-or-seed (`hasRecord(DormRoom.SCOPE, unitKey)` ? `materialize` : `installFixtures()` + `capture`) — which **stashes the room's key** (`getPersistenceKey() === unitKey`) → `wireHubExit(room)` → cache → return.
  - `ensureFloor(n)` — cached corridor, else `createCorridor()` (clone `Corridor`) → wire `down`↔below (lobby singleton for n=1, else `ensureFloor(n-1)`; `keepLiveDestination` between clones) → install the `up` `LazyFloorExit` → `ensureFloor(n+1)` → `ensureUnitDoor` each provisioned unit whose slot is floor n (`ParcelApi.childParcelsOf`) → cache → return. **Refuses (impassable) when floor n has no provisioned units** — you can't climb to a non-existent floor.
  - `ensureUnitDoor(unitKey)` — clone a `DormDoor` (set its `unitKey`) into the unit's floor corridor if not already present. Called by `ensureFloor` (every unit on the floor) **and by provisioning** (a unit added to an already-live floor gets its door immediately — otherwise it wouldn't appear until the floor next reconstitutes).
  - **Overrides:** `createMember()` (clone `DormRoom`); **`wireHubExit(m)`** — read the member's floor from its **stashed key** (`slotOfExtent(m.getPersistenceKey())`), `ensureFloor(floor)`, wire the one-way return leg room→corridor (`keepLiveDestination`); `wireHostFixtures`/`unwireHostFixtures` → no-op; `admitArrival()` → trivial no-op (dorms don't population-bud); `reconcile()` (room dormancy-reap + top-down corridor-reap, DECISION I — each reap **drops its entry from `_unitsByKey`/`_corridorsByFloor`**); **`teardown()`** (`super.teardown()` then destruct + clear every corridor + DormDoor in the maps). On warm (`postRegister`), it installs the **lobby's `up` `LazyFloorExit`** → `ensureFloor(1)` programmatically (a dynamic exit, not a static seed).
- **`Corridor`** (`Corridor.ts`) — a non-singleton **clone** template: **non-coordinate `Location`** (like `DormRoom`/`Lounge` — a clone can't hold fixed grid coords; it hangs off the lobby / floor-below by live-ref stair exits, not grid adjacency) + `ExitableMixin` + `VisibleMixin` (generic prose, no `Named`). Carries a one-line **`canEvict → { ok: false }`** (DECISION H — not a Warren member, so it must veto residency itself). No persistence (`persistentFields = []`; floors reconstitute). Holds the floor's `DormDoor`s + the `down` (to the floor below) and `up` (`LazyFloorExit`) stairs.
- **`DormRoom`** (`DormRoom.ts`) — extends `Location` (non-coordinate, no `SingletonMixin`, the `Lounge` precedent). Compose, outermost-first: `PersistableMixin( WarrenMemberMixin( PostRegistrationMixin( AdornableMixin( DetailedMixin( VisibleMixin( ExitableMixin( Location )))))))`. **`static multiInstance = true`** (D1); `static persistentFields = []` (prose rides the Visible/Detailed slices; the Warren back-ref + exits are runtime). **No `Named`.**
  - **Population witness (folded in, no separate mixin):** overrides `onContainableAdded`/`onContainableRemoved` to `super(...)` then `this.getWarren()?.notifyPopulationChange(this)` — the `LoungeMixin` behavior, but `DormRoom` is a concrete class so it overrides directly (no reusable mixin, no naming collision). Drives `reconcile`'s dormancy check.
  - `installFixtures()` (DECISION D) — imperatively `StuffApi.clone` the three in-room fixtures (Bed/Desk/Footlocker) and `ContainmentApi.move` each in. Called once by `admit` on the no-record branch.
- **`Bed` / `Desk`** — `SurfacedMixin(VisibleMixin(DetailedMixin(Thing)))`. **`Footlocker`** — `ContainerMixin(VisibleMixin(DetailedMixin(Thing)))`. Rest/work/store surfaces. No `Named`.
- **`DormDoor`** (`DormDoor.ts`) — `PostRegistrationMixin(SealableMixin(Boundary))` (the `Door` base). A **runtime clone** (cloned per unit by `ensureFloor`, its `unitKey` set at clone time — *not* a seeded singleton). `open()` lease-gates via `ParcelApi.hasUseGrant(unitKey, actor)` (actor from `ExecutionContextApi`). On clone/`postRegister` it installs its **lazy entry exit** into its corridor (destination `resolveDestination() → DormWarren.admit(unitKey)`; `door` = this). No `Named`. (Door impl notes: DECISION E.)
- **`LazyFloorExit`** (`LazyFloorExit.ts`) — a thin `Exit` subclass (sibling of the DormDoor entry exit): the lobby's `up` and each corridor's `up`. `resolveDestination()` → `DormWarren.singleton().ensureFloor(n+1)`. Holds no scaffold logic beyond the delegation.

### Templates (seeds, `mud/seeds/domain/eternal/duncan-hall/`)

- `DormRoom.yaml`, `Corridor.yaml`, `DormDoor.yaml` — class + `hydratorClass` + default generic prose; **no `populates:`** (fixtures imperative; doors/rooms are runtime clones). `dorm-fixtures/bed.yaml`, `desk.yaml`, `footlocker.yaml` — class + default prose. Generic labels only.
- `DormRoom.yaml` is the shared `scope` (the D1 key uses `(DormRoom.SCOPE, unitExtent)`).

### Tests (`domain/eternal/duncan-hall/__tests__/`)

- **D1 on real content (unit test):** clone two `DormRoom`s, `installFixtures` each, `capture(a, '…/f1-r1')` / `capture(b, '…/f1-r2')` → two records, one scope, distinct owners; destruct + re-clone + `materialize` restores each's three fixtures; drift guard keeps them `Bed`/`Desk`/`Footlocker`; no `Named` surface.
- **Reap unit:** an empty room past grace → `reconcile` captures + reaps it; re-`admit` re-materializes from D1.

---

## Phase 4 — The elastic wing: seeds, wiring, reconstitution

Wire the (tiny) durable seed into the world; everything else is runtime.

### Seeds (minimal — nothing provisioned in advance)

- **Lobby**: reuse `lobby.yaml` unchanged; the `DormWarren` installs the lobby's `up` **`LazyFloorExit`** → `ensureFloor(1)` on warm (a dynamic-destination exit, installed programmatically — impassable until floor 1 has provisioned units).
- **`DormWarren`**: the singleton, warmed like `LoungeWarren` (manifest / `PostRegistration`).
- **Templates only**: `Corridor`, `DormRoom` (+ fixtures), `DormDoor`, `LazyFloorExit` — *classes/templates*, no instances.
- **Parent parcel**: a `dorms` parcel (`/domain/eternal/duncan-hall/dorms`), `owner: { kind: group, name: duncan-hall }` — the extent unit parcels subdivide under. **No unit rows** (they're minted at provisioning).
- **No pre-seeded units, corridors, or doors; no `home`/`leave` verbs; no elevator.**

### Reconstitution (the durable set → the runtime building)

On demand, from the durable slot set only:
- Entry begins at the lobby. `up` (`LazyFloorExit`) → `ensureFloor(1)`: clones corridor-1, wires `lobby↔c1` stairs, clones the `DormDoor`s for units whose slot is floor 1 (`ParcelApi.childParcelsOf(dorms)` → parse `f1-*`). `up` from c1 → `ensureFloor(2)` when floor 2 has units. And so on.
- Walking through your `DormDoor` → `admit(unitKey)` materializes the room (D1 restore-or-seed) and wires its return leg. On restart nothing runtime survives; the *same* slot set yields the *same* building shape + the same restored decor.

### Hazard resolutions

- **Re-materialization** — `admit`/`ensureFloor` are the only materialization paths; both ride `Exit.resolveDestination`. The durable side (lobby + parcel rows) holds no runtime ref; `DormWarren`'s maps are rebuilt lazily. An evicted room/corridor dangles nothing.
- **Reap correctness** (DECISION I) — rooms capture-then-reap on emptiness (stashed key); corridors reap **top-down only** (no live room on the floor AND no live corridor above), keeping the stair chain contiguous. `teardown()` reaps everything on HMR/shutdown.

### Tests (`domain/eternal/duncan-hall/__tests__/`)

1. Provision 1 → from the lobby, `up` materializes floor 1; the unit's `DormDoor` appears; `open` (leaseholder) + walk → the furnished room.
2. Fill floor 1 to `ROOMS_PER_FLOOR` → next provision lands floor 2; entry climbs lobby→c1→c2.
3. Non-leaseholder can't `open` their neighbor's door; closed door blocks traversal.
4. Unprovision a mid-floor unit → slot frees → next provision reuses the gap (lowest-free), not a new floor.
5. **Reboot** → nothing runtime persists; the parcel/slot set reconstitutes the identical building; room decor restored from D1.
6. **Empty floor reaps** → occupy a floor-2 room, leave; after grace the room goes dormant and (no live floor above) corridor-2 reaps; re-entry re-materializes both.
7. **Middle floor persists under a live upper floor** → occupant on floor 3, floor-2 rooms empty → corridor-2 does NOT reap.
8. Corridor never reaps while a room on it is live.

---

## Phase 5 — Provisioning + the theme-pick commit

### Provisioning (admin verb, `system` category — DECISION C)

**`mud/obj/command/system/ProvisionController.ts`** (verb `provision <player>` / `lease <player>`): gate the actor to the dorms-parcel owner via `AccessApi` (the landlord). Compute the **lowest-free slot** (`ParcelApi.childParcelsOf(dorms)` → first free `f<n>-r<p>` within `ROOMS_PER_FLOOR`, else a new floor) → `ParcelApi.subdivide(unitExtent, dorms, owner)` (**no backing-zone mint**) → `ParcelApi.grantUse(unitExtent, playerPath, null)`. **No room/floor materialization** — they reconstitute on first entry — **except** `DormWarren.singleton().ensureUnitDoor(unitExtent)` so that if the target floor's corridor is already live, the new door appears immediately (otherwise it's cloned when the floor next materializes).

### Theme content data (content, not a subsystem)

- **`mud/config/dorm-themes.yaml`** — 3–4 authored themes (`spartan`/`cozy`/`studious`/`neon`). Each is a **prose bundle** keyed by role (`room` + `bed`/`desk`/`footlocker`; the `DormDoor`/`Corridor` are shared infrastructure, not tenant-personalizable). Loaded by the controller via a tiny file-read helper (the `parcels.yaml` precedent).

### The commit (`decorate`/`remodel`, `residence` category)

**`mud/obj/command/residence/DecorateController.ts`** (`decorate <themeId>`; re-running is a remodel):

```
actor = context.commandGiver
unit  = await ParcelApi.heldUnitOf(actor.getTemplatePath())
if (!unit || !(await ParcelApi.hasUseGrant(unit.getExtent(), actor.getTemplatePath())))
  return fail("You don't hold this dorm's lease.")     // D6 write-gate
room  = actor.getContainer()  or  await DormWarren.singleton().admit(unit.getExtent())
theme = loadTheme(themeId)
applyBundle(room, theme.room)
for fixture in room.installedFixtures(by role): applyBundle(fixture, theme[role])
await PersistableApi.capture(room, unit.getExtent())   // seal — the record is the prose overlay
```

`applyBundle` validates each field against a `PROSE_FIELDS` allowlist (`shortDescription`/`longDescription`/`details`) then writes via the gated setter. Any non-prose field is refused — the function-fixed / code-trust boundary. Never touches `class`/`hydratorClass`; the spine's drift guard is defense-in-depth on restore.

### Hazard 3 resolution (fixtures vs. overlay)

- Fixtures are content of the room host (Container slice). The commit sets prose on the **live** fixtures then `capture`s — the record carries each fixture's personalized prose. On wake, `restoreItem` clones each fixture from its current template (function always current) then applies the captured prose. Fixtures are never re-seeded via `populates:` (multi-instance no-op); `installFixtures` runs once. No field double-owned. Adding a *new* fixture to `installFixtures` later won't retroactively appear in captured dorms (the documented reset-vs-`populates` tension) — acceptable; noted in docs.

### Tests

- `decorate cozy` sets prose across room + three fixtures; a later `look` shows it. **Dormancy survival:** decorate → reap → re-enter → same theme. **Function-fixed:** a theme naming a non-prose field is refused. Read is public (a visitor sees the decor; can't `decorate`). Remodel overwrites and re-seals.

---

## Phase 6 — Unprovision: revert + free the slot

### End-lease verb (`system` category)

**`mud/obj/command/system/UnprovisionController.ts`** (`unprovision <unit>` / `unlease <unit>`), gated to the dorms owner:

```
await ParcelApi.revokeUse(unitExtent, holderPath)
DormWarren.singleton().dropUnit(unitExtent, { revert: true })  // markForRevert → tear down return leg →
                                                              // removeMember → drop from _unitsByKey → destruct
                                                              // (no recapture, DECISION B); no-op if not live;
                                                              // then pokes reconcile so a now-empty floor can reap
await PersistableApi.deleteAllFor(unitExtent)                  // clear the personalized record
await ParcelApi.retire(unitExtent)                            // free the slot for gap reuse
```

`markForRevert()` makes the destructing room's `shouldPersist()` false, so `cleanupOnDestruct` doesn't re-write the record we delete. `retire` frees the `f<n>-r<p>` extent so the next provision reuses it (same clean extent — the D1 record was just cleared).

### Hazard 4 resolution (revert timing)

- **Vacant/dormant unit** (common): no live room → `deleteAllFor` + `retire` reverts; next provision to that slot hits the no-record branch → default look.
- **Live room**: `markForRevert → destruct → deleteAllFor → retire` guarantees no recapture races the delete. If occupied, eject the occupant to the floor corridor (`ContainmentApi.move`) first — first cut assumes unprovision on a vacant/expired unit.

### Tests

- Provision → decorate → unprovision → re-provision (slot reused) → the room materializes at the **default** look (record cleared, slot freed). Unprovision while a live dormant instance exists → record gone, no phantom recapture.

---

## Phase 7 — Cleanup verbs, discovery, edge polish

- `provision`/`unprovision`/`decorate` help + validators; the three-file wiring (view + controller + seed) for every verb; discovery picks them up.
- Footlocker is functional but **tenant-scoped contents are the deferred "possession" seam** (per-owner loose items) — first cut treats it as decor/functional-empty and flags possession.
- Full server suite green (`pnpm -C packages/server test`), `lint:pm` + gate-string lints green (no `PersistenceManager.get()` leakage; new Apis decorated; logic methods gated).

---

## Phase 8 — Documentation (acceptance) + sweep

Write **`docs/subsystems/residence.md`** documenting:

- The **multi-instance persistence model** (D1): explicit `key`, `owner = key`, the key stash, `multiInstance` relaxing `assertSingletonScope`, `postRegister` no longer auto-driving.
- The **elastic building on the Warren**: `DormWarren` as a two-tier subclass (rooms = keyed members, floors = scaffold); grows on provisioning; lazy materialization via `admit`/`ensureFloor` on `resolveDestination` seams; top-down corridor reap; **zero base `Warren` change**.
- **Provisioning + the stored slot** (extent-encoded `f<n>-r<p>`, lowest-free + gap reuse, `childParcelsOf`/`retire`), reconstitution from the durable slot set.
- The **theme-overlay mechanism**: themes as content data; the commit sets prose via gated setters (prose-only allowlist) then `capture`s; fixtures respawn function + prose overlay via `restoreItem`.
- The **lease** (use-grant on `grants[]`, expiry, revert via `deleteAllFor` + `markForRevert`).
- **Deferred seams** (below).

Cross-link `persistence.md` ("Deferred: multi-instance persistable hosts" → "shipped — see residence.md"), `parcel.md` (grants[] carries the lease; provisioning mints units), `location.md`/Warren (the second Warren subclass — an elastic two-tier consumer), `residency.md` (dorms dorm-when-empty). Run `finalize` to graduate this plan's knowledge and retire the ephemeral docs.

---

## Deferred seams (clean attach points, not stubs)

- **Quest rooms that pin floor 1** — bespoke authored rooms will later keep floor 1 always-present. No code now; the seam is `ensureFloor(1)` being invocable independent of provisioned units (a pinned member).
- **Katie / onboarding** — the diegetic move-in fronts `provision`; the direct admin path built here is what Katie will call. (`docs/staging/eternal-university/npcs/property-manager.md`)
- **Chattel / owned-effects** — furnishing with owned goods (property 0b back half); the Footlocker's tenant-scoped contents attach at the deferred "possession" seam.
- **Hand-authored custom prose** — the next personalization cut; same whole-document commit as `decorate`, writing your own prose. Attaches at `applyBundle` + `PROSE_FIELDS`.
- **The roommate half** — modeled but prose-only until a real roommate/quest cast occupies it.
- **Apartments (multi-room)** — a later build over chattel; the residence/zone model doesn't preclude it.
- **Timed auto-revert on expiry** — `expiresAt` is checked at access; an automatic revert sweep rides the deferred residency reset sweep.
- **A real elevator mechanism** — v1 is stairs; a moving-room / `Switchable` car is its own build.
- **First-class keyed members in the base `Warren`** (DECISION G) — `DormWarren` keeps its own keyed `Map`; promoting into `Warren.ts` (~100 non-breaking lines) waits for a second keyed consumer.
- **A "get me to my building" TPA convenience** — a lobby fast-travel terminal over the born-with-nodes seam; deferred (no bespoke teleport verb — it would skip the key).
- **Door tightening** — auto-close-behind so a follower can't tail the holder through an opened door.

---

## Critical files for implementation

- `packages/server/src/mud/obj/api/PersistableLogic.ts` — the `key` threading, keyed capture/materialize, `assertSingletonScope` relaxation (D1's core).
- `packages/server/src/mud/lib/persistence/Persistable.ts` — key stash, `multiInstance` marker, `markForRevert`, `postRegister` de-auto-drive, multi-instance `applyPopulates` no-op.
- `packages/server/src/mud/obj/Avatar.ts` — the explicit-key login migration (the regression boundary).
- `packages/server/src/mud/obj/ParcelRegistry.ts` (+ `mud/obj/api/ParcelLogic.ts`, `mud/api/parcel.ts`, `mud/lib/parcel/ParcelRecord.ts`) — the lease on `grants[]` + `childParcelsOf`/`retire` + slot helpers (the provisioning/reconstitution surface).
- `packages/server/src/mud/domain/eternal/duncan-hall/DormWarren.ts` — the two-tier manager (`SingletonMixin(Warren)`): `_unitsByKey` + `_corridorsByFloor`, `admit`, `ensureFloor`, dormancy/corridor reap, `wireHubExit`/`teardown` overrides.
- `packages/server/src/mud/domain/eternal/duncan-hall/{Corridor,DormRoom,DormDoor,LazyFloorExit}.ts` — the runtime scaffold (Corridor) + member room (DormRoom, with the folded-in population witness) + lease-gate door + lazy floor exit.
- `packages/server/src/mud/lib/location/Warren.ts` (seams consumed **unchanged**: `createMemberSerialized`/`addMember`/`reconcile`/`notifyPopulationChange`/`teardown`/null-host `wireHubExit`) + `domain/lounge/LoungeWarren.ts` + `LoungeMixin.ts` (the subclass + population-witness precedents).
- `packages/server/src/mud/lib/boundary/Exit.ts` (`resolveDestination` override seam, `keepLiveDestination`, `canTraverse` door gate) — the lazy-exit + live-ref primitives.
- `packages/server/src/mud/obj/command/system/SubdivideController.ts` — the controller precedent for `provision`/`unprovision`/`decorate`.
