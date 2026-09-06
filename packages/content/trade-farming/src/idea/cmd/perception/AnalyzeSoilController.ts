/**
 * AnalyzeSoilController — `analyze soil`, **the interpretation**.
 *
 * ⭐⭐ **The card is a PROJECTION of the character's beliefs and holds no
 * state of its own.** The body is assembled from their DISCOVERY records
 * for this piece of country — one row per sampled spot with what they
 * found there — plus what their competence lets them generalise from it.
 * Sample a fourth corner and re-run it and the picture tightens.
 * **Nothing accumulates in the card; the card shows what the character
 * knows.**
 *
 * ⭐ **D5 — the map is a record of your sampling, not of the world.** Two
 * holders of one field see two different cards. Land you have worked for
 * years, you know; land you just bought, you do not — which makes buying
 * land a real risk and an honest surveyor worth paying for.
 *
 * ⭐⭐ And the bottom line is **what this ground costs to improve** (D55),
 * never what it yields. Stony ground is dear to clear and cheap to fence;
 * wet ground wants ditching; sour ground wants lime. That is why some
 * land was farmed for a thousand years and some was never farmed at all,
 * and the player pays the difference in labour rather than reading it off
 * a modifier.
 */

import { SoilChannelController, READING_TOPIC, SOIL_SCIENCE } from './SoilChannelController';
import type { CommandContext, CommandModel } from '@saxonberg/server/mud/api/command';
import type { SurveyFrame, SurveyPoint } from '@saxonberg/types';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CardApi } from '@saxonberg/server/mud/api/card';
import { TEXTURE_CLASSES, type TextureClass } from '../../GroundCharacter';

export default class AnalyzeSoilController extends SoilChannelController {
  async execute(_model: CommandModel, context: CommandContext): Promise<void> {
    const giver = context.commandGiver;
    const place = this.placeOf(giver);
    if (!place) {
      this.decline(context, Mml.compose`You are nowhere to read the ground from.`, 'no-place');
      return;
    }

    const ground = await this.groundIdOf(place);
    const { band, phError, generaliseFrom } = await this.bandOf(giver);
    const readings = this.recallAll(giver, ground);

    const points: SurveyPoint[] = readings.map((r) => ({
      where: r.where,
      channel: r.channel,
      reading: r.channel === 'ph' ? `pH ${r.reading}` : r.reading,
      // ⚠ Recomputed at READ time, never stored — the band is a fact
      // about the reader now.
      error: r.channel === 'ph' ? `${phError.toFixed(1)}` : null,
    }));

    const solved: SurveyFrame['solved'] = [];
    let note: string | null = null;

    const textures = readings
      .filter((r) => r.channel === 'texture')
      .map((r) => r.reading as TextureClass)
      .filter((t) => (TEXTURE_CLASSES as readonly string[]).includes(t));
    const phs = readings
      .filter((r) => r.channel === 'ph')
      .map((r) => Number(r.reading))
      .filter((n) => Number.isFinite(n));

    if (textures.length >= generaliseFrom) {
      const dominant = modeOf(textures);
      const varied = new Set(textures).size > 1;
      solved.push({
        parameter: 'ground',
        value: varied
          ? `${dominant}, and it changes across the holding`
          : `${dominant} throughout, as far as you have looked`,
        from: textures.length,
      });
      // The improvement bill is the point of all of it.
      solved.push({
        parameter: 'to bring in',
        value: improvementLine(dominant, phs),
        from: textures.length,
      });
    } else if (textures.length > 0) {
      note =
        generaliseFrom === Number.POSITIVE_INFINITY
          ? `You have your spadefuls written down, and no idea what to make of them. A ${band} hand has held soil; it has not read a field.`
          : `${textures.length} spadeful${textures.length === 1 ? '' : 's'}. Try ${generaliseFrom - textures.length} more, somewhere else on the ground, and they will start to say something.`;
    }

    if (phs.length > 0) {
      const mean = phs.reduce((a, b) => a + b, 0) / phs.length;
      // ⭐ Independent observations of one quantity average, and the
      // residual narrows as error / √n. Walking the field is what makes
      // the answer better — the arithmetic is the reason, not a rule.
      const residual = phError / Math.sqrt(phs.length);
      solved.push({
        parameter: 'acidity',
        value: `pH ${mean.toFixed(1)} ± ${residual.toFixed(2)}`,
        from: phs.length,
      });
    }

    if (points.length === 0) {
      note =
        'You have sampled nothing here. Open the ground with a spade and roll a pinch of it between your fingers; that is where a survey starts.';
    }

    const frame: SurveyFrame = { deposit: ground, points, solved, note };
    const prose = Mml.compose`${renderText(frame)}`;
    MessageApi.scene(giver).topic(READING_TOPIC).toSelf(prose).send();
    // ⚠ Two renderings of one payload would be able to drift, so the card
    // carries the SAME frame the prose was built from.
    CardApi.open(context, 'survey', {
      title: `soil — ${ground}`,
      payload: { kind: 'survey', survey: frame },
      prose,
    });

    if (solved.length > 0 && MixinApi.isAdvancing(giver)) {
      await giver.creditDeed({
        discipline: SOIL_SCIENCE,
        difficulty: 'hard',
        outcome: 'success',
      });
    }
  }
}

/** The improvement bill, in the words a man with a spade would use. */
function improvementLine(texture: TextureClass, phs: readonly number[]): string {
  const jobs: string[] = [];
  const fineness = TEXTURE_CLASSES.indexOf(texture) / (TEXTURE_CLASSES.length - 1);
  if (fineness >= 0.6) jobs.push('it will want draining before it will want anything else');
  if (fineness <= 0.2) jobs.push('it will want muck, and then more muck');
  if (phs.length > 0) {
    const mean = phs.reduce((a, b) => a + b, 0) / phs.length;
    if (mean < 6.0) jobs.push('lime');
    else if (mean > 7.6) jobs.push('nothing you can do about the chalk');
  } else {
    jobs.push('and nobody has tested it for sourness');
  }
  return jobs.length > 0 ? jobs.join('; ') : 'kindly ground; there is not much owing on it';
}

/** The commonest value, ties going to the coarser class. */
function modeOf(values: readonly TextureClass[]): TextureClass {
  const counts = new Map<TextureClass, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  let best = values[0] as TextureClass;
  let bestN = -1;
  for (const t of TEXTURE_CLASSES) {
    const n = counts.get(t) ?? 0;
    if (n > bestN) {
      best = t;
      bestN = n;
    }
  }
  return best;
}

/** The terminal rendering of the same frame the card carries. */
function renderText(frame: SurveyFrame): string {
  const lines: string[] = [`soil — ${frame.deposit}`];
  for (const p of frame.points) {
    lines.push(`  ${p.where}  ${p.channel}  ${p.reading}${p.error ? ` ± ${p.error}` : ''}`);
  }
  for (const s of frame.solved) {
    lines.push(`  ${s.parameter}: ${s.value}  (from ${s.from})`);
  }
  if (frame.note) lines.push(`  ${frame.note}`);
  return lines.join('\n');
}
