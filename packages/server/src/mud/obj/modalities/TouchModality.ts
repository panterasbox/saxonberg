/**
 * TouchModality — the tactile singleton. Contact modality.
 *
 * Touch is a CONTACT modality: no propagation walk. The signal is
 * the ambient temperature at the actor's scope, derived via the
 * biome chain (`BiomeApi.resolveTemperatureFor`).
 *
 * Two access surfaces:
 *   - `signalAt(loc)` — the sync substrate contract. v1 reads the
 *     scope's INLINE `_temperature` field only (no biome chain). If
 *     the location explicitly declares its temperature, returns a
 *     `Touch`; otherwise returns null. Verb-side callers that want
 *     the full chain use `touchAt` async instead.
 *   - `touchAt(loc, detailKey?)` — async helper that does the full
 *     biome chain walk (`BiomeApi.resolveTemperatureFor`). The
 *     `feel` verb's bare form and the per-detail `feel <target>`
 *     branch both consume this.
 */

import { Modality } from '../../lib/perception/Modality';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Container } from '../../lib/spatial/Container';
import { Touch } from '../../lib/perception/Touch';
import { MixinApi } from '../../api/mixin';
import { BiomeApi } from '../../api/biome';
import { Quantity } from '../../lib/quantity';

export class TouchModality extends Modality {
  public override signalAt(loc: Stuff & Container): Touch | null {
    if (!MixinApi.isAtmospheric(loc)) return null;
    const raw = (loc as unknown as { _temperature?: Quantity<'K'> | null })
      ._temperature;
    if (!raw) return null;
    return Touch.of(raw);
  }

  /**
   * Async ambient-touch read. Walks the full biome chain via
   * `BiomeApi.resolveTemperatureFor` so locations without an inline
   * `_temperature` still surface the universe-default ambient.
   * Optional `detailKey` triggers the per-detail temperature
   * override on the scope's `_detailTemperatures` map (parallel to
   * the existing `measure temperature <detail>` flow).
   */
  public static async touchAt(
    loc: Stuff & Container,
    detailKey?: string,
  ): Promise<Touch> {
    const t = await BiomeApi.resolveTemperatureFor(loc, detailKey);
    return Touch.of(t);
  }
}
