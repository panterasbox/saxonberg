// StreamLogic — the hot-reloadable logic singleton behind StreamApi.
// (Doc comment on the class so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import { StuffApi } from '../../../api/stuff';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { PlayerApi } from '../../../api/player';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { ScheduleApi } from '../../../api/schedule';
import type { ScheduleHandle } from '../../../api/schedule';
import { User } from '../../../lib/identity/User';
import { GoogleProfile } from '../../../lib/identity/GoogleProfile';
import { YoutubeClient } from '../../../../backend/YoutubeClient';
import { EventApi } from '../../../api/event';
import { Events } from '../../../lib/events';
import type { RelayMessageEvent } from '../../../lib/events';
import { SocialApi } from '../../../api/social';
import { TwitchProfile } from '../../../lib/identity/TwitchProfile';
import { KickProfile } from '../../../lib/identity/KickProfile';
import { StreamerTarget } from '../../../lib/streaming/StreamerTarget';
import type { ParsedTarget } from '../../../lib/streaming/StreamerTarget';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Avatar from '../../../lib/character/Avatar';
import type StreamRelay from '../StreamRelay';
import type { RelayChannelRef } from '../StreamRelay';
import type { MessageFrame, RelaySpeaker } from '@saxonberg/types';
import { TWITCH_SCOPE_WRITE_CHAT } from '@saxonberg/types';
import { TwitchRelayReader } from '../../../../backend/TwitchRelayReader';
import { createHash, randomBytes } from 'node:crypto';
import { DocumentApi } from '../../../api/document';
import { StandbyReason } from '../../../lib/livestream/StandbyReason';
import { LowerThirdPanel } from '../../../lib/livestream/LowerThirdPanel';
import type { StandbyReading } from '../../../lib/livestream/StandbyReason';
import type { StreamPanelRow, ProgramListing } from '@saxonberg/types';
import { BROADCAST_TOKEN_SCOPES, BROADCAST_SERVICES } from '../../../lib/livestream/Broadcast';
import type {
  BroadcastChannels,
  BroadcastHost,
  BroadcastService,
  BroadcastTokenScope,
} from '../../../lib/livestream/Broadcast';
import { MixinApi } from '../../../api/mixin';
import { AccessApi } from '../../../api/access';
import { ExecutionContextApi } from '../../../api/execution-context';
import ProgramCatalogue from '../ProgramCatalogue';
import {
  Program,
  PROGRAM_NAME_RE,
  PROGRAMS_BRANCH,
  type ProgramData,
  type ProgramFeeds,
} from '../../../lib/livestream/Program';
import { YoutubeRelayReader } from '../../../../backend/YoutubeRelayReader';
import { KickRelayReader } from '../../../../backend/KickRelayReader';
import type {
  ProgramAnswer,
  ProgramReason,
  PostResult,
  ResolveResult,
  TuneResult,
  UntuneResult,
  NormalizedInbound,
  YoutubeChannelResult,
} from '../../../api/stream';

type Service = 'twitch' | 'youtube' | 'kick';

const RELAY_PATH = '/platform/idea/StreamRelay';
const StreamApiCallers = SecurityPolicies.FromModule('/api/stream#StreamApi');

/**
 * StreamLogic — the gated logic singleton behind {@link StreamApi}, at
 * `/platform/idea/api/stream`. Stateless (no `onCreate` override); every method
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
    if (parsed.platform === 'kick') {
      return this.resolveKickSlug(parsed.identifier);
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
      } else if (target.platform === 'youtube') {
        await YoutubeRelayReader.get().subscribe(target.key);
      } else {
        await KickRelayReader.get().subscribe(target.key);
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
      avatar.onMessage({
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
   * any player `tune`. Twitch resolves the login; Kick resolves the slug
   * (persistent bind, no poll); YouTube resolves the current live
   * broadcast + starts a light live-status poll to catch a stream
   * restart. Idempotent on the current on/off state.
   */
  /**
   * ⭐ Issue (or rotate) one streamer's token for `scope` (broadcast-ready
   * D4): 32 random bytes, returned ONCE in base64url; only the sha256 is
   * stored, at `/platform/stream-tokens/<hex>`, naming the player. The
   * previous token of that scope is revoked first, so issuing again
   * rotates. The streamer's body remembers the live hash per scope.
   */
  @CallSecurity(StreamApiCallers)
  public async issueToken(
    host: Stuff & BroadcastHost,
    scope: BroadcastTokenScope,
  ): Promise<string> {
    const playerId = host.getPlayerId();
    if (!playerId) throw new Error('StreamApi.issueToken: the host has no player');
    const previous = host.getStreamTokenHash(scope);
    if (previous) await DocumentApi.deleteStreamToken(previous);
    const raw = randomBytes(32).toString('base64url');
    const hash = hashToken(raw);
    await DocumentApi.saveStreamToken(hash, { playerId, scope, issuedAt: Date.now() });
    host.setStreamTokenHash(scope, hash);
    return raw;
  }

  /**
   * Resolve a raw token to the player and scope it names — a hash and a
   * path READ, never a search. Null for an unknown, revoked or malformed
   * token (the upgrade answers 401).
   */
  @CallSecurity(StreamApiCallers)
  public async resolveToken(
    raw: string,
  ): Promise<{ playerId: string; scope: BroadcastTokenScope } | null> {
    if (raw.length < 16 || raw.length > 256) return null;
    const doc = await DocumentApi.read(`/platform/stream-tokens/${hashToken(raw)}`);
    if (!doc || doc.getKind() !== 'stream-token') return null;
    const { playerId, scope } = doc.getData();
    if (typeof playerId !== 'string' || playerId === '') return null;
    if (!(BROADCAST_TOKEN_SCOPES as readonly unknown[]).includes(scope)) return null;
    return { playerId, scope: scope as BroadcastTokenScope };
  }

  /**
   * Open (or close) ONE streamer's own channel reads — the sentinel-tune
   * presence edge, per streamer (broadcast-ready D5/D15). Driven by the
   * feed as that streamer's first overlay socket connects and their last
   * one leaves. Idempotent per player.
   */
  @CallSecurity(StreamApiCallers)
  public async setOverlayReading(playerId: string, on: boolean): Promise<void> {
    if (on) await openOverlayFor(playerId, channelsOf(playerId));
    else await closeOverlayFor(playerId);
  }

  /**
   * ⭐ Read a `stream away` operand (D10): a bare duration is the
   * `generic` reason for that long (the shipped `stream away 15m`); a word
   * is a reason row, optionally followed by a duration overriding its
   * default. A privacy reason never carries a countdown. An unknown word
   * that is not a duration refuses naming both readings.
   */
  @CallSecurity(StreamApiCallers)
  public async interpretAway(first: string, second?: string): Promise<StandbyReading> {
    const word = first.trim().toLowerCase();
    const asDuration = parseDurationMs(word);
    if (asDuration !== null && (second ?? '').trim() === '') {
      const generic = await readReason(GENERIC_REASON);
      if (!generic) {
        return { ok: false, refusal: 'unknown-reason', detail: `no '${GENERIC_REASON}' standby reason is installed` };
      }
      return { ok: true, reason: generic, durationMs: generic.privacy ? null : asDuration };
    }
    const reason = await readReason(word);
    if (!reason) {
      return {
        ok: false,
        refusal: 'unknown-reason',
        detail: `'${first}' is neither a standby reason nor a duration (try 15m, 1h, 1h30m, 90s)`,
      };
    }
    const overrideWord = (second ?? '').trim();
    if (overrideWord === '') return { ok: true, reason, durationMs: reason.defaultDurationMs };
    const override = parseDurationMs(overrideWord);
    if (override === null) {
      return { ok: false, refusal: 'bad-duration', detail: `can't parse duration '${overrideWord}' (try 15m, 1h, 1h30m, 90s)` };
    }
    return { ok: true, reason, durationMs: reason.privacy ? null : override };
  }

  /** Every installed standby reason, for the controls card's picker. */
  @CallSecurity(StreamApiCallers)
  public async standbyReasons(): Promise<StandbyReason[]> {
    const docs = await DocumentApi.list(REASONS_PREFIX);
    const out: StandbyReason[] = [];
    for (const doc of docs) {
      if (doc.getKind() !== REASON_KIND) continue;
      try {
        out.push(StandbyReason.fromData(doc.getPath().slice(REASONS_PREFIX.length), doc.getData()));
      } catch (err) {
        console.warn(`StreamApi.standbyReasons: skipping a malformed row — ${String(err)}`);
      }
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }

  /** Every installed lower-third panel row, malformed rows skipped. */
  @CallSecurity(StreamApiCallers)
  public async lowerThirdPanels(): Promise<StreamPanelRow[]> {
    const docs = await DocumentApi.list(LOWER_THIRD_PREFIX);
    const rows: StreamPanelRow[] = [];
    for (const doc of docs) {
      if (doc.getKind() !== LOWER_THIRD_KIND) continue;
      try {
        rows.push(LowerThirdPanel.fromData(doc.getPath().slice(LOWER_THIRD_PREFIX.length), doc.getData()));
      } catch (err) {
        console.warn(`StreamApi.lowerThirdPanels: skipping a malformed row — ${String(err)}`);
      }
    }
    return rows.sort((a, b) => a.key.localeCompare(b.key));
  }

  /** A shell-style duration (`15m`, `1h30m`, `90s`; bare = minutes) in ms. */
  @CallSecurity(StreamApiCallers)
  public parseDuration(word: string): number | null {
    return parseDurationMs(word);
  }

  /** A compact label for a span (`1h 30m`, `5m`, `45s`). */
  @CallSecurity(StreamApiCallers)
  public formatDuration(ms: number): string {
    const totalSec = Math.max(0, Math.round(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const min = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    const parts: string[] = [];
    if (h > 0) parts.push(`${h}h`);
    if (min > 0) parts.push(`${min}m`);
    if (s > 0 && h === 0) parts.push(`${s}s`);
    return parts.length > 0 ? parts.join(' ') : '0s';
  }

  /**
   * Keep a streamer's own numbers coming while they are on air (D16) —
   * viewer counts, uptime, chat rate, who is online — to their controls
   * card only. Idempotent; the poll stops itself off air.
   */
  @CallSecurity(StreamApiCallers)
  public watchNumbers(playerId: string): void {
    watchNumbersOf(playerId);
  }

  /**
   * Re-open a streamer's channel reads after their channels changed
   * (`stream channel …`) — a no-op when no overlay of theirs is open.
   */
  @CallSecurity(StreamApiCallers)
  public async refreshOverlayReading(playerId: string): Promise<void> {
    if (!overlayReads.has(playerId)) return;
    await closeOverlayFor(playerId);
    await openOverlayFor(playerId, channelsOf(playerId));
  }

  /**
   * ⭐ The chat channels a streamer's overlay shows: the channels their
   * body names (`stream channel …`), else — for the founder, the first id
   * in `STREAMER_PLAYER_IDS` — the `OVERLAY_*` env (D15: nothing changes
   * for the founder on day one). Handles lower-cased for matching.
   */
  @CallSecurity(StreamApiCallers)
  public channelsFor(playerId: string): BroadcastChannels {
    return channelsOf(playerId);
  }

  // ---- the program (stream arrival D10–D13) -------------------------------

  /** See {@link StreamApi.createProgram}. */
  @CallSecurity(StreamApiCallers)
  public async createProgram(
    name: string,
    opts: { title?: string; owner?: string },
  ): Promise<ProgramAnswer> {
    const actor = actingPlayer();
    if (!actor) return refused('program-guest', {});
    if (!PROGRAM_NAME_RE.test(name)) return refused('program-bad-name', { name });
    const home = homeOf(actor);
    const owner = (opts.owner ?? '').trim().replace(/\/+$/, '') || home;
    if (!(await holdsPen(actor, owner, name))) {
      return refused('program-owner-refused', { owner });
    }
    const program = new Program(name, {
      title: (opts.title ?? '').trim(),
      owner,
      ownerName: captionFor(actor, owner),
      schedule: '',
      feeds: {},
      runner: null,
    });
    const saved = await DocumentApi.saveProgram(name, program.toData(), 'create');
    if (saved === 'taken') return refused('program-name-taken', { name });
    return { ok: true, program: programCatalogue().remember(program.getPath(), program) };
  }

  /** See {@link StreamApi.amendProgram}. */
  @CallSecurity(StreamApiCallers)
  public async amendProgram(
    name: string,
    patch: { title?: string; schedule?: string },
  ): Promise<ProgramAnswer> {
    const held = await this.heldProgram(name);
    if (!held.ok) return held;
    const { actor, program } = held;
    const next: Partial<ProgramData> = { ownerName: captionFor(actor, program.getOwner()) };
    if (patch.title !== undefined) next.title = patch.title.trim();
    if (patch.schedule !== undefined) next.schedule = patch.schedule.trim();
    return this.rewrite(program.with(next));
  }

  /** See {@link StreamApi.attachFeed}. */
  @CallSecurity(StreamApiCallers)
  public async attachFeed(
    name: string,
    carrier: BroadcastService,
    stated?: string,
  ): Promise<ProgramAnswer> {
    const held = await this.heldProgram(name);
    if (!held.ok) return held;
    const { actor, program } = held;
    const proven = await provenChannel(actor, carrier);
    if (!proven) return refused('no-linked-account', { carrier: carrierLabel(carrier) });
    const claim = (stated ?? '').trim();
    if (claim.length > 0 && normalizeChannel(carrier, claim) !== proven) {
      return refused('not-your-channel', { carrier: carrierLabel(carrier), stated: claim, proven });
    }
    const feeds: ProgramFeeds = {
      ...program.toData().feeds,
      [carrier]: {
        channel: proven,
        provenBy: actor.getIdentityPath() ?? '',
        provenAt: Date.now(),
      },
    };
    const answer = await this.rewrite(
      program.with({ feeds, ownerName: captionFor(actor, program.getOwner()) }),
    );
    await refreshRunnerReads(program.getRunner());
    return answer;
  }

  /** See {@link StreamApi.detachFeed}. */
  @CallSecurity(StreamApiCallers)
  public async detachFeed(name: string, carrier: BroadcastService): Promise<ProgramAnswer> {
    const held = await this.heldProgram(name);
    if (!held.ok) return held;
    const feeds: ProgramFeeds = { ...held.program.toData().feeds };
    delete feeds[carrier];
    const answer = await this.rewrite(held.program.with({ feeds }));
    await refreshRunnerReads(held.program.getRunner());
    return answer;
  }

  /** See {@link StreamApi.programListing}. */
  @CallSecurity(StreamApiCallers)
  public async programListing(
    name: string,
    carrier?: BroadcastService,
  ): Promise<ProgramListing | null> {
    const program = await readProgram(name);
    if (!program) return null;
    if (carrier && !program.feedOn(carrier)) return null;
    return listingOf(program);
  }

  /**
   * The program `name`, read, and the acting player holding its pen — or
   * the refusal. Every owner write starts here.
   */
  private async heldProgram(
    name: string,
  ): Promise<{ ok: true; actor: Avatar; program: Program } | Extract<ProgramAnswer, { ok: false }>> {
    const actor = actingPlayer();
    if (!actor) return refused('program-guest', {});
    const program = await readProgram(name);
    if (!program) return refused('no-such-program', { name });
    if (!(await holdsPen(actor, program.getOwner(), name))) {
      return refused('not-your-program', { name });
    }
    return { ok: true, actor, program };
  }

  /** Save an existing program's next record and keep it resident. */
  private async rewrite(program: Program): Promise<ProgramAnswer> {
    const saved = await DocumentApi.saveProgram(program.getName(), program.toData(), 'update');
    if (saved === 'missing') return refused('no-such-program', { name: program.getName() });
    return { ok: true, program: programCatalogue().remember(program.getPath(), program) };
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
   * Resolve a Kick channel slug (cache-first) to a channel target. The
   * key is the broadcaster id — a durable, persistent bind (the Twitch
   * model; no live-only bind, no auto-untune).
   */
  private async resolveKickSlug(slug: string): Promise<ResolveResult> {
    const relay = await requireRelay();
    const lower = slug.trim().toLowerCase();
    const cached = relay.resolveByHandle('kick', lower);
    if (cached) {
      return {
        ok: true,
        target: new StreamerTarget('kick', cached.key, cached.handle),
      };
    }
    const reader = KickRelayReader.get();
    if (!reader.isConfigured()) return { ok: false, reason: 'no-relay' };
    const r = await reader.resolveSlug(lower);
    if (r === 'unknown') return { ok: false, reason: 'unknown-target' };
    return {
      ok: true,
      target: new StreamerTarget('kick', r.broadcasterId, r.slug),
    };
  }

  /**
   * Resolve a character/MQL identifier to its linked channel — Twitch
   * first, Kick fallback (a character linked to both resolves Twitch,
   * the two-way platform; deterministic). `unlinked` only when neither
   * provider resolves. (Character→YouTube is a non-goal — GoogleProfile
   * stores no channel.)
   */
  private async resolveCharacter(identifier: string): Promise<ResolveResult> {
    const name = identifier.replace(/^@/, '').trim().toLowerCase();
    if (!name) return { ok: false, reason: 'unknown-character' };
    const avatar = PlayerApi.findAvatarByName(name);
    if (!avatar) return { ok: false, reason: 'unknown-character' };
    const user = avatar.getUser();

    if (user?.twitchProfileId) {
      const profile = await TwitchProfile.findById<TwitchProfile>(
        user.twitchProfileId,
      );
      if (profile?.login) {
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

    if (user?.kickProfileId) {
      const profile = await KickProfile.findById<KickProfile>(
        user.kickProfileId,
      );
      if (profile?.slug) {
        const resolved = await this.resolveKickSlug(profile.slug);
        if (!resolved.ok) return resolved;
        return {
          ok: true,
          target: new StreamerTarget(
            'kick',
            resolved.target.key,
            resolved.target.handle,
            MessageApi.refOf(avatar),
          ),
        };
      }
    }

    return { ok: false, reason: 'unlinked' };
  }
}

/** Unsubscribe a channel on its transport's backend reader. */
function unsubscribeReader(service: Service, key: string): void {
  if (service === 'twitch') TwitchRelayReader.get().unsubscribe(key);
  else if (service === 'youtube') YoutubeRelayReader.get().unsubscribe(key);
  else KickRelayReader.get().unsubscribe(key);
}

// ---- per-streamer overlay reading -----------------------------------------
// Each streamer's own channels (their body's, else the founder's env seed)
// are `addTuned` under that streamer's sentinel so the reader opens via the
// presence edge; delivered lines carry the channel handle, which
// `BroadcastFeed` matches against each streamer's channels before
// forwarding. Module-level (it resets on HMR, orphaning a poll and the
// sentinel tunes; a broadcast reconnect re-drives `setOverlayReading`).

/** One streamer's open overlay reads. */
interface OverlayRead {
  playerId: string;
  sentinel: string;
  channels: BroadcastChannels;
  /** The liveChatId the sentinel is reading for this streamer's YouTube. */
  youtubeKey: string | null;
  poll: ScheduleHandle | null;
}

const overlayReads = new Map<string, OverlayRead>();

// ---- standby reasons + lower-third panels (pack documents, D2) ---------

/** Where the platform pack installs the reason rows (root + content dir). */
const REASONS_PREFIX = '/platform/standby-reasons/';
const REASON_KIND = 'standby-reason';
/** The reason a bare duration means. */
const GENERIC_REASON = 'generic';
/** Where the platform pack installs the panel rows. */
const LOWER_THIRD_PREFIX = '/platform/lower-third-panels/';
const LOWER_THIRD_KIND = 'lower-third-panel';

/** Milliseconds per duration unit. */
const UNIT_MS: Readonly<Record<string, number>> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

/** The reason row at `key`, read by path on use (P7), or null. */
async function readReason(key: string): Promise<StandbyReason | null> {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(key)) return null;
  const doc = await DocumentApi.read(`${REASONS_PREFIX}${key}`);
  if (!doc || doc.getKind() !== REASON_KIND) return null;
  return StandbyReason.fromData(key, doc.getData());
}

/**
 * Parse a shell-style duration into milliseconds: a chain of
 * `<number><unit>` segments, or a bare number read as minutes. Null on
 * anything else, and on zero.
 */
function parseDurationMs(input: string): number | null {
  const text = input.trim().toLowerCase();
  if (text.length === 0) return null;
  if (/^\d+$/.test(text)) {
    const minutes = Number(text);
    return minutes > 0 ? minutes * UNIT_MS.m! : null;
  }
  const re = /(\d+)\s*([smhd])/g;
  let total = 0;
  let consumed = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    consumed += m[0].length;
    total += Number(m[1]) * UNIT_MS[m[2] as string]!;
  }
  // Every character must belong to a segment (whitespace aside).
  if (consumed === 0 || consumed !== text.replace(/\s/g, '').length) return null;
  return total > 0 ? total : null;
}

// ---- the program's helpers (stream arrival D10–D13) -------------------------

const PROGRAM_CATALOGUE = '/platform/idea/ProgramCatalogue';

/** The program register (the same singleton `StreamApi.programs()` answers). */
function programCatalogue(): ProgramCatalogue {
  return StuffApi.singletonSync(PROGRAM_CATALOGUE, () => new ProgramCatalogue());
}

/** A refusal answer. */
function refused(
  reason: ProgramReason,
  facts: Record<string, string>,
): Extract<ProgramAnswer, { ok: false }> {
  return { ok: false, reason, facts };
}

/**
 * The acting PLAYER — a played, non-guest body — or null. ⭐ Read from the
 * execution context, never a parameter (P14): nobody can name somebody
 * else as the one acting.
 */
function actingPlayer(): Avatar | null {
  const actor = ExecutionContextApi.getActor() as Stuff | null;
  if (!actor || !PlayerApi.isAvatarStuff(actor)) return null;
  if (actor.getIsGuest() || !actor.getPlayerId()) return null;
  return actor;
}

/** A player's own home branch — where their program is owned by default. */
function homeOf(actor: Avatar): string {
  const key = actor.getIdentityPath()?.split('/').filter(Boolean).pop() ?? '';
  return `/home/${key}`;
}

/**
 * ⭐ **Whose pen** (D11): may `actor` write under `owner`? The shipped title
 * gate, asked of a path inside the owner's branch — it answers a player's
 * own home and a committee's branch alike, so nobody here asks what kind
 * of owner it is.
 */
async function holdsPen(actor: Avatar, owner: string, name: string): Promise<boolean> {
  if (!owner.startsWith('/')) return false;
  return AccessApi.canAtPath(actor as unknown as Stuff, 'write-document', `${owner}/programs/${name}`);
}

/**
 * The owner's caption for a page (D11): the writer's own name when the
 * owner is their home, else the institution's last word. Re-captured on
 * every owner write.
 */
function captionFor(actor: Avatar, owner: string): string {
  if (owner === homeOf(actor)) return actor.getName() || actor.getPresentation();
  return owner.split('/').filter(Boolean).pop() ?? owner;
}

/** A program by its short name, read (null when there is none). */
async function readProgram(name: string): Promise<Program | null> {
  if (!PROGRAM_NAME_RE.test(name)) return null;
  const path = `${PROGRAMS_BRANCH}/${name}`;
  const catalogue = programCatalogue();
  const resident = catalogue.peek(path);
  if (resident) return resident;
  try {
    return await catalogue.ensure(path);
  } catch {
    // @quiet no document at that path, or not a program: there is no such
    // program, and every caller answers `no-such-program` for it.
    return null;
  }
}

/** The carrier as a person says it. */
function carrierLabel(carrier: BroadcastService): string {
  return carrier === 'youtube' ? 'YouTube' : carrier === 'kick' ? 'Kick' : 'Twitch';
}

/** A channel in the form the embed uses: Twitch and Kick lower-cased. */
function normalizeChannel(carrier: BroadcastService, channel: string): string {
  return carrier === 'youtube' ? channel.trim() : channel.trim().toLowerCase();
}

/**
 * ⭐ The actor's OWN channel on `carrier`, read from their linked account
 * (D13) — a stored field, no call to the carrier — or null when they have
 * none: Twitch's login, Kick's slug (empty when the account has no
 * channel), the stepped-up YouTube channel id.
 */
async function provenChannel(actor: Avatar, carrier: BroadcastService): Promise<string | null> {
  const user = actor.getUser();
  if (!user) return null;
  if (carrier === 'twitch') {
    if (!user.twitchProfileId) return null;
    const p = await TwitchProfile.findById<TwitchProfile>(user.twitchProfileId);
    const login = normalizeChannel('twitch', p?.login ?? '');
    return login.length > 0 ? login : null;
  }
  if (carrier === 'kick') {
    if (!user.kickProfileId) return null;
    const p = await KickProfile.findById<KickProfile>(user.kickProfileId);
    const slug = normalizeChannel('kick', p?.slug ?? '');
    return slug.length > 0 ? slug : null;
  }
  if (!user.googleProfileId) return null;
  const p = await GoogleProfile.findById<GoogleProfile>(user.googleProfileId);
  if (!p?.hasYoutube()) return null;
  const id = (p.youtubeChannelId ?? '').trim();
  return id.length > 0 ? id : null;
}

/**
 * ⭐ **On air** (D12): the program's runner is a resident body running THIS
 * program and on the air. Not resident → off air. Two followed references,
 * never a scan of who is online.
 */
function programIsOnAir(program: Program): boolean {
  const runner = program.getRunner();
  if (!runner) return false;
  const body = PlayerApi.findAvatarByPlayerId(runner);
  if (!body || !MixinApi.isBroadcastHost(body)) return false;
  return body.getStreamProgram() === program.getPath() && body.isOnAir();
}

/** A program's public facts — the wire listing (D14). */
function listingOf(program: Program): ProgramListing {
  const feeds: ProgramListing['feeds'] = {};
  for (const carrier of program.feedCarriers()) {
    const feed = program.feedOn(carrier);
    if (feed) feeds[carrier] = feed.channel;
  }
  const out: ProgramListing = {
    name: program.getName(),
    title: program.getTitle(),
    live: programIsOnAir(program),
    feeds,
  };
  if (program.getOwnerName()) out.ownerName = program.getOwnerName();
  if (program.getSchedule()) out.nextShow = program.getSchedule();
  return out;
}

/** Re-open a runner's overlay reads after their program's feeds changed. */
async function refreshRunnerReads(runner: string | null): Promise<void> {
  if (!runner || !overlayReads.has(runner)) return;
  await closeOverlayFor(runner);
  await openOverlayFor(runner, channelsOf(runner));
}

/** sha256 hex of a raw stream token — what is stored and looked up. */
function hashToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

/** The founder: the first id in `STREAMER_PLAYER_IDS` (D4, D15). */
function founderPlayerId(): string | null {
  const first = (process.env.STREAMER_PLAYER_IDS ?? '').split(',')[0]?.trim();
  return first ? first : null;
}

function overlayTwitchLogin(): string {
  return (process.env.OVERLAY_TWITCH_LOGIN ?? '').trim().toLowerCase();
}

function overlayYoutubeChannel(): string {
  return (process.env.OVERLAY_YOUTUBE_CHANNEL ?? '').trim();
}

function overlayKickChannel(): string {
  return (process.env.OVERLAY_KICK_CHANNEL ?? '').trim().toLowerCase();
}

/** See {@link StreamLogic.channelsFor}. */
function channelsOf(playerId: string): BroadcastChannels {
  // An open overlay read knows its channels — including a YouTube channel
  // found through the streamer's own login (D12) rather than named.
  const open = overlayReads.get(playerId);
  if (open) return { ...open.channels };
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  const own = avatar && MixinApi.isBroadcastHost(avatar) ? avatar.getStreamChannels() : {};
  const out: BroadcastChannels = {};
  for (const service of BROADCAST_SERVICES) {
    const h = own[service]?.trim();
    if (h) out[service] = h;
  }
  if (Object.keys(out).length > 0 || playerId !== founderPlayerId()) return out;
  const twitch = overlayTwitchLogin();
  const youtube = overlayYoutubeChannel();
  const kick = overlayKickChannel();
  if (twitch) out.twitch = twitch;
  if (youtube) out.youtube = youtube;
  if (kick) out.kick = kick;
  return out;
}

/** Open one streamer's channel reads. Idempotent per player. */
async function openOverlayFor(playerId: string, channels: BroadcastChannels): Promise<void> {
  if (overlayReads.has(playerId)) return;
  const relay = await requireRelay();
  const read: OverlayRead = {
    playerId,
    sentinel: relay.overlaySentinelFor(playerId),
    channels,
    youtubeKey: null,
    poll: null,
  };
  overlayReads.set(playerId, read);
  await openOverlayTwitch(relay, read);
  await openOverlayKick(relay, read);
  await openOverlayYoutube(relay, read);
  startOverlayYoutubePoll(playerId, read);
}

/** Close one streamer's channel reads. A no-op when none are open. */
async function closeOverlayFor(playerId: string): Promise<void> {
  const open = overlayReads.get(playerId);
  if (!open) return;
  overlayReads.delete(playerId);
  const relay = await requireRelay();
  stopOverlayYoutubePoll(open);
  closeOverlayTwitch(relay, open);
  closeOverlayKick(relay, open);
  closeOverlayYoutube(relay, open);
}

async function openOverlayTwitch(relay: StreamRelay, read: OverlayRead): Promise<void> {
  const login = read.channels.twitch?.toLowerCase();
  if (!login) return;
  const reader = TwitchRelayReader.get();
  if (!reader.isConfigured()) return;
  let key = relay.resolveByHandle('twitch', login)?.key;
  if (!key) {
    const r = await reader.resolveLogin(login);
    if (!r) return;
    key = r.broadcasterId;
  }
  if (relay.addTuned(read.sentinel, 'twitch', key, login)) {
    reader.subscribe(key);
  }
}

function closeOverlayTwitch(relay: StreamRelay, read: OverlayRead): void {
  const login = read.channels.twitch?.toLowerCase();
  if (!login) return;
  const res = relay.removeTuned(read.sentinel, 'twitch', login);
  if (res.emptied && res.key) TwitchRelayReader.get().unsubscribe(res.key);
}

async function openOverlayKick(relay: StreamRelay, read: OverlayRead): Promise<void> {
  const slug = read.channels.kick?.toLowerCase();
  if (!slug) return;
  const reader = KickRelayReader.get();
  if (!reader.isConfigured()) return;
  let key = relay.resolveByHandle('kick', slug)?.key;
  if (!key) {
    const r = await reader.resolveSlug(slug);
    if (r === 'unknown') return;
    key = r.broadcasterId;
  }
  if (relay.addTuned(read.sentinel, 'kick', key, slug)) {
    await reader.subscribe(key);
  }
}

function closeOverlayKick(relay: StreamRelay, read: OverlayRead): void {
  const slug = read.channels.kick?.toLowerCase();
  if (!slug) return;
  const res = relay.removeTuned(read.sentinel, 'kick', slug);
  if (res.emptied && res.key) KickRelayReader.get().unsubscribe(res.key);
}

async function openOverlayYoutube(relay: StreamRelay, read: OverlayRead): Promise<void> {
  const reader = YoutubeRelayReader.get();
  if (!reader.isConfigured()) return;
  // ⭐ The streamer's own login first (D12): their active broadcast for one
  // quota unit. The named channel's `search.list` is the fallback, for a
  // streamer who has not stepped up yet.
  const linked = await linkedYoutubeLive(read.playerId);
  if (linked) {
    const chan = read.channels.youtube ?? linked.channelId;
    read.channels.youtube = chan;
    if (relay.addTuned(read.sentinel, 'youtube', linked.liveChatId, chan)) {
      await reader.subscribe(linked.liveChatId);
    }
    read.youtubeKey = linked.liveChatId;
    return;
  }
  const chan = read.channels.youtube;
  if (!chan) return;
  const resolved = await reader.resolveChannel(chan);
  if (typeof resolved === 'string') return; // not-live / unknown → poll catches it
  const key = resolved.liveChatId;
  if (relay.addTuned(read.sentinel, 'youtube', key, chan)) {
    await reader.subscribe(key);
  }
  read.youtubeKey = key;
}

/**
 * The streamer's own live YouTube broadcast through their stepped-up
 * Google login, or null (not resident, not linked, not live). One quota
 * unit — never a search.
 */
async function linkedYoutubeLive(
  playerId: string,
): Promise<{ liveChatId: string; videoId: string; channelId: string; token: string } | null> {
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  const user = avatar?.getUser();
  if (!user?.googleProfileId) return null;
  const profile = await GoogleProfile.findById<GoogleProfile>(user.googleProfileId);
  if (!profile?.hasYoutube()) return null;
  const token = await YoutubeClient.get().userToken(profile.youtubeRefreshToken);
  if (!token) return null;
  const live = await YoutubeClient.get().liveBroadcastOfUser(token);
  if (!live) return null;
  return { ...live, channelId: profile.youtubeChannelId || playerId, token };
}

function closeOverlayYoutube(relay: StreamRelay, read: OverlayRead): void {
  read.youtubeKey = null;
  const chan = read.channels.youtube;
  if (!chan) return;
  const res = relay.removeTuned(read.sentinel, 'youtube', chan);
  if (res.emptied && res.key) YoutubeRelayReader.get().unsubscribe(res.key);
}

/**
 * A light live-status poll re-resolving a streamer's YouTube channel to
 * catch a stream restart (a new `activeLiveChatId`). A `search.list` is
 * quota-costly, so the interval is deliberately slow (AppSetting).
 */
function startOverlayYoutubePoll(playerId: string, read: OverlayRead): void {
  if (read.poll || !YoutubeRelayReader.get().isConfigured()) return;
  read.poll = ScheduleApi.recurring(overlayPollIntervalMs(), () => {
    void reresolveOverlayYoutube(playerId);
  });
}

function stopOverlayYoutubePoll(read: OverlayRead): void {
  if (!read.poll) return;
  ScheduleApi.cancel(read.poll);
  read.poll = null;
}

async function reresolveOverlayYoutube(playerId: string): Promise<void> {
  const read = overlayReads.get(playerId);
  const reader = YoutubeRelayReader.get();
  if (!read || !reader.isConfigured()) return;
  const relay = await requireRelay();
  const linked = await linkedYoutubeLive(playerId);
  let chan = read.channels.youtube;
  let newKey: string | null;
  if (linked) {
    chan = chan ?? linked.channelId;
    read.channels.youtube = chan;
    newKey = linked.liveChatId;
  } else {
    if (!chan) return;
    const resolved = await reader.resolveChannel(chan);
    newKey = typeof resolved === 'string' ? null : resolved.liveChatId;
  }
  if (newKey === read.youtubeKey) return; // unchanged
  // The streamer restarted (or went offline). Drop the sentinel from the
  // old stream (by exact key — the handle cache may have moved), then bind
  // the new.
  if (read.youtubeKey) {
    const res = relay.removeTunedByKey(read.sentinel, 'youtube', read.youtubeKey);
    if (res.emptied) YoutubeRelayReader.get().unsubscribe(read.youtubeKey);
  }
  read.youtubeKey = newKey;
  if (newKey && chan && relay.addTuned(read.sentinel, 'youtube', newKey, chan)) {
    await reader.subscribe(newKey);
  }
}

// ---- the streamer's own numbers (D16) --------------------------------------
// Viewer counts, uptime, chat rate and who is online go to the STREAMER'S
// client only (`stream.state` via `loadControls`), never to the feed. One
// poll per streamer while they are on air; it stops itself when they are not.

const numberPolls = new Map<string, ScheduleHandle>();
/** Relay-line timestamps per streamer, the last five minutes (chat rate). */
const chatLines = new Map<string, number[]>();
let chatListening = false;
const CHAT_WINDOW_MS = 5 * 60_000;

function statsPollMs(): number {
  try {
    const n = Number(AppApi.setting(AppSettingKeys.streamStatsPollMs));
    return Number.isFinite(n) && n > 0 ? n : 60_000;
  } catch {
    return 60_000;
  }
}

/** Count each relayed line against every streamer whose channel it is. */
function listenForChat(): void {
  if (chatListening) return;
  chatListening = true;
  EventApi.on<RelayMessageEvent>(Events.RelayMessage, (m) => {
    const handle = m.channelHandle.trim().toLowerCase();
    for (const playerId of numberPolls.keys()) {
      const own = channelsOf(playerId)[m.service];
      if (!own || own.trim().toLowerCase() !== handle) continue;
      const now = Date.now();
      const lines = (chatLines.get(playerId) ?? []).filter((t) => t > now - CHAT_WINDOW_MS);
      lines.push(now);
      chatLines.set(playerId, lines);
    }
  });
}

/** Start a streamer's numbers poll if they are on air and none runs. */
function watchNumbersOf(playerId: string): void {
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  if (!avatar || !MixinApi.isBroadcastHost(avatar) || !avatar.isOnAir()) return;
  if (numberPolls.has(playerId)) return;
  listenForChat();
  numberPolls.set(
    playerId,
    ScheduleApi.recurring(statsPollMs(), () => {
      void pushNumbers(playerId);
    }),
  );
  void pushNumbers(playerId);
}

function stopNumbersOf(playerId: string): void {
  const handle = numberPolls.get(playerId);
  if (handle) ScheduleApi.cancel(handle);
  numberPolls.delete(playerId);
  chatLines.delete(playerId);
}

async function pushNumbers(playerId: string): Promise<void> {
  const avatar = PlayerApi.findAvatarByPlayerId(playerId);
  if (!avatar || !MixinApi.isBroadcastHost(avatar) || !avatar.isOnAir()) {
    stopNumbersOf(playerId);
    return;
  }
  const channels = channelsOf(playerId);
  const twitch = channels.twitch ? await TwitchRelayReader.get().streamOf(channels.twitch) : null;
  const linked = await linkedYoutubeLive(playerId);
  const youtube = linked ? await YoutubeClient.get().liveNumbersOf(linked.videoId, linked.token) : null;
  const now = Date.now();
  const lines = (chatLines.get(playerId) ?? []).filter((t) => t > now - CHAT_WINDOW_MS);
  const starts = [twitch?.startedAt, youtube?.startedAt].filter(
    (t): t is number => typeof t === 'number',
  );
  avatar.loadControls({
    viewers: { twitch: twitch?.viewers ?? null, youtube: youtube?.viewers ?? null },
    startedAt: starts.length > 0 ? Math.min(...starts) : null,
    chatRate: lines.length / (CHAT_WINDOW_MS / 60_000),
    online: SocialApi.online().map((a) => a.getName() || a.getPresentation()),
  });
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
  relayRef = await StuffApi.singleton<StreamRelay>(RELAY_PATH);
  return relayRef;
}

/**
 * Resolve the relay speaker for an inbound line. Twitch/Kick: a linked
 * player with an online Avatar → `external-linked` (carries the Avatar
 * ref); otherwise → `external`. YouTube: always `external` (no channel
 * stored → no reverse link this cycle). Honest-to-origin either way.
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
      const linked = linkedOnlineAvatar(users[0]?._id);
      if (linked) {
        return {
          kind: 'external-linked',
          service: 'twitch',
          externalName: display,
          ref: linked,
        };
      }
    }
  }
  if (service === 'kick') {
    const profile = await KickProfile.findByKickUserId(senderUserId);
    if (profile?._id) {
      const users = await User.find({ kickProfileId: profile._id });
      const linked = linkedOnlineAvatar(users[0]?._id);
      if (linked) {
        return {
          kind: 'external-linked',
          service: 'kick',
          externalName: display,
          ref: linked,
        };
      }
    }
  }
  return { kind: 'external', service, externalName: display };
}

/** The online Avatar ref for a user id, or null. */
function linkedOnlineAvatar(userId: string | undefined) {
  if (!userId) return null;
  const avatar = PlayerApi.findAvatarByUserId(userId);
  return avatar ? MessageApi.refOf(avatar) : null;
}
