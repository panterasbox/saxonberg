/**
 * MQL system mode — the code-only null-giver context (see
 * `MqlContext.commandGiver`): a viewer-blind engine enumeration for
 * registry sweeps and fixture indexes. Semantics under a null giver:
 *
 *   - viewer-free seeds resolve (`world`, `/path` globs, `#id`,
 *     `online`) with NO perception gate and baseline names;
 *   - giver-anchored seeds (`me`/`here`/`peers`/`reachable`/
 *     `inventory`) and bareword predicates throw a clear resolver
 *     error — nothing guesses a viewer;
 *   - namespace filters (`mixin.` / `class.`) work (permission absent
 *     → permits, the server-internal-caller rule).
 *
 * Player-typed MQL can never reach this mode — the command dispatcher
 * always stamps a real giver.
 */

import { describe, it, expect } from 'vitest';
import { resolve } from '../mql/resolver';
import { MqlApi } from '../mql';
import type { MqlContext } from '../mql/types';
import { makeWorld } from './fixtures/mql-world';

function systemCtx(): MqlContext {
  return { commandGiver: null, scope: 'world' };
}

describe('MQL system mode (null giver)', () => {
  it('world resolves every registered object, no perception gate', () => {
    const world = makeWorld();
    const out = MqlApi.resolveMany('world', systemCtx());
    const ids = new Set(out.stuff.map((s) => s.stuffId));
    for (const s of [
      world.giver,
      world.location,
      world.rose,
      world.daisy,
      world.apple,
    ]) {
      expect(ids.has(s.stuffId)).toBe(true);
    }
  });

  it('world + mixin filter narrows declaratively', () => {
    const world = makeWorld();
    // Every fixture composes NamedMixin except nothing — narrow to the
    // Containable things to prove the filter runs (the giver and the
    // flowers are containable; the location is not).
    const out = MqlApi.resolveMany('world:[mixin.ContainableMixin]', {
      commandGiver: null,
      scope: 'world',
    });
    const ids = new Set(out.stuff.map((s) => s.stuffId));
    expect(ids.has(world.rose.stuffId)).toBe(true);
    expect(ids.has(world.location.stuffId)).toBe(false);
  });

  it('giver-anchored seeds throw a clear error', () => {
    makeWorld();
    for (const q of ['me', 'reachable', 'peers', 'inventory']) {
      expect(() => resolve(q, systemCtx())).toThrow(/requires a viewer/);
    }
  });

  it('here (the pronoun form) throws under a null giver', () => {
    makeWorld();
    expect(() => resolve('here', systemCtx())).toThrow(/requires a viewer/);
  });

  it('bareword predicates throw under a null giver', () => {
    makeWorld();
    expect(() => resolve('world:living', systemCtx())).toThrow(
      /requires a viewer/,
    );
  });

  it('pronoun-stash pronouns resolve empty (no stash, no viewer)', () => {
    makeWorld();
    expect(resolve('it', systemCtx())).toEqual([]);
  });
});
