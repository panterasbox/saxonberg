/**
 * TieControllerBase — the words `tie`, `untie` and `belay` share: the three
 * verbs ask one protocol (`Tieable`), and its refusals answer a reason and
 * facts (controller-liquidity D8), so the sentences live here, once. An
 * alternate controller overrides `refusalWords` and words every refusal its
 * own way. Not referenced by any YAML — a base class only.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { TieRefusal } from '../../../../lib/spatial/Tieable';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { GrammarApi } from '../../../../api/grammar';

type Composed = ReturnType<typeof Mml.compose>;

export abstract class TieControllerBase<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * ⭐ Refuse a tie, an untie or a belay: the gear's reason worded here, and
   * the reason filed. Shared with `untie` and `belay`, which ask the same
   * protocol (`Tieable`).
   */
  protected declineTie(context: CommandContext, r: TieRefusal, viewer: Stuff): void {
    MessageApi.scene(context.commandGiver)
      .topic('act.deed')
      .toSelf((this.constructor as typeof TieControllerBase).refusalWords(r, viewer))
      .send();
    context.note({ kind: 'controller-rejected', reason: r.reason, detail: '' });
  }

  /**
   * ⭐ What a refused tie says (controller-liquidity D8 — the gear answered
   * a reason and facts; the words are this controller's).
   */
  protected static refusalWords(r: TieRefusal, viewer: Stuff): Composed {
    const { gear, load, on, knot } = r.facts;
    const it = gear.getPresentation();
    const It = GrammarApi.cap(it);
    const them = load ? load.describeFor(viewer) : 'that';
    switch (r.reason) {
      case 'not-tieable':
        return Mml.compose`${It} has no end to tie.`;
      case 'not-tied':
        return Mml.compose`${It} is not tied to anything.`;
      case 'self':
        return load === viewer
          ? Mml.compose`You keep hold of your own end; somebody else ties you on.`
          : Mml.compose`You cannot tie ${it} to itself.`;
      case 'out-of-reach':
        return Mml.compose`${GrammarApi.cap(them)} is not here.`;
      case 'not-holding':
        return Mml.compose`You are not holding ${it}.`;
      case 'already-tied':
        return Mml.compose`It is already tied round ${on?.getPresentation() ?? 'something'}.`;
      case 'no-hands':
        return Mml.compose`You have no hands to take it in.`;
      case 'no-such-knot':
        return Mml.compose`You know no knot called a ${knot ?? 'that'}.`;
      case 'not-a-load':
        return Mml.compose`You cannot tie ${it} to that.`;
      case 'no-line':
        return Mml.compose`${It} is not fast to anything.`;
      case 'not-in-water':
        return Mml.compose`It would only lift in the water.`;
      case 'no-surface':
        return Mml.compose`There is nowhere for it to rise to.`;
      case 'no-pressure':
        return Mml.compose`There is nothing to screw a hose onto at ${them}; water stands in it, it does not come out of a tap.`;
      case 'end-taken':
        return Mml.compose`${It} is already on ${on?.getPresentation() ?? 'something'}.`;
      case 'sprinkler-taken':
        return Mml.compose`${GrammarApi.cap(them)} already has a hose on it.`;
      case 'not-a-coupling':
        return Mml.compose`A hose screws onto a tap or a sprinkler, not ${them}.`;
      case 'not-hers':
        return Mml.compose`${It} is not aboard ${on?.getPresentation() ?? 'her'}.`;
      case 'not-a-fixture':
        return Mml.compose`${It} cannot be made fast round that.`;
      case 'same-room':
        return Mml.compose`That is not across from her.`;
      case 'end-out':
        return Mml.compose`The end of ${it} is out already.`;
      case 'not-tied-on':
        return Mml.compose`${GrammarApi.cap(them)} is not tied on the end of it — \`tie rope to\` them first.`;
      case 'cannot':
        return Mml.compose`You cannot hold a belay.`;
      case 'busy':
        return Mml.compose`Your hands are on something else.`;
      default: {
        const unworded: never = r.reason;
        throw new Error(`TieControllerBase: no words for '${String(unworded)}'`);
      }
    }
  }
}
