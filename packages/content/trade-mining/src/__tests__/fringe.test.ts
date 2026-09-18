/**
 * ⭐⭐ **The distal fringe, checked against the numbers Rejection
 * actually ships.**
 *
 * `Deposit.test.ts` proves the lateral MECHANISM against a synthetic
 * fixture. This file proves the AUTHORED CASE: that the four zone bands,
 * the halo, the strike, the depletion box and the four fringe rooms in
 * the venue pack add up to the thing the design claims — iron you can
 * walk to, above the water table, outside the old men's ground, in
 * nobody's adit.
 *
 * ⚠ It reads the shipped rows on purpose, and that is the point. Every
 * number here is a fact about a PLACE, and a synthetic fixture would
 * have passed identically while Rejection's own `alongFrom` was a
 * typo. The geometry is the fragile part: move the strike by five
 * degrees and the rooms are off the lode with nothing complaining.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Deposit from '../idea/Deposit';
import type { Point } from '../idea/Deposit';

const HERE = dirname(fileURLToPath(import.meta.url));
const REJECTION = join(HERE, '..', '..', '..', 'rejection', 'content', 'world', 'rejection');

const GOETHITE = '/stuff/idea/material/mineral/goethite';
const SIDERITE = '/stuff/idea/material/mineral/siderite';
const MALACHITE = '/stuff/idea/material/mineral/malachite';
const CHALCOPYRITE = '/stuff/idea/material/mineral/chalcopyrite';

/** The cell size of Rejection's pithead zone — ten metres. */
const CELL = 10;

function row(rel: string): Record<string, unknown> {
  return YAML.parse(readFileSync(join(REJECTION, rel), 'utf8')) as Record<string, unknown>;
}

/** The authored shape of the Ferrow row's `data:` block. */
interface FerrowData {
  name: string;
  stratigraphy: Parameters<Deposit['setStratigraphy']>[0];
  waterTable: number;
  lode: Parameters<Deposit['setLode']>[0];
  zones: Parameters<Deposit['setZones']>[0];
  depletion: Parameters<Deposit['setDepletion']>[0];
  features: Parameters<Deposit['setFeatures']>[0];
}

/** The SHIPPED Ferrow row, stood up as a live `Deposit`. */
function ferrow(): Deposit {
  const data = row('idea/deposit/ferrow.yaml').data as FerrowData;
  const d = makeStuff(() => new Deposit());
  d.setName(data.name);
  d.setStratigraphy(data.stratigraphy);
  d.setWaterTable(data.waterTable);
  d.setLode(data.lode);
  d.setZones(data.zones);
  d.setDepletion(data.depletion);
  d.setFeatures(data.features);
  return d;
}

/** A room's authored cell, in the deposit's own metres. */
function metresOf(rel: string): Point {
  const c = (row(rel).data as { coords: { x: number; y: number; z: number } }).coords;
  return [c.x * CELL, c.y * CELL, c.z * CELL];
}

const SEED = Deposit.seedFor('terminus/rejection');

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  for (const [path, mpa] of [
    ['/stuff/idea/material/rock/slate', 90],
    ['/stuff/idea/material/rock/granite', 200],
    [MALACHITE, 200],
    [GOETHITE, 450],
  ] as const) {
    const m = makeStuffAtPath(() => new Material(), path);
    (m as unknown as { hardness: Quantity<'MPa'> }).hardness = Quantity.of(mpa, 'MPa');
  }
});

describe('the Ferrow body is zoned along strike as well as down', () => {
  it('⭐⭐ the heart is COPPER and the fringe is IRON, at one depth', () => {
    const d = ferrow();
    // Under the yard, 20 m out: the oxide cap the co-op works.
    expect(d.sampleAt([0, 20, -10], SEED).mineralPath).toBe(MALACHITE);
    // Ninety metres out along the same plane: rust.
    const fringe = metresOf('location/fringe-claim.yaml');
    expect(d.sampleAt(fringe, SEED).mineralPath).toBe(GOETHITE);
  });

  it('⭐ and it is zoned DOWN underneath both — the two axes are independent', () => {
    const d = ferrow();
    // Below the water table the heart goes to sulfide…
    expect(d.bandAt(-200, 20)!.mineral).toBe(CHALCOPYRITE);
    // …and the fringe goes to carbonate. Neither is reachable in Stage A.
    expect(d.bandAt(-200, 140)!.mineral).toBe(SIDERITE);
  });

  it('⭐ the fringe is symmetric — the far END of the strike is iron too', () => {
    const d = ferrow();
    expect(d.bandAt(-10, 140)!.mineral).toBe(GOETHITE);
    expect(d.bandAt(-10, -140)!.mineral).toBe(GOETHITE);
  });
});

describe('the four fringe rooms sit where the geology says they do', () => {
  const ROOMS = {
    hillside: 'location/hillside.yaml',
    'old workings': 'location/old-workings.yaml',
    'fringe claim': 'location/fringe-claim.yaml',
    'far fringe': 'location/far-fringe.yaml',
  } as const;

  it('⚠ every one of them is ON the lode — a room off the plane yields nothing', () => {
    const d = ferrow();
    for (const [name, rel] of Object.entries(ROOMS)) {
      const at = metresOf(rel);
      // The hillside is the connector and is deliberately barren-ish;
      // the three that matter must be in the body.
      if (name === 'hillside') continue;
      expect(d.isInLode(at), `${name} is off the lode`).toBe(true);
    }
  });

  it('⭐⭐ the fringe rooms carry IRON and the near ones carry COPPER', () => {
    const d = ferrow();
    expect(d.sampleAt(metresOf(ROOMS['old workings']), SEED).mineralPath).toBe(MALACHITE);
    expect(d.sampleAt(metresOf(ROOMS['fringe claim']), SEED).mineralPath).toBe(GOETHITE);
    expect(d.sampleAt(metresOf(ROOMS['far fringe']), SEED).mineralPath).toBe(GOETHITE);
  });

  it('⭐⭐ the iron is OUTSIDE the old men’s box and the copper is inside it', () => {
    const d = ferrow();
    const box = (row('idea/deposit/ferrow.yaml').data as {
      depletion: Array<{ from: number[]; to: number[]; scale: number }>;
    }).depletion[0]!;
    const inBox = (at: Point): boolean =>
      at[0] >= box.from[0]! && at[0] <= box.to[0]! &&
      at[1] >= box.from[1]! && at[1] <= box.to[1]! &&
      at[2] >= box.from[2]! && at[2] <= box.to[2]!;
    // The played-out ground is the lesson; the fringe is the reward.
    expect(inBox(metresOf(ROOMS['old workings']))).toBe(true);
    expect(inBox(metresOf(ROOMS['fringe claim']))).toBe(false);
    expect(inBox(metresOf(ROOMS['far fringe']))).toBe(false);
    // …and the lean is real where it applies, so the two are not the
    // same ground with two names.
    expect(box.scale).toBeLessThan(1);
    expect(d.sampleAt(metresOf(ROOMS['old workings']), SEED).grade).toBeLessThan(0.07);
  });

  it('⭐⭐ every fringe room is ABOVE the water table — no shaft, no pump, no commons', () => {
    const d = ferrow();
    for (const rel of Object.values(ROOMS)) {
      const at = metresOf(rel);
      expect(at[2]).toBeGreaterThan(d.getWaterTable());
      // …and dry, which is what makes it Stage A ground.
      expect(d.waterAt(at[2])).toBe(0);
    }
  });

  it('⚠⚠ nothing reads as ore in the SKY above them', () => {
    const d = ferrow();
    for (const rel of Object.values(ROOMS)) {
      const at = metresOf(rel);
      const above: Point = [at[0], at[1], at[2] + CELL];
      const sample = d.sampleAt(above, SEED);
      expect(sample.grade).toBe(0);
      expect(sample.mineralPath).toBeNull();
    }
  });
});

describe('the claim geometry the fringe rooms were placed to satisfy', () => {
  /** What `stake` writes: three cells each way, one up and one down. */
  const BLOCK_HALF = 3;

  it('⭐⭐ the far fringe is stakeable and the independent’s ground is not', () => {
    const blocks = (row('idea/ferrow-warren.yaml').data as {
      claimBlocks: Array<{ parcelExtent: string; from: number[]; to: number[] }>;
    }).claimBlocks;
    const cellOf = (rel: string): [number, number, number] => {
      const c = (row(rel).data as { coords: { x: number; y: number; z: number } }).coords;
      return [c.x, c.y, c.z];
    };
    /** `MineWarren.claimFor` — it tests the CENTRE cell, and only that. */
    const claimFor = (cell: [number, number, number]) =>
      blocks.find((b) =>
        cell.every((v, i) => v >= b.from[i]! && v <= b.to[i]!),
      ) ?? null;

    // The independent walked out here first, and first come is the rule.
    expect(claimFor(cellOf('location/fringe-claim.yaml'))?.parcelExtent)
      .toBe('/world/rejection/ferrow/claims/2');
    // Further on, nobody has spoken for it.
    expect(claimFor(cellOf('location/far-fringe.yaml'))).toBeNull();
  });

  it('⭐⭐ the two blocks do not RUN INTO each other — extents, not centres', () => {
    const a = (row('location/fringe-claim.yaml').data as { coords: { x: number; y: number } }).coords;
    const b = (row('location/far-fringe.yaml').data as { coords: { x: number; y: number } }).coords;
    // ⚠ Seven cells of clearance on an axis, not four. A block is
    // BLOCK_HALF each way, so two centres four apart still SHARE nine
    // columns of ground — which `stake` used to admit, because it tested
    // the centre cell instead of the block. The far fringe moved out to
    // (10,14,0) when that was fixed.
    const clear =
      Math.abs(a.x - b.x) > BLOCK_HALF * 2 || Math.abs(a.y - b.y) > BLOCK_HALF * 2;
    expect(
      clear,
      `blocks centred ${JSON.stringify(a)} and ${JSON.stringify(b)} overlap — ` +
        `a staked claim there would be refused and the drive would break`,
    ).toBe(true);
  });
});
