# Apartments — requirements

> ⚠⚠ **SUPERSEDED by the residences build (2026-08-31).** The rung this
> document specifies **shipped**: Seznick House on Mayfield Row is a
> `BuildingWarren` letting multi-room, empty-at-move-in units furnished with
> real owned goods, with keys, whole-unit dormancy and evict-to-storage.
> The live reference is **[holding.md](../subsystems/holding.md)**
> (the substrate) and [furnishing.md](../subsystems/furnishing.md) (the
> owner-based persistence it rides).
>
> This file is kept until the next sweep as the record of what was asked
> for; **read the subsystem docs, not this, for what the world does.**
> Where the two disagree the subsystem doc is right — notably, the
> apartment did not get its own substrate: it converged onto the same
> two-tier institution the dorm and the bought house use.

An apartment is the **rich rung** of the residence ladder: a **leased,
multi-room, *empty-at-move-in* residence** that a player **furnishes with
real owned goods** — the furniture they crafted, bought, or looted, placed
and kept. Where a [dorm](./dorm-requirements.md) hands you a single furnished
room whose furniture is the university's (invariant, respawned) and lets you
personalize only its *prose* (a theme), an apartment hands you an **empty
typed floorplan** and makes your home's character **the actual objects you
played for**. It is the **domestic-economy integrating vertical** — the
Dave's-Bar sibling — weaving parcels, banking, employment, crafting,
persistence, encumbrance/haulage, and residency into one loop: *find a
building → sign a lease → get keys → empty floorplan → furnish it with owned
chattel → the more you own, the more owns you → contract services → stay
solvent → upgrade or move.*

The load-bearing realization: **the apartment and the dorm operate on the
same substrate and differ only by *tenure rung*.** Both are leased field
properties (a use-grant on a unit parcel), both are content over the shipped
`Warren` + parcels + the persistence spine + residency, and **neither is a
subsystem** (no `ApartmentApi`/`ApartmentLogic`/`lib/apartment/`). The single
axis that separates them — *who holds title to the furniture* — is exactly
the engine's new work here: **chattel-title** (property **0b's back half**:
an owner-stamp on individuated movable goods, gated transfer, and
**owner-based persistence**). A dorm needs none of it (you own nothing
structural); an apartment is *built on* it.

This build is therefore **downstream of the dorm build** (which lands the
**D1 multi-instance persistence spine** + the **parcel lease surface** both
rungs share) and delivers the chattel half those foundations were shaped to
carry. See the [dorm requirements](./dorm-requirements.md) for D1 and the
lease; this doc assumes them and does **not** re-specify them.

Seeded by the 2026-07-12 apartment reframe (project memory:
`residential-realestate-progression` §67–92) and
[property-slate.md](../slates/builds/property-slate.md) §I (chattel &
persistence), §J (custody-vs-title verbs), §K (rent-vs-own, the lease), and
§L (the real-estate metagame). Rides the shipped
[persistence spine](../subsystems/persistence.md) (+ the dorm's D1
multi-instance change), [parcels](../subsystems/parcel.md) 0a,
[banking](../subsystems/banking.md), [crafting](../subsystems/crafting.md),
[employment](../subsystems/employment.md),
[encumbrance](../subsystems/encumbrance.md)/[haulage](../subsystems/conveyance.md),
[residency](../subsystems/residency.md), and the
clone/[Hydrator](../subsystems/templates.md) pipeline.

## Goals

- **Chattel-title — individuated movable goods carry an owner.** Owning a
  movable good is a **title** (an owner-stamp set at acquisition, gated
  transfer, unspoofable, **≠ possession/custody**), resolved the same way as
  parcel title: `ownerOf(item) = explicit stamp ?? (templatePath under a
  parcel extent → that parcel) ?? unowned`. **Individuated items only**;
  fungibles/globbables stay quantity-by-possession, no per-unit title
  (property-slate §I).
- **Owner-based persistence — your stuff persists with you and knows where
  it lives.** Chattel persists **with its owner**, each item carrying a
  **`place`** (a residence room path / inventory / **storage**). A
  re-materialized home **re-places the resident's owned chattel** there;
  template fixtures respawn from template. **Storage = owned-but-unplaced**
  (the default place) — so "homeless" needs no new machinery, eviction never
  vaporizes stuff (force `place → storage`), and moving is re-placing from
  storage into the new unit. This **closes the guest-drop leak**: a guest's
  dropped item stays *theirs*, `place` = *their* apartment (realistic "left
  my book at a friend's", not a data leak).
- **An apartment is a leased, multi-room floorplan you furnish.**
  Provisioning a unit mints a **floorplan sub-parcel** of the building parcel
  (subdivide/`parentParcel`), grants the tenant a lease (use-grant + expiry +
  revert — the **same lease as the dorm**), and materializes the unit's rooms
  (bath/kitchen/bed/living) **empty of movable goods** — only the built-in
  infrastructure fixtures (sink, counter, the door) respawn from the
  floorplan template. Access follows the lease.
- **Furnishing = placing real owned goods** (crafted / bought / looted),
  **not** decorating with authored themes and **not** a customization
  document. You `place` your owned furniture into a room; it stays where you
  put it across dormancy and restart (owner-based persistence). Removing a
  good takes it back into your possession/storage.
- **The residence type is a reusable floorplan blueprint.** A `Studio` /
  `OneBed` / `TwoBed` floorplan = a shared multi-room template (rooms +
  built-in fixtures + the room graph); many leased units share one floorplan
  yet keep distinct furnishing state, keyed by the **unit parcel** (the
  dorm's D1 multi-instance pattern, one cardinality up — a *zone* of rooms
  rather than one room).
- **Personalization = personal expression on owned items** (prose on *your*
  furniture — "make my desk my film-school desk") — a **whole-document write
  on the item's expressive prose fields only** (function fixed by the backing
  class, the code-trust boundary), carried free by the spine as instance
  state. **This is a later slice** (needs chattel first); v1 furnishing is
  placement, not annotation.
- **The lease is a use-grant, reverting on end.** Ending the lease evicts the
  tenant's *owned* chattel to **storage** (never destroyed — it's titled to
  them) and reverts the *shell* to the clean floorplan; the unit re-leases
  empty. Rent economics (payment, metered sub-allowance) stay deferred to the
  compute-economy phase; the lease *relationship* is what this build needs.
- **No apartment subsystem.** No `ApartmentApi` / `ApartmentLogic` /
  `lib/apartment/`. Apartments are content (an `ApartmentBuilding` Warren
  subclass + floorplan templates + fixtures + the leased-unit door) over
  general substrates. The only new *engine* code is **chattel-title +
  owner-based persistence** (property 0b's back half), which lives in the
  possession/persistence spine, not in an apartment module.
- **A `docs/subsystems/` page** documents chattel-title, owner-based
  persistence (the `place` model + storage), and the apartment as the second
  residence rung — cross-linked with the dorm's residence page.

## Non-goals

- **The full compute-as-energy / stewardship loop.** Stewardship is *lived
  and derived*, never a flag; the compute-allowance metering + degradation is
  property **Phase 1**, deferred. This build delivers the *furnished home
  that persists*, not the energy economy over it.
- **Rent economics** — payment schedules, metered sub-allowances, sublease
  markets, vacancy listings, the proprietor-as-Business P&L. The lease
  *relationship* (use-grant + revert) is in scope; the *economics* defer to
  the economy layer (property-slate §K, "rent economics stay Phase 3").
- **Single-family homes and commercial property** — the *ownership* rungs
  above the lease (own shell + furniture; business premises). Apartments are
  the top *leased* rung; owned property is a later build.
- **The holodeck portal fixture** (the skinnable wardrobe/portal into the
  `/home/` sandbox). The apartment is designed to *contain* one (property
  §G/§H), but the portal is its own build (the sandbox/wardrobe slate); the
  apartment ships without it.
- **The theme-pick personalization** (the dorm's mechanism) — apartments are
  furnished with owned goods, not themed. Prose-on-owned-items is the
  apartment's *own* personalization, and it's a **later slice** (below).
- **A general marketplace / auction house.** `sell` (title + custody +
  payment, atomic) is in scope as a verb; a listings/market surface is not.
- **Fungible-good title.** Coins, bulk materials, globbables stay
  quantity-by-possession — no per-unit stamp.
- **Multi-tenant / roommate co-lease.** A unit has one leaseholder in v1; the
  co-lease grant (a use-grant of a use-grant, property §K sublet) defers.

## Surface decisions

### D1 — Chattel-title = a field + a rebuildable index, never a mixin

Per the property-slate capability-vs-relation guardrail (§I): **being owned
is a *relation*, not a *capability*** — so there is **no `OwnableMixin` /
`PossessableMixin`.** Ownership is:

- **An owner-stamp field** carried on the item's persisted state
  (`owner: string | null` — the owning principal's durable templatePath),
  set at acquisition (`claim` / `sell` / craft-with-maker), gated transfer
  only, never player-writable as data. Resolution mirrors parcel title:
  `ownerOf(item) = stamp ?? (templatePath under a parcel extent → that
  parcel) ?? unowned` — so an authored fixture stays titled to its parcel
  even when displaced (**displacing it is theft, recoverable**; only an
  explicit stamp transfers it).
- **A rebuildable owner-*index*** (the banking `ledger → cache` shape) for
  "what / where do I own", **not** a store — the items live in their holders
  (avatar inventory / room / storage), the index is derived over them.
- **A durable per-item id** conferred *by* ownership (for the index +
  cross-move/theft tracking) — a small field, not a new mechanism.

**Ownership bottoms out at `Creature`** (the `Creature → Character` split
*is* the chattel↔person line): `Thing`/`Creature` are ownable chattel;
`Character`/`Avatar` are self-owned persons.

### D2 — Owner-based persistence: the `place` field + storage

The persistence spine already persists a host's *contents* in its record's
Container slice (host-based). Owner-based chattel persistence is the
**divergence the apartment forces** and the reframe's central mechanism:

- Each owned item's persisted state carries a **`place`** — a residence room
  path, `inventory`, or **`storage`** (the default when owned-but-unplaced).
- A residence **re-materializes the resident's chattel** placed there
  (queried via the owner-index by `place = this room`), *in addition to*
  respawning template fixtures from the floorplan. The two persistence scopes
  compose over one spine: **fixtures ride the room's host record (keyed on
  the unit parcel); owned chattel rides the owner** (keyed on the owner,
  carrying `place`).
- **Storage = owned-but-unplaced** falls out for free: eviction / lease-end
  forces `place → storage` (never destruct — titled to the owner); a homeless
  player's goods sit in storage; moving = re-place from storage into the new
  unit. No new "warehouse" object.

This is deliberately the **owner-keyed** flavor, distinct from the dorm's
**parcel-keyed** room state — the two do not collide (a dorm has no
player-owned chattel; an apartment's fixtures are still parcel-keyed, only
its *furniture* is owner-keyed). Both ride the shipped spine.

### D3 — The apartment is a multi-room floorplan zone (a leased sub-parcel)

- **Structure:** a residence = a **floorplan zone** (bath/kitchen/bed/living
  rooms under one zone path), a **sub-parcel** of the building parcel
  (`subdivide`/`parentParcel`, shipped). The floorplan *type* is a reusable
  blueprint (rooms + built-in fixtures + the intra-unit room graph); many
  units share it; per-unit state keys on the unit parcel (D1 multi-instance,
  from the dorm build).
- **The building** is an elastic `Warren` subclass (the dorm's
  `DormWarren` precedent, one cardinality up — a Warren *of floorplans* /
  units rather than of single rooms), or a fixed small building for v1 — a
  build decision (below). It grows units on provisioning; empty units are
  dormant (residency), reconstituting from the durable slot set.
- **Rooms within a unit** connect by **cardinal exits intra-zone** (the
  cardinal-only-intra-zone invariant — one zone, no `enter`-break between a
  unit's own rooms); the **unit's front door** is the `enter`-break /
  lease-gated boundary off the building corridor (the dorm's `DormDoor`
  precedent).

### D4 — Furnishing = title-aware custody verbs, not a new decorate verb

Furnishing rides the **existing containment verbs made title-aware**
(property-slate §J), **not** a new parallel verb set:

- `place` / `put` / `drop` your owned furniture → custody moves, **title
  stays** (and `place` is stamped to the room); it persists there.
- `get` / `take` your owned furniture back → custody returns to you; `place`
  follows.
- `take` an owned item **without consent** → **theft** (custody without
  title) — recoverable, the item stays titled to its owner.
- `give` → a **combined custody + title** transfer (bilateral consent).
- **Genuinely-new verbs only where there's no custody analog:** `claim`
  (title-only stamp) and `sell` (title + custody + payment, atomic — the
  `OrderController`/Dave's-Bar `settle` precedent).

Function is fixed by the backing class (a `Chair` never becomes a `Bed`); the
verbs only ever move *custody* and *title*, never *function*.

### D5 — Personalization is a later slice (prose on owned items)

Personal expression on *your* furniture ("make my Duncan Hall desk my
film-school desk") is a **whole-document write on the item's expressive prose
fields only** — validated pass/fail, prose-only (mechanics unspoofable by
construction = the code-trust boundary), carried free by the spine as
instance state. It is **not** a new command verb (guard palette-widening),
**not** the sandbox CMS, and **needs chattel first** — so it is **deferred to
a follow-on slice**. v1 furnishing is *placement* of owned goods; annotating
them is the next cut. (The dorm's theme-pick is the parallel mechanism on the
*simple* rung; neither is built in the other's cycle.)

### D6 — The lease is the dorm's lease, reused; revert evicts to storage

The lease is the **same minimal property-0b use-grant** the dorm build
lands (`grants[]` on the unit parcel: `{kind:'lease', holder, expiresAt}`,
access = keys, revert on end). The apartment adds **nothing** to the lease
itself. The one apartment-specific end-lease behavior: **revert evicts the
tenant's owned chattel to storage** (`place → storage`, never destruct — D2)
before reverting the shell to the clean floorplan. Rent-as-charge is a thin
first pass or defers to the economy layer.

### D7 — Three-tier permissions (the same tiers as the dorm)

Function (class/template) = the author/landlord's, governed, invariant to
tenants. The **furniture** = the tenant's (own title; place/remove freely).
The **prose overlay on owned items** = the principal's, write-gated by
holding title on the item, read public. The editable **surface scales with
tenure**: a dorm tenant gets prose-only theme-pick; an apartment tenant owns
and places *real goods* + (later) annotates them; a homeowner (deferred) gets
wider authoring. "Ownership unlocks authoring", principled.

## Constraints

- **No apartment subsystem** — no `ApartmentApi`/`ApartmentLogic`/
  `lib/apartment/`. Chattel-title + owner-based persistence live in the
  existing possession/persistence spine (`lib/persistence/`, `lib/parcel/`
  for the ownership-resolution rule); the building/floorplan/fixtures/door
  are content over the shipped `Warren`.
- **No `PossessableMixin` / `OwnableMixin`** — ownership is a relation (a
  field + a rebuildable index), not a capability (property-slate §I
  guardrail).
- **Owner/actor from `ExecutionContextApi`**, never a parameter; `claim` /
  `give` / `sell` / `place` derive the acting principal from context and gate
  on title/consent (memory: gated-api-actor-from-context).
- **No `Named`** on generic apartment objects (rooms, fixtures, doors,
  generic furniture) — proper names only (memory:
  named-mixin-proper-names-only). Player-crafted goods carry a maker's-mark,
  not a proper name.
- **Function is fixed by the backing class** — title/custody verbs never
  change what a thing *is*; personalization (later) touches prose fields only
  (the code-trust boundary).
- **Depends on the dorm build's engine work** — D1 multi-instance
  persistence + the parcel lease surface are landed by the dorm cycle and
  reused here unchanged. This build does **not** re-specify them.
- **Go through the Api layer** — persistence via the spine only (no bespoke
  chattel store — the owner-index is a rebuildable cache over holders),
  title-transfer through the gated chokepoint, custody through
  `ContainmentApi` (memory: no-logic-module-imports).
- **`clone()` is not modified** — the owner-stamp is instance state carried
  by the spine, not a clone-time injection.
- **Avatar / dorm persistence must not regress** — owner-based persistence is
  *additive* (a new `place`-keyed scope alongside the host-keyed one); the
  dorm's parcel-keyed room state and Avatar's self-owned inventory keep their
  existing behavior.

## Acceptance criteria

- **Chattel-title works and is tested:** `claim` stamps an item to the actor;
  `ownerOf(item)` resolves stamp → parcel-extent → unowned; a non-owner
  cannot re-stamp; `give`/`sell` transfer title (bilateral consent / payment)
  and are gated.
- **Owner-based persistence works and is tested:** an owned item carries a
  `place`; placing it in a residence room and re-materializing the room
  re-places it; template fixtures respawn separately; the two scopes do not
  double-own a field.
- **Storage / the guest-drop leak:** dropping an owned item in a *foreign*
  residence keeps it titled to the dropper with `place` = the dropper's own
  unit (not a leak into the host's record); a homeless owner's goods sit in
  `storage`; eviction forces `place → storage` and never destructs owned
  chattel.
- **The apartment is furnishable and persists:** lease a unit → it
  materializes empty (only built-in fixtures) → `place` owned furniture into
  its rooms → after dormancy + restart the unit reconstitutes with the same
  placed furniture; a non-leaseholder cannot unlock the door.
- **Multi-room:** a unit's rooms (bath/kitchen/bed/living) connect by
  cardinal exits within one floorplan zone; the front door is the lease-gated
  `enter`-break off the building.
- **Lease revert evicts to storage:** ending the lease returns the tenant's
  owned chattel to storage (intact, titled) and reverts the shell to the
  clean floorplan; the unit re-leases empty.
- **Function is fixed:** title/custody verbs cannot change a good's
  class/function — tested.
- **The dorm and Avatar still persist** — regression-tested (owner-based
  persistence is additive).
- **Full server suite green.**
- A **`docs/subsystems/`** page documents chattel-title, owner-based
  persistence (`place` + storage), the apartment as the second residence
  rung, and the deferred seams (compute/stewardship, rent economics, the
  holodeck portal, prose-on-items personalization, owned homes, co-lease).

## Cross-references

- Sibling rung: [dorm-requirements.md](./dorm-requirements.md) (the simple
  rung + the shared D1 spine and lease this build assumes)
- Seeding: [property-slate.md](../slates/builds/property-slate.md) §I
  (chattel & persistence), §J (custody/title verbs), §K (rent-vs-own, the
  lease), §L (the real-estate metagame),
  [dorm-warren-slate.md](../slates/builds/dorm-warren-slate.md)
- Subsystem docs: [persistence.md](../subsystems/persistence.md) (the spine +
  the dorm's D1 multi-instance change + this build's owner-keyed scope),
  [parcel.md](../subsystems/parcel.md) (title / lease / ownership
  resolution), [banking.md](../subsystems/banking.md) (`settle` for `sell`),
  [crafting.md](../subsystems/crafting.md) (maker's-mark → owner-stamp at
  craft), [residency.md](../subsystems/residency.md) (dormancy),
  [templates.md](../subsystems/templates.md) (clone + Hydrator),
  [location.md](../subsystems/location.md) / [zone.md](../subsystems/zone.md)
  (the floorplan zone + Warren)
- Project memory: `residential-realestate-progression` (§67–92, the apartment
  reframe), `persistence-spine-build`, `dorm-walkable-build`
</content>
</invoke>
