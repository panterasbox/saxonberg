/**
 * The inventory bucket consults instances (the capability table, live):
 * a data-only tool — `ToolItem`-shaped, no per-tool class — confers its
 * kinds' verb families through the `InstanceContributor` seam when
 * carried, loses them when dropped, and honors the table's placement
 * (`carried` kinds never light up from the room). This is the walk-level
 * acceptance coverage for the capability-table build.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { CommandGiverMixin } from "../CommandGiver";
import { ToolMixin } from "../../craft/Tooled";
import { DurableMixin } from "../../material/Durable";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi } from "../../../api/command";
import { StuffApi } from "../../../api/stuff";

class Room extends ContainerMixin(Idea) {}
class Tool extends ToolMixin(DurableMixin(ContainableMixin(Idea))) {}
class Player extends ContainerMixin(
  CommandGiverMixin(ContainableMixin(Idea)),
) {}

function affords(player: Player, verb: string): boolean {
  return player
    .getAvailableCommands()
    .some((c) => c.verbs.includes(verb));
}

beforeAll(() => {
  // The contributions reference these views — ensure they resolve.
  CommandApi.getCommand("platform/cmd/crafting/repair.yaml");
  CommandApi.getCommand("platform/cmd/crafting/sharpen.yaml");
});

beforeEach(() => {
  StuffApi.clearAll();
});

describe("the inventory bucket's instance consult", () => {
  it("a carried data-only tool confers its kind's verbs; dropping loses them", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const kit = makeStuff(() => new Tool());
    kit.setCapabilities(["mending"]);
    ContainmentApi.move(player, room);

    expect(affords(player, "repair")).toBe(false);
    ContainmentApi.move(kit, player);
    expect(affords(player, "repair")).toBe(true);
    expect(affords(player, "salvage")).toBe(true);

    // Dropped: `mending` is a reachable-placement kind, so the floor
    // still affords it (the environment bucket picks it up).
    ContainmentApi.move(kit, room);
    expect(affords(player, "repair")).toBe(true);
  });

  it("a carried-placement kind never lights up from the room", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const stone = makeStuff(() => new Tool());
    stone.setCapabilities(["whetstone"]);
    ContainmentApi.move(player, room);
    ContainmentApi.move(stone, room);

    expect(affords(player, "sharpen")).toBe(false); // present ≠ carried
    ContainmentApi.move(stone, player);
    expect(affords(player, "sharpen")).toBe(true); // carried
    ContainmentApi.move(stone, room);
    expect(affords(player, "sharpen")).toBe(false); // dropped → gone
  });
});
