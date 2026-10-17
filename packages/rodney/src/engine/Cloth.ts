import { BufferAttribute, BufferGeometry, DynamicDrawUsage, Vector3 } from 'three';
import Particle from './Particle';
import Constraint from './Constraint';

/**
 * Rectangular mass-spring cloth. Physics topology is identical to flagwaver's
 * physics/Cloth.js, but the geometry layer is rebuilt on BufferGeometry —
 * THREE.Geometry / ParametricGeometry / geometry.faces were removed from
 * three.js in r125, so the original render()/face-walk no longer compiles.
 *
 * Vertex ordering matches particleAt: index = u + v * (xSegments + 1), with the
 * plane spanning x in [0, width], y in [0, height], z = 0.
 */
export default class Cloth {
  xSegments: number;
  ySegments: number;
  restDistance: number;
  width: number;
  height: number;
  particles: Particle[];
  constraints: Constraint[];
  geometry: BufferGeometry;
  index: Uint32Array;
  private positionAttr: BufferAttribute;
  readonly particleAt: (u: number, v: number) => Particle;

  constructor(xSegments: number, ySegments: number, restDistance: number, mass: number) {
    const width = restDistance * xSegments;
    const height = restDistance * ySegments;
    const W = xSegments + 1;
    const vertexCount = W * (ySegments + 1);

    const particles: Particle[] = [];
    const constraints: Constraint[] = [];
    const particleAt = (u: number, v: number) => particles[u + v * W];

    const positions = new Float32Array(vertexCount * 3);
    const uvs = new Float32Array(vertexCount * 2);
    const particleMass = mass / vertexCount;
    const pos = new Vector3();

    for (let v = 0; v <= ySegments; v++) {
      for (let u = 0; u <= xSegments; u++) {
        const i = u + v * W;
        pos.set((u / xSegments) * width, (v / ySegments) * height, 0);
        particles.push(new Particle(pos, particleMass));
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
        uvs[i * 2] = u / xSegments;
        uvs[i * 2 + 1] = v / ySegments;
      }
    }

    // Structural constraints (horizontal + vertical), incl. the far edges.
    for (let v = 0; v < ySegments; v++) {
      for (let u = 0; u < xSegments; u++) {
        constraints.push(new Constraint(particleAt(u, v), particleAt(u, v + 1), restDistance));
        constraints.push(new Constraint(particleAt(u, v), particleAt(u + 1, v), restDistance));
      }
    }
    for (let v = 0; v < ySegments; v++) {
      constraints.push(new Constraint(particleAt(xSegments, v), particleAt(xSegments, v + 1), restDistance));
    }
    for (let u = 0; u < xSegments; u++) {
      constraints.push(new Constraint(particleAt(u, ySegments), particleAt(u + 1, ySegments), restDistance));
    }

    // Shear constraints (both diagonals).
    const diagonalDistance = Math.sqrt(restDistance * restDistance * 2);
    for (let v = 0; v < ySegments; v++) {
      for (let u = 0; u < xSegments; u++) {
        constraints.push(new Constraint(particleAt(u, v), particleAt(u + 1, v + 1), diagonalDistance));
        constraints.push(new Constraint(particleAt(u + 1, v), particleAt(u, v + 1), diagonalDistance));
      }
    }

    // Triangle index buffer (consistent winding for stable normals).
    const idx: number[] = [];
    for (let v = 0; v < ySegments; v++) {
      for (let u = 0; u < xSegments; u++) {
        const tl = u + v * W;
        const tr = u + 1 + v * W;
        const bl = u + (v + 1) * W;
        const br = u + 1 + (v + 1) * W;
        idx.push(tl, bl, tr, tr, bl, br);
      }
    }
    const index = new Uint32Array(idx);

    const geometry = new BufferGeometry();
    const positionAttr = new BufferAttribute(positions, 3);
    positionAttr.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', positionAttr);
    geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
    geometry.setIndex(new BufferAttribute(index, 1));
    geometry.computeVertexNormals();

    this.xSegments = xSegments;
    this.ySegments = ySegments;
    this.restDistance = restDistance;
    this.width = width;
    this.height = height;
    this.particles = particles;
    this.constraints = constraints;
    this.particleAt = particleAt;
    this.geometry = geometry;
    this.index = index;
    this.positionAttr = positionAttr;
  }

  reset(): void {
    for (const particle of this.particles) {
      particle.previous.copy(particle.position.copy(particle.original));
    }
  }

  simulate(deltaTime: number): void {
    const deltaTimeSq = deltaTime * deltaTime;
    for (const particle of this.particles) particle.integrate(deltaTimeSq);
    for (const constraint of this.constraints) constraint.resolve();
  }

  /** Push simulated particle positions back into the geometry. */
  render(): void {
    const arr = this.positionAttr.array as Float32Array;
    const particles = this.particles;
    for (let i = 0, ii = particles.length; i < ii; i++) {
      const p = particles[i].position;
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    }
    this.positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}
