/**
 * The transcript owner face ON AdvancementMixin (retired
 * AdvancementApi/AdvancementLogic — the Api OO sweep). Covers:
 * creditSignature explodes one act into per-Discipline rows sharing a
 * single timestamp; the disposition channel is ignored; creditDeed
 * forces a single deed row; the reader is owner-scoped +
 * per-Discipline; claim provenance round-trips; disconnected / keyless
 * owners no-op.
 *
 * Mongo is faked with an in-memory collection (the chronicle harness): we
 * stub PM's find / save surface — the same wrappers `TranscriptEntry` uses.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ActSignature } from "../ActSignature";
import { Idea } from "../../stuff/Idea";
import { AdvancementMixin } from "../Advancement";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

class AdvancingIdea extends AdvancementMixin(Idea) {}

function makeOwnerAt(): AdvancingIdea {
  return makeStuffAtPath(
    () => new AdvancingIdea(),
    `/platform/agent/Avatar/p${counter++}`,
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

describe("the transcript owner face — append + read", () => {
  it("recordSignature explodes one act into per-Discipline rows", async () => {
    const owner = makeOwnerAt();
    const sig: ActSignature = {
      discipline: [
        { discipline: "appraisal", difficulty: "hard", outcome: "success" },
        { discipline: "mixology", difficulty: "standard", outcome: "failure" },
      ],
    };
    await owner.creditSignature(sig);
    const rows = await owner.transcriptEntries();
    expect(rows).toHaveLength(2);
    const byDisc = new Map(rows.map((r) => [r.discipline, r]));
    expect(byDisc.get("appraisal")!.outcome).toBe("success");
    expect(byDisc.get("mixology")!.outcome).toBe("failure");
  });

  it("shares one act timestamp across all sub-check rows", async () => {
    const owner = makeOwnerAt();
    const sig: ActSignature = {
      discipline: [
        { discipline: "a", difficulty: "easy", outcome: "success" },
        { discipline: "b", difficulty: "easy", outcome: "success" },
      ],
    };
    await owner.creditSignature(sig, { when: 999 });
    const rows = await owner.transcriptEntries();
    expect(rows.map((r) => r.when)).toEqual([999, 999]);
  });

  it("ignores the disposition channel (the lane-1 trait seam)", async () => {
    const owner = makeOwnerAt();
    const sig: ActSignature = {
      discipline: [
        { discipline: "mixology", difficulty: "standard", outcome: "success" },
      ],
      dispositionValence: [{ disposition: "honesty", valence: -1 }],
    };
    await owner.creditSignature(sig);
    const rows = await owner.transcriptEntries();
    expect(rows).toHaveLength(1);
    expect(rows[0]!.discipline).toBe("mixology");
    // No disposition leaked into the persisted row shape.
    expect("disposition" in rows[0]!).toBe(false);
  });

  it("recordDeed writes a single deed row and stamps the clock", async () => {
    const owner = makeOwnerAt();
    await owner.creditDeed({
      discipline: "darts",
      difficulty: "standard",
      outcome: "critical",
    });
    const [row] = await owner.transcriptEntries();
    expect(row!.kind).toBe("deed");
    expect(row!.discipline).toBe("darts");
    expect(row!.outcome).toBe("critical");
    expect(row!.when).toBe(WorldClockApi.getNow().rawValue());
    expect(typeof row!.when).toBe("number");
  });

  it("reads owner-scoped and per-Discipline", async () => {
    const owner = makeOwnerAt();
    await owner.creditDeed({
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    await owner.creditDeed({
      discipline: "darts",
      difficulty: "easy",
      outcome: "failure",
    });
    expect(await owner.transcriptEntries()).toHaveLength(2);
    const mix = await owner.transcriptEntries("mixology");
    expect(mix).toHaveLength(1);
    expect(mix[0]!.discipline).toBe("mixology");
  });

  it("records claim provenance when asked", async () => {
    const owner = makeOwnerAt();
    await owner.creditSignature({
        discipline: [
          { discipline: "recipe-knowledge", difficulty: "easy", outcome: "success" },
        ],
      },
      { kind: "claim" }
    );
    const [row] = await owner.transcriptEntries();
    expect(row!.kind).toBe("claim");
  });

  it("keeps owners separate (durable templatePath keying)", async () => {
    const a = makeOwnerAt();
    const b = makeOwnerAt();
    await a.creditDeed({
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(await a.transcriptEntries()).toHaveLength(1);
    expect(await b.transcriptEntries()).toHaveLength(0);
  });

  it("no-ops without a durable owner key", async () => {
    const keyless = makeStuff(() => new AdvancingIdea());
    await keyless.creditDeed({
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(store.size).toBe(0);
    expect(await keyless.transcriptEntries()).toEqual([]);
  });

  it("no-ops when disconnected", async () => {
    const owner = makeOwnerAt();
    vi.spyOn(PersistenceManager.get(), "isConnected").mockReturnValue(false);
    await owner.creditDeed({
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(store.size).toBe(0);
  });
});

describe("Competence derive-on-read", () => {
  it("bandFor derives a band from the Transcript", async () => {
    const owner = makeOwnerAt();
    expect(await owner.competenceBandFor("mixology")).toBe("untrained");
    for (let i = 0; i < 3; i++) {
      await owner.creditDeed({
        discipline: "mixology",
        difficulty: "hard",
        outcome: "success",
      });
    }
    const band = await owner.competenceBandFor("mixology");
    expect(band).not.toBe("untrained");
  });

  it("bandFor never surfaces a number (the honesty firewall)", async () => {
    const owner = makeOwnerAt();
    await owner.creditDeed({
      discipline: "mixology",
      difficulty: "hard",
      outcome: "success",
    });
    const band = await owner.competenceBandFor("mixology");
    expect(typeof band).toBe("string");
    expect(Number.isNaN(Number(band))).toBe(true);
  });

  it("derive-on-read persists nothing — reads never write a row", async () => {
    const owner = makeOwnerAt();
    await owner.creditDeed({
      discipline: "darts",
      difficulty: "standard",
      outcome: "success",
    });
    const sizeAfterWrite = store.size;
    const saveSpy = vi.spyOn(PersistenceManager.get(), "save");
    await owner.competenceBandFor("darts");
    await owner.competenceBands();
    await owner.competenceBandFor("darts");
    expect(saveSpy).not.toHaveBeenCalled();
    expect(store.size).toBe(sizeAfterWrite);
  });

  it("bandsFor reports one band per Discipline with evidence", async () => {
    const owner = makeOwnerAt();
    await owner.creditDeed({
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    await owner.creditDeed({
      discipline: "darts",
      difficulty: "easy",
      outcome: "failure",
    });
    const bands = await owner.competenceBands();
    expect(bands.map((b) => b.discipline)).toEqual(["darts", "mixology"]);
    for (const b of bands) expect(typeof b.band).toBe("string");
  });

  it("bandsFor is empty for a character with no evidence", async () => {
    const owner = makeOwnerAt();
    expect(await owner.competenceBands()).toEqual([]);
  });
});
