/**
 * KeenMixin — the **working-surface wear axis** of an edged/pointed
 * physical object: the exact sibling of {@link DurableMixin}'s structural
 * axis (`lib/material/` — a made thing has a material, a form, a
 * condition… and, if it cuts, an edge).
 *
 * Two axes, two cadences, two fictions — deliberately NOT a field on
 * `DurableMixin` (most durables have no edge, and collapsing the nightly
 * whetstone into the smith visit erases the ritual):
 *
 *   - **condition** (Durable) — structural, decays slowly, scales the
 *     response height, restored by `repair` (the smith's trade).
 *   - **keenness** (this) — the edge, decays fast on use, modestly scales
 *     edge/point *delivery*, fully restorable by the owner, anywhere,
 *     via `sharpen` (cheap, frequent, personal).
 *
 * Composed on `Weapon` and `Tool` (repair D3) — a family where a mace or
 * a hammer has no edge, so the edge is DERIVED from the form, never a
 * predicate on the host set; reads are inert for non-edge forms (the
 * delivery factor only joins edge/point channels).
 *
 * ⭐ **The edge is the PART's** (repair D3, AC 11). When the host is made
 * of parts and some of its lines cut, the gauge routes outward: the
 * whole's keenness is its edged lines' minimum, and `dull`/`hone` work on
 * those lines — so a head honed loose and fitted keeps its edge, and a
 * blade drawn from its hilt takes its edge with it. A thing of one piece
 * reads its own field. Narrow via `MixinApi.isKeen`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../stuff/Stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';

/** The keenness bands, sharpest first (presentation, never a number). */
export type KeennessBand = 'keen' | 'serviceable' | 'dulled' | 'blunted';

/** Fallbacks for the `crafting.keenness.*` dials (pre-warm / test safe). */
const KEEN_DEFAULTS = {
  WEAR_PER_USE: 0.08,
  DELIVERY_FLOOR: 0.7,
} as const;

/** Numeric AppSetting read, falling back to the seeded literal (the
 * `Combustible` dial pattern). */
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

export interface Keen {
  /** Edge gauge, 0 (blunted) .. 1 (keen). */
  getKeenness(): number;
  setKeenness(value: number): void;
  /** The presentation band for the current keenness. */
  getKeennessBand(): KeennessBand;
  /** Dull the edge by `amount` (dial default) — the wear-on-use seam. */
  dull(amount?: number): void;
  /** Restore the edge to fully keen — `sharpen`'s completion effect. */
  hone(): void;
  /**
   * ⭐ Whether there is an EDGE here to hold a hone (repair D3): its own
   * form cuts or pierces (a billhook, a dagger), or some part of it does
   * (the axe's head). A hammer and a mace have none.
   */
  hasEdge(): boolean;
  /**
   * The edge/point delivery scale this edge contributes:
   * `lerp(crafting.keenness.deliveryFloor, 1, keenness)` — a blunted
   * blade still lands (floored), a keen one lands full.
   */
  keennessDeliveryFactor(): number;
}

export function KeenMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class KeenMixin extends Base implements Keen {
    static _mixinName = 'KeenMixin';

    static fieldMeta: FieldMeta = {
      keenness: { persistent: true, runtimeState: true },
    };

    /**
     * 0..1 edge gauge; default fully keen.
     */
    private _keenness: number = 1;

    protected get keenness(): number {
      return this._keenness;
    }
    protected set keenness(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._keenness = Math.max(0, Math.min(1, value));
    }

    /**
     * The edged parts of a whole, when this host is one — the lines the
     * gauge routes to. Empty for a thing of one piece (its own field).
     */
    private edgedParts(): string[] {
      const self = this as unknown as Stuff;
      if (!MixinApi.isAssembled(self)) return [];
      return self.edgedLines().map((l) => l.part);
    }

    getKeenness(): number {
      const parts = this.edgedParts();
      if (parts.length === 0) return this._keenness;
      const whole = this as unknown as Stuff;
      if (!MixinApi.isAssembled(whole)) return this._keenness;
      return Math.min(...parts.map((p) => whole.lineKeenness(p)));
    }

    setKeenness(value: number): void {
      const parts = this.edgedParts();
      const whole = this as unknown as Stuff;
      if (parts.length > 0 && MixinApi.isAssembled(whole)) {
        for (const p of parts) whole.setLineKeenness(p, value);
        return;
      }
      this.keenness = value;
    }

    getKeennessBand(): KeennessBand {
      const k = this.getKeenness();
      if (k >= 0.85) return 'keen';
      if (k >= 0.55) return 'serviceable';
      if (k >= 0.25) return 'dulled';
      return 'blunted';
    }

    dull(
      amount: number = dial(
        AppSettingKeys.craftingKeennessWearPerUse,
        KEEN_DEFAULTS.WEAR_PER_USE,
      ),
    ): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      const parts = this.edgedParts();
      const whole = this as unknown as Stuff;
      if (parts.length > 0 && MixinApi.isAssembled(whole)) {
        for (const p of parts) whole.dullLine(p, amount);
        return;
      }
      this.keenness = this._keenness - amount;
    }

    hone(): void {
      this.setKeenness(1);
    }

    hasEdge(): boolean {
      if (this.edgedParts().length > 0) return true;
      const self = this as unknown as Stuff;
      if (!MixinApi.isConstructed(self)) return false;
      const c = self.getConstruction();
      if (!c?.isWeapon()) return false;
      const p = c.primaryChannel();
      return p === 'edge' || p === 'point';
    }

    keennessDeliveryFactor(): number {
      const floor = dial(
        AppSettingKeys.craftingKeennessDeliveryFloor,
        KEEN_DEFAULTS.DELIVERY_FLOOR,
      );
      return floor + (1 - floor) * this.getKeenness();
    }
  };
}
