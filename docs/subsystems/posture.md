# Posture

`Postured` (host side) + `Posed` (actor side) + the `Postures`
constants vocabulary. Verb suite: `sit`, `lie`, `kneel`, `stand`.

## The Cast

| Name | Location | Role |
|---|---|---|
| `Postured` | `lib/slot/Postured.ts` | Host capability — exposes posture-bearing slots |
| `Posed` | `lib/character/Posed.ts` | Actor capability — carries `getPosture()` / `setPosture()` |
| `Postures` | `lib/slot/Postured.ts` | Frozen const-object: `Stand`, `Sit`, `Lie`, `Kneel`, `Mounted` |
| `Posture` | `lib/slot/Postured.ts` | Derived type union of `Postures` values |

`PosturedMixin` composes on `Stuff & Slotted`. `PosedMixin` composes
on `Stuff` and is composed by `Character`, so every PC and NPC
carries posture state uniformly.

## Posture-bearing slot

Definition: a slot is *posture-bearing* iff its `SlotSpec` declares
`postures: string[]` non-empty. Worn / held / mount / fixture slots
are NOT posture-bearing. Sit / lie / kneel / stand-on / floor slots
are.

```yaml
# Bed: lie:1 accepts both 'lie' and 'sit'
staticSlots:
  - { name: 'lie:1', accepts: 'SlottableMixin', postures: ['lie', 'sit'] }
```

## Posture vocabulary

```ts
export const Postures = Object.freeze({
  Stand:   'stand',
  Sit:     'sit',
  Lie:     'lie',
  Kneel:   'kneel',
  Mounted: 'mounted',
} as const);
```

Verbs and validators import the constant; slot YAML uses raw
strings. Substrate has no opinion on vocabulary — typo'd values
surface at use time when no verb's posture matches the slot's
`postures` entries. Mod-introduced postures ship their own
constants module.

## Floor adornments

Per § 7.5 of the embodiment requirements: floors are first-class
entities — `Adornment`s on the Location's `Adornable` surface,
composing `Postured`. v1 ships no class-level default; floor
presence is authored per-Location.

The default-floor template (`/idea/surface/default-floor`) declares
one slot:

```yaml
- name: 'ground:1'
  accepts: SlottableMixin
  capacity: 9007199254740991  # UNBOUNDED_CAPACITY (JSON-safe)
  postures: [sit, lie, kneel, stand]
  userFacingDetail: floor
```

Per-Location authoring:

```yaml
# Default Location
adornments:
  floor: { extends: '/idea/surface/default-floor' }

# Lava chamber — only stand
adornments:
  floor:
    extends: '/idea/surface/default-floor'
    staticSlots:
      - { name: 'ground:1', accepts: 'SlottableMixin',
          postures: ['stand'], userFacingDetail: 'floor' }

# Void — no floor adornment at all (sit no-arg fails honestly)
```

The `noDefaultFloor: true` opt-out marker on a Location's seed
suppresses the migration script and any future auto-floor tooling.

## Verbs

All posture verbs go through the centralized
`SlotApi.transferOccupancy` helper for atomicity — vacate any
current posture-bearing slot atomically before occupying the new
one.

| Verb | Form | Action |
|---|---|---|
| `sit` | no-arg | `default: 'ground'` → resolves to floor's `ground:1` |
| `sit <X>` | with arg | First slot on X accepting `Postures.Sit` |
| `lie` / `lie <X>` | both | Same shape, `Postures.Lie` |
| `kneel` | no-arg only | `default: 'ground'`, `Postures.Kneel` |
| `stand` | no-arg | Slot-less posture flip — vacates any posture-bearing slot, sets `Stand` |
| `stand <X>` | with arg | Stand on X (e.g., on a chair or table) |

The asymmetry: `sit` / `lie` / `kneel` no-arg occupy the floor slot
(routed through `SlotApi`); `stand` no-arg does not (it's the
implicit "free" posture, no slot needed).

## `default: 'ground'` mechanism

The framework substitutes `'ground'` as if the player had typed it,
then runs MQL resolution + validators. `ground` resolves via the
Detail-keyword pathway (`SlotApi.resolveSlot`) to the floor
Adornment's `ground:1` slot. In a void Location with no floor
Adornment, MQL no-match surfaces "you can't sit on the ground here"
— no controller branching.

See [command-spec.md](./command-spec.md) for the field semantics.

## Cross-references

- [slot.md](./slot.md) — substrate.
- [conveyance.md](./conveyance.md) — Mountable; `Postures.Mounted`
  is what `mount` produces and `dismount` clears.
- [boundary.md](./boundary.md) — Adornable retrofit (floor lives
  here).
