/**
 * TwitchRelay — the pure-mutator, in-memory relay singleton: addTuned /
 * removeTuned / dropPlayer return the presence edges (the Api bridge drives
 * the reader's subscribe/unsubscribe off them); plus the login cache, echo
 * tag-and-suppress, send throttle, and the deliver fanout to tuned-in
 * ONLINE players only. No port, no events. PlayerApi / MessageApi mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import TwitchRelay from '../TwitchRelay';
import type Avatar from '../Avatar';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';

function avatar(): Avatar {
  return { getPresentation: () => 'someone' } as unknown as Avatar;
}

describe('TwitchRelay (pure-mutator, in-memory)', () => {
  let relay: TwitchRelay;

  beforeEach(async () => {
    relay = await StuffApi.create(() => new TwitchRelay());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addTuned returns the 0->1 edge once and caches the login', () => {
    expect(relay.cachedId('twitchdev')).toBeUndefined();
    // First tuner → 0->1 edge.
    expect(relay.addTuned('p1', 'b1', 'twitchdev')).toBe(true);
    expect(relay.cachedId('twitchdev')).toBe('b1');
    expect(relay.resolveByLogin('twitchdev')).toEqual({
      broadcasterId: 'b1',
      login: 'twitchdev',
    });
    // Second tuner on the same channel → no edge.
    expect(relay.addTuned('p2', 'b1', 'twitchdev')).toBe(false);
    expect(relay.tunedLoginsFor('p1')).toEqual(['twitchdev']);
    expect(relay.whoTuned('b1').sort()).toEqual(['p1', 'p2']);
  });

  it('removeTuned reports the 1->0 edge + broadcasterId', () => {
    relay.addTuned('p1', 'b1', 'twitchdev');
    relay.addTuned('p2', 'b1', 'twitchdev');
    // One of two leaves → not emptied.
    expect(relay.removeTuned('p1', 'twitchdev')).toEqual({
      ok: true,
      broadcasterId: 'b1',
      emptied: false,
    });
    // Last one leaves → emptied (the 1->0 edge).
    expect(relay.removeTuned('p2', 'twitchdev')).toEqual({
      ok: true,
      broadcasterId: 'b1',
      emptied: true,
    });
    // Unknown login.
    expect(relay.removeTuned('p1', 'nope')).toEqual({
      ok: false,
      emptied: false,
    });
  });

  it('dropPlayer returns the broadcasterIds that emptied', () => {
    relay.addTuned('p1', 'b1', 'one');
    relay.addTuned('p2', 'b1', 'one'); // shared channel
    relay.addTuned('p1', 'b2', 'two'); // solo channel
    // p1 logs out: b2 empties (was solo), b1 stays (p2 still tuned).
    expect(relay.dropPlayer('p1')).toEqual(['b2']);
    expect(relay.whoTuned('b1')).toEqual(['p2']);
    expect(relay.whoTuned('b2')).toEqual([]);
  });

  it('echo tag-and-suppress: consumed once, within TTL', () => {
    expect(relay.isEcho('u1', 'hi')).toBe(false);
    relay.noteEcho('u1', 'hi');
    expect(relay.isEcho('u1', 'hi')).toBe(true);
    expect(relay.isEcho('u1', 'hi')).toBe(false);
  });

  it('throttle shapes a burst rather than throwing', () => {
    const results = Array.from({ length: 7 }, () => relay.tryAcquireSend('p1'));
    expect(results.slice(0, 5).every((r) => r === true)).toBe(true);
    expect(results[5]).toBe(false);
  });

  it('deliver fans out to tuned-in ONLINE players only, on the relay topic', () => {
    relay.addTuned('online', 'b1', 'twitchdev');
    relay.addTuned('offline', 'b1', 'twitchdev');

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
    expect(
      (sent[0]!.frame.payload as { speaker: RelaySpeaker }).speaker
    ).toEqual(speaker);
    expect(relay.historyFor('b1')).toHaveLength(1);
  });
});
