/**
 * ForumController — the `forum` verb: read + post on popularity boards.
 *
 * Afforded by the hosted `ForumsUpdate` (the born-with forum capability,
 * `ForumsMixin.commandContributions`). The capability is reached via the
 * `commandSource` that afforded the verb, else a `findReachable`
 * host-descent fallback (the `DmController` pattern); an actor without a
 * forum update is refused.
 *
 * Subcommands (subcommand-first, `fallthrough: true` for a bare
 * `forum <board>` read):
 *   - `list` — visible boards.
 *   - `make <name>` — create a subject + popularity board (sugar);
 *     `--open`/`--group` pick the audience; `--argument` (deferred).
 *   - `on <subject>` — attach a popularity board to an owned subject.
 *   - `post <board> <body>` — start a thread (`--title` or derived).
 *   - `reply <entry> <body>` — reply to a thread/post.
 *   - `read <board> [thread]` — board thread-list or a thread's tree.
 *   - `promote <board> <thread> <name>` — mint a thread-subject + chat.
 *   - `follow <subject>` — follow all the subject's lit surfaces.
 *
 * Controllers return `void`; outcomes ride the dispatch-response
 * envelope (Wave 2 adds `vote` + sort selectors).
 */

import { CommandController } from '../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../api/command';
import { MessageApi } from '../../../api/message';
import { Mml } from '../../../api/mml';
import { MixinApi } from '../../../api/mixin';
import { ContainmentApi } from '../../../api/containment';
import { ForumsApi } from '../../../api/forums';
import { SubjectApi } from '../../../api/subject';
import { PlayerApi } from '../../../api/player';
import type { Forums } from '../../../lib/forum/Forums';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type Subject from '../../../lib/forum/Subject';

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
  argument?: boolean;
}

/** Resolve the operator's hosted forum update — commandSource or findReachable. */
function resolveForums(context: CommandContext): (Stuff & Forums) | null {
  const source = context.commandSource;
  if (source && MixinApi.isForums(source)) return source;
  return ContainmentApi.findReachable(
    context.commandGiver,
    null,
    (s: Stuff): s is Stuff & Forums => MixinApi.isForums(s),
  );
}

export default class ForumController extends CommandController<ForumModel> {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    const forums = resolveForums(context);
    if (!forums) {
      MessageApi.scene(context.commandGiver)
        .topic('system.shell.forum')
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
      case 'read':
        return this.executeRead(model, context);
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
    for (const { board, subject } of boards) {
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
    if (model.argument) {
      return this.fail(
        context,
        'The argument (structure) organizer is not available yet.',
        'argument-deferred',
      );
    }
    const group = (model.group ?? '').trim();
    try {
      const { subject } = await ForumsApi.makeForum(context.commandGiver, name, {
        open: model.open === true,
        ...(group ? { groupRef: group } : {}),
        ...(model.description ? { description: model.description } : {}),
      });
      this.send(context, Mml.compose`\nCreated forum '${subject.getTitle()}'.\n`);
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
    if (model.argument) {
      return this.fail(
        context,
        'The argument (structure) organizer is not available yet.',
        'argument-deferred',
      );
    }
    const subject = await SubjectApi.resolveByTitle(title);
    if (!subject) return this.fail(context, `No subject '${title}'.`, 'no-such-subject');
    if (!ownsSubject(actor, subject)) {
      return this.fail(context, 'Only the subject owner may attach a surface.', 'not-owner');
    }
    try {
      await ForumsApi.createBoardOnSubject(subject, {});
      this.send(context, Mml.compose`\nAttached a forum to '${subject.getTitle()}'.\n`);
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
    const body = (model.body ?? '').trim();
    if (!handle) return this.fail(context, 'board required', 'board-required');
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
    const body = (model.body ?? '').trim();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    if (!body) return this.fail(context, 'body required', 'body-required');
    const parent = await ForumsApi.getEntry(entryId);
    if (!parent) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    const view = await this.boardViewFor(parent.getBoard());
    if (view && !(await SubjectApi.isAudienceMember(actor, view.subject))) {
      return this.fail(context, 'You are not in this board’s audience.', 'not-member');
    }
    try {
      const entry = await ForumsApi.reply(actor, parent, body);
      this.send(context, Mml.compose`\nReplied (#${entry._id ?? '?'}).\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'reply-failed');
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

    const threadId = (model.thread ?? '').trim();
    if (threadId) {
      const root = await ForumsApi.getEntry(threadId);
      if (!root) return this.fail(context, `No thread '${threadId}'.`, 'no-such-thread');
      const { posts } = await ForumsApi.readThread(root);
      const lines = [`${root.getTitle()} (#${root._id})  [${root.getScore()}]`, ''];
      lines.push(`  ${stripMml(root.getBody())}`);
      for (const p of posts) {
        lines.push(`    ↳ #${p._id} [${p.getScore()}] ${stripMml(p.getBody())}`);
      }
      this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
      return;
    }

    const threads = await ForumsApi.readBoard(view.board);
    if (threads.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo threads in ${handle}.\n`));
      return;
    }
    const lines = [`Threads in ${handle}:`];
    for (const t of threads) {
      lines.push(`  #${t._id} [${t.getScore()}] ${t.getTitle()}`);
    }
    this.send(context, Mml.fromMarkup(`\n${lines.join('\n')}\n`));
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
      .topic('system.shell.forum')
      .toSelf(body)
      .send();
  }
}

function ownsSubject(actor: Stuff, subject: Subject): boolean {
  const playerId = PlayerApi.isAvatarStuff(actor)
    ? actor.getPlayerId()
    : actor.stuffId;
  return subject.getOwner() === playerId;
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
