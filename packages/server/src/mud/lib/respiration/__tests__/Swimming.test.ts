/**
 * ⭐⭐ Staying up, going under, and the weight of the water (underwater A4,
 * D12–D15).
 *
 *  1. Buoyancy is a read: a body with its lungs full floats; an iron
 *     ingot in hand sinks it; weight is the only thing that refuses the
 *     way up.
 *  2. Under water an air voice is bubbles; a body in the drowning
 *     response has no breath to call out with.
 *  3. Going down without clearing your ears hurts, then bursts;
 *     `equalize` between bands prevents both.
 *  4. Floating is free for a swimmer and refused, in words, for a body
 *     that cannot swim.
 *  5. An untrained body treading water spends itself, goes into the
 *     drowning response, and goes under.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { Character } from '../../character/Character';
import Location from '../../stuff/Place';
import Good from '../../../platform/thing/Good';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { SchedulerApi } from '../../../api/scheduler';
import { ContainmentApi } from '../../../api/containment';
import { BiomeApi, type MediumRead } from '../../../api/biome';
import { EventApi } from '../../../api/event';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { TemplatePaths } from '../../paths';
import { RESPIRATION_DEFAULTS } from '../Respiration';
import { Quantity } from '../../quantity';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { installCorpseMintStub } from '../../mortality/__tests__/corpse-mint-test-helpers';

class TestLocation extends Location {}
class TestCharacter extends Character {}
class Ingot extends Good {}

const TICK_MS = RESPIRATION_DEFAULTS.EMISSION_INTERVAL_MS;
function tick(n = 1): void {
  for (let i = 0; i < n; i++) WorldClockApi._advanceForTesting(TICK_MS);
}

async function settle(): Promise<void> {
  for (let i = 0; i < 5; i++) await new Promise((r) => setTimeout(r, 0));
}

function water(depthM: number, atSurface = false): MediumRead {
  return {
    tag: 'water', substance: 'water', immersed: true, atSurface,
    temperatureK: 293, depthM, waterRef: null,
  };
}

function airRoom(): TestLocation {
  const r = makeStuff(() => new TestLocation());
  r.setAtmosphere('air');
  return r;
}

function body(): TestCharacter {
  const c = makeStuff(() => new TestCharacter());
  c.setMass(Quantity.of(70, 'kg'));
  return c;
}

function ingot(kg: number): Ingot {
  const i = makeStuff(() => new Ingot());
  i.setMass(Quantity.of(kg, 'kg'));
  vi.spyOn(i, 'getMaterial').mockReturnValue({ getDensity: () => Quantity.of(7800, 'kg/m³') } as never);
  return i;
}

describe('the weight of the water (underwater A4)', () => {
  beforeAll(async () => {
    WorldClockApi._resetForTesting();
    EventApi._clearAllForTesting();
    const reg = await StuffApi.create(() => {
      const r = new EventRegistry();
      Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
      return r;
    });
    StuffApi.unregister(reg);
    StuffApi.register(reg);
    EventApi._setRegistryForTesting(reg);
  });
  beforeEach(() => {
    installV1QuantityMarshallers();
    installCorpseMintStub();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    SchedulerApi._clearAllForTesting();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    SchedulerApi._clearAllForTesting();
    WorldClockApi._resetForTesting();
  });

  it('⭐ lungs full, a body floats; an iron ingot in hand sinks it', async () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    await settle();
    await c.inhale();
    expect(c.getNetBuoyancyN(1000, 0)).toBeGreaterThan(0);
    ContainmentApi.move(ingot(10) as never, c as never);
    expect(c.getNetBuoyancyN(1000, 0)).toBeLessThan(0);
  });

  it('the water squeezes the air out of you as you go down', async () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    await settle();
    await c.inhale();
    expect(c.getNetBuoyancyN(1000, 20)).toBeLessThan(c.getNetBuoyancyN(1000, 0));
  });

  it('⭐ under water an air voice is bubbles; at the surface it carries', () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(water(4));
    expect(c.canVocalize()).toMatchObject({ ok: false, reason: 'no-air' });
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(water(0, true));
    expect(c.canVocalize()).toEqual({ ok: true });
  });

  it('⭐ down without clearing your ears: the squeeze, then the eardrum; equalize prevents both', async () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    const medium = vi.spyOn(BiomeApi, 'mediumFor');
    const afflicted = vi.spyOn(c, 'afflict');
    medium.mockReturnValue(water(2));
    await c.reassess();
    medium.mockReturnValue(water(4));
    await c.reassess();
    expect(afflicted.mock.calls.some(([r]) => (r as { templatePath: string }).templatePath === TemplatePaths.respirationSqueeze)).toBe(true);
    medium.mockReturnValue(water(7));
    await c.reassess();
    expect(afflicted.mock.calls.some(([r]) => (r as { templatePath: string }).templatePath === TemplatePaths.respirationBurstEardrum)).toBe(true);

    const careful = body();
    ContainmentApi.move(careful, airRoom());
    const hurt = vi.spyOn(careful, 'afflict');
    for (const d of [2, 4, 6]) {
      medium.mockReturnValue(water(d));
      await careful.reassess();
      careful.equalize();
    }
    expect(hurt.mock.calls.some(([r]) => (r as { templatePath: string }).templatePath === TemplatePaths.respirationSqueeze)).toBe(false);
  });

  it('⭐ a body that cannot swim cannot float — refused in its own words', async () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(water(0, true));
    const out = await c.float();
    expect(out).toMatchObject({ ok: false, reason: 'cannot-float' });
  });

  it('⭐ treading water spends an untrained body, and it goes into the drowning response', async () => {
    const c = body();
    const place = airRoom();
    ContainmentApi.move(c, place);
    await settle();
    vi.spyOn(BiomeApi, 'mediumFor').mockReturnValue(water(0, true));
    // Heavy in the water: nothing helps it up.
    vi.spyOn(c, 'getNetBuoyancyN').mockReturnValue(-50);
    await c.reassess();
    expect(c.getEngagementByType('respiration-tread')).toBeDefined();
    let n = 0;
    while (!c.isInDrowningResponse() && n++ < 400) tick(5);
    expect(c.isInDrowningResponse()).toBe(true);
    expect(c.canVocalize()).toMatchObject({ ok: false, reason: 'no-breath' });
  });

  it('⭐ the bends: twenty minutes on pumped air in the dark water, straight up — bent; with a stop — not', async () => {
    const bent = body();
    const careful = body();
    for (const c of [bent, careful]) {
      ContainmentApi.move(c, airRoom());
      vi.spyOn(c as unknown as { hasWornAir(): boolean }, 'hasWornAir').mockReturnValue(true);
      vi.spyOn(c as unknown as { currentSupply(): string }, 'currentSupply').mockReturnValue('available');
    }
    await settle();
    const medium = vi.spyOn(BiomeApi, 'mediumFor');
    const afflicted = (c: TestCharacter): boolean =>
      c.getConditions().some((r) => (r as { templatePath?: string }).templatePath === TemplatePaths.respirationDecompression);
    // Down to the dark water (4.5 m) on pumped air, and twenty minutes there.
    medium.mockReturnValue(water(4.5));
    await bent.reassess();
    await careful.reassess();
    WorldClockApi._advanceForTesting(20 * 60 * 1000);
    await bent.reassess();
    await careful.reassess();
    // Straight up.
    medium.mockReturnValue(water(0, true));
    await bent.reassess();
    expect(afflicted(bent)).toBe(true);
    // Fifteen minutes in the light band (2.25 m) first.
    medium.mockReturnValue(water(2.25));
    await careful.reassess();
    WorldClockApi._advanceForTesting(15 * 60 * 1000);
    await careful.reassess();
    medium.mockReturnValue(water(0, true));
    await careful.reassess();
    expect(afflicted(careful)).toBe(false);
  });

  it('⭐ going back down relieves the bends (recompression)', async () => {
    const c = body();
    ContainmentApi.move(c, airRoom());
    vi.spyOn(c as unknown as { hasWornAir(): boolean }, 'hasWornAir').mockReturnValue(true);
    vi.spyOn(c as unknown as { currentSupply(): string }, 'currentSupply').mockReturnValue('available');
    await settle();
    const medium = vi.spyOn(BiomeApi, 'mediumFor');
    medium.mockReturnValue(water(6));
    await c.reassess();
    WorldClockApi._advanceForTesting(30 * 60 * 1000);
    await c.reassess();
    medium.mockReturnValue(water(0, true));
    await c.reassess();
    const bent = (): boolean =>
      c.getConditions().some((r) => (r as { templatePath?: string }).templatePath === TemplatePaths.respirationDecompression);
    expect(bent()).toBe(true);
    medium.mockReturnValue(water(6));
    await c.reassess();
    expect(bent()).toBe(false);
  });
});

