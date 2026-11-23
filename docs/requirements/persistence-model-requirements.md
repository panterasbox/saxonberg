# Persistence model — requirements

**Status:** AGREED 2026-11-23 (owner)
**Kind:** refactor/sweep
**Leads from:** the kernel. First consumers: the test scaffold's venue and a
new two-room stage in it, the dorm and letting buildings, ships, consignment
shelves, pets, and the businesses whose staff use `Offstage`.

A player asks one question of the world: *if I walk away, what will be here
when I come back?* Today the answer comes from three rules that do not know
about each other:

- whether the place saves itself;
- an **estate** that copies everything a player owns into the player's own
  record, with no limit;
- naming, which promotes a thing to a record of its own.

No player can predict how these overlap. This build replaces them with one
model: two facts per thing, one rule for every thing, and keepers you can
name. It includes the part of staging that the question needs. A stage owns
its parts by identity, so restoring a place never duplicates anything and a
part that leaves comes back as its author declared.

Seeding slates:

- [persistence-model-slate](../slates/engine/persistence-model-slate.md), the
  model. Its § 8 is the reuse ledger.
- [staging-slate](../slates/platform/staging-slate.md), for part identity,
  the part policies, strays and the wings. Its named sets, claims and timed
  restages stay on that slate.

## What the thing is

Every thing carries **two facts**:

1. **Whose part is it?** A part belongs to a stage **by identity, not
   location**. A restage returns it to its authored state wherever it has
   wandered, and never makes a second one.
   - A single place is its own stage manager, through what it lists to stage.
   - A **warren** is the stage manager when several places are one stage.
     (Owner: *"you really only need a warren if multiple places are all
     managed together as a single stage."*)
2. **Does its inside keep?** This is a rule on each container: a room, a
   chest, a shelf, a body.
   - A kept inside saves what is in it.
   - Anything else in a place that is not kept is a **stray**, lost at the
     next restage.
   - **A body always keeps.** A kept animal counts as a body: an animal that
     has accepted a keeper keeps itself, named or not.

**One rule for every thing.** A thing follows its place's rule. Players never
decide what persists; keepers do. A player's one lever is the one a real
person has: where they leave things. **Ownership and naming confer no
persistence.** Ownership is the history of title, and naming is identity.

**A kept inside always has a keeper you can name**: your room, a locker or
shelf rented to you, your pack, a business's storeroom, a ship's hold. Kept
places are the residence ladder, with the dorm as its lowest rung. A lower
rung would be content on the same rule.

**A restage happens when a place unloads or the server reboots.** Nothing
staged is saved. A staged place reverts whenever it leaves memory, and it
leaves memory only when nobody is there to see it.

**Out of circulation is no place at all.** Someone taken out of circulation
(staff off shift) has no environment, not a placeholder room.

## What already exists

- **Kept places.** About a hundred place rows use persisting classes: halls,
  rooms, the dorm, holds, mine rooms, tracts, woods. Keeping is decided per
  class today, never per container. A container inside a kept room keeps with
  it. A persisting container in a plain room does **not** keep: a consignment
  shelf in a plain room loses its consigned goods at reboot today, a gap
  retail.md admits. That affects 31 of the ~46 shop shelves.
- **Staging, partly.**
  - A place stages its `props:` and `cast:` once, at birth.
  - A singleton cast member is never duplicated, but an Extra or a beast
    **is** duplicated when its home re-clones while it is away.
  - Nothing stamps which stage a thing belongs to.
  - The campus farm's tool rack walks its lent tools home and re-mints only
    the ones destroyed. It is the closest precedent for a recalled part.
- **Warrens** manage groups of places. Only the ship comes near restaging:
  she is fitted out from her rows on waking, and her crew stows loose deck
  gear into the hold when she sleeps.
- **The estate, the promoted tier and the room overlay**, which this build
  retires. A refused save is silent everywhere. A signed-out body whose save
  keeps failing never leaves the world.
- **Lease end.** The letting warren moves the tenant's goods to estate
  storage.
- **Pets** persist only once named. Cats and farm dogs walk home along their
  remembered trail.
- **Off-shift staff** are teleported to an `Offstage` room (about twenty rows).
- **The place card** already declares a `staged` flag that nothing fills.
  No once-per-character hint mechanism exists.

**Therefore what is genuinely new here is:**

- the per-container keeping rule;
- a part's identity, stamped on it;
- restoring a place or a warren as reconciliation of its own parts, under the
  part policies;
- the kept marker and the once-only teaching line.

The rest is reuse, generalization or retirement.

## Goals

- **A player can predict what is here when they come back**, from where they
  left it and nothing else: on them, in something kept, or neither.
- **Every container states whether its inside keeps**, and it keeps wherever
  it stands. A rented locker in a staged inn keeps; the inn's floor does not.
- **No saved record grows without a physical bound.** A record is a kept
  inside or a body, bounded by its interior, its carrying capacity or its
  footprint. An owner's record holds what they carry, never what they own
  elsewhere.
- **A staged place or warren comes back as authored, and never duplicated.**
  A part that wandered is recalled, re-minted, released or never let out, by
  its declared policy. Strays are cleared, unseen or by staff.
- **Out of circulation is null.** `Offstage` and its rows are gone.
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

- **Scenes, and authored narratives as one thing** →
  [quest-modeling-slate](../slates/world/quest-modeling-slate.md) (the owner
  wants quest design settled soon). Named sets stay open on the
  [staging-slate](../slates/platform/staging-slate.md).
- **Restaging on a cadence, an event or a title holder's command** → the
  staging slate. Here a restage is an unload or a reboot.
- **NPCs two stories want** (claims, the call sheet, loans, fallbacks) → the
  staging slate.
- **Staff walking home at the end of a shift** instead of leaving circulation
  → the staging slate's "business first" (§ 6); behavior, not persistence.
- **Lost property for strays.** Nowhere, deliberately. A stray is lost; the
  one exception is a stage whose staff move strays into a kept inside the
  author names.
- **Saving staged state across a reboot.** Nowhere, deliberately (owner).
- **Migrating records already written.** Nowhere: no migrations, and the dev
  databases are dropped.
- **The two unrelated defects the survey found** → a GitLab issue each:
  kept animals can never be unloaded from memory, and object-form `cast:`
  entries are skipped on a re-seed.
- **Giving and trading goods** →
  [chattel.md § Deferred](../subsystems/chattel.md).
- **Where a record lands in a sandbox circle** →
  [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md) D6. It composes
  with this build.

## Placement

The model, part identity, the policies and restaging are kernel substrate.
**Rows** say which inside keeps, which parts a stage owns and each part's
policy. ⭐ **A second stage or a new kept locker needs no code.** The
test-fixtures pack gains a two-room stage for the drive.

## Collisions

- **Dorms and letting buildings.** The tenant is the keeper. At lease end the
  landlord boxes the goods into the letting business's kept storeroom, and
  the former tenant reclaims them from the letting office.
- **Ships.** The hold keeps, and its keeper is the ship's owner. Her crew
  stowing loose deck gear into the hold at sleep is that stage's staff act,
  and it stays.
- **Shops.** A consignment shelf keeps for its consignors wherever the shop
  is. Shop stock is a part that restocks to par. The tool rack's recall
  becomes the general recall policy.
- **Pets.** A kept animal is a body, keeps itself wherever it is, and
  `homes` walks it back. Its record no longer depends on its name.
- **Unsold buildings.** A building keeps once it has a keeper (title sold),
  which is consistent with "a keeper you can name".
- **Businesses with `Offstage`.** Off-shift staff leave circulation to null
  and come back at their station. The ~20 `Offstage` rows go.
- **The lounge and Dave's Bar**, the backstop. **Untouched**, and as
  available as today.
- **Estate succession** (escheat, the beneficiary) lives on the estate today
  and must keep working. It follows title, not stored goods.
- **Cast duplication.** Extras and beasts in a non-persisting home's cast
  stop duplicating.

## Surface decisions

### Two facts per thing; one rule for every thing
Owner, 2026-11-23. Rejected: ownership as storage (an unbounded record),
naming as persistence (*"a wand they'll zap at everything"*), and lost
property.

### The stage manager
Owner. A place manages its own stage, and a warren manages a stage of several
places. There is no separate staging object.

### Unload and reboot are restages
Owner. Nothing staged is saved, and a place unloads only when nobody is in
it.

### Strays
Owner: one rule, they are lost at restage. The author picks only how that
looks: unseen, a staff member clears them, or staff move them into a kept
inside the author names.

### Kept animals keep themselves
Owner. An animal that has accepted a keeper is a body. Bonding is the
animal's act, so this is not a wand.

### Lease end
Owner: the landlord boxes the goods, and the former tenant can reclaim them.

### Out of circulation
Owner: *"there's no reason to stick someone in some placeholder content when
we want to take them out of circulation, just set the environment to null."*
`Offstage` retires.

### Prevent, for what a player carries
Lens 3a: refused at the stage's door, so a thing is never taken out of an
inventory later.

### The word
**Kept** (owner). It appears on the place marker and in the teaching line.

### Open kept places
A place with no walls and no roof (a field, a wood, a tract) is bounded by
its **footprint**: things lying on the ground take ground. Every other place
is already bounded by its interior.

## Lens pass

1. **Pedagogy** — none directly; it is the substrate. Stewardship becomes
   real: what you keep, you look after.
2. **Creative expression** — an author states a kept locker, a part's policy
   or a stray rule as rows; a second stage is content.
3. **Immersion / participation** — 3a: nothing rearranges in front of you
   and a stage never duplicates anyone. 3b: hoarding has physical bounds and
   no engine cap.
4. **Values** — loss is legitimate and the engine never rescues; a re-mint
   is the author's declared choice.
5. **Continuity** — whether a good is kept depends on where it is, never on
   who owns it, so succession moves no stored state.
6. **Economy** — storage has a visible price: a room, a locker, a shelf
   rented to you.
7. **Governance** — none judges a person. ⚠ The size reading is an operator
   instrument.

## The drive

Everything stands in the test scaffold (`/world/testbed`), plus the dorm and
a ship. The new stage's rooms are looked at in their own light, by day and by
night. Nothing waits on the clock, so **there is no soak drive**.

### Blocking drive

**A — keeping and strays**

1. *instant · player* — In the scaffold's staged venue the player sets an
   owned cup down. The response tells them, once, that things left here are
   not kept. A second cup gets no line. The place card and `look` show the
   venue not kept; the dorm shows **kept**.
2. *instant · player* — The player moves a staged chair across the room and
   leaves.
3. *short · staged* — The venue unloads. Back again: the chair is on its mark
   and both cups are gone.
4. *instant · player* — The player leaves goods in four places: on the dorm
   table, in a dorm chest, on a consignment shelf in a staged shop, and in a
   locker they rent in the venue.
5. *instant · player* — A bonded, unnamed cat follows the player into the
   street. The player signs out there.
6. *short · player* — **Restart.** The dorm table and chest are as left. The
   consigned good is on its shelf and the locker's good is in the locker.
   The venue is as authored. The cat exists and walks home one visible step
   at a time.
7. *instant · staged* — The operator's size reading shows the player's record
   holds only what they carry, and each kept inside holds its own contents.
8. *instant · staged* — One player's save is made to fail. The operator sees
   it in `errors` with the record and the reason, and the player is told.
   Another player saved in the same batch is saved. The failing player signs
   out, and the body leaves the world.
9. *short · staged* — The player's dorm lease ends. The goods are in the
   letting business's storeroom, and they reclaim them at the letting office.
10. *instant · player* — On a ship the player leaves gear loose on deck. The
    ship sleeps and wakes, and the gear is in the hold.

**B — stages and parts**

11. *instant · player* — The scaffold's two-room stage (a warren) holds:
    - a lamp (re-mint);
    - an altar sword (release);
    - a chapel candle (prevent);
    - an Extra (recall).

    The player takes the sword and the lamp. They carry the candle around
    inside and are refused at the door with it. The Extra wanders out.
12. *short · staged* — The stage unloads and comes back:
    - the sword stays the player's;
    - a new lamp is on its mark, with no second one when the old one is
      brought back;
    - the Extra is home, and there is exactly one of it, counted.
13. *instant · player* — The player stands in the stage. It does not unload
    or rearrange while they are there. Where the author chose staff, a
    cleaner clears the strays in view.
14. *short · player* — A shopkeeper's shift ends. He leaves circulation (no
    `Offstage` room exists to find him in) and is at his station for the
    next shift.
15. *short · player* — **Restart.** Every staged place is as authored, every
    Cast member exists exactly once, and every kept inside is as left.

### Soak drive

None — no step waits on the clock.

## Acceptance criteria

- **A player who leaves things on themselves, in a kept inside or
  elsewhere** finds them, respectively: with them; as left, across a
  restart; and lost once the place restages. No other factor (ownership, a
  name) changes the outcome, except a kept animal.
- **Every place and container shows whether it is kept**, on the place card
  and in `look`. The teaching line appears at most twice per character.
- **Saved records hold only their own contents.** A player's record holds
  only what they carry, and a kept inside's record holds only its contents.
- **A staged place or warren is as authored** after it unloads or the server
  reboots, never rearranged in front of a player except by staff, and no
  part is ever duplicated.
- **Part policies behave as declared** (recall, re-mint, release, prevent).
  A carried prevent part is refused at the door.
- **Off-shift staff are nowhere**, and no `Offstage` room exists.
- **A refused save is reported** to the operator and the player, fails no
  other record, and never keeps a body in the world.
- **Lease end and the ship.** At lease end the tenant's goods are reclaimable
  from the landlord. A ship's loose deck gear is in her hold after she
  sleeps.
- **The backstop is unaffected.** The lounge and Dave's Bar are unchanged.
  The existing restart drives stay green, and the shutdown save does not
  noticeably slow.

## Cross-references

- Seeding slates:
  [persistence-model-slate](../slates/engine/persistence-model-slate.md)
  (reuse ledger § 8) and
  [staging-slate](../slates/platform/staging-slate.md).
- Subsystems:
  - [persistence.md](../subsystems/persistence.md)
  - [residency.md](../subsystems/residency.md)
  - [furnishing.md](../subsystems/furnishing.md)
  - [chattel.md](../subsystems/chattel.md)
  - [residence.md](../subsystems/residence.md)
  - [retail.md](../subsystems/retail.md)
  - [employment.md](../subsystems/employment.md)
  - [identity.md](../subsystems/identity.md)
  - [ship.md](../subsystems/ship.md)
  - [pets.md](../subsystems/pets.md)
  - [size.md](../subsystems/size.md)
  - [diagnostics.md](../subsystems/diagnostics.md)
- Related:
  - [eager-residency-slate](../slates/tech-debt/eager-residency-slate.md)
    (§ 7 answered)
  - [stale-reference-boot-slate](../slates/tech-debt/stale-reference-boot-slate.md)
  - [pets-slate](../slates/engine/pets-slate.md)
  - [avatar-family-slate](../slates/engine/avatar-family-slate.md)
  - [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md) (D6)
