/**
 * ForumsMixin — the forum capability, as a hosted *update*.
 *
 * The sibling of `CommsMixin`: a capability that rides the aether implant
 * as a hosted update (`ForumsUpdate = ForumsMixin(AetherHostedMixin(Idea))`),
 * conferring the forum verb surface (read + post). Like comms, it acts on
 * behalf of its host (the operator), resolved via `getHost()` — the forum
 * update has no presence of its own.
 *
 * Unlike comms (whose `tell` carries the whole send), the forum
 * operations are Board/Entry CRUD that live on `ForumsApi` /
 * `ForumsLogic`; this mixin is the capability *gate* + verb contributor +
 * operator resolver. The `forum` controller reaches a holder's update via
 * `ContainmentApi.findReachable(actor, null, MixinApi.isForums)` (the
 * `DmController` pattern) and confirms the capability is active.
 *
 * **Soft pairing with `AetherHostedMixin`** — same as `CommsMixin`:
 * `getOperator()` reads `getHost()`, provided by the co-composed
 * `AetherHostedMixin`, through a single documented cast naming that
 * pairing.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { InactiveCapabilityError } from '../security/RequiresActive';
import type { AetherHosted } from '../augmentation/AetherHosted';
import type { AetherHost } from '../message/Aether';

export interface Forums {
  /**
   * The operator (host) this forum update acts on behalf of, or null when
   * unhosted. Throws `InactiveCapabilityError` via `requireOperator` when
   * a verb needs a live operator.
   */
  getOperator(): (Stuff & AetherHost) | null;

  /** Resolve the operator or throw if the capability is inactive. */
  requireOperator(verb: string): Stuff & AetherHost;
}

export function ForumsMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  class ForumsMixin extends Base implements Forums {
    static _mixinName = 'ForumsMixin';

    /**
     * Verbs the forum capability grants. Flows into the host's recency
     * stack via the hosted-update self-seeding
     * (`CommandApi.collectHostedUpdateDefs` + `applyHostedUpdateDelta`),
     * with the forum update as `commandSource`.
     */
    static commandContributions: CommandContributions = {
      self: ['social/forum.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    getOperator(): (Stuff & AetherHost) | null {
      // ForumsMixin and AetherHostedMixin compose orthogonally, so the
      // `getHost` back-ref isn't on this mixin's own `this` type; it's
      // co-composed on the update class (ForumsUpdate). The cast names
      // that pairing contract — identical to CommsMixin.tell.
      return (this as unknown as AetherHosted).getHost();
    }

    requireOperator(verb: string): Stuff & AetherHost {
      const operator = this.getOperator();
      if (!operator || !MixinApi.isAether(operator)) {
        throw new InactiveCapabilityError('AetherMixin', verb);
      }
      return operator;
    }
  }
  return ForumsMixin;
}
