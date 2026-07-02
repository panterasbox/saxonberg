// StreamLogic — the hot-reloadable logic singleton behind StreamApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { PlayerApi } from '../../api/player';
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
import type {
  PostResult,
  ResolveResult,
  TuneResult,
  UntuneResult,
  NormalizedInbound,
} from '../../api/stream';

type Service = 'twitch' | 'youtube';

const RELAY_PATH = '/obj/StreamRelay';
const StreamApiCallers = SecurityPolicies.FromModule('/api/stream#StreamApi');

/**
 * StreamLogic — the gated logic singleton behind {@link StreamApi}, at
 * `/obj/api/stream`. Stateless (no `PostRegistrationMixin`); every method
 * resolves the {@link StreamRelay} state singleton via the module-private
 * `requireRelay` and gates on `FromModule('/api/stream#StreamApi')`. Channels
 * are addressed by `(service, handle)`; the Twitch transport is reached
 * directly through {@link TwitchRelayReader} (the YouTube transport lands in
 * P3).
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
      // YouTube resolution (channel/video → liveChatId) lands in P3.
      return { ok: false, reason: 'no-relay' };
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
    if (opened && target.platform === 'twitch') {
      TwitchRelayReader.get().subscribe(target.key);
    }
    // YouTube subscribe wires in P3 (YoutubeRelayReader).
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
    if (res.emptied && res.key && res.service === 'twitch') {
      TwitchRelayReader.get().unsubscribe(res.key);
    }
    // YouTube unsubscribe wires in P3.
    return {
      ok: res.ok,
      service,
      handle: lower,
      reason: res.ok ? undefined : 'unknown-target',
    };
  }

  /** See {@link StreamApi.dropPlayer}. Each reader unsubscribes the result. */
  @CallSecurity(StreamApiCallers)
  public async dropPlayer(playerId: string): Promise<RelayChannelRef[]> {
    return (await requireRelay()).dropPlayer(playerId);
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
   * See {@link StreamApi.setOverlayReading}. Wired in P4 (overlay chat
   * forwarding) — a no-op until then.
   */
  @CallSecurity(StreamApiCallers)
  public async setOverlayReading(_on: boolean): Promise<void> {
    // P4: sentinel-tune the OVERLAY_* channels via the readers.
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
