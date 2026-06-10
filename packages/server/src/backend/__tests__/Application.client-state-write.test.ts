/**
 * Application — `client-state-write` route.
 *
 * Validates that the inbound `client-state-write` message persists
 * through `avatar.setClientState` + `avatar.save()`, rejects
 * unknown keys, and runs the entry's optional validator.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Application } from '../Application';
import { ConnectionManager } from '../ConnectionManager';
import Avatar from '../../mud/obj/Avatar';
import type { IBackend } from '../IBackend';
import type Interactive from '../../mud/obj/Interactive';

interface FakeBackend extends IBackend {
  sent: Array<{ socketId: string; message: unknown }>;
}

function makeFakeBackend(): FakeBackend {
  const sent: FakeBackend['sent'] = [];
  return {
    sent,
    sendMessageToSocket(socketId, message) {
      sent.push({ socketId, message });
    },
    sendEnvelopeToSocket() {},
    async handleAuthenticationSuccess() {},
  };
}

function makeFakeInteractive(socketId: string, holder: unknown): Interactive {
  let counter = 0;
  return {
    getSocketId: () => socketId,
    getHolder: () => holder,
    nextFrameId: () => ++counter,
  } as unknown as Interactive;
}

describe('Application — client-state-write route', () => {
  let app: Application;

  beforeEach(() => {
    app = Application.get();
    app.initialize(makeFakeBackend());
    ConnectionManager.get();
  });

  it('writes through avatar.setClientState and calls save()', async () => {
    const fakeAvatar = {
      setClientState: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    Object.setPrototypeOf(fakeAvatar, Avatar.prototype);
    const interactive = makeFakeInteractive('sock-1', fakeAvatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    app.processUserMessage('sock-1', {
      type: 'client-state-write',
      payload: {
        key: 'console.activeTab',
        value: 'All',
      },
    });

    // The handler is async; await microtasks to let the promise resolve.
    await new Promise((r) => setImmediate(r));
    expect(fakeAvatar.setClientState).toHaveBeenCalledWith(
      'console.activeTab',
      'All',
    );
    expect(fakeAvatar.save).toHaveBeenCalledTimes(1);
  });

  it('does NOT call save() when setClientState throws (unknown key)', async () => {
    const fakeAvatar = {
      setClientState: vi.fn(() => {
        throw new Error('unknown key');
      }),
      save: vi.fn().mockResolvedValue(undefined),
    };
    Object.setPrototypeOf(fakeAvatar, Avatar.prototype);
    const interactive = makeFakeInteractive('sock-1', fakeAvatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    // Silence the expected console.warn so the test output stays clean.
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    app.processUserMessage('sock-1', {
      type: 'client-state-write',
      payload: { key: 'nope.nope', value: 1 },
    });
    await new Promise((r) => setImmediate(r));
    expect(fakeAvatar.setClientState).toHaveBeenCalled();
    expect(fakeAvatar.save).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('drops messages from sockets with no Avatar holder', async () => {
    const interactive = makeFakeInteractive('sock-1', null);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    app.processUserMessage('sock-1', {
      type: 'client-state-write',
      payload: { key: 'console.activeTab', value: 'X' },
    });
    await new Promise((r) => setImmediate(r));
    // Nothing to assert past the no-throw — handler silently returns.
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('drops messages whose payload lacks a string key', async () => {
    const fakeAvatar = {
      setClientState: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
    };
    Object.setPrototypeOf(fakeAvatar, Avatar.prototype);
    const interactive = makeFakeInteractive('sock-1', fakeAvatar);
    vi.spyOn(ConnectionManager.get(), 'getInteractive').mockReturnValue(
      interactive,
    );

    app.processUserMessage('sock-1', {
      type: 'client-state-write',
      payload: { value: 1 } as unknown as { key: string; value: unknown },
    });
    await new Promise((r) => setImmediate(r));
    expect(fakeAvatar.setClientState).not.toHaveBeenCalled();
  });
});
