# Carrying a person — the body you bring out

> **Status: UNBUILT · opened 2026-10-20 (user, during the underwater browser walk, MR !408);
> designed at high level 2026-10-28 with the owner.** What ships: `pull <someone>` in the water
> (dead weight, and *"a swimmer who is awake and not with you can shake you off"*), the line
> rescue; the mount coupling and the conveyance ripple
> ([conveyance.md](../../subsystems/conveyance.md)); carry capacity and the strain ceiling
> ([encumbrance.md](../../subsystems/encumbrance.md)); soft limits — spent, never collapsed
> ([exertion.md](../../subsystems/exertion.md)); combat's control throw of a grappled foe; `hitch`
> with one hauler.
> **Left:** `carry` and `set down` · the method derived (piggyback, fireman's carry, drag, seat
> carry, litter) · the carried person as a coupling · the share of the load per bearer · consent and
> the logout rule · what breaks the hold · the litter with bearer places, the improvised litter, the
> travois, the ambulance bed · the escort, named as a dependency
> **Size:** a build

Blocks: four scenes of the [field-medicine-slate](./field-medicine-slate.md) (the fight, the blade,
the torn organ, the broken leg) and the [emergency-services-slate](./emergency-services-slate.md)'s
party (the rule of four).

## Why it is a slate

The underwater requirements assumed rescue by carrying ("a second
character pulls *or carries* you up", "carry an unconscious character up
the steps"). The plan wrote "a hauled/carried body" as if both existed.
The browser walk found that **nothing in the game carries a person**: no
verb, and `get` does not take a creature. Hauling on a line exists (the
lifeline), and it stays the water's rescue — a diver made fast before going
down is pulled up whatever state they are in.

Carrying is not a water mechanic. The wounded off a field, the drunk out of
the bar, the miner out of the damp, the child onto a cart: it belongs to
the body and to load, not to any one place. The user chose to slate it
rather than build it inside the underwater trade build.

## What it would have to decide

- **The act.** `carry <person>` (and `put down`), or `get` widened to
  creatures. ⭐ One verb per act: if it is `get`, the refusal for a
  conscious unwilling person is the interesting part.
- **Who may be carried.** Anyone who cannot refuse (unconscious, dying,
  asleep), a consenting person, or anyone you can overpower (then it is a
  grapple — combat's `subdue`, not a kindness).
- **Weight.** The body's mass against the carrier's capacity
  (`LoadBearing`): most people cannot carry an adult far. In the water, the
  body's weight in the water (the underwater review made swim load
  buoyancy-aware), so a swimmer *can* tow a limp body at the surface.
- **Movement.** A carried body moves with the carrier (containment of a
  creature in a creature, or a held relation); every gate the carrier
  passes, the body passes; a rescuer climbing the quay steps with one.
- **What breaks.** Setting someone down, being hurt while carrying,
  disconnecting while carried, the body dying in your arms.
- **Consent and record.** Carrying someone who did not ask is an act the
  accountability ledger may want (abduction is the dark case).

## ⭐⭐⭐ The design, 2026-10-28

### One verb; the method follows from the facts **[DECIDED — the owner]**

**`carry <person>`** and **`set down`** — not `get`: a person is not an item in your hands, and
consent differs entirely. *How* you carry is derived, never chosen from a menu:

| the person | the carrier | the method |
|---|---|---|
| conscious and able to grip | strong enough | ⭐ **piggyback** — they hold on, so it reads *their* manipulation |
| unconscious or limp | strong enough | **fireman's carry** |
| anyone | not strong enough to lift | **drag** (the Rautek drag) — slow, and it works |
| anyone | two carriers | **seat carry** |
| anyone | two to four, a litter | **the litter** — the only way to go far |

One act — moving a person who is not moving themselves — with the method read from their
consciousness, their grip and your strength. Which carry suits which casualty is real first-aid
content.

### `pull` stays the line and the water **[DECIDED — the owner]**

Dragging folds into `carry`'s methods; `pull` keeps lines, pots, bells and the swimmer in the water.

### Weight — the rule of four, derived **[LEAN]**

The body's mass against the carrier's capacity. An adult is at or past most strain ceilings, so one
person carries or drags a short way, slowly, ending spent (never collapsed); two split the load; a
litter of four goes far. The party's rule of four falls out of the physics. Species mass matters; in
water the buoyant weight counts, so a surface tow works (ships).

### A coupling, like a rider **[LEAN]**

The carried person is **coupled to the carrier, not contained** — still a person in the room,
visible, still the target of a killing stroke (the coup's co-presence check), still on the record.
The conveyance ripple moves them; every gate checks both — a ladder with a body is slow or refused, a
crawlway may not admit two. ⭐ **Carrying takes your hands: you cannot fight while carrying** — care
under fire made physical.

### Consent, and the logout rule **[LEAN]**

| the person | carrying them is |
|---|---|
| cannot refuse — unconscious, dying, asleep | **aid** — lawful under the Good Samaritan act ([field-medicine-slate](./field-medicine-slate.md) § 7) |
| conscious and willing | an offer and an acceptance |
| conscious and unwilling | **not carrying** — combat (`subdue`, the control throw); taking them away after is **abduction**, unless a seat holds them in custody |

The custody rule of [law-and-order-slate](./law-and-order-slate.md) § 8: a **dropped connection**
keeps the body in your arms (a rescue must work for someone whose internet died, and a dying clock
runs on); a **deliberate logout** takes the person out of the world and out of your arms — ⭐ the
victim's guaranteed escape from a kidnapper; **a seat's custody** survives, to the lockup within the
custody limit.

### What breaks the hold **[LEAN]**

Set down — they lie where set · the carrier's hands or legs fail — they drop · they die in your
arms — you are carrying a body, a thing, with no consent question, bound for the coroner · a shade
cannot carry.

### The litter, the travois, the ambulance **[LEAN]**

- **The litter** — an object with **bearer places**; each bearer bears (body + litter) ÷ bearers.
  Hitching with several bearers instead of one hauler.
- ⭐ **The improvised litter** — two poles and a blanket or two coats, from rows that exist (wood,
  cordage, cloth); a real first-aid lesson.
- **The travois** — a litter hitched to a horse or a dog (`hitch` ships).
- **The ambulance** — a cart with a bed, a place to lie inside a vehicle. Someone who cannot walk is
  **put in** — `carry` ending in the cart.

### The escort is not carrying **[DECIDED — the owner: a separate dependency]**

A constable walking a conscious, arrested person to the lockup is leading a walking body against its
will — the **compulsion gate** (*nothing gates who drives a body*), its own security build. Police
custody depends on it; this build does not include it.

## Cross-references

- `docs/subsystems/encumbrance.md` (load, the water burden)
- `docs/subsystems/respiration.md` (the rescue window, the face-up hold)
- `docs/subsystems/combat.md` (`subdue`, grapple)
- the underwater requirements' drive steps 4 and 8b (reworded to the line)
- [field-medicine-slate](./field-medicine-slate.md) · [law-and-order-slate](./law-and-order-slate.md) · [emergency-services-slate](./emergency-services-slate.md)
