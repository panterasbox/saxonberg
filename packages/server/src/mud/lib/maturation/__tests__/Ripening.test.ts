/**
 * ⭐ Ripening (dairy D9) — the discrete twin of maturation: a wheel of
 * cheese converts on a shelf by its own temperature, through the same
 * `MaturationProfile` rows a vat reads, matched by the wheel's own
 * material tags. Young → coming on → ripe; a soft cheese goes over; a hard
 * one climbs for months; too warm and the rind's flora dies for good.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Provision from '../../../platform/thing/Provision';
import Material from '../../material/Material';
import MaturationProfile from '../MaturationProfile';
import { RipeningMixin } from '../Ripening';
import { Grade } from '../../craft/Grade';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import type { Stuff } from '../../stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import '../../../platform/idea/WorldClockRegistry';

class TestWheel extends RipeningMixin(Provision) {
  static _mixinName = 'TestRipeningWheel';
}

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const SOFT = '/stuff/idea/ripening-test/idea/material/soft-cheese';
const HARD = '/stuff/idea/ripening-test/idea/material/hard-cheese';

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('soft cheese');
    m.setTags(['food', 'soft-cheese']);
    return m;
  }, SOFT);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('hard cheese');
    m.setTags(['food', 'hard-cheese']);
    return m;
  }, HARD);
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-soft-ripening');
    p.setInputCategory('soft-cheese');
    p.setStallBelowK(275);
    p.setHappyK(284);
    p.setDamageAboveK(291);
    p.setKillK(300);
    p.setRatePerDay(0.14);
    p.productAtFraction = 0.3;
    p.setTurnedMaterial(SOFT);
    p.setTurnDays(4);
    return p;
  }, '/stuff/idea/ripening-test/idea/maturation/soft');
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-hard-ripening');
    p.setInputCategory('hard-cheese');
    p.setStallBelowK(275);
    p.setHappyK(284);
    p.setDamageAboveK(291);
    p.setKillK(300);
    p.setRatePerDay(0.0167);
    p.productAtFraction = 0.3;
    return p;
  }, '/stuff/idea/ripening-test/idea/maturation/hard');
}

function wheel(path: string, tempK = 284): TestWheel {
  const w = makeStuff(() => new TestWheel());
  w.setMaterial(StuffApi.findByTemplatePath<Material>(path)!);
  pin(w, tempK);
  return w;
}

/** Ambient AND current — no drift in play (the Maturing harness rule). */
function pin(w: TestWheel, tempK: number): void {
  (w as unknown as { lastAmbientK: number }).lastAmbientK = tempK;
  (w as unknown as { stampedTemperatureK: number }).stampedTemperatureK = tempK;
}

/** Game-days until the wheel first reads `phase`, stepping half-days. */
function daysUntil(w: TestWheel, phase: string, maxDays: number): number {
  for (let h = 1; h <= maxDays * 2; h++) {
    setNow((h / 2) * DAY);
    pin(w, 284);
    if (w.getRipeningPhase() === phase) return h / 2;
  }
  return Infinity;
}

describe('ripening — a wheel on a shelf', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    setNow(0);
    WorldClockApi._setNowProviderForTesting(() => now);
    WorldClockApi.setScale(1000);
    standFixtures();
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('a soft wheel at 284 K is ripe in about a week, and goes over after its days', () => {
    const w = wheel(SOFT);
    expect(w.getRipeningPhase()).toBe('active');
    expect(w.holdsSpoilage()).toBe(true);
    const ripe = daysUntil(w, 'finished', 20);
    expect(ripe).toBeGreaterThanOrEqual(6.5);
    expect(ripe).toBeLessThanOrEqual(7.5);
    expect(w.holdsSpoilage()).toBe(false);
    const over = daysUntil(w, 'turned', 20);
    expect(over - ripe).toBeGreaterThanOrEqual(3.5);
    expect(over - ripe).toBeLessThanOrEqual(4.5);
    expect(w.getGradeBand()).toBe('poor');
  });

  it('a hard wheel climbs for two months and never turns', () => {
    const w = wheel(HARD);
    w.getRipeningPhase();
    setNow(30 * DAY);
    pin(w, 284);
    expect(w.getRipeningPhase()).toBe('active');
    const ripe = daysUntil(w, 'finished', 90);
    expect(ripe).toBeGreaterThanOrEqual(55);
    expect(ripe).toBeLessThanOrEqual(65);
    setNow(200 * DAY);
    pin(w, 284);
    expect(w.getRipeningPhase()).toBe('finished');
    expect(w.getGradeBand()).toBe('masterful');
  });

  it('kept too warm, the rind dies — and stays dead', () => {
    const w = wheel(SOFT);
    w.getRipeningPhase();
    setNow(1 * DAY);
    pin(w, 305);
    expect(w.getRipeningPhase()).toBe('killed');
    setNow(3 * DAY);
    pin(w, 284);
    expect(w.getRipeningPhase()).toBe('killed');
    expect(w.holdsSpoilage()).toBe(false);
    expect(w.getGradeBand()).toBe('poor');
  });

  it('the band never falls while it ripens well', () => {
    const w = wheel(SOFT);
    w.getRipeningPhase();
    let last = -1;
    for (let d = 1; d <= 7; d++) {
      setNow(d * DAY);
      pin(w, 284);
      const ord = Grade.of(w.getGradeBand()).getOrdinal();
      expect(ord).toBeGreaterThanOrEqual(last);
      last = ord;
    }
    expect(Grade.of(w.getGradeBand()).getOrdinal()).toBeGreaterThan(
      Grade.of('poor').getOrdinal(),
    );
  });

  it('speaks on look and taste, not smell — and never a digit', () => {
    const w = wheel(SOFT);
    const aug = (TestWheel as unknown as {
      markupAugmenters: ((t: string, h: Stuff, v: Stuff, o?: { filter?: readonly string[] }) => string)[];
    }).markupAugmenters.find((a) => a.name === 'ripeningAugmenter')!;
    expect(aug).toBeDefined();
    expect(aug('', w, w)).toMatch(/young/);
    expect(aug('', w, w, { filter: ['taste'] })).toMatch(/young/);
    expect(aug('base', w, w, { filter: ['smell'] })).toBe('base');
    const lines: string[] = [];
    for (let d = 0; d <= 12; d++) {
      setNow(d * DAY);
      pin(w, 284);
      lines.push(w.ripenessLine() ?? '');
    }
    setNow(13 * DAY);
    pin(w, 305);
    lines.push(w.ripenessLine() ?? '');
    for (const l of lines) expect(l).not.toMatch(/\d/);
    expect(new Set(lines).size).toBeGreaterThanOrEqual(4);
  });
});
