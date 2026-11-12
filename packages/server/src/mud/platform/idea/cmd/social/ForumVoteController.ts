/**
 * ForumVoteController — `forum vote <entry> up|down` — open boards only; refused on an ordered board (over {@link ForumControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { ForumsApi } from '../../../../api/forums';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { VoteValue } from '../../../../lib/forum/Vote';
import type { SubjectSubscriber } from '../../../../lib/forum/SubjectSubscriber';
import type { CommandGiver } from '../../../../lib/command/CommandGiver';
import { ForumControllerBase, type ForumModel } from './ForumControllerBase';

export default class ForumVoteController extends ForumControllerBase {
  async execute(model: ForumModel, context: CommandContext): Promise<void> {
    if (this.refuseUnlessForums(context)) return;
    const actor = context.commandGiver as Stuff & CommandGiver &
      SubjectSubscriber;
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
    try {
      const updated = await actor.castVote(entry, dir as VoteValue);
      this.send(
        context,
        Mml.compose`\nVoted. Score now ${String(updated.getScore())}.\n`,
      );
    } catch (err) {
      return this.failFrom(context, err, 'vote-failed');
    }
  }
}
