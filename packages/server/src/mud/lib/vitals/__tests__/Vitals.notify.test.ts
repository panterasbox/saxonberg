/**
 * ⭐⭐ The notify layer (recovery D19) — an ALARM, not a heartbeat.
 *
 * A one-shot booked at the next interesting transition (a wound-sepsis
 * becoming symptomatic) tells a player their body changed, instead of the
 * change sitting invisible until the next `look`. The load-bearing contract
 * is that it buys TIMELINESS, never VALIDITY: delete the alarm and the game
 * is still correct, only less timely.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { MessageApi } from '../../../api/message';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { AfflictionRecord } from '../../../platform/idea/Condition';

const SEPSIS = '/platform/idea/Condition/pathogen/wound-sepsis';

const atGameSeconds = (g: number): void => {
  const scale = WorldClockApi.getScale();
  WorldClockApi._setNowProviderForTesting(() => (g * 1000) / scale);
};

/** A sepsis record whose symptoms begin at `symptomsAt` game-seconds. */
function septicRecord(symptomsAt: number): AfflictionRecord {
  return {
    kind: 'affliction',
    templatePath: SEPSIS,
    stage: 0,
    elapsed: 0,
    pathogenLoad: 0.2,
    symptomsAt,
  };
}

/** Read the festering truth exactly as `assess` derives it. */
const isFestering = (c: Creature, nowS: number): boolean =>
  c
    .getConditions()
    .some(
      (x) =>
        x.kind === 'affliction' &&
        x.templatePath.endsWith('/wound-sepsis') &&
        (x.pathogenLoad ?? 0) > 0 &&
        nowS >= (x.symptomsAt ?? Infinity),
    );

beforeEach(() => {
  installV1QuantityMarshallers();
  atGameSeconds(10_000);
  // onNotifyFire pushes a message; silence it.
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the notify alarm — a courtesy on top of derive-on-read', () => {
  it('⭐ nextInterestingAt is the pending sepsis symptomsAt', () => {
    const c = makeStuff(() => new Creature());
    c.afflict(septicRecord(10_000 + 3600));
    expect(c.nextInterestingAt()).toBe(10_000 + 3600);
  });

  it('⭐ a healthy body has no pending transition (holds no handle)', () => {
    const c = makeStuff(() => new Creature());
    expect(c.nextInterestingAt()).toBeNull();
  });

  it('⭐ a transition already in the past is not pending', () => {
    const c = makeStuff(() => new Creature());
    c.afflict(septicRecord(10_000 - 100)); // already symptomatic
    expect(c.nextInterestingAt()).toBeNull();
  });

  it('⭐⭐ TIMELINESS-not-validity: fire the alarm or not, the read is identical', () => {
    // Two identical bodies with the same pending sepsis. One gets its alarm
    // fired; the other is simply read at the same clock. They must agree.
    const fired = makeStuff(() => new Creature());
    const unfired = makeStuff(() => new Creature());
    fired.afflict(septicRecord(10_000 + 1000));
    unfired.afflict(septicRecord(10_000 + 1000));

    // Advance past the transition.
    atGameSeconds(10_000 + 2000);
    const nowS = WorldClockApi.getNow().rawValue();

    // Fire the alarm on one (reconcile + the message push).
    (fired as unknown as { onNotifyFire(): void }).onNotifyFire();
    // The other never fires — just a normal read. `getConditions()` is
    // the public reconcile-on-read seam (it calls the private reconcile).
    unfired.getConditions();

    // Both derive the identical festering truth. The alarm added no authority.
    expect(isFestering(fired, nowS)).toBe(isFestering(unfired, nowS));
    expect(isFestering(unfired, nowS)).toBe(true);
  });

  it('⭐ firing the alarm changes nothing a plain reconcile would not', () => {
    const c = makeStuff(() => new Creature());
    c.afflict(septicRecord(10_000 + 500));
    atGameSeconds(10_000 + 1000);
    const nowS = WorldClockApi.getNow().rawValue();

    (c as unknown as { onNotifyFire(): void }).onNotifyFire();
    const afterFire = c.getConditions().length;
    // A second plain read (getConditions reconciles on read); idempotent.
    const afterReconcile = c.getConditions().length;
    // Idempotent: a second read after the fire changes nothing.
    expect(afterReconcile).toBe(afterFire);
    void nowS;
  });
});
