/**
 * `cranks` brain (`/trade/diving/behavior/cranks`) — **the pump hand**
 * (underwater C3, D27).
 *
 * A hard-hat diver lives on the air pump: stop pumping and their helmet
 * runs dry in a minute. The pump hand works the pump whenever a diver is
 * on its hose, with the same verb a player types (`pump pump`), and stops
 * when nobody is down.
 *
 * config: `{}` — the pump is whatever pump stands where the hand does.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import AirPump from '../thing/AirPump';

export const brain = class {
  static label = 'cranks';
  static kind: TaskKind = 'work';
  static summary = 'Works the air pump while a diver is down on its hose.';
  static claims: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'keeps a diver in air');
  }
  // A diver below breathes whether or not anybody is watching the quay.
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    const here = host.getContainer();
    if (here === null || !MixinApi.isContainer(here)) return;
    const pump = here.getContents().find((c) => c instanceof AirPump) as AirPump | undefined;
    if (!pump) return;
    const plan = await pump.planPump(host);
    if (plan.kind !== 'plan') return;
    if (MixinApi.isEngaged(host) && host.getEngagements().length > 0) return;
    await host.executeCommand('pump pump');
  }
};
