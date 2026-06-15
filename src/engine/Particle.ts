import { Vector3 } from 'three';
import { DRAG } from './constants';

/**
 * A mass in the mass-spring system. Verlet integration.
 * Ported from flagwaver physics/Particle.js (THREE default import -> named).
 */
export default class Particle {
  position: Vector3;
  previous: Vector3;
  original: Vector3;
  mass: number;
  inverseMass: number;
  acceleration: Vector3;
  private tmp: Vector3;

  constructor(position: Vector3, mass: number) {
    this.position = position.clone();
    this.previous = position.clone();
    this.original = position.clone();
    this.mass = mass;
    this.inverseMass = 1 / mass;
    this.acceleration = new Vector3();
    this.tmp = new Vector3();
  }

  applyForce(force: Vector3): void {
    this.acceleration.addScaledVector(force, this.inverseMass);
  }

  integrate(deltaTimeSq: number): void {
    const next = this.tmp
      .subVectors(this.position, this.previous)
      .multiplyScalar(DRAG)
      .add(this.position)
      .addScaledVector(this.acceleration, deltaTimeSq);

    // Rotate the buffers (avoids allocation), exactly as the original.
    this.tmp = this.previous;
    this.previous = this.position;
    this.position = next;

    this.acceleration.set(0, 0, 0);
  }
}
