/**
 * Demonstration capture (P8) — a manual build's recorded commands
 * transcribe into a named, parameterized recipe-script, banked to the
 * builder's home path.
 *
 * Covers: the transcribed shape (`def <name> ($brand) { … }`), the base
 * spirit lifted to `$brand`, the `format()` round-trip (the emitted
 * source re-parses), replayability (the banked script registers an
 * invocable `def` that `make` finds + param-binds), and the no-op cases
 * (empty recipe / no recorded sources — a scripted build).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Transcriber } from "../Transcriber";
import { ScriptApi } from "../../../api/script";
import { AccessApi } from "../../../api/access";
import { ZoneApi } from "../../../api/zone";
import { CommandApi } from "../../../api/command";
import { ExecutionContextApi } from "../../../api/execution-context";
import { WorldClockApi } from "../../../api/worldclock";
import { PersistenceManager } from "../../../../backend/PersistenceManager";
import { Idea } from "../../stuff/Idea";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { SensorMixin } from "../../message/Sensor";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { makeStuffAtPath } from "../../security/__tests__/test-setup";

class TestGiver extends CommandGiverMixin(
  SensorMixin(ContainerMixin(ContainableMixin(Idea))),
) {
  protected override handleMessage(): void {}
  protected override handleEnvelope(): void {}
}

const OWNER = "/obj/Avatar/iris";
const HOME_PATH = "/home/iris/scripts/martini";
const BUILD = [
  "pour gin into shaker",
  "add vermouth",
  "stir",
  "strain into glass",
];

let scripts: Record<string, unknown>[];
let actor: TestGiver;

function runAs<T>(fn: () => T | Promise<T>): Promise<T> {
  return ExecutionContextApi.runRoot(Idea, "test", () => {
    ExecutionContextApi.tagActingAuthor(actor);
    return fn();
  }) as Promise<T>;
}

beforeEach(() => {
  CommandApi.clearCache();
  scripts = [];
  WorldClockApi._setNowProviderForTesting(() => 1000);
  const find = vi.fn(async (col: string, query: Record<string, unknown>) => {
    if (col === "scripts") {
      return scripts.filter((d) =>
        Object.entries(query).every(([k, v]) => d[k] === v),
      );
    }
    return [];
  });
  const save = vi.fn(async (col: string, doc: Record<string, unknown>) => {
    if (col === "scripts") {
      const i = scripts.findIndex((d) => d.path === doc.path);
      if (i >= 0) scripts[i] = { ...doc };
      else scripts.push({ ...doc, _id: String(scripts.length + 1) });
    }
    return "id";
  });
  vi.spyOn(PersistenceManager, "get").mockReturnValue({
    isConnected: () => true,
    save,
    find,
    findById: vi.fn(),
    delete: vi.fn(),
  } as unknown as PersistenceManager);
  vi.spyOn(ZoneApi, "resolveZoneForPath").mockResolvedValue(null);
  vi.spyOn(AccessApi, "can").mockResolvedValue(true);
  actor = makeStuffAtPath(() => new TestGiver(), OWNER);
});

afterEach(() => {
  vi.restoreAllMocks();
  WorldClockApi._resetForTesting();
});

describe("Transcriber.transcribe", () => {
  it("banks a def-shaped recipe-script with the base spirit lifted to $brand", async () => {
    const path = await runAs(() => Transcriber.transcribe("martini", BUILD));
    expect(path).toBe(HOME_PATH);

    const doc = scripts.find((s) => s.path === HOME_PATH)!;
    const source = doc.source as string;
    expect(source).toContain("def martini ($brand)");
    expect(source).toContain("pour $brand into shaker"); // lifted
    expect(source).not.toContain("pour gin"); // the concrete spirit is gone
    expect(source).toContain("add vermouth");
    expect(source).toContain("strain into glass");
  });

  it("emits real source that round-trips (re-parses to a def)", async () => {
    await runAs(() => Transcriber.transcribe("martini", BUILD));
    const source = (scripts[0]!.source as string);

    // Re-parse via the public ScriptApi.format round-trip property: the
    // banked source parses, and re-formatting is stable.
    const parser = await CommandApi.resolveParser("script");
    const result = await parser.parse(source, {
      commandGiver: actor as never,
      location: null,
      available: actor.getAvailableCommands(),
    });
    expect((result as { script?: unknown }).script).toBeDefined();
    const ast = (result as { script: { ast: import("../ast").Script } }).script.ast;
    expect(ScriptApi.format(ast)).toBe(source); // stable round-trip
    expect(ast.statements[0]!.commands[0]!.word).toBe("def");
  });

  it("the banked script is replayable: invoke registers a make-able def", async () => {
    const path = await runAs(() => Transcriber.transcribe("martini", BUILD));
    // Loading the banked recipe-script registers the `martini` def...
    await runAs(() => ScriptApi.invokeByPath(path!));
    // ...so `make martini with rum` finds it and binds the param (the body
    // dispatches over the bus — declines here without the bar, but the
    // named recipe is invocable, which is the point).
    const made = await runAs(() => ScriptApi.invoke("martini", ["rum"]));
    expect(made).toBe(true);
  });

  it("captures nothing for an empty recipe or a scripted build (no sources)", async () => {
    expect(await runAs(() => Transcriber.transcribe("", BUILD))).toBeNull();
    expect(await runAs(() => Transcriber.transcribe("martini", []))).toBeNull();
    expect(scripts).toHaveLength(0);
  });
});
