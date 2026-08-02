/**
 * The `ref: 'instance'` read-side self-heal, in the ProxyApi get trap.
 *
 * Lands ahead of any production declaration, so these synthetic classes
 * are the only thing exercising it. That is deliberate: a mechanism that
 * ships inert should still be proved to work, or the wave that starts
 * declaring `ref` cannot tell a broken trap from a wrong declaration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { MixinApi } from '../mixin';
import { ProxyApi } from '../proxy';
import { Idea } from '../../lib/stuff/Idea';
import type { FieldMeta } from '../../lib/mixin';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Target extends Idea {}

class Holder extends Idea {
  static fieldMeta: FieldMeta = {
    _single: { ref: 'instance', lifetime: 'weak' },
    _many: { ref: 'instance', lifetime: 'owned' },
  };
  _single: Target | null = null;
  _many: Target[] = [];
}

/** No instance refs at all — the null-set fast path. */
class Plain extends Idea {
  static fieldMeta: FieldMeta = { age: { persistent: true } };
  age = 0;
}

describe('ProxyApi weak-ref self-heal', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('getWeakRefFields collects instance refs, and is null when there are none', () => {
    expect(MixinApi.getWeakRefFields(Holder)).toEqual(
      new Set(['_single', '_many'])
    );
    // `null`, not an empty set — the trap's hot path is one `!== null`.
    expect(MixinApi.getWeakRefFields(Plain)).toBeNull();
  });

  it('reads null for a destroyed target AND clears the slot', () => {
    const holder = makeStuff(() => new Holder());
    const target = makeStuff(() => new Target());
    holder._single = target;
    expect(holder._single).toBe(target);

    StuffApi.destruct(target);

    expect(holder._single).toBeNull();
    // Cleared, not merely masked: the raw target no longer holds it, so
    // the ref is released rather than retained behind a null-returning
    // read. Read through `Stuff.RAW_TARGET` — the deliberate observation
    // seam — because that is the one view the heal does NOT run on.
    const raw = ProxyApi.unwrap(holder) as unknown as { _single: unknown };
    expect(raw._single).toBeNull();
  });

  it('leaves a live target completely alone', () => {
    const holder = makeStuff(() => new Holder());
    const target = makeStuff(() => new Target());
    holder._single = target;
    expect(holder._single).toBe(target);
    expect(holder._single).toBe(target); // repeat reads are stable
  });

  it('does NOT walk collections — arity is decided at heal time', () => {
    const holder = makeStuff(() => new Holder());
    const a = makeStuff(() => new Target());
    const b = makeStuff(() => new Target());
    holder._many = [a, b];

    StuffApi.destruct(a);

    // The array is returned untouched. Pruning a collection on every
    // read is O(n) on hot paths and buys nothing the R2.4 chokepoints
    // don't already give; `_many` gets a destruct-side rule instead.
    expect(holder._many).toHaveLength(2);
    expect(holder._many[0]).toBe(a);
  });

  it('does not touch fields that are not declared instance refs', () => {
    const holder = makeStuff(() => new Plain());
    holder.age = 7;
    expect(holder.age).toBe(7);
  });
});
