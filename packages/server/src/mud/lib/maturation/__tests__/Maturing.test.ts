/**
 * MaturingMixin — the durative transform (fermentation W1).
 * Reconcile-on-read over game-time with NO far-past guard (the
 * husbandry clock rule); temperature + time as the driver; derived
 * numbers, discoverable curves, no rolls anywhere (D4); oxygen as the
 * trap past finished (D3); worst-stretch banding (D6).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import Vat from '../../../platform/thing/Vat';
import MaturationProfile from '../../../platform/idea/maturation/MaturationProfile';
import {
  MATURATION_LINES,
  MATURATION_MECHANISMS,
} from '../MaturationProfile';
import Material from '../../material/Material';
import type { Crafted } from '../../craft/Crafted';
import { WorldClockApi } from '../../../api/worldclock';
import { ExecutionContextApi } from '../../../api/execution-context';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const BASE = 10_000_000; // production clocks never sit at 0
let now = BASE;
function setNow(gameSeconds: number): void {
  now = BASE + gameSeconds;
}

// ── the authored fixture rows (globally-unique paths; the Thermal
// harness rule — clearAll would wipe the lazily-minted clock) ──

const MUST = '/stuff/idea/maturation-test/idea/material/test-must';
const WINE = '/stuff/idea/maturation-test/idea/material/test-wine';
const VINEGAR = '/stuff/idea/maturation-test/idea/material/test-vinegar';
const PROFILE = '/stuff/idea/maturation-test/idea/maturation/test-red';
const SUGAR_G_PER_L = 200;

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test must');
    m.setTags(['liquid', 'must', 'test-must']);
    m.setNutrients(['water', 'sugar']);
    m.setNutrientAmounts({ sugar: SUGAR_G_PER_L });
    return m;
  }, MUST);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test wine');
    m.setTags(['liquid', 'wine']);
    return m;
  }, WINE);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test vinegar');
    m.setTags(['liquid', 'vinegar']);
    return m;
  }, VINEGAR);
  makeStuffAtPath(() => {
    const p = new MaturationProfile();
    p.setKey('test-red');
    p.setInputCategory('test-must');
    p.setStallBelowK(283);
    p.setHappyK(291);
    p.setDamageAboveK(303);
    p.setRatePerDay(0.12);
    p.setProductMaterial(WINE);
    p.setTurnedMaterial(VINEGAR);
    p.setTurnDays(3);
    return p;
  }, PROFILE);
}

/** A vat pinned at `tempK` (ambient AND current — no drift in play). */
function makeVat(tempK: number): Vat {
  const vat = makeStuff(() => new Vat());
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
  return vat;
}

function pinTemp(vat: Vat, tempK: number): void {
  vat.lastAmbientK = tempK;
  vat.stampedTemperatureK = tempK;
}

/** Fill the vat's interior with the test must directly (host-internal). */
function fillWithMust(vat: Vat, litres = 50): void {
  const must = StuffApi.findByTemplatePath<Material>(MUST)!;
  vat.setBulkMaterial('interior', must);
  vat.setBulkAmount('interior', Quantity.of(litres, 'L'));
}

function crafted(vat: Vat): Crafted {
  return vat as unknown as Crafted;
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  // Provider units are real ms × scale; scale 1000 makes one provider
  // unit one game-second (the Growing.test harness rule).
  WorldClockApi.setScale(1000);
  standFixtures();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('the batch lifecycle', () => {
  it('a fresh fill keys an active batch off the matched profile', () => {
    const vat = makeVat(291);
    fillWithMust(vat);
    expect(vat.getMaturationPhase()).toBe('active');
    expect(vat.getMaturationProfileKey()).toBe('test-red');
    expect(vat.getStartingSugarGPerL()).toBe(SUGAR_G_PER_L);
    expect(vat.getFractionConverted()).toBe(0);
    expect(vat.getGravity()).toBeCloseTo(1 + 200 * 0.0004, 9);
  });

  it('an unmatched material idles; an emptied vat resets', () => {
    const vat = makeVat(291);
    const wine = StuffApi.findByTemplatePath<Material>(WINE)!;
    vat.setBulkMaterial('interior', wine);
    vat.setBulkAmount('interior', Quantity.of(10, 'L'));
    expect(vat.getMaturationPhase()).toBe('idle');

    fillWithMust(vat);
    expect(vat.getMaturationPhase()).toBe('active');
    vat.setBulkAmount('interior', Quantity.of(0, 'L'));
    vat.setBulkMaterial('interior', null);
    expect(vat.getMaturationPhase()).toBe('idle');
    expect(vat.getMaturationProfileKey()).toBe('');
  });
});

describe('the two-temperature experiment (D4 — discoverable curves)', () => {
  it('two vats at two temperatures recover the authored slopes from gravity reads', () => {
    // Slope at 285 K: rate × (285-283)/(291-283) = 0.12 × 0.25 = 0.03/day.
    // Slope at 291 K (happy): the full 0.12/day.
    const cool = makeVat(285);
    const happy = makeVat(291);
    fillWithMust(cool);
    fillWithMust(happy);
    cool.getMaturationPhase();
    happy.getMaturationPhase();

    const g0cool = cool.getGravity();
    const g0happy = happy.getGravity();
    setNow(2 * DAY);
    const g2cool = cool.getGravity();
    const g2happy = happy.getGravity();

    expect(cool.getFractionConverted()).toBeCloseTo(0.06, 9);
    expect(happy.getFractionConverted()).toBeCloseTo(0.24, 9);

    // The experiment: gravity slope / (0.0004 × starting sugar) per day
    // recovers the authored fraction-per-day at each temperature.
    const slopeCool = (g0cool - g2cool) / 2 / (0.0004 * SUGAR_G_PER_L);
    const slopeHappy = (g0happy - g2happy) / 2 / (0.0004 * SUGAR_G_PER_L);
    expect(slopeCool).toBeCloseTo(0.03, 9);
    expect(slopeHappy).toBeCloseTo(0.12, 9);
  });

  it('below the stall line nothing converts, and warming resumes', () => {
    const vat = makeVat(280); // below stallBelowK 283
    fillWithMust(vat);
    vat.getMaturationPhase();
    setNow(5 * DAY);
    expect(vat.getFractionConverted()).toBe(0);
    expect(vat.getMaturationPhase()).toBe('active'); // stalled, not dead

    pinTemp(vat, 291);
    vat.getMaturationPhase(); // close the cold window at the event-ish read
    setNow(6 * DAY);
    expect(vat.getFractionConverted()).toBeCloseTo(0.12, 9);
  });
});

describe('worst-stretch banding (D6)', () => {
  it('a batch never run hot grades masterful; hot stretches damage by depth', () => {
    const kept = makeVat(291);
    fillWithMust(kept);
    kept.getMaturationPhase();
    setNow(2 * DAY);
    expect(kept.getWorstStretch()).toBe(1);
    expect(crafted(kept).getGradeBand()).toBe('masterful');

    const cooked = makeVat(291);
    fillWithMust(cooked);
    cooked.getMaturationPhase();
    setNow(3 * DAY);
    pinTemp(cooked, 308); // 5 K past damageAboveK: sat = 1 - 5/15 ≈ 0.667
    cooked.getMaturationPhase();
    setNow(4 * DAY);
    cooked.getMaturationPhase();
    expect(cooked.getWorstStretch()).toBeCloseTo(1 - 5 / 15, 6);
    expect(crafted(cooked).getGradeBand()).toBe('fine');

    pinTemp(cooked, 311); // 8 K past: sat = 1 - 8/15 ≈ 0.467 → fair
    cooked.getMaturationPhase();
    setNow(5 * DAY);
    cooked.getMaturationPhase();
    expect(crafted(cooked).getGradeBand()).toBe('fair');

    // The record is monotone: cooling back never restores the band.
    pinTemp(cooked, 291);
    cooked.getMaturationPhase();
    setNow(6 * DAY);
    cooked.getMaturationPhase();
    expect(crafted(cooked).getGradeBand()).toBe('fair');
  });
});

describe('the seal is the skill (D3)', () => {
  function finishBatch(vat: Vat): void {
    fillWithMust(vat);
    vat.getMaturationPhase();
    setNow(10 * DAY); // 0.12/day → finished well inside
    expect(vat.getMaturationPhase()).toBe('finished');
  }

  it('finished + sealed holds as the product material', () => {
    const vat = makeVat(291); // default closed (the bung in)
    finishBatch(vat);
    expect(vat.getBulkMaterialPath('interior')).toBe(WINE);
    setNow(30 * DAY);
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(WINE);
  });

  it('finished + open turns to vinegar after the profile turn window', () => {
    const vat = makeVat(291);
    finishBatch(vat);
    vat.open(); // the window event reconciles first, then flips
    setNow(12 * DAY); // 2 open days < turnDays 3
    expect(vat.getMaturationPhase()).toBe('finished');
    setNow(13.5 * DAY); // 3.5 open days ≥ 3
    expect(vat.getMaturationPhase()).toBe('turned');
    expect(vat.getBulkMaterialPath('interior')).toBe(VINEGAR);
  });

  it('re-sealing before the turn window closes saves the batch', () => {
    const vat = makeVat(291);
    finishBatch(vat);
    vat.open();
    setNow(12 * DAY); // 2 open days accrued
    vat.close(); // reconciles the open stretch, then seals
    setNow(40 * DAY);
    expect(vat.getMaturationPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(WINE);
  });
});

describe('conservation (D4 — the checkable mass balance)', () => {
  it('sugar in = remaining + converted; ABV is derived, never authored', () => {
    const vat = makeVat(291);
    fillWithMust(vat);
    vat.getMaturationPhase();
    setNow(4 * DAY); // fraction 0.48
    const remaining = vat.getRemainingSugarGPerL();
    const abv = vat.getAbvPercent();
    expect(remaining).toBeCloseTo(200 * 0.52, 9);
    // The converted sugar and the ABV agree with the taught constant.
    expect(abv).toBeCloseTo((200 * 0.48) / 17, 9);
    // Conservation: what the hydrometer no longer sees IS the alcohol.
    expect(remaining + abv * 17).toBeCloseTo(200, 9);
  });
});

describe("the maker's mark on the batch (P3/D9)", () => {
  it('a fill under a live execution context stamps the founder', () => {
    const founder = makeStuffAtPath(() => {
      const m = new Material(); // any Stuff with a templatePath will do
      m.setName('founder-stand-in');
      return m;
    }, '/stuff/idea/maturation-test/agent/founder');
    const vat = makeVat(291);
    ExecutionContextApi.runRoot(null, 'test', () => {
      ExecutionContextApi.tagActingAuthor(founder);
      fillWithMust(vat);
      vat.getMaturationPhase();
    });
    expect(crafted(vat).getMaker()).toBe(
      '/stuff/idea/maturation-test/agent/founder',
    );
    expect(crafted(vat).getRecipe()).toBe('ferment:test-red');
  });

  it('a maker carried in by the transfer seam is never overwritten', () => {
    const vat = makeVat(291);
    crafted(vat).setMaker('/stuff/agent/_test/crusher');
    fillWithMust(vat);
    vat.getMaturationPhase();
    expect(crafted(vat).getMaker()).toBe('/stuff/agent/_test/crusher');
  });
});

describe('no rolls anywhere (the uncertainty doctrine)', () => {
  it('the ferment tree contains zero Math.random', () => {
    const dir = fileURLToPath(new URL('..', import.meta.url));
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.ts')) continue;
      const src = readFileSync(dir + f, 'utf-8');
      expect(src, f).not.toMatch(/Math\.random/);
    }
  });
});

describe('⚠⚠ the prose follows the MECHANISM, not the substrate', () => {
  /*
   * The measured defect: this augmenter was written for a wine cellar
   * and never asked who else composed the mixin. A bleaching green — an
   * acre of grass with linen pegged out in the sun — rendered "It
   * bubbles steadily, a yeasty breath rising off it", and a retting
   * pit reported when done that "the air over it is clean" despite its
   * whole authored character being the smell.
   *
   * Sharing the SHAPE was right. Shipping the sentences with it was not.
   */
  it('a photochemical maturation never speaks of yeast, bubbles or smell', () => {
    const banned = /yeast|bubbl|breath|vinegar|clean/i;
    for (const phase of ['starting', 'working', 'finished', 'turned'] as const) {
      expect(MATURATION_LINES.photochemical[phase]).not.toMatch(banned);
    }
  });

  it('⭐ microbial keeps the cellar wording it was written for', () => {
    expect(MATURATION_LINES.microbial.working).toMatch(/yeasty/);
    expect(MATURATION_LINES.microbial.turned).toMatch(/vinegar/);
  });

  it('every mechanism is total over the four phases — no silent fallthrough', () => {
    for (const mech of MATURATION_MECHANISMS) {
      const lines = MATURATION_LINES[mech];
      for (const phase of ['starting', 'working', 'finished', 'turned'] as const) {
        expect(lines[phase], `${mech}.${phase}`).toBeTruthy();
      }
    }
  });

  it('⚠ the mechanism vocabulary is CLOSED — a typo throws, never defaults', () => {
    /*
     * Without this an unknown mechanism falls through to the microbial
     * default and silently asserts the wrong chemistry, which is the
     * exact failure the field exists to end.
     */
    const p = makeStuff(() => new MaturationProfile());
    expect(() => p.setMechanism('photosynthetic')).toThrow(RangeError);
    p.setMechanism('photochemical');
    expect(p.getMechanism()).toBe('photochemical');
  });
});
