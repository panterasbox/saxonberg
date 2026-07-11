/**
 * BroadcastFeed — the overlay-owner chat forwarding (P4). With a broadcast
 * overlay connected and the owner's `OVERLAY_*` channels configured, the
 * owner's OWN relay-chat lines (Twitch + YouTube, unified) are forwarded as
 * `relay-chat` envelopes; a viewer tuning some OTHER channel does not leak;
 * and the owner read is gated on overlay presence (0→1 opens, 1→0 closes).
 * Mocked Backend socket + a mocked `StreamApi.setOverlayReading`.
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { BroadcastFeed } from '../BroadcastFeed';
import { Backend } from '../Backend';
import EventRegistry from '../../mud/obj/EventRegistry';
import { EventApi } from '../../mud/api/event';
import { Events } from '../../mud/lib/events';
import { StreamApi } from '../../mud/api/stream';
import { StuffApi } from '../../mud/api/stuff';
import { ShadowApi } from '../../mud/api/shadow';
import { Stuff } from '../../mud/lib/stuff/Stuff';
import type { Envelope, RelaySpeaker } from '@saxonberg/types';

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/obj/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

const speaker: RelaySpeaker = {
  kind: 'external',
  service: 'twitch',
  externalName: 'viewer',
};

describe('BroadcastFeed overlay chat forwarding', () => {
  let sent: Array<{ socketId: string; envelope: Envelope }>;
  let overlaySpy: MockInstance<typeof StreamApi.setOverlayReading>;
  let prevTwitch: string | undefined;
  let prevYoutube: string | undefined;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    await makeRegistry();
    BroadcastFeed._resetForTesting();
    prevTwitch = process.env.OVERLAY_TWITCH_LOGIN;
    prevYoutube = process.env.OVERLAY_YOUTUBE_CHANNEL;
    process.env.OVERLAY_TWITCH_LOGIN = 'owner';
    process.env.OVERLAY_YOUTUBE_CHANNEL = '@ownerchan';
    sent = [];
    vi.spyOn(Backend, 'get').mockReturnValue({
      sendEnvelopeToSocket: (socketId: string, envelope: Envelope) =>
        sent.push({ socketId, envelope }),
    } as unknown as Backend);
    overlaySpy = vi
      .spyOn(StreamApi, 'setOverlayReading')
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    if (prevTwitch === undefined) delete process.env.OVERLAY_TWITCH_LOGIN;
    else process.env.OVERLAY_TWITCH_LOGIN = prevTwitch;
    if (prevYoutube === undefined) delete process.env.OVERLAY_YOUTUBE_CHANNEL;
    else process.env.OVERLAY_YOUTUBE_CHANNEL = prevYoutube;
    vi.restoreAllMocks();
  });

  function relayChat() {
    return sent.filter((s) => s.envelope.type === 'relay-chat');
  }

  it('opens the owner read on the 0→1 presence edge, closes on 1→0', () => {
    const feed = BroadcastFeed.get();
    feed.addConnection('s1');
    expect(overlaySpy).toHaveBeenCalledWith(true);
    feed.addConnection('s2'); // already open — no re-open
    expect(overlaySpy).toHaveBeenCalledTimes(1);
    feed.removeConnection('s1'); // still one connection
    expect(overlaySpy).toHaveBeenCalledTimes(1);
    feed.removeConnection('s2'); // 1→0
    expect(overlaySpy).toHaveBeenCalledWith(false);
  });

  it("forwards the owner's own Twitch chat as a relay-chat envelope", async () => {
    const feed = BroadcastFeed.get();
    feed.addConnection('s1');
    EventApi.emit(Events.RelayMessage, {
      service: 'twitch',
      channelKey: 'b1',
      channelHandle: 'owner',
      speaker,
      text: 'hi from twitch',
    });
    await flush();
    const chats = relayChat();
    expect(chats).toHaveLength(1);
    expect(chats[0]!.envelope).toMatchObject({
      type: 'relay-chat',
      service: 'twitch',
      channelHandle: 'owner',
      text: 'hi from twitch',
    });
  });

  it("forwards the owner's own YouTube chat, provenance-tagged", async () => {
    const feed = BroadcastFeed.get();
    feed.addConnection('s1');
    EventApi.emit(Events.RelayMessage, {
      service: 'youtube',
      channelKey: 'lc1',
      channelHandle: '@ownerchan',
      speaker: { kind: 'external', service: 'youtube', externalName: 'fan' },
      text: 'hi from yt',
    });
    await flush();
    const chats = relayChat();
    expect(chats).toHaveLength(1);
    expect(chats[0]!.envelope).toMatchObject({
      type: 'relay-chat',
      service: 'youtube',
      text: 'hi from yt',
    });
  });

  it('does NOT forward a viewer tuning a DIFFERENT channel (filter proof)', async () => {
    const feed = BroadcastFeed.get();
    feed.addConnection('s1');
    EventApi.emit(Events.RelayMessage, {
      service: 'twitch',
      channelKey: 'b2',
      channelHandle: 'someone-else',
      speaker,
      text: 'not on the overlay',
    });
    await flush();
    expect(relayChat()).toHaveLength(0);
  });
});
