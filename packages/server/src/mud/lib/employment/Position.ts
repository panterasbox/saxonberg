/**
 * Position — a job's terms: what it pays and what it lets you do.
 *
 * A value object (the `Money` / `Charge` / `Credential` precedent): plain
 * data plus `serialize` / `fromData`, no `Stuff`, no identity. A Business
 * authors its `positions`; an `Employment` references one by `key`.
 *
 * ⭐ **What a seat GRANTS is data on the seat, never a marker mixin.**
 * `purchases` says the holder may spend the house's money; `fulfills`
 * says the holder is who an `order` here is served by. Both are the
 * position's, both are read off the shift, and neither composes anything
 * on anybody — an Avatar and an NPC answer identically. (Until the
 * trades-and-labor build this was a `confers: ['MakerMixin']` list that
 * folded a JOB into the AUGMENT walk; augment gating is for physical
 * implants and innate gifts, not for a means test, and the marker it
 * named was one no player could ever compose.)
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
  /**
   * ⭐ **What ONE holder is called** — `'bartender'`, `'clerk'`,
   * `'baker'`. Optional; absent means the job contributes no handle.
   *
   * ⚠ It is a second word because `label` **cannot** supply it. Every
   * shipped label is a gerund or a phrase (*"tending bar"*, *"on the
   * road"*, *"sitting as Magistrate of Terminus"*), and there is no
   * honest gerund-to-noun transform — *"tending bar"* does not contain
   * *"bartender"*. The `key` is no better: it is an identifier, and
   * half of them are firm names (`vionne`, `hollis`, `goodkin`), so a
   * holder of `vionne` is not *"a vionne"*.
   *
   * So the requirements' *"drop an NPC into a bakery and they are a
   * baker — nobody typed that"* is very nearly true: **the bakery's
   * author typed it once**, on the position, and every holder of that
   * job gets it for free forever and loses it the day they are
   * dismissed. That is the staleness fix; a retyped description is what
   * leaves a sacked weaver reading *"a weaver"*.
   */
  noun?: string;
  /** Wage in banking minor units per game-hour on shift. */
  wageRate: number;
  /**
   * ⭐ A **fulfilling** position: its holder, while on shift and standing
   * somewhere the organization operates, is who an `order` at this venue
   * is served by. The bartender behind the bar, the cook at the hearth,
   * the goods-yard hand on the floor that actually makes the thing.
   *
   * ⚠ Not derivable, which is why it is authored. `order` serves both a
   * customer at a bar and a production hand on a floor, and the outfits'
   * own rows are what say which hands do the work: the brewing,
   * crowsfoot and vintner hands fulfil; bottling, hollis, veshko, farm
   * and pantry's do not. No other field separates them —
   * `serverPositionKeys` is *who attends the counter*, a different
   * question, and `noun` / `wageRate` / `purchases` say nothing about it.
   *
   * Absent = false: a seat that does not fulfil (what `confers: []` used
   * to say on forty of the forty-nine shipped seats).
   */
  fulfills?: boolean;
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
    /** The compensation term, or undefined (= the time default). */
    public readonly compensation?: CompensationData,
    /** The position this one reports to, or undefined. */
    public readonly reportsTo?: string,
    /** Whether the holder buys for the organization (default false). */
    public readonly purchases: boolean = false,
    /** Whether the holder serves an `order` here on shift (default false). */
    public readonly fulfills: boolean = false,
    /** What one holder is CALLED, or undefined. See {@link PositionData.noun}. */
    public readonly noun?: string,
  ) {}

  /** Build a Position from an already-typed descriptor. */
  public static of(data: PositionData): Position {
    return new Position(
      data.key,
      data.label,
      data.wageRate,
      data.compensation,
      data.reportsTo,
      data.purchases === true,
      data.fulfills === true,
      data.noun,
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
      data.fulfills === true,
      typeof data.noun === 'string' && data.noun.length > 0
        ? data.noun
        : undefined,
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
      ...(this.compensation ? { compensation: { ...this.compensation } } : {}),
      ...(this.reportsTo ? { reportsTo: this.reportsTo } : {}),
      ...(this.purchases ? { purchases: true } : {}),
      ...(this.fulfills ? { fulfills: true } : {}),
      ...(this.noun ? { noun: this.noun } : {}),
    };
  }
}
