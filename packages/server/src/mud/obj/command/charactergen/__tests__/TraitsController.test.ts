/**
 * TraitsController — the defining-traits self-view render. Asserts: a
 * pole-label + band per pronounced axis; the empty state; near-neutral
 * axes absent; and the honesty firewall — no raw magnitude reaches the
 * body.
 *
 * Evidence is seeded through `TraitApi` against the in-memory PM stub; the
 * emitted scene body is captured by stubbing `MessageApi.scene`.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import TraitsController from "../TraitsController";
import { TraitApi } from "../../../../api/trait";
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

describe("TraitsController render", () => {
  it("renders a pole label + band per pronounced axis, never a number", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/tr");
    await TraitApi.recordDeed(actor, { disposition: "sociability", valence: 80 });
    await TraitApi.recordDeed(actor, { disposition: "temperance", valence: -80 });

    const ctrl = makeStuff(() => new TraitsController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    const body = captured!.toString();
    expect(body).toContain("Gregarious");
    expect(body).toContain("Gluttonous"); // temperance negative pole
    expect(body).toContain("entrenched");
    // The honesty firewall: the raw magnitude never surfaces.
    expect(body).not.toMatch(/[0-9]/);
  });

  it("omits near-neutral axes", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/tr-faint");
    // Below the pronounced threshold AND below the defined band.
    await TraitApi.recordDeed(actor, { disposition: "honesty", valence: 3 });

    const ctrl = makeStuff(() => new TraitsController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));

    expect(captured!.toString()).toContain("still taking shape");
  });

  it("renders the empty state with no evidence", async () => {
    const actor = makeStuffAtPath(() => new Idea(), "/obj/Avatar/tr-empty");
    const ctrl = makeStuff(() => new TraitsController());
    await ctrl.execute({} as CommandModel, ctxFor(actor));
    expect(captured!.toString()).toContain("still taking shape");
  });
});
