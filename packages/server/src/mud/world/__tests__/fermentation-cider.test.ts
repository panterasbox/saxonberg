/**
 * The author-expressiveness proof (fermentation W7, the acceptance's
 * second-drink test): CIDER FROM ROWS ALONE. No apple ships, so this
 * test authors a synthetic fruit must + a cider profile + a cider
 * material — pure data of the shapes a content pack writes — and the
 * ferment runs correctly with ZERO kernel edits, asserted by
 * construction: everything below is `makeStuffAtPath` over authored
 * field values; nothing subclasses, patches, or reaches past the
 * authoring surface.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../platform/thing/Vat';
import FermentProfile from '../../platform/idea/ferment/FermentProfile';
import Material from '../../lib/material/Material';
import { WorldClockApi } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../lib/security/__tests__/test-setup';
import '../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const BASE = 60_000_000;
let now = BASE;

beforeEach(() => {
  WorldClockApi._resetForTesting();
  now = BASE;
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('cider from rows alone (the second-drink test)', () => {
  it('an authored fruit must + profile + product ferments, turns, and grades — zero kernel edits', () => {
    // ── the rows an author would ship (data only) ──
    const must = makeStuffAtPath(() => {
      const m = new Material();
      m.setName('apple must');
      m.setTags(['liquid', 'must', 'apple-must']);
      m.setNutrients(['water', 'sugar']);
      m.setNutrientAmounts({ sugar: 130 });
      return m;
    }, '/test/cider/idea/material/apple-must');
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('cider');
      m.setTags(['liquid', 'beverage', 'drinkable', 'alcoholic', 'cider']);
      return m;
    }, '/test/cider/idea/material/cider');
    makeStuffAtPath(() => {
      const m = new Material();
      m.setName('cider vinegar');
      m.setTags(['liquid', 'vinegar']);
      return m;
    }, '/test/cider/idea/material/cider-vinegar');
    makeStuffAtPath(() => {
      const p = new FermentProfile();
      p.setKey('cider');
      p.setInputCategory('apple-must');
      p.setStallBelowK(281);
      p.setHappyK(289);
      p.setDamageAboveK(301);
      p.setRatePerDay(0.15);
      p.setProductMaterial('/test/cider/idea/material/cider');
      p.setTurnedMaterial('/test/cider/idea/material/cider-vinegar');
      p.setTurnDays(3);
      return p;
    }, '/test/cider/idea/ferment/cider');

    // ── the world does the rest ──
    const vat = makeStuff(() => new Vat());
    vat.lastAmbientK = 289;
    vat.stampedTemperatureK = 289;
    vat.setBulkMaterial('interior', must);
    vat.setBulkAmount('interior', Quantity.of(30, 'L'));

    expect(vat.getFermentPhase()).toBe('active'); // matched by tag
    expect(vat.getFermentProfileKey()).toBe('cider');
    now = BASE + 4 * DAY;
    expect(vat.getFractionConverted()).toBeCloseTo(0.6, 9);
    expect(vat.getAbvPercent()).toBeCloseTo((130 * 0.6) / 17, 9);
    now = BASE + 8 * DAY;
    expect(vat.getFermentPhase()).toBe('finished');
    expect(vat.getBulkMaterialPath('interior')).toBe(
      '/test/cider/idea/material/cider',
    );
    // The batch graded off its history (never run hot → the top band).
    expect(vat.getWorstStretch()).toBe(1);

    // And D3 still teaches: opened and forgotten, it is vinegar.
    vat.open();
    now = BASE + 12 * DAY;
    expect(vat.getFermentPhase()).toBe('turned');
    expect(vat.getBulkMaterialPath('interior')).toBe(
      '/test/cider/idea/material/cider-vinegar',
    );
  });
});
