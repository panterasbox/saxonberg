/**
 * DraftController — `draft <n> [from <herd>]`, and ⭐⭐ **the act that
 * turns a number in a book into an animal.**
 *
 * D21's boundary act. The head exists as a deterministic function of the
 * herd's identity and its index, so it was always there; what drafting
 * does is give it a body to be looked at in.
 *
 * > **Identity is earned by being measured.** Head 17 drafted twice is
 * > the same animal, and the answer was true before anyone asked.
 *
 * ⚠ **The stockman's own word is what moves it.** There is no automatic
 * promotion, no "this one has become interesting" heuristic — you draft
 * a head because you decided to look at it, which is what makes the
 * management game about the tail rather than about the mean.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import HerdRegistry, { type DraftAnswer } from '../../HerdRegistry';

export const RANCHING_TOPIC = 'act.deed';

/** The registry singleton's identity path. */
export const HERD_REGISTRY_PATH = '/trade/ranching/idea/HerdRegistry';

type Composed = ReturnType<typeof Mml.compose>;

interface DraftModel extends CommandModel {
  head?: string;
  herd?: string;
}

/**
 * ⭐⭐ **The book decides** (controller-liquidity W10): which herd, whether
 * the head is there to cut out, who may, and the head itself — seeded,
 * aged, conditioned and named — are `HerdRegistry.pick` / `draftHead`.
 * This file is the words.
 */
export default class DraftController extends CommandController<DraftModel> {
  async execute(model: DraftModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const registry = await StuffApi.singleton<HerdRegistry>(HERD_REGISTRY_PATH);
    const where = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    const herd = await registry.pick(model.herd, where);
    if (!herd) {
      this.decline(
        context,
        (await registry.isEmpty())
          ? Mml.compose`There is no herd filed that you could draft one out of.`
          : Mml.compose`You have no herd by that name.`,
        'no-herd',
      );
      return;
    }
    const index = Number.parseInt(model.head ?? '', 10);
    const out = await registry.draftHead(giver, herd.herdId, index, where);
    if (!out.ok) {
      this.decline(context, DraftController.refusalWords(out, model.head ?? '?'), out.reason);
      return;
    }
    MessageApi.scene(giver)
      .topic(RANCHING_TOPIC)
      .toSelf(
        Mml.compose`You cut number ${index} out of ${out.herd.name} and look it over. ${GrammarApi.cap(out.animal.stockmanRead())}.`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} cuts one out of the bunch and stands looking at it.`)
      .send();
  }

  protected static refusalWords(r: Exclude<DraftAnswer, { ok: true }>, typed: string): Composed {
    switch (r.reason) {
      case 'no-herd':
        return Mml.compose`You have no herd by that name.`;
      case 'no-such-head':
        return Mml.compose`${r.facts.herd.name} runs to ${r.facts.herd.tally} head. There is no number ${typed} in it.`;
      case 'already-drafted':
        return Mml.compose`Number ${typed} is already out.`;
      case 'not-keeper':
        return Mml.compose`${r.facts.herd.name} is not yours to draft from.`;
      case 'mint-failed':
        return Mml.compose`You cannot get a rope on it.`;
      default: {
        const never: never = r;
        return Mml.compose`${String(never)}`;
      }
    }
  }

  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(RANCHING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
