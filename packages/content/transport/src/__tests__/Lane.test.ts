/**
 * A lane is an **induced edge set**, not a drawn map.
 *
 * The claims:
 *
 *  - you author which exits admit a mode; the road is the subgraph;
 *  - a `wheeled` lane also asks `wheelPassable`, which is the residue the
 *    medium cannot express — **and it is what makes the pass a barrier**;
 *  - a lane whose edges are AUTHORED needs no exits at all: that is the
 *    rail / TPA case, and it is what makes *"rail is a data addition"*
 *    true rather than aspirational;
 *  - ⚠ `operator` may be `null` (the public highway) or a business path,
 *    and **nothing reads a player** — rail and the TPA are incumbent
 *    networks in this design.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import LaneCatalogue from '../idea/LaneCatalogue';
import { corridor, installModes, installRooms, installRows } from './transport-fixtures';

const catalogue = (): LaneCatalogue => makeStuff(() => new LaneCatalogue());

beforeEach(() => {
  StuffApi.clearAll();
  installModes();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a lane induces its edges from the exits', () => {
  it('walks outward from its seed and keeps every admitting edge', async () => {
    const c = corridor(5);
    installRooms(c.rooms);
    installRows([{ key: 'road', mode: 'walk', seeds: ['/test/road/0'] }]);

    const lane = (await catalogue().laneOf('road'))!;
    expect(lane.nodes.sort()).toEqual([...c.paths].sort());
    // Both ways: the corridor is wired in both directions.
    expect(lane.adjacency.get('/test/road/2')!.sort()).toEqual([
      '/test/road/1',
      '/test/road/3',
    ]);
  });

  it('⭐ a wheeled lane STOPS at an exit that refuses wheels', async () => {
    // The pass, in miniature: leg 2→3 admits walking and refuses wheels.
    const c = corridor(5, { wheelsRefusedAt: 2 });
    installRooms(c.rooms);
    installRows([
      { key: 'road', mode: 'walk', seeds: ['/test/road/0'] },
      { key: 'wagon-road', mode: 'wheeled', seeds: ['/test/road/0'] },
    ]);
    const cat = catalogue();

    // On foot the whole corridor is one piece…
    expect((await cat.laneOf('road'))!.nodes).toHaveLength(5);
    // …and the wagon's world is smaller, because of ONE BIT ON ONE EXIT.
    const wheeled = (await cat.laneOf('wagon-road'))!;
    expect(wheeled.nodes.sort()).toEqual([
      '/test/road/0',
      '/test/road/1',
      '/test/road/2',
    ]);
    // Which is the whole economic point: bulk has to break here.
    expect(await cat.planRoute('/test/road/0', '/test/road/4', 'wagon-road'))
      .toBeNull();
    expect(await cat.planRoute('/test/road/0', '/test/road/4', 'road'))
      .not.toBeNull();
  });

  it('a lane whose mode no exit admits compiles empty, and says so', async () => {
    const c = corridor(3, { media: ['ground'] });
    installRooms(c.rooms);
    installRows([{ key: 'river', mode: 'sailed', seeds: ['/test/road/0'] }]);
    const cat = catalogue();
    // The seed is on the lane (it was walked to) but nothing leads on.
    expect((await cat.laneOf('river'))!.nodes).toEqual(['/test/road/0']);
  });

  it('a water lane runs where the exits are water', async () => {
    const c = corridor(4, { media: ['water'] });
    installRooms(c.rooms);
    installRows([{ key: 'river', mode: 'sailed', seeds: ['/test/road/0'] }]);
    expect((await catalogue().laneOf('river'))!.nodes).toHaveLength(4);
  });

  it('⭐ an AUTHORED-edge lane needs no exits at all (the RAIL proof)', async () => {
    // No rooms, no exits, no seeds — the edges ARE the authoring. This is
    // what "rail is a data addition" means: a realm ships rows, not code.
    // ⚠ The shipped example is the Ferrow tramway. It used to be the
    // `tpa` lane, which was deleted: the Authority's terminals already
    // ARE its graph (`routes:`, with fares), so the lane restated the
    // same legs at a different granularity in another pack, and NOTHING
    // read it — nobody could have noticed the two disagreeing.
    installRooms(new Map());
    installRows([
      {
        key: 'tram',
        mode: '',
        edges: [
          { from: '/test/terminal/a', to: '/test/terminal/b' },
          { from: '/test/terminal/b', to: '/test/terminal/c' },
        ],
      },
    ]);
    const lane = (await catalogue().laneOf('tram'))!;
    expect(lane.authored).toBe(true);
    expect(lane.nodes.sort()).toEqual([
      '/test/terminal/a',
      '/test/terminal/b',
      '/test/terminal/c',
    ]);
    const route = await catalogue().planRoute(
      '/test/terminal/a',
      '/test/terminal/c',
      'tram',
    );
    expect(route!.nodes).toHaveLength(3);
  });

  it('an inducing lane with no seed is a reported PROBLEM, not a silent empty', async () => {
    installRooms(new Map());
    installRows([{ key: 'nowhere', mode: 'walk' }]);
    const problems = await catalogue().problems();
    expect(problems.join(' ')).toMatch(/names no seed/);
  });

  it('⚠ the operator may be nobody, or an institution — never a player', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installRows([
      { key: 'highway', mode: 'walk', seeds: ['/test/road/0'], operator: null },
      {
        key: 'toll',
        mode: 'walk',
        seeds: ['/test/road/0'],
        operator: '/trade/haulage/idea/carrier-business',
      },
    ]);
    const cat = catalogue();
    expect((await cat.laneOf('highway'))!.operator).toBeNull();
    expect((await cat.laneOf('toll'))!.operator).toBe(
      '/trade/haulage/idea/carrier-business',
    );
    // The two lanes are otherwise the SAME SHAPE — which is the
    // constraint: a corpo-run or authority-run lane must not be a
    // special case.
    expect((await cat.laneOf('toll'))!.nodes).toEqual(
      (await cat.laneOf('highway'))!.nodes,
    );
  });

  it('two lanes may share an edge — the towpath is walked AND barged', async () => {
    const c = corridor(3, { media: ['ground', 'water'] });
    installRooms(c.rooms);
    installRows([
      { key: 'towpath', mode: 'walk', seeds: ['/test/road/0'] },
      { key: 'reach', mode: 'sailed', seeds: ['/test/road/0'] },
    ]);
    const cat = catalogue();
    expect((await cat.laneOf('towpath'))!.nodes).toHaveLength(3);
    expect((await cat.laneOf('reach'))!.nodes).toHaveLength(3);
    // …which is exactly why the duration lives on the EDGE and not here.
  });

  it('a blocked exit is off every lane', async () => {
    const c = corridor(4);
    c.exits.get('/test/road/1→/test/road/2')!.setBlocked(true);
    installRooms(c.rooms);
    installRows([{ key: 'road', mode: 'walk', seeds: ['/test/road/0'] }]);
    const lane = (await catalogue().laneOf('road'))!;
    expect(lane.adjacency.get('/test/road/1')).not.toContain('/test/road/2');
  });

  it('lanesAt answers "what ways touch here" — the depot read', async () => {
    const c = corridor(3);
    installRooms(c.rooms);
    installRows([
      { key: 'road', mode: 'walk', seeds: ['/test/road/0'] },
      { key: 'elsewhere', mode: 'walk', edges: [{ from: '/test/far/a', to: '/test/far/b' }] },
    ]);
    const at = await catalogue().lanesAt('/test/road/1');
    expect(at.map((l) => l.key)).toEqual(['road']);
  });
});
