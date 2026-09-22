/**
 * ⭐⭐ `penetration` — the one line that makes a firearm different from a
 * sword.
 *
 * It was deliberately absent from the ranged build: *"a sectional-
 * behaviour axis that only earns its keep against armor, and armor is a
 * later wave — adding it now would mean authoring a number with no
 * consumer to keep it honest."* That wait was right, and its consumer is
 * here now.
 *
 * The claim: **armour answers PRESSURE, not energy.** A sword thrust and
 * a musket ball can carry comparable energy; what differs is the area it
 * arrives over, and that is two orders of magnitude.
 */

import { describe, it, expect } from 'vitest';
import {
  DeliveryProfile,
  DEFAULT_DELIVERY_PROFILE_CONFIG,
  type DeliveryInputs,
} from '../DeliveryProfile';

const base: DeliveryInputs = {
  energySource: 'muscle',
  massKg: 0.1,
  speedMs: 20,
  channel: 'point',
  band: 'near',
  envelope: 'far',
};

const profile = (over: Partial<DeliveryInputs>): DeliveryProfile =>
  DeliveryProfile.derive({ ...base, ...over });

describe('penetration is DERIVED, never authored', () => {
  it('⭐ a projectile with no calibre reads exactly 1 — every shipped throw', () => {
    // A rock, a chair leg, a flask: nothing shaped to concentrate its
    // energy. Byte-identical to the shipped behaviour.
    expect(profile({}).penetration).toBe(1);
  });

  it('⭐⭐ a musket ball is several times an ordinary blow', () => {
    // ~1.5 kJ over a 16 mm face: 1500 / (π·0.008²) ≈ 7.5 MJ/m², against
    // a 2 MJ/m² reference ≈ 3.7.
    const ball = profile({
      massKg: 0.03,
      speedMs: 316, // ½·0.03·316² ≈ 1.5 kJ
      calibreM: 0.016,
    });
    expect(ball.energyJ).toBeGreaterThan(1400);
    expect(ball.penetration).toBeGreaterThan(3);
    expect(ball.penetration).toBeLessThan(5);
  });

  it('⚠ an ARROW is barely penetrative by this measure, and that is honest', () => {
    // ~50 J over a broad head. An arrow beats mail by being a POINT —
    // the channel — not by arriving at firearm pressure. Conflating the
    // two would have made every bow a gun.
    const arrow = profile({
      massKg: 0.03,
      speedMs: 58, // ≈ 50 J
      calibreM: 0.008,
      balancedForFlight: true,
    });
    expect(arrow.penetration).toBeLessThan(2);
  });

  it('⭐ a NARROWER ball at the same energy penetrates more — it is pressure', () => {
    const wide = profile({ massKg: 0.03, speedMs: 316, calibreM: 0.02 });
    const narrow = profile({ massKg: 0.03, speedMs: 316, calibreM: 0.01 });
    expect(narrow.penetration).toBeGreaterThan(wide.penetration);
  });

  it('never falls BELOW 1 — armour is never made better by being shot', () => {
    const feeble = profile({ massKg: 0.001, speedMs: 2, calibreM: 0.05 });
    expect(feeble.penetration).toBe(1);
  });

  it('a zero or negative calibre is ignored rather than dividing by zero', () => {
    expect(profile({ calibreM: 0 }).penetration).toBe(1);
    expect(profile({ calibreM: -1 }).penetration).toBe(1);
  });

  it('the reference is a config value, not a magic number', () => {
    expect(DEFAULT_DELIVERY_PROFILE_CONFIG.referenceJPerM2).toBeGreaterThan(0);
  });

  it('⭐ …and it rides the InflictSpec, so the fold can see it', () => {
    const ball = profile({ massKg: 0.03, speedMs: 316, calibreM: 0.016 });
    const spec = ball.toInflictSpec('body.torso');
    expect(spec).not.toBeNull();
    expect(
      (spec as { penetration?: number }).penetration,
    ).toBeGreaterThan(3);
  });
});
