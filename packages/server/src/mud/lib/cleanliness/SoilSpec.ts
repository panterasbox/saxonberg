/**
 * SoilSpecs — **what making or taking a thing dirties**, as row data
 * (cleanliness D6).
 *
 * The one shape two rows share: a `Recipe`'s `soils:` (rendering tallow
 * greases the hands and the apron) and a species tap's `soils:` (milking a
 * cow puts manure on the hands and milk on the apron; tapping a maple puts
 * nothing anywhere). The deposit comes from the ROW, never from the code
 * that runs the act — so a pack's new recipe or a new animal soils with no
 * engine change.
 *
 * ```yaml
 * soils:
 *   - { kind: grease, amount: 0.3, where: hands }
 *   - { kind: grease, amount: 0.2, where: apron }
 * ```
 *
 * `where` is one of {@link SOIL_WHERES}: the maker's hands, what covers the
 * torso (the apron — or the shirt when no apron is worn), the feet, or the
 * floor of the room the act happened in.
 *
 * ⚠ A typo fails at READ — the `volatiles` rule: an ignored `amout:` would
 * ship a butcher who never gets bloody, and nothing about that failure is
 * visible.
 *
 * A value object built by `new SoilSpecs(raw, owner)`; it validates in the
 * constructor and has no statics (`lint:lib-statics`).
 */

/** Where an act's dirt lands — the four sites a row may name. */
export const SOIL_WHERES = ['hands', 'apron', 'feet', 'floor'] as const;
export type SoilWhere = (typeof SOIL_WHERES)[number];

/** One deposit an act makes. */
export interface SoilSpec {
  /** A DirtKind key (`grease`, `manure`). */
  kind: string;
  /** The load deposited — dimensionless; `0.1` marks, `0.4` soils. */
  amount: number;
  where: SoilWhere;
}

export class SoilSpecs {
  public readonly entries: readonly SoilSpec[];

  /**
   * @param raw   the authored `soils:` value (absent → none)
   * @param owner names the row in an error (`Recipe 'render-tallow'`)
   */
  constructor(raw: unknown, owner: string) {
    if (raw === undefined || raw === null) {
      this.entries = [];
      return;
    }
    if (!Array.isArray(raw)) {
      throw new Error(
        `${owner}: 'soils' must be a list of { kind, amount, where }`,
      );
    }
    this.entries = raw.map((entry, i) => {
      const e = (entry ?? {}) as Record<string, unknown>;
      if (typeof e.kind !== 'string' || e.kind.length === 0) {
        throw new Error(`${owner}: soils[${i}] needs a 'kind'`);
      }
      if (typeof e.amount !== 'number' || !(e.amount > 0)) {
        throw new Error(
          `${owner}: soils[${i}] ('${e.kind}') needs a positive 'amount'`,
        );
      }
      if (!(SOIL_WHERES as readonly string[]).includes(String(e.where))) {
        throw new Error(
          `${owner}: soils[${i}] ('${e.kind}') 'where' must be one of ` +
            SOIL_WHERES.join(' · '),
        );
      }
      const extra = Object.keys(e).filter(
        (k) => k !== 'kind' && k !== 'amount' && k !== 'where',
      );
      if (extra.length > 0) {
        throw new Error(
          `${owner}: soils[${i}] has unknown key(s) ${extra.join(', ')} — ` +
            `a misspelt key is a deposit that quietly never lands`,
        );
      }
      return { kind: e.kind, amount: e.amount, where: e.where as SoilWhere };
    });
  }
}
