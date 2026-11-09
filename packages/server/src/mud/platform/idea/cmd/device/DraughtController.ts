/**
 * DraughtController — `draught [<fire>] [<setting>]`.
 *
 * ⭐⭐ One number, three consequences. The narration is the point: a
 * player who opens the vents has to be TOLD the fire got hotter, cleaner
 * and dimmer, or the trade-off is a number in a log instead of a thing
 * they learned.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import { MqlApi, type MqlOneResult } from '../../../../api/mql';
import { MixinApi } from '../../../../api/mixin';
import { MessageApi } from '../../../../api/message';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Burner } from '../../../../lib/fire/Burner';

interface DraughtModel extends CommandModel {
  fire?: MqlOneResult;
  /**
   * ⭐⭐ The setting arrives as the SUBCOMMAND, not as a positional
   * string — and three drive runs are why.
   *
   * A bare word never bound: the binder is type-directed, so `low` was
   * consumed by the object arg (an unresolved selector is still a
   * structural match), `setting` stayed empty, and the verb silently
   * became a read while the draught never moved. ⚠ `char 0.45` works on
   * the identical shape because a NUMBER cannot bind to an object arg
   * and falls through to the number; a word cannot.
   *
   * A closed set of words after a verb is what subcommands ARE, and the
   * matcher binds them instead of the type system guessing.
   */
  subcommand?: string;
}

/** How a fire at this draught reads, in words. */
function describe(value: number): string {
  if (value >= 0.9) {
    return 'You open the vents wide. It draws hard, burns pale and clean — and sheds less light than you would think.';
  }
  if (value >= 0.4) {
    return 'You set the vents halfway. It settles into a steady yellow burn.';
  }
  if (value > 0.1) {
    return 'You choke the vents down. It cools, goes sooty, and glares.';
  }
  return 'You bank it down under its own ash. A dull red glow, and it will keep.';
}

export default class DraughtController extends CommandController<DraughtModel> {
  execute(model: DraughtModel, context: CommandContext): void {
    const { commandGiver } = context;
    const fireResult = model.fire;
    const fire = fireResult
      ? MqlApi.effectiveTarget(fireResult, (s): s is Stuff =>
          MixinApi.isBurner(s),
        )
      : null;
    if (!fire) {
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`There is no fire here.`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'no-burner',
        detail: 'there is no fire here',
      });
      return;
    }
    const burner = fire as Stuff & Burner;

    const raw = (model.subcommand ?? '').trim().toLowerCase();
    if (raw === '') {
      // ⭐ Bare `draught` is a READ, not a refusal. Asking where a dial
      // stands is not a mistake.
      const current = burner.getDraught();
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(
          Mml.compose`${Mml.thing(fire)}: ${wordFor(current)}.`,
        )
        .send();
      return;
    }

    // ⭐ The ladder's words are the burner's one vocabulary (W8).
    const value: number | null = burner.draughtFor(raw);
    if (value === null) {
      // ⚠ Unreachable through the view, which offers exactly these five
      // words — kept because a controller that trusted its matcher and
      // was wrong would set a fire's draught to `NaN`.
      const detail = 'Set it wide, half, low or banked.';
      MessageApi.scene(commandGiver)
        .topic('act.deed')
        .toSelf(Mml.compose`${detail}`)
        .send();
      context.note({
        kind: 'controller-rejected',
        reason: 'bad-setting',
        detail,
      });
      return;
    }

    // ⭐⭐ Captured BEFORE the set, and as a STRING. `draught banked`
    // takes the light out of the room, and `Mml.thing` is LAZY — it
    // resolves when the scene is sent, so the peers' line named a forge
    // nobody could see any more. Same hazard as `cover`, and the live
    // drive is what showed it.
    const fireName = fire.getPresentation();
    burner.setDraught(value);
    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`${describe(value)}`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} works the vents on ${fireName}.`,
      )
      .send();
  }
}

/** Where a dial stands, in words — never a figure. */
function wordFor(value: number): string {
  if (value >= 0.9) return 'the vents stand wide open';
  if (value >= 0.4) return 'the vents are halfway';
  if (value > 0.1) return 'the vents are nearly shut';
  return 'it is banked';
}
