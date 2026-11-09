/**
 * BroadcastFeed — one feed per streamer (broadcast-ready D5, D7, D11).
 *
 * Two streamers' overlays never move each other; a socket whose streamer
 * is not resident gets NO snapshot (fail closed); chat reaches the overlay
 * of the streamer whose own channel it is; a first arrival reaches every
 * overlay; the build stamp is env-or-null; each streamer's channel reads
 * open on THEIR 0→1 edge. Mocked Backend socket and StreamApi reads.
 */

import "../../test-bootstrap";
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
import EventRegistry from '../../mud/platform/idea/EventRegistry';
import { EventApi } from '../../mud/api/event';
import { Events } from '../../mud/lib/events';
import { StreamApi } from '../../mud/api/stream';
import { StuffApi } from '../../mud/api/stuff';
import { ShadowApi } from '../../mud/api/shadow';
import { PlayerApi } from '../../mud/api/player';
import { MixinApi } from '../../mud/api/mixin';
import { Stuff } from '../../mud/lib/stuff/Stuff';
import type { Envelope, RelaySpeaker, StreamShowCore } from '@saxonberg/types';

async function makeRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, '/platform/idea/EventRegistry');
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

async function flush(): Promise<void> {
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

const speaker: RelaySpeaker = { kind: 'external', service: 'twitch', externalName: 'viewer' };

function show(phase: StreamShowCore['phase']): StreamShowCore {
  return {
    phase,
    reason: null,
    startsAt: null,
    awayUntil: null,
    endsAt: null,
    topic: null,
    agenda: [],
    current: -1,
    client: null,
    rotation: { pinned: null, skip: [] },
  };
}

describe('BroadcastFeed — one feed per streamer', () => {
  let sent: Array<{ socketId: string; envelope: Envelope }>;
  let overlaySpy: MockInstance<typeof StreamApi.setOverlayReading>;
  const channels: Record<string, Record<string, string>> = {};
  const resident: Record<string, StreamShowCore> = {};

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    await makeRegistry();
    BroadcastFeed._resetForTesting();
    sent = [];
    for (const k of Object.keys(channels)) delete channels[k];
    for (const k of Object.keys(resident)) delete resident[k];
    delete process.env.SAXONBERG_BUILD_SHA;
    delete process.env.SAXONBERG_BUILD_AT;
    vi.spyOn(Backend, 'get').mockReturnValue({
      sendEnvelopeToSocket: (socketId: string, envelope: Envelope) =>
        sent.push({ socketId, envelope }),
    } as unknown as Backend);
    overlaySpy = vi.spyOn(StreamApi, 'setOverlayReading').mockResolvedValue(undefined);
    vi.spyOn(StreamApi, 'refreshOverlayReading').mockResolvedValue(undefined);
    vi.spyOn(StreamApi, 'channelsFor').mockImplementation((pid) => ({ ...(channels[pid] ?? {}) }));
    vi.spyOn(StreamApi, 'lowerThirdPanels').mockResolvedValue([
      { key: 'join', weight: 3, seconds: 20, when: 'always' },
    ]);
    vi.spyOn(PlayerApi, 'findAvatarByPlayerId').mockImplementation((pid: string) =>
      resident[pid] ? ({ show: () => resident[pid] } as never) : undefined,
    );
    vi.spyOn(MixinApi, 'isBroadcastHost').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const of = (socketId: string, type: string) =>
    sent.filter((s) => s.socketId === socketId && s.envelope.type === type);

  it("opens each streamer's channel reads on THEIR 0→1 edge and closes on 1→0", async () => {
    const feed = BroadcastFeed.get();
    await feed.addConnection('a1', 'pa');
    expect(overlaySpy).toHaveBeenCalledWith('pa', true);
    await feed.addConnection('a2', 'pa');
    await feed.addConnection('b1', 'pb');
    expect(overlaySpy).toHaveBeenCalledWith('pb', true);
    expect(overlaySpy).toHaveBeenCalledTimes(2);
    feed.removeConnection('a1');
    expect(overlaySpy).toHaveBeenCalledTimes(2);
    feed.removeConnection('a2');
    expect(overlaySpy).toHaveBeenCalledWith('pa', false);
  });

  it('sends a resident streamer a snapshot on connect, with the panels and the player count', async () => {
    resident.pa = show('standby');
    await BroadcastFeed.get().addConnection('a1', 'pa');
    const states = of('a1', 'stream-state');
    // The snapshot goes first (no rows listed yet), then the listed rows.
    expect(states.length).toBe(2);
    const firstState = (states[0]!.envelope as Extract<Envelope, { type: 'stream-state' }>).state;
    expect(firstState.phase).toBe('standby');
    const state = (states[1]!.envelope as Extract<Envelope, { type: 'stream-state' }>).state;
    expect(state.phase).toBe('standby');
    expect(state.panels.map((p) => p.key)).toEqual(['join']);
    expect(typeof state.playersOnline).toBe('number');
    expect(state.build).toBeNull();
  });

  it('withholds the snapshot for a streamer who is not resident — never a synthesized live', async () => {
    await BroadcastFeed.get().addConnection('a1', 'pa');
    expect(of('a1', 'stream-state')).toHaveLength(0);
  });

  it("routes a streamer's show to their own sockets only — two streamers never cross", async () => {
    const feed = BroadcastFeed.get();
    await feed.addConnection('a1', 'pa');
    await feed.addConnection('b1', 'pb');
    EventApi.emit(Events.StreamShowChanged, { playerId: 'pb', show: show('standby') });
    await flush();
    expect(of('b1', 'stream-state')).toHaveLength(1);
    expect(of('a1', 'stream-state')).toHaveLength(0);
  });

  it("forwards a line to the overlay whose streamer owns that channel, and to no other", async () => {
    const feed = BroadcastFeed.get();
    channels.pa = { twitch: 'Owner' };
    channels.pb = { twitch: 'second' };
    await feed.addConnection('a1', 'pa');
    await feed.addConnection('b1', 'pb');
    EventApi.emit(Events.RelayMessage, {
      service: 'twitch',
      channelKey: 'k1',
      channelHandle: 'owner',
      speaker,
      text: 'hi',
    });
    EventApi.emit(Events.RelayMessage, {
      service: 'twitch',
      channelKey: 'k9',
      channelHandle: 'someone-else',
      speaker,
      text: 'not on any overlay',
    });
    await flush();
    expect(of('a1', 'relay-chat')).toHaveLength(1);
    expect(of('b1', 'relay-chat')).toHaveLength(0);
  });

  it('puts a first arrival on every overlay, tagged when it came from the stream', async () => {
    const feed = BroadcastFeed.get();
    await feed.addConnection('a1', 'pa');
    await feed.addConnection('b1', 'pb');
    EventApi.emit(Events.PlayerFirstArrival, { playerId: 'pn', name: 'Iffy', arrivedFrom: 'stream' });
    await flush();
    for (const sock of ['a1', 'b1']) {
      const [ev] = of(sock, 'stream-event');
      expect(ev?.envelope).toMatchObject({ kind: 'new-player', name: 'Iffy', fromStream: true });
    }
  });

  it('sends a waiting overlay its snapshot when the streamer logs in', async () => {
    const feed = BroadcastFeed.get();
    await feed.addConnection('a1', 'pa');
    expect(of('a1', 'stream-state')).toHaveLength(0);
    resident.pa = show('standby');
    EventApi.emit(Events.PlayerLoggedIn, { playerId: 'pa', userId: 'u' });
    await flush();
    expect(of('a1', 'stream-state')).toHaveLength(1);
  });

  it('stamps the build from env, and only a well-formed one', async () => {
    process.env.SAXONBERG_BUILD_SHA = 'abc1234';
    process.env.SAXONBERG_BUILD_AT = '2026-11-08T12:00:00Z';
    resident.pa = show('live');
    await BroadcastFeed.get().addConnection('a1', 'pa');
    const state = (of('a1', 'stream-state').at(-1)!.envelope as Extract<Envelope, { type: 'stream-state' }>).state;
    expect(state.build).toEqual({ sha: 'abc1234', at: '2026-11-08T12:00:00Z' });
  });

  it('remembers control sockets apart from overlays and echoes their results', () => {
    const feed = BroadcastFeed.get();
    feed.addControl('c1', 'pa');
    expect(feed.controlPlayerOf('c1')).toBe('pa');
    expect(feed.getConnectionCount()).toBe(0);
    feed.sendControlResult('c1', 'stream back', false, 'error');
    expect(of('c1', 'control-result')[0]!.envelope).toMatchObject({ ok: false, reason: 'error' });
    feed.removeConnection('c1');
    expect(feed.controlPlayerOf('c1')).toBeNull();
  });
});
