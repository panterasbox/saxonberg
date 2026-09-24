/**
 * MeasureDipController — `measure dip`.
 *
 * ⭐⭐ **The other half of the plane, and you have to go and get it.**
 *
 * Dip is unobtainable from the surface, by construction: the outcrop
 * trace is the lode's intersection with `z ≈ 0` and a line contains no
 * dip. You read it off an EXPOSED VEIN — which means underground, in a
 * working you drove to reach it. That is the push-your-luck decision
 * arriving as a missing parameter: the surface tells you where the body
 * runs, and only cutting into it tells you which way it goes down.
 *
 * ⚠ The refusal on the surface is INFORMATIVE, not a gate. It says what
 * a dip reading needs (a face with the vein showing in it), because the
 * point is to teach the geometry rather than to withhold a number.
 */

import type { CommandModel } from '@saxonberg/server/mud/api/command';
import { SurveyReading, READING_TOPIC, GEOLOGY } from '../../lib/SurveyReading';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';

/** ⭐ The instrument is bound by the view, never hunted for here. */
interface MeasureDipModel extends CommandModel {
  tool?: MqlOneResult;
}


export default class DipReading extends SurveyReading {
  protected override async measure(
    context: CommandContext,
    _subject: Stuff | null,
    _instrument: Stuff & Tooled,
    _band: CompetenceBandName,
    _param: string,
  ): Promise<void> {
    const giver = context.commandGiver as unknown as Stuff;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to take a bearing from.`, 'no-place');
      return;
    }
    const deposit = await this.depositAt(place);
    if (!deposit) {
      this.decline(
        context,
        Mml.compose`There is no orebody here that anybody has named.`,
        'no-deposit',
      );
      return;
    }

    const coords = (place as unknown as { getCoordinates?(): [number, number, number] })
      .getCoordinates?.() ?? [0, 0, 0];
    const cellSize =
      (place as unknown as { getZone?(): { getCellSize?(): number } | null }).getZone?.()
        ?.getCellSize?.() ?? 1;
    const at: [number, number, number] = [
      coords[0] * cellSize,
      coords[1] * cellSize,
      coords[2] * cellSize,
    ];

    const { band, errorDeg } = await this.geologyBandOf(giver);
    const seed = await this.seedAt(place);
    const reading = deposit.dipReadingAt(at, errorDeg, seed);

    if (reading === null) {
      // ⚠ The teaching refusal. Not "you can't do that" — *what a dip
      // reading is taken ON*, so the player knows what to go and find.
      MessageApi.scene(giver)
        .topic(READING_TOPIC)
        .toSelf(
          Mml.compose`A dip is read off the vein itself, on a face where the seam is showing. There is none in front of you — the trace at the surface runs a line, and a line has no fall in it.`,
        )
        .send();
      context.note({ kind: 'empty-result', field: 'dip', query: 'dip' });
      return;
    }

    const where = `${Math.round(at[0])},${Math.round(at[1])},${Math.round(at[2])}`;
    this.rememberReading(giver, deposit, where, 'dip', reading.readingDeg);

    MessageApi.scene(giver)
      .topic(READING_TOPIC)
      .toSelf(
        Mml.compose`The seam runs into the face and down. Dip ${String(Math.round(reading.readingDeg))}° ± ${String(Math.round(errorDeg))}°, by your ${band} reckoning.`,
      )
      .send();

    if (MixinApi.isAdvancing(giver))
      await giver.creditDeed({
      discipline: GEOLOGY,
      difficulty: 'standard',
      outcome: 'success',
    });
  }
}
