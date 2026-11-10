/**
 * ⭐ OperationEngagement owns the patient's hold (controller-liquidity C38):
 * a conscious patient thrashing free ENDS the operation, and the operation
 * frees the patient when it finishes either way. The controller used to
 * start the hold itself with a no-op abort, so the surgeon carried on.
 *
 * ⚠ Scheduler-free (the TendingEngagement precedent): `SchedulerApi` is
 * spied, and the engagement's hooks are called directly.
 */

import '../../../../test-bootstrap';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { SchedulerApi } from '../../../api/scheduler';
import {
  OperationEngagement,
  OperationPatientHold,
} from '../OperationEngagement';
import type { Stuff } from '../../stuff/Stuff';
import type { Engaged } from '../../activity/Engaged';

const surgeon = { stuffId: 'surgeon' } as unknown as Stuff & Engaged;
const patient = { stuffId: 'patient' } as unknown as Stuff & Engaged;

function spyScheduler(): { holds: OperationPatientHold[]; cancel: ReturnType<typeof vi.fn>; complete: ReturnType<typeof vi.fn> } {
  const holds: OperationPatientHold[] = [];
  vi.spyOn(SchedulerApi, 'start').mockImplementation(((e: unknown) => {
    if (e instanceof OperationPatientHold) holds.push(e);
    return { ok: true, status: 'started', note: {} };
  }) as never);
  const cancel = vi.fn();
  const complete = vi.fn();
  vi.spyOn(SchedulerApi, 'cancel').mockImplementation(cancel as never);
  vi.spyOn(SchedulerApi, 'complete').mockImplementation(complete as never);
  return { holds, cancel, complete };
}

afterEach(() => vi.restoreAllMocks());

describe('the operation holds its patient', () => {
  it('⭐ a patient thrashing free ends the operation (C38)', () => {
    const { holds, cancel } = spyScheduler();
    const op = new OperationEngagement({
      surgeon,
      durationMs: 1000,
      onComplete: () => {},
      onAbort: () => {},
      patient,
      patientCancelable: true,
    });
    op.onStart();
    expect(holds).toHaveLength(1);
    holds[0]!.onAbort('cancelled');
    expect(cancel).toHaveBeenCalledWith(op, 'operation-interrupted');
  });

  it('finishing the operation frees the patient, and reports no thrash', () => {
    const { holds, cancel, complete } = spyScheduler();
    const done = vi.fn();
    const op = new OperationEngagement({
      surgeon,
      durationMs: 1000,
      onComplete: done,
      onAbort: () => {},
      patient,
      patientCancelable: false,
    });
    op.onStart();
    op.onComplete();
    expect(done).toHaveBeenCalled();
    expect(complete).toHaveBeenCalledWith(holds[0]);
    expect(cancel).not.toHaveBeenCalled();
  });

  it('operating on yourself holds nobody', () => {
    const { holds } = spyScheduler();
    const op = new OperationEngagement({
      surgeon,
      durationMs: 1000,
      onComplete: () => {},
      onAbort: () => {},
      patient: surgeon,
    });
    op.onStart();
    expect(holds).toHaveLength(0);
  });
});
