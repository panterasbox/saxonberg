/**
 * ⭐ Semmelweis (cleanliness W5, D14): the clean tiers are derived from what
 * was done since the last deposit — a raw bandage is only presentable,
 * a washed one clean, hot water and soap sanitise, a held boil
 * disinfects, a flame sterilises — and the wound reads them: a dressing
 * short of disinfected, a surgical kit short of sterile, seed sepsis.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Bandage from '../../../platform/thing/Bandage';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Trauma } from '../../../platform/idea/Condition';

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

const WASH = {
  waterK: 290,
  hardnessDgh: 4,
  cleansers: [],
  effort: 1,
  coWashed: [],
};

function cut(): Trauma {
  return {
    kind: 'trauma',
    type: 'laceration',
    site: 'body.arm.left',
    severity: 2,
    bleeding: true,
  };
}

describe('the tiers are derived (D14)', () => {
  it('raw is presentable, washed is clean, boiled is disinfected', () => {
    const b = makeStuff(() => new Bandage());
    expect(b.cleanTier()).toBe('presentable');
    b.washSite(WASH, '');
    expect(b.cleanTier()).toBe('clean');
    b.recordHeat(373, 300);
    expect(b.cleanTier()).toBe('disinfected');
  });

  it('a flame past 433 K for a minute sterilises', () => {
    const b = makeStuff(() => new Bandage());
    b.recordHeat(750, 60);
    expect(b.cleanTier()).toBe('sterile');
  });

  it('a deposit undoes it — a boiled bandage dropped in the mud is dirty', () => {
    const b = makeStuff(() => new Bandage());
    b.recordHeat(373, 300);
    b.soil('mud', 3);
    expect(b.cleanTier()).toBe('dirty');
  });

  it('⭐ a dressing is as good as it is clean', () => {
    const raw = makeStuff(() => new Bandage());
    const boiled = makeStuff(() => new Bandage());
    boiled.recordHeat(373, 300);
    expect(raw.getDressingQuality()).toBeLessThan(boiled.getDressingQuality());
    expect(boiled.getDressingQuality()).toBe(1);
  });
});

describe('the wound reads them (AC 18)', () => {
  it('⭐⭐ clean hands, a RAW bandage — seeded; a BOILED one — not', () => {
    const a = makeStuff(() => new Creature());
    const wa = cut();
    a.afflict(wa);
    const raw = a.applyTreatment(wa, {
      by: 'dressing',
      efficacy: 1,
      treater: makeStuff(() => new Creature()),
      dressingTier: 'presentable',
    });
    expect(raw.seededInfection).toBe(true);

    const b = makeStuff(() => new Creature());
    const wb = cut();
    b.afflict(wb);
    const boiled = b.applyTreatment(wb, {
      by: 'dressing',
      efficacy: 1,
      treater: makeStuff(() => new Creature()),
      dressingTier: 'disinfected',
    });
    expect(boiled.seededInfection).toBe(false);
  });

  it('⭐⭐ surgery with a washed kit seeds; with a flamed one it does not', () => {
    const a = makeStuff(() => new Creature());
    const wa = cut();
    a.afflict(wa);
    expect(
      a.applyTreatment(wa, {
        by: 'surgery',
        efficacy: 1,
        treater: makeStuff(() => new Creature()),
        instrumentTier: 'clean',
      }).seededInfection,
    ).toBe(true);
    const b = makeStuff(() => new Creature());
    const wb = cut();
    b.afflict(wb);
    expect(
      b.applyTreatment(wb, {
        by: 'surgery',
        efficacy: 1,
        treater: makeStuff(() => new Creature()),
        instrumentTier: 'sterile',
      }).seededInfection,
    ).toBe(false);
  });
});
