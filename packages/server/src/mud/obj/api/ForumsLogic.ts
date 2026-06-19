// ForumsLogic — the hot-reloadable logic singleton behind ForumsApi.
// (Doc comment lives on the class declaration so @internal lands on the
// reflection TypeDoc emits, not on the module.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import { Mml } from '../../api/mml';
import { SubjectApi } from '../../api/subject';
import { PlayerApi } from '../../api/player';
import { EventApi } from '../../api/event';
import { AppApi } from '../../api/app';
import Board from '../../lib/forum/Board';
import Entry from '../../lib/forum/Entry';
import Vote, { type VoteValue } from '../../lib/forum/Vote';
import ForumEvent, {
  ForumEventFired,
  type ForumEventKind,
  type ForumEventPayload,
} from '../../lib/forum/ForumEvent';
import type Subject from '../../lib/forum/Subject';
import type { MakeSubjectOptions } from '../SubjectCatalogue';
import type { Stuff } from '../../lib/stuff/Stuff';

/** Sort orders for the popularity organizer. */
export type EntrySort = 'new' | 'top' | 'hot' | 'controversial';

/** The current vote state of an entry for one voter (`null` = no vote). */
export type VoteState = VoteValue | null;

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
    const author = authorIdOf(actor);
    const entry = new Entry();
    entry.board = board._id!;
    entry.parent = null;
    entry.relation = 'reply';
    entry.author = author;
    entry.title = title;
    entry.body = Mml.markdownToMml(body).toString();
    entry.up = 1; // auto-upvote own (Reddit-style; the author's row is locked).
    await entry.save();
    await seedAuthorVote(entry._id!, author);
    await recordEvent({
      kind: 'post-created',
      subject: board.getSubject(),
      board: board._id!,
      thread: entry._id!,
      entry: entry._id!,
      actor: author,
      data: { title },
    });
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
    const author = authorIdOf(actor);
    const entry = new Entry();
    entry.board = parent.board;
    entry.parent = parent._id!;
    entry.relation = 'reply';
    entry.author = author;
    entry.body = Mml.markdownToMml(body).toString();
    entry.up = 1; // auto-upvote own.
    await entry.save();
    await seedAuthorVote(entry._id!, author);
    await recordEvent({
      kind: 'reply-created',
      subject: await subjectIdOfBoard(parent.board),
      board: parent.board,
      thread: await threadRootId(parent),
      entry: entry._id!,
      actor: author,
      data: { parent: parent._id },
    });
    return entry;
  }

  // --- Voting -------------------------------------------------------

  /** See {@link ForumsApi.castVote}. */
  @CallSecurity(ForumsApiCallers)
  public async castVote(
    actor: Stuff,
    entry: Entry,
    direction: VoteValue,
  ): Promise<Entry> {
    const voter = authorIdOf(actor);
    if (voter === entry.author) {
      // The author's auto-upvote row is locked.
      throw new Error('You cannot change the vote on your own entry.');
    }
    const existing = (await Vote.find({ entry: entry._id, voter }))[0] ?? null;
    let nextState: VoteState;
    if (existing && existing.value === direction) {
      // Toggle off → none.
      await existing.delete();
      nextState = null;
    } else if (existing) {
      existing.value = direction;
      await existing.save();
      nextState = direction;
    } else {
      const v = new Vote();
      v.entry = entry._id!;
      v.voter = voter;
      v.value = direction;
      await v.save();
      nextState = direction;
    }

    // Recompute the denormalized aggregate from the vote store.
    const all = await Vote.find({ entry: entry._id });
    entry.up = all.filter((v) => v.value === 'up').length;
    entry.down = all.filter((v) => v.value === 'down').length;
    await entry.save();

    await recordEvent({
      kind: 'vote-cast',
      subject: await subjectIdOfBoard(entry.board),
      board: entry.board,
      thread: await threadRootId(entry),
      entry: entry._id!,
      actor: voter,
      data: { value: nextState, up: entry.up, down: entry.down },
    });
    return entry;
  }

  /** See {@link ForumsApi.getVoteState}. */
  @CallSecurity(ForumsApiCallers)
  public async getVoteState(entry: Entry, voter: string): Promise<VoteState> {
    const existing = (await Vote.find({ entry: entry._id, voter }))[0] ?? null;
    return existing ? existing.value : null;
  }

  /** See {@link ForumsApi.getEntry}. */
  @CallSecurity(ForumsApiCallers)
  public async getEntry(id: string): Promise<Entry | null> {
    return Entry.findById(id);
  }

  /** See {@link ForumsApi.readBoard}. */
  @CallSecurity(ForumsApiCallers)
  public async readBoard(board: Board, sort: EntrySort = 'new'): Promise<Entry[]> {
    const threads = await Entry.find({ board: board._id, parent: null });
    return sortEntries(threads, sort);
  }

  /** See {@link ForumsApi.readThread}. */
  @CallSecurity(ForumsApiCallers)
  public async readThread(
    root: Entry,
    sort: EntrySort = 'new',
  ): Promise<ThreadView> {
    const all = await Entry.find({ board: root.board });
    const posts = sortEntries(
      all.filter((e) => e._id !== root._id && e.parent !== null),
      sort,
    );
    return { root, posts };
  }

  /** See {@link ForumsApi.displayScoreFor}. */
  @CallSecurity(ForumsApiCallers)
  public async displayScoreFor(entry: Entry): Promise<number | null> {
    return displayScoreFor(entry);
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
    await recordEvent({
      kind: 'thread-promoted',
      subject: parentSubject._id!,
      board: board._id!,
      thread: thread._id!,
      entry: thread._id!,
      actor: authorIdOf(actor),
      data: { threadSubject: threadSubject._id },
    });
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
 * The dual-write: append the durable `forum_events` row (silent), then
 * fire the transient `ForumEventFired` on `EventApi` — independent
 * siblings, **persist-then-fire** so no listener sees a live event whose
 * row hasn't landed. Off-class so the mutation methods reach it without
 * an intra-singleton self-call (which the FromModule gate would deny).
 */
async function recordEvent(
  p: Omit<ForumEventPayload, 'at'> & { kind: ForumEventKind },
): Promise<void> {
  const at = Date.now();
  const payload: ForumEventPayload = { ...p, at };
  const row = new ForumEvent();
  row.subject = payload.subject;
  row.board = payload.board;
  row.thread = payload.thread;
  row.entry = payload.entry;
  row.kind = payload.kind;
  row.actor = payload.actor;
  row.at = at;
  row.data = payload.data;
  await row.save(); // durable twin — silent (no change-stream).
  EventApi.fire(new ForumEventFired(payload)); // live feed — persists nothing.
}

/** Create the author's locked auto-upvote row for a fresh entry. */
async function seedAuthorVote(entryId: string, author: string): Promise<void> {
  const v = new Vote();
  v.entry = entryId;
  v.voter = author;
  v.value = 'up';
  await v.save();
}

/** Walk the parent chain to the thread root's `_id`. */
async function threadRootId(entry: Entry): Promise<string> {
  let cur = entry;
  while (cur.parent !== null) {
    const p = await Entry.findById(cur.parent);
    if (!p) break;
    cur = p;
  }
  return cur._id!;
}

/** The subject `_id` of a board (for the event dependency keys). */
async function subjectIdOfBoard(boardId: string): Promise<string> {
  const board = await Board.findById(boardId);
  return board?.getSubject() ?? '';
}

/**
 * Sort entries by a popularity ordering. The server ALWAYS ranks on true
 * scores (the anti-snowball gate is display-only — see `displayScoreFor`).
 *   - `new` — newest first.
 *   - `top` — net score (`up − down`) desc.
 *   - `hot` — `sign(net)·log10(max(|net|,1)) + ageSeconds/45000` desc
 *     (exact constants are deferred tuning).
 *   - `controversial` — high volume + balanced up/down.
 */
function sortEntries(entries: Entry[], mode: EntrySort): Entry[] {
  const list = [...entries];
  switch (mode) {
    case 'top':
      return list.sort((a, b) => b.getScore() - a.getScore());
    case 'hot':
      return list.sort((a, b) => hotScore(b) - hotScore(a));
    case 'controversial':
      return list.sort(
        (a, b) => controversyScore(b) - controversyScore(a),
      );
    case 'new':
    default:
      return list.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
  }
}

function hotScore(e: Entry): number {
  const net = e.getScore();
  const sign = net > 0 ? 1 : net < 0 ? -1 : 0;
  const order = Math.log10(Math.max(Math.abs(net), 1));
  const seconds = e.createdAt.getTime() / 1000;
  return sign * order + seconds / 45000;
}

function controversyScore(e: Entry): number {
  if (e.up <= 0 || e.down <= 0) return 0;
  const magnitude = e.up + e.down;
  const balance = Math.min(e.up, e.down) / Math.max(e.up, e.down);
  return magnitude * balance;
}

const DEFAULT_MIN_VOTES = 5;
const DEFAULT_MIN_MINUTES = 30;

/**
 * The anti-snowball gate (DISPLAY-ONLY): the true net score once the
 * entry has accumulated K votes OR aged T minutes, else `null` (the
 * client renders a placeholder). Server ranking is unaffected — it always
 * sorts on the true score. K / T come from app-settings.
 */
function displayScoreFor(entry: Entry, now: number = Date.now()): number | null {
  const minVotes = settingNumber(
    'forums.antiSnowball.minVotes',
    DEFAULT_MIN_VOTES,
  );
  const minMinutes = settingNumber(
    'forums.antiSnowball.minMinutes',
    DEFAULT_MIN_MINUTES,
  );
  const totalVotes = entry.up + entry.down;
  const ageMinutes = (now - entry.createdAt.getTime()) / 60000;
  if (totalVotes >= minVotes || ageMinutes >= minMinutes) {
    return entry.getScore();
  }
  return null;
}

/** Read a numeric app-setting, falling back to `fallback` on any miss. */
function settingNumber(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = Number(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
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
  // Wake any forum-index subscriptions so a freshly-created board shows up
  // live on the landing list (board creation has no entry to drive it).
  await recordEvent({
    kind: 'board-created',
    subject: subject._id!,
    board: board._id!,
    thread: '',
    entry: '',
    actor: subject.getOwner(),
    data: { name: board.name },
  });
  return board;
}
