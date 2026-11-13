/**
 * ReturnController — `return <animal>`, and ⚠ **the asymmetry is
 * honest.**
 *
 * Drafting mints an object; returning **destructs** one. That is not a
 * loss and it is not a hack:
 *
 * > **Its identity was the record, not the flesh.**
 *
 * What became of the animal — its condition, how it takes to being
 * worked, how old it is now — is folded into the register's sparse
 * overlay, so the herd goes on remembering head 17 while 17 is not an
 * object. Draft it again tomorrow and you get the same animal, a day
 * older and exactly as thin as you left it.
 *
 * ⭐ That is what makes the compression honest rather than a storage
 * trick: nothing is forgotten, and the thing that persists is the thing
 * that was always the identity.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { RANCHING_TOPIC } from './DraftController';
import Livestock from '../../../agent/Livestock';

interface ReturnModel extends CommandModel {
  target?: MqlOneResult;
}

/**
 * ⭐⭐ **The head turns itself in** (controller-liquidity W10):
 * `Livestock.returnToHerd` folds what it became into the record and goes.
 * This file is the words.
 */
export default class ReturnController extends CommandController<ReturnModel> {
  async execute(model: ReturnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target) {
      this.decline(context, Mml.compose`Return what?`, 'no-target');
      return;
    }
    // ⭐ A legal state, not an error (D19): a pet, a single milk cow and a
    // working ox were never in a tally, and there is nothing to go back TO.
    const out = target instanceof Livestock ? await target.returnToHerd() : ({ ok: false, reason: 'not-drafted' } as const);
    if (!out.ok) {
      this.decline(
        context,
        out.reason === 'not-drafted'
          ? Mml.compose`${Mml.thing(target)} is not out of anybody's herd. It is just itself.`
          : Mml.compose`The book does not have it out.`,
        out.reason,
      );
      return;
    }
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(Mml.compose`You turn number ${out.index} back in with the rest and write it up: ${out.read}.`)
      .toPeers(Mml.compose`${Mml.actor(giver)} turns one back in with the rest.`)
      .send();
  }

  protected decline(
    context: CommandContext,
    prose: ReturnType<typeof Mml.compose>,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
