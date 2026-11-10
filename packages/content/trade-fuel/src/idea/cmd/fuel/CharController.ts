/**
 * CharController — `char [at <clamp>]`, the burn.
 *
 * A **watched engagement over game time**: the collier lights the clamp
 * and three days later breaks it open. The AIR is the kernel's device verb
 * — `draught <clamp> <setting>` — which works the same vents on any fire;
 * re-issuing `char` while you watch a burn points there rather than
 * starting a second one. (`char <n>` retired into `draught`,
 * controller-liquidity W7b.)
 *
 * ⭐⭐ **The verb decides nothing about the charge** (ceramics ruling A):
 * the clamp is a real fire, and every length in it becomes what its own
 * heat history made of it — charcoal, half-burnt brands, or ash on the
 * grate if it took too much air.
 *
 * ⭐ I/O over {@link CharcoalPit.lightPlan} (controller-liquidity W9): the
 * lighting, the watch (held in `attention`, hosted by the clamp), the
 * settle and the deed are the clamp's; this file words them.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import CharcoalPit, { type CharBegin, type CharDone, type CharRefusal } from '../../../thing/CharcoalPit';

type Composed = ReturnType<typeof Mml.compose>;

const TOPIC = 'act.deed';

interface CharModel extends CommandModel {
  /** ⭐ The clamp, resolved by the BINDER off the view's arg. */
  clamp?: MqlOneResult;
}

export default class CharController extends CommandController<CharModel> {
  async execute(model: CharModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const pit = model.clamp?.stuff ?? null;
    if (!(pit instanceof CharcoalPit)) {
      CharController.decline(context, Mml.compose`There is no clamp here to burn.`, 'no-clamp');
      return;
    }
    const plan = pit.lightPlan(giver);
    if (!plan.ok) {
      CharController.decline(context, CharController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b) => CharController.beginWords(b),
      beginPeers: () => Mml.compose`${Mml.actor(giver)} fires the clamp.`,
      // A burn, once lit, never refuses — the plan's refusal type is `never`.
      onRefused: (r) => r,
      onDone: (d) => ({ self: CharController.openWords(d) }),
    });
  }

  protected static decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /** ⭐ Every reason the clamp will not start a burn (D4). */
  protected static refusalWords(r: CharRefusal): Composed {
    switch (r.reason) {
      case 'watching':
        return Mml.compose`The clamp is burning. Work its vents with draught — draught clamp low, draught clamp half.`;
      case 'cannot-watch':
        return Mml.compose`A burn is three days of watching, and you cannot hold a watch.`;
      case 'empty-clamp':
        return Mml.compose`The clamp is empty. Fill it with cordwood before you light it.`;
      case 'no-fuel':
        return r.facts.wet
          ? Mml.compose`The chimney is empty, and green cordwood will not light it. Stoke the clamp with something dry first.`
          : Mml.compose`The chimney is empty. Stoke the clamp with something that will burn first.`;
      case 'not-lit':
        return r.facts.cause === 'too-wet'
          ? Mml.compose`It will not catch — the chimney is too wet.`
          : r.facts.cause === 'no-fuel'
            ? Mml.compose`There is nothing down the chimney to light. Stoke it first.`
            : Mml.compose`It will not catch.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static beginWords(b: CharBegin): Composed {
    const laid = b.laid ? 'You lay a length down the chimney and drop a coal in after it. ' : '';
    return Mml.compose`${laid}You fire the clamp and turf it over. Smoke finds its way out in a dozen places. Draught set at ${b.draught.toFixed(2)}; now it is three days of watching.`;
  }

  /** What the clamp opened on — the heat already decided. */
  protected static openWords(d: CharDone): Composed {
    if (d.charcoal > 0) {
      return Mml.compose`You break the clamp open. Black, light, and it rings when you knock two lengths together — ${String(d.charcoal)} of ${String(d.lengths)} lengths came out charcoal.`;
    }
    if (d.brands > 0) {
      return Mml.compose`You break the clamp open on half-burnt brands. Brown at the heart, heavy in the hand. You drew it too tight, and a week's cutting is worth a fraction of what it should be.`;
    }
    return d.ash
      ? Mml.compose`You break the clamp open on nothing but warm ash. It took too much air and the wood caught and burned. A week's cutting and three days' watching, gone.`
      : Mml.compose`You break the clamp open. The wood in it is barely scorched — it never got hot enough to char.`;
  }
}

