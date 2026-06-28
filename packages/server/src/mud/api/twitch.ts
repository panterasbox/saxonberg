/**
 * TwitchApi — thin facade over the {@link TwitchLogic} singleton (the
 * relay surface). Mirrors ChatApi: a stateless static shell forwarding to
 * the hot-reloadable logic singleton at `/obj/api/twitch` via
 * `StuffApi.singletonSync`, decorated by `SecurityApi.decorateApiClass`.
 *
 * This file also homes the relay's call-shape types — including the
 * **outbound DI port** (`TwitchRelayPort`), the sanctioned backend→mudlib
 * injection the outbound path uses to reach the backend `TwitchClient`
 * (mud/ cannot import backend/). The port is installed at boot via
 * {@link TwitchApi.installRelayPort}.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import { TwitchLogic } from '../obj/api/TwitchLogic';
import { fileURLToPath } from 'url';
import type { Stuff } from '../lib/stuff/Stuff';
import type Avatar from '../obj/Avatar';
import type { TwitchChannel } from '../lib/twitch/TwitchChannel';
import type { TwitchProfile } from '../lib/identity/TwitchProfile';
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

/**
 * The outbound DI port — implemented in `backend/` over `TwitchClient` and
 * installed at boot. `send` resolves the poster's token and performs the
 * stateless Helix Send Chat Message; the mudlib never imports the client.
 */
export interface TwitchRelayPort {
  send(opts: {
    broadcasterId: string;
    profile: TwitchProfile;
    text: string;
  }): Promise<{ ok: boolean; error?: string }>;
}

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
  /** Resolve a relayed channel by broadcasterId, login, or label. */
  static resolveChannel(key: string): Promise<TwitchChannel | null> {
    return logic().resolveChannel(key);
  }

  /** All relayed channels in the registry. */
  static allChannels(): Promise<TwitchChannel[]> {
    return logic().allChannels();
  }

  /** Tune an Avatar in to a relayed channel (fires presence on 0→1). */
  static tune(
    avatar: Avatar,
    key: string
  ): Promise<{ ok: boolean; channel?: TwitchChannel; reason?: string }> {
    return logic().tune(avatar, key);
  }

  /** Tune an Avatar out (fires presence on 1→0). */
  static untune(
    avatar: Avatar,
    key: string
  ): Promise<{ ok: boolean; channel?: TwitchChannel; reason?: string }> {
    return logic().untune(avatar, key);
  }

  /** The relayed channels an Avatar is tuned in to. */
  static tunedChannelsFor(avatar: Avatar): Promise<TwitchChannel[]> {
    return logic().tunedChannelsFor(avatar);
  }

  /** Avatars currently tuned in to a channel. */
  static whoTuned(broadcasterId: string): Promise<Avatar[]> {
    return logic().whoTuned(broadcasterId);
  }

  /** The history ring for a channel. */
  static historyFor(broadcasterId: string): Promise<readonly MessageFrame[]> {
    return logic().historyFor(broadcasterId);
  }

  /** Post outbound to a relayed channel as the speaker (send → mirror). */
  static post(
    speaker: Stuff,
    key: string,
    text: string
  ): Promise<TwitchPostResult> {
    return logic().post(speaker, key, text);
  }

  /** Inbound entry point — the backend reader's down-call. */
  static dispatchInbound(n: NormalizedInbound): Promise<void> {
    return logic().dispatchInbound(n);
  }

  /** Install (or clear) the outbound DI port. Called at boot. */
  static installRelayPort(port: TwitchRelayPort | null): Promise<void> {
    return logic().installRelayPort(port);
  }
}

SecurityApi.decorateApiClass(TwitchApi);
