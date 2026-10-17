import { Object3D, Vector3 } from 'three';
import { DRAG_COEFFICIENT } from './constants';
import localizeForce from './localizeForce';
import type Cloth from './Cloth';
import type Wind from './Wind';

const tmp = new Vector3();
const normal = new Vector3();
const edge1 = new Vector3();
const edge2 = new Vector3();

/**
 * Applies wind pressure per-face. Ported from interactions/applyWindForceToCloth.js,
 * but face normals are computed from current particle positions and the index
 * buffer (BufferGeometry has no geometry.faces array anymore).
 */
export default function applyWindForceToCloth(cloth: Cloth, wind: Wind | null, object?: Object3D): void {
  if (!wind) return;

  const particles = cloth.particles;
  const index = cloth.index;
  const faceArea = (cloth.restDistance * cloth.restDistance) / 2;

  // localizeForce returns shared scratch; multiplyScalar mutates it in place.
  const force = localizeForce(wind.pressure, object).multiplyScalar(
    (DRAG_COEFFICIENT * faceArea) / 3,
  );

  for (let i = 0, ii = index.length; i < ii; i += 3) {
    const a = particles[index[i]];
    const b = particles[index[i + 1]];
    const c = particles[index[i + 2]];

    edge1.subVectors(b.position, a.position);
    edge2.subVectors(c.position, a.position);
    normal.crossVectors(edge1, edge2).normalize();

    tmp.copy(normal).multiplyScalar(normal.dot(force));
    a.applyForce(tmp);
    b.applyForce(tmp);
    c.applyForce(tmp);
  }
}
