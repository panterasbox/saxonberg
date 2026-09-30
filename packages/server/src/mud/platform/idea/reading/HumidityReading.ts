/**
 * HumidityReading — how much water the air here is holding.
 */

import BiomeReading from '../../../lib/instrument/BiomeReading';
import { BiomeApi } from '../../../api/biome';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Quantity, Unit } from '../../../lib/quantity';
import type { MeasureChannel } from '../../../lib/perception/MeasureChannel';

export default class HumidityReading extends BiomeReading {
  protected label(): string {
    return 'Humidity';
  }

  protected mmlChannel(): MeasureChannel {
    return 'atmosphere';
  }

  protected async resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>> {
    return BiomeApi.resolveHumidityFor(scope, detail) as Promise<
      Quantity<Unit>
    >;
  }
}
