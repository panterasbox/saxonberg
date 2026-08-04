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

import Thing from '../../lib/stuff/Thing';
import { MarkedMixin } from '../../lib/description/Marked';
import { LabelledMixin } from '../../lib/description/Labelled';
import { IdentifiableMixin } from '../../lib/identification/Identifiable';
import { GradedMixin } from '../../lib/craft/Graded';
import { CirculatingMixin } from '../../lib/residency/Circulating';
import type { FieldMeta } from '../../lib/mixin';
import type { CommandContributions } from '../../api/command';

const SpellbookBase = CirculatingMixin(
  GradedMixin(IdentifiableMixin(LabelledMixin(MarkedMixin(Thing)))),
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
    environment: ['magic/study.yaml'],
    inventory: ['magic/study.yaml'],
    peers: [],
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

  public setTeachesSpellPath(value: string): void {
    // The `Arcane.setCarriedSpellPath` guardrail, same reason: a bare id
    // typechecks and resolves to nothing.
    const v = typeof value === 'string' ? value.trim() : '';
    if (v.length > 0 && !v.startsWith('/')) {
      throw new RangeError(
        `teachesSpellPath: '${v}' is a bare id, not a template path ` +
          `(did you mean '/obj/magic/Spell/${v}'?)`,
      );
    }
    this.teachesSpellPath = v;
  }

  /** The comprehension floor band, or `''` for "the spell's own". */
  public getComprehensionBand(): string {
    return this.comprehensionBand;
  }

  public setComprehensionBand(value: string): void {
    this.comprehensionBand = typeof value === 'string' ? value : '';
  }
}
