/**
 * Content-integrity tests for the Weeping Moor seeds — the pure-YAML
 * save-gate-parity discipline (the substation-content precedent). Catches a
 * typo'd `adornments:` path, a malformed weather pin, or a missing biome ref
 * here, not silently at standup. Proves the demonstrator is authored
 * declaratively — the pins are data fields, never imperative construction.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const SEEDS = fileURLToPath(new URL('../../../../../../content/world-seed/content/', import.meta.url));
const PACK = fileURLToPath(
  new URL('../../../../../../content/base-library/content/', import.meta.url),
);

interface Seed {
  class?: string;
  data?: Record<string, unknown>;
}

function seed(templatePath: string): Seed {
  return YAML.parse(readFileSync(`${SEEDS}${templatePath}.yaml`, 'utf8')) as Seed;
}
function templateExists(path: string): boolean {
  return existsSync(`${SEEDS}${path}.yaml`) || existsSync(`${PACK}${path}.yaml`);
}

describe('The Weeping Moor — content integrity', () => {
  it('the zone is a CartesianZone', () => {
    expect(seed('world/moor').class).toBe('/platform/idea/location/CartesianZone');
  });

  it('the Locality carries an alive storm pin over the `moor` prefix', () => {
    const loc = seed('stuff/idea/Locality/moor');
    expect(loc.class).toBe('/platform/idea/Locality');
    expect(loc.data?._address).toBe('moor');
    expect(loc.data?._weatherPin).toEqual({ type: 'storm', mode: 'alive' });
  });

  it('the stormy heath is a SkyExposed CartesianLocation under `moor`', () => {
    const heath = seed('world/moor/stormy-heath');
    expect(heath.class).toBe('/platform/location/Room');
    expect(heath.data?._biomePath).toBe('/stuff/idea/biome/outdoor/baseline');
    expect(heath.data?.address).toBe('moor/heath');
    expect(templateExists('/stuff/idea/biome/outdoor/baseline')).toBe(true);
    for (const p of (heath.data?.adornments ?? []) as string[]) {
      expect(templateExists(p)).toBe(true);
    }
  });

  it('the weeping chamber is an indoor scope-pinned rain room', () => {
    const chamber = seed('world/moor/weeping-chamber');
    expect(chamber.class).toBe('/platform/location/Room');
    expect(chamber.data?._biomePath).toBe('/stuff/idea/biome/indoor/baseline');
    expect(chamber.data?._weatherPin).toEqual({ type: 'rain', mode: 'frozen' });
    expect(chamber.data?._humidity).toBe(98); // authored sodden air
    expect(chamber.data?.address).toBe('moor/chamber');
    for (const p of (chamber.data?.adornments ?? []) as string[]) {
      expect(templateExists(p)).toBe(true);
    }
  });

  it('both floors are surface-bulk Floors (the rain-fillable puddle sink)', () => {
    for (const p of ['world/moor/heath-floor', 'world/moor/weeping-floor']) {
      const floor = seed(p);
      expect(floor.class).toBe('/platform/thing/Floor');
      expect(floor.data?.surfaceBulk).toBe(true);
      // Authored empty — no standing water; the rain fills it.
      expect(floor.data?.surfaceAmount).toBeUndefined();
    }
  });
});
