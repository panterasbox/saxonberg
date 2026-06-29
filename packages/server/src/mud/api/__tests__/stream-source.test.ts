/**
 * StreamSourceApi — parse + shape-validate the operator-configured
 * `livestream.broadcastSources` AppSetting into a clean `StreamSource[]`.
 * Mirrors the AppApi test harness: PersistenceManager is stubbed and the
 * cache is warmed from a single row.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { StreamSourceApi } from "../stream-source";
import { AppSettings, AppSettingKeys } from "../../lib/config/AppSettings";
import { PersistenceManager } from "../../../backend/PersistenceManager";

function stubPM() {
  let findResult: Record<string, unknown>[] = [];
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "save").mockImplementation(async () => "inserted-id");
  vi.spyOn(pm, "find").mockImplementation(async () => findResult);
  return { setFindResult: (d: Record<string, unknown>[]) => (findResult = d) };
}

async function warmWith(
  pm: ReturnType<typeof stubPM>,
  raw: string,
): Promise<void> {
  pm.setFindResult([
    { _id: "r", values: { [AppSettingKeys.livestreamBroadcastSources]: raw } },
  ]);
  await AppSettings.warm();
}

describe("StreamSourceApi.current", () => {
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

  it("parses a valid twitch source", async () => {
    await warmWith(pm, '[{"platform":"twitch","channel":"saxonberg"}]');
    expect(StreamSourceApi.current()).toEqual([
      { platform: "twitch", channel: "saxonberg" },
    ]);
  });

  it("parses a mixed twitch + youtube list", async () => {
    await warmWith(
      pm,
      '[{"platform":"twitch","channel":"a"},{"platform":"youtube","videoId":"xyz"}]',
    );
    expect(StreamSourceApi.current()).toEqual([
      { platform: "twitch", channel: "a" },
      { platform: "youtube", videoId: "xyz" },
    ]);
  });

  it("drops malformed entries but keeps valid ones", async () => {
    await warmWith(
      pm,
      '[{"platform":"twitch"},{"platform":"mixer","channel":"x"},{"platform":"twitch","channel":"ok"}]',
    );
    expect(StreamSourceApi.current()).toEqual([
      { platform: "twitch", channel: "ok" },
    ]);
  });

  it("returns [] on malformed JSON", async () => {
    await warmWith(pm, "{not json");
    expect(StreamSourceApi.current()).toEqual([]);
  });

  it("returns [] on a non-array value", async () => {
    await warmWith(pm, '{"platform":"twitch","channel":"x"}');
    expect(StreamSourceApi.current()).toEqual([]);
  });

  it("returns [] on the empty/default value", async () => {
    await warmWith(pm, "[]");
    expect(StreamSourceApi.current()).toEqual([]);
  });
});
