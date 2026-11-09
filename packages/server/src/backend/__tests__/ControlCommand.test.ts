/**
 * The control principal's one verb (broadcast-ready D11): pblive's
 * Stream Deck may run `stream …` as its streamer and nothing else.
 */

import "../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { handleControlCommand } from '../inbound/command';
import { BroadcastFeed } from '../BroadcastFeed';
import { PlayerApi } from '../../mud/api/player';
import { MixinApi } from '../../mud/api/mixin';
import type { InboundClientMessage } from '../inbound';

const cmd = (command: string): InboundClientMessage =>
  ({ type: 'command', payload: { command } }) as InboundClientMessage;

describe('handleControlCommand', () => {
  let results: Array<{ command: string; ok: boolean; reason?: string }>;
  let ran: string[];
  let outcome: string;
  let alias: string | null;

  beforeEach(() => {
    results = [];
    ran = [];
    outcome = 'ok';
    alias = null;
    BroadcastFeed._resetForTesting();
    vi.spyOn(BroadcastFeed.get(), 'sendControlResult').mockImplementation(
      (_s, command, ok, reason) => {
        results.push({ command, ok, ...(reason ? { reason } : {}) });
      },
    );
    vi.spyOn(MixinApi, 'isAlias').mockReturnValue(true);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid: string) =>
      pid === 'pa'
        ? ({
            getAlias: (n: string) => (n === alias ? { expansion: 'eval' } : undefined),
            executeCommand: async (text: string, opts: { onOutcome?: (s: string) => void }) => {
              ran.push(text);
              opts.onOutcome?.(outcome);
            },
          } as never)
        : undefined,
    );
  });

  afterEach(() => vi.restoreAllMocks());

  it('runs `stream away food` as the streamer and lights ✓', async () => {
    await handleControlCommand('c1', 'pa', cmd('stream away food'));
    expect(ran).toEqual(['stream away food']);
    expect(results).toEqual([{ command: 'stream away food', ok: true }]);
  });

  it('echoes a refusal from the dispatcher as ⚠', async () => {
    outcome = 'error';
    await handleControlCommand('c1', 'pa', cmd('stream back'));
    expect(results[0]).toMatchObject({ ok: false, reason: 'error' });
  });

  it('refuses any verb but `stream`', async () => {
    for (const line of ['look', 'eval 1+1', 'say stream away', '"stream" away']) {
      await handleControlCommand('c1', 'pa', cmd(line));
    }
    expect(ran.filter((r) => !r.startsWith('"'))).toEqual([]);
    expect(results.slice(0, 3).every((r) => !r.ok && r.reason === 'stream-only')).toBe(true);
  });

  it('refuses `stream token` — a control token mints nothing', async () => {
    await handleControlCommand('c1', 'pa', cmd('stream token --control'));
    expect(ran).toEqual([]);
    expect(results[0]).toMatchObject({ ok: false, reason: 'no-token-minting' });
  });

  it('refuses when the streamer has an alias that shadows `stream`', async () => {
    alias = 'stream';
    await handleControlCommand('c1', 'pa', cmd('stream away food'));
    expect(ran).toEqual([]);
    expect(results[0]).toMatchObject({ ok: false, reason: 'alias-shadows-stream' });
  });

  it('refuses when the streamer is offline', async () => {
    await handleControlCommand('c1', 'pz', cmd('stream away food'));
    expect(results[0]).toMatchObject({ ok: false, reason: 'streamer-offline' });
  });

  it('refuses anything that is not a command message', async () => {
    await handleControlCommand('c1', 'pa', { type: 'ping', payload: {} } as InboundClientMessage);
    expect(results[0]).toMatchObject({ ok: false, reason: 'commands-only' });
  });
});
