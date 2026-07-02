/**
 * StreamLogic — the resolver + read-only-post gate, driven through the
 * `StreamApi` facade (so the `FromModule('/api/stream#StreamApi')` gate is
 * satisfied by the real forwarding frame) over a real `StreamRelay`
 * singleton + a mocked `TwitchRelayReader`. Covers `resolveTarget`'s
 * branches (twitch resolve / not-configured / unknown / youtube-deferred /
 * reject-passthrough / unknown-character) and the YouTube read-only post.
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { StreamApi } from '../../../api/stream';
import { PlayerApi } from '../../../api/player';
import { TwitchRelayReader } from '../../../../backend/TwitchRelayReader';
import { YoutubeRelayReader } from '../../../../backend/YoutubeRelayReader';
import StreamRelay from '../../StreamRelay';
import { StreamerTarget } from '../../../lib/streaming/StreamerTarget';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { makeStuffAtPath } from '../../../lib/security/__tests__/test-setup';

function mockReader(over: Partial<{
  isConfigured: boolean;
  resolveLogin: (login: string) => Promise<{ broadcasterId: string; login: string } | null>;
}>): void {
  vi.spyOn(TwitchRelayReader, 'get').mockReturnValue({
    isConfigured: () => over.isConfigured ?? true,
    resolveLogin:
      over.resolveLogin ??
      (async (login: string) => ({ broadcasterId: `b-${login}`, login })),
    subscribe: () => undefined,
    unsubscribe: () => undefined,
  } as unknown as TwitchRelayReader);
}

function mockYoutubeReader(over: Partial<{
  isConfigured: boolean;
  resolveChannel: (ref: string) => Promise<unknown>;
  resolveChannelId: (ref: string) => Promise<string | 'unknown'>;
}>): void {
  vi.spyOn(YoutubeRelayReader, 'get').mockReturnValue({
    isConfigured: () => over.isConfigured ?? true,
    resolveChannel:
      over.resolveChannel ?? (async () => ({ liveChatId: 'lc-1' })),
    resolveChannelId: over.resolveChannelId ?? (async () => 'UC-x'),
    subscribe: async () => undefined,
    unsubscribe: () => undefined,
  } as unknown as YoutubeRelayReader);
}

describe('StreamLogic.resolveTarget (via StreamApi)', () => {
  beforeAll(() => {
    // One relay for the file — requireRelay caches it after the first call.
    makeStuffAtPath(() => new StreamRelay(), '/obj/StreamRelay');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves a twitch handle via the reader (cache-miss)', async () => {
    mockReader({});
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('shroud', { twitch: true }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.target.platform).toBe('twitch');
      expect(res.target.key).toBe('b-shroud');
      expect(res.target.handle).toBe('shroud');
    }
  });

  it('rejects no-relay when the twitch reader is unconfigured', async () => {
    mockReader({ isConfigured: false });
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('unconfigured-chan', { twitch: true }),
    );
    expect(res).toEqual({ ok: false, reason: 'no-relay' });
  });

  it('rejects unknown-target when the reader cannot resolve the login', async () => {
    mockReader({ isConfigured: true, resolveLogin: async () => null });
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('ghostchannel', { twitch: true }),
    );
    expect(res).toEqual({ ok: false, reason: 'unknown-target' });
  });

  it('resolves a live youtube handle to its liveChatId', async () => {
    mockYoutubeReader({
      isConfigured: true,
      resolveChannel: async () => ({ liveChatId: 'lc-1' }),
    });
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('mkbhd', { youtube: true }),
    );
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.target.platform).toBe('youtube');
      expect(res.target.key).toBe('lc-1');
      expect(res.target.handle).toBe('mkbhd');
    }
  });

  it('rejects no-relay when the youtube reader is unconfigured', async () => {
    mockYoutubeReader({ isConfigured: false });
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('mkbhd', { youtube: true }),
    );
    expect(res).toEqual({ ok: false, reason: 'no-relay' });
  });

  it('rejects not-live when the youtube channel is not streaming', async () => {
    mockYoutubeReader({
      isConfigured: true,
      resolveChannel: async () => 'not-live',
    });
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('offline', { youtube: true }),
    );
    expect(res).toEqual({ ok: false, reason: 'not-live' });
  });

  it('passes a parse rejection straight through', async () => {
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('shroud', { twitch: true, youtube: true }),
    );
    expect(res).toEqual({ ok: false, reason: 'ambiguous-handle' });
  });

  it('rejects unknown-character for a name with no online avatar', async () => {
    vi.spyOn(PlayerApi, 'getAllAvatars').mockReturnValue([]);
    const res = await StreamApi.resolveTarget(
      StreamerTarget.parse('nobody', {}),
    );
    expect(res).toEqual({ ok: false, reason: 'unknown-character' });
  });
});

describe('StreamLogic.post (via StreamApi)', () => {
  beforeEach(() => {
    makeStuffAtPath(() => new StreamRelay(), '/obj/StreamRelay');
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('YouTube posting is read-only (rejected before any relay work)', async () => {
    const speaker = {} as Stuff;
    const res = await StreamApi.post(speaker, 'youtube', 'mkbhd', 'hi');
    expect(res).toEqual({ ok: false, reason: 'read-only' });
  });
});

describe('StreamLogic.resolveYoutubeChannelId (watch embed, via StreamApi)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('resolves an @handle to a channelId when configured', async () => {
    mockYoutubeReader({
      isConfigured: true,
      resolveChannelId: async () => 'UC-resolved',
    });
    const res = await StreamApi.resolveYoutubeChannelId('@mkbhd');
    expect(res).toEqual({ ok: true, channelId: 'UC-resolved' });
  });

  it('reports no-relay when the reader is unconfigured', async () => {
    mockYoutubeReader({ isConfigured: false });
    const res = await StreamApi.resolveYoutubeChannelId('@mkbhd');
    expect(res).toEqual({ ok: false, reason: 'no-relay' });
  });
});
