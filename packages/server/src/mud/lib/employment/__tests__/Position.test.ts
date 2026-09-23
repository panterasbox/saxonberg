import { describe, it, expect } from 'vitest';
import { Position } from '../Position';

describe('Position', () => {
  it('builds from a typed descriptor and exposes its terms', () => {
    const p = Position.of({
      key: 'bartender',
      label: 'tending bar',
      wageRate: 12,
      fulfills: true,
    });
    expect(p.key).toBe('bartender');
    expect(p.label).toBe('tending bar');
    expect(p.wageRate).toBe(12);
    expect(p.fulfills).toBe(true);
  });

  it('coerces a loosely-typed (hydrated) blob', () => {
    const p = Position.fromData({
      key: 'cook',
      wageRate: '9' as unknown as number,
    });
    expect(p.key).toBe('cook');
    expect(p.label).toBe('');
    expect(p.wageRate).toBe(9);
    expect(p.fulfills).toBe(false);
  });

  it('round-trips through serialize/fromData', () => {
    const p = Position.of({
      key: 'server',
      label: 'serving',
      wageRate: 10,
      fulfills: true,
    });
    const back = Position.fromData(p.serialize());
    expect(back.serialize()).toEqual(p.serialize());
  });

  it('⭐ a grant is a FLAG on the seat, never a list of mixin names', () => {
    // The old `confers: string[]` let a row name any mixin at all — an
    // open-ended capability grant from content, gated through the augment
    // walk. The two grants that exist are booleans on the position, and a
    // row cannot invent a third.
    const p = Position.of({
      key: 'keeper',
      label: 'keeping shop',
      wageRate: 4,
      purchases: true,
      fulfills: true,
    });
    expect(p.purchases).toBe(true);
    expect(p.fulfills).toBe(true);
    expect(Position.fromData(p.serialize()).serialize()).toEqual(p.serialize());
  });

  it('a seat with neither grant serializes neither key', () => {
    const p = Position.of({ key: 'clerk', label: 'clerking', wageRate: 5 });
    expect(p.serialize()).toEqual({
      key: 'clerk',
      label: 'clerking',
      wageRate: 5,
    });
  });
});

describe('⛔ the hiring criterion vocabulary is CLOSED', () => {
  it('round-trips headcount and every criterion', () => {
    const p = Position.of({
      key: 'tailor',
      label: 'cutting cloth',
      wageRate: 6,
      headcount: 2,
      requires: { gigs: 2, discipline: 'tailoring', band: 'competent' },
    });
    expect(p.headcount).toBe(2);
    expect(p.requires).toEqual({
      gigs: 2,
      discipline: 'tailoring',
      band: 'competent',
    });
    expect(Position.fromData(p.serialize()).serialize()).toEqual(p.serialize());
  });

  it('⛔ THROWS on a criterion outside the vocabulary — never coerces it away', () => {
    // A seat may ask for work done or competence held. It may not ask who
    // somebody IS. Dropping the key silently would ship a sign that lies
    // and a refusal that never fires.
    expect(() =>
      Position.fromData({
        key: 'k',
        label: 'l',
        wageRate: 1,
        requires: { renown: 3 } as never,
      }),
    ).toThrow(/not a hiring criterion/);
    for (const bad of ['species', 'lineage', 'trait', 'wealth']) {
      expect(() =>
        Position.fromData({
          key: 'k',
          label: 'l',
          wageRate: 1,
          requires: { [bad]: 1 } as never,
        }),
        bad,
      ).toThrow(/not a hiring criterion/);
    }
  });

  it('throws on a band outside the ladder, and on a band with no discipline', () => {
    expect(() =>
      Position.fromData({
        key: 'k',
        label: 'l',
        wageRate: 1,
        requires: { discipline: 'tailoring', band: 'skilled' as never },
      }),
    ).toThrow(/not a competence band/);
    expect(() =>
      Position.fromData({
        key: 'k',
        label: 'l',
        wageRate: 1,
        requires: { band: 'competent' },
      }),
    ).toThrow(/asks nothing/);
  });

  it('a headcount must be a whole number ≥ 1; anything else advertises nothing', () => {
    const bad = (headcount: unknown) =>
      Position.fromData({ key: 'k', label: 'l', wageRate: 1, headcount: headcount as never })
        .headcount;
    expect(bad(0)).toBeUndefined();
    expect(bad(-1)).toBeUndefined();
    expect(bad(1.5)).toBeUndefined();
    expect(bad('two')).toBeUndefined();
    expect(bad(3)).toBe(3);
  });

  it('a seat that authors neither stays byte-identical to today', () => {
    const p = Position.of({ key: 'clerk', label: 'clerking', wageRate: 5 });
    expect(p.headcount).toBeUndefined();
    expect(p.requires).toBeUndefined();
    expect(p.serialize()).toEqual({ key: 'clerk', label: 'clerking', wageRate: 5 });
  });
});
