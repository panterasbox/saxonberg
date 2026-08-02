/**
 * Slot 2.5 — the destruct-side engine for the `lifetime` axis.
 *
 * Lands inert (no production class declares a `lifetime` yet), so these
 * synthetic classes are the only thing exercising it. Same argument as
 * W4a: a mechanism that ships inert must still be proved to work, or the
 * wave that starts declaring cannot tell a broken engine from a wrong
 * declaration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { StuffApi } from '../stuff';
import { ShadowApi } from '../shadow';
import { Idea } from '../../lib/stuff/Idea';
import type { FieldMeta } from '../../lib/mixin';
import { makeStuff } from '../../lib/security/__tests__/test-setup';

class Child extends Idea {}

class OwnerSingle extends Idea {
  static fieldMeta: FieldMeta = {
    _kid: { ref: 'instance', lifetime: 'owned' },
  };
  _kid: Child | null = null;
}

class OwnerMap extends Idea {
  static fieldMeta: FieldMeta = {
    _kids: { ref: 'instance', lifetime: 'owned' },
  };
  _kids = new Map<string, Child>();
}

class OwnerSet extends Idea {
  static fieldMeta: FieldMeta = {
    _kids: { ref: 'instance', lifetime: 'owned' },
  };
  _kids = new Set<Child>();
}

class SideA extends Idea {
  static fieldMeta: FieldMeta = {
    _b: { ref: 'instance', lifetime: 'symmetric', inverse: '_a' },
  };
  _b: SideB | null = null;
}
class SideB extends Idea {
  static fieldMeta: FieldMeta = {
    _a: { ref: 'instance', lifetime: 'symmetric', inverse: '_b' },
  };
  _a: SideA | null = null;
}

/** Symmetric + owned on the same host — the `Boundary` shape. */
class BothOrder extends Idea {
  static fieldMeta: FieldMeta = {
    _peer: { ref: 'instance', lifetime: 'symmetric', inverse: '_a' },
    _owned: { ref: 'instance', lifetime: 'owned' },
  };
  _peer: SideB | null = null;
  _owned: Child | null = null;
}

class Weak extends Idea {
  static fieldMeta: FieldMeta = {
    _seen: { ref: 'instance', lifetime: 'weak' },
  };
  _seen: Child | null = null;
}

describe('slot 2.5 — declared reference cleanup', () => {
  beforeEach(() => {
    ShadowApi._clearAllForTesting();
    StuffApi.clearAll();
  });

  it('owned: destructs a single held target and clears the slot', () => {
    const owner = makeStuff(() => new OwnerSingle());
    const kid = makeStuff(() => new Child());
    owner._kid = kid;

    StuffApi.destruct(owner);

    expect(kid.isDestroyed()).toBe(true);
  });

  it('owned: cascades over a Map and clears it (shape preserved)', () => {
    const owner = makeStuff(() => new OwnerMap());
    const a = makeStuff(() => new Child());
    const b = makeStuff(() => new Child());
    owner._kids.set('north', a);
    owner._kids.set('south', b);

    StuffApi.destruct(owner);

    expect(a.isDestroyed()).toBe(true);
    expect(b.isDestroyed()).toBe(true);
    // Cleared, not replaced with null — a Map slot stays a Map.
    expect(owner._kids).toBeInstanceOf(Map);
    expect(owner._kids.size).toBe(0);
  });

  it('owned: cascades over a Set', () => {
    const owner = makeStuff(() => new OwnerSet());
    const a = makeStuff(() => new Child());
    owner._kids.add(a);

    StuffApi.destruct(owner);

    expect(a.isDestroyed()).toBe(true);
    expect(owner._kids).toBeInstanceOf(Set);
    expect(owner._kids.size).toBe(0);
  });

  it('symmetric: clears the back-ref on the other side, which SURVIVES', () => {
    const a = makeStuff(() => new SideA());
    const b = makeStuff(() => new SideB());
    a._b = b;
    b._a = a;

    StuffApi.destruct(a);

    // The distinction from `owned`: the partner is not destroyed.
    expect(b.isDestroyed()).toBe(false);
    expect(b._a).toBeNull();
  });

  it('runs ALL symmetric clears before ANY owned cascade', () => {
    // Specified, not incidental: an owned cascade destroys its targets,
    // so a back-ref clear scheduled after it would be operating on
    // destroyed objects. Here the symmetric partner must come out
    // cleanly cleared even though the same host also owns something.
    const host = makeStuff(() => new BothOrder());
    const peer = makeStuff(() => new SideB());
    const kid = makeStuff(() => new Child());
    host._peer = peer;
    peer._a = host as unknown as SideA;
    host._owned = kid;

    StuffApi.destruct(host);

    expect(peer.isDestroyed()).toBe(false);
    expect(peer._a).toBeNull();
    expect(kid.isDestroyed()).toBe(true);
  });

  it('weak declares no destruct-side rule — the target is untouched', () => {
    const holder = makeStuff(() => new Weak());
    const kid = makeStuff(() => new Child());
    holder._seen = kid;

    StuffApi.destruct(holder);

    expect(kid.isDestroyed()).toBe(false);
  });

  it('is a no-op on empty, null and already-destroyed slots', () => {
    const empty = makeStuff(() => new OwnerSingle());
    expect(() => StuffApi.destruct(empty)).not.toThrow();

    const owner = makeStuff(() => new OwnerSingle());
    const kid = makeStuff(() => new Child());
    owner._kid = kid;
    StuffApi.destruct(kid); // already gone before the holder dies
    expect(() => StuffApi.destruct(owner)).not.toThrow();
  });

  it('a throwing cleanup does not prevent destroy()', () => {
    class Exploding extends Idea {
      static fieldMeta: FieldMeta = {
        _kid: { ref: 'instance', lifetime: 'owned' },
      };
      get _kid(): unknown {
        throw new Error('boom');
      }
    }
    const owner = makeStuff(() => new Exploding());
    expect(() => StuffApi.destruct(owner)).not.toThrow();
    expect(owner.isDestroyed()).toBe(true);
  });
});
