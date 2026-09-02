/**
 * WatercourseCatalogue (watershed W3) — **topology authored, direction
 * derived**.
 *
 * The claims:
 *
 *  - an author declares nodes and control-point elevations, never an
 *    arrow, and upstream/downstream agrees with the heights;
 *  - a mouth above its source **fails at parse**, naming the offending
 *    control points;
 *  - unauthored nodes **interpolate**, which is what makes an uphill
 *    reach unrepresentable rather than merely illegal;
 *  - a lake is one node; a terminus has nothing downstream;
 *  - **a distributary and a tributary use one structure**, told apart by
 *    elevation alone;
 *  - two courses in different basins resolve **`unrelated`**, which is a
 *    different answer from `downstream`.
 *
 * See docs/subsystems/watershed.md.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PersistApi } from '@saxonberg/server/mud/api/persist';
import { Collections } from '@saxonberg/server/mud/lib/persistence/Collections';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WatercourseCatalogue from '../idea/WatercourseCatalogue';
import type { WatercourseNode } from '../idea/Watercourse';

interface CourseSpec {
  key: string;
  basin: string;
  nodes: WatercourseNode[];
  branchesFrom?: string;
}

/**
 * Serve the authored rows `Template.findDescendants` will ask for.
 *
 * The seam is `PersistApi.find` rather than the `PersistenceManager`
 * the kernel's own suites mock: a pack imports the kernel only through
 * the server's `exports` map, and `backend/` is deliberately not in it.
 * The Api face is the pack's whole view of persistence, so it is also
 * the only honest place for a pack test to intercept.
 */
function installCourses(specs: CourseSpec[]): void {
  const store = specs.map((spec, i) => ({
    _id: String(i + 1),
    path: `/stuff/idea/Watercourse/${spec.key}`,
    class: '/water/idea/Watercourse',
    data: {
      key: spec.key,
      name: spec.key,
      basin: spec.basin,
      nodes: spec.nodes,
      branchesFrom: spec.branchesFrom ?? null,
    },
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
}

const catalogue = (): WatercourseCatalogue =>
  makeStuff(() => new WatercourseCatalogue()) as WatercourseCatalogue;

/** The Kestrel: a trunk running 1200 m down to the sea in five reaches. */
const KESTREL: CourseSpec = {
  key: 'kestrel',
  basin: 'kestrel',
  nodes: [
    { name: 'headwaters', elevation: 1200 },
    { name: 'gorge' },
    { name: 'falls', elevation: 400 },
    { name: 'confluence', elevation: 40 },
    { name: 'estuary', elevation: 0, channelWidthM: 90 },
  ],
};

beforeEach(() => {
  StuffApi.clearAll();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a watercourse compiles into reaches', () => {
  it('every authored node becomes a reach, cited by NAME', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    const reaches = await c.reachesOf('kestrel');
    expect(reaches.map((r) => r.ref)).toEqual([
      'kestrel:headwaters',
      'kestrel:gorge',
      'kestrel:falls',
      'kestrel:confluence',
      'kestrel:estuary',
    ]);
    expect((await c.reachOf('kestrel:falls'))!.elevation).toBe(400);
    expect(await c.reachOf('kestrel:nowhere')).toBeNull();
  });

  it('a node between two control points INTERPOLATES its height', async () => {
    installCourses([KESTREL]);
    // `gorge` sits one of two steps between 1200 m and 400 m.
    expect((await catalogue().reachOf('kestrel:gorge'))!.elevation).toBe(800);
  });

  it('upstream/downstream agrees with the elevations, with no arrow authored', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    const head = (await c.reachOf('kestrel:headwaters'))!;
    const mouth = (await c.reachOf('kestrel:estuary'))!;
    expect(head.elevation).toBeGreaterThan(mouth.elevation);
    expect(await c.compare('kestrel:headwaters', 'kestrel:estuary')).toBe(
      'upstream',
    );
    expect(await c.compare('kestrel:estuary', 'kestrel:headwaters')).toBe(
      'downstream',
    );
    expect(await c.compare('kestrel:falls', 'kestrel:falls')).toBe('same');
  });

  it('a terminus has nothing downstream; a source has nothing upstream', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    expect(await c.downstreamOf('kestrel:estuary')).toEqual([]);
    expect(await c.successorsOf('kestrel:estuary')).toEqual([]);
    expect(await c.downstreamOf('kestrel:headwaters')).toHaveLength(4);
  });

  it('a LAKE is one node — its own source and its own mouth', async () => {
    installCourses([
      { key: 'mirror', basin: 'mirror', nodes: [{ name: 'lake', elevation: 700 }] },
    ]);
    const c = catalogue();
    expect((await c.reachesOf('mirror'))).toHaveLength(1);
    expect(await c.downstreamOf('mirror:lake')).toEqual([]);
  });

  it('hops downstream is a monotone distance, and null the other way', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    expect(await c.hopsDownstream('kestrel:headwaters', 'kestrel:falls')).toBe(2);
    expect(await c.hopsDownstream('kestrel:falls', 'kestrel:estuary')).toBe(2);
    expect(await c.hopsDownstream('kestrel:estuary', 'kestrel:falls')).toBeNull();
  });
});

describe('⭐ one `branchesFrom` structure, two behaviours, told apart by height', () => {
  it('a TRIBUTARY joins: its whole length is upstream of the junction', async () => {
    installCourses([
      KESTREL,
      {
        key: 'delight',
        basin: 'kestrel',
        branchesFrom: 'kestrel:confluence',
        nodes: [
          { name: 'spring', elevation: 600 },
          { name: 'flats', elevation: 120 },
          { name: 'mouth', elevation: 45 },
        ],
      },
    ]);
    const c = catalogue();
    // The tributary's MOUTH is the end nearest the junction's 40 m.
    expect(await c.compare('delight:mouth', 'kestrel:confluence')).toBe('upstream');
    expect(await c.compare('delight:spring', 'kestrel:estuary')).toBe('upstream');
    // …and the junction is downstream of every one of its reaches.
    expect(await c.compare('kestrel:confluence', 'delight:flats')).toBe('downstream');
  });

  it('a DISTRIBUTARY leaves: its whole length is DOWNSTREAM of the junction', async () => {
    installCourses([
      KESTREL,
      {
        key: 'sidearm',
        basin: 'kestrel',
        branchesFrom: 'kestrel:confluence',
        nodes: [
          // Its SOURCE, not its mouth, is the end at the junction's height.
          { name: 'head', elevation: 38 },
          { name: 'marsh', elevation: 10 },
          { name: 'outlet', elevation: 0 },
        ],
      },
    ]);
    const c = catalogue();
    expect(await c.compare('kestrel:confluence', 'sidearm:head')).toBe('upstream');
    expect(await c.compare('sidearm:outlet', 'kestrel:confluence')).toBe('downstream');
    // The delta gives the junction TWO immediate downstreams — which is
    // why the compile keeps a reachability SET and not a tree label.
    expect((await c.successorsOf('kestrel:confluence')).sort()).toEqual([
      'kestrel:estuary',
      'sidearm:head',
    ]);
  });

  it('sibling tributaries are UNRELATED to each other, not downstream', async () => {
    installCourses([
      KESTREL,
      {
        key: 'east',
        basin: 'kestrel',
        branchesFrom: 'kestrel:confluence',
        nodes: [{ name: 'spring', elevation: 500 }, { name: 'mouth', elevation: 45 }],
      },
      {
        key: 'west',
        basin: 'kestrel',
        branchesFrom: 'kestrel:confluence',
        nodes: [{ name: 'spring', elevation: 520 }, { name: 'mouth', elevation: 44 }],
      },
    ]);
    const c = catalogue();
    expect(await c.compare('east:spring', 'west:spring')).toBe('unrelated');
    // …but both are upstream of what they share.
    expect(await c.compare('east:spring', 'kestrel:estuary')).toBe('upstream');
    expect(await c.compare('west:spring', 'kestrel:estuary')).toBe('upstream');
  });
});

describe('two basins resolve NO relation (D18 acceptance)', () => {
  it('reaches in different drainages are `unrelated` in both directions', async () => {
    installCourses([
      KESTREL,
      {
        key: 'holloway',
        basin: 'holloway',
        nodes: [{ name: 'head', elevation: 900 }, { name: 'mouth', elevation: 0 }],
      },
    ]);
    const c = catalogue();
    expect(await c.compare('kestrel:headwaters', 'holloway:mouth')).toBe('unrelated');
    expect(await c.compare('holloway:head', 'kestrel:estuary')).toBe('unrelated');
  });

  it('a citation naming no reach is `unrelated`, never `downstream`', async () => {
    installCourses([KESTREL]);
    expect(await catalogue().compare('kestrel:falls', 'nope:nope')).toBe('unrelated');
  });
});

describe('⚠ the parse refuses a world water cannot run downhill in', () => {
  const failsWith = async (
    specs: CourseSpec[],
    fragment: string,
  ): Promise<void> => {
    installCourses(specs);
    await expect(catalogue().allReaches()).rejects.toThrow(fragment);
  };

  it('a mouth above its source fails, NAMING both control points', async () => {
    await failsWith(
      [
        {
          key: 'wrong',
          basin: 'wrong',
          nodes: [
            { name: 'source', elevation: 10 },
            { name: 'mouth', elevation: 900 },
          ],
        },
      ],
      "its mouth 'mouth' (900 m) is ABOVE its source 'source' (10 m)",
    );
  });

  it('an interior control point above the one upstream of it fails, named', async () => {
    await failsWith(
      [
        {
          key: 'bump',
          basin: 'bump',
          nodes: [
            { name: 'source', elevation: 500 },
            { name: 'hump', elevation: 800 },
            { name: 'mouth', elevation: 0 },
          ],
        },
      ],
      "control point 'hump' (800 m) is above 'source' (500 m)",
    );
  });

  it('a source with no authored elevation fails — it is a control point by definition', async () => {
    await failsWith(
      [
        {
          key: 'vague',
          basin: 'vague',
          nodes: [{ name: 'source' }, { name: 'mouth', elevation: 0 }],
        },
      ],
      "its source 'source' authors no elevation",
    );
  });

  it('a branch into another basin fails — a branch and its parent are one drainage', async () => {
    await failsWith(
      [
        KESTREL,
        {
          key: 'stray',
          basin: 'holloway',
          branchesFrom: 'kestrel:confluence',
          nodes: [{ name: 'a', elevation: 300 }, { name: 'b', elevation: 50 }],
        },
      ],
      'the same drainage by definition',
    );
  });

  it('a branch from a reach that does not exist fails, naming the citation', async () => {
    await failsWith(
      [
        KESTREL,
        {
          key: 'orphan',
          basin: 'kestrel',
          branchesFrom: 'kestrel:imaginary',
          nodes: [{ name: 'a', elevation: 300 }, { name: 'b', elevation: 50 }],
        },
      ],
      "branches from 'kestrel:imaginary', which names no reach",
    );
  });

  it('a course with no basin fails — unrelated-to-everything is never what was meant', async () => {
    await failsWith(
      [{ key: 'nowhere', basin: '', nodes: [{ name: 'a', elevation: 5 }] }],
      'declares no basin',
    );
  });

  it('two courses claiming one key fail — a reach citation must be unambiguous', async () => {
    await failsWith(
      [
        KESTREL,
        { key: 'kestrel', basin: 'kestrel', nodes: [{ name: 'x', elevation: 3 }] },
      ],
      "two watercourses claim the key 'kestrel'",
    );
  });

  it('a failed parse does not STICK — the next read retries and re-reports', async () => {
    installCourses([
      { key: 'bad', basin: 'bad', nodes: [{ name: 'a' }, { name: 'b', elevation: 0 }] },
    ]);
    const c = catalogue();
    await expect(c.allReaches()).rejects.toThrow('authors no elevation');
    await expect(c.allReaches()).rejects.toThrow('authors no elevation');
  });
});

describe('the catalogue is lazy, never warmed', () => {
  it('the FIRST read loads it — there is no warm step to forget', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    expect(await c.allReaches()).toHaveLength(5);
  });

  it('invalidateCache drops the compile; the next read rebuilds from content', async () => {
    installCourses([KESTREL]);
    const c = catalogue();
    expect(await c.allReaches()).toHaveLength(5);
    installCourses([
      KESTREL,
      { key: 'mirror', basin: 'mirror', nodes: [{ name: 'lake', elevation: 700 }] },
    ]);
    expect(await c.allReaches()).toHaveLength(5); // still cached
    c.invalidateCache();
    expect(await c.allReaches()).toHaveLength(6);
  });
});
