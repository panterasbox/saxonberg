/**
 * SewController — `sew`, the assembly step, and where a garment becomes
 * a **real object**.
 *
 * The output is a `Garment` carrying a material, a construction form, a
 * mass, a grade, a maker's mark and — when the pieces were cut for
 * somebody — a `cutTo` stamp. Everything downstream (insulation, the
 * covering stack, wear, dye, fit) then works on it because it is a
 * physical thing, not because sewing did anything special.
 *
 * ## ⭐ The maker's prose — you buy the look by buying the object
 *
 * The maker's authored `DetailedMixin` prose is routed onto the
 * instance through the `recordAuthoring` gate, so a coat by a
 * particular tailor *looks like theirs* to whoever is wearing it in
 * front of you. That is the customization product: not a cosmetic
 * layer minted from nothing, but a fact about a made object that
 * travels with it.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import CutPieces, { PATTERNS, type SewDone, type SewRefusal } from '../../../thing/CutPieces';

type Composed = ReturnType<typeof Mml.compose>;

interface SewModel extends CommandModel {
  kit?: MqlManyResult;
  pieces: MqlOneResult;
  pattern?: string;
}

/**
 * ⭐ The pattern's row, the carry and the mark are the pieces'
 * (`CutPieces.sewPlan` — controller-liquidity W11); the pattern words are
 * the view's closed list; this controller picks the best kit and words
 * the plan.
 */
export default class SewController extends ManualBuildController<SewModel> {
  async execute(model: SewModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const pieces = model.pieces?.stuff ?? null;
    if (!pieces) {
      this.declineStep(context, Mml.compose`Sew what?`, 'no-pieces');
      return;
    }
    if (!(pieces instanceof CutPieces)) {
      this.declineStep(
        context,
        Mml.compose`${Mml.thing(pieces)} is not cut cloth. Cut the pieces first, then sew them.`,
        'no-pieces',
      );
      return;
    }
    const pattern = (model.pattern ?? 'shirt').trim().toLowerCase();
    const plan = pieces.sewPlan(giver, pattern, this.bestInstrument(model.kit, 'mending'));
    if (!plan.ok) {
      this.declineStep(context, SewController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: () =>
        Mml.compose`You thread a needle and begin putting ${Mml.thing(pieces)} together.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} settles down to sew.`,
      onRefused: (r: SewRefusal) => SewController.refusalWords(r),
      onDone: (f: SewDone) => SewController.doneWords(giver, f),
    });
  }

  protected static refusalWords(r: SewRefusal): Composed {
    switch (r.reason) {
      case 'unknown-pattern':
        return Mml.compose`There is no pattern for '${r.facts.pattern}'. There are ${[...PATTERNS.keys()].join(', ')}.`;
      case 'not-made':
        return Mml.compose`It will not come together. You set the pieces aside unspoiled.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static doneWords(giver: Stuff, f: SewDone): { self: Composed; peers: Composed } | null {
    if (f.kind === 'gone') return null;
    return {
      self: Mml.compose`You finish ${Mml.thing(f.garment)}.`,
      peers: Mml.compose`${Mml.actor(giver)} finishes a ${f.pattern}.`,
    };
  }
}
