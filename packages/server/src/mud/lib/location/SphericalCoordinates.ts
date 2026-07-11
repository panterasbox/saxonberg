/**
 * SphericalCoordinatesMixin — `[rho, theta, phi]` focus + `radius`.
 *
 * A spherical location is a sphere of given radius positioned by focus
 * in spherical coordinates inside a `SphericalZone`. Angles between
 * spheres are arbitrary, so exits in a spherical zone are semantic
 * labels authored by hand — this mixin doesn't derive adjacency.
 *
 * Persistence: `coordinates` and `radius` are auto-persisted.
 */

import type { MixinConstructor } from '../mixin';

/** Public shape added by SphericalCoordinatesMixin. */
export interface SphericalCoordinates {
  getCoordinates(): [number, number, number];
  setCoordinates(value: [number, number, number]): void;
  getRho(): number;
  getTheta(): number;
  getPhi(): number;
  setRho(rho: number): void;
  setTheta(theta: number): void;
  setPhi(phi: number): void;
  getRadius(): number;
  setRadius(radius: number): void;
}

export function SphericalCoordinatesMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class SphericalCoordinatesMixin extends Base {
    static _mixinName = 'SphericalCoordinatesMixin';
    static persistentFields = ['coordinates', 'radius'];

    /**
     * [rho, theta, phi] — radial distance + two angles.
     *
     * @authorable
     */
    protected coordinates: [number, number, number] = [0, 0, 0];

    /**
     * Sphere radius. Default 1.0 makes a unit sphere.
     *
     * @authorable
     */
    protected radius: number = 1.0;

    getCoordinates(): [number, number, number] { return this.coordinates; }
    setCoordinates(value: [number, number, number]): void {
      this.coordinates = value;
    }

    getRho(): number {
      return this.coordinates[0];
    }
    getTheta(): number {
      return this.coordinates[1];
    }
    getPhi(): number {
      return this.coordinates[2];
    }
    setRho(rho: number): void {
      this.coordinates = [rho, this.coordinates[1], this.coordinates[2]];
    }
    setTheta(theta: number): void {
      this.coordinates = [this.coordinates[0], theta, this.coordinates[2]];
    }
    setPhi(phi: number): void {
      this.coordinates = [this.coordinates[0], this.coordinates[1], phi];
    }
    getRadius(): number {
      return this.radius;
    }
    setRadius(radius: number): void {
      this.radius = radius;
    }
  };
}
