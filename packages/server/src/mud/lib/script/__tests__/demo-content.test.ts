/**
 * P10 — authored demo content proves the engine over general substrate.
 *
 * Three independent proofs:
 *  - **the authored `.script` files are valid language** — each parses to
 *    a `Script` AST (no error), and round-trips through `format()`
 *    idempotently (so the bar's authored recipe-/coroutine-scripts are
 *    real source the CMS can show + edit, not opaque content);
 *  - **the `ScriptSeeder` banks them** into the path-addressed store at
 *    `/domain/lounge/scripts/<name>`, idempotently (the live-content wire);
 *  - **the engine runs those shapes paced over the real bus** — a
 *    multi-statement script dispatches each statement through the bus, and
 *    a `wait` suspends the detached run until the GAME clock advances (the
 *    coroutine pacing the closing-time `last-call` beat depends on).
 *
 * The crafting-integration execution of a recipe-script (`make` →
 * pour/stir/strain, paced on engagement) is proven by the P4/P6/P8 suites
 * (manual-build, named-scripts, Transcriber); here the `ping` harness
 * stands in for the build verbs so the engine proofs need no animate body.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import Location from "../../stuff/Location";
import { Idea } from "../../stuff/Idea";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { EnvironmentMixin } from "../../shell/Environment";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainerMixin } from "../../spatial/Container";
import { SensorMixin } from "../../message/Sensor";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi } from "../../../api/command";
import { ScriptApi } from "../../../api/script";
import { WorldClockApi } from "../../../api/worldclock";
import { StoredDocument } from "../../document/StoredDocument";
import { ScriptSeeder } from "../../../../backend/ScriptSeeder";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  PersistenceManager,
  Collections,
} from "../../../../backend/PersistenceManager";
import type { EnvelopeTemplate } from "@saxonberg/types";

const SCRIPTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../domain/lounge/scripts",
);
const DEMO_SCRIPTS = ["martini", "daiquiri", "last-call"];

function readDemo(name: string): string {
  return readFileSync(join(SCRIPTS_DIR, `${name}.script`), "utf-8");
}

const TestGiverBase = CommandGiverMixin(
  EnvironmentMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
    self: ["system/ping.yaml"],
    environment: [],
    inventory: [],
    peers: [],
  };
  public envelopes: EnvelopeTemplate[] = [];
  protected override handleMessage(): void {}
  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    this.envelopes.push(envelope);
  }
}

/* ───────────── authored content is valid language ───────────── */

describe("authored demo scripts are valid language", () => {
  let giver: TestGiver;

  beforeEach(() => {
    CommandApi.clearCache();
    giver = makeStuff(() => new TestGiver());
  });
  afterEach(() => vi.restoreAllMocks());

  async function parseDemo(name: string) {
    const parser = await CommandApi.resolveParser("script");
    return parser.parse(readDemo(name), {
      commandGiver: giver,
      location: null,
      available: giver.getAvailableCommands(),
    });
  }

  for (const name of DEMO_SCRIPTS) {
    it(`${name}.script parses to a Script AST (comments and all)`, async () => {
      const result = await parseDemo(name);
      expect(result.error).toBeUndefined();
      expect(result.script).toBeDefined();
      expect(result.script!.ast.statements.length).toBeGreaterThan(0);
    });

    it(`${name}.script round-trips through format() idempotently`, async () => {
      const first = await parseDemo(name);
      const canonical = ScriptApi.format(first.script!.ast);
      // Re-parsing the formatted source yields the same canonical source —
      // format∘parse is stable (comments are dropped; structure is exact).
      const second = await (
        await CommandApi.resolveParser("script")
      ).parse(canonical, {
        commandGiver: giver,
        location: null,
        available: giver.getAvailableCommands(),
      });
      expect(second.script).toBeDefined();
      expect(ScriptApi.format(second.script!.ast)).toBe(canonical);
    });
  }

  it("martini lifts its base spirit to the $brand param", async () => {
    const result = await parseDemo("martini");
    const canonical = ScriptApi.format(result.script!.ast);
    expect(canonical).toContain("def martini");
    expect(canonical).toContain("$brand"); // the parameterized base pour
  });
});

/* ───────────────── ScriptSeeder banks them live ───────────────── */

describe("ScriptSeeder banks the authored scripts", () => {
  let store: Map<string, Record<string, unknown>>;

  beforeEach(() => {
    store = new Map();
    let idc = 0;
    const pm = PersistenceManager.get();
    vi.spyOn(pm, "isConnected").mockReturnValue(true);
    vi.spyOn(pm, "find").mockImplementation(
      async (_c: string, query: Record<string, unknown>) =>
        [...store.values()].filter((d) =>
          Object.entries(query).every(([k, v]) => d[k] === v),
        ) as never,
    );
    vi.spyOn(pm, "save").mockImplementation(
      async (_c: string, doc: Record<string, unknown>) => {
        const id = (doc._id as string | undefined) ?? `id-${idc++}`;
        store.set(id, { ...doc, _id: id });
        return id;
      },
    );
  });
  afterEach(() => vi.restoreAllMocks());

  it("seeds each .script at /domain/lounge/scripts/<name>, idempotently", async () => {
    const inserted = await ScriptSeeder.run();
    expect(inserted).toBeGreaterThanOrEqual(DEMO_SCRIPTS.length);

    const martini = await StoredDocument.findByPath(
      "/domain/lounge/scripts/martini",
    );
    expect(martini).not.toBeNull();
    expect(martini!.getKind()).toBe("script");
    expect(martini!.getOwner()).toBe("/domain/lounge");
    expect((martini!.getData().source as string)).toBe(readDemo("martini"));

    // Re-running inserts nothing (matched by path).
    const again = await ScriptSeeder.run();
    expect(again).toBe(0);
  });
});

/* ───────────── the engine runs the shapes, paced ───────────── */

describe("the engine runs authored shapes paced over the bus", () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    WorldClockApi._resetForTesting();
    WorldClockApi.setScale(1);
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        if (
          collection === Collections.Domain &&
          query.path === "/obj/command/system/PingController"
        ) {
          return [
            {
              path: "/obj/command/system/PingController",
              class: "/obj/command/system/PingController",
              data: {},
            },
          ];
        }
        return [];
      },
    );
    vi.spyOn(PersistenceManager, "get").mockReturnValue({
      save: vi.fn(),
      find,
      findById: vi.fn(),
    } as unknown as PersistenceManager);

    location = makeStuff(() => new Location());
    giver = makeStuff(() => new TestGiver());
    ContainmentApi.move(giver, location);
    giver.setSetting("shell.parser", "script", giver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    WorldClockApi._resetForTesting();
  });

  function pingCount(spy: { mock: { calls: unknown[][] } }): number {
    return spy.mock.calls.filter(
      (c) =>
        (
          c[1] as { command: { getPrimaryVerb(): string } }
        ).command.getPrimaryVerb() === "ping",
    ).length;
  }

  it("dispatches every statement of an inline multi-statement script", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("ping; ping; ping");
    expect(pingCount(resolveModel)).toBe(3);
  });

  it("a wait suspends the detached run until the game clock advances", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");

    // The run detaches at the `wait` (the prompt stays live): only the
    // first ping has dispatched.
    await giver.executeCommand("ping; wait 2s; ping");
    expect(pingCount(resolveModel)).toBe(1);

    // Advance the GAME clock past the wait → the pump resumes → the
    // second ping dispatches.
    WorldClockApi._advanceForTesting(2000);
    await new Promise<void>((r) => setTimeout(r, 0));
    expect(pingCount(resolveModel)).toBe(2);
  });
});
