/**
 * LimeController — `lime`, the one amendment that is genuinely one-way.
 *
 * ⭐ **pH is the soil property that is both invisible and decisive.** A
 * sour field looks exactly like a sweet one and grows a visibly poor
 * crop; the fix is dear, slow to undo and entirely wasted if the ground
 * did not need it. That is why `measure acidity` exists, and this is what
 * you do about the answer.
 *
 * ⭐⭐ **It runs on MARL, and that is a deliberate refusal to ship a
 * faucet.** D68 has burnt lime coming from limestone in a kiln — the
 * mining chain's — and this build does not ship that chain. Rather than
 * author a sack of lime nobody makes (the *missing enabling data fails
 * closed and silent* trap, twice bitten in this repo), the source is
 * **marl**: calcareous clay you dig out of a limy field with `grub` and
 * carry to a sour one. It needs no kiln, no fuel and no other trade, it
 * was *the* land improvement of its era, and marl pits are still visible
 * in field corners.
 *
 * ⚠ **Burnt lime remains an open seam, stated rather than stubbed.** The
 * act takes anything carrying the `liming` tag, so the day the kiln
 * ships, its output works here with no edit — and until then nothing in
 * this file references a row that does not exist.
 */

import { FieldWorkController, FIELD_TOPIC, LABOUR_PER_ACT } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';

/**
 * The material tag a liming agent carries. ⭐ An open vocabulary, like
 * every material tag: marl answers it today, burnt lime will answer it
 * the day somebody burns some, and this file names neither.
 */
const LIMING_TAG = 'liming';

export default class LimeController extends FieldWorkController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no field here to lime.`, 'no-field');
      return;
    }
    const { field, bill } = reading;
    if (field.progressOn('liming', bill) >= 1) {
      this.decline(
        context,
        bill.liming <= 0
          ? Mml.compose`This ground is sweet enough already. Lime would be money in a ditch.`
          : Mml.compose`This ground has had all the lime it wants.`,
        'already-limed',
      );
      return;
    }
    const agent = this.limingAgent(giver);
    if (!agent) {
      this.decline(
        context,
        Mml.compose`You have nothing to spread. Marl, off a limy field, is what most people use.`,
        'no-agent',
      );
      return;
    }

    this.engageAct(context, {
      durationMs: 4_000,
      cost: 4,
      beginSelf: Mml.compose`You break up ${Mml.thing(agent)} and cast it out across the ground.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} spreads something pale across the field, handful by handful.`,
      onComplete: () => {
        void this.finish(context, reading, agent);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: NonNullable<Awaited<ReturnType<FieldWorkController['fieldOf']>>>,
    agent: Stuff,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { field, bill } = reading;
    // The material is consumed by the spreading, whatever it was.
    StuffApi.destruct(agent);
    const after = field.bankWork('liming', LABOUR_PER_ACT, bill);
    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        after >= 1
          ? Mml.compose`That is the last of what this ground wanted. ${field.improvementPhrase(bill)}.`
          : Mml.compose`It goes on white and weathers in. There is more owing before the sourness is out of it.`,
      )
      .send();
    await this.credit(giver, bill.liming);
  }

  /** A carried thing whose material carries the `liming` tag. */
  private limingAgent(giver: Stuff): Stuff | null {
    if (!MixinApi.isContainer(giver)) return null;
    for (const item of giver.getContents()) {
      const material = (item as unknown as {
        getMaterial?(): { hasTag?(t: string): boolean } | null;
      }).getMaterial?.();
      if (material?.hasTag?.(LIMING_TAG)) return item;
    }
    return null;
  }
}
