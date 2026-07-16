/**
 * Content-integrity tests for the Drowned Substation seeds — the cheap
 * save-gate-parity discipline (the `bar-content.test` precedent): pure YAML
 * reads, no clone pipeline. A typo'd `adornments:` / `populates:` path, a
 * missing pool material, or a dropped `voltage` is caught here, not silently
 * at standup / traverse time. Proves the hazard fixtures are authored
 * templates wired declaratively — not imperatively constructed.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const SEEDS = fileURLToPath(new URL('../../../seeds/', import.meta.url));
const PACK = fileURLToPath(
  new URL(
    '../../../../../../content/base-library/content/',
    import.meta.url,
  ),
);

interface Seed {
  class?: string;
  hydratorClass?: string;
  data?: Record<string, unknown>;
}

function seed(templatePath: string): Seed {
  return YAML.parse(
    readFileSync(`${SEEDS}${templatePath}.yaml`, 'utf8'),
  ) as Seed;
}
/** A `/lib/...` template path resolves to either a seed file or a pack file. */
function templateExists(path: string): boolean {
  return (
    existsSync(`${SEEDS}${path}.yaml`) || existsSync(`${PACK}${path}.yaml`)
  );
}

describe('The Drowned Substation — content integrity', () => {
  it('the zone is a CartesianZone', () => {
    expect(seed('domain/substation').class).toBe('/lib/location/CartesianZone');
  });

  it('the flooded-cell room is a CartesianLocation subclass at authored coords', () => {
    const cell = seed('domain/substation/flooded-cell');
    expect(cell.class).toBe('/domain/substation/FloodedCell');
    expect(cell.data?.coords).toEqual({ x: 0, y: 0, z: 0 });
  });

  it("the cell's adornments + populates resolve to real templates", () => {
    const cell = seed('domain/substation/flooded-cell');
    const adornments = (cell.data?.adornments ?? []) as string[];
    const populates = (cell.data?.populates ?? []) as string[];
    expect(adornments).toContain('/domain/substation/flooded-floor');
    expect(populates).toContain('/domain/substation/live-wire');
    expect(populates).toContain('/domain/substation/stun-baton');
    for (const path of [...adornments, ...populates]) {
      expect(templateExists(path), path).toBe(true);
    }
  });

  it('the pooled floor authors a resolvable conductive brine pool', () => {
    const floor = seed('domain/substation/flooded-floor');
    expect(floor.class).toBe('/obj/Floor');
    expect(floor.data?.surfaceBulk).toBe(true);
    expect(floor.data?.surfaceAmount).toBeGreaterThan(0);
    const material = String(floor.data?.surfaceMaterial ?? '');
    expect(material).toBe('/lib/material/bulk/salt-water');
    expect(templateExists(material), material).toBe(true);
  });

  it('the live wire is an Energized source held at a real potential', () => {
    const wire = seed('domain/substation/live-wire');
    expect(wire.class).toBe('/lib/electricity/LiveWire');
    expect(wire.data?.voltage).toBeGreaterThan(0);
    expect(wire.data?.on).toBe(true);
  });

  it('the stun baton is an authored Energized weapon, shipped safed', () => {
    const baton = seed('domain/substation/stun-baton');
    expect(baton.class).toBe('/lib/electricity/StunBaton');
    // A hafted weapon (mechanical) with an electrical layer on top.
    expect(baton.data?.constructionForm).toBe('hafted');
    expect(baton.data?.voltage).toBeGreaterThan(0);
    expect(baton.data?.on).toBe(false); // ships off — inert in the pool
    const material = String(baton.data?._materialPath ?? '');
    expect(templateExists(material), material).toBe(true);
  });
});
