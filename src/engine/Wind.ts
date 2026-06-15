import { Vector3 } from 'three';
import { AIR_DENSITY } from './constants';
import { windModifiers } from './windModifiers';

function windPressure(speed: number): number {
  return 0.5 * AIR_DENSITY * speed * speed;
}

// Perfectly axis-aligned vectors cause unrealistic outcomes; nudge zeros.
function disturbVector(v: Vector3): Vector3 {
  if (v.x === 0) v.x = 0.001;
  if (v.y === 0) v.y = 0.001;
  if (v.z === 0) v.z = 0.001;
  return v;
}
function disturbScalar(n: number): number {
  return n === 0 ? 0.001 : n;
}

export interface WindOptions {
  direction?: Vector3;
  speed?: number;
  directionFn?: (direction: Vector3, time: number) => Vector3;
  speedFn?: (speed: number, time: number) => number;
}

/** Ported from subjects/Wind.js (time source injected for testability/determinism). */
export default class Wind {
  direction: Vector3;
  speed: number;
  directionFn: (direction: Vector3, time: number) => Vector3;
  speedFn: (speed: number, time: number) => number;
  pressure: Vector3;

  constructor(options: WindOptions = {}) {
    this.direction = options.direction ?? new Vector3(1, 0, 0);
    this.speed = options.speed ?? 2.5;
    this.directionFn = options.directionFn ?? windModifiers.hangingBannerDirection;
    this.speedFn = options.speedFn ?? windModifiers.gustySpeed;
    this.pressure = new Vector3();
  }

  update(time: number = Date.now()): void {
    this.directionFn(disturbVector(this.pressure.copy(this.direction)), time)
      .normalize()
      .multiplyScalar(windPressure(this.speedFn(disturbScalar(this.speed), time)));
  }
}
