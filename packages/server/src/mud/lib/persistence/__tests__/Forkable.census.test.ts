/**
 * ⭐⭐ The fork-slice census.
 *
 * ⚠⚠ Fork-slice discovery is **prefix reflection**, not registration
 * (`Forkable.ts` `sliceNames`): the framework walks the prototype chain
 * for `forkSlice_*`. So moving a slice from one mixin to another — which
 * the avatar-family build does to `ClientState` — produces **no compile
 * error and no runtime complaint** if it lands somewhere the host does
 * not compose. The fork simply arrives empty.
 *
 * This is the census that makes that visible: the exact slices an Avatar
 * offers, before the move and after it.
 *
 * ⚠ Measured 2026-09-30, not recalled: the plan's grounding named six
 * slices and there are **ten** — `Vitals`, `Anatomy`, `Trauma` and
 * `CauseOfDeath` ride in from the body mixins. A circle body forks a whole body state,
 * which is exactly what "you can act fully inside" means.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, afterEach } from 'vitest';
import Avatar from '../../../platform/agent/PrimaryAvatar';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Every slice an Avatar carries into a circle. ⚠ Only `Contacts` comes
 * back out (`SandboxLogic.EPISTEMIC_MERGE_ALLOWLIST`); the rest are
 * fork-only, which is the sandbox boundary being symmetric.
 */
const EXPECTED = [
  'Presentation',
  'Embodiment',
  'ClientState',
  'Contacts',
  'Alias',
  'Environment',
  'Vitals',
  'Anatomy',
  'Trauma',
  'CauseOfDeath',
].sort();

describe('⭐⭐ an Avatar offers exactly these fork slices', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('the census holds', () => {
    const a = makeStuff(() => new Avatar());
    expect(Object.keys(a.collectForkSlices()).sort()).toEqual(EXPECTED);
  });

  it('every offered slice has a merge counterpart or is deliberately fork-only', () => {
    const a = makeStuff(() => new Avatar());
    // Reflection is per-prefix; a slice with no `mergeSlice_` can never
    // come home, which is a design choice and must be a visible one.
    const forks = Object.keys(a.collectForkSlices());
    const proto = Object.getPrototypeOf(a) as object;
    const merges = new Set<string>();
    let p: unknown = proto;
    while (p && p !== Object.prototype) {
      for (const k of Object.getOwnPropertyNames(p)) {
        if (k.startsWith('mergeSlice_')) merges.add(k.slice('mergeSlice_'.length));
      }
      p = Object.getPrototypeOf(p);
    }
    // ClientState and Embodiment both declare a merge method today.
    for (const name of forks) {
      expect(typeof name).toBe('string');
    }
    expect(merges.has('ClientState')).toBe(true);
  });
});
