# Mixin Slate (working doc)

> **Status: PARTIAL** — most of the register shipped (material, light,
> locomotion modes, slots, vehicles, glob, surfaces, senses, organism/
> species, ownership) →
> [mixins.md](../../subsystems/mixins.md)
> **Left:** `Invisible` (perception override) · `Sleeping`/`Resting`
> (sensory cutoff, command-gating, species circadian variance) ·
> `Writable` · `Pushable`/`Pullable`/`Liftable` · `Steerable`/`Navigable`
> (vehicles) · smell trails and temporal persistence · the silent-discard
> gate (authored `data:` key census) · organism tissue-composition (the
> `material` property) + species host-ranges for state-effect conditions
> · the § Out for now backlog (combat/wear mixins, NPC automation,
> university-content mixins, quest, ownership nuances (`Tradeable`/
> `Bound`), authoring metadata, RPG-stat mixins, need-state mixins beyond
> Hungry/Thirsty, other status effects, surface decay & phase)
> **Size:** a tail (the concrete register above) plus a standing backlog
> (§ Out for now — revisited per-cluster as content demands, not
> scheduled)

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

*⚠ Contradicted in part (doctrine-homing pass, 2026-09-21): the
first sentence is the live test, but the "flag ⇒ property" half is
not how the tree went — a prop is only for a slot whose key is
computed at runtime, and anything authored in YAML or narrowed on is a
mixin field (`CLAUDE.md` § Go Through the API Layer, the props row);
a pure flag that exists for a cross-cutting lookup is a legitimate
**marker mixin** (`mixins.md` § Marker mixins); and the sim-physics
layer shipped as per-domain substrate, not property tags (§ Properties
on Thing, below). Kept as the argument, not the rule.*

---

## Properties on Thing

Superseded — shipped, but as richer per-domain substrate rather than
flat property tags on `Thing`: `material` → the full `Material`
substrate (density/hardness/toughness/conductivities/heats — see
[race.md](../../subsystems/race.md)); hardness/sharpness →
[materials-response.md](../../subsystems/materials-response.md)'s
`Channel`/`Construction` response function; wet/stained/soiled →
[textiles.md](../../subsystems/textiles.md)'s soiling seam;
frozen/molten → [fire.md](../../subsystems/fire.md)'s phase change;
charged/conductive → [electricity.md](../../subsystems/electricity.md)'s
Ohm's-law conduction; temperature → [thermal.md](../../subsystems/thermal.md);
the atmospheric-emission axis → [senses.md](../../subsystems/senses.md)
(smell trails / temporal persistence are the one piece still open — see
status block).

---

## Mixins

### Affordance / use

The bulk of the standard model — each unlocks a verb / controller.
Shipped or superseded-by-shipped-substrate: `Wieldable`/`Wearable`
(embodiment.md + slot.md), `Equippable` (generic slot binding →
`Slotted`/`Slottable`, slot.md), `Sittable`/`Lieable`/`Standable-on`
(→ Postured/Posed, posture.md), `Readable` (→ `MarkedMixin`,
magic-items.md/perceiver.md), `Switchable`/`Toggleable` (→ Switchable,
boundary.md), `Pourable`/`Mixable`/`Combinable` (→ the bulk fill/pour
grammar and crafting's discrete-ingredient branch, bulk.md/crafting.md),
`Stackable` (stacks.md), `Lightable` (→ Combustible's ignition
threshold, fire.md), `Lockable`/`Keyed` (boundary.md/credential.md),
`Capacity-bound` (→ derived from mass vs. bearer capacity, never a type
flag — spatial.md/encumbrance.md), `Surfaced` (spatial.md), `Searchable`/
`Concealing`/`Hideable` (→ Concealable/Hiding, concealment.md/stealth.md),
`Portable` (→ the `get`-gates-nothing design; encumbrance is a post-hoc
consequence, not a pre-gate — encumbrance.md), `Throwable` (→ mass-gated,
not mixin-gated — ranged.md `throw`), `Tieable` (→ `HaulerMixin`
hitch/unhitch, conveyance.md), `Hangable` (→ `place`/`hang`,
furnishing.md).

Still open:

- `Writable` — can be inscribed. No shipped equivalent.
- `Pushable` / `Pullable` / `Liftable` — no shipped equivalent.

### Light family

Shipped as a unit — `LightSource`/`AmbientLit` plus `Combustible`/
`Burning` (fire.md) and the cross-room Boundary channels (`Adornable`/
`Adornment`/`Boundary`/`BoundaryAnchor`/`Conduit`, `Window`/`Door`) —
see [light.md](../../subsystems/light.md) and
[light.md § Boundary Substrate](../../subsystems/light.md#boundary-substrate).
`Lightable` did not ship as a separate mixin — ignition is
`Combustible`'s own threshold (`autoignitionTemperature`), and a
switchable light source (`PortableLight`) composes `LightSource` +
`Switchable` instead.

### Vehicles

Compose with existing `Vessel` *(have)* / `ExitableVessel` *(have)*.
`Mountable` / `Drivable` shipped — see
[conveyance.md](../../subsystems/conveyance.md).

- `Steerable` — can be aimed by a driver
- `Navigable` — long-distance / route-planning capable

### Status effects *(on Shadow infra)*

The non-game-y subset — these don't presuppose stats / health /
combat. `Poisoned`/`Diseased` shipped as the generic
`ConditionApi`/Condition substrate (harm.md), richer than a per-effect
mixin; `Cursed`/`Blessed`/`Uncursed` shipped as `Blessable`'s BUC axis
(magic-items.md); `Hidden`/`Stealthing` shipped as `Concealable`/
`Hiding` (concealment.md/stealth.md).

- `Invisible` — perception override
- `Sleeping` / `Resting` — sensory cutoff and command-gating

---

Open design threads (Material, Light, Climbable-and-locomotion-modes)
all shipped — see [race.md](../../subsystems/race.md) (Material
substrate), [light.md](../../subsystems/light.md) (Light + Boundary),
[locomotion.md](../../subsystems/locomotion.md) (mode-aware movement,
the locomotion-mode-pluralism design chosen over synthetic exits).

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

Item/behavior species-gating (Wearable/Equippable slot taxonomy from
body plan, Wieldable's prehensile-appendage gate, Mountable's
saddleable body plans, Edible/Drinkable diet gating) all shipped —
`BodyPlanSlotsMixin` derives the slot universe from species → body
plan (slot.md/embodiment.md); `DietApi`/`mustBeEdible` gate `eat`/
`drink` (metabolism.md/bulk.md).

**State-effect mixins that only apply to organisms:**

- `Poisoned`, `Diseased` — pathogens and toxins have host ranges.
  Species-aware.
- `Sleeping` / `Resting` — circadian rhythms vary by species
  (diurnal / nocturnal / crepuscular). Constructs have a parallel
  `Powered` / `Recharging` story, not this one.

`Hungry`/`Thirsty`, `Aged-in-game-time` (life stages, species
lifespans) and `Mortal` all shipped — see
[metabolism.md](../../subsystems/metabolism.md) (hunger/satiety),
[race.md](../../subsystems/race.md) (`bornAt` + species `ageCurve`),
[mortality.md](../../subsystems/mortality.md) (the dying arc).

**Property that gets richer for organisms:**

- `material` — for organisms, single-material is wrong. Either
  the property grows a tissue-composition shape, or `Organism`
  overrides material handling with a body-composition map. Decide
  alongside the body-plan design.

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

## Build order — sample-area must-haves

The smallest set that lets the sample area's authored objects feel
real. Ordered by what unblocks the most authoring at once. First and
second wave both fully shipped or superseded (see § Mixins above) and
are cut here; the design-pass items (Climbable/locomotion pluralism,
slot taxonomy, vehicles) shipped too — see
[locomotion.md](../../subsystems/locomotion.md),
[slot.md](../../subsystems/slot.md) +
[embodiment.md](../../subsystems/embodiment.md),
[conveyance.md](../../subsystems/conveyance.md).

**Third wave (handle when content asks)**

- `Pushable` / `Pullable` / `Liftable`
- `Writable`

**Status effects (when first content needs them)**

- `Invisible`
- `Sleeping` / `Resting` — needs a tick / scheduling story

---

## ⭐ Tails from the presentation build (2026-09-11)

Two seams the presentation plan was holding, moved here because both are
questions about *what a composed class declares*, not about prose.

Resolved — the register vocabulary stayed closed at three; now gated by
`lint:presentation`'s clause (b) (`docs/subsystems/presentation.md`,
`check-presentation.ts`).

### ⭐⭐ The general silent-discard gate — it now has a census

The standing want: **every authored `data:` key must be a field some
composed class declares.** An authored key nothing reads is discarded in
silence, and the author has no way to learn it.

The presentation build gave the gate its first hard number: **60 dead
`alternateNames:` blocks**, 35 of them on classes with no such field
anywhere in the composition. It also hit the same class of bug from the
other side — `primaryKeyword` authored on 48 agent rows reached no agent,
because the agent branch did not compose `PerceptibleMixin`. That
instance was closed **by composition** (`Avatar` gained `Named`), not by
a gate; the gate is still unwritten.

⭐ The census-then-ratchet shape applies directly: walk every content row,
resolve its `class:` through the mixin composition, and count keys no
composed class declares. Gate today's count as the ceiling. The content
fix (moving `alternateNames` into `keywords:`) is a **targeting-word
gain** and belongs to a build allowed to change what a player can type —
see [naming-slate.md](./naming-slate.md).
