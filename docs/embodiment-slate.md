# Embodiment slate (working doc)

Working slate for the wearables / wieldables / sittables / mountables
cluster — the framework physics that body-plan + species now make
honest. Drafted as a comment-able design doc; the next pass shapes
this into formal requirements before it goes to a planning agent.

We are building **physics**, not equipment. "Equipment" is an RPG
concept that layers above; the framework's job here is to model
*slots, occupancy, and attachment*. Stats / armor / carry-weight-
penalties / damage-reduction are explicitly out of scope.

See also:

- [docs/mixin-slate.md](./mixin-slate.md) — the broader mixin slate;
  this doc expands the "Affordance / use" cluster.
- [docs/subsystems/race.md](./subsystems/race.md) — `BodyPlan`,
  `Species`, `OrganismMixin`, the v1 acceptance roster.
- [docs/subsystems/boundary.md](./subsystems/boundary.md) —
  `Adornable` / `Adornment`. Closely related slot-shaped substrate;
  see § "Relationship to Adornable" below.

---

## Principle

The thing the affordance cluster has in common is **slots**. A body
has slots that things go into; a chair has a slot a sitter occupies;
a horse exposes a saddle slot a rider occupies; a doorframe exposes
slots for adornments. "Wearable", "Wieldable", "Sittable",
"Mountable" are all the same primitive at different anatomies.

Body-plan + species make this honest for the first time:

- The slot vocabulary on a body is *data*, not a global enum.
- The thing that fits the slot declares its claim *per body plan*,
  not against a universal slot taxonomy.
- Locomotion modes (`walk` / `fly` / `swim` / …) are also body-plan
  data; the locomotion side of `Mobile.traverse` reads the same
  source.

A `Climbable` exit is a slot for a "climber"; a `Mountable` horse is
a slot for a "rider"; a `Sittable` chair is a slot for a "sitter".
The mixin cluster falls out as variations on the same slot
substrate.

---

## Layered design

Three layers, in dependency order:

| Layer | Concern | Mixins |
|---|---|---|
| 1. Slot substrate | "X has slots; what's filling them?" | `Slotted` (or split — see open questions) |
| 2. Body-side affordances | "I claim a slot on a body" | `Wearable`, `Wieldable` |
| 3. World-side affordances | "I expose a slot the world can fill with a body" | `Sittable`, `Mountable`, (`Lieable`, `Standable-on`) |
| 4. Locomotion plurality | Body-plan picks the traversal gate | (no new mixin — consume body-plan in `Mobile`) |

Layers 2 and 3 share the substrate from Layer 1. Layer 4 is
adjacent — same body-plan source, different consumer.

Each layer is detailed below.

---

## Layer 1 — Slot substrate

The unifying primitive is a **paired capability**, parallel to
`Container` / `Containable`:

- **`Slotted`** — host capability. "I expose slots that things can
  occupy."
- **`Slottable`** — occupant capability. "I am eligible to occupy
  a slot somewhere."

The host owns a slot map:

```
slotName → (Stuff & Slottable) | null
```

The substrate doesn't care whether the slots came from a body plan,
a chair design, or a doorframe. It cares about three things:

- What slots exist (the **slot universe**, defined by the host).
- Which slots are currently occupied (the **runtime occupancy**).
- Whether a candidate Slottable *can claim* a given slot (the
  **compatibility check**).

### Mixin shape (sketch)

```ts
interface Slotted {
  // Slot universe — read-only, derived from host config (e.g.
  // body plan for a creature, design for a chair).
  getSlotNames(): readonly string[];

  // Runtime occupancy.
  getOccupant(slot: string): (Stuff & Slottable) | null;
  getOccupants(): ReadonlyMap<string, Stuff & Slottable>;

  // Compatibility — does this candidate fit?
  canOccupy(candidate: Stuff & Slottable, slot: string): boolean;

  // Mutation. Throws on programmatic violation; returns void.
  // (See "Inter-Stuff Contract" — methods only; the underlying
  // map is host-internal.)
  occupy(candidate: Stuff & Slottable, slot: string): void;
  vacate(slot: string): (Stuff & Slottable) | null;
}

// Bare marker capability — see § "What does Slottable carry?".
interface Slottable {
  // No methods in the v1 leaning; specialized capabilities
  // (Wearable, Wieldable, …) add the claim surfaces.
}
```

A separate `SlotApi` covers cross-cutting helpers — multi-slot
claims, "find a slot for this candidate", swap-in-place, the
tear-down on `prepareDestroy`.

### What does `Slottable` carry?

Three plausible shapes:

1. **Bare marker, no behavior.** Wearable / Wieldable / … each
   compose `Slottable` and add their own `getSlotClaim(bodyPlan)`
   surface. An avatar composes `Slottable` directly so it can sit
   / mount / be slotted. The host's `canOccupy` does the kind-check
   at runtime via `MixinApi.isWearable` / `isWieldable` / etc.;
   the *slot* carries the kind constraint (a `worn:torso` slot
   only accepts a `Wearable`).
2. **Generic claim surface.** `Slottable.getSlotClaim(host):
   string[]` is on the base; Wearable / Wieldable specialize it.
   Symmetric, but "claim shape against a chair" doesn't fit a
   sitter — the chair accepts an agent without a claim of its
   own.
3. **Slottable as a sealed union.** `Slottable = Wearable |
   Wieldable | Sitter | Rider | …`. Most type-safe, least
   extensible — every new affordance forces a substrate-level
   change.

Leaning **(1) — bare marker**. Cheapest for the cases where the
candidate has no native "claim" (a sitter, a rider); slot-side
constraint expression is straightforward; specializations
(Wearable, Wieldable) carry the rich shape where it actually
exists. Locked in for the formal requirements unless somebody can
poke a hole in it.

### Open: one substrate or several?

Three plausible shapes. Top of the open-questions list.

1. **One `Slotted` mixin** that everything reuses. Bodies, chairs,
   doors all compose the same mixin; difference is *what populates
   the slot universe*.
2. **Two mixins** — `Embodied` (body-driven slots) and `Furnished`
   (object-design slots). Same shape, different sources, kept
   parallel for clarity.
3. **No common mixin** — each affordance ships its own bespoke
   slot-map. Most flexibility, most duplication, hardest to keep
   honest as the list grows.

My read: **(1) with `Slotted` as the substrate** is cleanest, but
the body-plan-driven slot vocabulary needs a real cross-reference
seam (the host needs to know which slots come from a body plan —
that's a runtime resolve, not a static field). (2) makes that
distinction first-class. Worth a paragraph each in the formal
requirements.

### Slot naming

The body-plan v1 uses strings like `hand:left`, `finger:right`. Two
conventions hover around this:

- Colon-suffixed positionals: `hand:left`, `finger:right`,
  `tentacle:1`.
- Hyphenated: `left-hand`, `right-finger`.

Doesn't matter much *which*, but it does matter that one is picked
and the framework normalizes on it. The colon form is already in
the body-plan code; lock that in and document.

---

## Layer 2 — Body-side affordances

### `Wearable`

A `Stuff` that **claims one or more `wornSlot`s on a wearer's body
plan**. The claim is per-body-plan, not universal — a hat may fit a
biped's `head` and an octopod's `mantle:1`, but be ineligible on a
sessile.

Persistent shape (sketch):

```ts
// Per-body-plan list of slot claims. "ineligible" body plans are
// simply absent from the map.
slotClaims: Record<bodyPlanPath, string[]>
```

Runtime: when `wearer.wear(boots)` runs, the framework asks the
boots for their claim against `wearer.species.bodyPlan`, validates
the slots are free (or vacates them per a configurable policy), and
calls `wearer.occupy(boots, slot)` on each claimed slot.

Verbs: `wear`, `remove`. Both go through validators that read
`SlotApi`.

### `Wieldable`

Same shape as `Wearable` but against `heldSlots`. Single slot
claims (a dagger takes one hand) and multi-slot claims (a longbow
takes both) are the same data shape (a list); the framework doesn't
distinguish "one-handed" from "two-handed" — it's just "this
Wieldable claims this many `hand:*` slots."

Verbs: `wield`, `unwield` (or `sheathe` / `holster` — vocabulary
choice; physics is the same).

### `Wearable` + `Wieldable` overlap

Some things — gauntlets, bracers, gloves — can be both. The right
answer here is probably *not* a third mixin. Compose both, declare
each side's slot claims, let the wearer pick which mode at the
verb. Worth confirming this is the intended shape rather than
inventing a `Worngear`/`Heldgear` umbrella.

### Slot occupancy on the wearer side

The wearer composes the **body-side `Slotted` host** (whatever name
shakes out — see open questions). Body-plan supplies the slot
universe at composition time. The avatar is the canonical case;
NPCs and creatures with prehensile body plans get the same
machinery.

### Body-plan-driven validation

The current `BodyPlan.wornSlots: string[]` is a flat list. Two
opens:

- Should slots have a **type** (`'fingerwear'`, `'headwear'`,
  `'footwear'`)? Today the slot *name* carries the type. That's
  fine if names are stable; gets ugly if a body plan grows multiple
  slots of the "same kind" in different positions.
- Should the body plan declare **slot capacity** beyond just
  presence? E.g., a finger slot allows one ring; a tentacle wraps
  multiple rings. Today it's implicit "one Stuff per slot."

I think we ship "one occupant per slot" in v1 and treat
multi-occupant slots as a future extension — but worth asking.

---

## Layer 3 — World-side affordances

The world side is symmetric. The *thing* exposes a slot; the avatar
fills it; the same `Slotted` substrate runs the bookkeeping.

### `Sittable` / `Lieable` / `Standable-on`

The slate names three. They look like the same primitive at
different postures: a chair has a `sit` slot; a bed has a `lie`
slot; a stool can be `stood-on` and is also `Sittable`. Two
shapes:

1. **One `Postured` mixin** with `posture` as a slot attribute.
   `chair.getSlots() = [{ name: 'sit:1', postures: ['sit'] }]`,
   `bed.getSlots() = [{ name: 'lie:1', postures: ['lie',
   'sit'] }]`.
2. **Three separate mixins**, one per posture. Simpler shape, more
   duplication.

Posture as a slot attribute is more honest — same chair can
sometimes be stood on, lain on, sat on without three mixins. I lean
(1).

The verb side: `sit on`, `lie on`, `stand on`, `get up` /
`stand up`. The body-side state ("I am sitting") is a property on
the avatar — `posture: 'sit' | 'lie' | 'stand' | 'kneel' | …` —
not a mixin. It changes with the verb.

### `Mountable` and `Drivable` — separable conveyance mixins

The slate originally framed `Mountable` as "composes with `Vessel`
for ridable creature / vehicle." The horse case (see § "Worked
example: a horse as actor and conveyance") and the mode-as-verb
locomotion model (Layer 4) force a cleaner split. `Mountable` and
`Drivable` are *separable* concerns:

| Mixin | Concern | Slot |
|---|---|---|
| `Mountable` | Physical attachment — "you board me by occupying my mount slot" | `mount:1` (or body-plan-positioned, e.g. `back:1`) |
| `Drivable` | Control coupling — "your locomotion verb routes through me when you occupy my controller slot" | declared by the host: `mount:1` for a horse, `sit:1` of the driver-role seat for a car |

Examples:

- **Horse** — `Mountable + Drivable`. Same slot serves both: `mount:1`
  is the boarding slot *and* the controller slot.
- **Car** — `Drivable` only. Boarding is via `Vessel` containment
  (and per-door exits, see the per-door walk-through). The
  controller slot is the seat with `role: 'driver'`.
- **Piggyback-giving human** — `Mountable` only. You board, you're
  conveyed, but the carrier walks where they want; you can't direct
  them. (You can plead.)
- **Bicycle** — `Drivable`; the controller slot is the seat. Whether
  it's *also* `Mountable` is a vocabulary call — lean no, since you
  `sit` on a bicycle's seat and `mount` is reserved for organic /
  horse-shaped things.

`Drivable` is **not** tied to `Vessel`. Some Drivables are Vessels
(car); some are not (horse). Conversely, some Vessels aren't
Drivable (a chest, a building). The two are orthogonal.

The verbs:

- `mount X` / `dismount` — only against `Mountable`. Occupies /
  vacates the mount slot.
- `ride <dir>` / `drive <dir>` — locomotion verbs in the
  mode-as-verb sense (Layer 4). Eligibility differs (boarding shape
  — mount slot vs. driver-role seat); routing is identical
  (through the conveyance's `Mobile`). Implementation likely shared
  in a `ConveyanceLocomotionController` base with two thin verb
  controllers on top.

### Conveyance ripple

Conveyance — "occupants move with the host" — is **not** a property
of `Mountable` or `Drivable`. It's a property of `Mobile.traverse`:
when a host traverses, all slot occupants and contained items
ripple along. The rider in `mount:1` ripples; the saddle in
`worn[back]` ripples; the rider in *the saddle's* `mount:1` ripples
recursively. The mixins just declare which slots exist; the
substrate carries the ripple.

### Crossover: same substrate as Adornable?

`Adornable` *(have)* on a Door / Window / Location exposes slots
for `Adornment`s. That's the same primitive. Three options:

1. **Retroactively port `Adornable` to the new `Slotted` substrate**
   — one truth across the codebase.
2. **Keep `Adornable` parallel** — same shape, separate code path,
   migrate later if value emerges.
3. **Diverge** — `Adornable` keeps its boundary-flavored API; the
   new substrate is body-and-furniture only.

Today's call: probably (2) for v1 — `Adornable` already works, and
retrofitting it has risk. But the formal requirements should
acknowledge that (1) is the long-term unification target.

---

## Layer 4 — Locomotion-mode pluralism

Already raised in `mixin-slate.md` as the test case for `Climbable`.
Body-plan now makes the design honest:

- `BodyPlan.locomotionModes: string[]` is the menu.
- `Mobile.traverse(exit, mode)` resolves `mode` from the
  `movement.defaultMode` setting today; the future shape lets
  `mode` be selected from the intersection of (the body-plan's
  modes) ∩ (the gate's accepted modes).
- A `Climbable` is a *traversal target* that accepts `mode:
  'climb'`. A `Swimmable` accepts `'swim'`. An `Exit` accepts
  `'walk'` and possibly more.

### Mode is the verb

A guiding observation that drops out of the locomotion design
once `Mountable` / `Drivable` are in scope: **the player never
types a bare direction**. They type `walk west`, `climb west`,
`swim west`, `fly west`, `ride west`, `drive west`. The mode IS
the verb, not a hidden parameter inferred from posture or
context. Each locomotion verb is its own controller and knows
three things:

- **Eligibility** — verb-level `CommandValidator`s gate "can I
  use this mode right now?" (body-plan supports it, posture
  allows it, slot occupancy permits it).
- **Target shape** — which exit / target type this mode resolves
  against (`walk` → normal `Exit`; `climb` → `Climbable`; `swim`
  → `Swimmable`; `ride`/`drive` → an exit reachable by the
  conveyance).
- **Routing** — whose `Mobile` actually traverses. For
  `walk`/`climb`/`swim`/`fly` — the actor's. For `ride`/`drive`
  — the conveyance's, found via `Mountable` / `Drivable`.

This kills the "find the controlling slot above me" lookup that
otherwise haunts the conveyance design. The verb selection IS
the routing; eligibility is plain command-validator machinery
already shipped in race.md (`requiresAnimate` is the v1
template); `Mobile.traverse(exit, mode)` keeps its current
shape. The verbs are the producer.

### Knobs that still need a design pass

- The intersection algorithm — pure data filter, or controller
  logic per mode?
- The error surface — "you can't fly there" vs "you can't fly at
  all" need to read differently.
- Whether `Climbable` is a *mixin* on the target Stuff or a
  *property* of an `Exit`-shaped object. (Synthetic exits vs.
  pluralism — slate § "Climbable & locomotion modes".)

This deserves its own slate, not just a section here. I'd carve
this out and link it back rather than absorb it into the
embodiment slate.

---

## Layer 0 — Things that drop out for free

Honest-physics affordances we get from body-plan + species + the
existing material substrate, with no new mixin work:

- **`Edible`** can finally check eater-side diet against
  food-side `biologicalSource.tissueType` (race.md). Not new
  mixin physics — just letting `Edible` consult species data.
- **Tissue-zone seams** for "shoot the eye" / "wing's broken" —
  body-plan names the zones, `MaterialApi.materialOf(stuff,
  detailKey)` resolves per-zone materials. Framework needs to
  expose the zone-vocabulary, but no per-zone mixin work.
- **Encumbrance / load** — mass + slot occupancy + a per-body-plan
  carrying capacity property. Pure derivation. No `Encumbered`
  *status* in v1; that's game-layer.

These all want to be flagged in the formal requirements as "free
benefits unlocked by this work" — they motivate the design but
don't cost anything beyond making sure the relevant data is
queryable.

---

## What this slate explicitly does NOT cover

- **`Equippable`** — RPG umbrella term for "wearable + wieldable."
  Not a separate mixin. The slate already calls this out.
- **Damage / armor / hit-location / soak** — game-layer.
- **Carry-weight penalties / encumbrance as status** — needs a
  stats model.
- **Hands-busy validation for verbs** ("you can't unlock the door
  while wielding a sword") — this is verb-level, lands as
  validators against the slot map; spec'd alongside the verbs that
  need it, not in this slate.
- **Polymorph / shapeshift** — body-plan swap. Race.md defers it;
  mention here only because the slot substrate's design needs to
  *not preclude* a future body-plan swap (i.e., the slot map needs
  to be reconcilable when the body plan changes).
- **Globbable / fungible occupants** — a stack of 12 coins
  occupying one slot. Cardinality-MQL rider, not in this slate.

---

## Worked example: a two-seat car with seatbelts

Concrete crystallization of the substrate. A car with a driver
seat, a passenger seat, and seatbelts on both; the car refuses to
start unless every occupied seat has its belt fastened.

### Compositions

```
Car         Vessel + ExitableVessel + Switchable
  contents:
    Seat    Thing + Postured + Adornable   (role: 'driver')
      adornments:
        Seatbelt   Adornment + Switchable
    Seat    Thing + Postured + Adornable   (role: 'passenger')
      adornments:
        Seatbelt   Adornment + Switchable
```

Three structural decisions:

- **Seats are separate Stuff inside the car, not slot names on the
  car.** The car is a `Vessel`; seats are `Containable`s in its
  contents. Each seat is the `Slotted`/`Postured` host with its
  own `sit:1`. Seats are first-class describable objects (leather,
  torn, heated) — modeling them as slot strings on the car loses
  that.
- **Seatbelts are `Adornment`s on their seat, not `Wearable`s on
  the avatar.** A seatbelt is structurally anchored to the seat
  and doesn't leave with the sitter. `Adornable` already owns this
  relationship for windows / doors; reusing it is the same
  physics. The seatbelt's `fastened` state lives on the seatbelt
  itself, via `Switchable`.
- **Driver / passenger is a property on the seat, not a slot name
  on the car.** `seat.role = 'driver'`. Lets a six-seat van or a
  motorcycle-with-sidecar vary the same way without slot-vocabulary
  churn.

### Runtime state after `enter car; sit driver-seat; fasten seatbelt`

```
car.contents:           [driver-seat, passenger-seat, avatar]
driver-seat.slots:      { sit:1 → avatar }
driver-seat.adornments: { seatbelt:1 → seatbelt }
seatbelt.fastened:      true
avatar.posture:         'sit'
```

The avatar is *both* a `Containable` of the car *and* a `Slottable`
in the seat's `sit:1`. They're independent — `stand up` vacates
the slot but leaves the avatar in the car's contents.

### The verbs

- `enter car` — `ContainmentApi.move(avatar, car)`.
- `sit driver-seat` — validates avatar is in the seat's
  containment scope; `seat.occupy(avatar, 'sit:1')`; sets
  `avatar.posture = 'sit'`.
- `fasten seatbelt` — validates the avatar occupies the seatbelt's
  seat's `sit:1`; calls the seatbelt's `Switchable.turnOn()`.
  ("fasten" / "unfasten" alias to the Switchable surface.)
- `start car` — validators do the work:
  1. `requires-sitter-in-driver-role` — find the seat with `role
     === 'driver'`; check `seat.getOccupant('sit:1') ===
     commandGiver`.
  2. `requires-all-occupied-seats-belted` — for each seat in the
     car's contents, if `seat.getOccupant('sit:1') !== null`, the
     seat's seatbelt's `fastened` must be true.

  Each validator is a small `CommandValidator` (the shape from
  `requiresAnimate` in race.md). The car is `Switchable` so
  `ignition: off | on` lives on it; `start` flips that state with
  the validators as the gate.

### What this stresses about the substrate

- **Adornable–Slotted relationship (open question #4)** — the
  cleanest model of the seatbelt is "Adornment of the seat." If
  Adornable ports onto the Slotted substrate, this is automatic —
  `seatbelt:1` becomes a structural slot, `Adornment` becomes a
  `Slottable`. If they stay parallel, this case still works, but
  it's an argument for unification.
- **Default occupants (open question #7)** — seats clone with
  seatbelts pre-attached. The substrate or the template loader
  needs a way to express "this slot's default occupant."
- **Flat, not nested (open question #8)** — the car doesn't expose
  seats as slots; seats are first-class with their own slots.
  Substrate stays flat.

---

## Worked example: per-door exits anchored to seats

Extending the same car. The car is an `ExitableVessel`; instead of
one generic "enter car" exit, each door is its own `Exit` that
deposits the traveler at a specific seat.

### Compositions

```
Car   Vessel + ExitableVessel + Adornable + Switchable
  contents:
    Seat  (role: 'driver')      Postured + Adornable
      adornments: { seatbelt:1 → Seatbelt }
    Seat  (role: 'passenger')   Postured + Adornable
      adornments: { seatbelt:1 → Seatbelt }
  adornments:
    Door  (driverDoor)
      Exit [car ↔ outside]
      arrivalAnchor: driverSeat.sit:1
    Door  (passengerDoor)
      Exit [car ↔ outside]
      arrivalAnchor: passengerSeat.sit:1
```

Doors are `Adornment`s of the car's outer boundary — that's what
the boundary substrate already does for buildings. Each door owns
its own `Exit` and its own state (open / closed / locked)
independently. The new structural piece is one field on `Exit`:

```ts
arrivalAnchor: SlotRef | null   // (slotted-host, slotName) pair
```

A pure authoring hint: "if you arrive via this exit and that slot
is free, deposit the traveler in it." The exit's *destination* is
still a containment scope (the car); the anchor is post-arrival
sugar.

`SlotRef` follows the locked cross-reference shape race.md uses
elsewhere — a path string + getter, no instance cache, HMR-safe.

### Traversal flow

`enter driver-door` (avatar outside, sliding into the seat):

1. Door's exit fires; traveler lands in the car (containment).
2. Resolver consults `arrivalAnchor: driverSeat.sit:1`.
3. If free → `driverSeat.occupy(avatar, 'sit:1')`, posture →
   `'sit'`.
4. If occupied → avatar lands free-floating in the car (the "I
   climbed in but had to slide across because someone else is in
   the driver seat" case).

`exit driver-door` (avatar getting out):

1. Validator: avatar must be in the car.
2. If seated in `driverSeat` → `vacate('sit:1')` first, posture →
   `'stand'`.
3. `ContainmentApi.move` out to the outside scope.

The anchor is one-way (arrival). `exit driver-door` while seated in
the *passenger* seat is fine — you slide across as you go. The
exit doesn't bind you to a specific seat for departure.

### What this composes for free

- **Per-door locks** — driver-door `Lockable`, passenger-door not.
  Real-world honest: lock your door, friend climbs in through
  theirs.
- **Per-door state** — open / closed / locked is per-Adornment, no
  extra wiring.
- **Window-vs-door is the same substrate** — a moonroof is a
  `Window` Adornment with no exit, just a light conduit. Already
  shipped via the Boundary work.
- **Going `out windshield` in a crash** — if you ever wanted that,
  add an `Exit` to a `Window` adornment; the model already
  supports it.

### What's new vs. existing infra

Existing — `Adornable` on the car for doors, `Adornment` on each
door (with its own `Exit` + state), `ExitableVessel` semantics.

New — one field on `Exit`: `arrivalAnchor: SlotRef | null`. Default
null means "land in the containment scope, no auto-occupy" —
backward-compatible with every existing exit.

### What this stresses about the substrate

The structural cost on *Slotted* itself is zero — this walk-through
adds one field to `Exit`, not to `Slotted`. The slot side is read
through the existing `getOccupant` / `occupy` surface.

This drives three exit-side questions that are *not* embodiment
slate concerns — they belong in a follow-on **boundary-slate**:

a. **Anchor symmetry** — purely inbound (auto-occupy on arrival),
   or also outbound ("you must be in this slot to use this exit")?
   Lean inbound-only for v1.
b. **Anchor failure mode** — slot occupied on arrival: land loose
   (proposed), pick a fallback anchor, or refuse the traversal?
c. **Multi-anchor / fallback chain** — could an exit name
   `[driver, passenger, rear-left, rear-right]` and grab the first
   free? Probably YAGNI for v1; the `SlotRef | SlotRef[]` shape is
   cheap if needed later.

These are flagged here so they don't get lost; the embodiment
slate's open-questions list stays focused on the substrate itself.

---

## Worked example: a horse as actor and conveyance

A horse is an NPC and a ridable conveyance — same Stuff, two
roles. Walking through it forces the `Mountable` / `Drivable`
split (Layer 3) and the mode-as-verb framing (Layer 4) to play
together.

### Composition

```
Horse  extends Mountable(
                 Drivable(
                   Organism(
                     Sexed(
                       Slotted(
                         Mobile(
                           Sensor(
                             Character(Agent)
                           )
                         )
                       )
                     )
                   )
                 )
               )
```

Practically that's `QuadrupedAnimalNPC` (the wolf / deer / cow base
— `Organism + Sexed + Slotted + Mobile + Sensor + Character +
Agent`) with `Mountable + Drivable` layered on top. Wolves have the
same stack minus the conveyance pair. Body plan = `quadruped`.
Species = `equus_caballus`.

The conveyance pair on a horse uses *the same slot* for both
boarding and control: `Mountable.mountSlot = 'mount:1'` and
`Drivable.controllerSlot = 'mount:1'`.

### The saddle is an interpolator

A saddle is **both** `Wearable` (claims the horse's `back` worn
slot) **and** `Mountable + Drivable` (provides its own controller
slot for the rider). It interpolates between horse and rider:

```
Bareback:
  horse.mount:1 → rider

Saddled:
  horse.worn[back] → saddle
  saddle.mount:1   → rider
```

When the horse moves, conveyance ripples through the chain:

```
horse traverses
  → ripples to horse.mount:1 (empty) OR horse.worn[back] (saddle)
  → saddle (if present) ripples to saddle.mount:1 (rider)
```

Same `Mobile.traverse` ripple either way; the chain just has an
extra link when there's a saddle. Free property: `unwear` the
saddle from one horse and `wear` it on another and the rider's
slot relationship is preserved on the saddle, not on the horse.

### Two roles, two verb sets

**Role 1: horse as actor (NPC walking around).**

Horse's behavior layer (or admin tooling) invokes the horse-shaped
verb:

- `walk west` (verb-as-mode):
  - Eligibility — body plan declares `walk` in `locomotionModes`. ✓
  - Routing — the horse's own `Mobile` traverses.
  - Conveyance ripple — anyone in `mount:1` (or via the saddle
    chain) ripples along.

**Role 2: horse as conveyance (rider directing it).**

Avatar `mount horse`. State: avatar in `horse.mount:1` (or
`saddle.mount:1` if saddled), posture `'mounted'`.

- `ride west` (verb-as-mode):
  - Eligibility — `requires-mount-slot-occupancy` (am I in a
    `Mountable`'s mount slot, AND that slot is its host's
    `Drivable.controllerSlot`?). ✓
  - Routing — the host's `Mobile` traverses (the horse, found via
    `Mountable.getMountHost(avatar)` or equivalent).
  - Conveyance ripple — same as Role 1.

- `walk west` while mounted:
  - Eligibility — `requires-walk-posture`. Posture is `'mounted'`.
    ✗.
  - Fails: "You're mounted on the horse. (Dismount first.)"

A piggyback-only carrier (Mountable, not Drivable) doesn't accept
`ride west`: eligibility fails because the mount slot isn't a
controller slot. The rider is conveyed wherever the carrier
walks.

### What this stresses about the substrate

- **`Mountable` and `Drivable` are separable** (Layer 3). The
  horse forces the split: a horse is both, a piggyback-giver is
  Mountable only, a car is Drivable only. The slate's prior
  "Mountable composes with Vessel" framing is dropped.
- **Conveyance ripple lives on `Mobile`**, not on `Mountable` or
  `Drivable`. The ripple recurses through the saddle chain
  automatically.
- **Verb-as-mode resolves the routing question** (Layer 4). The
  rider types `ride west`, which pre-selects "host's Mobile, host
  found via the conveyance mixins" — no implicit slot-walk
  needed. `walk west` would fail eligibility because of posture,
  not because of the slot chain.

### Open questions this surfaces

(Folded into the slate's open-questions list as #14–16.)

- **Multi-rider mounts** (pillion, howdah, two-seat motorcycle).
  Single `mount:1` for v1, multi-slot deferred — but
  `Drivable.controllerSlot: string` (singular) needs to leave
  room for `controllerSlots: string[]` later if shared-control
  vehicles arrive.
- **Saddle as Wearable+Mountable+Drivable** — does the
  three-mixin combo live on the saddle as standard, or is there a
  combined `Saddle`-shaped umbrella mixin? Lean three-mixin
  composition; a "Saddle" class is just the conventional
  composition.
- **Posture `'mounted'`** — adds to the posture vocabulary
  (`'sit' | 'lie' | 'stand' | 'kneel' | 'mounted'`). The
  Postured / posture-vocabulary design needs to acknowledge
  conveyance postures.

---

## Open questions

The big ones, ordered by what most needs an answer before formal
requirements:

1. **Substrate shape — one `Slotted` host capability across body /
   furniture / boundary, or split `Embodied` / `Furnished`?** (Layer
   1.) Independent of the `Slotted` / `Slottable` host/occupant
   pairing — that pairing is the same either way; this is whether
   bodies and furniture share the *host* mixin or get parallel
   ones. Affects every other layer.
2. **What does `Slottable` carry?** (Layer 1.) Bare marker (lean),
   generic claim surface, or sealed union. Cross-references the
   "Sittable / Lieable / Standable-on" question because a sitter is
   a `Slottable` whose only claim is "I'm an agent."
3. **`Sittable` / `Lieable` / `Standable-on` — one `Postured`
   mixin, or three?** (Layer 3.)
4. **Adornable retrofit — port now, parallel for v1, or diverge
   permanently?** (Layer 3, crossover.) If `Adornable` ports onto
   the substrate, an `Adornment` becomes a `Slottable`.
5. **Slot naming convention — colon-positional locked in?**
   (Layer 1.)
6. **One occupant per slot, or capacity > 1 in v1?** (Layer 1.)
7. **Template-default occupants — does `Slotted` model "this slot
   ships with a default occupant"?** (Layer 1.) Surfaced by the
   seatbelt walk-through (§ "Worked example"): a seat clones with
   its seatbelt already in `seatbelt:1`, not via a setup verb.
   Three shapes — (a) authoring sugar in the template loader that
   wires occupants at clone time; (b) a first-class
   `defaultOccupants: Record<slot, templatePath>` on the host;
   (c) wire it explicitly in the host's seed YAML. (a) and (b) are
   the candidates worth a paragraph each in the formal
   requirements.
8. **Substrate hierarchy — flat, confirmed?** (Layer 1.) The
   seatbelt walk-through suggests `Slotted` stays flat: a Stuff is
   either a slot occupant OR has its own slots, but slots don't
   nest (a car doesn't expose seats as slots — seats are
   `Containable`s with their own `Slotted` surface). Worth locking
   in explicitly so the substrate doesn't grow a nested-slot-map
   shape later.
9. **`Mountable` shape — RESOLVED.** ~~Separate mixin tree, or
   `Vessel` + slot-based rider seam?~~ The horse walk-through
   resolves this: `Mountable` is a separate mixin, independent of
   `Vessel`, and pairs with a sibling `Drivable` mixin for the
   control-coupling concern. (Layer 3.) Kept in the list for
   audit trail.
10. **Wearable per-body-plan claim shape — `Record<path, slots[]>`,
    or richer (e.g., per-body-plan also varies *what the wearable
    looks like*)?** (Layer 2.)
11. **Locomotion plurality — its own slate, or absorbed here?**
    (Layer 4.) I lean its own slate. Mode-as-verb (Layer 4 §
    "Mode is the verb") narrows that slate's scope to traversal
    targets and intersection rules; the verb shape is settled.
12. **Verb vocabulary lock-in** — `wear`/`don`/`put on`,
    `wield`/`ready`, `sit on`/`sit`, `mount`/`ride`,
    `walk`/`drive`/`ride`/`climb`/`swim`/`fly` (the locomotion
    set). Pick canonical forms; aliases land via `AliasMixin`. Not
    blocking the design but should ship with it.
13. **What does inventory look like with worn / wielded /
    contained as three sources?** Touches DescribeApi v2
    (roadmap.md). Not blocking; flag as adjacent.
14. **Multi-rider mounts** (pillion, howdah, two-seat motorcycle).
    (Layer 3.) Single `mount:1` for v1, multi-slot deferred — but
    `Drivable.controllerSlot: string` needs to leave room for
    `controllerSlots: string[]` later if shared-control vehicles
    arrive. Surfaced by the horse walk-through.
15. **Saddle as `Wearable + Mountable + Drivable`** — three-mixin
    composition standard, or a combined `Saddle` umbrella mixin?
    (Layer 3.) Lean three-mixin composition; a `Saddle` class is
    just the conventional composition. Surfaced by the horse
    walk-through.
16. **Posture vocabulary including conveyance** — `'sit' | 'lie' |
    'stand' | 'kneel' | 'mounted'` as the v1 set? (Layer 3.) The
    Postured / posture-vocabulary design needs to acknowledge
    conveyance postures. Surfaced by the horse walk-through.

---

## Build order (proposed)

If we go single-substrate, single-`Postured`:

**Wave 1** — substrate + the two simplest body-side cases.

- `Slotted` mixin + `SlotApi`.
- `Embodied`-side composition on Avatar / NPC (or fold into
  `Slotted` directly).
- `Wearable` + `wear` / `remove` verbs + validators.
- `Wieldable` + `wield` / `unwield` verbs + validators.

**Wave 2** — world-side.

- `Postured` (or three mixins, depending on §2 above).
- `sit` / `lie` / `stand on` / `get up` verbs.
- `Mountable` + `mount` / `dismount` verbs (depends on §6).

**Wave 3** — pulls.

- `Edible` consults species diet.
- Encumbrance derivation surfaced (no status mixin).
- Inventory rendering against worn / wielded / contained.

**Adjacent (own slate)** — locomotion plurality. Drives
`Climbable` / `Swimmable` / `Flyable` against body-plan modes.

---

## Sample compositions

For sanity-checking the design against concrete inhabitants. Each
listed with mixin stack + slot footprint.

- **Avatar (human)** — `… + OrganismMixin + Slotted` (body slots
  from `biped`); occupants change with `wear` / `wield`.
- **Cloth tunic** — `Thing + Visible + Portable + Wearable`;
  claims `[torso]` on `biped` and `quadruped`, ineligible on
  `sessile`.
- **Iron longsword** — `Thing + Visible + Portable + Wieldable`;
  claims `[hand:left, hand:right]` on `biped` (two-handed).
- **Wooden chair** — `Thing + Visible + Postured`; one
  `sit:1` slot, postures `['sit']`.
- **Four-poster bed** — `Thing + Visible + Postured`; one
  `lie:1` slot, postures `['lie', 'sit']`.
- **Riding horse** — `Vessel + ExitableVessel + Mountable +
  Slotted` (body slots from `quadruped`, plus a saddle slot);
  rider posture `'mounted'`.
- **Bicycle** — `Vessel + ExitableVessel + Mountable`; one
  `seat:1` slot, no body plan.
- **Dwarven helmet** — `Thing + Visible + Portable + Wearable`;
  claims `[head]` on `biped`. Same data line covers humans /
  dwarves / elves; differs by body plan, not by species.

---

## Once shaped into formal requirements

This slate should boil into a requirements doc that names:

- The mixin-list to ship (with subsystem placement under
  `lib/<subsystem>/`).
- Per-mixin: persistent fields, method surface, verbs unlocked,
  validators.
- Cross-cutting Apis (`SlotApi` at minimum) and what they own.
- Body-plan additions (if any) needed to support the above.
- Tests that gate acceptance.
- Open questions resolved with decisions inline.

The planning agent then turns the requirements into an
implementation plan against the architecture (see
[docs/architecture.md](./architecture.md) and the module-categories
list in CLAUDE.md). Anything that requires inventing a new module
category is a flag.
