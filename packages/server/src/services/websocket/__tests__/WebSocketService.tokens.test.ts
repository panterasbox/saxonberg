/**
 * WebSocketService — the token doors (broadcast-ready D4, D11): a stream
 * token names one player and one scope; a bad, revoked or wrong-scope
 * token is a 401, never a fallback; the env `BROADCAST_TOKEN` still opens
 * the founder's feed during the changeover, and refuses when there is no
 * founder to name.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebSocketService } from '../WebSocketService';

type Resolved = { playerId: string; scope: 'overlay' | 'control' } | null;

describe('WebSocketService token doors', () => {
  let connects: Array<{ principal: string; opts: unknown }>;
  let tokens: Record<string, Resolved>;
  let svc: WebSocketService;
  let socket: { write: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> };
  const prev = { b: process.env.BROADCAST_TOKEN, s: process.env.STREAMER_PLAYER_IDS };

  beforeEach(() => {
    connects = [];
    tokens = {
      'overlay-token-aaaaaaaaaaaa': { playerId: 'pa', scope: 'overlay' },
      'control-token-aaaaaaaaaaaa': { playerId: 'pa', scope: 'control' },
    };
    process.env.BROADCAST_TOKEN = 'legacy-env-token-0123456789';
    process.env.STREAMER_PLAYER_IDS = 'p-founder,p-other';
    const backend = {
      resolveStreamToken: async (raw: string) => tokens[raw] ?? null,
      handleWebSocketConnect: (_ws: unknown, principal: string, _sid: string, opts: unknown) =>
        connects.push({ principal, opts }),
    };
    svc = new WebSocketService(backend as never);
    (svc as unknown as { configureBroadcast(): void }).configureBroadcast();
    (svc as unknown as { wss: unknown }).wss = {
      handleUpgrade: (_r: unknown, _s: unknown, _h: unknown, cb: (ws: unknown) => void) => cb({}),
    };
    socket = { write: vi.fn(), destroy: vi.fn() };
  });

  afterEach(() => {
    process.env.BROADCAST_TOKEN = prev.b;
    process.env.STREAMER_PLAYER_IDS = prev.s;
    vi.restoreAllMocks();
  });

  const upgrade = async (url: string) => {
    (svc as unknown as {
      handleUpgrade(r: unknown, s: unknown, h: unknown): void;
    }).handleUpgrade({ url, headers: {}, socket: {} }, socket, Buffer.alloc(0));
    for (let i = 0; i < 6; i++) await Promise.resolve();
  };

  it('opens an overlay for the player its token names', async () => {
    await upgrade('/ws?broadcast=overlay-token-aaaaaaaaaaaa');
    expect(connects).toEqual([
      { principal: 'broadcast:pa', opts: { kind: 'broadcast', playerId: 'pa' } },
    ]);
  });

  it('opens a control socket only with a control-scope token', async () => {
    await upgrade('/ws?control=control-token-aaaaaaaaaaaa');
    expect(connects[0]?.opts).toEqual({ kind: 'control', playerId: 'pa' });
    await upgrade('/ws?control=overlay-token-aaaaaaaaaaaa');
    expect(connects).toHaveLength(1);
    expect(socket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
  });

  it('refuses a control token on the overlay door', async () => {
    await upgrade('/ws?broadcast=control-token-aaaaaaaaaaaa');
    expect(connects).toHaveLength(0);
    expect(socket.destroy).toHaveBeenCalled();
  });

  it('refuses an unknown or revoked token — never a shared feed', async () => {
    await upgrade('/ws?broadcast=revoked-token-aaaaaaaaaaaa');
    expect(connects).toHaveLength(0);
    expect(socket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
  });

  it('maps the env BROADCAST_TOKEN to the founder (the first streamer id)', async () => {
    await upgrade('/ws?broadcast=legacy-env-token-0123456789');
    expect(connects[0]).toEqual({
      principal: 'broadcast:p-founder',
      opts: { kind: 'broadcast', playerId: 'p-founder' },
    });
  });

  it('refuses the env token loudly when no streamer is configured', async () => {
    process.env.STREAMER_PLAYER_IDS = '';
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    await upgrade('/ws?broadcast=legacy-env-token-0123456789');
    expect(connects).toHaveLength(0);
    expect(err).toHaveBeenCalled();
  });
});
