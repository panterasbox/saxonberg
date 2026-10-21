/**
 * ⭐⭐ The diving bell (underwater C2, D26): the water rises inside it with
 * depth (Boyle — half full at ten meters); breathing in it fouls it; an
 * air barrel brought in freshens it.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Bell from '../thing/Bell';
import { Character } from '@saxonberg/server/mud/lib/character/Character';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { BiomeApi, type MediumRead } from '@saxonberg/server/mud/api/biome';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

class Body extends Character {}

function at(depthM: number): MediumRead {
  return { tag: 'water', substance: 'water', immersed: true, atSurface: false, temperatureK: 285, depthM, waterRef: null };
}

function bell(): Bell {
  return makeStuff(() => {
    const b = new Bell();
    b.airM3 = 1.5;
    b.setInteriorVolume(Quantity.of(1.5, 'm³'));
    b.setAtmosphere('air');
    return b;
  });
}

beforeEach(() => {
  StuffApi.clearAll();
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
});

afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the diving bell (C2)', () => {
  it('⭐ the water rises inside it with depth: half full at ten meters', () => {
    const b = bell();
    const read = vi.spyOn(BiomeApi, 'mediumFor');
    read.mockReturnValue(at(0));
    expect(b.waterlineFraction()).toBeCloseTo(0, 5);
    expect(b.airLitres()).toBeCloseTo(1500, 0);
    read.mockReturnValue(at(10));
    expect(b.waterlineFraction()).toBeCloseTo(0.5, 5);
    expect(b.airLitres()).toBeCloseTo(750, 0);
  });

  it('⭐ breathing in it fouls it; an air barrel freshens it', () => {
    const b = bell();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(at(4));
    vi.spyOn(b, 'exposure').mockReturnValue({ holdsAir: () => true } as never);
    const a = makeStuff(() => new Body());
    const c = makeStuff(() => new Body());
    ContainmentApi.move(a as never, b as never);
    ContainmentApi.move(c as never, b as never);
    const co2 = (): number =>
      b.getAtmosphereContents().reduce((sum, x) => sum + x.amount, 0);
    expect(co2()).toBe(0);
    b.foul(3600);
    const fouled = co2();
    expect(fouled).toBeGreaterThan(0.01);
    b.refresh(2000);
    expect(co2()).toBeLessThan(fouled / 2);
    void (a as unknown as Stuff);
  });
});
