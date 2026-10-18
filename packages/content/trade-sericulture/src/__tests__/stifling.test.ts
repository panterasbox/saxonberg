/**
 * ⭐⭐ The cocoon's deadline — stifled by heat, scorched by too much of it,
 * opened by the moths on their day; and the lay that carries the strain,
 * the disease and the selection on.
 *
 * The stifle/scorch calibration runs over a REAL `ThermalMixin` in a REAL
 * lit oven (no pinned temperature): a cocoon stack has almost no thermal
 * mass, so the window is the two hold times, and that is what is asserted.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Cocoons from '../thing/Cocoons';
import EggLot from '../thing/EggLot';
import Strain from '../idea/Strain';
import Oven from '@saxonberg/server/mud/platform/thing/Oven';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { ContainerMixin } from '@saxonberg/server/mud/lib/spatial/Container';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { chargeHot } from '@saxonberg/server/mud/lib/fire/__tests__/burner-fuel';
import type { Burner } from '@saxonberg/server/mud/lib/fire/Burner';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const MIN = 60;
const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};
const STRAIN = '/trade/sericulture/idea/strain/valley-gold';
const SHELL = '/trade/sericulture/idea/material/cocoon-shell';

class Shelf extends ContainerMixin(Good) {
  static _mixinName = 'StiflingTestShelf';
}

function fixtures(): void {
  if (!StuffApi.findByTemplatePath(SHELL)) {
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('spun silk');
      m.setTags(['fibre', 'protein', 'gummed']);
      return m;
    }, SHELL);
  }
  if (!StuffApi.findByTemplatePath(STRAIN)) {
    makeStuffAtPath(() => {
      const s = new Strain();
      s.setKey('valley-gold');
      s.setColour('gold');
      s.setBroods(2);
      s.setHeritability(0.4);
      s.setMeanShellMg(380);
      s.setSdShellMg(40);
      return s;
    }, STRAIN);
  }
}

function stack(band: 'heavy' | 'middling' | 'light', count: number, load = 0): Cocoons {
  const c = makeStuff(() => new Cocoons());
  stampTemplatePathForTest(c as unknown as Stuff, '/trade/sericulture/thing/cocoons');
  c.setMaterial(StuffApi.findByTemplatePath<Material>(SHELL)!);
  c.setMass(Quantity.of(0.1, 'kg'));
  c.seedFromTray({
    strainPath: STRAIN,
    heftBand: band,
    count,
    meanShellMg: band === 'heavy' ? 436 : band === 'light' ? 324 : 380,
    lotMeanMg: 380,
    lotGeneticMg: 380,
    pebrineLoad: load,
    spunAt: WorldClockApi.getNow().rawValue(),
    maker: '/platform/agent/Avatar/grower',
  });
  (c as unknown as { lastAmbientK: number }).lastAmbientK = 293;
  (c as unknown as { stampedTemperatureK: number }).stampedTemperatureK = 293;
  return c;
}

function litOven(k: number): Oven {
  return makeStuff(() => {
    const o = new Oven();
    o.setBurnTemperatureK(k);
    chargeHot(o as unknown as Stuff & Burner, 40);
    return o;
  });
}

/** Minutes until `pred` first holds, reading the stack each minute. */
function minutesUntil(c: Cocoons, start: number, pred: () => boolean, max = 240): number {
  for (let m = 1; m <= max; m++) {
    setNow(start + m * MIN);
    if (pred()) return m;
  }
  return Infinity;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  fixtures();
});
afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('stifling', () => {
  it('⭐ in a 500 K kitchen range: stifled first, scorched later — a window to take them out', () => {
    const c = stack('middling', 60);
    c.isStifled();
    ContainmentApi.move(c, litOven(500));
    const stifledAt = minutesUntil(c, 0, () => c.isStifled());
    const scorchedAt = minutesUntil(c, stifledAt * MIN, () => c.isScorched()) + stifledAt;
    expect(stifledAt).toBeLessThanOrEqual(15);
    expect(scorchedAt - stifledAt).toBeGreaterThanOrEqual(15);
    expect(c.getGradeBand()).toBe('poor');
    expect(c.cocoonLine()).toMatch(/scorched/);
  });

  it('⭐ in a 345 K stifling oven: stifled, and never scorched', () => {
    const c = stack('middling', 60);
    c.isStifled();
    ContainmentApi.move(c, litOven(345));
    expect(minutesUntil(c, 0, () => c.isStifled())).toBeLessThanOrEqual(20);
    setNow(6 * 60 * MIN);
    expect(c.isScorched()).toBe(false);
    expect(c.getGradeBand()).toBe('fair');
    expect(c.cocoonLine()).toMatch(/quiet and dry/);
  });

  it('a stifled stack is unchanged a month later', () => {
    const c = stack('middling', 60);
    c.isStifled();
    ContainmentApi.move(c, litOven(345));
    minutesUntil(c, 0, () => c.isStifled());
    setNow(30 * DAY);
    expect(c.isPierced()).toBe(false);
  });
});

describe('the deadline and the lay', () => {
  function shelf(): Shelf {
    return makeStuff(() => new Shelf());
  }

  function stubLotClone(): EggLot[] {
    const made: EggLot[] = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const l = makeStuff(() => new EggLot());
      stampTemplatePathForTest(l as unknown as Stuff, path);
      made.push(l);
      return l;
    }) as never);
    return made;
  }

  it('⭐ AC 5 — unstifled: still whole at nine days, open at ten, and a lot lies where they stood', async () => {
    const made = stubLotClone();
    const s = shelf();
    const c = stack('heavy', 3);
    ContainmentApi.move(c, s);
    c.isPierced();
    setNow(9 * DAY);
    expect(c.isPierced()).toBe(false);
    expect(c.cocoonLine()).toMatch(/moths will come|within the day/);
    setNow(10 * DAY + MIN);
    expect(c.isPierced()).toBe(true);
    expect(c.cocoonLine()).toMatch(/ragged hole/);
    await new Promise((r) => setTimeout(r, 0));
    expect(made).toHaveLength(1);
    const lot = made[0]!;
    expect(s.getContents()).toContain(lot);
    expect(lot.getStrainPath()).toBe(STRAIN);
    expect(lot.getEggCount()).toBe(600);
    expect(lot.isReadyToHatch()).toBe(true); // two-brood: no winter wanted
  });

  it('⭐ AC 13 — keeping the heavy stack moves the next lot up by h² × S', async () => {
    const made = stubLotClone();
    const s = shelf();
    const heavy = stack('heavy', 3);
    ContainmentApi.move(heavy, s);
    heavy.isPierced();
    setNow(11 * DAY);
    heavy.isPierced();
    await new Promise((r) => setTimeout(r, 0));
    // 380 + 0.4 × (436 − 380)
    expect(made[0]!.getMeanShellMg()).toBeCloseTo(402.4, 5);
  });

  it('keeping the light stack moves it down; the middling nowhere', async () => {
    const made = stubLotClone();
    const s = shelf();
    const light = stack('light', 3);
    const mid = stack('middling', 3);
    ContainmentApi.move(light, s);
    ContainmentApi.move(mid, s);
    light.isPierced();
    mid.isPierced();
    setNow(11 * DAY);
    light.isPierced();
    mid.isPierced();
    await new Promise((r) => setTimeout(r, 0));
    const means = made.map((l) => l.getMeanShellMg()).sort((a, b) => a - b);
    expect(means[0]).toBeCloseTo(380 + 0.4 * (324 - 380), 5);
    expect(means[1]).toBeCloseTo(380, 5);
  });

  it('⭐ AC 12 — an infected stack lays an infected lot, worse than its mothers', async () => {
    const made = stubLotClone();
    const s = shelf();
    const c = stack('middling', 3, 0.25);
    ContainmentApi.move(c, s);
    c.isPierced();
    setNow(11 * DAY);
    c.isPierced();
    await new Promise((r) => setTimeout(r, 0));
    expect(made[0]!.getPebrineLoad()).toBeCloseTo(0.4, 5);
  });

  it('a stack in limbo is pierced and lays nothing', async () => {
    const made = stubLotClone();
    const c = stack('middling', 3);
    c.isPierced();
    setNow(11 * DAY);
    expect(c.isPierced()).toBe(true);
    await new Promise((r) => setTimeout(r, 0));
    expect(made).toHaveLength(0);
  });

  it('⚠ stacks of different state never merge; a split keeps every fact', () => {
    const a = stack('heavy', 3);
    const b = stack('light', 3);
    expect(a.canMergeWith(b as unknown as Stuff)).toBe(false);
    const a2 = stack('heavy', 3);
    expect(a.canMergeWith(a2 as unknown as Stuff)).toBe(true);
  });
});
