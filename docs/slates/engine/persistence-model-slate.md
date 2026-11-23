# Persistence model slate — what is here when you come back

> **Status: DESIGNED** — the model was agreed with the owner on 2026-11-23,
> restarting the estate-nesting slate from first principles. It covers two
> facts per thing, one rule for every thing, keepers, legibility, and what it
> retires.
> **Left:** requirements for **persistence + [staging](../platform/staging-slate.md)
> as ONE design** (owner, 2026-11-23) · the open questions in § 6 ·
> a fresh code survey against the reuse ledger (§ 8)
> **Size:** **a build, with staging** — it retires the estate, the promoted
> tier and the room overlay, gives every container a keeping rule, and
> builds the stage manager

**Captured 2026-09-16** as *estate nesting*, in review of the pets MR
(!257): an owner's saved record nests a full copy of every good they own,
with no cap, under Mongo's 16 MB ceiling. **Restarted 2026-11-23.** The
owner: *"this to me really seems to be a slate about persistence in this
game, and whether you own something or not is just one vector… how any of
this stuff actually shakes out in the codebase is probably really messy and
inconsistent. The whole point is this needs to be very legible to the
player so they can predict what's gonna happen when they walk away."*

⚠ Not [persistence-architecture](../tech-debt/persistence-architecture-slate.md).
That slate is the storage machinery underneath (`Document` vs `Stuff`, the
marshallers). This one is what the WORLD keeps.

**Sits on:**
- [persistence.md](../../subsystems/persistence.md)
- [residence.md](../../subsystems/residence.md) and [holding.md](../../subsystems/holding.md): the ladder of kept places
- [staging-slate](../platform/staging-slate.md): the stage manager
- [residency.md](../../subsystems/residency.md): eviction and the reset sweep
- [chattel.md](../../subsystems/chattel.md): ownership as title history
- [furnishing.md](../../subsystems/furnishing.md): what this retires
- [pets.md](../../subsystems/pets.md)

---

## 1. The player's question

> *If I walk away, what will be here when I come back?*

There are three honest answers:

| answer | when |
|---|---|
| **as authored** | it is part of something staged; the arc resets or cycles |
| **as I left it** | it is inside something that keeps |
| **gone** | it was left where nothing keeps it, and the place restaged |

⭐ **Loss is a legitimate outcome** (owner, earlier): *"if I carry my ID
and drop it… if the game resets while it's on the ground… it just means
the item is lost."* Ownership of a lost thing is moot, not false; its chain
of title closes.

## 2. Why today is a patchwork

Today which answer you get depends on three rules that do not know about
each other:

1. **The place.** Does this room, ship or shelf save itself and its
   contents (`PersistableMixin` on the host, `captureHostOf`)?
2. **Ownership.** The **estate** copies the full state of everything a
   player owns into the player's own record, wherever the thing is. Nothing
   caps it, and it grows with the one number the game is built to make go
   up. A refused save reaches nobody, and a signed-out body whose save keeps
   failing never leaves the world (survey, 2026-11-22).
3. **Naming.** Naming a thing *promotes* it to a record of its own.

Then a **room overlay** restores other owners' goods into a place when it
loads. No player can predict the overlap of these rules.

## 3. ⭐⭐⭐ The model — two facts per thing

**Fact 1: whose part is it?** A part belongs to a staging **by identity,
not location** ([staging-slate](../platform/staging-slate.md)). A restage
returns it to its authored state wherever it has wandered. ⭐ **The warren
is the stage manager.** The owner rejected splitting them: a warren is
locations managed collectively by one class, and a location includes
everything it stages. The warren speaks for each part individually, which
is what the staging slate's part policies (recall · remint · release ·
prevent) are. So a staged chest in a room that is not staged is still the
warren's to restage.

**Fact 2: does its inside keep?** This is a rule on each container: a room,
a chest or a body.

- A **kept** inside saves what is put in it and restores it.
- An inside that does **not** keep treats what is put in it as a stray at
  the next restage.
- ⭐ **A body always keeps.** What you carry is safe.

The mixed cases fall out:

| case | fact 1 | fact 2 |
|---|---|---|
| your dorm's authored bed | a part of the dorm (break it, it comes back) | — |
| your things in the dorm | not a part | the dorm keeps them |
| a rented locker in a staged inn | a part of the inn | its inside keeps |
| a staged treasure chest in a kept house | a part | its inside does not keep (restage refills it) |
| your cup on the tavern table | not a part | not kept: a stray, lost at restage |
| what you carry | — | your body keeps |

## 4. ⭐⭐ One rule for every thing

Every thing follows **its place's** rule. Players never decide what
persists; **keepers** do. A player has one lever, the one a real person
has: **where they leave things.**

The owner, on letting naming confer persistence: *"if we give players a
wand they can point at things to make them persistable they'll ask why
doesn't everything in the game work the same way, why do the players
decide what's persistable and what's not, and why shouldn't they just zap
that wand at everything they see."* So:

- **Ownership confers no persistence.** It is the title history.
- **Naming confers no persistence.** It confers identity: *the* sword in the
  chronicle, still lost if left in a tavern.
- **Nothing rescues a stray.** There is no lost property. (This rejects
  [eager-residency-slate § 7](../tech-debt/eager-residency-slate.md)
  option (b), sweep to storage.)
- **Pets get home by walking.** A pet is an animal, so it has a brain. The
  `homes` brain already walks it back along its remembered trail, one
  visible step per beat. That is behavior anyone can watch, not a
  persistence exception.

## 5. Keepers and legibility

⭐ **A kept inside always has a keeper you can name:** your room, a locker
rented to you, your bank box, your pack. If you cannot say whose a place
is, it does not keep. This is the rule, and also the stewardship point:
something keeps because somebody is responsible for it, and that is what
gives you something to clean up after.

**Kept places are the residence ladder**, with the dorm as its lowest rung.
A rung below it (a shelter with day lockers) would be **content on the
same rule** if new players need one. The owner: *"it should just all be
content, it doesn't change the systems design."*

A player learns the rule in three layers:

1. **The convention:** a kept inside has a keeper. This is the rule itself.
2. **A marker** on the place card and in `look`, for planning where to
   stash something.
3. **A teaching line, once.** The first time a character leaves something
   they own in a place that does not keep, the response says so. At most
   once more, then never again. The owner: *"messaging that you see over and
   over again long after you've digested its meaning is worse than giving
   them no message at all."*

## 6. Open questions

1. **A chest you own, standing in a staged place.** Lean: it is a stray,
   contents and all. A kept inside needs keepers all the way up the chain.
   (The locker is different: it is the staging's own part, with a keeping
   inside.)
2. ✅ **What bounds a kept place — answered (owner, 2026-11-23):** *"floors
   are boundless but exits aren't and you still have to get the thing into
   the room if it's big… what's the difference between a floor and a large
   box?"* None, and [size](../../subsystems/size.md) already says so: an
   enclosed place's interior is its cube and `no-room` (Σ fill ≤ interior)
   bounds it exactly as it bounds a box; a big thing still has to come
   through a way. ⚠ The one unbounded case is an **open** kept place (a
   yard, a tract, a wood) — size deliberately skips `no-room` where a side is
   open. Lean: an open place bounds by its **footprint** (things lying on
   the ground take ground), so every kept inside is bounded by physics.
   Confirm at requirements.
3. **The word.** Should the player-facing word be *kept*, *safe*, or
   something else? It appears in the marker and the teaching line.
4. ✅ **When strays are decided — answered (owner, 2026-11-23): build it
   with staging, one design.** Strays are decided at the restage the stage
   manager runs, not only at a reboot or an eviction.
5. **A good mid-process in a place that does not keep** (a cask maturing on
   a tavern shelf): lost like anything else. Confirm there is no
   trade-specific exception.
6. **Organizations' keepers.** A guild hall keeps for its organization. Is
   the keeper's presence ever required for its inside to keep? Lean: no,
   keeping is a property of the inside, not of a visit.
7. **A body that is not online** keeps what it carries in the player's own
   record. Confirm that a body record holds only the carried tree, bounded
   by carry capacity.

## 7. What it retires

| retired | why |
|---|---|
| the **estate**: an owner's record copying every owned good | ownership is not storage (§ 4); the unbounded record goes with it |
| the **promoted tier**: naming → a record of its own | naming is not persistence (§ 4) |
| the **room overlay**: a place restoring other owners' goods | a place keeps its own inside, or it does not |
| `captureDetached` / `restoreDetached` | their only callers are the estate and the overlay |
| the "sweep to storage" option of eager-residency § 7 | nothing rescues a stray |

It also fixes things that die with the estate's path but must not reappear
anywhere: a refused save is never silent, one refused record never fails
its batch-mates, and sign-out always completes.

## 8. Reuse ledger for the plan

Verified 2026-11-22 at `be83f63ce` for the estate rows; ⚠ re-survey the
keeping rows at requirements.

| concept | what already does it | reuse / retire |
|---|---|---|
| a container that keeps | `PersistableMixin` hosts (42 composer files); `PersistentLocation` and its twins; `restoreOrSeed` `(scope, key)` | reuse; **generalize** to a per-inside rule a row states |
| the residence ladder | the dorm and its warren, holdings, tenancy ([residence.md](../../subsystems/residence.md), [holding.md](../../subsystems/holding.md)) | reuse unchanged |
| a rented locker / coat-check | `rack check` / `rack reclaim` (`content/platform/cmd/retail/rack.yaml`), `ConsignmentShelf`, `Stock` | reuse as precedent for a part with a keeping inside |
| a container nesting its contents | `ContainerSlice` / `captureItem` | reuse — physics bounds it |
| restaging a place | the reset sweep (`resetsWhilePresent`, `Stock`), eviction re-cloning from template ([residency.md](../../subsystems/residency.md)) | reuse; full staging is [staging-slate](../platform/staging-slate.md) |
| a pet walking home | the `homes` brain (`lib/behavior/homes.ts`), the trail on `BondedMixin` | reuse unchanged |
| ownership as title history | the `chattel` rows, chain of title | reuse; the `pin`/`place` that feed the overlay retire or narrow |
| the estate | `EstateMixin`, `EstateEntry`, `ChattelLogic.syncEstate`, `patchStoredEstate`, `flushSkippedOwnedGoods` | **retire** |
| the room overlay | `overlayOwnedGoods`, `putBackWithin`, `storedEstateEntry` | **retire** |
| the promoted tier | `Bonded` promotion, `isPersistenceKeyExplicit` reference branches | **retire** (pets keep their own record as BODIES, not as promoted goods — verify) |
| a failed save | `PersistenceManager.saveMany` (`ordered: false`), callers that log or swallow | **fix**: isolate per record, report to `DiagnosticApi` + the player, sign-out completes |
| measuring record sizes | nothing | genuinely new, if the requirements keep it |
| the teaching line, shown once | ⚠ search at requirements for an existing once-per-character hint mechanism | likely genuinely new |
| the place marker | the "where you are" place card (navigation card, !640) | reuse |

## Related

- [staging-slate](../platform/staging-slate.md): fact 1 is its design; the
  restage moment is shared
- [eager-residency-slate](../tech-debt/eager-residency-slate.md): § 7 is
  answered here (strays are lost); § 8 Q3 (the estate as pin index) is moot
- [stale-reference-boot-slate](../tech-debt/stale-reference-boot-slate.md):
  one record per inside is the unit of skipping
- [pets-slate](../engine/pets-slate.md): orphan records after a pet dies
- [avatar-family-slate](../engine/avatar-family-slate.md): estate
  succession state lives on the estate today, so it must move
- [sandbox-overlay-plan](../../plans/sandbox-overlay-plan.md) D6: where a
  record lands composes with what a record holds
