# Chambered vessels slate — one Thing, several containers, and one object on screen

> **Status: UNBUILT** — `ContainerMixin` is 1:1 with its host, and so is
> `Location`. Everything a chamber itself needs already ships:
> `ContainerMixin`, `SealableMixin`, `EnclosedMixin` + `AtmosphericMixin`
> (the envelope build, 2026-09-25), `SlottedMixin`'s `SlotSpec`, and the
> shared openness predicate `MixinApi.isOpenContainer` that MQL and
> perception both ask.
> **Left:** `ChamberedMixin` (`lib/spatial/`) — the chamber declaration, the
> `postRegister` mint, the destruct cascade, the **no-loose-contents**
> invariant, the part flag · ⭐ **a describer that speaks a host's declared
> parts AS parts** (the whole UX question) · ⚠ **part-transparency** in
> `scope-walk` + `PerceptionApi.canReach` together, bounded at one level ·
> slots-vs-contents for where a chamber sits
> **Size:** a wave

> **Captured 2026-09-25**, in the design conversation after the envelope
> build merged. The user's question, raised for **build-4's refrigerator**
> and then recognised as the same problem in **beekeeping**:
>
> > *"right now location:container is 1:1 and vessel:container is 1:1.
> > location I argue should stay that way but I do think there's a case for
> > multi-chambered vessel. a single Thing with multiple containers … is
> > SingleChamberedVessel and MultiChamberedVessel different classes? and
> > what's the UX there especially with regard to MQL queries"*

Substrate: [spatial.md](../../subsystems/spatial.md) ·
[slot.md](../../subsystems/slot.md) ·
[thermal.md](../../subsystems/thermal.md) § *The envelope* ·
[boundary.md](../../subsystems/boundary.md) (fixtures, the pattern this is
**not**) · [mql.md](../../subsystems/mql.md) ·
[perception.md](../../subsystems/perception.md) ·
[presentation.md](../../subsystems/presentation.md) ·
[cold-chain-slate](../builds/cold-chain-slate.md) (the fridge) ·
[apiculture-slate](../builds/apiculture-slate.md) (the hive).

---

## ⭐ Location stays 1:1, and the asymmetry is principled

`Vessel.ts` now states the distinction outright: a `Location` is *"a stationary
place — **pure space, not matter**."* **Space does not nest inside space; matter
nests inside matter.** So `Location : Container` staying 1:1 while a Thing goes
1:N is not an inconsistency, it is the two things being different kinds of
thing.

## ⭐⭐ The design that does NOT work: N contents-lists on one host

Both target cases are **unrepresentable** that way, and each for its own
reason:

**The fridge.** The envelope build put `envelopeTemperatureK` /
`envelopeClockStamp` / `envelopeOutsideK` on **`AtmosphericMixin`**, and
`Vessel = AtmosphericMixin(ContainerMixin(Thing))`. That state is **per host**.
A fresh compartment and a freezer are **two temperatures**, and one host cannot
hold two envelope temperatures — so the thing that makes a freezer a freezer
would have nowhere to live.

**The hive.** A super is **a box you lift off and carry to the extractor** —
that is the harvest act. A contents-list cannot be detached and carried
anywhere.

⭐ And notice the two cases want **opposite** things from a chamber: a freezer
compartment must *never* come out, a super *must*. That is the tell that
"chamber" is not one mechanism but a shape over existing ones.

> **So a chamber is its own Stuff** — a Vessel (Container + Atmospheric, plus
> `Sealable` and `Enclosed` where it has a door and a wall) — and a chambered
> thing is a Vessel that owns Vessels. The user's framing is the right one:
> **the multi-chambered case is a COMPOSITION of the single-chambered one.**

## ⭐⭐⭐ But it is a MIXIN, not a subclass — single inheritance decides it

Every candidate base already computes itself from a mixin chain:

```
class Vessel         extends VesselBase          // AtmosphericMixin(ContainerMixin(Thing))
class Oven           extends OvenBase
class CraftVessel    extends CraftVesselBase
class Vat            extends VatBase
class ExitableVessel extends ExitableVesselBase  // DoorBearing(Exitable(Visible(Adornable(Vessel))))
```

And the consumers are spread across them: a **fridge** (Vessel) · a **hive**
(Vessel) · an **oven with racks** (Oven) · a **ship with holds**
(ExitableVessel) · a **chest of drawers / wardrobe** (furniture Thing) · a
**saddlebag** (a worn Container).

⚠ **`MultiChamberedVessel extends Vessel` fails at consumer two.** `Oven` is
*also* built on Vessel, so an oven with racks would have to extend
`MultiChamberedVessel` — forcing **every** oven to be chambered — or duplicate
the behaviour. Same for the ship. That is the lens-2 failure the rubric names
outright: *"a feature whose second instance requires a kernel edit."*

Whereas `ChamberedMixin(Vessel)`, `ChamberedMixin(Oven)`,
`ChamberedMixin(ExitableVessel)` all simply work. **Mixins union; base classes
force one spine** (and a subclass's static shadows its base's).

> **Home: `lib/spatial/Chambered.ts`** — sibling to `Container.ts`,
> `Sealable.ts`, `Surfaced.ts` and the `Enclosed.ts` that just landed. That
> directory is exactly *spatial facts about a bounded thing*, which is what
> chambering is.

### ⚠ And `SingleChamberedVessel` must NOT exist

That is `Vessel`, unrenamed. **Needing to rename the plain case is the tell
that a split went the wrong way** — you do not rename `Chair` to
`SingleSeatChair` when you add a bench. The repo has the lesson in the other
direction: `Thing` was called `Prop` until 2026-09-03 *because the name claimed
nothing*, and a spoilage gauge got hung on it as a result. A name should assert
something; `SingleChambered` asserts only the absence of a feature.

### Do we also want a concrete twin?

The repo's pattern is abstract substrate in `lib/` plus a thin concrete twin in
`platform/<branch>/` **only when rows clone it generically** (ten such pairs
exist, seven sharing their base's name). Here every consumer is a *named* thing
in its own pack — `Refrigerator`, `Hive`, `ChestOfDrawers` — so **no kernel
concrete class initially.** If rows ever want a generic chambered box, that is
when the twin appears, and it is called `ChamberedVessel`.

## What the mixin owns

1. **The chamber declaration** — authored structure, so a describer can speak
   it and so the host's shape is a fact rather than a convention.
2. **The `postRegister` mint** — chambers are minted, never placed by hand. The
   precedent is the ground build: *every Location's floor is minted at
   `postRegister`*, and residency made 180 of them affordable, so two or three
   extra Stuffs per appliance is not a cost worth designing around.
3. **The destruct cascade** — chambers die with the host.
4. ⭐ **The no-loose-contents invariant** — you cannot put milk "in the fridge"
   outside a chamber. A genuine rule that a plain `Container` has no reason to
   carry.
5. **The part flag** that the describer and the reach rule read.

### Slots or contents? — lean: slots

`SlotSpec` already carries *"name, `accepts`, `capacity`, postures,
**`userFacingDetail`**, `bodyPart`, `covers`"*, declared as
`staticSlots: SlotSpec[]` **on the class** — and `slot.md` all but names this
case: *"a garden bed, a door, a saddle and a wall sconce all have named
occupancy positions."*

⭐ Three things fall out: the host **declares** its own structure (which is what
answers *"does anything express that they're one object?"* — the freezer is not
a nearby object, it is a named position on the fridge); `accepts` can require
`Container`, so the slot says *this position holds a chamber*; and ⭐
**removability becomes a slot policy**, which is where it belongs:

| | slot policy |
|---|---|
| fridge compartment | fixed — `take the freezer` refused |
| hive super | removable — lifting it off **is** the harvest |

Plain nested **contents** is the fallback: it needs no slot work and the scope
walk already descends one level into an open container, but the host's structure
is then a convention rather than a declaration.

⚠ **Not fixtures.** `AdornableMixin`/`AdornmentMixin` was the first candidate
and is wrong: fixtures are the *"things attached to a place"* surface — wall
sconces, neon signs, boundary anchors — and `scope-walk` treats them as
**peers**, i.e. *"an object standing in the room with you."* They would render
as items near the fridge, which is precisely the seam this slate exists to
avoid. (It also hardcodes *not-portable* into the mixin, which the hive
contradicts.)

## ⭐⭐⭐ The UX, and the real assumption it needs — it is about DEPTH

The MQL `peers` leg is explicitly **one level deep**:

```ts
for (const item of env.getContents()) {
  pushDirect(out, item, giver, attention);        // level 1
  if (MixinApi.isOpenContainer(item)) {
    for (const inner of item.getContents()) {     // level 2 — and that is ALL
      pushDirect(out, inner, giver, attention);
    }
  }
}
```

…and the comment says why it stops: *"The pool this scope offers must agree with
what **`PerceptionApi.canReach`** grants, so both ask `MixinApi.isOpenContainer`
rather than each carrying its own notion of 'exposed'."* **The limit is a
deliberate coupling to reach, not an oversight.**

So `room → fridge (1) → freezer (2) → the milk (3)` puts the milk **out of
scope**, under slots *or* contents.

> ⭐ **The assumption to make, and it is narrow: A PART IS NOT A LEVEL.** A
> container that is a declared *division of its host* is transparent for depth —
> the walk descends through it without spending its one level, and `canReach`
> agrees.

That is honest physically (a freezer is not a box inside a box; it is a division
of the fridge, and reaching into it is **one** reach) and it is far more
conservative than deepening the walk, which would make an arbitrary
crate-inside-a-crate reachable.

⚠⚠ **Bound it: transparency applies ONCE — a part of a part is opaque.**
Otherwise a chamber that is itself chambered (a crisper drawer inside the fresh
box) reintroduces walk-the-whole-tree through the back door. Also physically
right: you open the crisper as a separate act.

⚠ The cost is real and worth stating: this touches the two most load-bearing
functions in targeting, and the comment above is the shipped promise that they
stay in agreement. **The care belongs there, not in the model.**

### The describer — the actual answer to "is it one object?"

Room level shows **one object**, because chambers are not room contents. The
remaining work is that the host's own description must speak its declared parts:

> A squat refrigerator hums against the wall, its freezer door shut.

> `look refrigerator` → Enamelled steel, rounded at the corners. Two
> compartments: the fresh box, standing open, and the freezer, shut.

⚠ **The gap:** the precedent for slot occupants surfacing through a host is
**body-shaped** — `presentation.md`'s `distinguishing` form is *"+ what they are
wearing."* Whether the **generic** describer speaks a *non-body* host's declared
slots is unverified. If it does not, that is the one piece of real work here, and
it is the right place to spend it: **one describer serves the fridge, the hive, a
chest of drawers, a wardrobe, an oven with racks and a saddlebag.**

### ⭐ The free trick for the host's own name

`put the milk in the fridge` needs no engine change **if the primary chamber
answers to the host's keywords** — the fresh box's keywords include
`fridge`/`refrigerator` and the freezer's do not. The handle chain already
resolves *authored keyword → job → species*, so this is a content decision, and
it is how people talk. Only the primary chamber may claim the host's name, or
the binder is handed an ambiguity.

⚠ **What a closed chamber does is already shipped**, through the one shared
predicate: a shut `Sealable` is opaque to MQL *and* to perception, and `mql.md`
already separates the refusals — *"sealed, out of reach and not food are
different lines."* So the player is told **"it's sealed"**, never *"no such
thing."*

## ⭐⭐ Who pays — the fridge does; bees rides free

Work the levels for the actual beekeeping acts:

| act | depth | works today? |
|---|---|---|
| lift a super off the hive | super at level 2 | ✅ |
| set the super down, pull frames | super at 1, frames at 2 | ✅ |
| pull a frame from a standing hive | frame at level 3 | ❌ |

**And that is exactly how beekeeping works** — you do not fish a frame out of a
standing hive, you take the super off and work it on a stand. Physical practice
and the shipped depth limit agree, so **apiculture needs no interpreter change
at all.**

The fridge is different precisely because you **do** reach into a freezer in
place. So part-transparency is the fridge's to buy — and by the
promote-at-the-third-consumer rule it is legitimate for the fridge **not** to
buy it and to live with `open freezer` + `take the milk from the freezer`
instead, since MQL's `from <holder>` clause sidesteps the scope pool entirely.
Then transparency waits until the drawers, the wardrobe and the oven make it a
**third-consumer promotion** rather than a one-off.

## Lens pass

1. **Pedagogy** — thin, and recorded as thin: this is substrate. The one honest
   claim is that the model matches the object (a fridge really is a cabinet with
   two insulated compartments at two setpoints), which is what lets the
   envelope's U-value arithmetic apply per chamber instead of per appliance.
2. **Expression** — the payoff. A chambered thing is **authored** (`staticSlots`
   + an `enclosure:` per chamber), so a second appliance, a wardrobe or a
   bee hive needs **no code** — and the fridge's two setpoints stop being a
   special case.
3. **Immersion** — the whole UX question: **one object on screen**, parts spoken
   by their host, a closed chamber telling you it is *sealed* rather than
   missing. The failure mode to avoid is the room listing *"a refrigerator, a
   freezer"* as siblings.
4. **Values** — none. Substrate; no choice is forced.
5. **Epochs** — holds trivially: an ice box, a fridge, a ship's hold, a
   Langstroth hive and a reactor vessel are one mechanism with different numbers.
6. **Economy** — indirect: it is what lets a **cold chain** exist as a *product*
   (a fresh compartment and a freezer are different goods at different prices)
   and what makes a super a **tradeable unit** of honey.

## Open questions

1. **Slots or contents** for where a chamber sits — lean slots (declaration,
   removability policy, ordering for the hive's stack); contents is the free
   fallback.
2. **Does the generic describer speak a non-body host's declared parts?** The
   one unverified thing, and the whole UX turns on it.
3. **Does part-transparency ship with the fridge, or wait for a third
   consumer?** `from <holder>` is the workaround in the meantime.
4. **Does a host's mass walk through a chamber?** `encumbrance.md` reads
   `getMass` alongside `getContents`; whether the walk descends is unverified,
   and a fridge full of food should be heavy.
5. **Can a chamber be sealed independently of the host**, and does the host have
   a door of its own? (A fridge has two doors and no third; a ship has a hatch
   per hold *and* a gangway.)
6. **The inspection card** — one card laid out by `StuffKind`; a chambered thing
   wants its chambers as rows.
