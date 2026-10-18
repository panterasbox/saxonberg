/**
 * Named scripts (P6) — session `def` persistence + `do <name>`
 * invocation, end to end through the real prompt (the `script` parser is
 * now the default).
 *
 * A `def` typed at one prompt persists on the actor and is invocable at
 * the next via `do`; `do <name> with <arg>` binds the script's param
 * (observed via a conditional dispatch); an unknown name declines. Uses
 * the no-validator `ping` verb so the test needs no animate body.
 *
 * ⚠ `do` was `make`, behind crafting's knowledge gate. The last case here
 * pins the decoupling: a script runs whatever crafting thinks of its name.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Location from "../../stuff/Location";
import { Idea } from "../../stuff/Idea";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { EnvironmentMixin } from "../../shell/Environment";
import { ContainableMixin } from "../../spatial/Containable";
import { ContainerMixin } from "../../spatial/Container";
import { SensorMixin } from "../../message/Sensor";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi } from "../../../api/command";
import { CraftingApi } from "../../../api/crafting";
import { makeStuff } from "../../security/__tests__/test-setup";
import {
  PersistenceManager,
  Collections,
} from "../../../../backend/PersistenceManager";
import type { EnvelopeTemplate, DispatchResponseEnvelope } from "@saxonberg/types";

const TestGiverBase = CommandGiverMixin(
  EnvironmentMixin(SensorMixin(ContainerMixin(ContainableMixin(Idea)))),
);

class TestGiver extends TestGiverBase {
  static override commandContributions = {
      peers: [],
    self: ["platform/cmd/system/ping.yaml", "platform/cmd/shell/do.yaml"],
    environment: [],
  };
  public envelopes: EnvelopeTemplate[] = [];
  protected override handleMessage(): void {}
  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    this.envelopes.push(envelope);
  }
}

const CONTROLLERS: Record<string, string> = {
  "/platform/idea/cmd/system/PingController": "/platform/idea/cmd/system/PingController",
  "/platform/idea/cmd/shell/DoController": "/platform/idea/cmd/shell/DoController",
};

describe("named scripts — def persistence + do", () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
    const find = vi.fn(
      async (collection: string, query: Record<string, unknown>) => {
        const path = query.path as string;
        if (collection === Collections.Content && CONTROLLERS[path]) {
          return [{ path, class: CONTROLLERS[path], data: {} }];
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
  });

  afterEach(() => vi.restoreAllMocks());

  function pingCount(spy: { mock: { calls: unknown[][] } }): number {
    return spy.mock.calls.filter(
      (c) =>
        (c[1] as { command: { getPrimaryVerb(): string } }).command.getPrimaryVerb() ===
        "ping",
    ).length;
  }

  it("a def at one prompt is invocable by do at the next", async () => {
    // The `script` parser is the default now — `def` (a builtin) runs.
    await giver.executeCommand("def twice { ping; ping }");

    const resolveModel = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("do twice");
    expect(pingCount(resolveModel)).toBe(2);
  });

  it("do binds the script's param (observed via a conditional)", async () => {
    await giver.executeCommand('def gated ($x) { if ($x == "go") { ping } }');

    const goSpy = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("do gated with go");
    expect(pingCount(goSpy)).toBe(1); // $x == "go" → the ping fires
    goSpy.mockRestore();

    const stopSpy = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("do gated with stop");
    expect(pingCount(stopSpy)).toBe(0); // $x != "go" → no ping
  });

  it("do declines a script that isn't defined", async () => {
    await giver.executeCommand("do nonesuch");
    const env = giver.envelopes.at(-1) as DispatchResponseEnvelope;
    expect(
      env.outcome.notes.some(
        (n) => n.kind === "controller-rejected" && n.reason === "unknown-script",
      ),
    ).toBe(true);
  });

  it("⚠⚠ do is NOT a craft: a script runs though a catalogue recipe shares its name and you cannot make it", async () => {
    // The old `make` refused here ("you haven't learned to make it") — a
    // script runner asking crafting for permission. A script is commands;
    // each one meets its own gate, so the runner asks nobody.
    vi.spyOn(CraftingApi, "lookupRecipe").mockResolvedValue({
      recipeId: "twice",
      name: "Twice",
      keywords: ["twice"],
    });
    const canMake = vi.spyOn(CraftingApi, "canMake").mockResolvedValue(false);
    await giver.executeCommand("def twice { ping; ping }");
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("do twice");
    expect(pingCount(resolveModel)).toBe(2);
    expect(canMake).not.toHaveBeenCalled();
  });

  it("a bare command still parses byte-identically (the flip is wrap-not-replace)", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");
    await giver.executeCommand("ping");
    expect(resolveModel).toHaveBeenCalledTimes(1);
    const env = giver.envelopes.at(-1) as DispatchResponseEnvelope;
    expect(env.outcome.status).toBe("ok");
  });
});
