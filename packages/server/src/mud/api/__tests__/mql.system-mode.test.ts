/**
 * MQL system mode — the code-only null-giver context (see
 * `MqlContext.commandGiver`): a viewer-blind engine enumeration for
 * registry sweeps and fixture indexes. Semantics under a null giver:
 *
 *   - viewer-free seeds resolve (`/path` globs, `#id`, `online`) with
 *     NO perception gate and baseline names;
 *   - ⭐ `world` is NOT among them any more. System mode is a statement
 *     about *whose eyes*, and it never was a grant to read the whole
 *     registry — the two happened to coincide, and separating them is
 *     what this build did. Reading the registry is its own permission,
 *     carried by the two gated entries on `MqlApi`;
 *   - giver-anchored seeds (`me`/`here`/`peers`/`reachable`/
 *     `inventory`) and bareword predicates throw a clear resolver
 *     error — nothing guesses a viewer;
 *   - namespace filters (`mixin.` / `class.`) work (permission absent
 *     → permits, the server-internal-caller rule).
 *
 * Player-typed MQL can never reach this mode — the command dispatcher
 * always stamps a real giver.
 */

import "../../../test-bootstrap";
import { describe, it, expect } from 'vitest';
import { resolve } from '../mql/resolver';
import { MqlApi } from '../mql';
import type { MqlContext } from '../mql/types';
import { makeWorld } from './fixtures/mql-world';

function systemCtx(): MqlContext {
  return { commandGiver: null, scope: 'world' };
}

describe('MQL system mode (null giver)', () => {
  it('⭐ a null giver is NOT a grant to read the registry', () => {
    makeWorld();
    // This is the correction the build makes to system mode. A null
    // giver says "nobody is looking"; it never said "and therefore you
    // may read everything", and every one of the seventeen engine sites
    // that walked the world did so through this door.
    expect(() => MqlApi.resolveMany('world', systemCtx())).toThrow(
      /not available here/,
    );
    expect(() =>
      MqlApi.resolveMany('world:[mixin.ContainableMixin]', systemCtx()),
    ).toThrow(/not available here/);
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
    // ⚠ Anchored on `online:` rather than `world:` — `world` now throws
    // its own refusal FIRST, which would make this test pass for the
    // wrong reason.
    expect(() => resolve('online:living', systemCtx())).toThrow(
      /requires a viewer/,
    );
  });

  it('pronoun-stash pronouns resolve empty (no stash, no viewer)', () => {
    makeWorld();
    expect(resolve('it', systemCtx())).toEqual([]);
  });
});

/**
 * ⭐⭐ **MQL is universal** (size-and-carrying D23, 2026-11-11): for every
 * viewer-free seed, every transform and every class filter, a player giver
 * gets EXACTLY the list system mode gets. The engine holds no perception
 * rule of its own; a surface that binds or shows the result applies
 * `PerceptionApi.perceived`. (Predicates are giver-anchored words and throw
 * under a null giver — `mql.universal.test.ts` pins them equal across
 * players instead.)
 */
describe('a player giver resolves exactly what system mode does (D23)', () => {
  it('every viewer-free seed, every transform, every class filter', () => {
    const w = makeWorld();
    const player: MqlContext = { commandGiver: w.giver, scope: '' };
    const system: MqlContext = { commandGiver: null, scope: '' };
    const g = `#${w.giver.stuffId}`;
    const loc = `#${w.location.stuffId}`;
    const rose = `#${w.rose.stuffId}`;
    const queries = [
      g, loc, rose,
      `${g}:i`, `${g}:I`, `${loc}:i`, `${loc}:I`,
      `${rose}:e`, `${rose}:E`, `#${w.apple.stuffId}:e`,
      `${loc}:i:[class.TestThing]`, `${loc}:I:[mixin.ContainableMixin]`,
      `${loc}:i:[1]`, `${loc}:i:[-1]`, `${loc}:i:[1..2]`,
      `${loc}:i:flower`, `${loc}:i:'rose'`,
      'online',
    ];
    for (const q of queries) {
      const a = MqlApi.resolveMany(q, player).stuff.map((s) => s.stuffId);
      const b = MqlApi.resolveMany(q, system).stuff.map((s) => s.stuffId);
      expect({ q, ids: a }).toEqual({ q, ids: b });
    }
  });

  it('a head ordinal rides the result for both, never applied to it', () => {
    const w = makeWorld();
    const loc = `#${w.location.stuffId}`;
    const player = MqlApi.resolveMany(`${loc}:i:flower`, { commandGiver: w.giver, scope: '' });
    const second = MqlApi.resolveMany('second flower', { commandGiver: w.giver, scope: 'peers' });
    expect(second.ordinal).toBe(2);
    expect(second.stuff.map((s) => s.stuffId).sort()).toEqual(player.stuff.map((s) => s.stuffId).sort());
  });
});
