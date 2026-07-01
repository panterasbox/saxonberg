/**
 * Employment — one actor's relationship to one Business.
 *
 * A value object (the `Money` / `Position` precedent): plain data plus
 * `serialize` / `fromData`, stored on the actor's {@link EmployedMixin}.
 * It names the `businessPath` and the `positionKey` held there, the current
 * shift `status`, when the actor was `hiredAt`, and — while on shift — the
 * game-time instant the current shift began (`onShiftSince`, the wage
 * settlement's clock).
 *
 * Employments are **materialized from the roster** (the roster is the
 * single source of truth for who works where and when); the record is the
 * live cache of that assignment's evolving shift state.
 *
 * The value object is immutable — mutators return a new instance.
 */

/** The lifecycle states an {@link Employment} moves through. */
export type EmploymentStatus =
  | 'employed'
  | 'on-shift'
  | 'off-shift'
  | 'quit'
  | 'fired';

/** The validation array for {@link EmploymentStatus}. */
export const EMPLOYMENT_STATUSES: readonly EmploymentStatus[] = [
  'employed',
  'on-shift',
  'off-shift',
  'quit',
  'fired',
] as const;

/** The stored / wire shape of an {@link Employment}. */
export interface EmploymentData {
  /** templatePath of the employing Business. */
  businessPath: string;
  /** The Position key held at that Business. */
  positionKey: string;
  /** Current shift-lifecycle status. */
  status: EmploymentStatus;
  /** Game-time instant the actor was hired (raw clock value). */
  hiredAt: number;
  /** Game-time instant the current shift began, or null when off shift. */
  onShiftSince: number | null;
}

export class Employment {
  private constructor(
    /** templatePath of the employing Business. */
    public readonly businessPath: string,
    /** The Position key held at that Business. */
    public readonly positionKey: string,
    /** Current shift-lifecycle status. */
    public readonly status: EmploymentStatus,
    /** Game-time instant the actor was hired. */
    public readonly hiredAt: number,
    /** Game-time instant the current shift began, or null. */
    public readonly onShiftSince: number | null,
  ) {}

  /** Build an Employment from an already-typed descriptor. */
  public static of(data: EmploymentData): Employment {
    return new Employment(
      data.businessPath,
      data.positionKey,
      data.status,
      data.hiredAt,
      data.onShiftSince,
    );
  }

  /** Coerce a loosely-typed (hydrated) blob into an Employment. */
  public static fromData(data: Partial<EmploymentData>): Employment {
    const status = data.status ?? 'employed';
    return new Employment(
      String(data.businessPath ?? ''),
      String(data.positionKey ?? ''),
      EMPLOYMENT_STATUSES.includes(status as EmploymentStatus)
        ? (status as EmploymentStatus)
        : 'employed',
      Number(data.hiredAt ?? 0),
      data.onShiftSince == null ? null : Number(data.onShiftSince),
    );
  }

  /** True iff the holder is currently on shift. */
  public isOnShift(): boolean {
    return this.status === 'on-shift';
  }

  /**
   * A copy with a new `status` and `onShiftSince`. Callers pass the
   * `onShiftSince` the transition implies (stamped on off→on, cleared on
   * on→off) — the value object stays dumb about clock semantics.
   */
  public withStatus(
    status: EmploymentStatus,
    onShiftSince: number | null,
  ): Employment {
    return new Employment(
      this.businessPath,
      this.positionKey,
      status,
      this.hiredAt,
      onShiftSince,
    );
  }

  /** The plain-data round-trip form. */
  public serialize(): EmploymentData {
    return {
      businessPath: this.businessPath,
      positionKey: this.positionKey,
      status: this.status,
      hiredAt: this.hiredAt,
      onShiftSince: this.onShiftSince,
    };
  }
}
