/**
 * BroadcastFeed — the outbound, read-only livestream projection, one feed
 * per streamer (broadcast-ready D5, D7, D11).
 *
 * Serves two kinds of token socket, neither of which ever becomes an
 * Interactive/Login/Avatar:
 *
 * - **overlay** sockets (`?broadcast=<token>`, OBS browser sources) — pure
 *   push targets keyed by the player the token names. ⭐ A streamer's show
 *   reaches ONLY the sockets opened with that streamer's token: two
 *   streamers never move each other's overlay.
 * - **control** sockets (`?control=<token>`, pblive's Stream Deck) — may
 *   run `stream …` as their player and nothing else (the inbound layer
 *   decides); the feed only remembers whose they are and echoes results.
 *
 * What crosses is an ALLOWLIST: the streamer's own `BroadcastMixin.show()`
 * plus three world facts this feed adds — the player count, the build
 * stamp, the panel rows. Nothing of another player, no frame, no card.
 *
 * ⭐ **Fail closed.** A socket whose streamer is not resident gets NO
 * snapshot — it waits (holding its last scene) until the streamer's body
 * loads or moves. The feed never synthesizes a phase.
 *
 * Layer: backend/ infrastructure, peer to ConnectionManager. It reaches
 * the wire via `Backend.sendEnvelopeToSocket` directly (same layer).
 */

import type {
  StreamShow,
  StreamShowCore,
  StreamStateEnvelope,
  StreamEventEnvelope,
  ControlResultEnvelope,
  ReactionDeltaEnvelope,
  RelayChatEnvelope,
  StreamPanelRow,
  StreamBuild,
  Envelope,
  EnvelopeTemplate,
} from '@saxonberg/types';
import { Backend } from './Backend';
import { EventApi } from '../mud/api/event';
import { Events } from '../mud/lib/events';
import type { RelayMessageEvent } from '../mud/lib/events';
import { StreamApi } from '../mud/api/stream';
import { PlayerApi } from '../mud/api/player';
import { SocialApi } from '../mud/api/social';
import { MixinApi } from '../mud/api/mixin';
import {
  ReactionScopeDeltaEvent,
  type ReactionScopeDeltaPayload,
} from '../mud/lib/events/ReactionScopeDeltaEvent';

export class BroadcastFeed {
  private static instance: BroadcastFeed;

  /** Overlay sockets → the player whose show they receive. */
  private connections: Map<string, string> = new Map();

  /** Control sockets → the player whose `stream` they may run. */
  private controls: Map<string, string> = new Map();

  /** The panel rows each overlay socket was given at connect (P7). */
  private panelsBySocket: Map<string, StreamPanelRow[]> = new Map();

  /** The panel rows the last listing returned (sent ahead of a re-list). */
  private knownPanels: StreamPanelRow[] = [];

  /** Each streamer's last show — re-sent when a world fact moves. */
  private lastShow: Map<string, StreamShowCore> = new Map();

  /**
   * Per-socket monotonic frame counter. Token sockets have no
   * Interactive, so the feed owns the ordering primitive.
   */
  private frameCounters: Map<string, number> = new Map();

  /** The build stamp, read once from env (D7). `undefined` = unread. */
  private build: StreamBuild | null | undefined = undefined;

  /** One-shot guard for the EventApi subscriptions (installed lazily on
   *  first connection, well after boot — so the EventRegistry is live). */
  private subscribed = false;

  private constructor() {}

  public static get(): BroadcastFeed {
    if (!this.instance) {
      this.instance = new BroadcastFeed();
    }
    return this.instance;
  }

  /** Test seam — drop the singleton so each test starts unsubscribed. */
  public static _resetForTesting(): void {
    this.instance = new BroadcastFeed();
  }

  /**
   * Register an overlay socket for `playerId` and send the snapshot when
   * the streamer is resident. Idempotent for a given socketId.
   */
  public async addConnection(socketId: string, playerId: string): Promise<void> {
    this.ensureSubscribed();
    const firstForPlayer = !this.hasSocketsFor(playerId);
    this.connections.set(socketId, playerId);
    this.frameCounters.set(socketId, 0);
    console.info(
      `BroadcastFeed: overlay added - socketId=${socketId}, player=${playerId}, ` +
        `total=${this.connections.size}`,
    );
    // 0→1 edge for THIS streamer: open their own channel reads.
    if (firstForPlayer) void StreamApi.setOverlayReading(playerId, true);
    // ⭐ The snapshot goes FIRST — an overlay must not wait on a document
    // listing to learn its phase (the drive found a busy world taking
    // longer than a browser source's patience). It carries the rows the
    // feed last listed; the fresh listing follows and re-sends if it moved.
    this.panelsBySocket.set(socketId, this.knownPanels);
    const show = this.residentShow(playerId);
    if (show) this.pushShowTo(socketId, show);
    const panels = await StreamApi.lowerThirdPanels();
    if (!this.connections.has(socketId)) return;
    const moved = JSON.stringify(panels) !== JSON.stringify(this.knownPanels);
    this.knownPanels = panels;
    this.panelsBySocket.set(socketId, panels);
    const latest = this.residentShow(playerId);
    if (moved && latest) this.pushShowTo(socketId, latest);
  }

  /** Register a control socket (pblive) for `playerId`. */
  public addControl(socketId: string, playerId: string): void {
    this.controls.set(socketId, playerId);
    this.frameCounters.set(socketId, 0);
    console.info(`BroadcastFeed: control added - socketId=${socketId}, player=${playerId}`);
  }

  /** The player a control socket acts for, or null for any other socket. */
  public controlPlayerOf(socketId: string): string | null {
    return this.controls.get(socketId) ?? null;
  }

  /** Is this socket one of the feed's (overlay or control)? */
  public owns(socketId: string): boolean {
    return this.connections.has(socketId) || this.controls.has(socketId);
  }

  /** Echo a control command's outcome to the Stream Deck (✓ / ⚠). */
  public sendControlResult(
    socketId: string,
    command: string,
    ok: boolean,
    reason?: string,
  ): void {
    const envelope: Omit<ControlResultEnvelope, 'frameId'> = {
      type: 'control-result',
      command,
      ok,
      ...(reason ? { reason } : {}),
    };
    this.send(socketId, envelope);
  }

  /**
   * Drop a token socket. No-op (cheap) for any other socket —
   * Application calls this for every disconnect.
   */
  public removeConnection(socketId: string): void {
    if (this.controls.delete(socketId)) {
      this.frameCounters.delete(socketId);
      return;
    }
    const playerId = this.connections.get(socketId);
    if (playerId === undefined) return;
    this.connections.delete(socketId);
    this.panelsBySocket.delete(socketId);
    this.frameCounters.delete(socketId);
    console.info(
      `BroadcastFeed: overlay removed - socketId=${socketId}, total=${this.connections.size}`,
    );
    // 1→0 edge for THIS streamer: close their channel reads.
    if (!this.hasSocketsFor(playerId)) {
      this.lastShow.delete(playerId);
      void StreamApi.setOverlayReading(playerId, false);
    }
  }

  public getConnectionCount(): number {
    return this.connections.size;
  }

  /** Install the listeners exactly once. */
  private ensureSubscribed(): void {
    if (this.subscribed) return;
    EventApi.on<{ playerId: string; show: StreamShowCore }>(
      Events.StreamShowChanged,
      ({ playerId, show }) => {
        this.lastShow.set(playerId, show);
        this.pushShowToPlayer(playerId, show);
      },
    );
    // The player count is on every feed: re-send each open show. A
    // streamer whose overlay is waiting gets their snapshot on login.
    EventApi.on<{ playerId: string }>(Events.PlayerLoggedIn, ({ playerId }) => {
      if (this.hasSocketsFor(playerId)) {
        const show = this.residentShow(playerId);
        if (show) this.lastShow.set(playerId, show);
        // Their own channels (and their YouTube login) are readable now.
        void StreamApi.refreshOverlayReading(playerId);
      }
      this.repushAll();
    });
    EventApi.on<{ playerId: string }>(Events.PlayerLoggedOut, () => {
      this.repushAll();
    });
    // A first arrival goes on every streamer's ticker (D7).
    EventApi.on<{ playerId: string; name: string; arrivedFrom: string | null }>(
      Events.PlayerFirstArrival,
      ({ name, arrivedFrom }) => {
        const envelope: Omit<StreamEventEnvelope, 'frameId'> = {
          type: 'stream-event',
          kind: 'new-player',
          name,
          fromStream: arrivedFrom === 'stream',
        };
        for (const socketId of this.connections.keys()) this.send(socketId, envelope);
      },
    );
    // Reactions are world-public already: every overlay gets them.
    EventApi.on<ReactionScopeDeltaPayload>(
      ReactionScopeDeltaEvent.KIND,
      (payload) => {
        const envelope: Omit<ReactionDeltaEnvelope, 'frameId'> = {
          type: 'reaction-delta',
          acts: payload.acts,
        };
        for (const socketId of this.connections.keys()) this.send(socketId, envelope);
      },
    );
    // Chat: a relayed line goes to the overlays of the streamers whose
    // OWN channel it is — a viewer's unrelated tune never matches.
    EventApi.on<RelayMessageEvent>(Events.RelayMessage, (payload) => {
      this.pushRelayChat(payload);
    });
    this.subscribed = true;
  }

  private pushRelayChat(payload: RelayMessageEvent): void {
    const handle = payload.channelHandle.trim().toLowerCase();
    const envelope: Omit<RelayChatEnvelope, 'frameId'> = {
      type: 'relay-chat',
      service: payload.service,
      channelHandle: payload.channelHandle,
      speaker: payload.speaker,
      text: payload.text,
    };
    for (const playerId of new Set(this.connections.values())) {
      const own = StreamApi.channelsFor(playerId)[payload.service];
      if (!own || own.trim().toLowerCase() !== handle) continue;
      for (const [socketId, pid] of this.connections) {
        if (pid === playerId) this.send(socketId, envelope);
      }
    }
  }

  /** The resident streamer's show, or null — never a synthesized one. */
  private residentShow(playerId: string): StreamShowCore | null {
    const avatar = PlayerApi.findAvatarByPlayerId(playerId);
    if (!avatar || !MixinApi.isBroadcastHost(avatar)) return null;
    return avatar.show();
  }

  private repushAll(): void {
    for (const [playerId, show] of this.lastShow) {
      this.pushShowToPlayer(playerId, show);
    }
  }

  private pushShowToPlayer(playerId: string, show: StreamShowCore): void {
    for (const [socketId, pid] of this.connections) {
      if (pid === playerId) this.pushShowTo(socketId, show);
    }
  }

  private pushShowTo(socketId: string, core: StreamShowCore): void {
    const state: StreamShow = {
      ...core,
      playersOnline: SocialApi.online().length,
      build: this.buildStamp(),
      panels: this.panelsBySocket.get(socketId) ?? [],
    };
    const envelope: Omit<StreamStateEnvelope, 'frameId'> = { type: 'stream-state', state };
    this.send(socketId, envelope);
  }

  /**
   * The running build (D7): `SAXONBERG_BUILD_SHA` + `SAXONBERG_BUILD_AT`,
   * written by the deploy. Unset → null, and the overlay hides the line —
   * never a fabricated date.
   */
  private buildStamp(): StreamBuild | null {
    if (this.build !== undefined) return this.build;
    const sha = (process.env.SAXONBERG_BUILD_SHA ?? '').trim();
    const at = (process.env.SAXONBERG_BUILD_AT ?? '').trim();
    this.build = sha && at && !Number.isNaN(Date.parse(at)) ? { sha, at } : null;
    return this.build;
  }

  private hasSocketsFor(playerId: string): boolean {
    for (const pid of this.connections.values()) if (pid === playerId) return true;
    return false;
  }

  /** Stamp the socket's next frame id and send. */
  private send(socketId: string, template: EnvelopeTemplate): void {
    const frameId = (this.frameCounters.get(socketId) ?? 0) + 1;
    this.frameCounters.set(socketId, frameId);
    Backend.get().sendEnvelopeToSocket(socketId, { ...template, frameId } as Envelope);
  }
}
