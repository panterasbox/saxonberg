/**
 * Spellbook — a physical object that teaches a working.
 *
 * `obj/`-side, because it is cloneable: books are things you find, buy,
 * carry, shelve and lose.
 *
 * ## What a book actually is
 *
 * **It mints a claim, never a deed** (requirements D13). Competence
 * derives from Transcript deeds, so a book that granted skill would have
 * to write evidence of practice that never happened. The ordinary
 * outcome is the honest one: *you know a spell you cannot cast*. That is
 * the practicum thesis in one object — instruction is the manual,
 * practice is the lab.
 *
 * ## The comprehension floor, below the casting floor (D14)
 *
 * You cannot learn what you cannot parse, so a book carries its own
 * floor on the same two grid axes, set **below** its casting floor. The
 * gap between them is a **read-ahead window**: a band where you can take
 * a specification on board and not yet execute it, so practice has a
 * visible target. Books are not a shortcut past competence — they are
 * gated by it at a lower threshold, for a different reason.
 *
 * **Reading above the floor does not fail.** It produces a *defective
 * specification the reader believes is correct* — one that costs far
 * more mana than it should and behaves oddly. Honest (half-understanding
 * is worse than none, precisely because you don't know you're wrong),
 * legible (the efficiency is visibly off, the same signal fade uses),
 * and recoverable (re-study once competent replaces it cleanly). Same
 * shape as the overreach paper: correct within what you understood,
 * wrong past it.
 *
 * ## Quality sets REFRESH SPEED, not fade rate (D16)
 *
 * The load-bearing negative. Once a specification is in a mind, the book
 * that put it there has no say in how fast it degrades — a well-written
 * one only gets the reader back to sharp faster. That is the teaching
 * product, and it is legible. So `Graded` is composed for speed and the
 * fade axes deliberately do not read it.
 *
 * ## Books are physical, and identified (D16/D29)
 *
 * They have mass, they can be shelved, and they are **identified items
 * on the same axis as potions** — an unlabelled book is *a dog-eared
 * book*, and reading an unidentified one is a gamble against your own
 * comprehension floor, with the bad copy as the losing outcome,
 * unchosen. Which puts the library in the right place: **a library's
 * product is the catalog, not the books.** New stock does not cause a
 * rush, it causes a *cataloguing backlog*, and early access to
 * uncatalogued material is the risky and valuable thing. The pacing is a
 * labour cost rather than a rule.
 *
 * It affords `read` (from `Marked`) and `study` — never a per-book verb,
 * which would announce what the book teaches (D34).
 */

import Good from '@saxonberg/server/mud/lib/stuff/Good';
import { MarkedMixin } from '@saxonberg/server/mud/lib/description/Marked';
import { CombustibleMixin } from '@saxonberg/server/mud/lib/fire/Combustible';
import { ThermalMixin } from '@saxonberg/server/mud/lib/thermal/Thermal';
import { ReservedMixin } from '@saxonberg/server/mud/lib/reserve/Reserved';
import { LabelledMixin } from '@saxonberg/server/mud/lib/description/Labelled';
import { IdentifiableMixin } from '@saxonberg/server/mud/lib/identification/Identifiable';
import { GradedMixin } from '@saxonberg/server/mud/lib/craft/Graded';
import { CirculatingMixin } from '@saxonberg/server/mud/lib/residency/Circulating';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MagicApi } from '@saxonberg/server/mud/api/magic';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { SpellKnowledge } from '@saxonberg/server/mud/lib/magic/SpellKnowledge';
import { Fade } from '@saxonberg/server/mud/lib/magic/Fade';
import { MagicGrid } from '@saxonberg/server/mud/lib/magic/Grid';
import { CompetenceBand } from '@saxonberg/server/mud/lib/advancement/CompetenceBand';

/** Why a book cannot be studied: it sets out nothing, a dead working, or the reader has no mind for one. */
export type StudyRefusal = 'teaches-nothing' | 'unknown-spell' | 'no-mind';

/** What the study's words need — the working's name, and whether the copy is (silently) defective. */
export interface StudyFacts {
  spellPath: string;
  spellName: string;
  /** Read below the comprehension floor: the reader believes the copy is good (D14). */
  defective: boolean;
}

/** Metabolic watts of taking a working on board (study is light work). */
const STUDY_EFFORT_W = 150;
/** Game-ms a full study from nothing takes, at ordinary book quality. */
const FULL_STUDY_MS = 20 * 60 * 1000;
/** Floor so a trivial top-up still takes a beat rather than zero time. */
const MIN_STUDY_MS = 30 * 1000;
/** How much a grade band above `poor` speeds a refresh. */
const QUALITY_SPEEDUP_PER_BAND = 0.12;

// `Detailed`: an item you cannot name is exactly the one you want to look
// at closely, so these three classes are examinable in parts. Safe only
// because `Identifiable` lenses the tree — a detail key is a parser
// token, so an unidentified item shows its CLASS's parts (`grip`, `seal`)
// and never its own. See `Detailed.detailRoot`.
// ⭐ Paper: a spellbook is leaves and boards, and it BURNS — the
// working text goes with it (the `Marked` ash read). Its reading behavior
// (`study`, the comprehension floor) is untouched.
const SpellbookBase = CirculatingMixin(
  GradedMixin(
    IdentifiableMixin(
      LabelledMixin(CombustibleMixin(ThermalMixin(ReservedMixin(MarkedMixin(Good))))),
    ),
  ),
);

export default class Spellbook extends SpellbookBase {
  static fieldMeta: FieldMeta = {
    teachesSpellPath: { persistent: true, authorable: true },
    comprehensionBand: { persistent: true, authorable: true },
  };

  /**
   * `study` is declared here rather than on a capability mixin because
   * a spellbook is the only thing you study — the "capability" and the
   * class are the same set, so a mixin would be ceremony. `read` comes
   * from `Marked`, as it does for every written thing.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['system/arcana/cmd/magic/study.yaml'],
    environment: ['system/arcana/cmd/magic/study.yaml'],
  };

  /** Which working this volume sets out. */
  public teachesSpellPath: string = '';

  /**
   * The **comprehension floor** — the band needed to parse the book,
   * set BELOW the spell's own casting floor. The gap is the read-ahead
   * window. Empty = the spell's own floor applies unchanged.
   */
  public comprehensionBand: string = '';

  /** Which working this volume sets out. `''` = a blank book. */
  public getTeachesSpellPath(): string {
    return this.teachesSpellPath;
  }

  public setTeachesSpellPath(value: string): Promise<void> | undefined {
    // The `Arcane.setCarriedSpellPath` guardrail, same reason: a bare id
    // typechecks and resolves to nothing.
    const v = typeof value === 'string' ? value.trim() : '';
    if (v.length > 0 && !v.startsWith('/')) {
      throw new RangeError(
        `teachesSpellPath: '${v}' is a bare id, not a template path ` +
          `(did you mean '/stuff/idea/magic/Spell/${v}'?)`,
      );
    }
    this.teachesSpellPath = v;
    // The book is live only when the spell dictionary is (D7).
    return v ? StuffApi.ready(MagicApi) : undefined;
  }

  /** The comprehension floor band, or `''` for "the spell's own". */
  public getComprehensionBand(): string {
    return this.comprehensionBand;
  }

  public setComprehensionBand(value: string): void {
    this.comprehensionBand = typeof value === 'string' ? value : '';
  }

  /**
   * ⭐ **The study, planned by the book** (controller-liquidity W13): how
   * long `reader` sits with it, and what lands at completion.
   *
   *  - **The comprehension floor** (D14) is the book's (or the spell's own
   *    casting floor): below it the reader gets a DEFECTIVE copy, never a
   *    refusal — and is not told.
   *  - **The savings curve** (D16): a nearly-sharp working comes back
   *    quickly, a badly decayed one slowly; the book's GRADE scales that
   *    speed and nothing else.
   *  - **The claim, never a deed** (D13): completion memorizes the working
   *    and writes a chronicle claim — no Transcript entry, competence
   *    untouched.
   */
  public async studyPlanFor(
    reader: Stuff,
  ): Promise<ActPlan<StudyFacts, StudyFacts> | ActRefusal<StudyRefusal>> {
    const spellPath = this.teachesSpellPath;
    if (!spellPath) return { ok: false, reason: 'teaches-nothing' };
    const spell = MagicApi.spellAt(spellPath);
    if (!spell) return { ok: false, reason: 'unknown-spell' };
    if (!MixinApi.isMemorized(reader)) return { ok: false, reason: 'no-mind' };

    // The comprehension floor — set BELOW the casting floor, so the gap is a
    // read-ahead window practice can aim at.
    const adv = MixinApi.isAdvancing(reader) ? reader : null;
    const [verbBand, nounBand] = await Promise.all([
      adv?.competenceBandFor(MagicGrid.verbDisciplineKey(spell.verb)) ?? CompetenceBand.FLOOR,
      adv?.competenceBandFor(MagicGrid.nounDisciplineKey(spell.noun)) ?? CompetenceBand.FLOOR,
    ]);
    const limiting =
      CompetenceBand.rank(verbBand) <= CompetenceBand.rank(nounBand) ? verbBand : nounBand;
    const floor = CompetenceBand.isBand(this.comprehensionBand)
      ? this.comprehensionBand
      : spell.castingProfile.requiredBand;
    const defective = !CompetenceBand.atOrAbove(limiting, floor);

    const sharpness = reader.getMemorizedSpell(spellPath)?.sharpness ?? 0;
    const speed = 1 + QUALITY_SPEEDUP_PER_BAND * this.getGrade().getOrdinal();
    const durationMs = Math.max(MIN_STUDY_MS, (FULL_STUDY_MS * Fade.refreshFraction(sharpness)) / speed);
    const complexity = Fade.complexityOf(
      spell.effects.length,
      CompetenceBand.rank(spell.castingProfile.requiredBand),
    );
    const facts: StudyFacts = { spellPath, spellName: spell.name, defective };
    return {
      ok: true,
      durationMs,
      effortW: STUDY_EFFORT_W,
      facts,
      slots: ['hands', 'attention'],
      onComplete: () => {
        reader.memorize({ spellPath, defective, verb: spell.verb, noun: spell.noun, complexity });
        // The CLAIM, never a deed.
        if (MixinApi.isPersona(reader)) {
          void reader
            .recordChronicleOnce(SpellKnowledge.knownKey(spellPath), SpellKnowledge.knownEntry(spell.name))
            .catch(() => {});
        }
        return { ok: true, facts };
      },
    };
  }
}
