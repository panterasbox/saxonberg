import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BiomeApi } from '../biome';
import { BiomeLogic } from '../../obj/api/BiomeLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';

describe('BiomeLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/biome once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    BiomeApi.densityOf('air');
    const logic = StuffApi.findByTemplatePath('/obj/api/biome');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-BiomeApi caller', () => {
    BiomeApi.densityOf('air');
    const logic = StuffApi.findByTemplatePath<BiomeLogic>('/obj/api/biome');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/biome#BiomeApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.densityOf('air')).toThrow(SecurityError);
  });
});
