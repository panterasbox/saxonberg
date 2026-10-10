/**
 * DepthReading — the sounding: `measure depth` with a lead line.
 *
 * ⭐ Why the water column could not be deferred: the lead is a navigator's
 * oldest fix. It reports how deep the water is — and, armed with tallow,
 * what the bottom is — and over ground with a character of its own (a
 * bank, a bar) that is enough to know where you are. So a sounding over a
 * band that authors its own depth collapses the reckoning; over the open
 * sea's anonymous depth it only tells you the depth.
 *
 * Competence buys information, not outcomes: everybody gets the depth
 * (bracketed by band); a `competent` hand also reads the bottom. No eye
 * rung — you cannot see the bottom.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { ExpanseApi } from '@saxonberg/server/mud/api/expanse';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { Positioned } from '@saxonberg/server/mud/lib/expanse/Positioned';
import type { Voyaging } from '@saxonberg/server/mud/lib/expanse/Voyaging';
import WaterExpanse from '../WaterExpanse';
import WaterBand from '../WaterBand';

/** How close a sounding over known ground puts you, nautical miles. */
const SOUNDING_FIX_NM = 2;

export default class DepthReading extends Reading {
  protected override async measure(
    context: CommandContext,
    _target: Stuff | null,
    _instrument: Stuff & Tooled,
    band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const found = await this.seaUnder(giver);
    if (found === null) {
      this.decline(context, Mml.compose`There is no water under you to sound.`, 'no-water');
      return;
    }
    const { craft, sea } = found;
    const at = craft.getExpansePosition()!;
    const depth = await sea.depthAt(at);
    const shown = this.bracketed(Quantity.of(depth, 'm'), band, this.seedFor(giver, null, param));
    const lines: string[] = [];
    let line = Mml.compose`The lead finds bottom at ${shown}.`;
    if (CompetenceBand.rank(band) >= CompetenceBand.rank('competent')) {
      const bottom = await sea.bottomAt(at);
      if (bottom !== '') line = Mml.compose`${line} The tallow comes up with ${bottom} in it.`;
    }
    lines.push(line.toString());
    const known = (await sea.bandsAt(at)).find((b) => b instanceof WaterBand && b.getDepthM() !== null);
    if (known) {
      craft.takeFix(at, SOUNDING_FIX_NM);
      lines.push('The depth and the bottom fit one patch of ground hereabouts; you know within a mile or two where you are.');
    }
    this.report(context, Mml.fromMarkup(`${lines.join('\n')}\n`));
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'navigation', difficulty: 'standard', outcome: 'success' });
    }
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target) return null;
    const found = await this.seaUnder(target);
    if (found === null) return null;
    return found.sea.depthAt(found.craft.getExpansePosition()!);
  }

  private async seaUnder(
    who: Stuff,
  ): Promise<{ craft: Stuff & Positioned & Voyaging; sea: WaterExpanse } | null> {
    const root = MixinApi.isContainable(who) ? who.getRootContainer() ?? who : who;
    const craft = await ExpanseApi.craftAt(root.getTemplatePath() ?? '');
    if (!craft || !MixinApi.isVoyaging(craft) || craft.getExpansePosition() === null) return null;
    const path = craft.getExpanse();
    const sea = path ? await StuffApi.singleton<Stuff>(path).catch(() => null) : null;
    return sea instanceof WaterExpanse ? { craft, sea } : null;
  }
}
