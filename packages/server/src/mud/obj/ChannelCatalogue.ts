/**
 * ChannelCatalogue — singleton Idea owning all chat runtime state.
 *
 * Post-retrofit, identity + audience live on the {@link Subject} layer
 * (`Channel.subject` → `Subject.owner` + `Subject.groupRef`). This
 * catalogue owns the chat-specific runtime: the `Channel` cache, the
 * ad-hoc registry, the history rings, and the audience-fanout
 * chokepoint. Subject resolution, group minting, and the per-subject
 * subscription store live on `SubjectCatalogue` (reached via the peer
 * singleton); chat reads them through here.
 *
 * Holds:
 *   - `byName: Map<string, Channel>` — persistent channel cache,
 *     warmed at `postRegister` via `Channel.find({})`.
 *   - `byHandle: Map<string, AdHocChannel>` — runtime-only ad-hoc
 *     registry (no subject — `'ad-hoc'` stays runtime-only in v1).
 *   - `history: Map<channelId, MessageFrame[]>` — per-channel history
 *     rings (FIFO cap 200).
 *
 * Subscription state moved from per-channel to **per-subject**
 * (`SubjectCatalogue`); `getSubscription`/`setSubscription` here map the
 * chat-facing `{tunedIn, muted}` shape onto the subject's `{followed,
 * mutedSurfaces}` (`free-chat` surface), migrating any legacy
 * `chat.subscription.<channelId>` key on first read.
 *
 * `postToChannel` is the single audience-fanout chokepoint: resolve
 * members (open: tuned-in subscribers; player-created: backing-group
 * members via the Subject's `groupRef`; ad-hoc: byHandle members),
 * compose a Scene with `meta.channelId` on every frame, append to the
 * history ring.
 *
 * Not persisted itself; seed YAML is `{ class: /obj/ChannelCatalogue,
 * data: {} }`.
 */

import { SecurityApi } from '../api/security';
import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Channel } from '../lib/social/Channel';
import type { GroupRole } from '../lib/social/Group';
import { AdHocChannel } from '../lib/social/AdHocChannel';
import type { Stuff } from '../lib/stuff/Stuff';
import { Property, type PropValue } from '../lib/stuff/Propertied';
import { MixinApi } from '../api/mixin';
import { MessageApi } from '../api/message';
import { ReactionApi } from '../api/reaction';
import { ExecutionContextApi } from '../api/execution-context';
import { Mml } from '../api/mml';
import { PlayerApi } from '../api/player';
import { GroupApi } from '../api/group';
import { StuffApi } from '../api/stuff';
import { AppApi } from '../api/app';
import { AppSettingKeys } from '../lib/config/AppSettings';
import type Avatar from './Avatar';
import type SubjectCatalogue from './SubjectCatalogue';
import type Subject from '../lib/forum/Subject';
import type { MessageFrame } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';
import type { EvictionContext } from '../lib/stuff/Stuff';

/** Fallback when app-settings is unread (pre-warm / tests); the seeded
 * `chat.historyCap` is authoritative at runtime. */
const DEFAULT_HISTORY_CAP = 200;
const SUBJECTS_PATH = '/obj/SubjectCatalogue';

/** The per-channel history ring cap (operator-tunable via `chat.historyCap`). */
function historyCap(): number {
  try {
    const n = Number(AppApi.setting(AppSettingKeys.chatHistoryCap));
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_HISTORY_CAP;
  } catch {
    return DEFAULT_HISTORY_CAP;
  }
}

/** Chat-facing subscription shape, mapped from the per-subject store. */
export interface ChannelSubscription {
  tunedIn: boolean;
  muted: boolean;
}

const DEFAULT_SUBSCRIPTION: ChannelSubscription = {
  tunedIn: true,
  muted: false,
};

const ChannelCatalogueBase = PostRegistrationMixin(Idea);

export default class ChannelCatalogue extends ChannelCatalogueBase {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private byName: Map<string, Channel> | null = null;
  private byHandle: Map<string, AdHocChannel> = new Map();
  private history: Map<string, MessageFrame[]> = new Map();
  private subjectsRef: SubjectCatalogue | null = null;

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmCache();
  }

  public async warmCache(): Promise<void> {
    const channels = await Channel.find({});
    const map = new Map<string, Channel>();
    for (const c of channels) {
      map.set(c.name.toLowerCase(), c);
    }
    this.byName = map;
  }

  public invalidateCache(): void {
    this.byName = null;
  }

  // --- Subject-layer access -----------------------------------------

  /** The peer SubjectCatalogue singleton (sync; throws if unregistered). */
  private subjectsSync(): SubjectCatalogue {
    if (this.subjectsRef) return this.subjectsRef;
    const s = StuffApi.findByTemplatePath<SubjectCatalogue>(SUBJECTS_PATH);
    if (!s) {
      throw new Error(
        'ChannelCatalogue: SubjectCatalogue singleton not registered ' +
          '(bootstrap order: SubjectCatalogue must precede ChannelCatalogue).',
      );
    }
    this.subjectsRef = s;
    return s;
  }

  private async requireSubjects(): Promise<SubjectCatalogue> {
    if (this.subjectsRef) return this.subjectsRef;
    const sync = StuffApi.findByTemplatePath<SubjectCatalogue>(SUBJECTS_PATH);
    if (sync) {
      this.subjectsRef = sync;
      return sync;
    }
    this.subjectsRef = await StuffApi.singleton<SubjectCatalogue>(SUBJECTS_PATH);
    return this.subjectsRef;
  }

  /** Resolve the Subject a channel manifests, or null. */
  public async subjectFor(channel: Channel): Promise<Subject | null> {
    if (!channel.subject) return null;
    const subjects = await this.requireSubjects();
    return subjects.resolveById(channel.subject);
  }

  // --- Channel resolution -------------------------------------------

  public async resolveByName(name: string): Promise<Channel | null> {
    const map = await this.ensureNameCache();
    return map.get(name.toLowerCase()) ?? null;
  }

  public resolveHandle(handle: string): AdHocChannel | null {
    return this.byHandle.get(handle) ?? null;
  }

  public resolveHandleForActor(actor: Stuff, handle: string): AdHocChannel | null {
    const ad = this.byHandle.get(handle);
    if (!ad) return null;
    if (!ad.members.has(actor)) return null;
    return ad;
  }

  public openAdHoc(creator: Stuff, members: Iterable<Stuff>): AdHocChannel {
    const ad = new AdHocChannel({
      createdBy: avatarPlayerIdOf(creator),
      members,
    });
    this.byHandle.set(ad.handle, ad);
    return ad;
  }

  public disbandAdHoc(handle: string): boolean {
    const ok = this.byHandle.delete(handle);
    this.history.delete(handle);
    return ok;
  }

  /**
   * List every channel visible to `actor`: persistent channels whose
   * Subject audience includes the actor (open: everyone), plus ad-hoc
   * handles they're a member of.
   */
  public async visibleChannels(actor: Stuff): Promise<{
    persistent: Channel[];
    adHoc: AdHocChannel[];
  }> {
    const map = await this.ensureNameCache();
    const subjects = await this.requireSubjects();
    const persistent: Channel[] = [];
    for (const c of map.values()) {
      const subj = c.subject ? await subjects.resolveById(c.subject) : null;
      if (!subj) {
        // Unbound legacy channel — treat as open.
        persistent.push(c);
        continue;
      }
      if (subj.isOpen()) {
        persistent.push(c);
        continue;
      }
      if (await subjects.isAudienceMember(actor, subj)) persistent.push(c);
    }
    const playerId = PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : '';
    const adHoc: AdHocChannel[] = [];
    for (const ad of this.byHandle.values()) {
      if (ad.members.has(actor)) adHoc.push(ad);
      else if (
        playerId &&
        [...ad.members].some(
          (m) => PlayerApi.isAvatarStuff(m) && m.getPlayerId() === playerId,
        )
      ) {
        adHoc.push(ad);
      }
    }
    return { persistent, adHoc };
  }

  /**
   * Compute the live audience for a persistent channel — tuned-in
   * subscribers (open) or backing-group members (player-created via the
   * Subject's `groupRef`), filtered to those NOT muted.
   */
  public async audienceFor(channel: Channel): Promise<Stuff[]> {
    const subject = await this.subjectFor(channel);
    if (channel.kind === 'open-join-standalone' || !subject || subject.isOpen()) {
      const out: Stuff[] = [];
      for (const av of PlayerApi.getAllAvatars()) {
        const sub = this.getSubscription(av, channel);
        if (sub.tunedIn && !sub.muted) out.push(av);
      }
      return out;
    }
    // player-created: route through the group substrate via the Subject.
    const members = subject.getGroupRef()
      ? await GroupApi.membersOf(subject.getGroupRef())
      : [];
    const out: Stuff[] = [];
    for (const m of members) {
      if (!PlayerApi.isAvatarStuff(m)) continue;
      const sub = this.getSubscription(m, channel);
      if (sub.tunedIn && !sub.muted) out.push(m);
    }
    return out;
  }

  /**
   * Post a chat frame to a persistent channel. Composes the Scene
   * (toSelf + toAudience), stamps `meta.channelId`, and pushes the frame
   * into the channel's history ring.
   */
  public async postToChannel(
    speaker: Stuff,
    channel: Channel,
    body: string,
  ): Promise<void> {
    if (!MixinApi.isSensor(speaker)) {
      throw new Error('ChannelCatalogue.postToChannel: speaker must be a Sensor');
    }
    const channelId = channel._id ?? channel.name;
    const subject = await this.subjectFor(channel);
    const audience = await this.audienceFor(channel);
    const commandId = ExecutionContextApi.getCurrentCommandContext()?.commandId;
    const reactionScope =
      'channel:' + (subject?.getGroupRef() || channelId);
    const speakerName = Mml.name(speaker);
    const safeBody = Mml.markdownToMml(body, Mml.perceiverMentionResolver(speaker));
    const selfBody = Mml.compose`[${channel.name}] You: ${safeBody}`;
    const peerBody = Mml.compose`[${channel.name}] ${speakerName}: ${safeBody}`;

    MessageApi.scene(speaker)
      .topic('world.chat.message')
      .modality('verbal-esp')
      .meta({ channelId })
      .toSelf(selfBody)
      .payload({
        channelId,
        channelName: channel.name,
        speaker: MessageApi.refOf(speaker),
        text: body,
      })
      .send();

    const baseMeta: MessageFrame['meta'] = {
      timestamp: Date.now(),
      modality: 'verbal-esp',
      channelId,
      ...(commandId !== undefined ? { commandId } : {}),
    };
    const basePayload = {
      channelId,
      channelName: channel.name,
      speaker: MessageApi.refOf(speaker),
      text: body,
    };

    for (const a of audience) {
      if (a === speaker) continue;
      if (!MixinApi.isSensor(a)) continue;
      MessageApi.sendMessage(a, {
        id: SecurityApi.uuid(),
        topic: 'world.chat.message',
        tags: ['audience:witness'],
        body: peerBody.toString(a),
        meta: { ...baseMeta },
        payload: basePayload,
      });
    }

    this.appendToHistory(channelId, {
      id: SecurityApi.uuid(),
      topic: 'world.chat.message',
      tags: ['audience:witness'],
      body: selfBody.toString(speaker),
      meta: { ...baseMeta },
      payload: basePayload,
    });

    if (commandId) {
      ReactionApi.noteReactableAct({
        commandId,
        subject: speaker,
        scope: reactionScope,
      });
    }
  }

  public appendToHistory(channelId: string, frame: MessageFrame): void {
    let ring = this.history.get(channelId);
    if (!ring) {
      ring = [];
      this.history.set(channelId, ring);
    }
    ring.push(frame);
    if (ring.length > historyCap()) ring.shift();
  }

  public historyFor(channelId: string): readonly MessageFrame[] {
    return this.history.get(channelId) ?? [];
  }

  // --- Subscription (mapped onto the per-subject store) -------------

  /**
   * Read a player's chat subscription for a channel. Resolves through the
   * channel's Subject (`free-chat` surface), porting any legacy
   * `chat.subscription.<channelId>` key on first read.
   */
  public getSubscription(avatar: Avatar, channel: Channel): ChannelSubscription {
    if (!channel.subject) return { ...DEFAULT_SUBSCRIPTION };
    const subjects = this.subjectsSync();
    const legacy = readLegacyChannelSub(avatar, channel._id ?? channel.name);
    if (legacy) {
      subjects.migrateLegacySubscription(avatar, channel.subject, legacy);
    }
    const sub = subjects.getSubscription(avatar, channel.subject);
    return {
      tunedIn: sub.followed,
      muted: sub.mutedSurfaces.includes('free-chat'),
    };
  }

  public setSubscription(
    avatar: Avatar,
    channel: Channel,
    next: Partial<ChannelSubscription>,
  ): ChannelSubscription {
    if (!channel.subject) return { ...DEFAULT_SUBSCRIPTION, ...next };
    const subjects = this.subjectsSync();
    if (next.tunedIn !== undefined) {
      subjects.follow(avatar, channel.subject, next.tunedIn);
    }
    if (next.muted !== undefined) {
      subjects.mute(avatar, channel.subject, 'free-chat', next.muted);
    }
    const sub = subjects.getSubscription(avatar, channel.subject);
    return {
      tunedIn: sub.followed,
      muted: sub.mutedSurfaces.includes('free-chat'),
    };
  }

  // --- Lifecycle: create / promote / disband / rename ---------------

  /**
   * Promote an ad-hoc channel into a persistent player-created channel +
   * a curated Subject (managed group from the cohort). Members + history
   * transfer; the ad-hoc entry is disbanded.
   */
  public async promoteAdHocToManaged(
    handle: string,
    newName: string,
    promoter: Stuff,
  ): Promise<Channel> {
    const ad = this.byHandle.get(handle);
    if (!ad) throw new Error(`No ad-hoc channel with handle '${handle}'`);
    const existing = await this.resolveByName(newName);
    if (existing) {
      throw new Error(`A channel named '${newName}' already exists.`);
    }

    const curatedMembers: { id: string; role: GroupRole }[] = [];
    for (const m of ad.members) {
      if (!PlayerApi.isAvatarStuff(m)) continue;
      if (m === promoter) continue;
      curatedMembers.push({ id: m.getPlayerId(), role: 'member' });
    }

    const subjects = await this.requireSubjects();
    const subject = await subjects.makeSubject(promoter, newName, {
      curatedMembers,
    });

    const c = new Channel();
    c.name = newName;
    c.kind = 'player-created';
    c.subject = subject._id!;
    c.procedure = 'free';
    await c.save();
    await subjects.addManifestation(subject, 'free-chat', c._id!);

    const map = await this.ensureNameCache();
    map.set(newName.toLowerCase(), c);

    const oldRing = this.history.get(handle) ?? [];
    this.history.set(c._id ?? c.name, [...oldRing]);
    this.history.delete(handle);
    this.byHandle.delete(handle);

    await this.postToChannel(
      promoter,
      c,
      `Promoted this conversation to channel '${newName}'.`,
    );
    return c;
  }

  /**
   * Create a new player-created channel + its curated Subject (managed
   * group). The Subject owns identity + audience; the channel is its
   * `free-chat` surface.
   */
  public async createPlayerChannel(owner: Stuff, name: string): Promise<Channel> {
    const subjects = await this.requireSubjects();
    if (RESERVED_NAMES.has(name.toLowerCase())) {
      throw new Error(`Reserved name '${name}' — pick another.`);
    }
    const existing = await this.resolveByName(name);
    if (existing) {
      throw new Error(`A channel named '${name}' already exists.`);
    }
    // makeSubject mints the managed group + enforces the global handle.
    const subject = await subjects.makeSubject(owner, name, {});
    const c = new Channel();
    c.name = name;
    c.kind = 'player-created';
    c.subject = subject._id!;
    c.procedure = 'free';
    await c.save();
    await subjects.addManifestation(subject, 'free-chat', c._id!);

    const map = await this.ensureNameCache();
    map.set(name.toLowerCase(), c);
    return c;
  }

  /**
   * Attach a chat surface to an existing Subject (`chat on <subject>`).
   * Only the Subject owner may attach. The channel takes the Subject's
   * title as its name.
   */
  public async attachChatToSubject(
    subject: Subject,
    procedure: 'free' | 'rules-of-order' = 'free',
  ): Promise<Channel> {
    const subjects = await this.requireSubjects();
    const surface = procedure === 'free' ? 'free-chat' : 'rules-chat';
    if (subject.hasManifestation(surface)) {
      const existingId = subject.manifestationRef(surface);
      const existing = existingId
        ? (await Channel.findById(existingId)) ?? null
        : null;
      if (existing) {
        const map = await this.ensureNameCache();
        map.set(existing.name.toLowerCase(), existing);
        return existing;
      }
    }
    const c = new Channel();
    c.name = subject.getTitle();
    c.kind = subject.isOpen() ? 'open-join-standalone' : 'player-created';
    c.subject = subject._id!;
    c.procedure = procedure;
    await c.save();
    await subjects.addManifestation(subject, surface, c._id!);
    const map = await this.ensureNameCache();
    map.set(c.name.toLowerCase(), c);
    return c;
  }

  public async disbandPlayerChannel(name: string): Promise<boolean> {
    const c = await this.resolveByName(name);
    if (!c) return false;
    if (c.subject) {
      const subjects = await this.requireSubjects();
      const subj = await subjects.resolveById(c.subject);
      if (subj) await subjects.deleteSubject(subj);
    }
    await c.delete();
    const map = await this.ensureNameCache();
    map.delete(name.toLowerCase());
    if (c._id) this.history.delete(c._id);
    return true;
  }

  public async renamePlayerChannel(
    oldName: string,
    newName: string,
  ): Promise<Channel> {
    if (RESERVED_NAMES.has(newName.toLowerCase())) {
      throw new Error(`Reserved name '${newName}' — pick another.`);
    }
    const c = await this.resolveByName(oldName);
    if (!c) throw new Error(`No channel '${oldName}'.`);
    const clash = await this.resolveByName(newName);
    if (clash) throw new Error(`Channel '${newName}' already exists.`);
    c.name = newName;
    await c.save();
    // Rename the Subject handle (and its backing group) to match.
    if (c.subject) {
      const subjects = await this.requireSubjects();
      const subj = await subjects.resolveById(c.subject);
      if (subj) await subjects.renameSubject(subj, newName);
    }
    const map = await this.ensureNameCache();
    map.delete(oldName.toLowerCase());
    map.set(newName.toLowerCase(), c);
    return c;
  }

  /**
   * Ids of every managed Group backing a chat channel — now owned by the
   * Subject layer. Delegates to `SubjectCatalogue.getBackingGroupIds` so
   * the user-facing `group list` view still filters channel-backing
   * Groups out.
   */
  public async getBackingGroupIds(): Promise<ReadonlySet<string>> {
    const subjects = await this.requireSubjects();
    return subjects.getBackingGroupIds();
  }

  public reservedNames(): ReadonlySet<string> {
    return RESERVED_NAMES;
  }

  public canDestruct(): VetoResult {
    return {
      ok: false,
      reason:
        'ChannelCatalogue is a system singleton and cannot be destructed; ' +
        'use forceDestruct (admin-gated) if you really mean it',
    };
  }

  private async ensureNameCache(): Promise<Map<string, Channel>> {
    if (this.byName) return this.byName;
    await this.warmCache();
    return this.byName!;
  }
}

const RESERVED_NAMES: ReadonlySet<string> = new Set([
  'list',
  'join',
  'leave',
  'mute',
  'unmute',
  'who',
  'make',
  'on',
  'rename',
  'disband',
  'history',
  'promote',
]);

/**
 * Read a legacy per-channel `chat.subscription.<channelId>` value, if any,
 * for one-time migration onto the per-subject store. Returns null when no
 * legacy key is set.
 */
function readLegacyChannelSub(
  avatar: Avatar,
  channelId: string,
): { tunedIn: boolean; muted: boolean } | null {
  if (!MixinApi.isPropertied(avatar)) return null;
  const raw = avatar.getProp(
    Property.of<PropValue>(`chat.subscription.${channelId}`),
  );
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as { tunedIn?: boolean; muted?: boolean };
  return {
    tunedIn: typeof r.tunedIn === 'boolean' ? r.tunedIn : true,
    muted: typeof r.muted === 'boolean' ? r.muted : false,
  };
}

function avatarPlayerIdOf(s: Stuff): string {
  if (PlayerApi.isAvatarStuff(s)) return s.getPlayerId();
  return s.stuffId;
}
