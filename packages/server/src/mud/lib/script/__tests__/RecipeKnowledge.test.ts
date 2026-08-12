/**
 * RecipeKnowledge (P9) — the per-character recipe-learning ladder derived
 * on read from the chronicle ledger (the renown precedent: dumb store,
 * smart consumer).
 *
 *   unknown → known-of (claim, on reading) → can-make (deed, first build)
 *
 * Covers: reading marks known-of without duplicating (recordOnce on the
 * `recipe-known:` key); the first build banks the can-make deed under a
 * **distinct** `recipe-made:` key (so the deed doesn't no-op on the
 * claim's row); claim and deed are independent (knowing-of never implies
 * can-make); and both are owner-scoped.
 *
 * Mongo is faked with the same in-memory PM harness the ChronicleApi
 * tests use (find / save round-trip the chronicle entries the ladder
 * derives over).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RecipeKnowledge } from "../RecipeKnowledge";
import { ChronicleApi } from "../../../api/chronicle";
import { Idea } from "../../stuff/Idea";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let counter = 0;

function makeActor(): Idea {
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
        Object.entries(query).every(([k, v]) => d[k] === v),
      ) as never,
  );
  vi.spyOn(pm, "save").mockImplementation(
    async (_col: string, doc: Record<string, unknown>) => {
      const id = (doc._id as string | undefined) ?? `id-${idCounter++}`;
      store.set(id, { ...doc, _id: id });
      return id;
    },
  );
  WorldClockApi._setNowProviderForTesting(() => 4242);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("RecipeKnowledge ladder", () => {
  it("unknown recipe is neither known-of nor can-make", async () => {
    const actor = makeActor();
    expect(await RecipeKnowledge.knowsOf(actor, "martini")).toBe(false);
    expect(await RecipeKnowledge.canMake(actor, "martini")).toBe(false);
  });

  it("reading marks known-of (and re-reading does not duplicate)", async () => {
    const actor = makeActor();
    await RecipeKnowledge.noteKnown(actor, "martini", "Martini");
    expect(await RecipeKnowledge.knowsOf(actor, "martini")).toBe(true);
    // Known-of does not imply can-make — the book isn't enough.
    expect(await RecipeKnowledge.canMake(actor, "martini")).toBe(false);

    await RecipeKnowledge.noteKnown(actor, "martini", "Martini");
    const entries = await ChronicleApi.entriesFor(actor);
    expect(entries.filter((e) => e.tags?.includes("recipe"))).toHaveLength(1);
  });

  it("the first build banks can-make under a distinct key (claim survives)", async () => {
    const actor = makeActor();
    await RecipeKnowledge.noteKnown(actor, "martini", "Martini");
    await RecipeKnowledge.noteMade(actor, "martini", "Martini");

    expect(await RecipeKnowledge.knowsOf(actor, "martini")).toBe(true);
    expect(await RecipeKnowledge.canMake(actor, "martini")).toBe(true);

    // Distinct keys: claim + deed are two rows, not one clobbered row.
    const entries = await ChronicleApi.entriesFor(actor);
    expect(entries).toHaveLength(2);
    expect(entries.some((e) => e.kind === "claim")).toBe(true);
    expect(entries.some((e) => e.kind === "deed")).toBe(true);
  });

  it("noteMade is idempotent — a second build banks no new deed", async () => {
    const actor = makeActor();
    await RecipeKnowledge.noteMade(actor, "martini", "Martini");
    await RecipeKnowledge.noteMade(actor, "martini", "Martini");
    const entries = await ChronicleApi.entriesFor(actor);
    expect(entries.filter((e) => e.kind === "deed")).toHaveLength(1);
  });

  it("can-make without ever reading — building is its own teacher", async () => {
    const actor = makeActor();
    await RecipeKnowledge.noteMade(actor, "negroni", "Negroni");
    expect(await RecipeKnowledge.canMake(actor, "negroni")).toBe(true);
    expect(await RecipeKnowledge.knowsOf(actor, "negroni")).toBe(false);
  });

  it("knowledge is owner-scoped — one actor's deed isn't another's", async () => {
    const a = makeActor();
    const b = makeActor();
    await RecipeKnowledge.noteMade(a, "martini", "Martini");
    expect(await RecipeKnowledge.canMake(a, "martini")).toBe(true);
    expect(await RecipeKnowledge.canMake(b, "martini")).toBe(false);
  });
});
