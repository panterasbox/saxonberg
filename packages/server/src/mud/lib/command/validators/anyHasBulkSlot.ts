/**
 * anyHasBulkSlot — at least ONE bound Stuff offers a bulk slot.
 *
 * `mustHaveBulkSlot`'s plural sibling, for a slot whose candidates the
 * controller narrows itself — `bathe`'s `water`, which binds by default
 * every reachable vessel and shore and gets into the one that will take
 * you (a tub in a room that cites no water must still bathe you, so
 * *every* is the wrong question). It asks the same Api the controller
 * does (`BulkableApi.slotFor`), so a place that cites no water (a ship's
 * dry cabin) is no candidate and the verb is not offered on it.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { BulkableApi } from '../../../api/bulk';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  // Nothing bound: the controller says what is missing, in its own words.
  if (stuffs.length === 0) return undefined;
  if (stuffs.some((s) => BulkableApi.slotFor(s as Stuff, undefined) !== null)) return undefined;
  const first = stuffs[0];
  return first ? `${first.getPresentation()} holds no water` : 'There is no water there.';
};

export default validator;
