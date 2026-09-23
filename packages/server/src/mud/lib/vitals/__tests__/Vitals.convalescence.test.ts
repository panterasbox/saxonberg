/**
 * ⭐⭐ The convalescence factor `k` (recovery build, W-A1) — the one number
 * a bed, a carer and a spell all pay into, read once per reconcile and
 * multiplied into every wound's `mend`.
 *
 * The claims:
 *  - time is the FREE heal: standing on bare ground still knits, at the
 *    floor rate;
 *  - a rest surface raises the rate, and a CLINIC surface raises it more
 *    than a good bed does — WITHOUT being a better night's sleep (the
 *    `convalescence` field is a second axis beside `restQuality`, which
 *    alone still drives stamina recovery);
 *  - D3a: a body that is not SAFE (freshly harmed, or in a fight) mends
 *    NOTHING — the same rule online, linkdead or logged off.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Creature } from '../../creature/Creature';
import Chair from '../../../platform/thing/Chair';
import { Postures } from '../../slot/Postured';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { HARM_DEFAULTS } from '../../../platform/idea/Condition';
import type { Trauma } from '../../../platform/idea/Condition';
import Condition from '../../../platform/idea/Condition';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Slotted } from '../../slot/Slotted';
import type { Slottable } from '../../slot/Slottable';

let bedSeq = 0;

/** A posture-bearing rest surface with the two rest axes authored. */
function makeSurface(restQuality: number, convalescence?: number): Chair {
  const surface = makeStuffAtPath(
    () => new Chair(),
    `/stuff/thing/fixture/rest-${bedSeq++}`,
  );
  surface.setStaticSlots([
    {
      name: 'lie:1',
      accepts: 'SlottableMixin',
      capacity: 1,
      postures: [Postures.Lie, Postures.Sit],
    },
  ]);
  surface.setRestQuality(restQuality);
  if (convalescence !== undefined) surface.setConvalescence(convalescence);
  return surface;
}

/** Lay a body down on a surface's posture slot and set its posture. */
function lieOn(body: Creature, surface: Chair): void {
  (surface as unknown as Stuff & Slotted).occupyAll(
    body as unknown as Stuff & Slottable,
    ['lie:1'],
  );
  body.setPosture(Postures.Lie);
}

const kOf = (c: Creature): number =>
  (c as unknown as { convalescenceFactor(): number }).convalescenceFactor();

// ⚠ The now-provider is REAL-MILLISECONDS and `getNow()` = ms/1000 ×
// timeScale (game-seconds/real-second); harm stamps and the safe delay
// are in game-seconds. So to place the clock at a given GAME-second we
// divide back through the scale.
const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe('the convalescence factor — care buys rate', () => {
  it('⭐ standing on bare ground still heals, at the floor', () => {
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Stand);
    expect(kOf(c)).toBeCloseTo(HARM_DEFAULTS.CONVALESCENCE_FLOOR, 5);
  });

  it('lying down beats standing — posture alone', () => {
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Lie);
    // lie base 1.0, no surface → k = 1.0.
    expect(kOf(c)).toBeCloseTo(1.0, 5);
  });

  it('⭐⭐ the CLINIC cot beats the home bed for WOUNDS — the inversion fixed', () => {
    const onBed = makeStuff(() => new Creature());
    lieOn(onBed, makeSurface(2.0)); // a four-poster: restQuality 2, convalescence default 1
    const onCot = makeStuff(() => new Creature());
    lieOn(onCot, makeSurface(1.5, 2.0)); // a clinic cot: restQuality 1.5, convalescence 2

    const kBed = kOf(onBed);
    const kCot = kOf(onCot);
    expect(kBed).toBeCloseTo(2.0, 5); // 1.0 × 2.0 × 1.0
    expect(kCot).toBeCloseTo(3.0, 5); // 1.0 × 1.5 × 2.0
    // ⭐ The cot mends a WOUND faster despite being the worse night's sleep
    // (its restQuality 1.5 < the bed's 2.0 — stamina reads restQuality
    // alone, which the Metabolic characterization suite pins).
    expect(kCot).toBeGreaterThan(kBed);
  });

  it('the floor never drops below CONVALESCENCE_FLOOR', () => {
    // A cramped perch: restQuality below 1 while standing would push the
    // product under the floor, but the floor holds.
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Stand);
    lieOn(c, makeSurface(0.5)); // occupy, but standing base is 0.2 × 0.5 = 0.1
    c.setPosture(Postures.Stand); // lieOn set it to Lie; force standing
    expect(kOf(c)).toBeCloseTo(HARM_DEFAULTS.CONVALESCENCE_FLOOR, 5);
  });
});

describe('D12 — a condition can speed mending (the mend spell)', () => {
  const MENDING = '/platform/idea/Condition/_test/mending';

  it('⭐⭐ an active convalescence condition multiplies k by its factor', () => {
    // The mending condition the `mend` spell lays on: a read-time
    // convalescence effect with factor 3.
    makeStuffAtPath(() => {
      const row = new Condition();
      row.setName('mending');
      row.setSignature([{ kind: 'convalescence', factor: 3 }]);
      return row;
    }, MENDING);

    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Lie);
    const base = kOf(c); // 1.0
    c.afflict({
      kind: 'affliction',
      templatePath: MENDING,
      stage: 0,
      elapsed: 0,
    });
    expect(kOf(c)).toBeCloseTo(base * 3, 5);
  });
});

describe('D3a — convalescence requires safety (intent-agnostic)', () => {
  it('⭐⭐ a freshly harmed body mends NOTHING, then resumes once safe', () => {
    const c = makeStuff(() => new Creature());
    c.setPosture(Postures.Lie);
    // Safe to start (never harmed).
    expect(kOf(c)).toBeCloseTo(1.0, 5);

    // Take a wound: the safety clock is stamped at afflict.
    const cut: Trauma = {
      kind: 'trauma',
      type: 'laceration',
      site: 'body.arm.left',
      severity: 1,
      bleeding: true,
    };
    c.afflict(cut);
    // Immediately after harm → not safe → k is 0 (overriding the floor).
    expect(kOf(c)).toBe(0);

    // Still unsafe just before the delay elapses.
    atGameSeconds(10_000 + HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY - 1);
    expect(kOf(c)).toBe(0);

    // Safe once the delay has passed — mending resumes at the normal rate.
    atGameSeconds(10_000 + HARM_DEFAULTS.CONVALESCENCE_SAFE_DELAY + 1);
    expect(kOf(c)).toBeCloseTo(1.0, 5);
  });
});
