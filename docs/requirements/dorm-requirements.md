# Dorms — requirements

A dorm is a player's universal first home: a **leased, furnished,
theme-personalizable, persistent** single room. This build delivers it
as the onboarding prerequisite — everything the later enrollment flow
needs to hand a new player a room they can make theirs — while
deliberately stopping short of the diegetic move-in experience (the
Katie NPC) and the owned-goods economy (chattel / apartments).

The load-bearing realization behind this build: **a dorm needs almost
no dorm-specific code.** Its furniture is the university's (invariant,
respawned from templates); its personalization is tenant-scoped room
prose keyed on the unit's parcel; and it sits in an **elastic building
that grows on demand** — an ordinary **`Warren`** (the shipped
room-collection substrate) that starts as just the ground-floor lobby
and buds floors + rooms as dorms are **provisioned**, provisioning
nothing in advance. `DormWarren` is a content subclass, exactly as
`LoungeWarren` consumes the Warren. So the only *engine* work is the
persistence spine's deferred **multi-instance persistable hosts** (D1,
keyed on the unit parcel); the spatial side is content over the Warren,
and the base `Warren` needs **no changes** (verified). Everything else
is content over existing substrates (parcels/lease, the spine,
residency, the Warren).

Seeded by [dorm-warren-slate.md](../slates/builds/dorm-warren-slate.md)
and [property-slate.md](../slates/builds/property-slate.md) §K, and by
the 2026-07-12 apartment reframe (project memory:
`residential-realestate-progression`, `persistence-spine-build`). Rides
the shipped [persistence spine](../subsystems/persistence.md),
[parcels](../subsystems/parcel.md) 0a, [residency](../subsystems/residency.md),
and the clone/[Hydrator](../subsystems/templates.md) pipeline.

## Goals

- **The persistence spine supports multi-instance hosts.** Many rooms
  (and, later, many furniture instances) share one template yet keep
  distinct persisted state, keyed by an explicit per-instance key
  supplied at materialization — not by re-using `templatePath` as
  identity.
- **A dorm is a leased place, minted on provisioning.** Provisioning a
  dorm mints a unit parcel (assigned the lowest-free slot, reusing gaps
  left by prior tenants), grants the tenant a lease (use-grant + expiry +
  revert), and — lazily, on first entry — materializes the room and its
  floor. Access follows the lease. Nothing is provisioned in advance.
- **A dorm materializes furnished** from a shared `DormRoom` template
  plus **three** in-room fixture templates (bed, desk, footlocker) — all
  invariant, university-owned, respawned from template. Its **door is a
  corridor-side lockable boundary** (the lease "keys"), not an in-room
  fixture.
- **A dorm is a place you walk to, in a building that grows on demand.**
  Duncan Hall's dorms wing starts as just the ground-floor lobby;
  provisioning buds a floor (a corridor) and a room. Rooms fill a floor
  (~12–15, tunable), then the next floor is created; floors and corridors
  are **runtime** (reap-when-empty, reconstitute from the durable slot
  set). You reach your room by walking (lobby → stairs → your floor's
  corridor → unlock your door → step in), never a teleport. Only the
  **durable slot set + each room's persisted state** survives restart;
  the building shape reconstitutes.
- **A dorm is theme-personalizable.** At provisioning (and re-doable via
  a remodel), the tenant picks from an authored set of **themes**; the
  choice seals the room's whole look — a prose bundle across the room
  and its fixtures. Function is fixed by the backing class; only prose
  fields are ever touched.
- **A dorm persists.** The room dorms-when-empty (residency) and
  re-materializes with its theme intact; personalization is keyed on the
  unit parcel and **reverts** when the lease ends (next tenant gets a
  clean room).
- **No dorm subsystem exists.** No `DormLogic` / `DormApi` / `lib/dorm/`
  orchestrator. Dorms are content (`DormWarren` + `DormRoom` + fixtures +
  `DormDoor` + Duncan Hall) over general substrates — `DormWarren`
  subclasses the shipped `Warren`, exactly as `LoungeWarren` does. The
  only new engine code is the spine's multi-instance change (D1); the
  base `Warren` is unchanged.
- **A `docs/subsystems/` page** documents the residence + multi-instance
  persistence model.

## Non-goals

- **The Katie NPC + the enrollment/assignment conversation.** The
  diegetic move-in experience lands with onboarding; this build's
  provisioning is a direct, non-Katie assign/enter path that Katie will
  later front. (staging: `eternal-university/npcs/property-manager.md`)
- **Chattel ownership, owned furniture, and bringing-your-own-effects.**
  A dorm's furniture is the university's; nothing here requires owning a
  movable good. Chattel-title (property 0b's back half) + furnishing
  with owned goods is the next build.
- **The apartment** (empty shell furnished with owned goods, the
  material-economy loop) and **single-family homes** — later housing
  builds on top of chattel.
- **Hand-authored custom prose.** The first cut is **theme-pick only**;
  writing your own descriptions on the room (the deeper personalization,
  still a whole-document commit) is deferred to the next cut.
- **The roommate occupant.** The room is modeled two-sided, but only the
  player's half is real; the roommate's half is **prose** until a real
  roommate/quest cast occupies it. Proc-gen roommate / Wren / the frozen
  Dunny room are deferred narrative content.
- **Rent economics, moving, services, the stewardship/compute loop,
  vacancy listings, media/illustration in personalization** — all parked
  (project memory: `residential-realestate-progression`).
- **Multi-room floorplans.** A dorm is a single room; the residence/zone
  model should not preclude multi-room apartments later, but multi-room
  is not built here.

## Surface decisions

### D1 — The unified persistence-key pattern (the only engine change)

The spine today re-uses `templatePath` as a host's record identity —
which works only because Avatar uses a per-player template, so its path
is coincidentally unique-per-host. That conflates *clone source* with
*persistence identity* and breaks for shared templates. Fix it once,
generally:

- **The persistence key is always supplied explicitly by the
  establishing context.** `PersistableApi.materialize(host, key)` /
  `capture(host, key)` gain a `key: string` param, written to the
  record's existing `owner` column (keyed `(scope = shared templatePath,
  owner = key)`; no schema change). The key is stashed on the host so
  re-capture-on-evict reuses it.
- **`clone()` is untouched.** **`PersistableMixin.postRegister` stops
  auto-driving persistence** (the implicit restore-from-templatePath
  goes away); the mixin provides capture/restore, the establishing
  context decides when and with what key.
- **Uniform supply:** login → `materialize(avatar, playerKey)`,
  residence-entry → `materialize(room, parcelKey)`. One path, no
  implicit case. **Avatar migrates onto it** (small: explicit
  materialize at login; it may keep its per-player template for now —
  this is step one of retiring that legacy).
- **The key = the entity the instance's state is scoped to.** A leased
  dorm room → its **unit parcel** (so it reverts on lease-end by
  clearing that record). (Owned chattel → its owner; that's build 2.)

### D2 — No dorm subsystem; dorms are content over general substrates

No `DormLogic`, `DormApi`, or `lib/dorm/` orchestrator — a bespoke
materializer is a Warren by another name. A dorm is: a `DormRoom` +
fixture templates + Duncan Hall content, over parcels/lease
(assignment = a lease record), the persistence spine (personalization +
dormancy via D1), residency (dormant-when-empty), and the general
command/write layer (provisioning + the theme commit). The provisioning
and remodel verbs are ordinary command controllers, not a logic
singleton.

### D3 — Personalization = a theme-pick commit, applied via hydration

- **Data model:** a shared reusable `DormRoom` template + a per-principal
  **prose overlay** applied at materialization. **Not** baked into a
  per-room template (the rejected synthetic template), **not** a runtime
  shadow (personalization is always-on and identical for every viewer —
  it's data, not a per-viewer/transient condition), **not** a separate
  customization store. The overlay *is* the room's persisted prose-field
  state, carried by the spine's own clone+restore (hydrate the template,
  then the spine restores the overlay).
- **The commit (first cut = theme-pick only):** picking an authored
  theme writes the overlay (the theme's prose bundle across the room and
  its fixtures) and **seals** it; re-doing it is a **remodel**. A theme
  is content data. Experimentation is free (uncommitted); the commit is
  the sealed act.
- **Function is fixed by the backing class** (a `DormRoom` fixture never
  changes what it *is*); the commit may only set **prose fields**
  (short/long/detail) — validated prose-only, the code-trust boundary.

### D4 — The clone manifest (all runtime, nothing pre-seeded)

Everything spatial is a **runtime clone** reconstituted on demand from
the durable slot set — only the lobby and the class templates are
seeded. Templates, chosen by the rule *real Stuff where something
interacts with it*:

- `DormRoom` (`multiInstance`; `Adornable` walls) — one clone per
  provisioned unit, keyed by its unit parcel, persisting the tenant's
  prose via D1.
- `Bed` / `Desk` (`Surfaced`), `Footlocker` (`Container`) — the three
  in-room fixtures, cloned into each room by `installFixtures`.
- `Corridor` (`Exitable`) — one clone per **floor**, budded when a floor
  is needed; runtime (reaps when empty, `canEvict → false` while live),
  no persistence.
- `DormDoor` (`Boundary`, lockable) — one clone per **provisioned unit**,
  on its floor's corridor; lease-gated, the walkable entrance. Cloned by
  `ensureFloor`, not seeded.
- **No** `Named` on any of them (generic → `Visible.shortDescription`).
- **Chair and lamp are flavor**, not cloned. The **roommate's half is
  prose** (furniture follows occupancy). Bespoke quest rooms (victim's /
  Dunny's) — which will pin floor 1 to always-exist — are authored
  separately, later.

### D5 — Lease = minimal use-grant + revert; revert clears the overlay

Assignment is a minimal property-0b lease: a use-grant on the unit
parcel with expiry + revert, access = keys. **Ending the lease clears
the parcel-keyed personalization record**, so the shell respawns clean
for the next tenant. Rent economics stay deferred.

### D6 — Three-tier permissions

Function (class/template) = the author/landlord's, governed, invariant
to tenants. The prose overlay = the principal's — **write** is gated by
holding the lease on the unit; **read is public** (visitors see the
decor). The editable **surface** is tenure-scoped; at the dorm tier,
first-cut, that surface is **theme-pick only**.

## Constraints

- **No `Named`** on generic dorm objects (memory:
  named-mixin-proper-names-only).
- **Owner/actor from `ExecutionContextApi`**, never a parameter; the
  theme commit is gated by the acting player holding the unit's lease
  (memory: gated-api-actor-from-context).
- **The one engine change lives in the existing persistence spine**
  (`lib/persistence/`, `PersistableApi`/`PersistableLogic`,
  `PersistableMixin`) for D1. The walkable building reuses the shipped
  `Warren` (`lib/location/Warren.ts`) via a `DormWarren` content
  subclass — **the base `Warren` is unchanged**. **No new `lib/dorm/`
  subsystem, no `DormApi`, no `DormLogic`.** Content lives in the content
  tree (Duncan Hall + `DormWarren`/`DormRoom`/fixtures/`DormDoor` +
  themes).
- **`clone()` is not modified.** The multi-instance capability is the
  explicit `key` on `materialize`/`capture` + `postRegister` ceasing to
  auto-drive.
- **Avatar persistence must not regress** — the spine change migrates
  Avatar onto explicit-key materialization; existing Avatar
  save/restore behavior (gear + inventory + location) stays intact.
- **Go through the Api layer** — reconstitution via gated `StuffApi`,
  persistence via the spine only (no bespoke store), commit via the
  gated write path (memory: no-logic-module-imports).
- **Provisioning/remodel verbs** are ordinary controllers under an
  existing/new command category — command-routing, not a logic
  singleton.

## Acceptance criteria

- **Multi-instance persistence works and is tested:** two players'
  dorm rooms clone from the same `DormRoom` template but keep distinct
  persisted state (distinct parcel-keyed records);
  `materialize(host, key)` restores the correct record.
- **Avatar still persists** through the migrated explicit-key path
  (gear + inventory + location survive logout) — regression-tested.
- **Provisioning grows the building:** the first provision buds floor 1
  (a corridor) and mints a unit; the tenant can **walk into it** — lobby
  → stairs → their floor's corridor → unlock the lease-gated door → step
  into the room, which materializes furnished (three in-room fixtures)
  from the shared template. A **non-leaseholder cannot unlock the door**.
- **Floors fill then bud:** provisioning past `ROOMS_PER_FLOOR` on a
  floor creates the next floor; unprovisioning frees a slot the next
  provision reuses (a gap) before a new floor is made.
- **The building reconstitutes:** after restart nothing runtime persists,
  yet the same provisioned slot set yields the same building shape and
  each room's decor is restored from its D1 record.
- **Empty floors reap:** an emptied floor's corridor reaps (top-down
  only — never under a live room or a live floor above) and reconstitutes
  on re-entry.
- **Picking a theme seals the room's look** (prose across room +
  fixtures); the theme **survives the room going dormant and
  re-materializing** (evict → re-enter → same theme).
- **Ending the lease reverts the room** — the parcel-keyed
  personalization record is cleared; a re-assigned unit materializes at
  the default look.
- **Function is fixed:** the theme commit cannot change a fixture's
  class/function; only prose fields change (validated) — tested.
- The three in-room fixtures **render generic** (article, no proper name).
- **Full server suite green.**
- A **`docs/subsystems/`** page documents the residence + multi-instance
  persistence model, the theme-overlay mechanism, and the deferred seams
  (Katie/onboarding, chattel/owned-effects, hand-authored prose, the
  roommate half, apartments).

## Cross-references

- Seeding slates: [dorm-warren-slate.md](../slates/builds/dorm-warren-slate.md),
  [property-slate.md](../slates/builds/property-slate.md) §K
- Subsystem docs: [persistence.md](../subsystems/persistence.md)
  (the spine + the multi-instance-key change),
  [parcel.md](../subsystems/parcel.md) (self-home / lease ownership),
  [residency.md](../subsystems/residency.md) (dormancy),
  [templates.md](../subsystems/templates.md) (clone + Hydrator),
  [mixins.md](../subsystems/mixins.md) (fixture mixins),
  [location.md](../subsystems/location.md) / [zone.md](../subsystems/zone.md)
  (the room/zone)
- Project memory: `residential-realestate-progression` (the apartment
  reframe + this build's decisions), `persistence-spine-build` (the
  unified explicit-key pattern)
- Deferred experience: `docs/staging/eternal-university/npcs/property-manager.md`
  (Katie)
</content>
