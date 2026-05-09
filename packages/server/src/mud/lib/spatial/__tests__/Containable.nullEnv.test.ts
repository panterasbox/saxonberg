/**
 * Null-environment regression tests.
 *
 * Locks in the documented behavior matrix for detached Stuff
 * (`environment === null`) — see
 * `docs/subsystems/spatial.md § Detached Stuff (environment === null)`.
 * Each test exercises one row of the matrix from a real subsystem
 * entry point, asserting the documented outcome.
 *
 * The behaviors land in production code already (audit at the time
 * the matrix was written found zero naked dereferences); these tests
 * are the regression net.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Thing } from '../../stuff/Thing';
import { Character } from '../../character/Character';
import { LightApi } from '../../../api/light';
import { MessageApi } from '../../../api/message';
import { ContainmentApi } from '../../../api/containment';
import { StuffApi } from '../../../api/stuff';
import { MqlApi } from '../../../api/mql';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestCharacter extends Character {}

describe('null-environment regressions', () => {
  beforeEach(() => {
    StuffApi.clearAll();
  });

  afterEach(() => {
    StuffApi.clearAll();
    vi.restoreAllMocks();
  });

  it('LightApi.canSee returns false for a detached target', () => {
    const viewer = makeStuff(() => new TestCharacter());
    const detached = makeStuff(() => new Thing());
    expect(detached.getContainer()).toBeNull();
    // Short-circuits on the env-null branch via canSeeOverride; the
    // default override returns the raw value (`false`).
    expect(LightApi.canSee(viewer as never, detached as never)).toBe(false);
  });

  it('MessageApi.messageContainer warns and returns for a detached source', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const detached = makeStuff(() => new Thing());
    expect(detached.getContainer()).toBeNull();
    MessageApi.messageContainer(detached as never, {
      kind: 'narrate',
      to: 'peers',
      content: 'hi',
    } as never);
    expect(warn).toHaveBeenCalledWith(
      expect.stringMatching(/not in a container/i)
    );
  });

  it('ContainmentApi.move detached → null is a no-op (idempotent)', () => {
    const detached = makeStuff(() => new Thing());
    expect(() => ContainmentApi.move(detached, null)).not.toThrow();
    expect(detached.getContainer()).toBeNull();
  });

  it('MQL scope walk on a detached giver produces an empty result', () => {
    // Detached giver — no container, so the scope walk has nothing to
    // search. resolveMany returns an empty `stuff` array (NOT throws).
    // Character composes Containable so getContainer() exists; it
    // returns null when the character is unplaced.
    const giver = makeStuff(() => new TestCharacter());
    expect(giver.getContainer()).toBeNull();
    const result = MqlApi.resolveMany('foo', {
      commandGiver: giver as never,
      scope: 'reachable',
    });
    expect(result.stuff).toEqual([]);
  });
});
