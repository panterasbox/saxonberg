/**
 * Compact{,Character}Controller — the `compact` verb (front-page-sources
 * W0, D1–D6), driven as the dispatcher would: a real controller Stuff
 * calling the gated `CompactApi.designateCompactCharacter`, over a real
 * `OfficeRegistry` and an in-memory store. Covers the default, choosing by
 * id and by name, every refusal by its reason, the lock (a handed-off
 * seat; a held conviction position, and its release when dropped), the
 * payload the character-select screen reads, and the same verb from a
 * pre-world `Login` and from a body.
 */

import "../../../../../../test-bootstrap";
import { withSaveMany } from '../../../../../lib/persistence/__tests__/pm-fake';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import CompactController from '../CompactController';
import CompactCharacterController from '../CompactCharacterController';
import OfficeRegistry from '../../../OfficeRegistry';
import Login from '../../../Login';
import Interactive from '../../../Interactive';
import Avatar from '../../../../agent/PrimaryAvatar';
import { CompactApi } from '../../../../../api/compact';
import { ConvictionApi } from '../../../../../api/conviction';
import { PlayerApi } from '../../../../../api/player';
import { MessageApi } from '../../../../../api/message';
import { StuffApi } from '../../../../../api/stuff';
import { CommandApi, type CommandContext, type CommandModel } from '../../../../../api/command';
import { CommandDefinition } from '../../../../../lib/command/CommandDefinition';
import Place from '../../../../../lib/stuff/Place';
import { User } from '../../../../../lib/identity/User';
import { OfficeHolder } from '../../../../../lib/governance/OfficeHolder';
import type { Stuff } from '../../../../../lib/stuff/Stuff';
import { ExecutionContextApi } from '../../../../../api/execution-context';
import { PersistenceManager } from '../../../../../../backend/PersistenceManager';
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from '../../../../../lib/security/__tests__/test-setup';
import { TestHarnessApi } from '../../../../../api/test-harness';

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
    async (collection: string, id: string) => col(collection).find((d) => d._id === id) ?? null,
  );
  const del = vi.fn(async (collection: string, id: string) => {
    const arr = col(collection);
    const idx = arr.findIndex((d) => d._id === id);
    if (idx >= 0) arr.splice(idx, 1);
  });
  const find = vi.fn(async (collection: string, query: Record<string, unknown>) => {
    const arr = col(collection);
    if (typeof query.playerIds === 'string') {
      return arr.filter(
        (d) => Array.isArray(d.playerIds) && (d.playerIds as string[]).includes(query.playerIds as string),
      );
    }
    const keys = Object.keys(query);
    if (keys.length === 0) return arr.slice();
    return arr.filter((d) => keys.every((k) => d[k] === query[k]));
  });
  vi.spyOn(PersistenceManager, 'get').mockReturnValue(
    withSaveMany({ save, find, findById, delete: del, isConnected: () => true }) as unknown as PersistenceManager,
  );
}

const NAMES: Record<string, string> = { p1: 'Odile Marsh', p2: 'Tamsin Reed', p3: 'Other Person' };

/** A saved account owning `playerIds`. */
async function account(playerIds: string[]): Promise<User> {
  const user = Object.assign(new User(), { playerIds: [...playerIds] });
  await user.save();
  return user;
}

function body(playerId: string, user: User): Avatar {
  const av = makeStuffAtPath(() => new Avatar(), `/platform/agent/Avatar/${playerId}`);
  av.setPlayerId(playerId);
  av.setUser(user);
  return av;
}

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml('verbs: [compact]\ncontroller: NoopController\ndescription: stub\n', '<test>');
}

function makeContext(giver: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: makeStuff(() => new Place()) as never,
    commandText: 'compact',
    executionId: 'test',
    commandId: 'test',
    verb: 'compact',
    command: stubCommand(),
  });
}

async function run(giver: Stuff, model: CommandModel): Promise<CommandContext> {
  const ctx = makeContext(giver);
  await withRootContext(null, 'compact.test', () => {
    ExecutionContextApi.tagActingAuthor(giver);
    const Ctrl = model.subcommand === 'character' ? CompactCharacterController : CompactController;
    return TestHarnessApi.actAs(giver, () => makeStuff(() => new Ctrl()).execute(model as never, ctx));
  });
  return ctx;
}

function refusedWith(ctx: CommandContext): string | undefined {
  const note = ctx.getNotes().find((n) => n.kind === 'refused') as { reason?: string } | undefined;
  return note?.reason;
}

/** Every payload the controller sent to the giver. */
function payloadsSent(): unknown[] {
  return payloadSpy.mock.calls.map(([p]) => p);
}

let payloadSpy: ReturnType<typeof vi.fn>;

describe('compact (the Compact character)', () => {
  beforeEach(async () => {
    installStore();
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
    vi.spyOn(PlayerApi, 'storedNameOf').mockImplementation(async (id: string) => NAMES[id] ?? null);
    // The scene builder is the wire; capture what the controller hands it.
    const realScene = MessageApi.scene.bind(MessageApi);
    payloadSpy = vi.fn();
    vi.spyOn(MessageApi, 'scene').mockImplementation((who) => {
      const scene = realScene(who);
      const realPayload = scene.payload.bind(scene);
      scene.payload = (p: Record<string, unknown>) => {
        payloadSpy(p);
        return realPayload(p);
      };
      return scene;
    });
    const reg = makeStuffAtPath(() => new OfficeRegistry(), '/platform/idea/OfficeRegistry');
    await reg.onCreate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    CompactApi._resetOfficeRegistryRefForReload();
    StuffApi.clearAll();
  });

  it('defaults to the first character, from a body and from a Login', async () => {
    const user = await account(['p1', 'p2']);
    const second = body('p2', user);
    expect(await CompactApi.compactCharacterOf(second)).toEqual({ playerId: 'p1', name: 'Odile Marsh' });
    expect(await CompactApi.isCompactCharacter(second)).toBe(false);

    const interactive = makeStuff(() => new Interactive('sock-1', 'sess-1', user));
    const login = makeStuff(() => new Login(interactive));
    const ctx = await run(login, {} as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
    expect(payloadsSent()).toContainEqual({ compactPlayerId: 'p1' });
  });

  it('designates by name (any case) and by id, and the payload carries the id', async () => {
    const user = await account(['p1', 'p2']);
    const first = body('p1', user);
    let ctx = await run(first, { subcommand: 'character', character: 'tamsin reed' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
    expect(user.compactCharacterId()).toBe('p2');
    expect(payloadsSent()).toContainEqual({ compactPlayerId: 'p2' });
    // Saved to the account's own row.
    const [row] = await User.find<User>({ playerIds: 'p1' });
    expect(row?.compactCharacterId()).toBe('p2');

    ctx = await run(first, { subcommand: 'character', character: 'p1' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
    expect(user.compactCharacterId()).toBe('p1');
  });

  it('works from a Login at character select', async () => {
    const user = await account(['p1', 'p2']);
    const interactive = makeStuff(() => new Interactive('sock-1', 'sess-1', user));
    const login = makeStuff(() => new Login(interactive));
    const ctx = await run(login, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
    expect(user.compactCharacterId()).toBe('p2');
  });

  it('keeps every live body of the account in agreement (D6)', async () => {
    const user = await account(['p1', 'p2']);
    const first = body('p1', user);
    // A second session's own copy of the same account row.
    const copy = Object.assign(new User(), { _id: user._id, playerIds: ['p1', 'p2'] });
    const second = body('p2', copy);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((id: string) =>
      id === 'p1' ? first : id === 'p2' ? second : undefined,
    );
    await run(first, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(copy.compactCharacterId()).toBe('p2');
    expect(await CompactApi.isCompactCharacter(second)).toBe(true);
  });

  it('refuses a character that is not on the account', async () => {
    const user = await account(['p1']);
    await account(['p3']);
    const ctx = await run(body('p1', user), { subcommand: 'character', character: 'Other Person' } as CommandModel);
    // Named by the one rule: another account's character is no entry.
    expect(refusedWith(ctx)).toBe('no-such-name');
    expect(user.compactCharacterId()).toBe('p1');
  });

  it('the narrow entry refuses a character not on the account, whatever bound it', async () => {
    const user = await account(['p1']);
    vi.spyOn(CompactApi, 'ownCharacterNamed').mockResolvedValue({ kind: 'one', one: 'p3' });
    const ctx = await run(body('p1', user), { subcommand: 'character', character: 'p3' } as CommandModel);
    expect(refusedWith(ctx)).toBe('compact-not-yours');
    expect(user.compactCharacterId()).toBe('p1');
  });

  it('refuses no change', async () => {
    const user = await account(['p1', 'p2']);
    const ctx = await run(body('p1', user), { subcommand: 'character', character: 'Odile Marsh' } as CommandModel);
    expect(refusedWith(ctx)).toBe('compact-unchanged');
  });

  it('refuses a session with no account', async () => {
    const guest = Object.assign(new User(), { anonymous: true, playerIds: [] });
    const interactive = makeStuff(() => new Interactive('sock-1', 'sess-1', guest));
    const login = makeStuff(() => new Login(interactive));
    expect(refusedWith(await run(login, {} as CommandModel))).toBe('compact-no-account');
    expect(
      refusedWith(await run(login, { subcommand: 'character', character: 'x' } as CommandModel)),
    ).toBe('compact-no-account');
  });

  it('is locked while the Compact character holds a handed-off seat', async () => {
    const user = await account(['p1', 'p2']);
    await CompactApi.assignOfficeForTest('p1', 'prime-minister');
    const first = body('p1', user);
    let ctx = await run(first, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBe('compact-seated');
    expect(user.compactCharacterId()).toBe('p1');

    await CompactApi.vacateOfficeForTest('prime-minister');
    ctx = await run(first, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
    expect(user.compactCharacterId()).toBe('p2');
  });

  it('is locked while the Compact character has a vote open, and unlocked when it is dropped', async () => {
    const user = await account(['p1', 'p2']);
    const first = body('p1', user);
    await ConvictionApi.hold('/platform/agent/Avatar/p1', 'consumer', 'bill-1', { yea: 1, nay: 0 });
    expect(await ConvictionApi.positionsOf('/platform/agent/Avatar/p1')).toHaveLength(1);
    let ctx = await run(first, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBe('compact-vote-open');

    await ConvictionApi.drop('/platform/agent/Avatar/p1', 'consumer', 'bill-1');
    ctx = await run(first, { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
  });

  it('the lock is the CURRENT Compact character’s: another character’s seat does not lock it', async () => {
    const user = await account(['p1', 'p2']);
    // A seat held by the account's OTHER character (a row from before the
    // hand-off refusal could seat it) — written directly.
    const row = new OfficeHolder();
    row.officeKey = 'prime-minister';
    row.holderId = 'p2';
    await row.save();
    const ctx = await run(body('p1', user), { subcommand: 'character', character: 'p2' } as CommandModel);
    expect(refusedWith(ctx)).toBeUndefined();
  });
});

describe('the compact view', () => {
  it('is afforded to a body and to a Login, and the view loads with its required argument', async () => {
    const verbsOf = (ctor: unknown): string[] =>
      CommandApi.collectContributions(ctor, 'self').flatMap((d) => d.verbs);
    expect(verbsOf(Avatar)).toContain('compact');
    expect(verbsOf(Login)).toContain('compact');
    CommandApi.clearCache();
    const loaded = await CommandApi.preloadAll();
    expect(loaded.failed).toEqual([]);
    const view = CommandApi.getCommand('platform/cmd/governance/compact.yaml');
    expect(view).toBeTruthy();
    const character = view?.getSubcommand('character');
    expect(character).toBeTruthy();
    expect(JSON.stringify(character)).toContain('"required":true');
  });
});
