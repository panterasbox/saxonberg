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
> ⭐⭐⭐ **The preindustrial rung is an RGO, it is PROMOTED, and its
> blocker is CLIMATE** (2026-10-08, § end): ice is a seasonal harvested
> resource whose reservoir is the weather field — and **the realm's
> coldest hour is 281 K against water's 273**, so nowhere freezes and the
> only ice in the game comes from the electric freezer. The mechanism is
> built; the winter is not.
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

---

## ⭐⭐⭐ Ice is an RGO, and the realm has nowhere cold enough (2026-10-08)

Two findings from the RGO-track pass, and they belong together because the
second is the only thing standing between this slate and a build.

### 1 · The classification nobody had made

> *"I actually never considered the ice trades as an RGO but you're
> absolutely right they are."* — user

A seasonal harvested natural resource is an RGO by the law's own test:
**reservoir** (a frozen pool, a cold region), **recharge** (winter),
**act** (cut and haul), **credit** (the harvester). So the ice trade joins
the RGO track rather than sitting beside it, and it brings two firsts:

- ⭐⭐ **The first RGO whose reservoir is the CLIMATE itself.** Every other
  reservoir is a place you can walk to and point at — a seam, a bed, a
  reach, a stand. Ice's reservoir is a *condition*, and it is gone in
  April.
- ⭐ **The first whose recharge is a SEASON rather than a rate**, which
  lands on `TapWindowSpec`'s `photoperiod` / `rising` machinery instead of
  a half-life. The ice-house is then the storage that arbitrages the
  window — the whole trade is *buy the season, sell the year*.

⭐⭐ **And it inverts the epoch ladder.** Every other trade ships its
medieval rung and is missing both ends ([rgo-unification-slate
§ *Foraging is a MODE*](./rgo-unification-slate.md)). The cold chain is the
only one that shipped its **industrial** rung first — `ClimateControlMixin`,
the electric freezer that MAKES ice, the carried cooler, the cold room (MR
!320) — and is missing the **preindustrial** one underneath it. So this
build demonstrates the three-rung ladder from the top down, and it is the
cheapest available proof that the ladder is real rather than a framing
device.

### 2 · ⛔⛔ The blocker is CLIMATE, and it is not what this slate assumed

The mechanism is **entirely built**. `water.yaml` carries
`meltingPoint: 273` and `castTemplate: /stuff/thing/ice-block`;
`reconcilePhase` is bidirectional and got its ambient driver in the
placement build; the pan, the blocks, the bin, the bag and three iceboxes
all ship. A pool of water that gets cold enough mints a carryable block
today, with no new code.

> **Nothing in the realm ever gets cold enough.**
> [weather.md](../../subsystems/weather.md) § *the solar term*: **a winter
> night lands near 281 K.** Water freezes at **273**. The realm's coldest
> hour is +8 °C.

So the only ice that can exist today comes out of an **electric freezer** —
exactly backwards from the preindustrial trade this slate wants, and the
reason *"the icebox still consumes a good nobody makes"* has survived two
builds that each thought they had addressed it.

⭐ **That makes this build a weather/biome build with a trade on top**, which
is the user's own reason for promoting it:

> *"I believe it would also help us round out our designs and
> implementations on the weather and biome front."*

Right, and more so than expected — the ice trade **cannot be designed
without deciding where winter actually bites**, which is a question the
weather field has been able to defer precisely because nothing consumed a
freezing temperature. Two honest shapes, and the choice is a real one:

| shape | what it means | cost |
|---|---|---|
| **a colder winter** | the solar term's floor drops below 273 for part of the year, realm-wide | touches every thermal consumer at once — bodies, crops, livestock, stored food |
| ⭐ **a cold PLACE** | a region (upland, northern reach) whose climate lean crosses 273 while Terminus does not | localised, rides the shipped climate-lean seam, and makes the ice trade a **place** with a cartage problem — which is what the real trade was |

The second is almost certainly right: it keeps the blast radius small, it
makes the iceman's cost structure honest (ice is cheap at the lake and dear
in town), and *"Terminus and Rejection get the same winter on the same day"*
is already flagged in `weather.md` as a limitation rather than a feature.

### 3 · The demand is real and already priced

Not a speculative market — the consumers ship and the arithmetic is
already in the docs:

- ⭐⭐ **Blood.** [blood.md](../../subsystems/blood.md): a drawn unit keeps
  **~3 game-days at 293 K and ~4 game-weeks in a cold larder**, so *"warm
  blood can't be hoarded but cold blood buys a hunt."* The ward's powered
  fridge shipped with the active rung — but a **medic in the field** has
  a `Coolbox` and nothing to put in it. User's framing: *"medics are going
  to need to pack blood for the rest of the party in case anything goes
  wrong and until electric cooling that means ice."*
- **Food.** The whole `FreshnessMixin` clock plus the hurdle stack, and a
  larder whose cold is currently a property of the room rather than a good
  anybody sells.
- **Hospitality.** `IceBin` ships in `trade-hospitality` and the drinks
  recipes want it.

⚠ **It blocks nothing.** Nothing on the drilling or foraging track needs
ice, and no shipped capability is waiting on it — the gap is a shipped
**consumer with no producer**, the same class as the gas bladder, not a
missing mechanism. So it is promotable on demand rather than on dependency:
⭐ it is an **unblocker**, not a blocker — the weather work it forces is
owed to the sward, the cold larder and the spoilage hurdles regardless.

**Priority: promoted (user, 2026-10-08)** — onto the RGO track with the
rest, ahead of foraging, orderable freely against drilling.
