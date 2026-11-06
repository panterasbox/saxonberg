/**
 * AppSettings — the cache surface over the seeded singleton row. Seeding
 * itself is the platform pack's job (tested with the installer); this covers warm /
 * getCached / the unwarmed guard. PersistenceManager is stubbed (no Mongo).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSettings, AppSettingKeys, AppSettingTiers, SettingTierVerbs } from "../AppSettings";
import { Office } from "../../governance/Office";
import { PersistenceManager } from "../../../../backend/PersistenceManager";

function stubPM() {
  let findResult: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockResolvedValue("inserted-id" as never);
  vi.spyOn(pm, "find").mockImplementation(async () => findResult);
  return { setFindResult: (d: Record<string, unknown>[]) => (findResult = d) };
}

describe("AppSettings", () => {
  let pm: ReturnType<typeof stubPM>;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
    AppSettings._resetForTesting();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    AppSettings._resetForTesting();
  });

  it("warm loads the seeded row into the cache", async () => {
    pm.setFindResult([
      {
        _id: "r",
        values: {
          [AppSettingKeys.defaultStartLocation]: "/world/lounge/idea/warren",
          [AppSettingKeys.evacuationFallback]: "/platform/location/void",
        },
      },
    ]);
    const settings = await AppSettings.warm();
    expect(settings.getValue(AppSettingKeys.defaultStartLocation)).toBe(
      "/world/lounge/idea/warren",
    );
    expect(AppSettings.getCached()).toBe(settings);
  });

  it("warm on an unseeded collection yields an empty cached instance (no write)", async () => {
    pm.setFindResult([]);
    const settings = await AppSettings.warm();
    expect(settings.getValues()).toEqual({});
    expect(settings._id).toBeUndefined();
  });

  it("getCached throws loudly when the cache was never warmed", () => {
    expect(() => AppSettings.getCached()).toThrow(/cache not warmed/);
  });
});

describe("AppSettingTiers — every key carries its tier (wizard-axis D9)", () => {
  it("is total over the vocabulary (the compiler's rule, asserted at runtime too)", () => {
    for (const prop of Object.keys(AppSettingKeys)) {
      expect(AppSettingTiers[prop as keyof typeof AppSettingKeys], prop).toBeDefined();
    }
    expect(Object.keys(AppSettingTiers).sort()).toEqual(Object.keys(AppSettingKeys).sort());
  });

  it("every C seat is a real office, with a verb of its own", () => {
    for (const tier of new Set(Object.values(AppSettingTiers))) {
      if (tier === "B") continue;
      expect(Office.byKey(tier.slice(2)), tier).not.toBeNull();
      expect(SettingTierVerbs[tier], tier).toMatch(/ set$/);
    }
  });

  it("the fiscal dials are Finance's, the capital controls the Governor's", () => {
    expect(AppSettingTiers.bankingSalesTaxRate).toBe("C:minister-of-finance");
    expect(AppSettingTiers.treasuryArrivalPrincipal).toBe("C:minister-of-finance");
    expect(AppSettingTiers.bankingWithdrawalDailyCap).toBe("C:central-bank-governor");
    expect(AppSettingTiers.defaultStartLocation).toBe("B");
  });
});
