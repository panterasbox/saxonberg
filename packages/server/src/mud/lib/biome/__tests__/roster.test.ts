/**
 * Roster test — confirms the 39-leaf biome inventory matches the
 * slate roster. Walks the seed directory and asserts each path
 * exists.
 *
 * This test reads YAML files directly off disk; it doesn't boot the
 * SeederManager. The structural roster is the source of truth for
 * "what content shipped"; runtime behavior of the templates lives
 * in other tests.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const SEEDS_DIR = join(
  dirname(__filename),
  '../../../seeds/lib/biome',
);

const OUTDOOR_TEMPERATE = [
  'quad',
  'path',
  'garden',
  'athletic-field',
  'courtyard',
  'street',
  'alley',
  'plaza',
  'riverbank',
  'forest-deciduous',
  'forest-coniferous',
  'meadow',
  'wetland',
  'lakeshore',
  'highland',
];
const UNDERGROUND = ['tunnel', 'sewer', 'cave'];
const INDOOR_ACADEMIC = [
  'lecture-hall',
  'classroom',
  'wet-lab',
  'dry-lab',
  'library-stacks',
  'library-reading-room',
  'faculty-office',
];
const INDOOR_RESIDENTIAL = ['dorm-room', 'common-room', 'townhouse'];
const INDOOR_SOCIAL = ['cafeteria'];
const INDOOR_CIVIC = ['shop', 'tavern', 'inn', 'workshop'];
const INDOOR_SPECIAL = [
  'observatory-dome',
  'gymnasium',
  'theater',
  'art-studio',
  'chapel',
  'archive',
];

interface BiomeSeed {
  class: string;
  data?: Record<string, unknown>;
}

function loadSeed(relative: string): BiomeSeed {
  const path = join(SEEDS_DIR, relative);
  expect(existsSync(path), `seed missing: ${relative}`).toBe(true);
  return YAML.parse(readFileSync(path, 'utf-8')) as BiomeSeed;
}

describe('Biome roster — v1 leaf seeds', () => {
  it('outdoor/temperate has 15 leaves, all SkyExposedBiome', () => {
    expect(OUTDOOR_TEMPERATE.length).toBe(15);
    for (const leaf of OUTDOOR_TEMPERATE) {
      const seed = loadSeed(`outdoor/temperate/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    }
  });

  it('underground has 3 leaves, all plain Biome (not sky-exposed)', () => {
    expect(UNDERGROUND.length).toBe(3);
    for (const leaf of UNDERGROUND) {
      const seed = loadSeed(`underground/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
    }
  });

  it('indoor/academic has 7 leaves, all plain Biome', () => {
    expect(INDOOR_ACADEMIC.length).toBe(7);
    for (const leaf of INDOOR_ACADEMIC) {
      const seed = loadSeed(`indoor/academic/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
    }
  });

  it('indoor/residential has 3 leaves, all plain Biome', () => {
    expect(INDOOR_RESIDENTIAL.length).toBe(3);
    for (const leaf of INDOOR_RESIDENTIAL) {
      const seed = loadSeed(`indoor/residential/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
    }
  });

  it('indoor/social has 1 leaf, plain Biome', () => {
    expect(INDOOR_SOCIAL.length).toBe(1);
    for (const leaf of INDOOR_SOCIAL) {
      const seed = loadSeed(`indoor/social/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
    }
  });

  it('indoor/civic has 4 leaves, all plain Biome', () => {
    expect(INDOOR_CIVIC.length).toBe(4);
    for (const leaf of INDOOR_CIVIC) {
      const seed = loadSeed(`indoor/civic/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
    }
  });

  it('indoor/special has 6 leaves — observatory-dome is SkyExposed', () => {
    expect(INDOOR_SPECIAL.length).toBe(6);
    for (const leaf of INDOOR_SPECIAL) {
      const seed = loadSeed(`indoor/special/${leaf}.yaml`);
      if (leaf === 'observatory-dome') {
        expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
      } else {
        expect(seed.class).toBe('/lib/biome/Biome');
      }
    }
  });

  it('total leaf count is 39', () => {
    const total =
      OUTDOOR_TEMPERATE.length +
      UNDERGROUND.length +
      INDOOR_ACADEMIC.length +
      INDOOR_RESIDENTIAL.length +
      INDOOR_SOCIAL.length +
      INDOOR_CIVIC.length +
      INDOOR_SPECIAL.length;
    expect(total).toBe(39);
  });

  it('root universe biome carries all five defaults', () => {
    const seed = YAML.parse(
      readFileSync(join(SEEDS_DIR, '../biome.yaml'), 'utf-8'),
    ) as BiomeSeed;
    expect(seed.class).toBe('/lib/biome/Biome');
    const d = seed.data ?? {};
    expect(d._defaultTemperature).toBeDefined();
    expect(d._defaultPressure).toBeDefined();
    expect(d._defaultHumidity).toBeDefined();
    expect(d._defaultGravity).toBeDefined();
    expect(d._defaultAtmosphere).toBe('air');
  });

  it('scenario C — atrium sub-biome of cafeteria is SkyExposed', () => {
    const seed = loadSeed('indoor/cafeteria/atrium.yaml');
    expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    const sibling = loadSeed('indoor/cafeteria.yaml');
    expect(sibling.class).toBe('/lib/biome/Biome');
  });
});
