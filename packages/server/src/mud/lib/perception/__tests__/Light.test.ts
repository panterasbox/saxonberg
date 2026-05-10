import { describe, it, expect } from 'vitest';
import { Light, LIGHT_SOURCE_CAP } from '../Light';
import { Quantity } from '../../quantity';
// `bandFor` moved to api/light.ts (was previously here in lib/) so
// the api layer doesn't import logic from lib. Importing from api
// also triggers tag-table registrations (KELVIN_TAGS, LUMEN_TAGS,
// LUX_BAND_THRESHOLDS) so string color tags resolve in tests.
import { bandFor } from '../../../api/light';

describe('Light value object', () => {
  it('Light.ZERO is the canonical zero', () => {
    expect(Light.ZERO.intensity.rawValue()).toBe(0);
    expect(Light.ZERO.colorTemperature).toBeNull();
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
    expect(l.intensity.rawValue()).toBe(10);
    expect(l.intensity.unit).toBe('lux');
    expect(l.colorTemperature).not.toBeNull();
    expect(l.colorTemperature!.unit).toBe('K');
    expect(l.colorTemperature!.rawValue()).toBe(2700);
  });

  it('Light.of accepts a Quantity<lux> for intensity', () => {
    const l = Light.of(Quantity.of(10, 'lux'));
    expect(l.intensity.rawValue()).toBe(10);
  });

  it('Light.from coerces a data-shape value', () => {
    const l = Light.from({ intensity: 7, colorTemperature: 'cool' });
    expect(l).toBeInstanceOf(Light);
    expect(l.intensity.rawValue()).toBe(7);
    expect(l.colorTemperature!.rawValue()).toBe(5000);
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

  it('add: intensities sum and color blends as flux-weighted average', () => {
    const a = Light.of(10, 'warm', { stuffId: 'lamp-1', flux: 10, colorTemperature: 2700 });
    const b = Light.of(15, 'cool', { stuffId: 'lamp-2', flux: 15, colorTemperature: 5000 });
    const sum = a.add(b);
    expect(sum.intensity.rawValue()).toBe(25);
    // Flux-weighted: (2700*10 + 5000*15) / 25 = (27000 + 75000) / 25 = 4080.
    expect(sum.colorTemperature!.rawValue()).toBeCloseTo(4080, 5);
    expect(sum.sources).toHaveLength(2);
    expect(sum.sources[0]!.stuffId).toBe('lamp-2');
  });

  it('add: capped at LIGHT_SOURCE_CAP, brightest survives', () => {
    let l = Light.ZERO;
    for (let i = 0; i < LIGHT_SOURCE_CAP + 2; i++) {
      l = l.add(
        Light.of(i + 1, null, {
          stuffId: `s-${i}`,
          flux: i + 1,
          colorTemperature: null,
        })
      );
    }
    expect(l.sources).toHaveLength(LIGHT_SOURCE_CAP);
    expect(l.sources[0]!.stuffId).toBe(`s-${LIGHT_SOURCE_CAP + 1}`);
  });

  it('attenuate: factor 0 → ZERO, factor 1 → identity, mid → scaled', () => {
    const l = Light.of(20, 'warm', { stuffId: 'lamp', flux: 20, colorTemperature: 2700 });
    expect(l.attenuate(0)).toBe(Light.ZERO);
    expect(l.attenuate(-1)).toBe(Light.ZERO);
    expect(l.attenuate(1)).toBe(l);
    expect(l.attenuate(2)).toBe(l);
    const dim = l.attenuate(0.5);
    expect(dim.intensity.rawValue()).toBe(10);
    expect(dim.sources[0]!.flux).toBe(10);
  });

  it('withColor returns the same instance when unchanged', () => {
    const l = Light.of(10, 'warm');
    expect(l.withColorTemperature('warm')).toBe(l);
    const cool = l.withColorTemperature('cool');
    expect(cool.colorTemperature!.rawValue()).toBe(5000);
  });

  it('JSON serialization produces decomposed Quantity shapes', () => {
    const l = Light.of(20, 'warm', { stuffId: 'lamp', flux: 20, colorTemperature: 2700 });
    const data = JSON.parse(JSON.stringify(l));
    expect(data.intensity).toEqual({ value: 20, unit: 'lux' });
    expect(data.colorTemperature).toEqual({ value: 2700, unit: 'K' });
    expect(data.sources).toHaveLength(1);
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
