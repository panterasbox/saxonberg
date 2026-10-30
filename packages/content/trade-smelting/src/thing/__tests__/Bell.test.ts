/**
 * ⭐ A bell's note follows from its size and its alloy (ceramics S19), and
 * a crack dulls it (M5).
 *
 *   - eight times the mass is an octave lower (the cube root);
 *   - the same shape in a soft, heavy metal (pewter) is lower and dull;
 *   - rung, it is loud by its mass (a great bell carries into the streets);
 *   - a flaw turns the note to a clank.
 */
import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import Bell from '../Bell';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { makeStuff, makeStuffAtPath } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';

const BRONZE = '/stuff/idea/material/_bell/bronze';
const PEWTER = '/stuff/idea/material/_bell/pewter';

function metal(path: string, density: number, hardness: number): Material {
  const found = StuffApi.findByTemplatePath<Material>(path);
  if (found) return found;
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(path.split('/').pop()!);
    m.setTags(['metal']);
    m.setDensity(Quantity.of(density, 'kg/m³'));
    m.setHardness(Quantity.of(hardness, 'MPa'));
    return m;
  }, path) as unknown as Material;
}

function bell(matPath: string, kg: number): Bell {
  const b = makeStuff(() => new Bell());
  b.setMaterial(StuffApi.findByTemplatePath<Material>(matPath)!);
  b.setMass(Quantity.of(kg, 'kg'));
  return b;
}

describe('a bell (ceramics S19)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    metal(BRONZE, 8800, 250);
    metal(PEWTER, 7900, 45);
  });

  it('⭐ eight times the mass rings an octave lower', () => {
    const hand = bell(BRONZE, 1);
    const big = bell(BRONZE, 8);
    expect(hand.pitchHz()).toBeCloseTo(900, 3);
    expect(big.pitchHz()).toBeCloseTo(hand.pitchHz() / 2, 6);
  });

  it('⭐ the same shape in pewter sounds lower than in bronze', () => {
    expect(bell(PEWTER, 1).pitchHz()).toBeLessThan(bell(BRONZE, 1).pitchHz() * 0.5);
  });

  it('names its note, and a great bell is loud enough to carry', () => {
    const hand = bell(BRONZE, 1);
    const great = bell(BRONZE, 150);
    expect(hand.ringSound().description).toMatch(/high|clear/);
    expect(great.ringSound().description).toMatch(/deep/);
    expect(great.ringSound().db).toBeGreaterThan(hand.ringSound().db + 20);
    expect(great.ringSound().rings).toBe(true);
  });

  it('⭐ a bell is a SIGNAL — Ringable and Audible: struck, it sounds from itself (review R2-D4)', () => {
    const b = bell(BRONZE, 120);
    expect(MixinApi.isRingable(b)).toBe(true);
    expect(MixinApi.isAudible(b)).toBe(true);
  });

  it('⚠ a crack dulls it to a clank', () => {
    const cracked = bell(BRONZE, 1);
    cracked.addFlaw('crack', false);
    const s = cracked.ringSound();
    expect(s.rings).toBe(false);
    expect(s.description).toMatch(/clank/);
  });
});
