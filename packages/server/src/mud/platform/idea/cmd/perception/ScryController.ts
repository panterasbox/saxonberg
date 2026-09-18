/**
 * ScryController — perceive a remote object via privilege bit (v1
 * deferred) or a `Scryable` instrument: the one you named
 * (`scry alice with the mirror`) or whichever of the ones in reach can
 * actually find this target.
 *
 * ⭐⭐ **The candidates are BOUND, never hunted.** `with` is a plural
 * arg (`type: objects`) defaulting through
 * `reachable:[mixin.ScryableMixin]`, so the binder does the resolving
 * and this file does the one thing the binder cannot: ask each of them
 * whether it can reach *this* target. That is a question about the
 * PAIR — a glass that shows you the harbour may refuse a person on the
 * far side of the world — so no filter atom could express it and no
 * singular arg could survive it.
 *
 * Renders a description of the target as if the avatar were
 * colocated. v1 leans on the existing description Apis; the
 * full perception-framework integration (viewer-aware shadows,
 * line-of-sight gating) lands as the perception system grows.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { MqlManyResult, MqlOneResult } from '../../../../api/mql';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { MixinApi } from '../../../../api/mixin';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Scryable } from '../../../../lib/perception/Scryable';

interface ScryModel extends CommandModel {
  target?: MqlOneResult;
  /** ⭐ Every Scryable in reach, or the one the player named. */
  with?: MqlManyResult;
}

export default class ScryController extends CommandController<ScryModel> {
  execute(model: ScryModel, context: CommandContext): void {
    const giver = context.commandGiver;
    const target = model.target;
    if (!target || target.stuff === null) {
      return this.fail(context, `no match for ${target?.raw ?? '?'}`);
    }
    const tgt = target.stuff;

    // Capability resolution: privilege (deferred — always false v1),
    // then the bound instruments. v1's "no privilege framework yet"
    // stance means the absence of a Scryable surfaces as a clear
    // refusal.
    const instrument = this.resolveInstrument(model.with, tgt);
    if (!instrument) {
      return this.fail(
        context,
        'you have no means to scry from here',
      );
    }
    const veto = instrument.canScryFor(tgt);
    if (!veto.ok) {
      return this.fail(
        context,
        `the ${(instrument as unknown as Stuff).getPresentation()} won't scry that: ${veto.reason}`,
      );
    }

    const name = tgt.getPresentation();
    const lines = [`\n${name}`];
    if (MixinApi.isVisible(tgt)) {
      lines.push('', tgt.getLong());
    } else {
      lines.push('', '(no visible description)');
    }
    const env = MixinApi.isContainable(tgt) ? tgt.getContainer() : null;
    if (env) {
      lines.push('', `(in ${env.getPresentation()})`);
    }
    this.tell(context, lines.join('\n') + '\n');
    return;
  }

  /**
   * The instrument to scry with, out of the ones the binder bound.
   *
   * ⭐ The two arms are told apart by `prep`, which the matcher sets
   * only when the player actually typed the preposition — so this knows
   * the difference between *"I said the mirror"* and *"find me
   * something"* without the view having to declare two fields:
   *
   *   - **named** — hand it back whatever they said, even if it cannot
   *     reach. `execute` then declines with the instrument's OWN reason
   *     (*"the dark mirror won't scry that: …"*), which is the whole
   *     value of having named it.
   *   - **defaulted** — the first that can actually reach this target.
   *     Trying each is what the old walk did and what a singular arg
   *     would have lost.
   */
  private resolveInstrument(
    bound: MqlManyResult | undefined,
    target: Stuff,
  ): Scryable | null {
    const candidates = (bound?.stuff ?? []).filter(
      (s): s is Stuff & Scryable => MixinApi.isScryable(s),
    );
    if (candidates.length === 0) return null;
    if (bound?.prep !== undefined) return candidates[0]!;
    return candidates.find((c) => c.canScryFor(target).ok) ?? null;
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic('sense.survey')
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.tell(context, `\n${detail}\n`);
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }
}

