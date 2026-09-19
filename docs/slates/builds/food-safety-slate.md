# Food safety slate — the second population, and what preservation actually preserves

> **Status: PARTIAL** — shipped 2026-09-04 (MR !244), living-world phase
> 3 with it → [spoilage.md](../../subsystems/spoilage.md)
> **Left:** molds (Part 10) — the second population's visible surface ·
> rancidity's own small law (Part 10) · `f_pH` + the `Vat` collision it
> inherits (Part 10) · the attach points nobody uses yet (hands on
> `Creature` · irrigation contamination · the `trade-butchery` spin-out ·
> a durative `cook`)
> **Size:** a build

See also — the parents: [preservation-slate](../tails/preservation-slate.md)
(⭐ **read first.** Its *mechanism* half shipped; this slate is its
*endeavour* half plus a centre it did not have. Its § *terms, not methods*
is the completeness doctrine and is **inherited unchanged**) ·
[disease-slate](../builds/disease-slate.md) (⚠ **the boundary.** This build fills
`ProgressionSpec` and leaves `ContagionSpec` untouched — see Part 4) ·
[cooking-slate](../builds/cooking-slate.md) (shipped; the kill step is its) ·
[ranching-slate](../builds/ranching-slate.md) (§ *the ranching seam — leave it open*;
this build finally cuts it, from the hunting side) ·
[rendering-slate](../builds/rendering-slate.md) (the non-meat half of a carcass —
adjacent, not annexed) · [pharma-slate](../builds/pharma-slate.md) (⚠ **cut** — see
Part 10) · [health-vertical-slate](../builds/health-vertical-slate.md) (the medic
demand this creates) · [sampling-and-labs-slate](../builds/sampling-and-labs-slate.md)
(the bench answer to an invisible question).

Substrates: [spoilage.md](../../subsystems/spoilage.md) (the growth law, the
bands, the dose) · [metabolism.md](../../subsystems/metabolism.md) (the
ingest rung, `ToxinTag`, `labileAtK`) ·
[vitals.md](../../subsystems/vitals.md) (`reconcileConditions`, the
`TraumaBehavior` table) · [harm.md](../../subsystems/harm.md) (the medic
vertical) · [thermal.md](../../subsystems/thermal.md) (Newton cooling — the
danger zone for free) · [mortality.md](../../subsystems/mortality.md) (the
rescuable dying clock — the stakes, already built) ·
[crafting.md](../../subsystems/crafting.md) (the recipe shape a cure needs) ·
[bulk.md](../../subsystems/bulk.md) (`BulkPayload`, the pour blend).

---

*(Parts 0–9 — what shipped, the per-instance water state, the pathogen
split, in-host growth, the roster, butchering, the audit, the findings and
the build shape — landed in MR !244 and are recorded once in
[spoilage.md](../../subsystems/spoilage.md); the in-host half in
[vitals.md](../../subsystems/vitals.md), the butcher's death-clock in
[mortality.md](../../subsystems/mortality.md) § `sinceDeath()`. Cut at the
2026-09-19 compaction; git has the reasoning.)*

---

## Part 10 — The cut, and why

**Molds are OUT.** A genuine third microbial idiom — *visible, surface-borne,
spreading by contact, and sometimes the point* (blue cheese, koji, tempeh,
the bloom on a salami). It is a clean follow-on precisely because
**fermentation already established the pattern**: a microbe is a living
Material with viability and strain, bridging to a species row, and the
`fungi` clade already ships (`Saccharomyces cerevisiae`, `pastorianus`;
`Mycena lucifera` in Rejection). `Penicillium`, `Aspergillus` and *Claviceps
purpurea* are **rows in an existing taxonomy**, not substrate.

Held for that build, because they are too good to spend as an afterthought
here:

- ⭐ **Aflatoxin survives cooking** — `labileAtK` already expresses it.
- ⭐⭐ **Ergot** is the best single content object in this whole space: it
  links storage, mass poisoning, hallucination and medicine in one row, with
  real history behind it.

**Medicine is OUT.** [pharma-slate](../builds/pharma-slate.md) owns credence goods
and the institutions around them, and penicillin wants the mold build to
exist first. **This build creates the demand** (an invisible illness needs a
diagnosis, a diagnosis needs a diagnostician) and deliberately does not
supply it.

**Rancidity is OUT and is not this law.** [spoilage.md](../../subsystems/spoilage.md)
already records the deferral — *"staling by oxidation (coffee, oil going
rancid) is **not a microbial story** and the gauge says nothing about it."*
Olive oil and rendered tallow now ship, so a consumer exists; it wants its
own small law, not a term in this one.

**Acidity (`f_pH`) is OUT** — the fourth lever, still absent, still a
`FermentProfile` row plus a read when someone wants pickling. Naming it here
so the term set stays visibly *closed*: after `f_pH`, any method a player
names is checkable against the equation rather than needing design work.

---

## ⭐ The attach points the build left open

Graduated from the retired plan's *Deferred seams* at the 2026-09-04 sweep,
because each one is a place a **later** build hooks on and the plan was the
only thing holding the list. Nothing here is unfinished work of this build;
each is a seam that now exists and has nobody using it yet.

- **Molds** — Part 10, and the one real tail. `ContaminableMixin` is the
  attach point: a mold is a *visible* surface population, which makes it the
  third thing after the flora (you can smell it) and the pathogens (you
  cannot sense them at all) — and the first one that argues with
  `channels: []`.
- **`ContagionSpec`** — deliberately untouched. Person-to-person is
  [disease-slate](../builds/disease-slate.md)'s, and Part 4's boundary is
  what keeps this build from drifting into it.
- **Hands.** D3 names one and this build ships no host for it. The attach
  point is `Creature`; the consumer is the disease build, which needs a
  body-side carrier for transmission anyway. Composing it here would have
  bought a *worse* game (every meal a hygiene chore) for no new mechanism.
- **`f_pH`** — the fourth hurdle beside temperature, water activity and time.
  A `FermentProfile` row plus one read. ⚠ Inherits the unresolved `Vat`
  name collision.
- **Irrigation contamination** — `ContaminableMixin` composes onto
  `WateringCan` the day somebody wants the field→gut path that real food
  safety spends most of its effort on.
- **`trade-butchery`** — the spin-out. Butchering ships inside
  `trade-cooking` because one act does not make a trade; a second and a
  third (offal, hides, the rendering seam) would.
- **A durative `cook`** — the day someone wants to pull a roast early, an
  engagement is the honest shape and `holdS` becomes its *default* rather
  than its ceiling.
- **Rancidity** — fat oxidising is its own small law, not another term in
  the growth equation. It wants a build, not a field.
