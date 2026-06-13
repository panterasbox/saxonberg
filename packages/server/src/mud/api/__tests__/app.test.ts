/**
 * AppApi — the application-settings read/write surface over the warmed
 * `AppSettings` singleton. PersistenceManager is stubbed (no MongoDB); the
 * cache is warmed via `loadOrSeed` against the stub.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppApi } from "../app";
import { AppSettings } from "../../lib/config/AppSettings";
import { AppSettingKeys, AppSettingDefaults } from "../../lib/config/keys";
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

  it("setting returns the persisted value when present", async () => {
    pm.setFindResult([
      { _id: "r", values: { defaultStartLocation: "/domain/custom" } },
    ]);
    await AppSettings.loadOrSeed();
    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe(
      "/domain/custom",
    );
  });

  it("setting falls back to the registry default for a key absent from the row", async () => {
    // A pre-existing row that predates the evacuationFallback key.
    pm.setFindResult([
      { _id: "r", values: { defaultStartLocation: "/domain/custom" } },
    ]);
    await AppSettings.loadOrSeed();
    expect(AppApi.setting(AppSettingKeys.evacuationFallback)).toBe(
      "/domain/void",
    );
  });

  it("setting returns '' for a wholly unknown key", async () => {
    pm.setFindResult([{ _id: "r", values: {} }]);
    await AppSettings.loadOrSeed();
    expect(AppApi.setting("nonsense")).toBe("");
  });

  it("settings unions registry keys with ad-hoc bag keys", async () => {
    pm.setFindResult([{ _id: "r", values: { motd: "hello" } }]);
    await AppSettings.loadOrSeed();
    const all = AppApi.settings();
    // registry keys present at their defaults...
    expect(all[AppSettingKeys.defaultStartLocation]).toBe(
      AppSettingDefaults[AppSettingKeys.defaultStartLocation],
    );
    expect(all[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    // ...plus the ad-hoc key.
    expect(all.motd).toBe("hello");
  });

  it("setSetting writes the bag, persists, and refreshes the cache", async () => {
    pm.setFindResult([]); // fresh DB → seeded
    await AppSettings.loadOrSeed();
    const savesBefore = pm.saves.length;

    await AppApi.setSetting(AppSettingKeys.defaultStartLocation, "/domain/new");

    expect(AppApi.setting(AppSettingKeys.defaultStartLocation)).toBe(
      "/domain/new",
    );
    // Persisted (one more save than the seed).
    expect(pm.saves.length).toBe(savesBefore + 1);
    expect(
      (pm.saves.at(-1)!.doc as { values: Record<string, string> }).values
        .defaultStartLocation,
    ).toBe("/domain/new");
  });
});
