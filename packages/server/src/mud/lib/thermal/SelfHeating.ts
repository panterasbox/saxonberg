/**
 * SelfHeatingMixin — ⭐⭐ **a heap that makes its own heat faster than it can
 * lose it, until it catches** (promoted to the kernel by the paint build,
 * D15, from trade-farming's hay rick: three composers in three packs — the
 * hay rick, the oily-rag heap, later the compost heap — is the signal).
 *
 * One model, the heat as the host's to say:
 *
 * - **its heat** — {@link heatingKPerDay}, the host's hook: hay's
 *   microbes in wet forage, the oxidation of the linseed oil a rag was
 *   dipped in. Past {@link runawayK} the chemistry no longer needs whatever
 *   started it and runs away on its own.
 * - **its loss** — {@link coolingPerDay}, toward the ambient: a big heap
 *   has little surface for its mass and sheds little; one rag spread out
 *   sheds it all.
 * - **the fire** — a COMBUSTIBLE host whose core reaches its own
 *   (wetness-adjusted) autoignition point ignites, and the shipped fire
 *   driver spreads it from there. A host that is not combustible (a hay
 *   bale) smokes and chars and never burns, exactly as it always has.
 *
 * Reconcile on read, stamp forward, ≤400 steps per read (a long absence
 * integrates in day-sized steps). There is no roll anywhere in it.
 *
 * ⚠ The persisted fields keep the hay rick's names (`rickCoreK`,
 * `rickStamp`): every barn's record carries them, and a rename would need a
 * migration this build does not do.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import { TemplatePaths } from '../paths';

const SECONDS_PER_GAME_DAY = 86_400;

/** Ambient a heap starts from and cools back toward, kelvin. */
const AMBIENT_K = 288;

/** Above about 55 °C the chemistry runs on its own. */
const RUNAWAY_K = 328;

/** How hard a runaway heap heats, as a multiple of its ordinary drive. */
const RUNAWAY_MULTIPLIER = 3;

/** The default loss toward ambient, per game day, per kelvin of excess. */
const COOLING_PER_GAME_DAY = 0.08;

/** The four bands a heap reads in — never a number. */
export const RICK_BANDS = ['cold', 'warm', 'hot', 'smoking'] as const;

export type RickBand = (typeof RICK_BANDS)[number];

export interface SelfHeating {
  /** The heap's core temperature, kelvin — reconciled first. */
  coreTemperatureK(): number;
  /** cold · warm · hot · smoking. */
  rickBand(): RickBand;
  /** Past the point the chemistry runs on its own? */
  isRunningAway(): boolean;
  /** Walk the heat since the last look. */
  reconcileHeating(): void;
  /** Set the core (a staging seam for a soak twin). */
  setCoreTemperatureK(k: number): void;
}

export function SelfHeatingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class SelfHeatingMixin extends Base implements SelfHeating {
    static _mixinName = 'SelfHeatingMixin';

    static fieldMeta: FieldMeta = {
      rickCoreK: { persistent: true },
      rickStamp: { persistent: true },
    };

    /** The core temperature, kelvin. */
    public rickCoreK = AMBIENT_K;

    /** Game-second of the last reconcile (`0`: never). */
    public rickStamp = 0;

    /** Reentry guard — the hooks may read the host. */
    protected _reconcilingHeat = false;

    /**
     * @hook The heat this heap makes, kelvin per game day, at `coreK`, over
     * a step of `days` — tripled once the core is past {@link runawayK}.
     * Default none.
     */
    public heatingKPerDay(_coreK: number, _days: number): number {
      return 0;
    }

    /** @hook The share of the excess over ambient it sheds per game day. */
    public coolingPerDay(): number {
      return COOLING_PER_GAME_DAY;
    }

    /** @hook The core at which the chemistry runs away. */
    public runawayK(): number {
      return RUNAWAY_K;
    }

    /** @hook The ambient it starts from and cools toward. */
    public ambientK(): number {
      return AMBIENT_K;
    }

    public coreTemperatureK(): number {
      this.reconcileHeating();
      return this.rickCoreK;
    }

    public setCoreTemperatureK(k: number): void {
      if (Number.isFinite(k)) this.rickCoreK = k;
    }

    public isRunningAway(): boolean {
      return this.coreTemperatureK() >= this.runawayK();
    }

    public rickBand(): RickBand {
      const k = this.coreTemperatureK();
      if (k < this.ambientK() + 6) return 'cold';
      if (k < 313) return 'warm';
      if (k < this.runawayK()) return 'hot';
      return 'smoking';
    }

    public reconcileHeating(): void {
      if (this._reconcilingHeat) return;
      const nowS = nowSeconds();
      if (nowS === null) return;
      if (this.rickStamp === 0) {
        this.rickStamp = nowS;
        return;
      }
      const elapsed = nowS - this.rickStamp;
      if (elapsed <= 0) {
        this.rickStamp = nowS;
        return;
      }
      this._reconcilingHeat = true;
      try {
        const days = elapsed / SECONDS_PER_GAME_DAY;
        const steps = Math.min(400, Math.max(1, Math.ceil(days)));
        const dt = days / steps;
        const ambient = this.ambientK();
        const runaway = this.runawayK();
        const cooling = this.coolingPerDay();
        let k = this.rickCoreK;
        for (let i = 0; i < steps; i++) {
          const drive = Math.max(0, this.heatingKPerDay(k, dt));
          const heating = k >= runaway ? drive * RUNAWAY_MULTIPLIER : drive;
          k += (heating - (k - ambient) * cooling) * dt;
          if (k < ambient) k = ambient;
        }
        this.rickCoreK = k;
        this.rickStamp = nowS;
        this.catchIfHotEnough();
      } finally {
        this._reconcilingHeat = false;
      }
    }

    /** A combustible heap whose core passes its autoignition point catches. */
    private catchIfHotEnough(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isCombustible(self) || self.isBurning()) return;
      if (this.rickCoreK < self.getEffectiveAutoignitionK()) return;
      self.ignite();
    }
  };
}

function nowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
