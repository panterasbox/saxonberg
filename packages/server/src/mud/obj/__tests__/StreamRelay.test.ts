/**
 * StreamRelay — the pure-mutator, in-memory relay singleton (both
 * transports): addTuned / removeTuned / dropPlayer return the presence
 * edges (the Api bridge drives the reader's subscribe/unsubscribe off
 * them); plus the composite `(service, key)` table, the handle cache, echo
 * tag-and-suppress, send throttle, the deliver fanout to tuned-in ONLINE
 * players only, the `Events.RelayMessage` emit per delivered line, and the
 * overlay-sentinel guard on `whoTuned` / `tunedChannelsFor`. PlayerApi /
 * MessageApi / EventApi mocked.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import { EventApi } from '../../api/event';
import { Events } from '../../lib/events';
import StreamRelay from '../StreamRelay';
import type Avatar from '../Avatar';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';

function avatar(): Avatar {
  return { getPresentation: () => 'someone' } as unknown as Avatar;
}

describe('StreamRelay (pure-mutator, in-memory)', () => {
  let relay: StreamRelay;

  beforeEach(async () => {
    relay = await StuffApi.create(() => new StreamRelay());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('addTuned returns the 0->1 edge once and caches the handle', () => {
    expect(relay.cachedKey('twitch', 'twitchdev')).toBeUndefined();
    // First tuner → 0->1 edge.
    expect(relay.addTuned('p1', 'twitch', 'b1', 'twitchdev')).toBe(true);
    expect(relay.cachedKey('twitch', 'twitchdev')).toBe('twitch:b1');
    expect(relay.resolveByHandle('twitch', 'twitchdev')).toEqual({
      service: 'twitch',
      key: 'b1',
      handle: 'twitchdev',
    });
    // Second tuner on the same channel → no edge.
    expect(relay.addTuned('p2', 'twitch', 'b1', 'twitchdev')).toBe(false);
    expect(relay.tunedChannelsFor('p1')).toEqual([
      { service: 'twitch', key: 'b1', handle: 'twitchdev' },
    ]);
    expect(relay.whoTuned('twitch', 'b1').sort()).toEqual(['p1', 'p2']);
  });

  it('the composite key keeps twitch + youtube channels distinct', () => {
    relay.addTuned('p1', 'twitch', 'b1', 'shared');
    relay.addTuned('p1', 'youtube', 'lc1', 'shared');
    expect(relay.whoTuned('twitch', 'b1')).toEqual(['p1']);
    expect(relay.whoTuned('youtube', 'lc1')).toEqual(['p1']);
    expect(relay.tunedChannelsFor('p1')).toHaveLength(2);
  });

  it('removeTuned reports the 1->0 edge + service/key', () => {
    relay.addTuned('p1', 'twitch', 'b1', 'twitchdev');
    relay.addTuned('p2', 'twitch', 'b1', 'twitchdev');
    // One of two leaves → not emptied.
    expect(relay.removeTuned('p1', 'twitch', 'twitchdev')).toEqual({
      ok: true,
      service: 'twitch',
      key: 'b1',
      emptied: false,
    });
    // Last one leaves → emptied (the 1->0 edge).
    expect(relay.removeTuned('p2', 'twitch', 'twitchdev')).toEqual({
      ok: true,
      service: 'twitch',
      key: 'b1',
      emptied: true,
    });
    // Unknown handle.
    expect(relay.removeTuned('p1', 'twitch', 'nope')).toEqual({
      ok: false,
      emptied: false,
    });
  });

  it('dropPlayer returns the channels that emptied', () => {
    relay.addTuned('p1', 'twitch', 'b1', 'one');
    relay.addTuned('p2', 'twitch', 'b1', 'one'); // shared channel
    relay.addTuned('p1', 'twitch', 'b2', 'two'); // solo channel
    // p1 logs out: b2 empties (was solo), b1 stays (p2 still tuned).
    expect(relay.dropPlayer('p1')).toEqual([
      { service: 'twitch', key: 'b2', handle: 'two' },
    ]);
    expect(relay.whoTuned('twitch', 'b1')).toEqual(['p2']);
    expect(relay.whoTuned('twitch', 'b2')).toEqual([]);
  });

  it('the overlay sentinel counts for the edge but hides from queries', () => {
    // Sentinel opens the channel (0->1 edge) with no real player.
    expect(
      relay.addTuned(StreamRelay.OVERLAY_SENTINEL, 'twitch', 'b9', 'owner'),
    ).toBe(true);
    // ...but is invisible to who / list.
    expect(relay.whoTuned('twitch', 'b9')).toEqual([]);
    expect(relay.tunedChannelsFor(StreamRelay.OVERLAY_SENTINEL)).toEqual([]);
    // A real player joining does NOT re-fire the edge (already open).
    expect(relay.addTuned('p1', 'twitch', 'b9', 'owner')).toBe(false);
    expect(relay.whoTuned('twitch', 'b9')).toEqual(['p1']);
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

  it('deliver fans out to tuned-in ONLINE players + emits RelayMessage', () => {
    relay.addTuned('online', 'twitch', 'b1', 'twitchdev');
    relay.addTuned('offline', 'twitch', 'b1', 'twitchdev');

    const onlineAvatar = avatar();
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid) =>
      pid === 'online' ? onlineAvatar : undefined,
    );
    const sent: Array<{ recipient: unknown; frame: MessageFrame }> = [];
    vi.spyOn(MessageApi, 'sendMessage').mockImplementation(
      (recipient: unknown, frame: MessageFrame) => {
        sent.push({ recipient, frame });
      },
    );
    const emitted: Array<{ name: string; payload: unknown }> = [];
    vi.spyOn(EventApi, 'emit').mockImplementation(
      (name: string, payload: unknown) => {
        emitted.push({ name, payload });
        return undefined as never;
      },
    );

    const speaker: RelaySpeaker = {
      kind: 'external',
      service: 'twitch',
      externalName: 'viewer',
    };
    relay.deliver('twitch', 'b1', 'twitchdev', speaker, 'hello world', false);

    expect(sent).toHaveLength(1); // offline player skipped
    expect(sent[0]!.recipient).toBe(onlineAvatar);
    expect(sent[0]!.frame.topic).toBe('speech.relay');
    expect(
      (sent[0]!.frame.payload as { speaker: RelaySpeaker }).speaker,
    ).toEqual(speaker);
    expect(relay.historyFor('twitch', 'b1')).toHaveLength(1);
    // One RelayMessage emit for the delivered line (the overlay seam).
    const relayEmits = emitted.filter((e) => e.name === Events.RelayMessage);
    expect(relayEmits).toHaveLength(1);
    expect(relayEmits[0]!.payload).toMatchObject({
      service: 'twitch',
      channelKey: 'b1',
      channelHandle: 'twitchdev',
      text: 'hello world',
    });
  });

  it('a youtube deliver rides the speech.relay topic', () => {
    relay.addTuned('p1', 'youtube', 'lc1', 'mkbhd');
    const av = avatar();
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockReturnValue(av);
    const frames: MessageFrame[] = [];
    vi.spyOn(MessageApi, 'sendMessage').mockImplementation(
      (_r: unknown, f: MessageFrame) => {
        frames.push(f);
      },
    );
    vi.spyOn(EventApi, 'emit').mockReturnValue(undefined as never);

    relay.deliver(
      'youtube',
      'lc1',
      'mkbhd',
      { kind: 'external', service: 'youtube', externalName: 'fan' },
      'nice',
      false,
    );
    expect(frames[0]!.topic).toBe('speech.relay');
  });
});
