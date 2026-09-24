/**
 * ⭐⭐ **The opening, and the criterion** (trades-and-labor D10/D13/D14).
 *
 * Two claims, and they are the whole labor market's honesty:
 *
 * 1. **An opening is DERIVED** — `headcount − holders`. Nothing stores
 *    it, so nothing can decrement it wrong: a hire closes it, a `quit`
 *    reopens it, and an authored roster assignee counts as a holder
 *    exactly like a runtime hire.
 * 2. ⭐ **Every refusal names a NUMBER and what lifts it.** A bare COUNT
 *    as a permanent gate is the harshest rule with no author
 *    (`docs/antipatterns.md`), so the verdict carries `wanted` AND
 *    `held` and the criteria are ordered cheapest-lift-first: gigs (a
 *    newcomer can complete one this afternoon) before a competence band
 *    (which takes practice).
 */

import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Idea } from '../../stuff/Idea';
import { EmployedMixin } from '../Employed';
import { AdvancementMixin } from '../../advancement/Advancement';
import BusinessEntity from '../../../platform/idea/Business';
import { ContractApi } from '../../../api/contract';
import { StuffApi } from '../../../api/stuff';
import type { CompetenceBandName } from '../../advancement/CompetenceBand';
import {
  makeStuff,
  makeStuffAtPath,
} from '../../security/__tests__/test-setup';

const BIZ = '/stuff/test/openings/business';
const ALICE = '/platform/agent/Avatar/alice';
const BOB = '/platform/agent/Avatar/bob';

/** An applicant: employable, and able to be asked for a competence band. */
class Applicant extends AdvancementMixin(EmployedMixin(Idea)) {
  static _mixinName = 'OpeningsApplicant';
  private band: CompetenceBandName = 'untrained';
  setBand(b: CompetenceBandName): void {
    this.band = b;
  }
  async competenceBandFor(): Promise<CompetenceBandName> {
    return this.band;
  }
}

function seed(positions: Record<string, unknown>[]): BusinessEntity {
  const b = makeStuffAtPath(() => new BusinessEntity(), BIZ);
  b.positions = positions as never;
  b.operatingLocations = ['/stuff/test/openings/room'];
  return b;
}

function applicant(path: string): Applicant {
  return makeStuffAtPath(() => new Applicant(), path);
}

/** Put `who` in the seat, as a runtime hire would. */
function hold(who: Applicant, positionKey: string): void {
  who.employments = [
    {
      organizationPath: BIZ,
      positionKey,
      status: 'employed',
      hiredAt: 0,
      onShiftSince: null,
    },
  ];
}

beforeEach(() => StuffApi.clearAll());
afterEach(() => vi.restoreAllMocks());

describe('⭐ an opening is derived, never stored', () => {
  it('a seat with no headcount advertises nothing — exactly today', () => {
    const biz = seed([{ key: 'clerk', label: 'clerking', wageRate: 5 }]);
    expect(biz.openingsFor('clerk')).toBe(0);
    expect(biz.openings()).toEqual([]);
  });

  it('headcount minus holders, and a quit REOPENS it by arithmetic', async () => {
    const biz = seed([
      { key: 'hand', noun: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    expect(biz.openingsFor('hand')).toBe(1);

    const alice = applicant(ALICE);
    hold(alice, 'hand');
    expect(biz.openingsFor('hand')).toBe(0);
    expect(biz.openings()).toEqual([]);

    // Nothing decremented anything: the holder left, so the place is open.
    alice.employments = [
      {
        organizationPath: BIZ,
        positionKey: 'hand',
        status: 'quit',
        hiredAt: 0,
        onShiftSince: null,
      },
    ];
    expect(biz.openingsFor('hand')).toBe(1);
  });

  it('two places, one filled, one advertised', () => {
    const biz = seed([
      { key: 'tailor', noun: 'tailor', label: 'cutting cloth', wageRate: 6, headcount: 2 },
    ]);
    hold(applicant(ALICE), 'tailor');
    expect(biz.openingsFor('tailor')).toBe(1);
    const [opening] = biz.openings();
    expect(opening?.position.key).toBe('tailor');
    expect(opening?.open).toBe(1);
  });

  it('an AUTHORED roster assignee counts as a holder, like a runtime hire', () => {
    const biz = seed([
      { key: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    biz.rosterSlots = [
      { positionKey: 'hand', assignee: BOB, schedule: [] },
    ] as never;
    expect(biz.openingsFor('hand')).toBe(0);
  });
});

describe('⭐⭐ considerApplicant — every refusal names a number', () => {
  it('takes an applicant a seat asks nothing of', async () => {
    const biz = seed([
      { key: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    expect(await biz.considerApplicant(applicant(ALICE), 'hand')).toEqual({
      ok: true,
    });
  });

  it('refuses `no-opening` when the seat is full, and `already-held` FIRST', async () => {
    const biz = seed([
      { key: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    const alice = applicant(ALICE);
    hold(alice, 'hand');
    // ⚠ The holder is told they hold it — not that they are short of
    // something. `already-held` is not a judgement about worth.
    expect(await biz.considerApplicant(alice, 'hand')).toEqual({
      ok: false,
      kind: 'already-held',
    });
    expect(await biz.considerApplicant(applicant(BOB), 'hand')).toEqual({
      ok: false,
      kind: 'no-opening',
    });
  });

  it('⭐ a gigs refusal carries BOTH numbers', async () => {
    const biz = seed([
      {
        key: 'hand',
        label: 'hauling',
        wageRate: 4,
        headcount: 1,
        requires: { gigs: 2 },
      },
    ]);
    vi.spyOn(ContractApi, 'settledGigsBy').mockResolvedValue(1);
    expect(await biz.considerApplicant(applicant(ALICE), 'hand')).toEqual({
      ok: false,
      kind: 'gigs',
      wanted: 2,
      held: 1,
    });
    vi.spyOn(ContractApi, 'settledGigsBy').mockResolvedValue(2);
    expect(await biz.considerApplicant(applicant(BOB), 'hand')).toEqual({
      ok: true,
    });
  });

  it('⭐ a band refusal carries the discipline and BOTH bands', async () => {
    const biz = seed([
      {
        key: 'tailor',
        label: 'cutting cloth',
        wageRate: 6,
        headcount: 1,
        requires: { discipline: 'tailoring', band: 'competent' },
      },
    ]);
    const alice = applicant(ALICE);
    expect(await biz.considerApplicant(alice, 'tailor')).toEqual({
      ok: false,
      kind: 'band',
      discipline: 'tailoring',
      wanted: 'competent',
      held: 'untrained',
    });
    // …and practising lifts it. At or above, never equal-only.
    alice.setBand('proficient');
    expect(await biz.considerApplicant(alice, 'tailor')).toEqual({ ok: true });
  });

  it('⭐ gigs before band — one refusal, the CHEAPER lift first', async () => {
    const biz = seed([
      {
        key: 'tailor',
        label: 'cutting cloth',
        wageRate: 6,
        headcount: 1,
        requires: { gigs: 2, discipline: 'tailoring', band: 'competent' },
      },
    ]);
    vi.spyOn(ContractApi, 'settledGigsBy').mockResolvedValue(0);
    const verdict = await biz.considerApplicant(applicant(ALICE), 'tailor');
    expect(verdict).toMatchObject({ kind: 'gigs' });
  });

  it('refuses something that cannot be employed at all', async () => {
    const biz = seed([
      { key: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    const rock = makeStuff(() => new Idea());
    expect(await biz.considerApplicant(rock, 'hand')).toEqual({
      ok: false,
      kind: 'not-employable',
    });
  });
});

describe('the sign says what the refusal says', () => {
  it('names the pay, the places and the ask in one line', () => {
    const biz = seed([
      {
        key: 'hand',
        noun: 'hand',
        label: 'hauling and shelving',
        wageRate: 4,
        headcount: 1,
        requires: { gigs: 2 },
      },
    ]);
    const [opening] = biz.openings();
    expect(opening?.wants()).toBe('two completed gigs');
    expect(opening?.describe()).toMatch(/HELP WANTED — hand/);
    expect(opening?.describe()).toMatch(/two completed gigs asked/);
  });

  it('a seat with no criterion says so rather than staying silent', () => {
    const biz = seed([
      { key: 'hand', noun: 'hand', label: 'hauling', wageRate: 4, headcount: 1 },
    ]);
    expect(biz.openings()[0]?.wants()).toBe('no prerequisite');
  });

  it('⭐ the SIGN names both criteria even though a refusal names one', () => {
    const biz = seed([
      {
        key: 'tailor',
        noun: 'tailor',
        label: 'cutting cloth',
        wageRate: 6,
        headcount: 1,
        requires: { gigs: 1, discipline: 'tailoring', band: 'competent' },
      },
    ]);
    const wants = biz.openings()[0]?.wants() ?? '';
    expect(wants).toContain('one completed gig');
    expect(wants).toContain('a competent hand at tailoring');
  });
});
