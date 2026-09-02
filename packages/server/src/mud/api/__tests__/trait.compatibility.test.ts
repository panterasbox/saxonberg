/**
 * TraitApi.compatibility + regardBaseline — the trait→regard seam.
 *
 * Compatibility is the scaled dot product of two characters' shared-axis
 * positions (aligned → positive, opposed → negative). The regard baseline
 * falls back to compatibility only when no interaction-driven regard row
 * exists; a stored regard (even 0) governs. Belief gains no trait
 * dependency and a fallthrough read writes nothing to belief.
 *
 * Disposition evidence rides the in-memory PM stub; regard rides a real
 * BeliefStore viewer.
 */

import "../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { TraitApi } from "../trait";
import { BeliefStoreMixin } from "../../lib/belief/BeliefStore";
import { Idea } from "../../lib/stuff/Idea";
import { StuffApi } from "../stuff";
import { WorldClockApi } from "../worldclock";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../lib/security/__tests__/test-setup";

class View extends BeliefStoreMixin(Idea) {}

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

function viewer(): View {
  return makeStuffAtPath(() => new View(), `/platform/agent/Avatar/c${counter++}`);
}

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
  WorldClockApi._setNowProviderForTesting(() => 1000);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

describe("TraitApi.compatibility", () => {
  it("is positive for aligned dispositions", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "sociability", valence: 70 });
    await TraitApi.recordDeed(b, { disposition: "sociability", valence: 70 });
    expect(await TraitApi.compatibility(a, b)).toBeGreaterThan(0);
  });

  it("is negative for opposed dispositions", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "generosity", valence: 70 });
    await TraitApi.recordDeed(b, { disposition: "generosity", valence: -70 });
    expect(await TraitApi.compatibility(a, b)).toBeLessThan(0);
  });

  it("is ~0 when there are no shared axes", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "sociability", valence: 70 });
    await TraitApi.recordDeed(b, { disposition: "honesty", valence: 70 });
    expect(await TraitApi.compatibility(a, b)).toBe(0);
  });

  it("is symmetric", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "trust", valence: 50 });
    await TraitApi.recordDeed(b, { disposition: "trust", valence: 30 });
    expect(await TraitApi.compatibility(a, b)).toBe(
      await TraitApi.compatibility(b, a)
    );
  });
});

describe("TraitApi.regardBaseline", () => {
  it("falls back to compatibility when no regard row exists", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "sociability", valence: 70 });
    await TraitApi.recordDeed(b, { disposition: "sociability", valence: 70 });
    expect(await TraitApi.regardBaseline(a, b)).toBe(
      await TraitApi.compatibility(a, b)
    );
  });

  it("yields to a stored interaction-driven regard (even at 0)", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "sociability", valence: 70 });
    await TraitApi.recordDeed(b, { disposition: "sociability", valence: 70 });
    a.setRegard(b, 12);
    expect(await TraitApi.regardBaseline(a, b)).toBe(12);
    a.setRegard(b, 0);
    expect(await TraitApi.regardBaseline(a, b)).toBe(0);
  });

  it("writes nothing to belief on a fallthrough read", async () => {
    const a = viewer();
    const b = viewer();
    await TraitApi.recordDeed(a, { disposition: "honesty", valence: 40 });
    await TraitApi.recordDeed(b, { disposition: "honesty", valence: 40 });
    await TraitApi.regardBaseline(a, b);
    expect(a.regardsHeld().size).toBe(0);
  });
});
