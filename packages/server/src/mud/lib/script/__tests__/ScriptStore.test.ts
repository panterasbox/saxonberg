/**
 * Path-addressed script store (P7) — save / resolve+invoke / go-live, the
 * access gate, and provenance recording.
 *
 * A saved script persists keyed on its path; resolving + invoking it by
 * path dispatches its commands over the bus; editing it (re-save →
 * go-live) and re-invoking reflects the change without a restart; a
 * denied access check refuses the write; and a save appends an authoring
 * row — proving the broadened provenance gate admits the script store
 * (`recordAuthoring`, called from ScriptLogic, doesn't deny).
 *
 * The acting author is stamped via `runRoot` + `tagActingAuthor` (the CMS
 * REST attribution bridge), so the store ops resolve the actor exactly as
 * they would over the real CMS path.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ScriptApi } from "../../../api/script";
import { StoredDocument } from "../../document/StoredDocument";
import { AccessApi } from "../../../api/access";
import { CommandApi } from "../../../api/command";
import { ExecutionContextApi } from "../../../api/execution-context";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../stuff/Idea";
import { Stuff } from "../../stuff/Stuff";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { SensorMixin } from "../../message/Sensor";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import {
  makeStuffAtPath,
} from "../../security/__tests__/test-setup";

class TestGiver extends CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  static override commandContributions = {
      peers: [],
    self: ["platform/cmd/system/ping.yaml"],
    environment: [],
  };
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

const OWNER = "/home/test";
const SCRIPT_PATH = "/home/test/scripts/greet";

let scripts: Record<string, unknown>[];
let authoring: Record<string, unknown>[];
let actor: TestGiver;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Stuff, "test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  CommandApi.clearCache();
  scripts = [];
  authoring = [];
  WorldClockApi._setNowProviderForTesting(() => 1000);

  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    const match = (rows: Record<string, unknown>[]) =>
      rows.filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      );
    if (col === "documents") return match(scripts);
    if (col === "authoring_events") return match(authoring);
    if (
      col === "content" &&
      query.path === "/platform/idea/cmd/system/PingController"
    ) {
      return [
        {
          path: query.path,
          class: "/platform/idea/cmd/system/PingController",
          data: {},
        },
      ];
    }
    return [];
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col === "documents") {
      const i = scripts.findIndex((d) => d.path === doc.path);
      if (i >= 0) scripts[i] = { ...doc };
      else scripts.push({ ...doc, _id: String(scripts.length + 1) });
    } else if (col === "authoring_events") {
      authoring.push({ ...doc, _id: String(authoring.length + 1) });
    }
    return (doc._id as string) ?? "id";
  });
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);

  // Default: path resolves to no zone → the slice-walk can(write) gate.
  vi.spyOn(AccessApi, "can").mockResolvedValue(true);
  vi.spyOn(AccessApi, "canAtPath").mockResolvedValue(true);

  actor = makeStuffAtPath(() => new TestGiver(), OWNER);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("script store — save", () => {
  it("persists a script keyed on its path, with owner + a provenance row", async () => {
    await runAs(() => ScriptApi.saveScript(SCRIPT_PATH, "ping; ping"));

    const doc = await StoredDocument.findByPath(SCRIPT_PATH);
    expect(doc).not.toBeNull();
    // Scripts are one kind of stored document: kind=msh, data={source}.
    expect(doc!.getKind()).toBe("msh");
    expect((doc!.getData().source as string)).toBe("ping; ping");
    expect(doc!.getOwner()).toBe(OWNER);

    // Provenance: a row was appended for the path (proves the broadened
    // gate admits the document store — else recordAuthoring would throw).
    expect(authoring.some((r) => r.path === SCRIPT_PATH)).toBe(true);
    expect(authoring[0]!.author).toBe(OWNER);
  });

  it("refuses the write to a path the author doesn't own when access is denied", async () => {
    // A foreign `/home/<other>/` path the `/home/test` actor doesn't own
    // → not the self-home base case → the slice-walk `can(write)` applies.
    vi.spyOn(AccessApi, "can").mockResolvedValue(false);
    vi.spyOn(AccessApi, "canAtPath").mockResolvedValue(false);
    await expect(
      runAs(() => ScriptApi.saveScript("/home/other/scripts/greet", "ping")),
    ).rejects.toThrow();
    expect(scripts).toHaveLength(0);
  });

  it("permits a self-home write even when slice-walk access is denied", async () => {
    // A player owns their own `/home/<self>/` subtree — the
    // demonstration-capture home-bank — so a self-home write does not
    // consult `AccessApi.can`. (Regression: the home-bank transcribe was
    // wrongly denied for ordinary players.)
    vi.spyOn(AccessApi, "can").mockResolvedValue(false);
    vi.spyOn(AccessApi, "canAtPath").mockResolvedValue(false);
    await runAs(() => ScriptApi.saveScript(SCRIPT_PATH, "ping; ping"));
    const doc = await StoredDocument.findByPath(SCRIPT_PATH);
    expect(doc).not.toBeNull();
    expect((doc!.getData().source as string)).toBe("ping; ping");
  });

  it("captureManualBuild banks the recipe-script in an authorless frame", async () => {
    // The strain step's engaged completion runs in the scheduler's
    // **authorless** `runRoot('completion')` frame. `captureManualBuild`
    // must stamp the builder as acting author itself (a controller can't
    // push/tag frames — the bug this guards) and bank the transcribed
    // recipe to the builder's own `/home/<self>/` store. No giver, no
    // pre-tag here — exactly the scheduler-completion scenario.
    vi.spyOn(AccessApi, "can").mockResolvedValue(false);
    vi.spyOn(AccessApi, "canAtPath").mockResolvedValue(false); // self-home only
    const path = await ExecutionContextApi.runRoot(Stuff, "completion", () =>
      ScriptApi.captureManualBuild(actor, "martini", "Gin Martini", [
        "pour gin into shaker",
        "stir shaker",
      ]),
    );
    expect(path).toBe("/home/test/scripts/martini");
    const doc = await StoredDocument.findByPath(path!);
    expect(doc).not.toBeNull();
    expect((doc!.getData().source as string)).toContain("def martini");
  });
});

describe("script store — resolve + invoke by path, edit goes live", () => {
  function pingCount(spy: { mock: { calls: unknown[][] } }): number {
    return spy.mock.calls.filter(
      (c) =>
        (c[1] as { command: { getPrimaryVerb(): string } }).command.getPrimaryVerb() ===
        "ping",
    ).length;
  }

  it("resolves + invokes a stored script, and an edit reflects on re-invoke", async () => {
    await runAs(() => ScriptApi.saveScript(SCRIPT_PATH, "ping; ping"));

    const first = vi.spyOn(CommandApi, "resolveModel");
    const invoked = await runAs(() => ScriptApi.invokeByPath(SCRIPT_PATH));
    expect(invoked).toBe(true);
    expect(pingCount(first)).toBe(2);
    first.mockRestore();

    // Edit the stored source (re-save → go-live invalidates the cache).
    await runAs(() => ScriptApi.saveScript(SCRIPT_PATH, "ping; ping; ping"));

    const second = vi.spyOn(CommandApi, "resolveModel");
    await runAs(() => ScriptApi.invokeByPath(SCRIPT_PATH));
    expect(pingCount(second)).toBe(3); // re-resolved — the edit went live
  });

  it("returns false invoking a path with no stored script", async () => {
    const invoked = await runAs(() =>
      ScriptApi.invokeByPath("/home/test/scripts/missing"),
    );
    expect(invoked).toBe(false);
  });
});
