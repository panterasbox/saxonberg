/**
 * The geology field's model (metal chain M1).
 *
 * What is being pinned, in order of how load-bearing it is:
 *
 *  1. ⭐ **The spine invariant.** An authored pin and a computed cell are
 *     INDISTINGUISHABLE through `sampleAt` — asserted by SHAPE, because
 *     asserting by value would only prove that one particular pin
 *     happened to look ordinary.
 *  2. ⚠ **Nothing rolls.** The same cell answers the same way twice, in
 *     the same instance and across two freshly-constructed ones. The
 *     player's uncertainty is epistemic; the ground was always there.
 *  3. **The seed comes from the ADDRESS and only the address**, so
 *     renaming a mine moves its ore and no author manages a magic number.
 *  4. **Barren is the default**, over a thousand-cell walk — a deposit is
 *     mostly rock, which is what makes finding it worth anything.
 *  5. ⚠ **Dip is unobtainable from the surface**, by construction: the
 *     trace is a line, and a line carries strike alone.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Deposit from '../Deposit';
import type { Cell } from '../Deposit';

const SLATE = '/stuff/idea/material/rock/slate';
const GRANITE = '/stuff/idea/material/rock/granite';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const CHALCOPYRITE = '/stuff/idea/material/mineral/chalcopyrite';
const QUARTZ = '/stuff/idea/material/mineral/quartz';

/**
 * A synthetic deposit — NEVER a shipped row. `lint:test-content` wants
 * kernel tests off shipped content; a pack test lives beside its pack
 * anyway, and a fixture keeps this suite honest when Rejection's numbers
 * are tuned.
 */
function fixture(): Deposit {
  const d = makeStuff(() => new Deposit());
  d.setName('fixture');
  d.setStratigraphy([
    { toZ: -20, host: SLATE },
    { toZ: -400, host: GRANITE },
  ]);
  d.setWaterTable(-45);
  d.setLode({
    through: [0, 0, -20],
    strike: 40,
    dip: 60,
    thickness: 8,
    strikeExtent: 120,
    dipExtent: 90,
    gangue: QUARTZ,
  });
  d.setZones([
    { toZ: -45, mineral: MALACHITE, meanGrade: 0.08, spread: 0.06 },
    { toZ: -400, mineral: CHALCOPYRITE, meanGrade: 0.03, spread: 0.02 },
  ]);
  d.setDepletion([]);
  d.setFeatures({});
  return d;
}

/** Walk the plane and return the first cell that is actually in the lode. */
function anOreCell(d: Deposit, z: number, bound = 60): Cell {
  for (let x = -bound; x <= bound; x++) {
    for (let y = -bound; y <= bound; y++) {
      if (d.isInLode([x, y, z])) return [x, y, z];
    }
  }
  throw new Error(`no lode cell at z=${z}`);
}

/** …and the first cell at that depth that is NOT — the ordinary case. */
function aBarrenCell(d: Deposit, z: number): Cell {
  for (let x = -60; x <= 60; x++) {
    for (let y = -60; y <= 60; y++) {
      if (!d.isInLode([x, y, z])) return [x, y, z];
    }
  }
  throw new Error(`no barren cell at z=${z}`);
}

const SEED = Deposit.seedFor('terminus/rejection/ferrow');

describe('Deposit — the geology field', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
    // The two host rocks, resident so hardness resolves off the material
    // rather than off the fallback.
    for (const [path, mpa] of [[SLATE, 90], [GRANITE, 200]] as const) {
      const m = makeStuffAtPath(() => new Material(), path);
      (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
    }
  });

  it('is deterministic — the same cell twice, and across two fresh instances', () => {
    const a = fixture();
    const cell = anOreCell(a, -30);
    const first = a.sampleAt(cell, SEED);
    expect(a.sampleAt(cell, SEED)).toEqual(first);
    const b = fixture();
    expect(b.sampleAt(cell, SEED)).toEqual(first);
  });

  it('the seed changes with the address, and ONLY with the address', () => {
    expect(Deposit.seedFor('terminus/rejection/ferrow')).toBe(
      Deposit.seedFor('terminus/rejection/ferrow'),
    );
    expect(Deposit.seedFor('terminus/rejection/ferrow')).not.toBe(
      Deposit.seedFor('terminus/rejection/hollow'),
    );
    // ⚠ The row itself carries no seed: two deposits with identical data
    // at one address answer identically — the seed is the PLACE's.
    const a = fixture();
    const b = fixture();
    b.setName('renamed-but-same-place');
    const cell = anOreCell(a, -30);
    expect(b.sampleAt(cell, SEED).grade).toBe(a.sampleAt(cell, SEED).grade);
  });

  it('a cell inside the lode plane is ore; one a thickness away is barren', () => {
    const d = fixture();
    const cell = anOreCell(d, -30);
    const hit = d.sampleAt(cell, SEED);
    expect(hit.inLode).toBe(true);
    expect(hit.mineralPath).toBe(MALACHITE);
    expect(hit.grade).toBeGreaterThan(0);
    // Step off the plane at the same depth: the lode is thin, so most of
    // the level is country rock — which is the whole reason you survey.
    const miss = d.sampleAt(aBarrenCell(d, -30), SEED);
    expect(miss.inLode).toBe(false);
    expect(miss.grade).toBe(0);
    expect(miss.mineralPath).toBeNull();
  });

  it('the zone band switches at the water table — oxide above, sulfide below', () => {
    const d = fixture();
    expect(d.bandAt(-30)!.mineral).toBe(MALACHITE);
    expect(d.bandAt(-45)!.mineral).toBe(MALACHITE);
    expect(d.bandAt(-46)!.mineral).toBe(CHALCOPYRITE);
    // …and the wetness the boundary IS.
    expect(d.waterAt(-30)).toBe(0);
    expect(d.waterAt(-45)).toBe(1);
    expect(d.waterAt(-40)).toBeCloseTo(0.5, 5);
  });

  it('the depletion lean SCALES the computed grade rather than replacing it', () => {
    const plain = fixture();
    // Inside the leaned box below (|x|,|y| <= 50, -20 <= z <= 0).
    const cell = anOreCell(plain, -10, 40);
    const before = plain.sampleAt(cell, SEED).grade;
    expect(before).toBeGreaterThan(0);

    const leaned = fixture();
    leaned.setDepletion([
      { from: [-50, -50, -20], to: [50, 50, 0], scale: 0.5, reason: 'the old men' },
    ]);
    const after = leaned.sampleAt(cell, SEED).grade;
    expect(after).toBeCloseTo(before * 0.5, 10);
    // Outside the band, untouched — a lean is local.
    const deep = anOreCell(plain, -30);
    expect(leaned.sampleAt(deep, SEED).grade).toBe(plain.sampleAt(deep, SEED).grade);
  });

  it('⭐ an authored pin and a computed cell are indistinguishable — asserted by SHAPE', () => {
    const d = fixture();
    const computed = anOreCell(d, -30);
    const pinned: Cell = aBarrenCell(d, -30);
    // The pinned cell is barren ground the author decided is a pocket.
    expect(d.sampleAt(pinned, SEED).grade).toBe(0);
    d.setFeatures({
      pins: {
        [`${pinned[0]},${pinned[1]},${pinned[2]}`]: { mineral: MALACHITE, grade: 0.21 },
      },
    });
    const a = d.sampleAt(computed, SEED);
    const b = d.sampleAt(pinned, SEED);
    // Same keys, same types, no marker anywhere saying which was authored.
    expect(Object.keys(b).sort()).toEqual(Object.keys(a).sort());
    for (const k of Object.keys(a) as Array<keyof typeof a>) {
      expect(typeof b[k]).toBe(typeof a[k]);
    }
    expect(b.grade).toBe(0.21);
    expect(b.inLode).toBe(true);
  });

  it('barren is the default across a walk of 1000 cells', () => {
    const d = fixture();
    let ore = 0;
    for (let i = 0; i < 1000; i++) {
      const cell: Cell = [(i * 7) % 100 - 50, (i * 13) % 100 - 50, -((i * 3) % 40)];
      if (d.sampleAt(cell, SEED).grade > 0) ore++;
    }
    expect(ore).toBeGreaterThan(0);
    expect(ore).toBeLessThan(200);
  });

  it('hardness resolves off the HOST material, and granite and slate differ', () => {
    const d = fixture();
    // -10 is in the slate band; -100 is in the granite below it.
    expect(d.sampleAt([30, 30, -10], SEED).hostPath).toBe(SLATE);
    expect(d.sampleAt([30, 30, -10], SEED).hardnessMPa).toBe(90);
    expect(d.sampleAt([30, 30, -100], SEED).hostPath).toBe(GRANITE);
    expect(d.sampleAt([30, 30, -100], SEED).hardnessMPa).toBe(200);
  });

  it('an unresolvable host falls back to a middling hardness, never to free digging', () => {
    const d = fixture();
    d.setStratigraphy([{ toZ: -400, host: '/stuff/idea/material/rock/nonesuch' }]);
    expect(d.sampleAt([0, 0, -10], SEED).hardnessMPa).toBeGreaterThan(0);
  });

  it('⚠ the surface trace carries STRIKE and no dip whatever', () => {
    const d = fixture();
    const r = d.surfaceReadingAt(0, 0, 3, SEED)!;
    expect(r).not.toBeNull();
    expect(r.strikeDeg).toBeCloseTo(40, 6);
    expect(Object.keys(r)).not.toContain('dipDeg');
    // Dip is obtainable underground, on the vein, and nowhere else.
    expect(d.dipReadingAt([40, 40, -10], 3, SEED)).toBeNull();
    const ore = anOreCell(d, -30);
    expect(d.dipReadingAt(ore, 3, SEED)!.dipDeg).toBeCloseTo(60, 6);
  });

  it('⭐ competence sets the error band and NEVER the number', () => {
    const d = fixture();
    const novice = d.surfaceReadingAt(12, -8, 15, SEED)!;
    const expert = d.surfaceReadingAt(12, -8, 3, SEED)!;
    // The identity, not the presentation: the underlying figure is one figure.
    expect(expert.strikeDeg).toBe(novice.strikeDeg);
    expect(expert.distanceM).toBe(novice.distanceM);
    expect(expert.errorDeg).toBeLessThan(novice.errorDeg);
    // …and the observation is SEEDED, so returning to the point does not re-roll.
    expect(d.surfaceReadingAt(12, -8, 3, SEED)!.readingDeg).toBe(expert.readingDeg);
  });

  it('staining falls off with distance from the trace — the thing you can SEE', () => {
    const d = fixture();
    const on = d.surfaceReadingAt(0, 0, 3, SEED)!;
    const off = d.surfaceReadingAt(60, 60, 3, SEED)!;
    expect(Math.abs(on.distanceM)).toBeLessThan(Math.abs(off.distanceM));
    expect(on.staining).toBeGreaterThan(off.staining);
  });

  it('a deposit with no lode reads barren everywhere, and says so rather than throwing', () => {
    const d = fixture();
    d.setLode(null);
    expect(d.sampleAt([0, 0, -30], SEED).grade).toBe(0);
    expect(d.surfaceReadingAt(0, 0, 3, SEED)).toBeNull();
    expect(d.dipReadingAt([0, 0, -30], 3, SEED)).toBeNull();
  });

  it('off the end of the body along strike, there is no trace to read', () => {
    const d = fixture();
    expect(d.surfaceReadingAt(0, 0, 3, SEED)).not.toBeNull();
    // 400 m along strike is well past the 120 m half-extent.
    const s = [Math.sin(40 * Math.PI / 180), Math.cos(40 * Math.PI / 180)];
    expect(d.surfaceReadingAt(s[0]! * 400, s[1]! * 400, 3, SEED)).toBeNull();
  });

  it('a seeded feature is a fact about the place, not a draw', () => {
    const d = fixture();
    d.setFeatures({ seeded: [{ feature: 'vug', chance: 0.15 }] });
    const cells: Cell[] = [];
    for (let i = 0; i < 200; i++) cells.push([i % 20, (i * 3) % 20, -12]);
    const first = cells.map((c) => d.sampleAt(c, SEED).feature);
    const again = cells.map((c) => d.sampleAt(c, SEED).feature);
    expect(again).toEqual(first);
    expect(first.filter((f) => f === 'vug').length).toBeGreaterThan(0);
    expect(first.filter((f) => f === 'vug').length).toBeLessThan(cells.length);
  });
});
