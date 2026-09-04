/**
 * ⭐⭐ **A ferment with no sugar in it still ferments.**
 *
 * A live drive of the textile chain found that it did not. Retting is a
 * real slow bacterial ferment — flax straw in standing water for a
 * fortnight, pectin hydrolysed off the bast bundles, and four days past
 * ready the rot is into the cellulose and the batch is grey ruin — so
 * it models on `FermentingMixin` exactly as a wine does, and the
 * textile pack ships it as a `FermentProfile` over a `Vat`.
 *
 * It never started. `startBatch` read
 *
 *     profile !== null && this.startingSugarGPerL > 0 ? 'active' : 'idle'
 *
 * and flax straw has no sugar, so the pit sat `idle` forever and the
 * chain's first stage could not run. The SHAPE matched the mixin
 * perfectly; the PRECONDITION — that progress is sugar conversion —
 * did not hold. Nothing downstream uses sugar to advance a batch:
 * `fractionConverted` climbs by `rateAt(profile, tempK) * days`, and
 * `startingSugarGPerL` only seeds the gravity and ABV READOUTS, which
 * correctly report nothing for a ferment that makes no alcohol.
 *
 * ⚠ This is the regression guard for that. It is deliberately NOT a
 * textile test: the fix is the mixin's, the fixture is synthetic, and
 * the claim under test is the general one — **a matched profile is what
 * makes a batch, not the presence of sugar.**
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Vat from '../../../platform/thing/Vat';
import FermentProfile from '../../../platform/idea/ferment/FermentProfile';
import Material from '../../material/Material';
import { WorldClockApi } from '../../../api/worldclock';
import { StuffApi } from '../../../api/stuff';
import { Quantity } from '../../quantity';
import { makeStuff, makeStuffAtPath } from '../../security/__tests__/test-setup';
import '../../../platform/idea/WorldClockRegistry';

const DAY = 86_400;
const BASE = 20_000_000;
let now = BASE;
const setNow = (s: number) => {
  now = BASE + s;
};

// Globally-unique fixture paths (the Thermal harness rule).
const STRAW = '/stuff/idea/sugarfree-test/idea/material/test-straw';
const FIBRE = '/stuff/idea/sugarfree-test/idea/material/test-fibre';
const RUINED = '/stuff/idea/sugarfree-test/idea/material/test-ruined';
const PROFILE = '/stuff/idea/sugarfree-test/idea/ferment/test-ret';

let stood = false;
function standFixtures(): void {
  if (stood) return;
  stood = true;
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test straw');
    // ⭐ The whole point: tags match the profile, and there is NO sugar
    // — no `nutrients`, no `nutrientAmounts`. A stem, not a must.
    m.setTags(['organic', 'fibre-stock', 'test-ret']);
    return m;
  }, STRAW);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test fibre');
    m.setTags(['fibre']);
    return m;
  }, FIBRE);
  makeStuffAtPath(() => {
    const m = new Material();
    m.setName('test ruined fibre');
    m.setTags(['fibre', 'ruined']);
    return m;
  }, RUINED);
  makeStuffAtPath(() => {
    const p = new FermentProfile();
    p.setKey('test-ret');
    p.setInputCategory('test-ret');
    p.setStallBelowK(283);
    p.setHappyK(295);
    p.setDamageAboveK(305);
    p.setRatePerDay(0.1); // ten days to ready — round numbers
    p.setProductMaterial(FIBRE);
    p.setTurnedMaterial(RUINED);
    p.setTurnDays(4);
    return p;
  }, PROFILE);
}

function makePit(tempK = 295): Vat {
  const v = makeStuff(() => new Vat());
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  // ⚠ A pit in the ground has NO LID, and that is the axis the over-run
  // reads: `turned` only bites an unsealed vessel. (`closure` is the
  // other axis entirely — retention — and a stone-lined pool is
  // `liquidTight`, which is what a `Vat` already defaults to.)
  v.setOpen(true);
  // Pin AFTER the seal change: `setOpen` is a thermal re-stamp trigger.
  v.lastAmbientK = tempK;
  v.stampedTemperatureK = tempK;
  return v;
}

function fillWithStraw(v: Vat, litres = 20): void {
  const straw = StuffApi.findByTemplatePath<Material>(STRAW)!;
  v.setBulkMaterial('interior', straw);
  v.setBulkAmount('interior', Quantity.of(litres, 'L'));
  // ⚠ Prime the reconcile: the FIRST read after a fill anchors the
  // batch clock and returns zero, so a test that reads only once, late,
  // measures nothing. (Live this is invisible — anything that looks at
  // the vessel anchors it.)
  void v.getFermentPhase();
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  setNow(0);
  WorldClockApi._setNowProviderForTesting(() => now);
  WorldClockApi.setScale(1000); // one provider unit = one game-second
  standFixtures();
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe('a sugar-free ferment', () => {
  it('⭐⭐ goes ACTIVE on a matched profile, with no sugar anywhere', () => {
    const pit = makePit();
    fillWithStraw(pit);
    expect(pit.getFermentPhase()).toBe('active');
    expect(pit.getFermentProfileKey()).toBe('test-ret');
    // The readouts are honest about there being no alcohol in this.
    expect(pit.getStartingSugarGPerL()).toBe(0);
    expect(pit.getAbvPercent()).toBe(0);
  });

  it('⭐ converts on TIME and temperature, and lands on the product', () => {
    const pit = makePit();
    fillWithStraw(pit);
    // Exactly `ratePerDay` — no sugar term anywhere in the integral.
    setNow(5 * DAY);
    expect(pit.getFractionConverted()).toBeCloseTo(0.5, 6);
    expect(pit.getFermentPhase()).toBe('active');

    setNow(11 * DAY);
    expect(pit.getFermentPhase()).toBe('finished');
    expect(pit.getBulkMaterialPath('interior')).toBe(FIBRE);
  });

  it('⚠⚠ over-runs into ruin if it is left in — the one failure you cause', () => {
    const pit = makePit();
    fillWithStraw(pit);
    setNow(11 * DAY);
    expect(pit.getFermentPhase()).toBe('finished');

    // Four more days in the water and the rot is past the point of use.
    setNow(16 * DAY);
    expect(pit.getFermentPhase()).toBe('turned');
    expect(pit.getBulkMaterialPath('interior')).toBe(RUINED);
  });

  it('cold still stalls it — a sugar-free batch obeys the same weather', () => {
    const pit = makePit(275); // below stallBelowK
    fillWithStraw(pit);
    setNow(11 * DAY);
    expect(pit.getFractionConverted()).toBe(0);
    expect(pit.getFermentPhase()).toBe('active');
  });

  it('an UNMATCHED material still idles — the phase keeps its meaning', () => {
    const pit = makePit();
    const fibre = StuffApi.findByTemplatePath<Material>(FIBRE)!;
    pit.setBulkMaterial('interior', fibre);
    pit.setBulkAmount('interior', Quantity.of(20, 'L'));
    expect(pit.getFermentPhase()).toBe('idle');
    expect(pit.getFermentProfileKey()).toBe('');
  });
});
