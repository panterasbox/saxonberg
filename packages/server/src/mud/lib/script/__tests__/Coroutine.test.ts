/**
 * Coroutine tests — the temporal suspension shapes on a mock game clock,
 * driven with the fake-dispatch harness (no real commands): `wait`
 * suspends + resumes after the duration without blocking; detachment
 * (whenFirstYield resolves at the suspend, before completion); `every`
 * fires its block on cadence; `when` fires once its condition is truthy;
 * and cancellation stops a suspended run with a typed AbortReason.
 *
 * (The await-engaged pacing rule + barge-in are covered against the real
 * engaged-activity substrate in `coroutine-pacing.test.ts`.)
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Interpreter } from "../Interpreter";
import type { DispatchFn, RescheduleFn, ResourceLimits } from "../Interpreter";
import { Scope } from "../Scope";
import { WorldClockApi } from "../../../api/worldclock";
import { CommandDefinition } from "../../command/CommandDefinition";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { Script, Pipeline, Command, Arg } from "../ast";
import type { Stuff } from "../../stuff/Stuff";
import type { CommandGiver } from "../../command/CommandGiver";

/* ── AST builders ── */
const cmd = (word: string, ...args: Arg[]): Command => ({ kind: "command", word, args });
const lit = (value: string): Arg => ({ kind: "literal", value });
const expr = (source: string): Arg => ({ kind: "expr", source });
const block = (body: Script): Arg => ({ kind: "block", body });
const stmt = (command: Command): Pipeline => ({ kind: "pipeline", commands: [command] });
const scriptOf = (...commands: Command[]): Script => ({
  kind: "script",
  statements: commands.map(stmt),
});
const echo = (text: string) => cmd("echo", lit(text));

const ECHO = CommandDefinition.fromYaml(
  "verbs: [echo]\ncontroller: noop\ndescription: d\nargs:\n  - name: msg\n    type: string\n",
  "<test>",
);

function fakeGiver(): Stuff & CommandGiver {
  const giver = {
    getAffordances: () => [{ command: ECHO, source: giver, bucket: "self" }],
    getAvailableCommands: () => [ECHO],
    getContainer: () => null,
  };
  return giver as unknown as Stuff & CommandGiver;
}

const LIMITS: ResourceLimits = {
  sliceSteps: 10000,
  maxSteps: 10000,
  maxDispatch: 10000,
  maxDepth: 64,
};

function recorder() {
  const echoed: string[] = [];
  const dispatch: DispatchFn = async (command, model: CommandModel) => {
    if (command.getPrimaryVerb() === "echo") echoed.push(String(model.msg));
    return {
      getNotes: () => [],
      getStatus: () => "ok",
      note: () => {},
      setStatus: () => {},
    } as unknown as CommandContext;
  };
  const reschedule: RescheduleFn = async () => {};
  return { echoed, dispatch, reschedule };
}

/** Advance the game clock (scale 1 → realMs == game-ms) and drain. */
async function tick(realMs: number): Promise<void> {
  WorldClockApi._advanceForTesting(realMs);
  await new Promise<void>((r) => setTimeout(r, 0));
}

beforeEach(() => {
  WorldClockApi._resetForTesting();
  WorldClockApi.setScale(1);
});
afterEach(() => {
  WorldClockApi._resetForTesting();
});

describe("wait", () => {
  it("suspends, then resumes after the duration", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver(), LIMITS);
    const co = interp.startCoroutine(
      scriptOf(echo("a"), cmd("wait", lit("2s")), echo("b")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    // Detached at the wait — only the pre-wait statement ran.
    await co.whenFirstYield();
    expect(r.echoed).toEqual(["a"]);
    expect(co.getState()).toBe("suspended");

    // Before the duration: still suspended.
    await tick(1000);
    expect(r.echoed).toEqual(["a"]);

    // After the duration: resumes, runs the tail, settles.
    await tick(1000);
    const result = await co.whenSettled();
    expect(r.echoed).toEqual(["a", "b"]);
    expect(result.aborted).toBeUndefined();
    expect(co.getState()).toBe("done");
  });
});

describe("every", () => {
  it("fires its block on cadence (perpetual)", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver(), LIMITS);
    const co = interp.startCoroutine(
      scriptOf(cmd("every", lit("1s"), block(scriptOf(echo("tick"))))),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    await co.whenFirstYield();
    expect(co.getState()).toBe("suspended");

    await tick(1000);
    await tick(1000);
    await tick(1000);
    expect(r.echoed).toEqual(["tick", "tick", "tick"]);

    co.cancel("cancelled"); // stop the perpetual cadence
    await tick(1000);
    expect(r.echoed).toHaveLength(3); // no further fires
  });
});

describe("when", () => {
  it("fires its block once the condition becomes truthy, then resumes", async () => {
    const r = recorder();
    const scope = new Scope();
    scope.define("go", false);
    const interp = new Interpreter(fakeGiver(), LIMITS);
    const co = interp.startCoroutine(
      scriptOf(
        cmd("when", expr("$go"), block(scriptOf(echo("fired")))),
        echo("after"),
      ),
      scope,
      r.dispatch,
      r.reschedule,
    );
    await co.whenFirstYield();

    await tick(1000); // poll: cond false → nothing
    expect(r.echoed).toEqual([]);

    scope.set("go", true);
    await tick(1000); // poll: cond true → block fires, then resume
    const result = await co.whenSettled();
    expect(r.echoed).toEqual(["fired", "after"]);
    expect(result.aborted).toBeUndefined();
  });
});

describe("cancellation", () => {
  it("cancels a suspended run with a typed AbortReason; the timer is killed", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver(), LIMITS);
    const co = interp.startCoroutine(
      scriptOf(echo("a"), cmd("wait", lit("10s"), block(scriptOf())), echo("b")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    await co.whenFirstYield();
    expect(co.getState()).toBe("suspended");

    co.cancel("barge-in");
    const result = await co.whenSettled();
    expect(result.aborted).toBe("barge-in");
    expect(co.getState()).toBe("cancelled");

    // The wait timer was cancelled — the tail never runs.
    await tick(20000);
    expect(r.echoed).toEqual(["a"]);
  });
});
