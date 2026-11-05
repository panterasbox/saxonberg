/**
 * requiresInWater — verb-level precondition: the giver stands IN water —
 * its place is a water place with water over its floor (`depthNow() > 0`,
 * the read every water place has).
 *
 * Tagged on `descend` and `ascend`, which a water place affords to
 * whoever is in it. ⭐ A ship's rooms are water places so they can flood,
 * so a DRY cabin affords them too; this is what declines them there, and
 * so what keeps them off the cabin's card (a disabled verb is not shown).
 * The place answers — the same read `DescendController` refuses on.
 */

import type { CommandValidator } from '../../../api/command';
import { MixinApi } from '../../../api/mixin';

const validator: CommandValidator = (context) => {
  const giver = context.commandGiver;
  const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
  if (room !== null && MixinApi.isWaterPlace(room) && room.depthNow() > 0) return undefined;
  return 'You are not in the water.';
};

export default validator;
