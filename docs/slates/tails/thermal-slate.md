# Thermal slate (working doc)

Working slate for a generic **`Thermal` capability** — objects that **hold a
temperature and exchange heat with their environment**, drifting toward
ambient over time. Surfaced by Gus's thermos (a vacuum flask keeping coffee
hot), but it's **cross-cutting substrate**: vitals (body core temp, corpse
algor mortis), bulkable (hot/cold drinks), and future content (ovens, forges,
coolers, hot stones) all consume it. Today it's **scattered and gapped** —
ambient lives in biome, the `K` thermal scale in quantities, corpse-cooling
inline in vitals — with **no generic object-thermal capability**. This slate
is that home.

> **Surfaced by:** `docs/staging/eternal-university/objects/thermos.md`
> (the worked model lives there as content; this is its substrate home).
> **Audit (2026-06-07):** confirmed gaps below against bulkable / vitals /
> biome / quantities / race.

---

## What exists vs. what this adds

**Exists (reused):**
- **Ambient temperature** — `biome.md` `resolveTemperatureFor(scope, detail?)`,
  the biome→room→detail chain. *(per-room + per-detail)*
- **`Quantity<'K'>` thermal scale** — `quantities.md` (freezing→boiling tags;
  YAML ready, pending a consumer).
- **Corpse cooling (algor mortis)** — `vitals-slate.md`, but **body-specific**,
  a postmortem progression on the vitals cadence, *not* a generic model.

**Gap (this slate adds):**
- the generic **`Thermal` capability** (object temperature + cooling), for
  arbitrary objects, not just bodies;
- **thermal conductivity** as a material property (race.md lists it deferred)
  and a medium property (biome's media carry only density);
- **object temperature-read methods**.

---

## The `Thermal` capability

A mixin composed on any object that holds a temperature distinct from ambient —
**orthogonal to whatever else it is** (a vessel, a body, a stone). It holds:

- a **stamped temperature** `(T0, t0)` — value + the world-clock instant it was
  stamped;
- a **`barrier`** — an optional medium reference (vacuum / air / none; default
  **none**). The *wall* is the object's existing `Tangible` material — not a
  separate field.

Composes with, never inside, other capabilities: **`Thermal` ⊥ `Drinkable`**
(a thermos is both; a cooler is `Thermal`-not-`Drinkable`; a paper cup is
`Drinkable`-not-`Thermal`).

---

## The cooling model

**Lazy Newton's cooling on read** — the watch's store-and-compute pattern, no
ticking:

```
T(now) = ambient + (T0 − ambient) · e^(−(now − t0) / τ)
```

- `ambient` from `BiomeApi.resolveTemperatureFor(scope, detail?)`.
- **Re-stamp on ambient change** (vessel changes rooms, room temp shifts):
  freeze current `T` under the *old* ambient → new `(T0, t0)`, continue under
  the new ambient. Piecewise-exponential; the only events that touch it are
  discrete ambient changes.

**`τ = R · C`:**

- **`C`** (thermal mass) `= mass × specific_heat`. Mass from `Tangible`
  (or, for a vessel's fluid contents, the `Drinkable` volume × density);
  specific heat a material property. *Consequence for free: more contents →
  larger `C` → slower cooling.*
- **`R`** (insulation) `= series sum`: the **`barrier` medium's conductivity**
  (dominant) + the **wall = `Tangible` material's conductivity** (minute term).
  No geometry — **tabulated effective resistivities**, vessel-*type* constants
  tuned to realistic hold-times. Barrier dominates; the wall material is the
  minute correction (so glass vs steel vessels differ slightly).

---

## Extensions to existing substrate (name these in requirements)

- **`race.md` (Material):** add **`thermalConductivity`** — already listed as
  deferred design intent ("…conductivity…"); graduate it to a real property.
  Steel high, glass lower, ceramic lower. Does double duty with density:
  density→mass, conductivity→insulation.
- **`biome.md` (media):** the air/water/vacuum table carries only density; add a
  **conductivity column**. **Vacuum gets a tiny *nonzero* conductivity** —
  real vacuum leaks via radiation, and the cap/neck leak lumps in — so
  insulated vessels cool **slowly, not never**. (Modeling the null explicitly,
  as biome already does for vacuum's density.)
- **`quantities.md`:** the conductivity unit (`W/(m·K)`) — quantities already
  flags heat as a future channel.

---

## Surface (methods, the contract)

- `getTemperature()` — the object's own temperature.
- `getContentsTemperature()` — for vessels, the held fluid's temperature.
- `getSurfaceTemperature()` — the exterior (≈ambient for a well-insulated
  vessel — the insulation observable as *absence* of exterior heat).

Explicit methods, **not** state-inference. Diegetic gating (a *sealed* vessel's
contents aren't externally measurable — `measure` says so) rides on top as
flavor, never as the load-bearing path.

---

## Consumers

- **The thermos** — `Thermal` (barrier = vacuum) + `Drinkable`; first content
  consumer (when bulkable lands).
- **Vitals** — body core temperature and **corpse algor mortis** are `Thermal`
  consumers (cool toward biome ambient). Open: does the body use `Thermal`
  directly or layer a richer model on it? *(pin at build.)*
- **Future** — ovens / forges / fire (a heat **source** *warms* toward a
  raised local ambient — the model is symmetric: drift toward an effective
  ambient), coolers, hot stones, a corpse, a cooling forge.

---

## Honest scope (the abstraction)

The **skeleton is real** (lumped-capacitance Newton's cooling, `τ = R·C` — the
standard first-order model); the **parameters are tuned**:

- **Lumped capacitance** — one uniform temperature per object, no internal
  gradients.
- **Tabulated effective `R`** — no thickness/area geometry; vessel-*type*
  constants fit to realistic hold-times; radiation/neck/wall-conduction all
  lumped into the tabulated numbers.
- **Single barrier + single wall** per object (two-wall flask lumps to one
  wall term — minute anyway).

"Honest engineering numbers, game-tuned" — not CFD.

---

## Open questions

1. **Body vs generic** — vitals uses `Thermal` directly, or a richer layered
   body-thermal model on top? *(Lean: corpse/inert-body cooling uses `Thermal`;
   living-body thermoregulation is vitals' own, reading `Thermal` for the
   passive term.)*
2. **Heat sources** (warming, not just cooling) — symmetric drift toward a
   raised effective ambient near a source, or a separate driver? *Defer; note
   the symmetry.*
3. **Phase change** (boiling, freezing, evaporation) — defer.
4. **`R` granularity** — vessel-type constants (lean) vs per-instance.
5. **Conductivity unit/scale** placement in `quantities.md`.

---

## Build order

- **Wave 1** — the `Thermal` mixin (`(T0,t0)` + `barrier`); lazy cooling-on-read
  + re-stamp; `τ = R·C`; the material + medium conductivity extensions; the
  temperature-read methods. First consumers: the thermos (with bulkable) and
  corpse algor mortis.
- **Wave 2** — heat sources (warming); richer consumers (ovens, forges).

---

## What this slate does NOT cover

- **Drainable fluid / `Drinkable`** → `bulkable-slate.md` (composes alongside).
- **Consumable effects** (warmth/alertness *on drinking*) → `vitals-slate.md`.
- **Ambient temperature** → `biome.md`.
- **The `K` thermal scale** → `quantities.md`.
