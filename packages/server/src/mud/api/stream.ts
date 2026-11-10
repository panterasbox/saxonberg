/**
 * StreamApi — thin facade over the {@link StreamLogic} singleton (the
 * unified relay + tuning surface). A stateless static shell forwarding to
 * the hot-reloadable logic singleton at `/platform/idea/api/stream` via
 * `StuffApi.singletonSync`, decorated by `SecurityApi.decorateApiClass`.
 *
 * The player-facing surface is **platform-agnostic** — `tune`/`watch`, the
 * target grammar, `list`/`who`/`history`, the `RelaySpeaker` union — over one
 * `StreamRelay` state table. Only the backend *transports* stay per-platform
 * (Twitch EventSub multiplex vs YouTube per-liveChatId stream). This file
 * homes the relay's call-shape types. The backend integration is reached
 * **directly** from `StreamLogic`, which imports the backend readers (the
 * bridge-in-Api pattern, like `ConnectionLogic`→`ConnectionManager`). No DI
 * port, no boot-time injection.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { StreamLogic } from '../platform/idea/api/StreamLogic';
import { fileURLToPath } from 'url';
import type { Stuff } from '../lib/stuff/Stuff';
import type Avatar from '../lib/character/Avatar';
import type { MessageFrame } from '@saxonberg/types';
import type { StreamerTarget, ParsedTarget } from '../lib/streaming/StreamerTarget';
import type { RelayChannelRef } from '../platform/idea/StreamRelay';
import { SecurityApi } from './security';
import type { StandbyReason, StandbyReading } from '../lib/livestream/StandbyReason';
import type { StreamPanelRow } from '@saxonberg/types';
import type {
  BroadcastChannels,
  BroadcastHost,
  BroadcastTokenScope,
} from '../lib/livestream/Broadcast';

const LOGIC_PATH = '/platform/idea/api/stream';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/StreamLogic', import.meta.url),
);

/** Resolve the HMR-able StreamLogic singleton (sync). */
function logic(): StreamLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'StreamLogic',
      ) as typeof StreamLogic | null) ?? StreamLogic)(),
  );
}

/** A fully-resolved streamer target (re-exported for the controllers). */
export type { StreamerTarget, ParsedTarget, RelayChannelRef };

/** Why a resolve / tune failed — drives the controller reject-and-point. */
export type TuneReason =
  | 'no-relay'
  | 'unknown-target'
  | 'unknown-character'
  | 'unlinked'
  | 'ambiguous-handle'
  | 'character-youtube'
  | 'url-opt-conflict'
  | 'empty'
  | 'not-live'
  | 'read-only';

/** Outcome of resolving a {@link ParsedTarget} into a transport channel. */
export type ResolveResult =
  | { ok: true; target: StreamerTarget }
  | { ok: false; reason: TuneReason };

/** Outcome of a tune (add + subscribe). */
export type TuneResult =
  | { ok: true; service: 'twitch' | 'youtube' | 'kick'; handle: string }
  | { ok: false; reason: TuneReason };

/** Outcome of resolving a YouTube `@handle`/`UC…` to its channelId (watch). */
export type YoutubeChannelResult =
  | { ok: true; channelId: string }
  | { ok: false; reason: 'no-relay' | 'unknown-target' };

/** Outcome of an untune. */
export type UntuneResult = {
  ok: boolean;
  service?: 'twitch' | 'youtube' | 'kick';
  handle?: string;
  reason?: TuneReason;
};

/** Outcome of an outbound post (drives the controller's reject-and-point). */
export type PostResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'no-channel'
        | 'empty'
        | 'unlinked'
        | 'unscoped'
        | 'throttled'
        | 'send-failed'
        | 'read-only';
      detail?: string;
    };

/**
 * A normalized inbound message handed from a backend reader to mudlib.
 * Platform-agnostic: `channelKey` is the transport key (broadcasterId /
 * liveChatId), `senderUserId` the platform user id (echo-suppress key).
 */
export interface NormalizedInbound {
  channelKey: string;
  senderUserId: string;
  senderLogin: string;
  senderDisplay: string;
  text: string;
}

export class StreamApi {
  /**
   * Resolve a parsed target into a transport channel — Twitch login→id over
   * the network, YouTube handle/URL→channel, character→linked login over the
   * DB.
   */
  static resolveTarget(parsed: ParsedTarget): Promise<ResolveResult> {
    return logic().resolveTarget(parsed);
  }

  /** Tune a player in to a resolved channel (lazy add + 0→1 subscribe). */
  static tune(avatar: Avatar, target: StreamerTarget): Promise<TuneResult> {
    return logic().tune(avatar, target);
  }

  /** Tune a player out by service + handle (1→0 edge). */
  static untune(
    avatar: Avatar,
    service: 'twitch' | 'youtube' | 'kick',
    handle: string,
  ): Promise<UntuneResult> {
    return logic().untune(avatar, service, handle);
  }

  /** The channels a player is currently tuned in to. */
  static tunedTargetsFor(avatar: Avatar): Promise<RelayChannelRef[]> {
    return logic().tunedTargetsFor(avatar);
  }

  /** Online Avatars tuned in to a channel (by service + handle). */
  static whoTuned(
    service: 'twitch' | 'youtube' | 'kick',
    handle: string,
  ): Promise<Avatar[]> {
    return logic().whoTuned(service, handle);
  }

  /** The history ring for a channel (by service + handle). */
  static historyFor(
    service: 'twitch' | 'youtube' | 'kick',
    handle: string,
  ): Promise<readonly MessageFrame[]> {
    return logic().historyFor(service, handle);
  }

  /** Post outbound to a tuned channel as the speaker (Twitch only). */
  static post(
    speaker: Stuff,
    service: 'twitch' | 'youtube' | 'kick',
    handle: string,
    text: string,
  ): Promise<PostResult> {
    return logic().post(speaker, service, handle, text);
  }

  /** Inbound entry point — a backend reader's down-call. */
  static dispatchInbound(
    service: 'twitch' | 'youtube' | 'kick',
    n: NormalizedInbound,
  ): Promise<void> {
    return logic().dispatchInbound(service, n);
  }

  /**
   * Drop a player from every tuned channel (logout). Returns the channels
   * that emptied — each is unsubscribed on its transport.
   */
  static dropPlayer(playerId: string): Promise<RelayChannelRef[]> {
    return logic().dropPlayer(playerId);
  }

  /**
   * Drop an entire channel (a YouTube stream ended) and notice the tuned-in
   * players. The backend reader calls this from its stream-end detection.
   */
  static dropChannel(
    service: 'twitch' | 'youtube' | 'kick',
    key: string,
  ): Promise<void> {
    return logic().dropChannel(service, key);
  }

  /**
   * Resolve a YouTube `@handle` / `UC…` to its channelId — the durable
   * `watch` embed target (`live_stream?channel=`). Reuses the YouTube reader
   * credential; reader-unconfigured → `no-relay`.
   */
  static resolveYoutubeChannelId(ref: string): Promise<YoutubeChannelResult> {
    return logic().resolveYoutubeChannelId(ref);
  }

  /**
   * Open (`on=true`) / close (`on=false`) the overlay owner's own-channel
   * reads via the sentinel-tune presence edge — the overlay chat forwarding
   * seam, driven as broadcast overlays connect / disconnect.
   */
  static setOverlayReading(playerId: string, on: boolean): Promise<void> {
    return logic().setOverlayReading(playerId, on);
  }

  /**
   * Read a `stream away` operand: a bare duration is the generic reason;
   * a word is a reason row, optionally followed by an overriding duration.
   */
  static interpretAway(first: string, second?: string): Promise<StandbyReading> {
    return logic().interpretAway(first, second);
  }

  /** Every installed standby reason (the controls card's picker). */
  static standbyReasons(): Promise<StandbyReason[]> {
    return logic().standbyReasons();
  }

  /** Every installed lower-third panel row (the feed's `panels`). */
  static lowerThirdPanels(): Promise<StreamPanelRow[]> {
    return logic().lowerThirdPanels();
  }

  /** A shell-style duration (`15m`, `1h30m`, `90s`; bare = minutes) in ms, or null. */
  static parseDuration(word: string): number | null {
    return logic().parseDuration(word);
  }

  /** A compact label for a span (`1h 30m`, `5m`, `45s`). */
  static formatDuration(ms: number): string {
    return logic().formatDuration(ms);
  }

  /**
   * Keep `playerId`'s own numbers (viewers, uptime, chat rate, who is
   * online) coming to their controls card while they are on air (D16).
   */
  static watchNumbers(playerId: string): void {
    logic().watchNumbers(playerId);
  }

  /** Re-open `playerId`'s channel reads after `stream channel` changed them. */
  static refreshOverlayReading(playerId: string): Promise<void> {
    return logic().refreshOverlayReading(playerId);
  }

  /**
   * The chat channels `playerId`'s overlay shows — their body's own, else
   * (the founder) the `OVERLAY_*` env seed. The feed's relay filter.
   */
  static channelsFor(playerId: string): BroadcastChannels {
    return logic().channelsFor(playerId);
  }

  /**
   * Issue (or rotate) `host`'s stream token for `scope` — returned once,
   * stored only as its hash (broadcast-ready D4). The `stream token` verb.
   */
  static issueToken(host: Stuff & BroadcastHost, scope: BroadcastTokenScope): Promise<string> {
    return logic().issueToken(host, scope);
  }

  /**
   * The player and scope a raw stream token names, or null — the WS
   * upgrade's lookup (a hash and a path read).
   */
  static resolveToken(
    raw: string,
  ): Promise<{ playerId: string; scope: BroadcastTokenScope } | null> {
    return logic().resolveToken(raw);
  }
}

SecurityApi.decorateApiClass(StreamApi);
