// StreamLogic — the hot-reloadable logic singleton behind StreamApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { PlayerApi } from '../../api/player';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import StreamRelayClass from '../StreamRelay';
import { User } from '../../lib/identity/User';
import { TwitchProfile } from '../../lib/identity/TwitchProfile';
import { StreamerTarget } from '../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../lib/streaming/StreamerTarget';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Avatar from '../Avatar';
import type StreamRelay from '../StreamRelay';
import type { RelayChannelRef } from '../StreamRelay';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';
import { TWITCH_SCOPE_WRITE_CHAT } from '@saxonberg/types';
import { TwitchRelayReader } from '../../../backend/TwitchRelayReader';
import { YoutubeRelayReader } from '../../../backend/YoutubeRelayReader';
import type {
  PostResult,
  ResolveResult,
  TuneResult,
  UntuneResult,
  NormalizedInbound,
  YoutubeChannelResult,
} from '../../api/stream';

type Service = 'twitch' | 'youtube';

const RELAY_PATH = '/obj/StreamRelay';
const StreamApiCallers = SecurityPolicies.FromModule('/api/stream#StreamApi');

/**
 * StreamLogic — the gated logic singleton behind {@link StreamApi}, at
 * `/obj/api/stream`. Stateless (no `PostRegistrationMixin`); every method
 * resolves the {@link StreamRelay} state singleton via the module-private
 * `requireRelay` and gates on `FromModule('/api/stream#StreamApi')`. Channels
 * are addressed by `(service, handle)`; each transport is reached directly —
 * Twitch via {@link TwitchRelayReader}, YouTube via `YoutubeRelayReader`.
 *
 * @internal
 */
@Unshadowable
export class StreamLogic extends ApiLogic {
  /**
   * See {@link StreamApi.resolveTarget}. The async resolver (D2): URL/handle
   * → direct login resolve; character → linked-login walk. Pure parsing
   * lives on `StreamerTarget.parse`; this does the network / DB work.
   */
  @CallSecurity(StreamApiCallers)
  public async resolveTarget(parsed: ParsedTarget): Promise<ResolveResult> {
    if (parsed.form === 'reject') {
      return { ok: false, reason: parsed.reason };
    }
    if (parsed.form === 'character') {
      return this.resolveCharacter(parsed.identifier);
    }
    // url / handle forms carry the platform.
    if (parsed.platform === 'youtube') {
      return this.resolveYoutube(parsed.identifier);
    }
    // Twitch: the identifier is a channel login.
    return this.resolveTwitchLogin(parsed.identifier);
  }

  /** See {@link StreamApi.tune}. Add + drive the 0→1 subscribe. */
  @CallSecurity(StreamApiCallers)
  public async tune(
    avatar: Avatar,
    target: StreamerTarget,
  ): Promise<TuneResult> {
    const relay = await requireRelay();
    const playerId = avatar.getPlayerId();
    const opened = relay.addTuned(
      playerId,
      target.platform,
      target.key,
      target.handle,
    );
    if (opened) {
      if (target.platform === 'twitch') {
        TwitchRelayReader.get().subscribe(target.key);
      } else {
        await YoutubeRelayReader.get().subscribe(target.key);
      }
    }
    return { ok: true, service: target.platform, handle: target.handle };
  }

  /** See {@link StreamApi.untune}. On the 1→0 edge, unsubscribe. */
  @CallSecurity(StreamApiCallers)
  public async untune(
    avatar: Avatar,
    service: Service,
    handle: string,
  ): Promise<UntuneResult> {
    const relay = await requireRelay();
    const lower = handle.trim().toLowerCase();
    const res = relay.removeTuned(avatar.getPlayerId(), service, lower);
    if (res.emptied && res.key) {
      unsubscribeReader(res.service ?? service, res.key);
    }
    return {
      ok: res.ok,
      service,
      handle: lower,
      reason: res.ok ? undefined : 'unknown-target',
    };
  }

  /**
   * See {@link StreamApi.dropPlayer}. Drops the player from every channel
   * and unsubscribes each emptied channel on its transport (centralized here
   * so a single `PlayerLoggedOut` observer covers both readers).
   */
  @CallSecurity(StreamApiCallers)
  public async dropPlayer(playerId: string): Promise<RelayChannelRef[]> {
    const emptied = (await requireRelay()).dropPlayer(playerId);
    for (const ref of emptied) unsubscribeReader(ref.service, ref.key);
    return emptied;
  }

  /**
   * See {@link StreamApi.dropChannel}. A YouTube stream ended: drop the whole
   * channel and notice the tuned-in players.
   */
  @CallSecurity(StreamApiCallers)
  public async dropChannel(service: Service, key: string): Promise<void> {
    const relay = await requireRelay();
    const channel = relay.channelByKey(service, key);
    const players = relay.dropChannel(service, key);
    if (players.length === 0) return;
    const handle = channel?.handle ?? key;
    const body = Mml.compose`\n${service} #${handle} — the stream ended.\n`;
    for (const playerId of players) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (!avatar) continue;
      MessageApi.sendMessage(avatar, {
        id: `stream-end-${key}-${playerId}`,
        topic: `world.${service}.message`,
        tags: ['audience:witness'],
        body: body.toString(),
        meta: { timestamp: Date.now(), channelId: key },
      });
    }
  }

  /**
   * See {@link StreamApi.resolveYoutubeChannelId}. `@handle`/`UC…` →
   * channelId for the `watch` embed (the D4=(c) durable form). Reader
   * unconfigured → `no-relay`.
   */
  @CallSecurity(StreamApiCallers)
  public async resolveYoutubeChannelId(
    ref: string,
  ): Promise<YoutubeChannelResult> {
    const reader = YoutubeRelayReader.get();
    if (!reader.isConfigured()) return { ok: false, reason: 'no-relay' };
    const channelId = await reader.resolveChannelId(ref);
    if (channelId === 'unknown') return { ok: false, reason: 'unknown-target' };
    return { ok: true, channelId };
  }

  /** See {@link StreamApi.tunedTargetsFor}. */
  @CallSecurity(StreamApiCallers)
  public async tunedTargetsFor(avatar: Avatar): Promise<RelayChannelRef[]> {
    return (await requireRelay()).tunedChannelsFor(avatar.getPlayerId());
  }

  /** See {@link StreamApi.whoTuned}. */
  @CallSecurity(StreamApiCallers)
  public async whoTuned(service: Service, handle: string): Promise<Avatar[]> {
    const relay = await requireRelay();
    const channel = relay.resolveByHandle(service, handle.trim().toLowerCase());
    if (!channel) return [];
    const out: Avatar[] = [];
    for (const playerId of relay.whoTuned(service, channel.key)) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (avatar) out.push(avatar);
    }
    return out;
  }

  /** See {@link StreamApi.historyFor}. */
  @CallSecurity(StreamApiCallers)
  public async historyFor(
    service: Service,
    handle: string,
  ): Promise<readonly MessageFrame[]> {
    const relay = await requireRelay();
    const channel = relay.resolveByHandle(service, handle.trim().toLowerCase());
    if (!channel) return [];
    return relay.historyFor(service, channel.key);
  }

  /** See {@link StreamApi.post}. Twitch only — YouTube is read-only. */
  @CallSecurity(StreamApiCallers)
  public async post(
    speaker: Stuff,
    service: Service,
    handle: string,
    text: string,
  ): Promise<PostResult> {
    if (service !== 'twitch') return { ok: false, reason: 'read-only' };
    const relay = await requireRelay();
    // You must tune in (which resolves + caches the handle) before posting.
    const channel = relay.resolveByHandle('twitch', handle.trim().toLowerCase());
    if (!channel) return { ok: false, reason: 'no-channel' };
    const body = text.trim();
    if (!body) return { ok: false, reason: 'empty' };

    if (!PlayerApi.isAvatarStuff(speaker)) {
      return { ok: false, reason: 'unlinked' };
    }
    const user = speaker.getUser();
    if (!user?.twitchProfileId) return { ok: false, reason: 'unlinked' };
    const profile = await TwitchProfile.findById<TwitchProfile>(
      user.twitchProfileId,
    );
    if (!profile) return { ok: false, reason: 'unlinked' };
    if (!profile.hasScope(TWITCH_SCOPE_WRITE_CHAT)) {
      return { ok: false, reason: 'unscoped' };
    }

    if (!relay.tryAcquireSend(speaker.getPlayerId())) {
      return { ok: false, reason: 'throttled' };
    }
    const result = await TwitchRelayReader.get().send({
      broadcasterId: channel.key,
      profile,
      text: body,
    });
    if (!result.ok) {
      return { ok: false, reason: 'send-failed', detail: result.error };
    }

    // Mirror in-game (case-1 speaker, egress) only AFTER a successful send,
    // and tag the echo so the reader drops our own read-back.
    relay.deliver(
      'twitch',
      channel.key,
      channel.handle,
      { kind: 'in-game', ref: MessageApi.refOf(speaker) },
      body,
      true,
    );
    relay.noteEcho(profile.twitchUserId, body);
    return { ok: true };
  }

  /** See {@link StreamApi.dispatchInbound}. */
  @CallSecurity(StreamApiCallers)
  public async dispatchInbound(
    service: Service,
    n: NormalizedInbound,
  ): Promise<void> {
    const relay = await requireRelay();
    // Suppress the echo of our own outbound post.
    if (relay.isEcho(n.senderUserId, n.text)) return;
    const channel = relay.channelByKey(service, n.channelKey);
    if (!channel) return; // nobody tuned in to this channel
    const speaker = await resolveSpeaker(service, n.senderUserId, n.senderDisplay);
    relay.deliver(service, n.channelKey, channel.handle, speaker, n.text, false);
  }

  /**
   * See {@link StreamApi.setOverlayReading}. Open (`on=true`) / close the
   * overlay owner's OWN-channel reads by sentinel-tuning the `OVERLAY_*`
   * channels — reusing the presence edge so the reader opens, independent of
   * any player `tune`. Twitch resolves the login; YouTube resolves the
   * current live broadcast + starts a light live-status poll to catch a
   * stream restart. Idempotent on the current on/off state.
   */
  @CallSecurity(StreamApiCallers)
  public async setOverlayReading(on: boolean): Promise<void> {
    if (on === overlayReading) return;
    overlayReading = on;
    const relay = await requireRelay();
    if (on) {
      await openOverlayTwitch(relay);
      await openOverlayYoutube(relay);
      startOverlayYoutubePoll();
    } else {
      stopOverlayYoutubePoll();
      closeOverlayTwitch(relay);
      closeOverlayYoutube(relay);
    }
  }

  // ---- resolution helpers (private) --------------------------------------

  /** Resolve a Twitch login (cache-first) to a channel target. */
  private async resolveTwitchLogin(login: string): Promise<ResolveResult> {
    const relay = await requireRelay();
    const lower = login.trim().toLowerCase();
    const cached = relay.resolveByHandle('twitch', lower);
    if (cached) {
      return {
        ok: true,
        target: new StreamerTarget('twitch', cached.key, cached.handle),
      };
    }
    const reader = TwitchRelayReader.get();
    if (!reader.isConfigured()) return { ok: false, reason: 'no-relay' };
    const r = await reader.resolveLogin(lower);
    if (!r) return { ok: false, reason: 'unknown-target' };
    return {
      ok: true,
      target: new StreamerTarget('twitch', r.broadcasterId, r.login),
    };
  }

  /**
   * Resolve a YouTube channel/video ref to its current live chat (live-only
   * bind). `identifier` is the display handle; the key is the liveChatId.
   */
  private async resolveYoutube(identifier: string): Promise<ResolveResult> {
    const reader = YoutubeRelayReader.get();
    if (!reader.isConfigured()) return { ok: false, reason: 'no-relay' };
    const resolved = await reader.resolveChannel(identifier);
    if (resolved === 'unknown') return { ok: false, reason: 'unknown-target' };
    if (resolved === 'not-live') return { ok: false, reason: 'not-live' };
    return {
      ok: true,
      target: new StreamerTarget('youtube', resolved.liveChatId, identifier),
    };
  }

  /**
   * Resolve a character/MQL identifier to its linked Twitch channel. v1:
   * match an online Avatar by name, then walk User→TwitchProfile.login.
   * (Character→YouTube is a non-goal — GoogleProfile stores no channel.)
   */
  private async resolveCharacter(identifier: string): Promise<ResolveResult> {
    const name = identifier.replace(/^@/, '').trim().toLowerCase();
    if (!name) return { ok: false, reason: 'unknown-character' };
    const avatar = PlayerApi.getAllAvatars().find((a) => {
      const n = a.getName()?.toLowerCase();
      return n === name || a.getPresentation().toLowerCase() === name;
    });
    if (!avatar) return { ok: false, reason: 'unknown-character' };
    const user = avatar.getUser();
    if (!user?.twitchProfileId) return { ok: false, reason: 'unlinked' };
    const profile = await TwitchProfile.findById<TwitchProfile>(
      user.twitchProfileId,
    );
    if (!profile?.login) return { ok: false, reason: 'unlinked' };
    const resolved = await this.resolveTwitchLogin(profile.login);
    if (!resolved.ok) return resolved;
    return {
      ok: true,
      target: new StreamerTarget(
        'twitch',
        resolved.target.key,
        resolved.target.handle,
        MessageApi.refOf(avatar),
      ),
    };
  }
}

/** Unsubscribe a channel on its transport's backend reader. */
function unsubscribeReader(service: Service, key: string): void {
  if (service === 'twitch') TwitchRelayReader.get().unsubscribe(key);
  else YoutubeRelayReader.get().unsubscribe(key);
}

// ---- overlay-owner reading -----------------------------------------------
// The owner's own external channels are env config (single-owner model). The
// sentinel is `addTuned` to them so the reader opens via the presence edge;
// delivered lines carry the configured handle, which `BroadcastFeed` filters
// to before forwarding. State is module-level (the overlay is a global,
// single-feed / single-owner concern) — note it resets on HMR (orphaning the
// poll handle + sentinel tune), but a broadcast reconnect re-drives
// `setOverlayReading`, which re-establishes both.

let overlayReading = false;
let overlayYoutubePoll: ScheduleHandle | null = null;
/** The liveChatId the sentinel is currently reading for the owner's YouTube. */
let overlayYoutubeKey: string | null = null;

function overlayTwitchLogin(): string {
  return (process.env.OVERLAY_TWITCH_LOGIN ?? '').trim().toLowerCase();
}

function overlayYoutubeChannel(): string {
  return (process.env.OVERLAY_YOUTUBE_CHANNEL ?? '').trim();
}

const OVERLAY_SENTINEL = StreamRelayClass.OVERLAY_SENTINEL;

async function openOverlayTwitch(relay: StreamRelay): Promise<void> {
  const login = overlayTwitchLogin();
  if (!login) return;
  const reader = TwitchRelayReader.get();
  if (!reader.isConfigured()) return;
  let key = relay.resolveByHandle('twitch', login)?.key;
  if (!key) {
    const r = await reader.resolveLogin(login);
    if (!r) return;
    key = r.broadcasterId;
  }
  if (relay.addTuned(OVERLAY_SENTINEL, 'twitch', key, login)) {
    reader.subscribe(key);
  }
}

function closeOverlayTwitch(relay: StreamRelay): void {
  const login = overlayTwitchLogin();
  if (!login) return;
  const res = relay.removeTuned(OVERLAY_SENTINEL, 'twitch', login);
  if (res.emptied && res.key) TwitchRelayReader.get().unsubscribe(res.key);
}

async function openOverlayYoutube(relay: StreamRelay): Promise<void> {
  const chan = overlayYoutubeChannel();
  if (!chan) return;
  const reader = YoutubeRelayReader.get();
  if (!reader.isConfigured()) return;
  const resolved = await reader.resolveChannel(chan);
  if (typeof resolved === 'string') return; // not-live / unknown → poll catches it
  const key = resolved.liveChatId;
  if (relay.addTuned(OVERLAY_SENTINEL, 'youtube', key, chan)) {
    await reader.subscribe(key);
  }
  overlayYoutubeKey = key;
}

function closeOverlayYoutube(relay: StreamRelay): void {
  overlayYoutubeKey = null;
  const chan = overlayYoutubeChannel();
  if (!chan) return;
  const res = relay.removeTuned(OVERLAY_SENTINEL, 'youtube', chan);
  if (res.emptied && res.key) YoutubeRelayReader.get().unsubscribe(res.key);
}

/**
 * A light live-status poll re-resolving the owner's YouTube channel to catch
 * a stream restart (a new `activeLiveChatId`). Single channel; a `search.list`
 * is quota-costly, so the interval is deliberately slow (AppSetting).
 */
function startOverlayYoutubePoll(): void {
  if (overlayYoutubePoll) return;
  const chan = overlayYoutubeChannel();
  if (!chan) return;
  overlayYoutubePoll = ScheduleApi.recurring(overlayPollIntervalMs(), () => {
    void reresolveOverlayYoutube();
  });
}

function stopOverlayYoutubePoll(): void {
  if (!overlayYoutubePoll) return;
  ScheduleApi.cancel(overlayYoutubePoll);
  overlayYoutubePoll = null;
}

async function reresolveOverlayYoutube(): Promise<void> {
  if (!overlayReading) return;
  const chan = overlayYoutubeChannel();
  const reader = YoutubeRelayReader.get();
  if (!chan || !reader.isConfigured()) return;
  const relay = await requireRelay();
  const resolved = await reader.resolveChannel(chan);
  const newKey = typeof resolved === 'string' ? null : resolved.liveChatId;
  if (newKey === overlayYoutubeKey) return; // unchanged
  // The owner restarted (or went offline). Drop the sentinel from the old
  // stream (by exact key — the handle cache may have moved), then bind the new.
  if (overlayYoutubeKey) {
    const res = relay.removeTunedByKey(OVERLAY_SENTINEL, 'youtube', overlayYoutubeKey);
    if (res.emptied) YoutubeRelayReader.get().unsubscribe(overlayYoutubeKey);
  }
  overlayYoutubeKey = newKey;
  if (newKey) {
    if (relay.addTuned(OVERLAY_SENTINEL, 'youtube', newKey, chan)) {
      await reader.subscribe(newKey);
    }
  }
}

function overlayPollIntervalMs(): number {
  try {
    const n = Number(AppApi.setting(AppSettingKeys.youtubeOverlayPollIntervalMs));
    return Number.isFinite(n) && n > 0 ? n : 900_000;
  } catch {
    return 900_000;
  }
}

let relayRef: StreamRelay | null = null;

async function requireRelay(): Promise<StreamRelay> {
  if (relayRef) return relayRef;
  const found = StuffApi.findByTemplatePath<StreamRelay>(RELAY_PATH);
  if (found) {
    relayRef = found;
    return found;
  }
  relayRef = await StuffApi.singleton<StreamRelay>(RELAY_PATH);
  return relayRef;
}

/**
 * Resolve the relay speaker for an inbound line. Twitch: a linked player
 * with an online Avatar → `external-linked` (carries the Avatar ref);
 * otherwise → `external`. YouTube: always `external` (no channel stored →
 * no reverse link this cycle). Honest-to-origin either way.
 */
async function resolveSpeaker(
  service: Service,
  senderUserId: string,
  display: string,
): Promise<RelaySpeaker> {
  if (service === 'twitch') {
    const profile = await TwitchProfile.findByTwitchUserId(senderUserId);
    if (profile?._id) {
      const users = await User.find({ twitchProfileId: profile._id });
      const user = users[0];
      if (user?._id) {
        const avatar = PlayerApi.getAllAvatars().find(
          (a) => a.getUser()?._id === user._id,
        );
        if (avatar) {
          return {
            kind: 'external-linked',
            service: 'twitch',
            externalName: display,
            ref: MessageApi.refOf(avatar),
          };
        }
      }
    }
  }
  return { kind: 'external', service, externalName: display };
}
