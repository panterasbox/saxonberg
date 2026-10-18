# Place surfaces slate — walls and ceiling as surfaces of the room; joints replace `fixedInPlace`

> **Status: UNBUILT** — captured 2026-10-18 (issue #79). Waits on
> **rubber** (it supplies `exposure()`: whether the top is open, a roof
> or a ceiling, and whether there are walls) and **cleanliness** (soil on
> surfaces, the fixture-persistence slice). What ships: the floor as a
> fixture in slot `ground:1`, Placement rows (`on · in · from`), `hang`
> onto the Adornable fixtures collection, assembly's `Joint` rows and
> `fit`, `fixedInPlace` →
> [spatial.md](../../subsystems/spatial.md),
> [ground.md](../../subsystems/ground.md),
> [furnishing.md](../../subsystems/furnishing.md),
> [assembly.md](../../subsystems/assembly.md),
> [mql-grammar.md](../../mql-grammar.md)
> **Left:** placement rows for the **wall** and **ceiling**, derived from
> rubber's exposure · the room itself as the host of its own surfaces ·
> MQL `via.surface` · `mountsOn` on things · mounting by **joint**,
> runtime affixing inside the assembly vocabulary · joints **replace
> `fixedInPlace`** · the `fixed` / `loose` predicates · the presentation
> tiers
> **Size:** a build

**Captured 2026-10-18**, from the live usability pass: Dave's Bar lists
~100 things as one undifferentiated *you also see*, because a room's
contents have no notion of *where in the room*. Signs on the wall, stools
on the floor and a coupe on the bar are all just *in the room*.

## ⭐⭐ The floor stays Stuff; walls and ceiling do not

**Decided 2026-10-18.** Minting an object per wall and ceiling for every
enclosed room is not worth the overhead. The floor is different — it
earns its object status by its **composition**, not by templating:

- it is a **posture host** (you sit or lie on it);
- it holds **spills** (a bulk surface slot — where puddles live);
- it takes **soil** (cleanliness: sweep, scrub, strew by ground kind);
- its **class varies and changes at runtime** — storage-and-ice's pond
  floor is a water surface that becomes an `IceSheet` with load bearing.
  Swapping one floor object for another is easy; changing a Location's
  class at runtime is not. Folding the floor into the Location would make
  every room compose posture, bulk, soil and ice-bearing mixins, and every
  floor kind a Location subclass.

**Walls and ceiling carry almost nothing of their own**: what is mounted
is a fact about the *mounted thing* (its placement and its joint); soot
is cleanliness's soil, kept on the room per surface; weathering is
repair's, on the holding's layers. So they are **surfaces of the room,
not objects**.

## Surfaces are placement rows, derived from rubber's exposure

- **Two new Placement rows** beside `on · in · from`: **`wall`** (`on
  the wall`) and **`ceiling`** (`from the ceiling`). Rows, so a pack can
  add *set in the floor* or *in a niche* with no kernel change.
- **They exist when rubber's exposure says so** — a ceiling surface when
  the top is not open (a roof, or a storey above), a wall surface when
  there are walls. **No override field**: rubber already expresses every
  case — a cave (`roof:` of rock, no walls), a lean-to or stall (a roof,
  `enclosure: none`), a ruin (walls, `roof: none`), a deck (no roof).
- ⚠ **Read the exposure, never reshape it** — repair's building upkeep
  depends on `getEnclosure()` / `getRoof()` / `exposure()` / `Face`
  exactly as rubber ships them.
- **One wall surface, not four.** Rubber has no per-wall names (four
  anonymous faces; openings are exits), so neither do we. A northeast
  exit never has to say which walls it cuts.

## The room is the host of its own surfaces — MQL by via

- **`ceiling` resolves to the room with `via.surface = ceiling`** — the
  same shape as an exit match (`via.exit`). No new grammar.
- **A mounted thing's placement is `{ the room, ceiling }`** — the
  container as host of its own surface, the row naming the region.
- ⚠ **This relaxes one shipped refusal** (spatial.md § two composition
  refusals, #1): *"a Placing host MUST compose `ContainableMixin` … this
  keeps Location out: a room is not a thing you put things on — its floor
  is."* It is relaxed for exactly one case — **the container as host of
  its own surfaces**. The refusal exists so placed things have an
  environment to be found in; a room IS that environment, so the reason
  still holds.

## What can go where — `mountsOn`

A thing says which surfaces it mounts on: **`mountsOn: [wall]`** (a
sconce, a sign), **`[ceiling]`** (a chandelier), **`[wall, ceiling]`** (a
lantern on a hook). It replaces `hang`'s yes/no *"made to go on a wall"*.

## ⭐⭐ Mounting is a joint — and joints replace `fixedInPlace`

**Runtime affixing is a making act**, so it runs inside the crafting and
assembly vocabulary, not a standalone furnishing verb.

- **Assembly's `Joint` rows** already carry what a mount needs:
  **reversibility**, the **tool** it takes, the **discipline**. A
  **hook or peg** is reversible with no tool (`get` lifts it off);
  **nailed or screwed** needs a claw hammer or screwdriver to undo;
  **mortared or bolted** is effectively permanent.
- ⚠ **The place does not become an assembly.** The repair plan refused to
  call a wall *a part* because it *"invites `AssembledMixin` onto a
  place"*. Only the **joint vocabulary** is shared: a thing joined to a
  surface (or to another thing — a vise bolted to a bench); the room is
  never a made thing with a parts record.
- **The verb does not matter.** `hang` can become `fit` with the hook
  joint as its default (the collision ladder's first rung — unify behind
  an interface); `fit sign to wall with nails` names another joint, with
  its tool and skill.
- ⭐⭐ **"Fixed" means held by a joint; "loose" means no joint.**
  `fixedInPlace` retires entirely. Everything fixed is fixed *to
  something*:
  - **Authored fixtures declare their mount** — `mount: { to: floor,
    joint: built-in }`, `built-in` the authored default that cannot be
    undone without real work.
  - **`get` asks the joint, not a boolean**: a hook lifts off; *"it's
    nailed to the wall — you'd need a claw hammer"*. The refusal names
    what would lift it — the progression rule — where the boolean could
    only say no.
  - **The sweep** — 23 rows author `fixedInPlace: true`; 29 code files
    read or set it (`get`, containment, the self-seating mixin's
    constructor, the mana line). Census, then ratchet.
- ⚠ **Persistence.** Cleanliness keys a fixture's saved state by its
  **slot name** (`AdornableMixin.captureSlice`). Mounted things are room
  contents with a placement and a joint, not fixtures in slots, so they
  persist with the room's contents; the floor keeps `ground:1`.

## Reading it back — `fixed` / `loose` and the presentation tiers

- **MQL predicates `fixed` and `loose`** (reserved names in chain
  position, plus a `[fixed]` atom for expressions): *fixed* = held by a
  joint; *loose* = its exact complement. `here:fixed:lamp` is the sconce
  on the wall, `here:loose:lamp` the one somebody dropped.
- **The presentation tiers** (card-sizes-slate § card bodies): **the
  room** — description plus its **fixed** furnishings, by surface (*on the
  walls · from the ceiling · on the floor*), stable; **who is here**;
  **what is here** — the **loose** things, summarized. Arriving shows the
  last two.
- Cleanliness's soot already lands on *every soilable thing in the room*;
  the walls and ceiling take it **per surface, on the room**, and a look
  at the walls can read repair's weathering without owning it.

## Not this slate

- **Exits** stay their own objects (they are concealable) and are never
  bound to a wall.
- **No `OpenLocation` / `EnclosedLocation` split.** Rubber made enclosure
  a per-place declaration (either side can be `none`); a class split
  would duplicate it and could contradict it. An `isEnclosed()` derived
  from the exposure answers the taxonomy question.
- **Per-wall faces** — rubber's, if ever.
- **Panes on a construction face** — glass-slate.
