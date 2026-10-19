/**
 * `keeps-house` brain (`/trade/ice/behavior/keeps-house`) — the icehouse
 * keeper (storage-and-ice D22). On shift in the house she takes stock of
 * the stack, and when the packing reads sodden she digs the wet face out
 * and drops it on the floor: a soaked packing conducts like water, and a
 * house whose sawdust is never turned melts its summer away.
 *
 * config: `{ stack?: string }` — the keyword of the stack (default `stack`).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

export const brain = class KeepsHouseBrain {
  static label = 'keeps-house';
  static kind: TaskKind = 'work';
  static summary = 'Takes stock of the icehouse and digs out packing gone sodden.';
  static discipline = 'appraisal';
  static claims: readonly EngagementSlot[] = ['hands'];
  static requiresFree: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'pulls the door to and looks the stack over');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return;
    const room = host.getContainer();
    if (!room || !MixinApi.isContainer(room)) return;
    const store = room.getContents().find((c) => MixinApi.isStore(c as Stuff));
    if (!store || !MixinApi.isStore(store)) return;
    const word = String(ctx.config.stack ?? 'stack');
    const giver = host as unknown as CommandGiver;
    await giver.forceCommand(`measure stock ${word}`);
    const sodden = store.getLines().some((l) => l.role === 'packing' && (l.state.saturation ?? 0) >= 0.8);
    if (sodden) {
      await giver.forceCommand('get 1 sawdust');
      await giver.forceCommand('drop sawdust');
    }
  }
};
