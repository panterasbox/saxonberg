/**
 * GridCatalogue (energy B1) — ⭐ **the feeders compiled to a reachability set,
 * and the cut as the one state.**
 *
 * The claims:
 *  - a cut at the trunk darkens the trunk below it AND the spur that branches
 *    off below the cut; a cut on the spur darkens only the spur;
 *  - a node pair no exit joins is a compile problem and its downstream is
 *    unreachable (a line may not leave the road);
 *  - the source going down darkens everything (`dry`);
 *  - the cut survives an `invalidateCache` (only the compiled graph is dropped).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import GridCatalogue, { GRID_CATALOGUE_PATH } from '../idea/GridCatalogue';
import type { FeederDescriptor } from '../idea/Feeder';

// ── street paths ──
const S_BANK = '/world/t/bank';
const S_SQUARE = '/world/t/square';
const S_AVENUE = '/world/t/avenue';
const S_MAYFIELD = '/world/t/mayfield';
const S_ISLAND = '/world/t/island'; // reachable by no exit
const SOURCE = '/world/t/works';

/** Adjacency: which streets an exit joins (undirected here). */
const EXITS: Record<string, string[]> = {
  [S_BANK]: [S_SQUARE],
  [S_SQUARE]: [S_BANK, S_AVENUE],
  [S_AVENUE]: [S_SQUARE, S_MAYFIELD],
  [S_MAYFIELD]: [S_AVENUE],
  [S_ISLAND]: [], // deliberately unreachable
};

let generating = true;

/** A stub street exposing getExits() with getDestinationTemplatePath. */
function stubStreet(path: string): unknown {
  return {
    getExits: () =>
      new Map(
        (EXITS[path] ?? []).map((dest, i) => [
          String(i),
          { getDestinationTemplatePath: () => dest },
        ]),
      ),
  };
}

/** A stub source generator. */
const stubSource = { isGenerating: () => generating };

function installFeeders(specs: FeederDescriptor[]): void {
  const store = specs.map((spec, i) => ({
    _id: String(i + 1),
    path: `/stuff/idea/Feeder/${spec.key}`,
    class: '/system/energy/idea/Feeder',
    data: { ...spec },
  }));
  vi.spyOn(PersistApi, 'find').mockImplementation(
    async (collection: string, query: Record<string, unknown>) => {
      if (collection !== Collections.Content) return [];
      const q = query.path as { $regex?: string } | string | undefined;
      if (typeof q === 'object' && q !== null && typeof q.$regex === 'string') {
        const re = new RegExp(q.$regex);
        return store.filter((d) => re.test(d.path));
      }
      if (typeof q === 'string') return store.filter((d) => d.path === q);
      return store.slice();
    },
  );
  // Streets + the source resolve through StuffApi.singleton.
  vi.spyOn(StuffApi, 'singleton').mockImplementation((async (path: string) => {
    if (path === SOURCE) return stubSource as never;
    return stubStreet(path) as never;
  }) as unknown as typeof StuffApi.singleton);
}

const catalogue = (): GridCatalogue =>
  makeStuffAtPath(() => new GridCatalogue(), GRID_CATALOGUE_PATH) as GridCatalogue;

/** The Terminus main + a Mayfield spur — the shipped shape. */
function terminusGrid(): FeederDescriptor[] {
  return [
    {
      key: 'main',
      name: 'the main',
      source: SOURCE,
      branchesFrom: null,
      nodes: [
        { name: 'bank', at: S_BANK },
        { name: 'square', at: S_SQUARE },
        { name: 'avenue', at: S_AVENUE },
      ],
    },
    {
      key: 'spur',
      name: 'the spur',
      source: null,
      branchesFrom: 'main:avenue',
      nodes: [{ name: 'mayfield', at: S_MAYFIELD }],
    },
  ];
}

describe('the grid compiles and energizes', () => {
  beforeEach(() => {
    generating = true;
    StuffApi.clearAll();
    installFeeders(terminusGrid());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('every node on a live grid is energized', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK); // force the compile
    expect(cat.isStreetEnergizedSync(S_BANK)).toBe(true);
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(true);
    expect(cat.isStreetEnergizedSync(S_MAYFIELD)).toBe(true); // the spur
  });

  it('⭐ a cut at the trunk darkens below it AND the spur', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    cat.sever('main:square');

    expect(cat.isStreetEnergizedSync(S_BANK)).toBe(true); // above the cut
    expect(cat.isStreetEnergizedSync(S_SQUARE)).toBe(false); // the cut node
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(false); // downstream
    expect(cat.isStreetEnergizedSync(S_MAYFIELD)).toBe(false); // the spur, below the cut
  });

  it('⭐ a cut on the spur darkens only the spur', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    cat.sever('spur:mayfield');

    expect(cat.isStreetEnergizedSync(S_MAYFIELD)).toBe(false);
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(true);
    expect(cat.isStreetEnergizedSync(S_BANK)).toBe(true);
  });

  it('splice relights what a cut darkened', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    cat.sever('main:square');
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(false);
    cat.splice('main:square');
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(true);
  });

  it('the trace names the first cut back to the source', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    cat.sever('main:square');
    const trace = await cat.traceFrom('main:avenue');
    expect(trace.firstCut).toBe('main:square');
    expect(trace.source).toBe(SOURCE);
  });

  it('⚠ the source going down darkens everything (dry)', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    generating = false;
    expect(cat.isStreetEnergizedSync(S_BANK)).toBe(false);
    expect(await cat.supplyStateAt('main:bank')).toBe('dry');
  });

  it('⭐ the cut survives invalidateCache (only the graph is dropped)', async () => {
    const cat = catalogue();
    await cat.energizedAt(S_BANK);
    cat.sever('main:square');
    cat.invalidateCache();
    await cat.energizedAt(S_BANK); // recompile
    expect(cat.isStreetEnergizedSync(S_AVENUE)).toBe(false); // still cut
  });
});

describe('a line may not leave the road', () => {
  beforeEach(() => {
    generating = true;
    StuffApi.clearAll();
    // A feeder whose second node sits on an island no exit reaches.
    installFeeders([
      {
        key: 'main',
        name: 'the main',
        source: SOURCE,
        branchesFrom: null,
        nodes: [
          { name: 'bank', at: S_BANK },
          { name: 'island', at: S_ISLAND }, // no exit joins bank↔island
        ],
      },
    ]);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
  });

  it('⚠ a node pair no exit joins is unreachable (and a compile problem)', async () => {
    const cat = catalogue();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    await cat.energizedAt(S_BANK);
    expect(cat.isStreetEnergizedSync(S_BANK)).toBe(true); // the source node is fine
    expect(cat.isStreetEnergizedSync(S_ISLAND)).toBe(false); // no line reaches it
  });
});

describe('GridCatalogue — poweredTrajectory (the cut log)', () => {
  it('a severed-then-spliced node reads 1 · 0 · 1 across the outage', async () => {
    const { WorldClockApi } = await import('@saxonberg/server/mud/api/worldclock');
    const { TemplatePaths } = await import('@saxonberg/server/mud/lib/paths');
    await import('@saxonberg/server/mud/platform/idea/WorldClockRegistry');
    const WorldClockRegistry = (
      await import('@saxonberg/server/mud/platform/idea/WorldClockRegistry')
    ).default;
    WorldClockApi._resetForTesting();
    let nowMs = 1_000_000;
    WorldClockApi._setNowProviderForTesting(() => nowMs);
    if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
      makeStuffAtPath(
        () => new WorldClockRegistry(),
        TemplatePaths.worldClockRegistry,
      );
    }
    const gs = (): number => WorldClockApi.getNow().rawValue();
    const advanceGame = (g: number): void => {
      nowMs += (g / WorldClockApi.getScale()) * 1000;
    };

    const cat = makeStuffAtPath(
      () => new GridCatalogue(),
      GRID_CATALOGUE_PATH,
    ) as GridCatalogue;

    const start = gs();
    advanceGame(100);
    const cutAt = gs();
    cat.sever('n1'); // a direct cut on the node itself (affects it without a grid)
    advanceGame(200);
    const spliceAt = gs();
    cat.splice('n1');
    advanceGame(100);
    const end = gs();

    const pw = cat.poweredTrajectory('n1', start, end);
    // Powered before the cut, dark through the outage, powered after the splice.
    expect(pw.at(start + 50)).toBe(1);
    expect(pw.at((cutAt + spliceAt) / 2)).toBe(0);
    expect(pw.at(spliceAt + 50)).toBe(1);

    WorldClockApi._resetForTesting();
  });
});
