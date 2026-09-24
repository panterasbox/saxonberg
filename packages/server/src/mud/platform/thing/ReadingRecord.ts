/**
 * ReadingRecord — ⭐⭐ **somebody else's reading, and you can check it.**
 *
 * A carried Thing, not a document and not a belief. That distinction is
 * the whole of D14 and it is worth stating plainly, because this build
 * ships TWO kinds of record and they answer different questions:
 *
 * | | what it is | stamped? |
 * |---|---|---|
 * | **my notes** | a per-viewer `DISCOVERY` belief | ⚠ no — the reading is stored and the BAND is not, so a prospector who improves re-reads their old field book at their new resolution |
 * | **this** | a Thing you can hand over, sell, lose or leave on a bench | ⭐ yes — who took it, with what, and how well they read |
 *
 * The second one has to be stamped, because the question it answers is
 * *should I trust this piece of paper* — and that is a question about a
 * person and a moment, not about the reader holding it.
 *
 * ⚠ **No new collection and no `DocumentKinds` edit.** It persists the
 * way any carried Thing does: through the owner's snapshot, or the room
 * overlay when it is left on a bench.
 *
 * ⚠ Band names only. No number about a person, ever — the honesty
 * firewall is *no quantity without a referent*, and a competence band's
 * referent is a Discipline while a score's referent is nothing.
 */

import Thing from '../../lib/stuff/Thing';
import { DetailedMixin } from '../../lib/description/Detailed';
import { Mml } from '../../api/mml';
import type { FieldMeta } from '../../lib/mixin';

const ReadingRecordBase = DetailedMixin(Thing);

export default class ReadingRecord extends ReadingRecordBase {
  static override fieldMeta: FieldMeta = {
    ...ReadingRecordBase.fieldMeta,
    channel: { persistent: true },
    subjectLabel: { persistent: true },
    reading: { persistent: true },
    // ⭐ Level-1 spoiler: the NUMBER is what the bench earns. A wiki page
    // should not hand out the figure the scale is for.
    value: { persistent: true, spoiler: 1, spoilerName: 0 },
    unit: { persistent: true },
    band: { persistent: true },
    takenBy: { persistent: true },
    takenByLabel: { persistent: true },
    takenWith: { persistent: true, ref: 'identity' },
    takenWithGrade: { persistent: true },
    takenOn: { persistent: true },
    sampledAt: { persistent: true, ref: 'identity' },
    sampledBy: { persistent: true },
    sampledOn: { persistent: true },
    tell: { persistent: true },
  };

  /** Which channel was read — `grade`, `chemistry`. */
  public channel: string = '';
  /** What was read, as it read at the time. */
  public subjectLabel: string = '';
  /** The reading in words, as the assayer would say it. */
  public reading: string = '';
  /** The figure, when the channel has one. */
  public value: number | null = null;
  /** The figure's unit. */
  public unit: string = '';
  /** How well the taker read — a BAND, never a number. */
  public band: string = '';
  /** ⚠ `getIdentityPath()`, never the lineage stamp. */
  public takenBy: string = '';
  /** What to call the taker in the prose. */
  public takenByLabel: string = '';
  /** The bench or kit, by template path. */
  public takenWith: string = '';
  /** The instrument's grade band — half of what the figure is worth. */
  public takenWithGrade: string = '';
  /** Game ms when the reading was taken. */
  public takenOn: number = 0;
  /** ⭐ Copied off the SAMPLE's stamp, and never resolved. */
  public sampledAt: string = '';
  public sampledBy: string = '';
  public sampledOn: number = 0;
  /**
   * ⭐ The assayer's remark about the SAMPLE rather than the reading —
   * *"this has been three hours in the carrying and it was warm; what it
   * says now is about the journey, not the batch."* `''` when there is
   * nothing to say, which is most of the time.
   */
  public tell: string | null = null;

  public getChannel(): string {
    return this.channel;
  }

  public getReading(): string {
    return this.reading;
  }

  public getValue(): number | null {
    return this.value;
  }

  public getBand(): string {
    return this.band;
  }

  public getTakenBy(): string {
    return this.takenBy;
  }

  public getSampledAt(): string {
    return this.sampledAt;
  }

  public getTell(): string | null {
    return this.tell;
  }

  /**
   * Fill the paper. Called once, at the bench, by the completion that
   * mints it — a report is written and then never edited.
   */
  public inscribe(fields: Partial<ReadingRecordFields>): void {
    Object.assign(this, fields);
  }

  /**
   * ⭐⭐ **`look` at a report and it reads like a report.** Who took it,
   * with what, how well, what it says, and where the sample came from —
   * which is the whole of *another player can check it*.
   */
  public override getLongDescription(): string {
    const lines: string[] = [];
    const who = this.takenByLabel || 'somebody';
    const how = this.band ? `, a ${this.band} hand` : '';
    const withWhat = this.takenWith ? ` at ${nameOf(this.takenWith)}` : '';
    lines.push(`Assayed by ${who}${withWhat}${how}.`);
    lines.push(`${this.channel}: ${this.reading}`);
    if (this.sampledAt !== '') {
      const by = this.sampledBy === this.takenBy ? 'the same hand' : 'another';
      lines.push(
        `Sample taken at ${nameOf(this.sampledAt)}, by ${by}.`,
      );
    }
    if (this.tell) lines.push(this.tell);
    return lines.join('\n');
  }

  /** The presentation MML the card and `look` both render. */
  public describeForCard(): Mml {
    return Mml.fromMarkup(Mml.escape(this.getLongDescription()));
  }
}

/** The writable face, so the completion can fill it in one call. */
export interface ReadingRecordFields {
  channel: string;
  subjectLabel: string;
  reading: string;
  value: number | null;
  unit: string;
  band: string;
  takenBy: string;
  takenByLabel: string;
  takenWith: string;
  takenWithGrade: string;
  takenOn: number;
  sampledAt: string;
  sampledBy: string;
  sampledOn: number;
  tell: string | null;
}

/**
 * ⚠ The last segment of a path, humanised. ⭐⭐ **The path is NEVER
 * resolved** — a report about a face that has since been worked out must
 * still read, which is the whole reason provenance is a string.
 */
function nameOf(path: string): string {
  const leaf = path.split('/').filter(Boolean).pop() ?? path;
  return leaf
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .toLowerCase();
}
