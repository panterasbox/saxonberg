/**
 * AppSettings persistence — fresh-DB seed from the registry, idempotent
 * re-seed, and the unwarmed-cache guard.
 *
 * PersistenceManager is stubbed with hand-built fakes (the
 * `WorldClockState.persistence.test.ts` pattern); no MongoDB.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSettings } from "../AppSettings";
import { AppSettingKeys, AppSettingDefaults } from "../keys";
import { PersistenceManager } from "../../../../backend/PersistenceManager";

interface PMStubs {
  saves: Array<{ collection: string; doc: Record<string, unknown> }>;
  setFindResult(docs: Record<string, unknown>[]): void;
}

function stubPM(): PMStubs {
  const saves: PMStubs["saves"] = [];
  let nextFindResult: Record<string, unknown>[] = [];

  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockImplementation(async (collection, doc) => {
    saves.push({ collection, doc: doc as Record<string, unknown> });
    return "inserted-id";
  });
  vi.spyOn(pm, "find").mockImplementation(async () => nextFindResult);

  return {
    saves,
    setFindResult: (docs) => {
      nextFindResult = docs;
    },
  };
}

describe("AppSettings", () => {
  let pm: PMStubs;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
    AppSettings._resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    AppSettings._resetForTesting();
  });

  it("seeds exactly one row from the registry on a fresh DB and warms the cache", async () => {
    pm.setFindResult([]);
    const settings = await AppSettings.loadOrSeed();

    // Bag seeded from the registry, not a second literal.
    expect(settings.getValues()).toEqual(AppSettingDefaults);
    // Persisted exactly once, into the right collection.
    expect(pm.saves).toHaveLength(1);
    expect(pm.saves[0]!.collection).toBe("app_settings");
    expect(
      (pm.saves[0]!.doc as { values: Record<string, string> }).values,
    ).toEqual(AppSettingDefaults);
    // Cache warmed → sync getCached returns the same instance.
    expect(AppSettings.getCached()).toBe(settings);
    expect(
      AppSettings.getCached().getValue(AppSettingKeys.defaultStartLocation),
    ).toBe("/domain/lounge/warren");
  });

  it("is idempotent — an existing row is reused and not re-inserted", async () => {
    pm.setFindResult([
      { _id: "row1", values: { defaultStartLocation: "/domain/custom" } },
    ]);
    const settings = await AppSettings.loadOrSeed();

    expect(settings._id).toBe("row1");
    expect(settings.getValue(AppSettingKeys.defaultStartLocation)).toBe(
      "/domain/custom",
    );
    // No save on the reuse path.
    expect(pm.saves).toHaveLength(0);
  });

  it("getCached throws loudly when the cache was never warmed", () => {
    expect(() => AppSettings.getCached()).toThrow(/cache not warmed/);
  });
});
