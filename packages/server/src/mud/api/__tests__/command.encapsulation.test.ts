/**
 * CommandLogic singleton encapsulation (the surface-architecture
 * conversion of `command`).
 *
 * CommandApi forwards to the CommandLogic singleton at
 * `/obj/api/command`, whose methods are gated
 * `AnyOf(FromModule('/api/command#CommandApi'), SelfOnly)`. A direct
 * logic-method call from any other module is denied.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CommandLogic } from '../../obj/api/CommandLogic';
import { SecurityError } from '../../lib/security/errors';
import { StuffApi } from '../stuff';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';

describe('CommandLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('denies a direct logic-method call from a non-CommandApi caller', () => {
    const logic = makeStuffAtPath(
      () => new CommandLogic(),
      '/obj/api/command'
    );
    expect(StuffApi.findByTemplatePath('/obj/api/command')).toBe(logic);
    // The test module is neither mud/api/command#CommandApi nor the
    // singleton itself; the gate denies. `getCommand` is sync, so a
    // plain call exercises the gate synchronously.
    expect(() => logic.getCommand('x')).toThrow(SecurityError);
  });
});
