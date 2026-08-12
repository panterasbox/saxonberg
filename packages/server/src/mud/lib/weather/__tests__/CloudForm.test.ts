/**
 * Cloud forms (weather Wave 2, Phase H) — the pure, deterministic genus
 * derivation `cloudFormFor(current, upcoming)`: the base genus per resolved
 * type, upgraded to the presage form (cirrus/cirrostratus) when a fair sky
 * has a front in the near-term forecast. Presentation + a forecast tell,
 * never a physics input. See docs/subsystems/weather.md.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import { WeatherApi } from '../../../api/weather';
import { StuffApi } from '../../../api/stuff';
import type { WeatherType } from '../WeatherType';

const noFront: WeatherType[] = ['clear', 'overcast'];

describe('cloudFormFor — the pure genus derivation', () => {
  afterEach(() => StuffApi.clearAll());

  it('maps each resolved type to its base cloud genus', () => {
    expect(WeatherApi.cloudFormFor('storm', noFront)).toBe('cumulonimbus');
    expect(WeatherApi.cloudFormFor('overcast', noFront)).toBe('stratus');
    expect(WeatherApi.cloudFormFor('rain', noFront)).toBe('nimbostratus');
    expect(WeatherApi.cloudFormFor('snow', noFront)).toBe('nimbostratus');
    expect(WeatherApi.cloudFormFor('fog', noFront)).toBe('stratus');
    expect(WeatherApi.cloudFormFor('clear', noFront)).toBe('clear');
  });

  it('a clear sky trending toward a front reads cirrus (the presage tell)', () => {
    expect(WeatherApi.cloudFormFor('clear', ['clear', 'rain'])).toBe('cirrus');
    expect(WeatherApi.cloudFormFor('clear', ['overcast', 'storm'])).toBe(
      'cirrus',
    );
  });

  it('an overcast sky trending toward a front thickens to cirrostratus', () => {
    expect(WeatherApi.cloudFormFor('overcast', ['rain'])).toBe('cirrostratus');
  });

  it('a clear sky staying clear does NOT presage', () => {
    expect(WeatherApi.cloudFormFor('clear', ['clear', 'clear'])).toBe('clear');
  });

  it('a front already present is its own genus, not a presage', () => {
    // Storm now → cumulonimbus regardless of what follows (not fair).
    expect(WeatherApi.cloudFormFor('storm', ['rain', 'storm'])).toBe(
      'cumulonimbus',
    );
  });

  it('is deterministic (pure) — same inputs, same output', () => {
    const a = WeatherApi.cloudFormFor('clear', ['rain']);
    const b = WeatherApi.cloudFormFor('clear', ['rain']);
    expect(a).toBe(b);
    expect(a).toBe('cirrus');
  });
});
