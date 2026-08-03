/**
 * TalkController — the `talk to <npc>` opener.
 *
 * Covers: opening a conversation on a tree-bearing NPC (the NPC leads,
 * the controller emits no player line); graceful decline for a
 * non-conversational target (not Behaved, or Behaved without a dialogue
 * spec); and the 1:1 busy decline for a second driver. The full
 * tree-walk loop is covered by DialogueConversation.test; here we test
 * the controller's narrowing, spec lookup, brain resolution, and decline
 * branches. PromptApi.choice is mocked (never resolves) so an opened
 * conversation simply parks on its first wheel.
 */

import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import TalkController from "../TalkController";
import { Idea } from "../../../../lib/stuff/Idea";
import { ContainerMixin } from "../../../../lib/spatial/Container";
import { ContainableMixin } from "../../../../lib/spatial/Containable";
import { SensorMixin } from "../../../../lib/message/Sensor";
import { VocalMixin } from "../../../../lib/message/Vocal";
import { SoulMixin } from "../../../../lib/social/Soul";
import { NamedMixin } from "../../../../lib/description/Named";
import { EngagedMixin } from "../../../../lib/activity/Engaged";
import { BehavedMixin } from "../../../../lib/behavior/Behaved";
import { ContainmentApi } from "../../../../api/containment";
import { StuffApi } from "../../../../api/stuff";
import { SchedulerApi } from "../../../../api/scheduler";
import { PromptApi } from "../../../../api/prompt";
import { RegardApi } from "../../../../api/regard";
import { EventApi } from "../../../../api/event";
import EventRegistry from "../../../EventRegistry";
import { Stuff } from "../../../../lib/stuff/Stuff";
import {
  CommandApi,
  type CommandContext,
  type CommandModel,
} from "../../../../api/command";
import { CommandDefinition } from "../../../../lib/command/CommandDefinition";
import { makeStuff } from "../../../../lib/security/__tests__/test-setup";
import type { MqlOneResult } from "../../../../api/mql";
import {
  DIALOGUE_CONVERSATION_TYPE,
} from "../../../../lib/npc/DialogueConversation";
import type { DialogueTree } from "../../../../lib/npc/tree";

const TREE_BRAIN = "/lib/behavior/tree-dialogue";

class Room extends ContainerMixin(Idea) {}
class NPCHost extends BehavedMixin(
  EngagedMixin(
    SoulMixin(VocalMixin(SensorMixin(NamedMixin(ContainableMixin(Idea))))),
  ),
) {}
class PlayerHost extends EngagedMixin(
  VocalMixin(SensorMixin(NamedMixin(ContainableMixin(Idea)))),
) {}

function greetingTree(): DialogueTree {
  return {
    entry: [{ node: "root" }],
    nodes: {
      root: {
        beat: "Welcome.",
        choices: [{ line: "Hi.", to: "bye" }],
      },
      bye: { beat: "Bye.", terminal: true },
    },
  };
}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/obj/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
  }
};

function stubCommand(): CommandDefinition {
  return CommandDefinition.fromYaml(
    `verbs: [talk]\ncontroller: social/TalkController\ndescription: stub\n`,
    "<test>",
  );
}

let dummyInteractiveCounter = 0;
function context(giver: Stuff, room: Room): CommandContext {
  return CommandApi.createCommandContext({
    commandGiver: giver as never,
    location: room as never,
    commandText: "talk",
    executionId: "test",
    commandId: "test",
    verb: "talk",
    command: stubCommand(),
    interactive: { id: `iact-${dummyInteractiveCounter++}` } as never,
  });
}

function targetModel(stuff: Stuff): CommandModel {
  return { target: { stuff, raw: "target" } as MqlOneResult } as CommandModel;
}

function makeNpc(withTree: boolean): NPCHost {
  const npc = makeStuff(() => new NPCHost());
  npc.setName("the barkeep");
  npc.behaviors = withTree
    ? [
        {
          brain: TREE_BRAIN,
          trigger: "engage",
          config: greetingTree() as unknown as Record<string, unknown>,
        },
      ]
    : [];
  return npc;
}

beforeAll(async () => {
  // Warm the brain path so the controller's resolveExportSync hits.
  await StuffApi.resolveExport(TREE_BRAIN, "brain");
});

beforeEach(async () => {
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  await bootRegistry();
  // Park every opened conversation on its first (never-resolved) wheel.
  vi.spyOn(PromptApi, "choice").mockImplementation(
    () => new Promise<string>(() => {}),
  );
  vi.spyOn(PromptApi, "cancelAll").mockReturnValue(0);
  vi.spyOn(RegardApi, "getRegard").mockReturnValue(0);
  vi.spyOn(RegardApi, "adjustRegard").mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function rejected(ctx: CommandContext): boolean {
  return ctx.getNotes().some((n) => n.kind === "controller-rejected");
}

function rejectedFor(ctx: CommandContext, reason: string): boolean {
  return ctx
    .getNotes()
    .some((n) => n.kind === "controller-rejected" && n.reason === reason);
}

describe("TalkController", () => {
  it("opens a conversation on a tree NPC; the NPC leads, no decline (AC#1)", async () => {
    const room = makeStuff(() => new Room());
    const npc = makeNpc(true);
    const player = makeStuff(() => new PlayerHost());
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);
    const say = vi.spyOn(npc, "say").mockImplementation(() => {});

    const ctx = context(player, room);
    const controller = makeStuff(() => new TalkController());
    await controller.execute(targetModel(npc), ctx);
    await flush();

    expect(rejected(ctx)).toBe(false);
    // The NPC speaks its root beat first; the opener emits no player line.
    expect(say).toHaveBeenCalledWith("Welcome.", player);
    expect(npc.getEngagementBySlot("voice")?.type).toBe(
      DIALOGUE_CONVERSATION_TYPE,
    );
  });

  it("declines gracefully for a non-Behaved target (AC#1)", async () => {
    const room = makeStuff(() => new Room());
    const scenery = makeStuff(() => new PlayerHost()); // not Behaved
    scenery.setName("a potted plant");
    const player = makeStuff(() => new PlayerHost());
    ContainmentApi.move(scenery as never, room as never);
    ContainmentApi.move(player as never, room as never);

    const ctx = context(player, room);
    const controller = makeStuff(() => new TalkController());
    await controller.execute(targetModel(scenery), ctx);

    expect(rejected(ctx)).toBe(true);
    expect(rejectedFor(ctx, "not-conversational")).toBe(true);
  });

  it("declines a Behaved NPC that carries no dialogue spec", async () => {
    const room = makeStuff(() => new Room());
    const npc = makeNpc(false); // Behaved, but no engage spec
    const player = makeStuff(() => new PlayerHost());
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(player as never, room as never);

    const ctx = context(player, room);
    const controller = makeStuff(() => new TalkController());
    await controller.execute(targetModel(npc), ctx);

    expect(rejected(ctx)).toBe(true);
    expect(npc.getEngagementBySlot("voice")).toBeUndefined();
  });

  it("declines a second driver on a busy NPC (1:1) (AC#3)", async () => {
    const room = makeStuff(() => new Room());
    const npc = makeNpc(true);
    const first = makeStuff(() => new PlayerHost());
    const second = makeStuff(() => new PlayerHost());
    ContainmentApi.move(npc as never, room as never);
    ContainmentApi.move(first as never, room as never);
    ContainmentApi.move(second as never, room as never);

    const controller = makeStuff(() => new TalkController());
    await controller.execute(targetModel(npc), context(first, room));
    await flush();
    expect(npc.getEngagementBySlot("voice")).toBeDefined();

    const ctx2 = context(second, room);
    await controller.execute(targetModel(npc), ctx2);
    expect(rejectedFor(ctx2, "busy")).toBe(true);
  });
});
