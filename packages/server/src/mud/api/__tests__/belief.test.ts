/**
 * BeliefStoreLogic singleton encapsulation (the surface-architecture
 * conversion of `belief`).
 *
 * BeliefStoreApi forwards to the BeliefStoreLogic singleton at
 * `/platform/idea/api/belief`, whose methods are gated
 * `FromModule('/api/belief#BeliefStoreApi')`. A direct logic-method
 * call from any other module is denied.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BeliefStoreLogic } from '../../platform/idea/api/BeliefStoreLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('BeliefStoreLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-BeliefStoreApi caller', () => {
    const logic = makeStuffAtPath(
      () => new BeliefStoreLogic(),
      '/platform/idea/api/belief'
    );
    expect(StuffApi.findByTemplatePath('/platform/idea/api/belief')).toBe(logic);
    // The test module is not mud/api/belief#BeliefStoreApi nor the
    // singleton itself; the gate denies synchronously (before the async
    // body), so the viewer arg is never touched.
    expect(() => logic.hydrate(logic)).toThrow(SecurityError);
  });
});
