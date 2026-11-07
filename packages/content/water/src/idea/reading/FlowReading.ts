/**
 * FlowReading — `analyze flow <weir>` (water-supply D18): how much water is
 * going over a weir, bracketed by the reader's hydrology. A weir is the
 * structure built so its flow is a function of the head on it; the eye
 * reads the nappe and the staff beside it. The figure is the catalogue's
 * flow at the weir's own place on the river, after every draw upstream.
 *
 * Small flows print in litres a second, a river in cubic metres.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { CompetenceBand, type CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tool';
import ControlStructure from '../../thing/ControlStructure';
import type WatercourseCatalogue from '../WatercourseCatalogue';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

export default class FlowReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    if (!(subject instanceof ControlStructure) || subject.getControlKind() !== 'weir') {
      this.decline(ctx, Mml.compose`You read a flow at a weir — the water has to go over something you can measure.`, 'not-a-weir');
      return;
    }
    const m3s = await this.truth(subject);
    if (m3s === null) {
      this.decline(ctx, Mml.compose`Nothing is going over it that anybody could name.`, 'no-reach');
      return;
    }
    const giver = this.actorOf(ctx);
    const value = m3s < 1 ? Quantity.of(m3s * 1000, 'L/s') : Quantity.of(m3s, 'm³/s');
    const shown = this.bracketed(value, band, this.seedFor(giver, subject, param));
    let body = Mml.compose`Over ${Mml.thing(subject)}: about ${shown}.`;
    // ⭐⭐ A competent reader squares it with the gates (D14/D28): what the
    // gates above account for, and what nobody does — a cut bank shows
    // here first, as water that is simply not there.
    if (CompetenceBand.atOrAbove(band, 'competent')) {
      const cat = await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH).catch(() => null);
      const acct = cat ? await cat.accountAt(subject.getReachRef(), WorldClockApi.getNow().rawValue()) : null;
      if (acct !== null) {
        const ls = (m3s: number): string => `${(m3s * 1000).toFixed(0)} L/s`;
        const tail =
          acct.otherM3S > 0.001
            ? `; another ${ls(acct.otherM3S)} is leaving the river that no gate accounts for.`
            : ', and that is all the river is missing.';
        body = Mml.compose`${body} The gates above take ${ls(acct.gatesM3S)} by their settings${tail}`;
      }
    }
    this.report(ctx, Mml.compose`${body}\n`);
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'hydrology', difficulty: 'standard', outcome: 'success' });
    }
  }

  /** The flow at the weir's place on its river, m³/s. */
  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!(target instanceof ControlStructure)) return null;
    const ref = target.getReachRef();
    if (ref === '') return null;
    const cat = await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH).catch(() => null);
    if (cat === null) return null;
    const nowS = WorldClockApi.getNow().rawValue();
    const flow = await cat.flowAt(ref, nowS, await cat.liveDraws(nowS));
    return flow?.m3s ?? null;
  }
}
