import { describe, it, expect, afterEach } from 'vitest';
import { ClientStateMixin } from '../ClientState';
import type { ClientStateSchemaEntry } from '../ClientState';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

/**
 * Tiny per-test feature mixin to add `clientStateSchema` entries.
 * Each test composes its own host class so suites don't pollute
 * the prototype chain across cases.
 */
function FooMixin<T extends new (...args: any[]) => any>(Base: T) {
  return class FooMixin extends Base {
    static _mixinName = 'FooMixin';
    static clientStateSchema: ClientStateSchemaEntry[] = [
      { key: 'foo.alpha', defaultValue: 'a' },
      { key: 'foo.beta', defaultValue: 7 },
    ];
  };
}

function BarMixin<T extends new (...args: any[]) => any>(Base: T) {
  return class BarMixin extends Base {
    static _mixinName = 'BarMixin';
    static clientStateSchema: ClientStateSchemaEntry[] = [
      { key: 'bar.list', defaultValue: [] as string[] },
    ];
  };
}

function ValidatedMixin<T extends new (...args: any[]) => any>(Base: T) {
  return class ValidatedMixin extends Base {
    static _mixinName = 'ValidatedMixin';
    static clientStateSchema: ClientStateSchemaEntry[] = [
      {
        key: 'val.even',
        defaultValue: 0,
        validator: (v) =>
          typeof v === 'number' && v % 2 === 0
            ? true
            : `expected even number, got ${String(v)}`,
      },
    ];
  };
}

describe('ClientStateMixin', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('walker concatenates entries from multiple mixins in the chain', () => {
    class Host extends FooMixin(BarMixin(ClientStateMixin(Idea))) {}
    const h = makeStuff(() => new Host());
    const snap = h.snapshotClientState();
    expect(Object.keys(snap).sort()).toEqual([
      'bar.list',
      'foo.alpha',
      'foo.beta',
    ]);
  });

  it('getClientState returns the stored value when present', () => {
    class Host extends FooMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    h.setClientState('foo.alpha', 'x');
    expect(h.getClientState('foo.alpha')).toBe('x');
  });

  it('getClientState returns the schema default when unset', () => {
    class Host extends FooMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    expect(h.getClientState('foo.alpha')).toBe('a');
    expect(h.getClientState('foo.beta')).toBe(7);
  });

  it('setClientState rejects unknown keys', () => {
    class Host extends FooMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    expect(() => h.setClientState('nope.nope', 1)).toThrow();
  });

  it('getClientState rejects unknown keys', () => {
    class Host extends FooMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    expect(() => h.getClientState('nope.nope')).toThrow();
  });

  it('setClientState invokes the entry validator and rejects on failure', () => {
    class Host extends ValidatedMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    expect(() => h.setClientState('val.even', 3)).toThrow(/expected even/);
    // A passing value writes through.
    h.setClientState('val.even', 4);
    expect(h.getClientState('val.even')).toBe(4);
  });

  it('snapshotClientState returns a dense map (stored or default for every key)', () => {
    class Host extends FooMixin(BarMixin(ClientStateMixin(Idea))) {}
    const h = makeStuff(() => new Host());
    h.setClientState('foo.alpha', 'override');
    const snap = h.snapshotClientState();
    expect(snap['foo.alpha']).toBe('override');
    expect(snap['foo.beta']).toBe(7);
    expect(snap['bar.list']).toEqual([]);
  });

  it('_clientState round-trips through reflection (Hydrator-shaped write)', () => {
    class Host extends FooMixin(ClientStateMixin(Idea)) {}
    const h = makeStuff(() => new Host());
    // Directly write into the persistent slot the way the Hydrator would.
    (h as unknown as { _clientState: Record<string, unknown> })._clientState = {
      'foo.alpha': 'rehydrated',
    };
    expect(h.getClientState('foo.alpha')).toBe('rehydrated');
  });

  it('throws when a key is declared on more than one layer', () => {
    function DupeMixin<T extends new (...args: any[]) => any>(Base: T) {
      return class DupeMixin extends Base {
        static _mixinName = 'DupeMixin';
        static clientStateSchema: ClientStateSchemaEntry[] = [
          { key: 'foo.alpha', defaultValue: 'duplicate' },
        ];
      };
    }
    class Host extends DupeMixin(FooMixin(ClientStateMixin(Idea))) {}
    const h = makeStuff(() => new Host());
    expect(() => h.snapshotClientState()).toThrow(/declared on/);
  });
});
