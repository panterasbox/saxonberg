/**
 * EngagedActController — **an act that occupies your hands over game
 * time**, and the bookkeeping every such act shares.
 *
 * ⭐⭐ Promoted out of `GroundWorkController` by the taps build, which is
 * the third consumer: improvement acts on ground (`grub`/`ditch`/`lime`),
 * the mine's labour acts, and now **taking from a tap** (`milk`,
 * `shear`, `gather`, `rob`, `tap`). None of those is ground work, and
 * claiming a lactating animal is worked ground was the host-placement
 * lie that made the promotion necessary rather than tidy.
 *
 * What it holds is exactly the part that is the same whatever you are
 * doing with your hands:
 *
 *  - **the endurance check**, up front, with the body's own refusal;
 *  - **the engagement**, on the `hands` slot, so the effect lands at
 *    COMPLETION and a barge-in leaves the world as it was;
 *  - **the three ways starting can fail** (already busy · completed
 *    synchronously · rejected), each with its own structured reason;
 *  - **the diegetic decline**, which sends prose and files a reason.
 *
 * ⚠ It holds nothing about *what* the act does. No subject, no target,
 * no credit, no duration policy — those belong to the act, and a base
 * that guessed at them would have to be re-narrowed by every subclass,
 * which is the tell that substrate is in the wrong place.
 *
 * ⚠ **Walking away does not abort a `hands` engagement today** —
 * `LocomotionLogic.engageAround` touches only the engaged *mode*. An act
 * that cares must re-check its own preconditions at completion (the
 * `FellController` rule). `stop` is the player's own abort.
 */

import { CommandController } from './CommandController';
import type { CommandContext, CommandModel } from '../../api/command';
import type { AbortReason } from '@saxonberg/types';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { SchedulerApi } from '../../api/scheduler';
import { ManualBuildStep } from '../craft/ManualBuildStep';

type Composed = ReturnType<typeof Mml.compose>;

/** One engaged step: how long, what it says, and what it costs. */
export interface EngagedStepOptions {
  durationMs: number;
  beginSelf: Composed;
  beginPeers?: Composed;
  /**
   * Endurance the act costs a FRESH body, in percentage points — the
   * felt cost, kept as the authored figure because an act's duration is
   * an abstraction (four seconds to lime a field). The base converts it
   * to metabolic watts through the body, so a conditioned body feels the
   * same work as less.
   */
  cost: number;
  onComplete: () => void;
  onAbort?: (reason: AbortReason) => void;
}

/**
 * The topic the hands-work acts narrate on.
 *
 * ⭐ One topic for all of them, deliberately: a player who has muted
 * their own labour has muted it, and splitting `act.deed` per trade
 * would mean muting milking and still being told about ditching. That
 * is also why there is no overridable `topic()` hook — it was written
 * and removed in the same wave: ⚠ `lint:topics` cannot resolve
 * `.topic(this.topic())` and reports it as *a hole in the gate*, which
 * is the correct complaint about an indirection nothing needed. One
 * literal per file is the shipped pattern (`WORK_TOPIC` beside
 * `GROUND_TOPIC` beside this).
 */
export const ACT_TOPIC = 'act.deed';

export abstract class EngagedActController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /** Decline diegetically, and file the structured reason. */
  protected decline(
    context: CommandContext,
    prose: Composed,
    reason: string,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(ACT_TOPIC)
      .toSelf(prose)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /**
   * Say something that is NOT a refusal, and file no rejection.
   *
   * ⭐ The seam a closed season needs: *the run is over for the year* is
   * information, and rendering it in the rejected voice would make the
   * calendar read as the player's mistake. Same channel, different
   * register — see `TapClosedReason`, none of whose members is a
   * failure.
   */
  protected inform(context: CommandContext, prose: Composed): void {
    MessageApi.scene(context.commandGiver)
      .topic(ACT_TOPIC)
      .toSelf(prose)
      .send();
  }

  /**
   * Run the act as an engaged activity on the giver's `hands` slot, so
   * the effect lands **at completion** and a barge-in leaves the world
   * as it was. Spends the endurance up front — the work was done whether
   * or not anything came of it.
   */
  protected engageAct(
    context: CommandContext,
    opts: EngagedStepOptions,
  ): void {
    const giver = context.commandGiver;
    const durationS = opts.durationMs / 1000;
    let effortW: number | undefined;
    if (MixinApi.isExerting(giver)) {
      effortW = giver.wattsForFeltCost(opts.cost, durationS);
      if (!giver.canExert(effortW, durationS)) {
        this.decline(
          context,
          Mml.fromMarkup(giver.exhaustionRefusal()),
          'too-tired',
        );
        return;
      }
    }
    if (!MixinApi.isEngaged(giver)) {
      opts.onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: opts.durationMs,
      effortW,
      onComplete: opts.onComplete,
      onAbort: opts.onAbort,
    });
    const result = SchedulerApi.start(step);
    if (
      result.ok &&
      (result.status === 'started' || result.status === 'replaced')
    ) {
      context.note(result.note);
      const scene = MessageApi.scene(giver)
        .topic(ACT_TOPIC)
        .toSelf(opts.beginSelf);
      if (opts.beginPeers) scene.toPeers(opts.beginPeers);
      scene.send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.decline(
        context,
        Mml.compose`Your hands are already busy.`,
        'engagement-conflict',
      );
      return;
    }
    this.decline(
      context,
      Mml.compose`You can't manage that just now.`,
      'start-rejected',
    );
  }
}
