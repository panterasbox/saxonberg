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

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { MessageApi } from '../../../api/message';
import { BiomeApi } from '../../../api/biome';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';
import { CelestialApi } from '../../../api/celestial';
import Altimeter from '../../instrument/Altimeter';
import Sextant from '../../instrument/Sextant';

interface MeasureAltitudeModel extends CommandModel {
  // When 'sun' / 'moon', routes to the angular (sextant) branch
  // instead of the barometric altitude estimate (plan §4.4).
  body?: string;
}

export default class MeasureAltitudeController extends CommandController<MeasureAltitudeModel> {
  async execute(
    model: MeasureAltitudeModel,
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;

    // Angular branch: `measure altitude sun|moon` reads the body's
    // elevation/azimuth with a sextant. Any other arg (or none) falls
    // through to the barometric altitude estimate below.
    const bodyArg = model.body?.toLowerCase();
    if (bodyArg === 'sun' || bodyArg === 'moon') {
      await MeasureAltitudeController.#measureBody(bodyArg, ctx);
      return;
    }
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

  /**
   * Angular branch of `measure altitude sun|moon`: requires a Sextant
   * in hand, reads the body's altitude / azimuth at the actor's scope
   * from `CelestialApi`.
   */
  static async #measureBody(
    body: 'sun' | 'moon',
    ctx: CommandContext,
  ): Promise<void> {
    const giver = ctx.commandGiver;
    const inv = MixinApi.isContainer(giver)
      ? ContainmentApi.getContents(giver as Stuff & Container)
      : [];
    if (!inv.some((i) => i instanceof Sextant)) {
      ctx.note({
        kind: 'controller-rejected',
        reason: 'no-instrument',
        detail: 'no sextant in hand',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(Mml.compose`You need a sextant in hand.`)
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
        detail: 'no location to sight from',
      });
      MessageApi.scene(giver)
        .topic('world.perception.measurement.measure-altitude')
        .toSelf(Mml.compose`You aren't anywhere to take a sighting.`)
        .send();
      return;
    }

    const loc = scope as Stuff;
    const altitude =
      body === 'sun'
        ? await CelestialApi.sunAltitude(loc)
        : await CelestialApi.moonAltitude(loc);
    const azimuth =
      body === 'sun'
        ? await CelestialApi.sunAzimuth(loc)
        : await CelestialApi.moonAzimuth(loc);

    const out = Mml.compose`${body} altitude: ${altitude.formatMml()} · azimuth: ${azimuth.formatMml()}\n`;
    MessageApi.scene(giver)
      .topic('world.perception.measurement.measure-altitude')
      .toSelf(out)
      .send();
  }
}
