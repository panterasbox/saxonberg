/**
 * MeasureTextureController — `measure texture`, **the ribbon test**.
 *
 * ⭐ It is a real field procedure and it is performed here as one: take a
 * spadeful, wet it to a putty, and roll it out between finger and thumb.
 * How long a ribbon it makes before it breaks, and whether it feels
 * gritty or floury or greasy, *is* the texture class. Nobody needs a
 * laboratory and nobody ever has.
 *
 * ⚠ **A procedure is a verb, so this is an ACT and not a reading.** It
 * costs a spade, it costs the moment, and it credits `soil-science`. The
 * free rung — what `look` tells you — is `GroundCharacter.lookPhrase`
 * and gives you a coarse honest band; this gives you the class.
 *
 * ⭐ **The answer is the SAME for everybody, and the words are the
 * evidence rather than a verdict.** The prose reports what the soil did
 * in your fingers; naming the class is the conclusion the game draws for
 * you because you are the one who felt it. Competence buys nothing here
 * at all — a ribbon test is not a hard reading, which is exactly why it
 * is the rung a beginner can reach.
 */

import type { CommandModel } from '@saxonberg/server/mud/api/command';
import { SoilReading, READING_TOPIC, SOIL_SCIENCE, DIGGING } from '../../lib/SoilReading';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import GroundCharacter from '@saxonberg/content-ground/src/idea/GroundCharacter';

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface MeasureTextureModel extends CommandModel {
  tool?: MqlOneResult;
}


export default class TextureReading extends SoilReading {
  protected override async measure(
    context: CommandContext,
    _subject: Stuff | null,
    // ⭐ Bound and narrowed by the LADDER: the channel row names the
    // capability, the base finds the one tool in reach that has it, and
    // the refusal names the tool rather than this file naming it.
    instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to take a sample from.`, 'no-place');
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
    const ground = await this.groundIdOf(place);
    this.rememberReading(giver, ground, spot, 'texture', sample.texture);

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(
        Mml.compose`You turn a spadeful with ${Mml.thing(instrument)}, wet a pinch of it in your palm and roll it out between finger and thumb. ${GroundCharacter.ribbonPhrase(sample.texture)} — ${sample.texture}.`,
      )
      .toPeers(
        Mml.compose`${Mml.actor(giver)} turns a spadeful of earth and rolls a pinch of it between their fingers.`,
      )
      .send();

    // ⚠ Difficulty is read off the GROUND, not off a counter: the two
    // ends of the texture scale are unmistakable in the hand and the
    // middle three are where people actually disagree. So sampling loam
    // teaches you something and sampling a sandpit does not, which is
    // the estimator's own anti-grind property doing the work.
    if (MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: SOIL_SCIENCE,
        difficulty: ambiguousTexture(sample.texture) ? 'standard' : 'trivial',
        outcome: 'success',
      });
    }
  }
}

/** The three middle classes, which are the ones a hand can confuse. */
function ambiguousTexture(texture: string): boolean {
  return texture === 'loam' || texture === 'silt-loam' || texture === 'clay-loam';
}
