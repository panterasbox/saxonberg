/**
 * check-biome's pure decision core over synthetic trees, plus a sanity
 * read of the real class facts (a gate whose predicates answer `no` to
 * everything passes everything).
 */

import { describe, it, expect } from 'vitest';
import {
  biomeFindings,
  diskFacts,
  ROOT_BIOME_PATH,
  type BiomeClassFacts,
  type BiomeGateRow,
} from '../check-biome';
import { packSources } from '../pack-roots';

const BIOME = '/platform/idea/Biome';
const SKY = '/platform/idea/SkyExposedBiome';
const FOLDER = '/platform/idea/FolderZone';
const ROOM = '/platform/location/CartesianLocation';

const facts: BiomeClassFacts = {
  isBiome: (c) => c === BIOME || c === SKY,
  isSkyExposed: (c) => c === SKY,
  loads: (c) => c !== '/platform/idea/Missing',
};

const root: BiomeGateRow = {
  path: ROOT_BIOME_PATH,
  file: 'universe.yaml',
  class: BIOME,
  extends: null,
  data: {
    _defaultTemperature: 295,
    _defaultPressure: 101325,
    _defaultHumidity: 50,
    _defaultWind: 0,
    _defaultGravity: 9.81,
    _defaultAtmosphere: 'air',
  },
};

const row = (path: string, over: Partial<BiomeGateRow>): BiomeGateRow => ({
  path,
  file: `${path}.yaml`,
  class: BIOME,
  extends: ROOT_BIOME_PATH,
  data: {},
  ...over,
});

function tree(...rows: BiomeGateRow[]): Map<string, BiomeGateRow> {
  return new Map([root, ...rows].map((r) => [r.path, r]));
}

describe('check-biome', () => {
  it('a clean tree passes', () => {
    const t = tree(
      row('/b/outdoor', { class: SKY }),
      row('/w/room', { class: ROOM, extends: null, data: { _biomePath: '/b/outdoor' } }),
    );
    const { failures, citations } = biomeFindings(t, facts);
    expect(failures).toEqual([]);
    expect(citations).toBe(1);
  });

  it('(a) a citation to no row fails, and to a non-biome row fails', () => {
    const t = tree(
      row('/b/folder', { class: FOLDER, extends: null }),
      row('/w/a', { class: ROOM, extends: null, data: { _biomePath: '/b/nowhere' } }),
      row('/w/b', { class: ROOM, extends: null, data: { _biomePath: '/b/folder' } }),
    );
    const { failures } = biomeFindings(t, facts);
    expect(failures.some((f) => f.includes("'/b/nowhere', which is no row"))).toBe(true);
    expect(failures.some((f) => f.includes("'/b/folder'") && f.includes('not a Biome'))).toBe(true);
  });

  it('(b) a chain that stops short, names a ghost, or cycles fails', () => {
    const t = tree(
      row('/b/orphan', { extends: null }),
      row('/b/ghost', { extends: '/b/missing' }),
      row('/b/x', { extends: '/b/y' }),
      row('/b/y', { extends: '/b/x' }),
    );
    const { failures } = biomeFindings(t, facts);
    expect(failures.some((f) => f.includes('/b/orphan') && f.includes('not the root'))).toBe(true);
    expect(failures.some((f) => f.includes("'/b/missing', which is no row"))).toBe(true);
    expect(failures.some((f) => f.includes('cycles'))).toBe(true);
  });

  it('(c) a root missing a mandatory field fails', () => {
    const bare = { ...root, data: { ...root.data } };
    delete (bare.data as Record<string, unknown>)._defaultWind;
    const { failures } = biomeFindings(new Map([[bare.path, bare]]), facts);
    expect(failures.some((f) => f.includes('_defaultWind'))).toBe(true);
  });

  it('(d) a sky biome authoring _defaultTemperature fails; an indoor or rock one does not', () => {
    const t = tree(
      row('/b/hot', { class: SKY, data: { _defaultTemperature: 300 } }),
      row('/b/rock', { class: BIOME, data: { _defaultTemperature: 285 } }),
    );
    const { failures } = biomeFindings(t, facts);
    expect(failures.filter((f) => f.includes('_defaultTemperature'))).toHaveLength(1);
    expect(failures[0]).toContain('/b/hot');
  });

  it('(e) a biome row whose class does not load fails', () => {
    const t = tree(row('/b/ghostclass', { class: '/platform/idea/Missing' }));
    // The stub's isBiome says no to an unknown class; a real class that
    // fails to load still extends Biome on paper, so model that case.
    const f2: BiomeClassFacts = { ...facts, isBiome: (c) => facts.isBiome(c) || c === '/platform/idea/Missing' };
    const { failures } = biomeFindings(t, f2);
    expect(failures.some((f) => f.includes('does not resolve'))).toBe(true);
  });

  it('the real class facts recognise the shipped biome classes', () => {
    const real = diskFacts(packSources());
    expect(real.isBiome(BIOME)).toBe(true);
    expect(real.isBiome(SKY)).toBe(true);
    expect(real.isSkyExposed(SKY)).toBe(true);
    expect(real.isSkyExposed(BIOME)).toBe(false);
    expect(real.isBiome(FOLDER)).toBe(false);
    expect(real.loads(BIOME)).toBe(true);
  });
});
