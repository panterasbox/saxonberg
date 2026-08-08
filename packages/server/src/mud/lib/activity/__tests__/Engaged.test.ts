/**
 * EngagedMixin tests — exercises the read surface and the call-
 * security lockdown on the privileged mutators.
 *
 * The map invariants (engagement registration / clearing) are
 * exercised through the public `SchedulerApi` path in
 * `SchedulerApi.start.test.ts`; this file focuses on the mixin's
 * surface in isolation.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach } from 'vitest';
import { EngagedMixin } from '../Engaged';
import type { Engaged } from '../Engaged';
import type { Engagement } from '../../../api/scheduler';
import { Idea } from '../../stuff/Idea';
import { makeStuff } from '../../security/__tests__/test-setup';
import { SecurityError } from '../../security/errors';

class TestActor extends EngagedMixin(Idea) {
  constructor() {
    super();
  }
}

function buildEngagement(
  actor: Engaged & InstanceType<typeof TestActor>,
  overrides: Partial<Engagement> = {},
): Engagement {
  return {
    engagementId: '',
    type: 'test',
    actor,
    startedAt: Date.now(),
    slots: new Set(['attention']),
    interruptibleBy: new Set(),
    cancelable: true,
    onStart: () => undefined,
    onAbort: () => undefined,
    ...overrides,
  } as unknown as Engagement;
}

describe('EngagedMixin', () => {
  let actor: TestActor;

  beforeEach(() => {
    actor = makeStuff(() => new TestActor());
  });

  describe('initial state', () => {
    it('reports no engagements', () => {
      expect(actor.getEngagements()).toEqual([]);
    });

    it('returns undefined from getEngagementBySlot', () => {
      expect(actor.getEngagementBySlot('body')).toBeUndefined();
      expect(actor.getEngagementBySlot('hands')).toBeUndefined();
      expect(actor.getEngagementBySlot('attention')).toBeUndefined();
      expect(actor.getEngagementBySlot('voice')).toBeUndefined();
    });

    it('returns undefined from getEngagementByType', () => {
      expect(actor.getEngagementByType('walk')).toBeUndefined();
    });

    it('reports false from hasEngagement', () => {
      expect(actor.hasEngagement('body')).toBe(false);
    });
  });

  describe('privileged mutators rejected outside SchedulerApi', () => {
    it('throws SecurityError on direct _setEngagement call', () => {
      const e = buildEngagement(actor as unknown as Engaged & TestActor);
      expect(() => actor._setEngagement('body', e)).toThrowError(
        SecurityError,
      );
    });

    it('throws SecurityError on direct _clearEngagement call', () => {
      expect(() => actor._clearEngagement('body')).toThrowError(
        SecurityError,
      );
    });
  });

});
