/**
 * ChannelCatalogue — singleton Idea owning all chat runtime state.
 *
 * Holds three maps:
 *   - `byName: Map<string, Channel>` — persistent channel cache,
 *     warmed at `postRegister` via `Channel.find({})`.
 *   - `byHandle: Map<string, AdHocChannel>` — runtime-only ad-hoc
 *     registry. Entries live until disbanded or promoted to a
 *     persistent Channel.
 *   - `history: Map<channelId, MessageFrame[]>` — per-channel
 *     history rings (FIFO cap 200), shared for persistent +
 *     ad-hoc channels.
 *
 * Subscription state (tunedIn / muted) for persistent channels rides
 * `PropertiedMixin` on Avatar (`chat.subscription.<channelId>` key).
 * Ad-hoc channel subscriptions are ephemeral — implicit membership
 * via the `byHandle` entry's `members` set.
 *
 * `postToChannel` is the single audience-fanout chokepoint:
 *   1. Resolve members (player-created: read via
 *      `GroupApi.membersOf(channel.groupRef)` — chat is a CONSUMER of
 *      the group substrate, not a provider; standalone: tuned-in
 *      subscribers; ad-hoc: byHandle entry's members set).
 *   2. Compose a Scene with `meta.channelId` stamped on every frame.
 *   3. Append the frame to the history ring.
 *
 * Player-created channels mint a backing managed Group at creation
 * time. The channel doc's `groupRef` is stamped with the resulting
 * `'managed:<groupId>'` reference, and disband cascades to delete
 * the backing Group. The chat substrate is the OWNER of those Groups
 * — `getBackingGroupIds` exposes the set so the user-facing
 * `group list` view can filter them out. The Group model knows
 * nothing about chat.
 *
 * Not persisted itself; seed YAML is `{ class: /obj/ChannelCatalogue,
 * data: {} }`.
 */

import { Idea } from '../lib/stuff/Idea';
import { PostRegistrationMixin } from '../lib/stuff/PostRegistration';
import { Channel, type ChannelKind } from '../lib/social/Channel';
import { Group, type GroupRole } from '../lib/social/Group';
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
import type Avatar from './Avatar';
import type { MessageFrame } from '@saxonberg/types';
import type { VetoResult } from '../lib/errors';

const HISTORY_CAP = 200;

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
  private byName: Map<string, Channel> | null = null;
  private byHandle: Map<string, AdHocChannel> = new Map();
  private history: Map<string, MessageFrame[]> = new Map();
  /**
   * Set of Group `_id`s that back channels in this catalogue. The
   * user-facing `group list` view consults `getBackingGroupIds()`
   * to exclude these from the display. Warmed alongside `byName`
   * at `postRegister` and maintained inline by create / promote /
   * disband.
   */
  private backedGroupIds: Set<string> = new Set();

  public override async postRegister(_context?: unknown): Promise<void> {
    await this.warmCache();
  }

  public async warmCache(): Promise<void> {
    const channels = await Channel.find({});
    const map = new Map<string, Channel>();
    const backed = new Set<string>();
    for (const c of channels) {
      map.set(c.name.toLowerCase(), c);
      const backingId = backingGroupIdOf(c);
      if (backingId) backed.add(backingId);
    }
    this.byName = map;
    this.backedGroupIds = backed;
  }

  public invalidateCache(): void {
    this.byName = null;
  }

  /**
   * Resolve a persistent channel by name (case-insensitive).
   */
  public async resolveByName(name: string): Promise<Channel | null> {
    const map = await this.ensureNameCache();
    return map.get(name.toLowerCase()) ?? null;
  }

  /** Resolve an ad-hoc channel by handle. */
  public resolveHandle(handle: string): AdHocChannel | null {
    return this.byHandle.get(handle) ?? null;
  }

  /**
   * True when `handle` is an ad-hoc channel handle that `actor` is a
   * member of. The DM controller calls this to decide between
   * forwarding to chat (handle path) vs. resolving as Avatar
   * (target path).
   */
  public resolveHandleForActor(actor: Stuff, handle: string): AdHocChannel | null {
    const ad = this.byHandle.get(handle);
    if (!ad) return null;
    if (!ad.members.has(actor)) return null;
    return ad;
  }

  /**
   * Create a new ad-hoc channel with the supplied member set. Returns
   * the AdHocChannel and registers it under its handle.
   */
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
   * List every channel name visible to `actor`:
   *   - All persistent channels (open standalones, plus player-created
   *     channels they're in).
   *   - Ad-hoc handles they're a member of.
   *
   * The filter for "is in the channel" lives here so callers don't
   * have to re-implement it. v1 simplification: standalone channels
   * are listed for everyone; player-created channels are listed only
   * when the asker is in the channel's backing group.
   */
  public async visibleChannels(actor: Stuff): Promise<{
    persistent: Channel[];
    adHoc: AdHocChannel[];
  }> {
    const map = await this.ensureNameCache();
    const persistent: Channel[] = [];
    const playerId = PlayerApi.isAvatarStuff(actor)
      ? actor.getPlayerId()
      : '';
    for (const c of map.values()) {
      if (c.kind === 'open-join-standalone') {
        persistent.push(c);
        continue;
      }
      // player-created: ask the group substrate.
      if (!playerId || !c.groupRef) continue;
      if (await GroupApi.isMember(playerId, c.groupRef)) persistent.push(c);
    }
    const adHoc: AdHocChannel[] = [];
    for (const ad of this.byHandle.values()) {
      if (ad.members.has(actor)) adHoc.push(ad);
      else if (playerId && [...ad.members].some((m) => PlayerApi.isAvatarStuff(m) && m.getPlayerId() === playerId)) {
        adHoc.push(ad);
      }
    }
    return { persistent, adHoc };
  }

  /**
   * Compute the live audience for a persistent channel — tuned-in
   * subscribers (open-join-standalone) or backing-group members
   * (player-created), filtered to those NOT muted.
   */
  public async audienceFor(channel: Channel): Promise<Stuff[]> {
    if (channel.kind === 'open-join-standalone') {
      const out: Stuff[] = [];
      for (const av of PlayerApi.getAllAvatars()) {
        const sub = readSubscription(av, channel);
        if (sub.tunedIn && !sub.muted) out.push(av);
      }
      return out;
    }
    // player-created: route through the group substrate. The ref can
    // point at any GroupProvider source — `managed` today, but the
    // chat layer doesn't care; that's the whole reason it consumes
    // the facade.
    if (!channel.groupRef) return [];
    const members = await GroupApi.membersOf(channel.groupRef);
    const out: Stuff[] = [];
    for (const m of members) {
      if (!PlayerApi.isAvatarStuff(m)) continue;
      const sub = readSubscription(m, channel);
      if (sub.tunedIn && !sub.muted) out.push(m);
    }
    return out;
  }

  /**
   * Post a chat frame to a persistent channel. Composes the Scene
   * (toSelf + toAudience), stamps `meta.channelId`, and pushes the
   * frame into the channel's history ring.
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
    const audience = await this.audienceFor(channel);
    // Chat posts are reactable acts. The self frame rides Scene and so
    // picks up `commandId` for free; the manual witness + history frames
    // built below historically OMITTED it, which would leave chat acts
    // un-correlatable client-side and the act key missing. Read it once
    // and stamp it onto baseMeta below; note the act reactable when
    // present (command-less posts aren't reactable).
    const commandId = ExecutionContextApi.getCurrentCommandContext()?.commandId;
    const reactionScope = 'channel:' + (channel.groupRef || channelId);
    const speakerName = Mml.name(speaker);
    const safeBody = Mml.markdownToMml(body, Mml.perceiverMentionResolver(speaker));
    const selfBody = Mml.compose`[${channel.name}] You: ${safeBody}`;
    const peerBody = Mml.compose`[${channel.name}] ${speakerName}: ${safeBody}`;

    // Send self frame via Scene (carries commandId / causingCommandId
    // attribution; auto-stamps the actor as a Sensor).
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

    // Fan-out to the audience: Scene doesn't carry an arbitrary multi-
    // recipient channel, so emit per-recipient frames directly via the
    // MessageApi chokepoint. Bodies render per-viewer via toString(a)
    // so any per-recipient Mml unwrapping fires.
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
        id: cryptoId(),
        topic: 'world.chat.message',
        tags: ['audience:witness'],
        body: peerBody.toString(a),
        meta: { ...baseMeta },
        payload: basePayload,
      });
    }

    this.appendToHistory(channelId, {
      id: cryptoId(),
      topic: 'world.chat.message',
      tags: ['audience:witness'],
      body: selfBody.toString(speaker),
      meta: { ...baseMeta },
      payload: basePayload,
    });

    // Register the act reactable (idempotent on commandId).
    if (commandId) {
      ReactionApi.noteReactableAct({
        commandId,
        subject: speaker,
        scope: reactionScope,
      });
    }
  }

  /** Append a frame to a channel's history ring (FIFO, capped). */
  public appendToHistory(channelId: string, frame: MessageFrame): void {
    let ring = this.history.get(channelId);
    if (!ring) {
      ring = [];
      this.history.set(channelId, ring);
    }
    ring.push(frame);
    if (ring.length > HISTORY_CAP) ring.shift();
  }

  /** Snapshot of the channel's history ring (oldest → newest). */
  public historyFor(channelId: string): readonly MessageFrame[] {
    return this.history.get(channelId) ?? [];
  }

  /**
   * Read a player's subscription state for a persistent channel.
   * Falls through to `DEFAULT_SUBSCRIPTION` when nothing is set
   * — open standalones are tuned-in by default for everyone.
   */
  public getSubscription(avatar: Avatar, channel: Channel): ChannelSubscription {
    return readSubscription(avatar, channel);
  }

  public setSubscription(
    avatar: Avatar,
    channel: Channel,
    next: Partial<ChannelSubscription>,
  ): ChannelSubscription {
    const current = readSubscription(avatar, channel);
    const merged: ChannelSubscription = {
      tunedIn: next.tunedIn ?? current.tunedIn,
      muted: next.muted ?? current.muted,
    };
    if (MixinApi.isPropertied(avatar)) {
      avatar.setProp(
        subscriptionProperty(channel._id ?? channel.name),
        merged as unknown as PropValue,
      );
    }
    return merged;
  }

  /**
   * Promote an ad-hoc channel into a persistent player-created
   * channel + backing managed Group. Members + history transfer; the
   * ad-hoc entry is disbanded.
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

    // Collect membership from the ad-hoc cohort. Promoter becomes
    // owner; everyone else lands as `member`.
    const memberIds: string[] = [];
    const memberRoles: GroupRole[] = [];
    for (const m of ad.members) {
      if (!PlayerApi.isAvatarStuff(m)) continue;
      const pid = m.getPlayerId();
      memberIds.push(pid);
      memberRoles.push(m === promoter ? 'owner' : 'member');
    }

    const promoterId = avatarPlayerIdOf(promoter);
    const group = await this.mintBackingGroup(newName, promoterId, memberIds, memberRoles);

    const c = new Channel();
    c.name = newName;
    c.kind = 'player-created';
    c.owner = promoterId;
    c.groupRef = `managed:${group._id}`;
    await c.save();
    if (c._id) this.backedGroupIds.add(group._id!);

    // Update cache.
    const map = await this.ensureNameCache();
    map.set(newName.toLowerCase(), c);

    // Migrate history ring.
    const oldRing = this.history.get(handle) ?? [];
    this.history.set(c._id ?? c.name, [...oldRing]);
    this.history.delete(handle);
    this.byHandle.delete(handle);

    // Notify members on the new channel.
    await this.postToChannel(
      promoter,
      c,
      `Promoted this conversation to channel '${newName}'.`,
    );
    return c;
  }

  /**
   * Create a new player-created channel + its backing managed Group.
   * The channel's `groupRef` points at the new Group; chat audience
   * reads route through `GroupApi.membersOf(groupRef)`.
   */
  public async createPlayerChannel(
    owner: Stuff,
    name: string,
  ): Promise<Channel> {
    if (RESERVED_NAMES.has(name.toLowerCase())) {
      throw new Error(`Reserved name '${name}' — pick another.`);
    }
    const existing = await this.resolveByName(name);
    if (existing) {
      throw new Error(`A channel named '${name}' already exists.`);
    }
    const ownerId = avatarPlayerIdOf(owner);
    const group = await this.mintBackingGroup(name, ownerId, [ownerId], ['owner']);
    const c = new Channel();
    c.name = name;
    c.kind = 'player-created';
    c.owner = ownerId;
    c.groupRef = `managed:${group._id}`;
    await c.save();
    this.backedGroupIds.add(group._id!);

    const map = await this.ensureNameCache();
    map.set(name.toLowerCase(), c);
    return c;
  }

  public async disbandPlayerChannel(name: string): Promise<boolean> {
    const c = await this.resolveByName(name);
    if (!c) return false;
    const backingId = backingGroupIdOf(c);
    if (backingId) {
      const g = await Group.findById(backingId);
      if (g) await g.delete();
      this.backedGroupIds.delete(backingId);
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
    // Rename the backing Group to match — the Group name is the
    // friendly handle a future `chat invite` / membership-tool path
    // would surface.
    const backingId = backingGroupIdOf(c);
    if (backingId) {
      const g = await Group.findById(backingId);
      if (g) {
        g.name = newName;
        await g.save();
      }
    }
    const map = await this.ensureNameCache();
    map.delete(oldName.toLowerCase());
    map.set(newName.toLowerCase(), c);
    return c;
  }

  /**
   * Ids of every managed Group this catalogue minted to back a
   * channel. The `group list` view consults this set to exclude
   * channel-backing Groups from the user-facing display (Groups
   * themselves know nothing about chat — chat owns the bookkeeping).
   */
  public getBackingGroupIds(): ReadonlySet<string> {
    return this.backedGroupIds;
  }

  /**
   * Mint a fresh managed Group with the supplied membership. Caller
   * threads the returned Group's `_id` into the Channel's `groupRef`.
   */
  private async mintBackingGroup(
    name: string,
    ownerId: string,
    memberIds: string[],
    memberRoles: GroupRole[],
  ): Promise<Group> {
    const g = new Group();
    g.name = name;
    g.owner = ownerId;
    g.memberIds = [...memberIds];
    g.memberRoles = [...memberRoles];
    await g.save();
    return g;
  }

  /**
   * Returns the set of reserved subcommand words on `chat.yaml` that a
   * new channel name MUST NOT collide with.
   */
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
  'rename',
  'disband',
  'history',
  'promote',
]);

function subscriptionProperty(channelId: string): Property<PropValue> {
  return Property.of<PropValue>(`chat.subscription.${channelId}`);
}

function readSubscription(
  avatar: Avatar,
  channel: Channel,
): ChannelSubscription {
  if (!MixinApi.isPropertied(avatar)) {
    return { ...DEFAULT_SUBSCRIPTION };
  }
  const key = channel._id ?? channel.name;
  const raw = avatar.getProp(subscriptionProperty(key));
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_SUBSCRIPTION };
  const r = raw as Partial<ChannelSubscription>;
  return {
    tunedIn: typeof r.tunedIn === 'boolean' ? r.tunedIn : DEFAULT_SUBSCRIPTION.tunedIn,
    muted: typeof r.muted === 'boolean' ? r.muted : DEFAULT_SUBSCRIPTION.muted,
  };
}

function avatarPlayerIdOf(s: Stuff): string {
  if (PlayerApi.isAvatarStuff(s)) return s.getPlayerId();
  return s.stuffId;
}

/**
 * Extract the backing-Group `_id` from a Channel's `groupRef`. Returns
 * null when the ref is empty (open-join-standalone) or points at a
 * non-managed source (future: mql / contacts-backed channels — those
 * groups aren't owned by chat).
 */
function backingGroupIdOf(c: Channel): string | null {
  if (!c.groupRef) return null;
  try {
    const { source, id } = GroupApi.parseRef(c.groupRef);
    if (source !== 'managed') return null;
    return id;
  } catch {
    return null;
  }
}

function cryptoId(): string {
  // Lightweight per-frame id. Real impl uses nanoid; avoid a new
  // dependency by composing the timestamp + a counter-ish slice.
  return Math.random().toString(36).slice(2, 12);
}
