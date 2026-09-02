/**
 * Watercourse — a river as **authored topology plus derived direction**.
 *
 * A watercourse is a data `Idea` in a catalogue, resolve-on-read: the
 * `Biome` / `Government` / `Corpo` / `Material` shape. It carries its
 * nodes, their control-point elevations, and which node of which other
 * watercourse it branches from. It is never cloned as live Stuff.
 *
 * ## A reach is not an object
 *
 * A **reach** is a node identity on a course — `kestrel:confluence` — the
 * way a room already cites `_biomePath` and `_address`. Rights,
 * contamination and flow all key on it, and upstream/downstream between
 * any two places is answered by comparing two integers.
 *
 * A reach becomes a real object only where **content puts a structure on
 * it** — a dam, an intake, a weir. Most of a watercourse runs through
 * country nobody will ever stand in, and Hinkley Lane already settled the
 * principle: *the unbuilt lots are prose, not nine empty rooms.* It is
 * also the wrong containment — a mill **beside** the river is not **in**
 * it, and a diversion right attaches to a position that may never have a
 * room at all.
 *
 * ## Direction is DERIVED; an author never writes an arrow
 *
 * Nodes are declared source-first. Elevation is authored at **control
 * points** (source, falls, confluence, mouth) and **interpolated**
 * between them, so an uphill reach is *unrepresentable* rather than
 * caught by a lint. The one assertion left is `source above mouth`, at
 * parse, naming the offending control points.
 *
 * Where elevation ties — a flat reach — the ordering falls back to the
 * authored node order, which is honest: a canal across a flat *is*
 * directed by how it was dug.
 *
 * ## Distributaries come free
 *
 * One `branchesFrom` field covers both a tributary joining and a delta
 * splitting, because direction is derived rather than declared. A course
 * that names no parent is a **trunk**, and its last node is the sea.
 *
 * See [docs/subsystems/watershed.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * Template-path prefix every authored watercourse ROW lives under.
 *
 * ⚠ In the **commons** (`/stuff`), not under the pack's own `/water`
 * root — exactly where `Locality` and `Government` reference rows live,
 * and for the same reason. The pack ships the CLASS
 * (`/water/idea/Watercourse`); a river is a fact about somebody's realm,
 * and the realm's own pack has to be able to author and edit it. A row
 * under `/water` would be titled to the water group, so world-seed could
 * not touch the Kestrel it authored.
 */
export const WATERCOURSE_PATH_PREFIX = '/stuff/idea/Watercourse';

/**
 * One authored node on a watercourse — a **reach**, named so that
 * citations survive somebody inserting a node upstream of them.
 *
 * ⚠ Cited by NAME (`kestrel:falls`), ordered by INDEX. The requirements
 * sketch a reach as `kestrel:4`; a positional citation would silently
 * re-point every right, intake and outfall the moment an author added a
 * node above it, so the durable half of the identity is the name and the
 * index stays an internal ordinal.
 */
export interface WatercourseNode {
  /** Durable identity within the course. */
  name: string;
  /**
   * Metres above sea level. Authored at **control points** only;
   * omitted nodes interpolate linearly between the control points that
   * bracket them, which is what makes an uphill reach unrepresentable.
   */
  elevation?: number;
  /**
   * A hint about the channel's size, used to derive navigability
   * alongside flow. Purely descriptive — flow is the other half, and it
   * is computed.
   */
  channelWidthM?: number;
  /**
   * Square kilometres of **unclaimed** ground draining to this reach —
   * the mountainside nobody's locality covers.
   *
   * ⭐ Most of a catchment is not anybody's town. A locality declares
   * the ground it sits on (D21); this declares the fell above it. They
   * add, and without the second one a realm with three villages would
   * have a river the size of a gutter — which would make the whole
   * seasonal hydrograph, and therefore the whole rights layer,
   * unobservable.
   *
   * It is a *declaration* for exactly the reason a locality's is:
   * deriving an area over a world made of rooms, most of them indoors,
   * is not a thing that can be done honestly.
   */
  catchmentKm2?: number;
}

/** The authored shape of a watercourse row's `data` block. */
export interface WatercourseDescriptor {
  /** Durable key (`kestrel`), independent of the template path. */
  key: string;
  /** Display name ("the Kestrel"). */
  name: string;
  /**
   * The drainage basin this course belongs to. Two courses sharing a
   * basin can resolve an upstream/downstream relation; two in different
   * basins resolve **none**, which is a different answer from "no".
   */
  basin: string;
  /** Source-first. The last node of a trunk is the sea. */
  nodes: WatercourseNode[];
  /**
   * `"<courseKey>:<nodeName>"` — the node of another course this one
   * joins (a tributary) or leaves (a distributary), or `null` for a
   * trunk. ONE field for both, because direction is derived.
   */
  branchesFrom: string | null;
}

export default class Watercourse extends Idea {
  /** See {@link WATERCOURSE_PATH_PREFIX}. */
  static readonly TEMPLATE_PATH_PREFIX = WATERCOURSE_PATH_PREFIX;

  static fieldMeta: FieldMeta = {
    name: { persistent: true, authorable: true },
    key: { persistent: true, authorable: true },
    basin: { persistent: true, authorable: true },
    nodes: { persistent: true, authorable: true },
    branchesFrom: { persistent: true, authorable: true },
  };

  protected name = '';
  protected key = '';
  protected basin = '';
  protected nodes: WatercourseNode[] = [];
  protected branchesFrom: string | null = null;

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    this.key = value;
  }

  public getBasin(): string {
    return this.basin;
  }
  public setBasin(value: string): void {
    this.basin = value;
  }

  public getNodes(): WatercourseNode[] {
    return this.nodes.map((n) => ({ ...n }));
  }
  public setNodes(value: WatercourseNode[]): void {
    this.nodes = Array.isArray(value) ? value.map((n) => ({ ...n })) : [];
  }

  public getBranchesFrom(): string | null {
    return this.branchesFrom;
  }
  public setBranchesFrom(value: string | null): void {
    this.branchesFrom = value === '' ? null : value;
  }
}
