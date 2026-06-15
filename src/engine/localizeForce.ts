import { Object3D, Vector3 } from 'three';

const tmp = new Vector3();
const worldPosition = new Vector3();

/**
 * Transforms a force (direction + magnitude, not a position) from world space
 * into the local space of `object`. Ported from interactions/utils/localizeForce.js.
 * Returns a shared scratch vector — copy it if you need to retain it.
 */
export default function localizeForce(force: Vector3, object?: Object3D): Vector3 {
  tmp.copy(force);
  if (object instanceof Object3D) {
    worldPosition.setFromMatrixPosition(object.matrixWorld);
    tmp.add(worldPosition);
    object.worldToLocal(tmp);
  }
  return tmp;
}
