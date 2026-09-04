/**
 * MowController — `mow`, and ⭐⭐ **the whole of D7 in one act.**
 *
 * There is no `use` field on a field. What distinguishes *hay* from
 * *grazing* is not a declaration and not a mode — it is **whether the
 * mouth was standing here.** Grazing and mowing are the same draw on the
 * same reserve; the only difference is where the animal was, and that
 * difference is where the nitrogen goes:
 *
 * | | Standing on it | Mouth | Nutrients |
 * |---|---|---|---|
 * | **Hay** | sward | elsewhere | **exported** |
 * | **Graze** | sward | **on the field** | **cycled in place** |
 *
 * So this act does exactly one thing the grazing path does not: it
 * **debits the field's nitrogen** by what the crop carried away. That is
 * why *"the hay meadow is the hungriest field on the farm"* is true here
 * without anybody authoring it, and why **fertility follows the mouths**
 * is a sentence a player derives rather than a rule they are told.
 *
 * ⭐ It cuts to the **residual and no further** (D9), which is not a
 * kindness — it is what a scythe does. You cannot cut grass below the
 * ground, and a sward cut into its crowns is a sward that will not come
 * again. The refusal when there is nothing above the residual is
 * therefore diegetic rather than a rule.
 */

import { FieldWorkController, FIELD_TOPIC } from './FieldWorkController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { SWARD_RESIDUAL_FRACTION } from '../../../lib/Sward';

/** What a cut of hay comes off the field as. */
const HAY_ROW = '/trade/farming/thing/hay';

/**
 * Percentage points of the nitrogen reserve exported per kilogram of dry
 * matter carried off the field.
 *
 * ⚠ A provisional coefficient, and W10 replaces it with the real one:
 * crude protein is nitrogen × 6.25, so what a crop carries away in
 * nitrogen is derivable from what it carries away in protein rather than
 * declared. What must be true NOW is only the direction — hay leaves the
 * field poorer than grazing it did — and that is what this asserts.
 */
const N_POINTS_PER_KG_DM = 0.08;

export default class MowController extends FieldWorkController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const reading = await this.fieldOf(giver);
    if (!reading) {
      this.decline(context, Mml.compose`There is no sward here to cut.`, 'no-field');
      return;
    }
    const scythe = this.toolOf(giver, 'mowing');
    if (!scythe) {
      this.decline(
        context,
        Mml.compose`Not by hand. You would want a scythe.`,
        'no-tool',
      );
      return;
    }
    const { field } = reading;
    const ceiling = field.swardCeilingKg();
    const standing = field.standingDryMatterKg();
    const cuttable = standing - ceiling * SWARD_RESIDUAL_FRACTION;
    if (cuttable <= 0.5) {
      this.decline(
        context,
        Mml.compose`${field.swardPhrase()} — there is nothing on it worth a scythe, and cutting into the crowns would finish it.`,
        'below-residual',
      );
      return;
    }

    this.engageAct(context, {
      // A scythe is slow and the swathe is the field's size, not yours.
      durationMs: Math.round(3_000 + cuttable * 400),
      cost: 8,
      beginSelf: Mml.compose`You set the edge of ${Mml.thing(scythe)} into the grass and start the first swathe.`,
      beginPeers: Mml.compose`${Mml.actor(giver)} starts mowing, working across the field in long even swathes.`,
      onComplete: () => {
        void this.finish(context, reading, cuttable);
      },
    });
  }

  private async finish(
    context: CommandContext,
    reading: NonNullable<Awaited<ReturnType<FieldWorkController['fieldOf']>>>,
    cuttable: number,
  ): Promise<void> {
    const giver = context.commandGiver;
    const { field } = reading;
    const taken = field.drawSward(cuttable);
    if (taken <= 0) {
      this.decline(context, Mml.compose`There was less on it than you thought.`, 'nothing-cut');
      return;
    }

    // ⭐⭐ THE line. The crop carried its nitrogen away with it, and this
    // is the only place in the build where it leaves the field.
    const exported = field.drawNutrient(taken * N_POINTS_PER_KG_DM);

    let hay: Stuff | null = null;
    try {
      hay = await StuffApi.clone<Stuff>(HAY_ROW);
    } catch {
      hay = null;
    }
    if (hay) {
      // The cut IS the mass. Nobody authors how much hay a field gives.
      const massed = hay as unknown as { setMass?(q: Quantity<'kg'>): void };
      massed.setMass?.(Quantity.of(round2(taken), 'kg'));
      ContainmentApi.move(hay as Stuff & Containable, field as unknown as Stuff & Container);
    }

    MessageApi.scene(giver)
      .topic(FIELD_TOPIC)
      .toSelf(
        Mml.compose`You cut it down to the residual and leave it lying — ${round2(taken)} kilos of it. ${exported > 0 ? 'The field is the poorer for what you carried off it.' : ''}`,
      )
      .toPeers(Mml.compose`${Mml.actor(giver)} finishes the last swathe and stands up.`)
      .send();
    await this.credit(giver, 3);
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
