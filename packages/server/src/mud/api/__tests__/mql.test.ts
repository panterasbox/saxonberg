/**
 * MQL resolver tests — exercises the lex → desugar → parse → resolve
 * pipeline against a small in-memory world (see `fixtures/mql-world`).
 *
 * Phase 5 scope: direct seeds (pronouns, keywords, paths, ids,
 * literals), scope-promoted seeds (`inventory`, `online`, `world`),
 * `:i` and `:e` transforms, the `.X` detail-drill operator, set ops.
 * Predicates and bracket filter expressions arrive in Phase 6.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { resolve } from '../mql/resolver';
import { _MqlAdminFlag, MqlPermissionError } from '../mql/permissions';
import { makeWorld, type MqlWorld } from './fixtures/mql-world';
import type { MqlContext } from '../mql/types';
import type { Stuff } from '../../lib/stuff/Stuff';

function ids(matches: { stuff: Stuff }[]): string[] {
  return matches.map((m) => m.stuff.stuffId);
}

describe('MQL resolver — direct seeds', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('me resolves to the giver', () => {
    const out = resolve('me', ctx);
    expect(ids(out)).toEqual([world.giver.stuffId]);
  });

  it('here resolves to the giver location', () => {
    const out = resolve('here', ctx);
    expect(ids(out)).toEqual([world.location.stuffId]);
  });

  it('it / him / her / them are no-ops in Phase 5 (pronoun memory not wired)', () => {
    expect(resolve('it', ctx)).toEqual([]);
    expect(resolve('them', ctx)).toEqual([]);
  });

  it('$$ is empty in Phase 5 (pronoun memory not wired)', () => {
    expect(resolve('$$', ctx)).toEqual([]);
  });

  describe('admin-tier seeds', () => {
    afterEach(() => {
      _MqlAdminFlag.granter = () => false;
    });

    it('online rejects without admin', () => {
      expect(() => resolve('online', ctx)).toThrow(MqlPermissionError);
    });

    it('world rejects without admin', () => {
      expect(() => resolve('world', ctx)).toThrow(MqlPermissionError);
    });

    it('online resolves to all online holders when admin granted', () => {
      _MqlAdminFlag.granter = () => true;
      // No interactives are connected in tests, so result is empty
      // — still a successful resolve (no permission throw).
      expect(resolve('online', ctx)).toEqual([]);
    });

    it('world resolves all stuff when admin granted', () => {
      _MqlAdminFlag.granter = () => true;
      const out = resolve('world', ctx);
      const idSet = new Set(ids(out));
      expect(idSet.has(world.giver.stuffId)).toBe(true);
      expect(idSet.has(world.rose.stuffId)).toBe(true);
      expect(idSet.has(world.location.stuffId)).toBe(true);
    });
  });

  describe('inventory seed', () => {
    it('resolves to giver as anchor (transforms with :i give contents)', () => {
      // The `inventory` seed alias resolves to the giver itself. The
      // resolver's :i transform on the giver yields contents — but
      // bare `inventory` is the anchor, not its expansion.
      const out = resolve('inventory', ctx);
      expect(ids(out)).toEqual([world.giver.stuffId]);
    });

    it('inventory:i yields giver contents (the apple)', () => {
      const out = resolve('inventory:i', ctx);
      expect(ids(out)).toEqual([world.apple.stuffId]);
    });
  });

  describe('path seed', () => {
    afterEach(() => {
      _MqlAdminFlag.granter = () => false;
    });

    it('rejects without authoring tier', () => {
      expect(() => resolve('/obj/Avatar/*', ctx)).toThrow(MqlPermissionError);
    });

    it('returns empty when authoring is granted but nothing matches', () => {
      _MqlAdminFlag.granter = () => true;
      expect(resolve('/obj/Nope/*', ctx)).toEqual([]);
    });
  });
});

describe('MQL resolver — keyword search', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('rose finds the rose in the room', () => {
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('flower finds both rose and daisy (AND-narrow on shared keyword)', () => {
    const out = resolve('flower', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('honors a multi-source scope fragment', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory, here' };
    const out = resolve('apple', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it('inventory-only scope does not find room contents', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory' };
    const out = resolve('rose', ctx);
    expect(ids(out)).not.toContain(world.rose.stuffId);
  });

  it('inventory-only scope finds inventory items', () => {
    ctx = { commandGiver: world.giver, scope: 'inventory' };
    const out = resolve('apple', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it('matches keywords on the location itself in here scope', () => {
    const out = resolve('square', ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it('falls back to here when scope is empty', () => {
    ctx = { commandGiver: world.giver, scope: '' };
    const out = resolve('rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });
});

describe('MQL resolver — transforms', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it(':i lists giver contents', () => {
    const out = resolve('me:i', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
  });

  it(':e gives giver environment', () => {
    const out = resolve('me:e', ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it('chained :e:i goes up then back into siblings', () => {
    // me:e is the location; :i is its contents (rose, daisy, giver)
    const out = resolve('me:e:i', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });
});

describe('MQL resolver — detail-drill', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('here.inscription drills into the location detail', () => {
    const out = resolve('here.inscription', ctx);
    expect(out).toHaveLength(1);
    expect(out[0]?.stuff.stuffId).toBe(world.location.stuffId);
    expect(out[0]?.via?.detailPath).toEqual(['inscription']);
  });

  it('here.unknown returns no matches', () => {
    const out = resolve('here.nope', ctx);
    expect(out).toEqual([]);
  });
});

describe('MQL resolver — set operations', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('comma is union', () => {
    const out = resolve('rose, daisy', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(true);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('dash is set difference', () => {
    const out = resolve('flower - rose', ctx);
    const idSet = new Set(ids(out));
    expect(idSet.has(world.rose.stuffId)).toBe(false);
    expect(idSet.has(world.daisy.stuffId)).toBe(true);
  });

  it('dedups across union', () => {
    const out = resolve('rose, rose, rose', ctx);
    const matchIds = ids(out);
    expect(matchIds.filter((id) => id === world.rose.stuffId)).toHaveLength(1);
  });
});

describe('MQL resolver — literals', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it("'rose' (literal) matches by exact name", () => {
    const out = resolve("'rose'", ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it("'Town Square' (literal) matches case-insensitively on the location", () => {
    const out = resolve("'Town Square'", ctx);
    expect(ids(out)).toContain(world.location.stuffId);
  });

  it("'no such thing' returns empty", () => {
    const out = resolve("'no such thing'", ctx);
    expect(out).toEqual([]);
  });
});

describe('MQL resolver — desugar integration', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: 'here' };
  });

  it('strips leading articles', () => {
    const out = resolve('the rose', ctx);
    expect(ids(out)).toContain(world.rose.stuffId);
  });

  it('rewrites ordinal-prefix queries', () => {
    // `first flower` → `flower:[1]`
    const out = resolve('first flower', ctx);
    expect(out).toHaveLength(1);
  });

  it("'last' resolves to the last match", () => {
    const out = resolve('last flower', ctx);
    expect(out).toHaveLength(1);
  });
});
