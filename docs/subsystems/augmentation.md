# Augmentation

The substrate for **acquired capability via slotted Stuff** — the
axis distinct from BodyPlan's **innate biological capability**. Mixin
composition expresses capability at build time; augment installation
toggles activation at runtime. A small uniform substrate carries the
union across the codebase.

Wave 1 ships the substrate (`AugmentMixin.confers`,
`MixinApi.getActiveMixins` / `isActive`, the `@RequiresActive`
decorator, the `_augmentGated` / `_grantsModalities` mixin
declarations), the cranial slot on biped/quadruped body plans, the
`AetherImplant` template, and the Avatar bootstrap that
installs it. Wave 2+ adds an install/remove procedure, other
augments, char-gen loadout selection, failure modes / power state,
and the generalized "contribute capability" surface beyond modalities
(verbs, motor, vital functions). See
[augmentation-slate.md](../slates/tails/augmentation-slate.md) for the
full roadmap.

## The mental model

- **Mixin composition is build-time semantics** — "this entity HAS
  this capability."
- **Augment installation is runtime semantics** — "the capability is
  currently ACTIVE."

For most mixins (Named, Container, Visible, Mobile, …) the two
collapse: a mixin that is composed is active. For
**augment-gated mixins** (v1: `AetherMixin`) the runtime activation
is conditional on an installed augment conferring it. The substrate
makes the gating transparent — callers see a single
`MixinApi.is<MixinName>` predicate that answers the active question
uniformly across both kinds.

## Substrate

### `AugmentMixin.confers()`

```ts
export interface Augment {
  confers(): readonly string[];  // mixin names this augment activates
}
```

Lives at `lib/augmentation/Augment.ts`. The augment names mixins; the
mixins describe their own grants. Decentralized declarations beat
coupled lists (per the
[antipattern](../antipatterns.md#dont-model-augments-by-listing-grants-directly)).

### Mixin self-declarations

Augment-gated mixins set a static flag plus per-kind grant fields:

```ts
export function AetherMixin<TBase>(Base: TBase) {
  return class AetherMixin extends Base {
    static _mixinName = 'AetherMixin';
    static _augmentGated = true;                            // opt-in
    static _grantsModalities = ['verbal-esp', 'emotive-esp']; // v1 read
    // _grantsLanguages, _grantsAttributeMasks, _grantsVitalFunctions,
    // _grantsSlots — reserved for their consumer subsystems; not
    // read in v1.
    // ...
  };
}
```

The grant shape is **open** — new grant kinds plug in as their
consumer subsystems land. v1 reads only `_grantsModalities` (consumed
by `PerceptionApi.sensorium`).

### `MixinApi.getActiveMixins` / `isActive`

The active-mixin substrate query:

```
active set = {
  m | hasMixin(stuff, m) AND (
    NOT m._augmentGated  OR
    exists augment in slots with m._mixinName in augment.confers()
  )
}
```

For un-gated mixins the behavior is identical to today's
`hasMixin`. For gated ones the predicate reflects the
augment-toggled reality — installing or removing an augment takes
effect on the next call (v1 is lazy / uncached; future polish caches
on slot-occupy / release).

The auto-generated `is<MixinName>` predicates (e.g. `isAether`) now
back onto `isActive`. **Uniform calling convention across all
predicates** — no branching on whether a mixin is gated; build-time-
only checks are an edge case using the low-level
`MixinApi.hasMixin(stuff.constructor, name)` directly.

### `@RequiresActive` decorator

Lives at `lib/security/RequiresActive.ts` next to `@CallSecurity` /
`@Final` / `@Unshadowable`. The decorator wraps a method so that at
call time it checks `MixinApi.isActive(this, mixinName)` and throws
`InactiveCapabilityError` when false:

```ts
export class InactiveCapabilityError extends Error { ... }

export function RequiresActive(mixinName: string): MethodDecorator {
  return function (_target, propertyKey, descriptor) {
    const original = descriptor.value;
    descriptor.value = function (this: Stuff, ...args) {
      if (!MixinApi.isActive(this, mixinName)) {
        throw new InactiveCapabilityError(mixinName, String(propertyKey));
      }
      return original.apply(this, args);
    };
    return descriptor;
  };
}
```

**Convention:** every public method on a mixin where
`_augmentGated === true` MUST use this guard. The verb-level
validator (`requiresVerbalESP`, future siblings) is the polite
early-catch at command dispatch time; `@RequiresActive` (or the
equivalent inlined check) is the late-catch for any direct caller
(test fixtures, internal subsystems, NPCs invoking methods
programmatically).

**Implementation note:** TS decorator syntax (TS1206) doesn't apply
inside the class expression returned from a class-factory mixin
under the current tsc. v1 inlines the same check at the top of
`AetherMixin.tell` as a workaround; the decorator stays the
canonical form for non-mixin call sites and may apply on
mixin-member methods when the toolchain lifts the restriction.

## The cranial slot

Biped and quadruped body plans declare a `cranial` slot of capacity
1 that accepts `SlottableMixin`:

```yaml
# seeds/lib/body-plans/biped.yaml
slots:
  # ...
  - { name: cranial, accepts: SlottableMixin }
```

The "implant" kind is documented prose on the slot's name, not a
new validator enum. Sessile body plans deliberately omit the
cranial slot (plants don't get implants in v1).

## `AetherImplant`

The Wave 1 implant template:

```ts
// lib/augmentation/AetherImplant.ts
export class AetherImplant
  extends AugmentMixin(SlottableMixin(TangibleMixin(Thing)))
{
  static readonly TEMPLATE_PATH = '/lib/augmentation/AetherImplant';

  override confers(): readonly string[] {
    return ['AetherMixin'];
  }
}
```

Hardened per the slate: no power state, no failure modes, no fuel.
Diegetically a small brass-and-silicon device. Every Avatar
installs one in the cranial slot via `Avatar.installDefaultLoadout`,
dispatched from `postRegister` during the clone cascade (runs once
per clone = once per session, since the runtime Avatar is destructed
at logout). Idempotent on a single clone: re-entry on an Avatar
already carrying anything cranial is a no-op.

## How other augment kinds plug in (substrate proof)

| Augment Stuff | `confers()` returns | Mixin's grants | Consumer subsystem |
|---|---|---|---|
| `AetherImplant` (v1) | `['AetherMixin']` | `_grantsModalities` | `PerceptionApi.sensorium` |
| `ThermalVisionImplant` (future) | `['ThermalVisionMixin']` | `_grantsModalities` | `PerceptionApi.sensorium` |
| `CyberArm` (future) | `['ProstheticArmMixin']` | `_grantsSlots`, `_grantsAttributeMasks` | `SlotApi`, `PropertiedMixin` |
| `TranslationChip` (future) | `['TranslationMixin']` | `_grantsLanguages` | `LanguageApi` (future) |
| `ArtificialHeart` (future) | `['HeartFunctionMixin']` | `_grantsVitalFunctions` | `VitalsApi` (future) |

v1 ships only the first row. The rest demonstrate that the same
substrate handles each augment kind — new augments need no
framework change, only:
1. a new Thing template composing `AugmentMixin` whose `confers`
   names the relevant mixin, and
2. that mixin declaring its grants.

## Wave 1 boundary

What ships:
- `AugmentMixin.confers()` + `_augmentGated` / `_grantsModalities`
  mixin declarations.
- `MixinApi.getActiveMixins` / `isActive` + predicate routing.
- `@RequiresActive` decorator (inlined equivalent in AetherMixin).
- Cranial slot on biped/quadruped body plans.
- AetherImplant template + Avatar.installDefaultLoadout (from
  postRegister) clone-time install.
- `requiresVerbalESP` + `requiresEmotiveESP` verb-level validators.
- Reception-gating integration (`Scene.modality` + filterMessage)
  drops `dm` frames for implant-less recipients.

What's reserved for Wave 2+ (see slate):
- Install / remove medical procedure (vitals tie).
- Other augments (translation, prosthetics, sensor packages, motor /
  cognitive).
- Char-gen loadout selection.
- Failure modes / power state / jamming / spoofing.
- Magic-flavor augments.
- The generalized "contribute capability" surface beyond modality
  grants (verbs, motor, vital functions).
- Methods / state CONFERRED by augments — today they live on the
  natively composed mixin, with the augment acting as the activation
  flag. Future refactor moves AetherMixin off Avatar and onto the
  implant Stuff itself (verb dispatch routes through the augment).

## Conventions

- Augment-gated mixins MUST guard every public method
  (`@RequiresActive('<MixinName>')` or inlined equivalent).
- Don't mint a parallel `isFooActive` predicate when adding an
  augment-gated mixin. `MixinApi.isFoo` already answers the active
  question uniformly.
- Build-time-only composition checks (rare) use
  `MixinApi.hasMixin(stuff.constructor, name)` directly.
- Don't model augments by listing their grants directly. An augment
  declares which mixins it confers; the mixin declares what each
  grant kind contributes.

## File layout

```
lib/augmentation/
├── Augment.ts                  AugmentMixin
├── AetherImplant.ts      Wave 1 implant template
└── __tests__/Augment.test.ts

lib/security/
├── RequiresActive.ts           Decorator + InactiveCapabilityError
└── __tests__/RequiresActive.test.ts

seeds/lib/augmentation/
└── AetherImplant.yaml    Hydrator-ready seed

api/mixin.ts                    getActiveMixins / isActive
                                + isAugment predicate
lib/mixin.ts                    Mixins.Augment registry constant
```

## Cross-references

- [augmentation-slate.md](../slates/tails/augmentation-slate.md) — the
  slate this build's Wave 1 graduates.
- [senses.md](./senses.md) — the perception substrate that consumes
  `_grantsModalities` via `PerceptionApi.sensorium`.
- [race.md](./race.md) — the cranial slot addition to biped /
  quadruped body plans.
- [slot.md](./slot.md) — the unified slot universe the cranial slot
  uses; no parallel `implantSlots` field.
- [messaging.md](./messaging.md) — `AetherMixin.tell` is the v1
  conferred capability; gated reception via per-frame
  `meta.modality`.
- [perception.md](./perception.md) — viewer-aware-query pattern;
  augment activations flow into the sensorium walk transparently.
- [antipatterns.md](../antipatterns.md) — augment-modeling
  antipatterns this substrate forbids.
