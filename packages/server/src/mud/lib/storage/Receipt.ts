/**
 * StoreReceipt — ⭐ **a bailee's acknowledgement that it holds goods for a
 * depositor, on printed terms** (storage-and-ice D6). Written as the
 * EXISTING `warehouse-receipt` document kind under the bailee business's
 * own branch (`<business>/warehouse-receipts/<id>`), so the closed
 * `BUSINESS_DOCUMENT_KINDS` stays at three; the record shape widens.
 *
 * Pooled goods are owned in COMMON: a receipt is a claim on a line by pool
 * key, not on particular blocks, and a shortfall is shared pro rata. The
 * allowance decides nothing about the payout — it classifies the
 * shortfall on the record (`withinAllowance`). *The engine reports; the
 * courts judge.*
 *
 * A unique good (the depot's crate) is a receipt of `unit: 'count'`,
 * keyed by its chattel id, for one.
 */

/** The terms printed on a receipt. */
export interface ReceiptTerms {
  /** The share a pooled good may shrink in store and still be an ordinary loss, %. */
  allowancePct: number;
  /** What the house charges on withdrawal, minor units per kilogram. */
  feeMinorPerKg: number;
}

/** A receipt, as filed. */
export interface StoreReceipt {
  receiptId: string;
  /** The bailee business's durable path. */
  bailee: string;
  /** The store the goods are in (its template path). */
  store: string;
  /** Whose claim it is: an identity path, or the business's own path. */
  depositor: string;
  /** The row a withdrawal pays out (the line's good). */
  good: string;
  /** The line it is a claim on — or `live:<id>` for one unique good. */
  poolKey: string;
  /** Kilograms of a pooled good, or one unique thing. */
  unit: 'kg' | 'count';
  /** What is still claimed. */
  amountKg: number;
  /** What was deposited in all. */
  originalAmountKg: number;
  /** One unit's mass, kg. */
  unitMassKg: number;
  terms: ReceiptTerms;
  /** What is held, in words. */
  what: string;
  filedAtS: number;
  /** When the claim was paid out in full. */
  settledAtS?: number;
  /** The share the pool could not pay at settlement, %. */
  shortfallPct?: number;
  /** Whether that shortfall was within the printed allowance. */
  withinAllowance?: boolean;
}

/** The haulage depot's receipt shape — a subset of the store's. */
export type WarehouseReceipt = Pick<StoreReceipt, 'receiptId' | 'what' | 'depositor' | 'bailee' | 'filedAtS'> & {
  goodsPath: string;
};
