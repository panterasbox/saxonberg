/**
 * PressureReading — the weight of the air where you are standing.
 *
 * ⭐ It is also what `altitude` is derived FROM: a barometer estimating
 * how high you are is reading this and doing arithmetic, which is why
 * the two channels are separate and the altimeter is its own instrument.
 */

import BiomeReading from '../../../lib/instrument/BiomeReading';
import { BiomeApi } from '../../../api/biome';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Quantity, Unit } from '../../../lib/quantity';
import type { MeasureChannel } from '../../../lib/perception/MeasureChannel';

export default class PressureReading extends BiomeReading {
  protected label(): string {
    return 'Pressure';
  }

  protected mmlChannel(): MeasureChannel {
    return 'atmosphere';
  }

  protected async resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>> {
    return BiomeApi.resolvePressureFor(scope, detail) as Promise<
      Quantity<Unit>
    >;
  }
}
