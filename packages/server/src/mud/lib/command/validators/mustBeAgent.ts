/**
 * mustBeAgent — every bound Stuff must extend the `Agent` class.
 *
 * Gate for `give`'s recipient: items can only be handed to active
 * actors. `Agent` is a class (Character extends it, future NPC
 * agents extend it) — not a mixin — so the check is `instanceof`.
 *
 * Distinct from the verb-level `requiresAnimate` validator, which
 * gates the actor (the command-giver). This is a field-level
 * validator on the target.
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't see any X here` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { Agent } from '../../stuff/Agent';
import { DescribeApi } from '../../../api/describe';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!(stuff instanceof Agent)) {
      return `${DescribeApi.getDisplayName(stuff as Stuff)} can't accept things`;
    }
  }
  return undefined;
};

export default validator;
