/**
 * mustHaveDressing — verb-level precondition for `treat`/`bind`/`dress`.
 * Rejects when the actor controls no reachable dressing item (any
 * `DressingMixin`-bearing Stuff — a bandage / gauze / clean rag). The
 * controller resolves the specific dressing; this only asserts *a*
 * dressing is reachable. Modeled on `requiresTravelCredential`.
 */

import type { CommandValidator } from '../../../api/command';
import { MqlApi } from '../../../api/mql';
import { MixinApi } from '../../../api/mixin';
import type { Dressing } from '../../vitals/Dressing';
import type { Stuff } from '../../stuff/Stuff';

const validator: CommandValidator = (context) => {
  const dressing =
    MqlApi.resolveMany('reachable', {
      commandGiver: context.commandGiver,
      scope: 'reachable',
    }).stuff.find((s): s is Stuff & Dressing => MixinApi.isDressing(s)) ??
    null;
  if (dressing) return undefined;
  return 'you have nothing to dress the wound with';
};

export default validator;
