/**
 * PlaceNode — one row of the world's shape: a PLACE, and the exits
 * leading out of it.
 *
 * ⭐⭐ **Derived, never a source.** Every field here is reconstructible
 * from the content rows plus the parcel register, and the whole
 * collection is droppable at any moment — `LocationGraphRegistry`
 * rebuilds it at boot and `DomainHook` keeps it current at the template
 * write chokepoint. Nothing may read this and conclude something the
 * rows do not already say.
 *
 * ⭐⭐ **It must never reach a client**, and that is the evidence
 * firewall. A player's knowledge of the world is their own **map
 * document** (`/home/<key>/map/<locality>`), written from what they
 * perceived — and **the two never join**. A read that merged them would
 * hand somebody the shape of places they have not earned, which is the
 * whole reason the map is a separate artifact rather than a filter over
 * this. The firewall is structural: the map writer does not import this
 * module.
 *
 * ⭐ **A node is a place, and one row is one place.** A content row
 * whose effective class composes `SingletonMixin`, plus every
 * circulation node a warren's `PlatPlan` declares. Every other location
 * row describes a KIND of place, minted many times through a warren or
 * a programme, and is deliberately absent: the elastic half of the
 * world is perceived live and never stored. A holding's interior is
 * somebody's house behind a gate, and the gate is all the graph knows.
 *
 * A RECORD, like `ParcelRecord` — a `Document`, not a `Stuff`. Nothing
 * composes it and nothing clones it; `lint:instanceable`'s invariants
 * read template `class:` values and template paths, neither of which a
 * record class has.
 */

import { Document } from '../persistence/Document';
import { Collections } from '../persistence/Collections';
import type { FieldMeta } from '../mixin';
import type { GraphEdge, GraphNode } from './GraphInvariants';

/** How a travel network advertises a stop that sits on this node. */
export interface NodeTravel {
  /** `both` / `in` / `out` — what the network's own row declares. */
  role: string;
  /** The board label, when the network declares one. */
  boardLabel: string | null;
  /** Where this stop goes, as the DESTINATION node's identity. */
  routes: Array<{ to: string; fee: number; departures: string | null }>;
}

/** One edge as it is stored: `GraphEdge` plus what only a row knows. */
export interface StoredEdge extends GraphEdge {
  /** The shared `Door`'s row, when the exit is doored. */
  door?: string | null;
  /** Minutes of game time the traverse costs, when the exit declares it. */
  minutes?: number | null;
  /** The exit-kind row this edge is installed from. */
  kind?: string | null;
  /**
   * The locomotion MEDIA this exit admits (`['ground']`, `['water']`).
   * Empty or absent means the ground pace family, which is what
   * `Exit.allowsMode` means by an empty list.
   *
   * ⚠⚠ Without this the index could **cost** a wagon's route but not
   * say whether a wagon may take it — the whole reason a lane had to
   * be compiled by walking live exits instead of read off the
   * projection.
   */
  media?: string[];
  /** `false` iff the exit refuses wheels. Absent means it admits them. */
  wheelPassable?: boolean;
  /**
   * ⭐⭐ Is this the KIND of way that closes?
   *
   * The index is a projection of authored rows, so whether the ford at
   * Kestrel is flooded *right now* cannot be in it — that is discovered
   * at the traverse, and rightly. What the row does know is that this
   * way is **the kind that sometimes is not there**, which is exactly
   * what a plan owes the person reading it: *this way crosses the ford;
   * it is not always passable.*
   *
   * ⭐ It is also the first place in this game where a fast uncertain
   * way can be weighed against a slow sure one, which makes it a RISK
   * axis rather than a cost one. Nobody designed that; it fell out of
   * projecting one flag.
   */
  conditional?: boolean;
}

export class PlaceNode extends Document {
  static collectionName = Collections.LocationGraph;
  static fieldMeta: FieldMeta = {
    identity: { persistent: true },
    template: { persistent: true },
    zone: { persistent: true },
    address: { persistent: true },
    coords: { persistent: true },
    edges: { persistent: true },
    crossesZone: { persistent: true },
    published: { persistent: true },
    origin: { persistent: true },
    travel: { persistent: true },
    generation: { persistent: true },
  };

  /**
   * The durable identity this node answers to — unique, and the same
   * string `getDurableHandle()` gives the live place. For a template
   * node it IS the row; for a plan node it is
   * `PlatPlan.nodeIdentityOf(nodeId, extent)`.
   */
  identity: string = '';

  /**
   * The content ROW this node came from — what an author is told to go
   * and edit. ⭐ Distinct from `identity` for a plan node, where several
   * nodes share one circulation row, and that distinction is the whole
   * reason both fields exist: a finding names the row, a lookup names
   * the identity.
   */
  template: string = '';

  /** The zone this node resolves into, path-based, or `''` for none. */
  zone: string = '';

  /**
   * The grouping address the content declares (`_address`), or `''`.
   *
   * ⚠ A **grouping key only** — never display chrome and never an
   * identity. It is what lets a map read Duncan Hall's four rooms as
   * *Duncan Hall* rather than as four unrelated places, and it groups
   * by what the content already says rather than by anything new.
   */
  address: string = '';

  /** `[x, y, z]` when the row plots on a coordinate system, else null. */
  coords: [number, number, number] | null = null;

  /** Every exit leading out of this place. */
  edges: StoredEdge[] = [];

  /** Does any edge leave this node's zone? The interzone skeleton's key. */
  crossesZone: boolean = false;

  /**
   * Denormalised from the covering parcel's `published`, so
   * `Exit.canTraverse` can read it **synchronously without resolving the
   * destination** — the rule the lock gate already follows. The parcel
   * stays the source of truth; a flip re-projects the extent.
   */
  published: boolean = true;

  /** `template` (a content row) or `plan` (a warren's circulation node). */
  origin: 'template' | 'plan' = 'template';

  /**
   * What a travel network advertises here, when a stop sits on this
   * node. Stored so the offline boundary's reverse-edge query can tell
   * an Authority its timetable lost a stop — a network is a second kind
   * of edge into a place, and a place taken down breaks it the same way
   * a corridor does.
   */
  travel: NodeTravel | null = null;

  /**
   * The rebuild's sweep key. `rebuild()` stamps every projected node
   * with a fresh generation and deletes the rows carrying any other —
   * which is what *droppable and rebuildable at any moment* means in
   * code, without a drop-then-repopulate window where the graph is
   * empty.
   */
  generation: number = 0;

  /** The node as the shared invariants want it — plain data, no record. */
  toGraphNode(): GraphNode {
    return {
      identity: this.identity,
      template: this.template,
      zone: this.zone === '' ? null : this.zone,
      address: this.address === '' ? null : this.address,
      published: this.published,
      edges: this.edges,
    };
  }

  /*
   * ⚠⚠ **No finder statics here, and that is a placement decision
   * rather than an omission.** `ParcelRecord` carries its own
   * (`findByExtent`, `findChildren`, …) and that looked like the
   * precedent — but `lint:lib-statics` counts statics on non-Api
   * classes against a ratchet that may not grow, and seven new finders
   * grew it by seven.
   *
   * ⭐ The gate was right to ask, and the answer improved the shape:
   * this record has exactly ONE consumer — `LocationGraphRegistry` owns
   * the projection and every query over it — so a public finder surface
   * was offering a read nobody outside was going to perform. The
   * queries live on the registry as private methods over the inherited
   * `Document.find`, and the only thing on the record itself is
   * `toGraphNode()`, which is an instance method because it is a fact
   * about the row rather than a lookup of rows.
   */
}
