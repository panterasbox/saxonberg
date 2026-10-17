/**
 * DurableMixin — the **wear-state axis** of a physical object: a thing that
 * wears out with **use, not the clock** (economy Law 2: you dull the knife
 * by cutting, never by time on the wall).
 *
 * Lives in `lib/material/` alongside the other physical-object axes — a made
 * thing has a *material* ({@link TangibleMixin}), a *form* ({@link
 * ConstructedMixin}), and a *condition* (this). The generic durable-good
 * sink: a `0..1 condition` gauge that starts pristine and drops via
 * `wear()`.
 *
 * Deliberately **NOT** "tool" — a weapon, a piece of armor, and a crafting
 * shaker are all *durable goods*, but only the shaker is a tool. Crafting's
 * `ToolMixin` (capabilities) composes this at the use site
 * (`ToolMixin(DurableMixin(…))`); armor and weapons compose it directly
 * (durability alone, no inert capability list). The clean split that stops
 * "is-a tool" from meaning "wears out". Narrow via `MixinApi.isDurable`.
 *
 * Composed on a `Thing` (or any Stuff). Opt-in repair is a later increment.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Channel } from './Channel';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

export interface Durable {
  /** Wear gauge, 0 (worn out) .. 1 (pristine). */
  getCondition(): number;
  setCondition(value: number): void;
  /**
   * Decrement condition by `amount` (clamped at 0). The wear-on-use seam.
   * `channel` names what the use did to the thing — a jar (`shock`), a
   * cut (`edge`) — so a thing made of parts can route the wear to the
   * part that gives first (assembly D7). A one-material good ignores it.
   */
  wear(amount?: number, channel?: Channel): void;
  /**
   * Whether the good is **broken** — condition at/below the
   * `crafting.brokenThreshold` dial. Broken is capability loss, not a
   * state machine: a broken tool offers no capabilities, a broken
   * weapon's delivery is floored; repair (at a steeper cost) reverses it.
   */
  isBroken(): boolean;
  /**
   * Every mend this thing has had, oldest first (repair D10). On a thing
   * made of parts, the union of its lines' records and its own.
   */
  getMends(): MendRecord[];
  /** Append one mend — written only by a mend, never by wear. */
  recordMend(record: MendRecord): void;
}

/**
 * ⭐ One mend, remembered (repair D10). Written by `repair` and the paid
 * service at the moment a hand mends something; never by wear. A whole
 * keeps these per part (`PartLine.mends`), a one-piece thing on itself,
 * and a part taken out of a whole carries its own away with it.
 */
export interface MendRecord {
  /** Game-clock seconds. */
  at: number;
  /** Identity path of the hand that mended it. */
  by: string;
  /** The name that hand went by when it did the work. */
  byName: string;
  /** The hand's band in the discipline, when it mended. */
  band: string;
  /** The trade the mend was done under (`''` when none could be known). */
  discipline: string;
  /** The part mended, when the thing is made of parts. */
  part?: string;
  kind: 'mended' | 'reforged' | 'tightened';
  /** Whether it came back sound or short of it. */
  result: 'sound' | 'short';
}

/** Default per-use wear when a consumer doesn't specify. */
export const WEAR_PER_USE = 0.01;

/** Fallback broken threshold when the AppSettings dial isn't seeded. */
const BROKEN_THRESHOLD_FALLBACK = 0.1;

/** Numeric AppSetting read, falling back to the seeded literal (the
 * `Combustible` dial pattern — pre-warm / test safe). */
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

export function DurableMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class DurableMixin extends Base implements Durable {
    static _mixinName = 'DurableMixin';

    static fieldMeta: FieldMeta = {
      condition: { persistent: true, runtimeState: true },
      mends: { persistent: true, runtimeState: true },
    };

    /**
     * 0..1 wear gauge; default pristine.
     */
    private _condition: number = 1;

    /**
     * Every mend, oldest first — a plain array of plain records, so it
     * persists with the host and needs no marshaller (repair D10).
     */
    public mends: MendRecord[] = [];

    protected get condition(): number {
      return this._condition;
    }
    protected set condition(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._condition = Math.max(0, Math.min(1, value));
    }

    getCondition(): number {
      return this._condition;
    }

    setCondition(value: number): void {
      this.condition = value;
    }

    wear(amount: number = WEAR_PER_USE, _channel?: Channel): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      this.condition = this._condition - amount;
    }

    getMends(): MendRecord[] {
      return this.mends.map((m) => ({ ...m }));
    }

    recordMend(record: MendRecord): void {
      this.mends = [...this.mends, { ...record }];
    }

    isBroken(): boolean {
      return (
        this._condition <=
        dial(AppSettingKeys.craftingBrokenThreshold, BROKEN_THRESHOLD_FALLBACK)
      );
    }
  };
}
