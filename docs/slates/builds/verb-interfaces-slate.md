# Verb interfaces — no single-use verbs

> **Status: UNBUILT · opened 2026-10-18 (user, during the cleanliness MR review !380).**
> **Left:** `boil` folded into heating (immersion takes the liquid's heat) ·
> `scrub` as a manner of `wash` · `strew`'s wider uses · an audit of every
> verb for single-target narrowness.
> **Size:** a build.

## The note (user, 2026-10-18)

> *"beatcontroller is cool but is it ever going to take any target that's
> not a rug? that seems like a very very narrowly applied verb. … I do
> think 'boil' is kind of weird even though you didn't make it. Boiling
> just means heating water to 100 degrees, that's super narrow too — what
> else would you possibly boil, unless submerging something in boiling
> water is what the verb is for, but then that's a terrible verb to use."*

The rule it applies is the verb-collision ladder's first rung — **unify
behind an interface**: a verb is an ACT that many things answer, and a verb
with one possible target is a property of that target wearing a verb's
clothes.

## Done in the cleanliness MR (B46)

`beat` → **`brush`** (`beat` kept as its alias): the loose dirt out of ANY
Soilable thing, dry — a coat, a hat, a cushion, a rug beaten. The act is
`Soilable.brushOff(effort)`, each dirt kind giving up its row's
`brushLifts`. ⭐ It completes the three acts by the dirt's own nature: BRUSH
what is loose (crumbs, ash, flour, dried mud), WASH a film (grease, sweat),
BLEACH a set stain. Conferred by the `SweepingTool` rows (a clothes brush,
a carpet beater — `capability: brushing` — and a broom, worse); a floor is
swept, not brushed.

## `boil` — a temperature, not an act

Shipped by the water build (`5a8bf4a27`) as *hold a vessel at a rolling
boil* — purifying water, a build step a recipe can require — and extended
by cleanliness (`boil <cloth> in <pot>`, five minutes at a boil disinfects).

What boiling IS: water heated to its boiling point. What disinfects a
bandage is not a verb but **time in water at 100 °C**. The derivable model:

- **Immersion takes the liquid's heat.** Anything sitting in a vessel's
  liquid is held at that liquid's temperature for as long as it is in it —
  the wet-heat stamp (`Soilable.holdAtHeat(K, s, {wet: true})`) and the
  kill law — applied by the vessel's own thermal reconcile, not by a verb.
- So the bandage is `put … in pot`, the pot set on the fire (or `heat pot`),
  time passes, `get bandage`: disinfected, because it sat in boiling water.
  A copper boil-wash, a dye bath, a pot of stew with a bone in it — the same
  rule.
- `boil` survives only as `heat <vessel>` until its liquid boils (an alias
  with a target temperature), which keeps the water build's *boil the
  water* purification and its recipe-step meaning; the `boil … in pot` arm
  retires.
- ⚠ A change to the thermal/bulk reconcile (the vessel stamps what it
  holds), and the purification half is the water pack's — hence a build,
  not a review fix.

## The audit — candidates

| verb | the narrowness | the interface it belongs to |
|---|---|---|
| `scrub` | `wash` done hard (effort 3) | a manner of `wash` (`wash floor hard`) or an alias that sets the effort |
| `strew` | only floor litter | scattering a loose material over a surface: grit or salt on an icy path, sand on a spill, broadcast seed |
| `dispose` | refuse onto a midden | dumping — fine as the act it is; check it is not a `put` |
| every verb | — | the census: views whose `requires:` (or controller narrowing) admits one class or one row |
