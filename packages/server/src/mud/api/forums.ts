/**
 * ForumsApi — thin facade over the ForumsLogic singleton.
 *
 * Stable caller-facing surface for the `forum` controller and the Wave 3
 * subscription engine. Board/Entry CRUD + thread promotion; identity +
 * audience defer to the {@link Subject} layer (`SubjectApi`).
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
} from '../obj/api/ForumsLogic';
import type { VoteValue } from '../lib/forum/Vote';
import { ForumsLogic } from '../obj/api/ForumsLogic';
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

export class ForumsApi {
  static async createBoardOnSubject(
    subject: Subject,
    opts?: { description?: string },
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

  static async getEntry(id: string): Promise<Entry | null> {
    return logic().getEntry(id);
  }

  static async readBoard(board: Board, sort?: EntrySort): Promise<Entry[]> {
    return logic().readBoard(board, sort ?? 'new');
  }

  static async readThread(root: Entry, sort?: EntrySort): Promise<ThreadView> {
    return logic().readThread(root, sort ?? 'new');
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
}

SecurityApi.decorateApiClass(ForumsApi);
