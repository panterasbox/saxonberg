/**
 * ⭐⭐⭐ The cooking law: does the method suit the meat?
 *
 * A muscle that works carries connective tissue; collagen gelatinizes
 * only under long moist heat. So a shoulder braises and a loin sears —
 * real food science, **predictable without a table**, which is what lens
 * 1 asks of every mechanism here.
 *
 * ⚠ The consequence is ONE BAND of grade either way. Not a refusal and
 * not a destroyed dish: a stewed loin is still dinner, just a worse one
 * than it should have been.
 *
 * ⚠⚠ **What is tested here is the CLASSIFICATION and the FIT** — the two
 * halves most likely to be wrong — through the value objects
 * `CraftingLogic.applyMethodFit` composes. The private function stays
 * private: exporting it for a test would need a sanctioned white-box
 * exception, and the arithmetic is reachable without one.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CookingAttempt, Texture } from '../../../../lib/butchery/Texture';

/** The shipped quadruped ladder, as `work`. */
const SHOULDER = 0.8;
const LOIN = 0.25;
const RIB = 0.4;

describe('CookingAttempt — what a recipe DOES to meat', () => {
  it('⭐ water plus a long hold is a BRAISE', () => {
    expect(new CookingAttempt('water', 7200).method()).toBe('long-moist');
  });

  it('⚠ water WITHOUT a long hold is a poach, not a braise', () => {
    // Below two game hours, water does nothing for collagen — which is
    // why `hearty-stew` had to start SAYING it is a braise rather than
    // riding the universe default.
    expect(new CookingAttempt('water', 300).method()).toBe('fast-dry');
    expect(new CookingAttempt('water', 0).method()).toBe('fast-dry');
  });

  it('no medium is a fast dry cook however long it runs', () => {
    expect(new CookingAttempt('', 7200).method()).toBe('fast-dry');
    expect(new CookingAttempt(null, 100).method()).toBe('fast-dry');
    // ⚠ Fat is not water: a confit is long, but collagen wants moisture.
    expect(new CookingAttempt('fat', 7200).method()).toBe('fast-dry');
  });
});

describe('the law, over the shipped muscle ladder', () => {
  it('⭐⭐⭐ a SHOULDER is rewarded by the braise and punished by the sear', () => {
    expect(new Texture(SHOULDER).fit('long-moist')).toBeGreaterThan(0);
    expect(new Texture(SHOULDER).fit('fast-dry')).toBeLessThan(0);
  });

  it('⭐⭐⭐ a LOIN is the other way round', () => {
    expect(new Texture(LOIN).fit('fast-dry')).toBeGreaterThan(0);
    expect(new Texture(LOIN).fit('long-moist')).toBeLessThan(0);
  });

  it('⭐⭐ and the mistakes are ASYMMETRIC', () => {
    // A tough cut cooked fast is inedible — all that collagen, none of it
    // dissolved. A tender cut braised is merely wasted: it still feeds
    // you, you have only destroyed the best thing on the carcass. So a
    // cook learns the worse lesson first.
    const seared = new Texture(SHOULDER).fit('fast-dry');
    const braised = new Texture(LOIN).fit('long-moist');
    expect(seared).toBeLessThan(braised);
  });

  it('a middling cut forgives either, so the grade does not move', () => {
    expect(new Texture(RIB).fit('long-moist')).toBe(0);
    expect(new Texture(RIB).fit('fast-dry')).toBe(0);
  });

  it('⚠ two cuts of opposite texture NET to nothing', () => {
    // What `applyMethodFit` sums: the honest answer is that you cooked
    // one of them well and the other badly.
    const net =
      new Texture(SHOULDER).fit('long-moist') +
      new Texture(LOIN).fit('long-moist');
    expect(net).toBeGreaterThan(0);
    const netSeared =
      new Texture(SHOULDER).fit('fast-dry') + new Texture(LOIN).fit('fast-dry');
    expect(netSeared).toBe(0);
  });
});
