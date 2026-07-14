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

- **One identity, no modes: `(scope, key)`.** Every host is identified by
  `(scope = templatePath, key)`; the key is resolved uniformly — the explicit
  key wins, else the host's **stashed key** (so a keyless re-capture — the
  residency sweep, autosave — reuses it), else the **scope-derived** key
  (Avatar → self, a titled room → its parcel owner). A **singleton is just
  the degenerate case** where the key derives from the scope; a keyed
  multi-instance host (a leased `DormRoom`) supplies a distinct key. There is
  **no `multiInstance` marker and no singleton-vs-multi branch.**
- **The single invariant: no two live instances share a `(scope, key)`.**
  `assertUniqueKey` fires only when another live sibling has already *claimed*
  this key (its key is stashed) — i.e. precisely when a write would clobber a
  record — not merely because two shells exist. Two clones of a singleton
  resolve the *same* key and collide (the footgun, caught); distinct keyed
  rooms never do. (This replaced the old eager `assertSingletonScope` +
  `multiInstance` relaxation with the real invariant.)
- **`applyPopulates` is a uniform no-op** for *every* persistable host — a
  host is a bare shell at hydration, and its **establishing context drives
  seed-vs-restore with the key**: it seeds born-with content *imperatively*
  on the no-record branch (Avatar's `installDefaultLoadout`, a `DormRoom`'s
  `installFixtures`) then captures, else restores. (A `hasRecord(scope)` gate
  can't disambiguate a keyed instance at hydration, and letting `populates`
  seed would double-seed on restore — so persistable holders never seed via
  `populates`.)
- **`postRegister` no longer auto-drives persistence.** The mixin provides
  capture/restore; the establishing context decides *when* and *with what
  key*. Avatar drives an explicit self-keyed materialize/capture at login
  (`obj/Avatar.ts`); `DormWarren.admit` drives a keyed restore-or-seed per
  unit. The `{ref}` nested-host walk self-restores in the spine's `cloneHost`
  (a keyless materialize that resolves the nested host's scope-derived key).
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
  floor corridor. **The door checks a key, not identity**: `canTraverse(mover)`
  builds the unit's `Lock` (`{keyway, pin-tumbler}` — the keyway a *synchronous*
  lookup off `DormWarren.keywayOf(unitKey)`, a cache refreshed from the durable
  parcel keyway) and admits whoever **presents a matching key** —
  `CredentialApi.presentsKey(mover, lock)`, a sync reachable-wallet scan over the mover's
  implant keychain + any carried physical `Key` (a master ring passes the same
  way). No verb, no unlock step — you carry your key (or it's in your implant)
  and walk through. An empty keyway (unprovisioned / re-keyed) opens for no one.
  (There is **no `enter` verb** — a bare verb was a cold-OS surface; deleted;
  the old leaseholder-identity gate was superseded by the key.)
  `resolveDestination()` → `DormWarren.admit(unitKey)`. See the lock/key
  substrate in [credential.md](./credential.md) + [boundary.md](./boundary.md).

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

`provision <player>` (alias `lease`; the `duncan-hall` content namespace, not `system` — it hardcodes this building): compute the
**lowest-free slot** (`ParcelApi.childParcelsOf(dorms)` → first free
`f<n>-r<p>` within `DormWarren.ROOMS_PER_FLOOR`, reusing gaps left by
unprovision before a new floor) → `ParcelApi.subdivide(unitExtent, dorms,
owner)` (**no backing zone** — the extent is just the key) →
`ParcelApi.grantUse(unitExtent, playerPath, null)` → **key the lock + issue the
key** (`Lock.mintKeyway()` → `ParcelApi.setKeyway(unitExtent, keyway)` →
`CredentialApi.issueKey(tenant, keyway, pin-tumbler)` — a physical brass `Key` in hand
plus an implant-keychain entry, the diegetic "here's your key") →
`ensureUnitDoor` + `refreshProvisioned`. The room/floor materialize lazily on
first entry. Refuses a double-provision (`heldUnitOf` non-null → already
housed). Each provision mints a **fresh keyway**, so **move-out re-keys** —
`unprovision` retires the parcel (the keyway vanishes), and the ex-tenant's key
is dead metal until a new lease re-issues one. The lease is *authority* (the
right to a key); the **key is access** (bearer possession) — lend it, lose it,
it just works.

**Authorization** is at `execute()` (the real boundary — a dialogue
`dispatch` `forceCommand`s the verb, and `forced` bypasses the `requiresWizard`
validator): allowed iff the actor `isWizard` (operator) **or is an agent of
the dorms owner** — a member of the `duncan-hall` group. The agency check does
NOT use `AccessApi.can` (it fails closed for NPCs, which have no `playerId`);
it resolves the owner group ref and checks membership by the actor's `playerId
?? templatePath` (`isDormsAgent` in `ProvisionController`). This is how **Katie
fronts provisioning in the world**: `talk to Katie` → her intake dialogue
`dispatch`es `provision $player` **as Katie**, who is authorized because she is
a member of the `duncan-hall` group. A player never types the raw verb. See
[npc-dialogue.md § dispatch](./npc-dialogue.md) and Katie's sheet
(`docs/staging/eternal-university/npcs/property-manager.md`).

**Authority is owner-conferred, never self-claimed** (the security-critical
point — a self-issued credential is no credential). Katie's membership in the
`duncan-hall` group is **authored data**: `config/groups.yaml` lists her
`templatePath`, seeded idempotently by `GroupSeeder` at boot (the
`ChannelSeeder`/`ParcelSeeder` precedent — a `Group` is a Document, so it's
config-not-`seeds/`). She does **not** enroll herself in her own class code —
that would be circular (an agent "authorized" only because it wrote its own
name into the ledger). The same rule governs her master ring (legitimate master
access to every pin-tumbler dorm lock): it is a physical `Key` `populates`d
into her inventory from `npc/master-ring.yaml` (the serialized `key` credential
carries `masterTechs: [pin-tumbler]`), an owner-authored spawn loadout — not a
credential she issues herself. Her `Katie` class thus carries **no bespoke
authority code**: only `PopulatesMixin` (to accept the loadout) and the
operator-verb `commandContributions`. The `isDormsAgent` `execute()` check
still earns its keep — it scopes the *forced-dispatch* capability so a random
or misauthored NPC's `dispatch provision $player` can't provision — but it now
reads an honestly-conferred ledger.

Because these are **content** verbs, their affordance is content-owned too:
the operator escape hatch (the raw `provision`/`unprovision` surface) is
afforded by **Katie's `commandContributions.environment`** — she *is* the
front desk, so a co-located operator sees the verbs; both views carry
`requiresWizard` so only an operator (wizard) sees them, and the real
dorms-owner gate stays at `execute()`. The core `AuthorMixin` no longer
references Duncan Hall at all — a content command is afforded by its content,
never by a core mixin.

The lease is a **use-grant** on the parcel `grants[]` (`UseGrant {kind:'lease',
holder, grantedAt, expiresAt}`; `ParcelApi.grantUse`/`revokeUse`/`hasUseGrant`/
`heldUnitOf`; `ParcelRecord.activeGrantFor`/`hasActiveGrant`). New parcel
surface: `childParcelsOf` (reconstitution + lowest-free) and `retire` (frees
the slot on unprovision).

## The shell personalization (theme overlay)

This is the **residence-general shell-personalization mechanism**, not a dorm
one-off. The governing model: personalization is a **sealed commit at the
moment a thing enters your control**, prose-only, function fixed. It has two
triggers by *what* you personalize — **owned goods** personalize at their
**craft/buy** moment (the maker's-mark + owner prose, chattel — the apartment
path), and the **room/shell** (not crafted) personalizes at the **move-in
commit**. This section is the shell half; apartments reuse the same core one
rung up.

A style is a **theme-pick** — one of N authored prose bundles — applied via
the spine's own clone+restore (the overlay *is* the room's persisted
prose-field state; **not** a per-room synthetic template, a runtime shadow, or
a separate store). Theme-pick is a **menu, never a typed verb** (the same
"NPCs do their jobs / no cold-OS surface" line as provisioning).

The style set is **by vocation**, not decorating mood — a university dorm
dressed to the trade you're training for (miner / farmer / nautical /
merchant / medic / military / scholar), so the space says *what you're
becoming*. The same bed/desk/footlocker reads completely differently by
trade. (Genres — sci-fi / horror / … — are the holodeck's job, pure aesthetic
play, not a grounded first home. **Near-future**: derived from your char-gen
major — Katie just *knows*, no move-in menu — with `remodel` staying the
pick.)

- **The core — `DormThemes` (`domain/eternal/duncan-hall/DormThemes.ts`)**, a
  named value-object (not an Api/subsystem): `ids()`/`labelOf()` (the menu) +
  `applyTo(room, themeId)` — apply the theme's prose bundle across the room +
  its fixtures (by role) through a `PROSE_SETTERS` allowlist
  (`shortDescription`/`longDescription`), then `PersistableApi.capture(room,
  room.getPersistenceKey())` to seal. A non-prose field throws
  `DormThemeError` — the bundle is refused **whole**, nothing written (the
  function-fixed / code-trust boundary). Theme data is authored in
  `mud/config/dorm-themes.yaml` (the vocation set, keyed by role).
- **Move-in → Katie** (the diegetic front): her intake dialogue's style
  choices each `dispatch` `provision $player --theme <style>`; `provision`'s
  `--theme` option admits the room and calls `DormThemes.applyTo` **as the
  institution** (already authorized — best-effort, a bad style never voids the
  lease). The dialogue tree *is* the menu.
- **Remodel → a local prompt** (`remodel` verb, `duncan-hall` content namespace, afforded
  by the room's `Desk` to the occupant): standing in your own room, it opens a
  `PromptApi.choice` wheel of `DormThemes.ids()` and applies the pick. Gated by
  holding the lease on the room you're in (D6). **No typed `decorate <theme>`
  verb** — theme-pick is the menu; you never type a style id. Read is public
  (a visitor sees the decor).
- **Fixtures vs overlay** (Hazard 3): fixtures are content of the room host
  (the Container slice). The commit sets prose on the *live* fixtures then
  captures — the record carries each fixture's personalized prose. On wake,
  the spine's `restoreItem` clones each fixture from its **current** template
  (function always current) then applies the captured prose. Fixtures are
  seeded once (`installFixtures`), never re-seeded (`applyPopulates` is a
  uniform no-op — holders seed imperatively). No field double-owned.
- **Deferred:** **custom prose** (writing your own room/item descriptions) —
  a light player input (a `PromptApi.text` box / a summoned pane), validated
  prose-only and sealed by the same `capture`; **not** the CMS (that's
  world-building — new rooms/NPCs/code; this is personal expression on a space
  you hold). The **apartment/home shell** reuses `DormThemes`-shaped core; the
  **owned-goods** personalization (prose at craft/buy) is the chattel path
  (property 0b).

## Entering + the lease + revert

**Entry is just walking** — there is no `enter` verb. You climb the stairwell
to your floor's corridor and go through your own door; it opens for whoever
**presents a matching key** (the sync `CredentialApi.presentsKey` scan over your implant
keychain + carried physical key) and blocks the keyless.

`unprovision <player>` (alias `unlease`; `duncan-hall` content namespace, same dorms-agent
authorization as `provision`, so Katie fronts move-out via a `dispatch
unprovision $player`): resolve the tenant's held unit (`heldUnitOf`, symmetric
with `provision`) → `ParcelApi.revokeUse` → `DormWarren.dropUnit(unit,
{revert:true})` (`markForRevert` → tear down the live room → no recapture
races the delete) → `PersistableApi.deleteAllFor(unitExtent)` (clear the prose
overlay record) → `ParcelApi.retire(unitExtent)` (free the slot for gap
reuse) → `refreshProvisioned`. The shell re-leases clean; a re-provision to
that slot materializes at the **default** look. A live occupant is ejected to
the floor corridor first (best-effort).

## Deferred seams

- **The `open <door>` verb + auto-close-behind door tightening** — v1 folds
  the lock into the `DormDoor` `Exit` gate (a follower could tail a
  holder through an opened door); a `SealableMixin(Boundary)` fixture + the
  close-behind tightening are deferred.
- **Manual `lock`/`unlock` verbs** (leaving your door open for a friend) — v1
  is auto-locked doors gated by key possession; the manual verbs are a
  follow-on.
- **Keycard / electronic locks as a live second technology** — the `keycard`
  `LockType` exists in the vocabulary but no door uses it yet (a
  downtown/corporate build); dorm doors are `pin-tumbler` brass.
- **Cross-restart keychain persistence + reclaiming a dead key** — the implant
  keychain is session-durable v1 (the physical key is the cross-restart form);
  an ex-tenant keeps their (dead) physical key rather than returning it.
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
