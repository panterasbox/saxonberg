/**
 * StoreLine — ⭐ **one line of a store's ledger: an amount of one good at
 * one grade** (storage-and-ice D1/D2). A store holds goods as COUNTS, not
 * as ten thousand objects; each line is the amount of a pool key (ice by
 * its quality, sawdust by its wetness band) and the state the pooled matter
 * keeps (a temperature, a saturation).
 *
 * Plain records, persisted as an array on the store (never a bare Map).
 */

/** What a pooled good does in a store: the thing kept, or what it is kept in. */
export type PoolRole = 'stock' | 'packing';

/** One line of a store's ledger. */
export interface StoreLine {
  /** The good + the band it pools with (`ice|black`, `sawdust|dry`). */
  poolKey: string;
  /** The row a withdrawal rematerializes — the template of the first deposit. */
  goodPath: string;
  /** Kilograms on the line, the face INCLUDED. */
  amountKg: number;
  /** Mass of one unit — what one withdrawn object weighs, kg. */
  unitMassKg: number;
  /** The pooled matter's own state (ice `{temperatureK}`, sawdust `{saturation}`). */
  state: Record<string, number>;
  /** Stock kept, or packing it is kept in. */
  role: PoolRole;
  /** What the store's own physics took off this line, kg/day (last reconcile). */
  lossKgPerDay: number;
  /** A 30-day moving average of withdrawals, kg/day — everyone's. */
  drawKgPerDay: number;
  /**
   * The same average of the HOUSE's own draws (a counter bringing stock
   * up), kg/day — what the house sells at, apart from depositors taking
   * their own goods home. Absent on a line recorded before it existed.
   */
  houseDrawKgPerDay?: number;
  /** Game-second this line was last brought current. */
  lastReconciledS: number;
}

/** An authored seed line (`initialLines:` on a store row) — laid down once. */
export interface StoreSeedLine {
  /** The row the line holds. */
  goodPath: string;
  /** Kilograms to seed. */
  amountKg: number;
  /** Optional pool state to seed (`{saturation: 0}`); the good's own otherwise. */
  state?: Record<string, number>;
  /** Optional grade stamped on the exemplar before its key is read (`black`). */
  grade?: string;
}
