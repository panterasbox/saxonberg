import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CelestialApi } from '../celestial';
import { CelestialLogic } from '../../obj/api/CelestialLogic';
import { EARTH_LIKE } from '../../lib/time/CelestialProfile';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';

describe('CelestialLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/celestial once the facade has materialized it', () => {
    // A pure-geometry facade call lazily creates the logic singleton.
    CelestialApi.dayOfYear(EARTH_LIKE, 0);
    const logic = StuffApi.findByTemplatePath('/obj/api/celestial');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-CelestialApi caller', () => {
    CelestialApi.dayOfYear(EARTH_LIKE, 0);
    const logic = StuffApi.findByTemplatePath<CelestialLogic>(
      '/obj/api/celestial'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/celestial#CelestialApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.dayOfYear(EARTH_LIKE, 0)).toThrow(SecurityError);
  });
});
