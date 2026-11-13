/**
 * ForumControllerBase — what every `forum` subcommand shares
 * (controllers-are-io W7, D9: one controller per subcommand over a base
 * per noun): the forums gate, the body resolver, the board view, the
 * ownership test, the outcome words.
 *
 * Afforded by the hosted `ForumsUpdate` (the born-with forum capability,
 * `ForumsMixin.commandContributions`); an actor without a forum update is
 * refused ({@link ForumControllerBase.refuseUnlessForums}). `fallthrough:
 * true` — a bare `forum <board>` reads, through the verb-level
 * {@link ForumReadController}. Controllers return `void`; outcomes ride
 * the dispatch-response envelope.
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
import { BoardRefusal } from '../../../../lib/forum/Board';

export interface ForumModel extends CommandModel {
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

export abstract class ForumControllerBase extends CommandController<ForumModel> {
  /**
   * Refuse unless the operator reaches the forums — the hosted forum update
   * that afforded the verb (`commandSource`), else the MQL `person` pool
   * (the `DmController` pattern). Every `forum` subcommand asks first.
   * Returns true when it refused.
   */
  protected refuseUnlessForums(context: CommandContext): boolean {
    const source = context.commandSource;
    if (source && MixinApi.isForums(source)) return false;
    const forums =
      MqlApi.resolveMany('person', {
        commandGiver: context.commandGiver,
        scope: 'person',
      }).stuff.find((s): s is Stuff & Forums => MixinApi.isForums(s)) ?? null;
    if (forums) return false;
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(Mml.compose`You have no way to reach the forums.`)
      .send();
    context.note({ kind: 'mixin-missing', mixin: 'ForumsMixin' });
    return true;
  }

  /**
   * Resolve the post/reply body from the three routes to one field:
   * greedy markdown on the command string (CLI) or the `fields`
   * side-channel (GUI) — both already overlaid into `model.body` by the
   * dispatcher — else an interactive `compose` prompt (multiline textarea).
   */
  protected async resolveBody(
    model: ForumModel,
    context: CommandContext,
    label: string,
  ): Promise<string | null> {
    const inline = (model.body ?? '').trim();
    if (inline) return inline;
    // ⭐ Fail closed: a script names its body inline, or is refused
    // `needs-input` — `null` — never handed an empty post.
    const asker = context.requireInteractive('a body');
    if (!asker) return null;
    try {
      const composed = await asker.promptCompose(label, {
        placeholder: 'Markdown — ⌘/Ctrl+Enter to submit',
        allowEditorEscalation: true,
      });
      return composed.trim();
    } catch {
      return '';
    }
  }
  protected async boardViewFor(boardId: string) {
    const board = await ForumsApi.getBoard(boardId);
    if (!board) return null;
    const subject = await SubjectApi.resolveById(board.getSubject());
    if (!subject) return null;
    return { board, subject };
  }
  /**
   * Word a forum write that threw: a {@link BoardRefusal} keeps its own
   * reason (the gate is the forum logic's — controller-liquidity D9);
   * anything else is `fallback`.
   */
  protected failFrom(
    context: CommandContext,
    err: unknown,
    fallback: string,
  ): void {
    const reason = err instanceof BoardRefusal ? err.reason : fallback;
    return this.fail(context, (err as Error).message, reason);
  }

  protected fail(context: CommandContext, detail: string, reason: string): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }
  protected send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.result')
      .toSelf(body)
      .send();
  }

  /** The actor's durable id (playerId for an Avatar, else stuffId). */
  protected actorId(actor: Stuff): string {
    return PlayerApi.isAvatarStuff(actor) ? actor.getPlayerId() : actor.stuffId;
  }

  protected ownsSubject(actor: Stuff, subject: Subject): boolean {
    return subject.getOwner() === this.actorId(actor);
  }
}
