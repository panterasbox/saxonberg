# Design philosophy

> **Layer: the platform.** This doc describes the *vertical-agnostic
> platform* — the abstract gamification engine — not the educational
> game built on it. Saxonberg's game-level essence ("learning as
> adventure," education at its core) lives in [vision.md](./vision.md).
> The two layers are nested, not in tension — reconciled in
> [lenses/essential-experience.md](./lenses/essential-experience.md).

Top-level guidance doc for the engine's design philosophy. Sits
alongside [roadmap.md](./roadmap.md) and [mixin-slate.md](./slates/tails/mixin-slate.md)
as a forward-referenced principle that shapes every slate.

This is **not a slate**. Nothing here is being designed; this
captures the design discipline the existing slates already
follow, made explicit so future slates inherit it without having
to re-derive it.

See also:

- [docs/vision.md](./vision.md) — the pedagogical premise that
  this philosophy serves.
- [docs/interaction-philosophy.md](./interaction-philosophy.md) — the
  companion "why" doc. This doc owns the fidelity / honesty axis (how
  honestly the world is *modeled*); that one owns the interaction
  surface (why text is the medium and why the command line is the unit
  of interaction).
- [docs/standard-model.md](./standard-model.md) — the third orienting
  doc: the *structure* of the model (the Stuff/mixin particle layer) and
  the imagined periodic table of gamification on top. This doc's honesty
  principle is what that one bets the gamification layer can emerge from.
- [docs/architecture.md](./architecture.md) — static architecture
  of the codebase. This doc is the design-discipline complement.
- [docs/subsystems/quantities.md](./subsystems/quantities.md) — the
  cross-cutting `Quantity<T>` pattern that operationalizes
  Principle 2 ("model honestly").
- [docs/subsystems/senses.md](./subsystems/senses.md),
  [docs/subsystems/locomotion.md](./subsystems/locomotion.md) —
  the shipped hearing/perception substrate and the locomotion
  subsystem are applications of this philosophy. The embodiment subsystem
  (also shipped) is another instance — see
  [slot.md](./subsystems/slot.md) /
  [conveyance.md](./subsystems/conveyance.md). The activity
  framework's Wave 1 substrate is shipped at
  [subsystems/activity.md](./subsystems/activity.md); the
  physics-honest locomotion retrofit is preserved in
  [slates/tails/locomotion-as-activity-slate.md](./slates/tails/locomotion-as-activity-slate.md).

---

## The principle

> **The engine models the smallest fidelity that the
> most-fidelity-demanding content needs, and it does so honestly.**

Four corollaries:

1. **The substrate models what content needs, no more.** Don't
   pre-build infrastructure that nothing uses. Schema
   forward-compatibility leaves room for growth without
   demanding it on day one.
2. **What's modeled is modeled honestly.** Real units, real
   math, real relationships. No fudge anywhere. Lying about the
   physics anywhere weakens the pedagogical claim everywhere.
3. **Layered presentation.** Players see prose; students see
   physics; instruments and `analyze` verbs reveal canonical
   units. Same engine, different rendering paths.
4. **Honest models seed from real data.** Because the schemas are
   reality-shaped, open datasets (USDA, Wikipedia, clinical
   references) seed them directly — authoring becomes ingestion.
   Keep schemas dataset-shaped even when v1 consumes only a subset.

The engine is a **physics simulation at room granularity**, with
channel-specific dynamics and opt-in finer fidelity. It's
elegant because authoring is bag-of-stuff (low cognitive load),
the physics underneath is real per channel (high pedagogy), and
sub-room geometry is opt-in for content that needs it.

---

## The core tension

Saxonberg is a *text* game. Everything has to be expressed in
prose. Rich spatial modeling is doable internally — we already
have CartesianLocation and SphericalLocation in `lib/spatial/` —
but what the player sees is sentences, and sentences carry only
so much spatial information before they become unreadable.

It's also an *educational* game. We've established that the
engine doesn't lie about physics — real dB SPL, real Hz, real
species hearing ranges, real molarity, real masses. The
pedagogical seam from `subsystems/quantities.md` says: under the
curtain, the science is honest.

These pull against each other:

- **More spatial fidelity** = better physics = better pedagogy.
- **More spatial fidelity** = harder to express in prose = worse
  player-facing UX.

The instinct to fold to one or the other is strong. The
philosophy refuses the dichotomy: high fidelity *internally*,
prose *externally*, with the seam between them well-managed.

---

## The fidelity axis

Five increasingly-fidelity-heavy spatial models, with what each
buys and costs:

### (1) Bag-of-stuff rooms — current default

Each room is a containment scope; everything in it is "in the
room" with no sub-room position. Adjacency between rooms via
Exits / Conduits.

| Concern | Score |
|---|---|
| Authoring cost | Trivial — describe what's in the room |
| Pedagogical fidelity | Medium-low — real physics at room+channel level |
| Prose expressivity | Natural — *"You see a sword on the table."* |
| Tactical combat / range | Awkward — equidistant within a room |
| Hiding / cover | Poor — visible-or-hidden, no middle |

### (2) Tagged regions within rooms — opt-in

A room declares named regions (`'by the bar'`, `'near the door'`,
`'at the stage'`). Stuff is in a specific region. Region-to-
region within a room is its own light topology — basically
rooms-within-rooms at finer grain.

| Concern | Score |
|---|---|
| Authoring cost | Medium — authors who want regions write them |
| Pedagogical fidelity | Medium — adds positional fidelity for relevant scenes |
| Prose expressivity | Workable — *"Bob is at the bar; Mary is by the door."* |
| Tactical combat / range | Good — distance bands fall out of region adjacency |
| Hiding / cover | Good — regions are concealable |

### (3) Range bands — abstract positional

Tabletop-RPG style. Stuff is at "engaged" / "near" / "far" /
"extreme" relative to a reference. No geometric coordinates;
qualitative bands.

| Concern | Score |
|---|---|
| Authoring cost | Low to medium |
| Pedagogical fidelity | Low — bands are abstractions, not real distances |
| Prose expressivity | Easy |
| Tactical combat / range | Solid — range matters but isn't a calculation |
| Hiding / cover | OK |

### (4) Coordinate-based sub-room geometry

Real (x, y, z) coordinates. Distance is calculation; line-of-
sight is geometric.

| Concern | Score |
|---|---|
| Authoring cost | High — every Stuff needs coordinates |
| Pedagogical fidelity | High — real physics at full geometric fidelity |
| Prose expressivity | Hard — *"Bob is 12 feet northeast"* loses the prose feel |
| Tactical combat / range | Excellent — real ballistics, real cover |
| Hiding / cover | Excellent |

### (5) Full physics simulation

Trajectories, momentum, ballistic curves, real-time positioning.
Diminishing returns relative to (4) for a text MUD; mostly
relevant for niche content (chemistry simulations, physics
labs).

### Where the philosophy lands on this axis

**(1) is the default. (2) is opt-in per location. (3)–(5) are
content-driven.** Most rooms stay bags of stuff. An archery
range opts into range bands. A chemistry lab opts into named
bench positions. The framework supports all five but commits
authoring effort to none by default.

---

## Four principles, in detail

### Principle 1: The substrate models what content needs

We don't pre-build spatial geometry, capacity infrastructure,
combat math, weather systems, etc. that no v1 content uses. The
schema reserves room (forward-compatibility), but we don't
implement what's not asked for.

This is the same pattern the rest of the engine uses:

- Sound doesn't model frequency content in v1 because no v1
  content needs it; the schema reserves the field.
- The mixin slate doesn't compose `Edible` onto every Stuff;
  only food.
- Race subsystem ships with three body plans (biped, quadruped,
  sessile) because three is what content needs; centaur and
  octopus body plans wait until content asks.
- Authors who need finer fidelity opt in — bench-positioned lab,
  region-tagged tavern, geometric duel arena — and pay the
  authoring cost where it serves them.

The cost of premature abstraction is significant: schema lock-
in, engine complexity, content authors learning to ignore
unused fields. The cost of conservative-and-extend is
manageable: each new fidelity level lands as content demands it.

**When in doubt, defer the fidelity.** Real content cases
demanding it surface eventually; the schema accommodates them
when they arrive.

### Principle 2: Model honestly

What we do model uses real units and real math.

- **Sound**: dB SPL, Hz, RT60 seconds. Logarithmic addition.
  Real species hearing ranges.
- **Light**: lux, CIE color coordinates, blackbody temperature.
- **Mass**: kg.
- **Distance**: meters.
- **Time**: real wall-clock ms.
- **Material chemistry**: atomic mass, density, real molarity.

No "0–100 percent" or "1–5 stars" in the substrate. Friendly
tags map to canonical values via documented tables (see
subsystems/quantities.md). Authors keep using tags; the framework
keeps the math honest.

The honesty discipline is the **pedagogical claim**. Lying about
physics anywhere weakens the seam everywhere. Even in cases the
player will never inspect, internal consistency matters because
authors and modders learn the system's discipline by observing.

A chemistry student inspecting a beaker sees real molarity. A
biology student playing a dog has real species-specific hearing
range. A physics student firing a tuning fork hears a real
frequency. **This is a substrate property, not a feature.**

#### Invented sciences are honest too

"Honest" does not mean "real-world." A *supernatural* system —
magic — is modeled honestly when its laws are **internally
consistent and measurable**, even though they're authored rather
than drawn from a textbook. Magic is a physics channel like any
other: real (invented) units, conservation, propagation through
conduits, instruments that read it, an `analyze` that reveals its
math. The only difference from sound or chemistry is the *source*
of the laws.

This widens the pedagogical claim. Real channels teach real facts;
invented ones teach the **scientific method itself** —
hypothesize, measure, predict, verify — in a sandbox engineered to
be learnable, plus transferable *structure* (conservation, fields,
equilibrium, falloff) that carries back to real physics. "Where
real science hits a wall" becomes a clean teaching instrument.

The discipline is strict: an invented science must be **rigorously
self-consistent**, and it never becomes the fudge layer — it obeys
its own laws as unforgivingly as the real channels obey theirs.
Designing one means genuinely designing a physics. See
[capability-magic-slate.md](./slates/deferred-rpg/capability-magic-slate.md) for
the worked application.

### Principle 3: Layered presentation

Players see prose. Students see physics. Same engine.

```
[player default]
  > look
  You see a fountain, water trickling softly.

[student mode / instrument used]
  > analyze sound here
  Source: fountain
    Emitted: 30 dB SPL @ 100–800 Hz
    At your position: 28 dB
  Aggregate: 28 dB SPL
  Reverberation: 0.6s (living room)
```

The MML composer reads the player's `pedagogical.seam` setting
(see subsystems/quantities.md) and chooses tag vs. canonical
formatting. The engine's calculation is identical; only the
serialization differs.

**Server-side defaults** can be configured per-deployment — an
educational deployment might default to instrument-readable
output so students see the science by default.

Verbs and instruments are the bridges:

- `analyze X` reveals the physics behind X (sound, light,
  chemistry, etc.).
- Wielded instruments (Thermometer, SoundLevelMeter,
  pH-meter, Photometer, Rangefinder) produce instrument
  readings using the engine's actual values.
- The `pedagogicalSeam` setting per-player tunes default
  rendering verbosity.

### Principle 4: Reality-shaped models seed from real data

A consequence of Principle 2 with its own authoring payoff. Because
the substrate models honestly, its schemas end up shaped like the
real-world datasets that describe the same things. That turns
authoring from invention into **ingestion** — a model whose fields
mirror a public dataset can be seeded directly from it.

- **Species** → Wikipedia / Encyclopedia of Life: binomial,
  lifespan, body plan, diet, vision / hearing ranges.
- **Materials** → periodic table / materials databases: density,
  molar mass, atomic number, formula (already modeled).
- **Nutrition** → USDA FoodData Central / nutrition labels: energy
  (kcal), macros, micros, water content.
- **Vital reference ranges** → clinical references: the normal bands
  *are* published reference ranges.

Three payoffs: **content velocity** (seed hundreds of entries by
mapping a dataset, not hand-authoring each), **pedagogy** (the data
is real and student-verifiable against the same sources), and
**credibility** (a demo where every species is real taxonomy and
every food carries real USDA data).

The discipline this imposes is cheap and forward-looking, the same
shape as Principle 1: **shape the schema to mirror the dataset even
when v1 consumes only a subset.** A food's full nutrition facts can
be seeded now while only its energy / water drive satiation /
hydration today; the macros sit dormant until the metabolic consumer
lands. Don't build ingestion pipelines ahead of need — just keep the
schema ingestion-shaped.

One caveat that's real for a commercial, ingested-data product:
**provenance and licensing.** USDA FoodData Central is public domain;
Wikipedia is CC-BY-SA (attribution + share-alike); other sources
vary. Track the source and license of any seeded dataset — a
content-pipeline concern, not an engine one, but load-bearing the
moment real ingestion starts.

---

## How this lands for capacity

A specific application worth spelling out, because the user
asked: **can a container have multiple capacity constraints
simultaneously?** Yes — this is the canonical case.

### List-of-typed-constraints shape

Each container has a `capacities` list. Each entry is a typed
constraint with a kind, a max, and a failure message:

```yaml
backpack.capacities:
  - kind: volume
    max: '30 L'
    failureMessage: "The backpack is too full."
  - kind: weight
    max: '15 kg'
    failureMessage: "The backpack is too heavy."
  - kind: count
    max: 50
    failureMessage: "There are too many things in the backpack."
```

Each constraint kind is a registered framework predicate:

- `volume` — sums per-Stuff `volume: Quantity<L>`; checks
  against max.
- `weight` — sums per-Stuff `mass: Quantity<kg>`; checks against
  max.
- `count` — counts contained Stuffs; checks against max.
- `actor-count` — counts contained Stuffs that are agents.
- `rule` — predicate-based (a registered named predicate); for
  semantic constraints (sword-rack-only-swords).

### Adding contents check

```ts
function canFit(container: Container, candidate: Stuff): Result<void, string> {
  for (const cap of container.capacities) {
    const result = checkCapacity(cap, container, candidate);
    if (result.fails) return Result.err(cap.failureMessage);
  }
  return Result.ok();
}
```

ALL constraints must pass. First-fail wins; the failure message
is constraint-specific. Empty list = unlimited.

### Examples

```yaml
# Phone booth: count of actors only
phone-booth.capacities:
  - kind: actor-count
    max: 2
    failureMessage: "The booth is full."

# Egg carton: count only
egg-carton.capacities:
  - kind: count
    max: 12

# Stadium: unlimited
stadium.capacities: []

# Sword rack: only swords + count
sword-rack.capacities:
  - kind: count
    max: 6
  - kind: rule
    predicate: 'isWieldable-with-blade'
    failureMessage: "The sword rack only holds swords."

# Chest: volume + count (most chests are volume-bound)
chest.capacities:
  - kind: volume
    max: '50 L'

# Pickup truck: volume + weight + actor-count (separate cab)
pickup.capacities:
  - kind: volume          # bed
    max: '1500 L'
  - kind: weight          # payload rating
    max: '700 kg'
  - kind: actor-count     # cab seats
    max: 3
```

### The pedagogical seam for capacity

`analyze backpack` shows all the constraints with current usage:

```
> analyze backpack
Backpack (cloth, well-worn)
  Capacity:
    Volume:   used 22 L of 30 L (73%)
    Weight:   used 8 kg of 15 kg (53%)
    Count:    used 7 of 50
  Acoustic transmission: 0.7 (cloth muffles)
```

Real numbers, real units, layered display. Same pattern as
sound, light, locomotion — the philosophy applied uniformly.

### Why this composes

The constraint-list shape is **introspectable** (UI / `analyze`
can read each constraint's kind and max and report) and
**extensible** (new constraint kinds register without schema
changes).

Different containers want different rules; the framework
imposes a *type system* (Quantity-typed constraints), not a
*policy*. Authors pick the right constraints per container; the
framework enforces uniformly.

Cross-container effects compose cleanly:

- A backpack inside another backpack — the outer's volume cap
  measures the inner backpack's outside dimensions, not its
  contents. (Russian doll.)
- A waterproof bag inside a wet pack — separate channels (the
  waterproofing isn't a capacity rule; it's a transmissivity
  property).

This is the same general principle: **the engine imposes
typed shape; authors compose semantics.**

---

## How this lands for ranged actions

Ranged actions become a Conduit-channel question with skill-
check resolution.

> The fuller treatment now lives in
> [combat-tactics-slate.md](./slates/deferred-rpg/combat-tactics-slate.md): combat as
> abstract **engaged relationships** rather than geometry, with
> party-level tactics layered on top. This section keeps the
> Conduit-channel mechanics that slate's Thesis 1 builds on.

### Conduit gains a physical-passability dimension

Conduits already carry channel-keyed transmissivity for light
and sound. Add `physical` — does this Conduit pass projectiles?

```ts
transmissivity: {
  light:    0.95,
  sound:    0.95,
  physical: 1.0,    // open doorway: bodies and projectiles fit
}
```

Worked values:

| Conduit | Light | Sound | Physical |
|---|---|---|---|
| Open doorway | 1.0 | 0.95 | 1.0 |
| Closed wooden door | 0.0 | 0.4 | 0.0 |
| Open glass window | 0.95 | 0.95 | 1.0 |
| Closed glass window | 0.95 | 0.3 | 0.0 |
| Barred window | 0.95 | 0.95 | 0.0 (bars stop bodies; arrows fit between) |
| Murder hole | 0.6 | 0.7 | 1.0-for-arrows / 0.0-for-bodies |
| Keyhole | 0.0 | 0.6 | 1.0-for-needle / 0.0-for-arrow / 0.0-for-body |

The "bars vs arrows" case suggests `physical` is itself
gradient — `physical: { passableSize: Quantity<L> }` rather than
a scalar. Defer this refinement; v1 boolean suffices for
content cases we have.

### Within-room ranged

Archer + target in same room. Resolution: skill check + room-
size modifier. Room "size" is already a Location property.
Bigger rooms increase distance penalty.

No geometric pathing needed.

### Cross-room ranged via Conduit

Archer in A, target in B, Conduit between. Conduit's
`transmissivity[physical]` (or per-projectile-size check if
gradient) gates whether arrows pass. Otherwise mostly the same
as within-room ranged.

### Long-distance via line-of-sight chain

Sniper on a tower; target on a courtyard; multiple intervening
rooms (each open).

- Required: traceable LOS through every intervening Conduit
  (each open for `physical` and `light`).
- Telescope-as-Sensor extension lets the sniper acquire the
  distant target as if directly perceived.
- The shot resolves once acquired: walk the conduit chain in
  the target's direction; if all transparent, shot is possible
  with appropriate accuracy penalty per chain length.

Falls out of the existing substrate with one new transmissivity
dimension. Doesn't need sub-room geometry as a default.

### Where geometry would actually pay

- Chemistry / biology labs where setup matters (which beaker
  is on which burner).
- Combat tactics if combat ever lands serious.
- Specific puzzle rooms where positioning is the puzzle.

In each case, the room *opts in* to a richer model. The
framework doesn't force fidelity on rooms that don't need it.

---

## How this lands for collisions and blocking

A guard standing in the doorway, a sleeping body in your path,
a phone booth at capacity. Three concerns, all handled at the
philosophy's defaults:

- **Capacity** — the typed-list-of-constraints model above. A
  phone booth's `actor-count: 2` cap. No sub-room positioning
  needed.
- **Intentional blocking** — verb-level validators. A guard's
  `BlockerBehavior` registers a block predicate against an
  exit; the locomotion validation chain runs it. No sub-room
  positioning needed.
- **Pushing** — `Pushable` mixin (slates/tails/mixin-slate.md) on objects
  and unconscious actors. Conscious-actor shoving is combat-
  adjacent, deferred.

Sub-room positioning ("the guard is *in* the doorway, you have
to go around") is **explicitly deferred**. The bag-of-stuff
default plus block-validators handles the same content cases
without committing to sub-room geometry.

Full design in [collision-slate.md](./slates/deferred-rpg/collision-slate.md).

---

## What this means for hiding, cover, line-of-sight

Hiding-as-status, not hiding-as-position. A `Stealthing` actor
emits a perception-shadow that lowers their visibility for
others; no sub-room geometry required. Cover behind objects is
similar — the Concealing mixin from slates/tails/mixin-slate.md.

For high-fidelity tactical content (a duel, a heist) — opt-in
range bands or regions. The framework supports both; the
content authors them.

---

## What this means for sub-room positioning

**Deferred indefinitely as a default. Opt-in for content that
earns it.**

- The framework's default is bag-of-stuff. Most rooms stay
  this way.
- Region-tagged content (a tavern with named seats, an
  archery range) authors regions explicitly.
- Range-band content (a duel arena) authors bands explicitly.
- Geometric content (a chemistry lab, a precision puzzle)
  authors coordinates.

The CartesianLocation and SphericalLocation classes already in
`lib/spatial/` support (4); they sit unused for most content
and become available when needed. **Spatial fidelity is per-
location authoring**, not a framework-wide commitment.

---

## What this changes for existing slates

Mostly nothing. The existing slates already follow the
philosophy:

- **Embodiment slate** — slot capacity is per-slot data; fits
  the per-container-typed-cap pattern. Already aligned.
- **Locomotion slate** — modes have real units (`mode.speed
  × baseDuration`). Already aligned.
- **Sound slate** — channel-keyed conduits, real dB,
  instruments-reveal. Already aligned.
- **Quantities slate** — IS the philosophy made concrete for
  unit-bearing properties. Foundational.
- **Activity slate** — duration is real ms. Already aligned.

Codifying the philosophy makes the boundaries explicit, so
future slates inherit the same disciplines without having to
re-derive them.

---

## Future slates this surfaces

- **Spatial-fidelity slate** for when content first earns it
  — tagged regions, range bands. Probably comes alongside the
  first content that demands it (an archery range, a tavern
  with named seats).
- **Combat-tactics slate** —
  [combat-tactics-slate.md](./slates/deferred-rpg/combat-tactics-slate.md), now
  drafted. Folds ranged actions (the abstract engaged-relationship model
  + one new Conduit `physical` dimension) into the broader combat design
  rather than a standalone ranged slate.
- **Capacity-typed-constraints integration** — extends the
  embodiment subsystem's slot capacity story (see
  [slot.md](./subsystems/slot.md)) to containment scopes with the
  typed-constraint shape; could land as its own slate or fold into
  the collision slate.

---

## What this philosophy does NOT promise

- **Realistic physics simulation everywhere.** It promises the
  physics we *do* model is real. Rooms aren't particle
  simulators by default.
- **Universal sub-room geometry.** Most rooms don't have it
  and don't need it.
- **Pixel-perfect tactical combat.** Combat-slate territory if
  it lands; the philosophy supports adding fidelity where it
  serves; it doesn't promise tactical-RPG-level depth.
- **Photorealistic perception.** Players see prose. Instruments
  reveal numbers. There's no rendering of a 3D mental model
  in the head; the philosophy commits to what text can carry.
- **Author-friction-free fidelity adoption.** Opt-in fidelity
  costs authoring time; that's the point — it's paid where it
  serves the content.

---

## Summary

> **The world is a graph of containers connected by conduits.
> What flows between containers — light, sound, bodies,
> projectiles, signals — is per-channel. Each channel has its
> own physics, expressed in real units. Spatial fidelity within
> a container is opt-in: bag-of-stuff is the default; finer
> fidelity is authored where it matters.**

Saxonberg's pedagogical claim becomes a substrate property, not
a feature: when a chemistry student inspects a beaker, the
engine has real molarity; when a biology student plays a dog,
the engine has real species hearing range; when a physics
student fires a tuning fork, the engine has real frequency;
when an author composes a backpack, the typed capacity
constraints honestly enforce volume, weight, and count.

This is what "honest at every level" means. The framework has
**layered fidelity** — defaults are simple and prose-friendly;
finer fidelity is opt-in; physics is honest at every layer. The
pedagogical seam is the bridge: same engine, different
audiences.
