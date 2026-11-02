/**
 * `paints` brain — the house painter's round (paint build D20).
 *
 * At whatever station the roster has put him, he looks at the buildings
 * whose outside is at hand (the place's landed structures) and paints the
 * one that most wants it — a coat gone, or worn thin — through the literal
 * `paint` verb, gated exactly as a typed line is: he needs the brush in his
 * hand and paint in his pot, and he is refused as anyone would be. Take his
 * brush and the town peels.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { AppSettingKeys } from '@saxonberg/server/mud/lib/config/AppSettings';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import BuildingBase from '@saxonberg/server/mud/lib/structure/Building';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';
import { Urgency } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { TaskKind } from '@saxonberg/server/mud/lib/behavior/Urgency';
import type { EngagementSlot } from '@saxonberg/server/mud/lib/activity/Engaged';

function thinM(): number {
  try {
    const n = Number.parseFloat(AppApi.setting(AppSettingKeys.structureCoatThinM) ?? '');
    return Number.isFinite(n) && n > 0 ? n : 0.00001;
  } catch {
    return 0.00001;
  }
}

export const brain = class {
  static label = 'paints';
  static kind: TaskKind = 'work';
  static summary = 'Paints the building at his station that has lost its coat, through the ordinary `paint` verb.';
  static claims: readonly EngagementSlot[] = ['hands', 'body'];
  static urgency(): Urgency {
    return new Urgency('wanted', 'finds a front that has lost its coat');
  }
  static presenceGated = false;
  static ambient = false;

  static async act(ctx: BrainContext): Promise<void> {
    const host = ctx.host as Stuff;
    if (host.isDestroyed() || !MixinApi.isCommandGiver(host) || !MixinApi.isContainable(host)) return;
    const room = host.getContainer();
    if (!(room instanceof Place)) return;
    const thin = thinM();
    // The one that most wants it: a coat gone first, then a thin one.
    const wanting = room
      .landedStructuresNow()
      // A house painter paints BUILDINGS — not a ship lying at the quay.
      .filter((s): s is BuildingBase => s instanceof BuildingBase)
      .map((s) => ({ s, gone: s.coatGone(), thin: s.coatThin(thin) }))
      .filter((w) => w.gone || w.thin)
      .sort((a, b) => Number(b.gone) - Number(a.gone));
    const target = wanting[0]?.s;
    if (!target) return;
    const word = MixinApi.isPerceptible(target) ? target.getKeywords()[0] : null;
    if (!word) return;
    await host.executeCommand(`paint ${word}`);
  }
};
