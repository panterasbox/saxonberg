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

import { SurveyReading, READING_TOPIC, GEOLOGY } from '../../lib/SurveyReading';
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import type { CommandContext } from '@saxonberg/server/mud/api/command';
import type { SurveyFrame, SurveyPoint } from '@saxonberg/types';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { CardApi } from '@saxonberg/server/mud/api/card';

export default class GroundReading extends SurveyReading {
  protected override async analyze(
    context: CommandContext,
    _subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    _param: string,
  ): Promise<void> {
    const giver = this.actorOf(context);
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

    const { band, errorDeg, solveFrom } = await this.geologyBandOf(giver);
    const readings = this.recallReadings(giver, deposit);

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

    // ⭐⭐ **What the ASSAYS add up to** — the fact no single paper
    // contains. Bearings solve a plane; grades solve a GRADIENT, and
    // knowing which way the body gets richer is the thing a prospector
    // actually buys ground on.
    const assays = await this.assaysHeldBy(giver);
    const gradient = this.solveGradient(assays, solveFrom);
    if (gradient) {
      solved.push(gradient.solved);
      if (gradient.note) note = gradient.note;
    } else if (assays.length > 0) {
      note = notEnoughYet(assays, solveFrom);
    }

    if (points.length === 0 && assays.length === 0) {
      note =
        'You have measured nothing here yet. Walk the outcrop and take a bearing where the ground is stained.';
    }

    const frame: SurveyFrame = {
      deposit: deposit.getName() || 'the ground',
      points,
      solved,
      ground: await this.groundLine(place, band),
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

  /**
   * ⭐⭐ Every grade report this character is carrying.
   *
   * ⚠⚠ **Distinct faces are counted by GROUPING THE `sampledAt`
   * STRINGS, never by resolving them.** A face that has been worked out,
   * a gallery that collapsed, a room that was never persisted — all of
   * them still count, because where a sample was taken is a fact about
   * the past. A reader that resolved the path would silently drop the
   * best-worked parts of a prospector's own survey out of it, which is
   * the exact defect the provenance design exists to prevent.
   */
  private async assaysHeldBy(
    giver: Stuff,
  ): Promise<Array<{ at: string; value: number }>> {
    const held = MixinApi.isContainer(giver)
      ? (giver as unknown as { getContents(): Stuff[] }).getContents()
      : [];
    const out: Array<{ at: string; value: number }> = [];
    for (const item of held) {
      const paper = item as unknown as {
        getChannel?(): string;
        getValue?(): number | null;
        getSampledAt?(): string;
      };
      if (typeof paper.getChannel !== 'function') continue;
      if (paper.getChannel() !== 'grade') continue;
      const value = paper.getValue?.() ?? null;
      const at = paper.getSampledAt?.() ?? '';
      if (value === null || at === '') continue;
      out.push({ at, value });
    }
    return out;
  }

  /**
   * ⭐ The aggregate: which way the body gets richer, from reports taken
   * at DISTINCT places. Below the band's threshold it says how many more
   * and from where — an honest *not enough yet* rather than a guess.
   */
  private solveGradient(
    assays: Array<{ at: string; value: number }>,
    solveFrom: number,
  ): { solved: { parameter: string; value: string; from: number }; note?: string } | null {
    const byFace = new Map<string, number[]>();
    for (const a of assays) {
      const list = byFace.get(a.at) ?? [];
      list.push(a.value);
      byFace.set(a.at, list);
    }
    if (byFace.size < solveFrom) return null;
    const means = [...byFace.entries()].map(([at, values]) => ({
      at,
      mean: values.reduce((t, v) => t + v, 0) / values.length,
    }));
    const best = means.reduce((a, b) => (b.mean > a.mean ? b : a));
    const worst = means.reduce((a, b) => (b.mean < a.mean ? b : a));
    const spread = best.mean - worst.mean;
    return {
      solved: {
        parameter: 'grade',
        value:
          spread < 1
            ? `even across ${byFace.size} faces, near ${best.mean.toFixed(1)} %`
            : `richest toward ${leafOf(best.at)} (${best.mean.toFixed(1)} % against ${worst.mean.toFixed(1)} %)`,
        from: byFace.size,
      },
    };
  }

  /**
   * ⭐ **What you are standing on**, and what this reader can say about
   * it. Everyone with eyes gets the colour and a lean/fair/rich word;
   * the mineral's NAME needs a band that can solve at all — the same
   * `SOLVE_FROM` rung that turns three bearings into a plane, asked as a
   * predicate rather than re-listed, because naming the species of a
   * weathered oxide off a hand specimen is exactly as much geology.
   *
   * ⚠ **The card does not lie to a novice and does not hide from one.**
   * A novice reads *"rust-brown ironstone, and it looks rich"* — which
   * is true, useful, and not the word "goethite". That is competence
   * buying resolution rather than access, the rule the error band on a
   * bearing already follows.
   */
  private async groundLine(
    place: Stuff & Container,
    band: CompetenceBandName,
  ): Promise<string | null> {
    const ground = await this.groundAt(place);
    if (!ground || ground.sample.grade <= 0) return null;
    const colour = ground.mineral?.getAppearance() || 'ore';
    const named = this.solvesGround(band) ? ground.mineral?.getName() : null;
    const richness = ground.sample.grade < 0.06
      ? 'lean'
      : ground.sample.grade < 0.12
        ? 'fair'
        : 'rich';
    return named
      ? `${colour} — ${named}, and it runs ${richness}.`
      : `${colour}, and it looks ${richness}.`;
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
  if (frame.ground) lines.push(`  underfoot: ${frame.ground}`);
  if (frame.note) lines.push(`  ${frame.note}`);
  return lines.join('\n');
}

/** How many more, and from where — the honest *not enough yet*. */
function notEnoughYet(
  assays: Array<{ at: string; value: number }>,
  solveFrom: number,
): string {
  const faces = new Set(assays.map((a) => a.at)).size;
  if (!Number.isFinite(solveFrom)) {
    return `You are carrying ${assays.length} assay${assays.length === 1 ? '' : 's'}, and they are ${assays.length === 1 ? 'a figure' : 'figures'} rather than a picture. A practised eye would make something of them.`;
  }
  const want = solveFrom - faces;
  return `${faces} face${faces === 1 ? '' : 's'} assayed. ${want} more from ${want === 1 ? 'a different face' : 'different faces'} and the body's shape comes out.`;
}

/**
 * ⚠⚠ The last segment of a provenance path, humanised — and the path is
 * NEVER resolved. A worked-out face still names itself.
 */
function leafOf(path: string): string {
  return (path.split('/').filter(Boolean).pop() ?? path).replace(/[-_]/g, ' ');
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
