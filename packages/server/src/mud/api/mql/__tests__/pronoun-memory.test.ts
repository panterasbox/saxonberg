/**
 * PronounMemory tests — exercise the stash directly.
 *
 * Higher-level integration (resolver reads via pronoun seeds,
 * dispatcher updates post-resolve, dynamic-pronoun scope
 * substitution) is covered in `mql.test.ts` and `command.test.ts`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  PronounMemory,
  isDynamicPronounFragment,
  type GenderedSlot,
} from '../pronoun-memory';
import { Idea } from '../../../lib/stuff/Idea';
import { NamedMixin } from '../../../lib/description/Named';
import { makeStuff } from '../../../lib/security/__tests__/test-setup';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { MqlManyResult } from '../types';

class TestStuff extends NamedMixin(Idea) {}

function s(name: string): Stuff {
  const stuff = makeStuff(() => new TestStuff());
  (stuff as unknown as { setName: (n: string) => void }).setName(name);
  return stuff as unknown as Stuff;
}

function many(stuff: Stuff[]): MqlManyResult {
  return { stuff };
}

const routeAsIt = (_stuff: Stuff): GenderedSlot => 'it';

describe('PronounMemory', () => {
  let mem: PronounMemory;

  beforeEach(() => {
    mem = new PronounMemory();
  });

  it('reads return null on a fresh stash', () => {
    expect(mem.read('it')).toBeNull();
    expect(mem.read('him')).toBeNull();
    expect(mem.read('her')).toBeNull();
    expect(mem.read('them')).toBeNull();
    expect(mem.read('last')).toBeNull();
  });

  it('readFragment returns null on a fresh stash', () => {
    expect(mem.readFragment('it')).toBeNull();
    expect(mem.readFragment('last')).toBeNull();
  });

  it('routes a single stuff to the gendered slot via the supplied router', () => {
    const bob = s('bob');
    mem.update(many([bob]), 'bob', () => 'him');
    expect(mem.read('him')!.stuff).toEqual([bob]);
    expect(mem.readFragment('him')).toBe('bob');
  });

  it('always populates last alongside the gendered slot', () => {
    const rose = s('rose');
    mem.update(many([rose]), 'rose', routeAsIt);
    expect(mem.read('last')!.stuff).toEqual([rose]);
    expect(mem.readFragment('last')).toBe('rose');
  });

  it('multi-stuff results route to them and last only', () => {
    const a = s('a');
    const b = s('b');
    const c = s('c');
    mem.update(many([a, b, c]), 'flowers', routeAsIt);
    expect(mem.read('them')!.stuff).toEqual([a, b, c]);
    expect(mem.read('last')!.stuff).toEqual([a, b, c]);
    expect(mem.read('it')).toBeNull();
    expect(mem.read('him')).toBeNull();
    expect(mem.read('her')).toBeNull();
  });

  it('empty results are a no-op', () => {
    mem.update(many([s('rose')]), 'rose', routeAsIt);
    mem.update(many([]), 'nothing', routeAsIt);
    // The earlier rose entry survives.
    expect(mem.read('it')).not.toBeNull();
    expect(mem.read('last')!.stuff).toEqual([mem.read('it')!.stuff[0]]);
  });

  it('inputs that are themselves dynamic pronouns are a no-op', () => {
    const rose = s('rose');
    mem.update(many([rose]), 'rose', routeAsIt);
    // "look it" — input fragment is a pronoun. Stash should NOT
    // overwrite the original "rose" fragment.
    mem.update(many([rose]), 'it', routeAsIt);
    mem.update(many([rose]), 'It  ', routeAsIt); // case + whitespace
    mem.update(many([rose]), '$$', routeAsIt);
    expect(mem.readFragment('it')).toBe('rose');
    expect(mem.readFragment('last')).toBe('rose');
  });

  it('preserves via on read', () => {
    const rose = s('rose');
    const result: MqlManyResult = { stuff: [rose], via: { detailPath: ['petal'] } };
    mem.update(result, 'rose', routeAsIt);
    const stored = mem.read('it')!;
    expect(stored.via).toEqual({ detailPath: ['petal'] });
  });

  it('subsequent updates overwrite the same gendered slot', () => {
    const r1 = s('rose');
    const r2 = s('rose2');
    mem.update(many([r1]), 'rose', routeAsIt);
    mem.update(many([r2]), 'rose2', routeAsIt);
    expect(mem.read('it')!.stuff).toEqual([r2]);
    expect(mem.readFragment('it')).toBe('rose2');
  });

  it('different routers populate different slots without bleeding', () => {
    const bob = s('bob');
    const alice = s('alice');
    mem.update(many([bob]), 'bob', () => 'him');
    mem.update(many([alice]), 'alice', () => 'her');
    expect(mem.read('him')!.stuff).toEqual([bob]);
    expect(mem.read('her')!.stuff).toEqual([alice]);
  });

  it('clear empties every slot', () => {
    mem.update(many([s('rose')]), 'rose', routeAsIt);
    mem.update(many([s('bob')]), 'bob', () => 'him');
    mem.clear();
    expect(mem.read('it')).toBeNull();
    expect(mem.read('him')).toBeNull();
    expect(mem.read('last')).toBeNull();
  });
});

describe('isDynamicPronounFragment', () => {
  it('matches the bare pronouns case-insensitively', () => {
    for (const f of ['it', 'IT', 'It', '  it  ', 'him', 'her', 'them', '$$']) {
      expect(isDynamicPronounFragment(f)).toBe(true);
    }
  });

  it("doesn't match ordinary keywords", () => {
    for (const f of ['rose', 'bookcase', 'me', 'here', 'inventory']) {
      expect(isDynamicPronounFragment(f)).toBe(false);
    }
  });

  it("doesn't match a pronoun that's been chained or transformed", () => {
    expect(isDynamicPronounFragment('it:i')).toBe(false);
    expect(isDynamicPronounFragment('them - bob')).toBe(false);
  });
});
