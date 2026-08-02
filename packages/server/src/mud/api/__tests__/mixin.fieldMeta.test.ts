/**
 * `MixinApi.getAllFieldMeta` — the collector the four legacy ones become
 * derivations of.
 *
 * The headline case is `Weapon`/`Tangible` `mass`, reproduced here
 * synthetically. It is the reason the merge is PROPERTY-level rather
 * than field-level: `Tangible` declares `mass` persistent, `Weapon`
 * declares a marshaller for it, and field-level first-wins would make
 * the subclass's `{ marshaller }` replace `{ persistent: true }`
 * outright — `mass` would stop persisting on every weapon in the game,
 * silently, inside a 245-file diff. Keep this test.
 */

import { describe, it, expect } from 'vitest';
import { MixinApi } from '../mixin';
import type { FieldMeta } from '../../lib/mixin';

// ── Synthetic three-deep chains ─────────────────────────────────────

class Base {
  static fieldMeta: FieldMeta = {
    age: { persistent: true },
    mass: { persistent: true },
  };
}

class Middle extends Base {
  static fieldMeta: FieldMeta = {
    colour: { persistent: true },
  };
}

/** The `Weapon` shape: sharpens a base field with a marshaller only. */
class Leaf extends Middle {
  static fieldMeta: FieldMeta = {
    balance: { persistent: true },
    mass: { marshaller: '/lib/quantity/kg' },
  };
}

class NoMeta {}

describe('MixinApi.getAllFieldMeta', () => {
  it('collects up the whole chain, own-property only', () => {
    const meta = MixinApi.getAllFieldMeta(Leaf);
    expect(Object.keys(meta).sort()).toEqual([
      'age',
      'balance',
      'colour',
      'mass',
    ]);
  });

  it('⭐ merges PROPERTIES, not fields — the Weapon/Tangible mass case', () => {
    const meta = MixinApi.getAllFieldMeta(Leaf);
    // Both survive. Field-level first-wins would have dropped
    // `persistent` here, and nothing would have said so.
    expect(meta.mass).toEqual({
      persistent: true,
      marshaller: '/lib/quantity/kg',
    });
  });

  it('key order is concrete-class first, so persistent order is preserved', () => {
    const meta = MixinApi.getAllFieldMeta(Leaf);
    // Leaf's own keys, then Middle's, then Base's — matching the order
    // `getAllPersistentFields` produces by pushing chain-order and
    // deduping on first occurrence.
    expect(Object.keys(meta)).toEqual(['balance', 'mass', 'colour', 'age']);
    expect(Object.keys(meta).filter((k) => meta[k]!.persistent)).toEqual([
      'balance',
      'mass',
      'colour',
      'age',
    ]);
  });

  it('a nearer layer wins per property; a farther one only fills gaps', () => {
    class Sharpened extends Leaf {
      static fieldMeta: FieldMeta = {
        mass: { marshaller: '/lib/quantity/g', instruction: true },
      };
    }
    const meta = MixinApi.getAllFieldMeta(Sharpened);
    expect(meta.mass).toEqual({
      marshaller: '/lib/quantity/g', // Sharpened wins
      instruction: true, // only Sharpened declares it
      persistent: true, // filled from Base — never lost
    });
  });

  it('does not mutate a declaring class’s own static', () => {
    MixinApi.getAllFieldMeta(Leaf);
    MixinApi.getAllFieldMeta(Leaf);
    // The accumulator spreads before merging, so repeated collection
    // cannot accrete into Base's declaration.
    expect(Base.fieldMeta.mass).toEqual({ persistent: true });
    expect(Leaf.fieldMeta.mass).toEqual({ marshaller: '/lib/quantity/kg' });
  });

  it('returns an empty object for a class declaring nothing', () => {
    expect(MixinApi.getAllFieldMeta(NoMeta)).toEqual({});
  });

  it('reproduces the reference axes a subclass sharpens', () => {
    class RefBase {
      static fieldMeta: FieldMeta = {
        _container: { ref: 'instance' },
      };
    }
    class RefLeaf extends RefBase {
      static fieldMeta: FieldMeta = {
        _container: { lifetime: 'weak' },
      };
    }
    expect(MixinApi.getAllFieldMeta(RefLeaf)._container).toEqual({
      ref: 'instance',
      lifetime: 'weak',
    });
  });
});
