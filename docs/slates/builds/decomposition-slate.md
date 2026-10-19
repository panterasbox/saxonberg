# Decomposition slate — what time and weather do to things

> **Status: UNBUILT** — parked from the underwater session and **designed
> 2026-10-18** with the owner. Decay exists piecemeal →
> [mortality.md](../../subsystems/mortality.md) (the corpse's postmortem
> stages), [spoilage.md](../../subsystems/spoilage.md) (food's microbial
> clock), [textiles.md](../../subsystems/textiles.md) (dye fade),
> [holding.md](../../subsystems/holding.md) (the shell's weathering clock),
> [materials-response.md](../../subsystems/materials-response.md) (corrosion
> on contact), [maturation.md](../../subsystems/maturation.md) (retting,
> bleaching, compost — decay used on purpose).
> **Left:** ⭐ AUTHORED decay states in model-native terms — per part, by
> mechanism — that behave, read, repair and continue · authored as a STATE
> or as a HISTORY the physics derives once at creation · per-material
> susceptibility per mechanism · the exposure clock kept as the rule (an
> act starts it, shelter stops it — Law 2 intact) and built only where a
> consumer needs it · decay as a second writer of assembly's per-part
> condition, on maturation's reconcile machinery
> **Size:** a build

## 0. The reframing (the owner, 2026-10-18)

> *"With the exception of a few processes like corpses and food, I don't
> know how much we care about procedural decomp over time. It would only
> apply to items that get persisted, and that depends on your storing them,
> which means they're not left out almost by definition… However, I do think
> content authors are going to want to author objects in various states of
> decay, and the model should be true to that."*

So the build's main job is **authored decay that is TRUE** — a rusted sword
in a barrow, a rotten door in a ruin, a waterlogged chest, a statue gone
green — and the live clock is the rule that keeps the model consistent, not
a system anyone ticks.

## 1. ⭐⭐⭐ The rule — an EXPOSURE clock **[DECIDED]**

Law 2 and the stewardship doctrine govern all of it:

> *"A shell weathers on the passage of days. **A good wears only when you
> use it**… If a durable ever loses condition to the calendar, every object a
> player owns rots while they sleep."* (holding.md, with a regression test
> pinning a durable good unchanged across a game year)
>
> *"Consequence attaches to **acts and opted-into active states**, never to
> time-passing or mere ownership… the one thing that must never be the meter
> is the player's presence."* (stewardship-doctrine.md)

> ⭐⭐ **Decomposition is an exposure clock: it starts at an act or event
> that puts a thing into an environment that attacks its material, and stops
> when the thing is taken back out.** *"The clock starts at an act, never at
> ownership."*

| case | starts it | decays? |
|---|---|---|
| your sword in your pack or on your rack | nothing — held and sheltered | **never** (Law 2's test stays green) |
| your sword left out in the rain | you left it | rusts at iron's rate in wet air |
| a ship that sank | the sinking | yes (underwater-slate § 10) |
| a tool dropped in the river | the drop | yes |
| something buried | the burial | at its burial's rate (§ 3) |
| a corpse; food | death; the catch | already this shape — **unchanged** |
| a building's fabric | — | holding's **shell** clock, a separate settled doctrine |
| an authored fixture in a place | — | part of the place's fabric: the shell's clock |

Never punished for absence or ownership; what decays is what you, or an
event, put in harm's way. ⚠ The stewardship doctrine's aggregate worry
stands (*"does your character's week feel like freedom or like errands?"*),
and the exit is always *bring it in*.

## 2. One model — susceptibility × driver **[DECIDED]**

| mechanism | attacks | driven by | already derived by |
|---|---|---|---|
| corrosion (oxidation) | metals | water + oxygen, salt accelerates; ~0 in dry air or anoxic water | wetness · dissolved oxygen (underwater § 15) · salinity |
| rot (fungi, bacteria) | wood, cloth, leather, paper | moisture above a threshold (wood above ~20 % MC), oxygen, warmth | ⭐ wood's equilibrium moisture from humidity (assembly's seasoning, `Evaporation`) |
| organisms | specific materials | shipworm (salt, warm), woodworm, moths on wool | salinity, temperature, a material tag |
| light (UV) | dyes, fibres, rubber | sun exposure | ✅ textiles' photochemical fade; sky exposure and daylight |
| ⭐ frost | porous wet stone, brick | freeze–thaw cycles while saturated | ✅ the freeze–thaw count (brickmaking § 2) |
| ⭐ abrasion | anything | windblown sand, flowing water, foot traffic | the river's current, the weather |

- ⭐ **Convergence: maturation already has this shape** — a closed mechanism
  vocabulary (`microbial`, `photochemical`, `chemical`, `evaporative`),
  profiles keyed on material tags, a reconcile integrating rates over
  time-weighted environment windows (`lint:reconcile-chains`). Rot is
  `microbial`, fade `photochemical`, corrosion `chemical`; only **frost** and
  **abrasion** are new, physical mechanisms.
- **Each material row declares its susceptibility per mechanism** — the
  underwater § 10 immersion response generalised to every environment.
- ⭐ **What decay writes is assembly's per-part CONDITION** — today written
  only by use; decomposition is the second writer, only while exposed. A part
  reaching failure fails through assembly's shipped path.

## 3. Slowing, reversing, reading **[DECIDED]**

- **Shelter stops the clock** (§ 1).
- ⭐ **Sealants** — underwater-slate § 8's coating layer (oil, wax, tar,
  paint, varnish) cuts exposure to water and oxygen, and **the coating itself
  decays** (its own susceptibility): repainting and re-oiling are upkeep, and
  upkeep is somebody's income (the painter).
- ⭐ **Burial cuts both ways, derived** — waterlogged anoxic ground
  **preserves** (bog bodies, the *Vasa*'s silt, Roman shoes from wet pits);
  damp airy ground **rots fast** — why a **fence post rots at the ground
  line**, where moisture and oxygen meet.
- **Material choice** — oak heartwood and cedar resist rot, bronze outlasts
  iron, wool feeds moths and linen does not.
- **Reversal by mechanism** — rust is **removed** (wire-brushed: abrasion as
  remedy; the metal lost stays lost); rot is **cut out and replaced**
  (assembly's part replacement, `repair`); fade is **re-dyed**; frost spall
  is **replaced** (`maintain`).
- **Read in words and bands, never a number** (holding's rule): rust bloom →
  flaking → holed; rot soft to the knife — ⭐ the **probe test** (a blade
  pressed into the wood) is a `Reading` row, competence telling punky from
  sound; mould, fade, spalling. Per part — *"the haft has gone soft where it
  meets the head."*

## 4. ⭐⭐⭐ Authored decay — the build's main job **[DECIDED]**

An authored decay state is written **in the model's own terms**, per part,
so it behaves with no special-casing:

- ⭐ **It behaves** — a rotten haft has low condition and **breaks under use**
  (assembly's failure path); a rust-pitted blade is weaker
  (materials-response); a waterlogged chest is heavy and its contents soaked
  (the wet law).
- **It reads** — the per-part prose of § 3.
- **It repairs** — the tinker or the smith restores it; repair already reads
  part condition.
- **It continues** — if an exposure clock ever runs on it, it carries on from
  the authored state.

⭐⭐ **Two ways to author it, one result** (per-part condition):

1. **Declare the STATE** — `rust: heavy` on the blade, `rot: through` on the
   haft: a per-part mechanism and band, when the author knows exactly what
   they want.
2. ⭐⭐ **Declare the HISTORY and let the physics derive the state** —
   *"fifty years in a peat bog"*, *"under salt water since the wreck"*. The
   model integrates the materials' susceptibilities over that exposure
   **once, at creation**: the bog sword's iron survives (anoxic, acidic peat
   preserves) and its leather grip is tanned dark; the same sword fifty years
   in a damp barrow is a rusted wreck with no grip. **The author writes the
   story; the physics writes the state** — *derived, never authored* where an
   author wants it, an override where they do not.

**The live exposure clock** stays **the rule** (§ 1) so the model is
consistent and Law 2 safe, but it is **low priority**: built only where a
consumer needs it (a wreck found after years, a thing dropped in the river),
reconciled **once on load**, never a ticking system.

**The existing clocks stay as they are** — the corpse's postmortem and food's
spoilage are already act-started exposure clocks with shipped, tested stages;
they are recorded as the **same shape** so a later pass can unify them if a
reason appears. Deliberate decay (retting, bleaching, compost) stays on
maturation.

## 5. The lens pass (2026-10-18)

1. **Pedagogy** — corrosion needs water and oxygen and salt speeds it; rot
   needs moisture past a threshold; anoxic burial preserves; fence posts rot
   at the ground line; frost spalls wet porous stone; why oak and bronze were
   chosen.
2. **Expression** — ⭐ ruins, wrecks and archaeology whose state DERIVES from
   their history: a ten-year wreck and a hundred-year one read differently
   with no extra authoring.
3. **Immersion** — the rusted gate, the rotten jetty, a coin bright under the
   silt. **Participation** — the painter, the re-oiler, the cooper re-tarring,
   the salvor reading what survived.
4. **Values** — ⭐ Law 2 holds by construction (decay never punishes absence
   or ownership); ⚠ the aggregate-errands risk, with *bring it in* as the exit.
5. **Continuity** — tar → paint → galvanizing → cathodic protection: the
   same `coat`, the same remedy (shelter).
6. **Economy** — sealants, paint and replacement parts become recurring
   demand only for things kept exposed on purpose (boats, fences, ships,
   piers).
7. **Governance** — abandoned property decays toward the polity's question
   (salvage, escheat); nothing here judges a person.

**Altitude** — *invariant*: held and sheltered goods never decay; the clock
starts at an act. *Grain*: every material's susceptibility, the rot threshold,
the rates.

## 6. Dependencies and consumers

Writes **assembly's per-part condition**; runs on **maturation's reconcile
machinery**; keeps **Law 2's year-long regression test** green. First
consumers: authored ruins and barrows, [underwater-slate](./underwater-slate.md)
§ 10's wrecks, the river's works ([river-slate](./river-slate.md)), and
[brickmaking-slate](./brickmaking-slate.md)'s frost (which shares the
freeze–thaw count).

## 7. Open

1. The authoring syntax for a history (`exposure: [{ for: 50y, in: bog }]`
   against a named environment row).
2. Whether frost and abrasion join maturation's closed mechanism vocabulary
   or sit beside it as `physical`.
3. Whether a non-assembly thing (a single-material object, a bill of one)
   carries condition the same way — repair's *a monolith is an assembly of
   one* says yes.
