/**
 * CartesianCoordinatesMixin — `[x, y, z]` data carrier.
 *
 * Used by `CartesianLocation` to place a location inside a
 * `CartesianZone`'s grid. Flat zones leave `z = 0`. This mixin carries
 * only the coordinate triple — grid registration and neighbor lookups
 * live on `CartesianZone`.
 *
 * Persistence: `coordinates` is auto-persisted via `persistentFields`.
 */

import type { MixinConstructor } from '../mixin';

/** Public shape added by CartesianCoordinatesMixin. */
export interface CartesianCoordinates {
  coordinates: [number, number, number];
  getX(): number;
  getY(): number;
  getZ(): number;
  setX(x: number): void;
  setY(y: number): void;
  setZ(z: number): void;
}

export function CartesianCoordinatesMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class CartesianCoordinatesMixin extends Base {
    static _mixinName = 'CartesianCoordinatesMixin';
    static persistentFields = ['coordinates'];

    coordinates: [number, number, number] = [0, 0, 0];

    getX(): number {
      return this.coordinates[0];
    }
    getY(): number {
      return this.coordinates[1];
    }
    getZ(): number {
      return this.coordinates[2];
    }
    setX(x: number): void {
      this.coordinates = [x, this.coordinates[1], this.coordinates[2]];
    }
    setY(y: number): void {
      this.coordinates = [this.coordinates[0], y, this.coordinates[2]];
    }
    setZ(z: number): void {
      this.coordinates = [this.coordinates[0], this.coordinates[1], z];
    }
  };
}
