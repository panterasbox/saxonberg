/**
 * Hazard (W14 / D46, D50, D52) — ⭐ **five failure shapes, deliberately
 * varied**, and the variety IS the texture.
 *
 * The first draft of this design was monotonic: everything degraded
 * gracefully. Each shape here teaches something different:
 *
 * | shape | example | what it teaches |
 * |---|---|---|
 * | sudden total loss | the fox, the hay fire | why you insure, why you diversify |
 * | the rescue trap | the slurry pit | that the second casualty is caused by the first |
 * | injury to the operator | handling | that a farm is a body, not a spreadsheet |
 *
 * ⚠⚠ And **D45 scopes all of them**: what accrues in your ABSENCE is a
 * slope, what happens in your PRESENCE may be a cliff, and weather is
 * neither because it is not a judgement on you.
 */

import '@saxonberg/server/test-bootstrap';
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { HandlingMixin } from '@saxonberg/server/mud/lib/husbandry/Handling';
import { Creature } from '@saxonberg/server/mud/lib/creature/Creature';
import { makeStuff } from '@saxonberg/server/mud/lib/security/__tests__/test-setup';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { brain as raids } from '../behavior/raids';

class TestBeast extends HandlingMixin(Creature) {}

const RAIDS_SRC = readFileSync(
  fileURLToPath(new URL('../behavior/raids.ts', import.meta.url)),
  'utf8',
);

describe('⭐⭐ handling is a SAFETY mechanic before it is an efficiency one (D46)', () => {
  it('a quiet animal presents essentially no risk', () => {
    const quiet = makeStuff(() => {
      const b = new TestBeast();
      b.handling = 0.95;
      return b;
    });
    expect(quiet.handlingRisk()).toBeLessThan(0.01);
    StuffApi.clearAll();
  });

  it('⭐ and a wild one is dangerous — steeply, not linearly', () => {
    const wild = makeStuff(() => {
      const b = new TestBeast();
      b.handling = 0.05;
      return b;
    });
    const wary = makeStuff(() => {
      const b = new TestBeast();
      b.handling = 0.5;
      return b;
    });
    // The square is what makes the whole quiet end safe and the wild end
    // sharp — which is how handling injuries actually distribute, and
    // why this is a reason to handle stock properly rather than a tax on
    // doing so.
    expect(wild.handlingRisk()).toBeGreaterThan(wary.handlingRisk() * 3);
    StuffApi.clearAll();
  });

  it('⚠ risk is a READ, and nothing in the substrate gates on it', () => {
    // The mixin publishes the number; the act decides what to do about
    // it. A build that gated `handle` on risk would have made the
    // dangerous animal unworkable rather than dangerous.
    const b = makeStuff(() => new TestBeast());
    expect(typeof b.handlingRisk()).toBe('number');
    expect(b.handle(1)).toBeGreaterThan(0);
    StuffApi.clearAll();
  });
});

describe('⭐⭐ the fox kills more than it takes (D50)', () => {
  it('runs unwatched — the whole failure is that it happens at night', () => {
    expect(raids.presenceGated).toBe(false);
  });

  it('⭐ a GUARD stops it outright — no roll, no partial loss', () => {
    // A keeper who kept a dog is simply not raided. That is what keeps
    // it a hazard with a buildable defence rather than a tax.
    expect(RAIDS_SRC).toMatch(/if \(guarded\) return;/);
  });

  it('⭐⭐ and when there is none, it kills EVERY bird — not one', () => {
    // The surplus kill is the shape: a sudden total loss in one night,
    // which is why you insure and why you diversify.
    expect(RAIDS_SRC).toMatch(/for \(const bird of prey\)/);
    expect(RAIDS_SRC).toMatch(/StuffApi\.destruct\(carried/);
  });

  it('⚠⚠ it never ROLLS for the outcome — only the timing is uncertain', () => {
    // `uncertainty.md`'s resolutional ban. The player's uncertainty is
    // about WHEN, which is environmental and legitimate; never about
    // whether their own defence worked.
    expect(RAIDS_SRC).not.toMatch(/Math\.random/);
  });

  it('⚠ and it takes no notice of who owns the ground — D64’s seam', () => {
    // Predators range across parcels, which makes abatement a COMMONS
    // problem and a hired job on the shipped work-contract substrate,
    // rather than a chore the holder grinds through.
    expect(RAIDS_SRC).not.toMatch(/ParcelApi|ownerOf/);
  });
});
