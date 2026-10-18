// CleanlinessLogic — the logic singleton behind CleanlinessApi: only the
// orchestration no one object owns (cleanliness B48). The acts themselves
// are the things' own methods. See docs/subsystems/cleanliness.md.

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import { MixinApi } from "../../../api/mixin";
import { CleanserUse } from "../../../lib/cleanliness/CleanserUse";
import type { WashTogetherRequest, WashTogetherResult } from "../../../api/cleanliness";

const CleanlinessApiCallers = SecurityPolicies.FromModule(
  "/api/cleanliness#CleanlinessApi",
);

/** @internal */
export class CleanlinessLogic extends ApiLogic {
  /** See {@link CleanlinessApi.washTogether}. */
  @CallSecurity(CleanlinessApiCallers)
  public washTogether(request: WashTogetherRequest): WashTogetherResult[] {
    const items = request.items.filter((t) => !t.isDestroyed() && MixinApi.isSoilable(t));
    const spec = { ...request.spec, coWashed: items };
    const out: WashTogetherResult[] = [];
    for (const item of items) {
      if (!MixinApi.isSoilable(item)) continue;
      out.push({ item, outcome: item.washSite(spec, "") });
    }
    new CleanserUse(request.spec.cleansers).spend(out.length);
    return out;
  }
}
