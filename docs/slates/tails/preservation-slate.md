# Preservation slate — spoilage, the counterplay, and the agricultural year

> **Status: PARTIAL** — the spoilage engine (Freshness · Contaminable ·
> Cured), salt, the salt-cure recipe and drying all shipped
> → [spoilage.md](../../subsystems/spoilage.md)
> **Left:** the acidity term `f_pH` (pickling as a `MaturationProfile` row
> + one read; ⚠ inherits the fermentation/spoilage `Vat` collision —
> absorbed from food-safety 2026-09-21) · the sealing decision (binary until a consumer wants a
> hurdle multiplier, never a flora model) · the agricultural year (winter
> stores) · the trade geography spoilage creates · salt as a mined and
> taxed staple
> **Size:** a wave

See also — the chain: [fishing](../tails/fishing-slate.md) (the driver) ·
[mining](../builds/mining-slate.md) (**salt** — the counterplay and a taxed staple) ·
[farming](../builds/farming-slate.md) (winter is meaningless without this) ·
[ranching](../builds/ranching-slate.md) (meat + dairy) ·
[crafting](../builds/crafting-slate.md) (the preserving branch) ·
[economy](../builds/economy-slate.md) (**Law 2** — read it first) ·
[disease](../builds/disease-slate.md) (**the same equation** — see below) ·
[food-safety](../builds/food-safety-slate.md) (the endeavour half, shipped;
its `f_pH` attach point absorbed here 2026-09-21). Substrates:
[metabolism.md](../../subsystems/metabolism.md) (the toxicity socket
+ `ptomaine`) · [weather.md](../../subsystems/weather.md) (**the wetness
  gauge**) · [thermal.md](../../subsystems/thermal.md) ·
  [biome.md](../../subsystems/biome.md) (**the atmosphere walk — temperature
  *and humidity***) ·
  [materials-response.md](../../subsystems/materials-response.md) (the pre-named
  `corrosion` channel) · [crafting.md](../../subsystems/crafting.md)
  (`Durable`/`Keen` — the two-axis precedent). Prior sketch:
  [metabolism-slate](../tails/metabolism-slate.md).

---

*(§ Law 2 · § The mechanism · § What the drivers actually cost — shipped.
The clock-starts-at-an-act clearance, the per-material Arrhenius `Ea`,
`ThermalMixin` beside the gauge on `Provision`, and the per-instance water
state are in [spoilage.md](../../subsystems/spoilage.md) § The gauge,
§ The rate law, § The water state. ⚠ Wetness was NOT the carrier —
`CuredMixin` is, and the doc says why.)*

---

## The counterplay

*(The method table shipped — `cure`/`dry`/`smoke` in `trade-cooking`, cold
through `Thermal`, and an `a_w` floor that genuinely DOES stop the clock →
[spoilage.md](../../subsystems/spoilage.md) § The water state. Acidity is
the one lever still absent — below.)*

### ⭐ Terms, not methods — the completeness doctrine

*(Captured 2026-09-02 from the [cooking-slate](../builds/cooking-slate.md)
conversation, where the same move settled the cooking-method vocabulary:
derive, don't declare.)*

The table above stops one rung short of its own conclusion. "Every real
preservation method is a rate reducer" means **nobody designs the set of
methods — you design the set of TERMS in the growth law, and methods
derive.** The law is `μ = μ_max · f_T(T) · f_aw(a_w)` plus the load `N`
a kill step resets, and the whole zoo of real-world methods collapses
onto about four levers:

| lever | real methods that are "just" this lever | ships in |
|---|---|---|
| **temperature** (`f_T`) | cold storage, cellaring, freezing (the floor) | the spoilage core (cooking build W0) |
| **water activity** (`f_aw`) | salting, curing, drying, jerky, **sugar preserves/jam, honey** | the spoilage core — one term carries all of these |
| **load reset** (kill `N`) | cooking's kill step; sterilization | the cooking build |
| **acidity** (`f_pH`) | pickling, vinegar, lacto-fermented anything | ⭐ the one genuinely missing term — **this build's** |

The composites need **no new term**: **smoking** = drying + a surface
antimicrobial hurdle (the shipped `smoke` atmosphere tag); **canning** =
kill step + sealed vessel — a *combination* of levers that both already
exist; **confit** = kill step + fat as an air seal; **alcohol** lumps
with acidity as chemistry the microbes hate.

Two consequences:

1. **Acidity's carrier already ships.** Pickling and lacto-fermentation
   are durative transforms in a vessel — literally `MaturingMixin`
   ([maturation.md](../../subsystems/maturation.md)): profiles,
   cultures, strains, the cellar. The pickling branch is a
   `MaturationProfile` row plus an acidity read feeding `f_pH`, not a new
   subsystem.
2. **Sealing stays binary on purpose.** Honest oxygen means splitting
   the flora into aerobes and anaerobes, and anaerobic sealed-jar
   failure is *botulism* — a second toxicity model. When a consumer
   demands sealing physics it lands as a hurdle multiplier, never a
   flora model.

#### Absorbed from food-safety-slate — the `f_pH` attach point

*(Moved here at the 2026-09-21 cluster pass; this section is the lever's
one home. The collision it names is documented at
[spoilage.md](../../subsystems/spoilage.md) § ⚠⚠ Fermentation is the one
collision to watch — a vat that tabulates an `Ea` will read its own
ferment as rot — and the profile class is `MaturationProfile` today
([maturation.md](../../subsystems/maturation.md)); the moved text's
`FermentProfile` is its older name.)*

- **`f_pH`** — the fourth hurdle beside temperature, water activity and time.
  A `FermentProfile` row plus one read. ⚠ Inherits the unresolved `Vat`
  name collision.

**Completeness, concretely: the term set is small and finishes in two
builds** — `f_T` + `f_aw` in the spoilage core, the kill step with
cooking, `f_pH` here. After that any method anyone names — authored or
player-invented — is *checkable against the equation* rather than
needing design work; when free-form play arrives, "I smoke the fish
over the campfire" has an honest answer because the levers compose, not
because somebody enumerated smoking.

And the term framing sharpens the trade identity rather than
threatening it: cooking owns the kill step, fermentation owns the
vessel, but the victualler's craft is **hurdle stacking** — salt cod is
drying + salting; a proper cure is salt + smoke + time. Stacking is
what a trade practices; a term is what an engine models. The
trade=mechanism / locality=expression split, one level down.

---

## The agricultural year falls out **[the best consequence]**

Because the rate is temperature-modulated and temperature is seasonal, the year
organises itself with nothing scripted:

| Season | Production | Keeping |
|---|---|---|
| **Spring–Summer** | high | **poor** — warm means fast spoilage |
| **Autumn** | the harvest | the **preserving** season — the year's busiest work |
| **Winter** | none | **excellent** — cold is free refrigeration |

> **Summer produces but does not keep. Winter keeps but does not produce.
> Preservation is the bridge, and autumn is when you build it.**

Emergent rather than authored — the inversion falls out of a temperature-driven
rate against [farming § Winter](../builds/farming-slate.md)'s 7.5-real-day, globally
synchronised season.

**It also solves the fridge problem.** If cold storage were cheap year-round,
everyone digs a cellar and spoilage is over. But a cellar is nearly free in
winter and dear in summer — the pressure inverts exactly when it must.

---

## Spoilage creates the geography of trade

> **Without spoilage, distance is only travel time. With it, perishable goods
> have a *range*, and preserved goods can cross it.**

That is why salt cod existed — and both [mining](../builds/mining-slate.md) and
[fishing](../tails/fishing-slate.md) already name the salt-cod route as their
interlock. Preservation converts a map into a **trade geography**: local markets
for the fresh, long routes for the cured, and a real industry sitting between
them.

---

## Salt is the keystone commodity

Mining has already **DECIDED** it, and its reasoning runs past food:

- **Preservation is the killer app** — "before refrigeration, salt is how food
  *keeps* → the enabler of the food economy."
- **A bodily need** — electrolytes, "universal constant demand." A second,
  independent demand source metabolism can carry.
- **Money-adjacent and taxed** — *"salary" = salt*, the **gabelle**, a house or
  corpo **monopoly**; "a natural state-revenue lever."

> Spoilage does not merely unblock a crafting branch. It **activates a commodity
> designed to be a governance and taxation lever** — handing the polity-paper
> engine something real to tax and the corpos something real to corner.

---

*(§ What is blocked today · § Keeping it un-miserable · § Two divergences
· § The one real seam · § Substrate audit · § v1 scope — shipped or
history. `Grade` stays untouched by the gauge, the far-past guard and the
linkdead freeze were both dropped, and the dose is folded at the read
rather than stored → [spoilage.md](../../subsystems/spoilage.md) § The
gauge, § The ingest reach.)*

---

## Open questions

- **Where the gauge is composed.** On every `Thing` (like `WetMixin`) and inert
  unless the Material has a shelf-life constant? Or opt-in per class? *(Lean:
  universal-and-inert — it matches wetness and avoids an authoring burden, but
  it is a persisted-field cost on every object.)*
- **What the material constant actually is** — a shelf-life time constant, or an
  activation energy for a proper Arrhenius/Q10 form? *(The latter is more honest
  and reuses thermal's Q10 idiom.)*
- **Bulk vs. item.** A barrel of salt pork is bulk; a fish is an item. Does the
  gauge live on both, and does `BulkPayload` gain a freshness field?
  **→ ANSWERED (2026-09-02, [cooking-slate](../builds/cooking-slate.md) § leftovers):
  yes — for bulk contents the load lives on the `BulkPayload` and transfers
  carry it.** Vessel-borne freshness is the pour-to-reset exploit (decant
  spoiling stew into a fresh crock → free clock); payload-borne, the clock
  travels with the stew. Mixing blends loads mass-weighted (dilution is
  honestly how concentration works). Items keep the mixin gauge.
- **Does cooking reset or slow the clock?** (Real answer: both, by method — and
  a good reason for cooking to matter past nutrition.)
- **Does sealing do physics**, or stay binary? `SealableMixin` has none today.
- **Numeric calibration** — every rate. Deferred to a running game.
- **The kill re-based onto a shared integrator (one z).** Deliberately
  NOT done by the grain chain: doneness integrates browning at z ≈ 33 K
  (`ThermalDoseMixin`), the kill is an Arrhenius rate at Ea ≈ 200 kJ/mol
  (z ≈ 7 K), and one integrator would have to lie about one of them. The
  passive kill's rectangle rule is the seam if a preservation build wants
  to integrate it too.
