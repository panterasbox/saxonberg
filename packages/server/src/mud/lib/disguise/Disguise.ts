/**
 * Disguise — the masking descriptor + the worn-side bearer mixin.
 *
 * A `Disguise` is what a covering presents instead of the wearer's true
 * identity: an `appearsAs` string ("a hooded figure"), the body regions
 * it `covers`, and whether it `masksIdentity` (the v1 reveal gate). The
 * worn-side {@link DisguiseBearingMixin} carries this data on a garment
 * (a hood, a mask, a cloak); the wearer-side `DisguisableMixin`
 * (`Disguisable.ts`) resolves it.
 *
 * NOT a viewer concept — a `Disguise` is objective (the hood looks like
 * "a hooded figure" to everyone). Viewer-relativity lives one layer up
 * in `RecognitionApi.describe`, which withholds a *known* name when the
 * target is masked. NOT item-identity illusion (a potion masking its own
 * type) — that's the type axis (Wave 7), class-keyed, no per-instance
 * masking host in v1.
 */

import type { MixinConstructor } from '../mixin';

/**
 * What a covering presents in place of the wearer's identity. `covers`
 * is forward-shaped for v2 feature-by-feature coverage stacking
 * (face/body/voice); the v1 reveal gate reads only `masksIdentity`.
 */
export interface Disguise {
  /** The masked presentation, e.g. "a hooded figure". */
  appearsAs: string;
  /** Body/identity regions hidden, e.g. `['face']`. v2 reads these. */
  covers: string[];
  /** v1 gate: `true` ⇒ a recognized wearer's name is withheld. */
  masksIdentity: boolean;
}

/** Worn-side surface: a garment that can present a {@link Disguise}. */
export interface DisguiseBearing {
  /** The disguise this garment presents, or `null` when it bears none. */
  getDisguise(): Disguise | null;
  setAppearsAs(value: string): void;
  setCovers(value: string[]): void;
  setMasksIdentity(value: boolean): void;
}

/**
 * Composed onto a `Garment` (see `DisguiseGarment`) to make it a
 * disguise source. The authored data (`appearsAs` / `covers` /
 * `masksIdentity`) seeds from the template; an empty `appearsAs` means
 * the garment bears no disguise (so a plain garment composing this is
 * inert).
 */
export function DisguiseBearingMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class DisguiseBearingMixin extends Base implements DisguiseBearing {
    static _mixinName = 'DisguiseBearingMixin';

    static persistentFields = ['appearsAs', 'covers', 'masksIdentity'];

    public appearsAs: string = '';
    public covers: string[] = [];
    public masksIdentity: boolean = false;

    setAppearsAs(value: string): void {
      this.appearsAs = value;
    }

    setCovers(value: string[]): void {
      this.covers = [...value];
    }

    setMasksIdentity(value: boolean): void {
      this.masksIdentity = value;
    }

    getDisguise(): Disguise | null {
      if (!this.appearsAs) return null;
      return {
        appearsAs: this.appearsAs,
        covers: [...this.covers],
        masksIdentity: this.masksIdentity,
      };
    }
  };
}
