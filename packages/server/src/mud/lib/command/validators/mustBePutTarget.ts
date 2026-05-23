/**
 * mustBePutTarget — composite gate for `put X (in|on) Y`. Accepts
 * any Stuff that composes Container OR Surfaced (the desk-with-
 * drawer composes both; pure tables only Surfaced; chests only
 * Container).
 *
 * Cheaper than running `mustBeContainer` AND `mustBeSurfaced` with
 * OR-logic at the verb layer. The PutController disambiguates
 * via preposition once the target's been gated as accepting one
 * shape or the other.
 *
 * Empty MQL results pass through — the controller decides what
 * no-match means.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { DescribeApi } from '../../../api/describe';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    const s = stuff as Stuff;
    if (!MixinApi.isContainer(s) && !MixinApi.isSurfaced(s)) {
      return `${DescribeApi.getDisplayName(stuff, 'that')} can't hold things`;
    }
  }
  return undefined;
};

export default validator;
