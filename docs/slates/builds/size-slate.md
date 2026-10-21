# Size slate — how big things are, and what fits

> **Status: UNBUILT** — a light design pass, 2026-10-19, out of the harbor
> session (*"I never expected for things to have much relative size, but as it
> turns out we've modelled real measures in meters in quite a few places. This
> makes me want to use it."*). Exits declare no size today.
> **Left:** sizes as real measures, derived where they can be · a body's
> envelope (stature × posture, girth, plus what it carries, worn and mounted) ·
> exits with a clearance and defaults by kind · refusals that say what would
> work, never auto-posture · things through openings by longest dimension
> against the diagonal · first consumers (doorways and crawlways, water depth
> against stature, seeing over, reach, places built for a people's size,
> containers) · accessibility and building codes · ⭐ **a body carries, it does
> not contain** (2026-10-20): held, worn, in something worn, inside the body;
> `move()` unchanged; `agent.receive` on the carrier; pockets, hands and weight;
> staged so only the flip is serialized
> **Size:** a build — two, counting the carrying flip

## What is already measured

- **Bodies** — every species' `baseMass` (kg) and `stature` (m), resolved per
  body ([race.md](../../subsystems/race.md): biped 70 kg, 1.75 m); physiology's
  per-individual stature.
- **Rooms** — a real linear extent (cell size × grid); ranged caps a fight's
  distance with it.
- **Structures** — `heightM`; ships' deck and masthead heights.
- **Vessels** — `interiorVolume`. **Things** — mass and material density, so
  volume is derivable.
- **Bands** — real widths. From the ships session: craft draught, beam, length,
  air draft; quay length, channel width and depth.
- ⚠ **Exits** — no size at all.

## 1. Real measures, derived where they can be **[LEAN]**

Meters, never size categories (no *small / medium / large*). Declare a size only
where nothing can derive it: a thing's **volume** from mass and density; a body's
**height** from stature; its **girth** from mass and stature (physiology's
build).

## 2. ⭐ A body's envelope **[LEAN]**

- **Height = stature × posture** — standing 1.0, crouching ~0.6, crawling ~0.35,
  lying its length (posture ships).
- **Girth** — derived from mass and stature.
- **Carried and worn things add** — a pole held, plate armor's bulk, a pack.
- **Mounted** — the mount's height plus the rider's seated height.

## 3. Exits declare a clearance **[LEAN]**

A width and a height, with **defaults by kind** — an ordinary door ~0.9 × 2.0 m,
an outdoor way unbounded — authored only where special: a low door, a crawlway, a
cat flap, a portcullis, a kobold tunnel. The test is the envelope against the
clearance.

## 4. ⭐ The refusal tells; it never crouches for you **[LEAN]**

*"The lintel's too low to walk under — you'd have to stoop."* · *"Even on your
belly you won't fit through there."* Changing posture is the player's act (*the
engine must not do the player's job*), and *the refusal is the progression UI*:
it names what would work.

## 5. Things through openings **[LEAN]**

By the thing's **longest dimension against the opening's diagonal** — the real
geometry of the wardrobe and the stairs. A thing's dimensions derive from its
volume and its form class, or are authored for long things (a bole's length
already is).

## 6. First consumers **[LEAN]**

1. **Doorways and crawlways**.
2. ⭐ **Water depth against stature** — build-4's column uses a fixed wading
   depth of 1.5 m; it should be **the body's stature**, so a child swims where
   an adult wades.
3. **Seeing over** a wall or a crowd — the tall see over, the short cannot see
   over the bar.
4. **Reach** — stature plus a weapon's length; the top shelf; climbing.
5. ⭐ **Places built for a people's size** — the shipped species include
   `koboldus` and `ogrus`; a kobold tunnel admits the small and refuses the big;
   an ogre's hall.
6. **Containers by dimension** — the sword that won't fit the chest; how many
   bodies a room, a lifeboat or a lift holds.

## 7. The lens pass (light)

1. **Pedagogy** — ⭐ **the square-cube law**: mass follows stature cubed, so an
   ogre twice a human's height weighs about eight times as much — derived, and
   taught; the **moving-sofa problem** (a real open problem in mathematics).
2. **Expression** — authors build places for a people's size.
3. **Immersion** — the stoop under a low beam, the crawl, the piano on the
   stairs.
4. ⭐ **Values — accessibility**: a built environment can exclude bodies — a door
   too narrow for a wheelchair; a city built for humans that shuts out ogres.
5. **Continuity** — none special.
6. **Economy** — the removal man who knows how to get the piano up the stairs.
7. ⭐ **Governance** — **building codes can require clearance**: a polity deciding
   whom its buildings admit; it meets [construction-slate](./construction-slate.md).

## 8. ⭐⭐⭐ A body carries; it does not contain **[DECIDED 2026-10-20]**

The owner, reopening the container model in light of size: *"right now there's
basically 3 layers of container: Place top level, Agent some character in the room,
Vessel some container inside the agent or location … I want to maybe reconsider
whether agents should be containers. They don't really have internal space or if
they do it's made up of organs and viscera not weapons and armor. And if you're
carrying a phone it's not in 'you' it's in your pockets usually."*

**The seams already show.** [encumbrance.md](../../subsystems/encumbrance.md)'s
*"v1 loose-carry model"*: *"`get` does not claim a hand slot … items in a bearer's
general contents are treated as carried-in-hand"* — the bag standing in for hands.
[card-surface.md](../../subsystems/card-surface.md) suppresses an agent's contents
because *"a person's contents are their pockets"* — pockets assumed, never modeled.
Attired is the honest half that shipped: worn things in body slots.

### Four honest places

| where | what | decided by | ships? |
|---|---|---|---|
| **held** | in a **hand** | the body plan's hands, and what a hand can grip (mass, size) | slots ship; `get` does not use them yet |
| **worn** | a body slot — garment, armor, pack | Attired, layering | ✅ |
| **in something worn or held** | ⭐ **a pocket**, a belt pouch, a backpack, a purse, a quiver; a sheath or holster as a slot on a belt | **the container's volume and opening** (§ 5) | containers ship; garments have no pockets yet |
| **inside the body** | organs, what was eaten (metabolism's digestion buffer), implants, an arrowhead in a wound, a swallowed ring | anatomy, ingestion, harm | ✅ each in its own system — never inventory |

**One exception stays open** — a creature with an **interior place** (the whale that
swallows you): an authored location inside a body, rare. A body may have a *place*
inside it, never a bag.

### ⭐⭐⭐ `move()` does not change **[DECIDED — the owner]**

A first draft routed the "which hand or pocket" decision through Placement, which
would have made `move()` discover its destination at runtime. The owner: *"it's
supposed to do something very simple, take something from one container and put it
in another. The mixins actually do the real state change but the api does the
coordination … the whole second arg I assumed was obvious now has to be discovered
based on runtime state … that's the hard part and I don't think it should be the
job of move() — it should be either some higher order function or on the mixins
themselves."*

1. **`move()` stays explicit** — this item, into this container, optionally this
   placement, all from the caller. It coordinates; it never decides.
2. **Agents stay containers — of what is *on* them, not a bag.** Removing
   `Container` from agents would leave held and worn things nowhere to live. The
   change is an **invariant**, not a type change: ⭐ ***nothing sits loose on a
   body*** — every content of an agent is **held** or **worn**. Pocketed things live in
   the **garment**, itself a worn container: agent → coat → pocket → phone, every link
   an ordinary container.
3. **Choosing where something goes on a body is a receiving act, owned by the
   receiver's mixin** — a method on the carrier (`agent.receive(item)`; verbs on
   objects, the mixin authoritative, the controller dumb, refusals returned). It
   discovers — a free hand, else the first worn container it fits, else a refusal in
   words (*"your hands are full and it won't fit in your pockets"*) — and then calls
   `move()` with an **explicit** destination, plus the slot occupancy for a hand. **The
   resolution order is the player's setting** (hands first, or pack first).
4. **Creatures fall out honestly** — `receive` reads the body plan: a dog has one
   "hand", its mouth; a horse carries only in what it wears (saddlebags, a pack
   saddle); a cat refuses (*"it has nowhere to carry that"*). A direct
   `move(item, horse)` stays mechanically possible — `move()` does not police meaning
   — which is exactly why callers do not do it.

### What it buys

- **Size becomes real** — a pocket has a volume and an opening: a phone fits, a key
  fits, a sword does not; a three-meter pole can only be held, in both hands.
- ⭐ **Hands become scarce** — two hands: not a lantern, a sword and a shield at once;
  a pack, a belt and a mule start to matter (lenses 1 and 3a).
- **Weight becomes honest** — the burden walk already couples through slots (held
  pays a surcharge, worn the floor); with nothing loose, the loose-carry hack retires,
  and a pocket rides the garment it is sewn into.
- ⭐ **Perception falls out** — held things are visible, the outermost worn layer is
  visible, and **pocket contents are concealed by the garment** — the card's *"nobody's
  business"* made literal, opening **the frisk** (policing's search), **the
  pickpocket** (stealth reaching into a garment on another body), and **smuggling
  inside the body** (the swallowed ring).

### Weight, generally

- **A container's limits are three**: **mass** (what its material and construction
  bear — a paper bag tears, through assembly's wear), **volume** (`interiorVolume`
  ships), and ⭐ **opening** (what fits *through* it — § 5's longest dimension against
  the diagonal).
- **What a thing costs to carry is mass, how it is carried, and its shape** — an
  awkward long load held is harder than its mass alone (the envelope, § 2).

### ⭐⭐ Sequencing — only the flip is serialized **[DECIDED]**

The owner: *"we'll probably not be able to do this with other builds in parallel."*
Census-then-ratchet ([lint-family.md](../../lint-family.md)) keeps most of it
parallel-safe:

1. **Stage 1 — add, don't change** (parallel-safe): `agent.receive(item)` ships but
   resolves to today's behavior; a lint **counts direct `move(x, agent)` calls and
   caps the count**, so new code uses `receive`. Nothing behaves differently.
2. **Stage 2 — port the callers** (parallel-safe, piecemeal): each caller — `give`,
   buying, crafting's output, `get` — moves to `receive`; the count only falls. ⭐ A
   build already touching a pack ports that pack's callers, so it rides on work already
   happening.
3. **Stage 3 — the flip** (serialized): once the count is zero, `receive` resolves to
   real hands and pockets, the *nothing loose on a body* invariant turns on, the
   loose-carry hack retires, garments gain pockets, and `get` and `inventory` change
   meaning. **This needs a quiet window** — no sibling builds in flight, because their
   drives assume today's `get` — and it is short, because stages 1 and 2 did the
   plumbing.

### Open

1. **Hands** — how a body plan declares them, and what a hand can grip (mass, the
   longest dimension, two-handed loads).
2. **Pockets** — on garment rows (textiles), their volume and opening.
3. **The derived view** — what `inventory` and MQL's `me:i` show once there is no bag
   (held · worn · and within each).
4. **Logout and death** — what a body's held things do (the usability pass's #48:
   guest logout spilled gear).
5. **The interior place** — the swallowing creature, when the bestiary arrives.

## Related

[ships-and-harbors-slate](./ships-and-harbors-slate.md) (craft and harbor
dimensions) · [river-slate](./river-slate.md) (air draft under a bridge) ·
[underwater-slate](./underwater-slate.md) (the wading depth) ·
[construction-slate](./construction-slate.md) (codes) · textiles' shipped fit ·
[encumbrance.md](../../subsystems/encumbrance.md) · [spatial.md](../../subsystems/spatial.md) ·
[slot.md](../../subsystems/slot.md) (Slotted and Attired).
