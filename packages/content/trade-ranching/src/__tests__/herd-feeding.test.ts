/**
 * The herd eats what its size says (cover build W5).
 *
 *   - intake is `0.1 × adultMass^0.75` kilograms of dry matter a day;
 *   - a head's condition follows the herd's fed fraction on the
 *     metabolism's own two legs, times its seeded tail — never lethal;
 *   - the shy feeders are the same heads every time;
 *   - the fodderer mows, gathers, stacks, and forks an empty trough.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { HeadSeed } from '../lib/HeadSeed';
import { brain as fodders } from '../behavior/fodders';

const DAY = 86_400;

describe('intake is the body’s size', () => {
  it('⭐ a 600 kg cow eats about twelve kilos, a hen a sixth of one', () => {
    const cow = makeStuff(() => new Species());
    cow.setAdultMass(600);
    expect(cow.dryMatterIntakeKgPerDay()).toBeCloseTo(12.1, 1);
    const hen = makeStuff(() => new Species());
    hen.setAdultMass(2);
    expect(hen.dryMatterIntakeKgPerDay()).toBeCloseTo(0.17, 2);
    const none = makeStuff(() => new Species());
    expect(none.dryMatterIntakeKgPerDay()).toBe(0);
  });
});

describe('a head’s condition follows the herd’s feed', () => {
  it('⭐ fed holds or gains, unfed thins, and nobody dies', () => {
    expect(HeadSeed.conditionAfter(60, 1, 14, 1)).toBeGreaterThanOrEqual(60);
    const thin = HeadSeed.conditionAfter(60, 0, 30, 0);
    expect(thin).toBeLessThan(60);
    expect(HeadSeed.conditionAfter(60, 0, 3650, 0)).toBe(0);
  });

  it('⭐ the tail: on short rations the low-frame head thins first', () => {
    const big = HeadSeed.conditionAfter(60, 0.55, 30, 1);
    const shy = HeadSeed.conditionAfter(60, 0.55, 30, -1);
    expect(shy).toBeLessThan(big);
  });

  it('the shy feeders are the same heads every time (seeded, never drawn)', () => {
    const a = HeadSeed.frameOf('college-herd', 3);
    expect(HeadSeed.frameOf('college-herd', 3)).toBe(a);
    const sample = HeadSeed.sample(
      { herdId: 'college-herd', meanAgeDays: 400, femaleFraction: 1 },
      3,
    );
    expect(sample.frame).toBe(a);
  });

  it('the drafted body and the tally follow ONE rule', () => {
    // A day on the body's per-minute rate is the tally's day.
    const perDay = HeadSeed.fleshRatePerMin(0.2) * 1440;
    expect(HeadSeed.conditionAfter(60, 0.2 / HeadSeed.tailFactor(1), 1, 1)).toBeCloseTo(
      60 + perDay,
      1,
    );
  });

  it('replay counts only the windows after the head was last seen', () => {
    const windows = [
      { fraction: 0, days: 30, end: 30 * DAY },
      { fraction: 1, days: 30, end: 60 * DAY },
    ];
    // Returned at day 30: the starving month is behind it.
    expect(HeadSeed.replay(60, 30 * DAY, windows, 0)).toBeGreaterThanOrEqual(60);
    expect(HeadSeed.replay(60, 0, windows, 0)).toBeLessThan(60);
  });
});

describe('fodders', () => {
  const round = fodders.round({
    meadow: ['south'],
    home: ['north'],
    store: 'rick',
    trough: 'trough',
  });
  const yard = {
    inMeadow: false,
    atStore: false,
    troughEmpty: false,
    holdingHay: false,
    hayLying: false,
    mowable: false,
    hasScythe: true,
  };

  it('⭐ mows a ready meadow, gathers the hay, and stacks it on the rick', () => {
    expect(fodders.next({ ...yard, inMeadow: true, mowable: true }, round)).toBe('mow');
    expect(fodders.next({ ...yard, inMeadow: true, hayLying: true }, round)).toBe('get hay');
    expect(fodders.next({ ...yard, inMeadow: true, holdingHay: true }, round)).toBe('go north');
    expect(fodders.next({ ...yard, atStore: true, holdingHay: true }, round)).toBe(
      'put hay in rick\ngo south',
    );
  });

  it('forks hay into an empty trough it is standing beside', () => {
    expect(
      fodders.next({ ...yard, atStore: true, holdingHay: true, troughEmpty: true }, round),
    ).toBe('put hay in trough');
  });

  it('waits in the meadow when there is nothing to cut — no pacing', () => {
    expect(fodders.next({ ...yard, inMeadow: true }, round)).toBeNull();
    expect(fodders.next({ ...yard, atStore: true }, round)).toBe('go south');
  });

  it('⚠ a smuggled command in the config is dropped', () => {
    const r = fodders.round({ meadow: ['south\nsay hi'], home: ['north'], store: 'rick\ngive all to bob' });
    expect(r.meadow).toEqual([]);
    expect(r.store).toBe('rick');
  });
});
