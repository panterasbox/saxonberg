/**
 * SawController — `saw <log> [--quarter] [at <saw>]`.
 *
 * Turns wood in the round into boards. What can go on the saw:
 *
 *  - **a bole** — the felled trunk on the ground. The saw takes ONE
 *    length off it per cut (`Bole.takeLength`, the same length `fell
 *    bole` cross-cuts), and the bole goes on lying where it fell;
 *  - **a length or a billet you have** — any piece of wood in reach that
 *    is not already sawn. A stack gives up one of its pieces.
 *
 * ## ⭐⭐ The decision is how you open the log
 *
 * Through-sawn, every board comes off parallel to the last: the most
 * boards a log will give, and the wide ones cup as they dry because the
 * growth rings run across their faces. Quarter-sawn (`--quarter`), the
 * log is quartered first and the boards taken off radially: a third of
 * the log goes to waste in the wedges, and every board that is left
 * stays flat for a century. A cooper and a joiner want the second; a
 * barn wants the first. Same log, two answers, and the price says which.
 *
 * ⚠ A quarter-sawn board is a different ROW, not a flag stamped at the
 * mint (`quartered-board`, `quarterSawn: true` authored): the field has
 * no setter on the seasoning substrate, and a row is the honest home for
 * what a thing IS — two boards that will never merge into one stack.
 *
 * ## ⭐⭐ The two rungs differ in a SLOT, not in a number (the mill's rule)
 *
 *  - a **pit saw** claims your `hands` for the whole cut. Two men and a
 *    long blade, one in the pit; you can do nothing else until it is
 *    through.
 *  - a **water sawmill** claims **nothing of yours**. You dog the log
 *    on the carriage, open the hatch and leave; the race drives the
 *    frame whether you are in the room or not, and the boards are on the
 *    floor of the mill when it is done. Its rate is the river's —
 *    slower in a dry August, which nobody authored.
 *
 * The duration is `mass / rate` either way: kilograms of log over
 * kilograms an hour.
 *
 * ⭐ The cut is the SAW's (`Sawmill.sawPlan` — controller-liquidity W11):
 * the charge, the yield, the kerf and the claim on the saw are the
 * instrument's, and this controller only words the plan's facts and its
 * refusals. ⚠ The words that land at completion are `protected static`:
 * a controller is destructed the moment `execute` returns, and a cut runs
 * for game-minutes.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActDone } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { GrammarApi } from '@saxonberg/server/mud/api/grammar';
import Sawmill, { type SawCut, type SawLanded, type SawmillRefusal } from '../../../thing/Sawmill';

const TOPIC = 'act.deed';

interface SawModel extends CommandModel {
  log?: MqlOneResult;
  /** ⭐ The saw, resolved by the BINDER off the view's arg. */
  saw?: MqlOneResult;
  quarter?: boolean;
  through?: boolean;
}

type Composed = ReturnType<typeof Mml.compose>;

export default class SawController extends CommandController<SawModel> {
  async execute(model: SawModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;

    // ⭐ The saw — bound by the view (`reachable:[capability.sawing]`),
    // never hunted.
    const saw = model.saw?.stuff ?? null;
    if (saw === null) {
      this.turnDown(
        context,
        'no-saw',
        Mml.compose`You have nothing here to saw with. A pit saw will do it with two of you and a long afternoon; a sawmill on a race will do it while you are elsewhere.`,
      );
      return;
    }
    if (!(saw instanceof Sawmill) || !saw.hasCapability('sawing')) {
      this.turnDown(
        context,
        'wrong-tool',
        Mml.compose`${Mml.thing(saw)} will not open a log. That wants a pit saw or a sawmill.`,
      );
      return;
    }
    const log = model.log?.stuff ?? null;
    if (log === null) {
      this.turnDown(context, 'no-log', Mml.compose`Saw what?`);
      return;
    }
    if (model.quarter && model.through) {
      this.turnDown(
        context,
        'two-cuts',
        Mml.compose`A log is opened one way or the other — quartered or through-sawn, not both.`,
      );
      return;
    }

    const plan = await saw.sawPlan(giver, log, { quarter: model.quarter === true });
    if (!plan.ok) {
      this.turnDown(context, plan.reason, SawController.refusalWords(plan, log, saw));
      return;
    }

    if (plan.facts.unattended) {
      // ⭐⭐ THE SAWMILL HOLDS NOTHING OF YOURS — the game clock carries
      // the cut, and the boards are on the mill floor when you come back.
      void saw.runUnattended(plan).then((out) => SawController.landed(saw, out));
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`You dog ${Mml.thing(log)} down on the carriage and open the hatch on the race. The frame takes up its stroke and the log starts to walk into the blades — it does not need you.`,
        )
        .toPeers(
          Mml.compose`${Mml.actor(giver)} puts a log on the sawmill carriage and lets in the water.`,
        )
        .send();
      return;
    }

    // ⭐⭐ THE PIT SAW HOLDS YOUR HANDS until the cut is through.
    await this.engagePlan(context, plan, {
      beginSelf: (f: SawCut) =>
        Mml.compose`You chalk a line down ${Mml.thing(f.log)} and set the long saw to it. It is going to take a while, and both your hands are on the handle.`,
      beginPeers: (f: SawCut) =>
        Mml.compose`${Mml.actor(giver)} sets a long saw to ${Mml.thing(f.log)}.`,
      onRefused: () => Mml.compose`The cut came to nothing.`,
      onDone: (f: SawLanded) => SawController.doneWords(f),
    });
  }

  /** ⭐ Every reason a saw refuses a log (D4), in this verb's words. */
  protected static refusalWords(r: SawmillRefusal, log: Stuff, saw: Stuff): Composed {
    switch (r.reason) {
      case 'not-sawable':
        return Mml.compose`${Mml.thing(log)} is not wood in the round. A felled bole, a length off one or a billet goes on a saw.`;
      case 'bole-spent':
        return Mml.compose`There is nothing left in ${Mml.thing(log)} but the butt.`;
      case 'already-sawing':
        return Mml.compose`${Mml.thing(saw)} already has a log on it. Wait for it.`;
      case 'too-small':
        return Mml.compose`${Mml.thing(log)} is too small to give a board${r.facts.quarter ? ' quartered — try it through-sawn' : ''}.`;
      case 'no-power':
        return Mml.compose`${Mml.thing(saw)} will not run. There is no water in the race — it wants a flow to drive the frame.`;
      default: {
        const never: never = r;
        return never;
      }
    }
  }

  /** What the sawyer at the pit is told when the cut is through. */
  protected static doneWords(f: SawLanded): { self?: Composed; peers?: Composed } | null {
    if (f.kind === 'gone') {
      // ⭐ Never silent after the effort (C6): the work was done, and the
      // log or the saw is not there to show for it.
      return { self: Mml.compose`You come to the end of the cut and there is nothing on the saw to show for it.` };
    }
    const words = SawController.boardsWords(f.boards, f.quarter);
    return { self: words, peers: words };
  }

  /** The room by the saw hears the boards fall — both rungs. */
  protected static landed(saw: Sawmill, out: ActDone<SawLanded, never>): void {
    if (!out.ok || out.facts.kind !== 'boards' || saw.isDestroyed()) return;
    MessageApi.scene(saw as unknown as Stuff)
      .topic(TOPIC)
      .toPeers(SawController.boardsWords(out.facts.boards, out.facts.quarter))
      .send();
  }

  protected static boardsWords(boards: number, quarter: boolean): Composed {
    return Mml.compose`The last cut runs out and ${GrammarApi.inWords(boards)} ${quarter ? 'quartered ' : ''}${boards === 1 ? 'board falls' : 'boards fall'} away from the log.`;
  }

  private turnDown(context: CommandContext, reason: string, text: Composed): void {
    MessageApi.scene(context.commandGiver).topic(TOPIC).toSelf(text).send();
    context.note({ kind: 'controller-rejected', reason, detail: reason });
  }
}
