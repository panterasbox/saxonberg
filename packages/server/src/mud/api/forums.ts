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
 * hot-reloadable {@link ForumsLogic} singleton at `/obj/api/forums`,
 * reached synchronously via `StuffApi.singletonSync`. `dest /obj/api/forums`
 * reloads it.
 */

import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
import type { Stuff } from '../lib/stuff/Stuff';
import type Board from '../lib/forum/Board';
import type Entry from '../lib/forum/Entry';
import type Subject from '../lib/forum/Subject';
import type {
  BoardView,
  ThreadView,
  MakeForumOptions,
  EntrySort,
  VoteState,
  ArgumentRelation,
  ArgumentLensNode,
} from '../obj/api/ForumsLogic';
import type { BoardOrganizer } from '../lib/forum/Board';
import type { VoteValue } from '../lib/forum/Vote';
import { ForumsLogic } from '../obj/api/ForumsLogic';
import ForumSubscriptionRegistry, {
  type ForumSubscribeRequest,
} from '../obj/ForumSubscriptionRegistry';
import { TemplatePaths } from '../lib/paths';
import type Interactive from '../obj/Interactive';
import { fileURLToPath } from 'url';

const LOGIC_PATH = '/obj/api/forums';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/ForumsLogic', import.meta.url),
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
  new URL('../obj/ForumSubscriptionRegistry', import.meta.url),
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

  static async listBoards(actor: Stuff): Promise<BoardView[]> {
    return logic().listBoards(actor);
  }

  static async postThread(
    actor: Stuff,
    board: Board,
    title: string,
    body: string,
  ): Promise<Entry> {
    return logic().postThread(actor, board, title, body);
  }

  static async reply(actor: Stuff, parent: Entry, body: string): Promise<Entry> {
    return logic().reply(actor, parent, body);
  }

  /** Attach a typed claim (pro/con/question) on an argument board. */
  static async attachClaim(
    actor: Stuff,
    parent: Entry,
    relation: ArgumentRelation,
    body: string,
  ): Promise<Entry> {
    return logic().attachClaim(actor, parent, relation, body);
  }

  /** Edit a claim/post body in place (lossless `'entry-edited'` trail). */
  static async editBody(
    actor: Stuff,
    entry: Entry,
    body: string,
  ): Promise<Entry> {
    return logic().editBody(actor, entry, body);
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

  static async castVote(
    actor: Stuff,
    entry: Entry,
    direction: VoteValue,
  ): Promise<Entry> {
    return logic().castVote(actor, entry, direction);
  }

  static async getVoteState(entry: Entry, voter: string): Promise<VoteState> {
    return logic().getVoteState(entry, voter);
  }

  static async displayScoreFor(entry: Entry): Promise<number | null> {
    return logic().displayScoreFor(entry);
  }

  static async promoteThread(
    actor: Stuff,
    thread: Entry,
    threadName: string,
  ): Promise<Subject> {
    return logic().promoteThread(actor, thread, threadName);
  }

  /**
   * Mark an argument deliberation matured — emits a decoupled `mature`
   * event the deferred vote layer will consume; binds nothing in v1.
   */
  static async matureArgument(actor: Stuff, board: Board): Promise<void> {
    return logic().matureArgument(actor, board);
  }

  /* ─── Live subscriptions (the forum document-change observer) ───
   * Forwards to the ForumSubscriptionRegistry singleton, mirroring
   * MqlSubscriptionApi. Consumed by the `forum-subscribe` /
   * `forum-unsubscribe` inbound handlers and the disconnect teardown. */

  static handleSubscribe(req: ForumSubscribeRequest): Promise<void> {
    return subscriptions().handleSubscribe(req);
  }

  static handleUnsubscribe(
    interactive: Interactive,
    subscriptionId: string,
  ): void {
    subscriptions().handleUnsubscribe(interactive, subscriptionId);
  }

  static cancelAllForInteractive(interactive: Interactive): void {
    subscriptions().cancelAllForInteractive(interactive);
  }
}

SecurityApi.decorateApiClass(ForumsApi);
