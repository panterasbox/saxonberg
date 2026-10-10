/**
 * ⭐ The cheese vat (dairy D7): the kernel's `Vat`, worked by this pack's
 * profiles. A whey crock pitches it; rennet turns it firm; the set splits
 * it into whey over a curd; the drained whey is next time's starter; and a
 * vat taken past the scald sets badly.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '@saxonberg/server/mud/platform/thing/Vat';
import { BulkableApi } from '@saxonberg/server/mud/api/bulk';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import { MAT, readRow } from './rows';
import { standUp, tearDown, at, vessel, TestPail, HOUR, DAY } from './world';

const mat = (p: string): Material => StuffApi.findByTemplatePath<Material>(p)!;

/** A vat built from a shipped row's interior fields. */
function vatFromRow(rowPath: string, tempK: number): Vat {
  const d = readRow(rowPath).data as Record<string, unknown>;
  const fill =
    typeof d.interiorMaterial === 'string'
      ? { material: mat(d.interiorMaterial), litres: Number(d.interiorAmount) }
      : undefined;
  const v = vessel(() => new Vat(), Number(d.interiorCapacity), tempK, fill);
  v.setOpen(true);
  v.getMaturationPhase();
  return v;
}

function pour(from: Vat | TestPail, to: Vat | TestPail, litres?: number): number {
  return BulkableApi.transfer(
    BulkableApi.slotFor(from, undefined)!,
    BulkableApi.slotFor(to, undefined)!,
    litres === undefined
      ? { kind: 'all' }
      : { kind: 'measure', litres, mode: 'strict' },
  ).applied;
}

/** A cheese vat of cow's milk, pitched from a fresh starter crock. */
function pitchedVat(tempK = 303): Vat {
  const vat = vatFromRow('/trade/dairying/thing/cheese-vat', tempK);
  pour(vessel(() => new TestPail(), 20, tempK, { material: mat(MAT.milk), litres: 10 }), vat);
  vat.getMaturationPhase();
  const crock = vatFromRow('/trade/dairying/thing/starter-crock', tempK);
  expect(crock.getBatchStrain()).toBe('lactic');
  expect(pour(crock, vat, 0.2)).toBeCloseTo(0.2, 6);
  return vat;
}

describe('the cheese vat', () => {
  beforeEach(standUp);
  afterEach(tearDown);

  it('the starter crock is a living culture, and pitching holds spoilage off', () => {
    at(0);
    const vat = pitchedVat();
    expect(vat.getMaturationProfileKey()).toBe('soft-curd');
    expect(vat.getBatchStrain()).toBe('lactic');
    expect(vat.holdsSpoilage()).toBe(true);
  });

  it('it sets soft: whey over a curd, and the curd is what stays', () => {
    at(0);
    const vat = pitchedVat();
    at(DAY);
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(MAT.whey);
    const pail = vessel(() => new TestPail(), 20, 303);
    const drawn = pour(vat, pail);
    expect(pail.getBulkMaterialPath('interior')).toBe(MAT.whey);
    // Cow's milk: (fat + protein) × 2.4 = 16 % curd.
    const total = 10.2;
    expect(drawn).toBeCloseTo(total * (1 - 2.4 * (0.034 + 0.033)), 2);
    vat.getMaturationPhase(); // the lees split, at the floor
    expect(vat.getBulkMaterialPath('interior')).toBe(MAT.softCurd);
    expect(vat.getBulkAvailable('interior')).toBeCloseTo(total - drawn, 4);
  });

  it('rennet turns it firm, whatever the order', () => {
    at(0);
    const vat = pitchedVat();
    const jar = vatFromRow('/trade/dairying/thing/rennet-jar', 303);
    expect(pour(jar, vat, 0.05)).toBeCloseTo(0.05, 6);
    expect(vat.getMaturationProfileKey()).toBe('firm-curd');
    expect(vat.getBatchStrain()).toBe('lactic');
    at(DAY);
    pour(vat, vessel(() => new TestPail(), 20, 303));
    vat.getMaturationPhase();
    expect(vat.getBulkMaterialPath('interior')).toBe(MAT.firmCurd);
  });

  it('the drained whey, poured into an empty crock, is a living starter', () => {
    at(0);
    const vat = pitchedVat();
    at(DAY);
    const crock = vessel(() => new Vat(), 3, 290);
    pour(vat, crock, 1);
    expect(crock.getBulkMaterialPath('interior')).toBe(MAT.whey);
    expect(crock.getMaturationProfileKey()).toBe('whey-starter');
    expect(crock.getBatchStrain()).toBe('lactic');
  });

  it('milk boiled before it sets, sets badly; a pasteurizing hold does not', () => {
    at(0);
    const boiled = vatFromRow('/trade/dairying/thing/cheese-vat', 365);
    pour(vessel(() => new TestPail(), 20, 365, { material: mat(MAT.milk), litres: 10 }), boiled);
    const held = vatFromRow('/trade/dairying/thing/cheese-vat', 336);
    pour(vessel(() => new TestPail(), 20, 336, { material: mat(MAT.milk), litres: 10 }), held);
    boiled.getMaturationPhase();
    held.getMaturationPhase();
    at(HOUR);
    boiled.getMaturationPhase();
    held.getMaturationPhase();
    expect(boiled.getBatchPeakK()).toBeGreaterThan(355);
    expect(held.getBatchPeakK()).toBeLessThan(355);
    const band = (v: Vat): string => (v as unknown as { getGradeBand(): string }).getGradeBand();
    expect(band(boiled)).toBe('poor');
    expect(band(held)).not.toBe('poor');
  });
});
