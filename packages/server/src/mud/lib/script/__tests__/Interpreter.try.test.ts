/**
 * Failure-model W2 — a script stops at its first refusal, `try … on`
 * handles one, `$why` reads it, and nothing catches a defect.
 */
import "../../../../test-bootstrap";
import type { Affordance, AffordanceMatch } from "../../command/CommandGiver";
import { describe, it, expect, beforeEach } from "vitest";
import { Interpreter } from "../Interpreter";
import { Refusal } from "../../errors";
import { CommandApi } from "../../../api/command";
import { makeStuff } from "../../security/__tests__/test-setup";
import { Idea } from "../../stuff/Idea";
import type {
  DispatchFn,
  RescheduleFn,
  ResourceLimits,
  Resume,
  Effect,
} from "../Interpreter";
import { Scope } from "../Scope";
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
const OPEN = stub("verbs: [open]\ncontroller: noop\ndescription: d\nargs:\n  - name: target\n    type: string\n");
const BREAK = stub("verbs: [boom]\ncontroller: noop\ndescription: d\n");
const ECHO = stub(
  "verbs: [echo]\ncontroller: noop\ndescription: d\nargs:\n  - name: msg\n    type: string\n",
);

function fakeGiver(defs: CommandDefinition[]): Stuff & CommandGiver {
  const giver = {
    getAffordances: () =>
      defs.map((command) => ({ command, source: giver, bucket: "self" })),
    getAvailableCommands: () => defs,
    getContainer: () => null,
    // The dispatcher's shared matcher, unscoped (verb filter only).
    matchAffordances: (parsed: { verb: string }): AffordanceMatch => ({
      ok: true,
      matches: (giver.getAffordances() as unknown as Affordance[]).filter((a) => a.command.hasVerb(parsed.verb)),
      usage: "",
    }),
  };
  return giver as unknown as Stuff & CommandGiver;
}

const LIMITS: ResourceLimits = {
  sliceSteps: 10000,
  maxSteps: 10000,
  maxDispatch: 10000,
  maxDepth: 64,
};


/** A block arg. */
const blk = (...commands: Command[]): Arg => ({ kind: "block", body: scriptOf(...commands) });
const lit = (value: string): Arg => ({ kind: "literal", value });

let DOOR: Stuff;

/**
 * A dispatcher whose verbs answer as told: `open` is refused `locked` (a
 * migrated controller handing its refusal over), `boom` is a defect (an
 * `error` status), anything else goes through.
 */
function world() {
  const lines: string[] = [];
  const dispatch: DispatchFn = async (command, model, _prep, _source, line) => {
    lines.push(line ?? command.getPrimaryVerb());
    const verb = command.getPrimaryVerb();
    const refusal = verb === "open" && (model as { target?: string }).target !== `#${DOOR.stuffId}`
      ? new Refusal("locked", { target: DOOR })
      : null;
    const status = verb === "boom" ? "error" : refusal ? "declined" : "ok";
    return {
      getNotes: () => (refusal ? [{ kind: "refused", reason: "locked", facts: {} }] : status === "error" ? [{ kind: "controller-error", controller: "x", detail: "Something went wrong." }] : []),
      getStatus: () => status,
      getRefusal: () => refusal,
      note: () => {},
      setStatus: () => {},
    } as unknown as CommandContext;
  };
  return { lines, dispatch, reschedule: (async () => undefined) as RescheduleFn };
}

beforeEach(() => {
  DOOR = makeStuff(() => new Idea());
  const reasons = CommandApi.reasons();
  for (const [path, data] of [
    ["/platform/reasons/locked", { facts: { target: "thing" }, says: "Locked: {{ target | item }}." }],
    ["/platform/reasons/went-wrong", { says: "Something went wrong.", catchable: false }],
  ] as const) {
    reasons.forget([path]);
    reasons.remember(path, reasons.parse(data as Record<string, unknown>, path));
  }
});

describe("failure model W2 — a script stops at a refusal", () => {
  it("stops at the refused line; the next never runs; the stop names the line and the refusal", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([OPEN, PING]), LIMITS);
    const result = await interp.drive(scriptOf(cmd("open", lit("north")), cmd("ping")), new Scope(), w.dispatch, w.reschedule);
    expect(w.lines).toEqual(["open north"]);
    expect(result.aborted).toBe("step-declined");
    expect(result.stopped?.line).toBe("open north");
    expect(result.stopped?.refusal?.reason).toBe("locked");
    // The refused line's notes are held for the stop report, not threaded twice.
    expect(result.notes.some((n) => n.kind === "refused")).toBe(false);
  });

  it("`try … on locked` runs the handler with $why; the script goes on", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([OPEN, PING]), LIMITS);
    const script = scriptOf(
      cmd("try", blk(cmd("open", lit("north"))), lit("on"), lit("locked"), blk(cmd("open", v("why.target")))),
      cmd("ping"),
    );
    const result = await interp.drive(script, new Scope(), w.dispatch, w.reschedule);
    expect(result.aborted).toBeUndefined();
    // ⭐ $why.target rendered as #<id> — that exact door.
    expect(w.lines).toEqual(["open north", "open $why.target", "ping"]);
  });

  it("$why.reason is the canonical code; a path code matches its bare word", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([OPEN, PING]), LIMITS);
    const scope = new Scope();
    scope.define("got", "");
    const script = scriptOf(
      cmd("try", blk(cmd("open", lit("north"))), lit("on"), lit("/platform/reasons/locked"), blk(cmd("set", lit("got"), v("why.reason")))),
    );
    await interp.drive(script, scope, w.dispatch, w.reschedule);
    expect(scope.get("got")).toBe("locked");
  });

  it("a clause that does not name the reason lets it through", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([OPEN, PING]), LIMITS);
    const script = scriptOf(cmd("try", blk(cmd("open", lit("north"))), lit("on"), lit("no-key"), blk(cmd("ping"))));
    const result = await interp.drive(script, new Scope(), w.dispatch, w.reschedule);
    expect(result.aborted).toBe("step-declined");
    expect(w.lines).toEqual(["open north"]);
  });

  it("a refusal inside a handler propagates", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([OPEN, PING]), LIMITS);
    const script = scriptOf(
      cmd("try", blk(cmd("open", lit("north"))), lit("on"), lit("*"), blk(cmd("open", lit("south")))),
      cmd("ping"),
    );
    const result = await interp.drive(script, new Scope(), w.dispatch, w.reschedule);
    expect(result.aborted).toBe("step-declined");
    expect(result.stopped?.line).toBe("open south");
    expect(w.lines).toEqual(["open north", "open south"]);
  });

  it("⛔ `on *` never catches a defect", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([BREAK, PING]), LIMITS);
    const script = scriptOf(cmd("try", blk(cmd("boom")), lit("on"), lit("*"), blk(cmd("ping"))), cmd("ping"));
    const result = await interp.drive(script, new Scope(), w.dispatch, w.reschedule);
    expect(result.aborted).toBe("step-declined");
    expect(result.stopped?.refusal).toBeNull();
    expect(w.lines).toEqual(["boom"]);
    // The defect's own notes ride as before.
    expect(result.notes.some((n) => n.kind === "controller-error")).toBe(true);
  });

  it("a line the binder refuses is a refusal too", async () => {
    const w = world();
    const interp = new Interpreter(fakeGiver([PING]), LIMITS);
    const result = await interp.drive(scriptOf(cmd("nosuchverb"), cmd("ping")), new Scope(), w.dispatch, w.reschedule);
    expect(result.aborted).toBe("step-declined");
    expect(result.stopped?.refusal?.reason).toBe("unknown-verb");
    expect(w.lines).toEqual([]);
  });
});
