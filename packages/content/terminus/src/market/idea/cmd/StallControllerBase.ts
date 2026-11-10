/**
 * StallControllerBase — what the `stall` subcommands share (economic
 * bootstrap D15: a player shop is a rented market stall): the bound square
 * fixture and the refusal words. `stall rent` (and bare `stall`) is
 * `StallRentController`; `stall give-up` is `StallGiveUpController`.
 *
 * ⭐ **The let is the square's** (controller-liquidity W13): the fixture
 * that manages the pitches — {@link MarketStalls} — keeps the book, mints
 * the counter keyed to the PITCH, takes the rent once and stands the house
 * up (`MarketStalls.let`), and packs a stall away handing its goods back
 * (`MarketStalls.giveUp`). See that class for the keying rules. These
 * controllers tell the answers.
 *
 * The fixture is an ARGUMENT (`at <stalls>`, defaulting to the one in
 * reach), bound by the view and never hunted for here.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import MarketStalls from '../../thing/MarketStalls';

export const TOPIC = 'act.deed';

export interface StallModel extends CommandModel {
  /** The square's stalls fixture — bound by the view (`at <stalls>`). */
  square?: MqlOneResult;
}

export abstract class StallControllerBase extends CommandController<StallModel> {
  /** The bound fixture, or null. */
  protected static fixtureOf(model: StallModel): MarketStalls | null {
    const bound = model.square?.stuff ?? null;
    return bound instanceof MarketStalls ? bound : null;
  }

  protected static fail(context: CommandContext, detail: string, reason: string): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(Mml.fromMarkup(`\n${detail}\n`)).send();
    context.note({ kind: 'controller-rejected', reason, detail });
  }
}
