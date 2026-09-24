import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { EmployedMixin, type Employed } from '../Employed';
import BusinessEntity from '../../../platform/idea/Business';
import type { EmploymentData } from '../Employment';
import { StuffApi } from '../../../api/stuff';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';
import { SecurityError } from '../../security/errors';
import { ContainableMixin } from '../../spatial/Containable';
import { ContainerMixin } from '../../spatial/Container';
import { ContainmentApi } from '../../../api/containment';

class EmployedHost extends EmployedMixin(ContainableMixin(Idea)) {
  static _mixinName = 'EmployedHost';
}
class EmployedTestRoom extends ContainerMixin(Idea) {
  static _mixinName = 'EmployedTestRoom';
}

const BUSINESS = '/world/lounge/idea/business';
const BAR = '/world/lounge/location/bar';

function rec(over: Partial<EmploymentData> = {}): EmploymentData {
  return {
    organizationPath: BUSINESS,
    positionKey: 'bartender',
    status: 'employed',
    hiredAt: 0,
    onShiftSince: null,
    ...over,
  };
}

describe('EmployedMixin', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('reports no employment on an unemployed (null-store) actor', () => {
    const a = makeStuff(() => new EmployedHost());
    expect(a.getEmployments()).toEqual([]);
    expect(a.getEmployment(BUSINESS)).toBeUndefined();
    expect(a.getActiveEmployment()).toBeUndefined();
    expect(a.isOnShift()).toBe(false);
    expect(a.isFulfilling()).toBe(false);
  });

  it('reads stored records as value objects', () => {
    const a = makeStuff(() => new EmployedHost());
    a.employments = [rec({ status: 'on-shift', onShiftSince: 50 })];
    expect(a.getEmployment(BUSINESS)?.status).toBe('on-shift');
    expect(a.getEmployment(BUSINESS)?.onShiftSince).toBe(50);
    expect(a.isOnShift()).toBe(true);
    expect(a.getActiveEmployment()?.positionKey).toBe('bartender');
  });

  it('excludes quit/fired from the active employment', () => {
    const a = makeStuff(() => new EmployedHost());
    a.employments = [rec({ status: 'fired' })];
    expect(a.getActiveEmployment()).toBeUndefined();
  });

  it('fulfils only while on shift', () => {
    // A live Business the on-shift employment resolves its seat off, with
    // the host standing somewhere it operates. (The full three-condition
    // truth table, employer-bounding included, is `conferral.test.ts`.)
    const biz = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
    biz.positions = [
      { key: 'bartender', label: 'bar', wageRate: 1, fulfills: ['bartending'] },
    ];
    biz.operatingLocations = [BAR];
    const bar = makeStuffAtPath(() => new EmployedTestRoom(), BAR);

    const a = makeStuff(() => new EmployedHost());
    ContainmentApi.move(a as never, bar as never);
    a.employments = [rec({ status: 'on-shift', onShiftSince: 1 })];
    expect(a.isFulfilling()).toBe(true);

    a.employments = [rec({ status: 'off-shift' })];
    expect(a.isFulfilling()).toBe(false);
  });

  describe('privileged mutators rejected outside the engine', () => {
    it('throws SecurityError on a direct _upsertEmployment call', () => {
      const a = makeStuff(() => new EmployedHost()) as unknown as Employed;
      expect(() => a._upsertEmployment(rec())).toThrowError(SecurityError);
    });

    it('throws SecurityError on a direct _setEmploymentStatus call', () => {
      const a = makeStuff(() => new EmployedHost()) as unknown as Employed;
      expect(() =>
        a._setEmploymentStatus(BUSINESS, 'on-shift'),
      ).toThrowError(SecurityError);
    });

    it('throws SecurityError on a direct _removeEmployment call', () => {
      const a = makeStuff(() => new EmployedHost()) as unknown as Employed;
      expect(() => a._removeEmployment(BUSINESS)).toThrowError(SecurityError);
    });
  });
});
