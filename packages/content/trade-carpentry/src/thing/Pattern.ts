/**
 * Pattern — ⭐ a founder's pattern (ceramics D23): a wooden copy of a thing,
 * carved a shade oversize for the metal it will be cast in. What it is FOR
 * is to be pressed into sand (`impress pattern in flask`), and what it
 * leaves there is not its own shape — a lump of wood — but the impression
 * it was cut to carry: the thing's kind, whose it was, and the allowance
 * that makes the cast come out true.
 *
 * Reusable: the sand is broken away from the cast, never from the pattern.
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { CraftedMixin } from '@saxonberg/server/mud/lib/craft/Crafted';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { ImpressionData } from '@saxonberg/server/mud/lib/mould/Impression';
import { Impression } from '@saxonberg/server/mud/lib/mould/Impression';

export default class Pattern extends CraftedMixin(Good) {
  static fieldMeta: FieldMeta = {
    heldImpression: { persistent: true, authorable: true },
  };

  /** The impression this pattern was cut to carry, or `null`. */
  public heldImpression: ImpressionData | null = null;

  public getHeldImpression(): ImpressionData | null {
    return this.heldImpression;
  }

  public setHeldImpression(value: ImpressionData | null): void {
    this.heldImpression = value && typeof value.kindPath === 'string' ? new Impression(value).toData() : null;
  }

  /**
   * @hook ⭐ What a pattern leaves pressed into sand is the shape it was
   * CUT to, not its own wooden one (ceramics D23).
   */
  public override leaveImpression(nowS: number): ImpressionData | null {
    if (this.heldImpression === null) return super.leaveImpression(nowS);
    return { ...this.heldImpression, carried: { ...this.heldImpression.carried } };
  }
}
