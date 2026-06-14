import { describe, it, expect } from 'vitest';
import { Touch, TOUCH_BANDS } from '../Touch';
import { Quantity } from '../../quantity';

describe('Touch value object', () => {
  it('exports six bands', () => {
    expect(TOUCH_BANDS).toEqual([
      'cold',
      'cool',
      'comfortable',
      'warm',
      'hot',
      'scalding',
    ]);
  });

  it('bandFor 250K → cold', () => {
    expect(Touch.bandFor(250)).toBe('cold');
  });
  it('bandFor 280K → cool', () => {
    expect(Touch.bandFor(280)).toBe('cool');
  });
  it('bandFor 295K → comfortable', () => {
    expect(Touch.bandFor(295)).toBe('comfortable');
  });
  it('bandFor 310K → warm', () => {
    expect(Touch.bandFor(310)).toBe('warm');
  });
  it('bandFor 330K → hot', () => {
    expect(Touch.bandFor(330)).toBe('hot');
  });
  it('bandFor 700K → scalding', () => {
    expect(Touch.bandFor(700)).toBe('scalding');
  });

  it('Touch.of derives band from temperature', () => {
    const t = Touch.of(Quantity.of(295, 'K'));
    expect(t.temperature.rawValue()).toBe(295);
    expect(t.band).toBe('comfortable');
  });

  it('Touch.of rejects non-Kelvin Quantities', () => {
    expect(() => Touch.of(Quantity.of(1, 'kg') as never)).toThrow();
  });
});
