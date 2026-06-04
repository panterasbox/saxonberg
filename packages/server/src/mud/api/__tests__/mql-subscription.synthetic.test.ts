/**
 * Substrate-synthetic field table tests. v1 contains exactly one
 * entry: `displayName` routing through `DescribeApi.getDisplayName`.
 */

import { describe, it, expect, vi } from 'vitest';
import { MqlSubscriptionApi } from '../mql-subscription';
import { DescribeApi } from '../describe';
import { NamedMixin } from '../../lib/description/Named';
import { Idea } from '../../lib/stuff/Idea';
import { FieldChangedEvent } from '../../lib/events/FieldChangedEvent';
import { ShadowChangedEvent } from '../../lib/events/ShadowChangedEvent';
import type { Sensor } from '../../lib/message/Sensor';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class NamedThing extends NamedMixin(Idea) {
  static persistentFields: string[] = [];
}

describe('MQL subscription — substrate-synthetic field table', () => {
  it('contains exactly one entry: displayName', () => {
    const table = MqlSubscriptionApi._getSubstrateSyntheticFields();
    expect([...table.keys()]).toEqual(['displayName']);
  });

  it('displayName read routes through DescribeApi.getDisplayName with viewer', () => {
    const table = MqlSubscriptionApi._getSubstrateSyntheticFields();
    const descriptor = table.get('displayName')!;
    expect(descriptor).toBeDefined();
    expect(descriptor.read).toBeDefined();
    const obj = makeStuff(() => {
      const t = new NamedThing();
      t.setName('Alice');
      return t;
    });
    const viewer = obj as unknown as Sensor;
    const spy = vi.spyOn(DescribeApi, 'getDisplayName');
    const value = descriptor.read!(obj, obj as unknown as Parameters<typeof descriptor.read>[1]);
    expect(value).toBe('Alice');
    expect(spy).toHaveBeenCalledWith(obj, expect.anything());
    spy.mockRestore();
    // (viewer parameter is reserved; v1 ignores it but the call
    // still passes it through to prove the plumbing reaches the
    // leaf.)
    void viewer;
  });

  it('displayName read returns "something" for an unnamed Stuff', () => {
    const table = MqlSubscriptionApi._getSubstrateSyntheticFields();
    const descriptor = table.get('displayName')!;
    const obj = makeStuff(() => new NamedThing()); // no setName
    const value = descriptor.read!(
      obj,
      obj as unknown as Parameters<typeof descriptor.read>[1],
    );
    expect(value).toBe('something');
  });

  it('displayName descriptor declares FieldChangedEvent and ShadowChangedEvent', () => {
    const table = MqlSubscriptionApi._getSubstrateSyntheticFields();
    const descriptor = table.get('displayName')!;
    const kinds = descriptor.changes.map((c) => c.on.KIND);
    expect(kinds).toContain(FieldChangedEvent.KIND);
    expect(kinds).toContain(ShadowChangedEvent.KIND);
  });
});
