/**
 * ForumsApi — thin facade over the ForumsLogic singleton.
 *
 * Stable caller-facing surface for the `forum` controller and the Wave 3
 * subscription engine. Board/Entry CRUD + thread promotion; identity +
 * audience defer to the {@link Subject} layer (`SubjectApi`). The live
 * subscription surface (subscribe/unsubscribe/cancel) is folded in here
 * too — one forum-facing Api — forwarding to the separate
 * {@link ForumSubscriptionRegistry} runtime singleton.
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link ForumsLogic} singleton at `/platform/idea/api/forums`,
 * reached synchronously via `StuffApi.singletonSync`. `dest /platform/idea/api/forums`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import type { Stuff } from '../lib/stuff/Stuff';
import type Board from '../lib/forum/Board';
import type Entry from '../lib/forum/Entry';
import type Subject from '../lib/forum/Subject';
import type { BoardOrganizer } from '../lib/forum/Board';
import type { VoteValue } from '../lib/forum/Vote';
import type { MakeSubjectOptions } from '../platform/idea/SubjectCatalogue';
import { ForumsLogic } from '../platform/idea/api/ForumsLogic';

/** Sort orders for the popularity organizer. */
export type EntrySort = 'new' | 'top' | 'hot' | 'controversial';

/** The current vote state of an entry for one voter (`null` = no vote). */
export type VoteState = VoteValue | null;

/** A board paired with its owning subject — the common forum read unit. */
export interface BoardView {
  board: Board;
  subject: Subject;
}

/** A thread root plus its full reply tree (flat, parent-linked). */
export interface ThreadView {
  root: Entry;
  posts: Entry[];
}

/**
 * A node in the computed **argument lens** — the entry plus the one
 * structural fact the neutral default lens derives: whether it is an
 * **open objection** (an `objects-to` with no answering child). The lens
 * reads pure relations; it never reads `up`/`down` and stores no order.
 */
export interface ArgumentLensNode {
  entry: Entry;
  openObjection: boolean;
}

/** Options for `makeForum` — passthrough to the subject mint + board meta. */
export interface MakeForumOptions extends MakeSubjectOptions {
  description?: string;
  /** Which organizer to light (default `'open'`). */
  organizer?: BoardOrganizer;
}

/** The typed edges legal for the `'argument'` organizer (pro/con/neutral). */
export type ArgumentRelation = 'supports' | 'objects-to' | 'responds-to';
import ForumSubscriptionRegistry, {
  type ForumSubscribeRequest,
} from '../platform/idea/ForumSubscriptionRegistry';
import { TemplatePaths } from '../lib/paths';
import type Interactive from '../platform/idea/Interactive';
import { fileURLToPath } from 'url';
import { SecurityApi } from './security';

const LOGIC_PATH = '/platform/idea/api/forums';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/api/ForumsLogic', import.meta.url),
);

function logic(): ForumsLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'ForumsLogic',
      ) as typeof ForumsLogic | null) ?? ForumsLogic)(),
  );
}

const REGISTRY_PATH = TemplatePaths.forumSubscriptionRegistry;
const REGISTRY_CLASS_FILE = fileURLToPath(
  new URL('../platform/idea/ForumSubscriptionRegistry', import.meta.url),
);

function subscriptions(): ForumSubscriptionRegistry {
  return StuffApi.singletonSync(
    REGISTRY_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        REGISTRY_CLASS_FILE,
        'default',
      ) as typeof ForumSubscriptionRegistry | null) ??
        ForumSubscriptionRegistry)(),
  );
}

export class ForumsApi {
  static async createBoardOnSubject(
    subject: Subject,
    opts?: { description?: string; organizer?: BoardOrganizer },
  ): Promise<Board> {
    return logic().createBoardOnSubject(subject, opts ?? {});
  }

  static async makeForum(
    creator: Stuff,
    name: string,
    opts?: MakeForumOptions,
  ): Promise<BoardView> {
    return logic().makeForum(creator, name, opts ?? {});
  }

  static async resolveBoardByHandle(handle: string): Promise<BoardView | null> {
    return logic().resolveBoardByHandle(handle);
  }

  static async getBoard(id: string): Promise<Board | null> {
    return logic().getBoard(id);
  }

  static async getEntry(id: string): Promise<Entry | null> {
    return logic().getEntry(id);
  }

  static async readBoard(board: Board, sort?: EntrySort): Promise<Entry[]> {
    return logic().readBoard(board, sort ?? 'new');
  }

  static async readThread(root: Entry, sort?: EntrySort): Promise<ThreadView> {
    return logic().readThread(root, sort ?? 'new');
  }

  /** The neutral default lens over a whole argument board (spine + tree). */
  static async readArgumentLens(board: Board): Promise<ArgumentLensNode[]> {
    return logic().readArgumentLens(board);
  }

  /** The neutral default lens over a subtree rooted at `root`. */
  static async readArgumentThread(root: Entry): Promise<ArgumentLensNode[]> {
    return logic().readArgumentThread(root);
  }

  static async getVoteState(entry: Entry, voter: string): Promise<VoteState> {
    return logic().getVoteState(entry, voter);
  }

  static async displayScoreFor(entry: Entry): Promise<number | null> {
    return logic().displayScoreFor(entry);
  }

  /* ─── Live subscriptions (the forum document-change observer) ───
   * Forwards to the ForumSubscriptionRegistry singleton, mirroring
   * MqlSubscriptionApi. Consumed by the `forum-subscribe` /
   * `forum-unsubscribe` inbound handlers and the disconnect teardown. */

  static handleSubscribe(req: ForumSubscribeRequest): Promise<void> {
    return subscriptions().handleSubscribe(req);
  }

}

SecurityApi.decorateApiClass(ForumsApi);
