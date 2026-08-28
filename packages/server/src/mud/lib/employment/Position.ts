/**
 * Position — a job's terms: what it pays and what it lets you do.
 *
 * A value object (the `Money` / `Charge` / `Credential` precedent): plain
 * data plus `serialize` / `fromData`, no `Stuff`, no identity. A Business
 * authors its `positions`; an `Employment` references one by `key`. The
 * `confers` list is the knowing→doing seam — the mixin names an on-shift
 * holder's Position grants via the augment substrate (v1:
 * `['MakerMixin']` for the bartender, so an on-shift bartender becomes a
 * valid `order` fulfiller and an off-shift one stops being one).
 *
 * `wageRate` is denominated in banking **minor units per game-hour**; the
 * shift-end settlement multiplies it by the shift's game-hour span.
 *
 * `reportsTo` is the chart's vertical edge — the key of the position this
 * one answers to *within the same organization*. "The Press Secretary
 * reports to the Communications Director" stops being prose and becomes
 * something a read can walk. Optional and with no existing consumer, so
 * every shipped Position is unchanged.
 */

import type { CompBasis, CompensationData } from './Compensation';
import { COMP_BASES } from './Compensation';

/** The stored / wire shape of a {@link Position}. */
export interface PositionData {
  /** Stable key an Employment references (e.g. `'bartender'`). */
  key: string;
  /** Human label for the role (e.g. `'tending bar'`). */
  label: string;
  /** Wage in banking minor units per game-hour on shift. */
  wageRate: number;
  /** Mixin names this Position confers while its holder is on shift. */
  confers: readonly string[];
  /**
   * The compensation basis (additive; absent = the shipped time-wage —
   * `wageRate` behaves exactly as before). See {@link Compensation}.
   */
  compensation?: CompensationData;
  /**
   * The key of the position this one reports to, in the same
   * organization. Absent = reports to nobody (the top of the chart, or a
   * flat organization).
   */
  reportsTo?: string;
  /**
   * ⭐ A **purchasing** position: its holder may put the organization's
   * operating account into their own wallet (`wallet use house`) and buy
   * *as the business* — the purchase settles from that account and the
   * chattel is stamped to the organization. A data field, never a marker
   * mixin: authority is the position's. Absent = false.
   */
  purchases?: boolean;
}

export class Position {
  private constructor(
    /** Stable key an Employment references. */
    public readonly key: string,
    /** Human label for the role. */
    public readonly label: string,
    /** Wage in banking minor units per game-hour on shift. */
    public readonly wageRate: number,
    /** Mixin names conferred while the holder is on shift. */
    public readonly confers: readonly string[],
    /** The compensation term, or undefined (= the time default). */
    public readonly compensation?: CompensationData,
    /** The position this one reports to, or undefined. */
    public readonly reportsTo?: string,
    /** Whether the holder buys for the organization (default false). */
    public readonly purchases: boolean = false,
  ) {}

  /** Build a Position from an already-typed descriptor. */
  public static of(data: PositionData): Position {
    return new Position(
      data.key,
      data.label,
      data.wageRate,
      [...data.confers],
      data.compensation,
      data.reportsTo,
      data.purchases === true,
    );
  }

  /**
   * Coerce a loosely-typed (seed / hydrated) blob into a Position. An
   * absent `compensation` stays absent (never materialized to `{basis:
   * 'time'}`), so `serialize` round-trips legacy blobs byte-identically.
   */
  public static fromData(data: Partial<PositionData>): Position {
    return new Position(
      String(data.key ?? ''),
      String(data.label ?? ''),
      Number(data.wageRate ?? 0),
      Array.isArray(data.confers) ? data.confers.map(String) : [],
      data.compensation && typeof data.compensation === 'object'
        ? {
            basis: COMP_BASES.includes(data.compensation.basis as CompBasis)
              ? (data.compensation.basis as CompBasis)
              : 'time',
            ...(data.compensation.rate != null
              ? { rate: Number(data.compensation.rate) }
              : {}),
            ...(data.compensation.share != null
              ? { share: Number(data.compensation.share) }
              : {}),
          }
        : undefined,
      typeof data.reportsTo === 'string' && data.reportsTo.length > 0
        ? data.reportsTo
        : undefined,
      data.purchases === true,
    );
  }

  /** The pay basis — absent `compensation` reads as the shipped time-wage. */
  public basis(): CompBasis {
    return this.compensation?.basis ?? 'time';
  }

  /** The plain-data round-trip form. */
  public serialize(): PositionData {
    return {
      key: this.key,
      label: this.label,
      wageRate: this.wageRate,
      confers: [...this.confers],
      ...(this.compensation ? { compensation: { ...this.compensation } } : {}),
      ...(this.reportsTo ? { reportsTo: this.reportsTo } : {}),
      ...(this.purchases ? { purchases: true } : {}),
    };
  }
}
