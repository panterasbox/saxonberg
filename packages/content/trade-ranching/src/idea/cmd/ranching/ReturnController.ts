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
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import HerdRegistry from '../../HerdRegistry';
import { RANCHING_TOPIC, HERD_REGISTRY_PATH } from './DraftController';
import type Livestock from '../../../agent/Livestock';

interface ReturnModel extends CommandModel {
  target?: MqlOneResult;
}

export default class ReturnController extends CommandController<ReturnModel> {
  async execute(model: ReturnModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff as Livestock | undefined;
    if (!target) {
      this.decline(context, Mml.compose`Return what?`, 'no-target');
      return;
    }
    const herdId = target.getHerdId?.() ?? '';
    const index = target.getHeadIndex?.() ?? -1;
    if (!herdId || index < 0) {
      // ⭐ A legal state, not an error. D19's base case is the
      // individual: a pet, a single milk cow and a working ox were never
      // in a tally, and there is nothing for them to go back TO.
      this.decline(
        context,
        Mml.compose`${Mml.thing(target as unknown as Stuff)} is not out of anybody's herd. It is just itself.`,
        'not-drafted',
      );
      return;
    }

    const registry = await this.registry();
    const flesh = target.getReserve('flesh');
    const ok = await registry.returnHead(herdId, index, {
      flesh: flesh ? round1(flesh.current.rawValue()) : undefined,
      handling: round2(target.getHandling()),
      ageDays: round1(target.getAgeDays()),
    });
    if (!ok) {
      this.decline(
        context,
        Mml.compose`The book does not have it out.`,
        'not-in-book',
      );
      return;
    }

    const read = target.stockmanRead();
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`You turn number ${index} back in with the rest and write it up: ${read}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} turns one back in with the rest.`,
      )
      .send();

    // ⚠ The object goes; the record stays. Destructing LAST, after the
    // write has landed, so a failed write leaves the animal standing
    // rather than deleting a head nobody wrote down.
    StuffApi.destruct(target as unknown as Stuff);
  }

  protected async registry(): Promise<HerdRegistry> {
    const resident = StuffApi.findByTemplatePath<HerdRegistry>(HERD_REGISTRY_PATH);
    if (resident) return resident;
    return StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
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

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
