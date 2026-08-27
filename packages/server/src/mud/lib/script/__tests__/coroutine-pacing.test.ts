/**
 * Coroutine await-engaged pacing — the P4↔P5 integration.
 *
 * Drives a Coroutine over a generator that dispatches two "steps", with a
 * fake dispatcher that starts a real `ManualBuildStep` engagement (hands
 * slot, game-clock duration) on each. Proves the sequential-completion
 * rule: the second statement does NOT dispatch until the first engaged
 * step completes (the build trickles step-by-step, no instant dump), and
 * a barge-in (cancel) mid-step aborts the activity and stops the script —
 * its effect never lands (partial matter standing).
 */

import "../../../../test-bootstrap";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Coroutine } from "../Coroutine";
import { Interpreter } from "../Interpreter";
import type { Eval, DispatchFn, RescheduleFn, ResourceLimits } from "../Interpreter";
import { ManualBuildStep } from "../../craft/ManualBuildStep";
import { SchedulerApi } from "../../../api/scheduler";
import { WorldClockApi } from "../../../api/worldclock";
import { StuffApi } from "../../../api/stuff";
import { EventApi } from "../../../api/event";
import EventRegistry from "../../../platform/idea/EventRegistry";
import { CommandDefinition } from "../../command/CommandDefinition";
import { Idea } from "../../stuff/Idea";
import { Stuff } from "../../stuff/Stuff";
import { CommandGiverMixin } from "../../command/CommandGiver";
import { EngagedMixin } from "../../activity/Engaged";
import type { Engaged } from "../../activity/Engaged";
import type { CommandContext } from "../../../api/command";
import type { CommandGiver } from "../../command/CommandGiver";
import { makeStuff } from "../../security/__tests__/test-setup";

class TestActor extends CommandGiverMixin(EngagedMixin(Idea)) {}

const STEP = CommandDefinition.fromYaml(
  "verbs: [step]\ncontroller: x\ndescription: d\n",
  "<test>",
);

const LIMITS: ResourceLimits = {
  sliceSteps: 10000,
  maxSteps: 10000,
  maxDispatch: 10000,
  maxDepth: 64,
};

let actor: TestActor;

beforeEach(async () => {
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
  SchedulerApi._clearAllForTesting();
  StuffApi.clearAll();
  const reg = await StuffApi.create(() => {
    const r = new EventRegistry();
    Stuff._stampTemplatePath(r, "/platform/idea/EventRegistry");
    return r;
  });
  StuffApi.unregister(reg);
  StuffApi.register(reg);
  EventApi._setRegistryForTesting(reg);
  actor = makeStuff(() => new TestActor());
});

afterEach(() => {
  SchedulerApi._clearAllForTesting();
  WorldClockApi._resetForTesting();
});

async function tick(realMs: number): Promise<void> {
  WorldClockApi._advanceForTesting(realMs);
  await new Promise<void>((r) => setTimeout(r, 0));
}

/** A two-statement script (hand-written generator) that dispatches twice. */
function* twoSteps(): Eval<undefined> {
  yield { kind: "dispatch", command: STEP, model: {}, prep: {} };
  yield { kind: "dispatch", command: STEP, model: {}, prep: {} };
  return undefined;
}

function makeRun() {
  const dispatched: number[] = [];
  const completed: number[] = [];
  const interp = new Interpreter(actor as unknown as Stuff & CommandGiver, LIMITS);
  const dispatch: DispatchFn = async () => {
    const index = dispatched.length;
    dispatched.push(index);
    // The dispatched command starts a 2s engaged step (the P4 pattern).
    const step = new ManualBuildStep({
      actor: actor as unknown as Stuff & Engaged,
      slots: ["hands"],
      durationMs: 2000,
      onComplete: () => completed.push(index),
    });
    SchedulerApi.start(step);
    return {
      getNotes: () => [],
      getStatus: () => "ok",
      note: () => {},
      setStatus: () => {},
    } as unknown as CommandContext;
  };
  const reschedule: RescheduleFn = async () => {};
  const co = new Coroutine(twoSteps(), interp, dispatch, reschedule);
  return { co, dispatched, completed };
}

describe("await-engaged pacing", () => {
  it("waits for each engaged step to complete before the next dispatches", async () => {
    const { co, dispatched, completed } = makeRun();
    co.start();
    await co.whenFirstYield();

    // Paced: only the first step has dispatched; it's still engaged.
    expect(dispatched).toEqual([0]);
    expect(completed).toEqual([]);
    expect(actor.hasEngagement("hands")).toBe(true);
    expect(co.getState()).toBe("suspended");

    // First step completes on the game clock → the second dispatches.
    await tick(2000);
    expect(completed).toEqual([0]);
    expect(dispatched).toEqual([0, 1]);

    // Second completes → the script finishes.
    await tick(2000);
    const result = await co.whenSettled();
    expect(completed).toEqual([0, 1]);
    expect(result.aborted).toBeUndefined();
  });

  it("a barge-in mid-step aborts the activity and stops the script", async () => {
    const { co, dispatched, completed } = makeRun();
    co.start();
    await co.whenFirstYield();
    expect(dispatched).toEqual([0]);

    // Barge in: cancel the coroutine — aborts the in-flight step.
    co.cancel("barge-in");
    const result = await co.whenSettled();
    expect(result.aborted).toBe("barge-in");
    expect(actor.hasEngagement("hands")).toBe(false); // step aborted

    // The aborted step's effect never landed; the second never dispatched.
    await tick(4000);
    expect(completed).toEqual([]);
    expect(dispatched).toEqual([0]);
  });
});
