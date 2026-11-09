/**
 * BroadcastMixin — the stream a played body runs (broadcast-ready D1, D3,
 * D5, D10): every legal and illegal transition, the timers (only the
 * outro moves the phase), the allowlisted projection, and the change
 * event the feed routes by player.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BroadcastMixin } from '../Broadcast';
import { StandbyReason } from '../StandbyReason';
import { HasInteractiveMixin } from '../../connection/HasInteractive';
import { ClientStateMixin } from '../../connection/ClientState';
import { SaxonbergClientMixin } from '../../connection/SaxonbergClient';
import { Idea } from '../../stuff/Idea';
import { Stuff } from '../../stuff/Stuff';
import { StuffApi } from '../../../api/stuff';
import { ShadowApi } from '../../../api/shadow';
import { EventApi } from '../../../api/event';
import { Events } from '../../events';
import { MixinApi } from '../../../api/mixin';
import EventRegistry from '../../../platform/idea/EventRegistry';
import { makeStuff } from '../../security/__tests__/test-setup';
import type { StreamShowCore } from '@saxonberg/types';

class TestStreamer extends SaxonbergClientMixin(
  BroadcastMixin(ClientStateMixin(HasInteractiveMixin(Idea))),
) {
  static _mixinName = 'TestStreamer';
  public override getPlayerId(): string {
    return 'p-test';
  }
}

const BATHROOM = StandbyReason.fromData('bathroom', {
  label: 'Bathroom break',
  copy: 'Back in a few.',
  defaultDurationMs: 300_000,
});
const PRIVACY = StandbyReason.fromData('privacy', {
  label: 'Privacy',
  copy: 'Back shortly.',
  privacy: true,
});

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

describe('BroadcastMixin', () => {
  let s: TestStreamer;
  let shows: Array<{ playerId: string; show: StreamShowCore }>;

  beforeEach(async () => {
    StuffApi.clearAll();
    ShadowApi._clearAllForTesting();
    EventApi._clearAllForTesting();
    await makeRegistry();
    shows = [];
    EventApi.on<{ playerId: string; show: StreamShowCore }>(Events.StreamShowChanged, (p) => {
      shows.push(p);
    });
    s = makeStuff(() => new TestStreamer());
    vi.spyOn(s, 'pushClientStateUpdate').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const flush = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  it('is a broadcast host that starts offline and off the air', () => {
    expect(MixinApi.isBroadcastHost(s)).toBe(true);
    expect(s.getStreamPhase()).toBe('offline');
    expect(s.isOnAir()).toBe(false);
    expect(s.show().client).toBeNull();
  });

  it('walks a whole show and refuses the illegal moves by name', () => {
    expect(s.goLive()).toEqual({ ok: false, refusal: 'not-streaming' });
    expect(s.endStream()).toEqual({ ok: false, refusal: 'not-streaming' });

    expect(s.startStream(Date.now() + 120_000).ok).toBe(true);
    expect(s.getStreamPhase()).toBe('starting');
    expect(s.isOnAir()).toBe(true);

    expect(s.goLive().ok).toBe(true);
    expect(s.startStream(null)).toEqual({ ok: false, refusal: 'already-on-air' });

    expect(s.goStandby(BATHROOM, 300_000).ok).toBe(true);
    expect(s.getStreamPhase()).toBe('standby');
    expect(s.isOnAir()).toBe(false);

    expect(s.goLive().ok).toBe(true);
    expect(s.endStream().ok).toBe(true);
    expect(s.getStreamPhase()).toBe('ending');
    expect(s.isOnAir()).toBe(true);
    expect(s.goLive()).toEqual({ ok: false, refusal: 'ending' });
    expect(s.goStandby(BATHROOM, null)).toEqual({ ok: false, refusal: 'ending' });
    expect(s.endStream()).toEqual({ ok: false, refusal: 'ending' });

    expect(s.goOffline().ok).toBe(true);
    expect(s.getStreamPhase()).toBe('offline');
  });

  it('keeps the shipped `stream away 15m` working with no stream started', () => {
    expect(s.goStandby(BATHROOM, 15 * 60_000).ok).toBe(true);
    expect(s.show().awayUntil).toBeGreaterThan(Date.now());
    expect(s.goLive().ok).toBe(true);
  });

  it('gives a privacy reason no countdown', () => {
    s.goStandby(PRIVACY, 600_000);
    const show = s.show();
    expect(show.reason?.privacy).toBe(true);
    expect(show.awayUntil).toBeNull();
  });

  it('changes nothing when an Away countdown runs out (fail closed)', () => {
    vi.useFakeTimers();
    s.startStream(null);
    s.goStandby(BATHROOM, 1_000);
    vi.advanceTimersByTime(60_000);
    expect(s.getStreamPhase()).toBe('standby');
  });

  it('goes offline when the outro finishes', () => {
    vi.useFakeTimers();
    s.startStream(null);
    s.endStream();
    const endsAt = s.show().endsAt!;
    expect(endsAt).toBeGreaterThan(Date.now());
    vi.advanceTimersByTime(endsAt - Date.now() + 10);
    expect(s.getStreamPhase()).toBe('offline');
  });

  it('re-arms an outro after a restore, and goes offline at once when it is overdue', () => {
    vi.useFakeTimers();
    // A restored record with the deadline still ahead…
    s.streamPhase = 'ending';
    s.streamEndsAt = Date.now() + 5_000;
    s.rearmBroadcast();
    expect(s.getStreamPhase()).toBe('ending');
    vi.advanceTimersByTime(5_010);
    expect(s.getStreamPhase()).toBe('offline');
    // …and one whose deadline passed while the world was down.
    s.streamPhase = 'ending';
    s.streamEndsAt = Date.now() - 1;
    s.rearmBroadcast();
    expect(s.getStreamPhase()).toBe('offline');
  });

  it('re-arms nothing for a standby — the overlay finds it as it was', () => {
    s.streamPhase = 'standby';
    s.streamReason = PRIVACY.toView();
    s.rearmBroadcast();
    expect(s.getStreamPhase()).toBe('standby');
    expect(s.show().reason?.key).toBe('privacy');
  });

  it('steps the agenda and refuses past its end', () => {
    expect(s.advanceStreamAgenda()).toEqual({ ok: false, refusal: 'no-agenda' });
    s.planAgenda(['glass', ' paper ', '', 'Q&A']);
    expect(s.show().agenda.map((a) => a.title)).toEqual(['glass', 'paper', 'Q&A']);
    expect(s.show().current).toBe(0);
    s.advanceStreamAgenda();
    expect(s.show().agenda[0]!.done).toBe(true);
    expect(s.show().current).toBe(1);
    s.advanceStreamAgenda();
    s.advanceStreamAgenda();
    expect(s.show().current).toBe(-1);
    expect(s.advanceStreamAgenda()).toEqual({ ok: false, refusal: 'agenda-done' });
  });

  it('carries the verb of the last command — never its arguments — while a stream is up', () => {
    s.noteVerb('smelt');
    expect(s.show().client).toBeNull(); // offline: nothing recorded
    s.startStream(null);
    s.noteVerb('Smelt');
    expect(s.show().client?.lastVerb).toBe('smelt');
  });

  it('re-emits when a show-relevant client fact moves, and only while streaming', async () => {
    s.setClientState('stream.foreground', 'other-tab');
    await flush();
    expect(shows).toHaveLength(0);
    s.startStream(null);
    await flush();
    const before = shows.length;
    s.setClientState('stream.foreground', 'other-app');
    await flush();
    expect(shows.length).toBe(before + 1);
    expect(shows.at(-1)!.show.client?.foreground).toBe('other-app');
    expect(() => s.setClientState('stream.foreground', 'my-desktop')).toThrow();
  });

  it('emits the show with its player on every transition', async () => {
    s.startStream(null);
    s.goLive();
    await flush();
    expect(shows.map((e) => e.show.phase)).toEqual(['starting', 'live']);
    expect(shows.every((e) => e.playerId === 'p-test')).toBe(true);
  });

  it('projects an allowlist — exactly the declared keys', () => {
    s.startStream(null);
    expect(Object.keys(s.show()).sort()).toEqual(
      ['agenda', 'awayUntil', 'client', 'current', 'endsAt', 'phase', 'reason', 'rotation', 'startsAt', 'topic'].sort(),
    );
    expect(Object.keys(s.show().client!).sort()).toEqual(['foreground', 'lastVerb', 'layout', 'mode']);
  });

  it('pushes the controls card its state, extras included, but keeps extras off the feed', async () => {
    s.loadControls({ reasons: [{ key: 'bathroom' }] });
    s.startStream(null);
    await flush();
    const state = s.getClientState<Record<string, unknown>>('stream.state');
    expect(state.phase).toBe('starting');
    expect(state.reasons).toEqual([{ key: 'bathroom' }]);
    expect(shows.at(-1)!.show).not.toHaveProperty('reasons');
  });

  it('steers the rotation', () => {
    expect(s.steerRotation('pin', null)).toEqual({ ok: false, refusal: 'unknown-panel' });
    s.steerRotation('pin', 'money');
    s.steerRotation('skip', 'wiki');
    expect(s.show().rotation).toEqual({ pinned: 'money', skip: ['wiki'] });
    s.steerRotation('clear', null);
    expect(s.show().rotation).toEqual({ pinned: null, skip: [] });
  });
});
