// NavigationLogic — the hot-reloadable logic singleton behind
// NavigationApi. (Doc comment lives on the class declaration below so
// @internal lands on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import type LocationGraphRegistry from '../LocationGraphRegistry';
import type { PlaceNode } from '../../../lib/location/PlaceNode';
import type { GraphFinding } from '../../../lib/location/GraphInvariants';
import { DocumentApi } from '../../../api/document';
import { WorldClockApi } from '../../../api/worldclock';
import type {
  MapClaim,
  MapDocument,
} from '../../../lib/location/MapClaim';
import type { CardinalDirection } from '../../../api/navigation';

/** Where the graph registry stands. */
const GRAPH_REGISTRY_PATH = '/platform/idea/LocationGraphRegistry';

/**
 * The registry, or null before it has warmed.
 *
 * ⚠ `null` is a real answer and every caller treats it as one: the
 * registry is booted from the platform pack's manifest, and plenty runs
 * before that — the installer's own 2,500 row writes, every unit test
 * that never boots a world. A graph read before the warm answers
 * *nothing yet*, not *no such place*, which is why the projection hook
 * checks `isGraphWarm()` first rather than relying on these to no-op.
 */
function registry(): LocationGraphRegistry | null {
  return (
    StuffApi.findByTemplatePath<LocationGraphRegistry>(GRAPH_REGISTRY_PATH) ??
    null
  );
}

/**
 * Offsets keyed by long-form direction name.
 *
 * y grows north (matches "map up"); z grows up (standard).
 */
const DIRECTION_OFFSETS: Record<CardinalDirection, [number, number, number]> = {
  north: [0, 1, 0],
  south: [0, -1, 0],
  east: [1, 0, 0],
  west: [-1, 0, 0],
  northeast: [1, 1, 0],
  northwest: [-1, 1, 0],
  southeast: [1, -1, 0],
  southwest: [-1, -1, 0],
  up: [0, 0, 1],
  down: [0, 0, -1],
};

/**
 * Alias → canonical long form. Keys are lower-cased tokens the parser will
 * see (`n`, `ne`, `u`, `d`, ...).
 */
const DIRECTION_ALIASES: Record<string, CardinalDirection> = {
  n: 'north',
  north: 'north',
  s: 'south',
  south: 'south',
  e: 'east',
  east: 'east',
  w: 'west',
  west: 'west',
  ne: 'northeast',
  northeast: 'northeast',
  nw: 'northwest',
  northwest: 'northwest',
  se: 'southeast',
  southeast: 'southeast',
  sw: 'southwest',
  southwest: 'southwest',
  u: 'up',
  up: 'up',
  d: 'down',
  down: 'down',
};

/** Inverses for the 10 cardinals (used for arrival messages). */
const DIRECTION_INVERSES: Record<CardinalDirection, CardinalDirection> = {
  north: 'south',
  south: 'north',
  east: 'west',
  west: 'east',
  northeast: 'southwest',
  northwest: 'southeast',
  southeast: 'northwest',
  southwest: 'northeast',
  up: 'down',
  down: 'up',
};

const CARDINALS: readonly CardinalDirection[] = [
  'north',
  'south',
  'east',
  'west',
  'northeast',
  'northwest',
  'southeast',
  'southwest',
  'up',
  'down',
];

/** Module-private canonical lookup — shared by every method below. */
function normalize(input: string): CardinalDirection | undefined {
  return DIRECTION_ALIASES[input.trim().toLowerCase()];
}

const NavigationApiCallers = SecurityPolicies.FromModule('/api/navigation#NavigationApi'
);

/**
 * NavigationLogic — the hot-reloadable logic singleton behind
 * {@link NavigationApi}.
 *
 * Holds the canonical direction table (offsets, aliases, inverses) and
 * the lookup methods. Lives at `/platform/idea/api/navigation`; `NavigationApi`'s
 * statics forward here via `StuffApi.singletonSync`. Each public method
 * is gated `FromModule('/api/navigation#NavigationApi')` (per-method,
 * not class-level — see {@link MaterialLogic} for why).
 *
 * The direction constants and the `CardinalDirection` vocabulary are
 * *placed* here (constants are placed, not re-exported); the type is
 * re-exported type-only from the Api face. Internal lookups go through
 * the module-private `normalize` free function rather than
 * `this.normalizeDirection`, so there are no intra-singleton self-calls
 * to trip the gate.
 *
 * @internal
 */
@Unshadowable
export class NavigationLogic extends ApiLogic {
  /** See {@link NavigationApi.normalizeDirection}. */
  @CallSecurity(NavigationApiCallers)
  public normalizeDirection(input: string): CardinalDirection | undefined {
    return normalize(input);
  }

  /** See {@link NavigationApi.invertDirection}. */
  @CallSecurity(NavigationApiCallers)
  public invertDirection(direction: string): CardinalDirection | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_INVERSES[canonical];
  }

  /** See {@link NavigationApi.directionOffset}. */
  @CallSecurity(NavigationApiCallers)
  public directionOffset(
    direction: string
  ): [number, number, number] | undefined {
    const canonical = normalize(direction);
    if (!canonical) return undefined;
    return DIRECTION_OFFSETS[canonical];
  }

  /** See {@link NavigationApi.isCardinalDirection}. */
  @CallSecurity(NavigationApiCallers)
  public isCardinalDirection(direction: string): boolean {
    return normalize(direction) !== undefined;
  }

  /** See {@link NavigationApi.cardinalDirections}. */
  @CallSecurity(NavigationApiCallers)
  public cardinalDirections(): readonly CardinalDirection[] {
    return CARDINALS;
  }

  /* ── the location graph ─────────────────────────────────────────────
   *
   * ⭐ Every method here is STRING-KEYED and takes plain data. Nothing
   * takes a `Stuff`: `NavigationApi` is not on `lint:object-verbs`'s
   * exempt list, and it should not be — the graph is addressed by
   * identity, which is a string, and a method that took a live place
   * would be asking its caller to have stood one up.
   *
   * ⚠ The state and the projection live on `LocationGraphRegistry`
   * (the `AddressRegistry` → `AddressLogic` arrangement): the index
   * must survive a reload of this file, and a reload of the registry
   * re-clones it and rebuilds idempotently.
   */

  /** See {@link NavigationApi.isGraphWarm}. */
  @CallSecurity(NavigationApiCallers)
  public isGraphWarm(): boolean {
    return registry()?.isWarm() ?? false;
  }

  /** See {@link NavigationApi.rebuildGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async rebuildGraph(): Promise<number> {
    return (await registry()?.rebuild()) ?? 0;
  }

  /** See {@link NavigationApi.projectRow}. */
  @CallSecurity(NavigationApiCallers)
  public async projectRow(path: string): Promise<void> {
    await registry()?.projectRow(path);
  }

  /** See {@link NavigationApi.removeRow}. */
  @CallSecurity(NavigationApiCallers)
  public async removeRow(path: string): Promise<void> {
    await registry()?.removeRow(path);
  }

  /** See {@link NavigationApi.reprojectExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async reprojectExtent(extent: string): Promise<number> {
    return (await registry()?.reprojectExtent(extent)) ?? 0;
  }

  /** See {@link NavigationApi.node}. */
  @CallSecurity(NavigationApiCallers)
  public async node(identity: string): Promise<PlaceNode | null> {
    return (await registry()?.node(identity)) ?? null;
  }

  /** See {@link NavigationApi.nodesInZone}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInZone(zonePath: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInZone(zonePath)) ?? [];
  }

  /** See {@link NavigationApi.nodesInExtent}. */
  @CallSecurity(NavigationApiCallers)
  public async nodesInExtent(extent: string): Promise<PlaceNode[]> {
    return (await registry()?.nodesInExtent(extent)) ?? [];
  }

  /** See {@link NavigationApi.pointingAt}. */
  @CallSecurity(NavigationApiCallers)
  public async pointingAt(identity: string): Promise<PlaceNode[]> {
    return (await registry()?.pointingAt(identity)) ?? [];
  }

  /** See {@link NavigationApi.interzoneSkeleton}. */
  @CallSecurity(NavigationApiCallers)
  public async interzoneSkeleton(): Promise<PlaceNode[]> {
    return (await registry()?.interzoneSkeleton()) ?? [];
  }

  /** See {@link NavigationApi.edgesIntoUnpublished}. */
  @CallSecurity(NavigationApiCallers)
  public async edgesIntoUnpublished(): Promise<PlaceNode[]> {
    return (await registry()?.edgesIntoUnpublished()) ?? [];
  }

  /** See {@link NavigationApi.checkGraph}. */
  @CallSecurity(NavigationApiCallers)
  public async checkGraph(scope?: string): Promise<GraphFinding[]> {
    return (await registry()?.checkGraph(scope)) ?? [];
  }

  /* ── a player's map ──────────────────────────────────────────────────
   *
   * ⭐⭐ **This half never touches `location_graph`**, and that is the
   * evidence firewall made structural rather than policed. A map is
   * written from what the player PERCEIVED — the live room they are
   * standing in, whose exits `obviousExitsFor(viewer)` has already
   * filtered through the perception gate — so there is no read here
   * that could hand somebody the shape of a place they have not
   * earned.
   *
   * ⚠ And the live room is the right source for a second reason: it
   * carries the ELASTIC nodes the graph deliberately does not store
   * (a holding's rooms, a corridor minted on approach). A map built
   * from the graph could not record a dorm room at all.
   */

  /** See {@link NavigationApi.recordPlace}. */
  @CallSecurity(NavigationApiCallers)
  public async recordPlace(
    viewerKey: string,
    locality: string,
    claims: readonly MapClaim[],
  ): Promise<void> {
    if (!viewerKey || !locality || claims.length === 0) return;
    const existing = await this.loadMap(viewerKey, locality);
    const grown = NavigationLogic.growMap(existing, claims);
    if (!grown) return; // nothing new and nothing to bump
    await DocumentApi.saveMap(viewerKey, locality, {
      locality,
      claims: grown,
    } as unknown as Record<string, unknown>);
  }

  /** See {@link NavigationApi.readMap}. */
  @CallSecurity(NavigationApiCallers)
  public async readMap(
    viewerKey: string,
    localityPrefix: string,
  ): Promise<MapDocument[]> {
    const rows = await DocumentApi.readMaps(viewerKey, localityPrefix);
    return rows.map((r) => {
      const data = r.data as unknown as MapDocument;
      return {
        locality: typeof data?.locality === 'string' ? data.locality : '',
        claims: Array.isArray(data?.claims) ? data.claims : [],
      };
    });
  }

  /** See {@link NavigationApi.mapNow}. */
  @CallSecurity(NavigationApiCallers)
  public mapNow(): number {
    try {
      return Math.floor(WorldClockApi.getNow().value);
    } catch {
      // No clock in a bare test harness; a claim with a 0 timestamp is
      // still a claim, and the alternative is refusing to record one.
      return 0;
    }
  }

  /** This player's map of one locality, or an empty one. */
  private async loadMap(
    viewerKey: string,
    locality: string,
  ): Promise<MapClaim[]> {
    const rows = await DocumentApi.readMaps(viewerKey, locality);
    const exact = rows.find((r) => r.path.endsWith(`/map/${locality}`));
    const data = exact?.data as unknown as MapDocument | undefined;
    return Array.isArray(data?.claims) ? [...data.claims] : [];
  }

  /**
   * ⭐⭐ **The growth rule, and it is the whole knowledge model.**
   *
   * A new observation identical in `(kind, place, dir, toLabel,
   * channel)` to the **latest** claim for that key bumps its
   * `lastSeen`. A differing one is **appended**. ⚠ **Nothing is ever removed, and nothing is
   * ever corrected.**
   *
   * That is what makes a map able to be WRONG. Wall up an exit somebody
   * has walked and their map still shows it; when they next look, the
   * new observation lands beside the old one and both render — *you
   * recorded an exit east on <date>; on <later> you saw none*. A merge
   * would pick a winner and hide that it did, which turns a knowledge
   * model back into a truth model.
   *
   * ⭐ `channel` is part of the key on purpose: *you saw an exit east*
   * and *somebody told you there is one* are two different claims about
   * the world, and collapsing them would lose exactly the provenance
   * the channel exists to carry.
   *
   * Returns `null` when nothing changed at all, so a repeated `look`
   * writes no document — `look` is cheap and frequent, and the dedupe
   * is what bounds a map's growth to the number of DISTINCT
   * observations.
   */
  private static growMap(
    existing: MapClaim[],
    incoming: readonly MapClaim[],
  ): MapClaim[] | null {
    // ⭐⭐ The far side is keyed by `toLabel` and NOT by `to`.
    //
    // `toLabel` is the destination's template path: always present,
    // authored, and the same string whether or not the far room is in
    // memory. `to` is its durable HANDLE *if it happened to be
    // resident when the observation was taken* — which is a fact about
    // residency, not a claim about the world.
    //
    // ⚠⚠ With `to` in the key, the same edge observed twice produced
    // TWO claims whenever the far room's residency flipped between
    // them: perceive the gate cold (`to: null`), then walk north
    // (`to: <handle>`), and the map rendered
    // `north → crossing` **twice**, both "recorded just now". Found by
    // a browser drive, which is the only instrument that walks a cold
    // world. It is unbounded, too — residency evicts the cold tail, so
    // a corridor walked across a long session appends a claim per flip.
    //
    // ⭐ Dropping `to` keeps the case that put `toLabel` here in the
    // first place: east→yard and east→cellar still differ by label, so
    // a far side that genuinely CHANGED still appends and still
    // renders its disagreement. What stops appending is the same claim
    // told twice.
    //
    // ⚠ Residual, accepted: two instances of ONE row as the far side
    // share a label and now bump rather than append. That is the
    // honest reading — *north leads to a dorm room* did not change —
    // and `to` could not have distinguished them reliably anyway,
    // since whether it is populated at all depends on residency.
    const keyOf = (c: MapClaim): string =>
      [c.kind, c.place, c.dir ?? '', c.toLabel ?? '', c.channel].join('|');
    // The LATEST claim per key — a later differing observation appends,
    // so a key can hold several and only the newest is bumpable.
    const latest = new Map<string, MapClaim>();
    for (const claim of existing) {
      const key = keyOf(claim);
      const held = latest.get(key);
      if (!held || claim.lastSeen >= held.lastSeen) latest.set(key, claim);
    }
    let changed = false;
    const out = [...existing];
    for (const claim of incoming) {
      const held = latest.get(keyOf(claim));
      if (held) {
        if (claim.lastSeen > held.lastSeen) {
          held.lastSeen = claim.lastSeen;
          changed = true;
        }
        continue;
      }
      out.push({ ...claim });
      latest.set(keyOf(claim), claim);
      changed = true;
    }
    return changed ? out : null;
  }
}
