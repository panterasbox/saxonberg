/**
 * Roster — a Business's schedule: who works which Position, and when.
 *
 * A value object holding the ordered {@link RosterAssignment}s and the
 * pure clock-match that decides whether a given assignment is on shift at
 * a decomposed game-time. The match logic is lifted verbatim from what the
 * `shifts` brain read inline today (day-of-week + hour window); moving it
 * here makes the roster — not the brain — the single source of truth for
 * shift timing, and the brain a pure consequence of employment state.
 *
 * The roster carries no live state; the tick evaluates it each cadence and
 * materializes / updates the assignees' {@link Employment} records.
 */

/** One shift window: which weekdays, and the `[startHour, endHour)` span. */
export interface ShiftEntry {
  /** Weekday indices this window covers (0-based, calendar-defined). */
  days: number[];
  /** Half-open hour span `[start, end)` in calendar hours. */
  hours: [number, number];
}

/** One assignment: an assignee holding a Position on a schedule. */
export interface RosterAssignment {
  /** The Position key the assignee holds. */
  positionKey: string;
  /** templatePath of the assigned actor. */
  assignee: string;
  /** The shift windows the assignee works. */
  schedule: ShiftEntry[];
}

/** A decomposed game-time — the fields the shift match consults. */
export interface RosterClock {
  /** Weekday index (0-based). */
  weekday: number;
  /** Hour of day (0–23). */
  hour: number;
}

export class Roster {
  private constructor(
    private readonly assignments: readonly RosterAssignment[],
  ) {}

  /** Build a Roster from already-typed assignments. */
  public static of(assignments: readonly RosterAssignment[]): Roster {
    return new Roster(assignments.map(coerceAssignment));
  }

  /** Coerce a loosely-typed (seed / hydrated) list into a Roster. */
  public static fromData(raw: unknown): Roster {
    const list = Array.isArray(raw) ? raw : [];
    return new Roster(list.map(coerceAssignment));
  }

  /** The assignments in list order. */
  public getAssignments(): readonly RosterAssignment[] {
    return this.assignments;
  }

  /**
   * Whether `assignment` is on shift at the decomposed clock `date` — the
   * pure day/hour-window match. On-shift iff some window covers both the
   * weekday and the hour (`[start, end)`).
   */
  public evaluate(
    assignment: RosterAssignment,
    date: RosterClock,
  ): 'on-shift' | 'off-shift' {
    const match = assignment.schedule.some(
      (e) =>
        Array.isArray(e.days) &&
        e.days.includes(date.weekday) &&
        Array.isArray(e.hours) &&
        date.hour >= e.hours[0] &&
        date.hour < e.hours[1],
    );
    return match ? 'on-shift' : 'off-shift';
  }
}

/** Normalize a loosely-typed assignment blob. */
function coerceAssignment(raw: unknown): RosterAssignment {
  const r = (raw ?? {}) as Partial<RosterAssignment>;
  const schedule = Array.isArray(r.schedule) ? r.schedule : [];
  return {
    positionKey: String(r.positionKey ?? ''),
    assignee: String(r.assignee ?? ''),
    schedule: schedule.map((e) => {
      const entry = (e ?? {}) as Partial<ShiftEntry>;
      const hours = Array.isArray(entry.hours) ? entry.hours : [0, 0];
      return {
        days: Array.isArray(entry.days) ? entry.days.map(Number) : [],
        hours: [Number(hours[0] ?? 0), Number(hours[1] ?? 0)] as [
          number,
          number,
        ],
      };
    }),
  };
}
