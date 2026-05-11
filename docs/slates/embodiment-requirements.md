# Embodiment requirements (formal)

Distilled from [embodiment-slate.md](./embodiment-slate.md) after the
scoping pass. This is the spec the planning agent will turn into an
implementation plan.

Scope decisions, mixin lists, API ownership, BodyPlan migration,
verb suite, persistence shape, test acceptance, and the explicit
out-of-scope list live below. Open questions from the slate are
either resolved here (with the chosen answer + one-line rationale)
or carved out to a follow-up.

---

## 1. Goals

Ship the **slot substrate** plus the body-side and world-side
affordance mixins that ride on it, end-to-end, with verbs and
validators. Specifically:

- A unified `Slotted` / `Slottable` capability pairing usable by
  bodies, furniture, conveyances, and (post-retrofit) boundary
  fixtures.
- Body-side affordances: `Wearable`, `Wieldable`.
- World-side affordances: `Postured` (sit / lie / stand-on),
  `Mountable`, `Drivable`.
- The verb suite that drives them.
- The conveyance ripple in `Mobile.traverse` so that occupants of
  mount slots (and saddles, recursively) move with their host.
- The `Adornable` retrofit onto the new substrate.
- BodyPlan generalization so wearable / wieldable / mount slot
  vocabularies all flow from the same per-body-plan declaration.

## 2. Non-goals

The slate's "Layer 0 — drops out for free" benefits and the Wave 3
pulls are explicitly **out of scope** for this MR:

- `Edible` consulting species diet — separate MR; depends on a
  diet-side reader that doesn't exist yet.
- Encumbrance derivation — deferred until a consumer asks for it.
- Inventory rendering against worn / wielded / contained sources —
  belongs to `DescribeApi v2` (recognition slate / roadmap punch
  list).

Hard exclusions from the slate, restated:

- No `Equippable` umbrella mixin.
- No damage / armor / hit-location.
- No carry-weight penalties or `Encumbered` status mixin.
- No hands-busy verb-level validators (those land with the verbs
  that need them, e.g., `unlock` while wielding a sword).
- No polymorph / shapeshift handling. The slot map's reconciliation
  story for body-plan swap is deferred — substrate just must not
  preclude it.
- No globbable / fungible occupants (one-physical-Stuff per slot in
  v1).
- **Locomotion plurality** (verb-as-mode `walk` / `climb` / `swim`
  / `fly` / `ride` / `drive`, body-plan mode intersection,
  `Climbable` / `Swimmable` target mixins) — own slate, own MR.
  This MR ships `mount` / `dismount` and the conveyance ripple.
  `ride X` and `drive X` as locomotion verbs land later.
- **Substrate-level "land in a specific slot on arrival"** —
  no `Exit.arrivalAnchor` field, no formalized "post-arrival
  hook" framework. Auto-sit-on-entering-driver-door (and the
  other "do X to your state on arrival" patterns) achievable with
  the existing `forceCommand` infrastructure (precedent:
  `MobileMixin` auto-look). Substrate field deferred indefinitely
  — promote to first-class only if 3+ recurring patterns argue
  for lifting. See § 7.3 + § 19 for framing.

## 3. Decision log

Resolutions to the slate's open-question list, scoped to this MR:

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | One `Slotted` host or split `Embodied` / `Furnished`? | **Single `Slotted`** | Body / furniture / boundary all reuse the same primitive; per-host source supplies the slot universe. |
| 2 | What does `Slottable` carry? | **Bare marker** | Specialized capabilities (`Wearable`, `Wieldable`, …) carry the rich claim shape; sitter / rider don't have a claim of their own. Slot-side constraint expresses the kind check. |
| 3 | `Postured` shape | **One `Postured` mixin, posture-as-slot-attribute** | Same chair can be sat / stood / lain on without three mixin compositions. |
| 4 | Adornable retrofit | **Port now** | One truth across the codebase; Wave 1+2 MR is the right cut to fold the migration into. Risk acknowledged; explicit subsection below. |
| 5 | Slot naming | **Colon-positional locked**: `hand:left`, `finger:right`, `tentacle:1`, `mount:1`, `sit:1` | Already in use by BodyPlan; framework normalizes. |
| 6 | Slot capacity | **`SlotSpec.capacity?: number`** — default 1; the exported sentinel constant `UNBOUNDED_CAPACITY` (= `Number.MAX_SAFE_INTEGER`) means unbounded. Reverses earlier "one per slot, multi-occupant deferred." | Floor's `ground:1` needs unbounded capacity (multiple actors on the ground); benches and shareable surfaces need finite > 1. The cost is small — one optional field, storage shape adjusts to `Set` per slot — and it makes the substrate honest. The sentinel constant avoids the JSON/BSON round-trip problem with `Infinity`; no custom marshaller needed (§ 14). Multi-rider mounts (tentacle rings, pillion seats) author their slot capacities explicitly. |
| 7 | Template-default occupants (e.g., car seats clone with seatbelts pre-attached) | **Dropped from embodiment.** Structural attachment (seatbelts on seats, fixtures on walls) goes through Adornable. Item spawning (monster's starting weapon) is a separate concern with its own economy / persistence / lifecycle questions; deferred to a future item-spawning subsystem. See § 19. | Conflated two distinct concerns; dropping avoids baking spawning assumptions into embodiment substrate before the spawning system exists. |
| 8 | Substrate hierarchy | **Flat — locked** | A Stuff is a slot occupant OR has its own slots; slots don't nest. Cars don't expose seats as slots; seats are `Containable`s with their own `Slotted` surface. |
| 9 | `Mountable` shape | **Resolved upstream** — separate mixin, independent of `Vessel`, paired with `Drivable`. | (slate audit trail) |
| 10 | `Wearable` per-body-plan claim shape | **`Record<bodyPlanPath, string[]>`** — list of slot names per body-plan path | Per-body-plan-rendering deferred. |
| 11 | Locomotion plurality | **Own slate, deferred** | Out-of-scope above. |
| 12 | Verb vocabulary | **Single-token verbs only**; phrasal-verb intent goes through argument arity | See § 7. |
| 13 | Inventory rendering | **Out of scope** — DescribeApi v2 | Roadmap punch list. |
| 14 | Multi-rider mounts | **Single `Drivable.controllerSlot: string`** | Rename to plural if shared-control vehicles arrive. |
| 15 | Saddle composition | **Three-mixin composition**: `Wearable + Mountable + Drivable` | No `Saddle` umbrella mixin. |
| 16 | Posture vocabulary | **`Postures` constants module** (Mixins-style) at `lib/posture/postures.ts`. v1 ships `Postures.Stand` / `.Sit` / `.Lie` / `.Kneel` / `.Mounted`. No closed union, no Api, no registry, no mutators. Slot YAML uses raw strings. Verbs and validators import. | Substrate has no opinion on posture vocabulary; constants module gives cross-controller refactor safety without a registry. Mod-introduced postures ship their own constants module. See § 7.1. |

## 4. File / module layout

A new subsystem folder for the substrate, plus body-side and
world-side affordance subsystems. Under
`packages/server/src/mud/lib/`:

```
slot/
  Slotted.ts          (mixin)
  Slottable.ts        (marker mixin)
  __tests__/
embodiment/
  Wearable.ts         (mixin)
  Wieldable.ts        (mixin)
  __tests__/
posture/
  Postured.ts         (mixin)
  __tests__/
conveyance/
  Mountable.ts        (mixin)
  Drivable.ts         (mixin)
  __tests__/
```

Plus, in `packages/server/src/mud/api/`:

```
slot.ts               (SlotApi)
```

Plus a constants-only module under the posture subsystem:

```
lib/posture/postures.ts   (Postures const-object — see § 7.1)
```

Plus the verb pairs (each is a YAML view + controller):

```
mud/cmd/wear.yaml,    mud/obj/command/WearController.ts
mud/cmd/remove.yaml,  mud/obj/command/RemoveController.ts
mud/cmd/wield.yaml,   mud/obj/command/WieldController.ts
mud/cmd/unwield.yaml, mud/obj/command/UnwieldController.ts
mud/cmd/sit.yaml,     mud/obj/command/SitController.ts
mud/cmd/lie.yaml,     mud/obj/command/LieController.ts
mud/cmd/stand.yaml,   mud/obj/command/StandController.ts
mud/cmd/mount.yaml,   mud/obj/command/MountController.ts
mud/cmd/dismount.yaml,mud/obj/command/DismountController.ts
```

`Mixins` registry (`lib/mixin.ts`) gains entries for each new mixin.

**Command-framework schema change**: `mud/cmd/command.schema.json`
gains a `defaultArg` field on per-field schemas (§ 11). The YAML
loader / dispatch pipeline grows the substitution step. This is
adjacent framework work the embodiment verbs depend on.

> Note: the layout lights up four subsystem folders in one MR. If
> the planning agent prefers to start with a single `slot/` subfolder
> and accumulate body-side / world-side mixins under it for v1,
> flag in plan review — the trade is "subsystem cohesion" vs
> "subsystem-per-concern."

## 5. Substrate mixins (`lib/slot/`)

### 5.1 `Slotted`

Host capability: "I expose slots that things can occupy."

**Composition constraint**: composes on `Stuff`. (No `Container`
prereq — a chair is `Slotted` without holding contents; a body is
`Slotted` without holding contents in the chair sense.)

**Slot universe — provenance is internal, not persisted.** The
slot universe surface (`getSlotNames`, `getSlotSpec`) is
**overridable** on the mixin. Consumers always call
`host.getSlotNames()` — they never ask where the universe came
from. The default implementation reads `staticSlots` on the host;
hosts whose universe lives elsewhere override the methods. There
is no `slotUniverseSource` discriminator field. See § 5.4 for the
override patterns.

**Runtime-only slot state.** Slot occupancy (`slots`) is **not
persisted**. v1's persistence model treats the world as
re-initializing on hydrate: NPCs re-clone, chairs re-clone, and
their slot maps come up empty. There is no cross-reboot worn /
wielded / mounted state in v1; see § 14 for the future-work note
on stash patterns. This dramatically simplifies the persistence
story — no stable cross-reboot references, no orphan-occupant
policy. Items that should be pre-attached to the host (seatbelts
on seats, fixtures on walls) are **structural** and go through
Adornable, not through the slot map; see § 10.

**Persistent fields** (authoring data only):

| Field | Type | Notes |
|---|---|---|
| `staticSlots` | `SlotSpec[]` | Authoring data. Only used by the default `getSlotNames` / `getSlotSpec` implementation. A chair declares `[{ name: 'sit:1', accepts: 'SlottableMixin', postures: ['sit'] }]` here. Hosts that override the universe surface (body-plan-driven, dynamic) leave it empty and do not include it in their `persistentFields`. |

**Runtime-only fields**:

| Field | Type | Notes |
|---|---|---|
| `slots` | `Map<string, Set<Stuff & Slottable>>` | Live runtime occupancy. Direct references (the proxy framework intercepts on use). Each slot's value is the set of current occupants — empty set when unoccupied; one entry for the common single-capacity case; multiple for multi-capacity (bench, floor). Not in `persistentFields`; starts empty on clone / hydrate; populated by player verbs (and any post-init `SlotApi.occupy` calls a host's clone hook chooses to make). |

**Method surface** (inter-Stuff contract — methods only):

```ts
interface Slotted {
  // Slot universe — overridable. Default reads `staticSlots`; see § 5.4.
  getSlotNames(): readonly string[];
  getSlotSpec(name: string): SlotSpec | null;

  // Runtime occupancy.
  // `getOccupant` is the convenience for the common single-capacity
  // case: returns the sole occupant or null. Throws if the slot has
  // multiple occupants (caller should be using getOccupants).
  getOccupant(slot: string): (Stuff & Slottable) | null;
  // `getOccupants(slot)` returns the full occupant set for one slot.
  // `getAllOccupants()` returns the slot-name → set map for the host.
  getOccupants(slot: string): ReadonlySet<Stuff & Slottable>;
  getAllOccupants(): ReadonlyMap<string, ReadonlySet<Stuff & Slottable>>;
  getOccupantCount(slot: string): number;
  isSlotOccupied(slot: string): boolean;     // count > 0
  isSlotFull(slot: string): boolean;          // count >= capacity

  // Compatibility.
  canOccupy(candidate: Stuff & Slottable, slot: string): boolean;

  // Mutation. Throw on programmatic violation; return void.
  // External callers go through SlotApi (security gate); methods
  // are the underlying surface for SlotApi to call.
  occupy(candidate: Stuff & Slottable, slot: string): void;
  // `vacate` removes a SPECIFIC candidate from the slot's occupant
  // set; returns the candidate (or null if it wasn't in the slot).
  // For multi-capacity slots, callers must name who's leaving;
  // single-capacity callers can pass the sole occupant or use the
  // sole-occupant overload.
  vacate(slot: string, candidate: Stuff & Slottable): (Stuff & Slottable) | null;
  // Convenience for single-capacity slots — vacates the sole
  // occupant. Throws if the slot has multiple occupants.
  vacateSole(slot: string): (Stuff & Slottable) | null;
}

interface SlotSpec {
  name: string;                 // e.g., 'hand:left', 'sit:1' — canonical, internal
  // Mixins-registry constant naming the mixin an occupant must
  // compose. The substrate doesn't know what the mixin *means* —
  // see § 5.3 for the canOccupy algorithm.
  accepts: string;              // e.g., Mixins.Slottable, Mixins.Wearable, Mixins.Wieldable
  capacity?: number;            // optional — max simultaneous occupants. Default 1. Use the exported `UNBOUNDED_CAPACITY` constant (`Number.MAX_SAFE_INTEGER`) for unbounded slots; floor uses this. A bench seat declares 4. **Don't use `Infinity` — it doesn't round-trip through JSON/BSON persistence**; the constant is the substitute. See § 5.1 mutation invariant + § 14 + decision #6.
  postures?: string[];          // slot-side decoration; consumed by Postured / verbs. Plain strings; no substrate-level validation. Typo'd values surface at use time when no verb's posture matches. See § 7.1.
  userFacingDetail?: string;    // optional — keyword on the host's DetailedMixin map that targets this slot via MQL (e.g. 'back' on a horse's mount slot, 'seat' on a chair's sit slot). See § 5.5.
}
```

**Lifecycle hook**: `onDestruct()` vacates every slot before
chaining to super. Vacated occupants do **not** auto-destruct —
they detach and remain in the world (commonly land in their host's
container as Containables). The host's super-chain handles their
ultimate fate.

**Runtime occupancy is universe-agnostic.** `occupy` / `vacate` /
`getOccupant(s)` / `isSlotOccupied` operate against slot *names* —
they don't care where the names came from. `occupy(candidate,
slot)`'s "unknown-slot" check just calls `this.getSlotNames()`
and asks if the slot's in the result.

**Mutation invariant**: `occupy(candidate, slot)` throws if:
- `slot ∉ getSlotNames()`,
- `isSlotFull(slot)` (occupant count would exceed `spec.capacity`),
- `getOccupants(slot).has(candidate)` (already in this slot —
  re-occupy is a programmatic bug, not a no-op),
- `canOccupy(candidate, slot) === false`.

`vacate(slot, candidate)` throws if `slot ∉ getSlotNames()` (same
unknown-slot guard as `occupy`); returns `null` (not throws) if
the slot exists but the candidate isn't currently in its occupant
set. `vacateSole(slot)` throws if the slot is unknown OR has more
than one occupant (forces the caller to use the explicit form for
multi-cap slots).

**Validation invariants on setters** (per the project's "per-field
invariants on setters" rule):

- `setStaticSlots(specs)` — for each spec, validate `accepts` is a
  registered `Mixins` constant (lookup against the registry). Bad
  values throw with the offending spec named. `postures` entries
  are **not** validated by the substrate — they're plain strings;
  a typo manifests at use time as "no verb produces this posture
  on a matching slot," surfacing through the existing slot-accept
  check rather than a hydrate-time error. Authoring tools / content
  tests catch typos before they ship; substrate stays out of the
  vocabulary business. Also validates that no two specs share a
  `userFacingDetail` value on the same host (uniqueness invariant
  per § 5.5).

(Note: `slots` has no public setter — it's runtime-only state
mutated through `occupy` / `vacate`, both of which run their own
invariant checks.)

**Mid-session destruct cleanup.** `Slottable.onDestruct()`
calls `SlotApi.findOccupiedSlots(this)` and `vacate`s the
candidate from every slot it occupies, then chains to
`super.onDestruct()`. This guarantees no host holds a stale
reference to a destructed Stuff. The cross-reboot case (occupant
Stuff fails to hydrate) doesn't apply — slots aren't persisted,
so there's nothing to dangle.

### 5.2 `Slottable`

Marker mixin with one inverse-lookup convenience and one lifecycle
hook.

```ts
interface Slottable {
  // Inverse lookup: "what host am I currently in a slot of?"
  // Common case for ground-sit / chair-sit / mount: returns the
  // single host or null. Throws if the Slottable is in slots on
  // multiple hosts simultaneously, since that's only legitimate
  // for Wearable's multi-claim case (a gauntlet on each hand of
  // the same wearer is one host; cross-host is the violation).
  // For the multi-host case (or to query the slot names), callers
  // go through SlotApi.findOccupiedSlots / findOccupiedHosts.
  getOccupiedHost(): (Stuff & Slotted) | null;
}
```

Most consumers want the convenience: `actor.getOccupiedHost()`
answers "what am I sitting on / wearing me / holding me?" with
one Stuff or null. The verbose API form is `SlotApi.findOccupiedHost(slottable)`
(throws on multi-host) and `SlotApi.findOccupiedSlots(slottable)`
(returns the full host → slots[] map).

**Lifecycle hook.** `onDestruct()` calls
`SlotApi.findOccupiedSlots(this)`, `vacate`s the candidate from
every slot it occupies (across every host), then chains to
`super.onDestruct()`. This is the sole guarantee that a
destructed Stuff doesn't leave a host holding a stale reference.
(Cross-reboot is a non-issue — slots aren't persisted; see § 5.1
"Runtime-only slot state.")

Specialized capabilities (`Wearable`, `Wieldable`) compose
`Slottable` and add their own claim surface. An avatar composes
`Slottable` directly so it can be slotted into a `sit:1` /
`mount:1`.

### 5.3 `canOccupy` — `accepts` + optional `fitsSlot`

The substrate has **no closed enum** of slot kinds and **no central
table** mapping kind to consumer mixin. A slot declares what mixin
its occupant must compose; the candidate optionally adds its own
per-slot acceptance test. Two parts:

**Part 1 — slot side: required mixin via `SlotSpec.accepts`.**
`accepts` is a string naming a `Mixins` registry constant
(`Mixins.Slottable`, `Mixins.Wearable`, `Mixins.Wieldable`,
`Mixins.Adornment`, etc.). Any future affordance ships a new
mixin, registers it in `Mixins`, and slots that want it declare
`accepts: 'WhateverMixin'` — no edit to the substrate.

**Part 2 — candidate side: optional `fitsSlot(host, slot)`.**
Specialized Slottable mixins (Wearable, Wieldable) implement an
optional method:

```ts
interface SlotFittable {
  fitsSlot(host: Stuff & Slotted, slot: string): boolean;
}
```

When present, `canOccupy` calls it after the mixin check. The
substrate doesn't know what the candidate's check is — only that
the candidate gets the final say. Bare `Slottable` doesn't
implement it (always accepts).

**Algorithm**:

```ts
canOccupy(candidate: Stuff & Slottable, slot: string): boolean {
  const spec = this.getSlotSpec(slot);
  if (!spec) return false;
  // Part 1 — mixin check.
  if (!MixinApi.hasMixin(candidate.constructor, spec.accepts)) return false;
  // Part 2 — candidate's own per-slot test, if any.
  const c = candidate as Slottable & Partial<SlotFittable>;
  if (typeof c.fitsSlot === 'function') {
    return c.fitsSlot(this, slot);
  }
  return true;
}
```

**What this buys vs a closed `SlotKind` enum**:

- A new affordance mixin (a `Plumbable` for pipes, a `Magnetic`
  for magnetic mounts) needs **nothing from the substrate**. Add
  the mixin, register it in `Mixins`, declare slots that
  `accepts: 'PlumbableMixin'`. No central kind table; no central
  switch.
- Postures stop pretending to be a "kind" and become what they
  are: slot-side decoration on a separate axis. A `sit:1` slot is
  `accepts: 'SlottableMixin'` with `postures: ['sit']`; a
  `mount:1` slot is `accepts: 'SlottableMixin'` with no postures.
  Both accept the same kind of occupant; their downstream behavior
  (Postured sets posture; Mountable.getMountOccupant reads
  `getOccupant(this.mountSlot)`) is the host's job, not the
  substrate's.
- The trade: `accepts: string` is structurally typed. A typo in
  seed YAML errors at hydrate-time setter validation (§ 5.1
  validation invariants), not at compile time. Worth the cost
  given the discovery property — and the same trade-off
  `MixinApi.hasMixin(ctor, 'WhateverMixin')` already makes
  elsewhere in the codebase.

**Examples in seed**:

```yaml
# Chair — generic posture slot, accepts any Slottable agent.
staticSlots:
  - { name: 'sit:1', accepts: 'SlottableMixin', postures: ['sit'] }

# Bed — same kind of slot, multiple postures.
staticSlots:
  - { name: 'lie:1', accepts: 'SlottableMixin', postures: ['lie', 'sit'] }

# Saddle (also Mountable + Drivable).
staticSlots:
  - { name: 'mount:1', accepts: 'SlottableMixin' }

# Body-plan-driven slots (declared in BodyPlan.slots, read via
# the BodyPlanSlotsMixin override in § 5.4):
slots:
  - { name: 'torso',    accepts: 'WearableMixin' }
  - { name: 'head',     accepts: 'WearableMixin' }
  - { name: 'hand:left',  accepts: 'WieldableMixin' }
  - { name: 'hand:right', accepts: 'WieldableMixin' }
  - { name: 'back:1',     accepts: 'SlottableMixin' }   # mount slot for quadrupeds

# Adornable host (post-retrofit — synthetic specs from override).
# Authored implicitly: each Adornment's slotName drives the spec.
```

### 5.4 Slot universe — override patterns

Three patterns ship in v1. All present the same `getSlotNames()`
surface to consumers.

**Pattern A — Static slots (default, no override).** The host
declares `staticSlots: SlotSpec[]` in its seed; the default
`getSlotNames` / `getSlotSpec` walk it. This is the chair / bed /
saddle case.

```ts
class Chair extends PosturedMixin(Thing) {
  // PosturedMixin already includes Slotted (Postured extends Slotted
  // per § 7.1). No need to compose SlottedMixin separately.
  // No override here — default impl reads staticSlots.
  protected staticSlots: SlotSpec[] = [
    { name: 'sit:1', accepts: 'SlottableMixin', postures: ['sit'] },
  ];
}
```

**Pattern B — Body-plan-driven (sibling provider mixin).** A
sibling mixin `BodyPlanSlots` composes Slotted and overrides the
universe surface to walk `species → bodyPlan → slots`. Avatars,
NPCs, and any organism with a body plan compose this instead of
populating `staticSlots`.

```ts
function BodyPlanSlotsMixin<T extends MixinConstructor<Stuff & Slotted & Organism>>(Base: T) {
  return class extends Base {
    static _mixinName = 'BodyPlanSlotsMixin';

    override getSlotNames(): readonly string[] {
      return this.getSpecies().getBodyPlan().getSlots().map(s => s.name);
    }
    override getSlotSpec(name: string): SlotSpec | null {
      return this.getSpecies().getBodyPlan().getSlots()
        .find(s => s.name === name) ?? null;
    }
    // staticSlots stays empty; doesn't appear in this class's persistentFields.
  };
}
```

The sibling-mixin shape (over a direct subclass override) keeps
the body-plan dependency on a discrete mixin so anything that's
body-plan-driven opts in by composition, not inheritance.

**Pattern C — Dynamic (Adornable retrofit).** The host's universe
mutates as fixtures are added/removed. The `Adornable` mixin (post-
retrofit) overrides the surface to derive from its live fixture
keying.

```ts
class AdornableMixin extends SlottedMixin(...) {
  override getSlotNames(): readonly string[] {
    return Array.from(this.fixtureSlots.keys());
  }
  override getSlotSpec(name: string): SlotSpec | null {
    return this.fixtureSlots.has(name)
      ? { name, accepts: 'AdornmentMixin' }
      : null;
  }
}
```

Same surface, different source. Consumers (MQL scope walks, light-
propagation finder, the `slot` debug verb) all call `getSlotNames`
and don't branch.

**Adding a new source later.** A future host whose universe is
computed differently (synthesized from a procedural body plan,
fetched from a remote authoring service) ships a new sibling mixin
that overrides the surface. No change to `Slotted`, no change to
consumers. The override surface IS the extension point.

### 5.5 Detail-targeted slot resolution

Slots have **canonical internal names** (`hand:left`, `mount:1`,
`sit:1`) and **optional user-facing detail keywords** (`back`,
`seat`, `cushion`). The internal name keys the slot map; the
detail keyword is the noun the player types.

A slot's `userFacingDetail` is a **keyword in the host's
`DetailedMixin` map**. The host already exposes that keyword via
`look back`, `examine seat`, etc. With the linkage, the same
keyword routes slot-bearing verbs (`mount back`, `sit seat`) to
the matching slot.

**MQL resolution algorithm** (consumed by `mount` / `sit X` /
`wield X` / etc.; lives in `SlotApi.resolveSlot`):

1. Resolve the verb's argument via MQL → a Stuff or a Detail-
   on-a-Stuff.
2. If the resolution is a Stuff `S` that is `Slotted`:
   a. If `S` has a single slot of the verb's `accepts` kind
      (e.g., `mount` looks for `Mountable`'s `mountSlot`), use it.
   b. Otherwise, the verb's controller picks (typically by slot
      kind, sometimes prompting the player).
3. If the resolution is a Detail keyword `D` on Stuff `S`, AND
   `S` is `Slotted`, AND some slot's `userFacingDetail === D`,
   use that slot.
4. Otherwise, fail with a verb-appropriate surface ("you can't
   sit on the wallpaper").

**Worked examples**:

```yaml
# Horse — mount slot has a 'back' user-facing detail.
# (BodyPlan-driven — declared in the quadruped body plan.)
slots:
  - { name: 'back:1', accepts: 'SlottableMixin', userFacingDetail: 'back' }
# DetailedMixin on the horse:
details:
  back: 'A broad, sweat-darkened back, marked by a saddle blanket's
         old impression.'
```

`mount horse` → finds the only mount-eligible slot → `back:1`.
`mount back` → MQL resolves `back` to the Detail on the horse →
`SlotApi.resolveSlot` finds the slot whose `userFacingDetail`
is `'back'` → `back:1`. Same slot reached by two paths.

```yaml
# Chair — sit slot has a 'seat' user-facing detail.
staticSlots:
  - { name: 'sit:1', accepts: 'SlottableMixin', postures: ['sit'], userFacingDetail: 'seat' }
details:
  seat: 'A worn leather seat, the stuffing collapsed where
         generations have rested.'
```

`sit chair` and `sit seat` both find `sit:1`.

**Why this lives on `SlotSpec` and not on `Detail`**: Details are
descriptive surface — keyword + text. Their job is "render this on
look/examine." Slot routing is the slot's concern, and a slot
*may* expose itself via a Detail. The reverse coupling — a Detail
holding a slot reference — would put routing logic in the
description subsystem, which has no business with it.

**No two slots on the same host share a `userFacingDetail`.**
`setStaticSlots` validates uniqueness and throws on collision —
hydrate-time setter validation, same shape as the other invariants.

**Authoring tooling** can cross-reference: a Detail keyword
declared on a Slotted host that no slot points at is fine
(plain descriptive Detail). A slot whose `userFacingDetail`
references a non-existent Detail is also fine for v1 (the keyword
just won't resolve via `look`, but slot routing still works via
the canonical name); a future authoring lint would flag this as
likely a typo.

## 6. Body-side affordance mixins (`lib/embodiment/`)

### 6.1 `Wearable`

Composition constraint: composes on `Stuff & Slottable + Portable`
(carryable as inventory before being worn). The interface adds a
per-body-plan claim and the substrate-facing `fitsSlot` test:

```ts
interface Wearable extends Slottable {
  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  // Substrate-facing per-slot acceptance test (§ 5.3 Part 2).
  // The substrate calls this from canOccupy after confirming the
  // candidate composes Wearable. Default impl walks slotClaims for
  // the host's body plan; subclasses can override for richer rules.
  fitsSlot(host: Stuff & Slotted, slot: string): boolean;
}
```

**`fitsSlot` default implementation** (lives in `WearableMixin`):

```ts
fitsSlot(host: Stuff & Slotted, slot: string): boolean {
  // Body-plan path comes from the host. The avatar/NPC composes
  // BodyPlanSlotsMixin; bodyPlanPath is read via the species
  // resolver. Static-slot hosts (no body plan) — Wearable rejects
  // by default; specific cases can subclass.
  const bodyPlanPath = SpeciesApi.tryGetBodyPlanPath(host);
  if (!bodyPlanPath) return false;
  return this.getSlotClaim(bodyPlanPath).includes(slot);
}
```

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `slotClaims` | `Record<string, string[]>` | `bodyPlanPath` → ordered list of slot names this Wearable claims on that body plan. Empty / absent = ineligible on that body plan. |

A boots template might declare:
```yaml
slotClaims:
  /idea/race/bodyplan/biped: ['foot:left', 'foot:right']
  /idea/race/bodyplan/quadruped: ['hoof:fore-left', 'hoof:fore-right', 'hoof:hind-left', 'hoof:hind-right']
```

Multi-slot claims are atomic — `wear` either claims all slots or
none (transactional). Failure surface: which slot was occupied and
by what. The atomicity check lives in the `wear` controller / verb
validators (the substrate's `occupy` is single-slot); see § 12.

The substrate has no special knowledge of `slotClaims`. It calls
`fitsSlot`; Wearable owns the lookup.

### 6.2 `Wieldable`

Same shape as `Wearable` but slots are body-plan held positions:

```ts
interface Wieldable extends Slottable {
  getSlotClaim(bodyPlanPath: string): readonly string[];
  setSlotClaim(bodyPlanPath: string, slots: string[]): void;
  getEligibleBodyPlans(): readonly string[];

  // Substrate-facing per-slot acceptance test. Same shape and
  // default-impl pattern as Wearable.fitsSlot.
  fitsSlot(host: Stuff & Slotted, slot: string): boolean;
}
```

A longbow declares `[hand:left, hand:right]` on biped (two slots →
two-handed). The framework doesn't model "handedness" explicitly;
it's just multi-slot claims.

### 6.3 Wearable + Wieldable overlap

Some objects (gauntlets, bracers, gloves) compose both. Each side
declares its own `slotClaims`. The verb selects the mode: `wear
gauntlet` invokes the Wearable side; `wield gauntlet` invokes the
Wieldable side. No umbrella mixin.

## 7. World-side affordance mixins

### 7.1 `Postured` (`lib/posture/`) and the `Postures` constants module

**Posture vocabulary is a constants module — `Mixins`-style — not
a registry.** Plain frozen const-object exporting the v1 strings.
No mutators, no Api, no bootstrap-order coupling, no runtime state.

**`Postures`** — `lib/posture/postures.ts`:

```ts
export const Postures = {
  Stand:   'stand',
  Sit:     'sit',
  Lie:     'lie',
  Kneel:   'kneel',
  Mounted: 'mounted',
} as const;

export type Posture = typeof Postures[keyof typeof Postures];
```

Verbs and validators import from this module. Slot YAML uses raw
strings.

**Verbs that produce a posture** assign via the constant:

```ts
// SitController
actor.setPosture(Postures.Sit);
```

**Verbs that gate on posture** check via the constant:

```ts
// WalkController eligibility
import { Postures } from '../../lib/posture/postures';

if (actor.getPosture() === Postures.Mounted) {
  return veto("You're mounted; dismount first.");
}
```

Same coupling property the per-controller `PRODUCED_POSTURE`
draft offered, routed through one module instead of through every
controller's static surface. Refactor 'mounted' → 'riding' by
editing one constant.

**`Postured`** mixin — host capability:

```ts
interface Postured extends Slotted {
  getAcceptedPostures(slot: string): readonly string[];
  // Convenience for verb dispatch:
  getSlotsAcceptingPosture(p: string): readonly string[];
}
```

`Postured` extends `Slotted`'s composition; its `staticSlots`
entries carry the `postures: string[]` field. A bed:

```yaml
staticSlots:
  - { name: 'lie:1', accepts: 'SlottableMixin', postures: ['lie', 'sit'] }
```

When `sit bed` runs, the controller picks the first slot accepting
`Postures.Sit`, occupies it, and writes the same constant to the
avatar's `posture` property.

**Definition: "posture-bearing slot."** A slot is *posture-bearing*
iff its `SlotSpec` declares `postures: string[]` non-empty. Worn,
held, mount, and fixture slots are NOT posture-bearing. Sit / lie /
kneel / stand-on / floor slots are. The phrase appears throughout
this doc — particularly in § 12's atomicity invariant ("vacate any
posture-bearing slot the actor occupies"). It's the substrate-level
predicate for "this slot's occupancy maps to a posture state on the
actor."

**Avatar `posture` property**: stored on the avatar as a
`PropertiedMixin` property of type `string` (`Posture` for type-
narrowed call sites). Default `Postures.Stand`. Vacating a
posture-bearing slot reverts posture to `Postures.Stand`.

**Ground postures — routed through the Location's floor
Adornment.** An actor with `posture === Postures.Sit` (or `.Lie`,
`.Kneel`) on a normal Location is occupying the floor
Adornment's `ground:1` slot (see § 7.5). The no-arg form is
sugar for `<verb> ground` via the framework's `defaultArg`
mechanism (§ 11) — the controller has a single MQL-resolution
path, no special branch. The `<X>` form supports targeting
`floor` / `ground` via the Detail-keyword pathway (§ 5.5);
`sit ground` and `sit` are equivalent.

This is the last-ditch rest path: in a barren wilderness with no
chairs or beds, `sit` / `lie` / `kneel` (no-arg) put the actor on
the floor. The actor IS in a slot — just an unbounded-capacity
ground slot — so the substrate's "actor is in a posture-bearing
slot" predicates remain consistent. Verbs that gate on posture
(`walk` rejecting `Postures.Mounted`) treat floor-occupied and
furniture-occupied posture identically — they read
`actor.getPosture()` and don't care which slot is involved.

**Floors can refuse postures.** A lava floor's `ground:1` slot
declares `postures: ['stand']` only; `sit lava` (or `sit` no-arg
in the lava chamber) fails the substrate's posture-acceptance
check, surfaced as "you can't sit on lava." Per-verb eligibility
validators (mounted/flying/swimming gates) compose on top.

**A void Location has no floor Adornment.** `sit` no-arg in a
void surfaces "there's nothing here to sit on." This is the
honest answer — voids genuinely don't have ground.

Rest / HP-regen / sleep semantics are game-layer, not substrate.
The substrate just makes the no-arg posture change available.

**No substrate-level validation of posture vocabulary.** A
slot-side typo (`postures: ['sittt']`) is *not* caught at hydrate.
It surfaces at use time as the existing slot-acceptance check
("you can't sit there") because no verb's posture matches the
typo'd entry. Authoring tools / content tests catch this before
shipping; substrate stays out of the vocabulary business. This is
the deliberate trade for not having a registry.

**v1 vocabulary** (everything `Postures` exports):

| Constant | Value | Producing verb | Notes |
|---|---|---|---|
| `Postures.Stand`   | `'stand'`   | `stand`    | Default avatar posture. |
| `Postures.Sit`     | `'sit'`     | `sit`      | |
| `Postures.Lie`     | `'lie'`     | `lie`      | |
| `Postures.Kneel`   | `'kneel'`   | `kneel`    | |
| `Postures.Mounted` | `'mounted'` | `mount`    | Cleared by `dismount` (sets back to `Postures.Stand`). |

Future core postures (`'crouch'`, `'prone'`, `'hover'`, …) add a
constant to `Postures` and a verb that uses it. Mod-introduced
postures ship their own constants module (e.g., `MyMod.Postures`);
the substrate doesn't need to know.

### 7.2 `Mountable` (`lib/conveyance/`)

```ts
interface Mountable extends Slotted {
  getMountSlot(): string;       // typically 'mount:1'
  isMounted(): boolean;
  getMountOccupant(): (Stuff & Slottable) | null;
}
```

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `mountSlot` | `string` | Slot name. Defaults to `'mount:1'`. A horse may use `'back:1'` resolved from its bodyPlan. |

Mountable's slot is created via the `Slotted` substrate (added to
`staticSlots` at composition time, or made available via the
`mount`-kind body-plan slot for organic mounts). `mount` and
`dismount` verbs operate against `getMountSlot()`.

### 7.3 `Drivable` (`lib/conveyance/`)

`Drivable` does **not** extend `Slotted` directly — it points at
*some* slot that exists on the host or on a Containable inside the
host. The public contract is just two convenience methods:

```ts
export interface SlotRef {
  host: Stuff & Slotted;
  name: string;
}

export interface Drivable {
  isDriven(): boolean;
  getDriver(): (Stuff & Slottable) | null;
}
```

The slot-resolution logic — where exactly the controller slot
lives on the host or its contents — is a `protected` extension
point on the class, not part of the public contract. External
Stuff asks "is anyone driving?" / "who's driving?" via the two
methods above; nobody in v1 needs the SlotRef itself. Subclasses
(`SeatedDrivableMixin`-style sibling overrides) reach the protected
method via inheritance.

(TypeScript interfaces can't declare protected members, so the
extension-point method lives on the class only; the public
`Drivable` interface stays small and contract-clean.)

**`SlotRef` — exported, but internal to the Drivable mixin
family.** TypeScript needs `SlotRef` exported from
`lib/conveyance/Drivable.ts` so the sibling override mixins in
the same family (in adjacent files) can name the type. That's
mechanical TS-module necessity, not an inter-Stuff contract
addition. Other Stuff should not reach for `Drivable`-flavored
hosts and grab their SlotRefs at runtime — the protected method
prevents that, and the documented intent reinforces it.

**If future use cases need public access**, the narrow shape is
the right answer (not promoting `getControllerSlot()` to public,
not exporting SlotRef as inter-Stuff contract):

```ts
// Add when (and only when) a concrete use case materializes:
getControllerHost(): Stuff & Slotted;       // for "show controller"
                                             // admin verb,
                                             // pre-occupancy queries
```

Speculative use cases that might want this someday:
- An admin "show controller" verb that displays where the driver
  would sit even when the seat is empty.
- A hypothetical "swap drivers" verb that needs the host to
  vacate and re-occupy.
- An external predicate "is this seat the controller seat for the
  car around me?"

None of these exist in v1 content; the substrate ships with the
two-method public surface (`isDriven` / `getDriver`) only. The
narrow `getControllerHost()` lands when a concrete consumer
arrives. Per CLAUDE.md "Don't add features beyond what the task
requires."

**Persistent fields**:

| Field | Type | Notes |
|---|---|---|
| `controllerSlot` | `string` | Slot name. Default impl reads this and returns `{ host: this, name: this.controllerSlot }`. For a horse, equal to `mountSlot`. Subclasses that need cross-Stuff override `getControllerSlot()` and may leave this field at its default. |

**Default implementation** — covers single-Stuff Drivables (horse,
bicycle, magic carpet, motorcycle):

```ts
export function DrivableMixin<TBase extends MixinConstructor<Stuff & Slotted>>(
  Base: TBase
) {
  return class extends Base {
    static _mixinName = 'DrivableMixin';

    protected controllerSlot: string = 'mount:1';

    // Protected extension point — sibling mixins override for cross-Stuff
    // controller slots. Not on the Drivable interface; not part of the
    // inter-Stuff contract.
    protected getControllerSlot(): SlotRef {
      return { host: this as Stuff & Slotted, name: this.controllerSlot };
    }

    isDriven(): boolean {
      const ref = this.getControllerSlot();
      return ref.host.isSlotOccupied(ref.name);
    }

    getDriver(): (Stuff & Slottable) | null {
      const ref = this.getControllerSlot();
      return ref.host.getOccupant(ref.name);
    }
  };
}
```

**Sibling override** — covers cross-Stuff Drivables (car, sedan,
carriage with driver-on-box, bus). The override looks up the
controller slot dynamically from the host's contents (or its
adornments, in the driver-on-box case):

```ts
export function SeatedDrivableMixin<
  TBase extends MixinConstructor<Stuff & Drivable & Container>
>(Base: TBase) {
  return class extends Base {
    static _mixinName = 'SeatedDrivableMixin';

    protected override getControllerSlot(): SlotRef {
      const driverSeat = this.getContents().find(
        s => MixinApi.isPropertied(s)
          && s.getProp(Property.of<string>('role')) === 'driver'
      );
      if (!driverSeat) {
        throw new Error(`Car ${this.stuffId} has no driver-role seat`);
      }
      return { host: driverSeat as Stuff & Slotted, name: 'sit:1' };
    }
  };
}

class Car extends SeatedDrivableMixin(DrivableMixin(VesselMixin(...))) {}
```

The sibling-mixin shape (over a direct subclass override) matches
the precedent set by `BodyPlanSlotsMixin` for body-plan-driven
slot universes (§ 5.4). The override surface IS the extension
point: future shapes (driver-platform-as-Adornment for a coach
with driver-on-box) ship a new sibling mixin.

**`Drivable.controllerSlot` is scalar — single controller per
Drivable in v1.** Multi-controller vehicles (tank: driver +
gunner + commander; helicopter: pilot + co-pilot) are deferred
per decision #14 — `controllerSlot` → `controllerSlots: SlotRef[]`
when shared-control arrives.

#### Vehicle design space coverage

The cross-Stuff `getControllerSlot()` shape covers most plausible
vehicles. What v1 admits vs. what waits:

| Vehicle | Pattern | Drivable shape | v1? |
|---|---|---|---|
| Horse, bicycle, motorcycle (1-seat), magic carpet, hot-air balloon | Single rider, scalar controller slot | default (no override) | ✓ |
| Two-seater car, sedan, bus, minivan, helicopter, single-controller tank | Driver-role seat as cross-Stuff controller | `SeatedDrivableMixin` override | ✓ |
| Carriage with driver-inside | Same as car, no per-seat doors | override | ✓ |
| Coach with driver-on-box | Driver platform is an Adornment, not a Containable | override (variant) | ✓ |
| Rowboat | Rower as scalar OR cross-Stuff depending on shape | either default or override | ✓ |
| Pillion motorcycle (driver + pillion) | Driver controls; pillion is a Mountable, not a controller | override + sibling Mountable slot | ✓ |
| Tank, helicopter, sailboat (helmsman + crew) | **Multi-controller** | needs `controllerSlots: SlotRef[]` | ✗ — decision #14 deferred |
| Sailboat (multi-crew sails as control) | **Multi-actor coordination** | beyond Drivable; activity-slate territory | ✗ — out of scope |
| Rickshaw, palanquin, dog sled | **Driver external to vehicle** | driver isn't IN the conveyance | ✗ — own design pass |

The sparse-pattern row (multi-controller, driver-external,
multi-actor) is genuinely beyond Drivable as conceived. Each
needs its own design pass; the substrate doesn't pretend to
handle them today and the proposed shape doesn't preclude them
either — `controllerSlots` plural is a strict superset, and
driver-external vehicles likely want an entirely different mixin.

### 7.4 Conveyance ripple

Lives in `Mobile.traverse`, not in `Mountable` / `Drivable`.

Algorithm (executed by `Mobile.traverse` after the host moves):

1. For each `(slotName, occupantSet)` in `host.getAllOccupants()`:
   - For each `occupant` in `occupantSet`:
     - `ContainmentApi.move(occupant, host's new container)` if the
       occupant is also a `Containable` (most are — avatars are).
     - Recurse: if the occupant is itself `Slotted`, ripple its
       occupants too. (Saddle case: horse's `back:1` slot has
       saddle; saddle's `mount:1` has rider; both ripple.)
   - Note: with multi-capacity slots (capacity > 1), every occupant
     in the set ripples. A bench moving with four sitters carries
     all four.
2. For each item in `host.getContents()` (existing behavior for
   vessels): unchanged. Vessels already ripple their contents.

**Cycle guard**: a depth limit (16) suffices for the foreseeable
slot stacks; deeper is suspect (saddle on a saddle on a horse).

### 7.5 Floors as Postured Adornments on Locations

Up through § 7.1 the doc treated ground postures as slot-less
("posture is just a property; sometimes there's a slot, sometimes
there isn't"). That model holds for the v1 *posture state*, but
it punted the question of "what is the player targeting when they
type `sit ground`?" — the Location isn't a sittable thing; it's
the room.

**Floors are first-class entities** — `Adornment`s on the
Location's `Adornable` surface, composing `Postured`. The
Boundary substrate already accommodates the topology: walls,
floors, and ceilings are all adornable surfaces that can host
fixtures (a trapdoor on a floor is an `Adornment`-on-the-floor
that's also a Boundary; the substrate composes cleanly without
new shapes).

**Floor presence is authored per Location template; v1 ships no
class-level default.** The default-floor template is the
substrate piece; *whether* a given Location includes it is a
content-authoring choice, not a substrate choice. The root
Location class doesn't compose a floor by default; no
`BaseLocation` template, no `Floored` mixin in v1. The reason:
we don't yet know the organizing principle for the eventual
Location taxonomy (biome? utility? both?), and committing to
"floors live at the root" or "floors live in a specific subclass"
ahead of that taxonomy would either force every void-shaped room
to override-to-remove or fragment the default across an
unsettled hierarchy. When the taxonomy lands, *that's* where the
default-floor convention lives — a `Floored` mixin composed by
indoor / outdoor base classes, or biome-specific defaults in
each branch. v1 stays substrate-clean; authors include the
floor explicitly per-template.

**Composition** (v1 — no umbrella mixin):

```
Floor   Adornment + Postured
```

`Adornment` for the link to the room's Adornable surface;
`Postured` for the slot universe (sit/lie/kneel/stand acceptance).
**Tangible is not composed in v1** — material-aware posture
restrictions (lava floor / water surface gating per actor
material) are explicitly deferred to § 19 #10. v1 floors gate
postures via the static `postures: [...]` list on the slot only.

**Default floor template** lives at `/idea/surface/default-floor`
(or similar — exact path is an authoring-convention call for the
planning agent). The default floor:

- Composes `Adornment + Postured`.
- Declares one slot: `{ name: 'ground:1', accepts: 'SlottableMixin', capacity: UNBOUNDED_CAPACITY, postures: ['sit', 'lie', 'kneel', 'stand'], userFacingDetail: 'floor' }`.
- Uses the substrate's standard multi-capacity slot (decision #6,
  per `SlotSpec.capacity` + the `UNBOUNDED_CAPACITY` sentinel
  constant — JSON/BSON-safe; see § 14). Multiple actors share
  `ground:1` natively — no Floor-Postured override, no substrate
  special case.
- Carries a baseline DetailedMixin entry: `floor: 'A featureless plain floor.'` (overrideable per-Location).

**Per-Location authoring**. Each Location template declares its
adornments explicitly. Most rooms include the default floor; a
specialized template overrides the slot to refuse postures (lava
floor only accepts `'stand'`); a void / underwater / midair
Location simply omits the floor adornment entirely.

```yaml
# Default Location (most rooms)
adornments:
  floor: { extends: '/idea/surface/default-floor' }

# Marble hall — overrides the description, keeps default postures
adornments:
  floor: { extends: '/idea/surface/default-floor',
           details: { floor: 'A polished marble floor, veined in grey.' } }

# Lava chamber — sit/lie/kneel rejected
adornments:
  floor: { extends: '/idea/surface/default-floor',
           staticSlots: [{ name: 'ground:1', accepts: 'SlottableMixin',
                          postures: ['stand'], userFacingDetail: 'floor' }] }

# Void — no floor at all
# (floor adornment simply not declared)
```

**Targeting via the Detail-keyword path** (§ 5.5):

- `sit floor` → MQL resolves `floor` to a Detail keyword on the
  Location. `SlotApi.resolveSlot` walks the Location's
  Adornments, finds the floor Adornment whose slot's
  `userFacingDetail === 'floor'` → `ground:1` slot → occupy →
  posture `Postures.Sit`.
- `sit ground` → same pathway; `ground` is an alias keyword on
  the same Detail.
- `sit` no-arg → the framework's `defaultArg: 'ground'` (§ 11)
  expands to `sit ground` before the field validators run; the
  same MQL pathway resolves the floor Adornment. If the Location
  has no floor (void), MQL no-match surfaces "you can't sit on
  the ground here." No controller-side branching.

The `'ground'` default-arg keyword (over `'floor'`) was picked
because it reads naturally outdoors and indoors alike. Both
keywords resolve to the same Detail on the default-floor
template; the choice is purely about which one the framework
synthesizes for no-arg invocations.

**`sit here` rejection still stands.** The Location is the room,
not a sittable surface. The verb routes via floor Adornments,
not the room directly.

**Aliases for the floor's Detail.** The default floor ships with
keyword aliases: `floor`, `ground`, `dirt`, `surface`. Any of
those resolves to the same Adornment. Per-Location overrides can
narrow (a marble hall might drop `dirt`, add `tile`).

**Mid-Location stuff doesn't change.** Containment, light
propagation, perception — all operate on the Location and its
contents as before. The floor Adornment is just one more
fixture; nothing about the spatial substrate or light walk needs
to know about the floor as a sittable thing.

**Edge cases the model handles by virtue of "floor is opt-in"**:

| Location type | Floor Adornment? | `sit` no-arg | Notes |
|---|---|---|---|
| Open void | no | "nothing here to sit on" | The original / canonical no-floor case. |
| Open water column (mid-ocean, deep underwater) | no | same surface | A `down` Exit takes you to deeper water; no floor to sit on along the way. **Exits and floors are independent** — a room can have one, both, or neither. |
| Shallow seabed / reef | yes | sit normally | Floor authored with appropriate Detail (`'sand'` / `'silt'` / `'coral'`); material-driven posture restrictions land with the future material-aware validation (§ 19). |
| Open vacuum / microgravity drift | no | same "no floor" surface | Honest — there's no ground in vacuum. |
| Space station with artificial gravity / magnetic floors | yes | sit normally | Author ships the floor with whatever Detail suits. |
| Quicksand clearing (no stable surface) | no | same surface | Author can deliberately omit the floor to express "you can't sit here." |

The substrate doesn't model gravity, fluid dynamics, or buoyancy
— those are content / locomotion concerns. It just answers "is
there a floor here?" Authors decide.

**Resting in non-floored environments — out of substrate scope.**
Earlier framing called `sit` no-arg the "last-ditch rest path";
that was loose language for the most common rest gateway. The
substrate doesn't model rest at all. Game-layer fatigue / HP
regen / sleep mechanics decide what counts as resting. In a
water column a future `tread water` or `float` activity (the
activity-slate's territory, not embodiment) becomes the rest
gateway; in zero-g, a `drift` activity. The substrate honestly
says "no floor here, no ground-sit available," and higher-layer
activity / locomotion verbs fill non-floored rest pathways when
they ship.

**Posture in non-floored environments.** An actor treading water
or drifting in zero-g defaults to `Postures.Stand` (the implicit
"free" posture, slot-less per § 7.1's standing asymmetry). When
the activity-slate lands and a swim verb introduces
`Postures.Swimming` (or `'floating'`, `'drifting'`), the verb
ships the constant in its own postures module — the substrate's
discovery shape (§ 7.1) accommodates without changes.

## 8. BodyPlan generalization (`lib/species/BodyPlan.ts`)

Replace `wornSlots: string[]` and `heldSlots: string[]` with a
unified `slots: SlotSpec[]` declaration. `locomotionModes` and
`sensoryPorts` stay as-is.

**New shape**:

```ts
class BodyPlan {
  protected name: string = '';
  protected slots: SlotSpec[] = [];  // unified
  protected locomotionModes: string[] = [];
  protected sensoryPorts: SensoryPort[] = [];
}
```

`SlotSpec` is the same shape as in `Slotted` (§ 5.1).

**Migration**: the three v1 body plans (`biped`, `quadruped`,
`sessile`) get rewritten to the new shape:

- `biped`: `[head, neck, torso, ...]` declared
  `accepts: 'WearableMixin'`, `[hand:left, hand:right]` declared
  `accepts: 'WieldableMixin'`. No mount slot by default.
- `quadruped`: same idea, plus `back:1` declared
  `accepts: 'SlottableMixin'` (the slot a saddle's Wearable claim
  targets, and the slot a rider occupies bareback) — so a
  horse-derived BodyPlan, when added, gets it for free.
- `sessile`: empty `slots`.

**No backward-compat shims.** `getWornSlots()` and `getHeldSlots()`
are deleted outright; every existing call site migrates to
`getSlots()` (or to a `getSlots().filter(s => s.accepts === ...)`
expression where the filtered shape is genuinely needed) in this
MR. The MR grows by the call-site sweep; the substrate stays
honest. Per the project rule "don't add backwards-compatibility
shims; if something is unused, delete it completely."

**Persistence**: `slots` is the new persistent field; `wornSlots`
and `heldSlots` come off the `persistentFields` list and are
removed from the class. The Hydrator reads the new shape; legacy
MongoDB documents are migrated by a one-shot script that reads
`wornSlots` + `heldSlots` and writes `slots` with the appropriate
`accepts` strings, then unsets the old fields.

> **Scope flag for plan review**: a one-shot migration script for
> the `domain` collection's BodyPlan documents is in scope. The
> planning agent should propose where it lives (`packages/server/
> scripts/`?) and how it's run.

## 9. SlotApi (`mud/api/slot.ts`)

Cross-cutting helpers. Static class, ends with
`SecurityApi.decorateApiClass(SlotApi)`.

```ts
class SlotApi {
  // Multi-slot claim (transactional). Either every slot is claimed
  // or none — no partial occupancy. Throws on validation failure
  // identifying which slot blocked it.
  static occupyAll(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable,
    slots: readonly string[]
  ): void;

  static vacateAll(
    host: Stuff & Slotted,
    slots: readonly string[]
  ): readonly (Stuff & Slottable)[];

  // Find an empty slot the candidate fits. Returns null if no slot
  // works. **Single-slot candidates only** — multi-slot Wearable /
  // Wieldable claims (a longbow taking two hands) consult the
  // candidate's `getSlotClaim()` directly and call `occupyAll`.
  // findOpenSlotFor is for "I have one thing and I'm looking for
  // any open compatible slot on this host" cases.
  static findOpenSlotFor(
    host: Stuff & Slotted,
    candidate: Stuff & Slottable
  ): string | null;

  // Find every host-slot a candidate is currently occupying.
  // Cleanup helper for Slottable.onDestruct; also the verbose
  // form behind Slottable.getOccupiedHost.
  static findOccupiedSlots(
    candidate: Stuff & Slottable
  ): ReadonlyMap<Stuff & Slotted, readonly string[]>;

  // Common-case inverse lookup: "what single host is this
  // candidate slotted into?" Returns the single host or null.
  // Throws if the candidate occupies slots on multiple hosts
  // (a Wearable claiming two slots on ONE host is fine — same
  // host counts once; multi-host occupancy is the violation).
  // Slottable.getOccupiedHost is the instance-method delegate.
  static findOccupiedHost(
    candidate: Stuff & Slottable
  ): (Stuff & Slotted) | null;

  // Slot-resolution by Detail keyword OR by accepted-mixin
  // (§ 5.5). Used by every slot-bearing verb (mount, sit X,
  // wield X) to map an MQL resolution to a slot. The two
  // discriminated forms are:
  //   { detail: 'back' }              — find slot whose
  //                                      userFacingDetail matches
  //   { accepts: 'WearableMixin' }    — find first slot whose
  //                                      accepts matches
  // (`accepts` matches the SlotSpec field name; consistent with
  // the rest of the substrate's vocabulary.)
  static resolveSlot(
    host: Stuff & Slotted,
    by: { detail: string } | { accepts: string }
  ): string | null;

  // Convenience: walk the slot map + recursively for nested
  // Slotted occupants. Used by the conveyance ripple in
  // Mobile.traverse. Called once per occupant per slot (so a
  // multi-cap slot fires the visitor multiple times).
  static walkOccupants(
    root: Stuff & Slotted,
    visit: (host: Stuff & Slotted, slot: string, occupant: Stuff & Slottable) => void
  ): void;

  // Atomic vacate-then-occupy with rollback. Used by every
  // posture verb (sit/lie/kneel/stand-on/mount) to swap the
  // actor's posture-bearing slot atomically. If `from` is null,
  // there's no current occupancy to vacate — just occupies `to`.
  // If the occupy step fails (slot taken between validate and
  // act, canOccupy returns false, etc.), re-occupies `from` to
  // restore prior state, then rethrows. Centralizes the rollback
  // pattern so individual controllers don't replicate try/catch.
  static transferOccupancy(
    candidate: Stuff & Slottable,
    from: { host: Stuff & Slotted; slot: string } | null,
    to: { host: Stuff & Slotted; slot: string }
  ): void;
}
```

The `Slotted.occupy` / `vacate` mixin methods are the underlying
surface; `SlotApi` is the security-gated entry point and the home
of multi-slot transactional logic.

## 10. Adornable retrofit

Today's `Adornable` (`lib/boundary/Adornable.ts`) holds a `Set` of
fixtures with bidirectional `adornedTo` linkage. Migrating to
`Slotted` requires:

1. **Adornable composes Slotted, override pattern C** (§ 5.4). The
   override walks the live fixture-name keying to produce
   `getSlotNames()` / `getSlotSpec()`. Each derived `SlotSpec`
   declares `accepts: 'AdornmentMixin'` so the substrate's
   `canOccupy` (§ 5.3) requires occupants to compose Adornment.
   No discriminator field; no `staticSlots` storage; the universe
   is derived from the fixture set on every call. (Cache if
   profiling demands it; v1 derives each call.)

2. **Adornment becomes a Slottable.** The marker mixin is
   appropriate (`Slottable` is bare). The `adornedTo` back-reference
   stays — it's the parent pointer the Slot framework doesn't
   carry.

3. **Slot naming for fixtures**: today fixtures are unnamed (a
   Set, not a Map). The retrofit assigns synthetic slot names
   via a **per-host incrementing counter**: each Adornable
   instance carries `protected nextFixtureIndex: number = 1`,
   and `addFixture(fixture, slotName?)` defaults `slotName` to
   `fixture:${this.nextFixtureIndex++}`. The counter is
   runtime-only (slot names themselves are runtime-only per
   § 5.1) — on rehydrate / re-clone, the counter resets to 1
   and re-added fixtures get fresh names. Authors who want
   meaningful slot names override per-fixture in seed YAML
   (e.g., `seatbelt:1`, `light:ceiling`).

4. **API surface compatibility**: keep `addFixture` / `removeFixture`
   / `hasFixture` / `getFixtures` / `getFixtureBoundaries` /
   `getFixtureLightSources` as the public API on `Adornable`.
   Internally they delegate to `Slotted.occupy` / `vacate` /
   `getOccupants` with synthetic slot names. Callers don't change.

5. **Persistence**: existing Adornable documents in MongoDB store
   the fixture set differently than the new slot map. A migration
   script alongside the BodyPlan one re-shapes them. The Adornable
   composition's override produces the universe at runtime, so the
   universe itself isn't stored — only the runtime occupancy
   (`slots`) is, same as any other Slotted host.

> **Scope flag for plan review**: the retrofit is the riskiest
> part of this MR. It touches the shipped Light + Boundary code
> path. The plan should sequence this so the core Slotted
> substrate + body-side affordances are in place and tested
> *before* the Adornable retrofit lands on top, with a clear
> rollback story if regressions surface in Light propagation.

## 11. Command subsystem extension — `defaultArg` field on YAML views

This MR extends the command framework with first-class support for
**default argument values** on YAML field declarations. The
embodiment verbs (`sit`, `lie`, `kneel`) drive the requirement;
the framework feature is general-purpose and lands as part of this
MR's substrate work.

**Shape**: each field declaration in a verb's YAML view may carry
an optional `defaultArg: <string>`. When the player invokes the
verb without supplying that field, the framework substitutes the
default string and runs it through the field's normal validators
(MQL resolution, type coercion, etc.) as though the player had
typed it.

**Authoring example** (`mud/cmd/sit.yaml`):

```yaml
verb: sit
fields:
  target:
    type: mql
    required: false
    defaultArg: 'ground'    # if no arg, MQL resolves 'ground'
                            # in the actor's scope
```

**Semantics**:

- `defaultArg` is a **string** — exactly what the player would
  have typed. The framework hands it to the same parser /
  resolver pipeline as a typed arg.
- `defaultArg` implies `required: false` — declaring both is a
  YAML lint error.
- A typed arg always wins; `defaultArg` only fires when the field
  is absent.
- If `defaultArg` resolution fails (e.g., MQL no-match because the
  Location has no floor), the field's normal failure surface
  fires. The framework doesn't special-case "default failed."
- The controller never knows whether the field came from a typed
  arg or from `defaultArg` — uniform call surface.

**Why this matters here**: the embodiment verbs use it to make
ground-targeting natural without controller branching. `sit`
(no arg) becomes equivalent to `sit ground` at the framework
layer; the controller sees a populated `target` field and runs
its single resolution path. The wall-bench disambiguation case
falls out naturally — `sit bench` overrides the default; `sit`
gets the floor.

**Schema change**: `mud/cmd/command.schema.json` grows a
`defaultArg` field on the per-field schema; the YAML loader
validates it.

**Other v1 verbs that benefit**:

- `sit`, `lie`, `kneel` — `defaultArg: 'ground'` (this MR's
  driver).
- Future: `look` could declare `defaultArg: 'here'` (today the
  controller special-cases no-arg; this would unify).
- Future: `inventory` could declare `defaultArg: 'me'`.

These migrations are out of scope; the embodiment MR ships only
the embodiment verbs using the new field. The other consolidations
land opportunistically as touched.

**Subsystem doc update**: `docs/subsystems/command-spec.md` adds
the `defaultArg` field to the authoring guide. `command-routing.md`
and `command-parsing.md` get short notes on where in the dispatch
pipeline the substitution happens (most natural site is the parse-
to-bind transition, before any field validators run).

**Test acceptance** for the framework feature (lives in
`packages/server/src/mud/__tests__/`):

- Field with `defaultArg`, no typed arg → controller receives the
  resolved default.
- Field with `defaultArg`, typed arg present → controller receives
  the typed arg; default is ignored.
- `defaultArg` whose MQL resolution fails → the field's standard
  failure surface fires; default is not silently treated as null.
- Lint error: declaring `required: true` and `defaultArg`
  together → schema-validation failure at YAML-load time.

**Purely additive**: the `defaultArg` field is optional; YAML
views that don't declare it behave exactly as before (controller
sees a null/undefined field for absent args). No shim, no
migration of existing YAML — just a new optional field.

> **Scope flag for plan review**: the embodiment MR now ships
> a small but cross-cutting command-framework change. The planner
> should sequence this near the front of the build order (before
> the embodiment verbs) so the verbs can adopt it directly rather
> than ship with the controller-side default and migrate later.

## 12. Verb suite

Single-token verbs only. Argument arity carries intent.

| Verb | Arg shape | Behavior |
|---|---|---|
| `wear <X>` | `X` is `Wearable` in inventory | Resolve claim slots vs the actor's body plan; SlotApi.occupyAll. Failure: which slot is blocked + by what. |
| `wear <X> <slot>` | optional slot override | Author / admin disambiguator when an item has multiple legal slot sets. |
| `remove <X>` | `X` is currently worn | SlotApi.vacateAll on the slots `X` claims. |
| `wield <X>` | `X` is `Wieldable` in inventory | analogous to wear. |
| `unwield <X>` | `X` is currently wielded | analogous to remove. |
| `sit` | no arg → `defaultArg: 'ground'` (§ 11) → MQL resolves `ground` → floor Adornment | Vacate any posture-bearing slot the actor occupies; `SlotApi.occupy(actor, floor.ground:1)`; set `actor.posture` to `Postures.Sit`. If the Location has no floor (void), the framework's MQL resolution surfaces "you can't sit on the ground here." Single controller path with the with-arg form below — no special-case branch. |
| `sit <X>` | `X` is `Postured`, accepts `Postures.Sit` | Vacate any posture-bearing slot the actor currently occupies; find first slot of `X` accepting `Postures.Sit`; `SlotApi.occupy`; set posture. `X` may be a Stuff or a Detail (e.g., `sit seat`, `sit floor` — § 5.5). The wall-bench disambiguation case: `sit` defaults to ground, `sit bench` explicitly targets the bench. |
| `lie` | no arg → `defaultArg: 'ground'` | Same shape as `sit` no-arg, posture `Postures.Lie`. |
| `lie <X>` | `X` is `Postured`, accepts `Postures.Lie` | analogous to `sit <X>`. |
| `stand` | no arg | Vacate any posture-bearing slot the actor occupies; set `actor.posture` to `Postures.Stand`. By convention does NOT auto-occupy the floor — standing is the substrate's "free" posture, even on a floored Location. (`stand floor` is the explicit form when the slot itself matters; `stand` no-arg is just the posture flip.) |
| `stand <X>` | `X` is `Postured`, accepts `Postures.Stand` | analogous to `sit <X>` (you stand *on* X). |
| `mount <X>` | `X` is `Mountable` | Vacate any posture-bearing slot the actor occupies; `SlotApi.occupy(actor, X.mountSlot)`; set `actor.posture` to `Postures.Mounted`. `X` may be a Stuff or a Detail (e.g., `mount horse`, `mount back` — § 5.5). |
| `dismount` | no arg | Vacate the mount slot the actor occupies; posture → `Postures.Stand`. (Doesn't auto-occupy the floor — same convention as `stand` no-arg.) |
| `kneel` | no arg → `defaultArg: 'ground'` | Same shape as `sit` no-arg, posture `Postures.Kneel`. (No slot-target form in v1; "kneel before X" is content-team future work.) |

Note the asymmetry: `sit` / `lie` / `kneel` no-arg occupy the
floor slot (so they route through `SlotApi`); `stand` no-arg
does not (it's the implicit "I'm just standing" posture, no slot
needed). This matches authoring intuition — sitting on the
ground is a positional choice; standing is the default.

**Atomicity invariant for posture verbs**: every posture-changing
verb does its work in two atomic steps — vacate any current
posture-bearing slot, then either occupy a new one (with-arg
form) or just set the posture string (no-arg form). The actor
never ends up "still in the chair but with `posture === Sit`
in mid-air" or vice versa.

The slot-transfer side of this invariant (vacate-then-occupy
with rollback if the occupy fails) is centralized in
`SlotApi.transferOccupancy(candidate, from, to)` (§ 9). Posture
controllers don't write their own try/catch — they query the
actor's current posture-bearing slot via
`actor.getOccupiedHost()` (filtered for posture-bearing per the
§ 7.1 definition), then call `transferOccupancy` with that as
`from`. If the actor has no current posture-bearing occupancy,
they pass `from: null`. Rollback semantics live once, in the
helper.

For no-arg `stand` and `dismount` (the slot-less posture flips,
per § 12 asymmetry), there's no occupy phase — they call
`SlotApi.vacate*` directly and set the posture, no transfer
needed.

**Eligibility — the no-arg forms aren't unconditional.** Verb-
level validators gate them. v1 examples:

- `sit` / `lie` / `kneel` no-arg: `requires-actor-not-mounted`
  (you can't drop to the ground while mounted; dismount first).
- All posture verbs: future location-aware validators (lava,
  midair, swimming) plug in here, not in the substrate.

All controllers import `Postures` from `lib/posture/postures.ts`.
Cross-controller eligibility validators (e.g., `walk` rejecting
`Postures.Mounted`) import the same module — no per-controller
static surface, no registry, no bootstrap order.

Aliases via `AliasMixin` ship later (no controller proliferation).

**Validators per verb** (each is a small `CommandValidator`):

- `wear` / `wield`: `requires-target-in-inventory`,
  `requires-bodyplan-eligible`, `requires-slots-free` (or vacates
  per a configurable policy — v1 fails if occupied).
- `remove` / `unwield`: `requires-target-currently-occupying`.
- `sit` / `lie` / `stand <X>`: `requires-target-postured`,
  `requires-posture-accepted`, `requires-slot-free`.
- `mount`: `requires-target-mountable`, `requires-mount-slot-free`,
  `requires-actor-not-already-mounted`.
- `dismount`: `requires-actor-mounted`.
- `stand` (no arg): `requires-actor-not-already-standing` (idempotent
  no-op if already standing — verb still succeeds with no message).

## 13. `Mixins` registry additions

Add to `lib/mixin.ts`:

```ts
export const Mixins = {
  // ... existing entries
  Slotted: 'SlottedMixin',
  Slottable: 'SlottableMixin',
  Wearable: 'WearableMixin',
  Wieldable: 'WieldableMixin',
  Postured: 'PosturedMixin',
  Mountable: 'MountableMixin',
  Drivable: 'DrivableMixin',
};
```

Add `MixinApi.isSlotted`, `isSlottable`, `isWearable`, `isWieldable`,
`isPostured`, `isMountable`, `isDrivable` predicates.

## 14. Persistence

**v1's persistence story is intentionally narrow.** Slot occupancy
(`slots`) is **runtime-only** — not persisted. The world re-inits
on hydrate; NPCs re-clone, chairs re-clone, avatars come up
unworn-and-unwielded. There are no stable cross-reboot references
and no orphan policy needed. There is no auto-population of slots
at init (no `defaultOccupants`); structural attachments
(seatbelts, fixtures) go through Adornable; item spawning is a
separate subsystem deferred to a future MR (§ 19).

Persistent fields (authoring data only):

- `staticSlots: SlotSpec[]` — slot universe declarations on
  static-slot hosts. Default Hydrator. `SlotSpec` is a flat
  `{ name: string; accepts: string; capacity?: number; postures?: string[]; userFacingDetail?: string }`
  — round-trips through the default reflective bracket-assign
  without ceremony.
- `slotClaims: Record<bodyPlanPath, string[]>` (Wearable /
  Wieldable) — default-marshaller-friendly.
- `mountSlot`, `controllerSlot` — strings, default Hydrator.
- Setter validation (§ 5.1): `setStaticSlots` validates each
  spec's `accepts` against the `Mixins` registry. Bad `accepts`
  values throw at hydrate-time setter call, naming the offending
  spec. `postures` entries are NOT validated by the substrate —
  see § 5.1 / § 7.1 for the rationale (no registry; no
  vocabulary opinion in the substrate).

**No custom marshallers required.** All persistent fields are
flat shapes (primitives, string-keyed records, arrays of plain
objects). The default Hydrator's reflective bracket-assign
handles every case. The one shape that *would* have needed a
marshaller — `Infinity`-valued capacity (doesn't round-trip
through JSON/BSON) — is handled by the **`UNBOUNDED_CAPACITY`
sentinel constant** (`Number.MAX_SAFE_INTEGER`, exported from
`lib/slot/Slotted.ts`). Floor and any future unbounded slots use
the constant; persistence and `isSlotFull` math both stay
trivial. Authors writing seed YAML for unbounded slots reference
the constant in code; YAML literal authors who want unbounded
write `capacity: 9007199254740991` (or the equivalent) and the
loader normalizes — though in practice unbounded-capacity
authoring is rare enough that it'll all be in templates that
extend the default-floor (where the constant is already set).

Floor's slot literally:

```ts
{
  name: 'ground:1',
  accepts: 'SlottableMixin',
  capacity: UNBOUNDED_CAPACITY,  // not Infinity — JSON/BSON-safe
  postures: ['sit', 'lie', 'kneel', 'stand'],
  userFacingDetail: 'floor',
}
```

Runtime-only fields:

- `slots: Map<string, Set<Stuff & Slottable>>` — direct refs;
  starts empty on clone / hydrate; populated by player verbs and
  by any post-init `SlotApi.occupy` calls a host's clone hook
  chooses to make. Not in `persistentFields`. Mid-session
  destruct cleanup via `Slottable.onDestruct` (§ 5.2).

**Future work — cross-reboot occupancy.** The slate's locker /
stash use case ("log off with gear stashed; log back in and pull
it out") needs a different mechanism, not slot persistence. Two
shapes are likely:

1. **Stash-side serialized snapshot.** A Locker (or any
   persistent container that wants to remember its contents)
   serializes the *unslotted* item — template path plus any
   per-instance overrides — and stores that on its own persistent
   record. On retrieval, re-clone from the template and apply
   overrides. The slot framework never persists references;
   stash containers persist content snapshots. Constraint
   surfaces in the verb layer: `stash` requires the item to be
   unslotted (no worn/wielded items), so the slot relationship
   is never the thing being preserved.
2. **Singleton-template disambiguation for multi-clone
   identity.** When cross-reboot identity for non-singleton
   instances becomes necessary (e.g., the wolf you specifically
   tamed last session), an owning singleton — typically a
   spawner or a player's HomeZone — remembers its pool of
   clones by index/name, and rehydrate goes through the
   singleton to restore identity. Today the singleton's path is
   the only stable identifier; multi-clone identity routes
   through it. Slot occupancy is never the carrier.

Both are deferred. The embodiment substrate doesn't preclude
them; the slot map is purely runtime, so a future "post-init
restore from snapshot" pass can populate it however it wants.

**Migration scripts** (one-shot, in `packages/server/scripts/`):

- `migrate-bodyplan-slots.ts` — translates `wornSlots` / `heldSlots`
  on existing BodyPlan documents into the unified `slots` shape,
  with `accepts: 'WearableMixin'` / `accepts: 'WieldableMixin'`
  per the source list.
- `migrate-adornable-fixtures.ts` — translates Adornable hosts'
  fixture sets into a runtime-only slot keying with synthetic
  slot names. (No persisted slot data; the migration is purely
  about preserving the fixture-set membership in the new
  Adornable shape's persistent storage — the
  `fixtures` Set or its successor field, NOT the runtime
  `slots` map.)
- `migrate-location-floors.ts` — adds the default floor Adornment
  (§ 7.5) to existing Location templates. Idempotent: if a
  Location's adornments already include a `floor` entry, skip.
  If the Location's seed YAML carries a top-level
  `noDefaultFloor: true` marker, skip. Otherwise insert
  `{ extends: '/idea/surface/default-floor' }` into its adornments.

  **Pre-migration audit pass (required)**: the script ships with
  a `--dry-run` mode that emits the list of every Location it
  *would* touch. Humans pre-mark voids / underwater / midair
  Locations with `noDefaultFloor: true` in seed YAML before the
  real migration runs. The marker is also a forward-compatible
  signal — future authoring tooling that auto-adds floors (when
  the Location taxonomy emerges and a `Floored` mixin lands)
  reads the same marker to honor the opt-out.

> **Scope flag for plan review**: the floor migration touches
> every existing Location record. The planner should propose a
> dry-run mode that lists which Locations would receive a default
> floor, so humans can audit voids and other opt-outs before the
> migration runs for real.

## 15. Test acceptance

The MR ships with the following test coverage. (Tests colocated
in `__tests__/` siblings per project convention.)

**`lib/slot/__tests__/`**:

- `Slotted.test.ts` — slot universe (static + dynamic), occupy /
  vacate / canOccupy invariants, mutation invariants (full-slot
  rejection via `isSlotFull`, unknown-slot rejection,
  type-mismatch rejection, double-occupy-by-same-candidate
  rejection), hydrate produces empty `slots` map (runtime-only
  invariant). **Capacity behavior**: default capacity-1 slot
  rejects second occupant; capacity-N slot accepts up to N then
  rejects; `capacity: UNBOUNDED_CAPACITY` accepts arbitrarily many (and round-trips through JSON/BSON, unlike literal `Infinity`);
  `getOccupant` throws on multi-occupant slots, `getOccupants`
  returns the full set, `getOccupantCount` matches set size,
  `vacate(slot, candidate)` removes only the named candidate,
  `vacateSole` throws on multi-occupant slots.
- `Slottable.test.ts` — marker presence, MixinApi predicate,
  `getOccupiedHost` returns the single host or null, throws when
  the candidate is on multiple hosts, delegates correctly to
  SlotApi.findOccupiedHost. `onDestruct` vacates the candidate
  from every slot across every host it occupies before chaining
  to `super.onDestruct()`.

**`lib/embodiment/__tests__/`**:

- `Wearable.test.ts` — per-body-plan claim resolution, multi-slot
  atomicity, ineligible-body-plan rejection, slotClaims round-trip.
- `Wieldable.test.ts` — analogous, plus the two-handed (multi-slot
  on a single body plan) case.

**`lib/posture/__tests__/`**:

- `Postured.test.ts` — multi-posture slot acceptance,
  posture-attribute lookup, `getSlotsAcceptingPosture` returns the
  right slots for each `Postures.*` constant.
- `postures.test.ts` — the constants module is frozen
  (`Object.isFrozen(Postures)` true), v1 vocabulary present
  (`Postures.Stand`, `.Sit`, `.Lie`, `.Kneel`, `.Mounted`), the
  derived `Posture` type narrows correctly.
- `Floor.test.ts` — default-floor template instantiates with the
  expected slot + Detail (including `capacity: UNBOUNDED_CAPACITY`); `sit
  floor` / `sit ground` / `sit dirt` all resolve to the same
  slot via § 5.5; per-Location override (lava-chamber `postures:
  ['stand']` only) rejects sit with the right surface;
  void-Location case (no floor Adornment) surfaces "nothing here
  to sit on"; floor's unbounded-capacity slot accepts multiple
  actors simultaneously (10 avatars on the same `ground:1`,
  each with `getOccupiedHost()` returning the same floor
  Adornment).

**`lib/conveyance/__tests__/`**:

- `Mountable.test.ts` — mount slot occupy / vacate, isMounted /
  getMountOccupant.
- `Drivable.test.ts` — controller slot resolution exercised
  through the public surface (`getDriver` / `isDriven`); horse-
  shaped case (default protected `getControllerSlot` returns
  `{ host: this, name: this.controllerSlot }`, observed via
  `getDriver`); cross-Stuff override case (`SeatedDrivableMixin`
  overrides the protected method and returns a SlotRef pointing
  at a Containable seat — observed via the same public methods);
  `getDriver` / `isDriven` work uniformly through the override;
  missing-driver-seat case throws with a clear message. Tests should not reach for the protected method
  directly (that would be the "tests are like other Stuff" rule
  per CLAUDE.md); they exercise the public surface.

**`api/__tests__/`**:

- `slot.test.ts` — multi-slot transactional occupyAll (rollback
  on partial failure), findOpenSlotFor, findOccupiedSlots,
  walkOccupants for nested slot trees, `findOccupiedHost`
  returns null when not slotted, returns single host when in
  one slot (any capacity), throws when in slots on multiple
  hosts. `resolveSlot` Detail-keyword pathway (§ 5.5): host-
  resolution finds slot by `accepts`; Detail-resolution finds
  slot by `userFacingDetail`; collision (two slots same
  `userFacingDetail`) caught by setter; Detail-without-matching-
  slot fails with appropriate surface. `transferOccupancy` cases:
  (1) `from = null` is a plain occupy; (2) `from` non-null does
  vacate-then-occupy successfully; (3) `to`-side occupy failure
  re-occupies `from` and rethrows (rollback); (4) `from` and
  `to` referencing the same slot is a no-op.

**Cross-cutting integration tests**:

- `lib/spatial/__tests__/Mobile.test.ts` — additions for conveyance
  ripple (rider in mount:1 ripples; saddle in worn[back] +
  rider in saddle.mount:1 both ripple recursively; cycle guard
  triggers at depth 16).
- `lib/species/__tests__/BodyPlan.test.ts` — additions for the
  unified `slots` shape: round-trip persistence, `accepts` strings
  on each spec validate against `Mixins`, slot ordering preserved
  hydrate-to-getSlots. Existing tests that referenced `wornSlots` /
  `heldSlots` are migrated to read from `getSlots()` (no shim
  derivation to test).
- `lib/boundary/__tests__/Adornable.test.ts` — augmented to verify
  the retrofit preserves the `addFixture` / `removeFixture` /
  `getFixtures` / `getFixtureBoundaries` / `getFixtureLightSources`
  surfaces; light-propagation regression test (Window adornment
  on a Door anchor still transmits light correctly). Synthetic-
  name counter: anonymous fixtures get `fixture:1`, `fixture:2`,
  …; explicit `slotName` overrides; the counter resets on
  re-clone (no persistence of the counter — slot names are
  runtime-only).
- **Command-framework tests** (`packages/server/src/mud/__tests__/`)
  for the § 12 `defaultArg` extension:
  - Field with `defaultArg`, no typed arg → controller receives
    the resolved default (string substituted, then validators run).
  - Field with `defaultArg`, typed arg present → controller
    receives the typed arg; default ignored.
  - `defaultArg` whose MQL resolution fails → standard no-match
    surface; default isn't silently treated as null.
  - Schema lint: declaring `required: true` and `defaultArg`
    together → schema-validation failure at YAML-load.
  - Additive-feature regression: YAML views without `defaultArg`
    behave unchanged (controllers see null/undefined for absent
    args). Confirms the new field is purely optional.

**Verb tests** (`mud/__tests__/` or each controller's siblings):

- One spec file per verb pair (wear/remove, wield/unwield,
  sit/lie/stand, mount/dismount). Cover: happy path, every named
  validator's failure path, message rendering.

**Acceptance vignettes** (end-to-end stories the test suite
exercises):

1. Avatar wears boots (claims `[foot:left, foot:right]` on biped),
   removes them, slots return to free.
2. Avatar wields a longbow (claims `[hand:left, hand:right]`),
   tries to wield a dagger while holding the longbow → rejected
   with "your hands are full" surface; unwields longbow, wields
   dagger.
3. Avatar sits on a chair (`Postured` host, single `sit:1` slot,
   accepts `['sit']`); posture flips to `'sit'`; `stand` vacates
   the chair, posture → `'stand'`.
4. Bed accepts both `'sit'` and `'lie'` on the same `lie:1` slot;
   `sit bed` and `lie bed` both work; the slot is exclusive
   (second avatar can't join).
5. Avatar mounts a horse; `dismount`; horse moves with rider in
   mount slot (conveyance ripple).
6. Avatar mounts a saddled horse → rider lands in
   `saddle.mount:1`, not in `horse.back:1` (the saddle is wearing
   the `back:1` slot; the rider sits on the saddle's `mount:1`).
   Horse moves; rider ripples through both slot links.
7. **Ground postures and the atomicity invariant.** Avatar in a
   default-floor Location: `sit` (no-arg) → framework's
   `defaultArg: 'ground'` (§ 11) expands to `sit ground` →
   resolves to floor Adornment → occupies floor's `ground:1`
   slot, posture → `Postures.Sit`. `stand` (no-arg) vacates the
   floor slot, posture → `Postures.Stand`. Then: avatar
   `sit chair` (chair's `sit:1` occupied), then `sit` no-arg →
   chair's `sit:1` is vacated atomically before the floor slot
   is occupied (avatar ends up on the floor; chair empty).
   Reverse: `lie bed` with bed accepting both `lie` and `sit`;
   then `sit` no-arg vacates the bed and lands on the floor.
   Validates the "vacate any current posture-bearing slot then
   occupy the new one" atomicity on every posture verb.
8. **Posture eligibility — mounted blocks ground postures.**
   Avatar `mount horse`; then `sit` no-arg → rejected by the
   `requires-actor-not-mounted` validator with a "dismount first"
   surface (the validator runs after the framework substitutes
   `'ground'` but before the slot occupation). `dismount`; `sit`
   no-arg now succeeds.
9. **Detail-keyword slot targeting.** Avatar `mount horse`
   succeeds and lands in the horse's mount slot via host-resolution.
   Avatar `dismount`. Then `mount back` resolves `back` as the
   horse's Detail keyword and lands in the same `back:1` slot via
   the § 5.5 pathway. `examine back` returns the Detail's text,
   confirming the keyword is the same target. `mount mane`
   (Detail exists but no slot points at it) fails with
   "you can't mount the mane."
10. **Floor sit and the ground-targeting pathway.** Avatar in a
    default-floor Location: `sit` no-arg → occupies the floor
    Adornment's `ground:1` slot, posture `Postures.Sit`,
    `actor.getOccupiedHost()` returns the floor Adornment.
    `examine floor` returns the floor Adornment's Detail. `stand`
    no-arg vacates the floor slot, posture `Postures.Stand`.
    Avatar moved to a void Location: `sit` no-arg → fails with
    "there's nothing here to sit on" (no floor Adornment).
11. **Floor refuses postures.** Avatar in a lava-chamber Location
    whose floor Adornment authors `postures: ['stand']` only:
    `sit` no-arg → fails with "you can't sit on lava." `stand`
    no-arg succeeds (slot-less posture flip per the asymmetry in
    § 12). `lie` no-arg → fails likewise.
12. **Multi-occupant slots.** Three avatars `sit bench` on a
    bench with `capacity: 4`; all three in the same `sit:1`
    slot (`getOccupants('sit:1')` size = 3). A fourth `sit
    bench` succeeds. A fifth → rejected by the full-slot check
    with "the bench is full." Each occupant's `getOccupiedHost()`
    returns the bench. One avatar `stand`s; the bench's slot has
    three occupants (verified by name); the standing avatar's
    `getOccupiedHost()` returns null.
13. **Inverse lookup symmetry.** Avatar `sit chair` →
    `getOccupiedHost()` returns chair. `stand`; `mount horse` →
    `getOccupiedHost()` returns horse. `dismount`; `sit` no-arg
    in a default-floor Location → `getOccupiedHost()` returns
    the floor Adornment. `stand` no-arg → returns null
    (slot-less posture flip per § 12). The lookup answers "what
    am I sitting on?" uniformly across chair / mount / floor.
14. **No-floor environments fail honestly across kinds.** Three
    unfloored Locations exercised in turn: an open-water column
    (a `down` Exit but no floor Adornment), an open-vacuum
    microgravity zone, and a quicksand clearing. In each, `sit`
    no-arg → framework's `defaultArg: 'ground'` expands to
    `sit ground` → MQL no-match → "you can't sit on the ground
    here." Same surface across all three; the substrate doesn't
    distinguish "no ground because vacuum" from "no ground
    because liquid" from "no ground because quicksand" — that's
    the author's content choice. `sit floor` and `sit ground`
    (typed-arg forms) fail identically. `stand` no-arg succeeds
    in all three (slot-less posture flip).
15. **Floored variants of unfloored environments.** Same three
    environments, but each authored WITH a floor Adornment: a
    shallow seabed (sand floor), a magnetic-boots space station
    deck (metal-grate floor), a stone path through the swamp
    (bypassing the quicksand). `sit` no-arg works in each;
    `sit floor` / `sit ground` resolves; `getOccupiedHost()`
    returns the floor. Confirms the substrate doesn't tie floor
    presence to gravity / fluid dynamics — purely an authoring
    choice per Location.
16. **Cross-Stuff Drivable — car flow (explicit-sit UX).** Car
    composed `Vessel + ExitableVessel + Adornable +
    SeatedDrivableMixin(DrivableMixin(...))`. Contents: two Seats
    with `role: 'driver'` and `role: 'passenger'`. Adornments:
    two Doors. Avatar `enter car` → standing in car's contents,
    not in any seat. Avatar `sit driver-seat` → driver seat's
    `sit:1` occupied; `getOccupiedHost()` returns driver seat;
    `car.getDriver()` returns avatar (the override resolves
    `driver-seat` and reads its slot). `start car` validator
    `requires-sitter-in-driver-role` passes. A second avatar
    enters via the passenger door, `sit passenger-seat` →
    passenger seat occupied; `car.getDriver()` still returns
    the first avatar (override only checks driver-role seat).
17. **Cross-Stuff Drivable — driver-on-box variant.** Carriage
    composed similarly but the driver position is an Adornment
    on the carriage's exterior (not a Containable). Override
    targets the Adornment's `sit:1`. `getDriver()` still works
    uniformly. Demonstrates the pattern covers driver-external
    seating without substrate change.
18. **Author-opt-in auto-sit via forceCommand.** Driver door
    subclass overrides its post-traversal hook to call
    `forceCommand(traveler, 'sit driver-seat')`. Player types
    `enter car` through the driver door → automatically lands in
    the driver seat (immersion path). Player types `enter car`
    through the passenger door (whose subclass fires
    `sit passenger-seat`) → automatically lands in the passenger
    seat. Validates the "ad hoc per-door hook" approach —
    immersion available without substrate generalization.

## 16. Compositions to verify

Sanity check that the substrate composes for the slate's sample
inhabitants:

- **Avatar (human)** — composes `Slotted + Slottable` (and the
  organism stack). Body slots from `biped`. ✓
- **Cloth tunic** — `Thing + Visible + Portable + Wearable`,
  claims `[torso]` on biped. ✓
- **Iron longsword** — `Thing + Visible + Portable + Wieldable`,
  two-handed via `[hand:left, hand:right]`. ✓
- **Wooden chair** — `Thing + Visible + Postured` with
  `staticSlots: [{ name: 'sit:1', accepts: 'SlottableMixin',
  postures: ['sit'] }]`. ✓
- **Four-poster bed** — `Thing + Visible + Postured` with
  `[{ name: 'lie:1', accepts: 'SlottableMixin', postures: ['lie',
  'sit'] }]`. ✓
- **Horse (NPC + ridable)** — `OrganismMixin + Slotted (body-plan-
  driven via `BodyPlanSlotsMixin`) + Mountable + Drivable`.
  `mountSlot === controllerSlot === 'back:1'` (the slot supplied
  by the quadruped body plan per § 8). The horse takes the
  default `DrivableMixin` (no `SeatedDrivableMixin` override —
  controller slot is on the host itself). ✓
- **Saddle** — `Thing + Visible + Portable + Wearable + Mountable
  + Drivable + Slotted (static)`. Wearable claim
  `{ '/idea/race/bodyplan/quadruped': ['back:1'] }` (matching the
  quadruped body plan's `back:1` slot name; colon-positional per
  decision #5). Static slot `mount:1`. ✓
- **Bicycle** — `Thing + Visible + Vessel + Mountable + Drivable
  + Slotted (static)`. Single slot `'seat:1'` (`accepts: 'SlottableMixin'`).
  Default `DrivableMixin.controllerSlot = 'seat:1'`; no override
  needed. Mountable via the same slot. ✓
- **Two-seater car** — `Vessel + ExitableVessel + Adornable +
  SeatedDrivableMixin(DrivableMixin(...))`. Contents include two
  Seats (`Postured + Adornable`) with `role: 'driver'` and
  `role: 'passenger'`. The car's adornments include two Doors
  (driver-side and passenger-side). Each Seat's adornments
  include its own Seatbelt — authored explicitly in seed YAML
  via the Adornable subsystem (post-retrofit), not via any
  auto-spawning slot mechanism. The Drivable override finds the
  driver-role seat and returns its `sit:1` as the controller
  slot. ✓
- **Carriage with driver-on-box** — Like the car but the driver
  position is an Adornment on the carriage's exterior surface
  (not a Containable seat inside). The override targets the
  Adornment's `sit:1`. The carriage's contents are passenger
  seats only. ✓ (variant of the override)
- **Tank, helicopter, sailboat with crew** — out of scope
  (multi-controller; decision #14).
- **Default floor** (`/idea/surface/default-floor`) —
  `Adornment + Postured`. One slot:
  `{ name: 'ground:1', accepts: 'SlottableMixin', capacity: UNBOUNDED_CAPACITY, postures: ['sit', 'lie', 'kneel', 'stand'], userFacingDetail: 'floor' }`.
  Detail keywords: `floor`, `ground`, `dirt`, `surface`. Authored
  as an Adornment per-Location-template — most rooms include
  `floor: { extends: '/idea/surface/default-floor' }` in their
  `adornments:` list. v1 ships no class-level default; voids and
  unsittable Locations simply omit the floor adornment (and carry
  `noDefaultFloor: true` to suppress the migration script). When
  the Location taxonomy lands, the default-floor convention can
  promote to a base-class composition. ✓
- **Marble hall floor** — extends default-floor; overrides Detail
  text and (optionally) Detail keyword aliases. ✓
- **Lava chamber floor** — extends default-floor; overrides
  `staticSlots` to `postures: ['stand']` only. ✓
- **Wooden bench** — `Thing + Visible + Postured` with
  `staticSlots: [{ name: 'sit:1', accepts: 'SlottableMixin', capacity: 4, postures: ['sit'], userFacingDetail: 'seat' }]`.
  Four people share the bench. ✓
- **Queen bed** — `Thing + Visible + Postured` with
  `staticSlots: [{ name: 'lie:1', accepts: 'SlottableMixin', capacity: 2, postures: ['lie', 'sit'] }]`.
  Two-person capacity; default `sit:1` chair stays at capacity 1. ✓
- **Void Location** — no floor Adornment. `sit` no-arg returns
  the explicit "nothing here to sit on" surface. ✓

## 17. Build order within the MR

Sequenced for incremental landability:

1. **Command-framework `defaultArg` extension (§ 11)** — schema
   change to `command.schema.json`; YAML loader validation;
   substitution step in the dispatch pipeline; regression tests
   that confirm existing (defaultArg-less) YAML behaves
   unchanged. Lands first so the embodiment verbs adopt it
   directly in step 5 — no controller-side default, no migration.
2. **Slot substrate** — `Slotted`, `Slottable`, `SlotApi`,
   `Mixins` registry entries, predicates. `SlotApi.resolveSlot`
   includes the Detail-keyword resolution from § 5.5. Tests pass.
3. **BodyPlan generalization** — unified `slots: SlotSpec[]`;
   delete `wornSlots` / `heldSlots` fields and `getWornSlots()` /
   `getHeldSlots()` methods outright; migrate every existing call
   site to `getSlots()` (no shims); migration script for
   persisted documents. Existing BodyPlan tests updated to read
   the new shape. New BodyPlan tests pass.
4. **Wearable + Wieldable** — body-side mixins. Verb pairs
   (`wear` / `remove` / `wield` / `unwield`). Tests pass.
5. **Postured** — world-side furniture. Verbs (`sit` / `lie` /
   `stand` / `kneel`) ship in their final shape from day one:
   `defaultArg: 'ground'` declared, no controller-side fallback
   to slot-less flip. At this step the no-arg forms genuinely
   fail with MQL no-match (no floors yet); the with-target forms
   (`sit chair`, `lie bed`) work for the v1 furniture roster.
   `stand` no-arg works (it's intrinsically slot-less). Tests
   cover the working surfaces; the no-arg forms become testable
   in step 8 when floors land. No interim shim behavior.
6. **Mountable + Drivable** — conveyance mixins. Verbs (`mount`
   / `dismount`). Conveyance ripple in `Mobile.traverse`.
   `mount back` (Detail-keyword targeting) works via § 5.5.
   Tests pass (including the saddle vignette).
7. **Adornable retrofit** — port to Slotted with synthetic slot
   names. API surface preserved. Migration script for existing
   Adornable documents. Light + Boundary tests stay green.
8. **Floor Adornments + ground-targeting** — default-floor
   template at `/idea/surface/default-floor`; the per-Location
   override pattern; the multi-capacity `ground:1` slot
   (`capacity: UNBOUNDED_CAPACITY`). The `sit` / `lie` / `kneel` no-arg
   forms now resolve via the framework's `defaultArg: 'ground'`
   to the floor Adornment. `migrate-location-floors.ts` migration
   with dry-run. Per-Location seed updates for voids that need to
   opt out. Tests pass for `sit floor` / `sit ground` / `sit`
   no-arg vignettes; void Location surfaces "nothing to sit on."
9. **Composition smoke** — sample-composition tests (§ 16) all
   pass. v1 acceptance roster (per race.md) cleanly composes.

Each step is its own commit. The MR can be split at any boundary
if review wants smaller landings — most natural cuts are after
step 1 (`defaultArg` extension lands on its own as a small
framework PR), step 4 (substrate + body-side), step 6 (everything
except the Adornable retrofit), and step 7 (everything except
floors).

## 18. Documentation deliverables

Authored alongside code; documentation sweep at MR end:

- **New subsystem docs** under `docs/subsystems/`:
  - `slot.md` — substrate (Slotted, Slottable, SlotApi,
    `accepts` + `fitsSlot`, capacity, runtime-only slot map,
    `Slottable.onDestruct` cleanup, **Detail-targeted slot
    resolution**).
  - `embodiment.md` — body-side affordances (Wearable, Wieldable,
    body-plan claim shape, verb pairs).
  - `posture.md` — Postured + Postures constants module + verb
    pairs + the **floor-Adornment ground-targeting model**
    (default-floor template, per-Location override, void opt-out).
  - `conveyance.md` — Mountable, Drivable, conveyance ripple,
    saddle interpolation, what-v1-doesn't-cover.
- **Updates to existing subsystem docs**:
  - `race.md` — BodyPlan section reshaped for unified `slots`.
  - `boundary.md` — Adornable section updated for the Slotted
    underpinning; surface API unchanged. Brief note that floors
    are Adornments and trapdoors-on-floors compose the existing
    Adornment-of-Adornable pattern (no Boundary-substrate change).
  - `spatial.md` — Mobile.traverse conveyance-ripple addition;
    Location's default-floor authoring convention noted.
  - `command-spec.md` — `defaultArg` field added to the
    authoring guide (§ 11 of this doc); semantics, the
    `required: false` implication, MQL-resolution-failure
    behavior.
  - `command-routing.md` and `command-parsing.md` — short notes
    on where in the dispatch pipeline `defaultArg` substitution
    happens (most natural site is the parse-to-bind transition,
    before any field validators run).
- **CLAUDE.md**:
  - Documentation map entries for the four new subsystem docs.
  - Module Categories table — no new categories (every new file
    fits an existing category).
- **Antipatterns / Inter-Stuff Contract**:
  - If a new "go through Slotted" pattern emerges (e.g., don't
    reach into `slots` directly from another Stuff), add a row
    to the antipatterns table in CLAUDE.md.

## 19. Out-of-scope follow-ups (for downstream MRs)

Captured here so they don't get lost:

1. **Locomotion plurality slate → MR**: verb-as-mode `walk` /
   `climb` / `swim` / `fly`; body-plan mode intersection; the
   `Climbable` / `Swimmable` target mixins; `Mobile.traverse`
   evolves from `(exit, mode)` to consume the intersection.
   `ride X` and `drive X` ship in this slate's MR.
2. **Substrate-level "land in a slot on arrival" (auto-sit etc.)**
   — deferred indefinitely. Cars arrive with the explicit-sit UX
   (`enter car; sit driver-seat`); authors who want immersion
   ship a per-door `forceCommand`-firing hook (precedent:
   `MobileMixin` auto-look on traversal). Do not promote to a
   substrate field (`Exit.arrivalAnchor` or
   `Exit.postArrivalCommands`) until 3+ recurring patterns argue
   for lifting. Auto-look itself isn't an "exit hook" pattern
   either — it's attached to the mobile carrier, not the exit
   (which is why teleport auto-look works without an exit). Two
   existing precedents (auto-look + auto-sit) attach in different
   places; insufficient consistency to justify substrate
   generalization. **Multi-controller vehicles** (tank, helicopter,
   sailboat with crew) — `controllerSlot` → `controllerSlots:
   SlotRef[]` per decision #14 — also live here.
3. **DescribeApi v2** (recognition slate): inventory rendering
   against worn / wielded / contained sources.
4. **Edible diet check**: eater-side reader against
   `biologicalSource.tissueType`. Standalone MR.
5. **Multi-occupant slots**: rings on a tentacle, multi-rider
   mounts. Substrate field rename (`controllerSlot` →
   `controllerSlots`) when shared-control vehicles or pillion
   riders arrive.
   *(Note: multi-capacity per slot already shipped in v1 via
   `SlotSpec.capacity` — what's deferred here is plural*
   *controller-slot references for shared-control vehicles.)*
6. **Item spawning subsystem.** When and how items enter the
   world (monster starting equipment, treasure chests, drops,
   container restocking, world-reset deduplication) is a
   cross-cutting concern that touches economy, persistence,
   singleton-template disambiguation (§ 14 future-work), and
   cleanup of orphaned items. Embodiment substrate provides
   `SlotApi.occupy` — spawning consumes it. Design lives in its
   own slate. Until that lands, content authors who want a
   monster to start with a weapon wire it explicitly in the
   host's clone hook (or its `onAfterClone`-equivalent),
   accepting that re-clones produce fresh weapons (no
   deduplication, no economy management). Don't bake structural
   assumptions about auto-spawning into the embodiment substrate
   — this is why `defaultOccupants` was dropped during the
   requirements pass (decision #7).
7. **Polymorph / shapeshift**: body-plan swap and slot map
   reconciliation. Race subsystem follow-on.
8. **Hands-busy verb-level validators** (`unlock` while wielding):
   land alongside the verbs that need them, not centrally.
9. **Cross-reboot slot-state preservation (locker / stash)** —
   v1 ships zero cross-reboot slot persistence; the world re-inits
   on hydrate. The eventual mechanism is stash-side serialized
   snapshots of *unslotted* items, not persistent slot references.
   See § 14 "Future work" for the two shapes (stash-side snapshot
   + singleton-template disambiguation for multi-clone identity).
   Lands when a content-team use case asks for it (lockers,
   bank-vaults, between-session inventory durability).
10. **Material-aware surface validation** — v1 floors gate posture
    acceptance via the static `postures: [...]` list on the floor
    Adornment's slot (lava floor authors `postures: ['stand']`
    only). A future enrichment lets the host floor's material
    (per the Material substrate, race.md) drive acceptance
    dynamically — e.g., a fire-immune actor permitted to sit on
    lava, a water-walker permitted to stand on water surface.
    Touches `Postured.canOccupy` to consult both slot-spec
    postures and actor-vs-material compatibility.
11. **Floor / ceiling / wall Boundaries + traversable surfaces** —
    floors as one-sided Adornments are v1; if a future content
    use case wants a floor *as a Boundary* (with the room above
    and a "below" container), the Boundary substrate accommodates
    it. Trapdoors-as-Adornments-on-floors already work via the
    existing Adornable-of-Adornable composition. This is captured
    so the "floor is just an Adornment in v1" decision is
    explicitly upgrade-able.

---

## 20. What the planning agent should produce

A step-by-step implementation plan against this requirements doc.
Specifically:

- A directory-by-directory file list with new / modified / deleted
  status.
- For each new mixin: the composition order against existing
  base classes (Stuff → Idea → Thing → Container → …), the
  persistent field list, and the public method surface.
- The `Mobile.traverse` conveyance ripple as a concrete pseudocode
  block, showing where it sits in the existing traverse flow.
- The Adornable retrofit as a *sequenced* plan with a
  test-after-each-step checklist (this is the riskiest piece).
- Migration scripts (BodyPlan, Adornable) — where they live, how
  they're invoked, dry-run support.
- Test additions: list which existing test files grow assertions
  vs which are new.
- Documentation outline for each new `docs/subsystems/*.md`.
- Anything that requires inventing a new module category — flag
  per CLAUDE.md.

The plan should also flag any decision in this requirements doc
that the planner thinks is wrong. Better to surface in plan review
than after implementation.
