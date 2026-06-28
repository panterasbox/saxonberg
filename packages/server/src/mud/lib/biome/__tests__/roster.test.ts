/**
 * Roster test — confirms the slim demonstrative biome inventory.
 *
 * The seed roster is deliberately small (like Material's 10 leaves
 * or Species's 4 kingdom Clades + 4 leaves) — just enough to prove
 * out the substrate without committing to specific content
 * decisions that should be made by content teams later.
 *
 * Each shipped template earns its place by demonstrating a
 * substrate property:
 *
 *   /lib/biome/                        FolderZone     ← admin root
 *   /lib/biome/universe                Biome          ← inheritance root
 *   /lib/biome/outdoor/                FolderZone     ← admin sub-tree
 *   /lib/biome/outdoor/baseline        SkyExposedBiome
 *   /lib/biome/outdoor/meadow          SkyExposedBiome ← 3-deep chain
 *   /lib/biome/indoor/                 FolderZone
 *   /lib/biome/indoor/baseline         Biome
 *   /lib/biome/indoor/cafeteria        Biome
 *   /lib/biome/indoor/cafeteria-atrium SkyExposedBiome ← scenario C
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join, relative } from 'path';
import YAML from 'yaml';

const __filename = fileURLToPath(import.meta.url);
// The biome roster now ships in the base-library content pack (lifted out of
// `seeds/`). Resolve the pack root the same way the installer does, then read
// its `content/lib/biome` namespace mirror.
const PACK_ROOT = dirname(
  createRequire(import.meta.url).resolve(
    '@saxonberg/content-base-library/package.json',
  ),
);
const SEEDS_DIR = join(PACK_ROOT, 'content/lib/biome');

interface BiomeSeed {
  class: string;
  data?: Record<string, unknown>;
}

function loadSeed(relativePath: string): BiomeSeed {
  const path = join(SEEDS_DIR, relativePath);
  expect(existsSync(path), `seed missing: ${relativePath}`).toBe(true);
  return YAML.parse(readFileSync(path, 'utf-8')) as BiomeSeed;
}

function listYamlsRelative(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...listYamlsRelative(full));
    } else if (entry.endsWith('.yaml')) {
      out.push(relative(SEEDS_DIR, full));
    }
  }
  return out;
}

describe('Biome roster — slim demonstrative inventory', () => {
  it('the /lib/biome folder template is a FolderZone', () => {
    const seed = YAML.parse(
      readFileSync(join(SEEDS_DIR, '../biome.yaml'), 'utf-8'),
    ) as BiomeSeed;
    expect(seed.class).toBe('/lib/zone/FolderZone');
  });

  it('sub-folders for sub-team scoping are FolderZones', () => {
    for (const f of ['outdoor.yaml', 'indoor.yaml']) {
      expect(loadSeed(f).class).toBe('/lib/zone/FolderZone');
    }
  });

  it('universe is the inheritance root with all five defaults and no parent', () => {
    const seed = loadSeed('universe.yaml');
    expect(seed.class).toBe('/lib/biome/Biome');
    const d = seed.data ?? {};
    expect(d._extendsBiomePath).toBeUndefined();
    expect(d._defaultTemperature).toBeDefined();
    expect(d._defaultPressure).toBeDefined();
    expect(d._defaultHumidity).toBeDefined();
    expect(d._defaultGravity).toBeDefined();
    expect(d._defaultAtmosphere).toBe('air');
  });

  it('outdoor/baseline is SkyExposed and extends universe', () => {
    const seed = loadSeed('outdoor/baseline.yaml');
    expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    expect(seed.data?._extendsBiomePath).toBe('/lib/biome/universe');
  });

  it('outdoor/meadow is SkyExposed and extends outdoor/baseline (3-deep chain)', () => {
    const seed = loadSeed('outdoor/meadow.yaml');
    expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    expect(seed.data?._extendsBiomePath).toBe('/lib/biome/outdoor/baseline');
  });

  it('indoor/baseline is plain Biome and extends universe', () => {
    const seed = loadSeed('indoor/baseline.yaml');
    expect(seed.class).toBe('/lib/biome/Biome');
    expect(seed.data?._extendsBiomePath).toBe('/lib/biome/universe');
  });

  it('indoor/cafeteria extends indoor/baseline', () => {
    const seed = loadSeed('indoor/cafeteria.yaml');
    expect(seed.class).toBe('/lib/biome/Biome');
    expect(seed.data?._extendsBiomePath).toBe('/lib/biome/indoor/baseline');
  });

  it('scenario C — cafeteria-atrium is SkyExposed and explicitly extends cafeteria', () => {
    const seed = loadSeed('indoor/cafeteria-atrium.yaml');
    expect(seed.class).toBe('/lib/biome/SkyExposedBiome');
    expect(seed.data?._extendsBiomePath).toBe('/lib/biome/indoor/cafeteria');
  });

  it('no other biome seeds have crept in (slim roster discipline)', () => {
    // Anchors the roster shape so future authors don't accidentally
    // poison the demonstrative set. Materials / Species follow the
    // same pattern: a curated handful of leaves that prove out the
    // substrate, not a content roster.
    const expected = new Set([
      'universe.yaml',
      'outdoor.yaml',
      'outdoor/baseline.yaml',
      'outdoor/meadow.yaml',
      'indoor.yaml',
      'indoor/baseline.yaml',
      'indoor/cafeteria.yaml',
      'indoor/cafeteria-atrium.yaml',
    ]);
    const actual = new Set(
      listYamlsRelative(SEEDS_DIR).map((p) => p.split('/').join('/')),
    );
    expect(actual).toEqual(expected);
  });
});
