# trade-sericulture

The sericulture trade — ⭐⭐ **the RGO whose take ends the animal.**

A tray of silkworms eats cut mulberry leaf for about a month, ages by the
warmth of the room it stands in, moults four times, wanders, and spins.
The cocoons must then be stifled — held hot enough, long enough, to kill
the pupa — within about ten days, or the moths break the thread on their
way out and lay the next lot where they stood. That deadline is the
trade's one decision: what you stifle becomes silk, what you keep becomes
seed, and the heaviest you keep raise the next generation by the
breeder's equation, R = h²S.

It ships **no verb**: `put` an egg lot, leaf and a brush in a tray; `get`
the cocoons out; `put` them in an oven; and `reel` them — the fishing
trade's verb, told by the instrument what it is reeling.

## What is here

- `src/lib/Rearing.ts` — `RearingMixin`: the population as the tray's
  state. Degree-day ages off the tray's own temperature trajectory,
  feeding as a soft limit, moults, wandering and the spin; the seeded
  disease nothing reports; three heft stacks and frass at the end.
- `src/thing/RearingTray.ts` — the host. Adopts an egg lot on `put`,
  reads the worms in words on `look`. `HouseTray` is the persistable,
  singleton fixture a silk house props.
- `src/thing/EggLot.ts` — strain, where and when; the winter a one-brood
  race needs; the spoiler load.
- `src/thing/Cocoons.ts` — a heft stack, with every fact about it as
  stack identity.
- `src/idea/Strain.ts` — reference data: colour, broods, h², mean and
  spread of the shell.

Subsystem doc: [docs/subsystems/sericulture.md](../../../docs/subsystems/sericulture.md).
