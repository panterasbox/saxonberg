/**
 * Office-owned groups (pack-installer W1.8, slate A25): `GroupApi.ownsGroup`
 * resolves a plain owner by templatePath and an `office:<key>` owner
 * through `CompactApi.holdsOffice` — founder default included — so a
 * seat handoff transfers ownership with the Group document UNCHANGED.
 */

import '../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GroupApi } from '../../api/group';
import { CompactApi } from '../../api/compact';
import { StuffApi } from '../../api/stuff';
import { Group, type GroupOwner } from '../../lib/social/Group';
import { Idea } from '../../lib/stuff/Idea';
import { makeStuffAtPath } from '../../lib/security/__tests__/test-setup';
import GroupRegistry from '../GroupRegistry';

const FOUNDER = '/obj/Avatar/founder';
const ALICE = '/obj/Avatar/alice';

function actor(path: string): Idea {
  return makeStuffAtPath(() => new Idea(), path);
}

function group(owner: GroupOwner): Group {
  const g = new Group();
  g.name = 'g';
  g.owner = owner;
  return g;
}

/**
 * The governance contract, as a stub: no explicit holder row → the
 * founder holds every seat; an explicit row names one holder.
 */
function stubOffices(explicit: Record<string, string>): void {
  vi.spyOn(CompactApi, 'holdsOffice').mockImplementation(async (subject, key) => {
    const path = (subject as Idea | null)?.getTemplatePath() ?? null;
    const holder = explicit[key];
    if (holder) return path === holder;
    return path === FOUNDER; // founder default
  });
}

beforeEach(async () => {
  StuffApi.clearAll();
  // The pinned registry singleton (the state home), booted the way the
  // residence tests boot it — no DB clone.
  const reg = makeStuffAtPath(() => new GroupRegistry(), '/obj/GroupRegistry');
  await reg.postRegister();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('GroupApi.ownsGroup', () => {
  it('plain owner: matches the actor templatePath, and nothing else', async () => {
    const g = group(Group.playerOwner(ALICE));
    expect(await GroupApi.ownsGroup(actor(ALICE), g)).toBe(true);
    expect(await GroupApi.ownsGroup(actor(FOUNDER), g)).toBe(false);
  });

  it('`system` owner is owned by nobody', async () => {
    expect(await GroupApi.ownsGroup(actor(ALICE), group(Group.systemOwner()))).toBe(false);
  });

  it('office owner: true for the seat-holder, false otherwise (via holdsOffice)', async () => {
    stubOffices({ 'prime-minister': ALICE });
    const g = group(Group.officeOwner('prime-minister'));
    expect(await GroupApi.ownsGroup(actor(ALICE), g)).toBe(true);
    expect(await GroupApi.ownsGroup(actor(FOUNDER), g)).toBe(false);
    expect(CompactApi.holdsOffice).toHaveBeenCalledWith(expect.anything(), 'prime-minister');
  });

  it('office owner, no handoff row: the founder holds it by default', async () => {
    stubOffices({});
    const g = group(Group.officeOwner('prime-minister'));
    expect(await GroupApi.ownsGroup(actor(FOUNDER), g)).toBe(true);
    expect(await GroupApi.ownsGroup(actor(ALICE), g)).toBe(false);
  });

  it('a handoff transfers ownership with the Group document unchanged', async () => {
    const g = group(Group.officeOwner('prime-minister'));
    const before = { owner: structuredClone(g.owner), memberIds: [...g.memberIds], memberRoles: [...g.memberRoles] };

    stubOffices({});
    expect(await GroupApi.ownsGroup(actor(FOUNDER), g)).toBe(true);
    expect(await GroupApi.ownsGroup(actor(ALICE), g)).toBe(false);

    vi.restoreAllMocks();
    stubOffices({ 'prime-minister': ALICE }); // `office assign alice prime-minister`
    expect(await GroupApi.ownsGroup(actor(FOUNDER), g)).toBe(false);
    expect(await GroupApi.ownsGroup(actor(ALICE), g)).toBe(true);

    expect({ owner: g.owner, memberIds: g.memberIds, memberRoles: g.memberRoles }).toEqual(before);
  });

  it('an office owner with an empty key fails closed', async () => {
    stubOffices({});
    expect(await GroupApi.ownsGroup(actor(FOUNDER), group(Group.officeOwner('')))).toBe(false);
  });

});

describe('Group.ownerFromStored', () => {
  it('passes a typed owner through and refuses anything else', () => {
    const typed = { kind: 'office', office: 'prime-minister' } as const;
    expect(Group.ownerFromStored(typed)).toBe(typed);
    for (const raw of ['system', '', undefined, '/obj/Avatar/x', 'office:prime-minister']) {
      expect(() => Group.ownerFromStored(raw)).toThrow(/not a GroupOwner/);
    }
  });
});
