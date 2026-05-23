/**
 * Roster test — confirms the 39-leaf biome inventory matches the
 * slate roster. Walks the seed directory and asserts each path
 * exists.
 *
 * Post-refactor structure:
 *   - tier paths (`/lib/biome/`, `/lib/biome/outdoor/`, etc.) are
 *     `FolderZone` templates (admin/ownership scoping).
 *   - the root universe biome lives at `/lib/biome/universe`.
 *   - each tier has a `baseline.yaml` Biome leaf that descendant
 *     biomes extend via `_extendsBiomePath`.
 *   - the 39 content leaves declare `_extendsBiomePath` pointing
 *     at the appropriate tier baseline.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const SEEDS_DIR = join(dirname(__filename), '../../../seeds/lib/biome');

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

describe('Biome roster — admin tree (FolderZones)', () => {
  it('all tier folders are FolderZones', () => {
    const folders = [
      'outdoor.yaml',
      'outdoor/temperate.yaml',
      'underground.yaml',
      'indoor.yaml',
      'indoor/academic.yaml',
      'indoor/residential.yaml',
      'indoor/social.yaml',
      'indoor/civic.yaml',
      'indoor/special.yaml',
    ];
    for (const f of folders) {
      expect(loadSeed(f).class).toBe('/lib/zone/FolderZone');
    }
  });

  it('the /lib/biome folder itself is a FolderZone', () => {
    const seed = YAML.parse(
      readFileSync(join(SEEDS_DIR, '../biome.yaml'), 'utf-8'),
    ) as BiomeSeed;
    expect(seed.class).toBe('/lib/zone/FolderZone');
  });
});

describe('Biome roster — inheritance baselines', () => {
  it('universe is the root biome and has no _extendsBiomePath', () => {
    const seed = loadSeed('universe.yaml');
    expect(seed.class).toBe('/lib/biome/Biome');
    expect(seed.data?._extendsBiomePath).toBeUndefined();
  });

  it('each tier baseline extends an appropriate parent', () => {
    const baselines: Array<{ path: string; extends: string }> = [
      {
        path: 'outdoor/baseline.yaml',
        extends: '/lib/biome/universe',
      },
      {
        path: 'outdoor/temperate/baseline.yaml',
        extends: '/lib/biome/outdoor/baseline',
      },
      {
        path: 'underground/baseline.yaml',
        extends: '/lib/biome/universe',
      },
      {
        path: 'indoor/baseline.yaml',
        extends: '/lib/biome/universe',
      },
      {
        path: 'indoor/academic/baseline.yaml',
        extends: '/lib/biome/indoor/baseline',
      },
      {
        path: 'indoor/residential/baseline.yaml',
        extends: '/lib/biome/indoor/baseline',
      },
      {
        path: 'indoor/social/baseline.yaml',
        extends: '/lib/biome/indoor/baseline',
      },
      {
        path: 'indoor/civic/baseline.yaml',
        extends: '/lib/biome/indoor/baseline',
      },
      {
        path: 'indoor/special/baseline.yaml',
        extends: '/lib/biome/indoor/baseline',
      },
    ];
    for (const { path, extends: parent } of baselines) {
      const seed = loadSeed(path);
      expect(seed.data?._extendsBiomePath, path).toBe(parent);
    }
  });
});

describe('Biome roster — 39 leaves', () => {
  it('outdoor/temperate has 15 leaves, all SkyExposedBiome extending temperate baseline', () => {
    expect(OUTDOOR_TEMPERATE.length).toBe(15);
    for (const leaf of OUTDOOR_TEMPERATE) {
      const seed = loadSeed(`outdoor/temperate/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/outdoor/temperate/baseline',
      );
    }
  });

  it('underground has 3 leaves, all plain Biome extending underground baseline', () => {
    expect(UNDERGROUND.length).toBe(3);
    for (const leaf of UNDERGROUND) {
      const seed = loadSeed(`underground/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/underground/baseline',
      );
    }
  });

  it('indoor/academic has 7 leaves extending academic baseline', () => {
    expect(INDOOR_ACADEMIC.length).toBe(7);
    for (const leaf of INDOOR_ACADEMIC) {
      const seed = loadSeed(`indoor/academic/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/indoor/academic/baseline',
      );
    }
  });

  it('indoor/residential has 3 leaves extending residential baseline', () => {
    expect(INDOOR_RESIDENTIAL.length).toBe(3);
    for (const leaf of INDOOR_RESIDENTIAL) {
      const seed = loadSeed(`indoor/residential/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/indoor/residential/baseline',
      );
    }
  });

  it('indoor/social has 1 leaf extending social baseline', () => {
    expect(INDOOR_SOCIAL.length).toBe(1);
    for (const leaf of INDOOR_SOCIAL) {
      const seed = loadSeed(`indoor/social/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/indoor/social/baseline',
      );
    }
  });

  it('indoor/civic has 4 leaves extending civic baseline', () => {
    expect(INDOOR_CIVIC.length).toBe(4);
    for (const leaf of INDOOR_CIVIC) {
      const seed = loadSeed(`indoor/civic/${leaf}.yaml`);
      expect(seed.class).toBe('/lib/biome/Biome');
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/indoor/civic/baseline',
      );
    }
  });

  it('indoor/special has 6 leaves — observatory-dome is SkyExposed', () => {
    expect(INDOOR_SPECIAL.length).toBe(6);
    for (const leaf of INDOOR_SPECIAL) {
      const seed = loadSeed(`indoor/special/${leaf}.yaml`);
      const expectedClass =
        leaf === 'observatory-dome'
          ? '/lib/biome/SkyExposedBiome'
          : '/lib/biome/Biome';
      expect(seed.class).toBe(expectedClass);
      expect(seed.data?._extendsBiomePath).toBe(
        '/lib/biome/indoor/special/baseline',
      );
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
    const seed = loadSeed('universe.yaml');
    const d = seed.data ?? {};
    expect(d._defaultTemperature).toBeDefined();
    expect(d._defaultPressure).toBeDefined();
    expect(d._defaultHumidity).toBeDefined();
    expect(d._defaultGravity).toBeDefined();
    expect(d._defaultAtmosphere).toBe('air');
  });

  it('scenario C — atrium sibling biome explicitly extends cafeteria', () => {
    const seed = loadSeed('indoor/social/cafeteria-atrium.yaml');
    expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    expect(seed.data?._extendsBiomePath).toBe(
      '/lib/biome/indoor/social/cafeteria',
    );
  });
});
