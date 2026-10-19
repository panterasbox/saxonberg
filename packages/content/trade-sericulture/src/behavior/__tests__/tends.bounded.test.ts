/**
 * `tends` and `reels` — the two silk brains, bounded: each beat is ONE act
 * chosen from what is actually there, nothing is cloned or teleported, and
 * both run with no audience (the house runs while LOADED — silk D10).
 *
 * Real trays, a real oven, real cocoons; only the forced command line is
 * captured (the verbs themselves are their own controllers' claims).
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { brain as tends } from '../tends';
import { brain as reels } from '../reels';
import RearingTray from '../../thing/RearingTray';
import Cocoons from '../../thing/Cocoons';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import Scrap from '@saxonberg/server/mud/platform/thing/Scrap';
import { fuelMaterial } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import Place from '@saxonberg/server/mud/lib/stuff/Place';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { MobileMixin } from '@saxonberg/server/mud/lib/spatial/Mobile';
import { TestActor } from '@saxonberg/server/mud/platform/idea/cmd/crafting/__tests__/branch-fixtures';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { BrainContext } from '@saxonberg/server/mud/lib/behavior/brain';

const FLOOR = '/world/test/silk-house/location/floor';
const WALK = '/world/test/silk-house/location/walk';
const COUNTER = '/world/test/silk-house/thing/counter';
const LEAF = '/trade/sericulture/idea/material/mulberry-leaf';
const BRUSH = '/trade/sericulture/idea/material/brushwood';

class Hand extends MobileMixin(TestActor) {
  static _mixinName = 'TendsTestHand';
}

let floor: Place;
let hand: Hand;
let said: string[];
let now = 10_000_000;

function mat(path: string, tags: string[]): Material {
  return (
    StuffApi.findByTemplatePath<Material>(path) ??
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName(path.split('/').pop()!);
      m.setTags(tags);
      return m;
    }, path)
  );
}

function good(path: string, tags: string[], kg = 0.5): Good {
  const g = makeStuff(() => new Good());
  g.setMaterial(mat(path, tags));
  g.setMass(Quantity.of(kg, 'kg'));
  return g;
}

function tray(state: string, dd = 0): RearingTray {
  const t = makeStuff(() => new RearingTray());
  const raw = t as unknown as Record<string, unknown>;
  raw.rearingState = state;
  raw.degreeDays = dd;
  raw.eggCount = 300;
  raw.lotGeneticMg = 380;
  raw.lastAmbientK = 298;
  raw.stampedTemperatureK = 298;
  ContainmentApi.move(t, floor as never);
  return t;
}

function ctx(config: Record<string, unknown>): BrainContext {
  return {
    host: hand as unknown as Stuff,
    config,
    state: {},
    trigger: { source: 'candidate', raw: 'candidate' },
    say: vi.fn(),
    emote: vi.fn(async () => undefined),
    emoteFree: vi.fn(),
  };
}

const TENDS = { floor: FLOOR, walk: WALK, counter: COUNTER };

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  said = [];
  floor = makeStuffAtPath(() => new Place(), FLOOR);
  hand = makeStuff(() => new Hand());
  ContainmentApi.move(hand as never, floor as never);
  vi.spyOn(hand, 'forceCommand').mockImplementation(async (line: string) => {
    said.push(line);
    return undefined as never;
  });
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toPeers = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('tends', () => {
  it('runs with nobody watching, and never clones or teleports', () => {
    expect(tends.presenceGated).toBe(false);
    const code = readFileSync(fileURLToPath(new URL('../tends.ts', import.meta.url)), 'utf8')
      .replace(/\/\*[^]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/StuffApi\.clone|teleport\(/);
  });

  it('⭐ a hungry tray gets the leaf in hand — one act', async () => {
    const t = tray('feeding', 60);
    ContainmentApi.move(good(LEAF, ['silkworm-fodder']), hand as never);
    await tends.act(ctx(TENDS));
    expect(t.leafOnTray()).toHaveLength(1);
    expect(said).toEqual([]);
  });

  it('…and with no leaf in hand, the hand WALKS (no typed direction — a forced `west` does not walk an NPC)', async () => {
    tray('feeding', 60);
    await tends.act(ctx(TENDS));
    // The test floor has no exits, so the step simply does not happen; what
    // matters is that nothing was typed for it.
    expect(said).toEqual([]);
  });

  it('a wandering tray gets a brush off the floor', async () => {
    const t = tray('wandering', 352);
    (t as unknown as { wanderStartS: number }).wanderStartS = now / 1;
    ContainmentApi.move(good(BRUSH, ['mounting']), floor as never);
    await tends.act(ctx(TENDS));
    expect(t.hasMounting()).toBe(true);
  });

  it('unstifled cocoons in hand and a cold oven: the oven is lit, nothing else', async () => {
    const oven = makeStuff(() => new Oven());
    oven.setBurnTemperatureK(345);
    oven.setFuelCapacityKg(15);
    (oven as unknown as { lit: boolean }).lit = false;
    ContainmentApi.move(oven, floor as never);
    // Real fuel — a heat of combustion, tagged `fuel` (the stokes harness).
    const charcoal = makeStuff(() => new Scrap());
    const m = fuelMaterial(30, 'charcoal');
    m.setTags(['fuel', 'carbon']);
    charcoal.setMaterial(m);
    charcoal.setMass(Quantity.of(4, 'kg'));
    ContainmentApi.move(charcoal, floor as never);
    const c = makeStuff(() => new Cocoons());
    stampTemplatePathForTest(c as unknown as Stuff, '/trade/sericulture/thing/cocoons');
    ContainmentApi.move(c, hand as never);
    await tends.act(ctx(TENDS));
    expect(oven.isLit()).toBe(true);
    expect(said).toEqual([]);
    // Next beat, the oven is lit: in they go.
    await tends.act(ctx(TENDS));
    expect(oven.getContents()).toContain(c);
  });

  it('at the walk with nothing in hand: harvest, then home', async () => {
    const walk = makeStuffAtPath(() => new Place(), WALK);
    ContainmentApi.move(hand as never, walk as never);
    await tends.act(ctx(TENDS));
    // Nothing came of the (captured) harvest, so the hand goes back.
    expect(said).toEqual(['harvest mulberry']);
  });
});

describe('reels', () => {
  it('runs with nobody watching, and never clones or teleports', () => {
    expect(reels.presenceGated).toBe(false);
    const code = readFileSync(fileURLToPath(new URL('../reels.ts', import.meta.url)), 'utf8')
      .replace(/\/\*[^]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(code).not.toMatch(/StuffApi\.clone|teleport\(/);
  });

  it('a reeler away on an errand does nothing', async () => {
    const elsewhere = makeStuff(() => new Place());
    ContainmentApi.move(hand as never, elsewhere as never);
    await reels.act(ctx({ floor: FLOOR, bin: '/x/crib', stock: '/x/silks' }));
    expect(said).toEqual([]);
  });
});
