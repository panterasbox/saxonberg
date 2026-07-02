/**
 * YoutubeRelayReader — the presence-gated per-liveChatId reader, over an
 * injected mock `YoutubeClient`. Covers subscribe→openStream, the inbound
 * down-call (`StreamApi.dispatchInbound('youtube', …)`), the stream-end
 * teardown (close + `StreamApi.dropChannel` auto-untune), unsubscribe, and
 * the resolve forwards.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { YoutubeRelayReader } from '../YoutubeRelayReader';
import type { YoutubeClient, YoutubeInboundMessage } from '../YoutubeClient';
import { StreamApi } from '../../mud/api/stream';

interface OpenCapture {
  liveChatId: string;
  onMessage: (m: YoutubeInboundMessage) => void;
  onEnd: () => void;
}

function makeMockClient(over?: Partial<{
  isConfigured: boolean;
  resolveChannelId: (r: string) => Promise<string | 'unknown'>;
  resolveLiveChatId: (r: string) => Promise<unknown>;
}>): { client: YoutubeClient; opened: OpenCapture[]; closed: string[] } {
  const opened: OpenCapture[] = [];
  const closed: string[] = [];
  const client = {
    isConfigured: () => over?.isConfigured ?? true,
    resolveChannelId:
      over?.resolveChannelId ?? (async () => 'UC-x' as const),
    resolveLiveChatId:
      over?.resolveLiveChatId ?? (async () => ({ liveChatId: 'lc-1' })),
    openStream: async (
      liveChatId: string,
      handlers: {
        onMessage: (m: YoutubeInboundMessage) => void;
        onEnd: () => void;
      },
    ) => {
      opened.push({ liveChatId, ...handlers });
      return true;
    },
    closeStream: (liveChatId: string) => {
      closed.push(liveChatId);
    },
  } as unknown as YoutubeClient;
  return { client, opened, closed };
}

describe('YoutubeRelayReader', () => {
  let dispatch: ReturnType<typeof vi.spyOn>;
  let dropChannel: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    dispatch = vi
      .spyOn(StreamApi, 'dispatchInbound')
      .mockResolvedValue(undefined);
    dropChannel = vi
      .spyOn(StreamApi, 'dropChannel')
      .mockResolvedValue(undefined);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('isConfigured + resolves forward to the client', async () => {
    const { client } = makeMockClient();
    const reader = YoutubeRelayReader.forTest(client);
    expect(reader.isConfigured()).toBe(true);
    expect(await reader.resolveChannelId('@mkbhd')).toBe('UC-x');
    expect(await reader.resolveChannel('@mkbhd')).toEqual({
      liveChatId: 'lc-1',
    });
  });

  it('subscribe opens a stream; inbound lines down-call dispatchInbound', async () => {
    const { client, opened } = makeMockClient();
    const reader = YoutubeRelayReader.forTest(client);
    await reader.subscribe('lc-1');
    expect(opened).toHaveLength(1);
    opened[0]!.onMessage({
      authorChannelId: 'a1',
      authorName: 'fan',
      text: 'nice',
    });
    expect(dispatch).toHaveBeenCalledWith('youtube', {
      channelKey: 'lc-1',
      senderUserId: 'a1',
      senderLogin: 'fan',
      senderDisplay: 'fan',
      text: 'nice',
    });
  });

  it('stream-end closes the read and auto-untunes (dropChannel)', async () => {
    const { client, opened, closed } = makeMockClient();
    const reader = YoutubeRelayReader.forTest(client);
    await reader.subscribe('lc-1');
    opened[0]!.onEnd();
    expect(closed).toContain('lc-1');
    expect(dropChannel).toHaveBeenCalledWith('youtube', 'lc-1');
  });

  it('unsubscribe closes the read', async () => {
    const { client, closed } = makeMockClient();
    const reader = YoutubeRelayReader.forTest(client);
    reader.unsubscribe('lc-1');
    expect(closed).toContain('lc-1');
  });
});
