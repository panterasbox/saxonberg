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
 * Composed on `Weapon` this build (blades only — seasoning/tuning is the
 * named unbuilt seam for other working surfaces); reads are inert for
 * non-edge forms (the delivery factor only joins edge/point channels).
 * Narrow via `MixinApi.isKeen`.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
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
      keenness: { persistent: true },
    };

    /**
     * 0..1 edge gauge; default fully keen.
     *
     * @runtimeState
     */
    private _keenness: number = 1;

    protected get keenness(): number {
      return this._keenness;
    }
    protected set keenness(value: number) {
      // Per-field invariant on the accessor: clamp into 0..1.
      this._keenness = Math.max(0, Math.min(1, value));
    }

    getKeenness(): number {
      return this._keenness;
    }

    setKeenness(value: number): void {
      this.keenness = value;
    }

    getKeennessBand(): KeennessBand {
      if (this._keenness >= 0.85) return 'keen';
      if (this._keenness >= 0.55) return 'serviceable';
      if (this._keenness >= 0.25) return 'dulled';
      return 'blunted';
    }

    dull(
      amount: number = dial(
        AppSettingKeys.craftingKeennessWearPerUse,
        KEEN_DEFAULTS.WEAR_PER_USE,
      ),
    ): void {
      if (!Number.isFinite(amount) || amount < 0) return;
      this.keenness = this._keenness - amount;
    }

    hone(): void {
      this.keenness = 1;
    }

    keennessDeliveryFactor(): number {
      const floor = dial(
        AppSettingKeys.craftingKeennessDeliveryFloor,
        KEEN_DEFAULTS.DELIVERY_FLOOR,
      );
      return floor + (1 - floor) * this._keenness;
    }
  };
}
