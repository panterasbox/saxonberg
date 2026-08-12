import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { GroupApi } from '../group';
import { StuffApi } from '../stuff';
import { SecurityError } from '../../lib/security/errors';
import type { GroupLogic } from '../../obj/api/GroupLogic';
import type { GroupRef } from '../../lib/social/GroupProvider';

describe('GroupApi.parseRef', () => {
  it('splits on the first colon', () => {
    expect(GroupApi.parseRef('managed:abc' as GroupRef)).toEqual({
      source: 'managed',
      id: 'abc',
    });
  });

  it('keeps later colons in the id', () => {
    expect(GroupApi.parseRef('mql:zone:/a/b' as GroupRef)).toEqual({
      source: 'mql',
      id: 'zone:/a/b',
    });
  });

  it('throws on a malformed ref', () => {
    expect(() => GroupApi.parseRef('nocolon' as GroupRef)).toThrow();
  });
});

describe('GroupLogic singleton encapsulation', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('lives at /obj/api/group once the facade has materialized it', () => {
    GroupApi.parseRef('managed:abc' as GroupRef);
    const logic = StuffApi.findByTemplatePath('/obj/api/group');
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob('/obj/api/*')).toContain(logic);
  });

  it('denies a direct logic-method call from a non-GroupApi caller', () => {
    GroupApi.parseRef('managed:abc' as GroupRef);
    const logic = StuffApi.findByTemplatePath<GroupLogic>('/obj/api/group');
    expect(logic).toBeDefined();
    // The test module is not `mud/api/group#GroupApi`, so the FromModule
    // gate on the logic's own methods denies the call.
    expect(() => logic!.parseRef('managed:abc' as GroupRef)).toThrow(
      SecurityError
    );
  });
});
