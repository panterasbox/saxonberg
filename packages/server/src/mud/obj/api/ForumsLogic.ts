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
import Board, { type BoardOrganizer } from '../../lib/forum/Board';
import Entry, { type EntryRelation } from '../../lib/forum/Entry';
import Vote, { type VoteValue } from '../../lib/forum/Vote';
import ForumEvent, {
  ForumEventFired,
  type ForumEventKind,
  type ForumEventPayload,
} from '../../lib/forum/ForumEvent';
import type Subject from '../../lib/forum/Subject';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  EntrySort,
  VoteState,
  BoardView,
  ThreadView,
  ArgumentLensNode,
  MakeForumOptions,
  ArgumentRelation,
} from '../../api/forums';

const ForumsApiCallers = SecurityPolicies.FromModule('/api/forums#ForumsApi');

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
    opts: { description?: string; organizer?: BoardOrganizer } = {},
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
    const { description, organizer, ...subjectOpts } = opts;
    const subject = await SubjectApi.makeSubject(creator, name, subjectOpts);
    const board = await buildBoard(subject, { description, organizer });
    return { board, subject };
  }

  /** See {@link ForumsApi.resolveBoardByHandle}. */
  @CallSecurity(ForumsApiCallers)
  public async resolveBoardByHandle(handle: string): Promise<BoardView | null> {
    const subject = await SubjectApi.resolveByTitle(handle);
    if (!subject) return null;
    // A subject lights at most one forum surface in v1 practice; resolve
    // whichever exists (the board carries its own organizer for callers
    // that need to branch). Popularity wins the rare both-lit case.
    const ref =
      subject.manifestationRef('popularity-forum') ??
      subject.manifestationRef('argument-forum');
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
      const ref =
        subject.manifestationRef('popularity-forum') ??
        subject.manifestationRef('argument-forum');
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
    // On an argument board a root Entry is the prose **spine** — reputation-
    // blind, so it is never vote-seeded; the popularity thread is.
    const isArgument = board.getOrganizer() === 'argument';
    const entry = new Entry();
    entry.board = board._id!;
    entry.parent = null;
    entry.relation = 'reply';
    entry.author = author;
    entry.title = title;
    entry.body = Mml.markdownToMml(body).toString();
    entry.up = isArgument ? 0 : 1; // auto-upvote own (popularity only).
    await entry.save();
    if (!isArgument) await seedAuthorVote(entry._id!, author);
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
    const board = await Board.findById(parent.board);
    if (board && board.getOrganizer() === 'argument') {
      // Organizer-scoped vocabulary: a popularity `'reply'` is illegal on
      // an argument board — contribute with --pro/--con/--ask instead.
      throw new Error(
        'Use --pro / --con / --ask to contribute on an argument board.',
      );
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

  /** See {@link ForumsApi.attachClaim}. */
  @CallSecurity(ForumsApiCallers)
  public async attachClaim(
    actor: Stuff,
    parent: Entry,
    relation: ArgumentRelation,
    body: string,
  ): Promise<Entry> {
    if (parent.getState() === 'locked') {
      throw new Error('That claim is locked.');
    }
    const board = await Board.findById(parent.board);
    if (!board) throw new Error('The claim has no board.');
    // The single organizer-scoped vocabulary gate (contribution-time).
    if (!legalRelationsFor(board.getOrganizer()).includes(relation)) {
      throw new Error(
        `Relation '${relation}' is not valid on a ${board.getOrganizer()} board.`,
      );
    }
    const author = authorIdOf(actor);
    const entry = new Entry();
    entry.board = parent.board;
    entry.parent = parent._id!;
    entry.relation = relation;
    entry.author = author;
    entry.body = Mml.markdownToMml(body).toString();
    // No vote seeding — argument entries are reputation-blind (up/down are
    // never read under the argument organizer).
    await entry.save();
    await recordEvent({
      kind: 'argument-attached',
      subject: await subjectIdOfBoard(parent.board),
      board: parent.board,
      thread: await threadRootId(parent),
      entry: entry._id!,
      actor: author,
      data: { parent: parent._id, relation },
    });
    return entry;
  }

  /** See {@link ForumsApi.editBody}. */
  @CallSecurity(ForumsApiCallers)
  public async editBody(
    actor: Stuff,
    entry: Entry,
    body: string,
  ): Promise<Entry> {
    // Edit-in-place on the Entry; the prior body is captured into the
    // append-only `'entry-edited'` event so the trail is lossless (the
    // grounded source the deferred dedup/summarization LLM layer reads).
    const priorBody = entry.getBody();
    entry.body = Mml.markdownToMml(body).toString();
    entry.editedAt = new Date();
    await entry.save();
    await recordEvent({
      kind: 'entry-edited',
      subject: await subjectIdOfBoard(entry.board),
      board: entry.board,
      thread: await threadRootId(entry),
      entry: entry._id!,
      actor: authorIdOf(actor),
      data: { priorBody },
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
    const board = await Board.findById(entry.board);
    if (board && board.getOrganizer() === 'argument') {
      // Principle 1: nothing is ranked under the argument organizer, so
      // there is no vote to cast (up/down are never read here).
      throw new Error('Voting is not available on an argument board.');
    }
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
    // The post-tree is the subtree of entries DESCENDED from this root —
    // not every comment in the board. Collect descendants by walking the
    // parent edges, then sort siblings within each parent. Order is
    // parent-before-child so the client can build the nesting in one pass.
    const all = await Entry.find({ board: root.board });
    const childrenOf = new Map<string, Entry[]>();
    for (const e of all) {
      if (e.parent === null) continue;
      const arr = childrenOf.get(e.parent) ?? [];
      arr.push(e);
      childrenOf.set(e.parent, arr);
    }
    const posts: Entry[] = [];
    const walk = (parentId: string): void => {
      for (const child of sortEntries(childrenOf.get(parentId) ?? [], sort)) {
        posts.push(child);
        walk(child._id!);
      }
    };
    walk(root._id!);
    return { root, posts };
  }

  /** See {@link ForumsApi.displayScoreFor}. */
  @CallSecurity(ForumsApiCallers)
  public async displayScoreFor(entry: Entry): Promise<number | null> {
    return displayScoreFor(entry);
  }

  // --- The argument lens (the neutral default reading) ---------------

  /** See {@link ForumsApi.readArgumentLens}. The whole board's claim-graph. */
  @CallSecurity(ForumsApiCallers)
  public async readArgumentLens(board: Board): Promise<ArgumentLensNode[]> {
    const all = await Entry.find({ board: board._id });
    return buildArgumentLens(all, null);
  }

  /** See {@link ForumsApi.readArgumentThread}. The subtree rooted at `root`. */
  @CallSecurity(ForumsApiCallers)
  public async readArgumentThread(root: Entry): Promise<ArgumentLensNode[]> {
    const all = await Entry.find({ board: root.board });
    return buildArgumentLens(all, root._id ?? null);
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

  // --- The mature → vote seam ---------------------------------------

  /** See {@link ForumsApi.matureArgument}. */
  @CallSecurity(ForumsApiCallers)
  public async matureArgument(actor: Stuff, board: Board): Promise<void> {
    // The decoupled handoff: emit a `mature` event and bind NOTHING. The
    // vote / measure / docket consumer is the deferred governance layer;
    // v1 fires the event into no consumer. Keys carry the spine (the
    // earliest root) so a thread subscription re-resolves too.
    const roots = await Entry.find({ board: board._id, parent: null });
    const spine =
      roots.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      )[0] ?? null;
    await recordEvent({
      kind: 'mature',
      subject: board.getSubject(),
      board: board._id!,
      thread: spine?._id ?? '',
      entry: spine?._id ?? '',
      actor: authorIdOf(actor),
      data: {},
    });
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

/** Valence display order within a parent's children (structural, not ranked). */
const VALENCE_ORDER: Record<EntryRelation, number> = {
  supports: 0,
  'objects-to': 1,
  'responds-to': 2,
  reply: 3,
};

/**
 * Build the **neutral default lens** from a flat entry set: the spine /
 * root(s) first, then each node's children **grouped by valence**
 * (Supporting → Objections → Questions), chronological within a group —
 * **never by score**. Parent-before-child so the client nests in one pass.
 * `openObjection` is an `objects-to` with no answering child (the triage
 * cue + convergence signal). The "dumb store, smart consumers" idiom:
 * everything is derived from pure relations, nothing read from `up`/`down`
 * and no display-order stored on the Entry.
 *
 * `fromId === null` → the whole board (every root + its subtree);
 * otherwise the subtree rooted at `fromId` (inclusive).
 */
function buildArgumentLens(
  all: Entry[],
  fromId: string | null,
): ArgumentLensNode[] {
  const childrenOf = new Map<string, Entry[]>();
  for (const e of all) {
    if (e.parent === null) continue;
    const arr = childrenOf.get(e.parent) ?? [];
    arr.push(e);
    childrenOf.set(e.parent, arr);
  }
  const sortChildren = (list: Entry[]): Entry[] =>
    [...list].sort(
      (a, b) =>
        VALENCE_ORDER[a.relation] - VALENCE_ORDER[b.relation] ||
        a.createdAt.getTime() - b.createdAt.getTime(),
    );
  const isOpenObjection = (e: Entry): boolean =>
    e.relation === 'objects-to' &&
    (childrenOf.get(e._id!)?.length ?? 0) === 0;

  const out: ArgumentLensNode[] = [];
  const emit = (e: Entry): void => {
    out.push({ entry: e, openObjection: isOpenObjection(e) });
    for (const child of sortChildren(childrenOf.get(e._id!) ?? [])) emit(child);
  };

  if (fromId === null) {
    const roots = all
      .filter((e) => e.parent === null)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (const root of roots) emit(root);
  } else {
    const root = all.find((e) => e._id === fromId);
    if (root) emit(root);
  }
  return out;
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
  opts: { description?: string; organizer?: BoardOrganizer },
): Promise<Board> {
  const organizer: BoardOrganizer = opts.organizer ?? 'popularity';
  const surface =
    organizer === 'argument' ? 'argument-forum' : 'popularity-forum';
  if (subject.hasManifestation(surface)) {
    const ref = subject.manifestationRef(surface);
    const existing = ref ? await Board.findById(ref) : null;
    if (existing) return existing;
  }
  const board = new Board();
  board.subject = subject._id!;
  board.organizer = organizer;
  board.name = subject.getTitle();
  board.description = opts.description ?? '';
  await board.save();
  await SubjectApi.addManifestation(subject, surface, board._id!);
  // Wake any forum-index subscriptions so a freshly-created board shows up
  // live on the landing list (board creation has no entry to drive it).
  await recordEvent({
    kind: 'board-created',
    subject: subject._id!,
    board: board._id!,
    thread: '',
    entry: '',
    actor: subject.getOwner(),
    data: { name: board.name, organizer },
  });
  return board;
}

/**
 * The organizer-scoped relation vocabulary — the single source of truth
 * for which edges a board accepts. Popularity uses only `'reply'`;
 * argument uses the three typed claim-graph edges. Enforced at
 * contribution time (`reply` / `attachClaim`).
 */
function legalRelationsFor(organizer: BoardOrganizer): EntryRelation[] {
  return organizer === 'argument'
    ? ['supports', 'objects-to', 'responds-to']
    : ['reply'];
}
