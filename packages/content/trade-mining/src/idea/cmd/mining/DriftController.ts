/**
 * DriftController — `drift <direction>`, the act that makes a mine bigger:
 * driving a heading (a drift) through the ground.
 *
 * The carve price is the ground: **hardness × the volume you are moving**,
 * so a slate heading is roughly half a granite one and the deposit's own
 * stratigraphy is what a player is really budgeting against.
 *
 * ⭐ I/O over {@link Working.drivePlanFor} (controller-liquidity W9): the
 * face, the ground's refusal (which names the state), the type row the new
 * cell clones from, the holder (keyed by identity — D11) and the carve are
 * the working's and the warren's.
 *
 * ⚠ The word is `drift`, the miner's term of art; the vehicle keeps the
 * plain `drive` (`drift.yaml`'s header has the ladder).
 */

import { MiningActController } from './MiningActController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { DriveDone, DriveRefusal } from '../../../lib/Working';

type Composed = ReturnType<typeof Mml.compose>;

interface DriftModel extends CommandModel {
  direction?: string;
}

export default class DriftController extends MiningActController<DriftModel> {
  async execute(model: DriftModel, context: CommandContext): Promise<void> {
    await this.driveIn(context, model.direction ?? '');
  }

  /**
   * The shared body `sink` and `raise` reuse with a fixed direction — the
   * vertical pair is the same act pointed down and up.
   */
  protected async driveIn(context: CommandContext, direction: string): Promise<void> {
    const giver = context.commandGiver;
    const working = this.workingOf(giver);
    if (!working) {
      DriftController.decline(context, Mml.compose`There is nothing to cut into here.`, 'not-a-working');
      return;
    }
    const plan = await working.drivePlanFor(giver, direction, this.edgeMedium());
    if (!plan.ok) {
      DriftController.decline(context, DriftController.refusalWords(plan), plan.reason);
      return;
    }
    await this.engagePlan(context, plan, {
      beginSelf: (b) => Mml.compose`You start driving a heading ${b.direction}.`,
      beginPeers: (b) => Mml.compose`${Mml.actor(giver)} starts driving a heading ${b.direction}.`,
      onRefused: (r) => r,
      onDone: (d) => DriftController.doneWords(d, giver),
    });
  }

  /**
   * The locomotion medium the fresh exit pair admits, or `null` for an
   * ordinary ground heading. ⭐ A VALUE read at dispatch, never a hook the
   * completion calls back into (that would be a call on a destroyed
   * controller).
   *
   * @hook The vertical pair says `vertical` — a winze is CLIMBED.
   */
  protected edgeMedium(): string | null {
    return null;
  }

  /** ⭐ Every reason the working will not take a heading (D4). */
  protected static refusalWords(r: DriveRefusal): Composed {
    switch (r.reason) {
      case 'no-direction':
        return Mml.compose`Drive which way? Name a direction.`;
      case 'no-warren':
        return Mml.compose`These workings are cut and finished — nobody drives here any more.`;
      case 'no-such-face':
        return Mml.compose`You can't cut that way.`;
      case 'already-driven':
        return Mml.compose`That way is already driven.`;
      case 'bad-ground':
        return DriftController.groundWords(r.facts.cause, 'drive');
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  protected static doneWords(d: DriveDone, giver: Stuff): { self: Composed; peers?: Composed } | null {
    switch (d.kind) {
      case 'gone':
        return null;
      case 'wont-take':
        return { self: Mml.compose`The ground will not take a heading there.` };
      case 'through':
        return {
          self: d.seam
            ? Mml.compose`The heading breaks through into ore — the seam runs on ${d.direction}.`
            : Mml.compose`The heading is through. Country rock, and no sign of a seam.`,
          peers: Mml.compose`${Mml.actor(giver)} breaks a heading through ${d.direction}.`,
        };
      default: {
        const never: never = d;
        return never;
      }
    }
  }
}
