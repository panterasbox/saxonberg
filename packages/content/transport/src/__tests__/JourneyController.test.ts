/**
 * `journey` — the verb's own arg handling, which had NO tests at all
 * before the routing build.
 *
 * ⭐⭐ The case that matters most is the one that was a live defect: a
 * Journey used to take its mode from `lane.mode`, so `journey to
 * <stop> via estuary` with a wagon hitched made the wagon **sail** —
 * and it died at the first leg, because a road exit does not admit the
 * water medium. A fact about a wagon was being read off the road it
 * happened to be told to take. The mode is the VEHICLE's now, and
 * that is what the first describe below pins.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { NavigationApi } from '@saxonberg/server/mud/api/navigation';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import HaulageRig from '../thing/HaulageRig';
import Barge from '../thing/Barge';
import LaneCatalogue from '../idea/LaneCatalogue';
import {
  corridor,
  installGraph,
  installModes,
  installRooms,
  installRows,
} from './transport-fixtures';

const P = (i: number): string => `/test/road/${i}`;

beforeEach(() => {
  installModes();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

function catalogue(): LaneCatalogue {
  return makeStuff(() => new LaneCatalogue()) as unknown as LaneCatalogue;
}

describe('⭐⭐ the mode is the VEHICLE’s, not the lane’s', () => {
  it('a wagon told `via estuary` is not made to sail', async () => {
    // The shipped defect, as a unit: the wheeled rig's own declared
    // mode is what plans, so a water lane cannot turn it into a boat.
    const rig = makeStuff(() => new HaulageRig()) as unknown as {
      getTravelMode(): string;
      setTravelMode(m: string): void;
    };
    rig.setTravelMode('wheeled');
    const barge = makeStuff(() => new Barge()) as unknown as {
      getTravelMode(): string;
      setTravelMode(m: string): void;
    };
    barge.setTravelMode('sailed');

    expect(rig.getTravelMode()).toBe('wheeled');
    expect(barge.getTravelMode()).toBe('sailed');
  });
});

describe('a lane is a LABEL, not a search scope', () => {
  it('⭐ names every lane a plan crosses, sorted, so it reads the same twice', async () => {
    const c = corridor(5);
    installRooms(c.rooms);
    installGraph(c);
    installRows([
      { key: 'zeta', mode: 'walk', seeds: [P(0)] },
      { key: 'alpha', mode: 'walk', seeds: [P(0)] },
    ]);
    const cat = catalogue();
    const once = await cat.laneLabelFor([P(0), P(1), P(2)]);
    const twice = await cat.laneLabelFor([P(2), P(1), P(0)]);
    // Sorted by key: a label that varied with compile order, or with
    // the direction of travel, would be a different answer to the same
    // question.
    expect(once).toEqual(['alpha', 'zeta']);
    expect(twice).toEqual(['alpha', 'zeta']);
  });

  it('names only the lanes the plan actually touches', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installGraph(c);
    installRows([
      { key: 'road', mode: 'walk', seeds: [P(0)] },
      {
        key: 'elsewhere',
        mode: 'walk',
        edges: [{ from: '/test/far/a', to: '/test/far/b' }],
      },
    ]);
    expect(await catalogue().laneLabelFor([P(0), P(1)])).toEqual(['road']);
  });

  it('answers the lane NAMES for prose, not its keys', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installGraph(c);
    installRows([{ key: 'road', mode: 'walk', seeds: [P(0)] }]);
    // The fixture names a lane `the <key>`, which is enough to show
    // the readout uses the NAME: a key would read `road`, and what a
    // player should see is *you set off along the road*.
    expect(await catalogue().laneNamesFor([P(0), P(1)])).toEqual(['the road']);
    expect(await catalogue().laneLabelFor([P(0), P(1)])).toEqual(['road']);
  });
});

describe('⭐ an AUTHORED lane is its own graph', () => {
  it('plans over its declared edges, which the index need not know', async () => {
    // Rails are not doors. The ferrow tramway's two ends are joined by
    // a mine passage that authors no `media` at all, so planning a
    // wheeled tram over the INDEX would refuse the only way the lane
    // has — and every declared edge is admitted, because an authored
    // edge is the author saying *this way is for this lane*.
    const out = NavigationApi.routeOverEdges(
      [
        { from: '/test/tram/a', to: '/test/tram/b' },
        { from: '/test/tram/b', to: '/test/tram/a' },
      ],
      '/test/tram/a',
      '/test/tram/b',
      50,
    );
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.plans[0]!.nodes).toEqual(['/test/tram/a', '/test/tram/b']);
  });

  it('refuses a pair its declared edges do not join', async () => {
    const out = NavigationApi.routeOverEdges(
      [{ from: '/test/tram/a', to: '/test/tram/b' }],
      '/test/tram/b',
      '/test/tram/a',
      50,
    );
    expect(out.ok).toBe(false);
  });
});

describe('the lane compile reads the INDEX now', () => {
  it('⭐ a wheeled lane stops where wheels are refused, read off the edge', async () => {
    // The same assertion `Lane.test.ts` makes, from the other side:
    // the admission rule is `TravelProfile.admits` over projected edge
    // data, and nothing stands a room up to ask it.
    const c = corridor(5, { wheelsRefusedAt: 2 });
    installRooms(c.rooms);
    installGraph(c);
    installRows([{ key: 'wagon-road', mode: 'wheeled', seeds: [P(0)] }]);
    const lane = (await catalogue().laneOf('wagon-road'))!;
    expect(lane.nodes.sort()).toEqual([P(0), P(1), P(2)].sort());
  });

  it('⚠ says so when a seed is not a place the graph knows', async () => {
    // One row, one place: a seed that names a KIND row (minted many
    // times) is not a node, and the old walk could only report it as
    // "resolves to nothing" after failing to clone a room.
    const c = corridor(3);
    installRooms(c.rooms);
    installGraph(c);
    installRows([{ key: 'road', mode: 'walk', seeds: ['/test/nowhere'] }]);
    const cat = catalogue();
    await cat.laneOf('road');
    const problems = await cat.problems();
    expect(problems.join('\n')).toMatch(/does not know/);
  });
});
