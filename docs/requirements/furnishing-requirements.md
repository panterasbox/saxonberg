# Furnishing — owner-based persistence and the furnishable residence

A residence you **furnish with goods you own**, that stay where you put
them. Today a room persists its *contents* in its own record, so a chair
you carry into your dorm becomes, durably, part of the room — indexed
under the room, restored by the room, and gone with the room. That is
wrong in three directions at once: it loses the connection between a good
and its owner, it means a guest's dropped possessions ride a stranger's
record, and it makes "move house" impossible in principle.

This build introduces the second persistence scope — **owned chattel
persists with its owner, carrying a `place`** — and the **furnishable
residence** that consumes it: a multi-room, leased, empty-at-move-in
floorplan whose character is the objects you played for.

The engine work is deliberately small, because the title half already
shipped. [Chattel](../subsystems/chattel.md) landed with the general
store: per-instance `_chattelId`, a gated registry, `ownerOf`,
`stamp`/`transfer`/`release`, and an append-only chain-of-title. What is
missing is not *who owns this* but **where the owner keeps it** — and
that gap is what makes a furnished home impossible today.

**Residence-generic, not apartment-specific.** The substrate is a
*furnishable residence*; an apartment is its first consumer and a
suburb house ([Hinkley Hills](https://gitlab.com/panterasbox/saxonberg),
build-2, in flight) is intended to be its second without re-deriving
anything. Build-2 explicitly non-goals house interiors, furnishing and
chattel-title and defers them here, so this doc owes it a substrate
rather than an apartment.

Seeded by [property-slate](../slates/builds/property-slate.md) §I
(chattel & persistence — the capability-vs-relation correction, the
seed-then-persist handoff), §J (custody vs. title verbs), §K (rent vs.
own, the lease). Rides the shipped
[persistence spine](../subsystems/persistence.md) `(scope, key)` model,
[residence](../subsystems/residence.md) (the dorm — the simple rung and
every content precedent here), [chattel](../subsystems/chattel.md),
[parcel](../subsystems/parcel.md) (`subdivide`/`grantUse`/`revokeUse`/
`hasUseGrant`/`retire`, all shipped), and
[residency](../subsystems/residency.md).

## Goals

- **Owned chattel persists with its owner, not with whatever room it is
  standing in.** Each owned good carries a **`place`** — a residence room
  identity, `inventory`, or `storage`. A host's content-capture **skips
  owner-stamped goods** (they persist owner-side); the owner's record
  carries them wherever they sit. The two scopes compose over one spine
  and never both own the same field.
- **`storage` is owned-but-unplaced, and it is the default.** No
  warehouse object, no homeless special case. Eviction and lease-end
  force `place → storage` and **never destruct** a good that is titled to
  someone. Moving house is re-placing from storage.
- **A guest's dropped possessions stay theirs.** Dropping an owned good in
  someone else's residence keeps it titled to the dropper and persisting
  on the dropper's record, with `place` naming the foreign room. It
  re-appears there when that room next materializes — "I left my book at
  a friend's" — and is recoverable by its owner. The host's record never
  carries it.
- **`ownerOf` gains the parcel rung.** Resolution becomes
  `stamp ?? parcel-extent ?? authorOf`: a good whose template path falls
  under a parcel's extent resolves to **that parcel's owner**. So a
  landlord owns the fixtures in a unit they let, and a fixture carried
  off stays titled to the parcel — displacement is theft, recoverable —
  while every good outside a parcel extent keeps today's author fallback
  unchanged.
- **A furnishable residence is a multi-room leased floorplan.**
  Provisioning mints a unit sub-parcel of the building parcel, grants the
  tenant a lease (the dorm's shipped use-grant), and materializes the
  unit's rooms **empty of movable goods** — only built-in fixtures, seeded
  from `populates:` through the shipped seed-then-persist handoff. Access
  follows the lease.
- **Four room archetypes ship as template rows: bedroom, kitchen,
  bathroom, living.** Each is a distinct template path over one generic
  room class, differing in prose and in the built-in fixtures it seeds.
  They are content, editable without code.
- **A room can carry room-level state.** Room state is a first-class part
  of a room's record, not merely its contents — so an archetype that later
  earns behavior has somewhere to keep it, without a migration.
- **Furnishing rides the shipped containment verbs, made title-aware.**
  Placing an owned good sets its `place`; taking it back returns it.
  Custody and title stay separate axes, and no verb ever changes what a
  thing *is*.
- **A `docs/subsystems/` page** documents owner-based persistence (the
  `place` model, storage, the skip rule, the re-placement overlay) and the
  furnishable residence as the rich rung, cross-linked with the dorm.

## Non-goals

- **The residence *ladder*.** No ascent rule, no rung gating, no
  condition model. Stewardship makes "the condition of what you already
  hold" the binding gate for moving up, and there is no condition model
  anywhere — that is the
  [stewardship build](../slates/builds/stewardship-slate.md)'s own work.
  This build ships **a rung**, and guarantees only that a room *can carry*
  the state stewardship will define.
- **Land use.** The closed vocabulary typing what a parcel admits is
  stewardship's. Room archetypes here are content identity, not a typed
  gate on what may be placed where; a bathroom that accepts a chest
  freezer is silly but permitted in v1.
- **Room archetype *classes* and their behavior.** Archetypes ship as
  template rows over one class. Promoting a bedroom to `class:
  /lib/residence/Bedroom` later is a one-line template edit — the
  template path is the stable identity — so nothing here forecloses it and
  nothing here pays for it early.
- **Real-world parity / the mirror.** Driving in-game room state from
  real-world sensor feeds is a product thesis of its own, with an
  anti-cheat surface (an assertion the kernel did not witness) that wants
  its own design. It gets a slate; it does not get requirements here.
  This build's only obligation to it is the room-level-state goal above.
- **`claim` and `sell` verbs.** [chattel.md](../subsystems/chattel.md)
  calls a player-facing trade surface "a thin later add" over the shipped
  `transfer` primitive, and retail already ships `buy`/`consign`/
  `reclaim`. Furnishing needs neither.
- **Prose-on-owned-items personalization.** Annotating *your* furniture
  ("my film-school desk") is a whole-document write on expressive prose
  fields — a follow-on slice that needs this build first.
- **Rent economics.** Payment schedules, metered sub-allowances, sublease
  markets, the proprietor-as-Business P&L. The lease *relationship*
  (use-grant + revert) is in scope; the economics are the economy layer's
  (property §K).
- **Owned homes.** The rung above the lease — title to the shell rather
  than a use-grant. The custody/title axis already carries it; this build
  is the top *leased* rung.
- **Co-lease / roommates.** One leaseholder per unit in v1; a use-grant of
  a use-grant (property §K sublet) defers.
- **Fungible-good ownership.** Coins, bulk materials and globs stay
  owned-by-possession — `ChattelApi` already refuses to stamp a glob, and
  nothing here changes that.
- **The sandbox portal as content.** A `SandboxCrossing` is already
  chattel-identified and placeable, so a furnished residence can contain
  one the day this ships. Seeding a residential skin of it is a content
  act, not this build's.

## Surface decisions

### D1 — `place` is a field on the good, not a registry

Where an owned good lives is a **property of the good**, carried in its
persisted state: `place: string` — a room identity, `'inventory'`, or
`'storage'` (the default). It is not a second registry.

The reasoning is the property-slate §I guardrail applied one turn on.
Ownership is a *relation* and therefore lives in a registry
(`ChattelRegistry`, shipped). But *where the owner keeps it* is not a
relation between two principals — it is an attribute of the good, one
value, always present, changing on the same acts that move custody. A
registry would buy nothing and would need reconciling against the
containment tree it duplicates.

Writes are gated to the same authority that already gates chattel: the
good's `place` is set through the chattel logic singleton, never
author- or player-writable as data, so it cannot be forged into someone
else's residence.

### D2 — Host capture skips owner-stamped goods

`captureContainer` filters goods whose `ownerOf` resolves to an explicit
**stamp**; they persist owner-side. Unstamped contents — fixtures, litter,
the dorm's bed — capture host-side exactly as today.

This is the one place the two scopes touch, and the filter keys on the
*stamp*, not on `ownerOf` as a whole. That matters because D5 gives
fixtures a parcel-derived owner: a fixture is *owned* but not *stamped*,
so it keeps riding the room's record where it belongs. Only goods that
have actually changed hands move to the owner scope.

For a dorm room and for Avatar the rule is a no-op — neither holds
stamped goods today — so the change is additive and the existing
behavior is regression-tested, not re-derived.

### D3 — Materialize routes by `place`; storage is not cloned

Restoring an owner's goods routes on `place`:

- `'inventory'` → cloned into the owner's own container, as today.
- `'storage'` → **not cloned at all.** The good is live in the registry
  and in the owner's record, and has no presence in the world. This is
  what makes storage free: it is the absence of a placement, not a place.
- a **room identity** → deferred to that room. The good is cloned and
  placed when the room materializes (D4), not when the owner logs in.

The third case is the one that makes "my chair is in my living room while
I am at work" true, and it is why `place` names a room rather than the
owner naming a container.

### D4 — The room re-placement overlay, ordered after fixtures

A residence room, on materialize, does two things in order: restore its
own record (its **fixtures**, host-keyed, via the shipped seed-then-persist
handoff), then **overlay** the owned chattel whose `place` names it —
cloned as the *owner* principal and placed.

Order is load-bearing: fixtures first means a placed good can rest on a
surface that exists. The room captures nothing owner-side on the way down;
the owner's record is authoritative for chattel, and a room going dormant
simply forgets furniture it never owned.

### D5 — `ownerOf` gains the parcel rung, between stamp and author

Resolution becomes three rungs, total:

```
ownerOf(item) =
  explicit stamp                                     // changed hands
  ?? (templatePath under a parcel extent → that parcel's owner)
  ?? authorOf(templatePath)                          // shipped fallback
```

The shipped two-rung chain (`stamp ?? authorOf`) is right for a good that
exists anywhere in the world, and wrong for a *fixture in a let unit*: it
makes the landlord a content builder. A tenancy needs a landlord who is a
person in the fiction, and the parcel is exactly that person.

Keying on **template path rather than location** is what makes theft
recoverable: an authored fixture stays titled to its parcel even when
carried out of it, so displacement is custody without title and the owner
can recover. Only an explicit stamp transfers it.

The rung is inserted *above* the author fallback, so every good outside a
parcel extent resolves exactly as it does today — no restamp, no
migration, no change to the general store.

### D6 — Archetypes are template rows now; classes when they earn it

Bedroom, kitchen, bathroom and living ship as four template paths over
one generic residence-room class. What distinguishes them is prose and
their `populates:` fixture set — both already declarative data on the
shipped spine.

They are not classes yet because nothing they would do belongs to the
*room*: cooking is conferred by the hearth and the pot, not by the
kitchen (`cook.yaml` — "reachable heat where the recipe wants it, the
pot, and the ingredients"), which is the shipped instrument-confers-verb
rule. A class earns its place when an archetype carries behavior its
contents cannot, and the anticipated case — a bedroom whose state mirrors
something outside the game — is exactly that. It is deferred, not denied.

The promotion path costs nothing: `class:` is a field on the template
row, so a bedroom becomes `class: /lib/residence/Bedroom` by editing one
line, with the template path unchanged as its identity. This is the
`SandboxCrossing` lesson taken forward — the class is the mechanism,
skins are rows — with the difference that these rows are expected to
*stop* being skins.

### D7 — Rooms carry room-level state, not only contents

A residence room's persisted record carries **declared fields of its
own**, not merely a container slice. v1 declares little, but the shape is
established, so an archetype that later carries condition (stewardship)
or an external reading (the mirror) has somewhere to put it without a
spine change or a migration.

This is the single forward-compatibility obligation this build accepts,
and it is nearly free — `persistentFields` on the room class is the
existing mechanism.

### D8 — Furnishing is the shipped verbs made title-aware

No new furnish verb. `put`/`drop`/`place` an owned good → custody moves
via `ContainmentApi`, title stays, `place` is stamped to the room.
`get`/`take` → custody returns, `place` follows to `inventory`. Taking a
good you do not hold title to is **theft** — custody without title,
permitted and recoverable, not blocked.

Function is fixed by the backing class throughout: these verbs move
custody and `place`, never what a thing *is*.

### D9 — The lease is the dorm's lease; revert evicts to storage

Provisioning and revert reuse the shipped parcel surface unchanged
(`subdivide` → `grantUse`; `revokeUse` → `retire`). The one addition is
the eviction rule from D1: ending a lease forces every owned good placed
under the unit to `storage` — intact, titled, recoverable — **before**
the shell reverts. The unit re-lets empty; the ex-tenant's furniture
waits for their next address.

## Constraints

- **No furnishing subsystem in the module sense.** No `FurnishingApi` /
  `ApartmentApi` / `lib/apartment/`. The engine work belongs to the
  existing possession and persistence spines; the building, floorplan,
  fixtures and door are **content** over the shipped `Warren`, parcel and
  persistence substrates — the dorm's precedent, which needed almost no
  dorm-specific code.
- **No `OwnableMixin` / `PossessableMixin`.** Ownership is a relation
  (property-slate §I). `ChattelMixin` already carries only the good's
  *identity* and is the settled resolution of that guardrail; nothing here
  adds an ownership capability.
- **`place` writes go through the chattel gate**, never a public setter
  and never author-writable data.
- **Actor from `ExecutionContextApi`, never a parameter** — every
  title-aware verb derives its acting principal from context (project
  memory: `gated-api-actor-from-context`).
- **No `Named` on generic residence objects** — rooms, fixtures, doors and
  generic furniture take `Visible.shortDescription`; proper names only for
  proper names (project memory: `named-mixin-proper-names-only`).
- **Dorm and Avatar persistence must not regress.** Owner-based
  persistence is strictly additive — a new owner-side scope beside the
  host-side one — and the dorm's room records and Avatar's inventory keep
  byte-identical behavior. This is a named regression test, not an
  assumption.
- **`ownerOf`'s existing callers must not change behavior.** The parcel
  rung is inserted between the two shipped rungs; the general store and
  every current consumer resolve identically for goods outside a parcel
  extent.
- **Globs stay out.** `ChattelApi` refuses to stamp a `Globbable`; a
  fungible stack has no `place`.
- **Go through the Api layer** — persistence via the spine, title and
  `place` via `ChattelApi`, custody via `ContainmentApi` (project memory:
  `no-logic-module-imports`).
- **`clone()` is not modified.** `place` is instance state carried by the
  spine, not a clone-time injection.

## Acceptance criteria

- **`place` round-trips.** An owned good carries a `place`; setting it is
  gated; it survives capture/restore; a glob cannot carry one.
- **The skip rule holds and is a no-op where it should be.** A room
  containing a *stamped* good does not capture it in its own record; a
  room containing an unstamped fixture does. A dorm room and an Avatar
  with no stamped goods capture and restore **byte-identically to
  today** — named regression tests.
- **Storage is the absence of a placement.** A good with `place =
  storage` is not cloned into the world on materialize, remains titled and
  recoverable, and eviction never destructs it.
- **The furnish loop persists.** Lease a unit → it materializes empty of
  movable goods → place owned furniture across its rooms → after dormancy
  and a restart the unit reconstitutes with the same goods in the same
  rooms, and its fixtures respawn separately.
- **The guest-drop leak is closed.** A visitor's dropped good is titled to
  the visitor, rides the visitor's record, names the foreign room as its
  `place`, re-appears there on that room's next materialize, and never
  appears in the host's record.
- **`ownerOf` is three rungs and is total.** A stamped good resolves to
  its stamp; an unstamped good under a parcel extent resolves to that
  parcel's owner; an unstamped good outside any extent resolves to its
  author; neither → `null`. Existing consumers are regression-tested
  unchanged.
- **Fixture displacement is theft, recoverable.** Carrying a let unit's
  fixture out of the unit leaves it titled to the parcel owner; the owner
  can recover it; only an explicit stamp transfers it.
- **Four archetypes exist as content.** Bedroom, kitchen, bathroom and
  living each seed their own fixture set from `populates:`, are editable
  without code, and share one room class.
- **Rooms carry room-level state.** A residence room declares and
  round-trips at least one field of its own, distinct from its contents —
  the seam D7 exists to establish.
- **Multi-room and lease-gated.** A unit's rooms connect within the unit;
  the front door gates on the lease; a non-leaseholder cannot enter.
- **Revert evicts to storage.** Ending a lease returns the tenant's goods
  to storage intact and titled, reverts the shell clean, and the unit
  re-lets empty. Re-provisioning a different unit and re-placing from
  storage furnishes the new one.
- **Function is fixed** — no title or custody verb changes a good's class.
- **Full server suite green**, and a `docs/subsystems/` page documents
  owner-based persistence, the furnishable residence, the archetypes, and
  the deferred seams (condition/stewardship, land use, archetype classes,
  the mirror, rent economics, owned homes, co-lease).

## Cross-references

- Seeding slate:
  [property-slate](../slates/builds/property-slate.md) §I (chattel &
  persistence, the seed-then-persist handoff), §J (custody vs. title),
  §K (rent vs. own, the lease)
- Boundary: [stewardship-slate](../slates/builds/stewardship-slate.md) —
  owns condition, land use, and the residence ladder's gate; this build
  ships a rung and the seam, never the ladder
- Sibling rung: [residence.md](../subsystems/residence.md) — the dorm,
  the `(scope, key)` spine, `seedBornWith`, and every content precedent
  (`DormWarren` / `DormRoom` / `DormDoor`)
- Substrates: [chattel.md](../subsystems/chattel.md) (title, the registry,
  `ownerOf`), [persistence.md](../subsystems/persistence.md) (the spine),
  [parcel.md](../subsystems/parcel.md) (subdivide / lease / retire),
  [residency.md](../subsystems/residency.md) (dormancy),
  [containment / spatial.md](../subsystems/spatial.md) (custody)
- In flight: build-2's Hinkley Hills — the suburb house is this
  substrate's intended second consumer; it defers house interiors,
  furnishing and chattel-title here
- Follow-on: the mirror / real-world-parity slate (to be captured);
  prose-on-owned-items personalization
