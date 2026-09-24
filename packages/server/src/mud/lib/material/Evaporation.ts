/**
 * Evaporation — ⭐ **how fast water leaves matter in a particular air**,
 * as one number, computed in one place.
 *
 * Two subsystems want the same answer and must not each invent it: the
 * per-instance water state ({@link WaterActivityMixin} — a ham on a rack, a turf
 * in a stack) and the durative transform ({@link MaturingMixin}'s
 * `evaporative` mechanism — a salt pan in the sun). Both ask *how dry is
 * this air, and how hard is it working*, and both get it from here.
 *
 * ⭐ **The physics, and it is the lesson.** Evaporation needs a **vapour
 * deficit** — somewhere for the water to go. Three terms multiply:
 *
 *   - **the deficit** — `(equilibrium − humidity) / equilibrium`. At
 *     equilibrium the factor is **zero**: nothing dries in saturated air,
 *     however windy or hot. This is the term that makes a damp cellar
 *     preserve nothing and an August wind preserve well, and it is
 *     *derivable* — a player who knows evaporation needs dry air predicts
 *     the drying shed, the rainy week and the steamy kitchen correctly
 *     without looking anything up.
 *   - **the wind** — moving air carries the saturated boundary layer away,
 *     so a breeze roughly doubles the rate at {@link AIR_WIND_REF_MS}.
 *     Linear, not exponential: a gale is not a kiln.
 *   - **the heat** — a rough doubling per 10 K, the Arrhenius shape the
 *     spoilage kill curve already uses. ⚠ **Capped at 373 K**: water does
 *     not get hotter than boiling, so a hotter fire boils faster only by
 *     delivering more heat, never by exceeding the physics.
 *
 * ⭐ **The `equilibriumRhPct` argument is what makes one object serve both
 * consumers.** Pure water is in equilibrium with saturated air (100 %), so
 * a ham dries whenever the air is below saturation. A *saturated brine* is
 * in equilibrium with much drier air — {@link BRINE_EQUILIBRIUM_RH_PCT} —
 * which is precisely why solar salt works in Cádiz and not in Cornwall.
 * Same arithmetic, one argument, and the geography lesson falls out.
 *
 * ⚠⚠ **No statics, deliberately.** `scripts/check-lib-statics.ts` counts
 * *every* public static on an exported `lib/` class against a ceiling that
 * may fall and never rise — type-level construction helpers included. So
 * this class is constructed with `new Evaporation(...)` and answers
 * questions on instances. There is no `Evaporation.of`.
 *
 * See [docs/subsystems/spoilage.md] and [docs/subsystems/maturation.md].
 */

/**
 * Wind speed (m/s) at which the wind term doubles the rate. A stiff
 * breeze — the speed a drying green or a washing line is built for.
 */
export const AIR_WIND_REF_MS = 5;

/**
 * Relative humidity (%) a **saturated brine** sits in equilibrium with.
 * Below this the pan concentrates; above it, it does not — which is the
 * whole reason coastal salt is a dry-climate industry and why a wet week
 * sets a saltern back.
 */
export const BRINE_EQUILIBRIUM_RH_PCT = 75;

/** Reference temperature (K) the heat term is normalised at — 20 °C. */
const AIR_TEMP_REF_K = 293;

/** Kelvin per doubling of the rate — the Arrhenius-shaped ramp. */
const AIR_TEMP_DOUBLING_K = 10;

/**
 * The boiling cap (K). Water in an open vessel does not exceed this
 * however hot the fire is, so the heat term stops climbing here.
 */
const AIR_BOIL_CAP_K = 373;

export class Evaporation {
  /**
   * @param humidityPct relative humidity of the air, `%`.
   * @param windMs air speed across the surface, `m/s`.
   * @param tempK air (or matter) temperature, `K`.
   */
  constructor(
    public readonly humidityPct: number,
    public readonly windMs: number,
    public readonly tempK: number,
  ) {}

  /**
   * The multiplier a drying rate is scaled by in this air. `0` means
   * nothing dries — the air is at or above the matter's equilibrium.
   *
   * @param equilibriumRhPct the relative humidity this matter is in
   *   equilibrium with. `100` for ordinary water (a ham, a turf, a
   *   plank); {@link BRINE_EQUILIBRIUM_RH_PCT} for a saturated brine.
   */
  public evaporationFactor(equilibriumRhPct = 100): number {
    const eq = Number.isFinite(equilibriumRhPct) ? equilibriumRhPct : 100;
    if (!(eq > 0)) return 0;
    const h = Number.isFinite(this.humidityPct) ? this.humidityPct : eq;
    const deficit = (eq - h) / eq;
    if (!(deficit > 0)) return 0;

    const wind = Number.isFinite(this.windMs) && this.windMs > 0 ? this.windMs : 0;
    const windTerm = 1 + wind / AIR_WIND_REF_MS;

    const t = Number.isFinite(this.tempK) ? Math.min(this.tempK, AIR_BOIL_CAP_K) : AIR_TEMP_REF_K;
    const heatTerm = Math.pow(2, (t - AIR_TEMP_REF_K) / AIR_TEMP_DOUBLING_K);

    return deficit * windTerm * heatTerm;
  }

  /**
   * Whether matter at this moisture would **gain** water in this air
   * rather than lose it — the fork the two-way arm takes. Moisture is the
   * fraction of the material's own water still in it, and air of `h %`
   * holds matter at `h / 100`.
   */
  public rewets(moisture: number): boolean {
    const h = Number.isFinite(this.humidityPct) ? this.humidityPct : 0;
    return moisture < h / 100;
  }
}
