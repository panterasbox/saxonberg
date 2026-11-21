/**
 * The mouth: a tongue with strengths, the one liking read, and the persistent
 * records. The act itself runs in the wire drive.
 */

import '../../../../test-bootstrap';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { soilBody } from '../../cleanliness/__tests__/soil-fixtures';
import { installAromas, aromaPath } from '../../perception/__tests__/aroma-fixtures';
import { seedKernelContentStore } from '../../security/__tests__/test-setup';
import { Smell } from '../../perception/Smell';
import { TASTE_THRESHOLDS } from '../../material/Material';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { Quantity } from '../../quantity';
import { CraftingApi } from '../../../api/crafting';
import Flask from '../../../platform/thing/Flask';
import Water from '../../../platform/idea/material/Water';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import type { Stuff } from '../../stuff/Stuff';

let now = 5000;
beforeEach(() => {
  seedKernelContentStore();
  installAromas([{ word: 'rot', liking: { peak: 1.5, width: 2, valence: -1 } }, 'grain']);
  now = 5000;
  vi.spyOn(WorldClockApi, 'getNow').mockImplementation(() => Quantity.of(now, 's'));
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

/** A body with its born draw at the center, so the curve reads plainly. */
function mouth() {
  const body = soilBody();
  vi.spyOn(body, 'getIdentityPath').mockReturnValue('/x/plain');
  return body;
}

const taste = (type: string, gPerKg: number) => ({
  type,
  ou: gPerKg / TASTE_THRESHOLDS[type]!,
});
const flavor = (...tastes: { type: string; ou: number }[]) => ({
  tastes,
  aromas: Smell.ZERO,
});

describe('the tongue', () => {
  it('a pinch and a handful are far apart', () => {
    const body = mouth();
    expect(body.tongue(flavor(taste('salty', 2))).tastePhrases()[0]).toMatch(/barely|faintly/);
    expect(body.tongue(flavor(taste('salty', 250))).tastePhrases()[0]).toMatch(/overpoweringly/);
  });

  it('a little bitter cuts through a lot of sugar', () => {
    const body = mouth();
    const phrases = body
      .tongue(flavor(taste('sweet', 100), taste('bitter', 0.05)))
      .tastePhrases();
    expect(phrases.join()).toMatch(/bitter/);
  });

  it('below threshold nobody reads it', () => {
    expect(mouth().tongue(flavor({ type: 'sweet', ou: 0.1 })).tastes).toEqual([]);
  });
});

describe('liking', () => {
  const full = (body: ReturnType<typeof mouth>) =>
    vi.spyOn(body, 'getReserve').mockReturnValue({
      capacity: Quantity.of(100, 'kcal' as never),
      current: Quantity.of(100, 'kcal' as never),
    } as never);

  it('too salty is the same curve past its peak, and reads badly to both', () => {
    const a = mouth();
    const b = soilBody();
    vi.spyOn(b, 'getIdentityPath').mockReturnValue('/x/other');
    full(a);
    full(b);
    expect(a.liking([taste('salty', 250)]).score).toBeLessThan(-0.2);
    expect(b.liking([taste('salty', 250)]).score).toBeLessThan(-0.2);
    expect(a.liking([taste('salty', 6)]).score).toBeGreaterThan(0.2);
  });

  it('everyone agrees about a rotten one', () => {
    const a = mouth();
    full(a);
    expect(a.liking([{ type: aromaPath('rot'), ou: 3000 }]).word).toBe('revolting');
  });

  it('two people born apart read one soup apart', () => {
    const scores = ['/x/a', '/x/b', '/x/c', '/x/d', '/x/e'].map((id) => {
      const body = soilBody();
      vi.spyOn(body, 'getIdentityPath').mockReturnValue(id);
      full(body);
      return body.liking([taste('umami', 5)]).score;
    });
    expect(new Set(scores).size).toBeGreaterThan(1);
  });

  it('hunger lifts a plain meal', () => {
    const body = mouth();
    full(body);
    const plain = [taste('bitter', 0.01)];
    const fed = body.liking(plain).score;
    vi.spyOn(body, 'getReserve').mockReturnValue({
      capacity: Quantity.of(100, 'kcal' as never),
      current: Quantity.of(5, 'kcal' as never),
    } as never);
    expect(body.liking(plain).score).toBeGreaterThan(fed + 0.3);
    expect(body.hungerRaises()).toBe(true);
  });

  it('exposure raises liking, up to its cap', () => {
    const body = mouth();
    full(body);
    const bitter = [taste('bitter', 0.05)];
    const before = body.liking(bitter).score;
    for (let i = 0; i < 40; i++) body.recordExposure(bitter);
    const after = body.liking(bitter).score;
    expect(after - before).toBeCloseTo(0.3);
  });

  it('an aversion reads nothing until symptoms arrive', () => {
    const body = mouth();
    full(body);
    const soup = [taste('umami', 5)];
    body.recordAversion('stew', now + 100);
    expect(body.liking(soup, { foodKey: 'stew' }).score).toBeGreaterThan(-0.6);
    now += 200;
    expect(body.liking(soup, { foodKey: 'stew' }).score).toBeLessThanOrEqual(-0.6);
    expect(body.liking(soup, { foodKey: 'other' }).score).toBeGreaterThan(-0.6);
  });

  it('the records are bounded', () => {
    const body = mouth();
    for (let i = 0; i < 80; i++) {
      now += 1;
      body.recordExposure([{ type: `w${i}`, ou: 1 }]);
      body.recordAversion(`f${i}`, now);
    }
    expect(Object.keys(body.getExposures())).toHaveLength(64);
    expect(Object.keys(body.getAversions())).toHaveLength(32);
  });
});

describe('what a palate reads of the making (matter-model-overlaps D2)', () => {
  /** A flask holding `payload` — a batch in any vessel. */
  function batch(payload: Record<string, unknown>): Flask {
    const water = makeStuffAtPath(() => {
      const m = new Water();
      m.setName('whiskey');
      m.setDensity(Quantity.of(950, 'kg/m³'));
      return m;
    }, '/stuff/idea/material/_palate/whiskey');
    const flask = makeStuff(() => new Flask());
    flask.interiorBulk = true;
    flask.setInteriorCapacity(Quantity.of(2, 'L'));
    flask.setBulkMaterial('interior', water as unknown as Water);
    flask.setBulkAmount('interior', Quantity.of(1, 'L'));
    flask.setBulkPayload('interior', payload as never);
    return flask;
  }
  const detailsOf = (body: ReturnType<typeof mouth>, food: Stuff) =>
    (body as unknown as { detailsOf(f: Stuff): { gradeBand: string | null } }).detailsOf(food);

  it('⭐ a batch made by no recipe (a still’s cut) reads its grade to any mouth, as it does to the eye (found by the drive)', () => {
    const body = mouth();
    expect(detailsOf(body, batch({ grade: 'poor', maker: '/x/distiller' })).gradeBand).toBe('poor');
  });

  it('a recipe’s batch reads its grade only to a palate proficient in the recipe’s discipline', () => {
    const body = mouth();
    vi.spyOn(CraftingApi, 'blendDiscipline').mockReturnValue('distilling');
    expect(detailsOf(body, batch({ grade: 'poor', recipeId: 'vat-whisky' })).gradeBand).toBeNull();
  });
});
