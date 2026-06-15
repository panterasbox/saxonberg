import {
  DoubleSide,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  type Texture,
} from 'three';
import { Side, type SideKind } from './constants';
import Cloth from './Cloth';
import Constraint from './Constraint';
import FixedConstraint from './FixedConstraint';
import type Particle from './Particle';

export interface FlagOptions {
  width?: number;
  height?: number;
  mass?: number;
  granularity?: number;
  texture?: Texture | null;
  normalMap?: Texture | null;
  roughnessMap?: Texture | null;
  pinEdge?: SideKind;
}

const defaults = {
  width: 1.1,
  height: 1.9,
  mass: 0.2, // ~heavy felt/wool banner
  granularity: 14,
  pinEdge: Side.TOP as SideKind,
};

/**
 * A pinned cloth + its mesh. Pins the TOP edge by default (a banner hanging
 * from a rod), and adds hoist-to-fly FixedConstraints to fight stretch.
 * PBR fabric via MeshStandardMaterial (the old build used MeshPhongMaterial).
 */
export default class Flag {
  cloth: Cloth;
  mesh: Mesh;
  object: Object3D;
  material: MeshStandardMaterial;
  pins: Particle[] = [];
  lengthConstraints: Constraint[] = [];

  constructor(options: FlagOptions = {}) {
    const s = { ...defaults, ...options };
    const restDistance = s.height / s.granularity;

    this.cloth = new Cloth(
      Math.round(s.width / restDistance),
      Math.round(s.height / restDistance),
      restDistance,
      s.mass * s.width * s.height,
    );

    this.material = new MeshStandardMaterial({
      map: s.texture ?? null,
      normalMap: s.normalMap ?? null,
      roughnessMap: s.roughnessMap ?? null,
      roughness: 0.82,
      metalness: 0.0,
      side: DoubleSide,
      alphaTest: 0.5,
    });

    this.mesh = new Mesh(this.cloth.geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    // Center horizontally and hang the pinned top edge at the object's origin,
    // so the object origin sits at the middle of the crossbar.
    this.mesh.position.set(-this.cloth.width / 2, -this.cloth.height, 0);

    this.object = new Object3D();
    this.object.add(this.mesh);

    this.pinEdge(s.pinEdge);
    this.setLengthConstraints(s.pinEdge);
  }

  private pinEdge(edge: SideKind): void {
    const { xSegments, ySegments, particleAt } = this.cloth;
    if (edge === Side.TOP) {
      for (let u = 0; u <= xSegments; u++) this.pins.push(particleAt(u, ySegments));
    } else if (edge === Side.LEFT) {
      for (let v = 0; v <= ySegments; v++) this.pins.push(particleAt(0, v));
    }
  }

  private setLengthConstraints(edge: SideKind): void {
    const { xSegments, ySegments, restDistance, particleAt } = this.cloth;
    const lc: Constraint[] = [];
    if (edge === Side.TOP) {
      // Vertical chains, top-down (closest to the pinned edge resolved first).
      for (let u = 0; u <= xSegments; u++) {
        for (let v = ySegments; v > 0; v--) {
          lc.push(new FixedConstraint(particleAt(u, v), particleAt(u, v - 1), restDistance));
        }
      }
    } else if (edge === Side.LEFT) {
      for (let v = 0; v <= ySegments; v++) {
        for (let u = 0; u < xSegments; u++) {
          lc.push(new FixedConstraint(particleAt(u, v), particleAt(u + 1, v), restDistance));
        }
      }
    }
    this.lengthConstraints = lc;
  }

  simulate(deltaTime: number): void {
    this.cloth.simulate(deltaTime);
    // Hold pinned particles at their original positions.
    for (const p of this.pins) p.previous.copy(p.position.copy(p.original));
    for (const c of this.lengthConstraints) c.resolve();
  }

  render(): void {
    this.cloth.render();
  }

  dispose(): void {
    this.material.dispose();
    this.cloth.geometry.dispose();
  }
}
