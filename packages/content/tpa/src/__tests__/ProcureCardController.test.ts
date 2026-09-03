/**
 * ProcureCardController — `procure card`. Clones a fresh TravelCard to the
 * requester, free (no banking interaction). The affording clerk is the
 * command source (the verb is contributed by a present clerk).
 */

import "@saxonberg/server/test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ProcureCardController from "../idea/cmd/tpa/ProcureCardController";
import TravelCard from "../thing/TravelCard";
import { TpaPaths } from "../lib/paths";
import { ContainerMixin } from "@saxonberg/server/mud/lib/spatial/Container";
import { ContainableMixin } from "@saxonberg/server/mud/lib/spatial/Containable";
import { CommandGiverMixin } from "@saxonberg/server/mud/lib/command/CommandGiver";
import { SensorMixin } from "@saxonberg/server/mud/lib/message/Sensor";
import { NamedMixin } from "@saxonberg/server/mud/lib/description/Named";
import { Idea } from "@saxonberg/server/mud/lib/stuff/Idea";
import Location from "@saxonberg/server/mud/lib/stuff/Location";
import { StuffApi } from "@saxonberg/server/mud/api/stuff";
import { BankingApi } from "@saxonberg/server/mud/api/banking";
import { ContainmentApi } from "@saxonberg/server/mud/api/containment";
import { MixinApi } from "@saxonberg/server/mud/api/mixin";
import { CommandDefinition } from "@saxonberg/server/mud/lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "@saxonberg/server/mud/api/command";
import type { Stuff } from "@saxonberg/server/mud/lib/stuff/Stuff";
import { makeStuff } from "@saxonberg/server/mud/lib/security/__tests__/test-setup";

class Giver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "Giver";
}
class Clerk extends NamedMixin(Idea) {
  static _mixinName = "Clerk";
}

function ctx(giver: Stuff, location: Stuff, source: Stuff): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: location as never,
    commandSource: source as never,
    commandText: "procure card",
    executionId: "t",
    commandId: "t",
    verb: "procure",
    command: CommandDefinition.fromYaml(
      "verbs: [procure]\ncontroller: NoopController\ndescription: stub\n",
      "<test>",
    ),
  });
}

describe("ProcureCardController", () => {
  beforeEach(() => {
    StuffApi.clearAll();
    // Clone returns a fresh TravelCard for the card path (no domain store).
    vi.spyOn(StuffApi, "clone").mockImplementation((async (path: string) => {
      expect(path).toBe(TpaPaths.travelCard);
      return makeStuff(() => new TravelCard());
    }) as unknown as typeof StuffApi.clone);
  });
  afterEach(() => vi.restoreAllMocks());

  it("clones a fresh TravelCard into the requester's inventory, free", async () => {
    const loc = makeStuff(() => new Location());
    const giver = makeStuff(() => {
      const g = new Giver();
      g.setName("alice");
      return g;
    });
    const clerk = makeStuff(() => {
      const c = new Clerk();
      c.setName("tootie");
      return c;
    });
    ContainmentApi.move(giver, loc);

    const settle = vi.spyOn(BankingApi, "settle");
    const c = ctx(giver, loc, clerk);
    await makeStuff(() => new ProcureCardController()).execute(
      {} as CommandModel,
      c,
    );

    const carried = giver.getContents().filter((s) =>
      MixinApi.isCredentialWallet(s),
    );
    expect(carried).toHaveLength(1);
    expect(carried[0]!.getCredential("travel")).toBeTruthy();
    // Free — no banking interaction at all.
    expect(settle).not.toHaveBeenCalled();
    expect(
      c.getNotes().some((n) => n.kind === "controller-rejected"),
    ).toBe(false);
  });
});
