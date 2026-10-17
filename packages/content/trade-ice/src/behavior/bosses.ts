/**
 * `bosses` brain (`/trade/ice/behavior/bosses`) — the ice boss
 * (storage-and-ice D22). He reads the ice, and the go-ahead is his: only
 * when the field bears a person with a margin does he mark the first
 * patch himself — which is the crew's signal to start. A sheet that would
 * not hold two people is not worked.
 *
 * config: `{ marginKg?: number }` — what the ice must bear before the
 * go-ahead (default 200: two people and their tools).
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import IceSheet from '@saxonberg/content-water/src/thing/IceSheet';

export const brain = class BossesBrain {
  static label = 'bosses';
  static kind: TaskKind = 'work';
  static summary = 'Reads the ice and gives the crew the go-ahead when it will hold them.';
  static discipline = 'ice-harvesting';
  static claims: readonly EngagementSlot[] = ['hands'];
  static requiresFree: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'squints at the ice and chops a test hole');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    if (!MixinApi.isEmployed(host) || host.shiftState() !== 'on-shift') return;
    const room = host.getContainer();
    const floor = (room as unknown as { getFloor?(): unknown } | null)?.getFloor?.() ?? null;
    if (!(floor instanceof IceSheet) || !floor.supports(host as unknown as Stuff)) return;
    const log = floor.getLog();
    if (log.some((p) => p.kind === 'marked' && p.areaM2 > 0)) return;
    const margin = Number(ctx.config.marginKg ?? 200);
    const giver = host as unknown as CommandGiver;
    await giver.forceCommand('analyze ice');
    if (floor.bears(Number.isFinite(margin) ? margin : 200)) {
      if (!log.some((p) => p.kind === 'scraped' && p.areaM2 > 0)) await giver.forceCommand('scrape');
      await giver.forceCommand('mark scraped');
    }
  }
};
