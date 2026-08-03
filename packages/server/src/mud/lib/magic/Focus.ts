/**
 * FocusMixin — an item that supplies **specification only**.
 *
 * The second of D5's three classes, and the one defined by what it does
 * *not* carry. A charged item is a battery; a focus has no tank at all.
 * It holds a **pattern** — a pre-formed specification — and the *user*
 * pays the energy. So a focus is bounded by the user's reserve rather
 * than by energy density, and its ergonomics are the mirror image of a
 * charged item's: **the user is the endpoint**, so a focus that shoves
 * recoils onto *you* (D6).
 *
 * A focus supplies the missing leg of Tarn's Rule, so foci come in
 * **verb and noun flavours** — and a focus that lifts the axis you are
 * already strong on is worthless, which is what makes them a real
 * purchasing decision rather than a strictly-better upgrade.
 *
 * ## Foci perish too, by pattern rot (D9)
 *
 * A specification-only item has no energy to leak and looks immortal.
 * It is not. **A binding is a state held away from equilibrium, and a
 * pattern that does work cannot BE at equilibrium** — so it relaxes, on
 * a much slower schedule than charge, because it is losing *order*
 * rather than energy.
 *
 * The canon line is **magic perishes, matter doesn't**: Eternal steel
 * keeps its perfection because structure is thermodynamically stable
 * rather than maintained. The ruins hold perfect blades and faded rings,
 * and that is a consequence of the physics rather than a lore choice.
 *
 * Refreshing a focus uses the same `recharge` path as a charged item;
 * what differs is the **cost basis** — re-impressing a pattern, not
 * filling a tank.
 *
 * ⚠ Like charge, pattern rot has **no far-past absence guard**. An item
 * decays while nobody is looking. See `ChargedMixin` for why that is
 * load-bearing rather than an oversight.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { TemplatePaths } from '../paths';
import { Charge } from './Charge';

/** Pattern dials with seeded-literal fallbacks. Units in the names. */
export const FOCUS_DEFAULTS = {
  /**
   * Pattern rot per GAME second — roughly **two orders of magnitude
   * slower than charge decay**. A stowed focus is still good years
   * later; a neglected one is measurably worse a lifetime on. That gap
   * is what makes "the ruins hold perfect blades and faded rings" a
   * derivation rather than a rule. *Calibrate at launch.*
   */
  ROT_PER_GAME_SEC: 1e-9,
  /**
   * Below this integrity the pattern no longer holds a usable
   * specification. Not a cliff — efficiency has been sliding the whole
   * way down, which is the soft-recoverable-entropy constraint.
   */
  USABLE_FLOOR: 0.05,
} as const;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface Focus {
  /**
   * **Reconcile-on-read** pattern rot. No far-past guard — a pattern
   * relaxes whether or not anyone is watching.
   */
  reconcilePattern(): void;
  /** Pattern integrity in `[0,1]`, freshly reconciled. 1 = newly impressed. */
  getPatternIntegrity(): number;
  /**
   * Is the pattern still usable at all? Below the floor the
   * specification no longer resolves — but efficiency has been sliding
   * the whole way, so this is never a surprise.
   */
  isPatternUsable(): boolean;
  /**
   * Re-impress the pattern, `amount` in `[0,1]` of integrity. The same
   * `recharge` path a charged item uses; only the cost basis differs.
   * Returns what was actually restored.
   */
  refreshPattern(amount: number): number;
  /**
   * **The potency a worn pattern delivers** — integrity itself. A faded
   * focus does not FAIL, it delivers less per unit of the user's
   * reserve, which is the same legible signal spell fade uses (D15).
   */
  getPatternEfficiency(): number;

  // ---------- storage (public for the Hydrator) ----------
  patternIntegrity: number;
  patternClockStamp: number;
}

export function FocusMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class FocusMixin extends Base implements Focus {
    static _mixinName = 'FocusMixin';

    /**
     * A focus affords `recharge` — the same verb a charged item does,
     * because from the user's side it is one act (spend your reserve,
     * make the thing work again). Only the cost basis differs (D9).
     * It does NOT afford `zap`: a focus has no charge to fire, it lifts
     * a cast you are making yourself.
     */
    static commandContributions: CommandContributions = {
      self: [],
      environment: ['magic/recharge.yaml'],
      inventory: ['magic/recharge.yaml'],
      peers: [],
    };

    static fieldMeta: FieldMeta = {
      patternIntegrity: { persistent: true, authorable: true },
      patternClockStamp: { persistent: true, runtimeState: true },
    };

    /** `[0,1]`; 1 = freshly impressed. */
    public patternIntegrity: number = 1;

    /** Last rot reconcile, in-session game-seconds. 0 = unseeded. */
    public patternClockStamp: number = 0;

    private _reconcilingPattern = false;

    public reconcilePattern(): void {
      if (this._reconcilingPattern) return;
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();
      if (this.patternClockStamp === 0) {
        this.patternClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.patternClockStamp;
      if (elapsed <= 0) {
        this.patternClockStamp = nowS;
        return;
      }
      // ⚠ No far-past guard — see the module doc.
      this._reconcilingPattern = true;
      try {
        // Same exponential shape as charge: a relaxation proportional
        // to how much order is left. Reusing `Charge.decayFor` is not a
        // shortcut — it is the same physics on a different quantity.
        this.patternIntegrity = Charge.decayFor(
          this.patternIntegrity,
          elapsed,
          dial(
            AppSettingKeys.magicPatternRotPerGameSec,
            FOCUS_DEFAULTS.ROT_PER_GAME_SEC,
          ),
        );
        this.patternClockStamp = nowS;
      } finally {
        this._reconcilingPattern = false;
      }
    }

    public getPatternIntegrity(): number {
      this.reconcilePattern();
      return this.patternIntegrity;
    }

    public isPatternUsable(): boolean {
      return this.getPatternIntegrity() >= FOCUS_DEFAULTS.USABLE_FLOOR;
    }

    public refreshPattern(amount: number): number {
      const want = Number(amount);
      if (!Number.isFinite(want) || want <= 0) return 0;
      const current = this.getPatternIntegrity();
      const restored = Math.min(want, 1 - current);
      if (restored <= 0) return 0;
      this.patternIntegrity = current + restored;
      return restored;
    }

    public getPatternEfficiency(): number {
      return this.getPatternIntegrity();
    }
  };
}
