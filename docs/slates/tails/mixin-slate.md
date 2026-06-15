# Mixin Slate (working doc)

> **Status: living checklist — ongoing, partially shipped.** Tracks the
> standing standard-model mixin buildout; many entries are already in the
> tree (marked `(have)` / "Shipped" with subsystem links). Not a single
> build — the register of what to commit to next as content pulls it.

Working slate for the standard-model buildout, post first paring
pass. Tracks mixins to commit to, properties to expose on `Thing`,
and the open design threads we need to think through.

`(have)` = already in the tree.

---

## Principle

A mixin earns its place by carrying *state or behavior* — a state
machine, an invariant, a hook, a non-trivial method surface. If it
would only ever exist as a flag, it's a property on
`PropertiedMixin`, not a mixin. By that rule, most of the
sim-physics layer collapses to property tags on `Thing`, and the
affordance / state-effect / vehicle layers stay as mixins.

---

## Properties on Thing

Pure data — descriptors other mixins query. Available; not all need
to ship at once.

### Matter & shape

- `mass`, `volume`, `density` (density derivable)
- `hardness`, `brittleness`, `flexibility`
- `sharpness` (sharp vs blunt)
- `material` — `'wood' | 'metal' | 'cloth' | 'glass' | 'stone' |
  'leather' | 'bone' | 'paper' | 'organic' | …`
- `color`
- `magnetic`, `conductive` (thermal / electrical)

### State of matter & surface

- `phase` — `solid | liquid | gaseous`
- `wet`, `stained`, `soiled`
- `frozen`, `molten`
- `temperature` (`hot` / `cold` are bands)
- `charged` (electrical store as a number)
- `aged` — accumulated time

### Atmospheric emission

The physics half of perception. The agent-side `Sensor` *(have)* /
`Vocal` *(have)* read these.

- `audible` — sound emitted (background hum, music)
- `smelly` — scent
- `tasty` — flavor when tasted
- `tactile` — texture distinct from material

---

## Mixins

### Affordance / use

The bulk of the standard model — each unlocks a verb / controller.

- `Wieldable` *(have)* — held in a hand slot (weapons, tools).
  Shipped, slot taxonomy resolved — see
  [embodiment.md](../../subsystems/embodiment.md) +
  [slot.md](../../subsystems/slot.md).
- `Equippable` — generic equipment-slot binding
- `Wearable` *(have)* — worn in a body slot (head, torso, feet,
  finger…). Shipped, slot taxonomy resolved — see
  [embodiment.md](../../subsystems/embodiment.md) +
  [slot.md](../../subsystems/slot.md). (The hand-slot refinement is now
  its own separate slate.)
- `Sittable` / `Lieable` / `Standable-on` — *superseded* by the
  shipped Postured / Posed posture substrate — see
  [posture.md](../../subsystems/posture.md).
- `Readable` — has text content; `read X`
- `Writable` — can be inscribed
- `Switchable` / `Toggleable` — on/off (lamp button, radio)
- `Pourable` — moves liquid into a target
- `Mixable` — combines with other Mixable contents
- `Stackable` / `Globbable` *(have)* — fungible, quantity-syntax.
  Shipped — see [glob.md](../../subsystems/glob.md).
- `Combinable` — recipe input (composes into Crafted)
- `Lightable` — accepts a flame; transitions to `Burning` /
  `Lit-source`
- `Lockable` — extends `Sealable` *(have)*; works with `Keyed`
- `Keyed` — is a key; matches one or more locks
- `Capacity-bound` — extends `Container` *(have)* with volume /
  weight limits
- `Surfaced` *(have)* — distinguishes "on" from "in" (`put X on
  table` vs `put X in chest`). Shipped (`lib/spatial/Surfaced.ts`) —
  see [spatial.md](../../subsystems/spatial.md).
- `Searchable` — `search` reveals concealed contents
- `Concealing` — hides contents from `look`
- `Hideable` — can serve as a hiding spot for an avatar
- `Portable` — small enough to carry (gates `get`)
- `Pushable` / `Pullable` / `Liftable`
- `Throwable` — can be hurled at a target (consumes `mass`)
- `Tieable` — accepts ropes / leashes
- `Hangable` — can hang from a hook / from another thing

### Light family

Real state machines, separate mixins:

- `LightSource` *(have)* — emits light. Composes with anything; the
  emitted Light value is configured per-instance at template time.
  Persistent: `emittedIntensity` + `emittedColor` scalars (per the
  scalar-default rule). See [docs/subsystems/light.md](../../subsystems/light.md).
- `AmbientLit` *(have)* — inherent ambient light a Container exposes
  regardless of contents. Composed onto outdoor / luminous-moss
  rooms. Same scalar shape.
- `Combustible` — will accept ignition; carries fuel rating
- `Lightable` — accepts a flame
- `Burning` — currently on fire; ticks, burns down, can spread

Cross-room channels (windows, doors that block light) are handled
by the Boundary substrate (`Adornable` *(have)* + `Adornment` *(have)*
+ `Boundary` + `BoundaryAnchor` + `Conduit` interfaces). `Window`
and the retrofitted `Door` are the v1 Boundary users. See
[docs/subsystems/light.md § Boundary Substrate](../../subsystems/light.md#boundary-substrate).

### Vehicles

Compose with existing `Vessel` *(have)* / `ExitableVessel` *(have)*.

- `Mountable` *(have)* — composes with `Vessel` for a ridable
  creature / vehicle. Shipped — see
  [conveyance.md](../../subsystems/conveyance.md).
- `Drivable` *(have)* — accepts a driver who steers it. Shipped — see
  [conveyance.md](../../subsystems/conveyance.md).
- `Steerable` — can be aimed by a driver
- `Navigable` — long-distance / route-planning capable

### Status effects *(on Shadow infra)*

The non-game-y subset — these don't presuppose stats / health /
combat.

- `Poisoned` — accumulating effect; ticks
- `Diseased` — persistent affliction
- `Cursed` / `Blessed` / `Uncursed` — three-way state on items or
  avatars
- `Invisible` — perception override
- `Hidden` / `Stealthing` — concealment vs active stealth
- `Sleeping` / `Resting` — sensory cutoff and command-gating

---

## Open design threads

### Material — shipped as a substrate

Shipped — `Material` landed as a full substrate (not the tiny
property-table envisioned here); see [race.md](../../subsystems/race.md).
The original design sketch follows for the record.

Property on `Thing`, not a mixin — `material: 'wood' | 'metal' |
…`. The behavioral consequences ("wood burns, metal conducts, glass
breaks") are *defaults* that other mixins lift from `material`
unless overridden:

- `Combustible` defaults `combustibility = true` for wood / paper /
  cloth / organic, `false` for metal / stone / glass.
- `Conductive` (if it ever comes up) defaults from material.
- `Breakable` (if / when) defaults shatter behavior from material.

Implementation: a tiny `MaterialApi` returning the default tables.
A typed accessor surface `Materialed` mixin only if we find we need
methods rather than a property read — currently I don't see one.

Material doesn't change at runtime in any case I can think of; "wet
wood" is still wood with `wet: true`.

### Light — landed; documented in [docs/subsystems/light.md](../../subsystems/light.md)

The Light & Boundary subsystem shipped. Summary of what exists:

| Concern | Form | Status |
|---|---|---|
| `LightSource` | mixin | *(have)* — emits light. Strict
runtime API takes a `Light`; persists scalars `emittedIntensity` +
`emittedColor`. |
| `AmbientLit` | mixin | *(have)* — inherent ambient on Containers.
Same scalar shape. |
| `LightApi.lightAt(loc)` / `bandAt(loc)` | API query | *(have)* —
depth-bounded recursive walk, fully lazy. |
| `LightApi.perceivedBand(viewer, loc)` / `canSee` | viewer-aware | *(have)* — Shadow seam for per-viewer overrides. |
| Boundary substrate (`Adornable`, `Adornment`, `Boundary`, `BoundaryAnchor`, conduits) | mixins + classes | *(have)* — windows / doors block channels. |
| `Combustible` / `Lightable` / `Burning` | mixins | deferred — fire mechanics not in v1. |

### Climbable & locomotion modes — shipped

Shipped: `Climbable` / `Swimmable` / `Flyable` landed with **Path 2
(locomotion-mode pluralism)** chosen — see
[locomotion.md](../../subsystems/locomotion.md). The design discussion
below is kept for the record.

Not punted — but it's the test case for a small design pass first.

Today, `Mobile.traverse(exit, mode)` is the locomotion entrypoint;
`mode` resolves from the `movement.defaultMode` setting. A
`Climbable` thing introduces *non-exit traversal* — `climb tree`
moves you to a different containment scope without going through an
`Exit`. Two paths:

1. **Synthetic exits**. A `Climbable` exposes itself as an
   `Exit`-shaped surface to the locomotion system. Cleanest, reuses
   existing dispatch.
2. **Locomotion-mode pluralism**. Traversal targets either an
   `Exit` or a `Climbable` (or `Swimmable`, `Crawlable`, `Flyable`,
   `Squeezable`); `mode` selects the gate. More invasive but gets
   swim / crawl / fly for free.

Path 2 is more interesting for the world we're building. Worth a
proper design conversation before any mixin lands. Climbable is
the forcing function but the design covers the whole locomotion
axis.

---

## Organism subsystem awareness

Several mixins on this slate touch organic actors. Either the
*actor* side of an interaction is species-gated (who can wield, who
can wear, who gets diseased) or the mixin's own *shape* is
constrained by species (which slots `Wearable` exposes, which body
plans support `Mountable`). The race / species / organism subsystem
(see [roadmap.md](../../roadmap.md) § "Race / species / organism
subsystem") is a forthcoming design pass; mixins below should be
built **neutral** to its eventual shape — no global slot enums, no
"all agents are organic" assumptions, no single-material body
composition baked into properties.

**Item / behavior mixins whose actor side is species-gated:**

- `Wearable` / `Equippable` — slot taxonomy comes from species
  body plan. Don't ship a global slot enum; defer slot-set design
  until body plans land.
- `Wieldable` — needs prehensile appendages; species-gated on the
  wielder.
- `Mountable` — only organic species with saddleable body plans;
  inorganic mounts go through `Vessel` *(have)*.
- `Edible` — what counts as edible depends on the eater's diet
  (carnivore / herbivore / omnivore) and species-specific
  toxicity. Pedagogically high-value.
- `Drinkable` — same diet / biology gating; salinity etc.

**State-effect mixins that only apply to organisms:**

- `Poisoned`, `Diseased` — pathogens and toxins have host ranges.
  Species-aware.
- `Sleeping` / `Resting` — circadian rhythms vary by species
  (diurnal / nocturnal / crepuscular). Constructs have a parallel
  `Powered` / `Recharging` story, not this one.

**Currently-deferred mixins also organism-shaped:**

- `Hungry` / `Thirsty` — organism needs; constructs consume power
  instead.
- `Aged-in-game-time` — life stages, species lifespans.
- `Mortal` — biological vs. structural failure modes.

**Property that gets richer for organisms:**

- `material` — for organisms, single-material is wrong. Either
  the property grows a tissue-composition shape, or `Organism`
  overrides material handling with a body-composition map. Decide
  alongside the body-plan design.

**Mixins explicitly neutral to `Organism`:**

- `Container` / `Capacity-bound`, the light family,
  `Cursed` / `Blessed` / `Uncursed`, `Invisible`,
  `Hidden` / `Stealthing`, `Lockable`, `Keyed`, `Readable`,
  `Writable`, `Searchable`, `Surfaced`, `Sittable` /
  `Lieable` / `Standable-on`, `Pourable`, `Stackable` /
  `Globbable`. None care whether the actor is organic.

---

## Out for now

For each cluster, the *why* matters as much as the cut, so when we
revisit we know what changed.

- **Combat & damage** — `Damageable`, `Breakable`, `Repairable`,
  `Sharpenable`, `Polishable`, `Dyeable`, `Paintable`. *Why*: no
  combat or wear systems yet.
- **NPC automation** — `Routined`, `Patrolling`, `Reactive`,
  `Animated`, `Articulated`, `Dialogic`, `Listenable`,
  `Knowledgeable`, `Tutoring` / `Studying` / `Examining`, `Trader`,
  `QuestGiver`, `Companion` / `Pet`, `Following` / `Followable`,
  `Hostile` / `Friendly` / `Pacifist`, `Memorable`, `Moody`,
  `Tipsy` / `Drunk` / `Tired` / `Energized`, `Disguised`, `Posed`.
  *Why*: NPCs ship as plain `Agent` + `Character` + `Vocal` +
  `Sensor` + `Mobile` for now; behavior layer comes after content
  exposes the need.
- **University-themed** — `Faction-tied`, `House-tied`,
  `Guild-locked`, `Roled`, `Permitted`, `Subject-tagged`,
  `Course-prerequisite`, `Lab-equipment`, `Library-cataloged`.
  *Why*: belongs in sample-area / content code, not common core.
- **Quest** — `Quest-bound`, `QuestTracking`, `QuestGiver`. *Why*:
  narrative modeling — we don't have the parts yet.
- **Ownership & value** — `Owned`, `Tradeable`, `Bound`, `Priced`,
  `Currency`, `Tippable`. *Why*: economy is downstream;
  `Containable` *(have)* already tracks current location.
- **Authoring metadata** — `Authored`, `Versioned`, `Modded`.
  *Why*: comes back when modding / sandbox arrive.
- **All Rules** — `Statted`, `Resourceful`, `Levelable`,
  `Experienced` / `XP-earner`, `Skilled`, `Reputation`,
  `Combatant`, `Damaging`, `Armored`, `Ranged` / `Melee` /
  `Spellcasting`, `Spell`, `Targetable`, `Summoner` / `Summoned`.
  *Why*: explicit defer; needs a game-design pass.
- **Need states** — `Hungry`, `Thirsty`, `Fatigued`, `Encumbered`.
  *Why*: no stats to drive them.
- **Mortality** — `Mortal` / `Immortal`, `Respawning`,
  `Aged-in-game-time`. *Why*: needs health, which is gamey.
- **Other status effects** — `Buffed`, `Debuffed`, `Stunned`,
  `Charmed`, `Drunk`, `Tracked`. *Why*: these presuppose either
  combat math or behavioral models we don't have. Revisit when
  needed.
- **Surface decay & phase** — `Decaying`, `Aged` (as state),
  `Frozen` / `Molten`. *Why*: world-tick infrastructure for items
  changing over time isn't designed yet; deferred until we have a
  reason to author content that uses them.

---

## Sample compositions

Concrete inhabitants of the sample area, expressed as their mixin
stack + relevant property tags:

- **Apple** — `Thing` + `Named` + `Visible` + `Edible` +
  `Portable`; properties: `material: 'organic'`, `mass`, `volume`
- **Candle (lit)** — `Thing` + `Named` + `Visible` + `Portable` +
  `Combustible` + `Lightable` + `Burning` + `Lit-source`;
  properties: `material: 'wax'`, `mass`
- **Dorm-room key** — `Thing` + `Named` + `Visible` + `Portable` +
  `Keyed`; properties: `material: 'metal'`, `mass`
- **Locked footlocker** — `Container` + `Capacity-bound` +
  `Sealable` *(have)* + `Lockable` + `Surfaced`; properties:
  `material: 'wood'`, `mass`
- **Sword on the wall** — `Thing` + `Named` + `Visible` +
  `Detailed` + `Wieldable` + `Hangable`; properties: `material:
  'metal'`, `sharpness: 'sharp'`, `mass`
- **Library book** — `Thing` + `Named` + `Visible` + `Readable` +
  `Portable`; properties: `material: 'paper'`, `mass`
- **Brewed tea (in a cup)** — `Thing` + `Named` + `Visible` +
  `Drinkable` + `Pourable`; properties: `phase: 'liquid'`,
  `temperature: 'hot'`, `volume`
- **NPC tutor (Dr. Halley)** — `Agent` + `Character` *(have)* +
  `Gendered` *(have)* + `Vocal` *(have)* + `Sensor` *(have)* +
  `Mobile` *(have)*. No automation yet — scripted inline by the
  area until the behavior layer comes back.
- **First-floor commons** — `Location` + `Visible` + `Detailed` +
  `Exitable` *(have)*; ambient light derived via `LightApi`.
- **Ridable bicycle** — `Vessel` *(have)* + `ExitableVessel`
  *(have)* + `Mountable` + `Drivable`; properties: `material:
  'metal'`, `mass`. (Steerable / Navigable not needed for a
  bicycle.)

---

## Build order — sample-area must-haves

The smallest set that lets the sample area's authored objects feel
real. Ordered by what unblocks the most authoring at once.

**First wave**

- `Wieldable`, `Wearable` — equipment slots; one of the bigger
  design choices below them (slot taxonomy)
- `Edible`, `Drinkable` (with `phase` property)
- `Portable` — gates `get`
- `Surfaced` — `on` vs `in` distinction
- `Sittable` — at least one piece of furniture
- `Readable` — books, signs, notes
- `Capacity-bound` (extending `Container`)

**Second wave**

- `Combustible` + `Lightable` + `Burning` + `Lit-source` +
  `LightApi` ambient query — landed as a unit; designed together
- `Lockable` + `Keyed` — first lock / first key
- `Searchable` + `Concealing` + `Hideable` — hidey-holes and
  searchable furniture

**Third wave (handle when content asks)**

- `Hangable`, `Tieable`, `Throwable`, `Pushable` /
  `Pullable` / `Liftable`
- `Switchable` / `Toggleable`, `Pourable`, `Mixable`,
  `Stackable` / `Globbable`, `Combinable`
- `Writable`

**Status effects (when first content needs them)**

- `Cursed` / `Blessed` / `Uncursed` — naturally lands first if you
  want enchanted items
- `Invisible`, `Hidden` / `Stealthing` — together
- `Poisoned`, `Diseased`, `Sleeping` / `Resting` — these all need
  a tick / scheduling story; consider together

**Design pass before building** — *the three below have all since
shipped:*

- `Climbable` + locomotion-mode pluralism (the `Climbable` /
  `Swimmable` / `Crawlable` / `Flyable` axis) — *shipped, Path 2
  chosen* — see [locomotion.md](../../subsystems/locomotion.md).
- Equipment slot taxonomy (head, torso, feet, hands, finger,
  wrist, neck, …) — *shipped, taxonomy resolved* — see
  [slot.md](../../subsystems/slot.md) +
  [embodiment.md](../../subsystems/embodiment.md); the hand-slot
  refinement is now its own separate slate.
- Vehicles — `Mountable`, `Drivable`, `Steerable`, `Navigable`;
  the bicycle is a forcing function but the design covers
  multi-passenger vessels too — *`Mountable` / `Drivable` shipped* —
  see [conveyance.md](../../subsystems/conveyance.md).
