/**
 * TwitchRelay — the in-memory, player-initiated relay singleton: lazy
 * tune-by-login (via the DI port's Helix lookup), presence 0→1 / 1→0
 * edges, logout drop, echo tag-and-suppress, send-throttle shaping, and
 * the deliver fanout to tuned-in ONLINE players only. Port / PlayerApi /
 * MessageApi / EventApi mocked; no DB, no live Twitch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import TwitchRelay from '../TwitchRelay';
import type { TwitchRelayPort } from '../../api/twitch';
import type Avatar from '../Avatar';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';

function avatar(): Avatar {
  return { getPresentation: () => 'someone' } as unknown as Avatar;
}

/** A port that resolves any login to a fixed broadcaster id. */
function fakePort(broadcasterId = 'b1'): TwitchRelayPort {
  return {
    resolveLogin: vi.fn(async (login: string) => ({
      broadcasterId,
      login: login.toLowerCase(),
    })),
    send: vi.fn(async () => ({ ok: true })),
  };
}

describe('TwitchRelay (in-memory, player-initiated)', () => {
  let relay: TwitchRelay;
  let emit: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // postRegister registers a PlayerLoggedOut listener; the EventRegistry
    // isn't bootstrapped in this unit test, so stub on(). emit() is spied
    // so we can assert the presence edges.
    vi.spyOn(EventApi, 'on').mockReturnValue({
      unsubscribe: () => {},
    } as never);
    emit = vi.spyOn(EventApi, 'emit').mockReturnValue(undefined);
    relay = await StuffApi.create(() => new TwitchRelay());
    relay.setOutboundPort(fakePort('b1'));
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tunes by login lazily and fires the presence 0→1 edge once', async () => {
    const r1 = await relay.tuneByLogin('p1', 'TwitchDev');
    expect(r1).toMatchObject({ ok: true, broadcasterId: 'b1', login: 'twitchdev' });
    // 0→1 edge emitted.
    const presenceCalls = emit.mock.calls.filter(
      (c) => c[0] === Events.TwitchPresenceChanged
    );
    expect(presenceCalls).toHaveLength(1);
    expect(presenceCalls[0]![1]).toEqual({ broadcasterId: 'b1', count: 1, prev: 0 });

    // A second tuner does NOT re-fire the edge (1→2).
    await relay.tuneByLogin('p2', 'twitchdev');
    expect(
      emit.mock.calls.filter((c) => c[0] === Events.TwitchPresenceChanged)
    ).toHaveLength(1);

    expect(relay.tunedLoginsFor('p1')).toEqual(['twitchdev']);
    expect(relay.whoTuned('b1').sort()).toEqual(['p1', 'p2']);
  });

  it('no port → no-relay; the cache avoids a second resolve', async () => {
    const noPortRelay = await StuffApi.create(() => new TwitchRelay());
    expect(await noPortRelay.tuneByLogin('p1', 'x')).toEqual({
      ok: false,
      reason: 'no-relay',
    });

    const port = fakePort('b1');
    relay.setOutboundPort(port);
    await relay.tuneByLogin('p1', 'twitchdev');
    await relay.tuneByLogin('p2', 'twitchdev'); // cached → no 2nd resolve
    expect((port.resolveLogin as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });

  it('untune fires the 1→0 edge; logout drops from every channel', async () => {
    await relay.tuneByLogin('p1', 'twitchdev');
    emit.mockClear();

    relay.untune('p1', 'twitchdev');
    const calls = emit.mock.calls.filter(
      (c) => c[0] === Events.TwitchPresenceChanged
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]![1]).toEqual({ broadcasterId: 'b1', count: 0, prev: 1 });

    // Re-tune two, then a logout of one keeps the channel alive (no edge).
    await relay.tuneByLogin('p1', 'twitchdev');
    await relay.tuneByLogin('p2', 'twitchdev');
    emit.mockClear();
    relay.dropPlayer('p1');
    expect(
      emit.mock.calls.filter((c) => c[0] === Events.TwitchPresenceChanged)
    ).toHaveLength(0);
    relay.dropPlayer('p2'); // last one out → 1→0
    expect(
      emit.mock.calls.filter((c) => c[0] === Events.TwitchPresenceChanged)
    ).toHaveLength(1);
  });

  it('echo tag-and-suppress: consumed once, within TTL', () => {
    expect(relay.isEcho('u1', 'hi')).toBe(false);
    relay.noteEcho('u1', 'hi');
    expect(relay.isEcho('u1', 'hi')).toBe(true);
    expect(relay.isEcho('u1', 'hi')).toBe(false);
  });

  it('throttle shapes a burst rather than throwing', () => {
    const results = Array.from({ length: 7 }, () =>
      relay.tryAcquireSend('p1')
    );
    expect(results.slice(0, 5).every((r) => r === true)).toBe(true);
    expect(results[5]).toBe(false);
  });

  it('deliver fans out to tuned-in ONLINE players only, on the relay topic', async () => {
    await relay.tuneByLogin('online', 'twitchdev');
    await relay.tuneByLogin('offline', 'twitchdev');

    const onlineAvatar = avatar();
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid) =>
      pid === 'online' ? onlineAvatar : undefined
    );
    const sent: Array<{ recipient: unknown; frame: MessageFrame }> = [];
    vi.spyOn(MessageApi, 'sendMessage').mockImplementation(
      (recipient: unknown, frame: MessageFrame) => {
        sent.push({ recipient, frame });
      }
    );

    const speaker: RelaySpeaker = {
      kind: 'external',
      service: 'twitch',
      externalName: 'viewer',
    };
    relay.deliver('b1', 'twitchdev', speaker, 'hello world', false);

    expect(sent).toHaveLength(1); // offline player skipped
    expect(sent[0]!.recipient).toBe(onlineAvatar);
    expect(sent[0]!.frame.topic).toBe('world.twitch.message');
    expect((sent[0]!.frame.payload as { speaker: RelaySpeaker }).speaker).toEqual(
      speaker
    );
    expect(relay.historyFor('b1')).toHaveLength(1);
  });
});
