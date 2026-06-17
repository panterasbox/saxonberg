/**
 * AppSettingsSeeder — seeds the `app_settings` row from the real
 * `mud/config/app-settings.yaml`. Insert / merge-missing / idempotent;
 * operator-changed keys survive. PersistenceManager is stubbed (no Mongo).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AppSettingsSeeder } from "../AppSettingsSeeder";
import { AppSettingKeys } from "../../mud/lib/config/AppSettings";
import { PersistenceManager } from "../PersistenceManager";

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

function savedValues(
  pm: ReturnType<typeof stubPM>,
): Record<string, string> {
  return (pm.saves.at(-1)!.doc as { values: Record<string, string> }).values;
}

describe("AppSettingsSeeder", () => {
  let pm: ReturnType<typeof stubPM>;

  beforeEach(() => {
    vi.restoreAllMocks();
    pm = stubPM();
  });

  afterEach(() => vi.restoreAllMocks());

  it("seeds the YAML values into a fresh app_settings row", async () => {
    pm.setFindResult([]);
    const added = await AppSettingsSeeder.run();

    expect(added).toBe(5);
    expect(pm.saves).toHaveLength(1);
    expect(pm.saves[0]!.collection).toBe("app_settings");
    const values = savedValues(pm);
    expect(values[AppSettingKeys.defaultStartLocation]).toBe(
      "/domain/lounge/warren",
    );
    expect(values[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    expect(values[AppSettingKeys.reactionsThreshold]).toBe("10");
    expect(values[AppSettingKeys.reactionsCadenceMs]).toBe("200");
    expect(values[AppSettingKeys.reactionsSampleCap]).toBe("5");
  });

  it("is idempotent — a fully-populated row is left alone (no save)", async () => {
    pm.setFindResult([
      {
        _id: "r",
        values: {
          [AppSettingKeys.defaultStartLocation]: "/domain/lounge/warren",
          [AppSettingKeys.evacuationFallback]: "/domain/void",
          [AppSettingKeys.reactionsThreshold]: "10",
          [AppSettingKeys.reactionsCadenceMs]: "200",
          [AppSettingKeys.reactionsSampleCap]: "5",
        },
      },
    ]);
    const added = await AppSettingsSeeder.run();
    expect(added).toBe(0);
    expect(pm.saves).toHaveLength(0);
  });

  it("merges a missing key while preserving an operator-changed one", async () => {
    // Operator moved the spawn; the evac key predates the YAML / was wiped.
    pm.setFindResult([
      {
        _id: "r",
        values: { [AppSettingKeys.defaultStartLocation]: "/domain/custom" },
      },
    ]);
    const added = await AppSettingsSeeder.run();

    // Missing keys seeded: evacuationFallback + the three reaction keys.
    expect(added).toBe(4);
    expect(pm.saves).toHaveLength(1);
    const values = savedValues(pm);
    // operator value preserved, missing keys seeded
    expect(values[AppSettingKeys.defaultStartLocation]).toBe("/domain/custom");
    expect(values[AppSettingKeys.evacuationFallback]).toBe("/domain/void");
    expect(values[AppSettingKeys.reactionsThreshold]).toBe("10");
  });
});
