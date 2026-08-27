import { describe, it, expect } from 'vitest';
import {
  Employment,
  EMPLOYMENT_STATUSES,
  type EmploymentData,
} from '../Employment';

const BASE: EmploymentData = {
  organizationPath: '/world/lounge/business',
  positionKey: 'bartender',
  status: 'employed',
  hiredAt: 100,
  onShiftSince: null,
};

describe('Employment', () => {
  it('exposes the full status vocabulary', () => {
    expect(EMPLOYMENT_STATUSES).toEqual([
      'employed',
      'on-shift',
      'off-shift',
      'quit',
      'fired',
    ]);
  });

  it('round-trips through serialize/fromData', () => {
    const e = Employment.of(BASE);
    expect(Employment.fromData(e.serialize()).serialize()).toEqual(BASE);
  });

  it('coerces an unknown status to employed', () => {
    const e = Employment.fromData({
      ...BASE,
      status: 'promoted' as unknown as EmploymentData['status'],
    });
    expect(e.status).toBe('employed');
  });

  it('reports on-shift only for the on-shift status', () => {
    expect(Employment.of({ ...BASE, status: 'on-shift' }).isOnShift()).toBe(
      true,
    );
    expect(Employment.of(BASE).isOnShift()).toBe(false);
  });

  it('withStatus returns a new immutable record', () => {
    const e = Employment.of(BASE);
    const on = e.withStatus('on-shift', 200);
    expect(on.status).toBe('on-shift');
    expect(on.onShiftSince).toBe(200);
    // original untouched
    expect(e.status).toBe('employed');
    expect(e.onShiftSince).toBeNull();
    // identity fields carried
    expect(on.organizationPath).toBe(BASE.organizationPath);
    expect(on.hiredAt).toBe(BASE.hiredAt);
  });
});
