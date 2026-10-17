import { Object3D, Vector3 } from 'three';
import { G } from './constants';
import localizeForce from './localizeForce';
import type Cloth from './Cloth';

const gravity = new Vector3(0, -G, 0);

/** Ported from interactions/applyGravityToCloth.js. */
export default function applyGravityToCloth(cloth: Cloth, object?: Object3D): void {
  const force = localizeForce(gravity, object);
  for (const particle of cloth.particles) {
    particle.acceleration.add(force);
  }
}
