/**
 * WaterTableReading — `analyze water-table <observation well>` (water-supply
 * D13/D18): where the ground's water stands, by tape from the collar.
 * ⭐⭐ The ONLY reader of an aquifer's level, deliberately: every other
 * sense of a falling valley is a pump sucking air at somebody's own well.
 * The figure is metres below the collar, bracketed by hydrology.
 */

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ZoneApi } from '@saxonberg/server/mud/api/zone';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tool';
import ObservationWell from '../../thing/ObservationWell';
import Aquifer from '../Aquifer';

export default class WaterTableReading extends Reading {
  protected override async analyze(
    ctx: CommandContext,
    subject: Stuff | null,
    band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    if (!(subject instanceof ObservationWell)) {
      this.decline(ctx, Mml.compose`The water table is read down an observation well.`, 'not-an-obswell');
      return;
    }
    const depth = await this.truth(subject);
    if (depth === null) {
      this.decline(ctx, Mml.compose`The tape finds no water at the bottom of ${Mml.thing(subject)}.`, 'no-aquifer');
      return;
    }
    const giver = this.actorOf(ctx);
    const shown = this.bracketed(Quantity.of(depth, 'm'), band, this.seedFor(giver, subject, param));
    this.report(ctx, Mml.compose`The water stands ${shown} below the collar of ${Mml.thing(subject)}.\n`);
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({ discipline: 'hydrology', difficulty: 'standard', outcome: 'success' });
    }
  }

  /** Metres from the collar down to the aquifer's surface. */
  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!(target instanceof ObservationWell)) return null;
    const path = target.getAquifer();
    if (path === '') return null;
    const aquifer = await StuffApi.singleton<Aquifer>(path).catch(() => null);
    if (!(aquifer instanceof Aquifer)) return null;
    let collar = target.getCollarM();
    if (collar < 0) {
      const room = MixinApi.isContainable(target) ? target.getContainer() : null;
      collar = room === null ? 0 : ((await ZoneApi.elevationFor(room as Stuff).catch(() => null)) ?? 0);
    }
    const surface = aquifer.surfaceM(WorldClockApi.getNow().rawValue());
    return Math.max(0, collar - surface);
  }
}
