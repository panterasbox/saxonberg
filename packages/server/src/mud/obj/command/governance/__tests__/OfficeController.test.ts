/**
 * OfficeController — the `office` verb wiring, driven as the dispatcher
 * would: a real controller Stuff whose `execute` calls the gated
 * `OfficeApi.assign`/`vacate` (the caller frame is the controller, so the
 * narrow-entry `FromModule(OfficeController)` gate passes), over a real
 * `OfficeRegistry` + in-memory store. Proves the MVC mapping (target →
 * playerId, office key resolution) and the assign/replace/vacate
 * behavior end-to-end. Authority (founder-only `assign`/`vacate`) is the
 * `requiresFoundingAuthority` subcommand validator's job, enforced in the
 * dispatcher before `execute` runs — covered in that validator's own test
 * + the subcommand-validator dispatch test, not here. The founder giver is
 * seeded via the credential path (a `User` + `TwitchProfile` matching the
 * env handle).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OfficeController from '../OfficeController';
import OfficeRegistry from '../../../OfficeRegistry';
import Avatar from '../../../Avatar';
import { OfficeApi } from '../../../../api/office';
import { StuffApi } from '../../../../api/stuff';
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import { CommandDefinition } from '../../../../lib/command/CommandDefinition';
import Location from '../../../../lib/stuff/Location';
import { Document } from '../../../../lib/persistence/Document';
import { ExecutionContextApi } from '../../../../api/execution-context';
import { PersistenceManager } from '../../../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../lib/security/__tests__/test-setup';

interface Doc extends Record<string, unknown> {
  _id?: string;
}

let store: Map<string, Doc[]>;
let idCounter = 0;

function col(collection: string): Doc[] {
  let arr = store.get(collection);
  if (!arr) {
    arr = [];
    store.set(collection, arr);
  }
  return arr;
}

function installStore(): void {
  store = new Map();
  idCounter = 0;
  const save = vi.fn(async (collection: string, doc: Doc) => {
    const arr = col(collection);
    if (doc._id) {
      const idx = arr.findIndex((d) => d._id === doc._id);
      if (idx >= 0) arr[idx] = { ...doc };
      else arr.push({ ...doc });
      return doc._id;
    }
    const id = String(++idCounter);
    arr.push({ ...doc, _id: id });
    return id;
  });
  const findById = vi.fn(
    async (collection: string, id: string) =>
      col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  const find = vi.fn(
    async (collection: string, query: Record<string, unknown>) => {
      const arr = col(collection);
      if (typeof query.officeKey === 'string') {
        return arr.filter((d) => d.officeKey === query.officeKey);
      }
      if (typeof query.playerIds === 'string') {
        return arr.filter(
          (d) =>
            Array.isArray(d.playerIds) &&
            (d.playerIds as string[]).includes(query.playerIds as string),
        );
      }
      const keys = Object.keys(query);
      if (keys.length === 0) return arr.slice();
      return arr.filter((d) => keys.every((k) => d[k] === query[k]));
    },
  );
  vi.spyOn(PersistenceManager, 'get').mockReturnValue({
    save,
    find,
    findById,
    delete: del,
    isConnected: () => true,
  } as unknown as PersistenceManager);
}

function makeAvatar(playerId: string): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/obj/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  return av;
}

let idCounter2 = 0;
function seedDoc(collection: string, doc: Doc): string {
  const id = doc._id ?? `seed-${++idCounter2}`;
  col(collection).push({ ...doc, _id: id });
  return id;
}

const FOUNDER_HANDLE = 'FounderHandle';
const FOUNDER_LOGIN = 'founderhandle';
const FOUNDER_PID = 'founder';

/** Seed the founder: a User owning FOUNDER_PID linked to a matching Twitch. */
function seedFounder(): void {
  const tid = seedDoc('twitch_profiles', {
    twitchUserId: 't-founder',
    login: FOUNDER_LOGIN,
    displayName: FOUNDER_HANDLE,
  });
  seedDoc('users', { playerIds: [FOUNDER_PID], twitchProfileId: tid });
}

function stubCommand(verb: string): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
    '<test>',
  );
}

function makeContext(giver: Avatar): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Location()) as never,
    commandText: 'office',
    executionId: 'test',
    commandId: 'test',
    verb: 'office',
    command: stubCommand('office'),
  });
}

async function run(
  giver: Avatar,
  model: CommandModel,
  ctx: CommandContext,
): Promise<void> {
  await withRootContext(null, 'office.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    return makeStuff(() => new OfficeController()).execute(
      model as never,
      ctx,
    );
  });
}

const TWITCH_ENV = 'FOUNDER_TWITCH_HANDLE';

describe('OfficeController', () => {
  let prevTwitch: string | undefined;

  beforeEach(async () => {
    prevTwitch = process.env[TWITCH_ENV];
    process.env[TWITCH_ENV] = FOUNDER_HANDLE;
    installStore();
    // TwitchProfile.find preloads its token marshallers — no-op resolver.
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    OfficeApi._resetRegistryRefForReload();
    StuffApi.clearAll();
    seedFounder();
    const reg = makeStuffAtPath(
      () => new OfficeRegistry(),
      '/obj/OfficeRegistry',
    );
    await reg.postRegister();
  });

  afterEach(() => {
    if (prevTwitch === undefined) delete process.env[TWITCH_ENV];
    else process.env[TWITCH_ENV] = prevTwitch;
    vi.restoreAllMocks();
    OfficeApi._resetRegistryRefForReload();
    StuffApi.clearAll();
  });

  /** The founder giver (matches the seeded credential). */
  function founderGiver(): Avatar {
    return makeAvatar(FOUNDER_PID);
  }

  it('assign seats a player as the explicit holder (target → playerId, office resolved)', async () => {
    const giver = founderGiver();
    const alice = makeAvatar('alice');
    const ctx = makeContext(giver);
    await run(
      giver,
      {
        subcommand: 'assign',
        target: { stuff: alice, raw: 'alice' } as MqlOneResult,
        office: 'prime-minister',
      } as CommandModel,
      ctx,
    );

    const held = await OfficeApi.holderOf('prime-minister');
    expect(held.kind).toBe('explicit');
    if (held.kind === 'explicit') expect(held.holderPlayerId).toBe('alice');
    expect(ctx.getNotes()).not.toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });

  it('a second assign replaces the prior holder', async () => {
    const giver = founderGiver();
    const alice = makeAvatar('alice');
    const bob = makeAvatar('bob');

    await run(
      giver,
      {
        subcommand: 'assign',
        target: { stuff: alice, raw: 'alice' } as MqlOneResult,
        office: 'prime-minister',
      } as CommandModel,
      makeContext(giver),
    );
    await run(
      giver,
      {
        subcommand: 'assign',
        target: { stuff: bob, raw: 'bob' } as MqlOneResult,
        office: 'prime-minister',
      } as CommandModel,
      makeContext(giver),
    );

    const held = await OfficeApi.holderOf('prime-minister');
    expect(held.kind).toBe('explicit');
    if (held.kind === 'explicit') expect(held.holderPlayerId).toBe('bob');
    expect(await OfficeApi.holdsOffice(alice, 'prime-minister')).toBe(false);
  });

  it('vacate reverts the seat to the founder default', async () => {
    const giver = founderGiver();
    const alice = makeAvatar('alice');
    await run(
      giver,
      {
        subcommand: 'assign',
        target: { stuff: alice, raw: 'alice' } as MqlOneResult,
        office: 'prime-minister',
      } as CommandModel,
      makeContext(giver),
    );

    const ctx = makeContext(giver);
    await run(
      giver,
      { subcommand: 'vacate', office: 'prime-minister' } as CommandModel,
      ctx,
    );

    const held = await OfficeApi.holderOf('prime-minister');
    expect(held.kind).toBe('founder');
    expect(ctx.getNotes()).not.toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });

  it('assign to an unknown office is rejected with the right reason', async () => {
    const giver = founderGiver();
    const alice = makeAvatar('alice');
    const ctx = makeContext(giver);
    await run(
      giver,
      {
        subcommand: 'assign',
        target: { stuff: alice, raw: 'alice' } as MqlOneResult,
        office: 'grand-vizier',
      } as CommandModel,
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'unknown-office',
      }),
    );
  });

  it('assign with no resolved target notes no-target', async () => {
    const giver = founderGiver();
    const ctx = makeContext(giver);
    await run(
      giver,
      { subcommand: 'assign', office: 'prime-minister' } as CommandModel,
      ctx,
    );
    expect(ctx.getNotes()).toContainEqual(
      expect.objectContaining({
        kind: 'controller-rejected',
        reason: 'no-target',
      }),
    );
  });

  it('bare office / list renders the roster without a rejection', async () => {
    const giver = founderGiver();
    const ctx = makeContext(giver);
    await run(giver, { subcommand: 'list' } as CommandModel, ctx);
    expect(ctx.getNotes()).not.toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });

  // Authority (founder-only assign/vacate) is enforced by the
  // `requiresFoundingAuthority` subcommand validator in the dispatcher,
  // BEFORE `execute` runs — not by the controller. It is covered by
  // `requiresFoundingAuthority.test.ts` and the subcommand-validator
  // dispatch test, not re-tested here (the `WizardController` precedent).

  it('a public list works for a non-founder', async () => {
    const nonFounder = makeAvatar('rando');
    const ctx = makeContext(nonFounder);
    await run(nonFounder, { subcommand: 'list' } as CommandModel, ctx);
    expect(ctx.getNotes()).not.toContainEqual(
      expect.objectContaining({ kind: 'controller-rejected' }),
    );
  });
});
