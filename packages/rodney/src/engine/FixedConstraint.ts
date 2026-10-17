import { Vector3 } from 'three';
import Constraint from './Constraint';

const SLACK = 1.2;
const diff = new Vector3();

/**
 * Unidirectional constraint to mitigate the "super-elastic" effect.
 * Ported from physics/FixedConstraint.js.
 */
export default class FixedConstraint extends Constraint {
  resolve(): void {
    const restDistance = this.restDistance * SLACK;

    diff.subVectors(this.p1.position, this.p2.position);
    const currentDistance = diff.length() / SLACK;
    diff.normalize();

    const correction = diff.multiplyScalar(currentDistance - restDistance);
    if (currentDistance > restDistance) {
      this.p2.position.add(correction);
    }
  }
}
