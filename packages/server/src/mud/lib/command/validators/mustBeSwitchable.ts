/**
 * mustBeSwitchable — the bound target (or its door) must compose `isSwitchable`.
 *
 * The `switch` gate.
 *
 * ⚠ **Door-aware, and it has to be.** MQL can land on a door two ways:
 * by keyword on the door itself (`open oak`) or by direction through
 * the location (`open north`), where the door rides the match's
 * `via.exit` rather than being the matched Stuff. A naive
 * `MixinApi.isSwitchable(stuff)` check would pass the first and REFUSE the
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
    (s): s is Stuff & object => MixinApi.isSwitchable(s),
  );
  if (!found) return `${match.stuff.getPresentation()} isn't something you can switch`;
  return undefined;
};

export default validator;
