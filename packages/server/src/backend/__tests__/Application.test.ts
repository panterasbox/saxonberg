/**
 * Application tests — singleton message-routing hub.
 *
 * Application's dependency story is friendly enough to test without a
 * live database or socket:
 *
 *   - `Backend` is an IBackend interface — replace with a fake.
 *   - `ConnectionManager` is a singleton with stubbable methods.
 *   - `PersistenceManager` is a singleton with stubbable CRUD.
 *   - `User.findById` / `User.find` route through PM; stub the PM.
 *   - The inbound command handler gates on capability + template-path
 *     prefix (`isCommandGiver` / `isAvatarStuff`), not `instanceof`;
 *     fake holders thread `Avatar.prototype` and stub `getTemplatePath`
 *     so both checks pass without standing up a real Avatar.
 *
 * No new test packages.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import { PersistenceManager, Collections } from '../PersistenceManager';
import Avatar from '../../mud/obj/Avatar';
import { Template } from '../../mud/lib/stuff/Template';
import { TemplateApi } from '../../mud/api/template';
import { User } from '../../mud/lib/identity/User';
import { StuffApi } from '../../mud/api/stuff';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/obj/Interactive';
import type { Container } from '../../mud/lib/spatial/Container';
import type { Stuff } from '../../mud/lib/stuff/Stuff';
import type {
  MessageFrame,
  PassportGoogleProfile,
} from '@saxonberg/types';

interface FakeBackend extends IBackend {
  sent: Array<{ socketId: string; message: unknown }>;
  envelopes: Array<{ socketId: string; envelope: unknown }>;
}

function makeFakeBackend(): FakeBackend {
  const sent: FakeBackend['sent'] = [];
  const envelopes: FakeBackend['envelopes'] = [];
  return {
    sent,
    envelopes,
    sendMessageToSocket(socketId, message) {
      sent.push({ socketId, message });
    },
    sendEnvelopeToSocket(socketId, envelope) {
      envelopes.push({ socketId, envelope });
    },
    async handleAuthenticationSuccess() {
      // unused in Application tests
    },
  };
}

function makeFakeInteractive(
  socketId: string,
  holder: unknown = null,
): Interactive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => holder,
    nextFrameId: () => ++counter,
  } as unknown as Interactive;
}

/**
 * Build a holder that satisfies the inbound command handler's two
 * capability checks without standing up the full Avatar machinery:
 *
 *   - `MixinApi.isCommandGiver(holder)` — threaded by
 *     `Object.create(Avatar.prototype)`, whose prototype chain carries
 *     the real `CommandGiver` mixin marker, so `hasMixin`'s walk finds it.
 *   - `PlayerApi.isAvatarStuff(holder)` — reads the template-path prefix
 *     (`/obj/Avatar/`), so we stub `getTemplatePath` to an Avatar path.
 *
 * We then patch on the two methods Application actually calls.
 */
function makeFakeAvatar(opts: {
  container?: (Stuff & Container) | null;
  executeCommand?: (
    text: string,
    ctx: { interactive: Interactive },
  ) => Promise<unknown>;
}): Avatar {
  const avatar = Object.create(Avatar.prototype) as unknown as {
    getTemplatePath: () => string;
    getContainer: () => (Stuff & Container) | null;
    executeCommand: (
      text: string,
      ctx: { interactive: Interactive },
    ) => Promise<unknown>;
  };
  avatar.getTemplatePath = () => `${Avatar.TEMPLATE_PATH_PREFIX}test`;
  avatar.getContainer = () =>
    opts.container === undefined ? ({} as Stuff & Container) : opts.container;
  avatar.executeCommand = opts.executeCommand ?? (async () => undefined);
  return avatar as unknown as Avatar;
}

describe('Application', () => {
  let app: Application;
  let backend: FakeBackend;
  let cm: ConnectionManager;

  beforeEach(() => {
    vi.restoreAllMocks();
    app = Application.get();
    backend = makeFakeBackend();
    app.initialize(backend);

    cm = ConnectionManager.get();
    vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
    cm.clearAll();
    vi.restoreAllMocks();
    // Re-install the destruct stub after the restore: clearAll has run.
    vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.spyOn(StuffApi, 'destruct').mockImplementation(() => {});
    cm.clearAll();
    vi.restoreAllMocks();
  });

  describe('sendMessageToInteractive', () => {
    const makeFrame = (topic: string, body: string): MessageFrame => ({
      id: 'test-frame-id',
      topic,
      body,
      meta: { timestamp: 0 },
    });

    it('forwards the frame to the interactive\'s socket via Backend with frameId stamped', () => {
      const ix = makeFakeInteractive('sock-1');
      app.sendMessageToInteractive(ix, makeFrame('test', 'hello'));
      expect(backend.sent).toHaveLength(1);
      const stamped = backend.sent[0]!.message as MessageFrame;
      expect(backend.sent[0]!.socketId).toBe('sock-1');
      expect(stamped.topic).toBe('test');
      expect(stamped.body).toBe('hello');
      expect(stamped.meta.frameId).toBe(1);
    });

    it('is a no-op when the interactive\'s socketId is empty', () => {
      const ix = makeFakeInteractive('');
      app.sendMessageToInteractive(ix, makeFrame('test', 'hello'));
      expect(backend.sent).toEqual([]);
    });

    it('is a no-op when backend is not initialized', () => {
      app.initialize(null as unknown as IBackend);
      const ix = makeFakeInteractive('sock-1');
      app.sendMessageToInteractive(ix, makeFrame('test', 'hello'));
      // No backend to send to — no throw, no observable effect.
      expect(backend.sent).toEqual([]);
    });
  });

  describe('processUserMessage — routing', () => {
    let ix: Interactive;

    beforeEach(() => {
      ix = makeFakeInteractive('sock-1');
      vi.spyOn(cm, 'getInteractive').mockReturnValue(ix);
    });

    it('returns early when no Interactive for the socket', () => {
      vi.spyOn(cm, 'getInteractive').mockReturnValue(undefined);
      app.processUserMessage('sock-orphan', { type: 'echo' });
      expect(backend.sent).toEqual([]);
    });

    it('echo type → unknown-type error (handler dropped during inbound/ refactor)', () => {
      app.processUserMessage('sock-1', { type: 'echo', payload: { x: 1 } });
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { message: string };
      };
      expect(msg.type).toBe('error');
      expect(msg.payload.message).toContain('echo');
    });

    it('ping type → responds with pong and a timestamp', () => {
      const before = Date.now();
      app.processUserMessage('sock-1', { type: 'ping' });
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { timestamp: number };
      };
      expect(msg.type).toBe('pong');
      expect(typeof msg.payload.timestamp).toBe('number');
      expect(msg.payload.timestamp).toBeGreaterThanOrEqual(before);
    });

    it('unknown type → responds with an error naming the type', () => {
      app.processUserMessage('sock-1', { type: 'mystery' });
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { message: string };
      };
      expect(msg.type).toBe('error');
      expect(msg.payload.message).toMatch(/mystery/);
    });

    it('command type → routes to handleCommandMessage', async () => {
      const avatar = makeFakeAvatar({
        executeCommand: vi.fn().mockResolvedValue({}),
      });
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', avatar),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: 'look' },
      });
      // The handler is async-fire-and-forget; await a microtask cycle.
      await new Promise((r) => setTimeout(r, 0));
      expect(avatar.executeCommand).toHaveBeenCalledWith('look', {
        interactive: expect.anything(),
      });
    });
  });

  describe('command-message guards', () => {
    it('sends "No active character" when the holder is not an Avatar', () => {
      const holder = { not: 'an avatar' };
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', holder),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: 'look' },
      });
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { message: string };
      };
      expect(msg.type).toBe('error');
      expect(msg.payload.message).toBe('No active character');
    });

    it('sends "No active character" when the interactive has no holder', () => {
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', null),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: 'look' },
      });
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as { payload: { message: string } };
      expect(msg.payload.message).toBe('No active character');
    });

    it('is silent on empty command text', async () => {
      const exec = vi.fn().mockResolvedValue({});
      const avatar = makeFakeAvatar({ executeCommand: exec });
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', avatar),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: '   ' },
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(exec).not.toHaveBeenCalled();
      expect(backend.sent).toEqual([]);
    });

    it('sends "Avatar has no location" when the avatar has no container', async () => {
      const avatar = makeFakeAvatar({ container: null });
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', avatar),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: 'look' },
      });
      await new Promise((r) => setTimeout(r, 0));
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as { payload: { message: string } };
      expect(msg.payload.message).toBe('Avatar has no location');
    });

    it('surfaces a rejected executeCommand as a "Command execution failed" error', async () => {
      const avatar = makeFakeAvatar({
        executeCommand: vi.fn().mockRejectedValue(new Error('boom')),
      });
      vi.spyOn(cm, 'getInteractive').mockReturnValue(
        makeFakeInteractive('sock-1', avatar),
      );
      app.processUserMessage('sock-1', {
        type: 'command',
        payload: { text: 'look' },
      });
      // Allow the promise chain (.catch handler in Application) to run.
      await new Promise((r) => setTimeout(r, 0));
      await new Promise((r) => setTimeout(r, 0));
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { message: string };
      };
      expect(msg.type).toBe('error');
      expect(msg.payload.message).toBe('Command execution failed');
    });
  });

  describe('handleUserDisconnect', () => {
    it('routes through ConnectionManager.removeInteractive', () => {
      const spy = vi.spyOn(cm, 'removeInteractive').mockReturnValue(true);
      app.handleUserDisconnect('sock-1');
      expect(spy).toHaveBeenCalledWith('sock-1');
    });

    it('is silent when no Interactive exists for the socket', () => {
      vi.spyOn(cm, 'removeInteractive').mockReturnValue(false);
      // No throw, no send — just a log line (warn).
      expect(() => app.handleUserDisconnect('nope')).not.toThrow();
      expect(backend.sent).toEqual([]);
    });
  });

  describe('handleUserConnect — error paths', () => {
    it('returns early when backend is not initialized', async () => {
      app.initialize(null as unknown as IBackend);
      const findById = vi.spyOn(User, 'findById').mockResolvedValue(null);
      await app.handleUserConnect('u1', 'sess', 'sock-1');
      // Bails before reaching User.findById.
      expect(findById).not.toHaveBeenCalled();
    });

    it('sends an error to the socket when the user is not found', async () => {
      vi.spyOn(User, 'findById').mockResolvedValue(null);
      await app.handleUserConnect('u-missing', 'sess', 'sock-1');
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        type: string;
        payload: { message: string; error: string };
      };
      expect(msg.type).toBe('error');
      expect(msg.payload.message).toBe('Failed to connect user');
      expect(msg.payload.error).toMatch(/u-missing/);
    });

    it('sends an error to the socket when downstream throws', async () => {
      vi.spyOn(User, 'findById').mockRejectedValue(new Error('db down'));
      await app.handleUserConnect('u1', 'sess', 'sock-1');
      expect(backend.sent).toHaveLength(1);
      const msg = backend.sent[0]!.message as {
        payload: { error: string };
      };
      expect(msg.payload.error).toBe('db down');
    });
  });

  describe('findOrCreateUserFromGoogle', () => {
    function pmStubs(): {
      finds: Array<{ collection: string; query: unknown }>;
      saves: Array<{ collection: string; doc: unknown }>;
      setFindForCollection(collection: string, docs: unknown[]): void;
    } {
      const pm = PersistenceManager.get();
      const finds: Array<{ collection: string; query: unknown }> = [];
      const saves: Array<{ collection: string; doc: unknown }> = [];
      const collectionResults = new Map<string, unknown[]>();
      vi.spyOn(pm, 'find').mockImplementation(async (collection, query) => {
        finds.push({ collection, query });
        return (collectionResults.get(collection) ??
          []) as Record<string, unknown>[];
      });
      vi.spyOn(pm, 'save').mockImplementation(async (collection, doc) => {
        saves.push({ collection, doc });
        return `inserted-${collection}`;
      });
      return {
        finds,
        saves,
        setFindForCollection: (c, d) => {
          collectionResults.set(c, d);
        },
      };
    }

    function fakeProfile(): PassportGoogleProfile {
      return {
        id: 'g-1',
        displayName: 'Alice Smith',
        name: { givenName: 'Alice', familyName: 'Smith' },
        emails: [{ value: 'alice@example.com', verified: true }],
        photos: [{ value: 'http://example.com/photo.jpg' }],
        _json: { id: 'g-1', extra: 'raw' },
        provider: 'google',
      } as unknown as PassportGoogleProfile;
    }

    it('inserts a new GoogleProfile when none exists', async () => {
      const pm = pmStubs();
      pm.setFindForCollection(Collections.GoogleProfiles, []);
      pm.setFindForCollection('users', []); // for the User.find call
      vi.spyOn(StuffApi, 'create').mockResolvedValue({
        _id: 'user-id',
        googleProfileId: '',
        playerIds: [],
        save: vi.fn().mockImplementation(async function (this: {
          _id: string;
        }) {
          this._id = 'user-id';
        }),
      } as never);
      vi.spyOn(Template, 'findByPath').mockResolvedValue({
        path: Avatar.SEED_TEMPLATE_PATH,
        class: '/obj/Avatar',
        data: { species: 'human' },
        hydratorClass: '/lib/persistence/PersistentHydrator',
      } as never);
      vi.spyOn(TemplateApi, 'saveTemplate').mockResolvedValue(undefined as never);

      await app.findOrCreateUserFromGoogle(fakeProfile());

      const profileSaves = pm.saves.filter(
        (s) => s.collection === Collections.GoogleProfiles,
      );
      expect(profileSaves).toHaveLength(1);
      const doc = profileSaves[0]!.doc as Record<string, unknown>;
      expect(doc.googleId).toBe('g-1');
      expect(doc.email).toBe('alice@example.com');
      expect(doc.displayName).toBe('Alice Smith');
      expect(doc.givenName).toBe('Alice');
      expect(doc.createdAt).toBeInstanceOf(Date);
    });

    it('updates an existing GoogleProfile and reuses its _id', async () => {
      const pm = pmStubs();
      pm.setFindForCollection(Collections.GoogleProfiles, [
        {
          _id: 'gp-existing',
          googleId: 'g-1',
          createdAt: new Date('2024-01-01'),
        },
      ]);
      pm.setFindForCollection('users', [
        { _id: 'user-existing', googleProfileId: 'gp-existing' },
      ]);
      // User.find returning an existing record short-circuits user
      // creation — the avatar-template path doesn't fire.
      vi.spyOn(User, 'find').mockResolvedValue([
        { _id: 'user-existing' } as never,
      ]);

      const result = await app.findOrCreateUserFromGoogle(fakeProfile());

      const profileSaves = pm.saves.filter(
        (s) => s.collection === Collections.GoogleProfiles,
      );
      expect(profileSaves).toHaveLength(1);
      const doc = profileSaves[0]!.doc as Record<string, unknown>;
      expect(doc._id).toBe('gp-existing');
      expect(doc.createdAt).toEqual(new Date('2024-01-01'));
      expect(result).toBe('user-existing');
    });

    it('throws when downstream throws (caught and rethrown after log)', async () => {
      pmStubs();
      vi.spyOn(User, 'find').mockRejectedValue(new Error('db unavailable'));
      await expect(
        app.findOrCreateUserFromGoogle(fakeProfile()),
      ).rejects.toThrow(/db unavailable/);
    });

    it('does not fork an avatar template at signup (char-gen owns character creation)', async () => {
      const pm = pmStubs();
      pm.setFindForCollection(Collections.GoogleProfiles, []);

      vi.spyOn(User, 'find').mockResolvedValue([]);
      // Seed deliberately "missing": signup no longer touches it, so a
      // missing seed is no longer an error at signup — it surfaces only
      // at char-gen commit if it ever happens.
      vi.spyOn(Template, 'findByPath').mockResolvedValue(null);
      const tmplSave = vi
        .spyOn(TemplateApi, 'saveTemplate')
        .mockResolvedValue(undefined as never);

      await expect(
        app.findOrCreateUserFromGoogle(fakeProfile()),
      ).resolves.toBeDefined();
      // Zero avatars minted; no per-character template forked.
      expect(tmplSave).not.toHaveBeenCalled();
    });
  });

  describe('provisionTestCharacter (test-auth seam)', () => {
    const ORIG_AUTH_MODE = process.env.AUTH_MODE;
    afterEach(() => {
      if (ORIG_AUTH_MODE === undefined) delete process.env.AUTH_MODE;
      else process.env.AUTH_MODE = ORIG_AUTH_MODE;
    });

    it('refuses unless AUTH_MODE=test', async () => {
      delete process.env.AUTH_MODE;
      await expect(app.provisionTestCharacter('u1')).rejects.toThrow(
        /test-only/,
      );
    });

    it('mints exactly one ready character for a fresh user', async () => {
      process.env.AUTH_MODE = 'test';
      const user = {
        _id: 'u1',
        playerIds: [] as string[],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(User, 'findById').mockResolvedValue(user as never);
      vi.spyOn(Template, 'findByPath').mockResolvedValue({
        path: Avatar.SEED_TEMPLATE_PATH,
        class: '/obj/Avatar',
        data: {},
        hydratorClass: '/lib/persistence/PersistentHydrator',
      } as never);
      const tmplSave = vi
        .spyOn(TemplateApi, 'saveTemplate')
        .mockResolvedValue(undefined as never);

      await app.provisionTestCharacter('u1', 'Tester');
      expect(user.playerIds).toHaveLength(1);
      expect(user.save).toHaveBeenCalledTimes(1);
      expect(tmplSave).toHaveBeenCalledTimes(1);
    });

    it('is idempotent — no-op when the user already has a character', async () => {
      process.env.AUTH_MODE = 'test';
      const user = {
        _id: 'u1',
        playerIds: ['existing'],
        save: vi.fn().mockResolvedValue(undefined),
      };
      vi.spyOn(User, 'findById').mockResolvedValue(user as never);
      const tmplSave = vi
        .spyOn(TemplateApi, 'saveTemplate')
        .mockResolvedValue(undefined as never);

      await app.provisionTestCharacter('u1');
      expect(user.playerIds).toEqual(['existing']);
      expect(tmplSave).not.toHaveBeenCalled();
      expect(user.save).not.toHaveBeenCalled();
    });
  });
});
