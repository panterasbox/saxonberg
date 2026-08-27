/**
 * P10 — authored demo content proves the engine over general substrate.
 *
 * Three independent proofs:
 *  - **the authored `.script` files are valid language** — each parses to
 *    a `Script` AST (no error), and round-trips through `format()`
 *    idempotently (so the bar's authored recipe-/coroutine-scripts are
 *    real source the CMS can show + edit, not opaque content);
 *  - **the `saxonberg-lounge` pack installs them** into the path-addressed
 *    store at `/world/lounge/msh/<name>` (the `msh` document kind),
 *    idempotently — a second install is all-zero (the live-content wire);
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

import "../../../../test-bootstrap";
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
import { PackApi } from "../../../api/pack";
import {
  stubPersist,
  quietConsole,
  rowsOfKind,
  writePack,
  writeScriptFile,
  cleanupPacks,
} from "../../../obj/api/__tests__/pack-harness";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  PersistenceManager,
  Collections,
} from "../../../../backend/PersistenceManager";
import type { EnvelopeTemplate } from "@saxonberg/types";

// The authored exemplars live in the `saxonberg-lounge` content pack
// (`content/msh/*.msh`), not in the kernel tree.
const SCRIPTS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../../content/saxonberg-lounge/content/msh",
);
const DEMO_SCRIPTS = ["martini", "daiquiri", "last-call"];

function readDemo(name: string): string {
  return readFileSync(join(SCRIPTS_DIR, `${name}.msh`), "utf-8");
}

const TestGiverBase = CommandGiverMixin(
  EnvironmentMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ["system/ping.yaml"],
    environment: [],
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

/* ───────────── the lounge pack installs them live ───────────── */

describe("the saxonberg-lounge pack installs the authored scripts", () => {
  beforeEach(() => {
    stubPersist();
    quietConsole();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    cleanupPacks();
  });

  it("installs each .msh at /world/lounge/msh/<name>, idempotently", async () => {
    const root = writePack("saxonberg-lounge", [], { root: "/world/lounge" });
    for (const name of DEMO_SCRIPTS) writeScriptFile(root, name, readDemo(name));

    const [first] = await PackApi.install([root]);
    expect(first!.inserted.sort()).toEqual(
      DEMO_SCRIPTS.map((n) => `/msh/${n}`).sort(),
    );
    expect(first!.documents).toEqual({ msh: DEMO_SCRIPTS.length });

    const rows = rowsOfKind("msh");
    expect(rows).toHaveLength(DEMO_SCRIPTS.length);
    const martini = rows.find((r) => r.path === "/world/lounge/msh/martini")!;
    expect(martini.owner).toBe("/world/lounge");
    expect(martini.sourcePack).toBe("saxonberg-lounge");
    expect((martini.data as { source: string }).source).toBe(readDemo("martini"));

    // A second install writes nothing (three-way: same / same).
    const [again] = await PackApi.install([root]);
    expect([
      ...again!.inserted,
      ...again!.updated,
      ...again!.adopted,
      ...again!.deleted,
      ...again!.kept,
      ...again!.conflicts,
    ]).toEqual([]);
    expect(rowsOfKind("msh")).toHaveLength(DEMO_SCRIPTS.length);
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
          collection === Collections.Content &&
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
