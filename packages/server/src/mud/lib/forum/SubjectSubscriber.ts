/**
 * SubjectSubscriberMixin — per-Avatar subscription state for Subjects
 * (the forum / chat audience spine). One entry per subscribed Subject:
 * a `follow` toggle plus a per-surface mute set.
 *
 * Storage is a typed keyed map (subjectId → SubjectSubscription),
 * persisted as a plain JSON object on the owner — the same structured-
 * value precedent as `ContactsMixin._contacts` / `AliasMixin.aliases`.
 * This replaces the earlier per-subject `PropertiedMixin` keys: the
 * subscription surface is expected to grow (notification prefs,
 * per-surface settings, digests), so it earns a typed home + method
 * contract now rather than an untyped property bag.
 *
 * The merge / default policy and the group-audience checks live on
 * `SubjectCatalogue`; this mixin is the raw keyed store it delegates to.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { SubjectSurface } from './Subject';
import type Subject from './Subject';
import type { Stuff } from '../stuff/Stuff';
import type Board from './Board';
import type Entry from './Entry';
import type { VoteValue } from './Vote';
import type { ArgumentRelation } from '../../api/forums';
import type { BoardView } from '../../api/forums';
import type { Channel } from '../social/Channel';
import type { AdHocChannel } from '../social/AdHocChannel';
import type { ChannelSubscription } from '../../platform/idea/ChannelCatalogue';
import { StuffApi } from '../../api/stuff';
// eslint-disable-next-line no-restricted-imports -- the F2 actor face: a subscriber's subject/chat/forum verbs forward into the comms logic singletons exactly as the api facades do (the Combustible/Energized precedent)
import { SubjectLogic } from '../../platform/idea/api/SubjectLogic';
// eslint-disable-next-line no-restricted-imports -- same seam, the chat half
import { ChatLogic } from '../../platform/idea/api/ChatLogic';
// eslint-disable-next-line no-restricted-imports -- same seam, the forums half
import { ForumsLogic } from '../../platform/idea/api/ForumsLogic';

/** Resolve the HMR-able comms logic singletons (sync). */
function subjectLogic(): SubjectLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/subject',
    () => new SubjectLogic(),
  );
}
function chatLogic(): ChatLogic {
  return StuffApi.singletonSync('/platform/idea/api/chat', () => new ChatLogic());
}
function forumsLogic(): ForumsLogic {
  return StuffApi.singletonSync(
    '/platform/idea/api/forums',
    () => new ForumsLogic(),
  );
}

/** Per-subject subscription: one `follow` toggle + a per-surface mute set. */
export interface SubjectSubscription {
  followed: boolean;
  mutedSurfaces: SubjectSurface[];
}

/** Method contract a Subject-subscribing owner (Avatar) exposes. */
export interface SubjectSubscriber {
  /** This owner's stored subscription for `subjectId`, or undefined. */
  getSubjectSubscription(subjectId: string): SubjectSubscription | undefined;
  /** True if this owner has any stored subscription for `subjectId`. */
  hasSubjectSubscription(subjectId: string): boolean;
  /** Upsert the stored subscription for `subjectId`. */
  setSubjectSubscription(subjectId: string, sub: SubjectSubscription): void;
  /** Drop the stored subscription for `subjectId`. True if one was removed. */
  removeSubjectSubscription(subjectId: string): boolean;
  /** Every subjectId this owner has a stored subscription for. */
  subscribedSubjectIds(): string[];

  // The actor face (F2) — subject/chat/forum verbs, forwarding into the
  // comms logic singletons (policy + audience checks live there).
  /** Every Subject this actor may see (open + member-backed). */
  visibleSubjects(): Promise<Subject[]>;
  /** Is this actor in `subject`'s audience? */
  isAudienceMemberOf(subject: Subject): Promise<boolean>;
  /** The policy-merged subscription for `subjectId` (defaults applied). */
  subjectSubscription(subjectId: string): Promise<SubjectSubscription>;
  /** Policy update of the subscription for `subjectId`. */
  updateSubjectSubscription(
    subjectId: string,
    next: Partial<SubjectSubscription>,
  ): Promise<SubjectSubscription>;
  /** Follow / unfollow `subjectId`. */
  followSubject(subjectId: string, followed: boolean): Promise<SubjectSubscription>;
  /** Mute / unmute one surface of `subjectId`. */
  muteSubjectSurface(
    subjectId: string,
    surface: SubjectSurface,
    muted: boolean,
  ): Promise<SubjectSubscription>;

  /** Resolve an ad-hoc chat handle as this actor. */
  resolveChatHandle(handle: string): Promise<AdHocChannel | null>;
  /** Open an ad-hoc channel with `members` (this actor included). */
  openAdHocChat(members: Iterable<Stuff>): Promise<AdHocChannel>;
  /** Post to a channel as this actor (the audience-fanout chokepoint). */
  postToChannel(channel: Channel, body: string): Promise<void>;
  /** Every channel this actor may see. */
  visibleChannels(): Promise<{ persistent: Channel[]; adHoc: AdHocChannel[] }>;
  /** The chat-facing subscription for `channel`. */
  channelSubscription(channel: Channel): Promise<ChannelSubscription>;
  /** Update the chat-facing subscription for `channel`. */
  updateChannelSubscription(
    channel: Channel,
    next: Partial<ChannelSubscription>,
  ): Promise<ChannelSubscription>;

  /** Every board this actor may see. */
  forumBoards(): Promise<BoardView[]>;
  /** Post a new thread on `board` as this actor. */
  postThread(board: Board, title: string, body: string): Promise<Entry>;
  /** Reply under `parent` as this actor. */
  replyToEntry(parent: Entry, body: string): Promise<Entry>;
  /** Attach a typed claim (pro/con/question) on an argument board. */
  attachClaim(
    parent: Entry,
    relation: ArgumentRelation,
    body: string,
  ): Promise<Entry>;
  /** Edit a claim/post body in place (lossless edit trail). */
  editEntryBody(entry: Entry, body: string): Promise<Entry>;
  /** Cast / retract a vote on `entry`. */
  castVote(entry: Entry, direction: VoteValue): Promise<Entry>;
  /** Promote a thread to a first-class Subject. */
  promoteThread(thread: Entry, threadName: string): Promise<Subject>;
  /** Mark an argument deliberation matured. */
  matureArgument(board: Board): Promise<void>;
}

export function SubjectSubscriberMixin<TBase extends MixinConstructor>(
  Base: TBase,
) {
  return class SubjectSubscriberMixin extends Base implements SubjectSubscriber {
    static _mixinName = 'SubjectSubscriberMixin';

    /**
     * The hydrator round-trips `_subjectSubscriptions` by reflection.
     * Stored as a plain JSON object (subjectId → {followed,
     * mutedSurfaces}); structured-value persistence per the
     * `ContactsMixin._contacts` precedent. Default `{}` hydrates legacy
     * avatar docs (no field) cleanly.
     */
    static fieldMeta: FieldMeta = {
      _subjectSubscriptions: { persistent: true, runtimeState: true },
    };

    _subjectSubscriptions: Record<string, SubjectSubscription> = {};

    getSubjectSubscription(
      subjectId: string,
    ): SubjectSubscription | undefined {
      return this._subjectSubscriptions[subjectId];
    }

    hasSubjectSubscription(subjectId: string): boolean {
      return Object.prototype.hasOwnProperty.call(
        this._subjectSubscriptions,
        subjectId,
      );
    }

    setSubjectSubscription(
      subjectId: string,
      sub: SubjectSubscription,
    ): void {
      this._subjectSubscriptions[subjectId] = sub;
    }

    removeSubjectSubscription(subjectId: string): boolean {
      if (!this.hasSubjectSubscription(subjectId)) return false;
      delete this._subjectSubscriptions[subjectId];
      return true;
    }

    subscribedSubjectIds(): string[] {
      return Object.keys(this._subjectSubscriptions);
    }
    // -- the actor face (F2) — forwards into the comms logic singletons --

    public visibleSubjects(): Promise<Subject[]> {
      return subjectLogic().visibleSubjects(this as unknown as Stuff);
    }

    public isAudienceMemberOf(subject: Subject): Promise<boolean> {
      return subjectLogic().isAudienceMember(this as unknown as Stuff, subject);
    }

    public subjectSubscription(subjectId: string): Promise<SubjectSubscription> {
      return subjectLogic().getSubscription(this as never, subjectId);
    }

    public updateSubjectSubscription(
      subjectId: string,
      next: Partial<SubjectSubscription>,
    ): Promise<SubjectSubscription> {
      return subjectLogic().setSubscription(this as never, subjectId, next);
    }

    public followSubject(
      subjectId: string,
      followed: boolean,
    ): Promise<SubjectSubscription> {
      return subjectLogic().follow(this as never, subjectId, followed);
    }

    public muteSubjectSurface(
      subjectId: string,
      surface: SubjectSurface,
      muted: boolean,
    ): Promise<SubjectSubscription> {
      return subjectLogic().mute(this as never, subjectId, surface, muted);
    }

    public resolveChatHandle(handle: string): Promise<AdHocChannel | null> {
      return chatLogic().resolveHandleForActor(this as unknown as Stuff, handle);
    }

    public openAdHocChat(members: Iterable<Stuff>): Promise<AdHocChannel> {
      return chatLogic().openAdHoc(this as unknown as Stuff, members);
    }

    public postToChannel(channel: Channel, body: string): Promise<void> {
      return chatLogic().postToChannel(this as unknown as Stuff, channel, body);
    }

    public visibleChannels(): Promise<{
      persistent: Channel[];
      adHoc: AdHocChannel[];
    }> {
      return chatLogic().visibleChannels(this as unknown as Stuff);
    }

    public channelSubscription(channel: Channel): Promise<ChannelSubscription> {
      return chatLogic().getSubscription(this as never, channel);
    }

    public updateChannelSubscription(
      channel: Channel,
      next: Partial<ChannelSubscription>,
    ): Promise<ChannelSubscription> {
      return chatLogic().setSubscription(this as never, channel, next);
    }

    public forumBoards(): Promise<BoardView[]> {
      return forumsLogic().listBoards(this as unknown as Stuff);
    }

    public postThread(
      board: Board,
      title: string,
      body: string,
    ): Promise<Entry> {
      return forumsLogic().postThread(this as unknown as Stuff, board, title, body);
    }

    public replyToEntry(parent: Entry, body: string): Promise<Entry> {
      return forumsLogic().reply(this as unknown as Stuff, parent, body);
    }

    public attachClaim(
      parent: Entry,
      relation: ArgumentRelation,
      body: string,
    ): Promise<Entry> {
      return forumsLogic().attachClaim(
        this as unknown as Stuff,
        parent,
        relation,
        body,
      );
    }

    public editEntryBody(entry: Entry, body: string): Promise<Entry> {
      return forumsLogic().editBody(this as unknown as Stuff, entry, body);
    }

    public castVote(entry: Entry, direction: VoteValue): Promise<Entry> {
      return forumsLogic().castVote(this as unknown as Stuff, entry, direction);
    }

    public promoteThread(thread: Entry, threadName: string): Promise<Subject> {
      return forumsLogic().promoteThread(
        this as unknown as Stuff,
        thread,
        threadName,
      );
    }

    public matureArgument(board: Board): Promise<void> {
      return forumsLogic().matureArgument(this as unknown as Stuff, board);
    }
  };
}
