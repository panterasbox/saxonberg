/**
 * Bole — **a felled trunk on the ground, and how many lengths are left
 * in it.**
 *
 * A standard oak is tonnes, and a tree is the first Thing whose product
 * exceeds a body. Felling drops ONE bole where the tree stood — mass =
 * the species' wood density × 0.9 m³ (oak ≈ 675 kg; can't-budge is
 * emergent from mass, never a flag) — and cross-cutting is a second act
 * on it: `fell bole` takes one length of green timber off per
 * engagement until `lengthsLeft` reaches zero, when the butt and the
 * brash are the wood's again. The bole on the ground IS the seam
 * `trade-sawing` attaches to (boards, not lengths), and it is what the
 * transport pack's sledge and dray exist to move.
 *
 * ⭐ **It affords its own cross-cut** (`commandContributions.self`), so a
 * bole dragged to the yard one day is still cross-cuttable there with no
 * stand in the room. A bole in a `Wood` room survives a restart in the
 * room's container slice; a bole dragged into a transient room is lost
 * there, as any loose thing is.
 *
 * What composing it claims: a bole is a Thing — Tangible, Containable
 * (it can in principle be loaded: the haulage seam), Chattel (it is
 * somebody's) — and nothing else.
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { MarkupAugmenter } from '@saxonberg/server/mud/api/mml';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { Final } from '@saxonberg/server/mud/lib/security/decorators';

/** Kilograms one cross-cut length of timber takes off the bole. */
export const TIMBER_MASS_KG = 24;

/** Cubic metres of trunk a standard yields — what the mint sizes by. */
export const BOLE_M3 = 0.9;

/** Cross-cut lengths a standard's bole carries. */
export const BOLE_LENGTHS = 6;

const BoleBase = DetailedMixin(Thing);

/** *"six lengths in it yet"* / *"one length left"* — appended on `look`. */
function lengthsAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  const left = (host as unknown as Bole).getLengthsLeft?.();
  if (typeof left !== 'number') return text;
  const line =
    left <= 0
      ? 'There is nothing left in it but the butt.'
      : left === 1
        ? 'One length left in it.'
        : `${GrammarApi.cap(GrammarApi.inWords(left))} lengths in it yet.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export default class Bole extends BoleBase {
  static fieldMeta: FieldMeta = {
    lengthsLeft: { persistent: true, authorable: true },
  };

  /** ⭐ The bole affords its own cross-cut, wherever it lies. */
  static commandContributions: CommandContributions = {
    self: ['trade/forestry/cmd/forestry/fell.yaml'],
    environment: [],
    peers: [],
  };

  static markupAugmenters: MarkupAugmenter[] = [lengthsAugmenter];

  /** Cross-cut lengths of timber still in it. */
  public lengthsLeft = BOLE_LENGTHS;

  public getLengthsLeft(): number {
    return this.lengthsLeft;
  }

  public setLengthsLeft(value: number): void {
    this.lengthsLeft = Math.max(0, Math.floor(Number(value) || 0));
  }

  /**
   * Take one length off: decrement, drop the mass by a length's worth,
   * return what is left. Sealed — the count and the mass move together.
   */
  @Final
  public takeLength(): number {
    if (this.lengthsLeft <= 0) return 0;
    this.lengthsLeft -= 1;
    const mass = this.getMass().rawValue();
    this.setMass(Quantity.of(Math.max(0, mass - TIMBER_MASS_KG), 'kg'));
    return this.lengthsLeft;
  }
}
