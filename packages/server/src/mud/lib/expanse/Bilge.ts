/**
 * BilgeMixin — ⭐ **the water a hull holds** (harbors review 1).
 *
 * A ship and a boat both take water through their hulls, and before this
 * each kept its own `bilgeL`/`bilgeStamp` and its own integrator. What they
 * share is exactly this: litres in her as of a stamp, a leak integrated from
 * the stamp to now (never sampled), what her hull can hold, and water taken
 * out of her (pumped, bailed). What they do NOT share is WHERE the water
 * comes in — each host answers {@link Bilge.leakedBetween}:
 *
 *  - a **ship** (`platform/idea/Ship`): her hull's band on the house's
 *    clock, integrated band by band over her shell's line, and a hole;
 *  - a **boat** (`transport`'s `Boat`): the holes stove in her and a coat
 *    that no longer holds water — and only while she is afloat.
 *
 * Named for what it IS (the bilge — the water in the bottom of a hull), not
 * for what a hull can do. It carries state, so it is a mixin, not a shape.
 * It is not a `LiftSource`: what you lift the water OUT through is
 * the host's (a ship's bilge well, a boat herself), and each answers that
 * shape with this mixin's {@link Bilge.takeBilge}.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

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

    /**
     * @hook Litres that came in through her hull between `fromS` and `toS`.
     * Default: none — a hull that does not leak.
     */
    public leakedBetween(fromS: number, toS: number): number | null {
      void fromS;
      void toS;
      return 0;
    }
  }
  return BilgeMixin;
}
