/**
 * HewController — `hew [<face>] [with <tool>]`, the act that wins ore.
 *
 * ⭐ I/O over {@link Working.hewPlanFor} (controller-liquidity W9, Appendix A
 * rung 1): which face, the pick, the ground, barring down a fall, the lump at
 * exactly the deposit's grade (*competence never multiplies yield*), its
 * owner (the house on tutwork, else the hewer), a face that runs, the deed —
 * all the working's. This file words them.
 *
 * ⚠ **No deed gate.** Hewing is labour.
 */

import { MiningActController } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { HewBegin, HewDone, HewRefusal } from '../../../lib/Working';

type Composed = ReturnType<typeof Mml.compose>;

interface HewModel extends CommandModel {
  face?: string;
  /** ⭐ The instrument is bound by the view, never hunted for here. */
  tool?: MqlOneResult;
}

export default class HewController extends MiningActController<HewModel> {
  async execute(model: HewModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      HewController.decline(context, Mml.compose`There is no face to cut here.`, 'not-a-working');
      return;
    }
    const plan = await working.hewPlanFor(giver, model.tool?.stuff ?? null, model.face);
    if (!plan.ok) {
      HewController.decline(context, HewController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b) => HewController.beginWords(b),
      beginPeers: (b) =>
        b.barring
          ? Mml.compose`${Mml.actor(giver)} starts clearing a fall.`
          : Mml.compose`${Mml.actor(giver)} sets to the ${b.direction} face.`,
      onRefused: (r) => r,
      onDone: (d) => HewController.doneWords(d, giver),
    });
  }

  /** ⭐ Every reason the working refuses a swing (D4). */
  protected static refusalWords(r: HewRefusal): Composed {
    switch (r.reason) {
      case 'no-tool':
        return Mml.compose`Not with your hands. You would want a pick — something to win rock with.`;
      case 'no-pick':
        return Mml.compose`Not with that. You would want a pick — something to win rock with.`;
      case 'no-such-face': {
        const named = r.facts.named ? `'${r.facts.named}'` : 'anything';
        return Mml.compose`You can't cut ${named} here. Try a direction — the ground on that side.`;
      }
      case 'face-is-open':
        return Mml.compose`That way is already driven — there is no face there, only a way on.`;
      case 'barren-face':
        return Mml.compose`Nothing but country rock that way — you can drive it, but there is no ore in it.`;
      case 'face-worked-out':
        return Mml.compose`That face is worked out. Drive on.`;
      case 'no-ore-row':
        return Mml.compose`There is nothing here worth the swing.`;
      case 'bad-ground':
        return HewController.groundWords(r.facts.cause, 'cut');
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static beginWords(b: HewBegin): Composed {
    return b.barring
      ? Mml.compose`You start barring the loose ground out of the ${b.direction} face.`
      : Mml.compose`You set the pick to the ${b.direction} face and start cutting.`;
  }

  protected static doneWords(d: HewDone, giver: Stuff): { self: Composed; peers?: Composed } | null {
    switch (d.kind) {
      case 'gone':
        return null;
      case 'barred':
        return { self: Mml.compose`The fall is barred down. The face is workable again.` };
      case 'won': {
        // ⚠ It blocks the FACE, never the room: the way out is clear.
        const ran = d.ran
          ? ` The undercut face lets go. Rock runs into the ${d.direction} heading and catches you across the shoulder — the way out is clear, but the face is not.`
          : '';
        return {
          self: Mml.compose`You break ${Mml.thing(d.lump)} out of the face.${ran}`,
          peers: d.ran
            ? Mml.compose`${Mml.actor(giver)} breaks ore out of the face, and the face runs.`
            : Mml.compose`${Mml.actor(giver)} breaks ore out of the face.`,
        };
      }
      default: {
        const never: never = d;
        return never;
      }
    }
  }
}
