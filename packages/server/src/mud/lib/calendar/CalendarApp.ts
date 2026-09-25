/**
 * CalendarAppMixin — the personal calendar as a hosted *update* on the
 * aether implant (clinical-medicine D12).
 *
 * The `ForumsMixin` sibling: a capability that rides the implant as a
 * hosted update (`CalendarUpdate = CalendarAppMixin(AetherHostedMixin(Idea))`),
 * cloned into the host by `Avatar.installDefaultLoadout`. It carries no
 * state of its own — the entries live on the Avatar (`CalendarMixin`); the
 * app is only the SURFACE, reached through the hosted-update self-seeding
 * that flows `commandContributions.self` onto the host's verb stack.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { CommandContributions } from '../../api/command';
import { MixinApi } from '../../api/mixin';
import { InactiveCapabilityError } from '../security/RequiresActive';
import type { AetherHost } from '../message/Aether';
import type { AetherHosted } from '../augmentation/AetherHosted';
import type { CalendarKeeping } from './Calendar';

export interface CalendarApp {
  /** The host (operator) whose calendar this app surfaces, or null. */
  getOperator(): (Stuff & AetherHost) | null;
  /** The operator as a calendar keeper, or throw if inactive/unable. */
  requireCalendarKeeper(verb: string): Stuff & CalendarKeeping;
}

export function CalendarAppMixin<TBase extends MixinConstructor<Stuff>>(
  Base: TBase,
) {
  class CalendarAppMixin extends Base implements CalendarApp {
    static _mixinName = 'CalendarAppMixin';

    static commandContributions: CommandContributions = {
      self: ['platform/cmd/social/calendar.yaml'],
      peers: [],
      environment: [],
    };

    getOperator(): (Stuff & AetherHost) | null {
      // CalendarAppMixin and AetherHostedMixin compose orthogonally; the
      // `getHost` back-ref rides the composed update class. The cast names
      // that pairing contract — identical to ForumsMixin.getOperator.
      return (this as unknown as AetherHosted).getHost();
    }

    requireCalendarKeeper(verb: string): Stuff & CalendarKeeping {
      const operator = this.getOperator();
      if (!operator || !MixinApi.isAether(operator)) {
        throw new InactiveCapabilityError('AetherMixin', verb);
      }
      if (!MixinApi.isCalendarKeeping(operator)) {
        // A host with no calendar — the app has nothing to show.
        throw new InactiveCapabilityError('CalendarMixin', verb);
      }
      return operator as unknown as Stuff & CalendarKeeping;
    }
  }
  return CalendarAppMixin;
}
