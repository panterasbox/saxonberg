/**
 * LocationApi — geometry-agnostic Location queries.
 *
 * Thin facade over `Location.getVolume` / `getCeilingHeight`. The
 * Location class declares both methods (returning `null` from the
 * base), with `CartesianLocation` / `SphericalLocation` deriving
 * concrete values from their topology. Callers that don't care
 * which kind of Location they hold use the Api wrappers.
 */

import type { Quantity } from '../lib/quantity';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import { SecurityApi } from './security';

export class LocationApi {
  /**
   * Atmospheric-bearing volume of `room`, in m³, or `null` when the
   * room's topology can't produce a finite value (e.g., a Location
   * not yet placed in a zone). Geometry-agnostic — works for any
   * Location subclass with a `getVolume()` method.
   */
  public static getVolume(room: Stuff & Container): Quantity<'m³'> | null {
    const r = room as unknown as {
      getVolume?: () => Quantity<'m³'> | null;
    };
    return r.getVolume?.() ?? null;
  }

  /**
   * Floor-to-ceiling vertical extent of `room`, in m, or `null`
   * when undefined. Geometry-agnostic counterpart to
   * `getVolume`.
   */
  public static getCeilingHeight(
    room: Stuff & Container,
  ): Quantity<'m'> | null {
    const r = room as unknown as {
      getCeilingHeight?: () => Quantity<'m'> | null;
    };
    return r.getCeilingHeight?.() ?? null;
  }
}

SecurityApi.decorateApiClass(LocationApi);
