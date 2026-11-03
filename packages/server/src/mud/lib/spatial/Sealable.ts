/**
 * SealableMixin — binary open/closed state for things that can be sealed.
 *
 * Doors are the canonical sealable, but the concept generalizes: chests,
 * boxes, trapdoors, windows, envelopes. Open/close controllers target any
 * Sealable rather than Door specifically — the surface is the same.
 *
 * Scope is intentionally narrow: `setOpen()` / `isOpen()` (the
 * predicate/setter pair), plus `open()` / `close()` (the action verbs).
 * Locks, keys, and unlock commands are future phases.
 *
 * Convention (per `feedback_boolean_field_naming`): the field, setter,
 * and YAML key use the noun form (`open`); the predicate getter uses
 * the `is` prefix (`isOpen()`). Reads naturally at every site:
 * `door.setOpen(true)`, `door.isOpen()`, `data: { open: true }`.
 *
 * Note: no `get open() / set open()` accessor pair is declared — the
 * accessor name would collide with the `open()` action method. With
 * the new three-phase applier dispatch (`TemplateApplier` Phase 1
 * tries `setOpen` first, falls back to bracket-assign only when no
 * setter exists), the bracket-assign-fallback path is never reached
 * for `open` because `setOpen` is defined; the runtime-shape
 * validation lives in `setOpen` directly.
 *
 * The guarded-boolean storage is delegated to `BistateMixin` (the
 * shared substrate under Sealable/Switchable/Foldable); this mixin is
 * the open/closed naming layer over `getState()` / `setState()`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { BistateMixin, type BistateInternal } from '../Bistate';
import type { VetoResult } from '../errors';
import type { Stuff } from '../stuff/Stuff';
import { WorldClockApi } from '../../api/worldclock';
import { TrajectoryLog, type Piecewise, type Breakpoint } from '../Trajectory';

/**
 * Public shape added by SealableMixin. `isOpen()` (predicate getter) /
 * `setOpen()` (noun setter) is the inter-Stuff contract surface;
 * `open()` / `close()` are the action-shaped mutators most callers
 * want.
 */
export interface Sealable {
  isOpen(): boolean;
  setOpen(value: boolean): void;
  open(): void;
  close(): void;
  /**
   * @hook May `by` open this now? (water-supply D12) The default says yes;
   * a `Door` says no while it is locked, a `Gate` while its padlock holds
   * against somebody with no key. The `open` verb asks it first and renders
   * the refusal it returns — the mixin decides, the controller says it.
   */
  canOpen(by: Stuff): VetoResult;
}

export function SealableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SealableMixin extends BistateMixin(Base) {
    static _mixinName = 'SealableMixin';

    static fieldMeta: FieldMeta = {
      open: { persistent: true },
    };

    /** Predicate getter. */
    isOpen(): boolean {
      return (this as unknown as BistateInternal).getState();
    }

    /**
     * Noun setter. Rejects non-boolean assignments with `TypeError`
     * — a malformed template (`open: 1`) crashes loudly at hydrate
     * time rather than being silently coerced.
     */
    setOpen(value: boolean): void {
      (this as unknown as BistateInternal).setState(value, 'Sealable.open');
    }

    /** Open the sealable. Idempotent — opening an already-open one is a no-op. */
    open(): void {
      (this as unknown as BistateInternal).setState(true, 'Sealable.open');
    }

    /** Close the sealable. Idempotent — closing an already-closed one is a no-op. */
    close(): void {
      (this as unknown as BistateInternal).setState(false, 'Sealable.open');
    }

    /** May `by` open this? A plain sealable always says yes. */
    canOpen(_by: Stuff): VetoResult {
      return { ok: true };
    }
  };
}

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
  /** The opening over `[fromS, toS]` as a trajectory — integrated, never sampled. */
  openingTrajectory(fromS: number, toS: number): Piecewise;
  /** The worked record, oldest first. */
  getWorkLog(): readonly WorkRecord[];
}

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
      this.workLog.push({ atS, by: by?.getIdentityPath?.() ?? '', opening: f });
      while (this.workLog.length > WORK_LOG_DEPTH) this.workLog.shift();
    }

    public open(): void {
      this.setOpening(1);
    }

    public close(): void {
      this.setOpening(0);
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
  };
}
