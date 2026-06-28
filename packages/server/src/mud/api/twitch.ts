/**
 * TwitchApi — thin facade over the {@link TwitchLogic} singleton (the
 * relay surface). Mirrors ChatApi: a stateless static shell forwarding to
 * the hot-reloadable logic singleton at `/obj/api/twitch` via
 * `StuffApi.singletonSync`, decorated by `SecurityApi.decorateApiClass`.
 *
 * Channels are **player-initiated and addressed by Twitch login** — there
 * is no registry. This file homes the relay's call-shape types. The
 * backend integration (Helix login→id lookup, Send Chat Message, EventSub
 * subscribe/unsubscribe) is reached **directly** from `TwitchLogic`, which
 * imports the backend reader (the bridge-in-Api pattern, like
 * `PersistApi`→`PersistenceManager` / `ConnectionLogic`→`ConnectionManager`).
 * No DI port, no boot-time injection.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { TwitchLogic } from '../obj/api/TwitchLogic';
import { fileURLToPath } from 'url';
import type { Stuff } from '../lib/stuff/Stuff';
import type Avatar from '../obj/Avatar';
import type { MessageFrame } from '@saxonberg/types';

const LOGIC_PATH = '/obj/api/twitch';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/TwitchLogic', import.meta.url)
);

/** Resolve the HMR-able TwitchLogic singleton (sync). */
function logic(): TwitchLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'TwitchLogic'
      ) as typeof TwitchLogic | null) ?? TwitchLogic)()
  );
}

/** Result of a tune-by-login. */
export type TwitchTuneResult = {
  ok: boolean;
  broadcasterId?: string;
  login?: string;
  reason?: 'no-relay' | 'unknown-login';
};

/** Outcome of an outbound post (drives the controller's reject-and-point). */
export type TwitchPostResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | 'no-channel'
        | 'empty'
        | 'unlinked'
        | 'unscoped'
        | 'throttled'
        | 'send-failed';
      detail?: string;
    };

/** A normalized inbound message handed from the backend reader to mudlib. */
export interface NormalizedInbound {
  broadcasterId: string;
  senderTwitchUserId: string;
  senderLogin: string;
  senderDisplay: string;
  text: string;
}

export class TwitchApi {
  /** Tune a player in to a Twitch channel by login (lazy resolve + 0→1). */
  static tune(avatar: Avatar, login: string): Promise<TwitchTuneResult> {
    return logic().tune(avatar, login);
  }

  /** Tune a player out by login (1→0 edge). */
  static untune(
    avatar: Avatar,
    login: string
  ): Promise<{ ok: boolean; login?: string; reason?: string }> {
    return logic().untune(avatar, login);
  }

  /** The Twitch logins a player is currently tuned in to. */
  static tunedLoginsFor(avatar: Avatar): Promise<string[]> {
    return logic().tunedLoginsFor(avatar);
  }

  /** Online Avatars tuned in to a channel (by login). */
  static whoTuned(login: string): Promise<Avatar[]> {
    return logic().whoTuned(login);
  }

  /** The history ring for a channel (by login). */
  static historyFor(login: string): Promise<readonly MessageFrame[]> {
    return logic().historyFor(login);
  }

  /** Post outbound to a tuned channel (by login) as the speaker. */
  static post(
    speaker: Stuff,
    login: string,
    text: string
  ): Promise<TwitchPostResult> {
    return logic().post(speaker, login, text);
  }

  /** Inbound entry point — the backend reader's down-call. */
  static dispatchInbound(n: NormalizedInbound): Promise<void> {
    return logic().dispatchInbound(n);
  }

  /**
   * Drop a player from every tuned channel (logout). Returns the
   * broadcaster ids that emptied — the backend reader unsubscribes each.
   */
  static dropPlayer(playerId: string): Promise<string[]> {
    return logic().dropPlayer(playerId);
  }
}

SecurityApi.decorateApiClass(TwitchApi);
