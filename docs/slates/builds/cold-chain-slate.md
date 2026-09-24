# Cold-chain slate (working doc)

> **Status: UNBUILT** — blood shelf life is temperature-driven TODAY (a
> stored unit's spoilage rides the holder's `ThermalMixin`, so a cold
> PLACE already preserves it — spoilage.md / thermal.md), but there is no
> way to MAKE cold and no carried cold storage. This is the cold mirror of
> the fuel → fire → furnace chain.
> **Left:** cold PRODUCTION (a powered freezer on the electricity tier, or
> harvested winter ice / a seasonal ice-house) · cold STORAGE (a cold
> larder/cellar location, an insulated container, an iced cooler) · the
> cold-source COUPLE (mirror the furnace couple in `Thermal.ts`) · the
> coolant reserve + melt reconcile (mirror `FurnaceMixin`'s fuel) · the
> cached-ambient staleness handling (meltout must fan out `restamp`) · the
> tech curve (cold room → sealed insulated box → iced cooler → powered
> fridge) · first consumers (blood, food/spoilage, pharma/vaccines).

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

⭐ **A cooler is a furnace run backwards.** `FurnaceMixin` holds its
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
- `docs/subsystems/fire.md` — `FurnaceMixin` + the fuel reserve, the shape
  to mirror.
