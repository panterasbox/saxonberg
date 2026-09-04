/**
 * ForageController — `forage`, and ⭐⭐ **the best thing in this build's
 * design** (D61).
 *
 * Clearing (D54) is otherwise pure cost with no return until a crop
 * matures. Newly claimed ground is **wilderness, and wilderness is
 * forageable** — which pays for the clearing. And then:
 *
 * > **The forage declines as you clear.** You are converting a foraging
 * > commons into a farm — *the neolithic transition, expressed as a
 * > cashflow decision.*
 *
 * Wild forage is immediate, zero-capital and low-yield per acre. Farming
 * is high-yield but demands capital, labour and waiting. So the player
 * faces the question our ancestors actually faced — **can I afford to
 * stop gathering long enough to start growing?** — and the answer depends
 * on their labour and how long they can go without income. Not narrated;
 * budgeted.
 *
 * ⭐ It also gives a reverted farm a second life: ground that has gone
 * back (D58) **has gone back to being forageable**, which is part of why
 * buying it cheap works. That falls out for free, because wildness is
 * `1 − clearing progress` and clearing reverts.
 *
 * ## What this build does and does not own
 *
 * ⚠ [discovery-slate] owns foraging in full — *authors write the TABLE,
 * the world computes the STOCK*; depletion is a choice, not a tragedy;
 * derive-on-read, so unvisited ground costs nothing. **This build
 * consumes that model and does not redesign it.** The table is the
 * field's authored `forageRows`; the stock is derived from wildness ×
 * area, less what has been taken since it last regrew.
 *
 * ⚠⚠ And it is **not** the sward (W5). Two different things share the
 * English word: the standing grass a cow eats is `sward`, and what a
 * person gathers off rough ground is this. Adjacent waves, deliberately
 * different keys.
 */

import { FieldWorkController, FIELD_TOPIC } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';

/** The row rough ground yields when its own table is unauthored. */
const DEFAULT_FORAGE_ROW = '/trade/farming/thing/wild-greens';

export default class ForageController extends FieldWorkController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(
        context,
        Mml.compose`There is nothing growing wild here to gather.`,
        'no-field',
      );
      return;
    }
    const { field, bill } = reading;
    const wildness = field.wildness(bill);
    if (wildness < 0.1) {
      // ⚠ The refusal names the CAUSE, and the cause is the player's own
      // work. That is the lesson, delivered by the world rather than by
      // a tutorial line.
      this.decline(
        context,
        Mml.compose`There is nothing left growing wild on this ground. You grubbed it out.`,
        'cleared-out',
      );
      return;
    }
    const available = field.forageAvailable(wildness);
    if (available < 1) {
      this.decline(
        context,
        Mml.compose`You have been over this ground already. Give it time.`,
        'picked-over',
      );
      return;
    }

    this.engageAct(context, {
      // Thin pickings take longer per handful, which is the yield-per-
      // hour half of the decision made physical.
      durationMs: Math.round(3_000 / Math.max(0.25, wildness)),
      cost: 2,
      beginSelf: Mml.compose`You work along the edge of the rough, turning over the leaf litter.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} works slowly along the rough ground, gathering.`,
      onComplete: () => {
        void this.finish(context, reading, wildness);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: NonNullable<Awaited<ReturnType<FieldWorkController['fieldOf']>>>,
    wildness: number,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { field } = reading;
    const taken = field.takeForage(1);
    if (taken <= 0) {
      this.decline(context, Mml.compose`You come up with nothing worth carrying.`, 'nothing-found');
      return;
    }
    const row = field.getForageRows()[0] ?? DEFAULT_FORAGE_ROW;
    let got: Stuff | null = null;
    try {
      got = await StuffApi.clone<Stuff>(row);
    } catch {
      got = null;
    }
    if (!got) {
      this.decline(
        context,
        Mml.compose`You come up with nothing worth carrying.`,
        'nothing-found',
      );
      return;
    }
    if (MixinApi.isContainer(giver)) {
      ContainmentApi.move(got as Stuff & Containable, giver as Stuff & Container);
    } else {
      ContainmentApi.move(got as Stuff & Containable, field as unknown as Stuff & Container);
    }
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        wildness > 0.6
          ? Mml.compose`The rough is generous. You come away with ${Mml.thing(got)}.`
          : Mml.compose`There is less here than there was. You come away with ${Mml.thing(got)}.`,
      )
      .send();
  }
}
