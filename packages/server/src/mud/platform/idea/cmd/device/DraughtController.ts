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
  setting?: string;
}

/**
 * The named settings. ⭐ A closed vocabulary beside a free number,
 * because *wide* and *banked* are what a person says and 0.63 is what a
 * collier watching a charring band says.
 */
const NAMED: Readonly<Record<string, number>> = {
  wide: 1,
  open: 1,
  full: 1,
  half: 0.5,
  low: 0.2,
  banked: 0.05,
  shut: 0.05,
};

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

    const raw = (model.setting ?? '').trim().toLowerCase();
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

    let value: number | null = NAMED[raw] ?? null;
    if (value === null) {
      const n = Number.parseFloat(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 1) value = n;
    }
    if (value === null) {
      const detail =
        'Set it wide, half, low or banked — or give a figure from 0 to 1.';
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

    burner.setDraught(value);
    MessageApi.scene(commandGiver)
      .topic('act.deed')
      .toSelf(Mml.compose`${describe(value)}`)
      .toPeers(
        Mml.compose`${Mml.actor(commandGiver)} works the vents on ${Mml.thing(fire)}.`,
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
