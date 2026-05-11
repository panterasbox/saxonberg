# Embodiment

Body-side affordances on the slot substrate. `Wearable` and
`Wieldable` are specialized `Slottable` mixins that carry per-body-
plan slot claims and the corresponding `fitsSlot` test.

## The Cast

| Name | Location | Role |
|---|---|---|
| `Wearable` | `lib/slot/Wearable.ts` | Body-slot claim for clothing / armor |
| `Wieldable` | `lib/slot/Wieldable.ts` | Body-slot claim for weapons / held items |

Both compose on `Stuff & Slottable & Containable` — wearables and
wieldables live in inventory before being worn / wielded.

## Per-body-plan claims

Each Wearable / Wieldable carries `slotClaims: Record<string, string[]>`,
where the key is a body-plan template path and the value is the
ordered list of slot names this item claims on that body plan.

```yaml
# Boots template
slotClaims:
  /idea/race/bodyplan/biped:    ['foot:left', 'foot:right']
  /idea/race/bodyplan/quadruped: ['hoof:fore-left', 'hoof:fore-right',
                                   'hoof:hind-left', 'hoof:hind-right']
```

A body plan that doesn't appear in `slotClaims` is ineligible —
`fitsSlot` returns false.

## `fitsSlot` overrides

`Slottable` ships a default `fitsSlot(host, slot) => true`.
`WearableMixin` and `WieldableMixin` override it: walk
`host → species → bodyPlan` via `SpeciesApi.tryGetBodyPlanPath`,
then check `slotClaims[bodyPlanPath].includes(slot)`. The host's
`Slotted.canOccupy` calls this after the slot-side mixin check
passes, so the candidate gets the final say.

Subclasses override `fitsSlot` for richer rules (a magic boot that
only fits Elven feet, etc.).

## Multi-slot atomicity

A wearable claiming multiple slots (boots → both feet, longbow →
both hands) uses `SlotApi.occupyAll` in the controller — either
every slot is claimed or none. Failure surface names the blocked
slot. Removal vacates every claimed slot.

## Wearable + Wieldable overlap

Some objects (gauntlets, bracers) compose both. Each side declares
its own `slotClaims`. The verb selects the mode: `wear gauntlet`
invokes the Wearable side; `wield gauntlet` invokes the Wieldable
side. No umbrella mixin.

## Verbs

| Verb | Action |
|---|---|
| `wear <X>` | `SlotApi.occupyAll` on `X.slotClaims[actor.bodyPlanPath]` |
| `remove <X>` | Vacate every claimed slot |
| `wield <X>` | Same shape as `wear` for held positions |
| `unwield <X>` | Same shape as `remove` |

Validators per verb (the controllers fail-fast on type narrows that
shouldn't be reachable post-validator; user-facing rejection lives in
these):

- All four verbs: verb-level `requiresAnimate`, `requiresSlotted`
  (the actor's body needs slots to claim into).
- `wear` / `wield`: target-level `mustBeInInventory`,
  `mustBeWearable` / `mustBeWieldable`.
- `remove` / `unwield`: same target-level shape — `mustBeWearable` /
  `mustBeWieldable` is sufficient for "this is a wearable kind of
  thing"; the controller's own per-slot scan surfaces "you aren't
  wearing that" when nothing actually vacated.

## Cross-references

- [slot.md](./slot.md) — substrate.
- [race.md](./race.md) — BodyPlan's `slots: SlotSpec[]` declaration.
- [command-spec.md](./command-spec.md) — verb authoring.
