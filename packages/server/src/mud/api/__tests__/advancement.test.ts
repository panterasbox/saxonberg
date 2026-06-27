/**
 * AdvancementApi — the gated Transcript append/read surface. Covers:
 * recordSignature explodes one act into per-Discipline rows sharing a
 * single timestamp; the disposition channel is ignored; recordDeed forces
 * a single deed row; the reader is owner-scoped + per-Discipline; claim
 * provenance round-trips; disconnected / keyless owners no-op.
 *
 * Mongo is faked with an in-memory collection (the chronicle harness): we
 * stub PM's find / save surface — the same wrappers `TranscriptEntry` uses.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AdvancementApi } from "../advancement";
import type { ActSignature } from "../../lib/advancement/ActSignature";
import { Idea } from "../../lib/stuff/Idea";
import { WorldClockApi } from "../worldclock";
import { PersistenceManager } from "../../../backend/PersistenceManager";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../lib/security/__tests__/test-setup";

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

function makeOwnerAt(): Idea {
  return makeStuffAtPath(() => new Idea(), `/obj/Avatar/p${counter++}`);
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

describe("AdvancementApi Transcript append + read", () => {
  it("recordSignature explodes one act into per-Discipline rows", async () => {
    const owner = makeOwnerAt();
    const sig: ActSignature = {
      discipline: [
        { discipline: "appraisal", difficulty: "hard", outcome: "success" },
        { discipline: "mixology", difficulty: "standard", outcome: "failure" },
      ],
    };
    await AdvancementApi.recordSignature(owner, sig);
    const rows = await AdvancementApi.entriesFor(owner);
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
    await AdvancementApi.recordSignature(owner, sig, { when: 999 });
    const rows = await AdvancementApi.entriesFor(owner);
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
    await AdvancementApi.recordSignature(owner, sig);
    const rows = await AdvancementApi.entriesFor(owner);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.discipline).toBe("mixology");
    // No disposition leaked into the persisted row shape.
    expect("disposition" in rows[0]!).toBe(false);
  });

  it("recordDeed writes a single deed row and stamps the clock", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordDeed(owner, {
      discipline: "darts",
      difficulty: "standard",
      outcome: "critical",
    });
    const [row] = await AdvancementApi.entriesFor(owner);
    expect(row!.kind).toBe("deed");
    expect(row!.discipline).toBe("darts");
    expect(row!.outcome).toBe("critical");
    expect(row!.when).toBe(WorldClockApi.getNow().rawValue());
    expect(typeof row!.when).toBe("number");
  });

  it("reads owner-scoped and per-Discipline", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordDeed(owner, {
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    await AdvancementApi.recordDeed(owner, {
      discipline: "darts",
      difficulty: "easy",
      outcome: "failure",
    });
    expect(await AdvancementApi.entriesFor(owner)).toHaveLength(2);
    const mix = await AdvancementApi.entriesFor(owner, "mixology");
    expect(mix).toHaveLength(1);
    expect(mix[0]!.discipline).toBe("mixology");
  });

  it("records claim provenance when asked", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordSignature(
      owner,
      {
        discipline: [
          { discipline: "recipe-knowledge", difficulty: "easy", outcome: "success" },
        ],
      },
      { kind: "claim" }
    );
    const [row] = await AdvancementApi.entriesFor(owner);
    expect(row!.kind).toBe("claim");
  });

  it("keeps owners separate (durable templatePath keying)", async () => {
    const a = makeOwnerAt();
    const b = makeOwnerAt();
    await AdvancementApi.recordDeed(a, {
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(await AdvancementApi.entriesFor(a)).toHaveLength(1);
    expect(await AdvancementApi.entriesFor(b)).toHaveLength(0);
  });

  it("no-ops without a durable owner key", async () => {
    const keyless = makeStuff(() => new Idea());
    await AdvancementApi.recordDeed(keyless, {
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(store.size).toBe(0);
    expect(await AdvancementApi.entriesFor(keyless)).toEqual([]);
  });

  it("no-ops when disconnected", async () => {
    const owner = makeOwnerAt();
    vi.spyOn(PersistenceManager.get(), "isConnected").mockReturnValue(false);
    await AdvancementApi.recordDeed(owner, {
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    expect(store.size).toBe(0);
  });
});

describe("AdvancementApi Competence derive-on-read", () => {
  it("bandFor derives a band from the Transcript", async () => {
    const owner = makeOwnerAt();
    expect(await AdvancementApi.bandFor(owner, "mixology")).toBe("untrained");
    for (let i = 0; i < 3; i++) {
      await AdvancementApi.recordDeed(owner, {
        discipline: "mixology",
        difficulty: "hard",
        outcome: "success",
      });
    }
    const band = await AdvancementApi.bandFor(owner, "mixology");
    expect(band).not.toBe("untrained");
  });

  it("bandFor never surfaces a number (the honesty firewall)", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordDeed(owner, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "success",
    });
    const band = await AdvancementApi.bandFor(owner, "mixology");
    expect(typeof band).toBe("string");
    expect(Number.isNaN(Number(band))).toBe(true);
  });

  it("derive-on-read persists nothing — reads never write a row", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordDeed(owner, {
      discipline: "darts",
      difficulty: "standard",
      outcome: "success",
    });
    const sizeAfterWrite = store.size;
    const saveSpy = vi.spyOn(PersistenceManager.get(), "save");
    await AdvancementApi.bandFor(owner, "darts");
    await AdvancementApi.bandsFor(owner);
    await AdvancementApi.bandFor(owner, "darts");
    expect(saveSpy).not.toHaveBeenCalled();
    expect(store.size).toBe(sizeAfterWrite);
  });

  it("bandsFor reports one band per Discipline with evidence", async () => {
    const owner = makeOwnerAt();
    await AdvancementApi.recordDeed(owner, {
      discipline: "mixology",
      difficulty: "standard",
      outcome: "success",
    });
    await AdvancementApi.recordDeed(owner, {
      discipline: "darts",
      difficulty: "easy",
      outcome: "failure",
    });
    const bands = await AdvancementApi.bandsFor(owner);
    expect(bands.map((b) => b.discipline)).toEqual(["darts", "mixology"]);
    for (const b of bands) expect(typeof b.band).toBe("string");
  });

  it("bandsFor is empty for a character with no evidence", async () => {
    const owner = makeOwnerAt();
    expect(await AdvancementApi.bandsFor(owner)).toEqual([]);
  });
});
