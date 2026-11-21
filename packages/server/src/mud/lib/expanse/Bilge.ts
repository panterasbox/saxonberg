/**
 * BilgeMixin — ⭐ **the water a hull holds**.
 *
 * A ship and a boat both take water through their hulls, and before this
 * each kept its own `bilgeL`/`bilgeStamp` and its own integrator. What they
 * share is exactly this: litres in her as of a stamp, a leak integrated from
 * the stamp to now (never sampled), what her hull can hold, water taken
 * out of her (pumped, bailed) — and ⭐⭐ WHAT comes in, which is one read for
 * both (matter-model-overlaps D4, {@link Bilge.hullLeakLps}): her SEAMS (her
 * `Durable` condition in the five seam bands, × her length) and her FLAWS
 * (the one hole rule at her draft and her length). Each host answers WHEN
 * it comes in ({@link Bilge.leakedBetween}):
 *
 *  - a **ship** (`platform/idea/Ship`): band by band over her shell's line;
 *  - a **boat** (`transport`'s `Boat`): at her rate now, only while she is
 *    afloat.
 *
 * Named for what it IS (the bilge — the water in the bottom of a hull), not
 * for what a hull can do. It carries state, so it is a mixin, not a shape.
 * It is not a `LiftSource`: what you lift the water OUT through is
 * the host's (a ship's bilge well, a boat herself), and each answers that
 * shape with this mixin's {@link Bilge.takeBilge}.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { AppApi } from '../../api/app';

/**
 * ⭐ How far a hull's seams have opened, by her `Durable` condition — the
 * floors, highest first (the five bands the leak is tuned in, grain). The
 * WORD anyone reads is her condition's, a house's word.
 */
export const SEAM_BANDS: ReadonlyArray<readonly [number, string]> = [
  [0.9, 'sound'],
  [0.7, 'weathered'],
  [0.5, 'worn'],
  [0.25, 'shabby'],
  [0, 'dilapidated'],
];

/**
 * ⭐ What a hull lets in by how far her seams have opened (grain): litres a
 * second per meter of her length, each a setting (`ship.leak.<band>`). A
 * sound hull is tight; a worn one weeps at every seam. Retuned against
 * *nothing fails over a weekend away* (the arithmetic is in
 * `platform/content/settings/ship.yaml`).
 */
const SEAM_LPS_PER_M: Readonly<Record<string, number>> = {
  sound: 0,
  weathered: 0.0005,
  worn: 0.004,
  shabby: 0.02,
  dilapidated: 0.08,
};

/** A numeric setting, else the shipped grain. */
function seamDial(key: string, fallback: number): number {
  try {
    const n = Number.parseFloat(AppApi.setting(key) ?? '');
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    // @quiet a cold cache or an unregistered key: the shipped grain.
  }
  return fallback;
}

export interface Bilge {
  /** Litres in her as last integrated (the stamp's). */
  bilgeAtStamp(): number;
  /** Game-seconds the bilge was last integrated to; `0` = never. */
  getBilgeStamp(): number;
  /** Litres in her at `nowS`, projected from the stamp — no write. */
  bilgeAt(nowS: number): number;
  /** Bring the bilge up to `nowS` and keep it. */
  integrateBilge(nowS: number): void;
  /** Take up to `litres` out of what is in her as integrated; returns what came out. */
  takeBilge(litres: number): number;
  /** Set what is in her as of a stamp — the host's own re-reckoning (a boat lifted out; a staged bilge). */
  resetBilge(litres: number, stampS: number): void;
  /** What her hull holds, L — past it, no more comes in. */
  bilgeCapacityL(): number;
  /** Litres that came in between two game-seconds, or `null` when she cannot know. */
  leakedBetween(fromS: number, toS: number): number | null;
  /**
   * ⭐⭐ What comes in through her hull, L/s (matter-model-overlaps D4) —
   * her SEAMS (the seam band of `condition`, her `Durable` wear by default,
   * at `ship.leak.<band>` × her length) plus her FLAWS
   * (`Flawed.flawLeakLPerHour(hullDraftM(), hullLengthM())`). Whether she
   * is afloat is the host's to ask.
   */
  hullLeakLps(condition?: number): number;
  /** The seam band a hull condition reads as — `sound · weathered · worn · shabby · dilapidated`. */
  seamBandFor(condition: number): string;
  /** @hook Her length, m — the seams that weep and the scale a hole opens at. */
  hullLengthM(): number;
  /** @hook Her draft, m — the head of water over a hole in her. */
  hullDraftM(): number;
}

export function BilgeMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class BilgeMixin extends Base implements Bilge {
    static _mixinName = 'BilgeMixin';

    static fieldMeta: FieldMeta = {
      bilgeL: { persistent: true },
      bilgeStamp: { persistent: true },
    };

    /** ⭐ Litres in her as of `bilgeStamp`. */
    protected bilgeL = 0;
    /** Game-seconds her bilge was last brought up to; `0` = never. */
    protected bilgeStamp = 0;

    public bilgeAtStamp(): number {
      return this.bilgeL;
    }

    public getBilgeStamp(): number {
      return this.bilgeStamp;
    }

    public bilgeAt(nowS: number): number {
      const from = this.bilgeStamp;
      const since = from > 0 && nowS > from ? (this.leakedBetween(from, nowS) ?? 0) : 0;
      return Math.min(this.bilgeCapacityL(), this.bilgeL + since);
    }

    /**
     * Integrate the leak from the stamp to `nowS`. A first stamp records the
     * moment and nothing else; a host that cannot know what came in
     * (`leakedBetween` → `null`) leaves the stamp where it was, so the next
     * integration covers the gap.
     */
    public integrateBilge(nowS: number): void {
      const from = this.bilgeStamp;
      if (from <= 0) {
        this.bilgeStamp = nowS;
        return;
      }
      if (!(nowS > from)) return;
      const litres = this.leakedBetween(from, nowS);
      if (litres === null) return;
      this.bilgeL = Math.min(this.bilgeCapacityL(), this.bilgeL + Math.max(0, litres));
      this.bilgeStamp = nowS;
    }

    public takeBilge(litres: number): number {
      const moved = Math.min(Math.max(0, Number(litres) || 0), this.bilgeL);
      if (!(moved > 0)) return 0;
      this.bilgeL -= moved;
      return moved;
    }

    public resetBilge(litres: number, stampS: number): void {
      this.bilgeL = Math.min(this.bilgeCapacityL(), Math.max(0, Number(litres) || 0));
      this.bilgeStamp = Math.max(0, Number(stampS) || 0);
    }

    /** @hook What her hull holds, L. Default: no bound (a boat's freeboard is her bound). */
    public bilgeCapacityL(): number {
      return Infinity;
    }

    public hullLeakLps(condition?: number): number {
      const self = this as unknown as Stuff;
      const wear = condition ?? (MixinApi.isDurable(self) ? self.getWearCondition() : 1);
      const length = Math.max(0, this.hullLengthM());
      const band = this.seamBandFor(wear);
      const seams = length * seamDial(`ship.leak.${band}`, SEAM_LPS_PER_M[band] ?? 0);
      const flaws = MixinApi.isFlawed(self) ? self.flawLeakLPerHour(this.hullDraftM(), length) / 3600 : 0;
      return seams + flaws;
    }

    public seamBandFor(condition: number): string {
      for (const [floor, band] of SEAM_BANDS) if (condition >= floor) return band;
      return 'dilapidated';
    }

    /** @hook Her length, m. Default: none — a hull with no length lets nothing in. */
    public hullLengthM(): number {
      return 0;
    }

    /** @hook Her draft, m. Default: none. */
    public hullDraftM(): number {
      return 0;
    }

    /**
     * @hook Litres that came in through her hull between `fromS` and `toS`.
     * Default: at what her hull lets in now ({@link hullLeakLps}) — a hull
     * with no length lets nothing in. A ship integrates band by band over
     * her shell's line; a boat only while she is afloat.
     */
    public leakedBetween(fromS: number, toS: number): number | null {
      return this.hullLeakLps() * Math.max(0, toS - fromS);
    }
  }
  return BilgeMixin;
}
