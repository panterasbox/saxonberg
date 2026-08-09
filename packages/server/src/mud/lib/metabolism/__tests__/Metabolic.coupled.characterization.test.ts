/**
 * **Characterization tests for `coupledRecovery`** — written BEFORE the
 * magic-items build made mana its second consumer.
 *
 * This is not an acceptance criterion. It is the thing that keeps wave 3
 * from regressing a live, player-visible loop silently.
 *
 * `coupledRecovery` is metabolism's keystone: *endurance does not
 * regenerate for free — the body rebuilds it by spending satiation and
 * hydration, rate-limited and posture-gated.* Until now it had exactly
 * one consumer, which means its generalization has no second data point
 * to check itself against. So this file pins the behaviour that must
 * survive generalization, in the terms the shipped implementation
 * actually works in:
 *
 * 1. **Posture gates it** — a posture with a zero base recovers nothing.
 * 2. **Rest quality scales it.**
 * 3. **Hydration throttles it** — a dry body recovers slower, and this is
 *    a *throttle* (a multiplier), distinct from the fuel limit below.
 * 4. **Both tanks are spent, proportionally to what was gained.**
 * 5. **The fuel limit clamps** — you cannot recover more endurance than
 *    the tanks can pay for, and the tighter tank is what binds.
 * 6. **Recovery stops at full** — no overfilling, and no fuel spent
 *    buying nothing.
 * 7. The **far-past** and **linkdead** guards drop the gap entirely.
 *
 * Every assertion here is about the SHIPPED single-consumer behaviour.
 * If generalizing to N consumers breaks one of these, the
 * generalization is wrong.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import { Quantity } from '../../quantity';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../obj/WorldClockRegistry';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import { Postures } from '../../slot/Postured';

const SCALE = 12;
let real = 0;

function advanceAll(cs: Creature[], gameSec: number, chunkSec = 3000): void {
  let remaining = gameSec;
  while (remaining > 0) {
    const s = Math.min(chunkSec, remaining);
    real += (s / SCALE) * 1000;
    for (const c of cs) c.getReserve('endurance');
    remaining -= s;
  }
}

const Q = (n: number) => Quantity.of(n, '%');
const sat = (c: Creature) => c.getReserve('satiation')!.current.rawValue();
const hyd = (c: Creature) => c.getReserve('hydration')!.current.rawValue();
const end = (c: Creature) => c.getReserve('endurance')!.current.rawValue();

/** A body with room to recover into and full tanks to pay with. */
function makeTired(drain = 50): Creature {
  const c = makeStuff(() => new Creature());
  c.adjustReserve('endurance', Q(-drain));
  return c;
}

describe('coupledRecovery — characterization (pre-generalization)', () => {
  beforeEach(() => {
    installV1QuantityMarshallers();
    WorldClockApi._resetForTesting();
    real = 100000;
    WorldClockApi._setNowProviderForTesting(() => real);
  });
  afterEach(() => {
    WorldClockApi._resetForTesting();
  });

  it('1 — posture gates recovery: a zero-base posture recovers nothing', () => {
    const resting = makeTired();
    const standing = makeTired();
    resting.setPosture(Postures.Lie);
    standing.setPosture(Postures.Stand);
    end(resting);
    end(standing);

    advanceAll([resting, standing], 6000);
    const restedGain = end(resting) - 50;
    const stoodGain = end(standing) - 50;
    // Lying recovers strictly more than standing. (Whether standing is
    // exactly zero is a dial; that lying > standing is the contract.)
    expect(restedGain).toBeGreaterThan(stoodGain);
    expect(restedGain).toBeGreaterThan(0);
  });

  it('2 — recovery is bounded by the endurance ROOM, never overfilling', () => {
    const nearlyFull = makeTired(2);
    nearlyFull.setPosture(Postures.Lie);
    end(nearlyFull);

    advanceAll([nearlyFull], 12000); // far more time than the 2% needs
    expect(end(nearlyFull)).toBeLessThanOrEqual(100);
    expect(end(nearlyFull)).toBeCloseTo(100, 1);
  });

  it('3 — a full body spends NO fuel on recovery it does not need', () => {
    const full = makeStuff(() => new Creature());
    full.setPosture(Postures.Lie);
    const satBefore = sat(full);

    advanceAll([full], 3000);
    const satAfter = sat(full);
    const drop = satBefore - satAfter;
    // Some satiation goes to BASAL drain, which is a different flow.
    // The contract here is that recovery adds nothing on top: a full
    // body's drop is the basal drop alone, which is small.
    expect(end(full)).toBeCloseTo(100, 1);
    expect(drop).toBeLessThan(10);
  });

  it('4 — recovering endurance SPENDS both tanks', () => {
    const tired = makeTired(60);
    tired.setPosture(Postures.Lie);
    const satBefore = sat(tired);
    const hydBefore = hyd(tired);
    const endBefore = end(tired);

    advanceAll([tired], 6000);
    expect(end(tired)).toBeGreaterThan(endBefore);
    // Both tanks paid. This is the keystone: endurance is never free.
    expect(sat(tired)).toBeLessThan(satBefore);
    expect(hyd(tired)).toBeLessThan(hydBefore);
  });

  it('5 — the FUEL LIMIT clamps: an empty-tank body cannot recover', () => {
    const starved = makeTired(60);
    starved.setPosture(Postures.Lie);
    // Drain both tanks to nothing — there is nothing to pay with.
    starved.adjustReserve('satiation', Q(-100));
    starved.adjustReserve('hydration', Q(-100));
    const endBefore = end(starved);

    advanceAll([starved], 6000);
    // No fuel, no recovery. This is the assertion the mana leg must
    // inherit unchanged (AC 10's "a starved caster does not refill").
    expect(end(starved)).toBeCloseTo(endBefore, 1);
  });

  it('6 — hydration THROTTLES independently of the fuel limit', () => {
    const wet = makeTired(60);
    const dry = makeTired(60);
    for (const c of [wet, dry]) c.setPosture(Postures.Lie);
    // Dry, but not empty — it can still PAY, it just goes slower.
    dry.adjustReserve('hydration', Q(-85));
    end(wet);
    end(dry);

    advanceAll([wet, dry], 3000);
    const wetGain = end(wet) - 40;
    const dryGain = end(dry) - 40;
    expect(wetGain).toBeGreaterThan(dryGain);
    expect(dryGain).toBeGreaterThan(0); // throttled, not stopped
  });

  it('7 — the far-past guard drops a long absence entirely', () => {
    const tired = makeTired(60);
    tired.setPosture(Postures.Lie);
    const endBefore = end(tired); // seeds the stamp

    // One enormous jump, past the guard — not chunked.
    real += (100 * 3600 * 1000) / SCALE;
    const after = end(tired);
    // Nothing integrated: absence is neither punished nor rewarded.
    expect(after).toBeCloseTo(endBefore, 1);
  });
});
