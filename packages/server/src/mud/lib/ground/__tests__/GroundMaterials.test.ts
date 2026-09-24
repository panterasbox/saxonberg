/**
 * The five material rows the ground build authors, read off disk, against
 * the two things the kernel now depends on them for.
 *
 * ⚠⚠ **Why a KERNEL test owns a content assertion.** This build switches
 * `ElectricityLogic.floorConducts` on. That branch has existed since the
 * electricity build and has been **dead the whole time**, because it reads
 * `floor.getMaterial()` and no floor row in the game authored a material.
 * Now every floor has one — so the day this lands, every room in the world
 * gains a conductivity number it never had, and if any of these five rows
 * is authored wet, standing in a puddle somewhere becomes lethal for a
 * reason nobody wrote down.
 *
 * So: authored DRY, as granite and slate are, all five well under
 * `electricity.pool.minConductivity` (0.005, seeded in
 * `content/settings/electricity.yaml`). Wet-ground conduction keeps riding
 * the PUDDLE in the floor's surface slot, exactly as it does today. Only a
 * metal floor would conduct, and none ships.
 *
 * The second assertion is the fold: a row whose tags drifted would silently
 * change what every room made of it reads as.
 */

import '../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import YAML from 'yaml';
import {
  GROUND_CLASS_PRECEDENCE,
  GROUND_TAG_CLASSES,
  type GroundMaterialClass,
} from '../GroundKind';

const MATERIALS = join(
  __dirname,
  '..', '..', '..', '..', '..', '..',
  'content', 'base-library', 'content', 'stuff', 'idea', 'material',
);

/** The seeded `electricity.pool.minConductivity`. */
const POOL_MIN_CONDUCTIVITY = 0.005;

interface MaterialRow {
  data: {
    name: string;
    tags: string[];
    electricalConductivity?: number;
    density: number;
    waterAbsorptionCapacity?: number;
  };
}

function row(rel: string): MaterialRow['data'] {
  const text = readFileSync(join(MATERIALS, rel), 'utf8');
  return (YAML.parse(text) as MaterialRow).data;
}

/** The classifier, as `FloorMixin` runs it. */
function classOf(tags: readonly string[]): GroundMaterialClass | null {
  const found = new Set<GroundMaterialClass>();
  for (const t of tags) {
    const cls = GROUND_TAG_CLASSES[t.toLowerCase()];
    if (cls) found.add(cls);
  }
  for (const cls of GROUND_CLASS_PRECEDENCE) if (found.has(cls)) return cls;
  return null;
}

const ROWS: Array<[string, GroundMaterialClass]> = [
  ['earth/loam.yaml', 'earth'],
  ['earth/clay.yaml', 'earth'],
  ['earth/sand.yaml', 'granular'],
  ['organic/peat.yaml', 'earth'],
  ['ceramic/concrete.yaml', 'mineral'],
];

describe('the five ground materials', () => {
  for (const [rel, expected] of ROWS) {
    describe(rel, () => {
      it(`folds to '${expected}'`, () => {
        expect(classOf(row(rel).tags)).toBe(expected);
      });

      it('is authored DRY — under the pool conduction threshold', () => {
        const sigma = row(rel).electricalConductivity;
        expect(sigma).toBeDefined();
        expect(sigma!).toBeLessThan(POOL_MIN_CONDUCTIVITY);
      });

      it('carries a plausible bulk density', () => {
        expect(row(rel).density).toBeGreaterThan(0);
      });
    });
  }

  it('⭐ sand folds granular, not earth, though it is tagged both', () => {
    const sand = row('earth/sand.yaml');
    expect(sand.tags).toContain('earth');
    expect(sand.tags).toContain('granular');
    expect(classOf(sand.tags)).toBe('granular');
  });

  it('peat holds the most water in the tree — which is what a bog is', () => {
    const peat = row('organic/peat.yaml');
    const loam = row('earth/loam.yaml');
    const sand = row('earth/sand.yaml');
    expect(peat.waterAbsorptionCapacity!).toBeGreaterThan(
      loam.waterAbsorptionCapacity!
    );
    expect(loam.waterAbsorptionCapacity!).toBeGreaterThan(
      sand.waterAbsorptionCapacity!
    );
  });

  it('the shipped stones this build points floors at are dry too', () => {
    // Not new rows, but the road walk and the forge now READ them, so if
    // either were wet the same hazard applies.
    for (const rel of ['rock/granite.yaml', 'rock/slate.yaml']) {
      expect(row(rel).electricalConductivity!).toBeLessThan(
        POOL_MIN_CONDUCTIVITY
      );
    }
  });
});
