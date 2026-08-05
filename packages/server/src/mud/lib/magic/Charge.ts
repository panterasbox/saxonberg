/**
 * Charge — the arithmetic of stored energy that leaks.
 *
 * A charged item is a **battery** (requirements D5/D7): a maker moved
 * energy into it, it holds that energy by ordinary means, and using it
 * releases it. The magic was in *getting it there* and in the
 * specification — **never in the storage**. So ordinary energy density
 * applies, and everything true of batteries is true here, including the
 * inconvenient part: they self-discharge.
 *
 * ## Why decay is load-bearing rather than flavour
 *
 * A depleted wand is a paperweight with a socket, so **the item count is
 * the wrong quantity to bound**. Charged *capability* is a flow, and a
 * flow can be capped honestly.
 *
 * Throttling inflow alone cannot work — stock grows without bound at any
 * throttle, because nothing ever leaves. With decay it obeys
 *
 * ```
 *   dS/dt = inflow − d·S      ⟹      S* = inflow / d
 * ```
 *
 * which gives **two dials whose ratio is the answer**, and a system that
 * settles instead of inflating. Everything the item economy wants falls
 * out of that one equation: recharging becomes a recurring service,
 * competence stays valuable when items are common, wealth cannot corner
 * the found channel (what money buys is caster-labour, which is capped),
 * and shell inflation is harmless — so distribution can be generous.
 *
 * ## Two rates, not one
 *
 * Idle items **rot slowly**; used items **empty fast**. Those are
 * different bounds and they are kept separate: `decayFor` is the leak,
 * `standbyDraw` is the cost of holding something up. An always-on
 * wearable pays the second continuously, which is why it flattens a
 * charge in days where a triggered item lasts months — **always-on is
 * the expensive mode**, and it bites hardest on exactly the class most
 * prone to inflation, because people wear rings and stow wands.
 *
 * ## Units
 *
 * **Energy is kilojoules. Time is GAME seconds.** Every rate constant
 * here carries its unit in its name, because the 12× game-time factor is
 * the single likeliest place for a dishonest number to hide — a rate
 * quoted per month must be divided through before it can be compared to
 * a physical one.
 *
 * Pure, immutable, clock-free — which is what makes AC 6's convergence
 * test exact rather than approximate.
 */

export class Charge {
  /** The reserve key a charged host stores its energy under. */
  public static readonly RESERVE_KEY = 'charge';

  /** The unit that energy is, everywhere in this build. */
  public static readonly UNIT = 'kJ' as const;

  /**
   * **Exponential self-discharge.** `S(t) = S₀·e^(−d·t)` — the honest
   * shape, not a linear drain: a leak proportional to what is stored,
   * which is what a real charge separation does and what makes the
   * equilibrium above come out.
   *
   * `decayPerGameSec` is `d`. A negative or non-finite elapsed time
   * returns the input untouched rather than inventing energy.
   */
  public static decayFor(
    storedKJ: number,
    elapsedGameSec: number,
    decayPerGameSec: number,
  ): number {
    if (!Number.isFinite(storedKJ) || storedKJ <= 0) return 0;
    if (!Number.isFinite(elapsedGameSec) || elapsedGameSec <= 0) {
      return storedKJ;
    }
    if (!Number.isFinite(decayPerGameSec) || decayPerGameSec <= 0) {
      return storedKJ;
    }
    return storedKJ * Math.exp(-decayPerGameSec * elapsedGameSec);
  }

  /**
   * How much a decaying stock LOSES over an interval — the complement of
   * {@link decayFor}, spelled out because "how much did I lose" is the
   * question a report asks.
   */
  public static lossOver(
    storedKJ: number,
    elapsedGameSec: number,
    decayPerGameSec: number,
  ): number {
    return (
      storedKJ - Charge.decayFor(storedKJ, elapsedGameSec, decayPerGameSec)
    );
  }

  /**
   * **The equilibrium stock**, `S* = inflow/d`. THE number the whole
   * charge economy is built on: a world where makers push `inflow` kJ
   * per game-second into circulation, against a leak rate `d`, settles
   * here and stays. Not a cap anyone enforces — a fixed point the
   * arithmetic produces.
   *
   * `Infinity` when nothing decays, which is the honest answer and
   * exactly the failure mode D7 exists to prevent.
   */
  public static equilibrium(
    inflowKJPerGameSec: number,
    decayPerGameSec: number,
  ): number {
    if (!Number.isFinite(decayPerGameSec) || decayPerGameSec <= 0) {
      return Infinity;
    }
    if (!Number.isFinite(inflowKJPerGameSec) || inflowKJPerGameSec <= 0) {
      return 0;
    }
    return inflowKJPerGameSec / decayPerGameSec;
  }

  /**
   * One step of the stock equation, for driving the convergence proof:
   * `S + (inflow − d·S)·Δt`, floored at zero.
   */
  public static stepStock(
    stockKJ: number,
    inflowKJPerGameSec: number,
    decayPerGameSec: number,
    stepGameSec: number,
  ): number {
    const next =
      stockKJ + (inflowKJPerGameSec - decayPerGameSec * stockKJ) * stepGameSec;
    return Math.max(0, next);
  }

  /**
   * **Standby draw** — what an always-on item spends just staying on,
   * in kJ over an interval. `drawWatts` is joules per REAL second of
   * held effect, so the conversion to kJ over game-seconds is where the
   * unit discipline earns its keep.
   *
   * `gameSecondsPerRealSecond` is the world clock's scale (12× today):
   * a game-second is 1/12 of a real second of wall time, so an interval
   * of game-seconds is a *shorter* interval of physical time, and an
   * item draining "per game-second" at the naive rate would drain 12×
   * too fast.
   */
  public static standbyDraw(
    drawWatts: number,
    elapsedGameSec: number,
    gameSecondsPerRealSecond: number,
  ): number {
    if (!Number.isFinite(drawWatts) || drawWatts <= 0) return 0;
    if (!Number.isFinite(elapsedGameSec) || elapsedGameSec <= 0) return 0;
    const scale =
      Number.isFinite(gameSecondsPerRealSecond) && gameSecondsPerRealSecond > 0
        ? gameSecondsPerRealSecond
        : 1;
    const realSeconds = elapsedGameSec / scale;
    return (drawWatts * realSeconds) / 1000; // J → kJ
  }
}
