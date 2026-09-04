/**
 * MeasureAcidityController — `measure acidity`, **the instrument rung**.
 *
 * ⭐ pH is the one soil property that is both **invisible and
 * decisive**: sour ground looks exactly like sweet ground, grows a
 * visibly poor crop, and the fix is lime — which is expensive, one-way
 * on any useful timescale, and useless if the ground did not need it.
 * That is the whole argument for an instrument rung existing at all. A
 * farmer who guesses wastes the lime.
 *
 * ⭐⭐ **Competence buys the error band and NOTHING else.** The ground has
 * one pH; `6.4 ± 0.8` and `6.4 ± 0.1` are the same dirt read by two
 * people. This controller reports the observation, records the
 * observation, and never touches the truth — which is what lets a test
 * assert that two readers of different bands got the identical sample.
 */

import { SoilChannelController, READING_TOPIC, SOIL_SCIENCE, SOIL_TESTING } from './SoilChannelController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

export default class MeasureAcidityController extends SoilChannelController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to take a sample from.`, 'no-place');
      return;
    }
    const kit = this.toolOf(giver, SOIL_TESTING);
    if (!kit) {
      this.decline(
        context,
        Mml.compose`You would need a soil kit for that — the eye cannot see sourness.`,
        'no-instrument',
      );
      return;
    }
    const read = await this.sampleAt(place);
    if (!read) {
      this.decline(
        context,
        Mml.compose`There is no ground under you to take a sample from.`,
        'no-ground',
      );
      return;
    }

    const { sample, spot } = read;
    const { phError } = await this.bandOf(giver);
    const ground = await this.groundIdOf(place);

    // ⚠ What is REMEMBERED is the truth, not the observation. The band
    // is recomputed every time the notes are read back, so an agronomist
    // who improves re-reads their own old field book at their new
    // resolution — which is what actually happens to a field book.
    this.remember(giver, ground, spot, 'ph', sample.nativePh.toFixed(1));

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(
        Mml.compose`You work a pinch of the soil into ${Mml.thing(kit)} and read it off: pH ${sample.nativePh.toFixed(1)} ± ${phError.toFixed(1)} — ${phPhrase(sample.nativePh)}`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} works a pinch of soil into a little glass and holds it up to the light.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: SOIL_SCIENCE,
        difficulty: 'standard',
        outcome: 'success',
      });
    }
  }
}

/**
 * ⭐ The percept beside the number, and it is a **symptom** — what this
 * pH does to a crop, not a restatement of the figure. A player who reads
 * "sour enough that the clover will sulk" has been told what to look for
 * in the field next season.
 */
function phPhrase(ph: number): string {
  if (ph < 5.2) return 'sour ground; little but heather and sorrel is content here.';
  if (ph < 5.8) return 'sour enough that the clover will sulk and the barley go thin.';
  if (ph < 6.4) return 'a shade sour — most things will grow, none of them gladly.';
  if (ph < 7.2) return 'sweet ground, near enough what most crops want.';
  if (ph < 7.8) return 'limy ground; the brassicas will love it and the potatoes will scab.';
  return 'chalky ground — it locks up the iron, and the leaves go yellow between the veins.';
}
