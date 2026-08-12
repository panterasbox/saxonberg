/**
 * mustHaveBulkSlot — every bound Stuff must offer a bulk slot.
 *
 * The gate behind the whole bulk family: `drink`, `sip`, `spill`,
 * `fill`, `pour`, and the liquid *source* of `feed` / `water`. ⭐ This
 * is what stops `drink` being offered on a room.
 *
 * ⚠ Unlike its neighbours this is not a mixin predicate, and that is
 * the point. The controllers do not refuse on `isBulkable` — they
 * refuse on `BulkableApi.slotFor(x) === null` (`not-a-holder`,
 * `nothing-to-sip`, `nothing-to-spill`), because a thing can compose
 * `BulkableMixin` and still expose no slot for the affordance in hand.
 * Validating `isBulkable` instead would be a *different, weaker*
 * refusal wearing the same name — the menu would offer `fill` on a
 * slotless holder and the verb would then decline.
 *
 * So this calls the **same Api the controller calls**. One predicate,
 * one source of truth.
 *
 * ⚠ The affordance-scoped lookup (`model.target.via?.bulk?.affordance`)
 * is deliberately NOT reproduced here. A validator sees the resolved
 * value, not the match's `via`, so it asks the broader question — "is
 * there any bulk slot at all". That is the conservative direction: it
 * can only ever be more permissive than the controller, so it
 * over-reports rather than hiding a verb that would have worked.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { BulkableApi } from '../../../api/bulk';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (BulkableApi.slotFor(stuff as Stuff, undefined) === null) {
      return `${stuff.getPresentation()} doesn't hold liquid`;
    }
  }
  return undefined;
};

export default validator;
