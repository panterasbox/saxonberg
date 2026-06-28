/**
 * Interpreter tests (unit) — the generator evaluator driven with a fake
 * dispatch handler, so the engine spine is exercised without real
 * commands: dispatch carries the bound command/model, scope + `$`
 * substitution (frame-first, shell-fallback), the `( )` island into an
 * arg, the block keystone (closure capture + child-scope invocation),
 * and resource governance (the slice + the tiered ceilings).
 *
 * The real-bus integration (a scripted command dispatching over the
 * actual pipeline) is in `interpreter-dispatch.test.ts`.
 */

import { describe, it, expect } from "vitest";
import { Interpreter } from "../Interpreter";
import type {
  DispatchFn,
  RescheduleFn,
  ResourceLimits,
  Resume,
  Effect,
} from "../Interpreter";
import { Scope } from "../Scope";
import { Block } from "../Block";
import { CommandDefinition } from "../../command/CommandDefinition";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { Script, Pipeline, Command, Arg } from "../ast";
import type { Stuff } from "../../stuff/Stuff";
import type { CommandGiver } from "../../command/CommandGiver";

/* ── AST builders ── */
const cmd = (word: string, ...args: Arg[]): Command => ({
  kind: "command",
  word,
  args,
});
const v = (name: string): Arg => ({ kind: "var", name });
const expr = (source: string): Arg => ({ kind: "expr", source });
const stmt = (command: Command): Pipeline => ({
  kind: "pipeline",
  commands: [command],
});
const scriptOf = (...commands: Command[]): Script => ({
  kind: "script",
  statements: commands.map(stmt),
});

/* ── stub commands + fake giver ── */
function stub(yaml: string): CommandDefinition {
  return CommandDefinition.fromYaml(yaml, "<test>");
}
const PING = stub("verbs: [ping]\ncontroller: noop\ndescription: d\n");
const ECHO = stub(
  "verbs: [echo]\ncontroller: noop\ndescription: d\nargs:\n  - name: msg\n    type: string\n",
);

function fakeGiver(defs: CommandDefinition[]): Stuff & CommandGiver {
  const giver = {
    getAffordances: () =>
      defs.map((command) => ({ command, source: giver, bucket: "self" })),
    getAvailableCommands: () => defs,
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

/* ── fake effect handlers ── */
function recorder() {
  const dispatched: { verb: string; model: CommandModel }[] = [];
  let slices = 0;
  const dispatch: DispatchFn = async (command, model) => {
    dispatched.push({ verb: command.getPrimaryVerb(), model });
    return {
      getNotes: () => [],
      getStatus: () => "ok",
      note: () => {},
      setStatus: () => {},
    } as unknown as CommandContext;
  };
  const reschedule: RescheduleFn = async () => {
    slices++;
  };
  return {
    dispatched,
    dispatch,
    reschedule,
    sliceCount: () => slices,
  };
}

/** Pump a generator (for invokeBlock, which `drive` doesn't wrap). */
async function pump(
  gen: Generator<Effect, unknown, Resume>,
  dispatch: DispatchFn,
  reschedule: RescheduleFn,
): Promise<unknown> {
  let resume: Resume = undefined;
  for (;;) {
    const step = gen.next(resume);
    if (step.done) return step.value;
    const effect = step.value;
    if (effect.kind === "dispatch") {
      resume = await dispatch(effect.command, effect.model, effect.prep);
    } else {
      await reschedule();
      resume = undefined;
    }
  }
}

describe("Interpreter — dispatch over the bus", () => {
  it("binds and dispatches a plain command", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), LIMITS);
    const result = await interp.drive(
      scriptOf(cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(result.aborted).toBeUndefined();
    expect(r.dispatched.map((d) => d.verb)).toEqual(["ping"]);
  });

  it("runs multi-statement scripts in order", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), LIMITS);
    await interp.drive(
      scriptOf(cmd("ping"), cmd("ping"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(r.dispatched).toHaveLength(3);
  });

  it("notes an unknown verb and continues to the next statement", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), LIMITS);
    const result = await interp.drive(
      scriptOf(cmd("frobnicate"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(r.dispatched.map((d) => d.verb)).toEqual(["ping"]);
    expect(result.notes.some((n) => n.kind === "command-rejected")).toBe(true);
  });
});

describe("Interpreter — $ substitution", () => {
  it("frame-first: a bound var renders its value into the arg", async () => {
    const r = recorder();
    const scope = new Scope();
    scope.define("brand", "Vionne");
    const interp = new Interpreter(fakeGiver([ECHO]), LIMITS);
    await interp.drive(
      scriptOf(cmd("echo", v("brand"))),
      scope,
      r.dispatch,
      r.reschedule,
    );
    expect(r.dispatched[0]!.model.msg).toBe("Vionne");
  });

  it("shell-fallback: an unbound var passes `$name` through untouched", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([ECHO]), LIMITS);
    await interp.drive(
      scriptOf(cmd("echo", v("brand"))),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    // Left literal for the downstream ShellApi.expandVariables pre-pass.
    expect(r.dispatched[0]!.model.msg).toBe("$brand");
  });
});

describe("Interpreter — the ( ) island into an arg", () => {
  it("binds an infix scalar result into the command arg", async () => {
    const r = recorder();
    const scope = new Scope();
    scope.define("x", 5);
    const interp = new Interpreter(fakeGiver([ECHO]), LIMITS);
    await interp.drive(
      scriptOf(cmd("echo", expr("$x"))),
      scope,
      r.dispatch,
      r.reschedule,
    );
    expect(r.dispatched[0]!.model.msg).toBe("5");
  });
});

describe("Interpreter — the block keystone", () => {
  it("evalArg makes a block a closure capturing the current scope", () => {
    const interp = new Interpreter(fakeGiver([PING]), LIMITS);
    const scope = new Scope();
    const body = scriptOf(cmd("ping"));
    const value = interp.evalArg({ kind: "block", body }, scope);
    expect(value).toBeInstanceOf(Block);
    const block = value as Block;
    expect(block.getCapturedScope()).toBe(scope);
    expect(block.getBody()).toBe(body);
  });

  it("invokeBlock runs the body in a child of the captured scope (closure)", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([ECHO]), LIMITS);
    const captured = new Scope();
    captured.define("brand", "Vionne");
    const block = new Block(scriptOf(cmd("echo", v("brand"))), captured);
    const value = await pump(interp.invokeBlock(block), r.dispatch, r.reschedule);
    // The block body saw the captured environment.
    expect(r.dispatched[0]!.model.msg).toBe("Vionne");
    // A plain-command body yields void in v1 (non-void last-value yield
    // arrives with the P3 control-flow builtins / the value channel).
    expect(value).toBeUndefined();
  });

  it("rejects a block passed to a plain (non-builtin) command", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([ECHO]), LIMITS);
    const block: Arg = { kind: "block", body: scriptOf(cmd("ping")) };
    const result = await interp.drive(
      scriptOf(cmd("echo", block)),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(r.dispatched).toHaveLength(0);
    expect(result.notes.some((n) => n.kind === "command-rejected")).toBe(true);
  });
});

describe("Interpreter — resource governance", () => {
  it("the step ceiling aborts gracefully; partial effects stand", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), {
      ...LIMITS,
      maxSteps: 2,
    });
    const result = await interp.drive(
      scriptOf(cmd("ping"), cmd("ping"), cmd("ping"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(result.aborted).toBe("resource-limit");
    expect(result.detail).toBe("steps");
    expect(r.dispatched).toHaveLength(2); // the first two ran
  });

  it("the dispatch ceiling aborts gracefully", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), {
      ...LIMITS,
      maxDispatch: 2,
    });
    const result = await interp.drive(
      scriptOf(cmd("ping"), cmd("ping"), cmd("ping"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    expect(result.aborted).toBe("resource-limit");
    expect(result.detail).toBe("dispatch");
    expect(r.dispatched).toHaveLength(2);
  });

  it("the preemption slice yields the event loop every K steps", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), {
      ...LIMITS,
      sliceSteps: 2,
    });
    await interp.drive(
      scriptOf(cmd("ping"), cmd("ping"), cmd("ping"), cmd("ping"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    // Slices at steps 2 and 4 → the loop yielded twice (interleaving).
    expect(r.sliceCount()).toBe(2);
  });

  it("a tight cadence yields between every step (no monopolization)", async () => {
    const r = recorder();
    const interp = new Interpreter(fakeGiver([PING]), {
      ...LIMITS,
      sliceSteps: 1,
    });
    await interp.drive(
      scriptOf(cmd("ping"), cmd("ping"), cmd("ping")),
      new Scope(),
      r.dispatch,
      r.reschedule,
    );
    // Every step yielded — a no-yield loop becomes cooperative.
    expect(r.sliceCount()).toBe(3);
  });
});
