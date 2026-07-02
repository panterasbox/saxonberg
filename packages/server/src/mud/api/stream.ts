/**
 * StreamApi — thin facade over the {@link StreamLogic} singleton (the
 * unified relay + tuning surface). A stateless static shell forwarding to
 * the hot-reloadable logic singleton at `/obj/api/stream` via
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
import { SecurityApi } from './security';
import { StreamLogic } from '../obj/api/StreamLogic';
import { fileURLToPath } from 'url';
import type { Stuff } from '../lib/stuff/Stuff';
import type Avatar from '../obj/Avatar';
import type { MessageFrame } from '@saxonberg/types';
import type { StreamerTarget, ParsedTarget } from '../lib/streaming/StreamerTarget';
import type { RelayChannelRef } from '../obj/StreamRelay';

const LOGIC_PATH = '/obj/api/stream';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/StreamLogic', import.meta.url),
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
  | { ok: true; service: 'twitch' | 'youtube'; handle: string }
  | { ok: false; reason: TuneReason };

/** Outcome of resolving a YouTube `@handle`/`UC…` to its channelId (watch). */
export type YoutubeChannelResult =
  | { ok: true; channelId: string }
  | { ok: false; reason: 'no-relay' | 'unknown-target' };

/** Outcome of an untune. */
export type UntuneResult = {
  ok: boolean;
  service?: 'twitch' | 'youtube';
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
   * Resolve a parsed target into a transport channel (Twitch login→id over
   * the network, character→linked login over the DB). YouTube resolution
   * lands in P3.
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
    service: 'twitch' | 'youtube',
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
    service: 'twitch' | 'youtube',
    handle: string,
  ): Promise<Avatar[]> {
    return logic().whoTuned(service, handle);
  }

  /** The history ring for a channel (by service + handle). */
  static historyFor(
    service: 'twitch' | 'youtube',
    handle: string,
  ): Promise<readonly MessageFrame[]> {
    return logic().historyFor(service, handle);
  }

  /** Post outbound to a tuned channel as the speaker (Twitch only). */
  static post(
    speaker: Stuff,
    service: 'twitch' | 'youtube',
    handle: string,
    text: string,
  ): Promise<PostResult> {
    return logic().post(speaker, service, handle, text);
  }

  /** Inbound entry point — a backend reader's down-call. */
  static dispatchInbound(
    service: 'twitch' | 'youtube',
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
    service: 'twitch' | 'youtube',
    key: string,
  ): Promise<void> {
    return logic().dropChannel(service, key);
  }

  /**
   * Resolve a YouTube `@handle` / `UC…` to its channelId — the durable
   * `watch` embed target (`live_stream?channel=`). Reuses the P3 reader
   * credential; reader-unconfigured → `no-relay`.
   */
  static resolveYoutubeChannelId(ref: string): Promise<YoutubeChannelResult> {
    return logic().resolveYoutubeChannelId(ref);
  }

  /**
   * Open (`on=true`) / close (`on=false`) the overlay owner's own-channel
   * reads via the sentinel-tune presence edge. Wired in P4 (overlay chat
   * forwarding); a no-op until then.
   */
  static setOverlayReading(on: boolean): Promise<void> {
    return logic().setOverlayReading(on);
  }
}

SecurityApi.decorateApiClass(StreamApi);
