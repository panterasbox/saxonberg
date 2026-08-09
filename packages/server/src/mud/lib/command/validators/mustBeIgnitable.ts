/**
 * mustBeIgnitable — the bound target (or its door) must be something
 * fire applies to: `Combustible` **or** a `Furnace`.
 *
 * The `ignite` / `douse` gate. Two mixins, one refusal — both
 * controllers accept either, and a validator naming only `Combustible`
 * would hide `ignite forge` on a furnace that is not itself combustible.
 *
 * ⚠ Door-aware for the same reason as its neighbours: MQL can land on
 * a door by keyword or by direction, and in the second case the thing
 * to test rides the match's `via.exit`. Uses `MqlApi.effectiveTarget`,
 * the helper both controllers call.
 *
 * ⚠ This states only "fire applies to this", NOT "this is currently
 * lit" / "currently unlit". `DouseController`'s `not-burning` and
 * `IgniteController`'s already-lit branches are *state* refusals, and
 * state is not a property the affordance resolver should freeze into a
 * menu — a thing that is unlit now is ignitable a second later. The
 * validator draws the kind line and leaves the state line to the
 * controller, where it can change.
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
    (s): s is Stuff & object =>
      MixinApi.isCombustible(s) || MixinApi.isFurnace(s),
  );
  if (!found) return `${match.stuff.getPresentation()} won't burn`;
  return undefined;
};

export default validator;
