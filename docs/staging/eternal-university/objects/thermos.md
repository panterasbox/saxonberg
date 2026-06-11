# Object — Gus's thermos (staging)

> **Status:** staging draft (full object spec).
> **Belongs to:** Gus, the crossing guard (the EU campus-gate stop).
> **Target seed paths:**
> - `Thermos` (thin `Thing` subclass) → `mud/obj/`.
> - Gus's instance → a seed under `mud/seeds/obj/.../thermos.yaml`.
> **Depends on (banked):** the consume tail = **`Drinkable` + pour/fill/drink
> mechanics** (`docs/slates/tails/bulkable-slate.md`) + a **declared effect-list**
> (`docs/slates/builds/vitals-slate.md` — food & potions are one system: a consumable
> fires effects; eat/drink is just the delivery verb). Both slated, unbuilt —
> and *not* needed for Gus, who never opens it. A built thermos is just a
> `Sealable` + `Drinkable` vessel of coffee carrying an alertness effect-list;
> potions are the identical shape.
> **Retire when:** the `Thermos` class + Gus's seed are cemented. Then delete.
>
> The prop we abandoned mid-conversation, finally resolved. It's the
> **won't-open** of the sit/set/open/cross quartet — the break that never
> comes.

A dented stainless-steel thermos Gus keeps at his post. Real as a vessel;
its coffee is honest description; the one thing it *could* do — be drunk
from — is the one thing he never does, so it's banked, not faked.

---

## The resolution — real vessel, described contents, no simulation

We'd been stuck treating the whole thermos as gated (pour/drink/warmth needs
the liquid/consume subsystem we don't have). The way out: separate the
**vessel** (real) from the **contents** (description) from the **consume**
(banked).

- **Real as a `Sealable` vessel** — a genuine openable steel flask, same
  standing as the whistle and paddle (real Tangible objects whose one special
  capability is banked). **Not an inert prop:** the test for "real" was never
  "does it simulate physics," it's "real object, honest claims." It's a real
  container with a real open/close.
- **The coffee is description, not a modeled entity.** We don't model the
  liquid (that's the gated subsystem). So you **can't measure the coffee** —
  there's nothing to measure — and you can only measure the *thermos*, which
  is just an object at ambient like any other.
- **No thermal model, no represented vacuum.** Nothing to compute a
  temperature *of*; and a good vacuum flask is *cool* on the outside anyway
  (the insulation working — heat trapped inside), so even the physics refuses
  a "measurably warm" payoff. The vacuum-flask construction is **what the
  thermos is, described accurately** — not a modeled property.
- **The consume mechanic is banked** — and it's *exactly* the half Gus never
  triggers (he never opens it), so banking it costs the character nothing.

---

## Form

- A thin **`Thermos` class** (extends `Thing`).
- Composes **`Sealable`** — the screw-cap (classic thermos: the cap *is* a
  cup). He never unscrews it.
- Composes **`Tangible`** — dented stainless steel.
- Composes **`Detailed`** — the **cap-cup**, the **dented body**.
- **No thermal capability, no represented vacuum.** Honest description does
  the work the simulation would have.

---

## The coffee — description only

Honest description: the faint smell of old coffee, the knowledge it's still
in there. We **describe** it accurately (a vacuum flask keeps coffee hot for
hours) without **simulating** it. Not measurable, not drinkable (yet). That's
not a fake — describing a real kind of object accurately is the opposite of
faking one; the fake would be claiming a mechanic (measure/drink) that
doesn't exist, which we don't.

---

## Gus never opens it — the break that never comes

The **won't-open** of the sit/set/open/cross quartet. The character beat
lives in **fiction, not simulation**: the thermos is *described* as keeping
the coffee hot, so narratively the break never goes cold — always still
warm, always available, never taken. The vacuum flask is the perfect vessel
for a deferral: it makes *later* stay possible forever, and he never takes
it. (When liquid/consume lands, **even then Gus never opens his** — the cup
forever saved for a later that doesn't arrive.)

---

## Placement

Lean: it sits **on the relief's chair** — the unsipped coffee waiting on the
unsat seat; the break and the relief that both never come, grouped on one
piece of furniture. (Dial: clipped to his belt, or by the post, if the
grouping reads too cute.)

---

## What this surfaces / banks

- *(banked)* the **consume tail** — `Drinkable` + open → pour into the cap-cup
  → drink → a consumable effect-list (alertness/warmth). Drainable fluid →
  `bulkable-slate.md`; effects → `vitals-slate.md`. Gus never exercises it.
- *(deep-banked)* a **thermal layer** — the coffee cools, slowly. Full model in
  *The thermal layer* below; **it needs a substrate-slate home** (see the gap
  note there) so it's in requirements at build.
- Reuses, shipped: `Thing`, `Sealable`, `Tangible`, `Detailed`, global
  `open`/`close`. Built-thermos additions: **`Drinkable`** (bulkable) +
  **`Thermal`**.

---

## The thermal layer (deep-banked)

*Only if/when the coffee is a modeled bulk; gated on bulkable + vitals + the
thermal substrate. Gus never opens it, so it never fires for him — captured so
the worked model isn't lost.*

**Composition — two orthogonal mixins.** The built thermos composes
**`Drinkable`** (holds a drainable fluid) **and `Thermal`** (holds a temperature
that cools). Independent concerns: a cooler/oven is `Thermal`-not-`Drinkable`; a
paper cup is `Drinkable`-not-`Thermal`. **`barrier` is a field on `Thermal`**,
never on `Drinkable`.

**The cooling model.**
- Lazy **Newton's cooling on read** (the watch pattern), re-stamped on ambient
  change: `T = ambient + (T0 − ambient)·e^(−Δt/τ)`; ambient from
  `BiomeApi.resolveTemperatureFor`. No ticking — piecewise-exponential, re-based
  when the vessel changes rooms or room temp shifts.
- **`τ = R · C`:**
  - **`C`** (thermal mass) = contents `mass × specific_heat` — mass from the
    `Drinkable` volume × density, specific heat a liquid-material property.
    *More coffee → slower cooling, for free.*
  - **`R`** (insulation) = series sum: the **`barrier` medium** (dominant) + the
    **wall = Tangible material** (minute). **Vacuum** = a tabulated medium
    (biome's air/water/vacuum set) given a tiny **nonzero** conductivity
    (radiation + cap/neck leak lumped in) → slow-not-never. Glass vs steel walls
    differ minutely (lower `k` → marginally better — the original-Dewar reason).
    Materials double-duty: density→mass, conductivity→insulation. No per-instance
    geometry — typical-construction constants at the vessel-*type* level.
- **Measurement:** explicit `getContentsTemperature()` / `getSurfaceTemperature()`
  methods (the contract); open/closed is diegetic flavor (a sealed vessel's
  contents aren't externally measurable — say so), not the gate.
- Fluid-agnostic — a gas bulk cools the same.

**Substrate home.** The full model now lives in **`docs/slates/tails/thermal-slate.md`**
(the generic `Thermal` capability, `τ = R·C`, lazy cooling + re-stamp, the
material/medium-conductivity extensions). It reuses biome ambient
(`resolveTemperatureFor`), the `Quantity<'K'>` thermal scale (quantities),
vitals' corpse-cooling pattern, the consumable effect-list (vitals), and the
drainable fluid (bulkable). The thermos is just one consumer — this staging
doc retires, the slate carries the design into requirements.

---

## Open dials

1. **Placement** — relief's-chair grouping (lean) vs belt vs by-the-post.
2. **Contents description** — the exact prose (coffee; the smell; how much
   you can tell without opening).
