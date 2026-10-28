/**
 * The field feeds its grazers (cover build W4): the grazing ledger, the
 * trough that feeds what the grass did not, and the rick a trough is kept
 * from.
 *
 *   - a herd on the field eats the sward down at its demand;
 *   - the shortfall comes out of a trough standing on the field, by mass,
 *     and only a trough of a kind the herd eats from;
 *   - an empty trough kept from a store draws on the store;
 *   - each herd's line knows what it was given against what it wanted;
 *   - `look` names the herd grazing it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Field from '../location/Field';
import Feeder from '@saxonberg/server/mud/platform/thing/Feeder';
import Provision from '@saxonberg/server/mud/platform/thing/Provision';
import Vessel from '@saxonberg/server/mud/platform/thing/Vessel';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';

const DAY = 86_400;
let seq = 0;

function hayMaterial(): Material {
  seq += 1;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName('hay');
    m.setEdibility(true);
    return m;
  }, `/stuff/idea/material/_test/hay-${seq}`) as unknown as Material;
}

function bale(kg: number): Provision {
  const b = makeStuff(() => new Provision());
  b.setShortDescription('bale of hay');
  b.setMaterial(hayMaterial());
  b.setMass(Quantity.of(kg, 'kg'));
  return b;
}

function trough(kind: 'trough' | 'hopper' = 'trough'): Feeder {
  const t = makeStuff(() => new Feeder());
  t.setShortDescription('trough');
  t.setFeederKind(kind);
  return t;
}

function field(area = 400): Field {
  const f = makeStuff(() => new Field());
  f.setAreaM2(area);
  f.installSward();
  // ⭐ Deep winter: nothing grows, so every kilo the herd eats is one the
  // test can account for.
  f._ambientK = 270;
  f._daylightFraction = 0.3;
  return f;
}

function massOf(s: { getMass(): Quantity<'kg'> }): number {
  return s.getMass().rawValue();
}

describe('the field feeds its grazers', () => {
  let clock: ReturnType<typeof vi.spyOn>;
  let base: number;
  const at = (days: number): void => {
    clock.mockReturnValue(Quantity.of(base + days * DAY, 's'));
  };

  beforeEach(() => {
    if (!StuffApi.findByTemplatePath('/platform/idea/WorldClockRegistry')) {
      makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
    }
    base = WorldClockApi.getNow().rawValue();
    clock = vi.spyOn(WorldClockApi, 'getNow');
    clock.mockReturnValue(Quantity.of(base, 's'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function settle(f: Field): void {
    // First touch stamps the sward clock; integrate from here.
    f.standingDryMatterKg();
  }

  it('⭐ a herd on the field eats the sward at its demand', () => {
    const f = field(400); // 120 kg ceiling, 60 at the residual
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of cattle', demandKgPerDay: 5, feederKinds: ['trough'] });
    const before = f.standingDryMatterKg();
    at(4);
    expect(before - f.standingDryMatterKg()).toBeCloseTo(20, 0);
    const line = f.grazerLedger('herd-a')!;
    expect(line.demandKg).toBeCloseTo(20, 0);
    expect(line.fedKg).toBeCloseTo(20, 0);
  });

  it('⭐ the shortfall comes out of a trough on the field, by mass', () => {
    const f = field(40); // 12 kg ceiling, 6 at the residual — soon gone
    const t = trough();
    ContainmentApi.move(t, f as never);
    const b = bale(25);
    ContainmentApi.move(b, t);
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of cattle', demandKgPerDay: 10, feederKinds: ['trough'] });
    at(2);
    f.standingDryMatterKg();
    // 20 kg wanted: the sward gave its 6, the trough the other 14.
    expect(massOf(b)).toBeCloseTo(11, 0);
    const fold = f.foldGrazer('herd-a')!;
    expect(fold.fraction).toBeCloseTo(1, 1);
  });

  it('a trough of a kind the herd does not eat from feeds nothing', () => {
    const f = field(40);
    const t = trough('hopper');
    ContainmentApi.move(t, f as never);
    const b = bale(25);
    ContainmentApi.move(b, t);
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of cattle', demandKgPerDay: 10, feederKinds: ['trough'] });
    at(2);
    f.standingDryMatterKg();
    expect(massOf(b)).toBe(25);
    expect(f.foldGrazer('herd-a')!.fraction).toBeLessThan(0.5);
  });

  it('⭐ an empty trough kept from a rick draws on the rick', () => {
    const f = field(40);
    const rick = makeStuffAtPath(() => new Vessel(), '/test/farm/thing/_rick');
    const stacked = bale(25);
    ContainmentApi.move(stacked, rick);
    const t = trough();
    t.setSuppliedBy('/test/farm/thing/_rick');
    ContainmentApi.move(t, f as never);
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of cattle', demandKgPerDay: 10, feederKinds: ['trough'] });
    at(2);
    f.standingDryMatterKg();
    expect(massOf(stacked)).toBeCloseTo(11, 0);
  });

  it('demand is shared between two herds by what each wants', () => {
    const f = field(400);
    settle(f);
    f.setGrazer('big', { label: 'the cows', demandKgPerDay: 9, feederKinds: [] });
    f.setGrazer('small', { label: 'the ewes', demandKgPerDay: 3, feederKinds: [] });
    expect(f.swardGrazingDemandPerGameDay()).toBeCloseTo(12);
    at(2);
    const big = f.grazerLedger('big')!;
    const small = f.grazerLedger('small')!;
    expect(big.fedKg / small.fedKg).toBeCloseTo(3, 1);
  });

  it('clearing a herd takes its demand off the field', () => {
    const f = field(400);
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of cattle', demandKgPerDay: 5, feederKinds: [] });
    expect(f.clearGrazer('herd-a')).not.toBeNull();
    expect(f.grazerIds()).toEqual([]);
    expect(f.swardGrazingDemandPerGameDay()).toBe(0);
  });

  it('look names the herd grazing it', () => {
    const f = field(400);
    settle(f);
    f.setGrazer('herd-a', { label: 'six head of the college herd', demandKgPerDay: 5, feederKinds: [] });
    expect(f.fieldLines().join(' ')).toMatch(/Six head of the college herd are grazing it\./);
  });
});
