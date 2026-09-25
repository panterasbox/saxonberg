/**
 * BloodType — the ABO compatibility rule and the graded mismatch (blood
 * build D2/D3). Pure value-object logic; no world needed.
 */

import { describe, it, expect } from 'vitest';
import { BloodType } from '../BloodType';
import type { AboPhenotype } from '../BloodType';

const S = '/stuff/idea/species/test/human';
const bt = (abo: AboPhenotype | 'mixed', species = S): BloodType =>
  new BloodType(species, abo);

describe('BloodType', () => {
  it('O is the universal donor within a species', () => {
    for (const r of ['A', 'B', 'AB', 'O'] as AboPhenotype[]) {
      expect(bt('O').isCompatibleDonorFor(bt(r))).toBe(true);
    }
  });

  it('AB receives all, donates only to AB', () => {
    for (const d of ['A', 'B', 'AB', 'O'] as AboPhenotype[]) {
      expect(bt(d).isCompatibleDonorFor(bt('AB'))).toBe(true);
    }
    expect(bt('AB').isCompatibleDonorFor(bt('A'))).toBe(false);
    expect(bt('AB').isCompatibleDonorFor(bt('O'))).toBe(false);
  });

  it('A→A/AB only; B→B/AB only', () => {
    expect(bt('A').isCompatibleDonorFor(bt('A'))).toBe(true);
    expect(bt('A').isCompatibleDonorFor(bt('AB'))).toBe(true);
    expect(bt('A').isCompatibleDonorFor(bt('B'))).toBe(false);
    expect(bt('B').isCompatibleDonorFor(bt('B'))).toBe(true);
    expect(bt('B').isCompatibleDonorFor(bt('AB'))).toBe(true);
    expect(bt('B').isCompatibleDonorFor(bt('A'))).toBe(false);
  });

  it('a mixed unit is compatible with nobody', () => {
    for (const r of ['A', 'B', 'AB', 'O'] as AboPhenotype[]) {
      expect(bt('mixed').isCompatibleDonorFor(bt(r))).toBe(false);
    }
  });

  it('mismatch grades 0/1/2: compatible, ABO, cross-species', () => {
    expect(bt('O').mismatchFor(bt('A'))).toBe(0);
    expect(bt('A').mismatchFor(bt('B'))).toBe(1);
    const other = '/stuff/idea/species/test/wolf';
    expect(bt('O').mismatchFor(bt('O', other))).toBe(2);
    // Species mismatch dominates even an ABO match.
    expect(bt('A').mismatchFor(bt('A', other))).toBe(2);
  });
});
