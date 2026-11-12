/**
 * RiveController — `rive <bole|billet> [into <what>] [with <froe>]`.
 *
 * ⭐⭐ **Riving is splitting wood along its grain**, with a froe and a
 * mallet: set the blade on the end grain, strike it in, lever the handle,
 * and the wood opens along its own fibres wherever they go. Every fibre
 * in what comes off runs its whole length, which is why a riven stave
 * holds liquor and a riven haft does not snap. It is the first rung of
 * the wood column after the axe.
 *
 * Two arms, and the TARGET chooses:
 *
 *  - **a bole** — the felled trunk on the ground. One length comes off it
 *    (`Bole.takeLength`, the same length `cut bole` cross-cuts) and is
 *    split into a stack of green **billets**, of the bole's own species.
 *    An engaged act: your hands are on the froe until it is done.
 *  - **a billet** — split again, into whatever the installed trades rive
 *    out of one: a woodworker's blank, a cooper's stave. ⭐ This file
 *    knows none of them. It asks the recipe catalogue for the recipes that
 *    take one piece of this wood under `riving`; `into <word>` chooses
 *    among them, and with one installed there is nothing to choose. A
 *    second trade that rives something out of a billet is a recipe row.
 *
 * ⭐ Both arms are the TARGET's own riving (`RivableMixin.rivePlanFor` —
 * controller-liquidity D14; the view `requires:` it): `Bole` and `Billet`
 * decide whether the wood opens, what comes off and what it makes, and a
 * bole spends the endurance when the length lands; this controller checks
 * the froe and words what they answer.
 *
 * The froe is declared on the view (`reachable:[capability.riving]`) —
 * the capability, never a class, since a froe is a `Tool` row.
 *
 * ⚠ `split` is NOT an alias: a ground protocol owns that word.
 *
 * ⚠⚠ The words are closures over the giver, never `this`: the controller
 * clone is destructed when `execute` returns, and an engaged act completes
 * long after.
 */

import { ManualBuildController } from '@saxonberg/server/mud/platform/idea/cmd/crafting/ManualBuildController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { RiveDone, RiveRefusal } from '@saxonberg/server/mud/lib/craft/Rivable';
import { CraftingDecline } from '@saxonberg/server/mud/lib/craft/CraftingDecline';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import { FORESTRY_TOPIC } from './FellController';

type Composed = ReturnType<typeof Mml.compose>;

/** The capability a froe offers, and riving asks for. */
export const RIVING = 'riving';

export interface RiveModel extends CommandModel {
  /** The bole or billet to rive. */
  target?: MqlOneResult;
  /** What to rive a billet into — a recipe word. */
  into?: string;
  /** The froe the view's default bound, or the one named `with`. */
  froe?: MqlOneResult;
}

export default class RiveController extends ManualBuildController<RiveModel> {
  async execute(model: RiveModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? null;
    if (target === null) {
      if (model.target) {
        this.turnDown(
          context,
          'unknown-target',
          Mml.compose`You don't see any '${model.target.raw}' here.`,
        );
      } else {
        this.turnDown(context, 'no-target', Mml.compose`Rive what? A felled bole, or a billet off one.`);
      }
      return;
    }

    // The froe — bound by the view, never hunted.
    const froe = model.froe?.stuff ?? null;
    if (froe === null) {
      this.turnDown(
        context,
        'no-froe',
        Mml.compose`You have nothing to rive with. That wants a froe — a smith's blade on a carved handle — and something to strike it with.`,
      );
      return;
    }
    if (!MixinApi.isTool(froe) || !froe.hasCapability(RIVING)) {
      this.turnDown(
        context,
        'wrong-tool',
        Mml.compose`${Mml.thing(froe)} will not split wood along its grain. That wants a froe.`,
      );
      return;
    }

    // ⭐ The wood decides (D14): whether it opens, what comes off, what it makes.
    if (!MixinApi.isRivable(target)) {
      this.turnDown(context, 'not-rivable', RiveController.refusalWords({ ok: false, reason: 'not-rivable' }, target));
      return;
    }
    const out = await target.rivePlanFor({
      actor: giver,
      froe,
      into: (model.into ?? '').trim().toLowerCase(),
    });
    if (!out.ok) {
      this.refuseRive(context, out, target);
      return;
    }
    await this.engagePlan(context, out, {
      beginSelf: (f) =>
        f.kind === 'bole'
          ? Mml.compose`You set the froe to the end of ${Mml.thing(f.bole)} and drive it in. The wood starts to open along its grain.`
          : Mml.compose``,
      beginPeers: (f) =>
        f.kind === 'bole' ? Mml.compose`${Mml.actor(giver)} sets a froe to ${Mml.thing(f.bole)} and starts riving.` : null,
      onRefused: (r) => RiveController.refusalWords(r, target),
      onDone: (f) => RiveController.doneWords(f, giver),
    });
  }

  /** A refusal: its words, and its note — a craft says it as a craft does. */
  private refuseRive(context: CommandContext, out: RiveRefusal, target: Stuff): void {
    if (out.reason === 'craft-refused') {
      this.declineToScene(context.commandGiver, out.facts.failure, context);
      return;
    }
    this.turnDown(
      context,
      out.reason,
      RiveController.refusalWords(out, target),
    );
  }

  /** ⭐ Every reason the wood refuses a riving (D4), in this verb's words. */
  private static refusalWords(r: RiveRefusal, target: Stuff): Composed {
    switch (r.reason) {
      case 'not-rivable':
        return Mml.compose`${Mml.thing(target)} is not a thing you rive. A froe goes into the end of a felled bole, or of a billet split off one.`;
      case 'will-not-rive':
        return Mml.compose`${Mml.thing(target)} will not open along its grain. The froe goes in and only bruises it — the fibres of ${r.facts.woodName} interlock, and nothing follows them. Saw it, or burn it.`;
      case 'bole-spent':
        return Mml.compose`There is nothing left in ${Mml.thing(target)} but the butt.`;
      case 'not-rivable-into':
        return Mml.compose`You cannot rive ${Mml.thing(target)} into '${r.facts.word}'. ${r.facts.choices.length > 0 ? `It will split into ${r.facts.choices.join(' or ')}.` : 'Nothing installed here is riven out of one.'}`;
      case 'nothing-to-rive':
        return Mml.compose`There is nothing anybody here rives out of ${Mml.thing(target)}.`;
      case 'which-rive':
        return Mml.compose`Rive ${Mml.thing(target)} into what — ${r.facts.names.join(' or ')}? Say \`rive billet into <what>\`.`;
      case 'craft-refused':
        return Mml.compose`${CraftingDecline.messageFor(r.facts.failure)}`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** What the actor and the room read when the riving lands. */
  private static doneWords(f: RiveDone, giver: Stuff): { self: Composed; peers: Composed } | null {
    switch (f.kind) {
      case 'gone':
        return null;
      case 'piece':
        return {
          self: Mml.compose`You drive the froe into the end of ${f.riven} and lever, following the grain down, and it comes apart as ${Mml.thing(f.output)}.`,
          peers: Mml.compose`${Mml.actor(giver)} rives a billet with a froe and a mallet.`,
        };
      case 'billets': {
        const wandered = f.wandered
          ? ' The split wanders out of the wood more than once, and the rest of it is kindling.'
          : '';
        if (f.left <= 0) {
          return {
            self: Mml.compose`You rive the last length of ${f.boleName} into ${GrammarApi.inWords(f.count)} billets.${wandered} What is left is the butt and the brash.`,
            peers: Mml.compose`${Mml.actor(giver)} rives the last of ${f.boleName} into billets.`,
          };
        }
        return {
          self: Mml.compose`The length comes away from ${Mml.thing(f.bole)} and opens under the froe into ${GrammarApi.inWords(f.count)} billets.${wandered} ${f.left === 1 ? 'One length left in it.' : `${GrammarApi.cap(GrammarApi.inWords(f.left))} lengths in it yet.`}`,
          peers: Mml.compose`${Mml.actor(giver)} rives a length off ${Mml.thing(f.bole)} into billets.`,
        };
      }
      default: {
        const never: never = f;
        return never;
      }
    }
  }

  private turnDown(
    context: CommandContext,
    reason: string,
    text: ReturnType<typeof Mml.compose>,
  ): void {
    MessageApi.scene(context.commandGiver).topic(FORESTRY_TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}

