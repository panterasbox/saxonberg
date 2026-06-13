/**
 * mustBeInLocation — every bound Stuff must currently be in the
 * actor's location's contents.
 *
 * **Why the validator exists.** MQL's `scope:` declaration is a
 * search hint, not a security gate; an MQL query can resolve any
 * Stuff in the world. Verbs that act on things in the room (`get`)
 * MUST validate that the bound Stuff is actually in the actor's
 * current location's contents — otherwise a query like
 * `get online:alice:i:torch` would let the actor pick up alice's
 * torch in another room.
 *
 * `mustBeInLocation` is stricter than `canReach`: it excludes the
 * actor's own inventory (`get` shouldn't pick up things you
 * already carry), excludes attached doors (you can't pick up an
 * attached door), and excludes the location itself (you can't
 * pick up the room).
 *
 * Empty MQL results pass through — the controller produces the
 * `you don't see X here` message.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { ContainmentApi } from '../../../api/containment';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  if (stuffs.length === 0) return undefined;

  const location = context.location;
  // No location → nothing is "here", so every bound stuff fails the
  // membership check below and gets the "you don't see X here" message.
  const locationIds = new Set(
    (location ? ContainmentApi.getContents(location) : []).map(
      (s) => s.stuffId,
    ),
  );

  for (const stuff of stuffs) {
    if (!locationIds.has((stuff as Stuff).stuffId)) {
      return `you don't see ${stuff.getPresentation()} here`;
    }
  }
  return undefined;
};

export default validator;
