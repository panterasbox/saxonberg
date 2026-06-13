/**
 * mustBeVisible — every bound Stuff must compose `VisibleMixin`.
 *
 * `VisibleMixin` is the description-rendering surface (`getLong` /
 * `getShort` / display name). A look-shaped verb operating on a
 * Stuff that doesn't compose it would fall through to the
 * controller's "You see nothing special." catch-all, which is
 * usually a category error rather than the right outcome — content
 * meant for inspection should declare its descriptions. Surfacing
 * the gap as a friendly validator failure beats letting the
 * controller emit a generic placeholder.
 *
 * Future perception-system integration (light levels, concealment,
 * sight-line checks) layers on top of this gate, not in place of
 * it: the mixin presence check is a structural prerequisite, the
 * perception checks are situational.
 *
 * Empty MQL results pass through — the controller decides what
 * no-match means in its domain (renders the room, prints "you don't
 * see X", etc.).
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';
import { MqlApi } from '../../../api/mql';

const validator: FieldValidator = (value, field, _context) => {
  const stuffs = MqlApi.extractStuffs(value);
  if (stuffs === null) return `${field} must be an object`;
  for (const stuff of stuffs) {
    if (!MixinApi.isVisible(stuff as Stuff)) {
      return `you can't see ${stuff.getPresentation()}`;
    }
  }
  return undefined;
};

export default validator;
