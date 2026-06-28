/**
 * TwitchRelay — the relay state singleton's load-bearing behaviors:
 * echo tag-and-suppress, presence edge counting, send throttling (shaped,
 * not thrown), and the inbound/outbound `deliver` fanout to tuned-in
 * Avatars only (with the correct topic + speaker payload). PlayerApi /
 * MessageApi are mocked; no DB, no live Twitch.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StuffApi } from '../../api/stuff';
import { PlayerApi } from '../../api/player';
import { MessageApi } from '../../api/message';
import TwitchRelay from '../TwitchRelay';
import { TwitchChannel } from '../../lib/twitch/TwitchChannel';
import type Avatar from '../Avatar';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';

function channel(id = 'b1', login = 'twitchdev'): TwitchChannel {
  return { broadcasterId: id, broadcasterLogin: login, label: '' } as TwitchChannel;
}
function avatar(tunedTo: string[]): Avatar {
  return {
    isTuned: (id: string) => tunedTo.includes(id),
    getPresentation: () => 'someone',
  } as unknown as Avatar;
}

describe('TwitchRelay', () => {
  let relay: TwitchRelay;

  beforeEach(async () => {
    // postRegister → warmCache reads the registry; no DB in tests.
    vi.spyOn(TwitchChannel, 'find').mockResolvedValue([]);
    relay = await StuffApi.create(() => new TwitchRelay());
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('echo tag-and-suppress: consumed once, within TTL', () => {
    expect(relay.isEcho('u1', 'hi')).toBe(false);
    relay.noteEcho('u1', 'hi');
    expect(relay.isEcho('u1', 'hi')).toBe(true); // matched + consumed
    expect(relay.isEcho('u1', 'hi')).toBe(false); // already consumed
  });

  it('presence counts the 0→1 and 1→0 edges', () => {
    expect(relay.recordPresence('b1', +1)).toEqual({ count: 1, prev: 0 });
    expect(relay.recordPresence('b1', +1)).toEqual({ count: 2, prev: 1 });
    expect(relay.recordPresence('b1', -1)).toEqual({ count: 1, prev: 2 });
    expect(relay.recordPresence('b1', -1)).toEqual({ count: 0, prev: 1 });
  });

  it('throttle shapes a burst rather than throwing', () => {
    // PLAYER_BURST = 5: first 5 acquire, the 6th is throttled (false).
    const results = Array.from({ length: 7 }, () =>
      relay.tryAcquireSend('p1')
    );
    expect(results.slice(0, 5).every((r) => r === true)).toBe(true);
    expect(results[5]).toBe(false);
  });

  it('deliver fans out to tuned-in Avatars only, on the relay topic', () => {
    const tuned = avatar(['b1']);
    const other = avatar(['b2']);
    vi.spyOn(PlayerApi, 'getAllAvatars').mockReturnValue([tuned, other]);
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
    relay.deliver(channel(), speaker, 'hello world', false);

    expect(sent).toHaveLength(1);
    expect(sent[0]!.recipient).toBe(tuned);
    expect(sent[0]!.frame.topic).toBe('world.twitch.message');
    expect((sent[0]!.frame.payload as { speaker: RelaySpeaker }).speaker).toEqual(
      speaker
    );
    // One frame landed in the channel's history ring.
    expect(relay.historyFor('b1')).toHaveLength(1);
  });
});
