/**
 * TemperatureReading — how warm it is where you are standing.
 *
 * The `measure temperature` controller's body, moved under the rung it
 * always was. The refusal it used to hand-roll (*"You need a thermometer
 * in hand"*) is now the base's, and it names the CAPABILITY rather than
 * the class — so a second maker's thermometer works, which the
 * `instanceof Thermometer` check silently refused.
 */

import BiomeReading from '../../../lib/instrument/BiomeReading';
import { BiomeApi } from '../../../api/biome';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import type { Quantity, Unit } from '../../../lib/quantity';
import type { MeasureChannel } from '../../../lib/perception/MeasureChannel';

export default class TemperatureReading extends BiomeReading {
  protected label(): string {
    return 'Temperature';
  }

  protected mmlChannel(): MeasureChannel {
    return 'thermal';
  }

  protected override tagFamily(): string {
    return 'thermal';
  }

  protected async resolve(
    scope: Stuff & Container,
    detail: string | undefined,
  ): Promise<Quantity<Unit>> {
    return BiomeApi.resolveTemperatureFor(scope, detail) as Promise<
      Quantity<Unit>
    >;
  }
}
