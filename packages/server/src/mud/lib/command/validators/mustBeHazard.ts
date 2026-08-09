/**
 * mustBeHazard — the bound target (or its door) must compose `isHazard`.
 *
 * The `disarm` gate (and `arm`, which narrows the same way).
 *
 * ⚠ **Door-aware, and it has to be.** MQL can land on a door two ways:
 * by keyword on the door itself (`open oak`) or by direction through
 * the location (`open north`), where the door rides the match's
 * `via.exit` rather than being the matched Stuff. A naive
 * `MixinApi.isHazard(stuff)` check would pass the first and REFUSE the
 * second — hiding a verb that works, which is the under-reporting
 * failure the sweep exists to avoid.
 *
 * So this calls `MqlApi.effectiveTarget`, the same direct-first,
 * door-second helper the controller calls. One predicate, one source
 * of truth.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi, type MqlOneResult } from '../../../api/mql';

const validator: FieldValidator = (value, _field, _context) => {
  if (value === undefined || value === null) return undefined;
  const match = value as MqlOneResult;
  if (!match.stuff) return undefined;
  const found = MqlApi.effectiveTarget(
    match,
    (s): s is Stuff & object => MixinApi.isHazard(s),
  );
  if (!found) return `${match.stuff.getPresentation()} isn't a trap`;
  return undefined;
};

export default validator;
