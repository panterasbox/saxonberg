/**
 * PromptLogic singleton encapsulation (the surface-architecture
 * conversion of `prompt`).
 *
 * PromptApi forwards to the PromptLogic singleton at `/obj/api/prompt`,
 * whose methods are gated `FromModule('/api/prompt#PromptApi')`. A
 * direct logic-method call from any other module is denied.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PromptLogic } from '../../obj/api/PromptLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('PromptLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-PromptApi caller', () => {
    const logic = makeStuffAtPath(() => new PromptLogic(), '/obj/api/prompt');
    expect(StuffApi.findByTemplatePath('/obj/api/prompt')).toBe(logic);
    // The test module is not mud/api/prompt#PromptApi nor the singleton
    // itself; the gate denies (cancel is sync, so a plain call exercises
    // the gate without needing an Interactive).
    expect(() => logic.cancel('nonexistent')).toThrow(SecurityError);
  });
});
