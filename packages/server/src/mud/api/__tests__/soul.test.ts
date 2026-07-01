/**
 * SoulLogic singleton encapsulation (the surface-architecture
 * two-singleton conversion of `soul`).
 *
 * SoulApi forwards to the SoulLogic singleton at `/obj/api/soul`, whose
 * methods are gated `FromModule('api/soul#SoulApi')` — and the
 * pinned SoulCatalogue is now gated to admit only that logic singleton
 * (`FromTemplate('/obj/api/soul')`) + the facade + self-calls. A direct
 * logic-method call from any other module is denied.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SoulLogic } from '../../obj/api/SoulLogic';
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
    const logic = makeStuffAtPath(() => new SoulLogic(), '/obj/api/soul');
    expect(StuffApi.findByTemplatePath('/obj/api/soul')).toBe(logic);
    // The test module is not mud/api/soul#SoulApi nor the singleton
    // itself; the gate denies synchronously (before the async body).
    expect(() => logic.resolve('wave')).toThrow(SecurityError);
  });
});
