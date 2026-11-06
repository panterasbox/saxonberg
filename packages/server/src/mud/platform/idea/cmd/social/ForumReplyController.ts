/**
 * ForumReplyController — `forum reply <entry> <body>` — reply (popularity), or attach a typed claim on an ordered board with `--pro` / `--con` / `--rebut` (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ArgumentRelation } from '../../../../api/forums';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumReplyController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
    const entryId = (model.entry ?? '').trim();
    if (!entryId) return this.fail(context, 'entry required', 'entry-required');
    const parent = await ForumsApi.getEntry(entryId);
    if (!parent) return this.fail(context, `No entry '${entryId}'.`, 'no-such-entry');
    const view = await this.boardViewFor(parent.getBoard());
    if (view && !(await actor.isAudienceMemberOf(view.subject))) {
      return this.fail(context, 'You are not in this board’s audience.', 'not-member');
    }

    const isOrdered = view?.board.getOrganizer() === 'ordered';
    const { relation, count } = this.valence(model);

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
      if (body === null) return; // needs-input, noted (a script has no editor)
      if (!body) return this.fail(context, 'body required', 'body-required');
      try {
        const entry = await actor.attachClaim(parent, relation, body);
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
    if (body === null) return; // needs-input, noted (a script has no editor)
    if (!body) return this.fail(context, 'body required', 'body-required');
    try {
      const entry = await actor.replyToEntry(parent, body);
      this.send(context, Mml.compose`\nReplied (#${entry._id ?? '?'}).\n`);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'reply-failed');
    }
  }

  /**
   * Map the valence flags to a typed argument edge. `--pro` → `supports`,
   * `--con` → `objects-to`, `--rebut` → `responds-to` (the neutral
   * question/clarification edge). `count` is how many flags were set, so the
   * caller can require exactly one.
   */
  private valence(model: ForumModel): {
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
}
