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
import { CompetenceBand } from '../advancement/CompetenceBand';
import type { CompetenceBandName } from '../advancement/CompetenceBand';

/**
 * ⛔ **The closed vocabulary of what a seat may ask of an applicant, and
 * it is closed on purpose.**
 *
 * A hiring criterion is a judgement about a PERSON, so lens 6's
 * governance limb applies: name the criterion, and name the appeal.
 * Both of these are things a player can go and DO — complete gigs,
 * practise a discipline — which is what makes the refusal honest rather
 * than a wall. Nothing here can read species, lineage, trait, renown or
 * wealth, and `fromData` THROWS on an unknown key rather than silently
 * coercing it away, so a row cannot invent a third criterion quietly.
 */
export const POSITION_REQUIREMENT_KEYS = [
  'gigs',
  'discipline',
  'band',
] as const;
export type PositionRequirementKey = (typeof POSITION_REQUIREMENT_KEYS)[number];

/** What a seat asks of an applicant. Every field optional; all must pass. */
export interface PositionRequirementData {
  /** Completed (settled) gigs the applicant must have to their name. */
  gigs?: number;
  /** A Discipline key the applicant must have competence in. */
  discipline?: string;
  /** The band `discipline` must be held at or above. Default: the floor. */
  band?: CompetenceBandName;
}

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
   * ⭐ The **disciplines this seat serves an `order` in**: its holder,
   * while on shift and standing somewhere the organization operates, is
   * who an `order` for one of these is served by. The bartender pours,
   * the cook cooks, the smith forges.
   *
   * ⚠ **A list, not a flag, and the list is what makes it correct.** It
   * shipped as `fulfills: boolean` and that was under-powered in a way a
   * live venue exposes at once: the Hearthworks runs a smith and a cook
   * off ONE business whose `operatingLocations` names BOTH the smithy
   * and the cookhouse, so a boolean makes the smith a legal maker for a
   * stew. Only where the `shifts` brain happens to park her prevented
   * it — an accident of content, not a rule. Nothing downstream catches
   * it either: the recipe's discipline is *credited*, never *gated*, so
   * she would have cooked it and been credited with `cooking`.
   *
   * ⚠ Not derivable, which is why it is authored. `order` serves both a
   * customer at a bar and a production hand on a floor, and the outfits'
   * own rows are what say which hands do the work: the brewing,
   * crowsfoot and vintner hands fulfil; bottling, hollis, veshko, farm
   * and pantry's do not. No other field separates them —
   * `serverPositionKeys` is *who attends the counter*, a different
   * question, and `noun` / `wageRate` / `purchases` say nothing about it.
   *
   * ⭐ There is no "serves anything" form, and there does not need to
   * be: **every recipe in the realm authors a discipline** — 97 of 97,
   * thirteen packs, ten disciplines. A seat that fulfils anything would
   * be a seat with no trade, and nothing in the realm is that.
   *
   * Absent or empty = this seat serves no orders (what `confers: []`
   * used to say on forty of the forty-nine shipped seats).
   *
   * ⚠⚠ This says who **may** serve, never who **does** when several
   * qualify. Two cooks in one kitchen is an arbitration question — a
   * queue, or first-free — and it belongs to the crew substrate
   * (`docs/slates/builds/crew-slate.md`), not to this field.
   */
  fulfills?: readonly string[];
  /**
   * ⭐ **How many places this seat has.** Absent — the shipped default —
   * means *no opening is ever advertised*: exactly today's behaviour for
   * every seat that does not author it. A house with `headcount: 2` on a
   * seat one person holds is advertising one place, derived, so nothing
   * decrements and a `quit` reopens it by arithmetic.
   */
  headcount?: number;
  /**
   * What the seat asks of an applicant. See
   * {@link POSITION_REQUIREMENT_KEYS} — the vocabulary is closed, and
   * every criterion in it is something a player can go and do.
   */
  requires?: PositionRequirementData;
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
    /** The disciplines the holder serves an `order` in, on shift. */
    public readonly fulfills: readonly string[] = [],
    /** How many places the seat has, or undefined (= advertises none). */
    public readonly headcount?: number,
    /** What the seat asks of an applicant, or undefined (= nothing). */
    public readonly requires?: PositionRequirementData,
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
      Position.coerceFulfills(data.fulfills),
      Position.coerceHeadcount(data.headcount),
      Position.coerceRequires(data.requires),
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
      Position.coerceFulfills(data.fulfills),
      Position.coerceHeadcount(data.headcount),
      Position.coerceRequires(data.requires),
      typeof data.noun === 'string' && data.noun.length > 0
        ? data.noun
        : undefined,
    );
  }

  /**
   * The disciplines a seat serves, coerced. ⚠ **Throws on a bare
   * boolean** rather than reading it as anything: `fulfills: true` was
   * the shipped spelling for two commits, and silently reading it as
   * "serves nothing" would turn a bartender into scenery with no
   * complaint from anywhere.
   */
  private static coerceFulfills(value: unknown): readonly string[] {
    if (value == null) return [];
    if (typeof value === 'boolean') {
      throw new Error(
        `Position.fulfills: expected a list of disciplines, got the ` +
          `boolean '${String(value)}'. A seat names WHICH orders it ` +
          `serves — \`fulfills: [cooking]\` — because a venue can run ` +
          `two trades off one business.`,
      );
    }
    if (!Array.isArray(value)) {
      throw new Error(
        `Position.fulfills: expected a list of disciplines, got ${typeof value}`,
      );
    }
    return value.map(String).filter((d) => d.length > 0);
  }

  /** An integer ≥ 1, or undefined. Anything else is not a headcount. */
  private static coerceHeadcount(value: unknown): number | undefined {
    if (value == null) return undefined;
    const n = Number(value);
    return Number.isInteger(n) && n >= 1 ? n : undefined;
  }

  /**
   * ⛔ Coerce a `requires` blob, **throwing** on a key outside the closed
   * vocabulary or a band outside the ladder.
   *
   * ⚠ A throw, not a drop. Silently coercing an unknown criterion away
   * would turn a content typo — `requires: { renown: 3 }`, or
   * `band: 'skilled'` — into a seat that advertises a bar and then
   * enforces nothing, which is the worst of both: the sign lies and the
   * refusal never fires. `lint:openings` catches it before boot does.
   */
  private static coerceRequires(
    value: unknown,
  ): PositionRequirementData | undefined {
    if (value == null) return undefined;
    if (typeof value !== 'object') {
      throw new Error(
        `Position.requires: expected an object, got ${typeof value}`,
      );
    }
    const raw = value as Record<string, unknown>;
    for (const key of Object.keys(raw)) {
      if (!(POSITION_REQUIREMENT_KEYS as readonly string[]).includes(key)) {
        throw new Error(
          `Position.requires: '${key}' is not a hiring criterion ` +
            `(expected one of ${POSITION_REQUIREMENT_KEYS.join(', ')}). ` +
            `A seat may ask for work done or competence held — never who ` +
            `somebody is.`,
        );
      }
    }
    const out: PositionRequirementData = {};
    if (raw.gigs != null) {
      const n = Number(raw.gigs);
      if (!Number.isInteger(n) || n < 0) {
        throw new Error(
          `Position.requires.gigs: expected a whole number, got '${String(raw.gigs)}'`,
        );
      }
      if (n > 0) out.gigs = n;
    }
    if (raw.discipline != null) {
      const d = String(raw.discipline).trim();
      if (d.length > 0) out.discipline = d;
    }
    if (raw.band != null) {
      if (!CompetenceBand.isBand(raw.band)) {
        throw new Error(
          `Position.requires.band: '${String(raw.band)}' is not a competence band`,
        );
      }
      out.band = raw.band;
    }
    if (out.band && !out.discipline) {
      throw new Error(
        `Position.requires.band: a band with no discipline asks nothing — ` +
          `name the discipline it is held in`,
      );
    }
    return Object.keys(out).length === 0 ? undefined : out;
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
      ...(this.fulfills.length > 0 ? { fulfills: [...this.fulfills] } : {}),
      ...(this.headcount != null ? { headcount: this.headcount } : {}),
      ...(this.requires ? { requires: { ...this.requires } } : {}),
      ...(this.noun ? { noun: this.noun } : {}),
    };
  }
}
