/**
 * Naming overhaul B2 — the holders answer: contact lists, resident groups.
 * Each relation is per asker; a built-in can never be masked; a name two
 * of your sets share is a tie.
 */
import '../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resolve, resolveWithQuantity } from '../../../api/mql/resolver';
import { StuffApi } from '../../../api/stuff';
import { ContainmentApi } from '../../../api/containment';
import { makeStuffAtPath, makeStuff } from '../../security/__tests__/test-setup';
import { ContactsMixin } from '../../social/Contacts';

import { Group } from '../../social/Group';
import { GroupApi } from '../../../api/group';
import { ContainerMixin } from '../../spatial/Container';
import { ContainableMixin } from '../../spatial/Containable';
import { NamedMixin } from '../../description/Named';
import { PerceptibleMixin } from '../../description/Perceptible';
import { FocusedMixin } from '../../command/Focused';
import { CommandGiverMixin } from '../../command/CommandGiver';
import { Agent } from '../../stuff/Agent';
import { Idea } from '../../stuff/Idea';
import type { Stuff } from '../../stuff/Stuff';

class Person extends ContactsMixin(
  ContainerMixin(ContainableMixin(FocusedMixin(CommandGiverMixin(NamedMixin(PerceptibleMixin(Agent)))))),
) {}
class Room extends ContainerMixin(NamedMixin(PerceptibleMixin(Idea))) {}
class Thing extends ContainableMixin(NamedMixin(PerceptibleMixin(Idea))) {}

type P = Person & Stuff;
const ids = (ms: { stuff: Stuff }[]): string[] => ms.map((m) => m.stuff.stuffId);
const person = (id: string): P => makeStuffAtPath(() => new Person(), `/platform/agent/Avatar/${id}`) as unknown as P;

describe('holders answer relations (B2)', () => {
  let me: P;
  let iffy: P;

  beforeEach(() => {
    StuffApi.clearAll();
    me = person('me1');
    iffy = person('iffy1');
    const here = makeStuff(() => new Room());
    const there = makeStuff(() => new Room());
    ContainmentApi.move(me as never, here as never);
    ContainmentApi.move(iffy as never, there as never);
    me.addContact({ kind: 'avatar', playerId: 'iffy1', label: 'friends', source: 'self', addedAt: 0 });
    // The change subscription is the registry's (a database); stand it in.
    vi.spyOn(GroupApi, 'onMembershipChange').mockResolvedValue({ cancel: () => undefined });
  });
  afterEach(() => vi.restoreAllMocks());

  it('me:~friends binds a friend in another room, saying which list', () => {
    const out = resolve('~friends', { commandGiver: me, scope: '' });
    expect(ids(out)).toEqual([iffy.stuffId]);
    expect(out[0]!.via?.relation).toMatchObject({ holder: me, name: 'friends' });
  });

  it("another player's lists are not theirs to read", () => {
    expect(resolve('@me1:~friends', { commandGiver: iffy, scope: '' })).toEqual([]);
  });

  it('a list named for a built-in never masks it: ~inventory is still what is carried', () => {
    const apple = makeStuff(() => new Thing());
    ContainmentApi.move(apple as never, me as never);
    me.addContact({ kind: 'avatar', playerId: 'iffy1', label: 'inventory', source: 'self', addedAt: 0 });
    expect(ids(resolve('@me1:~inventory', { commandGiver: me, scope: '' }))).toEqual([apple.stuffId]);
  });

  it('me:~ lists your lists and your groups beside the built-ins', async () => {
    vi.spyOn(Group, 'find').mockResolvedValue([
      Object.assign(new Group(), { _id: 'g1', name: 'bookclub', memberIds: ['me1', 'iffy1'] }),
    ] as never);
    await me.refreshGroups();
    const names = (resolveWithQuantity('me:~', { commandGiver: me, scope: '' }).relations ?? []).map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['here', 'friends', 'bookclub']));
  });

  it('~bookclub binds a fellow member; leaving changes it on the next read', async () => {
    const find = vi.spyOn(Group, 'find').mockResolvedValue([
      Object.assign(new Group(), { _id: 'g1', name: 'bookclub', memberIds: ['me1', 'iffy1'] }),
    ] as never);
    await me.refreshGroups();
    expect(ids(resolve('~bookclub', { commandGiver: me, scope: '' }))).toEqual(expect.arrayContaining([iffy.stuffId]));
    find.mockResolvedValue([] as never);
    await me.refreshGroups();
    expect(resolve('~bookclub', { commandGiver: me, scope: '' })).toEqual([]);
  });

  it('~contacts is everyone you keep — your lists and your groups — never yourself', async () => {
    vi.spyOn(Group, 'find').mockResolvedValue([
      Object.assign(new Group(), { _id: 'g1', name: 'bookclub', memberIds: ['me1', 'iffy1'] }),
    ] as never);
    await me.refreshGroups();
    expect(ids(resolve('~contacts', { commandGiver: me, scope: '' }))).toEqual([iffy.stuffId]);
  });

  it('a list and a group of one name are a tie, each match saying its set', async () => {
    me.addContact({ kind: 'avatar', playerId: 'iffy1', label: 'bookclub', source: 'self', addedAt: 0 });
    vi.spyOn(Group, 'find').mockResolvedValue([
      Object.assign(new Group(), { _id: 'g1', name: 'bookclub', memberIds: ['me1', 'iffy1'] }),
    ] as never);
    await me.refreshGroups();
    const r = resolveWithQuantity('~bookclub', { commandGiver: me, scope: '' });
    expect(r.relationTie?.sets).toEqual(['your list "bookclub"', 'your group "bookclub"']);
  });
});
