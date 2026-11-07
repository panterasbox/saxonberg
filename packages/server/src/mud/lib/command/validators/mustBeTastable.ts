/**
 * mustBeTastable — anything you could get into your mouth.
 *
 * Three ways a thing can reach a tongue, and they are not edibility: lye is not
 * edible, and a taste of it must still burn.
 *
 *   - **edible matter**: a bite off an apple, a cut, a loaf;
 *   - **held matter**: a sip of whatever a vessel holds, liquid or powder, edible
 *     or not: a stew, a flask of lye, a sack of flour;
 *   - **a solid that would do something**: a lick of a lump of quicklime or a cake
 *     of caustic soap, which takes nothing and doses or burns you.
 *
 * Everything else is refused, which is what "a floor and a knife cannot" means. A
 * lead pig is refused too: its toxicity is authored at amount 0, because lead
 * reaches a body by the leach and a lick of it is inert.
 *
 * Empty results pass through; the controller decides what no target means.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

function wouldDoSomething(s: Stuff): boolean {
  if (!MixinApi.isTangible(s)) return false;
  const material = s.getMaterial();
  if (!material) return false;
  return (
    material.getToxicity().some((t) => t.amount > 0) ||
    material.getCorrosiveTo().some((t) => t === 'tissue' || t === 'protein')
  );
}

const validator: FieldValidator = (value, field, _context) => {
  // An authored detail says for itself what it tastes of.
  if ((value as { via?: { detailPath?: string[] } } | null)?.via?.detailPath?.length) return undefined;
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    const s = stuff as Stuff;
    if (MixinApi.isTangible(s) && s.isEdible()) continue;
    if (MixinApi.isBulkable(s) && s.hasInteriorBulk() && !s.isBulkEmpty('interior')) continue;
    if (wouldDoSomething(s)) continue;
    return `you can't taste ${s.getPresentation()}`;
  }
  return undefined;
};

export default validator;
