/**
 * R7 — the reference-axis rules, enforced at class registration.
 *
 * These run on the MERGED metadata, which is the whole reason they live
 * at registration rather than in `lint:field-meta`: the merge is
 * property-level up the prototype chain, so a base can declare
 * `ref: 'instance'` and a subclass sharpen it with a `lifetime`. Only a
 * walk holding the constructor sees the result. The static lint carries
 * the complementary rules — the ones that are wrong within one class
 * body regardless of what any other layer says.
 */

import { describe, it, expect } from 'vitest';
import { MixinApi } from '../mixin';
import type { FieldMeta } from '../../lib/mixin';

const check = (ctor: unknown) =>
  MixinApi.assertComposable(ctor as Parameters<typeof MixinApi.assertComposable>[0]);

describe('fieldMeta validation at registration', () => {
  it('rejects an instance ref that is also persistent', () => {
    class Bad {
      static fieldMeta: FieldMeta = {
        _container: { ref: 'instance', persistent: true },
      };
    }
    expect(() => check(Bad)).toThrow(/cannot be persistent/);
    expect(() => check(Bad)).toThrow(/ref-shapes\.md/);
  });

  it('accepts an IDENTITY ref that is persistent — the normal case', () => {
    class Fine {
      static fieldMeta: FieldMeta = {
        _speciesPath: { ref: 'identity', persistent: true },
      };
    }
    expect(() => check(Fine)).not.toThrow();
  });

  it('rejects an identity ref carrying a lifetime', () => {
    class Bad {
      static fieldMeta: FieldMeta = {
        _speciesPath: { ref: 'identity', lifetime: 'weak' },
      };
    }
    expect(() => check(Bad)).toThrow(/takes no lifetime/);
  });

  it('rejects a lifetime with no ref at all', () => {
    class Bad {
      static fieldMeta: FieldMeta = { _thing: { lifetime: 'owned' } };
    }
    expect(() => check(Bad)).toThrow(/without ref: 'instance'/);
  });

  it('rejects symmetric with no inverse', () => {
    class Bad {
      static fieldMeta: FieldMeta = {
        _hauling: { ref: 'instance', lifetime: 'symmetric' },
      };
    }
    expect(() => check(Bad)).toThrow(/cannot find what to clear/);
  });

  it('rejects a same-class inverse that does not point back', () => {
    class Bad {
      static fieldMeta: FieldMeta = {
        _a: { ref: 'instance', lifetime: 'symmetric', inverse: '_b' },
        _b: { ref: 'instance', lifetime: 'weak' },
      };
    }
    expect(() => check(Bad)).toThrow(/must be reciprocal/);
  });

  it('accepts a reciprocal same-class pair', () => {
    class Fine {
      static fieldMeta: FieldMeta = {
        _a: { ref: 'instance', lifetime: 'symmetric', inverse: '_b' },
        _b: { ref: 'instance', lifetime: 'symmetric', inverse: '_a' },
      };
    }
    expect(() => check(Fine)).not.toThrow();
  });

  it('does NOT judge a cross-class inverse — that is the whole-tree lint', () => {
    // `Adornment.adornedTo` ↔ `Adornable.fixtureSlots` live on two
    // different hosts; registering one cannot see the other. Naming an
    // inverse this class does not declare must therefore pass here.
    class Fine {
      static fieldMeta: FieldMeta = {
        adornedTo: {
          ref: 'instance',
          lifetime: 'symmetric',
          inverse: 'fixtureSlots',
        },
      };
    }
    expect(() => check(Fine)).not.toThrow();
  });

  it('validates the MERGED view — a base ref plus a subclass lifetime', () => {
    class Base {
      static fieldMeta: FieldMeta = { _x: { ref: 'identity' } };
    }
    class Sub extends Base {
      static fieldMeta: FieldMeta = { _x: { lifetime: 'weak' } };
    }
    // Neither class body is illegal on its own; the merge is. This is
    // exactly what a per-class-body static scan cannot see.
    expect(() => check(Sub)).toThrow(/takes no lifetime/);
  });

  it('names the field and the class in the message', () => {
    class Offender {
      static fieldMeta: FieldMeta = {
        _slot: { ref: 'instance', persistent: true },
      };
    }
    expect(() => check(Offender)).toThrow(/Offender\.fieldMeta\['_slot'\]/);
  });

  it('passes every class that declares no ref at all', () => {
    class Plain {
      static fieldMeta: FieldMeta = {
        age: { persistent: true },
        mass: { persistent: true, marshaller: '/lib/quantity/kg' },
      };
    }
    expect(() => check(Plain)).not.toThrow();
  });
});
