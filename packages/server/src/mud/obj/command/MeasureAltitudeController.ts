/**
 * MeasureAltitudeController — handler for `measure altitude`.
 *
 * Derives altitude from the barometric delta between the actor's
 * local pressure and the root universe biome's sea-level reference
 * (`/lib/biome/_defaultPressure`). Refuses in vacuum (atmospheric
 * density = 0 — no medium to define altitude against).
 *
 *   altitude = (P_sea − P_local) / (ρ · g)
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { MessageApi } from '../../api/message';
import { BiomeApi } from '../../api/biome';
import { Mml } from '../../api/mml';
import { Quantity } from '../../lib/quantity';
import { Altimeter } from '../instrument/Altimeter';

interface MeasureAltitudeModel extends CommandModel {}

export class MeasureAltitudeController extends CommandController<MeasureAltitudeModel> {
  async execute(
    _model: MeasureAltitudeModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof Altimeter)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no altimeter in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(Mml.compose`You need an altimeter in hand.`)
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
        detail: 'no atmospheric scope',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(Mml.compose`You aren't anywhere to measure.`)
        .send();
      return;
    }
    const containedScope = scope as Stuff & Container;

    const atmosphere = await BiomeApi.resolveAtmosphereFor(containedScope);
    let density: Quantity<'kg/m³'>;
    try {
      density = BiomeApi.densityOf(atmosphere);
    } catch {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'unknown-atmosphere',
        detail: `unknown atmosphere '${atmosphere}'`,
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(
          Mml.compose`Your altimeter has no calibration for '${atmosphere}'.`,
        )
        .send();
      return;
    }
    if (density.rawValue() === 0) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-medium-for-altitude',
        detail: 'vacuum — no medium to define altitude',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(
          Mml.compose`In vacuum, altitude has no barometric meaning.`,
        )
        .send();
      return;
    }

    const localPressure = await BiomeApi.resolvePressureFor(containedScope);
    const seaLevel =
      BiomeApi.getRootBiome().getDefaultPressure() ??
      Quantity.of(101325, 'Pa');
    const gravity = await BiomeApi.resolveGravityFor(containedScope);

    const altitudeMeters =
      (seaLevel.rawValue() - localPressure.rawValue()) /
      (density.rawValue() * gravity.rawValue());
    const altitude = Quantity.of(altitudeMeters, 'm');

    const body = Mml.compose`Altitude: ${altitude.formatMml()}\n`;
    MessageApi.scene(giver)
      .topic('world.perception.measurement.measure-altitude')
      .toSelf(body)
      .send();
  }
}
