/**
 * The employee roster memo — the read that replaced *walk every object in
 * the world and ask each one whether it works here*, which ran once per
 * wage settlement and once per holder read.
 *
 * What has to stay true of a memo that is filled lazily and maintained by
 * a witness rather than a rebuild:
 *
 *  - a hire is visible **immediately**, without a re-derivation;
 *  - so is an actor whose records arrive by assignment (the shape the
 *    Hydrator and the persistence spine both land on);
 *  - a reload re-derives the same answer from the index, because the memo
 *    is never warmed and nothing at boot is responsible for it;
 *  - an exit stays **in** the roster — `holdersByPosition` needs to see a
 *    terminal record in order to suppress the authored roster entry, so
 *    "everyone with a record" is the contract, not "everyone employed".
 */

import '../../../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { EmploymentApi } from '../../../../api/employment';
import { BankingApi } from '../../../../api/banking';
import BusinessEntity from '../../Business';
import { EmployedMixin } from '../../../../lib/employment/Employed';
import { Idea } from '../../../../lib/stuff/Idea';
import { StuffApi } from '../../../../api/stuff';
import { makeStuffAtPath } from '../../../../lib/security/__tests__/test-setup';

const BUSINESS = '/test/roster/idea/business';
const BAR = '/test/roster/location/bar';
const DAVE = '/test/roster/agent/dave';
const MARA = '/test/roster/agent/mara';
const KIT = '/test/roster/agent/kit';

class Worker extends EmployedMixin(Idea) {
  static _mixinName = 'Worker';
}

function seedBusiness(): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BUSINESS);
  b.proprietorPath = DAVE;
  b.banksAt = BankingApi.defaultCustodianBank();
  b.positions = [
    { key: 'bartender', label: 'tending bar', wageRate: 12, confers: [] },
  ];
  b.operatingLocations = [BAR];
  return b;
}

const seedWorker = (path: string): Worker =>
  makeStuffAtPath(() => new Worker(), path);

describe('the employee roster memo', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('sees a hire immediately, with no re-derivation', async () => {
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    // Read FIRST, so the memo is filled while the roster is empty — the
    // case a rebuild-on-miss would paper over.
    expect(EmploymentApi.employeesOf(BUSINESS)).toEqual([]);
    await biz.appoint(mara, 'bartender');
    expect([...EmploymentApi.employeesOf(BUSINESS)]).toEqual([MARA]);
  });

  it('sees records that arrive by assignment (the hydrate/restore shape)', () => {
    seedBusiness();
    const kit = seedWorker(KIT);
    expect(EmploymentApi.employeesOf(BUSINESS)).toEqual([]);
    kit.employments = [
      {
        organizationPath: BUSINESS,
        positionKey: 'bartender',
        status: 'employed',
        hiredAt: 0,
        onShiftSince: null,
      },
    ];
    expect([...EmploymentApi.employeesOf(BUSINESS)]).toEqual([KIT]);
  });

  it('keeps an exit in the roster (the suppression signal)', async () => {
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    await biz.appoint(mara, 'bartender');
    biz.dismiss(mara);
    expect(mara.getEmployment(BUSINESS)?.status).toBe('fired');
    expect([...EmploymentApi.employeesOf(BUSINESS)]).toEqual([MARA]);
    expect(biz.holdersOf('bartender')).toEqual([]);
  });

  it('derives a cold roster from the index, not from the witness', async () => {
    // Nothing reads the roster until the end, so the witness has been a
    // no-op throughout and the answer can only have come from the cold
    // fill — which is exactly the state a reloaded singleton starts in,
    // and the reason the memo is never warmed at boot.
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    const kit = seedWorker(KIT);
    await biz.appoint(mara, 'bartender');
    await biz.appoint(kit, 'bartender');
    expect([...EmploymentApi.employeesOf(BUSINESS)].sort()).toEqual(
      [KIT, MARA].sort(),
    );
  });

  it('answers an organization nobody works at with an empty roster', () => {
    seedBusiness();
    expect(EmploymentApi.employeesOf('/test/roster/idea/nobody')).toEqual([]);
    expect(EmploymentApi.employeesOf('')).toEqual([]);
  });

  it('reads through the organization itself', async () => {
    const biz = seedBusiness();
    const mara = seedWorker(MARA);
    await biz.appoint(mara, 'bartender');
    expect([...biz.employees()]).toEqual([MARA]);
  });
});
