/**
 * AnalyzeGroundController — `analyze ground`, the **interpretation**.
 *
 * ⭐⭐ **The card is a PROJECTION of the character's beliefs and holds no
 * state of its own.** The body is assembled from their DISCOVERY records
 * for the covering deposit — one row per measurement point with its
 * reading — plus the parameters their competence makes inferable.
 * Re-running it after a third measurement re-projects and the strike row
 * tightens. **Nothing accumulates in the card; the card shows what the
 * character knows.**
 *
 * ⭐ Three points beat one, and the arithmetic is the reason rather than
 * a rule: independent observations of one angle average, and the residual
 * band narrows as `error / √n`. A player who walks the outcrop is
 * *actually doing* the thing that makes the answer better.
 *
 * ⭐ And competence decides whether the inference is available AT ALL.
 * Under a novice, three green rocks are three green rocks — the rows are
 * all there, the solution is not, and the card SAYS SO rather than
 * showing a blank. That is the requirements' *"a barren survey returns an
 * informative negative"* applied to knowledge as well as to ground.
 *
 * ⚠ `survey` already answers *what is this place* for free. This verb is
 * therefore clearly the interpretive read rather than a place-identity
 * one — three layers, not one.
 */

import { SurveyChannelController, READING_TOPIC, GEOLOGY } from './SurveyChannelController';
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { SurveyFrame, SurveyPoint } from '@saxonberg/types';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CardApi } from '@saxonberg/server/mud/api/card';

export default class AnalyzeGroundController extends SurveyChannelController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to read the ground from.`, 'no-place');
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

    const { band, errorDeg, solveFrom } = await this.bandOf(giver);
    const readings = this.recallAll(giver, deposit);

    const points: SurveyPoint[] = readings.map((r) => ({
      where: r.where,
      channel: r.channel,
      reading: r.channel === 'strike' ? bearing(r.reading) : `${Math.round(r.reading)}°`,
      // ⚠ The band is recomputed at READ time, never stored: it is a fact
      // about the reader now, so a prospector who improves re-reads their
      // own old notes at their new resolution.
      error: `${Math.round(errorDeg)}°`,
    }));

    const solved: SurveyFrame['solved'] = [];
    let note: string | null = null;
    for (const channel of ['strike', 'dip'] as const) {
      const values = readings.filter((r) => r.channel === channel).map((r) => r.reading);
      if (values.length === 0) continue;
      if (values.length < solveFrom) {
        note =
          solveFrom === Number.POSITIVE_INFINITY
            ? `You have the readings written down, but you cannot yet make them add up to anything. A ${band} eye sees ${values.length === 1 ? 'a green rock' : 'green rocks'}, not a plane.`
            : `${values.length} reading${values.length === 1 ? '' : 's'} of ${channel}. Take ${solveFrom - values.length} more from ${solveFrom - values.length === 1 ? 'another place' : 'other places'} and they will solve.`;
        continue;
      }
      // ⭐ The arithmetic IS the reason three beat one: independent
      // observations average, and the residual narrows as error / √n.
      const mean = meanAngle(values, channel === 'strike');
      const residual = errorDeg / Math.sqrt(values.length);
      solved.push({
        parameter: channel,
        value:
          channel === 'strike'
            ? `${bearing(mean)} ± ${residual.toFixed(1)}°`
            : `${Math.round(mean)}° ± ${residual.toFixed(1)}°`,
        from: values.length,
      });
    }

    if (points.length === 0) {
      note =
        'You have measured nothing here yet. Walk the outcrop and take a bearing where the ground is stained.';
    }

    const frame: SurveyFrame = {
      deposit: deposit.getName() || 'the ground',
      points,
      solved,
      note,
    };

    const prose = Mml.compose`${renderText(frame)}`;
    MessageApi.scene(giver).topic(READING_TOPIC).toSelf(prose).send();
    // ⚠ Two renderings of one payload would be able to drift, so the card
    // carries the SAME frame the prose was built from.
    CardApi.open(context, 'survey', {
      title: `survey — ${frame.deposit}`,
      payload: { kind: 'survey', survey: frame },
      prose,
    });

    if (solved.length > 0) {
      if (MixinApi.isAdvancing(giver))
        await giver.creditDeed({
        discipline: GEOLOGY,
        difficulty: 'hard',
        outcome: 'success',
      });
    }
  }
}

/** The terminal rendering of the same frame the card carries. */
function renderText(frame: SurveyFrame): string {
  const lines: string[] = [`survey — ${frame.deposit}`];
  for (const p of frame.points) {
    lines.push(`  ${p.where}  ${p.channel}  ${p.reading}${p.error ? ` ± ${p.error}` : ''}`);
  }
  for (const s of frame.solved) {
    lines.push(`  ${s.parameter}: ${s.value}  (from ${s.from})`);
  }
  if (frame.note) lines.push(`  ${frame.note}`);
  return lines.join('\n');
}

/** Three-figure bearing, the way a compass is actually read. */
function bearing(deg: number): string {
  return String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0');
}

/**
 * The mean of several angle readings.
 *
 * ⚠ Circular for a bearing (039° and 001° average to 020°, not 020° the
 * long way round), plain for a dip, which is bounded 0–90 and has no
 * wrap to worry about.
 */
function meanAngle(values: readonly number[], circular: boolean): number {
  if (!circular) return values.reduce((a, b) => a + b, 0) / values.length;
  let x = 0;
  let y = 0;
  for (const v of values) {
    x += Math.cos((v * Math.PI) / 180);
    y += Math.sin((v * Math.PI) / 180);
  }
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}
