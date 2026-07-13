# Residence — dorms, multi-instance persistence, the elastic building

The **residence** subsystem is the player's first home: a **leased,
furnished, theme-personalizable, persistent** dorm room you **walk into**, in
an **elastic building that grows on demand**. It is the *simple rung* of the
residence ladder (the *rich rung* — apartments furnished with owned chattel —
is a downstream build; see `docs/requirements/apartment-requirements.md`).

The load-bearing realization: **a dorm needs almost no dorm-specific code.**
There is **no residence subsystem in the module sense** — no `DormApi`, no
`DormLogic`, no `lib/dorm/`. A dorm is *content* (`DormWarren` + `DormRoom` +
fixtures + `DormDoor` + Duncan Hall) over general substrates: the shipped
[`Warren`](./location.md), [parcels](./parcel.md) + the lease, the
[persistence spine](./persistence.md), and [residency](./residency.md). The
only *engine* change was the spine's **multi-instance-host** generalization
(D1). This doc is the source of truth for that model, the elastic building,
provisioning, and the theme overlay.

Homed at `packages/server/src/mud/domain/eternal/duncan-hall/`.

## D1 — the multi-instance persistence model

The spine keys a `PersistedRecord` on `(scope, owner)` where `scope` is the
host's `templatePath`. That works for a singleton host (Avatar's
`/obj/Avatar/<playerId>` is coincidentally unique-per-host). It **breaks for
a shared template** — many leased dorm rooms clone from one `DormRoom`
template yet must keep distinct persisted state. D1 fixes this generally, in
the spine (`lib/persistence/Persistable.ts`, `obj/api/PersistableLogic.ts`,
`api/persistable.ts`):

- **The persistence key is supplied explicitly by the establishing context.**
  `PersistableApi.capture(host, key)` / `materialize(host, key)` /
  `hasRecord(scope, key)` gain an explicit `key` — the record `owner`. The
  keyed upsert is on `(scope, key)`. When omitted, the owner falls back to
  the host's **stashed key** (so a keyless re-capture — the residency sweep,
  autosave — reuses it), then to the legacy scope-derived owner (Avatar's
  self-owned path, byte-identical to pre-D1).
- **The `multiInstance` marker relaxes the singleton guard.** A host sets
  `static multiInstance = true`; `MixinApi.isMultiInstanceHost` reads it, and
  `assertSingletonScope` skips its >1-instance throw for exactly those hosts
  (they legitimately share one scope, writing distinct `(scope, key)`
  records). For a multi-instance host `applyPopulates` is a **no-op** (the
  establishing context drives seed-vs-restore with the key; a `DormRoom`
  seeds its fixtures imperatively — below).
- **`postRegister` no longer auto-drives persistence.** The mixin provides
  capture/restore; the establishing context decides *when* and *with what
  key*. Avatar drives an explicit self-keyed materialize/capture at login
  (`obj/Avatar.ts`); `DormWarren.admit` drives a keyed restore-or-seed per
  unit. The `{ref}` nested-host walk self-restores in the spine's `cloneHost`
  (a keyless materialize on the fresh clone).
- **`markForRevert()`** sets a host's `shouldPersist()` false so the
  capture-on-destruct backstop writes nothing — the end-lease revert seam
  (a general spine seam, not dorm code).
- A **null optional marshalled field** round-trips as-is (capture skips
  marshalling a null; hydrate skips un-marshalling it) — a latent spine gap
  a full `Location` host (a null `_temperature: Quantity`) surfaced.

**Avatar migrated onto this** (the regression boundary): its key is its own
`templatePath`, equal to the pre-D1 self-derived owner, so the `owner` column
and the account-deletion cascade (`deleteAllFor('/obj/Avatar/<pid>')`) are
unchanged.

## The elastic building — `DormWarren`

`DormWarren` (`SingletonMixin(PostRegistrationMixin(Warren))`, content, the
`LoungeWarren` precedent) is the **two-tier room-collection manager**. It
supplies dorm *policy* over the base `Warren` mechanism; **the base `Warren`
is unchanged**. Duncan Hall's dorms wing starts as **just the ground-floor
lobby** and provisions nothing in advance — it grows on provisioning and
reconstitutes lazily from the durable slot set.

Two tiers:

- **Rooms** are keyed `Warren` members (`_unitsByKey`, keyed by unit parcel
  extent), added via `addMember`, persisted via D1.
- **Floors** are runtime `Corridor` clones (`_corridorsByFloor`), **outside**
  the base `_members` set. Corridors carry `canEvict → { ok:false }` (they're
  not Warren members, so they must veto residency themselves).

`_hostMember` stays **null forever** — the Warren never uses the placement
kernel (`getHost`); entry is driven by `admit`, and vertical travel by
`LazyFloorExit`s. The overrides: `wireHubExit` (wire a room's one-way `out`
return leg to *its floor corridor*, not a host), `wireHostFixtures` /
`unwireHostFixtures` / `admitArrival` → no-ops, and `teardown` (super, then
destruct the out-of-`_members` corridors + doors).

### Lazy materialization

Two `Exit`-subclass seams (content, not base — both cache a within-session
live ref and re-resolve after a reap):

- **`LazyFloorExit`** — the lobby's `up` and each corridor's `up`.
  `resolveDestination()` → `DormWarren.ensureFloor(n+1)`. A floor with no
  provisioned units is **impassable**, gated *synchronously* in
  `canTraverse` off `DormWarren.floorReachable(n)` (the real move path checks
  `canTraverse` before `resolveDestination`).
- **`DormDoor`** — one per provisioned unit, an exit `unit-<pos>` on its
  floor corridor. Starts **locked**; `unlock()` lease-gates via
  `ParcelApi.hasUseGrant(unitKey, actor)` (actor from
  `ExecutionContextApi`) — can't unlock, can't pass (`canTraverse` blocks
  while locked). `resolveDestination()` → `DormWarren.admit(unitKey)`.

`admit(unitKey)` returns the cached live room, else clones a `DormRoom`
(`createMemberSerialized`) → stashes its key → **D1 restore-or-seed**
(`hasRecord` ? `materialize(room, unitKey)` : `installFixtures()` +
`capture(room, unitKey)`) → wires the return leg → caches. `ensureFloor(n)`
clones the corridor, wires `down` to the floor below (lobby for n=1, else
`ensureFloor(n-1)`, `keepLiveDestination` between clones), installs the `up`
`LazyFloorExit`, and clones the `DormDoor`s for the units whose slot is on
floor n.

### Reap (residency dormancy)

`reconcile()` (driven by `DormRoom`'s folded-in population witness —
`onContainableAdded`/`Removed` → `notifyPopulationChange`):

- **Rooms** dorm-when-empty: an empty room `capture`s then reaps (the stashed
  key); re-`admit` re-materializes from D1. (v1 reaps immediately on empty;
  the `LoungeWarren` grace-period is deferred.)
- **Corridors** reap **strictly top-down**: a floor's corridor reaps only
  when it holds no live room **and** no live corridor sits above it — keeping
  `lobby↔c1↔…↔c_top` contiguous (a corridor never reaps under a live room,
  and a middle floor never reaps out from under an occupied floor above).

`teardown()` (HMR/shutdown) reaps everything. On restart nothing runtime
survives; the *same* slot set yields the *same* building shape + the same
restored decor.

## Provisioning + the stored slot

The durable slot `(floor, position)` lives on the minted unit
`ParcelRecord`, **encoded in its extent**: `…/dorms/f<floor>-r<pos>`
(`ParcelRecord.slotOfExtent` / `extentForSlot` — zero new field; the extent
*is* the slot, and already the D1 key + the Warren member key).

`provision <player>` (alias `lease`; `system` category, operator-gated —
`requiresWizard` in v1, the finer dorms-owner `AccessApi` gate a refinement
seam): compute the **lowest-free slot** (`ParcelApi.childParcelsOf(dorms)` →
first free `f<n>-r<p>` within `DormWarren.ROOMS_PER_FLOOR`, reusing gaps left
by unprovision before a new floor) → `ParcelApi.subdivide(unitExtent, dorms,
owner)` (**no backing zone** — the extent is just the key) →
`ParcelApi.grantUse(unitExtent, playerPath, null)` → `ensureUnitDoor` +
`refreshProvisioned`. The room/floor materialize lazily on first entry.

The lease is a **use-grant** on the parcel `grants[]` (`UseGrant {kind:'lease',
holder, grantedAt, expiresAt}`; `ParcelApi.grantUse`/`revokeUse`/`hasUseGrant`/
`heldUnitOf`; `ParcelRecord.activeGrantFor`/`hasActiveGrant`). New parcel
surface: `childParcelsOf` (reconstitution + lowest-free) and `retire` (frees
the slot on unprovision).

## The theme overlay

Personalization is a **theme-pick commit**, applied via the spine's own
clone+restore — **not** a per-room synthetic template, **not** a runtime
shadow, **not** a separate store. The overlay *is* the room's persisted
prose-field state.

- **Theme data** (`mud/config/dorm-themes.yaml`): authored themes
  (spartan/cozy/studious/neon), each a prose bundle keyed by role (`room` +
  `bed`/`desk`/`footlocker`). Loaded by the controller via a private
  file-read helper (the `ParcelSeeder` precedent).
- **`decorate <themeId>`** (alias `remodel`; `residence` category, afforded
  by the room's `Desk` fixture to occupants — the affordance-carrier
  precedent): actor from context; `ParcelApi.heldUnitOf` + `hasUseGrant` gate
  the write (D6); resolve the live room; `applyBundle` the theme across the
  room + its fixtures (by role); `PersistableApi.capture(room, unitExtent)`
  seals it. `applyBundle` validates each field against a `PROSE_FIELDS`
  allowlist (`shortDescription`/`longDescription`/`details`) then writes via
  the gated setter — a non-prose field is refused (the function-fixed /
  code-trust boundary). Read is public (a visitor sees the decor).
- **Fixtures vs overlay** (Hazard 3): fixtures are content of the room host
  (the Container slice). The commit sets prose on the *live* fixtures then
  captures — the record carries each fixture's personalized prose. On wake,
  the spine's `restoreItem` clones each fixture from its **current** template
  (function always current) then applies the captured prose. Fixtures are
  seeded once (`installFixtures`), never re-seeded (multi-instance
  `applyPopulates` no-op). No field double-owned.

## The lease + revert

`enter` (`residence` category, afforded universally by `MobileMixin`): from
inside the building, resolve the giver's held unit (`heldUnitOf`), ensure its
floor + door, `door.unlock()` (lease-gated — a non-holder is refused), and
traverse into the room.

`unprovision <unit>` (alias `unlease`; `system` category, operator-gated):
`ParcelApi.revokeUse` → `DormWarren.dropUnit(unit, {revert:true})`
(`markForRevert` → tear down the live room → no recapture races the delete) →
`PersistableApi.deleteAllFor(unitExtent)` (clear the prose overlay record) →
`ParcelApi.retire(unitExtent)` (free the slot for gap reuse) →
`refreshProvisioned`. The shell re-leases clean; a re-provision to that slot
materializes at the **default** look. A live occupant is ejected to the floor
corridor first (best-effort; v1 assumes a vacant/expired unit).

## Deferred seams

- **The `open <door>` verb + auto-close-behind door tightening** — v1 folds
  the lockable `Door` into the `DormDoor` `Exit` gate (a follower could tail a
  holder through an opened door); a `SealableMixin(Boundary)` fixture + the
  close-behind tightening are deferred.
- **Reap grace period** — v1 reaps a room immediately on empty; the
  `LoungeWarren` `reapGraceMs` grace is deferred.
- **`ROOMS_PER_FLOOR` as an AppSetting** — v1 is a `static readonly` const on
  `DormWarren`; a `dorm.roomsPerFloor` tuning knob is deferred.
- **Finer provisioning gate** — v1 is `requiresWizard`; the `AccessApi`
  dorms-parcel-owner gate lands once the dorms parcel carries a resolvable
  zone resource.
- **Quest rooms that pin floor 1** — bespoke authored rooms will later keep
  floor 1 always-present; the seam is `ensureFloor(1)` being invocable
  independent of provisioned units.
- **Katie / onboarding** — the diegetic move-in fronts `provision`
  (`docs/staging/eternal-university/npcs/property-manager.md`).
- **Chattel / owned effects** — furnishing with owned goods (the Footlocker's
  tenant-scoped contents); the apartment build, property 0b's back half.
- **Hand-authored custom prose**, **the roommate half**, **multi-room
  apartments**, **timed auto-revert on expiry**, **first-class keyed members
  in the base `Warren`**, **a TPA convenience to your building** — all clean
  attach points, not stubs.

## Cross-references

- [persistence.md](./persistence.md) — the spine + the D1 multi-instance-key
  change (shipped here)
- [parcel.md](./parcel.md) — the `grants[]` lease + provisioning mint
- [location.md](./location.md) — the `Warren` (the second elastic subclass)
- [residency.md](./residency.md) — dorm-when-empty
- Requirements: `docs/requirements/dorm-requirements.md`; plan:
  `docs/plans/dorm-plan.md`; the rich rung:
  `docs/requirements/apartment-requirements.md`
</content>
