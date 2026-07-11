/**
 * YoutubeClient — the read-only YouTube transport over an injected
 * transport: reader-token refresh, `@handle` → channelId (memoized),
 * channel/video → live `activeLiveChatId` resolution (+ the live-only
 * `'not-live'` reject), and open/close of a per-liveChatId read.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  YoutubeClient,
  type YoutubeTransport,
  type YoutubeInboundMessage,
} from '../YoutubeClient';

function res(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 404,
    json: async () => body,
  } as unknown as Response;
}

interface Captured {
  onMessage: (m: YoutubeInboundMessage) => void;
  onEnd: () => void;
  close: ReturnType<typeof vi.fn>;
}

function makeTransport(routes: (url: string) => Response): {
  transport: YoutubeTransport;
  fetchMock: ReturnType<typeof vi.fn>;
  streams: Captured[];
} {
  const streams: Captured[] = [];
  const fetchMock = vi.fn(async (url: string | URL) => routes(String(url)));
  const transport: YoutubeTransport = {
    fetch: fetchMock as unknown as typeof fetch,
    openLiveChatStream: (opts) => {
      const close = vi.fn();
      streams.push({ onMessage: opts.onMessage, onEnd: opts.onEnd, close });
      return { close };
    },
  };
  return { transport, fetchMock, streams };
}

const TOKEN_BODY = { access_token: 'tok', expires_in: 3600 };

function defaultRoutes(url: string): Response {
  if (url.includes('oauth2.googleapis.com/token')) return res(TOKEN_BODY);
  if (url.includes('/channels')) return res({ items: [{ id: 'UC-resolved' }] });
  if (url.includes('/search')) {
    return res({ items: [{ id: { videoId: 'vid1' } }] });
  }
  if (url.includes('/videos')) {
    return res({
      items: [{ liveStreamingDetails: { activeLiveChatId: 'lc-1' } }],
    });
  }
  return res({}, false);
}

describe('YoutubeClient (injected transport)', () => {
  beforeEach(() => {
    process.env.YOUTUBE_READER_CLIENT_ID = 'cid';
    process.env.YOUTUBE_READER_CLIENT_SECRET = 'csec';
    process.env.YOUTUBE_READER_REFRESH_TOKEN = 'rtok';
  });
  afterEach(() => {
    delete process.env.YOUTUBE_READER_CLIENT_ID;
    delete process.env.YOUTUBE_READER_CLIENT_SECRET;
    delete process.env.YOUTUBE_READER_REFRESH_TOKEN;
    vi.restoreAllMocks();
  });

  it('isConfigured reflects the env reader credential', () => {
    const { transport } = makeTransport(defaultRoutes);
    expect(YoutubeClient.forTest(transport).isConfigured()).toBe(true);
    delete process.env.YOUTUBE_READER_REFRESH_TOKEN;
    expect(YoutubeClient.forTest(transport).isConfigured()).toBe(false);
  });

  it('readerToken refreshes against Google and caches', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    expect(await client.readerToken()).toBe('tok');
    expect(await client.readerToken()).toBe('tok');
    // Only one token refresh (cached).
    const tokenCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/token'),
    );
    expect(tokenCalls).toHaveLength(1);
  });

  it('resolveChannelId hits channels.list for @handle and memoizes', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    expect(await client.resolveChannelId('@mkbhd')).toBe('UC-resolved');
    expect(await client.resolveChannelId('@mkbhd')).toBe('UC-resolved');
    const channelCalls = fetchMock.mock.calls.filter((c) =>
      String(c[0]).includes('/channels'),
    );
    expect(channelCalls).toHaveLength(1); // memoized
  });

  it('resolveChannelId passes a UC… channelId through with no call', async () => {
    const { transport, fetchMock } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    const uc = 'UC' + 'x'.repeat(22);
    expect(await client.resolveChannelId(uc)).toBe(uc);
    expect(
      fetchMock.mock.calls.filter((c) => String(c[0]).includes('/channels')),
    ).toHaveLength(0);
  });

  it('resolveLiveChatId: videoId → videos.list activeLiveChatId', async () => {
    const { transport } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    expect(await client.resolveLiveChatId('dQw4w9WgXcQ')).toEqual({
      liveChatId: 'lc-1',
    });
  });

  it('resolveLiveChatId: channel → search → video → liveChatId', async () => {
    const { transport } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    expect(await client.resolveLiveChatId('@mkbhd')).toEqual({
      liveChatId: 'lc-1',
    });
  });

  it('resolveLiveChatId: not streaming → not-live', async () => {
    const { transport } = makeTransport((url) => {
      if (url.includes('/token')) return res(TOKEN_BODY);
      if (url.includes('/channels')) return res({ items: [{ id: 'UC-x' }] });
      if (url.includes('/search')) return res({ items: [] }); // no live video
      return res({}, false);
    });
    const client = YoutubeClient.forTest(transport);
    expect(await client.resolveLiveChatId('@offline')).toBe('not-live');
  });

  it('openStream delivers messages + end through the transport', async () => {
    const { transport, streams } = makeTransport(defaultRoutes);
    const client = YoutubeClient.forTest(transport);
    const got: YoutubeInboundMessage[] = [];
    let ended = false;
    const ok = await client.openStream(
      'lc-1',
      { onMessage: (m) => got.push(m), onEnd: () => (ended = true) },
      1000,
    );
    expect(ok).toBe(true);
    expect(streams).toHaveLength(1);
    streams[0]!.onMessage({
      authorChannelId: 'a1',
      authorName: 'fan',
      text: 'nice',
    });
    expect(got).toEqual([{ authorChannelId: 'a1', authorName: 'fan', text: 'nice' }]);
    streams[0]!.onEnd();
    expect(ended).toBe(true);
    // A second openStream for the same liveChatId is a no-op (idempotent).
    await client.openStream('lc-1', { onMessage: () => {}, onEnd: () => {} }, 1000);
    expect(streams).toHaveLength(1);
    client.closeStream('lc-1');
    expect(streams[0]!.close).toHaveBeenCalled();
  });
});
