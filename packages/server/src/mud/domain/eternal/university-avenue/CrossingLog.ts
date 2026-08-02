/**
 * CrossingLog — a worn clipboard that tallies every soul walked across
 * the crossing. A dumb store: it holds a list of marks and accepts a new
 * one when someone writes to it (the `tally` verb). It subscribes to
 * nothing — Gus is the agent who watches for crossers and marks it by
 * hand; no Gus, no mark.
 *
 * Composition: `Detailed` (the page of marks, the metal clip) over a
 * `Thing` (hardboard + clip + paper, via `Tangible`). It carries the
 * `tally` verb from its inventory bucket (`commandContributions`).
 *
 * ─────────────────────────────────────────────────────────────────────
 * THE DATA MODEL — `when`, NEVER `who`. LOUD, ON PURPOSE.
 * ─────────────────────────────────────────────────────────────────────
 * Each mark is a single timepiece reading (a minute-of-day number) OR
 * `null` (an untimed tick). There is NO identity, EVER. When the log is
 * marked, the crosser's identity is *available* and the log DELIBERATELY
 * DISCARDS it, keeping only the time. This is the implementation, not a
 * missing feature: it records WHEN, never WHO. Do not "improve" this by
 * storing a player id — that quietly kills the whole point (the record of
 * everyone, kept by the man who remembers no one).
 */

import Thing from '../../../lib/stuff/Thing';
import { DetailedMixin } from '../../../lib/description/Detailed';
import { Time } from '../../../lib/time/Time';
import type { CommandContributions } from '../../../api/command';
import type { FieldMeta } from '../../../lib/mixin';

const CrossingLogBase = DetailedMixin(Thing);

/** How many recent marks the long description renders in its tail. */
const TAIL_LENGTH = 8;

export default class CrossingLog extends CrossingLogBase {
  /**
   * `tally` lights up only where the log is carried — the verb is carried
   * by the object, per the object-afforded-verb law.
   */
  static commandContributions: CommandContributions = {
    self: [],
    inventory: ['domain/eternal/university-avenue/cmd/tally.yaml'],
    environment: [],
    peers: [],
  };

  /**
   * The permanent record: one entry per inbound crossing. A number is a
   * minute-of-day reading (from a timepiece); `null` is an untimed tick
   * (no readable timepiece was in the marker's sight). **Never who —
   * only when.** See the loud class comment.
   *
   * @authorable
   */
  public marks: Array<number | null> = [];

  /**
   * Souls seen across before this record began — the pre-history count
   * folded into the total so a freshly-seeded log already reads "1,247
   * souls seen across". The live `marks` accumulate on top of it.
   *
   * @authorable
   */
  public startingCount = 0;

  static fieldMeta: FieldMeta = {
    marks: { persistent: true },
    startingCount: { persistent: true },
  };

  /**
   * Append one mark. `reading` is a minute-of-day number from a
   * timepiece, or `null` for a bare untimed tick. **Identity is never a
   * parameter and is never stored** — the log records when, never who.
   */
  public addMark(reading: number | null): void {
    this.marks.push(reading);
  }

  /** The marks recorded so far (read-only view). */
  public getMarks(): ReadonlyArray<number | null> {
    return this.marks;
  }

  /** Total souls seen across: the seeded pre-history plus live marks. */
  public getTotal(): number {
    return this.startingCount + this.marks.length;
  }

  /**
   * Dynamic long description — recomputed each look (`getMarkupLong`
   * calls `getLong` afresh): the running total plus a tail of the most
   * recent marks (timed marks in Gus-time, untimed ones as a bare tick).
   * Your own mark is fresh at the bottom, exactly as anonymous as you
   * were to him.
   */
  override getLong(): string {
    const base = super.getLong();
    const total = this.getTotal().toLocaleString('en-US');
    const tail = this.marks.slice(-TAIL_LENGTH);
    if (tail.length === 0) {
      return `${base} ${total} souls seen across; the page below is blank.`;
    }
    const rendered = tail
      .map((m) => (m === null ? '—' : Time.ofMinutes(m).format()))
      .join(', ');
    return `${base} ${total} souls seen across. The recent tail reads: ${rendered}.`;
  }
}
