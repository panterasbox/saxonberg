import { describe, it, expect } from 'vitest';
import { Position } from '../Position';

describe('Position', () => {
  it('builds from a typed descriptor and exposes its terms', () => {
    const p = Position.of({
      key: 'bartender',
      label: 'tending bar',
      wageRate: 12,
      confers: ['MakerMixin'],
    });
    expect(p.key).toBe('bartender');
    expect(p.label).toBe('tending bar');
    expect(p.wageRate).toBe(12);
    expect(p.confers).toEqual(['MakerMixin']);
  });

  it('coerces a loosely-typed (hydrated) blob', () => {
    const p = Position.fromData({
      key: 'cook',
      wageRate: '9' as unknown as number,
    });
    expect(p.key).toBe('cook');
    expect(p.label).toBe('');
    expect(p.wageRate).toBe(9);
    expect(p.confers).toEqual([]);
  });

  it('round-trips through serialize/fromData', () => {
    const p = Position.of({
      key: 'server',
      label: 'serving',
      wageRate: 10,
      confers: ['MakerMixin'],
    });
    const back = Position.fromData(p.serialize());
    expect(back.serialize()).toEqual(p.serialize());
  });

  it('does not alias the confers array', () => {
    const confers = ['MakerMixin'];
    const p = Position.of({ key: 'k', label: 'l', wageRate: 1, confers });
    confers.push('Injected');
    expect(p.confers).toEqual(['MakerMixin']);
  });
});
