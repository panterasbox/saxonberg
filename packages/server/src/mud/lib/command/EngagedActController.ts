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
import type { ActPlan, AnyActRefusal } from '../craft/ActPlan';

type Composed = ReturnType<typeof Mml.compose>;

/**
 * ⭐ The words a controller puts on a plan an object handed back
 * (controllers-are-io D4): the object answers facts, and these turn them
 * into what the actor and the room read. Each function is the controller's
 * own — an alternate controller words the same plan differently.
 */
export interface ActWords<B, F, X extends AnyActRefusal> {
  /** What the actor reads as the step begins. */
  beginSelf: (facts: B) => Composed;
  /** What the room sees as it begins, or `null` for a quiet act. */
  beginPeers?: (facts: B) => Composed | null;
  /** A refusal the completion returned (the world changed under the step). */
  onRefused: (refusal: X) => Composed;
  /** What the actor (and the room) read when it lands; absent = nothing said. */
  onDone?: (facts: F) => { self?: Composed | null; peers?: Composed | null } | null;
}

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
    detail: string = reason,
  ): void {
    MessageApi.scene(context.commandGiver)
      .topic(ACT_TOPIC)
      .toSelf(prose)
      .send();
    context.note({ kind: 'controller-rejected', reason, detail });
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
  protected engageAct(context: CommandContext, opts: EngagedStepOptions): void;
  /**
   * ⭐ The plan overload (D4): engage a plan an OBJECT handed back — its
   * duration and its watts are the act's (D5), its words the controller's.
   * The effect lands at completion; what it returns is worded by `words`.
   *
   * ⭐ A zero-length plan runs NOW, inside the command frame, and a refusal
   * it returns declines the command — `ManualBuildController.engagePlan`'s
   * rule, the same for the same reason. Await it: that frame is the promise.
   */
  protected engageAct<B, F, X extends AnyActRefusal>(
    context: CommandContext,
    plan: ActPlan<B, F, X>,
    words: ActWords<B, F, X>,
  ): Promise<void>;
  protected engageAct<B, F, X extends AnyActRefusal>(
    context: CommandContext,
    opts: EngagedStepOptions | ActPlan<B, F, X>,
    words?: ActWords<B, F, X>,
  ): void | Promise<void> {
    if ('ok' in opts) {
      return this.engageActPlan(context, opts, words!);
    }
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

  /** The plan overload's body: watts are the plan's, the words are `words`. */
  private async engageActPlan<B, F, X extends AnyActRefusal>(
    context: CommandContext,
    plan: ActPlan<B, F, X>,
    words: ActWords<B, F, X>,
  ): Promise<void> {
    const giver = context.commandGiver;
    const sayDone = (facts: F): void => {
      const done = words.onDone?.(facts) ?? null;
      if (done === null || (!done.self && !done.peers)) return;
      const scene = MessageApi.scene(giver).topic(ACT_TOPIC);
      if (done.self) scene.toSelf(done.self);
      if (done.peers) scene.toPeers(done.peers);
      scene.send();
    };
    if (plan.durationMs <= 0) {
      const out = await plan.onComplete();
      if (!out.ok) {
        this.decline(context, words.onRefused(out), out.reason);
        return;
      }
      if (!giver.isDestroyed()) sayDone(out.facts);
      return;
    }
    const durationS = plan.durationMs / 1000;
    if (MixinApi.isExerting(giver) && !giver.canExert(plan.effortW, durationS)) {
      this.decline(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
      return;
    }
    const land = (): void => {
      // ⚠ The scheduler's completion is synchronous, so an async plan's
      // throw would land after its root returned — caught and said here.
      Promise.resolve()
        .then(() => plan.onComplete())
        .then((out) => {
          if (giver.isDestroyed()) return;
          if (!out.ok) {
            MessageApi.scene(giver).topic(ACT_TOPIC).toSelf(words.onRefused(out)).send();
            return;
          }
          sayDone(out.facts);
        })
        .catch((err: unknown) => {
          console.error('EngagedActController: a planned act failed at completion', err);
        });
    };
    if (!MixinApi.isEngaged(giver)) {
      land();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: plan.durationMs,
      effortW: plan.effortW,
      onComplete: land,
      onAbort: plan.onAbort,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(ACT_TOPIC).toSelf(words.beginSelf(plan.facts));
      const peers = words.beginPeers?.(plan.facts) ?? null;
      if (peers) scene.toPeers(peers);
      scene.send();
      return;
    }
    if (result.ok && result.status === 'completed-sync') return;
    if (!result.ok && result.reason === 'engagement-conflict') {
      this.decline(context, Mml.compose`Your hands are already busy.`, 'engagement-conflict');
      return;
    }
    this.decline(context, Mml.compose`You can't manage that just now.`, 'start-rejected');
  }
}
