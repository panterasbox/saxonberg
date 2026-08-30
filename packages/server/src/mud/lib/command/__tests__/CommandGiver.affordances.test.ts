/**
 * The affordance walk over the ONE record of verb affordances: `static
 * commandContributions` on a class and every mixin in its chain.
 *
 * ⭐ These cases used to prove the same behaviours through a second,
 * per-instance record (an `InstanceContributor` hook the walk consulted
 * at containment-delta time, fed by an authored `capabilities[].verbs`
 * list on the row). That record is gone: two ways to hang a verb on an
 * object meant an author had no rule for picking, and the verbs a thing
 * affords could vary with data the client cannot see. A verb an object
 * affords is now a property of what the object IS.
 *
 * What the buckets carry — and this is the whole of what `placement:
 * reachable | carried` used to say, in the vocabulary the statics
 * already had:
 *
 *   - `environment` — OUTWARD, to whoever carries the thing;
 *   - `peers`       — SIDEWAYS, to everyone sharing the room with it.
 *
 * So a tool declaring both is reachable (carried or on the floor); one
 * declaring only `environment` is personal capital — your own whetstone,
 * anywhere, and nothing from a stone across the room.
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
import { CommandApi, type CommandContributions } from "../../../api/command";
import { StuffApi } from "../../../api/stuff";

const MENDING = [
  "platform/cmd/crafting/repair.yaml",
  "platform/cmd/crafting/salvage.yaml",
];

class Room extends ContainerMixin(Idea) {}
class ToolBase extends ToolMixin(DurableMixin(ContainableMixin(Idea))) {}

/** Reachable: declares both buckets. */
class MendingTool extends ToolBase {
  static commandContributions: CommandContributions = {
    environment: MENDING,
    peers: MENDING,
  };
}

/** Personal capital: `environment` only. */
class Whetstone extends ToolBase {
  static commandContributions: CommandContributions = {
    environment: ["trade/smithing/cmd/crafting/sharpen.yaml"],
  };
}

class Player extends ContainerMixin(
  CommandGiverMixin(ContainableMixin(Idea)),
) {}

function affords(player: Player, verb: string): boolean {
  return player.getAvailableCommands().some((c) => c.verbs.includes(verb));
}

beforeAll(() => {
  // The contributions reference these views — ensure they resolve.
  CommandApi.getCommand("platform/cmd/crafting/repair.yaml");
  CommandApi.getCommand("trade/smithing/cmd/crafting/sharpen.yaml");
});

beforeEach(() => {
  StuffApi.clearAll();
});

describe("verb affordances come from class statics, and only from there", () => {
  it("a reachable tool confers its verbs carried AND from the floor", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const kit = makeStuff(() => new MendingTool());
    ContainmentApi.move(player, room);

    expect(affords(player, "repair")).toBe(false);
    ContainmentApi.move(kit, player);
    expect(affords(player, "repair")).toBe(true);
    expect(affords(player, "salvage")).toBe(true);

    // Dropped: it declares `peers` too, so the floor still affords it.
    ContainmentApi.move(kit, room);
    expect(affords(player, "repair")).toBe(true);
  });

  it("an environment-only tool never lights up from the room", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const stone = makeStuff(() => new Whetstone());
    ContainmentApi.move(player, room);
    ContainmentApi.move(stone, room);

    expect(affords(player, "sharpen")).toBe(false); // present ≠ carried
    ContainmentApi.move(stone, player);
    expect(affords(player, "sharpen")).toBe(true); // carried
    ContainmentApi.move(stone, room);
    expect(affords(player, "sharpen")).toBe(false); // dropped → gone
  });

  it("two rows over one class afford identically — a row cannot vary verbs", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    // The sewing kit and the sewing machine differ in rate and control,
    // which is row data; they cannot differ in what they afford, which
    // is the point of a single class-level record.
    const kitLike = makeStuff(() => new MendingTool());
    kitLike.setCapabilities([{ kind: "mending" }]);
    const machineLike = makeStuff(() => new MendingTool());
    machineLike.setCapabilities([
      { kind: "mending", rate: 3, control: "fine" },
    ]);
    ContainmentApi.move(player, room);

    ContainmentApi.move(kitLike, player);
    expect(affords(player, "repair")).toBe(true);
    ContainmentApi.move(kitLike, null);

    ContainmentApi.move(machineLike, player);
    expect(affords(player, "repair")).toBe(true);
  });
});
