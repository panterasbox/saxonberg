/**
 * MeasureBook — the tailor's book of measurements.
 *
 * ⭐⭐ **A business asset, not a person's.** It sits on the shop's
 * counter, so it transfers with the shop: a tailor who quits does not
 * take the town's measurements away, and a tailor who buys the shop
 * inherits a book of everyone who ever came in. That is how the trade
 * really works, and it makes the shop worth more than its fixtures.
 *
 * ## ⚠ Why an OBJECT and not a document under the shop's parcel
 *
 * The plan wanted the book in the document tree. `DOCUMENT_KINDS` is a
 * **closed kernel vocabulary and a pack may not extend it** — the
 * `water-right` entry says so outright: *"a pack cannot declare one —
 * the kind's consumer is code and the installer needs its go-live
 * hook."* A Stage-B wave that needs a kernel list edit has found a
 * design error, so this is the design corrected rather than the rule
 * bent.
 *
 * ⭐ And the object is the better fit for the property that mattered.
 * "It transfers with the shop" is *more* literally true of a ledger on
 * the counter than of a path under a parcel: whoever owns the fixture
 * owns the book, through the shipped estate slice, with nothing new.
 *
 * ## ⭐⭐ Staleness is BODY-CHANGE, never a clock
 *
 * ```
 * staleness = |girth_now − girth_book| / girth_book
 * ```
 *
 * The book stores measurements; whether they are still *you* is
 * answerable from the numbers alone. **No timestamp, no decay
 * function** — a person whose body is stable keeps a good entry
 * forever, and a returning customer whose body has moved wants
 * re-measuring, which is a reason to come in.
 *
 * ⭐ Which closes a loop: a garment cut from a stale entry fits *off* —
 * not wrong, just off — so a gift cut from an old measurement is a
 * slightly-off gift. The book decays and needs tending, the same shape
 * as fastness for the dyer: **the craft's value is in the upkeep, not
 * the one-time act.**
 */

import Thing from '@saxonberg/server/mud/lib/stuff/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';

/**
 * One remembered subject. Flat scalars in a list — the
 * `composition[]` / `naturalAttacks[]` shape, which round-trips through
 * the default Hydrator with no marshaller.
 */
export interface BookEntry {
  /** Who — a durable identifier, never a display name. */
  subject: string;
  /** What they are called, for the tailor to read back. */
  name: string;
  bodyPlan: string;
  statureM: number;
  girthIndex: number;
}

// ⭐ `ToolMixin` because the book IS the instrument of this reading, and
// the ladder narrows instruments by CAPABILITY rather than by class. The
// view used to bind it with `[class.MeasureBook]`, which meant a second
// shop's ledger could never serve — the same class-check defect the ten
// platform instruments carried.
export default class MeasureBook extends ToolMixin(DetailedMixin(Thing)) {
  /*
   * ⚠⚠ THE BOOK IS THE INSTRUMENT, and without this static the whole
   * `measure figure` stanza is unreachable: the controller, the view
   * stanza, the help text and the two acceptance tests all existed and
   * `measure figure` still answered "I don't understand 'measure'" while
   * standing in the tailor's shop HOLDING the book. Found by driving.
   *
   * ⚠ An affordance is a STATIC ON A CLASS. A row's
   * `commandContributions:` is dead silently — the sibling
   * `trade-mining` pack says so in `lib/Working.ts` and this pack
   * shipped the bug anyway.
   *
   * Mirrors `trade-mining`'s `SurveyInstrument`, which affords the same
   * platform view for `measure strike` / `measure dip`: `environment` so
   * the book on the counter affords it, `peers` so a tailor measuring a
   * customer affords it to them too.
   */
  static commandContributions: CommandContributions = {
    self: [],
  };

  static fieldMeta: FieldMeta = {
    entries: { persistent: true, authorable: true },
  };

  /** Everyone who has ever been measured here. */
  public entries: BookEntry[] = [];

  public getEntries(): readonly BookEntry[] {
    return this.entries;
  }

  public setEntries(value: BookEntry[]): void {
    if (!Array.isArray(value)) {
      throw new TypeError('MeasureBook.setEntries: must be an array');
    }
    for (const e of value) {
      if (!e?.subject) {
        throw new RangeError('MeasureBook.setEntries: each entry needs a subject');
      }
      if (!Number.isFinite(e.statureM) || e.statureM <= 0) {
        throw new RangeError(
          `MeasureBook.setEntries: stature ${e.statureM} must be positive`,
        );
      }
      if (!Number.isFinite(e.girthIndex) || e.girthIndex <= 0) {
        throw new RangeError(
          `MeasureBook.setEntries: girth ${e.girthIndex} must be positive`,
        );
      }
    }
    this.entries = value.map((e) => ({ ...e }));
  }

  /** The entry for a subject, or `null`. */
  /**
   * ⚠ It was `entryFor`, and it was renamed when the book became a
   * `ToolMixin` host: the mixin owns `entryFor(kind)` for a capability
   * spec, and two methods of one name on one object is a collision the
   * compiler catches and a reader never would. `figureFor` is also the
   * better name — it is a figure the book holds, not an entry.
   */
  public figureFor(subject: string): BookEntry | null {
    return this.entries.find((e) => e.subject === subject) ?? null;
  }

  /** Write or refresh an entry. One subject, one row. */
  public record(entry: BookEntry): void {
    const rest = this.entries.filter((e) => e.subject !== entry.subject);
    this.setEntries([...rest, entry]);
  }

  /**
   * How far the book's entry has drifted from a body's measurements
   * NOW, as a fraction. `null` when there is no entry.
   *
   * ⚠ Read off the numbers, never off a clock — see the class
   * docstring. A stable body keeps a good entry forever.
   */
  public stalenessFor(subject: string, girthNow: number): number | null {
    const entry = this.figureFor(subject);
    if (!entry || !(entry.girthIndex > 0)) return null;
    return Math.abs(girthNow - entry.girthIndex) / entry.girthIndex;
  }
}
