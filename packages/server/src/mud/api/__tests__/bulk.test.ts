import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BulkableApi } from '../bulk';
import { BulkableLogic } from '../../obj/api/BulkableLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

describe('BulkableLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/bulk once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton.
    const idea = makeStuff(() => new Idea());
    BulkableApi.slotFor(idea, undefined);
    const logic = StuffApi.findByTemplatePath('/obj/api/bulk');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-BulkableApi caller', () => {
    const idea = makeStuff(() => new Idea());
    BulkableApi.slotFor(idea, undefined);
    const logic = StuffApi.findByTemplatePath<BulkableLogic>('/obj/api/bulk');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/bulk#BulkableApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() => logic!.slotFor(idea, undefined)).toThrow(SecurityError);
  });
});
