/**
 * mustBeAtFastTravelNode — verb-level precondition: the actor is at a
 * fast-travel node (a TPA terminal). Used by `register`. Since `register`
 * is contributed by the terminal itself (FastTravelMixin.commandContributions
 * on the `environment` bucket), the afforded node is `context.commandSource`
 * — no need to scan room contents by hand.
 */

import type { CommandValidator } from "../../../api/command";
import { MixinApi } from "../../../api/mixin";

const validator: CommandValidator = (context) => {
  if (MixinApi.isFastTravel(context.commandSource)) return undefined;
  return "there is no terminal here";
};

export default validator;
