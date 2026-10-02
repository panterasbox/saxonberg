# Cold-chain slate (working doc)

> **Status: PARTIAL** — ⭐ the **passive rung shipped** with the
> placement build (2026-09-28, MR !302): `CoolboxMixin` +
> `platform/thing/Icebox`, the cold-source COUPLE (`Thermal.holderK()`,
> the cold twin of `heatSourceK`, plus the lent-insulation clause in
> `effectiveR()`), the melt reconcile (⚠ and the ambient DRIVER it
> turned out to be missing — nothing in the world melted from being
> warm), and a repaired `coldStorage` archetype satisfier that had been
> wrong on both rungs. → [thermal.md](../../subsystems/thermal.md) ·
> [spatial.md](../../subsystems/spatial.md) ·
> [furnishing.md](../../subsystems/furnishing.md).
> ⭐⭐ **And the ACTIVE rung shipped 2026-10-01** (the cold-storage build,
> MR !320): `ClimateControlMixin` over `Powered` (the one mixin a fridge
> and a walk-in both compose), the electric freezer that MAKES ice, the
> CARRIED cooler, the cold ROOM as a Location, and blood as the first
> consumer — the powered blood fridge in the ward. →
> [thermal.md](../../subsystems/thermal.md) ·
> [energy.md](../../subsystems/energy.md).
> **Left:** ⚠ **the preindustrial ice trade** — the seasonal ice-house,
> the iceman, and **who SELLS ice** (the icebox still consumes a good
> nobody makes; deferred by user decision to its own build, the cold
> twin of trade-fuel) · the `Chamber` compartment (a fridge's freezer
> half shipped as `props:` this build; the own-air compartment →
> fridge-design-pack, and ⚠ see
> [chambered-vessels-slate](../tails/chambered-vessels-slate.md),
> written 2026-09-25 for the same problem — **possible duplicate ground**)
> · the coolant reserve as a `BurnerMixin`-shaped fuel analogue (the
> shipped model uses a discrete `Meltable` block instead, which may be
> enough) · first consumers beyond food & blood: pharma/vaccines.
> **Size:** a build (what is left is the ice trade).
>
> ⭐ **Tidiness note (from the retired cold-storage plan):** `ice-block`
> lives in `generic-objects` but its only producer-row is base-library's
> `water.yaml` (`castTemplate`); the cross-pack ref works, but the row
> could move to base-library for cohesion whenever the ice trade is built.

## Why it deferred out of clinical-medicine (user direction, 2026-09-24)

Reviewing the blood loop at the 12× time scale (a carried WARM unit spoils
in ~6 real hours), the question was whether to build cold storage so a
medic can carry a cooled unit. Two reasons it is a whole build, not a
content drop, and the user's call was **defer**:

1. **It's the cold half of a chain that does not exist.** A reusable ice
   pack must be FROZEN somewhere — a sub-zero source we have not built (a
   powered freezer = the electricity tier; or harvested winter ice = a
   seasonal ice-house). Shipping ice packs with no way to freeze them is a
   faucet-from-nowhere, the exact antipattern the metal chain retired
   (*iron from nowhere makes the whole chain optional*).
2. **The physics has to actually preserve, not just appear to.** An ice
   pack in a box only cools the bag through a **cold-source couple** (the
   mirror of the furnace couple: *a source that HOLDS you outranks the
   biome*, `Thermal.restamp`), the box's melt has to reconcile on the same
   clock as the freshness read, and the **cached-ambient staleness** has
   to be handled — otherwise the blood "lasts" because nothing re-stamped
   it, which is a lie, not preservation. That is a kernel sub-build.

## The mechanism, when it is built

⭐ **A cooler is a furnace run backwards.** `BurnerMixin` holds its
contents HOT while it has a `'fuel'` reserve (burning down over game-time);
a `CoolerMixin` holds them COLD while it has a `'coolant'` reserve (melting
over game-time, faster in a warm environment). Both are *thermal sources*
with `getHeldTemperatureK()` + an active flag; `Thermal.heatSourceK()`
generalizes to read either. The bag inside reads the cooler's cold held
temperature as its ambient (containment move → `restamp`), cools toward it
over its own `τ = R·C`, and its freshness reconciles at the cold temp.
When the coolant melts out, the couple returns null and the meltout must
fan out `restamp` over the contents (the furnace burnout precedent), or
the bag stays cached-cold forever.

## The tech curve (lens 5 — the mechanism holds, only the dynamics change)

- **A cold room / cellar / larder** (base) — a Location with a cold biome
  temperature; a unit left there lasts. Buildable today (a room row); the
  only piece that could ship early if wanted.
- **A sealed insulated container** (passive) — the thermos/`Flask` shape
  (`SealableMixin`, τ in hours): a cold unit put in warms slowly. Slows,
  does not hold.
- **An iced cooler** (active) — the insulated box + a coolant reserve
  (ice): holds cold while the ice lasts. The medic's carried loadout.
- **A powered refrigerator** (tech epoch) — the electricity subsystem
  maintains cold indefinitely. A snow-cellar → an icebox → a fridge, one
  mechanism.

## First consumers (why this is not blood-only)

Blood is the sharpest consumer (a unit spoils in real-hours at 12×), but
the cold chain serves **food** (`spoilage.md` already reads temperature —
a cold larder is a preservation subject, not a flag), and later
**pharma/vaccines** (`pharma-slate` credence goods with a cold-chain
integrity story). Name the substrate for the chain, not for blood.

## Cross-references

- `docs/subsystems/thermal.md` — the furnace couple to mirror; `τ = R·C`;
  the cached-ambient decision.
- `docs/subsystems/spoilage.md` — freshness is already a temperature
  question; `docs/subsystems/blood.md` — the unit that spoils.
- [blood-slate](./blood-slate.md) — the blood economy this eases at 12×.
- `docs/subsystems/fire.md` — `BurnerMixin` + the fuel reserve, the shape
  to mirror.


---

## ⭐⭐ 2026-09-25 — the fridge needs chambers, and that is its own substrate

Raised while designing beekeeping and recognised as the same problem: **a fresh
compartment and a freezer are two temperatures on one appliance**, and the
envelope build put `envelopeTemperatureK` on **`AtmosphericMixin`**, which is
**per host**. So one Stuff cannot hold two setpoints, and a refrigerator is
**not** one container — it is a cabinet that owns two enclosed, sealable
chambers, each with its own `EnclosureSpec { material, thicknessM }` and its own
U-value.

Full design → **[chambered-vessels-slate](../tails/chambered-vessels-slate.md)**.
The three things this build should know before it plans:

1. ⭐ **`ChamberedMixin`, not a `MultiChamberedVessel` class.** Every candidate
   base already computes from a mixin chain, and an oven with racks is built on
   `Vessel` too — so a subclass forces *every* oven to be chambered. Mixins
   union; base classes force one spine.
2. ⚠⚠ **The UX cost is about DEPTH, not about chambers.** The MQL `peers` leg is
   explicitly **one level** into an open container, and its comment says the
   limit exists so the pool *"must agree with what `PerceptionApi.canReach`
   grants."* So `room → fridge → freezer → the milk` puts the milk **out of
   scope**. The narrow fix is *a part is not a level* — a declared division is
   transparent for depth, bounded at **one** level so a part of a part stays
   opaque — and it must land in `scope-walk` **and** `canReach` together.
   ⭐ **This build is consumer one**, so it is legitimate to skip it and live
   with `open freezer` + `take the milk from the freezer` (MQL's `from <holder>`
   clause sidesteps the scope pool), leaving transparency to become a
   third-consumer promotion once the drawers, the wardrobe and the oven want it.
3. ⭐ **The free trick:** if the **primary** chamber's keywords include
   `fridge`/`refrigerator` and the freezer's do not, then `put the milk in the
   fridge` binds with **no engine change** — the handle chain already resolves
   authored keywords.

⚠ And the one piece of real work either way: **a describer that speaks a host's
declared parts AS parts**, so a room reads *"a refrigerator, its freezer door
shut"* rather than listing a refrigerator and a freezer as siblings. The
precedent (`distinguishing` = *"+ what they are wearing"*) is body-shaped, so
whether the generic describer does this is unverified — and it is the thing the
whole UX turns on.
