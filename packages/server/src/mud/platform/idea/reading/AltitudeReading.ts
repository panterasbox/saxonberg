/**
 * AltitudeReading — how high you are, from the barometric drop.
 *
 *     altitude = (P_sea − P_local) / (ρ · g)
 *
 * ⭐ Split from the old `measure altitude`, which served two facts
 * through one controller: *how high am I* (the altimeter, this) and
 * *how high is the sun* (the sextant, {@link ElevationReading}). They
 * are different questions, need different instruments and use different
 * words, and the only thing they shared was the English word
 * "altitude" — which is why the second one is now `elevation`, the
 * word an observer actually uses for a body's angle above the horizon.
 */

import Reading from '../../../lib/instrument/Reading';
import { BiomeApi } from '../../../api/biome';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';
import { Quantity } from '../../../lib/quantity';
import type { CommandContext } from '../../../api/command';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Tooled } from '../../../lib/craft/Tooled';
import type { CompetenceBandName } from '../../../lib/advancement/CompetenceBand';

export default class AltitudeReading extends Reading {
  protected override async measure(
    context: CommandContext,
    target: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    if (!target || !MixinApi.isContainer(target)) {
      this.decline(
        context,
        Mml.compose`You aren't anywhere to measure.`,
        'no-scope',
      );
      return;
    }
    const scope = target as Stuff & Container;
    const atmosphere = await BiomeApi.resolveAtmosphereFor(scope);
    let density: Quantity<'kg/m³'>;
    try {
      density = BiomeApi.densityOf(atmosphere);
    } catch {
      this.decline(
        context,
        Mml.compose`Your altimeter has no calibration for '${atmosphere}'.`,
        'unknown-atmosphere',
      );
      return;
    }
    if (density.rawValue() === 0) {
      this.decline(
        context,
        Mml.compose`In vacuum, altitude has no barometric meaning.`,
        'no-medium-for-altitude',
      );
      return;
    }
    const altitude = await this.altitudeAt(scope, density);
    this.report(
      context,
      Mml.compose`Altitude: ${altitude.formatMml(undefined, undefined, { channel: 'spatial' })}\n`,
    );
  }

  public override async truth(target: Stuff | null): Promise<number | null> {
    if (!target || !MixinApi.isContainer(target)) return null;
    const scope = target as Stuff & Container;
    const atmosphere = await BiomeApi.resolveAtmosphereFor(scope);
    let density: Quantity<'kg/m³'>;
    try {
      density = BiomeApi.densityOf(atmosphere);
    } catch {
      return null;
    }
    if (density.rawValue() === 0) return null;
    return (await this.altitudeAt(scope, density)).rawValue();
  }

  private async altitudeAt(
    scope: Stuff & Container,
    density: Quantity<'kg/m³'>,
  ): Promise<Quantity<'m'>> {
    const localPressure = await BiomeApi.resolvePressureFor(scope);
    const seaLevel =
      BiomeApi.getRootBiome().getDefaultPressure() ?? Quantity.of(101325, 'Pa');
    const gravity = await BiomeApi.resolveGravityFor(scope);
    return Quantity.of(
      (seaLevel.rawValue() - localPressure.rawValue()) /
        (density.rawValue() * gravity.rawValue()),
      'm',
    );
  }
}
