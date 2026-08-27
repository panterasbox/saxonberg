/**
 * AppApi — the application-settings read/write surface over the warmed
 * `AppSettings` singleton. Values come from the seeder; there are no
 * code-side defaults, so reads just hit the cache. PersistenceManager is
 * stubbed; the cache is warmed via `AppSettings.warm` against the stub.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppApi } from "../app";
import { AppLogic } from "../../platform/idea/api/AppLogic";
import { SecurityError } from "../../lib/security/errors";
import { StuffApi } from "../stuff";
import { AppSettings, AppSettingKeys } from "../../lib/config/AppSettings";
import { PersistenceManager } from "../../../backend/PersistenceManager";

function stubPM() {
  const saves: Array<{ collection: string; doc: Record<string, unknown> }> = [];
  let findResult: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockImplementation(async (collection, doc) => {
    saves.push({ collection, doc: doc as Record<string, unknown> });
    return "inserted-id";
  });
  vi.spyOn(pm, "find").mockImplementation(async () => findResult);
  return { saves, setFindResult: (d: Record<string, unknown>[]) => (findResult = d) };
}

/** Warm the cache from a single row carrying `values`. */
async function warmWith(
  pm: ReturnType<typeof stubPM>,
  values: Record<string, string>,
): Promise<void> {
  pm.setFindResult([{ _id: "r", values }]);
  await AppSettings.warm();
}

describe("AppApi", () => {
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

  it("setting returns the seeded/stored value", async () => {
    await warmWith(pm, {
      [AppSettingKeys.evacuationFallback]: "/platform/location/void",
    });
    expect(AppApi.setting(AppSettingKeys.evacuationFallback)).toBe(
      "/platform/location/void",
    );
  });

  it("setting returns '' for a key not in the cache (no code defaults)", async () => {
    await warmWith(pm, {});
    expect(AppApi.setting(AppSettingKeys.evacuationFallback)).toBe("");
    expect(AppApi.setting("nonsense")).toBe("");
  });

  it("settings returns the whole bag (seeded + ad-hoc)", async () => {
    await warmWith(pm, {
      [AppSettingKeys.defaultStartLocation]: "/world/lounge/warren",
      motd: "hello",
    });
    const all = AppApi.settings();
    expect(all[AppSettingKeys.defaultStartLocation]).toBe("/world/lounge/warren");
    expect(all.motd).toBe("hello");
  });

  it("setSetting writes the bag, persists, and refreshes the cache", async () => {
    await warmWith(pm, {
      [AppSettingKeys.defaultStartLocation]: "/world/lounge/warren",
    });
    const savesBefore = pm.saves.length;

    await AppApi.setSetting(AppSettingKeys.defaultStartLocation, "/world/new");

    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe(
      "/world/new",
    );
    expect(pm.saves.length).toBe(savesBefore + 1);
    expect(
      (pm.saves.at(-1)!.doc as { values: Record<string, string> }).values
        .defaultStartLocation,
    ).toBe("/world/new");
  });
});

describe("AppLogic singleton encapsulation", () => {
  let pm: ReturnType<typeof stubPM>;

  beforeEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    pm = stubPM();
    AppSettings._resetForTesting();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    StuffApi.clearAll();
    AppSettings._resetForTesting();
  });

  it("lives at /platform/idea/api/app once the facade has materialized it", async () => {
    await warmWith(pm, {});
    // A facade call lazily creates the logic singleton.
    AppApi.setting("nonsense");
    const logic = StuffApi.findByTemplatePath("/platform/idea/api/app");
    expect(logic).toBeDefined();
    expect(StuffApi.findByPathGlob("/platform/idea/api/*")).toContain(logic);
  });

  it("denies a direct logic-method call from a non-AppApi caller", async () => {
    await warmWith(pm, {});
    AppApi.setting("nonsense");
    const logic = StuffApi.findByTemplatePath<AppLogic>("/platform/idea/api/app");
    expect(logic).toBeDefined();
    // The test module is not `mud/api/app#AppApi`, so the FromModule
    // gate on the logic's own methods denies the call.
    expect(() => logic!.setting("nonsense")).toThrow(SecurityError);
  });
});
