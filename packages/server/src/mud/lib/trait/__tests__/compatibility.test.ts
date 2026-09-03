/**
 * compatibilityWith + regardBaselineToward — the trait→regard seam
 * (on DispositionedMixin since the OO sweep).
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

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { BeliefStoreMixin } from "../../belief/BeliefStore";
import { Idea } from "../../stuff/Idea";
import { StuffApi } from "../../../api/stuff";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import {
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";
import { DispositionedMixin } from "../Dispositioned";

class View extends DispositionedMixin(BeliefStoreMixin(Idea)) {}

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

describe("compatibilityWith", () => {
  it("is positive for aligned dispositions", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "sociability", valence: 70 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "sociability", valence: 70 }));
    expect(await a.compatibilityWith(b)).toBeGreaterThan(0);
  });

  it("is negative for opposed dispositions", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "generosity", valence: 70 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "generosity", valence: -70 }));
    expect(await a.compatibilityWith(b)).toBeLessThan(0);
  });

  it("is ~0 when there are no shared axes", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "sociability", valence: 70 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "honesty", valence: 70 }));
    expect(await a.compatibilityWith(b)).toBe(0);
  });

  it("is symmetric", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "trust", valence: 50 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "trust", valence: 30 }));
    expect(await a.compatibilityWith(b)).toBe(
      await b.compatibilityWith(a)
    );
  });
});

describe("regardBaselineToward", () => {
  it("falls back to compatibility when no regard row exists", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "sociability", valence: 70 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "sociability", valence: 70 }));
    expect(await a.regardBaselineToward(b)).toBe(
      await a.compatibilityWith(b)
    );
  });

  it("yields to a stored interaction-driven regard (even at 0)", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "sociability", valence: 70 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "sociability", valence: 70 }));
    a.setRegard(b, 12);
    expect(await a.regardBaselineToward(b)).toBe(12);
    a.setRegard(b, 0);
    expect(await a.regardBaselineToward(b)).toBe(0);
  });

  it("writes nothing to belief on a fallthrough read", async () => {
    const a = viewer();
    const b = viewer();
    await withRootContext(a, 'imprint', () => a.imprintDeed({ disposition: "honesty", valence: 40 }));
    await withRootContext(b, 'imprint', () => b.imprintDeed({ disposition: "honesty", valence: 40 }));
    await a.regardBaselineToward(b);
    expect(a.regardsHeld().size).toBe(0);
  });
});
