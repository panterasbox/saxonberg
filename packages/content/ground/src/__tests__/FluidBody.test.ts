/**
 * ⭐⭐ **The fluid half of the column, and the one thing it refuses to
 * tell you** (drilling D1).
 *
 * What is pinned, in order of how load-bearing it is:
 *
 *  1. ⭐⭐⭐ **A charged body and a dry one read IDENTICALLY.** Every
 *     field of `structureReadingAt` is the same for both; nothing
 *     anywhere narrows charge. This is the trade's whole premise — it is
 *     why a dry hole survives every improvement to the instruments — and
 *     it is the one assertion in this file that must never be relaxed.
 *  2. ⚠ **Nothing rolls.** Charge answers the same way twice, in one
 *     instance and across two freshly-constructed ones, because the
 *     ground was always that way; the player's uncertainty is epistemic.
 *     The fold order is pin over lean over seeded, the spine's.
 *  3. **The truth is identical for every observer** and only the
 *     OBSERVATION carries the band's offset — the surface read's rule,
 *     restated in metres.
 *  4. ⭐⭐ **The bracket is a fraction of the READING, and the truth is
 *     always inside it.** Two separate claims and both matter: the
 *     fraction is why the same instrument reads shallow structure better
 *     than deep structure, and scaling off the *reading* rather than the
 *     truth is what stops the quoted bracket leaking the truth exactly.
 *  5. **`fluidAt`'s ordering is the physics** — the body where it is,
 *     then the water table, then nothing. An UNCHARGED body is invisible
 *     to it, which is what a hole through a dry structure brings up.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import Deposit from '../idea/Deposit';
import type { FluidBody } from '../idea/Deposit';

const SLATE = '/stuff/idea/material/rock/slate';
const GRANITE = '/stuff/idea/material/rock/granite';
const BRINE = '/stuff/idea/material/bulk/salt-water';
const CRUDE = '/stuff/idea/material/bulk/crude-oil';
const WATER = '/stuff/idea/material/bulk/water';

/** A trap directly under the origin, 200 m along by 120 m across. */
function trap(crestZ: number) {
  return {
    crest: [0, 0, crestZ] as const,
    strike: 40,
    alongExtent: 200,
    acrossExtent: 120,
    closureM: 30,
  };
}

/** A point `r` of the way out from the crest, along the +across axis. */
function outAt(r: number): [number, number] {
  const f = 40 * (Math.PI / 180);
  const across = r * 120;
  return [across * Math.cos(f), -across * Math.sin(f)];
}

/** A synthetic column — never a shipped row (the Deposit suite's rule). */
function fixture(fluids: FluidBody[]): Deposit {
  const d = makeStuff(() => new Deposit());
  d.setName('fixture');
  d.setStratigraphy([
    { toZ: -20, host: SLATE },
    { toZ: -400, host: GRANITE },
  ]);
  d.setWaterTable(-45);
  d.setLode(null); // ⭐ barren of ore and charged with brine: a legal row.
  d.setZones([]);
  d.setDepletion([]);
  d.setFeatures({});
  d.setFluids(fluids);
  return d;
}

const CHARGED: FluidBody = {
  key: 'salt-leg',
  fluid: BRINE,
  trap: trap(-110),
  charge: true,
  capacityL: 50_000,
  headAtm0: 0,
};

/** The same structure, read the same, holding nothing. */
const DRY: FluidBody = { ...CHARGED, key: 'dry-trap', charge: false };

const SEED = Deposit.seedFor('terminus/rejection/ferrow');

describe('a fluid body', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('a column with NO fluids answers empty and null, with no guard anywhere', () => {
    const d = fixture([]);
    expect(d.structureReadingAt(0, 0, 0.1, SEED)).toEqual([]);
    // Above the water table there is nothing in the pore space at all.
    expect(d.fluidAt([0, 0, -10], SEED)).toBeNull();
    // Below it, the honest answer is the water, and it is plain water
    // rather than the body's fluid — which is why a hole needs lining.
    expect(d.fluidAt([0, 0, -60], SEED)?.materialPath).toBe(WATER);
    expect(d.fluidAt([0, 0, -60], SEED)?.bodyKey).toBeNull();
  });

  it('a column with a lode of NULL and one body is legal — the narrowing test', () => {
    const d = fixture([CHARGED]);
    expect(d.getLode()).toBeNull();
    // No reader of `fluids` touches a lode field: the structural read
    // works with no orebody at all, and the ore read still says barren.
    expect(d.structureReadingAt(0, 0, 0.1, SEED)).toHaveLength(1);
    expect(d.sampleAt([0, 0, -120], SEED).inLode).toBe(false);
    expect(d.sampleAt([0, 0, -120], SEED).mineralPath).toBeNull();
  });
});

describe('⭐⭐⭐ structure is readable; charge is not', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('⭐⭐⭐ a CHARGED body and a DRY one read identically, field for field', () => {
    // THE assertion of this build. If this ever fails, some instrument
    // has learned to read charge, the dry hole has stopped being a bet,
    // and the trade's premise is gone.
    const wet = fixture([{ ...CHARGED, key: 'same' }]);
    const dry = fixture([{ ...DRY, key: 'same' }]);
    expect(wet.structureReadingAt(30, 40, 0.1, SEED)).toEqual(
      dry.structureReadingAt(30, 40, 0.1, SEED),
    );
  });

  it('reports the trap under the point, and nothing off its ends', () => {
    const d = fixture([CHARGED]);
    expect(d.structureReadingAt(0, 0, 0.1, SEED)).toHaveLength(1);
    // 5 km away in any direction is off every structure in the county.
    expect(d.structureReadingAt(5000, 5000, 0.1, SEED)).toEqual([]);
  });

  it('the TRUTH is identical for every band; only the OBSERVATION moves', () => {
    const d = fixture([CHARGED]);
    const sharp = d.structureReadingAt(10, 10, 0.02, SEED)[0]!;
    const blunt = d.structureReadingAt(10, 10, 0.4, SEED)[0]!;
    // Competence buys resolution, never outcome.
    expect(blunt.crestDepthM).toBe(sharp.crestDepthM);
    expect(blunt.crestDepthM).toBe(110);
    expect(blunt.distanceM).toBeCloseTo(sharp.distanceM, 9);
    expect(blunt.axisDeg).toBe(sharp.axisDeg);
    // ⭐ And the offset scales with the bracket: the blunt reading is
    // further from the truth than the sharp one, in the same direction.
    const sharpErr = Math.abs(sharp.readingDepthM - sharp.crestDepthM);
    const bluntErr = Math.abs(blunt.readingDepthM - blunt.crestDepthM);
    expect(bluntErr).toBeGreaterThan(sharpErr);
    // ⭐⭐ The truth is inside what the reader says — at BOTH bands, and
    // that is the whole of *a coarse reading is vague, never wrong*.
    expect(sharpErr).toBeLessThanOrEqual(sharp.errorM + 1e-9);
    expect(bluntErr).toBeLessThanOrEqual(blunt.errorM + 1e-9);
  });

  it('⭐⭐ the quoted bracket does NOT leak the truth, at any band', () => {
    // The defect this guards: a half-width scaled off the TRUTH lets a
    // reader compute the truth exactly from their own error bar, which
    // would make an untrained eye the sharpest instrument in the game.
    // The quoted figure is a fraction of the READING, so it is
    // recoverable from what the player was told and from nothing else.
    const d = fixture([CHARGED]);
    for (const f of [0.5, 0.3, 0.15, 0.08, 0.04]) {
      const r = d.structureReadingAt(10, 10, f, SEED)[0]!;
      expect(r.errorM).toBeCloseTo(Math.abs(r.readingDepthM) * f, 9);
      // ...and the truth is inside it anyway.
      expect(Math.abs(r.readingDepthM - r.crestDepthM)).toBeLessThanOrEqual(
        r.errorM + 1e-9,
      );
    }
  });

  it('⚠ an absurd fraction is clamped rather than running away', () => {
    const d = fixture([CHARGED]);
    const wild = d.structureReadingAt(10, 10, 5, SEED)[0]!;
    expect(Number.isFinite(wild.readingDepthM)).toBe(true);
    expect(wild.errorM).toBeCloseTo(Math.abs(wild.readingDepthM) * 0.5, 9);
  });

  it('⚠ the same point read twice reads the same wrong number', () => {
    const d = fixture([CHARGED]);
    const first = d.structureReadingAt(17, -3, 0.12, SEED)[0]!;
    expect(d.structureReadingAt(17, -3, 0.12, SEED)[0]).toEqual(first);
    // ...and a second instance of the same row agrees: no process state.
    const e = fixture([CHARGED]);
    expect(e.structureReadingAt(17, -3, 0.12, SEED)[0]).toEqual(first);
  });

  it('two points over one trap read different wrong numbers', () => {
    // Seeded per observation point, which is what makes `analyze
    // structure` averaging repeat readings actually narrow anything.
    const d = fixture([CHARGED]);
    const a = d.structureReadingAt(0, 0, 0.2, SEED)[0]!;
    const b = d.structureReadingAt(60, 10, 0.2, SEED)[0]!;
    expect(a.readingDepthM).not.toBe(b.readingDepthM);
  });
});

describe('⭐⭐ charge — the answer decided before anybody looked', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('the PIN wins outright, both ways', () => {
    const d = fixture([CHARGED, DRY]);
    expect(d.isCharged(CHARGED, SEED)).toBe(true);
    expect(d.isCharged(DRY, SEED)).toBe(false);
    // A pin beats a lean that says the opposite — the spine's fold order.
    expect(d.isCharged({ ...DRY, chargeChance: 1 }, SEED)).toBe(false);
    expect(d.isCharged({ ...CHARGED, chargeChance: 0 }, SEED)).toBe(true);
  });

  it('⚠ unpinned, it is SEEDED — same answer twice, and across instances', () => {
    const body: FluidBody = { ...CHARGED, key: 'maybe', charge: undefined };
    const d = fixture([body]);
    const answer = d.isCharged(body, SEED);
    expect(d.isCharged(body, SEED)).toBe(answer);
    expect(fixture([body]).isCharged(body, SEED)).toBe(answer);
    // And a DIFFERENT locality's seed is free to disagree — the body is
    // keyed on its name under the address, so a second world with the
    // same row and a different address is a different bet.
    expect(typeof d.isCharged(body, Deposit.seedFor('elsewhere/far'))).toBe(
      'boolean',
    );
  });

  it('the lean is a rate: over many bodies the chance is approximately kept', () => {
    const d = fixture([]);
    let charged = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      charged += d.isCharged(
        { ...CHARGED, key: `body-${i}`, charge: undefined, chargeChance: 0.25 },
        SEED,
      )
        ? 1
        : 0;
    }
    // Wide bounds on purpose: this asserts the lean is READ, not that the
    // hash is uniform to three places.
    expect(charged / n).toBeGreaterThan(0.15);
    expect(charged / n).toBeLessThan(0.36);
  });

  it('⛔ no reading anywhere returns it', () => {
    // Structural: the only way to learn charge is to get to the depth.
    // `StructureReading` has no charge-shaped field, so this is asserted
    // on the shape rather than on a value.
    const d = fixture([CHARGED]);
    const reading = d.structureReadingAt(0, 0, 0.1, SEED)[0]!;
    const keys = Object.keys(reading).join(' ');
    expect(keys).not.toMatch(/charge|wet|dry|fluid|holds/i);
  });
});

describe('fluidAt — the body, then the water, then nothing', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('answers the body where its leg spans the depth', () => {
    const d = fixture([CHARGED]);
    const sample = d.fluidAt([0, 0, -120], SEED)!;
    expect(sample.bodyKey).toBe('salt-leg');
    expect(sample.materialPath).toBe(BRINE);
  });

  it('answers the WATER above the leg but below the table', () => {
    const d = fixture([CHARGED]);
    // -60 is below the table (-45) and above the leg's top (-110).
    expect(d.fluidAt([0, 0, -60], SEED)!.materialPath).toBe(WATER);
    // ...and below the leg's base, the water again.
    expect(d.fluidAt([0, 0, -200], SEED)!.materialPath).toBe(WATER);
  });

  it('answers NOTHING above the water table, and nothing in the air', () => {
    const d = fixture([CHARGED]);
    expect(d.fluidAt([0, 0, -10], SEED)).toBeNull();
    expect(d.fluidAt([0, 0, 5], SEED)).toBeNull();
  });

  it('⚠ an UNCHARGED body is invisible: the hole brings up the water', () => {
    // The dry hole, in one assertion. The structure is right there and
    // the read reports it; at the depth it promised there is only the
    // water the table would have given anyway.
    const d = fixture([DRY]);
    expect(d.structureReadingAt(0, 0, 0.1, SEED)).toHaveLength(1);
    expect(d.fluidAt([0, 0, -120], SEED)!.materialPath).toBe(WATER);
    expect(d.fluidAt([0, 0, -120], SEED)!.bodyKey).toBeNull();
  });

  it('is off the structure laterally, however deep you go', () => {
    const d = fixture([CHARGED]);
    for (const z of [-115, -120, -139]) {
      expect(d.fluidAt([5000, 0, z], SEED)!.materialPath).toBe(WATER);
    }
  });

  it('the first body in the list wins where two overlap', () => {
    // Ordering is the author's, declared by the row's order — the same
    // top-down rule the stratigraphy and the grade bands already use.
    const oil: FluidBody = {
      ...CHARGED,
      key: 'oil-leg',
      fluid: CRUDE,
      headAtm0: 2.5,
    };
    const d = fixture([oil, CHARGED]);
    expect(d.fluidAt([0, 0, -120], SEED)!.bodyKey).toBe('oil-leg');
    expect(d.fluidAt([0, 0, -120], SEED)!.headAtm0).toBe(2.5);
  });
});

describe('⭐⭐⭐ the crest MATTERS — the leg is the arch, not a slab', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('is the full closure under the crest and NOTHING at the rim', () => {
    // This is what makes the structural survey worth paying for rather
    // than decorative. If the leg were a slab, the crest's bearing and
    // distance would be noise and a narrower bracket would buy nothing.
    const d = fixture([CHARGED]);
    expect(d.legAt(CHARGED, 0, 0)!.thicknessM).toBeCloseTo(30, 6);
    const [rimX, rimY] = outAt(1);
    expect(d.legAt(CHARGED, rimX, rimY)!.thicknessM).toBeCloseTo(0, 6);
    // ...and tapers between, monotonically.
    let last = Infinity;
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const [x, y] = outAt(r);
      const t = d.legAt(CHARGED, x, y)!.thicknessM;
      expect(t).toBeLessThan(last + 1e-9);
      last = t;
    }
  });

  it('the SPILL depth is the same everywhere; only the top moves', () => {
    // The physics: anything buoyant floats up against the arch and
    // fills from the top down to the point where the trap leaks.
    const d = fixture([CHARGED]);
    for (const r of [0, 0.4, 0.9]) {
      const [x, y] = outAt(r);
      expect(d.legAt(CHARGED, x, y)!.spillZ).toBeCloseTo(-140, 6);
    }
    const [x, y] = outAt(0.5);
    expect(d.legAt(CHARGED, x, y)!.topZ).toBeCloseTo(-125, 6);
  });

  it('is null outside the trap altogether, and the ellipse is a CURVE', () => {
    const d = fixture([CHARGED]);
    const [outX, outY] = outAt(1.2);
    expect(d.legAt(CHARGED, outX, outY)).toBeNull();
    // ⚠ A box would admit the corner; a fold closes in a curve, so the
    // along-and-across corner of the bounding rectangle is OUTSIDE.
    const f = 40 * (Math.PI / 180);
    const cornerX = 200 * Math.sin(f) + 120 * Math.cos(f);
    const cornerY = 200 * Math.cos(f) - 120 * Math.sin(f);
    expect(d.legAt(CHARGED, cornerX, cornerY)).toBeNull();
  });

  it('⭐⭐ boring at the RIM of a charged trap finds the water, not the brine', () => {
    // The lesson a cheap bore teaches, and it is cheap on purpose: the
    // trap is right there, the read reported it honestly, and the money
    // went into the thin edge of it.
    const d = fixture([CHARGED]);
    const [rimX, rimY] = outAt(0.98);
    for (const z of [-115, -125, -138]) {
      const sample = d.fluidAt([rimX, rimY, z], SEED)!;
      // Above the thin leg: water (we are below the table). Inside the
      // last half-metre of it: the brine. Either way, not a column.
      expect([WATER, BRINE]).toContain(sample.materialPath);
    }
    // Over the crest, the same depths are all brine.
    for (const z of [-115, -125, -138]) {
      expect(d.fluidAt([0, 0, z], SEED)!.materialPath).toBe(BRINE);
    }
  });

  it('⭐ the reading says how thick the closure is HERE, and a dry trap says the same', () => {
    const wet = fixture([{ ...CHARGED, key: 'same' }]);
    const dry = fixture([{ ...DRY, key: 'same' }]);
    const crest = wet.structureReadingAt(0, 0, 0.08, SEED)[0]!;
    expect(crest.thicknessHereM).toBeCloseTo(30, 6);
    const [x, y] = outAt(0.5);
    const flank = wet.structureReadingAt(x, y, 0.08, SEED)[0]!;
    expect(flank.thicknessHereM).toBeCloseTo(15, 6);
    expect(flank.distanceM).toBeGreaterThan(crest.distanceM);
    // ⚠⚠ And still identical for the dry one, field for field.
    expect(dry.structureReadingAt(x, y, 0.08, SEED)[0]).toEqual(flank);
  });
});

describe('capacityOf', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    StuffApi.clearAll();
  });

  it('the PIN wins, and is what an author reaches for to set a well life', () => {
    const d = fixture([CHARGED]);
    expect(d.capacityOf(CHARGED)).toBe(50_000);
  });

  it('derives from the geometry when nothing is pinned', () => {
    const d = fixture([]);
    const body: FluidBody = { ...CHARGED, capacityL: undefined };
    // The leg is closureM × (1 − r) through an ellipse, and
    // ∫(1 − r) dA over an ellipse is π·a·b/3 — so a third of the
    // bounding prism, times the pore fraction.
    const expected = ((Math.PI * 200 * 120 * 30) / 3) * 0.2 * 1000;
    expect(d.capacityOf(body)).toBeCloseTo(expected, 3);
    // And porosity is read, not assumed.
    expect(d.capacityOf({ ...body, porosity: 0.4 })).toBeCloseTo(
      expected * 2,
      3,
    );
  });

  it('a body with no leg holds nothing, rather than throwing', () => {
    const d = fixture([]);
    expect(
      d.capacityOf({
        ...CHARGED,
        capacityL: undefined,
        trap: { ...CHARGED.trap, closureM: 0 },
      }),
    ).toBe(0);
  });
});
