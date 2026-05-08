/**
 * mustBeVisible — every bound Stuff must be a Stuff at all.
 *
 * Visibility-system integration is a future hook (light levels,
 * concealment, perception checks). For v1 the gate is just "is the
 * binding actually a Stuff (or a list of Stuffs) at all" — a sanity
 * check on the wrapper shape that distinguishes a real MQL hit from
 * a wrong-type bind.
 *
 * Empty MQL results pass through — the controller decides what
 * no-match means in its domain (renders the room, prints "you don't
 * see X", etc.).
 */

import type { FieldValidator } from '../../../api/command';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  // Empty (no MQL match) passes — controller-level concern.
  return undefined;
};

export default validator;
