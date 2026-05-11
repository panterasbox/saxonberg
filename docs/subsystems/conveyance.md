# Conveyance

`Mountable` and `Drivable` mixins; the `mount` / `dismount` verbs;
the conveyance ripple in `Mobile.traverse` that takes occupants
along when their host moves.

## The Cast

| Name | Location | Role |
|---|---|---|
| `Mountable` | `lib/slot/Mountable.ts` | Single mount slot occupant can ride |
| `Drivable` | `lib/slot/Drivable.ts` | Has a controller slot (driver position) |
| `SeatedDrivableMixin` | `lib/slot/Drivable.ts` | Sibling override — controller slot lives on a Containable seat |
| `SlotRef` | `lib/slot/Drivable.ts` | Internal `(host, slotName)` pair; not inter-Stuff contract |

Both compose on `Stuff & Slotted`. `SeatedDrivableMixin` composes
on `Stuff & Drivable & Container`.

## Mountable

Persistent: `mountSlot: string` — defaults to `'mount:1'`. A horse
may use `'back:1'` resolved from its bodyPlan.

Public surface:

- `getMountSlot()` / `setMountSlot(value)` — accessor pair.
- `isMounted()` — slot occupancy.
- `getMountOccupant()` — the rider (or null).

The mount slot itself is registered on the Slotted substrate
(static or body-plan-driven). Mountable doesn't add the slot — it
points at it.

## Drivable

Public surface (interface — two methods):

- `isDriven(): boolean`
- `getDriver(): (Stuff & Slottable) | null`

The slot-resolution logic is a `protected resolveControllerSlot(): SlotRef`
extension method on the class — not part of the public Drivable
interface (TypeScript interfaces can't declare protected members).

The default `DrivableMixin.resolveControllerSlot` returns
`{ host: this, name: this.controllerSlot }`. `SeatedDrivableMixin`
overrides to find a `role: 'driver'` Containable in the host's
contents.

The field accessor pair `getControllerSlot(): string` /
`setControllerSlot(value)` exists for the persistent-field surface
and is intentionally distinct from the protected
`resolveControllerSlot()` method (they used to share a name; the
collision has been resolved per resolved-decision #4).

## Vehicle design space coverage

| Vehicle | Pattern | v1 |
|---|---|---|
| Horse, bicycle, motorcycle, magic carpet | Default DrivableMixin (no override) | ✓ |
| Two-seater car, sedan, bus | `SeatedDrivableMixin` override | ✓ |
| Carriage with driver-on-box | Override variant (driver platform is an Adornment) | ✓ |
| Pillion motorcycle | Override + sibling Mountable slot | ✓ |
| Tank, helicopter, sailboat (multi-controller) | `controllerSlot` plural | ✗ — own slate |
| Sailboat with crew (multi-actor coordination) | Beyond Drivable | ✗ |
| Rickshaw, palanquin (driver external) | Different mixin | ✗ |

## Conveyance ripple

Lives in `Mobile.traverse` (not in Mountable / Drivable). After
`ContainmentApi.move(mover, destination)` and `announceArrival`,
walks the mover's slot map and ripples occupants:

```ts
if (MixinApi.isSlotted(mover)) {
  SlotApi.walkOccupants(mover, (host, slot, occupant) => {
    if (MixinApi.isContainable(occupant)) {
      ContainmentApi.move(occupant, destination);
    }
  });
}
```

`SlotApi.walkOccupants` recurses into nested Slotted occupants
automatically. Saddle-on-horse-with-rider case: the horse moves,
saddle ripples (Wearable-claimed back:1), saddle's mount:1 occupant
(rider) ripples too.

**Cycle guard.** Depth limit 16. Triggers on saddle-on-saddle
abuse.

**Once-per-occupant semantics.** A Wearable claiming two slots on
the same host (boots on foot:left + foot:right) ripples once, not
twice. `walkOccupants` deduplicates by occupant identity.

## Verbs

| Verb | Action |
|---|---|
| `mount <X>` | `SlotApi.transferOccupancy` from any current posture-bearing slot to `X.mountSlot`; set `Postures.Mounted` |
| `dismount` | Vacate the mount slot the actor occupies; set `Postures.Stand` |

`mount horse` finds the horse's mountSlot; `mount back` resolves
`back` as a Detail keyword via the § 5.5 Detail-targeted pathway.

## What v1 doesn't cover

- **Multi-controller vehicles** (tank, helicopter, sailboat) —
  `controllerSlot` is scalar; plural ships when shared-control
  arrives.
- **Driver-external vehicles** (rickshaw, palanquin, dog sled) —
  driver isn't IN the conveyance; needs a different mixin.
- **Multi-actor coordination** (sailboat with crew) — beyond
  Drivable; activity-slate territory.

## Cross-references

- [slot.md](./slot.md) — substrate, Detail-targeted resolution.
- [posture.md](./posture.md) — `Postures.Mounted` integration.
- [spatial.md](./spatial.md) — `Mobile.traverse` integration.
