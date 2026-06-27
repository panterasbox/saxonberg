/**
 * BehavedMixin disposition seeding — an authored host's `dispositions:`
 * seed list becomes `claim` evidence at spawn (`postRegister`), so
 * derive-on-read yields its defining traits immediately. Idempotent across
 * a re-postRegister (re-clone / CMS go-live): claims are seeded once.
 *
 * A minimal Behaved host on the in-memory PM stub (no full Character).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { BehavedMixin } from "../Behaved";
import { TraitApi } from "../../../api/trait";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";

class TestNPC extends BehavedMixin(Idea) {}
type Host = TestNPC & {
  postRegister(c?: unknown): Promise<void>;
  dispositions: { disposition: string; valence: number }[];
};

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

beforeEach(() => {
  StuffApi.clearAll();
  store = new Map();
  idCounter = 0;
  const pm = PersistenceManager.get();
  vi.spyOn(pm, "isConnected").mockReturnValue(true);
  vi.spyOn(pm, "find").mockImplementation(
    async (_col: string, query: Record<string, unknown>) =>
      [...store.values()].filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      ) as never
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    }
  );
  WorldClockApi._setNowProviderForTesting(() => 500);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

function makeHost(): Host {
  return makeStuffAtPath(
    () => new TestNPC(),
    `/domain/lounge/npc/test${counter++}`
  ) as unknown as Host;
}

describe("BehavedMixin disposition seeding", () => {
  it("seeds claim evidence at postRegister and derives defining traits", async () => {
    const host = makeHost();
    host.dispositions = [
      { disposition: "sociability", valence: -70 },
      { disposition: "temperance", valence: 70 },
    ];
    await host.postRegister();

    const rows = await TraitApi.entriesFor(host);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "claim")).toBe(true);

    const pronounced = await TraitApi.pronouncedFor(host);
    const byAxis = new Map(pronounced.map((e) => [e.disposition, e]));
    // Reserved (Shy end) + Temperate, the seeded character.
    expect(byAxis.get("sociability")!.position).toBeLessThan(0);
    expect(byAxis.get("temperance")!.position).toBeGreaterThan(0);
  });

  it("is idempotent across a second postRegister", async () => {
    const host = makeHost();
    host.dispositions = [{ disposition: "generosity", valence: 70 }];
    await host.postRegister();
    await host.postRegister();
    expect(await TraitApi.entriesFor(host)).toHaveLength(1);
  });

  it("no-ops for a host with no dispositions", async () => {
    const host = makeHost();
    await host.postRegister();
    expect(await TraitApi.entriesFor(host)).toHaveLength(0);
  });
});
