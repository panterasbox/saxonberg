# The Standard Model

> **Layer: the platform.** This doc describes the *vertical-agnostic
> platform* — the particle layer everything is built from, and the
> imagined periodic table of gamification — not the educational game
> built on it. Saxonberg's game-level essence ("learning as adventure,"
> education at its core) lives in [vision.md](./vision.md). The two
> layers are nested, not in tension — reconciled in
> [lenses/essential-experience.md](./lenses/essential-experience.md).

The third of the engine's orienting docs, alongside
[design-philosophy.md](./design-philosophy.md) (how honestly the world
is *modeled*) and [interaction-philosophy.md](./interaction-philosophy.md)
(how a player *meets* it). This one is about the **structure** of the
model — what the world is made of, and how real life is turned into a
game on top of it.

The organizing metaphor is a chemistry set with two layers:

> **The Standard Model** is the particle layer — the small set of
> fundamental kinds and composable traits everything in the world is
> built from. **The periodic table of gamification** is the chemistry
> that emerges on top — the language that turns real-life engagement
> into play.

We know quite a lot about the first layer; it's shipped and documented.
The second is mostly vision. This doc records both, and **labels which
is which** — Part I is reality, Part II is what we can imagine.

A note on the metaphor before leaning on it: none of these analogies are
perfect. "Standard Model" here borrows from *particle physics* (a small
closed set of fundamental particles and forces), not from Schell's
"waiting for Mendeleev," which is about a periodic table of *game
design*. Schell doubts that table will ever come, because game design is
"more like cooking than chemistry." Our bet is narrower and answerable:
if the substrate underneath is an *honest* model of reality (see
[design-philosophy.md](./design-philosophy.md)), then the gamification
layered on top stops being arbitrary cooking and starts behaving like
chemistry — it emerges from real structure. Honesty at the bottom is
what earns a periodic table on top.

See also:

- [docs/architecture.md](./architecture.md) — the **mechanism** of Part
  I: the `Stuff` branch hierarchy, branch registration, the
  Manager/Api split. This doc is the conceptual framing; that one is the
  implementation. No duplication intended.
- [docs/subsystems/mixins.md](./subsystems/mixins.md) — the composition
  system that makes the substrate combinatorial.
- [docs/subsystems/quantities.md](./subsystems/quantities.md),
  [templates.md](./subsystems/templates.md) — honest units and the
  clone/hydrate pipeline that mints instances.
- [docs/vision.md](./vision.md) — the product vision the gamification
  layer serves; its Guilds / dual-progression / skills are today's
  hand-authored version of what Part II imagines generalizing.

---

## Part I — The Standard Model (what we know)

This layer is **shipped and load-bearing.** It is the mudlib — and its
makeup, taken as a whole, comes down to a few cross-cutting shapes that
hold no matter which subsystem you're looking at. (The subsystem docs
catalog the individual mixins and interfaces; this section is about how
the model hangs together.)

### Two axes: kind and capability

A Stuff's identity is **one branch crossed with a set of mixins** — what
it *is*, crossed with what it *can do*. The inheritance spine is
deliberately shallow: a handful of branches, one level deep. All the
depth lives *sideways*, in composition. Kind on the vertical axis,
capability on the horizontal. This is the master pattern; most of the
rest is a consequence of it.

The payoff of a shallow spine and wide composition is the chemistry
itself: you don't get a new kind of thing by subclassing down a brittle
tower, you get it by combining traits. A torch, a lantern, and a glowing
sword aren't three classes — they're three combinations.

### The spine: kinds sorted by containment

Every concrete entity extends a base `Stuff` class through exactly one
top-level branch, and the branches are sorted not by theme (weapons,
furniture, people) but by their relationship to **containment**:

- `Idea` — incorporeal, no spatial footprint (Exit, Login, Zone).
- `Thing` — a portable item; it's `Containable` ("I live somewhere").
- `Location` — a stationary place; it's a `Container` ("I'm a place").
- `Vessel` — both `Container` and `Containable` (a ship holds things and
  is itself held by a zone).
- `Agent` — a sentient actor (Character → Avatar).
- `Persistable` — auth/CMS records (User, Template): Stuff, but outside
  the in-world tree.

That the organizing axis is *am I a container, a containable, both, or
neither* is not arbitrary. It encodes the design-philosophy summary —
*the world is a graph of containers connected by conduits* — directly
into the class hierarchy. **The topology of the world is the taxonomy.**
The authoritative table and the branch-registration rules live in
[architecture.md](./architecture.md).

### The traits: mixins are the bonds

On the horizontal axis sits a library of composable traits, clustered
one group per subsystem — `Containable`, `Container`, `LightSource`,
`Wearable`, `Exitable`, `Atmospheric`, `Mountable`, and many more. A
torch is a `Thing` that is also a `LightSource`; a ship is a `Vessel`
that is `Exitable`; an avatar is an `Agent` that is `Mobile` + `Sensor` +
`Container`. Composition *is* the chemistry of the substrate — a small
primitive set bonding into endless compounds. (See
[mixins.md](./subsystems/mixins.md).) Strictly, the *mixin* is the
mechanism that forms the bond; the bond's runtime form is the
**interface** the composed object presents — which is why the element
list below catalogs interfaces, not mixin factories.

### Everything is Stuff: one set of base laws

Rooms, swords, avatars, exits, even framework records — all descend from
one base class, so all obey one set of base laws: a runtime identity, a
lifecycle (create / destroy choreography), a persistence pathway, a
call-security proxy, an event surface. This uniformity is what *lets* the
chemistry work — every particle, however exotic its trait combination,
obeys the same fundamental rules, so particles combine predictably and
the framework can reach any of them through the same seams.

### The forces: Apis act on Stuff

If the kinds are the **particles** and mixins are their **properties**,
the **Apis are the forces** — the way one particle acts on another.
`ContainmentApi` moves a Thing into a Container; `LocomotionApi` carries
an Agent through an Exit; `MessageApi` propagates a perception from one
Stuff to its neighbors. And the forces are *mediated*: every Api call
threads through the same security gate, so there is one lawful path by
which Stuff affects Stuff. Particles, properties, forces — that's the
standard model of *this* world, and the Manager/Api split that
implements it is in [architecture.md](./architecture.md).

### The particles are real

Where the substrate carries measurable properties, they're honest — real
units via `Quantity<U>` (kg, lux, dB SPL, Kelvin), not 0–100 sliders.
That honesty is the premise of
[design-philosophy.md](./design-philosophy.md), and it's what makes the
Part II bet plausible: chemistry can only emerge from particles that
actually obey laws.

### The claim

A shallow spine of kinds, a wide library of trait-bonds, a uniform base,
and a mediated set of forces compose to represent anything the world
contains. That's the *structural* twin of text's universality in
[interaction-philosophy.md](./interaction-philosophy.md): text can
*render* anything; the Standard Model can *structure* anything. Same
"language or numbers" split — the Standard Model is the numbers given
shape.

---

## The element list: kinds, traits, and forces

The makeup above, enumerated. The **kinds** are the base classes (the
particles); the **traits** are the interfaces (the bonds — installed by mixins, but it's the interface that exists at runtime); the **forces**
are the Apis, catalogued in [architecture.md](./architecture.md) rather
than here. One-liners only — the subsystem docs carry the depth, and the
`Mixins` registry in `lib/mixin.ts` is the source of truth if this
snapshot has drifted.

### The kinds (base classes)

**`Stuff`** — the base every entity extends: runtime identity,
create/destroy lifecycle, call-security proxy, event surface.

Top-level branches:

- **`Idea`** — incorporeal entity, no physical presence (exits, zones,
  login, reference singletons).
- **`Thing`** — portable physical item (`Containable`).
- **`Location`** — stationary place (`Container`).
- **`Vessel`** — a place that is itself portable (`Container` +
  `Containable`) — ships, carts.
- **`Agent`** — active/sentient runtime actor.
- **`Persistable`** — DB-backed record (User, Template), outside the
  in-world tree.
- **`Shadow`** — framework-internal per-instance method interception;
  not in-world Stuff.

Under `Agent`:

- **`Character`** — abstract sentient being (PC or NPC).
- **`Avatar`** — a player character bound to an interactive connection.
- **`ShelledCharacter`** — a character carrying the authoring shell
  (workspace + alias + author).

Under `Idea`:

- **`Exit`** — a first-class one-way passage between locations.
- **`Zone`** — a scope / folder of templates with field inheritance.
  - **`SpatialZone`** — a zone that owns locations and derives exits.
  - **`CartesianZone`** — a 3D integer-grid zone with cardinal adjacency.
  - **`SphericalZone`** — a zone of arbitrarily-placed spheres with
    semantic exits.
  - **`FolderZone`** — an organizational scope with no spatial topology.
  - **`Clade`** — a taxonomic scope whose members are `Species`.
- Reference singletons (one instance per template path):
  - **`Material`** — a substance (density, molar mass, …);
    **`RadioactiveMaterial`** adds decay.
  - **`Species`** / **`BodyPlan`** — organism and body-structure
    templates.
  - **`LocomotionMode`** — a way of moving (walk / swim / climb / fly …).
  - **`Biome`** — an atmospheric/environmental scope;
    **`SkyExposedBiome`** for outdoors.
- **`EvalScript`** — a runtime-only wrapped eval sandbox.

Under `Location`:

- **`CartesianLocation`** — a room positioned on a Cartesian grid.
- **`SphericalLocation`** — a body positioned in a spherical zone.
- **`VoidLocation`** — the singleton null-space room.

Under `Thing` (the boundary family):

- **`Boundary`** — a barrier between two locations.
- **`Door`** — a sealable barrier gating passage.
- **`Window`** — a sealable transparent barrier.
- **`BoundaryAnchor`** — a fixture representing one side of a `Boundary`.

Under `Persistable`:

- **`Template`** — abstract CMS template; **`ZoneTemplate`** /
  **`LeafTemplate`** are the concrete kinds.
- **`User`**, **`GoogleProfile`** — auth records.

### The traits (interfaces), by subsystem

A mixin is only the *mechanism* that installs a capability; once composed
it has no separate runtime existence. What exists — and what other Stuff
depends on and `MixinApi.is*` narrows to — is the **interface**. So the
list is keyed by interface; each is installed by the same-named `*Mixin`
factory in the folder shown.

**`description/`**
- **`Named`** — proper-name identity (Alice, Excalibur); not for
  generic labels.
- **`Visible`** — short and long descriptions for display.
- **`Perceptible`** — MQL keywords/aliases so a thing is findable
  (`get rose`).
- **`Perceiver`** — the actor's perception verbs (look, scry,
  locate); requires `Sensor`.
- **`Detailed`** — nested sub-features of a thing (a desk's drawer,
  a wall's carving).

**`spatial/`**
- **`Container`** — holds `Containable`s; the "I'm a place" surface.
- **`Containable`** — lives inside a `Container`; owns the
  `environment` chokepoint.
- **`Surfaced`** — rests *on* a surface rather than *in* a
  container.
- **`CartesianCoordinates`** — an (x, y, z) position in a Cartesian
  zone.
- **`SphericalCoordinates`** — a focus + radius in a spherical zone.
- **`Mobile`** — can move and emits movement messaging; requires
  `Containable`.
- **`Sealable`** — open/closed state (doors, chests, windows).

**`boundary/`**
- **`Exitable`** — owns a location's exits (explicit + zone-derived).
- **`DoorBearing`** — a vessel whose exit is synthesized from a
  single `Door`.
- **`Adornable`** — hosts non-portable fixtures (sconces, anchors).
- **`Adornment`** — the fixture's back-reference to what it adorns.

**`message/`**
- **`Sensor`** — receives messages, with a shadowable filter hook.
- **`Vocal`** — speech (`say`) for sentient beings.

**`command/`**
- **`CommandGiver`** — chain-of-responsibility command dispatch with
  a per-giver recency stack.
- **`Focused`** — interactive focus + pronoun memory on a command
  giver.

**`perception/`**
- **`Perception`** — per-viewer perception modifiers (blindness,
  night vision, curses).
- **`LightSource`** — emits light (lumens + color temperature).
- **`AmbientLit`** — emits inherent ambient light regardless of
  contents.
- **`Scryable`** — can be perceived remotely (mirrors, crystal
  balls); per-target veto.

**`material/`**
- **`Tangible`** — made of material(s); bulk default + per-detail
  overrides.
- **`Radioactive`** — decay (half-life, products) for specialized
  `Material`s.

**`character/`**
- **`Gendered`** — pronoun set (he / she / they / it / ze).
- **`Sexed`** — biological sex, validated against the species' sex-
  determination system.
- **`Posed`** — the actor's posture (stand / sit / lie / kneel).

**`slot/`**
- **`Slotted`** — host exposes named occupancy slots.
- **`Slottable`** — a thing that can occupy slots; per-slot
  acceptance test.
- **`Wearable`** — worn on body slots (per body plan); atomic
  multi-slot.
- **`Wieldable`** — held in hand slots; same shape as `Wearable`.
- **`Postured`** — host offers posture-bearing slots (a chair's sit,
  a bed's lie).
- **`Mountable`** — host offers a mount slot for riders.
- **`Drivable`** — host offers a controller slot for a driver.

**`locomotion/`**
- **`Climbable`** / **`Swimmable`** / **`Flyable`** — host
  can be climbed / swum / flown, gated by difficulty vs. actor
  capability.

**`activity/`**
- **`Engaged`** — the actor's engagement-slot map (body / hands /
  attention / voice); runtime-only.

**`biome/`**
- **`Atmospheric`** — atmospheric state (biome ref + per-field /
  room / detail overrides).
- **`SkyExposed`** — marks a biome as open to the sky (outdoors).

**`stuff/`**
- **`Propertied`** — dynamic runtime properties (`Property<T>`),
  transient or saved, access-controlled.
- **`Singleton`** — one instance per template path.
- **`PostRegistration`** — post-registration lifecycle hook
  (`@PostConstruct`-style).
- **`Spawner`** / **`Spawned`** — track within-session dynamic
  spawns and their back-reference.
- **`Populates`** — declaratively spawns contents into a `Container`
  at clone time.
- **`Globbable`** — a fungible stack carrying an integer quantity;
  splits and merges.

**`shell/`**
- **`Environment`** — per-character settings + session vars.
- **`Alias`** — per-character command aliases (defaults / persistent
  / session / tombstone).
- **`Workspace`** — the author's cwd in the content and source
  trees.
- **`Author`** — object-lifecycle verbs (clone, reload, destruct,
  teleport).

**`persistence/`**
- **`AroundSaveHook`** / **`AroundDeleteHook`** — middleware
  hooks around save and delete.

**`connection/`**
- **`HasInteractive`** — owns connected `Interactive`(s);
  multiplexing for `Avatar`, singleton for `Login`.

**`species/`**
- **`Organism`** — biological identity: species ref + age/lifecycle
  + sex delegation.

> One known gap: **`BodyPlanSlots`** (`lib/slot/`) is implemented as
> a body-plan-driven override of `Slotted` but isn't yet in the `Mixins`
> registry — used internally by avatars/NPCs.

---

## Part II — The periodic table of gamification (what we can imagine)

> **Status: exploratory.** Nothing below is shipped or even designed. It
> is the vision the substrate is built to make reachable. When it's
> ready to be built, it gets its own **gamification slate**; until then,
> treat this as a sketch, not a spec.

**The goal: a common language of gamification.** A reusable framework
that turns real-life engagement into a game — and not just for one
subject. Education is the first vertical, but the same machinery should
gamify anything a sensor can watch: a smart toothbrush ("did you brush
this morning?"), a fitness band, a calendar, a codebase. The vertical is
content; the framework is constant. (See the vertical-agnostic argument
in [interaction-philosophy.md](./interaction-philosophy.md).)

**Sensors feed real life into the model.** The adaptive-learning
integration in [vision.md](./vision.md) is the first *sensor* — a source
of real-world engagement signals. Generalize it: any signal source emits
engagement, the model ingests it, the game rewards it. Real life in, game
out. The bidirectional learning↔gameplay loop already in the vision is
the special case; this is the general form.

**The open question: is there an atomic unit?** For this to be a
*language* and not a pile of ad-hoc mechanics, real-life signals should
reduce to a small, closed set of primitives — the way the periodic table
reduces to a handful of particles. A candidate set, not yet validated:

- **magnitude** — you did *a lot* (ran far, studied long).
- **streak** — you did it *consistently* (brushed every morning).
- **milestone** — you crossed a *threshold* (passed the exam).
- **quality** — you did it *well*.

The bet that makes this a periodic table rather than infinite
special-casing is that the set is **small and closed**: four or five
primitives, and every trackable real-life act decomposes into them.

**The key design move: meaning-free events.** The atom should be *dumb* —
a sensor emits "this happened, with this magnitude, at this time, from
this source," and nothing more. It does **not** know whether it counts
toward your Dentistry skill or your Literature guild. The gamification
mechanics on top assign the meaning. One dumb primitive, many
interpreters — that decoupling is exactly what makes it a *language*
instead of a bundle of hard-wired features. (It also keeps the substrate
honest per the "substrate has no content hooks" discipline: the sensor
reports reality; content decides what it's worth.)

**Relationship to today's mechanics.** The Guilds, dual progression, and
skills in [vision.md](./vision.md) are the *hand-authored* gamification
that exists in the vision now. The periodic table is the imagined
**grammar those would be generated from** — the same way specific
molecules are expressions of an underlying table, not separate
inventions.

---

## The honest edge

Two risks this layer has to own, in the same spirit as the downsides
sections in the sibling docs:

- **Gamifying real life is behavior engineering.** The line between
  *healthy motivation* and *dark-pattern manipulation* is real, and it's
  sharper when the players are students or children and the sensors
  watch real-world behavior. An honest gamification framework has to
  treat that boundary as a first-class design concern, not a footnote —
  the same way the engine refuses to lie about physics, it should refuse
  to lie about why it's rewarding you.
- **Sensors imply surveillance.** "Real life in" means real-world data
  in. Provenance, consent, and what the model is allowed to remember are
  load-bearing the moment a sensor seam exists — a content-and-policy
  concern, but one the framework's shape should anticipate rather than
  bolt on.

Neither is a reason not to build it. They're the reason the gamification
layer earns the same honesty discipline as the substrate beneath it.

---

## Summary

> **The Standard Model is the particle layer — a few fundamental kinds
> and a library of composable traits, with honest units underneath.
> The periodic table of gamification is the chemistry we mean to build
> on top — a small, closed set of engagement primitives that turns any
> tracked real-life act into play. We know the first; we're imagining
> the second; honesty at the bottom is what lets the second emerge as
> chemistry rather than cooking.**
