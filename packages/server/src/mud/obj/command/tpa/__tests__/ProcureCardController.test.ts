/**
 * ProcureCardController — `procure card`. Clones a fresh TravelCard to the
 * requester, free (no banking interaction). The affording clerk is the
 * command source (the verb is contributed by a present clerk).
 */

import "../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import ProcureCardController from "../ProcureCardController";
import TravelCard from "../../../../domain/common/tpa/TravelCard";
import { TpaPaths } from "../../../../domain/common/tpa/paths";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { CommandGiverMixin } from "../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { NamedMixin } from "../../../../lib/description/Named";
import { Idea } from "../../../../lib/stuff/Idea";
import Location from "../../../../lib/stuff/Location";
import { StuffApi } from "../../../../api/stuff";
import { BankingApi } from "../../../../api/banking";
import { ContainmentApi } from "../../../../api/containment";
import { MixinApi } from "../../../../api/mixin";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../api/command";
import type { Stuff } from "../../../../lib/stuff/Stuff";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";

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
