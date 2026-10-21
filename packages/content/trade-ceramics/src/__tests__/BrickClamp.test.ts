/**
 * ⭐⭐ A clamp grades its bricks by where they sat (ceramics D15): the
 * same clay, one burn, three bodies — by the clay's own heat transitions.
 * A better setter puts fewer bricks by the channels; a starved draught
 * reduces them blue.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { chargeHot } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import { makeStuff, makeStuffAtPath, stampTemplatePathForTest } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import BrickClamp from '../thing/BrickClamp';
import Brick from '../thing/Brick';

class Room extends Place {}

const BRICK_ROW = '/x/thing/brick';

/** A split stack clones its row: a fresh green brick of the test clay. */
function newBrick(): Brick {
  return makeStuff(() => {
    const b = new Brick();
    b.setMass(Quantity.of(3.6, 'kg'));
    b.setMaterial(clay);
    b.setWaterState({ moisture: 0.3, solute: 0 });
    b.setStampedTemperatureK(290);
    b.setLastAmbientK(290);
    return b;
  });
}

const SCALE = 12;
let real = 0;
const advance = (s: number): void => {
  real += (s / SCALE) * 1000;
};

let seq = 0;
const P = (n: string): string => `/stuff/idea/material/_clamp/${n}-${seq}`;
function mat(name: string, fill: (m: Material) => void = () => {}): Material {
  return makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setDensity(Quantity.of(1800, 'kg/m³'));
    m.setSpecificHeat(Quantity.of(900, 'J/(kg·K)'));
    m.setThermalConductivity(Quantity.of(1, 'W/(m·K)'));
    fill(m);
    return m;
  }, P(name)) as unknown as Material;
}

let clay: Material;
function setup(): void {
  seq += 1;
  for (const n of ['terracotta', 'grey', 'earthenware', 'blue', 'stoneware', 'celadon', 'clinker']) mat(n);
  const t = (key: string, ref: number, becomes: string, reducing: string, scorch?: number) => ({
    key,
    referenceK: ref,
    zK: 30,
    fullDoseS: 7200,
    ...(scorch ? { scorchAboveK: scorch, scorched: P('clinker') } : {}),
    ladder: [{ atDegree: 1, becomes: P(becomes), reducing: P(reducing) }],
  });
  clay = mat('clay', (m) => {
    m.setTags(['earth', 'plastic', 'clay']);
    m.setHeatTransitions([
      t('terracotta', 1200, 'terracotta', 'grey'),
      t('earthenware', 1330, 'earthenware', 'blue'),
      t('stoneware', 1480, 'stoneware', 'celadon', 1560),
    ]);
  });
}

async function clampWith(n: number, draught: number): Promise<{ clamp: BrickClamp; room: Room }> {
  const room = makeStuff(() => {
    const r = new Room();
    r.setTemperature(Quantity.of(290, 'K'));
    return r;
  });
  const clamp = makeStuff(() => {
    const c = new BrickClamp();
    c.setBurnTemperatureK(1474);
    c.setDraught(draught);
    chargeHot(c as unknown as Stuff & Burner, 1500);
    return c;
  });
  await ContainmentApi.move(clamp, room);
  if (!clamp.isLit()) clamp.ignite();
  const bricks = makeStuff(() => {
    const b = new Brick();
    b.setMass(Quantity.of(3.6, 'kg'));
    b.setMaterial(clay);
    b.setQuantity(n);
    b.setWaterState({ moisture: 0.3, solute: 0 });
    b.setStampedTemperatureK(290);
    b.setLastAmbientK(290);
    return b;
  });
  stampTemplatePathForTest(bricks, BRICK_ROW);
  await ContainmentApi.move(bricks, clamp);
  return { clamp, room };
}

function bodies(clamp: BrickClamp): Map<string, string> {
  const out = new Map<string, string>();
  for (const c of clamp.getContents()) {
    const s = c as unknown as Stuff & { getMaterial(): Material | null };
    const name = s.getMaterial()?.getName() ?? '?';
    out.set(clamp.positionOf(s), name);
  }
  return out;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  real = 1_000_000;
  WorldClockApi._setNowProviderForTesting(() => real);
  setup();
  // Green ware reads its air's humidity; a unit test loads no biome.
  vi.spyOn(BiomeApi, 'localHumidityFor').mockReturnValue(50 as never);
  const real0 = StuffApi.clone.bind(StuffApi);
  vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string, ...rest: unknown[]) => {
    if (path === BRICK_ROW) {
      const b = newBrick();
      stampTemplatePathForTest(b, BRICK_ROW);
      return b;
    }
    return (real0 as (...a: unknown[]) => Promise<unknown>)(path, ...rest);
  }) as never);
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

async function burn(clamp: BrickClamp): Promise<void> {
  await clamp.onFireStart(null);
  for (const c of clamp.getContents()) {
    const b = c as unknown as { restamp(): Promise<void>; reconcileThermal(): void };
    await b.restamp();
    b.reconcileThermal();
  }
  advance(3 * 86_400);
  await clamp.settleFiring(null);
}

describe('the clamp', () => {
  it('⭐ one burn, three bodies — clinker by the channels, earthenware in the middle, terracotta at the skin', async () => {
    const { clamp } = await clampWith(20, 0.6);
    await burn(clamp);
    const got = bodies(clamp);
    expect(got.get('channel')).toBe('clinker');
    expect(got.get('middle')).toBe('earthenware');
    expect(got.get('skin')).toBe('terracotta');
  });

  it('⭐ a starved, reducing burn turns the middle blue', async () => {
    const { clamp } = await clampWith(20, 0.5);
    await burn(clamp);
    expect(bodies(clamp).get('middle')).toBe('blue');
  });

  it('the setter decides how many go by the channels', async () => {
    const { clamp } = await clampWith(20, 0.6);
    await clamp.onFireStart(null);
    // An unknown setter (no competence) sets as a novice: 30 % by the channels.
    expect(quantityAt(clamp, 'channel')).toBe(6);
    expect(quantityAt(clamp, 'skin')).toBe(5);
    expect(quantityAt(clamp, 'middle')).toBe(9);
  });

  it('⭐ a better setter puts fewer bricks in the fire channels', async () => {
    const { clamp } = await clampWith(20, 0.6);
    const setter = {
      getIdentityPath: () => '/x/agent/setter',
      competenceBandFor: async () => 'proficient',
    } as unknown as Stuff;
    vi.spyOn(MixinApi, 'isAdvancing').mockImplementation(((s: Stuff) => s === setter) as never);
    await clamp.onFireStart(setter);
    // A proficient setter: 16 % by the channels.
    expect(quantityAt(clamp, 'channel')).toBe(3);
  });

  it('the position is borne by the brick — it survives the clamp forgetting', async () => {
    const { clamp } = await clampWith(20, 0.6);
    await clamp.onFireStart(null);
    const marks = clamp
      .getContents()
      .map((c) => (c as unknown as Brick).getClampPosition())
      .sort();
    expect(marks).toEqual(['channel', 'middle', 'skin']);
  });

  it('⭐ rain on the skin and wind across it cool the casing', async () => {
    const { clamp } = await clampWith(20, 0.6);
    await clamp.onFireStart(null);
    const skin = clamp.getContents().find((c) => clamp.positionOf(c as Stuff) === 'skin') as Stuff;
    const dry = clamp.heldTemperatureKFor(skin);
    vi.spyOn(clamp, 'getWetness').mockReturnValue(1);
    const soaked = clamp.heldTemperatureKFor(skin);
    // A soaked skin falls below terracotta's full firing over three days.
    expect(dry - soaked).toBeCloseTo(100, 5);
    expect(soaked).toBeLessThan(1153);
    expect(dry).toBeGreaterThan(1153);
  });

  it('wind across the skin when it is lit cools it too', async () => {
    const { clamp } = await clampWith(20, 0.6);
    vi.spyOn(BiomeApi, 'resolveWindFor').mockResolvedValue(Quantity.of(5, 'm/s') as never);
    await clamp.onFireStart(null);
    const skin = clamp.getContents().find((c) => clamp.positionOf(c as Stuff) === 'skin') as Stuff;
    const middle = clamp.getContents().find((c) => clamp.positionOf(c as Stuff) === 'middle') as Stuff;
    expect(clamp.heldTemperatureKFor(middle) * 0.9 - clamp.heldTemperatureKFor(skin)).toBeCloseTo(30, 5);
  });
});

function quantityAt(clamp: BrickClamp, where: string): number {
  return clamp
    .getContents()
    .filter((c) => clamp.positionOf(c as Stuff) === where)
    .reduce((n, c) => n + (c as unknown as Brick).getQuantity(), 0);
}
