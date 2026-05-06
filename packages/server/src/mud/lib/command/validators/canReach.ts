/**
 * canReach — the bound Stuff must be in the actor's inventory or in
 * their location's contents. Cheap reachability gate ahead of the
 * controller's per-verb logic.
 */

import type { Stuff } from '../../stuff/Stuff';
import type { FieldValidator } from '../../../api/command';
import { ContainmentApi } from '../../../api/containment';
import { DescribeApi } from '../../../api/describe';
import { MixinApi } from '../../../api/mixin';

const validator: FieldValidator = (obj, field, context) => {
  if (!(obj && typeof obj === 'object' && 'stuffId' in obj)) {
    return `${field} must be an object`;
  }

  const stuff = obj as Stuff;

  const giver = context.commandGiver;
  if (MixinApi.isContainer(giver)) {
    const inventory = ContainmentApi.getContents(giver);
    if (inventory.some((item) => item.stuffId === stuff.stuffId)) {
      return undefined;
    }
  }

  const contents = ContainmentApi.getContents(context.location);
  if (contents.some((item) => item.stuffId === stuff.stuffId)) {
    return undefined;
  }

  return `You cannot reach the ${DescribeApi.getDisplayName(stuff, 'object')}`;
};

export default validator;
