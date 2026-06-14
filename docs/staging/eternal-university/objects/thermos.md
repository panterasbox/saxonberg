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

## The resolution — a real `Thermal` + `Bulkable` + `Sealable` vessel

**Correction (2026-06-12):** the earlier "described contents, no simulation"
framing was a lazy shortcut — a flavor-only fake, exactly the thing
props-real-or-cut forbids. Gus's thermos is **real**, built on real substrate;
it is the **first consumer of the `Thermal` capability**. The coffee is a real
modeled bulk at a real, cooling temperature.

- **Real as a `Sealable` + `Bulkable` vessel** — a genuine openable steel flask
  holding real coffee as `bulk:{material: coffee, amount}` (the bulkable
  substrate, **now merged**). Real container, real open/close, real contents.
- **The coffee is modeled, not described away.** It's a bulk at a temperature
  that cools (lazy Newton, the `Thermal` capability). You *can* measure and
  drink it — when it's open (below).
- **The vacuum is a represented `barrier`.** Sealed, the flask keeps the coffee
  hot for hours; a good vacuum flask is *cool on the outside* because the
  insulation is working — and that's now a **modeled read**
  (`getSurfaceTemperature()` ≈ ambient), not a hand-wave.
- **What's genuinely banked is narrow and honest:** the `Thermal` mixin itself
  (the thermal slate's Wave 1 — imminent, this is its first consumer) and the
  **drink-effect** (alertness — needs metabolism's `ingest` + consumable
  effects). `Sealable` + `Bulkable` ship today, so the real vessel is buildable
  now; the temperature lights up with Wave 1, the effect with metabolism.

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

## The coffee — a real bulk, sealed hot

Real coffee as `bulk:{material: coffee, amount}`, at a real temperature that
cools via `Thermal`. **Sealed vs unsealed is the whole mechanic:**

- **Sealed** (Gus's default): heat escapes only through the vacuum walls →
  `τ` in *hours* → the coffee stays hot all shift. The exterior reads ≈ ambient
  (the insulation observable as the *absence* of outside heat).
- **Unsealed:** the open mouth is a thermal hole the vacuum can't cover
  (convection + evaporation) → `τ` drops to *minutes* → it cools fast. You can
  measure and drink it only when open — and opening it is exactly when it
  starts going cold.

So a sealed thermos genuinely preserves the coffee, and **measuring it requires
opening it** (the cool sealed exterior tells you nothing — which *is* the
insulation working). No fake: the coffee is a real modeled bulk; the only banked
piece is the drink-*effect* (metabolism).

---

## Gus never opens it — the break that never comes

The **won't-open** of the sit/set/open/cross quartet — and now the beat is
**backed by simulation, not just fiction.** Because the thermos stays sealed,
the coffee really does stay hot for hours; the break never goes cold *because he
never opens it.* The character beat and the thermodynamics reinforce each other:
every moment he doesn't unseal it he's preserving the heat, and the one time he
would open it — the break he never takes — is the one moment it would start to
cool. The vacuum flask is the perfect vessel for a deferral: it makes *later*
stay possible for hours, and he never takes it — the cup forever saved for a
later that doesn't arrive.

---

## Placement

Lean: it sits **on the relief's chair** — the unsipped coffee waiting on the
unsat seat; the break and the relief that both never come, grouped on one
piece of furniture. (Dial: clipped to his belt, or by the post, if the
grouping reads too cute.)

---

## What this surfaces / banks

- *(real now)* the **vessel + contents** — `Sealable` + `Bulkable` holding real
  coffee bulk; `open`/`close`/`pour`/`drink` all shipped. Buildable today.
- *(needs `Thermal` — imminent)* the **thermal layer** — the coffee cools,
  sealed vs unsealed. Full model now lives in
  `docs/slates/builds/thermal-slate.md`; **Gus's thermos is its named first
  consumer.** Lights up when the `Thermal` mixin (Wave 1) lands.
- *(banked — metabolism)* the **drink-effect** — alertness/warmth on drinking,
  via a consumable effect-list (`ingest` + consumable effects). The one
  genuinely-deferred piece, and the half Gus never triggers.
- Reuses, shipped: `Thing`, `Sealable`, `Tangible`, `Detailed`, `Bulkable`,
  global `open`/`close`/`pour`/`drink`. Adds: **`Thermal`** (Wave 1).

---

## The thermal layer (real — the first `Thermal` consumer)

*The coffee is a modeled bulk (bulkable shipped); this lights up with the
`Thermal` mixin (slate Wave 1). Captured here; owned by the thermal slate.*

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
- **Sealed vs unsealed (the mechanic).** `Sealable` state gates the *effective*
  barrier: sealed → `vacuum` (`τ` in hours); unsealed → ≈`none` (open mouth =
  convection + evaporation, `τ` in minutes). Open/close is a re-stamp event, so
  the cooling rate is real physics, not just flavor.
- **Measurement:** explicit `getContentsTemperature()` / `getSurfaceTemperature()`
  methods (the contract). A sealed flask exposes only its surface (≈ ambient),
  so checking the coffee means *opening* it — which is exactly when it starts
  cooling fast. (Checking isn't free.)
- Fluid-agnostic — a gas bulk cools the same.

**Substrate home.** The full model now lives in **`docs/slates/builds/thermal-slate.md`**
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
