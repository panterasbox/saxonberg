/**
 * DialogueConversation — the branching-tree responder loop, driven via
 * the `tree-dialogue` brain's `open` seam.
 *
 * The interior/exterior contract is asserted structurally: the NPC's
 * beats and the player's picked lines go through `say` (spied), while the
 * choice wheel goes through `PromptApi.choice` to the driver's
 * Interactive (mocked + captured). Guard/effect reads (`RegardApi` /
 * `TraitApi`) are stubbed for determinism — their persistence is covered
 * by their own suites; here we test the dialogue wiring. Slots are held
 * via the real `SchedulerApi`, so the both-sides-free assertions are real.
 */

import "../../../../test-bootstrap";
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  beforeEach,
  afterEach,
} from "vitest";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import { ContainerMixin } from "../../spatial/Container";
import { ContainableMixin } from "../../spatial/Containable";
import { SensorMixin } from "../../message/Sensor";
import { VocalMixin } from "../../message/Vocal";
import { SoulMixin } from "../../social/Soul";
import { EngagedMixin } from "../../activity/Engaged";
import { ContainmentApi } from "../../../api/containment";
import { StuffApi } from "../../../api/stuff";
import { SchedulerApi } from "../../../api/scheduler";
import { PromptApi, PromptCancelledError } from "../../../api/prompt";
import { RegardApi } from "../../../api/regard";
import { TraitApi } from "../../../api/trait";
import { EventApi } from "../../../api/event";
import EventRegistry from "../../../platform/idea/EventRegistry";
import { Stuff } from "../../stuff/Stuff";
import type Interactive from "../../../platform/idea/Interactive";
import type { PromptChoice } from "@saxonberg/types";
import { brain as treeDialogue } from "../../behavior/tree-dialogue";
import {
  DIALOGUE_CONVERSATION_TYPE,
  DIALOGUE_PARTNER_TYPE,
} from "../DialogueConversation";
import type { DialogueTree } from "../tree";

class TestRoom extends ContainerMixin(Idea) {}
class TestNPC extends EngagedMixin(
  SoulMixin(VocalMixin(SensorMixin(ContainableMixin(Idea)))),
) {}
class TestPlayer extends EngagedMixin(
  VocalMixin(SensorMixin(ContainableMixin(Idea))),
) {}

async function bootRegistry(): Promise<void> {
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
}

/** A pending mocked choice the test resolves to drive the loop. */
interface PendingChoice {
  interactive: unknown;
  choices: PromptChoice[];
  resolve: (response: string) => void;
  reject: (err: unknown) => void;
}

interface World {
  room: TestRoom;
  npc: TestNPC;
  player: TestPlayer;
  interactive: Interactive;
  sayNpc: ReturnType<typeof vi.spyOn>;
  sayPlayer: ReturnType<typeof vi.spyOn>;
  pending: PendingChoice[];
  /** Resolve the latest pending choice with the choice at `index`. */
  pick(index: number): Promise<void>;
  /** Simulate disconnect / cancellation of the latest pending choice. */
  cancelPrompt(): Promise<void>;
}

/**
 * Settle pending work: the loop is launched via `ScheduleApi.schedule(0)`
 * (a macrotask) and advances across `await` chains, so flush several
 * timer+microtask rounds.
 */
const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) {
    await new Promise<void>((r) => setTimeout(r, 0));
  }
};

function makeWorld(): World {
  const room = makeStuff(() => new TestRoom());
  const npc = makeStuff(() => new TestNPC());
  const player = makeStuff(() => new TestPlayer());
  ContainmentApi.move(npc as never, room as never);
  ContainmentApi.move(player as never, room as never);

  const sayNpc = vi.spyOn(npc, "say").mockImplementation(() => {});
  const sayPlayer = vi.spyOn(player, "say").mockImplementation(() => {});

  const pending: PendingChoice[] = [];
  vi.spyOn(PromptApi, "choice").mockImplementation(
    (interactive, _label, choices) =>
      new Promise<string>((resolve, reject) => {
        pending.push({ interactive, choices, resolve, reject });
      }),
  );
  vi.spyOn(PromptApi, "cancelAll").mockReturnValue(0);

  const interactive = { id: "iact-1" } as unknown as Interactive;

  return {
    room,
    npc,
    player,
    interactive,
    sayNpc,
    sayPlayer,
    pending,
    async pick(index: number): Promise<void> {
      const p = pending.shift();
      if (!p) throw new Error("no pending choice to pick");
      p.resolve(String(index));
      await flush();
      await flush();
    },
    async cancelPrompt(): Promise<void> {
      const p = pending.shift();
      if (!p) throw new Error("no pending choice to cancel");
      p.reject(new PromptCancelledError("host-disconnected"));
      await flush();
      await flush();
    },
  };
}

async function openWith(
  w: World,
  tree: DialogueTree,
): Promise<{ ok: boolean; reason?: string }> {
  const result = (await treeDialogue.open({
    player: w.player as never,
    npc: w.npc as never,
    config: tree as unknown as Record<string, unknown>,
    interactive: w.interactive,
  })) as { ok: boolean; reason?: string };
  // The choice loop is detached; let it advance to its first await (the
  // root beat is emitted synchronously before that, during launch).
  await flush();
  return result;
}

beforeAll(async () => {
  await bootRegistry();
});

beforeEach(async () => {
  StuffApi.clearAll();
  SchedulerApi._clearAllForTesting();
  await bootRegistry();
  vi.spyOn(RegardApi, "getRegard").mockReturnValue(0);
  vi.spyOn(RegardApi, "adjustRegard").mockReturnValue(undefined);
  vi.spyOn(TraitApi, "positionFor").mockResolvedValue({
    disposition: "sociability",
    position: 0,
    mass: 0,
    band: "nascent",
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** A simple greeting tree: root beat → one choice → terminal reply. */
function greetingTree(): DialogueTree {
  return {
    entry: [{ node: "root" }],
    nodes: {
      root: {
        beat: "Welcome to the bar.",
        choices: [{ line: "Thanks.", to: "bye" }],
      },
      bye: { beat: "Come again.", terminal: true },
    },
  };
}

describe("DialogueConversation — open + loop", () => {
  it("opens with the NPC's root beat and emits no player line (AC#1)", async () => {
    const w = makeWorld();
    const res = await openWith(w, greetingTree());
    expect(res.ok).toBe(true);

    expect(w.sayNpc).toHaveBeenCalledTimes(1);
    expect(w.sayNpc).toHaveBeenCalledWith("Welcome to the bar.", w.player);
    expect(w.sayPlayer).not.toHaveBeenCalled();

    // The choice wheel is private — pushed to the driver's Interactive,
    // never spoken into the room.
    expect(w.pending).toHaveLength(1);
    expect(w.pending[0]!.interactive).toBe(w.interactive);
    expect(w.pending[0]!.choices.map((c) => c.label)).toEqual(["Thanks."]);
  });

  it("a pick speaks the player's line, then the NPC replies (AC#4)", async () => {
    const w = makeWorld();
    await openWith(w, greetingTree());

    await w.pick(0);

    // Exterior: the player's character speaks the authored line aloud.
    expect(w.sayPlayer).toHaveBeenCalledWith("Thanks.", w.npc);
    // The NPC's terminal reply is heard too.
    expect(w.sayNpc).toHaveBeenCalledWith("Come again.", w.player);
  });

  it("holds voice+attention on both participants, freed at the terminal (AC#8)", async () => {
    const w = makeWorld();
    await openWith(w, greetingTree());

    expect(w.npc.getEngagementBySlot("voice")?.type).toBe(
      DIALOGUE_CONVERSATION_TYPE,
    );
    expect(w.npc.getEngagementBySlot("attention")?.type).toBe(
      DIALOGUE_CONVERSATION_TYPE,
    );
    expect(w.player.getEngagementBySlot("voice")?.type).toBe(
      DIALOGUE_PARTNER_TYPE,
    );
    expect(w.player.getEngagementBySlot("attention")?.type).toBe(
      DIALOGUE_PARTNER_TYPE,
    );

    await w.pick(0); // → terminal → end

    expect(w.npc.getEngagementBySlot("voice")).toBeUndefined();
    expect(w.npc.getEngagementBySlot("attention")).toBeUndefined();
    expect(w.player.getEngagementBySlot("voice")).toBeUndefined();
    expect(w.player.getEngagementBySlot("attention")).toBeUndefined();
  });

  it("declines a second driver on a busy NPC (1:1) (AC#3)", async () => {
    const w = makeWorld();
    await openWith(w, greetingTree());
    const second = await openWith(w, greetingTree());
    expect(second.ok).toBe(false);
    expect(second.reason).toBe("busy");
  });

  it("disconnect cancels the prompt and frees both sides (AC#8)", async () => {
    const w = makeWorld();
    await openWith(w, greetingTree());
    expect(w.npc.getEngagementBySlot("voice")).toBeDefined();

    await w.cancelPrompt();

    expect(w.npc.getEngagementBySlot("voice")).toBeUndefined();
    expect(w.player.getEngagementBySlot("attention")).toBeUndefined();
  });
});

describe("DialogueConversation — guards", () => {
  /** Two entries: a warm one gated on high regard, a neutral fallback. */
  function regardEntryTree(): DialogueTree {
    return {
      entry: [
        { node: "warm", guard: [{ fact: "regard", op: "gte", value: 20 }] },
        { node: "neutral" },
      ],
      nodes: {
        warm: { beat: "Good to see you again!", terminal: true },
        neutral: { beat: "What'll it be?", terminal: true },
      },
    };
  }

  it("selects a warmer entry node at high regard (AC#6)", async () => {
    const w = makeWorld();
    (RegardApi.getRegard as ReturnType<typeof vi.fn>).mockReturnValue(50);
    await openWith(w, regardEntryTree());
    expect(w.sayNpc).toHaveBeenCalledWith("Good to see you again!", w.player);
  });

  it("falls back to the neutral entry at low regard (AC#6)", async () => {
    const w = makeWorld();
    (RegardApi.getRegard as ReturnType<typeof vi.fn>).mockReturnValue(0);
    await openWith(w, regardEntryTree());
    expect(w.sayNpc).toHaveBeenCalledWith("What'll it be?", w.player);
  });

  it("hides a choice whose guard fails (AC#6)", async () => {
    const w = makeWorld();
    (RegardApi.getRegard as ReturnType<typeof vi.fn>).mockReturnValue(0);
    const tree: DialogueTree = {
      entry: [{ node: "root" }],
      nodes: {
        root: {
          beat: "Hi.",
          choices: [
            { line: "Public option.", to: "root" },
            {
              line: "Trusted option.",
              guard: [{ fact: "regard", op: "gte", value: 50 }],
              to: "root",
            },
          ],
        },
      },
    };
    await openWith(w, tree);
    expect(w.pending[0]!.choices.map((c) => c.label)).toEqual([
      "Public option.",
    ]);
  });
});

describe("DialogueConversation — effects", () => {
  it("applies a regard delta toward the speaker (AC#7)", async () => {
    const w = makeWorld();
    const tree: DialogueTree = {
      entry: [{ node: "root" }],
      nodes: {
        root: {
          beat: "Hi.",
          choices: [
            { line: "You're alright.", to: "bye", effects: [{ verb: "regard", delta: 5 }] },
          ],
        },
        bye: { beat: "Cheers.", terminal: true },
      },
    };
    await openWith(w, tree);
    await w.pick(0);
    expect(RegardApi.adjustRegard).toHaveBeenCalledWith(w.npc, w.player, 5);
  });

  it("ephemeral scratch is gone on re-open (AC#7)", async () => {
    const w = makeWorld();
    // A choice sets state; a follow-up choice is gated on that state.
    const tree: DialogueTree = {
      entry: [{ node: "root" }],
      nodes: {
        root: {
          beat: "Hi.",
          choices: [
            {
              line: "Set it.",
              to: "second",
              effects: [{ verb: "set-state", key: "told", value: true }],
            },
          ],
        },
        second: {
          beat: "And?",
          choices: [
            {
              line: "Secret unlocked.",
              guard: [{ fact: "state:told", op: "eq", value: true }],
              to: "bye",
            },
          ],
        },
        bye: { beat: "Bye.", terminal: true },
      },
    };

    await openWith(w, tree);
    await w.pick(0); // sets state → second node
    // Within the SAME conversation the state guard passes.
    expect(w.pending[0]!.choices.map((c) => c.label)).toEqual([
      "Secret unlocked.",
    ]);
    await w.pick(0); // → terminal, conversation ends

    // Re-open: fresh scratch. The first node has no state-gated choice,
    // and reaching `second` without setting state hides the gated choice.
    w.sayNpc.mockClear();
    const reopen: DialogueTree = {
      entry: [{ node: "second" }],
      nodes: tree.nodes,
    };
    await openWith(w, reopen);
    // Fresh scratch: the state-gated choice is hidden, so no wheel is
    // pushed and the conversation ends right after the beat.
    expect(w.sayNpc).toHaveBeenCalledWith("And?", w.player);
    expect(w.pending).toHaveLength(0);
    expect(w.npc.getEngagementBySlot("voice")).toBeUndefined();
  });
});
