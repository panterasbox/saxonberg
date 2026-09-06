/**
 * Lane — a **transport mode's edge set over the shared node graph**.
 *
 * Locations and containers stay the atomic unit of travel; a lane adds
 * no second geometry. It is a data `Idea` in a catalogue, resolve-on-read
 * — the `Watercourse` / `Biome` / `Government` / `Material` shape — and
 * is never cloned as live Stuff.
 *
 * ## The edges are INDUCED, not authored
 *
 * You do not draw a road. You author which exits admit `wheeled`, and
 * the road network is the induced subgraph: every edge whose exit
 * `allowsMode(mode)` (and, for a wheeled lane, whose `isWheelPassable()`
 * holds) is on the lane. So the pass refuses wheels because of one bit
 * on one exit, and the wagon's reachable world shrinks by itself.
 *
 * ⚠ `edges[]` exists for the lanes whose edges are **not** induced from
 * exits — rail, which has no walkable exits to induce from, and the TPA,
 * which is the limit case: no intermediate stops, no duration. Authoring
 * a lane's edges is the escape hatch that proves *"rail is a data
 * addition"* without shipping rail.
 *
 * ## Two independent numbers, and why they are separate
 *
 * A lane's **stop density** (where you may board or alight) and its
 * **duration** (game time per edge) are independent, and the traveller's
 * whole experience falls out of them. Duration lives on the EDGE
 * (`Exit.edgeMinutes`), not here — two lanes share edges, since the
 * towpath is both walked and barged, and the number belongs to the
 * ground. Stops live on the `Route`, not here, because express versus
 * local is **one lane with two stop sets**.
 *
 * ## ⚠ The operator is a ref, and may be nobody
 *
 * `operator` is a durable `templatePath` or a `GroupRef`, or `null` for
 * the public highway. It is a field rather than an assumption because
 * rail and the TPA are **incumbent networks** in this design: nothing in
 * the lane or `Route` shape may make a corpo-run or authority-run lane
 * unrepresentable, and nothing here may assume a player.
 *
 * See [docs/subsystems/logistics.md].
 */

import { Idea } from '@saxonberg/server/mud/lib/stuff/Idea';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';

/**
 * Template-path prefix every authored lane ROW lives under.
 *
 * ⚠ In the **commons** (`/stuff`), not under this pack's own
 * `/system/transport` root — exactly where the `Watercourse` rows live,
 * and for the same reason. The pack ships the CLASS; a lane over
 * somebody's valley is a fact about their realm, and the realm's own
 * pack has to be able to author and edit it. A row under
 * `/system/transport` would be titled to the transport group, so
 * world-seed could not touch the road it authored.
 */
export const LANE_PATH_PREFIX = '/stuff/idea/Lane';

/**
 * One authored edge of a lane whose edges are NOT induced from exits.
 * Both endpoints are durable location template paths; direction is
 * explicit here because there is no exit to read it from.
 */
export interface LaneEdge {
  from: string;
  to: string;
  /** Admits travel the other way too. Default `true`. */
  bidirectional?: boolean;
}

/** The authored shape of a lane row's `data` block. */
export interface LaneDescriptor {
  /** Durable key (`spine`, `estuary`, `tpa`), independent of the path. */
  key: string;
  /** Display name ("the valley spine"). */
  name: string;
  /**
   * The `LocomotionMode` whose admittance induces this lane's edges —
   * `wheeled`, `walk`, `boat`. Empty for a lane whose edges are
   * authored outright.
   */
  mode: string;
  /** Authored edges, for a lane that induces none. */
  edges: LaneEdge[];
  /**
   * Where a traveller may board or alight. **Empty means every node is a
   * stop** — the ordinary road. A short list is a trunk line whose
   * traffic passes through the places between, which is what lets people
   * at a crossroads watch traffic go by without boarding it.
   */
  stops: string[];
  /**
   * Who runs it: a durable `templatePath` or a `GroupRef`, or `null` for
   * the public highway. ⚠ See the class note — the field exists so that
   * a corpo-run or authority-run lane is the same shape as nobody's.
   */
  operator: string | null;
  /**
   * Where the induced walk STARTS — one or more room paths the lane
   * certainly runs through.
   *
   * ⚠ Not a map, and not a retreat from *"you do not draw a road"*:
   * rooms load lazily, so *"every reachable room's exits"* has to begin
   * somewhere nameable. One authored path per lane buys the whole
   * induced subgraph, and setting one bit on the pass's exit still
   * shrinks the wagon's reachable world by itself. Ignored by an
   * authored-edge lane, which has nothing to induce.
   */
  seeds: string[];
}

export default class Lane extends Idea {
  /** See {@link LANE_PATH_PREFIX}. */
  static readonly TEMPLATE_PATH_PREFIX = LANE_PATH_PREFIX;

  static fieldMeta: FieldMeta = {
    key: { persistent: true, authorable: true },
    name: { persistent: true, authorable: true },
    mode: { persistent: true, authorable: true },
    edges: { persistent: true, authorable: true },
    stops: { persistent: true, authorable: true },
    operator: { persistent: true, authorable: true },
    seeds: { persistent: true, authorable: true },
  };

  protected key = '';
  protected name = '';
  protected mode = '';
  protected edges: LaneEdge[] = [];
  protected stops: string[] = [];
  protected operator: string | null = null;
  protected seeds: string[] = [];

  public getKey(): string {
    return this.key;
  }
  public setKey(value: string): void {
    this.key = value;
  }

  public getName(): string {
    return this.name;
  }
  public setName(value: string): void {
    this.name = value;
  }

  public getMode(): string {
    return this.mode;
  }
  public setMode(value: string): void {
    this.mode = value;
  }

  public getEdges(): LaneEdge[] {
    return this.edges.map((e) => ({ ...e }));
  }
  public setEdges(value: LaneEdge[]): void {
    this.edges = Array.isArray(value) ? value.map((e) => ({ ...e })) : [];
  }

  public getStops(): string[] {
    return [...this.stops];
  }
  public setStops(value: string[]): void {
    this.stops = Array.isArray(value) ? [...value] : [];
  }

  public getOperator(): string | null {
    return this.operator;
  }
  public setOperator(value: string | null): void {
    this.operator = value === '' ? null : value;
  }

  public getSeeds(): string[] {
    return [...this.seeds];
  }
  public setSeeds(value: string[]): void {
    this.seeds = Array.isArray(value) ? [...value] : [];
  }

  /**
   * True iff this lane's edges are authored rather than induced from
   * exits — the rail / TPA case.
   *
   * ⭐ Deliberately derived from *"are there authored edges"* rather than
   * carried as a flag: a lane cannot be inconsistent with itself, and a
   * realm that adds rail authors edges rather than setting a bit.
   */
  public isAuthored(): boolean {
    return this.edges.length > 0;
  }

  /**
   * True iff `path` is a place a traveller may board or alight at. An
   * empty stop list means every node is a stop — the ordinary road.
   */
  public isStop(path: string): boolean {
    return this.stops.length === 0 || this.stops.includes(path);
  }
}
