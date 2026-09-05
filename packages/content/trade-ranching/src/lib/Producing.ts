/**
 * ProducingMixin — **three taps, three real neglect failures** (D25).
 *
 * ⚠⚠ **A tap fills from the PRODUCTION SLICE of the energy budget, and
 * mints nothing.** That is the whole constraint. Every product is a
 * transform of feed, which is a transform of sunlight and soil; the
 * shipped `Stock` counter's *reset sweep* is the right shape to copy and
 * its `par` semantics is emphatically not — a counter topped up to par
 * is a faucet wearing a hat.
 *
 * So the fill rate is scaled by **condition** (the `flesh` reserve): an
 * animal in poor flesh gives less milk, because it has less to give.
 * ⭐ And **production dies before condition does**, with no special case,
 * because production sits at priority 4 in the partitioning cascade and
 * the store is what is left over.
 *
 * ## The three behaviours, and why they differ
 *
 * ⭐⭐ **Accrual for the on-ramp, expiry for the committed** (D93):
 *
 * | | behaviour | neglect |
 * |---|---|---|
 * | **milk** | `expire` | she **dries off** for that lactation. ⚠ A large **slope** (D45), not a cliff — the next lactation is unaffected, so an absence costs a season and never an animal |
 * | **eggs** | `accrue` | they **spoil** in the nest past what a clutch holds |
 * | **wool** | `continuous` | a worse fleece, and a hot sheep |
 *
 * The forgiving end of the roster accrues and expiry is what you take on
 * when you commit — which is why hens are the on-ramp and a dairy cow is
 * a tyrant, and why *what a player can keep* is an honest choice about
 * their own real-life cadence rather than a gate.
 *
 * ⚠ Every period here is a **GAME day** (D89). At the shipped 12× scale
 * a game day is two real hours, so *twice a game day* is four real
 * hours — which is why a dairy cow's expiry window is generous in game
 * days and still demanding in real ones.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type Species from '@saxonberg/server/mud/platform/idea/species/Species';
import type { TapSpec } from '@saxonberg/server/mud/platform/idea/species/Species';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

const SECONDS_PER_GAME_DAY = 86_400;

export const PRODUCING_MIXIN = 'ProducingMixin';

/** What is standing in one tap, and how long it has been standing. */
export interface TapState {
  /** Units available to take. */
  standing: number;
  /** Game-seconds of the last take. `0` = never taken. */
  lastTaken: number;
  /**
   * ⚠ Has an `expire` tap given up for this season? A **slope**: the
   * animal stops producing until the lactation resets, and the next one
   * is unaffected. Never a dead animal and never a permanent loss.
   */
  driedOff: boolean;
}

/** The public surface a producing animal offers. */
export interface Producing {
  /** Reconcile every tap over elapsed game-time. Sync, read-triggered. */
  reconcileProduction(): void;
  /** The taps this animal's species authors. */
  taps(): readonly TapSpec[];
  /** What is standing in one tap, reconciled. */
  standingIn(key: string): number;
  /** Whether an `expire` tap has given up for this season. */
  isDriedOff(key: string): boolean;
  /**
   * Take everything standing in a tap. Returns the units taken, and
   * ⭐ **resets the neglect clock** — which is the whole of why taking
   * one is an act rather than a collection.
   */
  takeFrom(key: string): number;
  /** Put an `expire` tap back into production (a new lactation). */
  freshen(key: string): void;
  /** How hard this animal is working, `[0, 1]` — the condition scale. */
  productionFactor(): number;
}

export function ProducingMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  return class ProducingMixin extends Base implements Producing {
    static _mixinName = PRODUCING_MIXIN;

    /**
     * ⭐⭐ **The taps afford the tap verbs, and nothing else does.**
     *
     * They used to hang off the `Livestock` CLASS, which promised
     * `milk`, `shear` and `gather` on every animal in the trade whether
     * or not it gave anything — so a sheepdog offered `shear` and a
     * plough ox offered `milk`, and each controller had to un-promise it
     * at execute time (*"that is not an animal that gives anything"*).
     * **A guard that re-narrows the host set is the tell that the
     * affordance is on the wrong host**; the question the controller was
     * asking late is the question the affordance should ask early.
     *
     * ⚠ The verbs are still just as gated — a dry cow declines the same
     * way it always did. What changed is that an animal with no taps
     * never offers them, so *"you can't milk that"* stops being a
     * sentence the game has to say about a dog.
     */
    static commandContributions: CommandContributions = {
      self: [],
      peers: [
        'trade/ranching/cmd/ranching/milk.yaml',
        'trade/ranching/cmd/ranching/shear.yaml',
        'trade/ranching/cmd/ranching/gather.yaml',
      ],
      environment: [],
    };

    static fieldMeta: FieldMeta = {
      tapState: { persistent: true },
      productionStamp: { persistent: true },
    };

    /** Per-tap state, keyed by the tap's key. */
    public tapState: Record<string, TapState> = {};

    /** Game-seconds stamp of the last production reconcile. */
    public productionStamp = 0;

    protected _reconcilingProduction = false;

    public taps(): readonly TapSpec[] {
      const species = (this as unknown as { getSpecies?(): Species | null })
        .getSpecies?.();
      return species?.getProduction() ?? [];
    }

    /**
     * ⭐ How hard this animal is working — the production slice, scaled
     * by what it has to give.
     *
     * An animal in good flesh works at full; a thin one works at a
     * fraction; an emaciated one has nothing to spare at all. ⚠ It reads
     * the reserve rather than a band, because a band would make
     * production a step function and a real animal's yield falls away
     * gradually.
     */
    public productionFactor(): number {
      const host = this as unknown as {
        getReserve?(k: string): { current: { rawValue(): number } } | undefined;
      };
      const flesh = host.getReserve?.('flesh')?.current.rawValue();
      if (flesh === undefined) return 1;
      // Full at "in good flesh" and above; nothing at the emaciated end.
      return clamp01((flesh - 12) / 43);
    }

    public standingIn(key: string): number {
      this.reconcileProduction();
      return this.tapState[key]?.standing ?? 0;
    }

    public isDriedOff(key: string): boolean {
      this.reconcileProduction();
      return this.tapState[key]?.driedOff === true;
    }

    public takeFrom(key: string): number {
      this.reconcileProduction();
      const state = this.tapState[key];
      if (!state) return 0;
      const taken = state.standing;
      if (taken <= 0) return 0;
      const now = nowSeconds();
      this.tapState = {
        ...this.tapState,
        [key]: { standing: 0, lastTaken: now ?? state.lastTaken, driedOff: false },
      };
      return taken;
    }

    public freshen(key: string): void {
      const state = this.tapState[key];
      if (!state) return;
      const now = nowSeconds();
      this.tapState = {
        ...this.tapState,
        [key]: { ...state, driedOff: false, lastTaken: now ?? state.lastTaken },
      };
    }

    /**
     * Fill every tap over elapsed game-time, and apply its own neglect.
     *
     * ⚠ **No far-past guard.** A kept animal's clock runs while its
     * keeper is away — that is the whole of D29 — and the failure modes
     * here are exactly what an absence is supposed to cost: a lactation,
     * a clutch, a fleece. Never the animal.
     */
    public reconcileProduction(): void {
      if (this._reconcilingProduction) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      if (this.productionStamp === 0) {
        this.productionStamp = nowS;
        this.seedTaps(nowS);
        return;
      }
      const elapsed = nowS - this.productionStamp;
      if (elapsed <= 0) {
        this.productionStamp = nowS;
        return;
      }
      this._reconcilingProduction = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const factor = this.productionFactor();
        const next: Record<string, TapState> = { ...this.tapState };
        for (const tap of this.taps()) {
          const state = next[tap.key] ?? {
            standing: 0,
            lastTaken: nowS,
            driedOff: false,
          };
          const sinceTaken =
            state.lastTaken > 0 ? (nowS - state.lastTaken) / SECONDS_PER_GAME_DAY : 0;

          if (tap.behaviour === 'expire') {
            // ⚠ She dries off. The SLOPE: production stops for this
            // lactation and the next one is unaffected — an absence
            // costs a season, never an animal.
            if (sinceTaken > tap.windowDays) {
              next[tap.key] = { ...state, standing: 0, driedOff: true };
              continue;
            }
            if (state.driedOff) {
              next[tap.key] = { ...state, standing: 0 };
              continue;
            }
            // What is standing is one window's worth, not a running
            // total: milk that was not taken is milk that was not made.
            next[tap.key] = {
              ...state,
              standing: Math.min(
                tap.perGameDay * tap.windowDays,
                state.standing + tap.perGameDay * days * factor,
              ),
            };
            continue;
          }

          if (tap.behaviour === 'accrue') {
            // Collect whenever — but past what a clutch will hold, they
            // spoil in the nest and the surplus is simply gone.
            const ceiling = tap.perGameDay * tap.windowDays;
            next[tap.key] = {
              ...state,
              standing: Math.min(ceiling, state.standing + tap.perGameDay * days * factor),
            };
            continue;
          }

          // `continuous`: it grows and grows. What neglect costs is
          // QUALITY, which the shearing act reads off how long it has
          // been growing — and a hot sheep, which the thermal build's
          // insulation reads off the same number.
          next[tap.key] = {
            ...state,
            standing: state.standing + tap.perGameDay * days * factor,
          };
        }
        this.tapState = next;
        this.productionStamp = nowS;
      } finally {
        this._reconcilingProduction = false;
      }
    }

    /** Open a state for each authored tap at first touch. */
    private seedTaps(nowS: number): void {
      const next: Record<string, TapState> = { ...this.tapState };
      for (const tap of this.taps()) {
        if (!next[tap.key]) {
          next[tap.key] = { standing: 0, lastTaken: nowS, driedOff: false };
        }
      }
      this.tapState = next;
    }
  };
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** Game-seconds now, or null when no world clock (pre-boot / tests). */
function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
