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
