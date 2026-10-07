/**
 * The three animals yield named JOINTS, and the arithmetic is the
 * animal's own.
 *
 * ⭐⭐⭐ **AC12 as arithmetic, not as prose.** The same `shoulder` row off
 * a ewe and off a bullock weighs what each animal's shoulder weighs,
 * because the share is the body plan's and the scale is the animal's. No
 * number is authored twice, and that is the whole claim of the share
 * model.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

// ⚠ Read the ROW off disk, the `verb-gates.test.ts` way: this test is
// about what the content says, and standing the species up would test the
// resolver instead.
const SPECIES_DIR =
  '../../content/stuff/idea/species/animalia/chordata/mammalia/artiodactyla';

interface YieldLine {
  cut: string;
  units: number;
  fraction?: number;
  conditioned?: boolean;
}

interface SpeciesRow {
  data: {
    butcheryYield?: YieldLine[];
    tissueShares?: Record<string, number>;
    _bodyPlanPath?: string;
  };
}

function row(rel: string): SpeciesRow {
  const file = fileURLToPath(new URL(rel, import.meta.url));
  return YAML.parse(readFileSync(file, 'utf8')) as SpeciesRow;
}

let ewe: SpeciesRow;
let cow: SpeciesRow;
let sow: SpeciesRow;

beforeAll(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

beforeEach(() => {
  ewe = row(`${SPECIES_DIR}/bovidae/ovis/aries.yaml`);
  cow = row(`${SPECIES_DIR}/bovidae/bos/taurus.yaml`);
  sow = row(`${SPECIES_DIR}/suidae/sus/domesticus.yaml`);
});

const CUTS = '/trade/cooking/thing/cut-';

function cuts(r: SpeciesRow): string[] {
  return (r.data.butcheryYield ?? [])
    .map((l) => l.cut)
    .filter((c) => c.startsWith(CUTS))
    .map((c) => c.slice(CUTS.length));
}

describe('⭐⭐ the three animals yield named joints', () => {
  it('a ewe gives shoulder, leg, loin, rib, neck, belly and shank', () => {
    expect(cuts(ewe).sort()).toEqual(
      ['belly', 'leg', 'loin', 'neck', 'rib', 'shank', 'shoulder'].sort(),
    );
  });

  it('⚠ and NOT a tenderloin — a sheep\'s is a mouthful', () => {
    // ⭐ The species deciding which joints are worth naming, not the
    // mechanism. The cow names it; the ewe does not.
    expect(cuts(ewe)).not.toContain('tenderloin');
    expect(cuts(cow)).toContain('tenderloin');
  });

  it('⭐ a bullock names every joint, chops among them', () => {
    expect(cuts(cow)).toContain('chop');
    expect(cuts(cow).length).toBeGreaterThan(cuts(ewe).length);
  });

  it('⭐ a pig is a BELLY animal and names no shank', () => {
    expect(cuts(sow)).toContain('belly');
    expect(cuts(sow)).not.toContain('shank');
    const belly = (sow.data.butcheryYield ?? []).find((l) =>
      l.cut.endsWith('cut-belly'),
    );
    const eweBelly = (ewe.data.butcheryYield ?? []).find((l) =>
      l.cut.endsWith('cut-belly'),
    );
    expect(belly!.units).toBeGreaterThan(eweBelly!.units);
  });
});

describe('⭐⭐⭐ no number is authored twice', () => {
  it('NO claiming line authors a fraction', () => {
    // ⚠ The share derives from the muscles the cut claims; an authored
    // `fraction` beside it is a second copy that drifts, and the
    // derivation silently wins. `lint:anatomy` clause (c) is the gate.
    for (const r of [ewe, cow, sow]) {
      for (const line of r.data.butcheryYield ?? []) {
        if (line.cut.startsWith(CUTS)) {
          expect(line.fraction).toBeUndefined();
        }
      }
    }
  });

  it('⚠ and the NON-claiming lines still author theirs', () => {
    // A hide, the offal, the bone and the gut are not muscles, so the
    // body plan says nothing about them and the row must.
    for (const r of [ewe, cow, sow]) {
      for (const line of r.data.butcheryYield ?? []) {
        if (!line.cut.startsWith(CUTS) && !line.cut.endsWith('/gut')) {
          expect(typeof line.fraction).toBe('number');
        }
      }
    }
  });
});

describe('⭐⭐ a pig has its OWN body, not a sheep\'s with a dial', () => {
  it('the sow names BodyPlan/swine; the ewe and the cow name quadruped', () => {
    // ⭐ A pig is a third fat with twice a sheep's belly, which the plan
    // says by `extends:`-ing quadruped's topology and restating the
    // shares. ⚠⚠ It was nearly a `Species.tissueShares` override, and
    // `lint:unconsumed-seams` refused it twice — correctly. The second
    // look was better: a pig's body IS a different body.
    expect(sow.data._bodyPlanPath).toBe('/stuff/idea/species/BodyPlan/swine');
    expect(ewe.data._bodyPlanPath).toBe('/stuff/idea/species/BodyPlan/quadruped');
    expect(cow.data._bodyPlanPath).toBe('/stuff/idea/species/BodyPlan/quadruped');
  });

  it('⚠ and NO species authors a share override — the field is gone', () => {
    for (const r of [ewe, cow, sow]) {
      expect((r.data as { tissueShares?: unknown }).tissueShares).toBeUndefined();
    }
  });
});

describe('⚠ the fat is not the same fat', () => {
  it('a ewe and a cow give SUET; a sow gives LEAF FAT', () => {
    const fatOf = (r: SpeciesRow): string =>
      (r.data.butcheryYield ?? []).find(
        (l) => l.cut.includes('suet') || l.cut.includes('leaf-fat'),
      )!.cut;
    expect(fatOf(ewe)).toContain('suet');
    expect(fatOf(cow)).toContain('suet');
    // ⭐ A ruminant's hard kidney fat takes a candle; a pig's renders to
    // lard and does not. The chandler refuses it by TAG, with nothing
    // anywhere checking for a pig.
    expect(fatOf(sow)).toContain('leaf-fat');
  });
});
