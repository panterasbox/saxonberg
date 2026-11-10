/**
 * KneadController — `knead [<vessel>]`. ⭐ Dumb by construction (ceramics
 * D14): the VESSEL plans the knead (`KneadVesselMixin.kneadPlanFor`) and
 * this controller engages the plan it is handed. It never names a trough,
 * a tub or a pit.
 *
 * ⭐ The vessel answers facts and a reason; the WORDS are this controller's
 * (controllers-are-io D4) — {@link KneadController.kneadWords}.
 *
 * ⭐ Stiff stuff only (owner, 2026-11-10; controller-liquidity W19): a
 * runny compound — a paint, a glaze slurry, a wash — is `stir`red, and the
 * vessel refuses a knead of it `wrong-work`, worded here pointing at
 * `stir`. The MATTER decides (`Compounding.workVerb`), never the word.
 *
 * Promoted from `trade-baking` (the `dry` precedent): a baker's dough, a
 * brickmaker's clay and a rubber works' compound are one act — working a
 * plastic mass by hand to a window — and a second trade's vessel is a
 * second implementation of the protocol, not a second verb.
 */

import { ManualBuildController } from './ManualBuildController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { ActWords } from '../../../../lib/command/EngagedActController';
import type { KneadBegin, KneadFacts, KneadRefusal } from '../../../../lib/craft/KneadVessel';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

type Composed = ReturnType<typeof Mml.compose>;

interface KneadModel extends CommandModel {
  vessel?: MqlOneResult;
}

export default class KneadController<
  M extends CommandModel = KneadModel,
> extends ManualBuildController<M> {
  async execute(model: M, context: CommandContext): Promise<void> {
    const vessel = (model as KneadModel).vessel?.stuff ?? null;
    if (vessel === null) {
      this.declineStep(
        context,
        Mml.compose`Knead what? There is nothing here you could work by hand.`,
        'no-vessel',
      );
      return;
    }
    const plan = MixinApi.isKneadVessel(vessel)
      ? await vessel.kneadPlanFor({ actor: context.commandGiver })
      : null;
    if (plan === null) {
      this.declineStep(
        context,
        Mml.compose`There is nothing in ${Mml.thing(vessel)} you could knead.`,
        'no-vessel',
      );
      return;
    }
    const words = this.kneadWords(vessel, context.commandGiver);
    if (!plan.ok) {
      this.declineStep(context, words.onRefused(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, words);
  }

  /** ⭐ The words for a knead plan of `vessel` (D4) — every reason, exhaustively. */
  protected kneadWords(vessel: Stuff, giver: Stuff): ActWords<KneadBegin, KneadFacts, KneadRefusal> {
    return {
      beginSelf: (b) => {
        switch (b.kind) {
          case 'compound':
            return Mml.compose`You set your hands to what is in ${Mml.thing(vessel)}, folding it over and over on itself.`;
          case 'tread':
            return Mml.compose`You wet the clay in ${Mml.thing(vessel)} and get in, treading it and turning it over with the spade.`;
          case 'dough':
            return Mml.compose`You turn ${Mml.thing(vessel)} out and set to, pushing the heel of your hand through it and folding it back.`;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      beginPeers: (b) => {
        switch (b.kind) {
          case 'compound':
            return Mml.compose`${Mml.actor(giver)} works at ${Mml.thing(vessel)} with both hands.`;
          case 'tread':
            return Mml.compose`${Mml.actor(giver)} treads the clay in ${Mml.thing(vessel)}.`;
          case 'dough':
            return null;
          default: {
            const never: never = b;
            return never;
          }
        }
      },
      onRefused: (r) => KneadController.kneadRefusalWords(r, vessel),
      onDone: (f) => {
        switch (f.kind) {
          case 'compounded':
            return {
              self:
                f.product !== null
                  ? Mml.compose`It comes together into one even mass: ${Mml.thing(f.product)}.`
                  : Mml.compose`What is in ${Mml.thing(vessel)} comes together, even all through.`,
              peers: Mml.compose`${Mml.actor(giver)} finishes working ${Mml.thing(vessel)}.`,
            };
          case 'dough':
            return {
              self: Mml.compose`It comes together and turns silky under your hands. You round it up and leave it in the trough.`,
              peers: Mml.compose`${Mml.actor(giver)} works a dough in ${Mml.thing(vessel)}.`,
            };
          default: {
            const never: never = f;
            return never;
          }
        }
      },
    };
  }

  private static kneadRefusalWords(r: KneadRefusal, vessel: Stuff): Composed {
    switch (r.reason) {
      case 'empty':
        return r.facts.wants === 'clay'
          ? Mml.compose`${Mml.thing(vessel)} has no clay in it. Put the clay and whatever you mean to temper it with in first.`
          : Mml.compose`${Mml.thing(vessel)} is empty. Put what you mean to mix into it first.`;
      case 'empty-build':
        return Mml.compose`${Mml.thing(vessel)} is empty. Put flour and water in it first.`;
      case 'wrong-work':
        // A knead vessel only ever wants the other work when it is runny.
        return Mml.compose`What is in ${Mml.thing(vessel)} is runny — there is nothing to knead. Stir it.`;
      case 'frozen':
        return Mml.compose`${Mml.thing(vessel)} is frozen: ${Mml.thing(r.facts.ice)} is set in it. Nothing treads until it thaws.`;
      case 'not-treadable':
        return Mml.compose`${Mml.thing(r.facts.hard)} will not tread into clay. Take it out — what is fired must be broken and ground to grog first.`;
      case 'no-water':
        return Mml.compose`The clay in ${Mml.thing(vessel)} is dry. It wants water before it will come to the window.`;
      case 'came-empty':
        return Mml.compose`You knead ${Mml.thing(vessel)}, but there is nothing in it.`;
      case 'already-compounded':
        return Mml.compose`It is already one even mass. There is nothing to work in.`;
      case 'mint-failed':
        return Mml.compose`It will not come together — and that is a fault in the books, not in your hands.`;
      case 'not-a-dough':
        return Mml.compose`It will not come together. Whatever is in there is not a dough.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }
}
