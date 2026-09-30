/**
 * MeasureDensityController — handler for `measure density <vessel>`.
 *
 * The hydrometer's read (fermentation D5): a Maturing vessel answers
 * its batch's SPECIFIC GRAVITY — `1 + remaining sugar × 0.0004`, the
 * pure derived number D4's experiment plots (no gauge, no ambient UI;
 * the number costs the instrument and the trip to the cellar). Any
 * other bulk holder answers its held material's relative density.
 * Refuses without a Hydrometer in hand.
 */

import Reading from '../../../lib/instrument/Reading';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { MqlOneResult } from '../../../api/mql';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';

interface MeasureDensityModel extends CommandModel {
  target: MqlOneResult;
}

export default class DensityReading extends Reading {
  protected override async measure(
    ctx: CommandContext,
    subject: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    param: string,
  ): Promise<void> {
    // ⭐ The controller's body verbatim, under the rung it always was.
    const model = { target: { stuff: subject, raw: param } } as unknown as MeasureDensityModel;
    const giver = ctx.commandGiver;
    const target = model.target?.stuff as Stuff | undefined;
    if (!target || !MixinApi.isBulkable(target)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'not-a-vessel',
        detail: 'nothing to float the glass in',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`There's nothing there to float the glass in.`)
        .send();
      return;
    }
    if (target.isBulkEmpty('interior')) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'empty-vessel',
        detail: 'the vessel is empty',
      });
      MessageApi.scene(giver)
        .topic('sense.reading')
        .toSelf(Mml.compose`${Mml.thing(target)} is empty — nothing to read.`)
        .send();
      return;
    }

    let gravity: number;
    if (MixinApi.isMaturing(target)) {
      gravity = target.getGravity();
    } else {
      const material = target.getBulkMaterial('interior');
      const density = material?.getDensity().rawValue() ?? 0;
      gravity = density > 0 ? density / 1000 : 1;
    }
    const reading = gravity.toFixed(3);
    MessageApi.scene(giver)
      .topic('sense.reading')
      .toSelf(
        Mml.compose`The hydrometer settles at a specific gravity of ${reading}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} floats a hydrometer in ${Mml.thing(target)}.`,
      )
      .send();
  }
}
