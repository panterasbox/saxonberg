/**
 * MeasureStrikeController — `measure strike`.
 *
 * ⭐ **The surface half of the three-point problem.** The outcrop trace
 * is the lode's intersection with the ground, and a compass on it reads
 * the plane's strike — to whatever resolution the reader's eye and
 * instrument allow. Three readings from three places narrow it; one does
 * not.
 *
 * ⚠ **It carries no dip information whatever**, and that is by
 * construction rather than by a gate: a line carries the strike of the
 * plane it came from and nothing else. `measure dip` underground answers
 * the other half — which is the push-your-luck decision arriving as a
 * missing parameter rather than as a paywall.
 *
 * ⭐ **A barren answer is a real answer.** Standing off the end of the
 * body reports that there is no trace here to read, which is the
 * informative negative the requirements ask for — and it costs the same
 * walk as a hit, which is what makes prospecting a decision.
 */

import { SurveyChannelController, READING_TOPIC, GEOLOGY } from './SurveyChannelController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { AdvancementApi } from '@saxonberg/server/mud/api/advancement';

export default class MeasureStrikeController extends SurveyChannelController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to take a bearing from.`, 'no-place');
      return;
    }
    if (!this.instrumentOf(giver)) {
      this.decline(
        context,
        Mml.compose`You need a surveyor's instrument in hand — a compass or a miner's dial — to take a bearing.`,
        'no-instrument',
      );
      return;
    }
    const deposit = await this.depositAt(place);
    if (!deposit) {
      this.decline(
        context,
        Mml.compose`There is no orebody under this ground that anybody has named.`,
        'no-deposit',
      );
      return;
    }

    const coords = (place as unknown as { getCoordinates?(): [number, number, number] })
      .getCoordinates?.() ?? [0, 0, 0];
    const cellSize =
      (place as unknown as { getZone?(): { getCellSize?(): number } | null }).getZone?.()
        ?.getCellSize?.() ?? 1;
    const x = coords[0] * cellSize;
    const y = coords[1] * cellSize;

    const { band, errorDeg } = await this.bandOf(giver);
    const seed = await this.seedAt(place);
    const reading = deposit.surfaceReadingAt(x, y, errorDeg, seed);

    if (reading === null) {
      // ⭐ The informative negative. It names WHY, so the player learns
      // something about where the body is not.
      MessageApi.scene(giver)
        .topic(READING_TOPIC)
        .toSelf(
          Mml.compose`Nothing here to take a bearing on — no stain, no float, no trace of a seam reaching the surface. Whatever is under this ground does not come up to it.`,
        )
        .send();
      context.note({ kind: 'empty-result', field: 'strike', query: 'strike' });
      await AdvancementApi.recordDeed(giver, {
        discipline: GEOLOGY,
        difficulty: 'standard',
        outcome: 'partial',
      });
      return;
    }

    const where = `${Math.round(x)},${Math.round(y)}`;
    this.remember(giver, deposit, where, 'strike', reading.readingDeg);

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(
        reading.staining > 0.5
          ? Mml.compose`The ground here is stained green in a band you can follow with your eye. Strike ${bearing(reading.readingDeg)} ± ${String(Math.round(errorDeg))}°, by your ${band} reckoning.`
          : Mml.compose`Faint float, and a suggestion of a line. Strike ${bearing(reading.readingDeg)} ± ${String(Math.round(errorDeg))}°, by your ${band} reckoning.`,
      )
      .send();

    // World-derived difficulty: a faint trace is a harder read than a
    // stained one, and the ground decides which this was.
    await AdvancementApi.recordDeed(giver, {
      discipline: GEOLOGY,
      difficulty: reading.staining > 0.5 ? 'easy' : 'hard',
      outcome: 'success',
    });
  }
}

/** Three-figure bearing, the way a compass is actually read. */
function bearing(deg: number): string {
  return String(Math.round(deg)).padStart(3, '0');
}
