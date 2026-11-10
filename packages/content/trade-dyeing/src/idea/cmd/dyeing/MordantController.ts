/**
 * MordantController — `mordant <thing> [in <bath>]`, and ⭐⭐ **this is
 * where the trade's missing failure mode comes from.**
 *
 * Two baths, as it really is, and the skill is front-loaded: you commit
 * to a colour family before you can see it.
 *
 * > Dye something un-mordanted and the colour **does not hold** — it
 * > washes straight out on the first launder.
 *
 * Real, nearly free (fastness ≈ 0), and it is exactly the *something to
 * be bad at* that every competence answer in this build needs to be
 * visible against.
 *
 * ⚠ And the mirror: **woad takes no mordant**, so mordanting before a
 * woad vat is wasted alum — refused rather than silently ignored,
 * because the point is that dyeing is TWO CHEMISTRIES and not one.
 *
 * ## ⚠ Where the mordant LIVES, and why
 *
 * It is an entry on the cloth's own `dyeStack` with **`strength: 0`** —
 * a thing applied to the cloth, at zero colour strength, which is
 * exactly what a mordant is. That keeps it on the cloth (so **mordanted
 * cloth is a real intermediate good** you can prepare in advance and
 * stockpile), keeps `getColorTag` honest (a strength-0 entry is below
 * legibility, so mordanted cloth shows no colour), and needs no field
 * the kernel does not already ship.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlManyResult, MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { Mml } from '@saxonberg/server/mud/api/mml';
import DyeBath, { type DyeBathRefusal, type MordantDone, type MordantKey } from '../../../lib/DyeBath';

type Composed = ReturnType<typeof Mml.compose>;

interface MordantModel extends CommandModel {
  target: MqlOneResult;
  bath?: MqlManyResult;
}

export default class MordantController extends ManualBuildController<MordantModel> {
  async execute(model: MordantModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (!target || !MixinApi.isDyed(target)) {
      this.declineStep(context, Mml.compose`Mordant what?`, 'no-target');
      return;
    }
    const vessel = MordantController.findBath(model.bath);
    if (!vessel) {
      this.declineStep(
        context,
        Mml.compose`There is no mordant bath here. Alum, iron or tannin in a vessel is what the cloth goes into.`,
        'no-bath',
      );
      return;
    }
    const plan = new DyeBath(vessel).mordantPlanFor(giver, target);
    if (!plan.ok) {
      this.declineStep(context, MordantController.refusalWords(plan, target, vessel), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (f: { mordant: MordantKey }) =>
        Mml.compose`You set ${Mml.thing(target)} in the ${f.mordant} bath.`,
      beginPeers: () => Mml.compose`${Mml.actor(giver)} sets something in a mordant bath.`,
      onRefused: () => Mml.compose`The bath came to nothing.`,
      onDone: (f: MordantDone) =>
        f.kind === 'gone'
          ? null
          : {
              self: Mml.compose`${Mml.thing(target)} comes out looking no different at all. That is the whole of it — what you have done is decide the colour before you can see it.`,
            },
    });
  }

  /**
   * The bath — a NARROWING over what the binder bound: a named bath as
   * named (so the refusal can say what is wrong with it), else the first
   * vessel in reach holding a mordant.
   */
  protected static findBath(bound: MqlManyResult | undefined): Stuff | null {
    const candidates = (bound?.stuff ?? []).filter((c) => MixinApi.isBulkable(c));
    if (candidates.length === 0) return null;
    if (bound?.prep !== undefined) return candidates[0]!;
    return candidates.find((c) => new DyeBath(c).mordant() !== null) ?? null;
  }

  protected static refusalWords(r: DyeBathRefusal, target: Stuff, bath: Stuff): Composed {
    switch (r.reason) {
      case 'empty-bath':
        return Mml.compose`${Mml.thing(bath)} is empty.`;
      case 'not-a-mordant':
        return Mml.compose`${Mml.thing(bath)} holds no mordant. There is alum, there is iron, and there is tannin.`;
      case 'already-mordanted':
        return Mml.compose`${Mml.thing(target)} is already mordanted, and a second bath will not take.`;
      case 'too-little':
        return Mml.compose`There is not enough left in ${Mml.thing(bath)} to take a piece.`;
      default:
        return Mml.compose`That bath will not mordant anything.`;
    }
  }
}
