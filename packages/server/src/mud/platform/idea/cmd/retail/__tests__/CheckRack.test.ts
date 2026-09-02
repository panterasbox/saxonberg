/**
 * The weapons-check rack (the bar-fight build): `check` moves a weapon
 * into the house's custody while the owner-stamp stays put, `reclaim`
 * hands it back to its owner, `buy` refuses a checked (`heldOnly`)
 * listing, and a shield (armor, not a weapon) is refused. Rides the
 * consignment substrate; reuses the reclaim controller verbatim.
 */

import "../../../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CheckController from "../CheckController";
import BuyController from "../BuyController";
import ReclaimController from "../ReclaimController";
import CheckRack from "../../../../thing/CheckRack";
import Ticket from "../../../../thing/Ticket";
import Weapon from "../../../../thing/equipment/Weapon";
import Shield from "../../../../thing/equipment/Shield";
import { Construction } from "../../../../../lib/material/Construction";
import ChattelRegistry from "../../../ChattelRegistry";
import { ChattelApi } from "../../../../../api/chattel";
import { ContainmentApi } from "../../../../../api/containment";
import { ExecutionContextApi } from "../../../../../api/execution-context";
import { MixinApi } from "../../../../../api/mixin";
import { Document } from "../../../../../lib/persistence/Document";
import { CommandGiverMixin } from "../../../../../lib/command/CommandGiver";
import { SensorMixin } from "../../../../../lib/message/Sensor";
import { ContainerMixin } from "../../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../../lib/spatial/Containable";
import { NamedMixin } from "../../../../../lib/description/Named";
import { Idea } from "../../../../../lib/stuff/Idea";
import Location from "../../../../../lib/stuff/Location";
import { CommandDefinition } from "../../../../../lib/command/CommandDefinition";
import { CommandApi, type CommandContext } from "../../../../../api/command";
import type { Stuff } from "../../../../../lib/stuff/Stuff";
import {
  makeStuff,
  makeStuffAtPath,
  withRootContext,
} from "../../../../../lib/security/__tests__/test-setup";
import { installV1QuantityMarshallers } from "../../../../../lib/persistence/__tests__/quantity-marshaller-test-helpers";
import {
  installBankingHarness,
  teardownBankingHarness,
} from "../../../../../lib/banking/__tests__/banking-test-harness";

const RACK = "/world/lounge/thing/check-rack";

class TestGiver extends SensorMixin(
  CommandGiverMixin(ContainerMixin(ContainableMixin(NamedMixin(Idea)))),
) {
  static _mixinName = "TestGiver";
}

function asOwner<T>(owner: Stuff, fn: () => Promise<T>): Promise<T> {
  return withRootContext(null, "check.test", () => {
    ExecutionContextApi.tagActingAuthor(owner);
    return fn();
  });
}

function ctx(
  giver: TestGiver,
  loc: Location,
  rack: CheckRack,
  verb: string,
): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: loc as never,
    commandSource: rack as never,
    commandText: verb,
    executionId: "t",
    commandId: "t",
    verb,
    command: CommandDefinition.fromYaml(
      `verbs: [${verb}]\ncontroller: NoopController\ndescription: stub\n`,
      "<test>",
    ),
  });
}

function weapon(owner: Stuff, keyword = "knife"): Weapon {
  const w = makeStuff(() => new Weapon());
  w.setKeywords([keyword]);
  w.setConstruction(Construction.of("bladed"));
  ContainmentApi.move(w as never, owner as never);
  return w;
}

describe("CheckRack — custody-not-title over the consignment substrate", () => {
  beforeEach(async () => {
    installBankingHarness();
    installV1QuantityMarshallers();
    Document.setMarshallerResolver(
      () => undefined,
      async () => undefined,
    );
    const reg = makeStuffAtPath(
      () => new ChattelRegistry(),
      "/platform/idea/ChattelRegistry",
    );
    await reg.postRegister();
  });
  afterEach(() => {
    teardownBankingHarness();
    vi.restoreAllMocks();
  });

  function scene(): { loc: Location; rack: CheckRack; patron: TestGiver } {
    const loc = makeStuff(() => new Location());
    const rack = makeStuffAtPath(() => new CheckRack(), RACK);
    ContainmentApi.move(rack as never, loc as never);
    const patron = makeStuffAtPath(
      () => new TestGiver(),
      "/platform/agent/Avatar/patron",
    );
    ContainmentApi.move(patron as never, loc as never);
    return { loc, rack, patron };
  }

  it("check moves custody to the rack, keeps the owner-stamp, hands a ticket", async () => {
    const { loc, rack, patron } = scene();
    const knife = weapon(patron);
    await asOwner(patron, () =>
      makeStuff(() => new CheckController()).execute(
        { thing: "knife" },
        ctx(patron, loc, rack, "check"),
      ),
    );
    expect(knife.getContainer()).toBe(rack); // custody → the house
    expect(await ChattelApi.ownerOf(knife)).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/patron",
    }); // ownership stays with the patron
    // A claim ticket landed in the patron's hands.
    const ticket = patron
      .getContents()
      .find((c) => c instanceof Ticket) as Ticket | undefined;
    expect(ticket).toBeDefined();
    expect(ticket!.getPointPath()).toBe(RACK);
    // It's a plain custody holding (no listing, no ask — a coat check).
    const holding = rack.holdingFor(knife.getChattelId());
    expect(holding).toBeTruthy();
    expect(holding).not.toHaveProperty("askMinor");
  });

  it("a checked weapon can't be bought — a rack is no sale shelf", async () => {
    const { loc, rack, patron } = scene();
    const knife = weapon(patron);
    await asOwner(patron, () =>
      makeStuff(() => new CheckController()).execute(
        { thing: "knife" },
        ctx(patron, loc, rack, "check"),
      ),
    );
    // A second person tries to buy it off the rack. The rack composes only
    // the custody base (HeldGoodsMixin), not the sale layer, so `buy` finds
    // no consignment shelf here at all — nothing to buy.
    const buyer = makeStuffAtPath(
      () => new TestGiver(),
      "/platform/agent/Avatar/buyer",
    );
    ContainmentApi.move(buyer as never, loc as never);
    const note = vi.fn();
    const c = ctx(buyer, loc, rack, "buy");
    (c as unknown as { note: unknown }).note = note;
    await asOwner(buyer, () =>
      makeStuff(() => new BuyController()).execute({ thing: "knife" }, c),
    );
    expect(knife.getContainer()).toBe(rack); // still checked — not sold
    expect(note).toHaveBeenCalled(); // a rejection, not a sale
    // The rack is not a consignment shelf.
    expect(MixinApi.isConsignmentShelf(rack as never)).toBe(false);
    expect(MixinApi.isHeldGoodsShelf(rack as never)).toBe(true);
  });

  it("reclaim returns the weapon to its owner; a non-owner is refused", async () => {
    const { loc, rack, patron } = scene();
    const knife = weapon(patron);
    await asOwner(patron, () =>
      makeStuff(() => new CheckController()).execute(
        { thing: "knife" },
        ctx(patron, loc, rack, "check"),
      ),
    );
    // A stranger can't reclaim it (custody without title is theft).
    const stranger = makeStuffAtPath(
      () => new TestGiver(),
      "/platform/agent/Avatar/stranger",
    );
    ContainmentApi.move(stranger as never, loc as never);
    await asOwner(stranger, () =>
      makeStuff(() => new ReclaimController()).execute(
        { thing: "knife" },
        ctx(stranger, loc, rack, "reclaim"),
      ),
    );
    expect(knife.getContainer()).toBe(rack); // stayed on the rack

    // The owner reclaims it — ownership unchanged.
    await asOwner(patron, () =>
      makeStuff(() => new ReclaimController()).execute(
        { thing: "knife" },
        ctx(patron, loc, rack, "reclaim"),
      ),
    );
    expect(knife.getContainer()).toBe(patron);
    expect(await ChattelApi.ownerOf(knife)).toEqual({
      kind: "player",
      templatePath: "/platform/agent/Avatar/patron",
    });
  });

  it("a shield is armor, not a weapon — check refuses it", async () => {
    const { loc, rack, patron } = scene();
    const shield = makeStuff(() => new Shield());
    shield.setKeywords(["shield"]);
    shield.setConstruction(Construction.of("plate"));
    ContainmentApi.move(shield as never, patron as never);
    const note = vi.fn();
    const c = ctx(patron, loc, rack, "check");
    (c as unknown as { note: unknown }).note = note;
    await asOwner(patron, () =>
      makeStuff(() => new CheckController()).execute({ thing: "shield" }, c),
    );
    expect(shield.getContainer()).toBe(patron); // never left the patron
    expect(note).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "not-a-weapon" }),
    );
  });
});
