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
import { ScriptValues } from "./Value";
import type { ScriptValue } from "./Value";
import { ScriptBuiltins } from "./builtins";
import { Coroutine } from "./Coroutine";
import type { Script, Pipeline, Command, Arg } from "./ast";
import type { Stuff } from "../stuff/Stuff";
import type { CommandGiver } from "../command/CommandGiver";
import type { CommandDefinition } from "../command/CommandDefinition";
import type { Note } from "@saxonberg/types";
import type { ScriptAbortReason } from "./AbortReason";

/**
 * A coroutine suspension the script asks the pump to schedule onto the
 * game clock (P5). `wait` is the one-shot timer; `every` is a perpetual
 * cadence (the main script does not resume past it); `when` polls a
 * condition then runs its block once and resumes. (The await-engaged
 * suspension is not yielded — the pump detects it after a dispatch that
 * started a timed activity.)
 */
export type SuspendRequest =
  | { type: "wait"; seconds: number }
  | { type: "every"; seconds: number; block: Block }
  | { type: "when"; source: string; scope: Scope; block: Block };

/** A unit of work the sync evaluator hands to the async pump. */
export type Effect =
  | {
      kind: "dispatch";
      command: CommandDefinition;
      model: CommandModel;
      prep: Record<string, string>;
    }
  | { kind: "slice" }
  | { kind: "suspend"; request: SuspendRequest };

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

/**
 * A `def`'d command — captured params, body, and definition scope (the
 * closure). Held in the per-actor session-defs map so a `def` at one
 * prompt is invocable at the next (the named-scripts surface).
 */
export interface ScriptDef {
  params: string[];
  body: Script;
  scope: Scope;
}

/**
 * Coerce a value into the item list `each` iterates: a `StuffList` is
 * itself, a single Stuff is a one-element list, and a scalar / void /
 * empty set yields zero iterations (an empty MQL set → no iterations,
 * the falsiness rule applied to iteration).
 */
function itemsOf(value: ScriptValue): ScriptValue[] {
  if (Array.isArray(value)) return value;
  if (
    value !== undefined &&
    typeof value === "object" &&
    !(value instanceof Block)
  ) {
    return [value]; // a single Stuff
  }
  return [];
}

/**
 * Parse a duration literal (`5m`, `30s`, `2h`, `1d`, or a bare number =
 * seconds) into game-seconds. Unparseable → 0 (fires next tick).
 */
function parseDurationSeconds(text: string): number {
  const match = /^(\d+(?:\.\d+)?)\s*(s|m|h|d)?$/.exec(text.trim());
  if (!match) return 0;
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const scale = unit === "m" ? 60 : unit === "h" ? 3600 : unit === "d" ? 86400 : 1;
  return value * scale;
}

/** Extract `def` param names from a `($a $b)` island source. */
function parseParams(source: string): string[] {
  return source
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => (token.startsWith("$") ? token.slice(1) : token));
}

export class Interpreter {
  private steps = 0;
  private dispatches = 0;
  private depth = 0;
  private readonly notes: Note[] = [];

  /**
   * @param actor   the actor this run executes as.
   * @param limits  the resource ceilings (from AppSettings, tiered).
   * @param defs    the `def`'d-command map. Defaults to a fresh per-run
   *   map; `ScriptLogic` passes the **actor's session map** so a `def` at
   *   one prompt is invocable at the next (the named-scripts surface).
   */
  constructor(
    private readonly actor: Stuff & CommandGiver,
    private readonly limits: ResourceLimits,
    private readonly defs: Map<string, ScriptDef> = new Map(),
  ) {}

  /**
   * Start a {@link Coroutine} over this script and begin pumping it. The
   * coroutine handles every effect — `dispatch` (with the await-engaged
   * pacing rule), `slice` (preemption), and `suspend` (game-clock wait /
   * every / when) — and may detach (run on in the background across
   * scheduler frames) without blocking the caller. The handle exposes
   * `whenFirstYield()` (resolves on the first suspend or on completion —
   * the detachment point) and `whenSettled()` (resolves when the run
   * finishes or is cancelled), plus `cancel()`.
   */
  startCoroutine(
    ast: Script,
    scope: Scope,
    dispatch: DispatchFn,
    reschedule: RescheduleFn,
  ): Coroutine {
    const co = new Coroutine(this.evalScript(ast, scope), this, dispatch, reschedule);
    co.start();
    return co;
  }

  /**
   * Pump the evaluator to completion and return its result. Convenience
   * over {@link startCoroutine} for the non-suspending case (a script
   * with no `wait` / `every` / `when` / engaged-step) — it awaits the
   * coroutine's settlement. A suspending script driven this way only
   * settles once the game clock advances, so suspend-bearing callers use
   * `startCoroutine` + advance the clock instead.
   */
  drive(
    ast: Script,
    scope: Scope,
    dispatch: DispatchFn,
    reschedule: RescheduleFn,
  ): Promise<DriveResult> {
    return this.startCoroutine(ast, scope, dispatch, reschedule).whenSettled();
  }

  /* ───────────── pump-facing accessors (used by Coroutine) ───────────── */

  /** The actor this interpreter runs as (engagement checks, MQL). @internal */
  getActor(): Stuff & CommandGiver {
    return this.actor;
  }

  /** Snapshot of the run's accumulated notes. @internal */
  getNotes(): Note[] {
    return [...this.notes];
  }

  /** Record a note from a dispatched command's context. @internal */
  recordNote(note: Note): void {
    this.notes.push(note);
  }

  /** Evaluate a `( )` island's condition source (for `when` polling). @internal */
  evalCondition(source: string, scope: Scope): ScriptValue {
    return Expression.evaluate(source, scope, this.actor);
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
    // Builtins (if/each/def/while/set) are interpreter-intrinsic: they
    // take raw (unevaluated) block/condition args, so they can't ride
    // the eager-arg dispatch path. A `def`'d name invokes its body.
    // Everything else goes over the bus.
    if (ScriptBuiltins.isBuiltin(command.word)) {
      return yield* this.evalBuiltin(command, scope);
    }
    if (this.defs.has(command.word)) {
      return yield* this.invokeDef(command, scope);
    }
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

  /* ─────────────────── control-flow builtins ─────────────────── */
  //
  // Each is syntactically still `word arg*` ("everything is a command")
  // but the interpreter owns its evaluation, taking raw AST args so
  // blocks stay unevaluated and conditions evaluate lazily.

  /** Route an intrinsic builtin to its handler. */
  private *evalBuiltin(command: Command, scope: Scope): Eval<ScriptValue> {
    switch (command.word) {
      case "set":
        return this.evalSet(command, scope);
      case "if":
        return yield* this.evalIf(command, scope);
      case "each":
        return yield* this.evalEach(command, scope);
      case "while":
        return yield* this.evalWhile(command, scope);
      case "def":
        return this.evalDef(command, scope);
      case "wait":
        return yield* this.evalWait(command);
      case "every":
        return yield* this.evalEvery(command, scope);
      case "when":
        return yield* this.evalWhen(command, scope);
      default:
        return undefined;
    }
  }

  /* ───────────────────── temporal builtins (P5) ───────────────── */
  //
  // Each yields a `suspend` effect the Coroutine schedules onto the game
  // clock. The interpreter stays a pure generator; all timer wiring lives
  // in the pump.

  /** `wait <dur>` — suspend; resume after the duration on the game clock. */
  private *evalWait(command: Command): Eval<ScriptValue> {
    const arg = command.args[0];
    const text = arg && arg.kind === "literal" ? arg.value : "0";
    yield { kind: "suspend", request: { type: "wait", seconds: parseDurationSeconds(text) } };
    return undefined;
  }

  /** `every <dur> {block}` — fire the block on cadence (perpetual). */
  private *evalEvery(command: Command, scope: Scope): Eval<ScriptValue> {
    const arg = command.args[0];
    const text = arg && arg.kind === "literal" ? arg.value : "0";
    const block = this.blockArg(command.args[1], scope);
    if (block === null) {
      this.note({
        kind: "command-rejected",
        reason: "bind-failed",
        detail: "every: missing { block }",
      });
      return undefined;
    }
    yield {
      kind: "suspend",
      request: { type: "every", seconds: parseDurationSeconds(text), block },
    };
    return undefined; // perpetual — the pump does not resume past `every`
  }

  /** `when (cond) {block}` — run the block once cond is truthy, then resume. */
  private *evalWhen(command: Command, scope: Scope): Eval<ScriptValue> {
    const condArg = command.args[0];
    const source =
      condArg && condArg.kind === "expr" ? condArg.source : "false";
    const block = this.blockArg(command.args[1], scope);
    if (block === null) {
      this.note({
        kind: "command-rejected",
        reason: "bind-failed",
        detail: "when: missing { block }",
      });
      return undefined;
    }
    yield { kind: "suspend", request: { type: "when", source, scope, block } };
    return undefined;
  }

  /**
   * `set <name> <value>` — assign a frame variable (nearest existing
   * binding or a new one in this frame), yielding the assigned value.
   */
  private evalSet(command: Command, scope: Scope): ScriptValue {
    const nameArg = command.args[0];
    if (!nameArg || nameArg.kind !== "literal") {
      this.note({
        kind: "command-rejected",
        reason: "bind-failed",
        detail: "set: expected a variable name",
      });
      return undefined;
    }
    const valueArg = command.args[1];
    const value =
      valueArg !== undefined ? this.evalArg(valueArg, scope) : undefined;
    scope.set(nameArg.value, value);
    return value;
  }

  /**
   * `if (cond) {then} [else {else}]` — evaluates the condition's
   * truthiness (an empty MQL set is false) and invokes the chosen
   * block, yielding its value (so `if` works in value position).
   */
  private *evalIf(command: Command, scope: Scope): Eval<ScriptValue> {
    const cond =
      command.args[0] !== undefined
        ? this.evalArg(command.args[0], scope)
        : undefined;
    if (ScriptValues.isTruthy(cond)) {
      const thenBlock = this.blockArg(command.args[1], scope);
      return thenBlock !== null ? yield* this.invokeBlock(thenBlock) : undefined;
    }
    const elseBlock = this.elseBlockOf(command.args, scope);
    return elseBlock !== null ? yield* this.invokeBlock(elseBlock) : undefined;
  }

  /**
   * `each (set) {block}` — invoke the block once per item, binding the
   * item as `it` in the per-iteration scope (so `$it` reads it). An
   * empty set runs zero iterations. (Resolving a *bareword* `it` as an
   * object inside a sub-command's MQL field — `collect it` — needs the
   * MQL-pronoun wiring, the same object-into-args frontier piping owns;
   * deferred.)
   */
  private *evalEach(command: Command, scope: Scope): Eval<ScriptValue> {
    const value =
      command.args[0] !== undefined
        ? this.evalArg(command.args[0], scope)
        : undefined;
    const bodyArg = command.args[1];
    let last: ScriptValue = undefined;
    for (const item of itemsOf(value)) {
      yield* this.step();
      const child = scope.child();
      child.define("it", item);
      const body = this.blockArg(bodyArg, child);
      if (body !== null) last = yield* this.invokeBlock(body);
    }
    return last;
  }

  /**
   * `while (cond) {block}` — loop while the condition is truthy. Each
   * iteration takes a `step()`, so a no-suspension loop is preempted
   * (sliced) and bounded by the step ceiling — a `while (true) { }`
   * cannot freeze the event loop, it aborts with `resource-limit`.
   */
  private *evalWhile(command: Command, scope: Scope): Eval<ScriptValue> {
    const condArg = command.args[0];
    const bodyArg = command.args[1];
    let last: ScriptValue = undefined;
    for (;;) {
      yield* this.step();
      const cond =
        condArg !== undefined ? this.evalArg(condArg, scope) : undefined;
      if (!ScriptValues.isTruthy(cond)) break;
      const body = this.blockArg(bodyArg, scope);
      if (body !== null) last = yield* this.invokeBlock(body);
    }
    return last;
  }

  /**
   * `def name ($p…) {block}` — register an invocable named command. The
   * `($p…)` island's source supplies the positional param names; the
   * body + the definition scope are captured (the closure). In-memory
   * for this run (cross-prompt session binding is P6).
   */
  private evalDef(command: Command, scope: Scope): ScriptValue {
    const nameArg = command.args[0];
    if (!nameArg || nameArg.kind !== "literal") {
      this.note({
        kind: "command-rejected",
        reason: "bind-failed",
        detail: "def: expected a command name",
      });
      return undefined;
    }
    const bodyArg = command.args.find((a) => a.kind === "block");
    if (!bodyArg || bodyArg.kind !== "block") {
      this.note({
        kind: "command-rejected",
        reason: "bind-failed",
        detail: `def ${nameArg.value}: missing { body }`,
      });
      return undefined;
    }
    const paramsArg = command.args.find((a) => a.kind === "expr");
    const params =
      paramsArg && paramsArg.kind === "expr"
        ? parseParams(paramsArg.source)
        : [];
    this.defs.set(nameArg.value, { params, body: bodyArg.body, scope });
    return undefined;
  }

  /** Invoke a `def`'d command: bind call args to params in a child of
   *  the definition scope, then run the body (one recursion level). */
  private *invokeDef(command: Command, scope: Scope): Eval<ScriptValue> {
    const def = this.defs.get(command.word)!;
    const callScope = def.scope.child();
    def.params.forEach((param, i) => {
      const argNode = command.args[i];
      const value =
        argNode !== undefined ? this.evalArg(argNode, scope) : undefined;
      callScope.define(param, value);
    });
    return yield* this.invokeBlock(new Block(def.body, callScope));
  }

  /** Evaluate an arg that must be a `{block}` to its `Block` value. */
  private blockArg(arg: Arg | undefined, scope: Scope): Block | null {
    if (arg !== undefined && arg.kind === "block") {
      const value = this.evalArg(arg, scope);
      if (value instanceof Block) return value;
    }
    return null;
  }

  /** Find the `else { … }` block following an `else` literal, if any. */
  private elseBlockOf(args: Arg[], scope: Scope): Block | null {
    const i = args.findIndex((a) => a.kind === "literal" && a.value === "else");
    return i >= 0 ? this.blockArg(args[i + 1], scope) : null;
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
