/**
 * GravityReading — how hard the ground pulls here.
 */

import BiomeReading from '../../../lib/instrument/BiomeReading';
import { BiomeApi } from '../../../api/biome';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Quantity, Unit } from '../../../lib/quantity';
import type { MeasureChannel } from '../../../lib/perception/MeasureChannel';

export default class GravityReading extends BiomeReading {
  protected label(): string {
    return 'Gravity';
  }

  protected mmlChannel(): MeasureChannel {
    return 'gravity';
  }

  protected async resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>> {
    return BiomeApi.resolveGravityFor(scope, detail) as Promise<
      Quantity<Unit>
    >;
  }
}
