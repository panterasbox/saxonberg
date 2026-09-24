/**
 * GroundWorkController — the shared base for the improvement acts
 * (`grub`, `ditch`, `lime`).
 *
 * ⭐⭐ **Promoted out of `trade-farming` by the extraction build**, and the
 * argument is one sentence: *you ditch a road, a yard and a quarry.*
 * Improvement acts on **ground**, so farming is their first consumer and
 * not their owner; a turbary is drained exactly the way a wet field is.
 *
 * It holds exactly what the three acts share: **standing on ground that
 * can be improved**, asking that ground what it owes, and **engaging the
 * actor's hands over game time** so the work lands at completion and a
 * barge-in leaves the ground as it was.
 *
 * ⚠⚠ **None of these acts carries a deed gate**, the same decision the
 * mine's four labour acts made and for the same reason: they are LABOUR,
 * not craft. A Discipline changes what you LEARN, never what the ground
 * GIVES. A man with no transcript grubs exactly as much thorn out of a
 * headland as a master does; what the master has is knowing which ground
 * was worth grubbing.
 *
 * ⭐ **What differs between two pieces of ground is the GROUND, not the
 * actor.** Each act banks one unit of labour against a job whose
 * requirement comes from the host's own `improvementBill()` — so stony
 * ground takes more grubbing, wet ground more ditching, sour ground more
 * lime, and two plots of different character demand measurably different
 * work to reach the same state.
 *
 * ⚠ **The kernel never imports a seeded model.** It does not ask what the
 * ground's character is; it asks the ground what it owes, what the pace
 * here is, and what came up. A `Field` answers the first from farming's
 * `GroundCharacter`; a `Turbary` answers it from its peat. That hook is the
 * whole reason the promotion is possible.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Container } from '../../../../lib/spatial/Container';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';
import type {
  Improvable,
  ImprovementCost,
  ImprovementJob,
} from '../../../../lib/ground/Improvable';

/** The topic every ground act narrates on. */
export const GROUND_TOPIC = 'act.deed';

/**
 * The Discipline improvement credits.
 *
 * ⭐ `agriculture` even on a turbary, and even on a yard: drainage **is**
 * land improvement whoever is doing it, and the platform row already
 * exists. Minting a second Discipline for the same knowledge would split a
 * transcript across two names for one skill.
 */
export const AGRICULTURE = 'agriculture';

/**
 * Labour banked by one act, in the units `improvementBill()` speaks.
 *
 * ⭐ One unit per act is the whole calibration, and it is deliberately not
 * a dial: the *number of acts* a piece of ground takes is then read
 * straight off its bill, which is a number a player can see. Kind ground is
 * two or three acts a job; the worst ground in the game is a dozen.
 */
export const LABOUR_PER_ACT = 1;

type Composed = ReturnType<typeof Mml.compose>;

export interface GroundStepOptions {
  durationMs: number;
  beginSelf: Composed;
  beginPeers?: Composed;
  /**
   * Endurance the act costs a FRESH body, in percentage points — the felt
   * cost, kept as the authored figure because an improvement act's
   * duration is an abstraction (four seconds to lime a field). The base
   * converts it to metabolic watts through the body, so a conditioned body
   * feels the same work as less.
   */
  cost: number;
  onComplete: () => void;
  onAbort?: (reason: AbortReason) => void;
}

/** Ground that can be improved, and the bill it says it owes. */
export interface GroundReading {
  ground: Stuff & Container & Improvable;
  bill: ImprovementCost;
}

export abstract class GroundWorkController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * The improvable ground the actor is standing on, with its bill — or
   * `null` when they are not standing on any, or when the host answers no
   * bill at all.
   *
   * ⚠ The two `null`s are told apart by the caller through
   * {@link declineNoGround}: *there is no ground here to drain* and *this
   * ground does not say what it wants* are different sentences, and the
   * second is a content bug a player should be able to report.
   */
  protected async groundOf(giver: Stuff): Promise<GroundReading | null> {
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    const stuff = room as unknown as Stuff;
    if (!MixinApi.isImprovable(stuff)) return null;
    const ground = room as unknown as Stuff & Container & Improvable;
    const bill = await ground.improvementBill();
    if (bill === null) return null;
    return { ground, bill };
  }

  /** Decline diegetically, and file the structured reason. */
  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(GROUND_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /**
   * ⭐ The bound tool, if it can do this job.
   *
   * The view declares the instrument with an MQL default asking
   * `[capability.<x>]`, so the BINDER resolves it — this only confirms the
   * thing it handed back offers what this particular act needs. Walking the
   * giver's contents here instead would mean no player could ever say WHICH
   * spade (`lint:instrument-args`).
   */
  protected toolOf(bound: Stuff | null | undefined, capability: string): Stuff | null {
    if (!bound || !MixinApi.isTool(bound)) return null;
    return bound.hasCapability(capability) ? bound : null;
  }

  /**
   * Run the act as an engaged activity on the giver's `hands` slot, so the
   * effect lands **at completion** and a barge-in leaves the ground as it
   * was. Spends the endurance up front — the work was done whether or not
   * anything came of it.
   */
  protected engageAct(context: CommandContext, opts: GroundStepOptions): void {
    const giver = context.commandGiver;
    const durationS = opts.durationMs / 1000;
    let effortW: number | undefined;
    if (MixinApi.isExerting(giver)) {
      effortW = giver.wattsForFeltCost(opts.cost, durationS);
      if (!giver.canExert(effortW, durationS)) {
        this.decline(context, Mml.fromMarkup(giver.exhaustionRefusal()), 'too-tired');
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
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(GROUND_TOPIC).toSelf(opts.beginSelf);
      if (opts.beginPeers) scene.toPeers(opts.beginPeers);
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

  /** The duration one act of `job` takes on this ground. */
  protected paceFor(
    ground: Improvable,
    job: ImprovementJob,
    baseMs: number,
  ): number {
    const factor = ground.improvementPace(job);
    const safe = Number.isFinite(factor) && factor > 0 ? factor : 1;
    return Math.round(baseMs * safe);
  }

  /**
   * Credit the labour.
   *
   * ⚠ Difficulty is read off the GROUND at the moment of the act, not off a
   * counter: finishing hard ground is a hard check and turning over kind
   * ground is a trivial one, which is the estimator's own anti-grind
   * property doing the work rather than a bespoke guard.
   */
  protected async credit(giver: Stuff, required: number): Promise<void> {
    if (!MixinApi.isAdvancing(giver)) return;
    await giver.creditDeed({
      discipline: AGRICULTURE,
      difficulty: required >= 4 ? 'hard' : required >= 2 ? 'standard' : 'trivial',
      outcome: 'success',
    });
  }
}
