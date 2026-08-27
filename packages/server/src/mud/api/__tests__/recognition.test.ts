/**
 * RecognitionLogic singleton encapsulation (the surface-architecture
 * conversion of `recognition`).
 *
 * RecognitionApi forwards to the RecognitionLogic singleton at
 * `/platform/idea/api/recognition`, whose methods are gated
 * `FromModule('/api/recognition#RecognitionApi')`. A direct
 * logic-method call from any other module is denied.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { RecognitionLogic } from '../../platform/idea/api/RecognitionLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('RecognitionLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-RecognitionApi caller', () => {
    const logic = makeStuffAtPath(
      () => new RecognitionLogic(),
      '/platform/idea/api/recognition'
    );
    expect(StuffApi.findByTemplatePath('/platform/idea/api/recognition')).toBe(logic);
    // The test module is not mud/api/recognition#RecognitionApi nor the
    // singleton itself; the gate denies before the (sync) body, so the
    // viewer/target args are never touched.
    expect(() => logic.describe(logic, logic)).toThrow(SecurityError);
  });
});
