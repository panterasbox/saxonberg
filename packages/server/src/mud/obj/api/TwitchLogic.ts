// TwitchLogic — the hot-reloadable logic singleton behind TwitchApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { EventApi } from '../../api/event';
import { MessageApi } from '../../api/message';
import { PlayerApi } from '../../api/player';
import { Events } from '../../lib/events';
import { User } from '../../lib/identity/User';
import { TwitchProfile } from '../../lib/identity/TwitchProfile';
import type { TwitchChannel } from '../../lib/twitch/TwitchChannel';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Avatar from '../Avatar';
import type TwitchRelay from '../TwitchRelay';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';
import { TWITCH_SCOPE_WRITE_CHAT } from '@saxonberg/types';
import type {
  TwitchRelayPort,
  TwitchPostResult,
  NormalizedInbound,
} from '../../api/twitch';

const RELAY_PATH = '/obj/TwitchRelay';
const TwitchApiCallers = SecurityPolicies.FromModule('mud/api/twitch#TwitchApi');

/**
 * TwitchLogic — the gated logic singleton behind {@link TwitchApi}, at
 * `/obj/api/twitch`. Stateless (no `PostRegistrationMixin`); every method
 * resolves the {@link TwitchRelay} state singleton via the module-private
 * `requireRelay` and gates on `FromModule('mud/api/twitch#TwitchApi')`.
 *
 * @internal
 */
@Unshadowable
export class TwitchLogic extends Idea {
  /** See {@link TwitchApi.resolveChannel}. */
  @CallSecurity(TwitchApiCallers)
  public async resolveChannel(key: string): Promise<TwitchChannel | null> {
    return (await requireRelay()).resolveChannel(key);
  }

  /** See {@link TwitchApi.allChannels}. */
  @CallSecurity(TwitchApiCallers)
  public async allChannels(): Promise<TwitchChannel[]> {
    return (await requireRelay()).allChannels();
  }

  /** See {@link TwitchApi.tune}. */
  @CallSecurity(TwitchApiCallers)
  public async tune(
    avatar: Avatar,
    key: string
  ): Promise<{ ok: boolean; channel?: TwitchChannel; reason?: string }> {
    return this.setTuned(avatar, key, true);
  }

  /** See {@link TwitchApi.untune}. */
  @CallSecurity(TwitchApiCallers)
  public async untune(
    avatar: Avatar,
    key: string
  ): Promise<{ ok: boolean; channel?: TwitchChannel; reason?: string }> {
    return this.setTuned(avatar, key, false);
  }

  /** See {@link TwitchApi.tunedChannelsFor}. */
  @CallSecurity(TwitchApiCallers)
  public async tunedChannelsFor(avatar: Avatar): Promise<TwitchChannel[]> {
    const relay = await requireRelay();
    return relay
      .allChannels()
      .filter((c) => avatar.isTuned(c.broadcasterId));
  }

  /** See {@link TwitchApi.whoTuned}. */
  @CallSecurity(TwitchApiCallers)
  public async whoTuned(broadcasterId: string): Promise<Avatar[]> {
    return (await requireRelay()).tunedAvatars(broadcasterId);
  }

  /** See {@link TwitchApi.historyFor}. */
  @CallSecurity(TwitchApiCallers)
  public async historyFor(
    broadcasterId: string
  ): Promise<readonly MessageFrame[]> {
    return (await requireRelay()).historyFor(broadcasterId);
  }

  /** See {@link TwitchApi.post}. */
  @CallSecurity(TwitchApiCallers)
  public async post(
    speaker: Stuff,
    key: string,
    text: string
  ): Promise<TwitchPostResult> {
    const relay = await requireRelay();
    const channel = relay.resolveChannel(key);
    if (!channel) return { ok: false, reason: 'no-channel' };
    const body = text.trim();
    if (!body) return { ok: false, reason: 'empty' };

    if (!PlayerApi.isAvatarStuff(speaker)) {
      return { ok: false, reason: 'unlinked' };
    }
    const user = speaker.getUser();
    if (!user?.twitchProfileId) return { ok: false, reason: 'unlinked' };
    const profile = await TwitchProfile.findById<TwitchProfile>(
      user.twitchProfileId
    );
    if (!profile) return { ok: false, reason: 'unlinked' };
    if (!profile.hasScope(TWITCH_SCOPE_WRITE_CHAT)) {
      return { ok: false, reason: 'unscoped' };
    }

    if (!relay.tryAcquireSend(speaker.getPlayerId())) {
      return { ok: false, reason: 'throttled' };
    }
    const port = relay.getOutboundPort();
    if (!port) return { ok: false, reason: 'send-failed', detail: 'relay offline' };
    const result = await port.send({
      broadcasterId: channel.broadcasterId,
      profile,
      text: body,
    });
    if (!result.ok) {
      return { ok: false, reason: 'send-failed', detail: result.error };
    }

    // Mirror in-game (case-1 speaker, egress) only AFTER a successful send,
    // and tag the echo so the reader drops our own read-back.
    relay.deliver(channel, { kind: 'in-game', ref: MessageApi.refOf(speaker) }, body, true);
    relay.noteEcho(profile.twitchUserId, body);
    return { ok: true };
  }

  /** See {@link TwitchApi.dispatchInbound}. */
  @CallSecurity(TwitchApiCallers)
  public async dispatchInbound(n: NormalizedInbound): Promise<void> {
    const relay = await requireRelay();
    // Suppress the echo of our own outbound post.
    if (relay.isEcho(n.senderTwitchUserId, n.text)) return;
    const channel = relay.resolveChannel(n.broadcasterId);
    if (!channel) return;
    const speaker = await resolveSpeaker(n.senderTwitchUserId, n.senderDisplay);
    relay.deliver(channel, speaker, n.text, false);
  }

  /** See {@link TwitchApi.installRelayPort}. */
  @CallSecurity(TwitchApiCallers)
  public async installRelayPort(port: TwitchRelayPort | null): Promise<void> {
    (await requireRelay()).setOutboundPort(port);
  }

  private async setTuned(
    avatar: Avatar,
    key: string,
    tunedIn: boolean
  ): Promise<{ ok: boolean; channel?: TwitchChannel; reason?: string }> {
    const relay = await requireRelay();
    const channel = relay.resolveChannel(key);
    if (!channel) return { ok: false, reason: 'no-channel' };
    const changed = tunedIn
      ? avatar.addTuned(channel.broadcasterId)
      : avatar.removeTuned(channel.broadcasterId);
    if (changed) {
      await avatar.save();
      const { count, prev } = relay.recordPresence(
        channel.broadcasterId,
        tunedIn ? +1 : -1
      );
      EventApi.emit(Events.TwitchPresenceChanged, {
        broadcasterId: channel.broadcasterId,
        count,
        prev,
      });
    }
    return { ok: true, channel };
  }
}

let relayRef: TwitchRelay | null = null;

async function requireRelay(): Promise<TwitchRelay> {
  if (relayRef) return relayRef;
  const found = StuffApi.findByTemplatePath<TwitchRelay>(RELAY_PATH);
  if (found) {
    relayRef = found;
    return found;
  }
  relayRef = await StuffApi.singleton<TwitchRelay>(RELAY_PATH);
  return relayRef;
}

/**
 * Resolve the relay speaker for an inbound Twitch user: a linked player
 * with an online Avatar → `external-linked` (carries the Avatar ref);
 * otherwise → `external` (Twitch handle only). Honest-to-origin either way.
 */
async function resolveSpeaker(
  twitchUserId: string,
  display: string
): Promise<RelaySpeaker> {
  const profile = await TwitchProfile.findByTwitchUserId(twitchUserId);
  if (profile?._id) {
    const users = await User.find({ twitchProfileId: profile._id });
    const user = users[0];
    if (user?._id) {
      const avatar = PlayerApi.getAllAvatars().find(
        (a) => a.getUser()?._id === user._id
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
  return { kind: 'external', service: 'twitch', externalName: display };
}
