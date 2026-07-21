/**
 * MeasureShadowController — handler for `measure shadow [<detail>]`.
 * Reads the sun's elevation / azimuth at the actor's immediate scope
 * from `CelestialApi`; refuses without a Sundial in hand.
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { CelestialApi } from '../../../api/celestial';
import Sundial from '../../instrument/Sundial';

interface MeasureShadowModel extends CommandModel {
  detail?: string;
}

const TOPIC = 'world.perception.measurement.measure-shadow';

export default class MeasureShadowController extends CommandController<MeasureShadowModel> {
  async execute(_model: MeasureShadowModel, ctx: CommandContext): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? (giver as Stuff & Container).getContents()
      : [];
    if (!inv.some((i) => i instanceof Sundial)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no sundial in hand',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You need a sundial in hand.`)
        .send();
      return;
    }
    const scope = (giver as Stuff & {
      getContainer?: () => unknown;
    }).getContainer?.();
    if (!scope || !MixinApi.isContainer(scope as Stuff)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-scope',
        detail: 'no location to read',
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.compose`You aren't anywhere to read a shadow.`)
        .send();
      return;
    }

    const loc = scope as Stuff;
    const altitude = await CelestialApi.sunAltitude(loc);
    const azimuth = await CelestialApi.sunAzimuth(loc);
    const above = altitude.rawValue() > 0;
    const lead = above
      ? Mml.compose`Your sundial's shadow marks the sun.`
      : Mml.compose`The sun is below the horizon; the sundial casts no shadow.`;
    const body = Mml.compose`${lead}
sun elevation: ${altitude.formatMml()} · azimuth: ${azimuth.formatMml()}
`;

    MessageApi.scene(giver).topic(TOPIC).toSelf(body).send();
  }
}
