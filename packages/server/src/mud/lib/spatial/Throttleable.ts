/**
 * ThrottleableMixin — a {@link Sealable} that opens BY AN AMOUNT and
 * remembers who set it (water-supply D12): a headgate opened a quarter, a
 * turnout full. Composed over `SealableMixin`, which it requires; its own
 * module, as every mixin is (it shared `Sealable.ts` until the review).
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TrajectoryLog, type Piecewise, type Breakpoint } from '../Trajectory';
import type { Sealable } from './Sealable';

/** One worked opening on a throttled gate: who set it, to what, and when. */
export interface WorkRecord {
  atS: number;
  by: string;
  opening: number;
}

/**
 * ⭐⭐ **A sealable that opens BY AN AMOUNT, and remembers who set it**
 * (water-supply D12): a headgate opened a quarter, a turnout full. Its
 * `opening` (0..1) is what the water reads; every setting is logged with
 * who made it, so the gate's own record shows who worked it — the ledger a
 * rider audits and a field integrates — without an accountability event
 * (that is harm's) or a new collection.
 *
 * `open()`/`close()` are the full and the shut setting; `isOpen()` is
 * `opening > 0`. Composed on a `SealableMixin` host, which it requires.
 */
export interface Throttleable {
  getOpening(): number;
  setOpening(fraction: number, by?: Stuff | null): void;
  /**
   * Set it to what a person said (`quarter`, `half`, `three quarters`, `full`, a
   * figure 0..1, a percent), and say back what it now is; `null` when the phrase
   * is no setting, with nothing changed.
   */
  workOpening(said: string, by: Stuff): { shut: boolean; words: string } | null;
  /** The opening over `[fromS, toS]` as a trajectory — integrated, never sampled. */
  openingTrajectory(fromS: number, toS: number): Piecewise;
  /** The worked record, oldest first. */
  getWorkLog(): readonly WorkRecord[];
  /**
   * @hook What it passes fully open right now, m³/s — the most a field's
   * inlet off it can take (water-supply D15). `null` = it does not say. A
   * pack's gate answers from its own capacity and the water arriving at it.
   */
  passingCapM3S(nowS: number): Promise<number | null>;
  /**
   * @hook Bring its settings up to `nowS` before anyone integrates them — a
   * gate worked by a rota opens and shuts on its turns whether or not
   * anybody watched. Default: nothing to settle.
   */
  settleOpening(nowS: number): Promise<void>;
}

/** The words a setting may be said in. */
const SETTING_WORDS: Readonly<Record<string, number>> = {
  quarter: 0.25,
  'a quarter': 0.25,
  third: 1 / 3,
  half: 0.5,
  halfway: 0.5,
  'two thirds': 2 / 3,
  'three quarters': 0.75,
  full: 1,
  fully: 1,
  wide: 1,
  shut: 0,
  closed: 0,
};

/** How many worked settings a gate's record keeps. */
const WORK_LOG_DEPTH = 24;

export function ThrottleableMixin<TBase extends MixinConstructor<Stuff & Sealable>>(Base: TBase) {
  return class ThrottleableMixin extends Base implements Throttleable {
    static _mixinName = 'ThrottleableMixin';

    static fieldMeta: FieldMeta = {
      opening: { persistent: true, runtimeState: true },
      workLog: { persistent: true, runtimeState: true },
      openingCurve: { persistent: true, runtimeState: true },
    };

    /** How far open, 0..1. */
    public opening = 0;
    /** Who worked it, when, to what — a bounded ring. */
    public workLog: WorkRecord[] = [];
    /** The opening's breakpoints, backing {@link openingTrajectory}. */
    public openingCurve: Breakpoint[] = [];

    public getOpening(): number {
      return this.opening;
    }

    public setOpening(fraction: number, by: Stuff | null = null): void {
      const f = Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0;
      const atS = WorldClockApi.getNow().rawValue();
      const curve = new TrajectoryLog(this.openingCurve);
      // ⚠ A trajectory holds its OLDEST breakpoint backwards in time, so the
      // first change must be preceded by what the opening WAS — else a gate
      // opened today reads as open since forever.
      if (this.openingCurve.length === 0) curve.record(atS - 1, this.opening, this.opening, 0);
      this.opening = f;
      super.setOpen(f > 0);
      curve.record(atS, f, f, 0);
      this.workLog.push({ atS, by: by?.getIdentityPath() ?? '', opening: f });
      while (this.workLog.length > WORK_LOG_DEPTH) this.workLog.shift();
    }

    public workOpening(said: string, by: Stuff): { shut: boolean; words: string } | null {
      const t = said.trim().toLowerCase().replace(/^(a|an|the)\s+/, '').replace(/\s+(open|way)$/, '');
      const pct = /^(\d+(?:\.\d+)?)\s*%$/.exec(t);
      const n = Number(t);
      const f =
        SETTING_WORDS[t] ??
        (pct ? Math.min(1, Number(pct[1]) / 100) : t !== '' && Number.isFinite(n) && n >= 0 && n <= 1 ? n : null);
      if (f === null) return null;
      this.setOpening(f, by);
      const near = (x: number): boolean => Math.abs(f - x) < 0.01;
      const words =
        f >= 0.999
          ? 'fully open'
          : near(0.75)
            ? 'three quarters open'
            : near(0.5)
              ? 'half open'
              : near(0.25)
                ? 'a quarter open'
                : `${Math.round(f * 100)}% open`;
      return { shut: f <= 0, words };
    }

    public open(by: Stuff | null = null): void {
      this.setOpening(1, by);
    }

    public close(by: Stuff | null = null): void {
      this.setOpening(0, by);
    }

    public setOpen(value: boolean): void {
      // A hydrated `open:` sets the state alone; the opening follows it.
      super.setOpen(value);
      if (!value) this.opening = 0;
      else if (this.opening <= 0) this.opening = 1;
    }

    public openingTrajectory(fromS: number, toS: number): Piecewise {
      return new TrajectoryLog(this.openingCurve).window(fromS, toS, this.opening);
    }

    public getWorkLog(): readonly WorkRecord[] {
      return this.workLog;
    }

    public async passingCapM3S(_nowS: number): Promise<number | null> {
      return null;
    }

    public async settleOpening(_nowS: number): Promise<void> {
      // A hand-worked setting is already its own record.
    }
  };
}
