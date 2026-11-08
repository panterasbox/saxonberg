/**
 * StageReading — `analyze stage <gauge>` (water-supply D18): how high the
 * river stands against a staff gauge, bracketed by hydrology. The stage is
 * the reach's at-a-station depth — `d ∝ Q^0.4` (Leopold & Maddock), the
 * same hydraulic geometry the catalogue reads a channel with — so a dry
 * month reads low on the staff and a freshet high, with nobody authoring
 * either.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tool';
import StaffGauge from '../../thing/StaffGauge';
import type WatercourseCatalogue from '../WatercourseCatalogue';

const CATALOGUE_PATH = '/system/water/idea/WatercourseCatalogue';

export default class StageReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    if (!(subject instanceof StaffGauge)) {
      this.decline(ctx, Mml.compose`A stage is read off a staff gauge standing in the water.`, 'not-a-gauge');
      return;
    }
    const stage = await this.truth(subject);
    if (stage === null) {
      this.decline(ctx, Mml.compose`The staff stands in no water anybody could name.`, 'no-reach');
      return;
    }
    const giver = this.actorOf(ctx);
    const shown = this.bracketed(Quantity.of(stage, 'm'), band, this.seedFor(giver, subject, param));
    this.report(ctx, Mml.compose`The water stands at ${shown} on ${Mml.thing(subject)}.\n`);
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'hydrology', difficulty: 'easy', outcome: 'success' });
    }
  }

  /** The reach's at-a-station depth, m: 0.4 · Q^0.4. */
  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!(target instanceof StaffGauge)) return null;
    const ref = target.getReachRef();
    if (ref === '') return null;
    const cat = await StuffApi.singleton<WatercourseCatalogue>(CATALOGUE_PATH).catch(() => null);
    if (cat === null) return null;
    const nowS = WorldClockApi.getNow().rawValue();
    const flow = await cat.flowAt(ref, nowS, await cat.liveDraws(nowS));
    if (flow === null) return null;
    return 0.4 * Math.pow(Math.max(flow.m3s, 0), 0.4);
  }
}
