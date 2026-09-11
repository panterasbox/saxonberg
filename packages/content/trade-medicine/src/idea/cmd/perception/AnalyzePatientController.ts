/**
 * ⭐⭐ AnalyzePatientController — `analyze patient <someone>`.
 *
 * **Competence buys INFORMATION, never outcomes.** This is the whole
 * claim of the medical vertical and the reason the verb exists: a better
 * medic does not heal harder, they *see* more, and what they see is what
 * lets them choose correctly. The ladder:
 *
 * | band | what you get |
 * |---|---|
 * | `untrained` | something is wrong, and nothing else |
 * | `novice` | every observable sign — the whole surface |
 * | `competent` | the conditions that could produce those signs — **plural and unranked** |
 * | `proficient` | what would treat it, and how it spreads |
 * | `expert` | how far it has gone |
 *
 * ⚠⚠ **The candidate list is unranked ON PURPOSE.** Handing back a
 * best guess would make the medic a reader of the engine's answer, and
 * `treat <target> for <condition>` would be a rubber stamp. Ambiguity is
 * what makes the choice a choice — and the difficulty of the graded deed
 * is *how many candidates shared the observed signs*, which is a
 * measurement of the world rather than a tag.
 *
 * ⭐ It is also the first and only consumer of `Condition.contagion`,
 * which shipped authored, spoiler-levelled and read by nothing. Read as a
 * READ — the medic can say "this spreads by touch". Nothing spreads;
 * that is the disease build's.
 *
 * ⚠ The reading is of the **signs**, not of the record: the candidates
 * are every warmed condition whose `observableSigns` overlap what this
 * body is showing, which is why a medic can be honestly wrong.
 */

import { CommandController } from '@saxonberg/server/mud/lib/command/CommandController';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { Mml } from '@saxonberg/server/mud/api/mml';
import { TemplatePaths } from '@saxonberg/server/mud/lib/paths';
import type ConditionCatalogue from '@saxonberg/server/mud/platform/idea/ConditionCatalogue';
import type Condition from '@saxonberg/server/mud/platform/idea/Condition';
import type { AfflictionRecord } from '@saxonberg/server/mud/platform/idea/Condition';
import type {
  CommandContext,
  CommandModel,
} from '@saxonberg/server/mud/api/command';
import type { MqlOneResult } from '@saxonberg/server/mud/api/mql';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';

const TOPIC = 'sense.reading';
const MEDICINE = 'medicine';

interface AnalyzePatientModel extends CommandModel {
  target?: MqlOneResult;
}

/** Rank of a band, for the ladder comparisons below. */
const at = (band: string, floor: string): boolean =>
  CompetenceBand.atOrAbove(
    band as never,
    floor as never,
  );

export default class AnalyzePatientController extends CommandController<AnalyzePatientModel> {
  async execute(
    model: AnalyzePatientModel,
    context: CommandContext,
  ): Promise<void> {
    const giver = context.commandGiver;
    const target = model.target?.stuff ?? giver;
    if (!MixinApi.isVitals(target)) {
      const detail = `There is nothing to read in ${target.getPresentation()}.`;
      context.note({
        kind: 'controller-rejected',
        reason: 'not-a-body',
        detail,
      });
      MessageApi.scene(giver)
        .topic(TOPIC)
        .toSelf(Mml.fromMarkup(Mml.escape(detail)))
        .send();
      return;
    }

    const band = MixinApi.isAdvancing(giver)
      ? await giver.competenceBandFor(MEDICINE)
      : CompetenceBand.FLOOR;

    const conditions = target.getConditions();
    const afflictions = conditions.filter(
      (c): c is AfflictionRecord => c.kind === 'affliction',
    );
    const traumas = conditions.filter((c) => c.kind === 'trauma');

    const who =
      (target as unknown as Stuff) === (giver as unknown as Stuff)
        ? 'yourself'
        : target.getPresentation();
    const lines: string[] = [Mml.strong(`Examination — ${who}`).toString()];

    if (afflictions.length === 0 && traumas.length === 0) {
      lines.push(Mml.escape('Nothing is the matter that you can find.'));
      this.send(giver, lines);
      return;
    }

    // ── the wounds: visible to anybody, at every band ──────────────
    if (traumas.length > 0) {
      lines.push(
        Mml.escape(
          `${traumas.length === 1 ? 'A wound' : `${traumas.length} wounds`}, ` +
            `plainly.`,
        ),
      );
    }

    if (afflictions.length === 0) {
      this.send(giver, lines);
      return;
    }

    // ── untrained: something is wrong ──────────────────────────────
    if (!at(band, 'novice')) {
      lines.push(
        Mml.escape('Something is wrong with them. You could not say what.'),
      );
      this.send(giver, lines);
      return;
    }

    // ── novice: the signs ──────────────────────────────────────────
    const signs = new Set<string>();
    for (const a of afflictions) {
      for (const s of this.rowOf(a)?.getObservableSigns() ?? []) signs.add(s);
    }
    lines.push(
      Mml.escape(
        signs.size > 0
          ? `You read: ${[...signs].join(', ')}.`
          : 'They show nothing you can put a name to.',
      ),
    );

    // ── competent: the candidates, PLURAL and UNRANKED ─────────────
    if (!at(band, 'competent')) {
      this.send(giver, lines);
      return;
    }
    const candidates = this.candidatesFor(signs);
    if (candidates.length === 0) {
      lines.push(Mml.escape('Nothing you know of presents like this.'));
      this.send(giver, lines);
      return;
    }
    lines.push(
      Mml.escape(
        candidates.length === 1
          ? `That is ${this.nameOf(candidates[0]!)}.`
          : `Consistent with: ${candidates
              .map((c) => this.nameOf(c))
              .sort()
              .join(', ')}. You would have to choose.`,
      ),
    );

    // ── proficient: what treats it, and how it travels ─────────────
    if (!at(band, 'proficient')) {
      this.send(giver, lines);
      return;
    }
    const treatments = new Set<string>();
    const vectors = new Set<string>();
    for (const c of candidates) {
      const by = c.getResolution()?.by;
      if (by) treatments.add(by);
      const vector = c.getContagion()?.vector;
      if (vector) vectors.add(vector);
    }
    if (treatments.size > 0) {
      lines.push(Mml.escape(`It wants ${[...treatments].sort().join(' or ')}.`));
    }
    if (vectors.size > 0) {
      lines.push(
        Mml.escape(`It travels by ${[...vectors].sort().join(', ')}.`),
      );
    }

    // ── expert: how far it has gone ────────────────────────────────
    if (!at(band, 'expert')) {
      this.send(giver, lines);
      return;
    }
    const worst = [...afflictions].sort((a, b) => b.stage - a.stage)[0];
    if (worst) {
      lines.push(Mml.escape(`It is at stage ${worst.stage}.`));
    }
    this.send(giver, lines);
  }

  /** The warmed row behind a record, or null. */
  private rowOf(record: AfflictionRecord): Condition | null {
    return (
      StuffApi.findByTemplatePath<Condition>(record.templatePath) ?? null
    );
  }

  /**
   * Every warmed condition whose observable signs overlap what this body
   * is showing — **the reading is of the SIGNS, not of the record**,
   * which is what lets a medic be honestly wrong.
   */
  private candidatesFor(signs: ReadonlySet<string>): Condition[] {
    if (signs.size === 0) return [];
    // ⭐ The catalogue's roster — every condition the world actually
    // warmed. Reading it here rather than hard-coding a list is what
    // makes a differential diagnosis cover a pack's new conditions for
    // free.
    const catalogue = StuffApi.findByTemplatePath<ConditionCatalogue>(
      TemplatePaths.conditionCatalogue,
    );
    const out: Condition[] = [];
    for (const row of catalogue?.roster() ?? []) {
      const rowSigns = row.getObservableSigns?.() ?? [];
      if (rowSigns.length === 0) continue;
      if (rowSigns.some((sign) => signs.has(sign))) out.push(row);
    }
    return out;
  }

  private nameOf(row: Condition): string {
    return row.getName?.() ?? 'something';
  }

  private send(giver: Stuff, lines: string[]): void {
    MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(lines.join('\n\n')))
      .send();
  }
}
