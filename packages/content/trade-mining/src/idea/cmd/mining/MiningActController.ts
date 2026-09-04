/**
 * MiningActController — the shared base for the mine's four labour acts
 * (`hew`, `drive`/`drift`, `sink`, `raise`).
 *
 * Holds exactly what they share: **standing in a working**, **engaging
 * the actor's hands over game time**, and **refusing on bad ground with
 * a reason that names the state.** A base class only — no YAML names it,
 * the `ManualBuildController` precedent.
 *
 * ⚠⚠ **None of these acts carries a deed gate, and that is a decision.**
 * They are LABOUR, not craft: gating labour on a can-make deed is the
 * band-gate violation wearing a hat, and `advancement`'s own ruling is
 * that a Discipline changes what you LEARN, never what the ground GIVES.
 * A miner with no transcript cuts exactly as much ore out of a face as a
 * master does; what the master has is the knowledge of where to point.
 * A test reads the four views and asserts no `requires`-a-deed appears.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { AbortReason } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { SchedulerApi } from '@saxonberg/server/mud/api/scheduler';
import { ManualBuildStep } from '@saxonberg/server/mud/lib/craft/ManualBuildStep';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { WORKING_MIXIN, type Working, type Stability } from '../../../lib/Working';

/** The topic every mining act narrates on. */
export const MINING_TOPIC = 'act.deed';

/** The reserve labour is paid out of. */
const ENDURANCE = 'endurance';

/** Hardness (MPa) at which a step takes its reference time. */
const REFERENCE_MPA = 200;

type Composed = ReturnType<typeof Mml.compose>;

export interface MiningStepOptions {
  durationMs: number;
  beginSelf: Composed;
  beginPeers?: Composed;
  /** Endurance the act costs, in percentage points. */
  cost: number;
  onComplete: () => void;
  onAbort?: (reason: AbortReason) => void;
}

export abstract class MiningActController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * The working the actor is standing in, or `null`.
   *
   * ⭐ Narrowed by `MixinApi.isActive(room, 'WorkingMixin')` rather than
   * by `hasMixin`: `MixinName` is a closed union of KERNEL mixin names,
   * and **a pack must never need a kernel list edit.** `isActive` takes a
   * plain string and, for an ungated mixin, is equivalent.
   */
  protected workingOf(giver: Stuff): (Stuff & Container & Working) | null {
    const room = (giver as unknown as { getContainer(): Stuff | null }).getContainer();
    if (!room || !MixinApi.isActive(room, WORKING_MIXIN)) return null;
    return room as unknown as Stuff & Container & Working;
  }

  /** Decline diegetically, and file the structured reason. */
  protected decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(MINING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /**
   * ⚠ The ground refusal, and it **names the state**. Neglecting support
   * costs you ACCESS to your ore, never your life: bad ground stops the
   * work and says why, and the free telegraph (a working back, dust,
   * drummy rock) rides the room's prose off the same threshold.
   *
   * Returns `true` when the act may proceed.
   */
  protected groundPermits(
    context: CommandContext,
    stability: Stability,
    act: string,
  ): boolean {
    if (stability.state !== 'bad') return true;
    const why =
      stability.water > 0.5
        ? 'the ground is running wet here'
        : stability.span >= 4
          ? 'you have opened too much here without timber'
          : 'the back is working here';
    this.decline(
      context,
      Mml.compose`${why} — set timber before you ${act} further.`,
      'bad-ground',
    );
    return false;
  }

  /** How long a step takes in this rock: the reference time, scaled by hardness. */
  protected paceForGround(baseMs: number, hardnessMPa: number): number {
    return Math.max(500, Math.round(baseMs * (hardnessMPa / REFERENCE_MPA)));
  }

  /**
   * Run the act as an engaged activity on the giver's `hands` slot, so
   * the effect lands **at completion** and a barge-in leaves the rock
   * standing. Spends the endurance up front — the work was done whether
   * or not the ore came out.
   */
  protected engageAct(context: CommandContext, opts: MiningStepOptions): void {
    const giver = context.commandGiver;
    this.spend(giver, opts.cost);
    if (!MixinApi.isEngaged(giver)) {
      opts.onComplete();
      return;
    }
    const step = new ManualBuildStep({
      actor: giver,
      slots: ['hands'],
      durationMs: opts.durationMs,
      onComplete: opts.onComplete,
      onAbort: opts.onAbort,
    });
    const result = SchedulerApi.start(step);
    if (result.ok && (result.status === 'started' || result.status === 'replaced')) {
      context.note(result.note);
      const scene = MessageApi.scene(giver).topic(MINING_TOPIC).toSelf(opts.beginSelf);
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
    this.decline(context, Mml.compose`You can't manage that just now.`, 'start-rejected');
  }

  /** Spend endurance. A no-op on a body that carries no reserves. */
  protected spend(giver: Stuff, points: number): void {
    if (points <= 0 || !MixinApi.isReserved(giver)) return;
    if (!giver.hasReserve(ENDURANCE)) return;
    giver.adjustReserve(ENDURANCE, Quantity.of(-points, '%'));
  }
}
