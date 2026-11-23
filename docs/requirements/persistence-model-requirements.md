# Persistence model — requirements

**Status:** AGREED 2026-11-23 (owner). Revised the same day at plan review:
- only containers twin;
- the four kinds, with the ledgers moved in this build;
- unloading stays off, and the staged lifecycle is cut to the staging slate;
- `Offstage` is axed.

**Kind:** refactor/sweep
**Leads from:** the kernel. First consumers:
- the test scaffold's venue (a locker, a consignment shelf);
- the dorm and letting buildings;
- ships and pets;
- the water commons' ledgers (aquifer, gates, conduits);
- businesses' books;
- every business whose staff use `Offstage`.

A player asks one question of the world: *if I walk away, what will be here
when I come back?* Today three rules that do not know about each other
decide the answer:
- whether the place saves itself;
- an **estate**, which copies everything a player owns into the player's own
  record, with no limit;
- naming, which promotes a thing to a record of its own.

No player can predict how they overlap. This build replaces them with one
model: what keeps is a container, history is a ledger, bodies keep
themselves, and what the world derives is never kept.

Seeding slates:
- [persistence-model-slate](../slates/engine/persistence-model-slate.md)
  holds the model; its § 8 is the reuse ledger.
- [staging-slate](../slates/platform/staging-slate.md) contributes only the
  part NAME used as a key and the wings as null. Its lifecycle (policies,
  restaging, sets, claims) stays on that slate.

## What the thing is

**Four kinds of state, four answers:**

| kind | examples | kept by |
|---|---|---|
| **things** | a cup, a chest's contents, a plant, a dug well, a building's paint | **the container they are in**, when that container keeps |
| **history** | water drawn from an aquifer, a gate's openings, a conduit's deliveries, a business's books and shares | **a ledger**: a record of what happened, never staged and never lost |
| **bodies** | a player, a kept animal, a ship | **themselves**: their keeper is attached to them, not to a place |
| **what the world decides** | ice on a pond, a field's sward | **nothing**: the world derives it |

**Containers are the only things that keep.** A container either keeps or
is staged, and which one is plain to see.
- **A kept container** saves what is in it across a restart.
- **A staged container** comes back as authored. Anything else in it is a
  **stray**, lost when it restages.
- **A plain container inside a kept one** is kept by its parent: a chest in
  your room is kept because your room is.
- **A body always keeps.** A kept animal, one that has accepted a keeper,
  keeps itself, named or not.

**One rule for every thing.** A thing follows its container's rule.
**Ownership and naming confer no persistence**: ownership is the history of
title, and naming is identity. A player's one lever is the one a real person
has: where they leave things.

**A kept container always has a keeper you can name**: your room, a locker
or shelf rented to you, your pack, a business's storeroom, a ship's hold.
Kept places are the residence ladder, with the dorm as its lowest rung.

**A staged place restages when the server reboots.** Nothing staged is
saved. It would also restage when it unloads from memory, but unloading
stays switched off in shipped worlds (see Non-goals).

**Out of the narrative is null.** An NPC is an agent and acts for itself.
- Truly out of the narrative (off shift, with nowhere its content gives it),
  it has no environment.
- Somewhere it should be is a real place in content, reached by its own
  acts.
- There is no content that means *nowhere*.

## What already exists

- **Kept places.** About a hundred rows sit on persisting place twins. A
  container inside a kept place keeps with it. A persisting container in a
  plain room does not keep: a consignment shelf there loses consigned goods
  at reboot, which is 31 of the ~46 shop shelves.
- **Persistable things that are not containers**, each keeping a record of
  its own for one of three reasons:
  - stuff: plants, wells, wellheads, a sold building's condition;
  - history: an aquifer's draws, a gate's openings, a conduit's log, a
    business's cap table;
  - derived state: an ice sheet, a sward.
- **The estate, the promoted tier and the room overlay.** A refused save is
  silent everywhere, and a signed-out body whose save keeps failing never
  leaves the world.
- **Lease end and ships.** The letting warren moves a departing tenant's
  goods to estate storage. A ship's crew stows loose deck gear into her hold
  when she sleeps.
- **Pets.** A pet persists only once it is named. Cats and farm dogs walk
  home along their remembered trail.
- **Off-shift staff** are moved to `Offstage` rooms: nine of them, named by
  eleven more rows. The lounge regulars spend off-shift time in Dave's Bar
  from there. The ice company's hands go to a real shed.
- **Legibility.** The place card already declares a `staged` flag that
  nothing fills. No once-per-character hint mechanism exists.

**Therefore what is genuinely new here is:**
- keeping as a property of containers only;
- the kept marker and the once-only teaching line;
- the commons' and businesses' history moved to ledgers.

Everything else is reuse, folding in, or retirement.

## Goals

- **A player can predict what is here when they come back**, from where they
  left it and nothing else: on them, in a kept container, or neither.
- **Only containers keep, and a player can see which ones do.** A locker
  rented in a staged inn keeps; the inn's floor does not. A thing's state
  rides its container: a plant in your plot is kept, and a plant in a staged
  park restages.
- **No saved record grows without a physical bound.** Every record is a kept
  container or a body, bounded by its interior, its carrying capacity or its
  footprint. An owner's record holds what they carry, never what they own
  elsewhere.
- **History is a ledger.** The commons' water history and a business's books
  survive every restart and restage, and are never anyone's container.
- **What the world derives is never kept.**
- **Out of the narrative is null.** No content means *nowhere*.
- **A failed save is never silent.**
  - The operator sees it in the author diagnostics.
  - The player is told their things could not be saved.
  - One refused record never fails another's.
  - Sign-out always completes.
- **A player learns the rule without being nagged.**
  - the keeper convention;
  - the **kept** marker on the place card and in `look`;
  - a teaching line the first time they leave something they own somewhere
    not kept, at most once more, then never.

## Non-goals

- **The staged lifecycle** → [staging-slate](../slates/platform/staging-slate.md)
  and [quest-modeling-slate](../slates/world/quest-modeling-slate.md). That
  covers part policies (recall, re-mint, release, prevent), restaging on
  unload, a warren as a multi-place stage, staff clearing strays, timed or
  commanded restages, named sets and scenes, claims, and staff walking home.
  The owner: *"this build is not a build about the staged lifecycle, that
  needs conversations about narratives."*
- **Turning unloading on in shipped worlds** → staging-slate. It stays in
  observe mode (owner).
- **Lost property for strays.** Nowhere, deliberately. A stray is lost; the
  ship's crew stowing her deck gear is the one staff act that keeps.
- **Saving staged state across a reboot.** Nowhere, deliberately (owner).
- **Migrating records already written.** Nowhere: there are no migrations,
  and the dev databases are dropped.
- **The two unrelated defects the survey found** → a GitLab issue each:
  - kept animals can never be unloaded;
  - object-form `cast:` entries are skipped on a re-seed.
- **A priced locker** → the retail slate. The locker is free custody.
- **Giving and trading goods** → [chattel.md § Deferred](../subsystems/chattel.md).
- **Where a record lands in a sandbox circle** → [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md)
  D6. It composes with this build.

## Placement

Kernel substrate, with rows choosing. A container's kind, kept or staged, is
its class, so a row picks it; that is what makes it visible and teachable.
Ledgers live with the system they record: the water pack's commons, the
business. ⭐ **A second kept locker or a second ledgered gate needs no
code.**

## Collisions

- **Dorms and letting buildings.** The tenant is the keeper. At lease end the
  landlord boxes the goods into the letting business's kept storeroom, and
  the former tenant reclaims them at the letting office.
- **Ships.** The hold keeps, and her keeper is her owner. Her crew stowing
  loose deck gear at sleep stays.
- **Shops.** A consignment shelf keeps for its consignors wherever the shop
  is.
- **Pets.** A kept animal is a body and keeps itself wherever it is; `homes`
  walks it back. Its record no longer depends on its name.
- **Plants, wells, wellheads and buildings** are kept by their container and
  have no record of their own. A sold building's condition rides the holding
  it stands on. A staged park's plants restage.
- **The water commons.** Aquifer draws, gate openings and conduit deliveries
  become ledger entries. The water drawn last dry year must survive exactly
  as it does today.
- **Businesses.** Books and cap tables become ledger entries. A share sale
  survives a restart.
- **Off-shift staff.**
  - Every `Offstage` room and every row naming one is axed.
  - The lounge regulars' off-shift place is Dave's Bar itself, reached by
    their own acts. **The bar is unchanged.**
  - The ice company's hands go to their shed, which is content.
  - Everyone else off shift is null.
- **The lounge and Dave's Bar**, the backstop, stay as available as today.
- **Estate succession** (escheat, the beneficiary) keeps working. It follows
  title, not stored goods.

## Surface decisions

### The four kinds
Owner, 2026-11-23:
- things are kept by containers;
- history by ledgers;
- bodies keep themselves;
- the derived is never kept.

Rejected:
- ownership as storage;
- naming as persistence (*"a wand they'll zap at everything"*);
- lost property.

### Only containers twin
Owner: *"the only thing that need twins are the containers."* Kept and
staged are structurally different. The framework's way of showing a player
what an object composes is what teaches the difference, so it is the
container's class, never a field every object carries.

### Ledgers move in this build
Owner. History is not a container and never restages.

### Unloading stays off; the staged lifecycle is cut
Owner. A staged place restages at reboot. The part NAME survives only as the
key that lets a kept locker or shelf in a plain room find its record after a
restart.

### Out of the narrative is null
Owner: *"outside the narrative is just null… if you're supposed to be
chilling off shift at the bar… that's content. What I'm opposed to is
content that means 'nowhere'."*

### Strays
Lost when their place restages. The ship's crew stow is the one staff act
that keeps.

### Kept animals keep themselves
Owner. Bonding is the animal's act, so this is not a wand.

### Lease end
Owner. The landlord boxes the goods, and the tenant reclaims them.

### The word
**Kept** (owner).

### Open kept places
A place with no walls and no roof is bounded by its **footprint**: things
lying on the ground take ground. Bodies do not count, because a crowd is not
storage.

## Lens pass

1. **Pedagogy** — stewardship is real: what you keep, you look after. The
   commons' water history is a ledger a player can study.
2. **Creative expression** — an author chooses a kept or a staged container
   by its class; a second kept locker is a row.
3. **Immersion / participation** — 3a: nothing means *nowhere*, and NPCs are
   where their content puts them. 3b: hoarding has physical bounds and no
   engine cap.
4. **Values** — loss is legitimate; the engine never rescues.
5. **Continuity** — keeping depends on where a thing is, never on who owns
   it, so succession moves no stored state. History survives every epoch.
6. **Economy** — storage has a visible price: a room, a locker, a shelf.
7. **Governance** — none judges a person. ⚠ The size reading is an operator
   instrument.

## The drive

The drive stands in the test scaffold (`/world/testbed`), plus the dorm, a
ship, the water commons and a business. Nothing waits on the clock, so
**there is no soak drive**.

### Blocking drive

1. *instant · player* — In the scaffold's staged venue the player sets an
   owned cup down. The response tells them, once, that things left here are
   not kept; a second cup gets no line. The place card and `look` show the
   venue not kept, and the dorm **kept**.
2. *instant · player* — The player leaves goods in four places: on the dorm
   table, in a dorm chest, on a consignment shelf in a staged shop, and in a
   locker in the venue. A bonded, unnamed cat follows them into the street,
   and the player signs out there.
3. *instant · staged* — The water commons draws from its aquifer and opens a
   gate. A business sells a share.
4. *short · player* — **Restart.**
   - The dorm table and chest are as left.
   - The consigned good and the locker's good are where they were.
   - The venue is as authored, and the cups are gone.
   - The cat exists and walks home, one visible step at a time.
   - The aquifer's draws, the gate's openings and the share sale are all on
     the record.
5. *instant · staged* — The operator's size reading shows that the player's
   record holds only what they carry, that each kept container holds only
   its contents, and that no plant, gate or well has a record of its own.
6. *instant · staged* — One player's save is made to fail.
   - The operator sees it in `errors` with the record and the reason.
   - The player is told.
   - Another player saved in the same batch is saved.
   - The failing player signs out, and the body leaves the world.
7. *short · staged* — The player's dorm lease ends. Their goods are in the
   letting business's storeroom, and they reclaim them at the letting office.
8. *instant · player* — On a ship the player leaves gear loose on deck. The
   ship sleeps and wakes, and the gear is in her hold.
9. *short · player* — A shopkeeper's shift ends. He is nowhere: there is no
   `Offstage` room to find him in. He is at his station for the next shift.
10. *short · player* — A lounge regular's shift ends, and they spend it in
    Dave's Bar as today. The bar is otherwise unchanged.
11. *short · player* — **Restart.** Every staged place is as authored, every
    kept container is as left, and every Cast member exists exactly once.

### Soak drive

None — no step waits on the clock.

## Acceptance criteria

- **A thing is where its keeping says it is.** A player who leaves a thing:
  - on themselves finds it with them;
  - in a kept container finds it as left, across a restart;
  - anywhere else finds it gone once the place restages.

  No other factor (ownership, a name) changes the outcome, except a kept
  animal.
- **Only containers keep.** No plant, well, gate or building has a saved
  record of its own; each is kept by its container or not at all.
- **History survives.** The commons' water history and a business's books
  survive every restart, as records.
- **Keeping is visible.** Every place and container shows whether it is
  kept, on the place card and in `look`. The teaching line appears at most
  twice per character.
- **A player's saved record holds only what they carry.**
- **No `Offstage` room or row exists.** Off-shift staff are nowhere except
  where content gives them a place (the bar, the shed). Dave's Bar and the
  lounge are unchanged.
- **A refused save is reported** to the operator and the player, fails no
  other record, and never keeps a body in the world.
- **Lease end and ships work as described.** At lease end the tenant's goods
  are reclaimable from the landlord. A ship's loose deck gear is in her hold
  after she sleeps.
- **Nothing regresses.** The existing restart drives stay green, and the
  shutdown save does not noticeably slow.

## Cross-references

- Seeding slates: [persistence-model-slate](../slates/engine/persistence-model-slate.md)
  (reuse ledger § 8) · [staging-slate](../slates/platform/staging-slate.md)
- Subsystems:
  - [persistence.md](../subsystems/persistence.md),
    [residency.md](../subsystems/residency.md),
    [furnishing.md](../subsystems/furnishing.md),
    [chattel.md](../subsystems/chattel.md)
  - [residence.md](../subsystems/residence.md),
    [retail.md](../subsystems/retail.md),
    [employment.md](../subsystems/employment.md)
  - [watershed.md](../subsystems/watershed.md),
    [water-supply.md](../subsystems/water-supply.md)
  - [ship.md](../subsystems/ship.md), [pets.md](../subsystems/pets.md),
    [size.md](../subsystems/size.md),
    [diagnostics.md](../subsystems/diagnostics.md)
- Related:
  - [records-as-documents-slate](../slates/tech-debt/records-as-documents-slate.md)
    (the ledgers)
  - [eager-residency-slate](../slates/tech-debt/eager-residency-slate.md)
    (§ 7 answered)
  - [stale-reference-boot-slate](../slates/tech-debt/stale-reference-boot-slate.md)
  - [pets-slate](../slates/engine/pets-slate.md)
  - [avatar-family-slate](../slates/engine/avatar-family-slate.md)
