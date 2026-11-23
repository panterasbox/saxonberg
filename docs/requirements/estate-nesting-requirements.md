# Estate nesting — requirements

**Kind:** refactor/sweep
**Leads from:** kernel (first consumer: every player's own saved record —
driven through the dorm, a carried bag, worn gear, a named pet and a good
left in a public room; no new content)

A player's **estate** is the record of everything they own, wherever it is —
in hand, worn, in a bag, on a table in their room, on a wall, left in a public
room. Today it lives inside the player's own saved record, and every owned
good carries a **full copy of its state** there, with no limit. The record
grows with the one number this game is designed to make go up, and the
database refuses any single record over 16 MB — and when a save is refused,
nobody is told. This build makes the estate an **index**: every owned good
saves itself, the owner's record lists what they own and where, and a save
that fails is loud, isolated and reported. Seeded by
[estate-nesting-slate](../slates/engine/estate-nesting-slate.md); the reuse
ledger is its § *Reuse ledger for the plan*.

## What the thing is

Two kinds of nesting live in a player's record, and only one is a problem:

- **A container nesting its contents** is bounded by physics — a bag holds
  what fits in it ([size.md](../subsystems/size.md)). That nesting stays.
- **An owner nesting everything they own** is bounded by nothing. That is the
  nesting this build removes.

Ownership is a fact about a good, not a place to keep it. Once every owned
good keeps itself, passing a good to a new owner (an estate that passes, an
escheat) changes the ownership fact and moves no saved state at all.

## What already exists

- **The pointer form, shipped** — a named pet saves itself and rides in its
  keeper's estate as a reference ([furnishing.md § Owner-based
  persistence](../subsystems/furnishing.md),
  [persistence.md § Keyed nested hosts](../subsystems/persistence.md),
  [pets.md](../subsystems/pets.md)).
- **Putting a good back where it was left** — the room overlay restores an
  owner's goods into any persisting room, shop, ship or shelf when it loads;
  a good that saves itself is stood up by its own key wherever it was
  ([furnishing.md](../subsystems/furnishing.md), [chattel.md](../subsystems/chattel.md)).
- **The ownership index** — every owned good's title and where it was last
  placed ([chattel.md](../subsystems/chattel.md)).
- **Estates only on players** — residences, shops and organizations keep
  their goods in their own records, bounded by their own capacity.
- **No record-size measurement of any kind**, and no surfacing of a failed
  save beyond a server log line.

Measured gaps the survey found (verified in code, 2026-11-22):

- A failed save reaches no one: every save path logs to the console, and the
  disconnect save swallows the error outright.
- ⚠ A signed-out body whose save keeps failing **never leaves the world** — it
  re-tries forever.
- At shutdown, one refused record likely fails the whole batch it was written
  with (up to 24 other players' and places' records).
- A good left in a public room that does not save itself is lost at restart
  (the known gap in [furnishing.md](../subsystems/furnishing.md),
  [eager-residency-slate § 7](../slates/tech-debt/eager-residency-slate.md)).
- Two defects on the estate's own path: updating a signed-out owner's estate
  drops their inheritance state; and a pet saved while unloaded is written as
  a full copy instead of a pointer.

**Therefore what is genuinely new here is:** making the pointer form the
**default for every owned good**; loud, isolated, reported save failures; an
operator's reading of record sizes; and the two defect fixes. Everything else
is reuse.

## Goals

- **An owner's record stays small however much they own.** It grows by a
  short index line per good, never by the good's state.
- **Every owned good is kept on its own**, and comes back after a restart
  exactly where it was: in hand, worn, packed, on a surface, on a wall, inside
  a container inside a container, or **left in a public room** — the last one
  newly, closing the public-room gap for owned goods.
- **Unowned things inside an owned container stay with the container** —
  physics bounds them.
- **A destroyed good leaves no saved record behind**, and a good that changes
  hands moves no saved state.
- **A failed save is never silent.** The operator sees it in the author
  diagnostics; the player is told, in plain words, that their things could not
  be saved; one refused record never takes another record down with it; and a
  signing-out body always leaves the world.
- **An operator can read record sizes** — the largest records and what they
  hold — so the next ceiling is seen coming, not met.
- **The two estate defects are fixed**: a signed-out owner keeps their
  inheritance state; a pet is a pointer however it is saved.

## Non-goals

- **Organizations', residences' and shops' goods** stay in their host's
  record, bounded by the host's capacity → nowhere, deliberately; revisit if a
  host's record is ever measured near the ceiling (the size reading makes that
  visible).
- **Unowned goods left in a public room** are still not restored →
  [eager-residency-slate § 7](../slates/tech-debt/eager-residency-slate.md)
  (its option (b), sweep to storage).
- **What an unrestorable saved record does to the boot** →
  [stale-reference-boot-slate](../slates/tech-debt/stale-reference-boot-slate.md).
  This build makes the unit one good instead of one player, which that slate
  can use; it does not decide the skipping rule.
- **Migrating records already written** → nowhere: the project takes no
  migrations; the dev databases are dropped (free before launch, which is why
  this build is time-bounded).
- **Giving and trading goods between players** →
  [chattel.md § Deferred](../subsystems/chattel.md); this build only makes the
  hand-over cost nothing in storage.
- **Where a record lands in a sandbox circle** →
  [sandbox-overlay](../plans/sandbox-overlay-plan.md) (D6); it changes where a
  record lands, this build changes its shape, and the two compose.

## Placement

Kernel. Persistence and ownership are kernel substrate; no pack holds code for
this, and no row changes. **A second instance needs no code:** any good a pack
ships becomes self-keeping the moment a player owns it.

## Collisions

- **Named pets** — already pointers; they become the general case rather than
  the exception. Their orphan record after death
  ([pets-slate](../slates/engine/pets-slate.md)) is covered by the
  destroyed-good goal.
- **Estate succession** (escheat, the beneficiary —
  [avatar-family-slate](../slates/engine/avatar-family-slate.md)) — the
  inheritance state must survive every write; it currently does not on one.
- **The dorm, holdings and rooms that put owners' goods back** — their
  behavior is unchanged; they read the same index.
- **Carried and worn goods, hung goods and leading** ([carrying.md](../subsystems/carrying.md))
  — the drive's restart already exercised by size-and-carrying must stay
  green.
- **Shutdown and sign-out saves** ([db-performance](../slates/tech-debt/db-performance-slate.md))
  — more, smaller records per save; the shutdown save time must not regress
  noticeably.
- **Sandbox overlay** — the planned unique-index widening composes with
  per-good records; the plan checks the two together.

## Surface decisions

### What an estate entry carries — a pointer, for every good
Owner's call (2026-11-22): every owned good keeps itself and the estate is the
index. The alternatives — keep copies under a size cap (two save paths and a
threshold to tune), or keep copies and guard the ceiling (the limit stays) —
were rejected. Lens 2 chose the same way: the bespoke good (a pet) and the
ordinary good (a saucer) take one path.

### Unowned contents of an owned container
Stay nested in the container's own record. Physics bounds a container;
ownership does not — the line this build draws.

### When a save fails
Owner's call: the operator **and** the player are told. The operator sees the
failure in the author diagnostics with which record and why; the player is
told in plain words that their things could not be saved this time (honest
state — nobody discovers loss at the next login). One refused record never
fails another's save, and sign-out always completes — the body leaves the
world even if its last save failed, with the failure reported.

### The two estate defects
Owner's call: folded in. Same path, rewritten anyway.

### Existing records
Dropped with the dev databases; no migration.

## Lens pass

1. **Pedagogy** — none directly; this is plumbing. Indirectly it protects the
   possessions every Discipline produces.
2. **Creative expression** — the ordinary good and the bespoke good take one
   path; an author's new good needs nothing to be ownable at any scale.
3. **Immersion / participation** — 3a: a player's things are where they left
   them, including in a public room; a failed save is told, not hidden.
   3b: hoarding is now *possible* without breaking the server — whether the
   polity wants it is the polity's (soft limits, never a hard cap).
4. **Values** — the no-cap choice is a value: owning more is never refused by
   the engine.
5. **Continuity** — a good's record outlives its owner's; succession moves
   nothing, so an inherited workshop arrives whole across any epoch.
6. **Economy** — a good that changes hands costs no storage; the engine no
   longer taxes accumulation with a hidden ceiling.
7. **Governance** — none judges a person. ⚠ Gap noted: the operator's size
   reading shows who owns the most — it is an operator instrument, not a
   public gauge.

## The drive

No step moves with the game clock, so there is no soak drive. The new places
count is zero; the public room is looked at in its own light.

### Blocking drive

1. *instant · player* — A fresh test player stands in their dorm room. They
   set a good on the table, hang one on the wall, wear a piece of gear, carry
   a bag holding one good they own and one they do not, and name a pet.
2. *instant · player* — They walk to a public room in the scaffold, set an
   owned good down, `look`, and see it.
3. *instant · staged* — The operator reads record sizes: the player's record
   holds an index line per owned good and no good's state; each owned good
   has a record of its own; the unowned good in the bag is inside the bag's
   record.
4. *instant · staged* — The player is given five hundred owned goods. After
   a save, their record has grown only by index lines and is far below the
   ceiling; nothing failed.
5. *short · player* — **Restart.** The player logs in: the table good, the
   wall good, the worn gear, the bag with both its goods, the pet, and the
   five hundred are all where they were. They walk to the public room and
   `look`: the good they left is there.
6. *instant · player* — The player destroys an owned good (eats it, or
   breaks it down). *staged* — after the next save, no record of it remains.
7. *instant · staged* — A save is made to fail for one player's record. The
   operator sees it in `errors` naming the record and the reason; the player
   is told their things could not be saved; another player saved in the same
   batch is saved.
8. *instant · player* — That player signs out. The body leaves the world
   (the operator sees the failed last save reported, not a retry loop).
9. *instant · staged* — A signed-out owner whose estate carries inheritance
   state has one of their goods moved; read back, the inheritance state is
   still there. A pet saved while unloaded is written as a pointer.
10. *short · player* — **Restart.** The player from step 7 logs in to their
    last good save; the player from step 5 still has everything.

### Soak drive

None — no step moves with the game clock.

## Acceptance criteria

- A player's saved record does not grow with the state of what they own: five
  hundred owned goods add only index lines, measured by the operator's
  reading.
- After a restart every owned good is back where it was left — including in a
  public room that does not save itself — and unowned contents come back
  inside their container.
- A destroyed good leaves no record; changing a good's owner rewrites no
  good's record.
- A refused save appears in the operator's diagnostics, is told to the
  player, fails no other record, and never keeps a signed-out body in the
  world.
- A signed-out owner's inheritance state survives any update to their
  estate; a pet is a pointer however it was saved.
- The existing restart drives that carry goods (size-and-carrying, pets,
  avatar-family) stay green, and the shutdown save does not noticeably slow.

## Cross-references

- Seeding slate: [estate-nesting-slate](../slates/engine/estate-nesting-slate.md)
  (reuse ledger: § *Reuse ledger for the plan*)
- Subsystems: [persistence.md](../subsystems/persistence.md),
  [furnishing.md](../subsystems/furnishing.md),
  [chattel.md](../subsystems/chattel.md), [pets.md](../subsystems/pets.md),
  [carrying.md](../subsystems/carrying.md), [size.md](../subsystems/size.md),
  [diagnostics.md](../subsystems/diagnostics.md)
- Related: [eager-residency-slate](../slates/tech-debt/eager-residency-slate.md),
  [stale-reference-boot-slate](../slates/tech-debt/stale-reference-boot-slate.md),
  [pets-slate](../slates/engine/pets-slate.md),
  [avatar-family-slate](../slates/engine/avatar-family-slate.md),
  [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md) (D6)
