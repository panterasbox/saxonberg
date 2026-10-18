/**
 * ⭐⭐ The rearing clock — warmth ages the worms, feeding limits it, the
 * disease no sense reports takes a heavy tray at its fifth age, and a
 * rearing ends in three heft stacks and a sack of frass.
 *
 * Real tray, real egg-lot adoption, real `ThermalMixin` (pinned, the
 * Ripening harness rule: ambient AND current, so no drift is in play);
 * only the cocoon/frass row clone is stubbed.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import RearingTray from '../thing/RearingTray';
import EggLot from '../thing/EggLot';
import Cocoons from '../thing/Cocoons';
import Strain from '../idea/Strain';
import Good from '@saxonberg/server/mud/platform/thing/Good';
import Material from '@saxonberg/server/mud/platform/idea/material/Material';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import '@saxonberg/server/mud/platform/idea/WorldClockRegistry';
import {
  makeStuff,
  makeStuffAtPath,
  stampTemplatePathForTest,
} from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '@saxonberg/server/mud/lib/persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const DAY = 86_400;
const BASE = 10_000_000;
let now = BASE;
const setNow = (s: number): void => {
  now = BASE + s;
};

const STRAIN = '/trade/sericulture/idea/strain/valley-gold';
const LEAF = '/trade/sericulture/idea/material/mulberry-leaf';
const BRUSH = '/trade/sericulture/idea/material/brushwood';
const EGG = '/trade/sericulture/idea/material/silkworm-egg';

function material(path: string, name: string, tags: string[]): void {
  if (StuffApi.findByTemplatePath(path)) return;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName(name);
    m.setTags(tags);
    return m;
  }, path);
}

function standFixtures(): void {
  material(LEAF, 'mulberry leaf', ['plant', 'silkworm-fodder']);
  material(BRUSH, 'brushwood', ['wood', 'mounting']);
  material(EGG, 'silkworm egg', ['egg']);
  if (!StuffApi.findByTemplatePath(STRAIN)) {
    makeStuffAtPath(() => {
      const s = new Strain();
      s.setKey('valley-gold');
      s.setLabel('valley gold');
      s.setColour('gold');
      s.setBroods(2);
      s.setHeritability(0.4);
      s.setMeanShellMg(380);
      s.setSdShellMg(40);
      return s;
    }, STRAIN);
  }
}

/** Ambient AND current — the tray sits at exactly `k`. */
function pin(t: Stuff, k: number): void {
  (t as unknown as { lastAmbientK: number }).lastAmbientK = k;
  (t as unknown as { stampedTemperatureK: number }).stampedTemperatureK = k;
}

function tray(k = 298): RearingTray {
  const t = makeStuff(() => new RearingTray());
  pin(t as unknown as Stuff, k);
  return t;
}

function lot(load = 0, count = 300): EggLot {
  const l = makeStuff(() => new EggLot());
  l.setMaterial(StuffApi.findByTemplatePath<Material>(EGG)!);
  l.setStrainPath(STRAIN);
  l.setEggCount(count);
  l.setPebrineLoad(load);
  l.setWintered(true);
  return l;
}

function leaf(kg: number): Good {
  const g = makeStuff(() => new Good());
  g.setMaterial(StuffApi.findByTemplatePath<Material>(LEAF)!);
  g.setMass(Quantity.of(kg, 'kg'));
  return g;
}

function brush(): Good {
  const g = makeStuff(() => new Good());
  g.setMaterial(StuffApi.findByTemplatePath<Material>(BRUSH)!);
  g.setMass(Quantity.of(0.3, 'kg'));
  return g;
}

async function hatchOn(t: RearingTray, l: EggLot): Promise<void> {
  ContainmentApi.move(l, t);
  await Promise.resolve();
  await Promise.resolve();
}

/** Step the clock in half days, re-pinning, feeding when asked. */
function runDays(
  trays: Array<{ t: RearingTray; k: number; feedKg?: number }>,
  fromDay: number,
  toDay: number,
): void {
  for (let h = fromDay * 2 + 1; h <= toDay * 2; h++) {
    setNow((h / 2) * DAY);
    for (const { t, k, feedKg } of trays) {
      pin(t as unknown as Stuff, k);
      if (feedKg && t.leafOnTray().length === 0) ContainmentApi.move(leaf(feedKg), t);
      t.reconcileRearing();
    }
  }
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
  standFixtures();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe('the rearing clock', () => {
  it('adopts an egg lot: the card is consumed and the tray holds eggs', async () => {
    const t = tray();
    const l = lot();
    await hatchOn(t, l);
    expect(t.getRearingState()).toBe('eggs');
    expect(l.isDestroyed()).toBe(true);
    expect(t.rearingLine()).toMatch(/eggs, waiting for warmth/);
  });

  it('⭐ AC 3 — a warm tray ages faster than a cold one', async () => {
    const warm = tray(298);
    const cold = tray(290);
    await hatchOn(warm, lot());
    await hatchOn(cold, lot());
    runDays(
      [
        { t: warm, k: 298, feedKg: 20 },
        { t: cold, k: 290, feedKg: 20 },
      ],
      0,
      20,
    );
    expect(warm.getRearingState()).toBe('feeding');
    expect(warm.currentAge()).toBeGreaterThan(cold.currentAge());
  });

  it('⭐ AC 3 — an unfed tray is slower and hungry, and does not die', async () => {
    const fed = tray(298);
    const starved = tray(298);
    await hatchOn(fed, lot());
    await hatchOn(starved, lot());
    runDays(
      [
        { t: fed, k: 298, feedKg: 20 },
        { t: starved, k: 298 },
      ],
      0,
      22,
    );
    expect(starved.getRearingState()).toBe('feeding');
    expect(starved.isHungry()).toBe(true);
    expect(starved.rearingLine()).toMatch(/restless, heads raised/);
    expect(fed.currentAge()).toBeGreaterThan(starved.currentAge());
    // Long after: still alive, still feeding.
    runDays([{ t: starved, k: 298 }], 22, 60);
    expect(['feeding', 'wandering', 'spinning', 'empty']).toContain(starved.getRearingState());
    expect(starved.getRearingState()).not.toBe('collapsed');
  });

  it('the worms moult — asleep, eating nothing — between ages', async () => {
    const t = tray(298);
    await hatchOn(t, lot());
    let sawMoult = false;
    for (let h = 1; h <= 40 * 4; h++) {
      setNow((h / 4) * DAY);
      pin(t as unknown as Stuff, 298);
      if (t.leafOnTray().length === 0) ContainmentApi.move(leaf(20), t);
      if (t.isMoulting()) {
        sawMoult = true;
        expect(t.rearingLine()).toMatch(/asleep for the moult/);
        break;
      }
    }
    expect(sawMoult).toBe(true);
  });

  it('⭐ AC 12 — a heavy load specks by the fourth age and collapses at the fifth', async () => {
    const t = tray(298);
    await hatchOn(t, lot(0.8));
    let speckedAtFour = false;
    for (let h = 1; h <= 60 * 2; h++) {
      setNow((h / 2) * DAY);
      pin(t as unknown as Stuff, 298);
      if (t.leafOnTray().length === 0) ContainmentApi.move(leaf(20), t);
      if (t.getRearingState() === 'feeding' && t.currentAge() === 4 && t.isSpeckled()) {
        speckedAtFour = true;
        expect(t.rearingLine()).toMatch(/dark specks/);
      }
      if (t.getRearingState() === 'collapsed') break;
    }
    expect(speckedAtFour).toBe(true);
    expect(t.getRearingState()).toBe('collapsed');
    expect(t.rearingLine()).toMatch(/dead worms/);
  });

  it('a light load shows nothing and lives', async () => {
    const t = tray(298);
    await hatchOn(t, lot(0.1));
    runDays([{ t, k: 298, feedKg: 20 }], 0, 30);
    expect(t.isSpeckled()).toBe(false);
    expect(t.getRearingState()).not.toBe('collapsed');
  });

  it('⭐ AC 1 — fed, brushed and spun: three heft stacks and a sack of frass', async () => {
    const minted: Stuff[] = [];
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const made =
        path.endsWith('/cocoons') ? makeStuff(() => new Cocoons()) : makeStuff(() => new Good());
      stampTemplatePathForTest(made as unknown as Stuff, path);
      minted.push(made as unknown as Stuff);
      return made;
    }) as never);
    const t = tray(298);
    await hatchOn(t, lot(0, 300));
    let brushed = false;
    for (let h = 1; h <= 60 * 2; h++) {
      setNow((h / 2) * DAY);
      pin(t as unknown as Stuff, 298);
      const state = t.getRearingState();
      if (state === 'feeding' && t.leafOnTray().length === 0) ContainmentApi.move(leaf(20), t);
      if (state === 'wandering' && !brushed) {
        expect(t.rearingLine()).toMatch(/wandering/);
        ContainmentApi.move(brush(), t);
        brushed = true;
      }
      if (state === 'empty') break;
    }
    await new Promise((r) => setTimeout(r, 0));
    expect(brushed).toBe(true);
    const stacks = t.getContents().filter((s): s is Cocoons & typeof s => s instanceof Cocoons);
    expect(stacks.map((s) => s.getHeftBand()).sort()).toEqual(['heavy', 'light', 'middling']);
    const total = stacks.reduce((a, s) => a + s.getQuantity(), 0);
    expect(total).toBe(Math.round(300 * 0.85));
    const heavy = stacks.find((s) => s.getHeftBand() === 'heavy')!;
    const light = stacks.find((s) => s.getHeftBand() === 'light')!;
    const middling = stacks.find((s) => s.getHeftBand() === 'middling')!;
    expect(heavy.getMeanShellMg()).toBeGreaterThan(middling.getMeanShellMg());
    expect(light.getMeanShellMg()).toBeLessThan(middling.getMeanShellMg());
    // Well fed with a brush: the phenotype is the genetic mean.
    expect(middling.getLotMeanMg()).toBeCloseTo(380, 0);
    expect(heavy.getLotGeneticMg()).toBe(380);
    expect(minted.some((s) => s.getTemplatePath() === '/trade/sericulture/thing/frass')).toBe(true);
    expect(t.rearingLine()).toMatch(/cocoons on it/);
  });

  it('underfed in the fifth age: lighter cocoons', async () => {
    vi.spyOn(StuffApi, 'clone').mockImplementation((async (path: string) => {
      const made =
        path.endsWith('/cocoons') ? makeStuff(() => new Cocoons()) : makeStuff(() => new Good());
      stampTemplatePathForTest(made as unknown as Stuff, path);
      return made;
    }) as never);
    const t = tray(298);
    await hatchOn(t, lot(0, 300));
    for (let h = 1; h <= 90 * 2; h++) {
      setNow((h / 2) * DAY);
      pin(t as unknown as Stuff, 298);
      const state = t.getRearingState();
      // Fed through age IV, then starved.
      if (state === 'feeding' && t.currentAge() < 5 && t.leafOnTray().length === 0) {
        ContainmentApi.move(leaf(2), t);
      }
      // …and in the fifth age, whatever is left is taken away.
      if (state === 'feeding' && t.currentAge() === 5) {
        for (const l of t.leafOnTray()) StuffApi.destruct(l);
      }
      if (state === 'wandering' && !t.hasMounting()) ContainmentApi.move(brush(), t);
      if (state === 'empty') break;
    }
    await new Promise((r) => setTimeout(r, 0));
    const middling = t
      .getContents()
      .find((s): s is Cocoons & typeof s => s instanceof Cocoons && s.getHeftBand() === 'middling');
    expect(middling).toBeDefined();
    expect(middling!.getLotMeanMg()).toBeLessThan(380 * 0.8);
  });
});
