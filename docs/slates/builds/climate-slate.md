# Climate — a realm with a real winter

**Status:** slate
**Left:** design
**Size:** medium

⭐⭐ **This realm has no winter, and the taps build is where that
stopped being invisible.** The weather field is a 295 K baseline with
roughly ±10 K annual and ±4 K diurnal deviation, so the temperature
floor anywhere, in any season, is about **276 K**. Nothing in the game
has ever frozen, and nothing ever will until somebody changes those
numbers.

Written 2026-10-01 by the taps build, which needed freeze–thaw and
could not have it.

---

## ⚠⚠ What found it, and why it is a slate rather than a bug

A real sugar maple runs on **freeze–thaw**: nights below freezing draw
the sap down and build negative pressure, days above freezing push it
back up, and the cycle is literally driven by ice forming and melting in
the xylem. It is why sugaring is a few weeks in late winter rather than
a season.

A `weather` tap window with a diurnal 273 K crossing **would never fire
once.** Authoring one would have shipped a tree that silently never ran
— the failure class the whole reachability discipline exists against —
so `acer/saccharum` ships with the daylength band it CAN have, and its
row says so in full.

⭐ **The fix is a ROW, not code.** When winter is real, maple gets a
`weather` window with a diurnal 273 K crossing and nothing in the kernel
changes. That is the first consumer, and it is the test that
`TapWindowSpec` was declared as data for the right reason.

---

## The two rows that set a temperature

The whole climate is these, which is the good news:

1. `packages/content/base-library/content/stuff/idea/biome/universe.yaml:11`
   — `_defaultTemperature: { value: 295, unit: K }`.
2. `packages/server/src/mud/platform/idea/api/WeatherLogic.ts:823`
   `solarTemperatureDeviationK` — ±10 K annual, ±4 K diurnal, a 3-hour
   lag. Read through `deviatedFieldFor` at `:1114`.

⚠ And a third fact that is not a temperature: **snow is gated by the
weather grammar, not by temperature** (`WeatherLogic.ts:431` adds to
`frozenMm`). So it can already snow at 290 K, which is its own small
dishonesty.

---

## ⭐ What moves when winter does

The reason this is a build and not a one-line edit: a dozen shipped
systems read ambient temperature, and most of them have never seen a
number below 276.

| system | what a real winter does to it |
|---|---|
| **thermal** | ⭐⭐ the Newton-cooling couple starts mattering: an unheated interior goes cold, a thermos earns its keep, `reconcilePhase` finally has a reason to freeze something. ⚠ `Coolbox` exists and has never been needed |
| **spoilage** | `f_T` collapses — ⭐ **winter IS the preservation technology**, and a cellar becomes a thing you want rather than a flavour |
| **freshness / water activity** | drying stalls (`stallBelowK: 273` is already authored on three profiles and has never fired) |
| **soil** | moisture stops moving; the `Winter` reconcile exists and is under-exercised |
| **husbandry** | `cold` becomes a real limiting factor rather than a theoretical one |
| **metabolism** | ⚠⚠ the naked-Cast-starves finding gets worse: an unfed body in a 265 K night is a dead body, and the dials are already ~10× off |
| **exertion** | wind chill, and a reason to own a coat |
| **textiles** | ⭐ the `clo` ladder and the covering model finally have a load case. Wool's `insulating` tag starts paying |
| **watershed** | snowpack and the melt freshet are modelled and have never run |
| **taps** | maple's freeze–thaw opener — this slate's first consumer |

---

## Open questions

1. **How cold, and where?** A single realm-wide deviation, or latitude
   bands? The celestial model already has a latitude
   (`CAMPUS_LATITUDE = 42`) that only daylength reads.
2. **Is winter a season or a PLACE?** A realm with one climate is
   simpler; a realm where the north freezes and the valley does not is
   the one that makes trade geographic. ⚠ The second is also the one
   that makes every balance number a function of where you are.
3. **Does the metabolic rebalance come first?** The naked-Cast finding
   says an unfed body dies by game-hour 7 at 295 K. At 265 K it dies
   faster, and every drive longer than four game-hours would have to
   feed its actor. That may make this build gated on the metabolism
   dials rather than the reverse.
4. **What does a player DO about it?** Lens 2's question. A winter you
   can only suffer is a worse design than a winter you prepare for, and
   preparing for it means fuel, cloth, a cellar and stored food — three
   of which are shipped and one of which (the cellar) is a row.

---

## Cross-references

- [taps.md](../../subsystems/taps.md) — the window kinds, and the maple
  row that is waiting for this
- [weather.md](../../subsystems/weather.md) ·
  [thermal.md](../../subsystems/thermal.md) ·
  [spoilage.md](../../subsystems/spoilage.md) ·
  [soil.md](../../subsystems/soil.md) ·
  [watershed.md](../../subsystems/watershed.md) ·
  [textiles.md](../../subsystems/textiles.md)
