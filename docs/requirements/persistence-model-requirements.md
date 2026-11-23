# Persistence model + staging — requirements

**Kind:** refactor/sweep, with a feature half (staging)
**Leads from:** the kernel. First consumers:
- the test scaffold's venue and a new two-room stage in it;
- the dorm, ships, consignment shelves and pets;
- the businesses whose staff use `Offstage`;
- Dave's Bar, as the first real content with two sets (open and closing
  time; see Surface decisions).

**What this does.** A player asks one question of the world: *if I walk away,
what will be here when I come back?* Today the answer comes from three rules
that do not know about each other:
- whether the place saves itself;
- an **estate** that copies everything a player owns into the player's own
  record, with no limit;
- naming, which promotes a thing to a record of its own.

No player can predict how these overlap. This build replaces them with one
model: two facts per thing, one rule for every thing, and keepers you can
name. It also builds the **stage manager** that returns authored content to
its arc, which is the other half of the same question.

**Seeding slates:**
- [persistence-model-slate](../slates/engine/persistence-model-slate.md)
  (the model; the reuse ledger is its § 8);
- [staging-slate](../slates/platform/staging-slate.md) (identity, sets,
  policies, actors, the wings).

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
   - **A body always keeps.** That includes a kept animal: an animal that
     has accepted a keeper keeps itself, named or not.

**One rule for every thing.** A thing follows its place's rule. Players never
decide what persists; keepers do. A player's one lever is the one a real
person has: where they leave things. **Ownership and naming confer no
persistence.** Ownership is the history of title, and naming is identity.

**A kept inside always has a keeper you can name**: your room, a locker or
shelf rented to you, your pack, a business's storeroom, a ship's hold. Kept
places are the residence ladder, with the dorm as its lowest rung; a lower
rung would be content on the same rule.

**Unloading and rebooting are restages.** Nothing staged is saved. A staged
place reverts whenever it leaves memory, and a place leaves memory only when
nobody is there to see it.

## What already exists

- **Kept places.** About a hundred place rows on persisting classes (halls,
  rooms, the dorm, holds, mine rooms, tracts, woods). Keeping is decided per
  CLASS today, never per container.
- **Containers inside a kept room keep with it.** A persisting container in
  a plain room does **not** keep: a shop's consignment shelf in a plain room
  loses its consigned goods at reboot today (a gap retail.md admits).
- **Staging, partly.** A place stages its `props:` and `cast:` once, at
  birth.
  - A singleton cast member is never duplicated.
  - An ordinary one (an Extra, a beast) **is duplicated** when its home
    re-clones while it is away.
  - Nothing stamps which stage a thing belongs to.
  - Two objects already reset themselves: shop stock tops back to par, and
    the campus farm's tool rack walks its lent tools home and re-mints only
    the ones destroyed. The tool rack is the closest precedent for a part
    that is recalled, never duplicated.
- **Warrens** manage groups of places: the dorm, letting buildings, plats,
  mines, ships, the lounge, the sea, the river, underwater columns.
  - Only the ship comes close to restaging: on waking she is fitted out from
    her rows, and on sleeping her crew stows loose gear in the hold.
  - No warren has sets or a cadence.
- **The estate, the promoted tier and the room overlay**, which this build
  retires. A refused save is silent everywhere. A signed-out body whose save
  keeps failing never leaves the world.
- **When a lease ends**, the letting warren moves the tenant's goods to
  estate storage.
- **Pets:**
  - Pets persist only once named.
  - Cats and farm dogs walk home along their remembered trail (`homes`).
- **Employment** moves off-shift staff to an `Offstage` room by teleport
  (about twenty rows).
- **The place card** already declares a `staged` flag that nothing fills. No
  once-per-character hint mechanism exists.

**Therefore what is genuinely new here is:**
- the per-container keeping rule;
- a part's identity, stamped on it;
- restaging as reconciliation, for a single place and for a warren;
- named sets, part policies, claims and the call sheet, and the wings;
- the kept marker and the once-only teaching line.

Everything else is reuse, generalization or retirement.

## Goals

- **A player can predict what is here when they come back**, from where
  they left it and nothing else: on them, in something kept, or neither.
- **Every container states whether its inside keeps**, and it keeps
  wherever it stands. A rented locker in a staged inn keeps; the inn's floor
  does not.
- **No saved record grows without a physical bound.**
  - A record is a kept inside or a body: bounded by its interior, carrying
    capacity, or footprint.
  - An owner's record holds what they carry, never what they own elsewhere.
- **Staged content returns to its arc, and is never duplicated.**
  - A part that wandered is recalled, walked home, re-minted, released or
    was never let out, according to its declared policy.
  - Strays are cleared, unseen or by staff.
- **A stage has named sets** (act 1, the climax, closing time) and restages
  to any set as a difference, on a cadence, an event or a command from
  whoever holds title to it.
- **An NPC two stories want is lent, not copied.**
  - A stage that loses a claim copes by its declared fallback.
  - Staff go home at the end of a shift by walking. No one blinks out.
- **A failed save is never silent.**
  - The operator sees it in the author diagnostics.
  - The player is told their things could not be saved.
  - One refused record never fails another's.
  - Sign-out always completes.
- **A player learns the rule without being nagged:**
  - the keeper convention;
  - the **kept** marker on the place card and in `look`;
  - a teaching line the first time they leave something they own somewhere
    not kept, at most once more, then never.

## Non-goals

- **Lost property for strays.** Nowhere, deliberately: a stray is lost.
  The one exception is a stage whose staff move strays into a kept inside
  the author names (the ship's crew).
- **Saving staged state across a reboot.** Nowhere, deliberately (owner):
  unloading and rebooting are restages.
- **Migrating records already written.** Nowhere: no migrations; the dev
  databases are dropped.
- **Unowned goods' rescue from a public place** (eager-residency § 7):
  answered, they are strays.
- **The two unrelated defects the survey found** go to a GitLab issue each:
  - kept animals can never be unloaded from memory;
  - object-form `cast:` entries are skipped on a re-seed.
- **Giving and trading goods between players** →
  [chattel.md § Deferred](../subsystems/chattel.md).
- **Where a record lands in a sandbox circle** →
  [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md) D6. It composes
  with this build.

## Placement

The model, restaging, sets, policies, claims and the wings are kernel
substrate. Which inside keeps, which parts a stage owns, its sets and its
policies are **rows**.

⭐ **A second stage needs no code.** A second warren-sized stage, a third
set or a new kept locker is content only. The test-fixtures pack gains a
two-room stage for the drive. Dave's Bar gains its closing-time set.

## Collisions

- **Dorms and letting buildings.**
  - The tenant is the keeper.
  - At lease end the landlord boxes the goods into the letting business's
    kept storeroom, and the former tenant reclaims them from the letting
    office.
- **Ships.** The hold keeps, and her keeper is her owner. Her crew stowing
  loose deck gear into the hold at sleep is that stage's staff act, kept.
- **Shops.**
  - A consignment shelf's inside keeps for its consignors, wherever the
    shop is.
  - Shop stock is a part that restocks to par.
  - The tool rack's recall becomes the general recall policy.
- **Pets.** A kept animal is a body. It keeps itself wherever it is, and
  `homes` walks it back. Its record no longer depends on its name.
- **Unsold buildings.** A building keeps once it has a keeper (a title
  sold). That is consistent with "a keeper you can name".
- **Businesses with `Offstage`.** Their staff go home to a real room at the
  end of a shift. The `Offstage` rows become somewhere to go.
- **Employment's shift becomes a claim** on the actor's call sheet.
- **The lounge and Dave's Bar,** the backstop, must stay exactly as
  available as today.
- **Estate succession** (escheat, the beneficiary) lives on the estate
  today and must keep working: it follows title, not stored goods.
- **Cast duplication.** Extras and beasts in a non-persisting home's cast
  stop duplicating.

## Surface decisions

### Two facts per thing; one rule for every thing
Owner, 2026-11-23. Rejected: ownership as storage (an unbounded record),
naming as persistence (*"a wand they'll zap at everything"*), and lost
property.

### The stage manager
The owner rules that it is one concept. A place manages its own stage; a
warren manages a stage of several places. There is no separate staging
object.

### Unload and reboot are restages
Owner. Nothing staged is saved. Deploy timing is accepted as able to
restage a place, and a place only unloads when nobody is in it.

### Strays
Owner: one rule, they are lost at restage. The author chooses only how it
looks:
- unseen;
- a staff member visibly clears them;
- staff move them into a kept inside the author names.

### Kept animals keep themselves
Owner. An animal that has accepted a keeper is a body. Bonding is the
animal's act, so this is not a wand.

### Lease end
Owner: the landlord boxes the goods into a kept storeroom, and the former
tenant can reclaim them.

### Named sets are a menu
Lens 2. Any set, any time; an author who wants acts drives them with
events.

### Prevent, for what a player carries
Lens 3a: refused at the stage's door. A thing is never taken out of an
inventory later.

### Two stories want one person
Lens 3b: the person decides, in their own deliberation beat, ranked by each
claim's urgency. An Extra is a role and is never contested.

### When a restage happens
Unseen or through the world. It runs on game time by the stage's cadence,
on an event, on a command from the title holder, or when the place unloads.
It never rearranges a place in front of a player except through staff.

### The word
**Kept** (owner). It appears on the place marker and in the teaching line.

### Open kept places
A place with no walls and no roof (a field, a wood, a tract) is bounded by
its **footprint**: things lying on the ground take ground. Every other place
is already bounded by its interior.

### Dave's Bar's closing time
The first real content with two sets. Proposed: at closing time the chairs
go up and Dave wipes down, and opening restores it. ⚠ Confirm in review of
this draft.

## Lens pass

1. **Pedagogy.** None directly; it is the substrate every taught scenario
   stands on. Stewardship becomes real: what you keep, you look after.
2. **Creative expression.**
   - An author states a kept locker, a set, a policy or a stray rule as
     rows.
   - A bespoke stage needs nothing more.
   - A second stage is content.
3. **Immersion and participation.**
   - 3a: nothing rearranges in front of you; staff walk out and home; a
     stage never duplicates a person.
   - 3b: hoarding has physical bounds and no engine cap, and what the polity
     makes of it is the polity's.
4. **Values.**
   - Loss is legitimate, and the engine never rescues.
   - A faucet (re-mint) is the author's declared choice.
5. **Continuity.**
   - A part answers the same commands in every set and epoch.
   - A good's keeping depends on where it is, never on who owns it, so
     succession moves no stored state.
6. **Economy.**
   - Storage has a price you can see: a room, a locker, a shelf rented to
     you.
   - Release is the default for anything ownable.
7. **Governance.**
   - Restaging is by whoever holds title to the content, never a wizard
     check.
   - Casting is requested, never taken.
   - ⚠ Gap: none judges a person. The size reading is an operator
     instrument.

## The drive

Everything stands in the test scaffold (`/world/testbed`), plus the dorm,
a ship and Dave's Bar. Every new place is looked at in its own light, by
day and by night.

### Blocking drive

**A: keeping and strays**

1. *instant · player.* In the scaffold's staged venue the player sets an
   owned cup down. The response tells them, once, that things left here are
   not kept. A second cup gets no line. The place card and `look` show the
   venue not kept; in the dorm they show it **kept**.
2. *instant · player.* The player moves a staged chair across the room, then
   leaves.
3. *short · staged.* The venue restages unseen, when it unloads. Coming
   back: the chair is on its mark, and both cups are gone.
4. *instant · player.* In the dorm the player puts goods on the table and in
   a chest. In a staged shop they consign a good on a shelf. In the venue
   they rent a locker and put a good in it.
5. *instant · player.* A bonded, unnamed cat follows the player into the
   street. The player signs out there.
6. *short · player.* **Restart.**
   - The dorm table and chest are as left.
   - The consigned good is on its shelf.
   - The locker's good is in the locker.
   - The venue is as authored.
   - The cat exists and walks home, one visible step at a time.
7. *instant · staged.* The operator's size reading shows that the player's
   record holds only what they carry, and each kept inside holds its own
   contents.
8. *instant · staged.* One player's save is made to fail.
   - The operator sees it in `errors`, with the record and the reason.
   - The player is told.
   - Another player saved in the same batch is saved.
   - The failing player signs out, and the body leaves the world.
9. *short · staged.* The player's dorm lease ends. Their goods are in the
   letting business's storeroom. They reclaim them at the letting office.
10. *instant · player.* On a ship the player leaves gear loose on deck. The
    ship sleeps and wakes: the gear is in the hold.

**B: stages, sets and policies**

11. *instant · player.* The scaffold's two-room stage (a warren) holds a
    door, a lamp (re-mint), an altar sword (release), a chapel candle
    (prevent) and an Extra (recall).
    - The player takes the sword and the lamp.
    - They carry the candle around inside and are refused at the door with
      it.
    - The Extra wanders out.
12. *short · staged.* The stage restages to its default set.
    - The sword stays the player's.
    - A new lamp is on its mark, and there is no second one if the old one
      returns.
    - The Extra walks back. There is exactly one of it, counted.
13. *instant · staged.* Its title holder restages it to **the climax**: the
    door is barred and the cultist is on stage. Only the differing parts
    changed. Back to the default, as the same difference.
14. *instant · player.* The player stands in the stage while a restage is
    due. Nothing rearranges in front of them. A staff member clears the
    strays where the author chose that look.
15. *short · player.* Dave's Bar at closing time and at opening.

**C: actors two stories want**

16. *short · player.* The shopkeeper's shift ends. He walks out of the shop
    and home, and no one blinks out. He walks in for the next shift.
17. *short · staged.* A named NPC with a weekly bank claim walks out to the
    bank. The shop restages while he is on loan: he is not recalled, not
    copied, and the shop shows his fallback ("back soon").
18. *instant · staged.* Two claims collide. The NPC goes where the more
    urgent claim wants him, and the other stage uses its fallback.
19. *short · player.* **Restart.**
    - Every staged place is as authored.
    - Every Cast member exists exactly once.
    - Every kept inside is as left.

### Soak drive

S1. *span · staged.* A stage on a seasonal cadence (a festival square)
restages at the season's turn with nobody present, and stays as authored
between turns.

## Acceptance criteria

- **A player who leaves things on themselves, in a kept inside, or
  elsewhere finds them, respectively:**
  - with them;
  - as left, across a restart;
  - lost at the next restage.

  No other factor (ownership, a name) changes the outcome. The one
  exception is a kept animal.
- **Every place and container shows whether it is kept**, on the place card
  and in `look`. The teaching line appears at most twice per character.
- **A player's saved record holds only what they carry.** A kept inside's
  record holds only its own contents.
- **A staged place returns to its authored state**:
  - after it unloads, a reboot, its cadence, an event or its title holder's
    command;
  - never in front of a player except through staff;
  - with no part ever duplicated.
- **Part policies behave as declared:** recall, re-mint, release and
  prevent. A carried prevent part is refused at the door.
- **A stage restages to any named set**, changing only what differs.
- **Off-shift staff walk home and back.** An NPC on loan is neither recalled
  nor copied; a losing stage shows its fallback.
- **A refused save is reported** to the operator and the player, fails no
  other record, and never keeps a body in the world.
- **At lease end the tenant's goods are reclaimable** from the landlord.
  **A ship's loose deck gear** is in her hold after she sleeps.
- **The lounge and Dave's Bar are as available as before.** The existing
  restart drives stay green, and the shutdown save does not noticeably slow.

## Cross-references

- **Seeding slates:**
  [persistence-model-slate](../slates/engine/persistence-model-slate.md)
  (reuse ledger § 8) and
  [staging-slate](../slates/platform/staging-slate.md).
- **Subsystems:**
  - [persistence.md](../subsystems/persistence.md),
    [residency.md](../subsystems/residency.md),
    [furnishing.md](../subsystems/furnishing.md),
    [chattel.md](../subsystems/chattel.md)
  - [residence.md](../subsystems/residence.md),
    [holding.md](../subsystems/holding.md)
  - [retail.md](../subsystems/retail.md),
    [employment.md](../subsystems/employment.md),
    [behavior.md](../subsystems/behavior.md),
    [identity.md](../subsystems/identity.md)
  - [ship.md](../subsystems/ship.md), [pets.md](../subsystems/pets.md),
    [size.md](../subsystems/size.md)
  - [diagnostics.md](../subsystems/diagnostics.md),
    [client-shell.md](../subsystems/client-shell.md)
- **Related:**
  - [eager-residency-slate](../slates/tech-debt/eager-residency-slate.md)
    (§ 7 answered)
  - [stale-reference-boot-slate](../slates/tech-debt/stale-reference-boot-slate.md)
  - [pets-slate](../slates/engine/pets-slate.md)
  - [avatar-family-slate](../slates/engine/avatar-family-slate.md)
  - [stage-and-simulation-slate](../slates/world/stage-and-simulation-slate.md)
  - [sandbox-overlay-plan](../plans/sandbox-overlay-plan.md) (D6)
