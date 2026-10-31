/**
 * Exposure — ⭐⭐⭐ **what is over and around a place, answered once.**
 *
 * Five questions used to be one bit on a biome (`SkyExposedBiome`): does
 * rain reach the floor, does the sky light it, can you see the sky, does
 * the wind get in, and which faces lose heat to the weather. They are
 * questions about **construction**, so they are answered from what the
 * place says it is made of (`enclosure:` — the walls — and `roof:`) and,
 * when it belongs to one, from which places of its {@link Structure}
 * stand beside it and on it.
 *
 * ⭐ **The one rule:** a face is exterior unless the space across it is an
 * enclosed place of the same structure — one with walls or a roof of its
 * own. Everything below is that sentence applied to a top, four walls and
 * a floor.
 *
 * ⚠ A stated abstraction: the engine has no room geometry, so *which wall
 * is shared* is answered by *who is next door through an exit*. Two
 * members side by side with no exit between them each keep that face
 * exterior. Openings are exits — there is no per-wall vocabulary.
 *
 * This is a value object: `AtmosphericMixin.exposure()` computes it and
 * caches it; nothing composes it.
 */

import type { Stuff } from '../stuff/Stuff';
import type Exit from '../boundary/Exit';
import type { ResolvedEnclosure } from './Enclosed';
import type Structure from '../structure/Structure';

/** One face of a place's cube cell. */
export interface Face {
  /** What the face is made of; `null` for an open side (no wall there). */
  material: ResolvedEnclosure | null;
  areaM2: number;
  /** On the weather (true), or shared with an enclosed member (false). */
  exterior: boolean;
  /** The member across an interior face. */
  neighbour?: Stuff;
  /** The opening that joins them, if any. */
  exit?: Exit;
}

/** Where the top of a place is. */
export type ExposureTop = 'open' | 'roof' | 'ceiling';

export interface ExposureInit {
  structure: Structure | null;
  storey: string | null;
  declared: boolean;
  top: ExposureTop;
  roof: Face | null;
  walls: Face[];
  wallsNone: boolean;
  openSides: number;
  onGrade: boolean;
  floorIsRoofOf: Stuff | null;
  /** Live count of open exterior openings — door state is never cached. */
  openOpenings?: () => number;
  /** Weight of a wall face against the roof for sky light (0.25). */
  sideWeight?: number;
}

export class Exposure {
  /** The set this place belongs to, if any. */
  public readonly structure: Structure | null;
  /** Its storey key within that structure (`null` = the implicit one). */
  public readonly storey: string | null;
  /**
   * The ROOF came from the row or the class hook. `false` ⇒ the legacy
   * biome discriminator answered — the row is an interior that has not
   * yet said what it is made of, and `lint:biome-sky` counts it.
   */
  public readonly declared: boolean;
  public readonly top: ExposureTop;
  /** The top face when {@link top} is `'roof'`. */
  public readonly roof: Face | null;
  /** The walls less their openings — exterior and interior faces both. */
  public readonly walls: Face[];
  /** `enclosure: none` — an awning, a lavoir, a street. */
  public readonly wallsNone: boolean;
  /** Doorless exterior exits — an open-fronted barn's missing wall. */
  public readonly openSides: number;
  public readonly onGrade: boolean;
  /** A roof terrace: the place below, whose roof is this floor. */
  public readonly floorIsRoofOf: Stuff | null;
  private readonly openOpenings: () => number;
  private readonly sideWeight: number;

  constructor(init: ExposureInit) {
    this.structure = init.structure;
    this.storey = init.storey;
    this.declared = init.declared;
    this.top = init.top;
    this.roof = init.roof;
    this.walls = init.walls;
    this.wallsNone = init.wallsNone;
    this.openSides = init.openSides;
    this.onGrade = init.onGrade;
    this.floorIsRoofOf = init.floorIsRoofOf;
    this.openOpenings = init.openOpenings ?? (() => 0);
    this.sideWeight = init.sideWeight ?? 0.25;
  }

  /** Does rain reach the floor? */
  public rainReaches(): boolean {
    return this.top === 'open';
  }

  /**
   * ⭐ **The one place a face's transmittance is computed** — the product
   * of `e^(−α·t)` over its layers (Beer–Lambert), where `α` is the
   * material's `lightAbsorption` and a material authoring none is opaque.
   * An open side (no wall) passes everything. Sky light and the solar
   * term both call this.
   */
  public faceTransmittance(face: Face): number {
    if (face.material === null) return 1;
    if (face.material.none) return 1;
    return face.material.transmittance;
  }

  /**
   * How much of the open sky lights this place: 1 open, 0 under a
   * ceiling, else the roof's transmittance plus a quarter-weight for each
   * transmitting exterior wall face, capped at 1.
   *
   * ⚠ An interior that has not said what it is made of
   * (`declared: false`) answers 0 under its legacy roof — exactly today's
   * answer, so a shop with a doorless doorway onto the street does not
   * start to read as sky-lit before its row says what it is.
   */
  public skyLightFraction(): number {
    if (this.top === 'open') return 1;
    if (this.top === 'ceiling') return 0;
    if (!this.declared) return 0;
    let t = this.roof ? this.faceTransmittance(this.roof) : 0;
    for (const w of this.walls) {
      if (w.exterior) t += this.sideWeight * this.faceTransmittance(w);
    }
    t += this.sideWeight * this.openSides;
    return Math.min(1, t);
  }

  /** Can you see the sky from here? */
  public skyVisible(): boolean {
    return this.skyLightFraction() > 0;
  }

  /** Does the wind get in? */
  public windEnters(): boolean {
    // ⚠ An open TOP alone does not let the wind in: a walled pen or a
    // yard inside a building is sheltered by its walls.
    return this.wallsNone || this.openSides > 0 || this.openOpenings() > 0;
  }

  /** Is this place simply the outside — open above, nothing around it? */
  public isOutside(): boolean {
    return this.top === 'open' && (this.wallsNone || this.openSides >= 4);
  }

  /**
   * Does this place hold air of its own? An open top or no walls holds
   * nothing — the air is the outside air, whatever is over a part of it.
   */
  public holdsAir(): boolean {
    return this.top !== 'open' && !this.wallsNone;
  }

  /** Σ exterior face areas: the exterior walls, and the roof when it is one. */
  public exteriorAreaM2(): number {
    let a = 0;
    for (const w of this.walls) {
      if (w.exterior && w.material !== null) a += w.areaM2;
    }
    if (this.top === 'roof' && this.roof) a += this.roof.areaM2;
    return a;
  }

  /** The member-to-member couplings. */
  public interiorFaces(): Face[] {
    return this.walls.filter((w) => !w.exterior);
  }
}
