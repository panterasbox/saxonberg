/**
 * Shared banking-test harness: a collection-aware in-memory Mongo fake
 * (the `ProducerLogic.recompute.test` precedent) plus the warm-cache resets,
 * so the ledger / balance / supply tests round-trip through the real
 * `Document` save/find path without a live DB.
 */

import { vi } from "vitest";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import AccountBalance from "../AccountBalance";
import SupplyAggregate from "../SupplyAggregate";
import { WorldClockApi } from "../../../api/worldclock";

let stores: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;

export function col(name: string): Map<string, Record<string, unknown>> {
  let m = stores.get(name);
  if (!m) {
    m = new Map();
    stores.set(name, m);
  }
  return m;
}

function matches(
  d: Record<string, unknown>,
  q: Record<string, unknown>
): boolean {
  return Object.entries(q).every(([k, v]) => d[k] === v);
}

/** Install the fake PM + reset the banking warm caches + a fixed clock. */
export function installBankingHarness(): void {
  stores = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (c: string, q: Record<string, unknown>) =>
      [...col(c).values()].filter((d) => matches(d, q)) as never
  );
  vi.spyOn(pm, "findById").mockImplementation(
    async (c: string, id: string) => (col(c).get(id) ?? null) as never
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (c: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      col(c).set(id, { ...doc, _id: id });
      return id;
    }
  );
  vi.spyOn(pm, "delete").mockImplementation(async (c: string, id: string) => {
    col(c).delete(id);
  });
  WorldClockApi._setNowProviderForTesting(() => 4242);
  AccountBalance._resetForTesting();
  SupplyAggregate._resetForTesting();
}

/** Tear down the harness (mirror of {@link installBankingHarness}). */
export function teardownBankingHarness(): void {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AccountBalance._resetForTesting();
  SupplyAggregate._resetForTesting();
}
