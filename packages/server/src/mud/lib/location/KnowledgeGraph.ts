/**
 * KnowledgeGraph — what a traveller knows of the world's shape, as
 * something walkable.
 *
 * ⭐⭐⭐ **This is where the evidence firewall becomes structural.**
 * Routing takes TWO knowledge sources, and the whole design turns on
 * their never being the same object:
 *
 * - **the world index**, materialised from `location_graph`. An
 *   omniscient view of every authored place and edge. Legitimate for a
 *   brain whose author declared what it knows, and for a compile; ⛔
 *   never for a person.
 * - **a person's own map claims**, materialised from their map
 *   document. Append-only, never corrected, possibly stale, possibly
 *   self-contradictory. *Rot is the feature.*
 *
 * A map planner that could *reach* the index would eventually consult
 * it — not maliciously, but because it was convenient once, in one
 * branch, under a deadline. So this module and its three siblings
 * (`Traversal`, `TravelProfile`, `RoutePlan`) may import nothing that
 * leads to the index, and `lint:graph-walks`' second check enforces
 * it with no ceiling. ⭐ The map **writer** (`Cartographer`) already
 * had this property, deliberately; this extends it to the reader,
 * because a firewall honoured by the careful is not a firewall.
 *
 * ⚠ So the materialisers take **plain arrays**, and the caller — the
 * registry for the world, `NavigationLogic` for the map — does the
 * reading. That is the seam, and it is the only seam.
 */

import type { AdmissibleWay } from './TravelProfile';
import type { RouteClaimChannel } from './RoutePlan';

/**
 * One way out of a place, as knowledge. ⭐ Structurally satisfied by a
 * projected `StoredEdge`, which is how the world source materialises
 * with no import of `PlaceNode`.
 */
export interface KnownWay extends AdmissibleWay {
  dir: string;
  /** The far place's identity, or `null` when the knower has no name for it. */
  to: string | null;
  minutes?: number | null;
  conditional?: boolean;
  /**
   * Map source only: where this belief came from and when. ⭐ What a
   * `stale` assumption is built out of, and the reason an assumption
   * never has to borrow from the index.
   */
  evidence?: { channel: RouteClaimChannel; lastSeen: number };
}

/** One place, as knowledge. */
export interface KnownPlace {
  identity: string;
  edges: readonly KnownWay[];
  /**
   * ⚠ A **knowledge** fact, not an admission one: the search declines
   * to ENTER an unpublished place rather than declining the edge into
   * it. For the map source this is always `true` — you cannot know
   * otherwise, and the live gate still has the last word at the
   * threshold.
   */
  published: boolean;
}

/** What a materialiser is handed for the world source. */
export interface NodeLike {
  identity: string;
  edges: readonly (AdmissibleWay & {
    dir: string;
    to?: string | null;
    toPath?: string | null;
    minutes?: number | null;
    conditional?: boolean;
    slot?: string | null;
  })[];
  published: boolean;
}

/** What a materialiser is handed for the map source. */
export interface ClaimLike {
  kind: 'place' | 'edge';
  place: string;
  dir?: string;
  to?: string | null;
  toLabel?: string | null;
  channel: RouteClaimChannel;
  lastSeen: number;
  conditional?: boolean;
}

/**
 * ⚠ `@internal` on the CLASS, not on the module header, and the
 * placement is load-bearing: `lint:lib-statics` counts a class-level
 * `@internal` separately and excludes it from the ceiling (which has
 * zero headroom), and TypeDoc hangs author visibility on the same tag.
 * A header-only tag reads to both tools as a public class.
 *
 * The caller audit the gate asks for: `fromNodes` is called by
 * `LocationGraphRegistry`, `fromClaims` by `NavigationLogic`, and
 * neither anywhere an author can reach — an author plans through
 * `NavigationApi`. It is not author surface.
 *
 * @internal
 */
export class KnowledgeGraph {
  private readonly places: Map<string, KnownPlace>;

  private constructor(places: Map<string, KnownPlace>) {
    this.places = places;
  }

  public has(identity: string): boolean {
    return this.places.has(identity);
  }

  public at(identity: string): KnownPlace | null {
    return this.places.get(identity) ?? null;
  }

  public size(): number {
    return this.places.size;
  }

  /** Every identity, sorted — so a caller's iteration is deterministic. */
  public identities(): readonly string[] {
    return [...this.places.keys()].sort();
  }

  /**
   * The world index, materialised. `extent` prefixes identity, because
   * ⭐ *scoping a search to an extent is a thing an author may choose*
   * — an NPC that only knows its own quarter is the author saying so,
   * never the engine assuming it.
   */
  public static fromNodes(
    nodes: readonly NodeLike[],
    extent?: string,
  ): KnowledgeGraph {
    const places = new Map<string, KnownPlace>();
    for (const node of nodes) {
      if (extent !== undefined && !node.identity.startsWith(extent)) continue;
      const edges: KnownWay[] = [];
      for (const e of node.edges) {
        // ⚠ A slot edge points at a warren's elastic half, which has no
        // stored node to arrive at.
        if (e.slot) continue;
        const to = e.to ?? e.toPath ?? null;
        if (to === null) continue;
        edges.push({
          dir: e.dir,
          to,
          minutes: e.minutes ?? null,
          ...(e.conditional === true ? { conditional: true } : {}),
          ...(e.media !== undefined ? { media: e.media } : {}),
          ...(e.wheelPassable !== undefined
            ? { wheelPassable: e.wheelPassable }
            : {}),
        });
      }
      places.set(node.identity, {
        identity: node.identity,
        edges,
        published: node.published,
      });
    }
    return new KnowledgeGraph(places);
  }

  /**
   * One person's map claims, materialised.
   *
   * ⭐⭐ **The join this is allowed to make, and why it is not a join
   * to the index.** An edge claim records `toLabel` — the far side's
   * authored row path, which the walker read off the exit they were
   * standing at — and a singleton place's own durable handle **is** its
   * row path. So `toLabel` equals the far place's `place` handle
   * whenever the far place is a template node, and matching them is a
   * string comparison **inside one document**. Nothing is consulted.
   *
   * ⚠⚠ **Where two claims disagree about one `(place, dir)`, BOTH
   * edges are admitted.** A map that can be wrong routes over what it
   * believes, and the plan names the disagreement as an assumption
   * rather than the engine silently picking a winner. Claims append
   * and nothing is corrected — that is the map's contract, and
   * resolving a contradiction here would be the reader overriding the
   * writer.
   */
  public static fromClaims(claims: readonly ClaimLike[]): KnowledgeGraph {
    const places = new Map<string, KnownPlace>();
    const edgesOf = new Map<string, KnownWay[]>();

    for (const claim of claims) {
      if (claim.kind !== 'place') continue;
      if (!places.has(claim.place)) {
        places.set(claim.place, {
          identity: claim.place,
          edges: [],
          // Always true: you cannot know a place is unpublished, and
          // the live gate still decides at the threshold.
          published: true,
        });
      }
    }

    for (const claim of claims) {
      if (claim.kind !== 'edge' || claim.dir === undefined) continue;
      const to = claim.to ?? claim.toLabel ?? null;
      if (to === null) continue;
      const list = edgesOf.get(claim.place) ?? [];
      list.push({
        dir: claim.dir,
        to,
        // ⚠ No `minutes`. A walker who crossed in zero game time did
        // not learn how long the way takes — ordinary movement is
        // instantaneous and free by deliberate design, so recording a
        // duration from a free walk would write a number the world
        // never charged. A map plan costs in LEGS.
        minutes: null,
        ...(claim.conditional === true ? { conditional: true } : {}),
        evidence: { channel: claim.channel, lastSeen: claim.lastSeen },
      });
      edgesOf.set(claim.place, list);
    }

    for (const [identity, edges] of edgesOf) {
      const place = places.get(identity);
      if (place) {
        places.set(identity, { ...place, edges });
        continue;
      }
      // ⭐ An edge claim with no place claim is still knowledge: you
      // saw a doorway without ever recording the room you were in
      // (every path into the map writes both today, but a map is an
      // append-only log and a reader must not assume its own writer).
      places.set(identity, { identity, edges, published: true });
    }

    // A place named only as somebody's destination is known to EXIST
    // and known to have no ways out — which is exactly right: you have
    // seen it from a doorway and never been in it.
    for (const edges of edgesOf.values()) {
      for (const edge of edges) {
        if (edge.to !== null && !places.has(edge.to)) {
          places.set(edge.to, { identity: edge.to, edges: [], published: true });
        }
      }
    }

    return new KnowledgeGraph(places);
  }
}
