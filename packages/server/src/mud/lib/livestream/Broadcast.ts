/**
 * BroadcastMixin — the stream a played body is running (broadcast-ready D1).
 *
 * ⭐⭐ **The stream belongs to the streamer.** What used to be one
 * server-wide, in-memory `StreamState` singleton is now state on each
 * player's own character, saved by the persistence spine that already
 * saves them: five phases, a standby reason, three deadlines, a topic and
 * an agenda, the streamer's own chat channels and the hashes of the tokens
 * they issued. A restart restores all of it; two streamers never move each
 * other.
 *
 * ```
 * offline ─start─▶ starting ─live─▶ live ◀─back/live─ standby
 *    ▲                 │              │ ╲──away──────────▲
 *    └──── off ◀── ending ◀──end──────┴──────────────────┘
 * ```
 *
 * ⭐ **The mixin decides** (P5): every transition is a method here that
 * refuses BY NAME on an illegal move (`not-streaming`, `ending`, …); the
 * `stream` controller parses and renders. Every change emits
 * `Events.StreamShowChanged { playerId, show }`, which the backend
 * `BroadcastFeed` routes to the sockets opened with this streamer's token,
 * and pushes `stream.state` to the streamer's own client.
 *
 * ⭐ **The projection is an ALLOWLIST** — {@link show} builds the wire
 * shape field by field: the phase and reason, the timers, the topic and
 * agenda, the client's layout and foreground, the VERB of the last command
 * (never its arguments). Nothing of another player, no frame, no card.
 *
 * ⏱ **Wall time, deliberately (D3).** The deadlines are epoch ms and the
 * outro timer is `ScheduleApi` milliseconds: the stream is interface tier,
 * outside the fiction, and its minutes are the audience's. Nothing here
 * reads the world clock. Only `ending → offline` happens on a timer; an
 * Away or Starting countdown that runs out changes nothing (fail closed —
 * only the streamer returns the desktop to the air).
 *
 * Composed on every `Avatar`; the streamer AXIS is the `streamers` group
 * (`AccessApi.isStreamer`), which gates the verb, not the state — most
 * bodies read `offline` forever, as most never fill a calendar.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { HasInteractive } from '../connection/HasInteractive';
import type { ClientState } from '../connection/ClientState';
import type { CommandContributions } from '../../api/command';
import type {
  StreamPhase,
  StreamReason,
  StreamShowCore,
  StreamClientFacts,
  StreamForeground,
  StreamRotation,
} from '@saxonberg/types';
import { STREAM_FOREGROUNDS } from '@saxonberg/types';
import { EventApi } from '../../api/event';
import { Events } from '../events';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../config/AppSettings';
import { MixinApi } from '../../api/mixin';
import { PersistableApi } from '../../api/persistable';
import type { StandbyReason } from './StandbyReason';

/** The chat services a streamer's channels can name. */
export type BroadcastService = 'twitch' | 'youtube' | 'kick';

/** The closed service vocabulary. */
export const BROADCAST_SERVICES: readonly BroadcastService[] = ['twitch', 'youtube', 'kick'];

/** A streamer's own chat channels, one handle per service. */
export type BroadcastChannels = Partial<Record<BroadcastService, string>>;

/** The token scopes a streamer can issue (D4 / D11). */
export type BroadcastTokenScope = 'overlay' | 'control';

/** The closed token-scope vocabulary. */
export const BROADCAST_TOKEN_SCOPES: readonly BroadcastTokenScope[] = ['overlay', 'control'];

/** The refusal words a transition can answer with. */
export type BroadcastRefusal =
  | 'not-streaming'
  | 'ending'
  | 'already-on-air'
  | 'no-agenda'
  | 'agenda-done'
  | 'unknown-panel';

/** A transition's answer: done, or refused by name. */
export type BroadcastResult = { ok: true } | { ok: false; refusal: BroadcastRefusal };

/** The client-state keys whose change moves the overlay. */
const SHOW_KEYS: ReadonlySet<string> = new Set([
  'stream.foreground',
  'cockpit.mode',
  'cockpit.layout',
]);

/** The outro's length when the setting is unreadable. */
const OUTRO_FALLBACK_MS = 60_000;

/** The surface other Stuff (and the controller) speak to. */
export interface BroadcastHost {
  getStreamPhase(): StreamPhase;
  /** On air = starting, live or ending: the phases redaction covers. */
  isOnAir(): boolean;
  startStream(atMs: number | null): BroadcastResult;
  goLive(): BroadcastResult;
  goStandby(reason: StandbyReason, durationMs: number | null): BroadcastResult;
  endStream(): BroadcastResult;
  goOffline(): BroadcastResult;
  nameTopic(topic: string | null): void;
  planAgenda(items: string[]): void;
  advanceStreamAgenda(): BroadcastResult;
  nameChannel(service: BroadcastService, handle: string | null): void;
  getStreamChannels(): BroadcastChannels;
  steerRotation(action: 'pin' | 'skip' | 'clear', key: string | null): BroadcastResult;
  noteVerb(verb: string): void;
  getStreamTokenHash(scope: BroadcastTokenScope): string | null;
  setStreamTokenHash(scope: BroadcastTokenScope, hash: string | null): void;
  show(): StreamShowCore;
  loadControls(extras: Record<string, unknown>): void;
  rearmBroadcast(): void;
}

export function BroadcastMixin<
  TBase extends MixinConstructor<HasInteractive & ClientState>,
>(Base: TBase) {
  class BroadcastMixin extends Base implements BroadcastHost {
    static _mixinName = 'BroadcastMixin';

    static fieldMeta: FieldMeta = {
      streamPhase: { persistent: true, runtimeState: true },
      streamReason: { persistent: true, runtimeState: true },
      streamStartsAt: { persistent: true, runtimeState: true },
      streamAwayUntil: { persistent: true, runtimeState: true },
      streamEndsAt: { persistent: true, runtimeState: true },
      streamTopic: { persistent: true, runtimeState: true },
      streamAgenda: { persistent: true, runtimeState: true },
      streamAgendaIndex: { persistent: true, runtimeState: true },
      streamChannels: { persistent: true, runtimeState: true },
      streamTokenHashes: { persistent: true, runtimeState: true },
    };

    /**
     * ⭐ `stream` is afforded to every played body; `requiresStreamer`
     * on the view gates who may RUN it (the shipped split — the verb's
     * visibility is the host's, its authorization the axis's).
     */
    static commandContributions: CommandContributions = {
      self: ['platform/cmd/stream/stream.yaml', 'platform/cmd/stream/stream-rotation.yaml'],
      peers: [],
      environment: [],
    };

    /** The phase. Persisted. */
    public streamPhase: StreamPhase = 'offline';
    /** The standby reason as resolved at `stream away` — persisted whole,
     *  so a restart needs no document read to show it. */
    public streamReason: StreamReason | null = null;
    public streamStartsAt: number | null = null;
    public streamAwayUntil: number | null = null;
    public streamEndsAt: number | null = null;
    public streamTopic: string | null = null;
    public streamAgenda: string[] = [];
    /** Index of the current agenda item; -1 before the first `next`. */
    public streamAgendaIndex = -1;
    public streamChannels: BroadcastChannels = {};
    /** sha256 hex of the live token per scope — what `stream token` rotates. */
    public streamTokenHashes: Partial<Record<BroadcastTokenScope, string>> = {};

    /** The outro timer — transient, re-armed from `streamEndsAt`. */
    private streamOutroHandle: ScheduleHandle | null = null;
    /** The verb of the last command run on air — transient, verb only. */
    private streamLastVerb: string | null = null;
    /** The lower third's steering from the controls card — transient. */
    private streamRotation: StreamRotation = { pinned: null, skip: [] };
    /** Streamer-only facts merged into `stream.state` (reasons, numbers). */
    private streamExtras: Record<string, unknown> = {};

    public getStreamPhase(): StreamPhase {
      return this.streamPhase;
    }

    public isOnAir(): boolean {
      return (
        this.streamPhase === 'starting' ||
        this.streamPhase === 'live' ||
        this.streamPhase === 'ending'
      );
    }

    /** `stream start [in <dur>]` — Starting Soon, counting to `atMs`. */
    public startStream(atMs: number | null): BroadcastResult {
      if (this.streamPhase === 'ending') return { ok: false, refusal: 'ending' };
      if (this.streamPhase === 'live' || this.streamPhase === 'standby') {
        return { ok: false, refusal: 'already-on-air' };
      }
      this.streamPhase = 'starting';
      this.streamStartsAt = atMs;
      this.streamReason = null;
      this.streamAwayUntil = null;
      this.changed();
      return { ok: true };
    }

    /** `stream live` / `stream back` — the desktop goes on air. */
    public goLive(): BroadcastResult {
      if (this.streamPhase === 'offline') return { ok: false, refusal: 'not-streaming' };
      if (this.streamPhase === 'ending') return { ok: false, refusal: 'ending' };
      this.streamPhase = 'live';
      this.streamStartsAt = null;
      this.streamReason = null;
      this.streamAwayUntil = null;
      this.changed();
      return { ok: true };
    }

    /**
     * `stream away <reason> [<dur>]` — Away, with the reason's copy and a
     * countdown (none for a privacy reason). ⭐ Allowed from `offline` as
     * well (continuity, lens 5): the shipped `stream away 15m` worked with
     * no stream started, and still does.
     */
    public goStandby(reason: StandbyReason, durationMs: number | null): BroadcastResult {
      if (this.streamPhase === 'ending') return { ok: false, refusal: 'ending' };
      this.streamPhase = 'standby';
      this.streamReason = reason.toView();
      this.streamAwayUntil =
        reason.privacy || durationMs === null ? null : Date.now() + durationMs;
      this.streamStartsAt = null;
      this.changed();
      return { ok: true };
    }

    /** `stream end` — the outro, then offline when its timer fires. */
    public endStream(): BroadcastResult {
      if (this.streamPhase === 'offline') return { ok: false, refusal: 'not-streaming' };
      if (this.streamPhase === 'ending') return { ok: false, refusal: 'ending' };
      this.streamPhase = 'ending';
      this.streamEndsAt = Date.now() + this.outroMs();
      this.streamReason = null;
      this.streamAwayUntil = null;
      this.streamStartsAt = null;
      this.armOutro();
      this.changed();
      return { ok: true };
    }

    /** `stream off` (and the outro's fire) — nothing on air. */
    public goOffline(): BroadcastResult {
      this.cancelOutro();
      this.streamPhase = 'offline';
      this.streamReason = null;
      this.streamStartsAt = null;
      this.streamAwayUntil = null;
      this.streamEndsAt = null;
      this.streamLastVerb = null;
      this.streamRotation = { pinned: null, skip: [] };
      this.changed();
      return { ok: true };
    }

    public nameTopic(topic: string | null): void {
      const t = topic?.trim() ?? '';
      this.streamTopic = t.length > 0 ? t : null;
      this.changed();
    }

    public planAgenda(items: string[]): void {
      this.streamAgenda = items.map((i) => i.trim()).filter((i) => i.length > 0);
      this.streamAgendaIndex = this.streamAgenda.length > 0 ? 0 : -1;
      this.changed();
    }

    /** `stream next` — the current item is done; the next is current. */
    public advanceStreamAgenda(): BroadcastResult {
      if (this.streamAgenda.length === 0) return { ok: false, refusal: 'no-agenda' };
      if (this.streamAgendaIndex >= this.streamAgenda.length) {
        return { ok: false, refusal: 'agenda-done' };
      }
      this.streamAgendaIndex += 1;
      this.changed();
      return { ok: true };
    }

    public nameChannel(service: BroadcastService, handle: string | null): void {
      const next: BroadcastChannels = { ...this.streamChannels };
      const h = handle?.trim() ?? '';
      if (h.length > 0) next[service] = h;
      else delete next[service];
      this.streamChannels = next;
      this.changed();
    }

    public getStreamChannels(): BroadcastChannels {
      return { ...this.streamChannels };
    }

    /** `stream-rotation pin|skip|clear [<key>]` — steer the lower third. */
    public steerRotation(
      action: 'pin' | 'skip' | 'clear',
      key: string | null,
    ): BroadcastResult {
      if (action === 'clear') {
        this.streamRotation = { pinned: null, skip: [] };
      } else if (key === null || key.trim() === '') {
        return { ok: false, refusal: 'unknown-panel' };
      } else if (action === 'pin') {
        this.streamRotation = { ...this.streamRotation, pinned: key.trim() };
      } else {
        const skip = new Set(this.streamRotation.skip);
        skip.add(key.trim());
        this.streamRotation = { ...this.streamRotation, skip: [...skip] };
      }
      this.changed();
      return { ok: true };
    }

    /**
     * Remember the VERB of a command run on air (D6) — the verb only; the
     * caller never hands the arguments. Re-emits only when it changed.
     */
    public noteVerb(verb: string): void {
      if (!this.isOnAir() && this.streamPhase !== 'standby') return;
      const v = verb.trim().toLowerCase();
      if (v.length === 0 || v === this.streamLastVerb) return;
      this.streamLastVerb = v;
      this.changed({ persist: false });
    }

    public getStreamTokenHash(scope: BroadcastTokenScope): string | null {
      return this.streamTokenHashes[scope] ?? null;
    }

    public setStreamTokenHash(scope: BroadcastTokenScope, hash: string | null): void {
      const next = { ...this.streamTokenHashes };
      if (hash) next[scope] = hash;
      else delete next[scope];
      this.streamTokenHashes = next;
      this.persist();
    }

    /**
     * Streamer-only facts for the controls card (the reason rows, the
     * viewer numbers) — merged into `stream.state`, NEVER into the feed's
     * {@link show}.
     */
    public loadControls(extras: Record<string, unknown>): void {
      this.streamExtras = { ...this.streamExtras, ...extras };
      this.pushStreamState();
    }

    /** ⭐ The allowlisted projection the overlay receives. */
    public show(): StreamShowCore {
      return {
        phase: this.streamPhase,
        reason: this.streamReason ? { ...this.streamReason } : null,
        startsAt: this.streamStartsAt,
        awayUntil: this.streamAwayUntil,
        endsAt: this.streamEndsAt,
        topic: this.streamTopic,
        agenda: this.streamAgenda.map((title, i) => ({
          title,
          done: i < this.streamAgendaIndex,
        })),
        current: this.streamAgendaIndex < this.streamAgenda.length ? this.streamAgendaIndex : -1,
        client: this.streamPhase === 'offline' ? null : this.clientFacts(),
        rotation: { pinned: this.streamRotation.pinned, skip: [...this.streamRotation.skip] },
      };
    }

    /**
     * Re-arm after a materialize (D3): an `ending` whose deadline passed
     * while the world was down goes offline now; one still running is
     * re-booked. Nothing else re-arms — an Away countdown never moves the
     * phase on its own.
     */
    public rearmBroadcast(): void {
      this.cancelOutro();
      if (this.streamPhase !== 'ending') return;
      if (this.streamEndsAt === null || this.streamEndsAt <= Date.now()) {
        this.goOffline();
        return;
      }
      this.armOutro();
    }

    /**
     * ⭐ A show-relevant client fact (the foreground, the cockpit mode or
     * layout) moves the overlay — re-emit while a stream is up.
     */
    public setClientState(key: string, value: unknown): void {
      super.setClientState(key, value);
      if (SHOW_KEYS.has(key) && this.streamPhase !== 'offline') {
        this.changed({ persist: false });
      }
    }

    /** The streamer's own client facts, read off their client state. */
    private clientFacts(): StreamClientFacts {
      const self = this as unknown as Stuff & ClientState;
      const fg = self.getClientState<unknown>('stream.foreground');
      const foreground = (STREAM_FOREGROUNDS as readonly unknown[]).includes(fg)
        ? (fg as StreamForeground)
        : null;
      const layout = self.getClientState<unknown>('cockpit.layout');
      return {
        foreground,
        mode: MixinApi.isSaxonbergClient(self) ? self.getCockpitMode() : null,
        layout: typeof layout === 'string' ? layout : null,
        lastVerb: this.streamLastVerb,
      };
    }

    private outroMs(): number {
      try {
        const n = Number(AppApi.setting(AppSettingKeys.streamOutroMs));
        return Number.isFinite(n) && n > 0 ? n : OUTRO_FALLBACK_MS;
      } catch {
        return OUTRO_FALLBACK_MS;
      }
    }

    private armOutro(): void {
      this.cancelOutro();
      if (this.streamEndsAt === null) return;
      const delay = Math.max(0, this.streamEndsAt - Date.now());
      this.streamOutroHandle = ScheduleApi.schedule(delay, () => {
        this.streamOutroHandle = null;
        if (this.streamPhase === 'ending') this.goOffline();
      });
    }

    private cancelOutro(): void {
      if (this.streamOutroHandle) ScheduleApi.cancel(this.streamOutroHandle);
      this.streamOutroHandle = null;
    }

    /** Emit the show to the feed, push it to the streamer, save it. */
    private changed(opts: { persist?: boolean } = {}): void {
      const self = this as unknown as Stuff;
      const playerId = self.getPlayerId();
      if (playerId) {
        EventApi.emit(Events.StreamShowChanged, { playerId, show: this.show() });
      }
      this.pushStreamState();
      if (opts.persist !== false) this.persist();
    }

    /** The controls card's state: the show plus the streamer-only extras. */
    private pushStreamState(): void {
      const value = { ...this.show(), ...this.streamExtras };
      super.setClientState('stream.state', value);
      (this as unknown as ClientState).pushClientStateUpdate('stream.state', value);
    }

    /**
     * ⭐ Save now: the overlay must find this state after a restart, and
     * the periodic autosave is minutes away. Guests persist nothing.
     */
    private persist(): void {
      const self = this as unknown as Stuff;
      if (!MixinApi.isPersistable(self) || !self.shouldPersist()) return;
      const key = self.getIdentityPath();
      if (!key) return;
      void PersistableApi.capture(self, key).catch((err: unknown) => {
        console.warn(`BroadcastMixin: saving the stream state failed — ${String(err)}`);
      });
    }
  }
  return BroadcastMixin;
}
