/**
 * EmploymentApi / EmploymentLogic tests — the gated relationship surface:
 * hire / fire / quit, the proprietor-authority check, and the Business
 * index (business-at-location + business-of-proprietor).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmploymentApi } from '../../../../api/employment';
import { BankingApi } from '../../../../api/banking';
import { AccessApi } from '../../../../api/access';
import { CompactApi } from '../../../../api/compact';
import BusinessEntity from '../../Business';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const BUSINESS = '/world/lounge/business';
const BAR = '/world/lounge/bar';
const DAVE = '/world/lounge/npc/dave';
const MARA = '/world/lounge/npc/mara';

class Worker extends EmployedMixin(Idea) {
  static _mixinName = 'Worker';
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.proprietorPath = DAVE;
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: ['MakerMixin'] },
  ];
  b.operatingLocations = [BAR];
  return b;
}

function seedWorker(path: string): Worker {
  return makeStuffAtPath(() => new Worker(), path);
}

describe('EmploymentApi / EmploymentLogic', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('hires an actor into a position (record materializes)', () => {
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    const emp = EmploymentApi.hire(biz, mara, 'bartender');
    expect(emp?.positionKey).toBe('bartender');
    expect(emp?.status).toBe('employed');
    const stored = mara.getEmployment(BUSINESS);
    expect(stored?.organizationPath).toBe(BUSINESS);
    expect(stored?.status).toBe('employed');
  });

  it('fires and quits by flipping status (history preserved)', () => {
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    EmploymentApi.hire(biz, mara, 'bartender');

    EmploymentApi.fire(biz, mara);
    expect(mara.getEmployment(BUSINESS)?.status).toBe('fired');

    EmploymentApi.quit(mara, BUSINESS);
    expect(mara.getEmployment(BUSINESS)?.status).toBe('quit');
  });

  it('finds the business operating at a location', () => {
    const biz = seedBusiness();
    expect(EmploymentApi.businessAt(BAR)).toBe(biz);
    expect(EmploymentApi.businessAt('/platform/location/void')).toBeNull();
  });

  it('finds the business a subject proprietors', () => {
    const biz = seedBusiness();
    const dave = seedWorker(DAVE);
    expect(EmploymentApi.businessOfProprietor(dave)).toBe(biz);
    const stranger = seedWorker('/world/lounge/npc/remy');
    expect(EmploymentApi.businessOfProprietor(stranger)).toBeNull();
  });

  it('recognizes the proprietor via the direct edge', async () => {
    const biz = seedBusiness();
    const dave = seedWorker(DAVE);
    await expect(EmploymentApi.isProprietorOf(dave, biz)).resolves.toBe(true);
  });

  it('grants the operator override to the Prime Minister\'s SEAT (an office, never the founder)', async () => {
    const biz = seedBusiness();
    const stranger = seedWorker('/world/lounge/npc/remy');
    const holds = vi.spyOn(CompactApi, 'holdsOffice').mockResolvedValue(false);
    await expect(EmploymentApi.isProprietorOf(stranger, biz)).resolves.toBe(
      false,
    );
    holds.mockResolvedValue(true);
    await expect(EmploymentApi.isProprietorOf(stranger, biz)).resolves.toBe(
      true,
    );
    expect(holds).toHaveBeenCalledWith(stranger, 'prime-minister');
  });
});
