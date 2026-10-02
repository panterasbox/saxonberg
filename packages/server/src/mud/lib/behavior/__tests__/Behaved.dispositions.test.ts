/**
 * BehavedMixin disposition seeding — an authored host's `dispositions:`
 * seed list becomes `claim` evidence, so derive-on-read yields its
 * defining traits immediately.
 *
 * ⚠ It is the TEMPLATE APPLIER's phase 3 that calls `seedDispositions`,
 * not `onCreate`, since 2026-10-01: `dispositions` is a `seed: true`
 * field and the hook kept only the structural half (wiring the brains).
 * These tests drive the applier's entry point directly, which is also
 * what changed about the GUARANTEE: the applier runs phase 3 at mint
 * ONLY — never on a go-live, never on a restore — so the two reasons a
 * history could be written twice are now a wave apart.
 *
 * ⭐ The ledger's own idempotence is still tested here, and still has to
 * be the ledger's: a re-clone after a destruct is a genuinely new mint,
 * and only the trait log knows the claims are already filed.
 *
 * A minimal Behaved host on the in-memory PM stub (no full Character).
 */

import "../../../../test-bootstrap";
import { DispositionedMixin } from "../../trait/Dispositioned";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { BehavedMixin } from "../Behaved";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";

// DispositionedMixin composed: the seeding + ledger reads live ON the
// host since the OO sweep (Behaved narrows with isDispositioned).
class TestNPC extends DispositionedMixin(BehavedMixin(Idea)) {}
type Host = TestNPC & {
  onCreate(c?: unknown): Promise<void>;
  seedDispositions(
    seeds: readonly { disposition: string; valence: number }[],
  ): Promise<void>;
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
    `/world/lounge/npc/test${counter++}`
  ) as unknown as Host;
}

describe("BehavedMixin disposition seeding", () => {
  it("seeds claim evidence and derives defining traits", async () => {
    const host = makeHost();
    host.dispositions = [
      { disposition: "sociability", valence: -70 },
      { disposition: "temperance", valence: 70 },
    ];
    await host.seedDispositions(host.dispositions);

    const rows = await host.dispositionEntries();
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === "claim")).toBe(true);

    const pronounced = await host.pronouncedTraits();
    const byAxis = new Map(pronounced.map((e) => [e.disposition, e]));
    // Reserved (Shy end) + Temperate, the seeded character.
    expect(byAxis.get("sociability")!.position).toBeLessThan(0);
    expect(byAxis.get("temperance")!.position).toBeGreaterThan(0);
  });

  it("is idempotent across a second seed — the LEDGER refuses it", async () => {
    // ⭐ Which is the half that has to stay a ledger read: the applier
    // only promises not to run phase 3 on the SAME fill, and a re-clone
    // after a destruct is a different one.
    const host = makeHost();
    host.dispositions = [{ disposition: "generosity", valence: 70 }];
    await host.seedDispositions(host.dispositions);
    await host.seedDispositions(host.dispositions);
    expect(await host.dispositionEntries()).toHaveLength(1);
  });

  it("⭐ onCreate no longer seeds — that limb moved to the applier", async () => {
    // The structural half stays on the hook (wiring the brains); the
    // seed does not. If this ever starts passing with rows > 0, the
    // seeding limb has crept back onto the lifecycle.
    const host = makeHost();
    host.dispositions = [{ disposition: "generosity", valence: 70 }];
    await host.onCreate();
    expect(await host.dispositionEntries()).toHaveLength(0);
  });

  it("no-ops for a host with no dispositions", async () => {
    const host = makeHost();
    await host.seedDispositions([]);
    expect(await host.dispositionEntries()).toHaveLength(0);
  });
});
