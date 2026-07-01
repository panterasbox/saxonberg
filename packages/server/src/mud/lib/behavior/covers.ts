/**
 * `covers` brain — the proprietor covers their own bar.
 *
 * A simple v1 cover-driver (clause-unheld only — demand has no measure
 * yet): on a presence-gated cadence, if **no other active on-shift maker is
 * present** in the proprietor's location, the proprietor begins a cover
 * (`EmploymentApi.beginCover`) — a transient on-shift Employment that
 * confers the Position's capability (`MakerMixin`), so an order finds a
 * fulfiller even when the rostered bartender is off. When a real bartender
 * is back on and present, the cover ends (`endCover`). The cover is unpaid
 * by construction (the wage settlement skips a proprietor-held Employment).
 *
 * Presence-gated: the proprietor only steps in to tend when someone's around
 * to be served. A richer management brain (hiring, demand-driven coverage,
 * multi-tender nights) is deferred. config: `{}` (none needed — the business
 * and its position come from the proprietor edge + roster).
 */

import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { EmploymentApi } from '../../api/employment';
import type { BrainContext, BrainStatics } from './brain';

export const brain = class {
  static label = 'covers';
  static presenceGated = true;

  static async act(ctx: BrainContext): Promise<void> {
    const self = ctx.host;
    if (!MixinApi.isContainable(self)) return;
    const business = EmploymentApi.businessOfProprietor(self);
    if (!business) return;

    const loc = ContainmentApi.getContainer(self);
    if (!loc || !MixinApi.isContainer(loc)) return;

    // Is the maintain clause held — another active (on-shift) maker present?
    let otherMakerPresent = false;
    for (const c of ContainmentApi.getContents(loc)) {
      if (c !== self && MixinApi.isMaker(c)) {
        otherMakerPresent = true;
        break;
      }
    }

    const businessPath = business.getTemplatePath() ?? '';
    const covering =
      EmploymentApi.employmentOf(self, businessPath)?.status === 'on-shift';

    if (!otherMakerPresent && !covering) {
      EmploymentApi.beginCover(self, business);
    } else if (otherMakerPresent && covering) {
      EmploymentApi.endCover(self, business);
    }
  }
} satisfies BrainStatics;
