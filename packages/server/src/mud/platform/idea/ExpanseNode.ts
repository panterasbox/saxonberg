/**
 * ExpanseNode — a point of interest in an expanse: a place you can be
 * AT, reached by setting a course.
 *
 * ⭐ Three authored facts, and ordinary content after that (requirements
 * AC 1):
 *
 * - **`kind`** — `place` (a cove you can see across; its content is a
 *   Location you are IN, and crossing it is `go`) or `passage` (water you
 *   go THROUGH).
 * - **`passage`** — for a passage, `linear` (a fraction along one
 *   dimension — a channel over a bar, which rides a confined band named
 *   by `along`) or `areal` (a point you reach by bearing).
 * - **`destination`** — the Location behind it, if any. **Most nodes have
 *   none**: open sea is a node you can be at with nothing to step onto.
 *
 * A node is an Idea, never a room, so nothing is ever inside the frame
 * and nothing about a node enters the location graph.
 *
 * ## ⭐⭐ Where it is: a focus in its expanse, like a room in its zone
 *
 * (maritime review, 2026-10-13.) A node is placed the way a
 * `SphericalLocation` is placed in its `SphericalZone` — the same mixin,
 * the same authored `focus: { rho, theta, phi, radius }`, the same units
 * (meters; degrees) — RELATIVE to the expanse it is in: *fifteen miles
 * out, bearing 050, a stack four hundred meters across*. It is on no
 * lattice and it moves with its sea.
 *
 * - **Where on the chart** is derived, never authored: the expanse's
 *   `origin` + this focus ({@link getExpansePosition}). The sailor's
 *   lat/lon is a view of the graph, not a second copy of it.
 * - **`radius`** is how big the node is, and so how close is *there*:
 *   a course for it arrives when the track comes within the radius
 *   ({@link getArrivalNm}); once arrived, being at it is an identity again.
 *   A node that authors none falls back to `expanse.arrivalNm`.
 */

import { Idea } from '../../lib/stuff/Idea';
import { SingletonMixin } from '../../lib/stuff/Singleton';
import { NamedMixin } from '../../lib/description/Named';
import { SphericalCoordinatesMixin } from '../../lib/location/SphericalCoordinates';
import { GeoPosition, M_PER_NM } from '../../lib/expanse/GeoPosition';
import { Expanse } from '../../lib/expanse/Expanse';
import { AppApi } from '../../api/app';
import type { FieldMeta } from '../../lib/mixin';

/** The authored shape — `SphericalLocation.focus`'s, `phi` defaulting to the surface. */
export interface NodeFocus {
  rho: number;
  theta: number;
  phi?: number;
  radius?: number;
}

export const NODE_KINDS = ['place', 'passage'] as const;
export type NodeKind = (typeof NODE_KINDS)[number];
export const PASSAGE_KINDS = ['linear', 'areal'] as const;
export type PassageKind = (typeof PASSAGE_KINDS)[number];

export default class ExpanseNode extends SphericalCoordinatesMixin(
  NamedMixin(SingletonMixin(Idea)),
) {
  static fieldMeta: FieldMeta = {
    focus: { persistent: true, authorable: true },
    kind: { persistent: true, authorable: true },
    passage: { persistent: true, authorable: true },
    destination: { persistent: true, authorable: true },
    along: { persistent: true, authorable: true },
    river: { persistent: true, authorable: true, ref: 'identity:relation' },
  };

  /**
   * ⭐ The river that comes out here, if one does (river D29): a ship lying
   * at this node can take a course up it. The river names its mouth node;
   * this is the same fact asked from the sea.
   */
  protected river: string | null = null;
  public getRiver(): string | null { return this.river; }
  public setRiver(v: string | null): void { this.river = v ?? null; }

  protected kind: NodeKind = 'passage';
  protected passage: PassageKind | null = 'areal';
  protected destination: string | null = null;
  protected along: string | null = null;
  /** ⭐ A node's size is authored or absent — never the unit sphere's 1 m. */
  protected override radius = 0;
  /** The authored focus; the runtime tuple is the mixin's `coordinates`. */
  protected focus: NodeFocus | null = null;

  /**
   * Runtime only: the expanse this node is a point of — stamped by the
   * expanse that compiles it, else the node's own zone.
   */
  private frame: Expanse | null = null;

  public getFocus(): NodeFocus | null { return this.focus ? { ...this.focus } : null; }
  public setFocus(v: NodeFocus | null): void {
    if (v === null || v === undefined) {
      this.focus = null;
      return;
    }
    const phi = v.phi === undefined ? 90 : Number(v.phi);
    const radius = v.radius === undefined ? 0 : Number(v.radius);
    if (![v.rho, v.theta, phi, radius].every((n) => Number.isFinite(Number(n))) || v.rho < 0 || radius < 0) {
      throw new Error(`ExpanseNode: focus needs finite rho ≥ 0, theta, phi and radius ≥ 0; got ${JSON.stringify(v)}`);
    }
    this.setCoordinates([Number(v.rho), Number(v.theta), phi]);
    this.setRadius(radius);
    this.focus = { rho: Number(v.rho), theta: Number(v.theta), phi, radius };
  }

  /** The expanse that compiled this node names itself its frame. */
  public setFrame(expanse: Expanse | null): void { this.frame = expanse; }

  /** The expanse this node is a point of, or `null`. */
  public getFrame(): Expanse | null {
    if (this.frame !== null) return this.frame;
    const zone = this.getZone();
    return zone instanceof Expanse ? zone : null;
  }

  /** The expanse row's path — derived from the frame, never authored. */
  public getExpanse(): string | null {
    return this.getFrame()?.getTemplatePath() ?? null;
  }

  /**
   * ⭐ Where this node lies on the chart: its expanse's origin + its
   * focus. `null` when it has no focus or its expanse no origin.
   */
  public getExpansePosition(): GeoPosition | null {
    const origin = this.getFrame()?.getOrigin() ?? null;
    if (origin === null || this.focus === null) return null;
    return origin.atFocus(this.focus);
  }

  /** How close is THERE, nautical miles: the radius, else the setting. */
  public getArrivalNm(): number {
    const r = this.getRadius();
    if (r > 0) return r / M_PER_NM;
    try {
      return Number(AppApi.setting('expanse.arrivalNm')) || 1;
    } catch {
      return 1;
    }
  }

  /** Is `pos` within this node — inside its radius? */
  public isAt(pos: GeoPosition): boolean {
    const at = this.getExpansePosition();
    return at !== null && at.distanceNm(pos) <= this.getArrivalNm();
  }

  public getKind(): NodeKind { return this.kind; }
  public setKind(v: NodeKind): void {
    if (!NODE_KINDS.includes(v)) {
      throw new Error(`ExpanseNode: kind must be ${NODE_KINDS.join(' | ')}; got ${JSON.stringify(v)}`);
    }
    this.kind = v;
    if (v === 'place') this.passage = null;
  }

  public getPassage(): PassageKind | null { return this.passage; }
  public setPassage(v: PassageKind | null): void {
    if (v !== null && v !== undefined && !PASSAGE_KINDS.includes(v)) {
      throw new Error(`ExpanseNode: passage must be ${PASSAGE_KINDS.join(' | ')}; got ${JSON.stringify(v)}`);
    }
    this.passage = v ?? null;
  }

  public getDestination(): string | null { return this.destination; }
  public setDestination(v: string | null): void { this.destination = v ?? null; }

  /** The confined band a linear passage rides; required when linear. */
  public getAlong(): string | null { return this.along; }
  public setAlong(v: string | null): void { this.along = v ?? null; }

  public isLinear(): boolean {
    return this.kind === 'passage' && this.passage === 'linear';
  }

  /**
   * Does this node answer to `word` — a word of its name, its whole name,
   * an alternate name, or its row key? How `course <node>` resolves a node
   * against its own expanse (never through MQL: a node is not in the
   * room).
   */
  public answersTo(word: string): boolean {
    const w = word.trim().toLowerCase().replace(/^the\s+/, '');
    if (w === '') return false;
    const name = this.getName().toLowerCase();
    const bare = name.replace(/^the\s+/, '');
    if (w === name || w === bare) return true;
    if (bare.split(/\s+/).includes(w)) return true;
    const key = (this.getTemplatePath() ?? '').split('/').pop() ?? '';
    if (w === key.toLowerCase()) return true;
    return this.hasAlternateName(word.trim());
  }
}
