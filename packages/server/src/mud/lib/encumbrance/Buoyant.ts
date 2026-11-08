/**
 * BuoyantMixin — ⭐ **what the water makes of a body** (underwater D14):
 * how much water this body and everything on it pushes aside, and the net
 * force up on it in a water of a given density — positive floats it,
 * negative sinks it. What the water asks to know how fast you go down and
 * whether you can swim up.
 *
 * ## ⭐ Why it is its own mixin (controllers-are-io D6)
 *
 * It shipped on `LoadBearingMixin`, which is the BURDEN — what a bearer
 * carries against its strain ceiling. Displacement is a different
 * question with a different walk (it attenuates nothing: the water bears
 * all of a pack, however it is carried). Every creature is honestly both,
 * so this is a co-use split on `Creature`; the breath model and the water
 * place narrow on `MixinApi.isBuoyant`. `LoadBearing` reads
 * {@link NEUTRAL_DENSITY_KG_M3} from here for its in-water weight.
 */

import type { MixinConstructor } from '../mixin';
import type { Quantity } from '../quantity';
import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Slotted } from '../slot/Slotted';
import { MixinApi } from '../../api/mixin';
import { LOAD_BEARING_DEFAULTS } from './LoadBearing';

/** Standard gravity, m/s². */
const G = 9.81;

/** What a thing with no material is taken to weigh per liter: neutral. */
export const NEUTRAL_DENSITY_KG_M3 = 1000;

/**
 * Mass and displaced volume of one carried subtree — the buoyancy walk.
 * Unlike {@link walk} it attenuates nothing: the water bears all of a
 * pack, however it is carried.
 */
function displacementWalk(
  item: Stuff,
  depth: number,
  visited: Set<string>,
): { massKg: number; volumeM3: number } {
  if (depth > LOAD_BEARING_DEFAULTS.MAX_DEPTH || visited.has(item.stuffId)) {
    return { massKg: 0, volumeM3: 0 };
  }
  visited.add(item.stuffId);
  let massKg = 0;
  let volumeM3 = 0;
  if (MixinApi.isTangible(item)) {
    massKg = item.getMass().rawValue();
    const rho = item.getMaterial()?.getDensity().rawValue() ?? NEUTRAL_DENSITY_KG_M3;
    volumeM3 = rho > 0 ? massKg / rho : 0;
  }
  if (MixinApi.isContainer(item)) {
    for (const child of item.getContents()) {
      const sub = displacementWalk(child, depth + 1, visited);
      massKg += sub.massKg;
      volumeM3 += sub.volumeM3;
    }
  }
  return { massKg, volumeM3 };
}

/** The public surface: what the water asks of a body. */
export interface Buoyant {
  /**
   * ⭐ How much water this body and everything on it would push aside,
   * m³ (underwater D14): the body by its own density (fat floats), the
   * air in its lungs squeezed by the water's weight over it, and every
   * carried and worn thing by its material.
   */
  getDisplacedVolumeM3(depthM?: number): number;
  /**
   * ⭐ The net force up on this body in a water of `waterDensityKgM3`, N —
   * positive floats it, negative sinks it. What the water asks to know
   * how fast you go down and whether you can swim up.
   */
  getNetBuoyancyN(waterDensityKgM3: number, depthM?: number): number;
}

export function BuoyantMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class BuoyantMixin extends Base implements Buoyant {
    static _mixinName: string = 'BuoyantMixin';

    public getDisplacedVolumeM3(depthM = 0): number {
      return this.displacement(depthM).volumeM3;
    }

    public getNetBuoyancyN(waterDensityKgM3: number, depthM = 0): number {
      const { massKg, volumeM3 } = this.displacement(depthM);
      return G * (waterDensityKgM3 * volumeM3 - massKg);
    }

    /** The body and all it carries and wears: mass, and water pushed aside. */
    private displacement(depthM: number): { massKg: number; volumeM3: number } {
      const self = this as unknown as Stuff & Container & Slotted;
      const bodyKg = MixinApi.isTangible(self) ? self.getMass().rawValue() : 0;
      const bodyDensity =
        (self as unknown as { getBodyDensity?(): Quantity<'kg/m³'> }).getBodyDensity?.().rawValue() ??
        NEUTRAL_DENSITY_KG_M3;
      let massKg = bodyKg;
      let volumeM3 = bodyDensity > 0 ? bodyKg / bodyDensity : 0;
      // The air in the lungs, squeezed by the water over it (Boyle).
      if (MixinApi.isRespiration(self)) {
        volumeM3 += self.getLungAirL() / 1000 / (1 + Math.max(0, depthM) / 10);
      }
      const visited = new Set<string>([self.stuffId]);
      for (const item of self.getContents()) {
        const sub = displacementWalk(item, 0, visited);
        massKg += sub.massKg;
        volumeM3 += sub.volumeM3;
      }
      for (const [, occupants] of self.getAllOccupants()) {
        for (const occ of occupants) {
          const sub = displacementWalk(occ as unknown as Stuff, 0, visited);
          massKg += sub.massKg;
          volumeM3 += sub.volumeM3;
        }
      }
      return { massKg, volumeM3 };
    }
  };
}
