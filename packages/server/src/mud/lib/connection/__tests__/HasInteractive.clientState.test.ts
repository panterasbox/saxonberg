/**
 * HasInteractive client-state surface tests.
 *
 * Covers the `clientStateSchema` static-array lookup, the three
 * methods (`getClientState` / `setClientState` /
 * `snapshotClientState`), validator rejection, and Hydrator-style
 * persistence round-trip.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { HasInteractiveMixin } from '../HasInteractive';
import type { ClientStateSchemaEntry } from '../HasInteractive';
import { Idea } from '../../stuff/Idea';
import { StuffApi } from '../../../api/stuff';
import { makeStuff } from '../../security/__tests__/test-setup';

class TestHost extends HasInteractiveMixin(Idea) {}

describe('HasInteractive client-state surface', () => {
  afterEach(() => {
    StuffApi.clearAll();
  });

  it('default clientStateSchema declares the v1 console keys', () => {
    const keys = TestHost.clientStateSchema.map(
      (e: ClientStateSchemaEntry) => e.key,
    );
    expect(keys).toContain('console.tabs');
    expect(keys).toContain('console.activeTab');
  });

  it('getClientState returns the schema default when unset', () => {
    const h = makeStuff(() => new TestHost());
    expect(h.getClientState('console.activeTab')).toBe('All');
    expect(h.getClientState('console.tabs')).toEqual([
      { name: 'All', muted: [] },
    ]);
  });

  it('getClientState returns the stored value when present', () => {
    const h = makeStuff(() => new TestHost());
    h.setClientState('console.activeTab', 'Quiet');
    expect(h.getClientState('console.activeTab')).toBe('Quiet');
  });

  it('setClientState rejects unknown keys', () => {
    const h = makeStuff(() => new TestHost());
    expect(() => h.setClientState('nope.nope', 1)).toThrow(/unknown key/);
  });

  it('getClientState rejects unknown keys', () => {
    const h = makeStuff(() => new TestHost());
    expect(() => h.getClientState('nope.nope')).toThrow(/unknown key/);
  });

  it('setClientState invokes the entry validator and rejects on failure', () => {
    class ValidatedHost extends HasInteractiveMixin(Idea) {
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
    }
    const h = makeStuff(() => new ValidatedHost());
    expect(() => h.setClientState('val.even', 3)).toThrow(/expected even/);
    h.setClientState('val.even', 4);
    expect(h.getClientState('val.even')).toBe(4);
  });

  it('snapshotClientState returns a dense map (stored or default for every key)', () => {
    const h = makeStuff(() => new TestHost());
    h.setClientState('console.activeTab', 'Quiet');
    const snap = h.snapshotClientState();
    expect(snap['console.activeTab']).toBe('Quiet');
    expect(snap['console.tabs']).toEqual([{ name: 'All', muted: [] }]);
  });

  it('_clientState round-trips through reflection (Hydrator-shaped write)', () => {
    const h = makeStuff(() => new TestHost());
    (h as unknown as { _clientState: Record<string, unknown> })._clientState = {
      'console.activeTab': 'Rehydrated',
    };
    expect(h.getClientState('console.activeTab')).toBe('Rehydrated');
  });
});
