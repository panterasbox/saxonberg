/**
 * Compensation — a Position's pay basis, as data (the arrangement schema:
 * every business model is authored as terms on the arrangement, never a
 * new subsystem). Three bases ship; the fourth (residual) is not a clause
 * at all — it is ownership, the draw (`BankingApi.payDraw`):
 *
 *   - **time** — pay for holding a maintain clause (the shipped wage:
 *     `wageRate × shift-hours` at the on→off boundary). The default
 *     reading of a Position with no `compensation` term — byte-identical
 *     behavior for every existing seed.
 *   - **per-settlement** — pay per attributed achieve settlement
 *     (piece-rate; the miner's basis — the worker bears demand risk).
 *   - **share-of-flow** — a conserved split leg at the moment a flow
 *     moves (commission/royalty — the consignment split, now nameable on
 *     an employment arrangement).
 *
 * A value object (the `Position` precedent): plain data + validation, no
 * Stuff.
 */

/** The compensation-basis vocabulary. */
export const COMP_BASES = ["time", "per-settlement", "share-of-flow"] as const;

export type CompBasis = (typeof COMP_BASES)[number];

/** The stored / wire shape of a compensation term. */
export interface CompensationData {
  basis: CompBasis;
  /** Minor units — per game-hour (time) or per settlement (piece-rate). */
  rate?: number;
  /** Fraction of the flow (share-of-flow), exclusive 0..1. */
  share?: number;
}

export class Compensation {
  private constructor(
    public readonly basis: CompBasis,
    public readonly rate: number,
    public readonly share: number,
  ) {}

  /** Build from a typed descriptor, enforcing the per-basis invariants. */
  public static of(data: CompensationData): Compensation {
    if (!COMP_BASES.includes(data.basis)) {
      throw new Error(`Compensation: unknown basis '${String(data.basis)}'`);
    }
    const rate = Number(data.rate ?? 0);
    const share = Number(data.share ?? 0);
    if (data.basis === "per-settlement" && !(rate > 0)) {
      throw new Error("Compensation: per-settlement requires rate > 0");
    }
    if (data.basis === "share-of-flow" && !(share > 0 && share < 1)) {
      throw new Error("Compensation: share-of-flow requires 0 < share < 1");
    }
    return new Compensation(data.basis, rate, share);
  }

  /** Coerce a loosely-typed (seed / hydrated) blob; absent → time. */
  public static fromData(data?: Partial<CompensationData>): Compensation {
    if (!data) return new Compensation("time", 0, 0);
    const basis = COMP_BASES.includes(data.basis as CompBasis)
      ? (data.basis as CompBasis)
      : "time";
    return new Compensation(
      basis,
      Number(data.rate ?? 0),
      Number(data.share ?? 0),
    );
  }

  /** The plain-data round-trip form. */
  public serialize(): CompensationData {
    const out: CompensationData = { basis: this.basis };
    if (this.rate > 0) out.rate = this.rate;
    if (this.share > 0) out.share = this.share;
    return out;
  }
}
