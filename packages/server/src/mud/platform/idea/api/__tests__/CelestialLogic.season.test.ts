/**
 * The season a seasonal seat reads (storage-and-ice D20) is the sky's own:
 * day 0 is the northern spring equinox, and a southern latitude reads the
 * quarters half a year on — so a southern mere is frozen while the north
 * plants.
 */

import '../../../../../test-bootstrap';
import { describe, it, expect } from 'vitest';
import { CelestialApi } from '../../../../api/celestial';
import { EARTH_LIKE } from '../../../../lib/time/CelestialProfile';

const DAY = 86_400;

describe('the season at a latitude', () => {
  it('⭐ a southern site\'s winter is calendar days 90–179 (the northern summer)', () => {
    expect(CelestialApi.seasonFor(EARTH_LIKE, 120 * DAY, 42)).toBe('summer');
    expect(CelestialApi.seasonFor(EARTH_LIKE, 120 * DAY, -58)).toBe('winter');
    expect(CelestialApi.seasonFor(EARTH_LIKE, 5 * DAY, -58)).toBe('fall');
    expect(CelestialApi.seasonFor(EARTH_LIKE, 300 * DAY, -58)).toBe('summer');
  });
});
