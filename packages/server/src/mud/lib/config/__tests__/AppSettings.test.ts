/**
 * AppSettings — the cache surface over the seeded singleton row. Seeding
 * itself is AppSettingsSeeder's job (tested separately); this covers warm /
 * getCached / the unwarmed guard. PersistenceManager is stubbed (no Mongo).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSettings, AppSettingKeys } from "../AppSettings";
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
          [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
          [AppSettingKeys.evacuationFallback]: "/domain/void",
        },
      },
    ]);
    const settings = await AppSettings.warm();
    expect(settings.getValue(AppSettingKeys.defaultStartLocation)).toBe(
      "/domain/lounge/warren",
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
