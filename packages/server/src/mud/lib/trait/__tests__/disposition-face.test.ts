/**
 * The disposition owner face ON DispositionedMixin (retired
 * TraitApi/TraitLogic — the Api OO sweep). Covers: imprintSignature
 * fans only the dispositionValence channel (the discipline channel is
 * ignored) into rows sharing one timestamp; absent valence writes
 * nothing; imprintDeed forces a single deed row; the reader is
 * owner-scoped + per-axis; claim provenance round-trips; disconnected /
 * keyless owners no-op; and positions / pronounced derive over a
 * synthetic ledger.
 *
 * Mongo is faked with an in-memory collection (the advancement harness):
 * we stub PM's find / save — the same wrappers `DispositionEntry` uses.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ActSignature } from "../../advancement/ActSignature";
import { Idea } from "../../stuff/Idea";
import { DispositionedMixin } from "../Dispositioned";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../security/__tests__/test-setup";

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

class DispositionedIdea extends DispositionedMixin(Idea) {}

function makeOwnerAt(): DispositionedIdea {
  return makeStuffAtPath(
    () => new DispositionedIdea(),
    `/platform/agent/Avatar/t${counter++}`,
  );
}

beforeEach(() => {
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
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("the disposition ledger append + read", () => {
  it("fans only the dispositionValence channel into rows", async () => {
    const owner = makeOwnerAt();
    const sig: ActSignature = {
      discipline: [
        { discipline: "mixology", difficulty: "hard", outcome: "success" },
      ],
      dispositionValence: [
        { disposition: "generosity", valence: 40 },
        { disposition: "temperance", valence: -25 },
      ],
    };
    await withRootContext(owner, 'imprint', () => owner.imprintSignature(sig));
    const rows = await owner.dispositionEntries();
    expect(rows).toHaveLength(2);
    const byAxis = new Map(rows.map((r) => [r.disposition, r]));
    expect(byAxis.get("generosity")!.valence).toBe(40);
    expect(byAxis.get("temperance")!.valence).toBe(-25);
    // The discipline channel produced no disposition rows.
    expect(rows.some((r) => r.disposition === "mixology")).toBe(false);
  });

  it("shares one act timestamp across all rows", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintSignature({
      discipline: [],
      dispositionValence: [
        { disposition: "honesty", valence: 10 },
        { disposition: "boldness", valence: 10 },
      ],
    }));
    const rows = await owner.dispositionEntries();
    // All sub-checks of one act fold at a single shared timestamp.
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.when)).size).toBe(1);
  });

  it("writes nothing for an act with no disposition valence", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintSignature({
      discipline: [
        { discipline: "darts", difficulty: "easy", outcome: "success" },
      ],
    }));
    expect(await owner.dispositionEntries()).toHaveLength(0);
  });

  it("recordDeed writes a single deed row", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "compassion", valence: 15 }));
    const rows = await owner.dispositionEntries();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("deed");
    expect(rows[0]!.disposition).toBe("compassion");
  });

  it("reads owner-scoped, with an optional per-axis filter", async () => {
    const owner = makeOwnerAt();
    const other = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "honesty", valence: 10 }));
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "generosity", valence: 10 }));
    await withRootContext(other, 'imprint', () => other.imprintDeed({ disposition: "honesty", valence: 10 }));
    expect(await owner.dispositionEntries()).toHaveLength(2);
    expect(await owner.dispositionEntries("honesty")).toHaveLength(1);
  });

  it("round-trips claim provenance", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () =>
      owner.imprintSignature(
        { discipline: [], dispositionValence: [{ disposition: "trust", valence: 5 }] },
        { kind: "claim" },
      ),
    );
    const rows = await owner.dispositionEntries();
    expect(rows[0]!.kind).toBe("claim");
  });

  it("no-ops when disconnected", async () => {
    const owner = makeOwnerAt();
    vi.spyOn(PersistenceManager.get(), "isConnected").mockReturnValue(false);
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "honesty", valence: 10 }));
    expect(await owner.dispositionEntries()).toHaveLength(0);
  });

  it("no-ops for a keyless (session-ephemeral) owner", async () => {
    const owner = makeStuff(() => new DispositionedIdea());
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "honesty", valence: 10 }));
    expect(store.size).toBe(0);
    expect(await owner.dispositionEntries()).toHaveLength(0);
  });
});

describe("trait derive-on-read", () => {
  it("derives a per-axis signed position + band over the ledger", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "sociability", valence: 70 }));
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "temperance", valence: -70 }));

    const soc = await owner.traitPosition("sociability");
    expect(soc.position).toBe(70);
    expect(soc.band).toBe("entrenched");

    const tem = await owner.traitPosition("temperance");
    expect(tem.position).toBe(-70);

    const all = await owner.traitPositions();
    expect(all.map((e) => e.disposition).sort()).toEqual([
      "sociability",
      "temperance",
    ]);
  });

  it("positionFor returns the neutral floor for an unevidenced axis", async () => {
    const owner = makeOwnerAt();
    const est = await owner.traitPosition("curiosity");
    expect(est.position).toBe(0);
    expect(est.band).toBe("unformed");
  });

  it("pronouncedFor returns only defining axes, most pronounced first", async () => {
    const owner = makeOwnerAt();
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "sociability", valence: 80 }));
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "generosity", valence: 30 }));
    await withRootContext(owner, 'imprint', () => owner.imprintDeed({ disposition: "honesty", valence: 3 }));
    const pronounced = await owner.pronouncedTraits();
    expect(pronounced.map((e) => e.disposition)).toEqual([
      "sociability",
      "generosity",
    ]);
  });
});
