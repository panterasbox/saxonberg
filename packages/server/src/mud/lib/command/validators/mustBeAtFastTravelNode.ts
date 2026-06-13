/**
 * mustBeAtFastTravelNode — verb-level precondition: there is a fast-travel
 * node (a TPA terminal) in the actor's environment. Used by `register`.
 * Local, no global index — scans only the actor's current room contents.
 */

import type { CommandValidator } from "../../../api/command";
import { MixinApi } from "../../../api/mixin";

const validator: CommandValidator = (context) => {
  const room = context.location;
  if (room && MixinApi.isContainer(room)) {
    for (const s of room.getContents()) {
      if (MixinApi.isFastTravel(s)) return undefined;
    }
  }
  return "there is no terminal here";
};

export default validator;
