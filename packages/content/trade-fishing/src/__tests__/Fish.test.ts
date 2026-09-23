/**
 * Fish (fishing D6) — the individual: a kept animal that can carry a
 * load, whose size is words and whose death reads as a band.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import WorldClockRegistry from '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import Species from '@saxonberg/server/mud/platform/idea/species/Species';
import Material from '@saxonberg/server/mud/lib/material/Material';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import Fish from '../agent/Fish';

let real = 100_000;
const augment = (f: Fish, text = 'A fish.'): string =>
  (Fish as unknown as { markupAugmenters: Array<(t: string, h: Stuff, v: Stuff) => string> }).markupAugmenters.reduce(
    (t, a) => a(t, f as unknown as Stuff, f as unknown as Stuff),
    text,
  );

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  makeStuffAtPath(() => new WorldClockRegistry(), '/platform/idea/WorldClockRegistry');
  WorldClockApi._resetForTesting();
  real = 100_000;
  WorldClockApi._setNowProviderForTesting(() => real);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('composition', () => {
  it('is a kept animal that can carry a load — and nothing else kept can', () => {
    const f = makeStuff(() => new Fish());
    expect(MixinApi.isBonded(f)).toBe(true);
    expect(MixinApi.isContaminable(f)).toBe(true);
    expect(MixinApi.isPostmortem(f)).toBe(true);
    expect(f.pinsResidency()).toBe(true);
  });
});

describe('sizeWords — never a number', () => {
  it('bands the length in anglers\' phrases', () => {
    const f = makeStuff(() => new Fish());
    f.setLengthM(0.25);
    expect(f.sizeWords()).toBe('a hand and a half long');
    f.setLengthM(0.8);
    expect(f.sizeWords()).toBe('as long as your arm');
    f.setLengthM(2);
    expect(f.sizeWords()).toBe('longer than you are tall');
    expect(augment(f)).toMatch(/It is longer than you are tall\./);
    expect(augment(f)).not.toMatch(/\d/);
  });

  it('an unstated length falls back to the species\' stature', () => {
    const sp = makeStuffAtPath(() => new Species(), '/stuff/idea/species/_test/fish');
    sp.setStature(0.4);
    const f = makeStuff(() => new Fish());
    f.setSpecies(sp);
    expect(f.effectiveLengthM()).toBe(0.4);
    expect(f.sizeWords()).toBe('a foot long');
  });
});

describe('the turned line', () => {
  it('a live fish reads no band; a dead one reads the band its flesh has reached, in words', () => {
    const flesh = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('flesh');
      m.setSpoilActivationEnergy(Quantity.of(60_000, 'J/mol'));
      m.setWaterActivity(0.99);
      return m;
    }, '/stuff/idea/material/_test/flesh') as unknown as Material;
    const f = makeStuff(() => new Fish());
    f.setMaterial(flesh);
    expect(augment(f)).not.toMatch(/dead|turned|rotten/);
    f.setLifecycleState('dead');
    f.markDeceasedAt(WorldClockApi.getNow().rawValue());
    expect(augment(f)).toMatch(/It is dead, and fresh\./);
    real += (3 * 86_400 / 12) * 1000; // three game-days
    expect(augment(f)).toMatch(/turned|rotten|beginning to turn/);
    expect(augment(f)).not.toMatch(/\d/);
  });
});
