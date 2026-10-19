/**
 * `harvests` brain (`/trade/ice/behavior/harvests`) — the ice crew
 * (storage-and-ice D22). On shift and out on the ice, one act a beat, in
 * the order the trade did them: scrape the snow off, mark the grid, cut
 * the blocks out — but only once the ice boss has marked the first patch
 * (his go-ahead: the ice is fit to work).
 *
 * ⚠ Every act is a literal verb through `forceCommand`, so the crew is
 * subject to the rules a person is: ice that will not bear them drops them
 * in, a missing tool refuses them, open water cannot be cut.
 *
 * ⭐ The crew waits on the BANK (its roster station) and walks out once
 * the boss's grid is down and the ice bears it ({@link IceHand}).
 *
 * config: `{ pool, shore, out, back }` — see `IceHand`.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { CommandGiver } from '@saxonberg/server/mud/lib/command/CommandGiver';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import IceHand from '../lib/IceHand';

export const brain = class HarvestsBrain extends IceHand {
  static label = 'harvests';
  static kind: TaskKind = 'work';
  static summary = 'Scrapes, marks and cuts ice on a frozen pool, once the boss says it will hold.';
  static discipline = 'ice-harvesting';
  static produces: readonly string[] = ['ice'];
  static claims: readonly EngagementSlot[] = ['hands'];
  static requiresFree: readonly EngagementSlot[] = ['hands'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'looks out over the ice and reaches for the saw');
  }

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host;
    if (!MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    if (!MixinApi.isEmployed(host)) return;
    if (host.shiftState() !== 'on-shift') return void (await this.offTheIce(ctx, host as unknown as Stuff));
    // ⭐ The boss's go-ahead is a marked patch: no grid, no going out.
    const goAhead = (ice: { getLog(): readonly { kind: string; areaM2: number }[] }): boolean =>
      ice.getLog().some((p) => p.kind === 'marked' && p.areaM2 > 0);
    const sheet = await this.onTheIce(ctx, host, (ice) => goAhead(ice) && ice.bears(ice.supportLoadKgOf(host)));
    if (sheet === null || !goAhead(sheet)) return;
    const giver = host as unknown as CommandGiver;
    const log = sheet.getLog();
    const scraped = log.some((p) => p.kind === 'scraped' && p.areaM2 > 0);
    if (!scraped) return void (await giver.forceCommand('scrape'));
    const marked = log.filter((p) => p.kind === 'marked').reduce((n, p) => n + p.areaM2, 0);
    if (marked < 1) return void (await giver.forceCommand('mark scraped'));
    await giver.forceCommand('cut marked');
  }
};
