/**
 * The appointment ceremony (pack-installer W1.9, slate A25), end to end
 * at the unit level: an office-owned `ops-committee` committee is
 * minted as a pack's `requires.groups` would mint it; the founder — the
 * default Prime Minister, no handoff row — drives `group add
 * ops-committee <member>` through GroupController and succeeds; the
 * member is now on the committee; a stranger is not; a simulated
 * `office assign prime-minister <other>` flips who can add, and the
 * Group document is never rewritten by the handoff.
 *
 * The PM handoff is simulated by stubbing `CompactApi.holdsOffice` per
 * the governance contract (no explicit row → the founder holds every
 * seat) because the live `office assign` online-resolve bug
 * (governance.md § Open) keeps the real leg out of reach of a drive.
 */

import '../../../../../../test-bootstrap';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import GroupController from '../GroupController';
import { GroupApi } from '../../../../../api/group';
import { CompactApi } from '../../../../../api/compact';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import { Group } from '../../../../../lib/social/Group';
import Avatar from '../../../../agent/Avatar';
import GroupRegistry from '../../../GroupRegistry';
import { makeStuff, makeStuffAtPath } from '../../../../../lib/security/__tests__/test-setup';
import type { CommandContext, CommandModel } from '../../../../../api/command';

type Doc = Record<string, unknown> & { _id?: string };
let store: Doc[];
let idCounter: number;

function stubPm(): void {
  store = [];
  idCounter = 0;
  const save = vi.fn(async (_c: string, doc: Doc) => {
    if (doc._id) {
      const i = store.findIndex((d) => d._id === doc._id);
      if (i >= 0) store[i] = { ...doc };
      else store.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    store.push({ ...doc, _id: id });
    return id;
  });
  const find = vi.fn(async (_c: string, query: Doc) =>
    store.filter((d) =>
      Object.entries(query).every(([k, v]) => {
        const dv = d[k];
        return Array.isArray(dv) ? dv.includes(v) : dv === v;
      }),
    ),
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById: async (_c: string, id: string) => store.find((d) => d._id === id) ?? null,
    delete: async (_c: string, id: string) => {
      const i = store.findIndex((d) => d._id === id);
      if (i >= 0) store.splice(i, 1);
    },
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

/** The governance contract: an explicit holder, else the founder. */
let pmHolder: string | null; // templatePath of the explicit PM, or null
const FOUNDER = '/platform/agent/Avatar/founder';
function stubOffices(): void {
  vi.spyOn(CompactApi, 'holdsOffice').mockImplementation(async (subject, key) => {
    const path = (subject as Avatar | null)?.getTemplatePath() ?? null;
    if (key !== 'prime-minister') return false;
    return pmHolder ? path === pmHolder : path === FOUNDER;
  });
}

function makeAvatar(id: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${id}`);
  av.setPlayerId(id);
  return av;
}

let notes: Array<Record<string, unknown>>;
function ctxFor(giver: Avatar): CommandContext {
  return {
    verb: 'group',
    commandGiver: giver as never,
    note: (n: Record<string, unknown>) => notes.push(n),
  } as unknown as CommandContext;
}

async function groupAdd(giver: Avatar, target: Avatar): Promise<boolean> {
  notes = [];
  const ctrl = makeStuff(() => new GroupController());
  await ctrl.execute(
    { subcommand: 'add', name: 'ops-committee', target: { stuff: target } } as unknown as CommandModel,
    ctxFor(giver),
  );
  return !notes.some((n) => n.kind === 'controller-rejected');
}

/** Membership of the office-owned committee — what appointment confers. */
async function passesGate(av: Avatar): Promise<boolean> {
  const row = await committeeRow();
  return (row.memberIds as string[] | undefined)?.includes(av.getTemplatePath() ?? '') ?? false;
}

async function committeeRow(): Promise<Doc> {
  return store.find((d) => d.name === 'ops-committee')!;
}

beforeEach(async () => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
  stubPm();
  stubOffices();
  pmHolder = null;
  vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = () => b;
    b.send = () => {};
    return b as never;
  });
  const reg = makeStuffAtPath(() => new GroupRegistry(), '/platform/idea/GroupRegistry');
  await reg.postRegister();
  // As a pack's requires.groups would mint it: office-owned, empty.
  const g = new Group();
  g.name = 'ops-committee';
  g.owner = Group.officeOwner('prime-minister');
  await g.save();
});
afterEach(() => {
  vi.restoreAllMocks();
  StuffApi.clearAll();
});

describe('the appointment ceremony', () => {
  it('founder-as-default-PM appoints; the member passes the gate; a stranger does not', async () => {
    const founder = makeAvatar('founder');
    const member = makeAvatar('member');
    const stranger = makeAvatar('stranger');

    expect(await passesGate(member)).toBe(false);
    expect(await groupAdd(founder, member)).toBe(true);
    expect(await passesGate(member)).toBe(true);
    expect(await passesGate(stranger)).toBe(false);
    expect(await passesGate(founder)).toBe(false); // owning ≠ membership
  });

  it('a non-holder cannot appoint', async () => {
    const stranger = makeAvatar('stranger');
    const member = makeAvatar('member');
    expect(await groupAdd(stranger, member)).toBe(false);
    expect(notes.some((n) => n.reason === 'not-permitted')).toBe(true);
    expect(await passesGate(member)).toBe(false);
  });

  it('a PM handoff transfers the power to appoint; the Group document is never rewritten', async () => {
    const founder = makeAvatar('founder');
    const alice = makeAvatar('alice');
    const m1 = makeAvatar('m1');
    const m2 = makeAvatar('m2');

    expect(await groupAdd(founder, m1)).toBe(true);
    const rowBefore = structuredClone(await committeeRow());

    pmHolder = alice.getTemplatePath(); // `office assign alice prime-minister`
    expect(await groupAdd(founder, m2)).toBe(false);
    expect((await committeeRow()).owner).toEqual({ kind: 'office', office: 'prime-minister' });
    expect(await committeeRow()).toEqual(rowBefore); // the handoff wrote nothing here

    expect(await groupAdd(alice, m2)).toBe(true);
    expect(await passesGate(m2)).toBe(true);
    expect((await committeeRow()).owner).toEqual({ kind: 'office', office: 'prime-minister' }); // still the OFFICE
  });

  it('`group show` names the office and who holds it', async () => {
    vi.spyOn(CompactApi, 'officeHolderOf').mockResolvedValue({
      kind: 'founder',
      officeKey: 'prime-minister',
      founderLabel: 'the founder',
    });
    let shown = '';
    vi.spyOn(MessageApi, 'scene').mockImplementation(() => {
      const b: Record<string, unknown> = {};
      b.topic = () => b;
      b.toSelf = (m: unknown) => {
        shown += String((m as { toString(): string }).toString());
        return b;
      };
      b.send = () => {};
      return b as never;
    });
    const anyone = makeAvatar('anyone');
    const ctrl = makeStuff(() => new GroupController());
    await ctrl.execute(
      { subcommand: 'show', name: 'ops-committee' } as unknown as CommandModel,
      ctxFor(anyone),
    );
    expect(shown).toContain('the office of prime-minister (held by the founder)');
  });
});
