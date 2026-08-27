import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CelestialApi } from '../celestial';
import { CelestialLogic } from '../../platform/idea/api/CelestialLogic';
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

  it('lives at /platform/idea/api/celestial once the facade has materialized it', () => {
    // A pure-geometry facade call lazily creates the logic singleton.
    CelestialApi.dayOfYear(EARTH_LIKE, 0);
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/celestial');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-CelestialApi caller', () => {
    CelestialApi.dayOfYear(EARTH_LIKE, 0);
    const logic = StuffApi.findByTemplatePath<CelestialLogic>(
      '/platform/idea/api/celestial'
    );
    expect(logic).toBeDefined();
    // The test module is not `mud/api/celestial#CelestialApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.dayOfYear(EARTH_LIKE, 0)).toThrow(SecurityError);
  });
});
