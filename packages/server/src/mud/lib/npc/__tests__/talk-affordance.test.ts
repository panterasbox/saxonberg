/**
 * Discoverability (AC#2): a tree-bearing NPC affords `talk` to nearby
 * command-givers; a silent NPC affords neither. Exercises the
 * `InstanceContributor` seam end to end — BehavedMixin's per-instance
 * contribution rides the ordinary containment-delta push/pop, so it
 * works whether the player is already present, arrives later, or the NPC
 * departs.
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
  CommandApi.getCommand("social/talk.yaml");
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

  it("a silent NPC affords neither (no engage spec)", () => {
    const room = makeStuff(() => new Room());
    const player = makeStuff(() => new Player());
    const npc = makeStuff(() => new Npc());
    npc.behaviors = [IDLE_SPEC];
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);
    expect(affordsTalk(player)).toBe(false);
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
