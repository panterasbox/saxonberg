/**
 * NavigationApi — canonical direction table, aliases, and cartesian offsets.
 *
 * Cartesian zones use a 10-way direction set: the 8 compass cardinals plus
 * `up` and `down`. Each direction has a `[dx, dy, dz]` offset (used by
 * `CartesianZone.getNeighbor()` and coordinate geometry) and a canonical
 * inverse used by arrival-message formatting + authoring reciprocal exits.
 *
 * Spherical zones and vessels use arbitrary semantic labels (`'office'`,
 * `'kitchen'`, `'out'`) that live outside this table — callers treat an
 * `undefined` result from `normalizeDirection()` / `invertDirection()` as
 * "not cardinal".
 *
 * Thin, security-gated forwarding shell: the direction table and lookups
 * live in the hot-reloadable {@link NavigationLogic} singleton at
 * `/platform/idea/api/navigation`, reached synchronously via
 * `StuffApi.singletonSync`. `dest /platform/idea/api/navigation` reloads it.
 */

import type Structure from '../lib/structure/Structure';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { NavigationLogic } from '../platform/idea/api/NavigationLogic';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';
import type { MapCopySnapshot } from '@saxonberg/types';
import type { CopyRoom, PlaceNode } from '../lib/place/PlaceNode';
import type { GraphFinding } from '../lib/place/GraphInvariants';
import type { MapClaim, MapDocument } from '../lib/place/MapClaim';
import type { RouteOutcome } from '../lib/place/RoutePlan';
import type { TravelProfileSpec } from '../lib/place/TravelProfile';
import type { ReachResult } from '../platform/idea/api/NavigationLogic';
import type { Stuff } from '../lib/stuff/Stuff';
import type { GeoPosition } from '../lib/expanse/GeoPosition';
import type { Vantage } from '../lib/perception/Vantage';

/** Canonical direction names (long form). */
/**
 * Why something is attached to a place in the location graph's record —
 * see {@link NavigationApi.attachedTo}.
 */
export type AttachmentKind = 'house' | 'structure' | 'craft' | 'institution' | 'fixture';

/**
 * ⭐ One entry of a skyline (geography D2): a structure worth seeing, where
 * it stands, and how it lies from the vantage the skyline was computed
 * for. Plain data read off rows — the structure is NOT loaded to decide
 * this; presenting it is the caller's (geography D9).
 */
export interface SkylineEntry {
  /** The structure's row (its template path). */
  path: string;
  /** A runtime structure with no row of its own (a holding's house), held by instance. */
  live: Stuff | null;
  at: GeoPosition;
  /** True bearing from the vantage, degrees. */
  bearingDeg: number;
  /** Distance from the vantage, nautical miles (unrounded). */
  rangeNm: number;
  /** The furthest it could be seen from this vantage in clear air, nautical miles. */
  clearNm: number;
  /** Within the `nearM` the skyline was asked with — in your own place, whatever the curvature. */
  near: boolean;
  /** Its own height as a target, metres. */
  heightM: number;
  landmark: boolean;
  showsLight: boolean;
}

/** How a skyline is asked for. */
export interface SkylineQuery {
  /** The structure the viewer stands in — never on its own skyline. */
  own?: string | null;
  /** Keep the answer under this key (point owner `|` eye metres); `null` = compute per read. */
  keepAs?: string | null;
  /** Metres within which a mark is listed whatever the curvature (the Locality's radius). */
  nearM?: number;
}

export type CardinalDirection =
  | 'north'
  | 'south'
  | 'east'
  | 'west'
  | 'northeast'
  | 'northwest'
  | 'southeast'
  | 'southwest'
  | 'up'
  | 'down';

const LOGIC_PATH = '/platform/idea/api/navigation';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/NavigationLogic', import.meta.url)
);

/** Resolve the HMR-able NavigationLogic singleton (sync). */
function logic(): NavigationLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'NavigationLogic'
      ) as typeof NavigationLogic | null) ?? NavigationLogic)()
  );
}

export type { PlaceNode, StoredEdge, NodeTravel } from '../lib/place/PlaceNode';
export type {
  GraphEdge,
  GraphFinding,
  GraphNode,
  GraphRule,
} from '../lib/place/GraphInvariants';
export type {
  MapChannel,
  MapClaim,
  MapClaimKind,
  MapDocument,
} from '../lib/place/MapClaim';
export { MAP_CHANNELS } from '../lib/place/MapClaim';

export class NavigationApi {
  /**
   * Normalize a direction string (or alias) to its canonical long-form name.
   *
   * Returns `undefined` when the input doesn't name a cardinal direction —
   * callers should treat that as "not a direction, try it as a vessel keyword
   * / semantic label" (see GoController).
   */
  public static normalizeDirection(
    input: string
  ): CardinalDirection | undefined {
    return logic().normalizeDirection(input);
  }

  /**
   * The conventional short forms of a direction (`north` → `['n']`,
   * `up` → `['u']`); `[]` for a non-cardinal. ⚠ Read by
   * `Exit.getKeywords()`, which is where those words become an exit's
   * own (derived, and named so there) — MQL never rewrites a word.
   */
  public static shortFormsOf(direction: string): string[] {
    return logic().shortFormsOf(direction);
  }

  /**
   * Return the cardinal inverse of a direction.
   *
   * Returns `undefined` for non-cardinals (semantic labels like `'office'` or
   * vessel-synthesized `'out'` have no structural inverse; arrival messages
   * degrade to "Alice arrives." for those cases).
   */
  public static invertDirection(
    direction: string
  ): CardinalDirection | undefined {
    return logic().invertDirection(direction);
  }

  /**
   * Grid offset triple for a direction (canonical or alias).
   *
   * Returns `undefined` for non-cardinals.
   */
  public static directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    return logic().directionOffset(direction);
  }

  /** Is `direction` (or its alias) one of the 10 canonical cardinals? */
  public static isCardinalDirection(direction: string): boolean {
    return logic().isCardinalDirection(direction);
  }

  /** List of canonical cardinal directions (useful for tests / iteration). */
  public static cardinalDirections(): readonly CardinalDirection[] {
    return logic().cardinalDirections();
  }

  /* ── the location graph ──────────────────────────────────────────────
   *
   * The world's shape: every place and every exit out of it, derived
   * from the content rows, rebuilt at boot and kept current at the
   * template write chokepoint. See
   * [docs/subsystems/location-graph.md].
   *
   * ⭐⭐ **None of this may reach a client.** A player's knowledge of the
   * world is their own map document and the two never join — a read
   * that merged them would hand somebody the shape of places they have
   * not earned. Every method here is server-side.
   *
   * ⭐ Every one is string-keyed. The graph is addressed by node
   * IDENTITY, which is a string (`Stuff.getDurableHandle()`), so no
   * method takes a live place.
   */

  /**
   * Has the graph been built at least once?
   *
   * The write chokepoint reads this to skip per-row projection during
   * pack install, when thousands of rows land before anything warms.
   */
  public static isGraphWarm(): boolean {
    return logic().isGraphWarm();
  }

  /**
   * Rebuild the whole graph from the content rows; returns the node
   * count. Idempotent by generation rather than by truncation, so there
   * is no window in which the graph is empty.
   */
  public static rebuildGraph(): Promise<number> {
    return logic().rebuildGraph();
  }

  /** Re-project one content row (and drop its nodes if it stopped being a place). */
  public static projectRow(path: string): Promise<void> {
    return logic().projectRow(path);
  }

  /** Drop every node a content row produced. */
  public static removeRow(path: string): Promise<void> {
    return logic().removeRow(path);
  }

  /**
   * Re-read `published` for every node under `extent`; returns how many
   * changed. The parcel is the source of truth, so a flip calls this.
   */
  public static reprojectExtent(extent: string): Promise<number> {
    return logic().reprojectExtent(extent);
  }

  /** The one node with this identity, or null. */
  public static node(identity: string): Promise<PlaceNode | null> {
    return logic().node(identity);
  }

  /**
   * ⭐⭐ The template paths ATTACHED to a place (the scan sweep, 2026-10-14)
   * — the house that operates it, the structure or craft it belongs to, the
   * institution over its extent, the fixtures that seat in it — read off
   * the location graph's record at the place's path and every ancestor.
   * Derived from what content authors pointing AT the place, so loading a
   * place loads what belongs with it with nothing written twice and
   * nothing searched. Optionally narrowed to one `kind`.
   */
  public static attachedTo(path: string, kind?: AttachmentKind): Promise<string[]> {
    return logic().attachedTo(path, kind);
  }

  /** Everything attached at or under `extent` (a district's towers). */
  public static attachedWithin(extent: string, kind?: AttachmentKind): Promise<string[]> {
    return logic().attachedWithin(extent, kind);
  }

  /** {@link attachedTo}, synchronously — the last derivation, `[]` before the first. */
  public static attachedNow(path: string, kind?: AttachmentKind): string[] {
    return logic().attachedNow(path, kind);
  }

  /**
   * The Structure `path` is a member of — the innermost (longest extent)
   * when one stands inside another, a wing in a mansion — standing the
   * attached candidates up first; `null` when it is in none.
   *
   * ⭐ `path` is a row or a minted identity — never a keyed handle
   * (`row#key`, which throws): a keyed room of a ship kind is answered by
   * its warren, so holding the room, ask it — `Place.structure()` /
   * `structureNow()`.
   */
  public static structureAt(path: string): Promise<Structure | null> {
    return logic().structureAt(path);
  }

  /** {@link structureAt} over what is already standing — never loads. */
  public static structureAtNow(path: string): Structure | null {
    return logic().structureAtNow(path);
  }

  /**
   * ⭐ Attach a MINTED structure (no row of its own — a holding's house)
   * at `extent`, so {@link structureAt} answers it for its rooms and their
   * exposure sees its walls (paint build, 2026-10-31). The owner detaches
   * it when the building goes.
   */
  public static attachStructure(extent: string, structure: Structure): void {
    logic().attachStructure(extent, structure);
  }

  /**
   * ⭐ Record a standing COPY's rooms in the location graph
   * (zone-instancing D7): one node per room under the copy's zone
   * identity, upserted at every wake by the warren that minted it. The
   * one part of the index the rows cannot rebuild — a rebuild keeps it.
   */
  public static recordCopy(zone: string, rooms: readonly CopyRoom[]): Promise<number> {
    return logic().recordCopy(zone, rooms);
  }

  /** The copy is gone for good: drop the nodes {@link recordCopy} wrote. */
  public static retireCopy(zone: string): Promise<number> {
    return logic().retireCopy(zone);
  }

  /** Undo {@link attachStructure}. */
  public static detachStructure(extent: string, structure: Structure): void {
    logic().detachStructure(extent, structure);
  }

  /**
   * ⭐ **The skyline from a vantage** (geography D1/D2): every structure
   * worth seeing — a landmark, or one at least `perception.skyline.minHeightM`
   * tall — that curvature lets this eye see in clear air, landmarks first
   * then by how tall each stands in the eye (height ÷ range), the rest cut
   * to `perception.skyline.size`. Read off the content rows; nothing is
   * loaded. Kept under `keepAs` until a structure is built, pulled down or
   * moved. Synchronous: the last derivation, `[]` before the first —
   * {@link skylineReady} is the await.
   */
  public static skylineNow(vantage: Vantage, query: SkylineQuery = {}): SkylineEntry[] {
    return logic().skylineNow(vantage, query);
  }

  /** Wait until the record {@link skylineNow} reads is current. */
  public static skylineReady(): Promise<void> {
    return logic().skylineReady();
  }

  /**
   * A structure row's own point on the chart — its authored `position`,
   * or the sea node its landing is — read off the rows; `null` when it
   * stands only where its Locality is.
   */
  public static markPointNow(structurePath: string): GeoPosition | null {
    return logic().markPointNow(structurePath);
  }


  /** Every node in one zone. */
  public static nodesInZone(zonePath: string): Promise<PlaceNode[]> {
    return logic().nodesInZone(zonePath);
  }

  /**
   * Every node whose identity sits at or under `extent` — the places on
   * one piece of titled ground. What the publish flip sweeps.
   */
  public static nodesInExtent(extent: string): Promise<PlaceNode[]> {
    return logic().nodesInExtent(extent);
  }

  /**
   * Every node with an edge INTO `identity` — the reverse query.
   *
   * ⭐ This is what lets taking content down be honest: it names every
   * room that just lost a destination, so their authors can be told,
   * and it is how the tombstone picks the way `out`.
   */
  public static pointingAt(identity: string): Promise<PlaceNode[]> {
    return logic().pointingAt(identity);
  }

  /** Every node carrying a cross-zone edge — the router's coarse graph. */
  public static interzoneSkeleton(): Promise<PlaceNode[]> {
    return logic().interzoneSkeleton();
  }

  /** Every published node with an edge into unpublished content. */
  public static edgesIntoUnpublished(): Promise<PlaceNode[]> {
    return logic().edgesIntoUnpublished();
  }

  /**
   * Run the graph invariants over the projected nodes — the same
   * instance value class `lint:location-graph` runs over the rows on
   * disk, so a gate and a runtime check cannot disagree about what a
   * dangling exit is. With `scope`, one row's findings (and no
   * reachability pass, which is a whole-graph property).
   */
  public static checkGraph(scope?: string): Promise<GraphFinding[]> {
    return logic().checkGraph(scope);
  }

  /* ── a player's map ──────────────────────────────────────────────────
   *
   * ⭐⭐ The other artifact, and the one that DOES reach a client —
   * because it is theirs. A map is written from what the player
   * perceived and **never joins the graph**: nothing here reads
   * `location_graph`, so no read can hand somebody the shape of a place
   * they have not earned. See [docs/subsystems/location-graph.md].
   */

  /**
   * Record what a viewer just learned about a locality.
   *
   * ⭐ The growth rule is the knowledge model: an observation identical
   * to the latest claim for its key bumps `lastSeen`, a differing one
   * is APPENDED, and **nothing is ever removed or corrected**. That is
   * what lets a map be wrong — and lets the disagreement be seen.
   *
   * ⚠ Plain data only: the caller converts live Stuff to handles, so
   * nothing here takes a `Stuff`.
   */
  public static recordPlace(
    viewerKey: string,
    locality: string,
    claims: readonly MapClaim[],
  ): Promise<void> {
    return logic().recordPlace(viewerKey, locality, claims);
  }

  /**
   * One viewer's maps under a locality prefix — theirs only, and a
   * prefix read with no join (`map terminus` is every map filed under
   * Terminus).
   */
  /**
   * ⭐ One viewer's maps as the client holds a copy of them
   * (navigation-server D6): each claim with its key in its Locality
   * document and every path tagged among the spoiler levels. The stored
   * claims are unchanged; tagging is the wire projection.
   */
  public static readMapCopy(
    viewerKey: string,
    localityPrefix: string,
  ): Promise<MapCopySnapshot> {
    return logic().readMapCopy(viewerKey, localityPrefix);
  }

  /**
   * Drop a session map (a guest's, kept in memory for the visit) — called
   * when the guest's body goes. A key that is not a session key is ignored:
   * a written map is never forgotten this way.
   */
  public static forgetSessionMap(ownerKey: string): void {
    logic().forgetSessionMap(ownerKey);
  }

  public static readMap(
    viewerKey: string,
    localityPrefix: string,
  ): Promise<MapDocument[]> {
    return logic().readMap(viewerKey, localityPrefix);
  }

  /** The game-second a claim should be stamped with. */
  public static mapNow(): number {
    return logic().mapNow();
  }

  /* ── routing ─────────────────────────────────────────────────────────
   *
   * ⭐⭐⭐ **One graph traversal, or none.** Every search below spends
   * a caller-declared `budget` and answers with a stated refusal when
   * it runs out, because *"I stopped looking"* and *"there is no way"*
   * are different answers and a caller cannot tell them apart from a
   * `null`.
   *
   * ⚠ String-keyed and plain-data throughout: `NavigationApi` is not
   * on `lint:object-verbs`' exempt list and should not be. A traveller
   * is a {@link TravelProfileSpec} — a mode, its medium, and whether
   * it rolls — never a live mover.
   */

  /**
   * Plan a way from `from` to `to` over the **world index**.
   *
   * ⛔ This is the omniscient source. Legitimate for a brain whose
   * author declared what it knows (pass `knowledge.extent` to scope
   * it) and for a compile; **never** for answering a person, which is
   * {@link routeOnMap}'s job.
   *
   * Answers the non-dominated plans — one optimum per axis (minutes,
   * legs, and the ways that close), de-duplicated — and does NOT pick
   * between them when they disagree, because choosing is the activity.
   */
  public static routeBetween(
    from: string,
    to: string,
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<RouteOutcome> {
    return logic().routeBetween(from, to, profile, knowledge, budget);
  }

  /**
   * Plan a way over **one person's own map claims** — what they have
   * walked, seen, searched or read as published.
   *
   * ⭐⭐ The evidence firewall's reader half, and it is structural:
   * this path's only read is the viewer's map document, and the four
   * core modules it plans through **cannot import** the index
   * (`lint:graph-walks`' second check, no ceiling). A map can be
   * stale, can disagree with itself, and routes over what it believes;
   * every plan says what believing it assumes.
   */
  public static routeOnMap(
    viewerKey: string,
    localityPrefix: string,
    from: string,
    to: string,
    profile: TravelProfileSpec,
    budget: number,
  ): Promise<RouteOutcome> {
    return logic().routeOnMap(
      viewerKey,
      localityPrefix,
      from,
      to,
      profile,
      budget,
    );
  }

  /**
   * Plan over an edge set the CALLER declares — an authored lane's own
   * iron, a railway, anything whose ways are not walkable exits.
   *
   * ⚠ Every declared edge is admitted: an authored edge is the author
   * saying *this way is for this lane*, so there is nothing left to
   * admit. See `KnowledgeGraph.fromEdges` for why that is not a
   * loophole.
   */
  public static routeOverEdges(
    edges: readonly {
      from: string;
      to: string;
      dir?: string;
      minutes?: number | null;
    }[],
    from: string,
    to: string,
    budget: number,
  ): RouteOutcome {
    return logic().routeOverEdges(edges, from, to, budget);
  }

  /**
   * Every place reachable from `starts` by a traveller of this kind.
   *
   * ⭐ The lane compile's read: a lane of mode M is M's induced
   * subgraph from its seeds, which is exactly this. `exhausted` means
   * the budget ran out, so the set is a floor and not the answer.
   */
  public static reachFrom(
    starts: readonly string[],
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<ReachResult> {
    return logic().reachFrom(starts, profile, knowledge, budget);
  }

  /**
   * The all-pairs cost between `places`.
   *
   * ⭐⭐ **The matrix, and deliberately no optimiser.** This is the
   * input a travelling-salesman solver needs; shipping it without the
   * solver is the decision rather than the omission. The engine
   * computes what the roads cost; **the player decides which stop to
   * make first**, and taking that away would take away the game.
   */
  public static costMatrix(
    places: readonly string[],
    profile: TravelProfileSpec,
    knowledge: { extent?: string },
    budget: number,
  ): Promise<{
    pairs: Array<{
      from: string;
      to: string;
      minutes: number | null;
      legs: number | null;
    }>;
    expanded: number;
  }> {
    return logic().costMatrix(places, profile, knowledge, budget);
  }
}

/*
 * ⭐ Re-exported so a caller needs ONE import to speak to the router.
 * The types are the `lib/place/` core's; this is the author-facing
 * door onto them.
 */
export type {
  RouteOutcome,
  RoutePlan,
  RouteLeg,
  RouteCost,
  RouteAssumption,
  RouteSource,
  RouteRefusalReason,
} from '../lib/place/RoutePlan';
export type { TravelProfileSpec } from '../lib/place/TravelProfile';
export type { ReachResult } from '../platform/idea/api/NavigationLogic';

SecurityApi.decorateApiClass(NavigationApi);
