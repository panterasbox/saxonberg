/**
 * QuenchController — `quench [<workpiece>] [on <anvil>]`.
 *
 * ⭐ I/O over the piece's own protocol ({@link Quenchable.quenchPlanFor},
 * controller-liquidity Appendix A, rung 1): a worked build is FINISHED (the
 * smithing terminal mint — reverse-matched to a recipe, the formed good out
 * of the tub, the first making teaching it), and an un-worked hot piece is
 * HEAT-TREATED (its carbon decides: unchanged, hardened, or cracked in two).
 * Which of the two it is, and every number in it, is the piece's; the anvil
 * paces the plunge and is deliberately not a gate.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import {
  QUENCHABLE_MIXIN,
  type Quenchable,
  type QuenchBegin,
  type QuenchDone,
  type QuenchRefusal,
} from '../../../lib/Quenchable';

type Composed = ReturnType<typeof Mml.compose>;

interface QuenchModel extends CommandModel {
  anvil?: MqlManyResult;
  target?: MqlOneResult;
}

export default class QuenchController extends ManualBuildController<QuenchModel> {
  async execute(model: QuenchModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isActive(target, QUENCHABLE_MIXIN)) {
      this.declineStep(context, Mml.compose`Quench what? You need a workpiece you've been forging.`, 'no-vessel');
      return;
    }
    const piece = target as Stuff & Quenchable;
    const plan = piece.quenchPlanFor(giver);
    if (!plan.ok) {
      this.declineStep(context, QuenchController.refusalWords(plan, piece), plan.reason);
      return;
    }
    const anvil = this.bestInstrument(model.anvil, 'anvil');
    await this.engagePlan(
      context,
      { ...plan, durationMs: this.paceMs(plan.durationMs, anvil, ['anvil']) },
      {
        beginSelf: (b) => QuenchController.beginWords(b, piece),
        beginPeers: (b) => QuenchController.beginPeerWords(b, giver, piece),
        onRefused: (r) => QuenchController.refusalWords(r, piece),
        onDone: (d) => QuenchController.doneWords(d, giver, piece),
      },
    );
  }

  /** ⭐ Every reason the piece refuses the tub (D4). */
  protected static refusalWords(r: QuenchRefusal, piece: Stuff): Composed {
    switch (r.reason) {
      case 'empty-build':
        return Mml.compose`${Mml.thing(piece)} hasn't been worked — there's nothing to quench.`;
      case 'mint-failed':
        return Mml.compose`The quench goes wrong, and nothing holds its shape.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static beginWords(b: QuenchBegin, piece: Stuff): Composed {
    return b.manner === 'finish'
      ? Mml.compose`You plunge ${Mml.thing(piece)} into the slack tub with a hiss of steam.`
      : Mml.compose`You bring ${Mml.thing(piece)} up to colour and hold it over the slack tub.`;
  }

  protected static beginPeerWords(b: QuenchBegin, giver: Stuff, piece: Stuff): Composed {
    return b.manner === 'finish'
      ? Mml.compose`${Mml.actor(giver)} quenches ${Mml.thing(piece)} in a burst of steam.`
      : Mml.compose`${Mml.actor(giver)} holds ${Mml.thing(piece)} over the slack tub.`;
  }

  /** ⭐ Every outcome of the tub, said — the honest nothing included. */
  protected static doneWords(
    d: QuenchDone,
    giver: Stuff,
    piece: Stuff,
  ): { self: Composed; peers?: Composed } {
    switch (d.kind) {
      case 'finished': {
        // ⭐ The knowledge ladder: crafting records the first making and
        // says so on the outcome — no script is written behind your back.
        const learned = d.learnedName === null
          ? ''
          : ` You've worked out how to forge ${d.learnedName} — the craft is yours now (try \`forge ${d.recipeId}\`).`;
        return {
          self: Mml.compose`You draw ${Mml.thing(d.output)} from the tub, finished.${learned}`,
          peers: Mml.compose`${Mml.actor(giver)} draws ${Mml.thing(d.output)} from the tub.`,
        };
      }
      case 'unchanged':
        return {
          self: Mml.compose`Steam, and then nothing. ${Mml.thing(piece)} comes out of the tub exactly as soft as it went in — there is no carbon in it to trap, and quenching iron with nothing in it changes nothing at all.`,
        };
      case 'hardened':
        return {
          self: Mml.compose`The tub boils and goes quiet. ${Mml.thing(piece)} comes out grey and dead-looking, and a file skates off it where it bit before — the carbon has been caught where it stood. It is hard now, and it will stay hard until the fire takes it back.`,
          peers: Mml.compose`${Mml.actor(giver)} quenches ${Mml.thing(piece)}; the tub boils.`,
        };
      case 'cracked':
        return {
          self: Mml.compose`It goes into the water and comes apart in your tongs with a sound like a dropped plate. Two pieces, a clean grey fracture down the middle, and both of them exactly as useless as the whole one was. Cast iron does not take a quench; it takes offence.`,
          peers: Mml.compose`Something cracks in ${Mml.actor(giver)}'s slack tub, loudly.`,
        };
      default: {
        const never: never = d;
        return never;
      }
    }
  }
}
