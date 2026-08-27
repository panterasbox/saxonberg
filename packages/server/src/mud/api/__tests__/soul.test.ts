/**
 * SoulLogic singleton encapsulation (the surface-architecture
 * two-singleton conversion of `soul`).
 *
 * SoulApi forwards to the SoulLogic singleton at `/platform/idea/api/soul`, whose
 * methods are gated `FromModule('/api/soul#SoulApi')` — and the
 * pinned SoulCatalogue is now gated to admit only that logic singleton
 * (`FromTemplate('/platform/idea/api/soul')`) + the facade + self-calls. A direct
 * logic-method call from any other module is denied.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SoulLogic } from '../../platform/idea/api/SoulLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('SoulLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-SoulApi caller', () => {
    const logic = makeStuffAtPath(() => new SoulLogic(), '/platform/idea/api/soul');
    expect(StuffApi.findByTemplatePath('/platform/idea/api/soul')).toBe(logic);
    // The test module is not mud/api/soul#SoulApi nor the singleton
    // itself; the gate denies synchronously (before the async body).
    expect(() => logic.resolve('wave')).toThrow(SecurityError);
  });
});
