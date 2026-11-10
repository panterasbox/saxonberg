/**
 * SurveyController — `survey [<building>]`: read the place you are
 * standing in as a PLACE, rather than as a list of objects — or a building
 * from where it meets the weather.
 *
 * ⭐ One act, asked of the thing (controller-liquidity W7c,
 * `Surveyed.surveyFor`): a place answers what it is FOR (its room
 * archetypes, met *by what*), the shape its building is in, who owes the
 * upkeep, and how its floor is kept; a structure answers its outside. The
 * controller binds, asks, and writes the words — the bands, the colors and
 * the term in prose; the area and the litres as figures, because `survey`
 * measures.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type { CommandContext, CommandModel } from '../../../../api/command';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Satisfaction } from '../../../../lib/archetype/Archetype';
import type { OutsideSurvey, PlaceSurvey } from '../../../../lib/spatial/Surveyed';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';

const TOPIC = 'sense.survey';

export default class SurveyController extends CommandController {
  async execute(model: CommandModel, context: CommandContext): Promise<void> {
    const actor = context.commandGiver;
    const room = context.location;
    const target = (model.target as { stuff?: Stuff | null } | undefined)?.stuff ?? null;
    const subject = target ?? room;
    const answer = subject && MixinApi.isSurveyed(subject) ? await subject.surveyFor(actor as unknown as Stuff) : null;
    if (answer === null || !answer.ok) {
      const reason = answer?.reason ?? (target ? 'not-a-building' : 'nowhere');
      if (reason === 'nowhere' || !target) {
        context.note({ kind: 'controller-rejected', reason: 'nowhere-to-survey', detail: 'nowhere to survey' });
        MessageApi.scene(actor).topic(TOPIC).toSelf(Mml.compose`There is nothing here to take stock of.`).send();
        return;
      }
      // `not-a-building` · `not-here` — a thing, or a place you are not in.
      context.note({ kind: 'controller-rejected', reason: 'not-a-building', detail: 'not a building' });
      MessageApi.scene(actor)
        .topic(TOPIC)
        .toSelf(
          Mml.compose`${Mml.thing(target)} is not a building you could take stock of. Survey the place you are in, or a building from outside it.`,
        )
        .send();
      return;
    }
    const facts = answer.facts;
    const lines =
      facts.kind === 'outside'
        ? [`You take stock of ${facts.structure.getPresentation()} from outside:`, ...SurveyController.outsideLines(facts, 'it')]
        : SurveyController.placeLines(facts);
    MessageApi.scene(actor)
      .topic(TOPIC)
      .toSelf(Mml.text(`\n${lines.join('\n')}\n`))
      .send();
  }

  /** The place read, in the order holding → fabric → floor (repair's lines agree to it). */
  protected static placeLines(f: PlaceSurvey): string[] {
    const lines = [f.whole ? 'You take stock of the place as a whole:' : 'You take stock of the room:'];
    if (f.reports.length === 0) lines.push('  (nothing here knows what a room is for.)');
    for (const r of f.reports) lines.push(SurveyController.reportOf(r));
    if (f.outside) {
      lines.push('');
      lines.push(...SurveyController.outsideLines(f.outside, 'the place'));
    }
    if (f.upkeepTerm !== null) lines.push(`Upkeep here is ${SurveyController.termProse(f.upkeepTerm)}.`);
    if (f.floor) {
      lines.push('');
      lines.push(
        f.floor.band === 'clean'
          ? 'The floor is clean.'
          : `The floor is ${f.floor.band}; to ${f.floor.method} it would see to it.`,
      );
    }
    return lines;
  }

  /**
   * ⭐ A building's outside, in words (paint D13): the coat and its color,
   * the fabric's condition and why, then the job.
   */
  protected static outsideLines(f: OutsideSurvey, noun: string): string[] {
    const out: string[] = [];
    const top = f.top;
    if (top === null) {
      out.push(`There is no coat left on ${noun === 'it' ? 'it' : 'the outside'}.`);
    } else {
      const word = f.paint?.coatWord() ?? f.material?.getCoatWord() ?? 'coated';
      const color = f.paint ? ` ${f.paint.colorTag(top.faded ?? 0)}` : '';
      const what = f.paint ? f.paint.words(top.faded ?? 0) : f.material?.getName() || 'a coat';
      out.push(
        top.state === 'wet'
          ? `The outside has a wet coat of ${what}, not yet set.`
          : top.state === 'set'
            ? `The outside is ${word}${color} — ${what}.`
            : top.state === 'run'
              ? `The ${what} on the outside ran before it set.`
              : top.state === 'crazed'
                ? `The ${what} on the outside is crazed with fine cracks.`
                : `The ${what} on the outside has crawled off bare patches.`,
      );
    }
    out.push(`The fabric of ${noun} is ${f.band}${f.cause ? ` — ${f.cause}` : ''}.`);
    if (f.areaM2 > 0) {
      out.push(
        `There is about ${Math.round(f.areaM2)} square meters of ${f.surface} to the weather; ` +
          `one coat of paint would take about ${Math.max(1, Math.round(f.paintLitres))} litres.`,
      );
    }
    return out;
  }

  /** One archetype's line: the verdict, then what met or missed each need. */
  protected static reportOf(s: Satisfaction): string {
    const met = s.rows.filter((r) => r.satisfied);
    const short = s.rows.filter((r) => !r.satisfied);
    const head = s.satisfied
      ? `  ${s.label}: yes`
      : met.length === 0
        ? `  ${s.label}: no`
        : `  ${s.label}: not quite`;
    const by = met
      .filter((r) => r.by)
      .map((r) => `${r.key} (${r.by})`)
      .join(', ');
    const missing = short.map((r) => r.key).join(', ');
    const parts: string[] = [];
    if (by) parts.push(`has ${by}`);
    if (missing) parts.push(`wants ${missing}`);
    return parts.length > 0 ? `${head} — ${parts.join('; ')}` : head;
  }

  /** The term vocabulary, said in words rather than in its key. */
  protected static termProse(term: string): string {
    switch (term) {
      case 'institution-all':
        return 'the institution’s, inside and out';
      case 'landlord-shell':
        return 'the landlord’s for the shell; yours for what you put in it';
      case 'owner-all':
        return 'yours, all of it';
      default:
        return term;
    }
  }
}
