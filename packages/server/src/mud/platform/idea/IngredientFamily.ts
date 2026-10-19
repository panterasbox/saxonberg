/**
 * IngredientFamily — ⭐ a kind of ingredient that several recipe tags
 * belong to, so a refusal can say what you offered is NEAR (sugar D5).
 *
 * `sweetener` lists `sugar`, `honey` and `syrup`. A recipe slot still asks
 * for exactly one tag and the family gates NOTHING — honey is not sugar,
 * and a cook knows it. What the family buys is the sentence: offer honey
 * where sugar is wanted and the refusal says *honey is a different
 * sweetener*, instead of *there isn't enough sugar* over a jar of it.
 *
 * Content, not a kernel list: a material CITES its family
 * (`Material._familyPath`) and the row is loaded when a refusal follows
 * the citation (load on use). A second family — `fat`: tallow, lard,
 * butter, oil — is a row any pack ships with no kernel edit.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import type { FieldMeta } from '../../lib/mixin';

const IngredientFamilyBase = SingletonMixin(Idea);

export default class IngredientFamily extends IngredientFamilyBase {
  /** The family's own word (`sweetener`). Gates nothing. */
  public tag: string = '';
  /** The recipe tags that belong to it (`sugar`, `honey`, `syrup`). */
  public members: string[] = [];

  static fieldMeta: FieldMeta = {
    tag: { persistent: true, authorable: true },
    members: { persistent: true, authorable: true },
  };

  public getTag(): string {
    return this.tag;
  }

  public getMembers(): readonly string[] {
    return [...this.members];
  }

  /** Is `tag` one of this family's recipe tags? */
  public hasMember(tag: string): boolean {
    return this.members.includes(tag);
  }
}
