/**
 * Interpreter integration — a multi-statement script typed at the prompt
 * dispatches each command over the REAL command bus (resolve → validate
 * → execute), proving the "conducts the bus, never bypasses it"
 * constraint end to end.
 *
 * Mirrors the CommandGiver dispatch harness: a giver that affords the
 * no-op `ping` verb, with the controller clone resolved through a mocked
 * PersistenceManager. The giver opts into the `script` parser (the
 * prompt-as-interpreter default flip is P6) so `executeCommand` routes
 * multi-statement input to the interpreter.
 */

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
    self: ["system/ping.yaml"],
    environment: [],
  };
  public envelopes: EnvelopeTemplate[] = [];
  protected override handleMessage(): void {}
  protected override handleEnvelope(envelope: EnvelopeTemplate): void {
    this.envelopes.push(envelope);
  }
}

describe("Interpreter — real-bus dispatch via the prompt", () => {
  let giver: TestGiver;
  let location: Location;

  beforeEach(() => {
    CommandApi.clearCache();
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
    // Opt into the scripting parser (the default flip is P6).
    giver.setSetting("shell.parser", "script", giver);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches every statement of a multi-statement script over the bus", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");

    await giver.executeCommand("ping; ping; ping");

    // Each scripted command went through the real resolve→validate→
    // execute tail (the {bound} path), once per statement.
    const verbs = resolveModel.mock.calls.map(
      (c) => c[1].command.getPrimaryVerb(),
    );
    expect(verbs).toEqual(["ping", "ping", "ping"]);
  });

  it("a single bare command still parses byte-identically (fast path)", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");
    // No separator, no block → msh fast path → the normal _runChain, not
    // the interpreter. resolveModel is still called once (the verb runs).
    await giver.executeCommand("ping");
    expect(resolveModel).toHaveBeenCalledTimes(1);
    const env = giver.envelopes.at(-1) as DispatchResponseEnvelope;
    expect(env.outcome.status).toBe("ok");
  });

  it("notes an unknown verb but continues dispatching valid ones", async () => {
    const resolveModel = vi.spyOn(CommandApi, "resolveModel");

    await giver.executeCommand("frobnicate; ping");

    // Only the real verb reached resolve; the unknown one was noted.
    const verbs = resolveModel.mock.calls.map(
      (c) => c[1].command.getPrimaryVerb(),
    );
    expect(verbs).toEqual(["ping"]);

    const env = giver.envelopes.at(-1) as DispatchResponseEnvelope;
    const rejected = env.outcome.notes.filter(
      (n) => n.kind === "command-rejected",
    );
    expect(rejected.length).toBeGreaterThan(0);
  });
});
