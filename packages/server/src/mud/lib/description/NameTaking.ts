/**
 * NameTakingMixin — ⭐ *the thing that holds a name decides who may write it*
 * (ceramics W2; marked by controllers-are-io D7a): a maker its made thing once
 * (`Crafted`), the reforger the blade they re-made (`Assembled`), the person
 * an animal has chosen (`Bonded`). Default: nobody. `name` asks it.
 *
 * ⭐ **It composes more than once, and that is the point.** The rules stack
 * in whatever order a class wrote them — `Crafted` sits under `Named` on a
 * `Tool`, over it on a pot — so each holder writes
 * `super.canBeNamedBy(h, by) || <my rule>` and this layer hands the question
 * to whatever is beneath it. ⚠ That hand-off is the mixin-super idiom's one
 * legitimate look at a prototype, and it lives here rather than in every
 * holder: this layer may sit over a base with no rule at all.
 *
 * IS: the hook and its chain. IS NOT: the name (`NamedMixin`, which composes
 * this so every named thing answers), nor a verb protocol — almost everything
 * answers "nobody", so a card reading *answers: name* would lie.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';

export interface NameTaking {
  /**
   * May the hand at `handPath` (the person `by`, when known) give this its
   * name?
   */
  canBeNamedBy(handPath: string, by?: Stuff | null): boolean;
}

export function NameTakingMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class NameTakingMixin extends Base implements NameTaking {
    static _mixinName: string = 'NameTakingMixin';

    /**
     * @hook Who may give this its name. Override with
     * `super.canBeNamedBy(h, by) || <your rule>`.
     */
    public canBeNamedBy(handPath: string, by?: Stuff | null): boolean {
      const inner = (Base.prototype as Partial<NameTaking>).canBeNamedBy;
      return typeof inner === 'function'
        ? inner.call(this, handPath, by) === true
        : false;
    }
  };
}
