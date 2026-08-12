/**
 * CompetenceController — the bands-only self-view render. Asserts: a band
 * per practiced Discipline; the empty state; and the honesty firewall —
 * **no number** ever reaches the body.
 *
 * Evidence is seeded through `AdvancementApi` against the in-memory PM
 * stub; the emitted scene body is captured by stubbing `MessageApi.scene`.
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CompetenceController from "../CompetenceController";
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
  return {
    commandGiver: actor as never,
    note: vi.fn(),
  } as unknown as CommandContext;
}

describe("CompetenceController render", () => {
  it("renders a band per practiced Discipline, and never a number", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/comp");
    await AdvancementApi.recordDeed(actor, {
      discipline: "mixology",
      difficulty: "hard",
      outcome: "critical",
    });
    await AdvancementApi.recordDeed(actor, {
      discipline: "darts",
      difficulty: "easy",
      outcome: "success",
    });

    const ctrl = makeStuff(() => new CompetenceController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain("mixology");
    expect(body).toContain("darts");
    // The honesty firewall: bands surface, the internal theta never does.
    expect(body).not.toMatch(/[0-9]/);
  });

  it("renders an empty-state line when there is no evidence", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/comp-empty");
    const ctrl = makeStuff(() => new CompetenceController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain("not yet practiced");
  });
});
