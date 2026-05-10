/**
 * Backend tests — WebSocket I/O singleton.
 *
 * `ws` never appears at runtime; a plain object exposing `send`,
 * `readyState`, `OPEN`, `close`, and `on` satisfies every call site
 * Backend makes against the socket.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Backend } from '../Backend';
import { Application } from '../Application';
import type { PassportGoogleProfile } from '@saxonberg/types';

/**
 * Minimal stand-in for the `ws` socket. Exposes the surface Backend
 * actually touches: `send`, `readyState`, `OPEN`, `close`, plus an
 * `on` registry so the test can fire 'message' / 'close' / 'error'
 * events back at Backend's handlers.
 */
interface FakeSocket {
  sends: string[];
  closed: boolean;
  readyState: number;
  OPEN: number;
  send: (data: string) => void;
  close: () => void;
  on: (event: string, listener: (...args: unknown[]) => void) => void;
  fire(event: string, ...args: unknown[]): void;
}

function makeFakeSocket(opts: { readyState?: number } = {}): FakeSocket {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const OPEN = 1;
  return {
    sends: [],
    closed: false,
    readyState: opts.readyState ?? OPEN,
    OPEN,
    send(data) {
      this.sends.push(data);
    },
    close() {
      this.closed = true;
    },
    on(event, listener) {
      const arr = listeners.get(event) ?? [];
      arr.push(listener);
      listeners.set(event, arr);
    },
    fire(event, ...args) {
      for (const l of listeners.get(event) ?? []) l(...args);
    },
  };
}

function fakeProfile(): PassportGoogleProfile {
  return {
    id: 'g-1',
    displayName: 'A',
    name: { givenName: 'A' },
    emails: [{ value: 'a@example.com' }],
    photos: [],
    _json: {},
    provider: 'google',
  } as unknown as PassportGoogleProfile;
}

describe('Backend', () => {
  let backend: Backend;
  let app: Application;

  beforeEach(() => {
    vi.restoreAllMocks();
    backend = Backend.get();
    app = Application.get();
    backend.initialize(app);
    // Reset socket registry between tests. closeAllConnections walks
    // .close on every entry — we can drive that through the public API
    // before each test to start from a clean slate.
    backend.closeAllConnections();
  });

  afterEach(() => {
    backend.closeAllConnections();
    vi.restoreAllMocks();
  });

  describe('get() / initialize()', () => {
    it('get() returns the same singleton', () => {
      expect(Backend.get()).toBe(backend);
    });

    it('starts with zero connections', () => {
      expect(backend.getConnectionCount()).toBe(0);
    });
  });

  /**
   * Connect a fake socket and return the minted socketId. Backend doesn't
   * expose the registry directly, so we capture the id from
   * Application.handleUserConnect's third argument (which Backend stamps).
   */
  function connectAndCaptureId(
    ws: FakeSocket,
    userId = 'u-1',
    sessionId = 'sess-1',
  ): string {
    let captured = '';
    vi.spyOn(app, 'handleUserConnect').mockImplementation(
      async (_u, _s, sock) => {
        captured = sock;
      },
    );
    backend.handleWebSocketConnect(
      ws as unknown as never,
      userId,
      sessionId,
    );
    expect(captured).not.toBe('');
    return captured;
  }

  describe('sendMessageToSocket', () => {
    it('serializes and sends to a registered open socket', () => {
      const ws = makeFakeSocket();
      const socketId = connectAndCaptureId(ws);

      backend.sendMessageToSocket(socketId, { type: 'echo', payload: 1 });
      expect(ws.sends).toEqual([
        JSON.stringify({ type: 'echo', payload: 1 }),
      ]);
    });

    it('is a no-op when the socketId is unknown', () => {
      // No throw, no observable effect.
      expect(() =>
        backend.sendMessageToSocket('does-not-exist', { x: 1 }),
      ).not.toThrow();
    });

    it('is a no-op when the socket is not OPEN', () => {
      const ws = makeFakeSocket({ readyState: 3 }); // CLOSED
      const socketId = connectAndCaptureId(ws);
      backend.sendMessageToSocket(socketId, { x: 1 });
      expect(ws.sends).toEqual([]);
    });

    it('catches JSON.stringify errors instead of propagating', () => {
      const ws = makeFakeSocket();
      const socketId = connectAndCaptureId(ws);
      // Circular reference: JSON.stringify throws.
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;
      expect(() =>
        backend.sendMessageToSocket(socketId, cyclic),
      ).not.toThrow();
      expect(ws.sends).toEqual([]);
    });
  });

  describe('handleWebSocketConnect', () => {
    it('registers the socket so getConnectionCount reflects it', () => {
      connectAndCaptureId(makeFakeSocket());
      expect(backend.getConnectionCount()).toBe(1);
    });

    it('mints a unique socketId per call', () => {
      const minted: string[] = [];
      vi.spyOn(app, 'handleUserConnect').mockImplementation(
        async (_u, _s, sock) => {
          minted.push(sock);
        },
      );
      backend.handleWebSocketConnect(
        makeFakeSocket() as unknown as never,
        'u-1',
        'sess-1',
      );
      backend.handleWebSocketConnect(
        makeFakeSocket() as unknown as never,
        'u-2',
        'sess-2',
      );
      expect(minted).toHaveLength(2);
      expect(minted[0]).not.toBe(minted[1]);
      expect(backend.getConnectionCount()).toBe(2);
    });

    it('calls Application.handleUserConnect with userId / sessionId / minted socketId', () => {
      const calls: Array<[string, string, string]> = [];
      vi.spyOn(app, 'handleUserConnect').mockImplementation(
        async (u, s, sock) => {
          calls.push([u, s, sock]);
        },
      );
      backend.handleWebSocketConnect(
        makeFakeSocket() as unknown as never,
        'u-1',
        'sess-1',
      );
      expect(calls).toHaveLength(1);
      expect(calls[0]![0]).toBe('u-1');
      expect(calls[0]![1]).toBe('sess-1');
      expect(typeof calls[0]![2]).toBe('string');
      expect(calls[0]![2].length).toBeGreaterThan(0);
    });

    it('wires "close" handler so the socket is unregistered on close', () => {
      vi.spyOn(app, 'handleUserDisconnect').mockImplementation(() => {});
      const ws = makeFakeSocket();
      connectAndCaptureId(ws);
      expect(backend.getConnectionCount()).toBe(1);
      ws.fire('close');
      expect(backend.getConnectionCount()).toBe(0);
    });

    it('wires "error" handler so the socket is unregistered on error', () => {
      const ws = makeFakeSocket();
      connectAndCaptureId(ws);
      ws.fire('error', new Error('boom'));
      expect(backend.getConnectionCount()).toBe(0);
    });
  });

  describe('inbound message handling', () => {
    let ws: FakeSocket;
    let socketId: string;

    beforeEach(() => {
      ws = makeFakeSocket();
      socketId = connectAndCaptureId(ws);
    });

    it('parses valid JSON and delegates to Application.processUserMessage', () => {
      const spy = vi
        .spyOn(app, 'processUserMessage')
        .mockImplementation(() => {});
      ws.fire(
        'message',
        Buffer.from(JSON.stringify({ type: 'echo', payload: 'hi' })),
      );
      expect(spy).toHaveBeenCalledWith(socketId, {
        type: 'echo',
        payload: 'hi',
      });
    });

    it('sends a parse-error response back to the socket for invalid JSON', () => {
      const procSpy = vi
        .spyOn(app, 'processUserMessage')
        .mockImplementation(() => {});
      ws.fire('message', Buffer.from('not json'));
      expect(procSpy).not.toHaveBeenCalled();
      expect(ws.sends).toHaveLength(1);
      const sent = JSON.parse(ws.sends[0]!);
      expect(sent.type).toBe('error');
      expect(sent.payload.message).toBe('Invalid message format');
    });
  });

  describe('close path', () => {
    it('handleWebSocketClose notifies Application and removes the socket', () => {
      const disc = vi
        .spyOn(app, 'handleUserDisconnect')
        .mockImplementation(() => {});
      const ws = makeFakeSocket();
      const socketId = connectAndCaptureId(ws);
      ws.fire('close');
      expect(disc).toHaveBeenCalledWith(socketId);
      expect(backend.getConnectionCount()).toBe(0);
    });
  });

  describe('handleAuthenticationSuccess', () => {
    it('calls done(null, { id }) on happy path', async () => {
      vi.spyOn(app, 'findOrCreateUserFromGoogle').mockResolvedValue(
        'user-123',
      );
      let result: { err: unknown; user: unknown } | null = null;
      await backend.handleAuthenticationSuccess(fakeProfile(), (err, user) => {
        result = { err, user };
      });
      expect(result).not.toBeNull();
      expect(result!.err).toBeNull();
      expect(result!.user).toEqual({ id: 'user-123' });
    });

    it('calls done(error) when Application throws', async () => {
      vi.spyOn(app, 'findOrCreateUserFromGoogle').mockRejectedValue(
        new Error('db down'),
      );
      let result: { err: unknown; user: unknown } | null = null;
      await backend.handleAuthenticationSuccess(fakeProfile(), (err, user) => {
        result = { err, user };
      });
      expect((result!.err as Error).message).toBe('db down');
      expect(result!.user).toBeUndefined();
    });
  });

  describe('closeAllConnections', () => {
    it('closes every registered socket and empties the registry', () => {
      vi.spyOn(app, 'handleUserConnect').mockResolvedValue(undefined);
      const wsA = makeFakeSocket();
      const wsB = makeFakeSocket();
      backend.handleWebSocketConnect(
        wsA as unknown as never,
        'u-A',
        'sess-A',
      );
      backend.handleWebSocketConnect(
        wsB as unknown as never,
        'u-B',
        'sess-B',
      );
      expect(backend.getConnectionCount()).toBe(2);

      backend.closeAllConnections();

      expect(wsA.closed).toBe(true);
      expect(wsB.closed).toBe(true);
      expect(backend.getConnectionCount()).toBe(0);
    });

    it('swallows errors thrown by individual ws.close() calls', () => {
      vi.spyOn(app, 'handleUserConnect').mockResolvedValue(undefined);
      const bad = makeFakeSocket();
      bad.close = () => {
        throw new Error('cannot close');
      };
      const good = makeFakeSocket();
      backend.handleWebSocketConnect(
        bad as unknown as never,
        'u-bad',
        'sess-bad',
      );
      backend.handleWebSocketConnect(
        good as unknown as never,
        'u-good',
        'sess-good',
      );

      expect(() => backend.closeAllConnections()).not.toThrow();
      // Registry is cleared regardless of per-socket throw.
      expect(backend.getConnectionCount()).toBe(0);
    });
  });
});
