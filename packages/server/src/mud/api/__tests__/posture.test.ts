import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PostureApi } from '../posture';
import { PostureLogic } from '../../platform/idea/api/PostureLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuff } from '../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Posed } from '../../lib/character/Posed';

describe('PostureLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /platform/idea/api/posture once the facade has materialized it', () => {
    // A facade call lazily creates the logic singleton. A non-Slottable
    // actor returns 0 without touching the slot machinery.
    const actor = makeStuff(() => new Idea());
    PostureApi.vacatePostureBearingSlots(actor as unknown as Stuff & Posed);
    const logic = StuffApi.findByTemplatePath('/platform/idea/api/posture');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/platform/idea/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-PostureApi caller', () => {
    const actor = makeStuff(() => new Idea());
    PostureApi.vacatePostureBearingSlots(actor as unknown as Stuff & Posed);
    const logic = StuffApi.findByTemplatePath<PostureLogic>('/platform/idea/api/posture');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/posture#PostureApi`, so the
    // FromModule gate on the logic's own methods denies the call.
    expect(() =>
      logic!.vacatePostureBearingSlots(actor as unknown as Stuff & Posed)
    ).toThrow(SecurityError);
  });
});
