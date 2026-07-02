/**
 * ApiLogic — the residency-exempt base for the *Logic singletons.
 * Phase 3: the base vetoes canEvict, and every migrated *Logic inherits
 * that veto while remaining an Idea.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { Stuff, EvictionContext } from '../Stuff';
import { Idea } from '../Idea';
import { ApiLogic } from '../ApiLogic';
import { OfficeLogic } from '../../../obj/api/OfficeLogic';
import { StuffApi } from '../../../api/stuff';
import { ProxyApi } from '../../../api/proxy';
import { makeStuff } from '../../security/__tests__/test-setup';

const IDLE: EvictionContext = { idleMs: 9_000_000_000, reason: 'idle' };

describe('ApiLogic residency exemption', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  it('ApiLogic.canEvict vetoes unconditionally', () => {
    const s: Stuff = ProxyApi.unwrap(makeStuff(() => new ApiLogic()));
    expect(s.canEvict(IDLE)).toEqual({
      ok: false,
      reason: 'load-bearing logic singleton',
    });
  });

  it('a migrated *Logic is still an Idea and inherits the veto', () => {
    const s: Stuff = ProxyApi.unwrap(makeStuff(() => new OfficeLogic()));
    expect(s).toBeInstanceOf(Idea);
    expect(s).toBeInstanceOf(ApiLogic);
    expect(s.canEvict(IDLE).ok).toBe(false);
  });
});
