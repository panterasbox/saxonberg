import { describe, it, expect } from 'vitest';
import { Light, bandFor, LIGHT_SOURCE_CAP } from '../Light';

describe('Light value object', () => {
  it('Light.ZERO is the canonical zero', () => {
    expect(Light.ZERO.intensity).toBe(0);
    expect(Light.ZERO.color).toBeNull();
    expect(Light.ZERO.sources).toEqual([]);
    expect(Light.of(0)).toBe(Light.ZERO);
  });

  it('Light.of validates non-negative finite intensity', () => {
    expect(() => Light.of(-1)).toThrow();
    expect(() => Light.of(NaN)).toThrow();
    expect(() => Light.of(Infinity)).toThrow();
  });

  it('Light.of with a positive intensity is not ZERO', () => {
    const l = Light.of(10, 'warm');
    expect(l).not.toBe(Light.ZERO);
    expect(l.intensity).toBe(10);
    expect(l.color).toBe('warm');
  });

  it('Light.from coerces a data-shape value', () => {
    const l = Light.from({ intensity: 7, color: 'cool' });
    expect(l).toBeInstanceOf(Light);
    expect(l.intensity).toBe(7);
    expect(l.color).toBe('cool');
  });

  it('Light.from accepts an existing Light unchanged', () => {
    const l = Light.of(5, 'warm');
    expect(Light.from(l)).toBe(l);
  });

  it('Light.from rejects malformed shape with TypeError', () => {
    expect(() =>
      Light.from({ intensity: 'lots' } as unknown as { intensity: number })
    ).toThrow(TypeError);
  });

  it('add: ZERO is the identity element', () => {
    const l = Light.of(10);
    expect(l.add(Light.ZERO)).toBe(l);
    expect(Light.ZERO.add(l)).toBe(l);
  });

  it('add: intensities sum and source list dedupes by stuffId', () => {
    const a = Light.of(10, 'warm', { stuffId: 'lamp-1', intensity: 10, color: 'warm' });
    const b = Light.of(15, 'cool', { stuffId: 'lamp-2', intensity: 15, color: 'cool' });
    const sum = a.add(b);
    expect(sum.intensity).toBe(25);
    // Dominant source wins for color.
    expect(sum.color).toBe('cool');
    expect(sum.sources).toHaveLength(2);
    expect(sum.sources[0]!.stuffId).toBe('lamp-2');
  });

  it('add: capped at LIGHT_SOURCE_CAP, brightest survives', () => {
    let l = Light.ZERO;
    for (let i = 0; i < LIGHT_SOURCE_CAP + 2; i++) {
      l = l.add(
        Light.of(i + 1, null, {
          stuffId: `s-${i}`,
          intensity: i + 1,
          color: null,
        })
      );
    }
    expect(l.sources).toHaveLength(LIGHT_SOURCE_CAP);
    // Brightest survives.
    expect(l.sources[0]!.stuffId).toBe(`s-${LIGHT_SOURCE_CAP + 1}`);
  });

  it('attenuate: factor 0 → ZERO, factor 1 → identity, mid → scaled', () => {
    const l = Light.of(20, 'warm', { stuffId: 'lamp', intensity: 20, color: 'warm' });
    expect(l.attenuate(0)).toBe(Light.ZERO);
    expect(l.attenuate(-1)).toBe(Light.ZERO);
    expect(l.attenuate(1)).toBe(l);
    expect(l.attenuate(2)).toBe(l);
    const dim = l.attenuate(0.5);
    expect(dim.intensity).toBe(10);
    expect(dim.sources[0]!.intensity).toBe(10);
  });

  it('withColor returns the same instance when unchanged', () => {
    const l = Light.of(10, 'warm');
    expect(l.withColor('warm')).toBe(l);
    expect(l.withColor('cool').color).toBe('cool');
  });

  it('JSON serialization produces the LightDataShape', () => {
    const l = Light.of(20, 'warm', { stuffId: 'lamp', intensity: 20, color: 'warm' });
    const data = JSON.parse(JSON.stringify(l));
    expect(data.intensity).toBe(20);
    expect(data.color).toBe('warm');
    expect(data.sources).toHaveLength(1);
    // Round-trip via Light.from preserves identity-of-shape.
    const round = Light.from(data);
    expect(round.intensity).toBe(20);
    expect(round.color).toBe('warm');
  });
});

describe('bandFor (threshold table)', () => {
  it('maps the canonical thresholds', () => {
    expect(bandFor(0)).toBe('pitch-black');
    expect(bandFor(0.5)).toBe('pitch-black');
    expect(bandFor(1)).toBe('very-dim');
    expect(bandFor(4.99)).toBe('very-dim');
    expect(bandFor(5)).toBe('dim');
    expect(bandFor(19.99)).toBe('dim');
    expect(bandFor(20)).toBe('lit');
    expect(bandFor(59.99)).toBe('lit');
    expect(bandFor(60)).toBe('bright');
    expect(bandFor(199.99)).toBe('bright');
    expect(bandFor(200)).toBe('blinding');
    expect(bandFor(1000)).toBe('blinding');
  });
});
