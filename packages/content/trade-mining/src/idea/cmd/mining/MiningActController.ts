/**
 * MiningActController — the shared base for the mine's labour acts
 * (`hew`, `drift`, `sink`, `raise`, `shore`, `drain`).
 *
 * Holds exactly what they share, and since controller-liquidity W9 that is
 * WORDS: finding the working the actor stands in (a narrowing on the
 * place), declining, and the one sentence every act says about bad ground.
 * The rules — the faces, the ground's threshold, the pace by hardness, the
 * effort, what the completion does — are the working's
 * ({@link Working.hewPlanFor} and its siblings); the base keeps no
 * permission (social-shell.md's rule for a noun base).
 *
 * A base class only — no YAML names it, the `ManualBuildController`
 * precedent.
 *
 * ⚠⚠ **None of these acts carries a deed gate, and that is a decision.**
 * They are LABOUR, not craft (see `Working`).
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { WORKING_MIXIN, type Working, type GroundCause } from '../../../lib/Working';

/** The topic every mining act narrates on. */
export const MINING_TOPIC = 'act.deed';

type Composed = ReturnType<typeof Mml.compose>;

export abstract class MiningActController<
  M extends CommandModel = CommandModel,
> extends CommandController<M> {
  /**
   * The working the actor is standing in, or `null`. ⭐ Narrowed by
   * `MixinApi.isActive(room, 'WorkingMixin')`: `MixinName` is a closed
   * union of KERNEL names, and a pack must never need a kernel list edit.
   */
  protected workingOf(giver: Stuff): (Stuff & Container & Working) | null {
    const room = MixinApi.isContainable(giver) ? giver.getContainer() : null;
    if (!room || !MixinApi.isActive(room, WORKING_MIXIN)) return null;
    return room as unknown as Stuff & Container & Working;
  }

  /** Decline diegetically, and file the structured reason. */
  protected static decline(context: CommandContext, prose: Composed, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(MINING_TOPIC).toSelf(prose).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }

  /**
   * ⚠ The ground refusal **names the state** — neglecting support costs you
   * ACCESS to your ore, never your life.
   */
  protected static groundWords(cause: GroundCause, act: string): Composed {
    const why =
      cause === 'wet'
        ? 'the ground is running wet here'
        : cause === 'span'
          ? 'you have opened too much here without timber'
          : 'the back is working here';
    return Mml.compose`${why} — set timber before you ${act} further.`;
  }
}
