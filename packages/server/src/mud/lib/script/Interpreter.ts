/**
 * Interpreter — the script execution engine.
 *
 * **Generator / explicit-effect, never recursive-await.** The evaluator
 * is a *synchronous* generator that `yield`s typed {@link Effect}s; an
 * async `drive` pump handles each effect and resumes the generator. This
 * shape is load-bearing and decided here (not deferred): because the
 * evaluator is a generator, (1) suspension (P5 — `wait` / `every` /
 * await-engaged) is "stop pumping, persist the generator, resume on a
 * scheduler signal" with no rewrite, and (2) the **preemption slice** —
 * yielding every K steps so a no-yield loop can't freeze the
 * single-threaded event loop — is the *same* yield mechanism, triggered
 * by "ran K steps" instead of `wait`. A recursive-await tree-walk could
 * do neither without a CPS rewrite.
 *
 * **Conducts the bus, never bypasses it.** Each plain command is bound
 * to `{ command, model }` and handed to the dispatcher's bound tail
 * (resolve → validate → execute) via the injected {@link DispatchFn}, so
 * a scripted command is gated, attributed, and **scope-re-checked**
 * exactly like a typed one. The binder (`bindCommand`) is built
 * generally — render the evaluated args, match the affordance,
 * `CommandApi.assemble` → model — so the piping value channel reuses it
 * (forward-compat commitment #3).
 *
 * **Resource governance** (the tiered ceiling + the slice) lives here:
 * `step()` counts + slices + enforces the step ceiling; `bindCommand`
 * enforces the dispatch-count ceiling; `invokeBlock` enforces the
 * recursion-depth ceiling. All limit *values* are caller-supplied
 * (`ResourceLimits`, read from `AppSettings` by `ScriptLogic`); the tier
 * *selection* is mechanical (authorship). Exceeding any ceiling throws
 * {@link ResourceLimitError}, which the pump turns into a graceful
 * `resource-limit` abort (partial effects stand — no rollback).
 *
 * v1 scope (P2): plain-command dispatch, the block keystone (value +
 * child-scope invocation + last-value yield), `$` (frame-first), the
 * `( )` island, scope/frames, and resource limits. Control-flow builtins
 * (`if` / `each` / `def` / `while`) land in P3; the temporal builtins +
 * suspension (the `suspend` effect) in P5 — both graft onto this spine.
 */

import { CommandLineApi } from "../../api/command-line";
import { CommandApi } from "../../api/command";
import type { CommandModel, CommandContext } from "../../api/command";
import { MixinApi } from "../../api/mixin";
import { Expression } from "./Expression";
import { Block } from "./Block";
import { Scope } from "./Scope";
import type { ScriptValue } from "./Value";
import type { Script, Pipeline, Command, Arg } from "./ast";
import type { Stuff } from "../stuff/Stuff";
import type { CommandGiver } from "../command/CommandGiver";
import type { CommandDefinition } from "../command/CommandDefinition";
import type { Note } from "@saxonberg/types";
import type { ScriptAbortReason } from "./AbortReason";

/** A unit of work the sync evaluator hands to the async pump. */
export type Effect =
  | {
      kind: "dispatch";
      command: CommandDefinition;
      model: CommandModel;
      prep: Record<string, string>;
    }
  | { kind: "slice" };

/** Value the pump feeds back after handling an effect. */
export type Resume = CommandContext | undefined;

/** The evaluator's generator shape. */
export type Eval<T> = Generator<Effect, T, Resume>;

/** Operator-tunable limit set (values from `AppSettings`; tier mechanical). */
export interface ResourceLimits {
  /** Preemption slice — yield to the event loop every this-many steps. */
  sliceSteps: number;
  /** Lifetime step ceiling (catches tight loops). */
  maxSteps: number;
  /** Lifetime dispatch ceiling (catches `each (huge-set)` fan-out). */
  maxDispatch: number;
  /** Recursion-depth ceiling (block invocation nesting). */
  maxDepth: number;
}

/** Runs a bound command's resolve→validate→execute tail; returns its ctx. */
export type DispatchFn = (
  command: CommandDefinition,
  model: CommandModel,
  prep: Record<string, string>,
) => Promise<CommandContext>;

/** Yields the event loop for one macrotask (the preemption slice). */
export type RescheduleFn = () => Promise<void>;

/** Outcome of a driven script. */
export interface DriveResult {
  /** The script's value (its last statement's value). */
  value: ScriptValue;
  /** Notes accumulated across every dispatched command. */
  notes: Note[];
  /** Set when the run stopped early; partial effects stand. */
  aborted?: ScriptAbortReason;
  /** Human-facing detail for an abort / limit. */
  detail?: string;
}

/** Thrown when a lifetime ceiling is exceeded; pump → graceful abort. */
export class ResourceLimitError extends Error {
  constructor(public readonly which: "steps" | "dispatch" | "depth") {
    super(`script resource limit exceeded: ${which}`);
    this.name = "ResourceLimitError";
  }
}

const NEEDS_QUOTING_RE = /[\s"\\|]/;

export class Interpreter {
  private steps = 0;
  private dispatches = 0;
  private depth = 0;
  private readonly notes: Note[] = [];

  constructor(
    private readonly actor: Stuff & CommandGiver,
    private readonly limits: ResourceLimits,
  ) {}

  /**
   * Pump the evaluator to completion. Handles each yielded effect —
   * `dispatch` runs the bound command tail and resumes with its ctx;
   * `slice` yields the event loop and resumes. A `ResourceLimitError`
   * becomes a graceful `resource-limit` abort.
   */
  async drive(
    ast: Script,
    scope: Scope,
    dispatch: DispatchFn,
    reschedule: RescheduleFn,
  ): Promise<DriveResult> {
    const gen = this.evalScript(ast, scope);
    let resume: Resume = undefined;
    for (;;) {
      let step: IteratorResult<Effect, ScriptValue>;
      try {
        step = gen.next(resume);
      } catch (error) {
        if (error instanceof ResourceLimitError) {
          return {
            value: undefined,
            notes: this.notes,
            aborted: "resource-limit",
            detail: error.which,
          };
        }
        throw error;
      }
      if (step.done) {
        return { value: step.value, notes: this.notes };
      }
      const effect = step.value;
      if (effect.kind === "dispatch") {
        const ctx = await dispatch(effect.command, effect.model, effect.prep);
        for (const note of ctx.getNotes()) this.notes.push(note);
        resume = ctx;
      } else {
        await reschedule();
        resume = undefined;
      }
    }
  }

  /* ───────────────────── sync evaluator ───────────────────── */

  /** Run a script body; returns the last statement's value (block-yield). */
  private *evalScript(script: Script, scope: Scope): Eval<ScriptValue> {
    let last: ScriptValue = undefined;
    for (const pipeline of script.statements) {
      last = yield* this.evalPipeline(pipeline, scope);
    }
    return last;
  }

  private *evalPipeline(pipeline: Pipeline, scope: Scope): Eval<ScriptValue> {
    // v1 executes single-command pipelines only (matching the tokenizer).
    // A multi-stage pipeline is parsed (the pipe-shaped node) but its
    // execution is deferred with the value channel — note and skip.
    if (pipeline.commands.length !== 1) {
      this.note({
        kind: "command-rejected",
        reason: "parse-failed",
        detail: "command piping is not yet implemented",
      });
      return undefined;
    }
    return yield* this.evalCommand(pipeline.commands[0]!, scope);
  }

  private *evalCommand(command: Command, scope: Scope): Eval<ScriptValue> {
    yield* this.step();
    // (P3) builtins — if/each/def/while/set — branch here on the verb,
    // taking raw (unevaluated) block/condition args. v1: every command
    // goes over the bus.
    const bound = this.bindCommand(command, scope);
    if (bound === null) return undefined; // unknown verb / bind shape — noted
    if (++this.dispatches > this.limits.maxDispatch) {
      throw new ResourceLimitError("dispatch");
    }
    yield {
      kind: "dispatch",
      command: bound.command,
      model: bound.model,
      prep: bound.prep,
    };
    return undefined; // the command value channel is deferred with piping
  }

  /**
   * Invoke a block: run its body in a fresh child of its captured scope
   * (the closure), yielding its last statement's value. May suspend (P5)
   * since the body can contain `wait`. Public — the keystone primitive
   * P3 control-flow builtins drive.
   */
  *invokeBlock(block: Block): Eval<ScriptValue> {
    if (++this.depth > this.limits.maxDepth) {
      this.depth--;
      throw new ResourceLimitError("depth");
    }
    try {
      const child = block.getCapturedScope().child();
      return yield* this.evalScript(block.getBody(), child);
    } finally {
      this.depth--;
    }
  }

  /**
   * Evaluate an argument to a value. Public so P3 builtins (`set name
   * (expr)`) and tests can evaluate args directly. A `{block}` arg
   * becomes an inert {@link Block} capturing the current scope.
   */
  evalArg(arg: Arg, scope: Scope): ScriptValue {
    switch (arg.kind) {
      case "literal":
        return arg.value;
      case "var":
        return scope.get(arg.name);
      case "expr":
        return Expression.evaluate(arg.source, scope, this.actor);
      case "block":
        return new Block(arg.body, scope);
    }
  }

  /* ─────────────────── step / governance ─────────────────── */

  /** One interpreter step: count, enforce the step ceiling, slice. */
  private *step(): Eval<void> {
    this.steps++;
    if (this.steps > this.limits.maxSteps) {
      throw new ResourceLimitError("steps");
    }
    if (this.steps % this.limits.sliceSteps === 0) {
      yield { kind: "slice" };
    }
  }

  /* ─────────────────── the command binder ────────────────── */

  /**
   * Bind a command AST node to `{ command, model, prep }` — the general
   * value→field binder (forward-compat commitment #3). v1 renders the
   * evaluated args to a command line, tokenizes via msh, matches the
   * affordance (re-resolved each run), and `CommandApi.assemble`s the
   * model — so binding is byte-identical to a typed command. Returns
   * null (with a note) on unknown verb / bind shape error.
   */
  private bindCommand(
    command: Command,
    scope: Scope,
  ): { command: CommandDefinition; model: CommandModel; prep: Record<string, string> } | null {
    const rendered = this.renderCommandLine(command, scope);
    if (rendered === null) return null; // render note already added

    let parsed;
    try {
      parsed = CommandLineApi.parsePipeline(rendered).commands[0];
    } catch (error) {
      this.note({
        kind: "command-rejected",
        reason: "parse-failed",
        detail: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
    if (!parsed || !parsed.verb) {
      this.note({
        kind: "command-rejected",
        reason: "parse-failed",
        detail: "empty command",
      });
      return null;
    }

    const location = MixinApi.isContainable(this.actor)
      ? this.actor.getContainer()
      : null;
    const matches = this.actor
      .getAffordances()
      .filter((a) => a.command.hasVerb(parsed.verb));
    if (matches.length === 0) {
      this.note({
        kind: "command-rejected",
        reason: "unknown-verb",
        detail: parsed.verb,
      });
      return null;
    }

    for (const affordance of matches) {
      const built = CommandApi.assemble(parsed, affordance.command, {
        commandGiver: this.actor,
        location,
      });
      if ("error" in built) {
        if (built.error === "shape") continue; // fall through to next match
        this.note({
          kind: "command-rejected",
          reason: "bind-failed",
          detail: "summary" in built ? built.summary : "bind error",
        });
        return null;
      }
      return {
        command: affordance.command,
        model: built.model,
        prep: built.prep ?? {},
      };
    }

    this.note({
      kind: "command-rejected",
      reason: "shape-fall-through",
      detail: parsed.verb,
    });
    return null;
  }

  /**
   * Render a command's verb + args to a single command line. `$`
   * substitution is **frame-first, shell-fallback**: a frame-bound var
   * renders its value; an unbound var renders `$name` verbatim so the
   * downstream resolve runs `ShellApi.expandVariables` (synthetic /
   * legacy vars) — extending the namespace, not forking it. Returns null
   * (with a note) when an arg can't render in v1 (an object set / void /
   * block — deferred with the piping value channel).
   */
  private renderCommandLine(command: Command, scope: Scope): string | null {
    const parts = [command.word];
    for (const arg of command.args) {
      const token = this.renderArg(arg, scope, command.word);
      if (token === null) return null;
      parts.push(token);
    }
    return parts.join(" ");
  }

  private renderArg(arg: Arg, scope: Scope, verb: string): string | null {
    switch (arg.kind) {
      case "literal":
        return arg.value;
      case "var": {
        if (!scope.has(arg.name)) return `$${arg.name}`; // shell fallback
        return this.renderScalar(scope.get(arg.name), `$${arg.name}`);
      }
      case "expr":
        return this.renderScalar(
          Expression.evaluate(arg.source, scope, this.actor),
          "(…)",
        );
      case "block":
        this.note({
          kind: "command-rejected",
          reason: "bind-failed",
          detail: `'${verb}' does not take a block argument`,
        });
        return null;
    }
  }

  /**
   * Render a scalar value to a (quoted if needed) command token. Object
   * sets / single Stuff / blocks / void can't bind into a string command
   * arg in v1 — that is the piping value channel — so they note and fail
   * the render.
   */
  private renderScalar(value: ScriptValue, label: string): string | null {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      const text = String(value);
      return NEEDS_QUOTING_RE.test(text)
        ? `"${text.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
        : text;
    }
    this.note({
      kind: "command-rejected",
      reason: "bind-failed",
      detail: `${label}: binding object / list / block values into a command argument is deferred with the piping value channel`,
    });
    return null;
  }

  private note(note: Note): void {
    this.notes.push(note);
  }
}
