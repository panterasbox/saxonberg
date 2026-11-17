# Sleep — logging out is going to bed

> **Status: UNBUILT · opened 2026-10-18 (user, during the cleanliness MR review !380).**
> **Left:** the wake reconcile (state at logout + time away) across every
> body clock · rest quality from bed, how kept, what you wore, the room's
> heat · what a night soils · pyjamas as a consequence, never a chore ·
> asleep-while-logged-in (physiology slate Part 7d).
> **Size:** a build.

## ⭐⭐⭐ The design (user, 2026-10-18 — the entire design)

> **Logout is sleep. When you log back on, your state is a function of
> your state when you logged out + the time you were logged out — so you
> can have a restful sleep or not.**

The shipped freeze is **not** a design and never was: every inhabited-body
clock drops a long gap (`MAX_REASONABLE_GAP_SEC`, 4 game-hours) as
"absence", so logging out heals nothing, rests nothing and costs nothing.
The sleep build replaces that with ONE wake reconcile: the away time is
integrated as a night spent where and how you lay down.

- ⭐ **No logout tax** (lens 4, and physiology Part 7d's *no penalty for
  leaving*): nothing must be done before logging out. What you get is a
  consequence of how you went to sleep — a good bed in loose dry clothes
  is a restful night; the doorway in a hauberk is not.
- **The body does not know whether anyone is watching** (Part 7d: *the bed
  heals you, the client does not — same rate logged in or out*). Asleep
  logged in and logged out integrate the SAME night.
- ⚠ **Real-life absence must still never starve you** — the reason the
  guard exists. A night is bounded: past a full sleep the body's needs
  plateau rather than run on (the number is the build's to choose and
  state); you wake hungry, not dead.

## Rest quality — what makes a night restful

`restQuality` today is posture × the surface's `restQuality` × how kept it
is (`Postured.restQualityAsKept`: a filthy bed in a filthy room rests worse,
cleanliness) × throttles, and **nothing you wear enters it**. The night
should read:

- **the surface** — a bed, a cot, the floor (`lie` where you are);
- **how kept** — shipped;
- **what you wore** — a worn-comfort factor DERIVED from the covering stack:
  rigid forms (plate), heavy ones (mail) and wet clothes lower it; loose dry
  clothes cost nothing. Derivable from what constructions already know —
  no per-garment "sleepwear" flag;
- **the room's heat** — shipped thermal comfort already reads worn `clo` +
  the bed's `warmth`; a cold room in a nightshirt is a bad night, a
  nightcap and a quilt a good one.

## ⭐ Why pyjamas — consequences, not rules

Nothing rewards pyjamas as such; they matter because of what else is true:

1. **The night's sweat** — sweat lands on the INNERMOST layer (cleanliness,
   exertion's `soilBodyPart(…, 'inner')`). A night in your shirt is a
   sweated shirt tomorrow; a nightshirt takes it and goes to the wash.
2. **The bed's linen** — an unwashed, sweating sleeper soils the bed, and a
   filthy bed rests worse. A bath and nightclothes keep the bed, and so the
   next night, good. (The bed-soiling is this build's to add; the reading is
   shipped.)
3. **Warmth** — nightgown, nightcap: insulation in an unheated bedroom.
4. **Being seen** — the dressed impression already reads what you have on;
   the hall in a nightshirt reads so, and a doorman judges it.
5. **Wear** — clothes slept in crease and wear; only if garment durability
   wants it.

## Grounding for the build — the clocks that drop a long gap

Each carries its own `MAX_REASONABLE_GAP_SEC` guard on the inhabited body
(owned animals already integrate the full gap — `integratesLongAbsence`):
`Metabolic` (basal drain, digestion, coupled recovery), `Vitals` (wounds,
bleeding), `Thermal`, `ThermalRegulation`, `Respiration`, `Caster` (mana),
`Wet`, `Condition`, plus `Burner`/`Combustible` (things, not bodies). The
build should route the inhabited body's wake through ONE reconcile rather
than teaching ten guards about sleep separately — a lifecycle seam, not ten
flags.

## Related

- [physiology-slate](./physiology-slate.md) Part 7d — in bed (posture) vs
  asleep (consciousness); sleep keeps aether comms; the three tiers.
- `docs/subsystems/metabolism.md` (coupled recovery), `thermal.md`,
  `cleanliness.md` (§ Places — rest; the sweat producer).
