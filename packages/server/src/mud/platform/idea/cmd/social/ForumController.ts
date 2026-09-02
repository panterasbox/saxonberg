/**
 * ForumController — the `forum` verb: read + post on popularity boards.
 *
 * Afforded by the hosted `ForumsUpdate` (the born-with forum capability,
 * `ForumsMixin.commandContributions`). The capability is reached via the
 * `commandSource` that afforded the verb, else an MQL `reachable`-pool
 * fallback (the `DmController` pattern); an actor without a
 * forum update is refused.
 *
 * Subcommands (subcommand-first, `fallthrough: true` for a bare
 * `forum <board>` read):
 *   - `list` — visible boards.
 *   - `make <name>` — create a subject + board (sugar); `--open`/`--group`
 *     pick the audience; `--ordered` lights the ordered organizer.
 *   - `on <subject>` — attach a board to an owned subject (`--ordered`).
 *   - `post <board> <body>` — start a thread / the ordered board's **spine**.
 *   - `reply <entry> <body>` — reply (popularity) or attach a typed claim
 *     on an ordered board with `--pro` / `--con` / `--rebut`.
 *   - `edit <entry> <body>` — edit a body in place (author/owner;
 *     lossless `'entry-edited'` trail).
 *   - `read <board> [thread]` — board thread-list or a thread's tree.
 *   - `vote <entry> up|down` — vote (open only; refused on ordered).
 *   - `mature <board>` — mark an ordered forum matured (owner;
 *     emits the decoupled `mature` event, no consumer in v1).
 *   - `promote <board> <thread> <name>` — mint a thread-subject + chat.
 *   - `follow <subject>` — follow all the subject's lit surfaces.
 *
 * Controllers return `void`; outcomes ride the dispatch-response
 * envelope (Wave 2 adds `vote` + sort selectors).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import { MqlApi } from '../../../../api/mql';
import { ForumsApi } from '../../../../api/forums';
import { SubjectApi } from '../../../../api/subject';
import { PlayerApi } from '../../../../api/player';
import type { Forums } from '../../../../lib/forum/Forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Subject from '../../../../lib/forum/Subject';
import type { EntrySort, ArgumentRelation } from '../../../../api/forums';
import type { VoteValue } from '../../../../lib/forum/Vote';

interface ForumModel extends CommandModel {
  board?: string;
  name?: string;
  entry?: string;
  thread?: string;
  title?: string;
  body?: string;
  description?: string;
  open?: boolean;
  group?: string;
  ordered?: boolean;
  pro?: boolean;
  con?: boolean;
  rebut?: boolean;
  sort?: string;
  direction?: string;
}

const VALID_SORTS = new Set<EntrySort>(['new', 'top', 'hot', 'controversial']);

/** Resolve the operator's hosted forum update — commandSource or the MQL
 *  `reachable` pool. */
function resolveForums(context: CommandContext): (Stuff & Forums) | null {
  const source = context.commandSource;
  if (source && MixinApi.isForums(source)) return source;
  return (
    MqlApi.resolveMany('person', {
      commandGiver: context.commandGiver,
      scope: 'person',
    }).stuff.find((s): s is Stuff & Forums => MixinApi.isForums(s)) ?? null
  );
}

export default class ForumController extends CommandController<ForumModel> {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    const forums = resolveForums(context);
    if (!forums) {
      MessageApi.scene(context.commandGiver)
        .topic('shell.result')
        .toSelf(Mml.compose`You have no way to reach the forums.`)
        .send();
      context.note({ kind: 'mixin-missing', mixin: 'ForumsMixin' });
      return;
    }

    const sub = model.subcommand;
    if (sub === undefined) {
      // Bare `forum <board>` → read the board.
      return this.executeRead(model, context);
    }
    switch (sub) {
      case 'list':
        return this.executeList(context);
      case 'make':
        return this.executeMake(model, context);
      case 'on':
        return this.executeOn(model, context);
      case 'post':
        return this.executePost(model, context);
      case 'reply':
        return this.executeReply(model, context);
      case 'edit':
        return this.executeEdit(model, context);
      case 'read':
        return this.executeRead(model, context);
      case 'vote':
        return this.executeVote(model, context);
      case 'mature':
        return this.executeMature(model, context);
      case 'promote':
        return this.executePromote(model, context);
      case 'follow':
        return this.executeFollow(model, context);
      default:
        return this.fail(context, `Unknown forum subcommand: ${sub}`, 'unknown-subcommand');
    }
  }

  private async executeList(context: CommandContext): Promise<void> {
    const boards = await ForumsApi.listBoards(context.commandGiver);
    if (boards.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo boards.\n`));
      return;
    }
    const lines = ['Boards:'];
    for (const { subject } of boards) {
      const audience = subject.isOpen() ? 'open' : 'members';
      lines.push(`  ${subject.getTitle()}  [${audience}]`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeMake(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const name = (model.name ?? '').trim();
    if (!name) return this.fail(context, 'forum name required', 'name-required');
    const group = (model.group ?? '').trim();
    const ordered = model.ordered === true;
    try {
      const { subject } = await ForumsApi.makeForum(context.commandGiver, name, {
        open: model.open === true,
        organizer: ordered ? 'ordered' : 'open',
        ...(group ? { groupRef: group } : {}),
        ...(model.description ? { description: model.description } : {}),
      });
      const kind = ordered ? 'ordered forum' : 'forum';
      const hint = ordered
        ? ` Post the proposal with \`forum post ${subject.getTitle()} <thesis>\`.`
        : '';
      this.send(
        context,
        Mml.compose`\nCreated ${kind} '${subject.getTitle()}'.${hint}\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'make-failed');
    }
  }

  private async executeOn(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    if (!ownsSubject(actor, subject)) {
      return this.fail(context, 'Only the subject owner may attach a surface.', 'not-owner');
    }
    const ordered = model.ordered === true;
    try {
      await ForumsApi.createBoardOnSubject(subject, {
        organizer: ordered ? 'ordered' : 'open',
      });
      const kind = ordered ? 'an ordered forum' : 'a forum';
      this.send(
        context,
        Mml.compose`\nAttached ${kind} to '${subject.getTitle()}'.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'attach-failed');
    }
  }

  private async executePost(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    // Body: inline-greedy / fields side-channel / interactive compose prompt.
    const body = await this.resolveBody(model, context, 'Compose your post:');
    if (!body) return this.fail(context, 'body required', 'body-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    if (!(await SubjectApi.isAudienceMember(actor, view.subject))) {
      return this.fail(context, 'You are not in this board’s audience.', 'not-member');
    }
    const title = (model.title ?? deriveTitle(body)).trim();
    const entry = await ForumsApi.postThread(actor, view.board, title, body);
    this.send(
      context,
      Mml.compose`\nPosted thread '${title}' (#${entry._id ?? '?'}).\n`,
    );
  }

  private async executeReply(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const entryId = (model.entry ?? '').trim();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    const parent = await ForumsApi.getEntry(entryId);
    if (!parent) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    const view = await this.boardViewFor(parent.getBoard());
    if (view && !(await SubjectApi.isAudienceMember(actor, view.subject))) {
      return this.fail(context, 'You are not in this board’s audience.', 'not-member');
    }

    const isOrdered = view?.board.getOrganizer() === 'ordered';
    const { relation, count } = valence(model);

    if (isOrdered) {
      // A typed claim: exactly one valence flag selects the edge.
      if (count !== 1 || !relation) {
        return this.fail(
          context,
          'On an ordered board, attach a claim with exactly one of --pro, --con, or --rebut.',
          'valence-required',
        );
      }
      const body = await this.resolveBody(model, context, 'Compose your claim:');
      if (!body) return this.fail(context, 'body required', 'body-required');
      try {
        const entry = await ForumsApi.attachClaim(actor, parent, relation, body);
        this.send(context, Mml.compose`\nAttached (#${entry._id ?? '?'}).\n`);
      } catch (err) {
        return this.fail(context, (err as Error).message, 'reply-failed');
      }
      return;
    }

    // Popularity reply — valence flags are not allowed here.
    if (count > 0) {
      return this.fail(
        context,
        'The --pro / --con / --rebut flags apply only to ordered boards.',
        'valence-not-allowed',
      );
    }
    const body = await this.resolveBody(model, context, 'Compose your reply:');
    if (!body) return this.fail(context, 'body required', 'body-required');
    try {
      const entry = await ForumsApi.reply(actor, parent, body);
      this.send(context, Mml.compose`\nReplied (#${entry._id ?? '?'}).\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'reply-failed');
    }
  }

  private async executeEdit(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const entryId = (model.entry ?? '').trim();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    const entry = await ForumsApi.getEntry(entryId);
    if (!entry) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    // Authorization: the author, or the board-subject owner.
    const view = await this.boardViewFor(entry.getBoard());
    const isAuthor = entry.getAuthor() === actorId(actor);
    const isOwner = view ? ownsSubject(actor, view.subject) : false;
    if (!isAuthor && !isOwner) {
      return this.fail(context, 'Only the author or board owner may edit.', 'not-author');
    }
    const body = await this.resolveBody(model, context, 'Edit the body:');
    if (!body) return this.fail(context, 'body required', 'body-required');
    try {
      await ForumsApi.editBody(actor, entry, body);
      this.send(context, Mml.compose`\nEdited (#${entry._id ?? '?'}).\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'edit-failed');
    }
  }

  private async executeRead(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    const sort = parseSort(model.sort);

    const threadId = (model.thread ?? '').trim();
    if (threadId) {
      const root = await ForumsApi.getEntry(threadId);
      if (!root) return this.fail(context, `No thread '${threadId}'.`, 'no-such-thread');
      const { posts } = await ForumsApi.readThread(root, sort);
      const lines = [
        `${root.getTitle()} (#${root._id})  ${await scoreLabel(root)}`,
        '',
      ];
      lines.push(`  ${stripMml(root.getBody())}`);
      for (const p of posts) {
        lines.push(`    ↳ #${p._id} ${await scoreLabel(p)} ${stripMml(p.getBody())}`);
      }
      this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
      return;
    }

    const threads = await ForumsApi.readBoard(view.board, sort);
    if (threads.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo threads in ${handle}.\n`));
      return;
    }
    const lines = [`Threads in ${handle} (by ${sort}):`];
    for (const t of threads) {
      lines.push(`  #${t._id} ${await scoreLabel(t)} ${t.getTitle()}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
  }

  private async executeVote(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const entryId = (model.entry ?? '').trim();
    const dir = (model.direction ?? '').trim().toLowerCase();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    if (dir !== 'up' && dir !== 'down') {
      return this.fail(context, 'direction must be up or down', 'bad-direction');
    }
    const entry = await ForumsApi.getEntry(entryId);
    if (!entry) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    const view = await this.boardViewFor(entry.getBoard());
    if (view?.board.getOrganizer() === 'ordered') {
      return this.fail(
        context,
        'Voting is not available on an ordered board — nothing is ranked here.',
        'vote-not-allowed',
      );
    }
    // Audience gate — only board members may vote.
    if (view && !(await SubjectApi.isAudienceMember(actor, view.subject))) {
      return this.fail(context, 'You are not in this board’s audience.', 'not-member');
    }
    try {
      const updated = await ForumsApi.castVote(actor, entry, dir as VoteValue);
      this.send(
        context,
        Mml.compose`\nVoted. Score now ${String(updated.getScore())}.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'vote-failed');
    }
  }

  private async executeMature(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const handle = (model.board ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    if (view.board.getOrganizer() !== 'ordered') {
      return this.fail(
        context,
        'Only an ordered forum can be matured.',
        'not-ordered',
      );
    }
    if (!ownsSubject(actor, view.subject)) {
      return this.fail(
        context,
        'Only the owner may mature this deliberation.',
        'not-owner',
      );
    }
    try {
      await ForumsApi.matureArgument(actor, view.board);
      // The vote consumer is the deferred governance layer; be honest.
      this.send(
        context,
        Mml.compose`\nMatured '${view.subject.getTitle()}'. The vote layer will pick it up when it ships.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'mature-failed');
    }
  }

  private async executePromote(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    const handle = (model.board ?? '').trim();
    const threadId = (model.thread ?? '').trim();
    const name = (model.name ?? '').trim();
    if (!handle || !threadId || !name) {
      return this.fail(context, 'board, thread and name required', 'arg-required');
    }
    const view = await ForumsApi.resolveBoardByHandle(handle);
    if (!view) return this.fail(context, `No board '${handle}'.`, 'no-such-board');
    if (!ownsSubject(actor, view.subject)) {
      return this.fail(context, 'Only the board owner may promote a thread.', 'not-owner');
    }
    const thread = await ForumsApi.getEntry(threadId);
    if (!thread) return this.fail(context, `No thread '${threadId}'.`, 'no-such-thread');
    try {
      const subject = await ForumsApi.promoteThread(actor, thread, name);
      this.send(
        context,
        Mml.compose`\nPromoted thread to '${subject.getTitle()}'. Light its chat with \`chat on ${subject.getTitle()}\`.\n`,
      );
    } catch (err) {
      return this.fail(context, (err as Error).message, 'promote-failed');
    }
  }

  private async executeFollow(
    model: ForumModel,
    context: CommandContext,
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!PlayerApi.isAvatarStuff(actor)) {
      return this.fail(context, 'Only Avatars follow in v1.', 'avatar-required');
    }
    const title = (model.name ?? '').trim();
    if (!title) return this.fail(context, 'subject name required', 'name-required');
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    await SubjectApi.follow(actor, subject._id!, true);
    this.send(context, Mml.compose`\nFollowing '${subject.getTitle()}'.\n`);
  }

  /**
   * Resolve the post/reply body from the three routes to one field:
   * greedy markdown on the command string (CLI) or the `fields`
   * side-channel (GUI) — both already overlaid into `model.body` by the
   * dispatcher — else an interactive `compose` prompt (multiline textarea).
   */
  private async resolveBody(
    model: ForumModel,
    context: CommandContext,
    label: string,
  ): Promise<string> {
    const inline = (model.body ?? '').trim();
    if (inline) return inline;
    if (context.interactive) {
      try {
        const composed = await context.interactive.promptCompose(label, {
          placeholder: 'Markdown — ⌘/Ctrl+Enter to submit',
          allowEditorEscalation: true,
        });
        return composed.trim();
      } catch {
        return '';
      }
    }
    return '';
  }

  private async boardViewFor(boardId: string) {
    const board = await ForumsApi.getBoard(boardId);
    if (!board) return null;
    const subject = await SubjectApi.resolveById(board.getSubject());
    if (!subject) return null;
    return { board, subject };
  }

  private fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }
}

/** The actor's durable id (playerId for an Avatar, else stuffId). */
function actorId(actor: Stuff): string {
  return PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : actor.stuffId;
}

function ownsSubject(actor: Stuff, subject: Subject): boolean {
  return subject.getOwner() === actorId(actor);
}

/**
 * Map the valence flags to a typed argument edge. `--pro` → `supports`,
 * `--con` → `objects-to`, `--rebut` → `responds-to` (the neutral
 * question/clarification edge). `count` is how many flags were set, so the
 * caller can require exactly one.
 */
function valence(model: ForumModel): {
  relation: ArgumentRelation | null;
  count: number;
} {
  const flags: Array<[boolean | undefined, ArgumentRelation]> = [
    [model.pro, 'supports'],
    [model.con, 'objects-to'],
    [model.rebut, 'responds-to'],
  ];
  const set = flags.filter(([on]) => on === true);
  return { relation: set[0]?.[1] ?? null, count: set.length };
}

function parseSort(raw: string | undefined): EntrySort {
  const s = (raw ?? '').trim().toLowerCase() as EntrySort;
  return VALID_SORTS.has(s) ? s : 'new';
}

/** Score label honoring the anti-snowball display gate (`···` = hidden). */
async function scoreLabel(entry: import('../../../../lib/forum/Entry').default): Promise<string> {
  const display = await ForumsApi.displayScoreFor(entry);
  return display === null ? '[···]' : `[${display}]`;
}

function deriveTitle(body: string): string {
  const firstLine = body.split('\n')[0]?.trim() ?? '';
  if (!firstLine) return '(untitled)';
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
}

/** Crude MML→text for CLI readouts (the GUI renders MML properly). */
function stripMml(mml: string): string {
  return mml.replace(/<[^>]+>/g, '').trim();
}
