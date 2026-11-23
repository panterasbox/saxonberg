/**
 * Naming overhaul B1 — relations in the grammar: one root (`me`), the
 * built-in relations, the listing, player addresses and home paths.
 *
 *   `~here` is the place (one face); a bare `~x` is `me:~x`; `me:~` lists
 *   every built-in with its meaning; `@<id>` binds a loaded avatar and
 *   nothing for an unknown id; `~/x` and a bare `~` are home paths, valid
 *   only at the head; several holders union and dedupe; a `self` built-in
 *   asked of someone else answers empty.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach } from 'vitest';
import { resolve, resolveWithQuantity } from '../mql/resolver';
import { MqlApi } from '../mql';
import { makeWorld, type MqlWorld } from './fixtures/mql-world';
import type { MqlContext } from '../mql/types';
import type { Stuff } from '../../lib/stuff/Stuff';
import { ContainmentApi } from '../containment';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import { ContactsMixin } from '../../lib/social/Contacts';
import { Agent } from '../../lib/stuff/Agent';
import { ContainableMixin } from '../../lib/spatial/Containable';

const ids = (ms: { stuff: Stuff }[]): string[] => ms.map((m) => m.stuff.stuffId);

class Keeper extends ContactsMixin(ContainableMixin(Agent)) {}

describe('MQL relations (B1)', () => {
  let world: MqlWorld;
  let ctx: MqlContext;

  beforeEach(() => {
    world = makeWorld();
    ctx = { commandGiver: world.giver, scope: '~here' };
  });

  it('~here is the place — in a query, and as a bare relation of me', () => {
    expect(ids(resolve('~here', ctx))).toEqual([world.location.stuffId]);
    expect(ids(resolve('me:~here', ctx))).toEqual([world.location.stuffId]);
  });

  it('~here as a view scope is the place and nothing else', () => {
    const found = resolve('square', { commandGiver: world.giver, scope: '~here' });
    expect(ids(found)).toEqual([world.location.stuffId]);
    expect(resolve('rose', { commandGiver: world.giver, scope: '~here' })).toEqual([]);
  });

  it('~inventory is what you carry; every match says the relation it came by', () => {
    ContainmentApi.move(world.apple as never, world.giver as never);
    const out = resolve('~inventory', ctx);
    expect(ids(out)).toContain(world.apple.stuffId);
    expect(out[0]!.via?.relation).toMatchObject({ holder: world.giver, name: 'inventory' });
  });

  it('~it and ~last read the pronoun memory', () => {
    world.giver.getPronounMemory().update({ stuff: [world.rose] }, 'rose', () => 'it');
    expect(ids(resolve('~it', ctx))).toEqual([world.rose.stuffId]);
    expect(ids(resolve('~last', ctx))).toEqual([world.rose.stuffId]);
  });

  it('a self built-in asked of someone else is empty', () => {
    world.giver.getPronounMemory().update({ stuff: [world.rose] }, 'rose', () => 'it');
    expect(resolve('square:~it', ctx)).toEqual([]);
  });

  it('me:~ binds nothing and lists every built-in with its meaning', () => {
    const r = resolveWithQuantity('me:~', ctx);
    expect(r.matches).toEqual([]);
    const names = (r.relations ?? []).map((x) => x.name);
    for (const n of ['here', 'inventory', 'peers', 'reachable', 'person', 'horizon', 'contacts', 'it', 'last']) {
      expect(names).toContain(n);
    }
    expect((r.relations ?? []).every((x) => x.meaning.length > 0)).toBe(true);
    // MqlApi carries the fact onto the result.
    expect(MqlApi.resolveMany('me:~', ctx).relations?.length).toBe(r.relations?.length);
  });

  it('a thing that keeps nothing lists only the built-ins that apply to anyone', () => {
    const names = (resolveWithQuantity('square:~', ctx).relations ?? []).map((x) => x.name);
    expect(names).toContain('here');
    expect(names).not.toContain('peers');
  });

  it('@<id> binds a loaded avatar; an unknown id binds nothing', () => {
    const bob = makeStuffAtPath(() => new Keeper(), '/platform/agent/Avatar/abc123');
    expect(ids(resolve('@abc123', ctx))).toEqual([bob.stuffId]);
    expect(resolve('@nobody', ctx)).toEqual([]);
  });

  it('~contacts is every loaded person on any of your lists', () => {
    const me = makeStuffAtPath(() => new Keeper(), '/platform/agent/Avatar/me1');
    const iffy = makeStuffAtPath(() => new Keeper(), '/platform/agent/Avatar/iffy1');
    makeStuffAtPath(() => new Keeper(), '/platform/agent/Avatar/stranger');
    (me as unknown as { addContact(e: unknown): boolean }).addContact({ kind: 'avatar', playerId: 'iffy1', label: 'friends' });
    (me as unknown as { addContact(e: unknown): boolean }).addContact({ kind: 'avatar', playerId: 'gone', label: 'friends' });
    const out = resolve('~contacts', { commandGiver: me as never, scope: '' });
    expect(ids(out)).toEqual([iffy.stuffId]);
  });

  it('~/x and a bare ~ are home paths at the head; mid-query they are a parse error', () => {
    expect(() => resolve('~/workroom', ctx)).not.toThrow();
    expect(() => resolve('~', ctx)).not.toThrow();
    expect(() => resolve('square:~/x', ctx)).toThrow(/only valid at the start/);
  });

  it('several things on the left: each is asked, the union deduped', () => {
    world.giver.getPronounMemory().update({ stuff: [world.rose] }, 'rose', () => 'it');
    const out = resolve('(me, me):~it', ctx);
    expect(ids(out)).toEqual([world.rose.stuffId]);
  });
});
