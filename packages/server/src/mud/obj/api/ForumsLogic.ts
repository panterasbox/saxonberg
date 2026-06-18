// ForumsLogic — the hot-reloadable logic singleton behind ForumsApi.
// (Doc comment lives on the class declaration so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Mml } from '../../api/mml';
import { SubjectApi } from '../../api/subject';
import { PlayerApi } from '../../api/player';
import Board from '../../lib/forum/Board';
import Entry from '../../lib/forum/Entry';
import type Subject from '../../lib/forum/Subject';
import type { MakeSubjectOptions } from '../SubjectCatalogue';
import type { Stuff } from '../../lib/stuff/Stuff';

const ForumsApiCallers = SecurityPolicies.FromModule('mud/api/forums#ForumsApi');

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

/** Options for `makeForum` — passthrough to the subject mint + board meta. */
export interface MakeForumOptions extends MakeSubjectOptions {
  description?: string;
}

/**
 * ForumsLogic — the hot-reloadable logic singleton behind {@link ForumsApi}.
 *
 * Lives at `/obj/api/forums`; `ForumsApi`'s public statics forward here.
 * Performs the Board/Entry Document CRUD directly (no separate catalogue
 * — boards are resolved through the {@link Subject} layer's
 * manifestations). All mutations are funneled here so the Wave 2
 * `record(event)` dual-write has a single home.
 *
 * Stateless by construction (no `PostRegistrationMixin`).
 *
 * @internal
 */
@Unshadowable
export class ForumsLogic extends Idea {
  // --- Board lifecycle ----------------------------------------------

  /** See {@link ForumsApi.createBoardOnSubject}. */
  @CallSecurity(ForumsApiCallers)
  public async createBoardOnSubject(
    subject: Subject,
    opts: { description?: string } = {},
  ): Promise<Board> {
    return buildBoard(subject, opts);
  }

  /** See {@link ForumsApi.makeForum}. */
  @CallSecurity(ForumsApiCallers)
  public async makeForum(
    creator: Stuff,
    name: string,
    opts: MakeForumOptions = {},
  ): Promise<BoardView> {
    // No intra-singleton self-call (it would fail the FromModule gate —
    // the caller would be this logic module, not the Api). Both the
    // public method and this sugar route through the off-class
    // `buildBoard` helper, the ChatLogic precedent.
    const { description, ...subjectOpts } = opts;
    const subject = await SubjectApi.makeSubject(creator, name, subjectOpts);
    const board = await buildBoard(subject, { description });
    return { board, subject };
  }

  /** See {@link ForumsApi.resolveBoardByHandle}. */
  @CallSecurity(ForumsApiCallers)
  public async resolveBoardByHandle(handle: string): Promise<BoardView | null> {
    const subject = await SubjectApi.resolveByTitle(handle);
    if (!subject) return null;
    const ref = subject.manifestationRef('popularity-forum');
    if (!ref) return null;
    const board = await Board.findById(ref);
    if (!board) return null;
    return { board, subject };
  }

  /** See {@link ForumsApi.getBoard}. */
  @CallSecurity(ForumsApiCallers)
  public async getBoard(id: string): Promise<Board | null> {
    return Board.findById(id);
  }

  /** See {@link ForumsApi.listBoards}. */
  @CallSecurity(ForumsApiCallers)
  public async listBoards(actor: Stuff): Promise<BoardView[]> {
    const subjects = await SubjectApi.visibleSubjects(actor);
    const out: BoardView[] = [];
    for (const subject of subjects) {
      const ref = subject.manifestationRef('popularity-forum');
      if (!ref) continue;
      const board = await Board.findById(ref);
      if (board) out.push({ board, subject });
    }
    return out;
  }

  // --- Entry lifecycle ----------------------------------------------

  /** See {@link ForumsApi.postThread}. */
  @CallSecurity(ForumsApiCallers)
  public async postThread(
    actor: Stuff,
    board: Board,
    title: string,
    body: string,
  ): Promise<Entry> {
    const entry = new Entry();
    entry.board = board._id!;
    entry.parent = null;
    entry.relation = 'reply';
    entry.author = authorIdOf(actor);
    entry.title = title;
    entry.body = Mml.markdownToMml(body).toString();
    await entry.save();
    return entry;
  }

  /** See {@link ForumsApi.reply}. */
  @CallSecurity(ForumsApiCallers)
  public async reply(
    actor: Stuff,
    parent: Entry,
    body: string,
  ): Promise<Entry> {
    if (parent.getState() === 'locked') {
      throw new Error('That thread is locked.');
    }
    const entry = new Entry();
    entry.board = parent.board;
    entry.parent = parent._id!;
    entry.relation = 'reply';
    entry.author = authorIdOf(actor);
    entry.body = Mml.markdownToMml(body).toString();
    await entry.save();
    return entry;
  }

  /** See {@link ForumsApi.getEntry}. */
  @CallSecurity(ForumsApiCallers)
  public async getEntry(id: string): Promise<Entry | null> {
    return Entry.findById(id);
  }

  /** See {@link ForumsApi.readBoard}. */
  @CallSecurity(ForumsApiCallers)
  public async readBoard(board: Board): Promise<Entry[]> {
    const threads = await Entry.find({ board: board._id, parent: null });
    // Default order: newest first (Wave 2 layers in the popularity sorts).
    return threads.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /** See {@link ForumsApi.readThread}. */
  @CallSecurity(ForumsApiCallers)
  public async readThread(root: Entry): Promise<ThreadView> {
    const all = await Entry.find({ board: root.board });
    const posts = all
      .filter((e) => e._id !== root._id && e.parent !== null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return { root, posts };
  }

  // --- Thread promotion ---------------------------------------------

  /** See {@link ForumsApi.promoteThread}. */
  @CallSecurity(ForumsApiCallers)
  public async promoteThread(
    actor: Stuff,
    thread: Entry,
    threadName: string,
  ): Promise<Subject> {
    if (!thread.isRoot()) {
      throw new Error('Only a thread root can be promoted.');
    }
    if (thread.getSubject()) {
      const existing = await SubjectApi.resolveById(thread.getSubject()!);
      if (existing) return existing;
    }
    const board = await Board.findById(thread.board);
    if (!board) throw new Error('The thread has no board.');
    const parentSubject = await SubjectApi.resolveById(board.getSubject());
    if (!parentSubject) throw new Error('The board has no subject.');
    const threadSubject = await SubjectApi.makeThreadSubject(
      actor,
      parentSubject,
      threadName,
    );
    thread.subject = threadSubject._id!;
    await thread.save();
    return threadSubject;
  }
}

// ---------------------------------------------------------------------------
// Helpers (module-private, off-class).
// ---------------------------------------------------------------------------

function authorIdOf(actor: Stuff): string {
  return PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : actor.stuffId;
}

/**
 * Build (or return the existing) popularity Board for a subject and light
 * its `popularity-forum` manifestation. Off-class so both the public
 * `createBoardOnSubject` method and the `makeForum` sugar reach it
 * without an intra-singleton self-call (which would fail the FromModule
 * gate — the caller would resolve to this logic module, not the Api).
 */
async function buildBoard(
  subject: Subject,
  opts: { description?: string },
): Promise<Board> {
  if (subject.hasManifestation('popularity-forum')) {
    const ref = subject.manifestationRef('popularity-forum');
    const existing = ref ? await Board.findById(ref) : null;
    if (existing) return existing;
  }
  const board = new Board();
  board.subject = subject._id!;
  board.organizer = 'popularity';
  board.name = subject.getTitle();
  board.description = opts.description ?? '';
  await board.save();
  await SubjectApi.addManifestation(subject, 'popularity-forum', board._id!);
  return board;
}
