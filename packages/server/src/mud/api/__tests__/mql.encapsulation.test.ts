/**
 * MqlLogic singleton encapsulation (the surface-architecture conversion
 * of `mql`).
 *
 * MqlApi forwards to the MqlLogic singleton at `/obj/api/mql`, whose
 * methods are gated `FromModule('mud/api/mql#MqlApi')`. A direct
 * logic-method call from any other module is denied.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MqlLogic } from '../../obj/api/MqlLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('MqlLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-MqlApi caller', () => {
    const logic = makeStuffAtPath(() => new MqlLogic(), '/obj/api/mql');
    expect(StuffApi.findByTemplatePath('/obj/api/mql')).toBe(logic);
    // The test module is not mud/api/mql#MqlApi nor the singleton itself;
    // the gate denies (extractStuffs is sync + pure, so a plain call
    // exercises the gate without a resolver context).
    expect(() => logic.extractStuffs({ stuff: null })).toThrow(SecurityError);
  });
});
