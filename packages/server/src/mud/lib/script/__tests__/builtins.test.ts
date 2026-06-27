/**
 * Control-flow builtin tests — `set` / `if` / `each` / `while` / `def`
 * as interpreter-intrinsic commands, driven with the fake-dispatch
 * harness. Covers: conditional execution + else, the empty-set →
 * false / zero-iterations rule, block last-value yield, `each` binding
 * `it`, `def` params + shadowing, the finite `while`, and the
 * no-yield-loop preemption + step-ceiling abort. Also the parser's
 * leading-builtin script-mode trigger.
 */

import { describe, it, expect } from "vitest";
import { Interpreter } from "../Interpreter";
import type { DispatchFn, RescheduleFn, ResourceLimits } from "../Interpreter";
import { Scope } from "../Scope";
import type { ScriptValue } from "../Value";
import { CommandDefinition } from "../../command/CommandDefinition";
import type { CommandContext, CommandModel } from "../../../api/command";
import type { Script, Pipeline, Command, Arg } from "../ast";
import script from "../../command/parsers/script";
import type { ParserContext } from "../../../api/command";
import type { Stuff } from "../../stuff/Stuff";
import type { CommandGiver } from "../../command/CommandGiver";

/* ── AST builders ── */
const cmd = (word: string, ...args: Arg[]): Command => ({
  kind: "command",
  word,
  args,
});
const lit = (value: string): Arg => ({ kind: "literal", value });
const v = (name: string): Arg => ({ kind: "var", name });
const expr = (source: string): Arg => ({ kind: "expr", source });
const block = (body: Script): Arg => ({ kind: "block", body });
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

function run(ast: Script, limits: ResourceLimits = LIMITS, scope = new Scope()) {
  const r = recorder();
  const interp = new Interpreter(fakeGiver([ECHO]), limits);
  return interp
    .drive(ast, scope, r.dispatch, r.reschedule)
    .then((result) => ({ result, echoed: r.echoed }));
}

const echo = (text: string) => cmd("echo", lit(text));
const echoVar = (name: string) => cmd("echo", v(name));

describe("set", () => {
  it("assigns a frame var and yields the value", async () => {
    const { result } = await run(scriptOf(cmd("set", lit("x"), lit("5"))));
    expect(result.value).toBe("5");
  });

  it("a later statement reads the binding (top-level scope persists)", async () => {
    const { echoed } = await run(
      scriptOf(cmd("set", lit("x"), lit("5")), echoVar("x")),
    );
    expect(echoed).toEqual(["5"]);
  });
});

describe("if / else", () => {
  it("runs the then block when truthy", async () => {
    const { echoed } = await run(
      scriptOf(cmd("if", expr("true"), block(scriptOf(echo("yes"))))),
    );
    expect(echoed).toEqual(["yes"]);
  });

  it("skips the then block when falsy", async () => {
    const { echoed } = await run(
      scriptOf(cmd("if", expr("false"), block(scriptOf(echo("yes"))))),
    );
    expect(echoed).toEqual([]);
  });

  it("runs the else block when falsy", async () => {
    const { echoed } = await run(
      scriptOf(
        cmd(
          "if",
          expr("false"),
          block(scriptOf(echo("a"))),
          lit("else"),
          block(scriptOf(echo("b"))),
        ),
      ),
    );
    expect(echoed).toEqual(["b"]);
  });

  it("an empty set reads as false", async () => {
    const scope = new Scope();
    scope.define("empty", []);
    const { echoed } = await run(
      scriptOf(cmd("if", expr("$empty"), block(scriptOf(echo("x"))))),
      LIMITS,
      scope,
    );
    expect(echoed).toEqual([]);
  });

  it("yields the chosen block's last value (if in value position)", async () => {
    const { result } = await run(
      scriptOf(cmd("if", expr("true"), block(scriptOf(cmd("set", lit("r"), lit("9")))))),
    );
    expect(result.value).toBe("9");
  });
});

describe("each", () => {
  it("invokes the block once per item, binding it", async () => {
    const scope = new Scope();
    // A scalar list is a test convenience — v1's only list source is an
    // MQL StuffList — but `each`/`it` are value-type-agnostic, so a
    // string list cleanly demonstrates per-item binding + readback.
    scope.define("nums", ["a", "b", "c"] as unknown as ScriptValue);
    const { echoed } = await run(
      scriptOf(cmd("each", expr("$nums"), block(scriptOf(echoVar("it"))))),
      LIMITS,
      scope,
    );
    expect(echoed).toEqual(["a", "b", "c"]);
  });

  it("an empty set runs zero iterations", async () => {
    const scope = new Scope();
    scope.define("nums", []);
    const { echoed } = await run(
      scriptOf(cmd("each", expr("$nums"), block(scriptOf(echo("x"))))),
      LIMITS,
      scope,
    );
    expect(echoed).toEqual([]);
  });
});

describe("def", () => {
  it("defines an invocable command; params bind positionally", async () => {
    const { echoed } = await run(
      scriptOf(
        cmd("def", lit("greet"), expr("$who"), block(scriptOf(echoVar("who")))),
        cmd("greet", lit("Bob")),
      ),
    );
    expect(echoed).toEqual(["Bob"]);
  });

  it("a no-param def works", async () => {
    const { echoed } = await run(
      scriptOf(
        cmd("def", lit("hi"), block(scriptOf(echo("hello")))),
        cmd("hi"),
      ),
    );
    expect(echoed).toEqual(["hello"]);
  });

  it("a param shadows an outer binding, which is left intact", async () => {
    const { echoed } = await run(
      scriptOf(
        cmd("set", lit("who"), lit("Alice")),
        cmd("def", lit("greet"), expr("$who"), block(scriptOf(echoVar("who")))),
        cmd("greet", lit("Bob")),
        echoVar("who"),
      ),
    );
    // param 'who'=Bob inside greet; outer who still Alice afterwards.
    expect(echoed).toEqual(["Bob", "Alice"]);
  });
});

describe("while", () => {
  it("does not iterate when the condition starts false", async () => {
    const { echoed } = await run(
      scriptOf(cmd("while", expr("false"), block(scriptOf(echo("x"))))),
    );
    expect(echoed).toEqual([]);
  });

  it("loops until a flag flips (mutation reaches the outer binding)", async () => {
    const { echoed } = await run(
      scriptOf(
        cmd("set", lit("go"), expr("true")),
        cmd(
          "while",
          expr("$go"),
          block(scriptOf(echo("x"), cmd("set", lit("go"), expr("false")))),
        ),
      ),
    );
    expect(echoed).toEqual(["x"]); // one iteration
  });

  it("a no-yield infinite loop is bounded by the step ceiling (no freeze)", async () => {
    const { result, echoed } = await run(
      scriptOf(cmd("while", expr("true"), block(scriptOf(echo("x"))))),
      { ...LIMITS, maxSteps: 6 },
    );
    expect(result.aborted).toBe("resource-limit");
    expect(result.detail).toBe("steps");
    // Partial effects stand — some iterations ran before the ceiling.
    expect(echoed.length).toBeGreaterThan(0);
  });
});

describe("recursion-depth ceiling", () => {
  it("a runaway recursive def aborts on depth (no stack blowout)", async () => {
    const { result } = await run(
      scriptOf(
        cmd("def", lit("loop"), block(scriptOf(cmd("loop")))),
        cmd("loop"),
      ),
      { ...LIMITS, maxDepth: 8 },
    );
    expect(result.aborted).toBe("resource-limit");
    expect(result.detail).toBe("depth");
  });
});

describe("parser — leading-builtin script-mode trigger", () => {
  const ctx = {
    commandGiver: {} as unknown,
    location: null,
    available: [],
  } as unknown as ParserContext;

  it("routes a lone `set x (5)` to the interpreter (script arm)", () => {
    const result = script.parse("set x (5)", ctx);
    expect((result as { script?: unknown }).script).toBeDefined();
  });

  it("still fast-paths a non-builtin bare command to msh", () => {
    const result = script.parse("look at rose", ctx);
    expect((result as { parsed?: unknown }).parsed).toBeDefined();
    expect((result as { script?: unknown }).script).toBeUndefined();
  });
});
