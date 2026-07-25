/**
 * Shared banking-test harness: a collection-aware in-memory Mongo fake
 * (the `ProducerLogic.recompute.test` precedent) plus the warm-cache resets,
 * so the ledger / balance / supply tests round-trip through the real
 * `Document` save/find path without a live DB.
 */

import { vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import YAML from "yaml";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import AccountBalance from "../AccountBalance";
import SupplyAggregate from "../SupplyAggregate";
import { WorldClockApi } from "../../../api/worldclock";
import { StuffApi } from "../../../api/stuff";
import { AppApi } from "../../../api/app";
import { AppSettingKeys } from "../../config/AppSettings";

let stores: Map<string, Map<string, Record<string, unknown>>>;
let idCounter = 0;

/**
 * The REAL seeded default-custodian value from `app-settings.yaml` (the
 * yaml is the single source of the value — no code default anywhere).
 * The harness makes just this one key ambient so fixtures read true
 * config; a test that re-stubs `AppApi.setting` overrides the harness
 * and must carry the keys it needs.
 */
let seededCustodian: string | null = null;
function seededDefaultCustodian(): string {
  if (seededCustodian === null) {
    const doc = YAML.parse(
      readFileSync(
        fileURLToPath(
          new URL("../../../config/app-settings.yaml", import.meta.url),
        ),
        "utf8",
      ),
    ) as { settings: Array<{ key: string; value: string }> };
    seededCustodian =
      doc.settings.find(
        (e) => e.key === AppSettingKeys.bankingDefaultCustodianBank,
      )?.value ?? "";
  }
  return seededCustodian;
}

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
  // Custody comes ONLY from the app setting (no code default). Fall
  // through to the REAL reader first — a test that warms/pokes the real
  // AppSettings cache keeps its values — and only when it throws
  // (unwarmed) supply the yaml-seeded custodian; every other key reads
  // unset ("" — the same fallback outcomes as an unwarmed AppSettings).
  const realSetting = AppApi.setting.bind(AppApi);
  vi.spyOn(AppApi, "setting").mockImplementation((k: string) => {
    try {
      return realSetting(k);
    } catch {
      return k === AppSettingKeys.bankingDefaultCustodianBank
        ? seededDefaultCustodian()
        : "";
    }
  });
  AccountBalance._resetForTesting();
  SupplyAggregate._resetForTesting();
  StuffApi.clearAll();
}

/** Tear down the harness (mirror of {@link installBankingHarness}). */
export function teardownBankingHarness(): void {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  AccountBalance._resetForTesting();
  SupplyAggregate._resetForTesting();
  StuffApi.clearAll();
}
