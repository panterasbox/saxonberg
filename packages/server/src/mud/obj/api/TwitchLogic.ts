// TwitchLogic — the hot-reloadable logic singleton behind TwitchApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import { PlayerApi } from '../../api/player';
import { User } from '../../lib/identity/User';
import { TwitchProfile } from '../../lib/identity/TwitchProfile';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Avatar from '../Avatar';
import type TwitchRelay from '../TwitchRelay';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';
import { TWITCH_SCOPE_WRITE_CHAT } from '@saxonberg/types';
import type {
  TwitchRelayPort,
  TwitchPostResult,
  TwitchTuneResult,
  NormalizedInbound,
} from '../../api/twitch';

const RELAY_PATH = '/obj/TwitchRelay';
const TwitchApiCallers = SecurityPolicies.FromModule('mud/api/twitch#TwitchApi');

/**
 * TwitchLogic — the gated logic singleton behind {@link TwitchApi}, at
 * `/obj/api/twitch`. Stateless (no `PostRegistrationMixin`); every method
 * resolves the {@link TwitchRelay} state singleton via the module-private
 * `requireRelay` and gates on `FromModule('mud/api/twitch#TwitchApi')`.
 * Channels are addressed by Twitch login.
 *
 * @internal
 */
@Unshadowable
export class TwitchLogic extends Idea {
  /** See {@link TwitchApi.tune}. */
  @CallSecurity(TwitchApiCallers)
  public async tune(avatar: Avatar, login: string): Promise<TwitchTuneResult> {
    return (await requireRelay()).tuneByLogin(avatar.getPlayerId(), login);
  }

  /** See {@link TwitchApi.untune}. */
  @CallSecurity(TwitchApiCallers)
  public async untune(
    avatar: Avatar,
    login: string
  ): Promise<{ ok: boolean; login?: string; reason?: string }> {
    return (await requireRelay()).untune(avatar.getPlayerId(), login);
  }

  /** See {@link TwitchApi.tunedLoginsFor}. */
  @CallSecurity(TwitchApiCallers)
  public async tunedLoginsFor(avatar: Avatar): Promise<string[]> {
    return (await requireRelay()).tunedLoginsFor(avatar.getPlayerId());
  }

  /** See {@link TwitchApi.whoTuned}. */
  @CallSecurity(TwitchApiCallers)
  public async whoTuned(login: string): Promise<Avatar[]> {
    const relay = await requireRelay();
    const channel = relay.resolveByLogin(login.trim().toLowerCase());
    if (!channel) return [];
    const out: Avatar[] = [];
    for (const playerId of relay.whoTuned(channel.broadcasterId)) {
      const avatar = PlayerApi.findAvatarByPlayerId(playerId);
      if (avatar) out.push(avatar);
    }
    return out;
  }

  /** See {@link TwitchApi.historyFor}. */
  @CallSecurity(TwitchApiCallers)
  public async historyFor(login: string): Promise<readonly MessageFrame[]> {
    const relay = await requireRelay();
    const channel = relay.resolveByLogin(login.trim().toLowerCase());
    if (!channel) return [];
    return relay.historyFor(channel.broadcasterId);
  }

  /** See {@link TwitchApi.post}. */
  @CallSecurity(TwitchApiCallers)
  public async post(
    speaker: Stuff,
    login: string,
    text: string
  ): Promise<TwitchPostResult> {
    const relay = await requireRelay();
    // You must tune in (which resolves + caches the login) before posting.
    const channel = relay.resolveByLogin(login.trim().toLowerCase());
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
    relay.deliver(
      channel.broadcasterId,
      channel.login,
      { kind: 'in-game', ref: MessageApi.refOf(speaker) },
      body,
      true
    );
    relay.noteEcho(profile.twitchUserId, body);
    return { ok: true };
  }

  /** See {@link TwitchApi.dispatchInbound}. */
  @CallSecurity(TwitchApiCallers)
  public async dispatchInbound(n: NormalizedInbound): Promise<void> {
    const relay = await requireRelay();
    // Suppress the echo of our own outbound post.
    if (relay.isEcho(n.senderTwitchUserId, n.text)) return;
    const channel = relay.channelById(n.broadcasterId);
    if (!channel) return; // nobody tuned in to this channel
    const speaker = await resolveSpeaker(n.senderTwitchUserId, n.senderDisplay);
    relay.deliver(
      n.broadcasterId,
      channel.broadcasterLogin,
      speaker,
      n.text,
      false
    );
  }

  /** See {@link TwitchApi.installRelayPort}. */
  @CallSecurity(TwitchApiCallers)
  public async installRelayPort(port: TwitchRelayPort | null): Promise<void> {
    (await requireRelay()).setOutboundPort(port);
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
