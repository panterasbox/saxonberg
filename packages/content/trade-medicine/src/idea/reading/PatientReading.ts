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

import Reading from '@saxonberg/server/mud/lib/instrument/Reading';
import type { CompetenceBandName } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';
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
import type { Tooled } from '@saxonberg/server/mud/lib/craft/Tooled';

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

export default class PatientReading extends Reading {
  protected override async analyze(
    context: CommandContext,
    subject: Stuff | null,
    _band: CompetenceBandName,
    _handTool: (Stuff & Tooled) | null,
    param: string,
  ): Promise<void> {
    // ⚠ Absent and bound-but-unresolved are DIFFERENT, and collapsing
    // them is how a bare verb silently reads the wrong thing. An empty
    // `param` with nothing bound is *the player said nothing*; a
    // non-empty one that bound nothing is *the player named something
    // that is not here*.
    const model = {
      target:
        subject !== null
          ? { stuff: subject, raw: param }
          : param === ''
            ? undefined
            : { stuff: null, raw: param },
    } as unknown as AnalyzePatientModel;
    const giver = context.commandGiver as unknown as Stuff;
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
      this.send(giver, lines, target as Stuff);
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
      this.send(giver, lines, target as Stuff);
      return;
    }

    // ── untrained: something is wrong ──────────────────────────────
    if (!at(band, 'novice')) {
      lines.push(
        Mml.escape('Something is wrong with them. You could not say what.'),
      );
      this.send(giver, lines, target as Stuff);
      return;
    }

    // ── novice: the signs ──────────────────────────────────────────
    const signs = new Set<string>();
    for (const a of afflictions) {
      for (const s of this.rowOf(a)?.getObservableSigns() ?? []) signs.add(s);
    }
    // ⭐⭐ **The honest misread** — and it is the arm that makes this a
    // reading rather than a lookup.
    //
    // At `novice` a reader can see a sign that is not there: they know
    // what signs LOOK like and not yet which body is showing which. The
    // wrong sign is drawn from the condition catalogue, so it is always
    // a plausible one — the failure mode of a beginner is a confident
    // wrong answer, never a nonsense one. This is combat's fog in the
    // clinical register, and `assess` is the shipped precedent.
    //
    // ⚠ SEEDED, not drawn: the same medic looking at the same patient on
    // the same day sees the same thing. Uncertainty here is EPISTEMIC —
    // what you can tell about the world — never resolutional. The world
    // already decided what is wrong with them.
    //
    // ⚠ And it stops at `competent`. A trained reader's answers may be
    // incomplete; they are not invented.
    const misread =
      !at(band, 'competent') && signs.size > 0
        ? this.distractorFor(signs, this.seedFor(giver, target as Stuff, ''))
        : null;
    const shown = new Set(signs);
    if (misread !== null) shown.add(misread);
    lines.push(
      Mml.escape(
        shown.size > 0
          ? `You read: ${[...shown].join(', ')}.`
          : 'They show nothing you can put a name to.',
      ),
    );

    // ── competent: the candidates, PLURAL and UNRANKED ─────────────
    if (!at(band, 'competent')) {
      this.send(giver, lines, target as Stuff);
      return;
    }
    const candidates = this.candidatesFor(signs);
    if (candidates.length === 0) {
      lines.push(Mml.escape('Nothing you know of presents like this.'));
      this.send(giver, lines, target as Stuff);
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
      this.send(giver, lines, target as Stuff);
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
      this.send(giver, lines, target as Stuff);
      return;
    }
    const worst = [...afflictions].sort((a, b) => b.stage - a.stage)[0];
    if (worst) {
      lines.push(Mml.escape(`It is at stage ${worst.stage}.`));
    }
    this.send(giver, lines, target as Stuff);
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

  /**
   * ⭐ A sign nobody is showing, drawn from the catalogue so it is
   * always a plausible one. `null` when the world has nothing to confuse
   * this with — a misread has to be a mistake somebody could actually
   * make.
   */
  private distractorFor(signs: ReadonlySet<string>, seed: number): string | null {
    const catalogue = StuffApi.findByTemplatePath<ConditionCatalogue>(
      TemplatePaths.conditionCatalogue,
    );
    const pool: string[] = [];
    for (const row of catalogue?.roster() ?? []) {
      for (const sign of row.getObservableSigns?.() ?? []) {
        if (!signs.has(sign) && !pool.includes(sign)) pool.push(sign);
      }
    }
    if (pool.length === 0) return null;
    pool.sort();
    return pool[seed % pool.length] ?? null;
  }

  /**
   * ⭐⭐ **They can tell you looked.** A body is a `Sensor`, and being
   * examined is a thing that happens TO somebody — a read that only the
   * reader perceives would make the clinic a place where people are
   * inspected without knowing it.
   *
   * ⚠ The target is told the ACT, never the finding. What the medic
   * concluded is the medic's, and telling them would hand a patient a
   * diagnosis they did not earn and a medic no reason to speak.
   */
  private send(giver: Stuff, lines: string[], target?: Stuff): void {
    const scene = MessageApi.scene(giver)
      .topic(TOPIC)
      .toSelf(Mml.fromMarkup(lines.join('\n\n')));
    if (target && target !== giver && MixinApi.isSensor(target)) {
      scene.toTarget(
        target,
        Mml.compose`${Mml.actor(giver)} looks you over carefully.`,
      );
    }
    scene.send();
  }
}
