/**
 * ParLine — one line of a Business's **par manifest**: the level of a
 * category of goods the house means to keep on hand, and the supplier it
 * buys from when short.
 *
 * A value object (the `Position` precedent): plain data plus `fromData`,
 * no `Stuff`, no identity. The manifest lives on the Business because
 * policy is the owner's — the supplier is a business relationship, the
 * level is a decision, and neither is a fact about the room. What is *on
 * hand* against a line is never stored: `EmploymentApi.stockSheetFor`
 * derives it from what the viewer can perceive (the aether is a modem,
 * not a sense organ — a sheet shows what you could see from where you
 * stand).
 *
 * `category` is matched against a **material tag** (a bottle of gin
 * carries the `gin` tag on its interior material; a crate of limes the
 * `lime` tag on the fruit's material) or, for glassware, the glass row's
 * own `category` field. Units: `L` sums bulk litres, `count` counts
 * discrete items, `kg` sums bulk mass.
 */

/** The unit a par level is denominated in. */
export type ParUnit = 'L' | 'count' | 'kg';
export const PAR_UNITS: readonly ParUnit[] = ['L', 'count', 'kg'];

/** The stored / authored shape of a {@link ParLine}. */
export interface ParLineData {
  /** The category key — a material tag, or a glass row's `category`. */
  category: string;
  /** The lowest grade band the house accepts (`''` = any). */
  minGrade?: string;
  /** The level to keep on hand, in `unit`. */
  level: number;
  unit: ParUnit;
  /** The Business (templatePath) this line is bought from (`''` = none). */
  supplier?: string;
}

export class ParLine {
  private constructor(
    public readonly category: string,
    public readonly minGrade: string,
    public readonly level: number,
    public readonly unit: ParUnit,
    public readonly supplier: string,
  ) {}

  /** Coerce a loosely-typed (authored / hydrated) blob into a ParLine. */
  public static fromData(data: Partial<ParLineData>): ParLine {
    const unit = PAR_UNITS.includes(data.unit as ParUnit)
      ? (data.unit as ParUnit)
      : 'count';
    const level = Number(data.level ?? 0);
    return new ParLine(
      String(data.category ?? ''),
      String(data.minGrade ?? ''),
      Number.isFinite(level) && level > 0 ? level : 0,
      unit,
      String(data.supplier ?? ''),
    );
  }

  /** The plain-data round-trip form. */
  public serialize(): ParLineData {
    return {
      category: this.category,
      level: this.level,
      unit: this.unit,
      ...(this.minGrade ? { minGrade: this.minGrade } : {}),
      ...(this.supplier ? { supplier: this.supplier } : {}),
    };
  }
}
