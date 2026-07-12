# Persistence spine — requirements

A universal substrate by which any `Stuff` serializes **its own** runtime
state, so that property, inventory, and room contents survive
memory-harvest (residency eviction), logout, and reload — and reassemble
faithfully on materialize. It generalizes the Avatar-only
`snapshotToTemplate` mechanism into one self-persistence model shared by
avatars, rooms, and vessels, with **no special cases**. The governing
constraint is security: hydration bypasses the `setFoo()` call-security
gates, so control over what feeds hydration is the whole boundary — this
substrate closes that by routing capture/restore **through** call-security
as the owning principal and reconstituting items **through** the gated
clone path, never by raw field injection.

Seeded by the property slate's Phase 0b
([property-slate.md](../slates/builds/property-slate.md) §I–§K:
`PersistableHolder`, the serialization boundary contract, seed-then-persist,
possession). Load-bearing subsystem context:
[residency.md](../subsystems/residency.md),
[persistence.md](../subsystems/persistence.md),
[document-store.md](../subsystems/document-store.md),
[call-security.md](../subsystems/call-security.md),
[access.md](../subsystems/access.md).

## Goals

- **Self-serializing objects.** Any `Stuff` opted into persistence can
  capture its own runtime state and restore it, with the capture/restore
  logic **composed per-mixin** — each mixin owns serialization of its own
  slice, aggregated across the mixin chain the way `persistentFields`
  already is.
- **Property survives memory-harvest and logout.** Items a principal
  placed or carries — with their per-instance state and placement —
  persist across residency eviction and session end, and reassemble on
  materialize. The felt outcome: leave a crafted sword on a rack, the room
  evicts, return, the sword is on the rack; log out carrying gear, log in
  wearing it.
- **Persistence rides call-security.** Capture reads through gated
  getters and restore writes through gated mutators, executed **as the
  owning principal**, so persistence has exactly the authority that
  principal has live — no hydration bypass, no separate permission domain,
  no whitelist.
- **Item reconstitution is gated.** On restore, items are re-created
  through the normal gated `StuffApi.clone` pipeline; a persisted record
  can never inject executable code (`class`/`hydratorClass`/`brain`) or
  conjure a template the principal could not legitimately obtain.
- **Records are engine-of-record.** Persisted state lives in a dedicated
  store that has **no player-facing write path**, keyed by **owner** (for
  account-deletion cascade) and **scope** (for materialize), written only
  by trusted persistence code.
- **Avatar is not special.** Avatar persists through the universal
  substrate; the per-player-template `snapshotToTemplate` path is retired.
- **Hosts and content.** Persistence is a property of **hosts** —
  singletons keyed by `templatePath` (an avatar, a home/room, a unique
  container). A host persists its own directly-held state; **non-host
  content nests** in the host's record, and a **nested host is a
  reference** that persists itself. A host-scope also **decomposes by
  owner** — the shell comes from the template, each principal's content is
  its own record.
- **Cascade on account deletion.** Removing a principal is a single keyed
  delete over the records they own; the containment tree reconstructs by
  following host references.
- **Proven on:** an avatar (fields + gear), a persistable room, a generic
  (content) chest nested in it, and a second persistable **host** (a chest
  that owns its own record) to exercise the host-reference boundary.

## Non-goals

Deferred, each with its home:

- **The stewardship gameplay loop** (a home's needs, upkeep, neglect,
  reward). Design-first, separate cycle — see
  [gamification-mirror-thesis] and the residential design memory.
- **Tenure & ownership** — lease, grants, per-item chattel ownership (the
  possession field/index), title-aware `give`/`sell`/`claim`. Property
  slate 0b proper. Persistence here is orthogonal to ownership: a holder
  persists its contents regardless of *who* owns them.
- **Personalization authoring** — editing a room's prose / the
  scoped-authoring envelope. That is authored content on the gated CMS
  path (a template edit), a distinct lifecycle from persisted contents.
- **The compute-allowance persistence cap.** v1 bounds a holder by its
  existing capacity/bulk limit; the allowance-as-persistence-budget is
  property Phase 1.
- **Blueprint-update propagation to live instances.** Objects carry their
  own captured state; class/code changes flow on re-clone, field-default
  changes do not. Full propagation is out of scope.
- **Account-deletion of *authored* content** (templates, scripts a player
  wrote). That is the provenance/archival problem (authorship outlives the
  author; others may depend on it), a separate domain — this build handles
  only the *derived* records.
- **Multi-instance persistable hosts.** In this build a persistable host
  **must be a singleton** (identity = `templatePath`). Hosts that share one
  blueprint across many instances (tract-housing units, Warren constituents)
  need identity from a durable singleton *structure* — the **parcel/extent
  id** in the title registry, or the Warren's persisted topology — which
  arrives with tenure / Warren persistence. (Warren rooms are transient
  today and were never meant to persist, so this is not a present gap.)
  Generic non-unique chests are **not** blocked — they are *content* nested
  in a host, not hosts — see the identity decision below.
- **The player home as an owned/leased space.** A *persistable room*
  proves the mechanism; owned homes adopt it when tenure lands.

## Surface decisions

### Self-serialization, composed per-mixin

**Q:** How is an object's state captured — an external differ, one central
method, or the object itself?
**A:** The object serializes itself, and the logic is **composed
per-mixin**. Each contributing mixin captures/restores its own slice; the
framework walks the mixin chain and composes, mirroring
`MixinApi.getAllPersistentFields`. The **default** per-mixin behavior is
"serialize your declared `persistentFields`" (already exists); mixins with
rich or special state override with custom capture/restore.
**Why:** An external field-differ centralizes knowledge of every mixin's
state and is fragile against template change and rich/structured values.
Per-mixin composition keeps each concern encapsulated in the mixin that
owns it, matches the codebase's aggregation grain, and lets special cases
(a `Container`'s nested contents, a shadow-holder's reversible offload)
live where they belong.

### The record shape — common envelope, per-mixin state

**Q:** Opaque object-owned blob, or a structured record?
**A:** A **light common envelope** around a **per-mixin-composed** state
map, keyed by `(scope, owner)`:

```
PersistedRecord {
  scope: string   // the singleton host's templatePath — identity + base to clone
  owner: string   // whose content → account-deletion cascade key
  state: { [mixinName]: MixinSlice }  // per-mixin; the owner's directly-held
                                      //   content in this host, + the host's own state
}
```

The `Container` mixin's slice holds the host's directly-held content: a
**non-host item** nests as `{ templatePath, state, placement }` (recursing
through non-host sub-containers); a **nested host** is a **reference**
`{ ref: <host scope>, placement }` — not absorbed, because it persists
itself. Materialize walks those references (load host → restore its
content → follow refs to nested hosts → load *their* records). No instance
ids: a host's identity is its `templatePath`; content is distinguished by
position in the tree.
**Why:** The envelope stays uniform so the store and cascade never inspect
a mixin's internals. Keying on the host's `templatePath` (singleton) means
no per-instance id registry. The host/content-reference boundary is what
lets a persistent chest own its own contents while its room merely records
that it *contains* it — so moving the chest carries its contents (its
record is keyed to the chest, not the room), and only the referencing
parent changes. The earlier "divergence + placement + contents" taxonomy
was just individual mixin slices (`Graded`→grade, `Containable`/`Wearable`
→placement, `Container`→content) — the per-mixin model is their general
form.

### Declared state, not a template diff

**Q:** Store only the divergence from the template default?
**A:** No. Each mixin serializes its **declared** persistent state (its
`persistentFields`, via marshallers for rich values), not a computed diff
against the template. Restore clones the base (class + defaults from the
template) and applies the captured declared state through the mixin's
restore path.
**Why:** Diffing against a template baseline is fragile when the template
changes and awkward for structured values. Declared-state capture is
self-contained: field-default template changes cannot corrupt a persisted
instance, while class/code changes still flow on re-clone.

### Security — call-security is the persistence security

**Q:** How is persistence prevented from becoming a field-/spawn-injection
bypass, given hydration skips `setFoo()`?
**A:** Three composed defenses:
1. **Route through call-security as the owning principal.** Capture/restore
   invoke gated getters/mutators through the proxy as the principal, so
   restore has exactly that principal's live authority — an illegitimate
   mutation is rejected on restore exactly as it would be live.
2. **Reconstitute items through the gated clone path.** No raw hydration of
   items; each is cloned via `StuffApi.clone` and can never carry
   `class`/`hydratorClass`/`brain`.
3. **Engine-of-record storage with no player write path** (below) — so the
   record always reflects a legitimate capture; value-integrity (no
   quantity/grade inflation) rests here, while (1) and (2) prevent
   catastrophic injection even under compromise.
The trust bottoms out at **code-trust**: the writers are trusted
engine/wizard-tier `Stuff` methods and mixins, which the code-trust
lockdown already prevents players/protowizards from authoring or
repointing at. Persistence adds no new attack surface — it is exactly as
safe as the setter gates it routes through.
**Why:** Restated in the project's own model: `setFoo()` is the security
model; hydration bypasses it; therefore the only inputs to hydration are
things trusted paths produced, and the player reaches only the gated verbs
in between.

### Storage — a dedicated engine collection

**Q:** Where do records live — the `/home/` document tree, or elsewhere?
**A:** A **dedicated engine collection** (e.g. `holder_snapshots`), written
only by the gated persistence logic, with **no player-facing write API**;
explicitly **not** the player-writable `/home/` document tree. Indexed by
`owner` and by `scope`.
**Why:** `/home/` is the player-authoring namespace; storing the
spawn-list there hands players the edit surface. A dedicated store with no
write verb keeps derived state off any player-reachable path and keeps it
separate from the authored-content tree.

### Avatar is universal — migrate now

**Q:** Keep Avatar's `snapshotToTemplate` and add a separate mechanism, or
unify?
**A:** Unify. Avatar becomes a persistable object like any other; its
capture writes fields **and** gear into one `PersistedRecord`; the
per-player-template `snapshotToTemplate`/`restoreFromTemplate` path is
retired. Done in this build, not staged.
**Why:** The user chose one mechanism over three. It removes the "legacy
per-player-template, migrate later" debt and proves the substrate against
the most demanding consumer.

### Triggers and the eviction seam

**Q:** What triggers capture, and how does it interact with residency?
**A:** One substrate, multiple triggers: **residency eviction**, **logout
/ `onDestruct`**, **autosave**, and **reload** all invoke the same
capture. A persistable holder's `canEvict` changes from "veto because I
have contents" to **capture-then-permit-cull**; on materialize it
re-clones and restores. Non-persistable objects keep today's behavior
(contents veto; empty rooms evict and re-clone fresh).
**Why:** The current `Container` veto keeps a holder-with-contents resident
forever; persistence lets it evict safely. Reload and logout are the same
"destroy-then-faithfully-rebuild" shape, so they share the mechanism
rather than each re-implementing it.

### Seed-then-persist

**Q:** How do first-materialization and subsequent loads differ?
**A:** First materialization seeds via the holder's `populates`/default
loadout and captures the first record; thereafter the **record is
authoritative** and `populates` does not re-run. A holder with no record
(ephemeral, non-persistable) re-seeds every materialization, as today.
**Why:** Matches the slate's seed-then-persist gate; prevents a persisted
holder from duplicating its seed contents on every load.

### What a holder captures (the effort line)

**Q:** Persist every item, or filter?
**A:** Per-holder capture policy. An **avatar** captures **all carried/worn
property** (you carried it — keep it). A **room** captures contents that
carry **persistable per-instance state** (crafted/graded/globbed/
propertied/named — i.e. not a trivially reproducible fresh clone);
objects/mixins may override to force-persist or force-skip.
**Why:** Losing carried inventory on logout is unacceptable; persisting
every dropped generic pebble in a room is wasteful. The divergence signals
already exist and give the filter without a possession field.

### Room-scope decomposes by owner

**Q:** One record per room, or per owner?
**A:** The shell comes from the template; each principal's property in the
room is its **own** `PersistedRecord` (`scope` = the room, `owner` = the
principal), restored **as that principal**. A single-occupant space has
one property record; a shared dorm has one per occupant.
**Why:** A room spans owners (your stuff, a roommate's, the landlord's
fixtures). Restoring the whole room "as one principal" is incoherent;
per-owner records let each restore under its own authority and make
cascade-on-deletion clean.

### Instance identity — hosts are singletons, content nests

**Q:** Three identical chests, a Warren of rooms — all clones of one
template. How does each persist and find its own state?
**A:** A persistable **host must be a singleton**, so its identity is its
`templatePath` — no per-instance ids, no instance registry, no
swap-to-disk. Everything else is **content**, captured inside a host and
distinguished by position in the tree.
- **Generic (non-host) chests, bags, items** are *content*. Three identical
  chests in a room are three entries in that host's content tree,
  differentiated by position and by their own captured per-instance state
  (a name, their contents). They need no identity; they persist as part of
  their host. Moving one between hosts is a normal live move — each host
  persists whatever it currently holds. **In scope for this build.**
- **A host chest** (a unique, singleton container you want to persist in its
  own right) has its own record keyed by its `templatePath`; its room merely
  **references** it (see the record shape). Its contents travel with it.
- **Multi-instance hosts** (tract-housing units sharing a blueprint) are
  **deferred**: their identity comes from a durable singleton *structure* —
  the **parcel/extent id** (title registry) — not a minted instance id.
  Warren rooms are transient and do not persist.

Non-host locations (a public room that isn't a persistable host) don't
persist their contents at all — that's the default, and it's fine: your
carried things persist via **your avatar** (a host), and your placed things
persist via **your home** (a host). Persistence lives in hosts you own.
**Why:** The only thing that ever forced per-instance ids was
*non-singleton persistable hosts*. Requiring hosts to be
singleton-identifiable removes that entirely, and it holds: homes are
bounded and authored (each its own singleton, or parcel-keyed under
tenure), Warrens are transient, and generic containers are content, not
hosts. Identity always comes from a durable singleton structure
(`templatePath` now, parcel later), never minted per instance.

## Constraints

- **Localized scope only.** Persistence operates over a bounded holder (a
  person, a room, a vessel), never a global swap. World-boot keeps raw
  fast-hydration; the gated capture/restore path is the localized one. Its
  cost (replay through gates) is why it is scoped.
- **Restore is atomic per scope** (all-or-nothing) to block partial-splice
  manipulation.
- **A persistable host must be singleton-identifiable** — `templatePath` in
  this build (avatar, authored home/room, unique host). No per-instance id
  scheme. Content is not a host; it nests.
- **Host boundary.** A host's record captures its directly-held content
  down to the next host; a nested host is a reference, never absorbed.
- **Teardown of a host that references nested hosts** needs a policy
  (cascade-destroy or relocate the referenced hosts); the destroy path must
  not orphan a referenced host's record.
- **Actor from context, never a parameter.** The owning principal for
  capture/restore is derived from execution context
  (`ExecutionContextApi`), never caller-supplied — see the gated-API rule
  in [access.md](../subsystems/access.md) and
  [call-security.md](../subsystems/call-security.md).
- **No hydration bypass on the persistence path.** These localized swaps
  must invoke mutators through the call-security proxy as the principal;
  they must not raw-write fields on the unwrapped target.
- **Item reconstitution via `StuffApi.clone` only.** Never raw-instantiate
  a persisted item; never let a record set `class`/`hydratorClass`/`brain`
  (the code-trust lockdown, [access.md](../subsystems/access.md)).
- **Per-mixin composition matches the existing aggregation grain**
  (`getAllPersistentFields`). Default per-mixin capture = declared
  `persistentFields` serialization; the override is a per-mixin hook, not a
  new field-declaration mechanism. Rich values use the existing marshaller
  framework ([quantities.md](../subsystems/quantities.md)/
  [persistence.md](../subsystems/persistence.md)).
- **Avatar migration is session-critical.** Login / logout / autosave must
  not regress; the `snapshotToTemplate` path is removed only once the
  universal path is proven for Avatar in the same build.
- **Module taxonomy.** No new module categories and no free-floating
  helpers — the substrate lands as a mixin (the `Persistable` capability +
  the per-mixin hooks), an `Api`/logic-singleton pair for the gated
  capture/restore/store operations, and the dedicated collection. Follow
  [architecture.md](../architecture.md) and CLAUDE.md's Module Categories.
- **Inter-stuff contract is methods-only**; the record store is reached
  only through its gated Api, never by other `Stuff` poking the collection.
- **The collection needs `owner` and `scope` indices**; account-deletion
  cascade is a keyed delete on `owner`.

## Acceptance criteria

- A `Persistable` `Stuff` round-trips through
  capture → store → evict → materialize → restore, verified by test, with
  its declared state intact.
- **Per-mixin composition** is exercised: a multi-mixin object
  (e.g. `Container` + `Graded` + `Propertied`) captures and restores each
  mixin's slice independently; a mixin's custom capture/restore (a
  `Container`'s recursion; a shadow-holder's offload) is covered.
- **Avatar:** logging in after logout restores fields **and** worn/carried
  gear (no naked login, no lost items); `snapshotToTemplate` /
  `restoreFromTemplate` are removed and no longer referenced.
- **Room + nested (content) chest:** an authored persistable room
  containing a generic chest containing items — the contents (including
  nested) survive eviction and reassemble on entry; the shell is re-cloned
  from the template.
- **Identical content chests differentiate:** two or more chests cloned
  from the *same* template within one host each restore their own distinct
  per-instance state (different names, different contents) onto distinct
  clones, differentiated by position in the host's content tree — no
  instance id (test).
- **Two persistent hosts compose:** a persistable room referencing a
  persistable **host** chest — the room's record records that it *contains*
  the chest (a reference), the chest's *own* record holds its contents, and
  materialize reconstructs the tree by following the reference. Moving the
  host chest to another host leaves its record keyed to the chest (its
  contents travel with it); only the referencing parent changes (test).
- **Room decomposes by owner:** two principals' property in one room
  restore correctly, each reconstituted as its own owner.
- **Security:** a forged/tampered record cannot inject an item the
  principal could not legitimately clone/place, cannot set
  `class`/`hydratorClass`/`brain`, and cannot bypass a gated setter
  (tests). The record store has no player-reachable write path (test).
- **Eviction seam:** a persistable holder with contents evicts
  (capture-then-cull) rather than vetoing; a non-persistable
  holder-with-contents still vetoes and an empty room still re-clones
  fresh (unchanged).
- **Seed-then-persist:** a persistable holder seeds once and does not
  duplicate its seed on subsequent materializations.
- **Account deletion:** a keyed cascade removes every record with
  `owner = <player>` (test).
- **Docs:** [persistence.md](../subsystems/persistence.md) is extended (or
  a sibling subsystem doc added) documenting the self-persistence
  substrate, the per-mixin record, the security model, and the retirement
  of the Avatar per-player-template path.
- Existing residency/eviction behavior for non-persistable objects is
  unchanged (regression check).

## Cross-references

- **Seeding slate:** [property-slate.md](../slates/builds/property-slate.md)
  Phase 0b (§I–§K).
- **Subsystem docs:** [residency.md](../subsystems/residency.md) (canEvict,
  the veto roster, the sweep), [persistence.md](../subsystems/persistence.md)
  (`persistentFields`, marshallers, the Hydrator),
  [document-store.md](../subsystems/document-store.md) (the contrasting
  player-writable tree), [call-security.md](../subsystems/call-security.md)
  and [access.md](../subsystems/access.md) (the gate model, code-trust
  lockdown, actor-from-context), [templates.md](../subsystems/templates.md)
  (clone pipeline, `snapshotToTemplate`/`restoreFromTemplate` being
  retired for Avatar).
- **Design record:** the residential/property design thread and the
  stewardship reframe (project memory: residential-realestate-progression,
  gamification-mirror-thesis, property-substrate).
- **Deferred to:** property Phase 0b (chattel ownership, lease), Phase 1
  (compute-allowance cap), the stewardship-loop cycle, the tenure surface
  (parcel-keyed scope, owned homes).
