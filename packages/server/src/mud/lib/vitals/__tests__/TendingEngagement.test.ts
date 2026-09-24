/**
 * ⭐ TendingEngagement (recovery D8) — a carer's attention buys the patient
 * recovery rate, and only while the carer is actually there holding it.
 *
 * ⚠ Scheduler-free: `SchedulerApi.start` needs the event framework
 * bootstrapped (a wire concern). The engagement's `onStart`/`onAbort` are
 * what set and clear the link, and the carer bonus is gated on the carer's
 * `getEngagementByType` — both exercised directly here. The slot exclusivity
 * ("one patient at a time") is the scheduler's, proven in the activity suite.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Creature } from '../../creature/Creature';
import { EngagedMixin } from '../../activity/Engaged';
import { TendingEngagement } from '../TendingEngagement';
import { ContainmentApi } from '../../../api/containment';
import Location from '../../stuff/Location';
import { Postures } from '../../slot/Postured';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import '../../../platform/idea/WorldClockRegistry';
import { makeStuff } from '../../security/__tests__/test-setup';
import { installV1QuantityMarshallers } from '../../persistence/__tests__/quantity-marshaller-test-helpers';
import type { Stuff } from '../../stuff/Stuff';
import type { Engaged } from '../../activity/Engaged';
import type { Vitals } from '../Vitals';

/** A carer: a Creature that can hold an engagement. */
class Carer extends EngagedMixin(Creature) {
  static override _mixinName: string = 'Carer';
}

const kOf = (c: Creature): number =>
  (c as unknown as { convalescenceFactor(): number }).convalescenceFactor();

/** Make the carer read as holding a tending engagement (bypasses the
 * scheduler, which needs the event framework). */
function pretendHolding(carer: Carer): void {
  (carer as unknown as {
    getEngagementByType: (t: string) => unknown;
  }).getEngagementByType = (t: string) =>
    t === 'medical-tending' ? {} : undefined;
}

function scene(): { room: Location; patient: Creature; carer: Carer } {
  const room = makeStuff(() => new Location());
  const patient = makeStuff(() => new Creature());
  patient.setPosture(Postures.Lie);
  ContainmentApi.move(patient, room);
  const carer = makeStuff(() => new Carer());
  ContainmentApi.move(carer, room);
  pretendHolding(carer);
  return { room, patient, carer };
}

/** Link a carer as the engagement's onStart would. */
function link(carer: Carer, patient: Creature, band = 'proficient'): TendingEngagement {
  const e = new TendingEngagement(
    carer as unknown as Stuff & Engaged,
    patient as unknown as Stuff & Vitals,
    band,
  );
  e.onStart();
  return e;
}

beforeEach(() => {
  installV1QuantityMarshallers();
  WorldClockApi._setNowProviderForTesting(() => 1_000_000);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('a carer buys recovery rate', () => {
  it('⭐⭐ a present carer raises k by their medicine band', () => {
    const { patient, carer } = scene();
    const before = kOf(patient); // lying, no carer → 1.0
    link(carer, patient, 'proficient');
    expect(kOf(patient)).toBeGreaterThan(before);
  });

  it('⭐ an untrained carer helps not at all', () => {
    const { patient, carer } = scene();
    const before = kOf(patient);
    link(carer, patient, 'untrained');
    expect(kOf(patient)).toBeCloseTo(before, 5);
  });

  it('⭐⭐ walking out of the room drops the bonus on the next read', () => {
    const { patient, carer } = scene();
    link(carer, patient, 'proficient');
    const tended = kOf(patient);
    // The carer leaves — the link is still set, but the read sees they are
    // no longer present and gives nothing.
    const elsewhere = makeStuff(() => new Location());
    ContainmentApi.move(carer, elsewhere);
    expect(kOf(patient)).toBeLessThan(tended);
  });

  it('⭐ onAbort clears the carer link', () => {
    const { patient, carer } = scene();
    const e = link(carer, patient, 'proficient');
    expect(patient.getCarer()).toBe(carer as unknown as Stuff);
    e.onAbort('tending-ended');
    expect(patient.getCarer()).toBeNull();
  });

  it('⭐ onAbort does NOT clear a link a newer carer took over', () => {
    const { room, patient } = scene();
    const carerA = makeStuff(() => new Carer());
    const carerB = makeStuff(() => new Carer());
    ContainmentApi.move(carerA, room);
    ContainmentApi.move(carerB, room);
    const eA = link(carerA, patient, 'proficient');
    link(carerB, patient, 'proficient'); // B takes over
    eA.onAbort('tending-ended'); // A's stale engagement ends
    // The link still points at B, not cleared by A's teardown.
    expect(patient.getCarer()).toBe(carerB as unknown as Stuff);
  });

  it('⭐ the engagement holds the ATTENTION slot', () => {
    const { patient, carer } = scene();
    const e = link(carer, patient);
    expect(e.slots.has('attention')).toBe(true);
    expect(e.type).toBe('medical-tending');
    expect(e.cancelable).toBe(true);
  });
});
