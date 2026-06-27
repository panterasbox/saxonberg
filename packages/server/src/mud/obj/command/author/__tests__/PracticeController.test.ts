/**
 * PracticeController — the developer harness that fabricates one Transcript
 * deed. Asserts: a valid invocation records a deed and echoes the resulting
 * band; defaults fill difficulty/outcome; bad difficulty/outcome rejects
 * (a `controller-rejected` note, no row written).
 *
 * The emitted scene body is captured by stubbing `MessageApi.scene`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import PracticeController from "../PracticeController";
import { AdvancementApi } from "../../../../api/advancement";
import { MessageApi } from "../../../../api/message";
import { Mml } from "../../../../api/mml";
import { Idea } from "../../../../lib/stuff/Idea";
import { StuffApi } from "../../../../api/stuff";
import { WorldClockApi } from "../../../../api/worldclock";
import { PersistenceManager } from "../../../../../backend/PersistenceManager";
import {
  makeStuff,
  makeStuffAtPath,
} from "../../../../lib/security/__tests__/test-setup";
import type { CommandContext, CommandModel } from "../../../../api/command";

let store: Map<string, Record<string, unknown>>;
let idCounter = 0;
let captured: Mml | null;

function captureBody(): void {
  captured = null;
  vi.spyOn(MessageApi, "scene").mockImplementation(() => {
    const b: Record<string, unknown> = {};
    b.topic = () => b;
    b.toSelf = (body: Mml) => {
      captured = body;
      return b;
    };
    b.send = () => {};
    return b as never;
  });
}

let note: ReturnType<typeof vi.fn>;

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
  WorldClockApi._setNowProviderForTesting(() => 100);
  captureBody();
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
  StuffApi.clearAll();
});

function ctxFor(actor: Idea): CommandContext {
  note = vi.fn();
  return {
    commandGiver: actor as never,
    note,
  } as unknown as CommandContext;
}

interface PracticeArgs extends CommandModel {
  discipline?: string;
  difficulty?: string;
  outcome?: string;
}

describe("PracticeController", () => {
  it("records a deed and echoes the resulting band", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/prac");
    const ctrl = makeStuff(() => new PracticeController());
    await ctrl.execute(
      { discipline: "mixology", difficulty: "hard", outcome: "critical" } as PracticeArgs,
      ctxFor(actor)
    );

    const rows = await AdvancementApi.entriesFor(actor, "mixology");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe("deed");
    expect(rows[0]!.difficulty).toBe("hard");
    expect(captured!.toString()).toContain("mixology");
  });

  it("defaults difficulty to standard and outcome to success", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/prac-default");
    const ctrl = makeStuff(() => new PracticeController());
    await ctrl.execute({ discipline: "darts" } as PracticeArgs, ctxFor(actor));

    const [row] = await AdvancementApi.entriesFor(actor, "darts");
    expect(row!.difficulty).toBe("standard");
    expect(row!.outcome).toBe("success");
  });

  it("rejects a bad difficulty without writing a row", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/prac-bad");
    const ctrl = makeStuff(() => new PracticeController());
    await ctrl.execute(
      { discipline: "mixology", difficulty: "ludicrous" } as PracticeArgs,
      ctxFor(actor)
    );

    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected" })
    );
    expect(store.size).toBe(0);
  });

  it("rejects a missing discipline", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/prac-none");
    const ctrl = makeStuff(() => new PracticeController());
    await ctrl.execute({} as PracticeArgs, ctxFor(actor));

    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "controller-rejected" })
    );
    expect(store.size).toBe(0);
  });
});
