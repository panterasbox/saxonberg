/**
 * Shared fixtures for the transport suite: a synthetic corridor of
 * rooms wired end to end, and the seams a `LaneCatalogue` reads through.
 *
 * ⚠ The corridor is **synthetic** (`/test/**`), never shipped content: a
 * kernel-adjacent test proves the mechanism over fixtures, and a test of
 * a real road lives beside the road.
 */

import { vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import LocationGraphRegistry from '@saxonberg/server/mud/platform/idea/LocationGraphRegistry';
import { KnowledgeGraph } from '@saxonberg/server/mud/lib/location/KnowledgeGraph';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import Exit from '@saxonberg/server/mud/lib/boundary/Exit';
import CartesianZone from '@saxonberg/server/mud/platform/idea/location/CartesianZone';
import SingletonCartesianLocation from '@saxonberg/server/mud/platform/location/SingletonCartesianLocation';
import { LocomotionMode } from '@saxonberg/server/mud/platform/idea/LocomotionMode';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { LaneEdge } from '../idea/Lane';

/** How a fixture lane is declared. */
export interface LaneSpec {
  key: string;
  mode?: string;
  seeds?: string[];
  stops?: string[];
  edges?: LaneEdge[];
  operator?: string | null;
}

/** How a fixture route row is declared. */
export interface RouteSpec {
  key: string;
  laneKey: string;
  nodes: string[];
  stops?: string[];
}

/**
 * Serve the authored rows `Template.findDescendants` will ask for.
 *
 * The seam is `PersistApi.find` rather than the `PersistenceManager` the
 * kernel's own suites mock: a pack imports the kernel only through the
 * server's `exports` map, and `backend/` is deliberately not in it. The
 * Api face is the pack's whole view of persistence, so it is the only
 * honest place for a pack test to intercept.
 */
export function installRows(lanes: LaneSpec[], routes: RouteSpec[] = []): void {
  const store: Record<string, unknown>[] = [];
  lanes.forEach((l, i) => {
    store.push({
      _id: `lane-${i}`,
      path: `/stuff/idea/Lane/${l.key}`,
      class: '/system/transport/idea/Lane',
      data: {
        key: l.key,
        name: `the ${l.key}`,
        mode: l.mode ?? 'walk',
        edges: l.edges ?? [],
        stops: l.stops ?? [],
        seeds: l.seeds ?? [],
        operator: l.operator ?? null,
      },
    });
  });
  routes.forEach((r, i) => {
    store.push({
      _id: `route-${i}`,
      path: `/stuff/idea/ServiceRoute/${r.key}`,
      class: '/system/transport/idea/ServiceRoute',
      data: {
        key: r.key,
        laneKey: r.laneKey,
        nodes: r.nodes,
        stops: r.stops ?? [],
      },
    });
  });
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      const q = query.path as { $regex?: string } | string | undefined;
      if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
        const re = new RegExp(q.$regex);
        return store.filter((d) => re.test(d.path as string));
      }
      if (typeof q === 'string') return store.filter((d) => d.path === q);
      return store.slice();
    },
  );
}

/**
 * `StuffApi.singleton` over the live fixture rooms. Room paths resolve
 * to the fixtures; everything else (the clone pipeline resolves its
 * hydrator through `singleton` too) falls through to the real thing.
 */
export function installRooms(rooms: Map<string, Stuff & Container>): void {
  const real = StuffApi.singleton.bind(StuffApi);
  vi.spyOn(StuffApi, 'singleton').mockImplementation(((path: string) => {
    const hit = rooms.get(path);
    return hit ? Promise.resolve(hit) : real(path);
  }) as typeof StuffApi.singleton);
}

/**
 * ⭐⭐ The corridor as the WORLD INDEX sees it.
 *
 * The lane compile reads `NavigationApi.reachFrom` now, which reads
 * the `location_graph` projection — and a fixture that wires live
 * `Exit` objects has no projection behind it. So this derives the
 * graph nodes from the same exits the fixture just wired and hands
 * them to the registry.
 *
 * ⚠ The seam is the registry's `graphView`, deliberately, and not
 * `reachFrom`: everything the lane compile actually depends on — the
 * `Traversal`, `TravelProfile.admits`, the budget, the edge
 * collection — then runs FOR REAL over fixture data. Stubbing
 * `reachFrom` would stub the thing under test, and re-deriving the
 * reach here would put a twelfth copy of the walk in a test fixture,
 * which is what this build exists to remove.
 */
export function installGraph(c: Corridor): void {
  const nodes = [...c.rooms.entries()].map(([path, room]) => {
    const exits = (
      room as unknown as { getExits(): Map<string, Exit> }
    ).getExits();
    return {
      identity: path,
      published: true,
      // ⚠⚠ A BLOCKED exit contributes NO EDGE, because that is what
      // the projection does with an authored `blocked: true` spec: a
      // blocked way is a way that is not there, not a way the search
      // has to refuse. A fixture that wires `setBlocked(true)` is
      // standing in for that row.
      //
      // ⚠ It does NOT stand in for a RUNTIME closure — a ford the
      // river has shut. Those are deliberately NOT in the index (it
      // is a projection of authored rows and cannot know the water
      // level), so a flooded ford stays in the lane, every plan over
      // it carries `conditional` as a stated assumption, and the
      // closure is discovered at the leg. See `FordExit`.
      edges: [...exits.values()]
        .filter((exit) => !exit.isBlocked())
        .map((exit) => ({
          dir: exit.getDirection(),
          to: exit.getDestinationTemplatePath(),
          minutes: exit.getEdgeMinutes(),
          media: [...exit.getMedia()],
          wheelPassable: exit.isWheelPassable(),
          ...(exit.isConditional() ? { conditional: true } : {}),
        })),
    };
  });
  makeStuffAtPath(
    () => new LocationGraphRegistry(),
    '/platform/idea/LocationGraphRegistry',
  );
  vi.spyOn(LocationGraphRegistry.prototype, 'graphView').mockImplementation(
    async (extent?: string) => KnowledgeGraph.fromNodes(nodes, extent),
  );
}

/** The two locomotion modes the fixtures use, as live singletons. */
export function installModes(): void {
  for (const [name, medium, speed] of [
    ['walk', 'ground', 1.0],
    ['wheeled', 'ground', 2.0],
    ['sailed', 'water', 1.5],
  ] as const) {
    const mode = makeStuffAtPath(
      () => new LocomotionMode(),
      `/platform/idea/LocomotionMode/${name}`,
    );
    mode.setName(name);
    mode.setMedium(medium);
    mode.setSpeed(speed);
  }
}

export interface Corridor {
  zone: CartesianZone;
  /** Path → room, in order. */
  rooms: Map<string, Stuff & Container>;
  paths: string[];
  /** The exits, keyed `"<from>→<to>"`. */
  exits: Map<string, Exit>;
}

/**
 * A straight corridor of `n` rooms at `/test/road/<i>`, wired both ways,
 * every exit admitting `media` and (optionally) refusing wheels at one
 * index.
 */
export function corridor(
  n: number,
  opts: {
    media?: string[];
    /** The leg index (`i` → `i+1`) whose exits refuse wheels. */
    wheelsRefusedAt?: number;
    /** Game minutes on every edge; omit for the corridor default. */
    edgeMinutes?: number;
  } = {},
): Corridor {
  const media = opts.media ?? ['ground'];
  const zone = makeStuff(() => new CartesianZone());
  const rooms = new Map<string, Stuff & Container>();
  const paths: string[] = [];
  const exits = new Map<string, Exit>();

  for (let i = 0; i < n; i += 1) {
    const path = `/test/road/${i}`;
    const room = makeStuffAtPath(
      () => new SingletonCartesianLocation(),
      path,
    ) as unknown as Stuff & Container;
    zone.addLocation(room as never, i, 0, 0);
    rooms.set(path, room);
    paths.push(path);
  }

  for (let i = 0; i + 1 < n; i += 1) {
    const from = paths[i]!;
    const to = paths[i + 1]!;
    const wheels = opts.wheelsRefusedAt !== i;
    exits.set(`${from}→${to}`, wire(rooms, from, to, 'east', media, wheels, opts.edgeMinutes));
    exits.set(`${to}→${from}`, wire(rooms, to, from, 'west', media, wheels, opts.edgeMinutes));
  }

  return { zone, rooms, paths, exits };
}

function wire(
  rooms: Map<string, Stuff & Container>,
  fromPath: string,
  toPath: string,
  direction: string,
  media: string[],
  wheelPassable: boolean,
  edgeMinutes: number | undefined,
): Exit {
  const from = rooms.get(fromPath)!;
  const to = rooms.get(toPath)!;
  const exit = makeStuff(
    () =>
      new Exit({
        direction,
        source: from,
        destination: to,
        destinationPath: toPath,
        media,
        wheelPassable,
        ...(edgeMinutes !== undefined ? { edgeMinutes } : {}),
      }),
  );
  (from as unknown as { addExit(e: Exit): Promise<void> }).addExit(exit);
  return exit;
}

/** Put `what` in the room at `index` of a corridor. */
export function placeAt(c: Corridor, what: Stuff, index: number): void {
  ContainmentApi.move(what as never, c.rooms.get(c.paths[index]!)! as never);
}
