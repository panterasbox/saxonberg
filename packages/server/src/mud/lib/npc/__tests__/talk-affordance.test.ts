/**
 * Discoverability (AC#2): a Behaved NPC affords `talk` to nearby
 * command-givers, and the affordance rides the ordinary
 * containment-delta push/pop — so it works whether the player is
 * already present, arrives later, or the NPC departs.
 *
 * ⭐ **Afford statically, decline diegetically.** `talk` used to be
 * conditional on the NPC carrying an `engage`-triggered dialogue spec,
 * through a per-instance contribution hook. That was a second record of
 * verb affordances beside the class statics, and it made the verb set
 * depend on authored data the client cannot see. Now every Behaved host
 * affords `talk`, and `TalkController` answers "<npc> has nothing to
 * say" for one with no tree — the same shape as a broken tool, which
 * keeps affording its verb while the controller declines on the
 * capability.
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { BehavedMixin } from "../../behavior/Behaved";
import { ContainmentApi } from "../../../api/containment";
import { CommandApi } from "../../../api/command";
import { StuffApi } from "../../../api/stuff";
import type { BehaviorSpec } from "../../behavior/brain";

class Room extends ContainerMixin(Idea) {}
class Npc extends BehavedMixin(ContainableMixin(Idea)) {}
class Player extends CommandGiverMixin(ContainableMixin(Idea)) {}

const TREE_SPEC: BehaviorSpec = {
  brain: "/lib/behavior/tree-dialogue",
  trigger: "engage",
  config: { entry: [{ node: "root" }], nodes: { root: { beat: "Hi." } } },
};
const IDLE_SPEC: BehaviorSpec = {
  brain: "/lib/behavior/idles",
  trigger: "cadence:9s",
  config: {},
};

function affordsTalk(player: Player): boolean {
  return player
    .getAvailableCommands()
    .some((c) => c.verbs.includes("talk"));
}

beforeAll(() => {
  // Ensure the talk command YAML is resolvable for the contribution.
  CommandApi.getCommand("platform/cmd/social/talk.yaml");
});

beforeEach(() => {
  StuffApi.clearAll();
});

describe("talk affordance (discoverability)", () => {
  it("a tree NPC affords talk to a player already present", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const npc = makeStuff(() => new Npc());
    npc.behaviors = [TREE_SPEC];
    ContainmentApi.move(player as never, room as never);
    ContainmentApi.move(npc as never, room as never); // dest-side push
    expect(affordsTalk(player)).toBe(true);
  });

  it("a tree NPC affords talk to a player who arrives later", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const npc = makeStuff(() => new Npc());
    npc.behaviors = [TREE_SPEC];
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never); // self-move pull
    expect(affordsTalk(player)).toBe(true);
  });

  // A silent NPC is addressable and says nothing — it is not invisible
  // to the parser. Trying and being told is the discoverable outcome; a
  // verb that is simply absent teaches the player nothing.
  it("a silent NPC still affords talk — the controller is what declines", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const npc = makeStuff(() => new Npc());
    npc.behaviors = [IDLE_SPEC];
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);
    expect(affordsTalk(player)).toBe(true);
  });

  it("withdraws talk when the tree NPC leaves the room", () => {
    const room = makeStuff(() => new Room());
    const elsewhere = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const npc = makeStuff(() => new Npc());
    npc.behaviors = [TREE_SPEC];
    ContainmentApi.move(player as never, room as never);
    ContainmentApi.move(npc as never, room as never);
    expect(affordsTalk(player)).toBe(true);

    ContainmentApi.move(npc as never, elsewhere as never); // source-side pop
    expect(affordsTalk(player)).toBe(false);
  });
});
