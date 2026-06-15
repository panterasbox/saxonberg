import { Vector3 } from 'three';
import type Particle from './Particle';

const diff = new Vector3();

/** Symmetric distance (spring) constraint. Ported from physics/Constraint.js. */
export default class Constraint {
  p1: Particle;
  p2: Particle;
  restDistance: number;

  constructor(p1: Particle, p2: Particle, restDistance: number) {
    this.p1 = p1;
    this.p2 = p2;
    this.restDistance = restDistance;
  }

  resolve(): void {
    diff.subVectors(this.p2.position, this.p1.position);
    const currentDistance = diff.length();
    if (currentDistance === 0) return;

    const correction = diff.multiplyScalar(
      (1 - this.restDistance / currentDistance) / 2,
    );
    this.p1.position.add(correction);
    this.p2.position.sub(correction);
  }
}
