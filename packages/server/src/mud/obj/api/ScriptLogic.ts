// ScriptLogic — the hot-reloadable logic singleton behind ScriptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CommandApi } from "../../api/command";
import { MixinApi } from "../../api/mixin";
import { ZoneApi } from "../../api/zone";
import { AccessApi } from "../../api/access";
import { ProvenanceApi } from "../../api/provenance";
import { ScriptDocument } from "../../lib/script/ScriptDocument";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { ScheduleApi } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { ExecutionContextApi } from "../../api/execution-context";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { Interpreter } from "../../lib/script/Interpreter";
import { RecipeKnowledge } from "../../lib/script/RecipeKnowledge";
import { Transcriber } from "../../lib/script/Transcriber";
import type {
  ResourceLimits,
  DispatchFn,
  ScriptDef,
} from "../../lib/script/Interpreter";
import type { Coroutine } from "../../lib/script/Coroutine";
import type { ScriptAbortReason } from "../../lib/script/AbortReason";
import { Scope } from "../../lib/script/Scope";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Sensor } from "../../lib/message/Sensor";
import type { CommandGiver } from "../../lib/command/CommandGiver";
import type { Script, Pipeline, Command, Arg } from "../../lib/script/ast";
import type { ParsedCommand } from "../../api/command-line";

const ScriptApiCallers = SecurityPolicies.FromModule("mud/api/script#ScriptApi");

/* ─────────────────────────── impl ─────────────────────────── */
//
// All logic lives in module-private functions (the `CraftingLogic` /
// `RegardLogic` precedent), so there are no intra-singleton `this.x()`
// calls to trip the gate.

/**
 * The actor a script runs as — derived from the ambient command frame's
 * giver (never a parameter; memory: gated-api-actor-from-context). Null
 * outside a command's synchronous span (a programmatic run with no
 * frame).
 */
function currentActor(): (Stuff & CommandGiver) | null {
  return ExecutionContextApi.getCurrentCommandContext()?.commandGiver ?? null;
}

/**
 * The acting author — transport-agnostic (in-world command-frame giver OR
 * a REST `tagActingAuthor` stamp), the anti-spoof source for the store
 * ops (`saveScript` / `invokeByPath`), which are reached over the CMS
 * REST path where no command frame exists. `runAst`/`invoke` instead use
 * the command-frame giver ({@link currentActor}), which tolerates forced
 * NPC dispatch the author resolver fails closed on.
 */
function currentAuthor(): (Stuff & CommandGiver) | null {
  return (
    (ExecutionContextApi.getActingAuthor() as (Stuff & CommandGiver) | null) ??
    null
  );
}

/** Read a numeric AppSettings value, falling back when unseeded (tests). */
function settingNum(key: string, fallback: number): number {
  try {
    const n = Number(AppApi.setting(key));
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
}

/**
 * Resolve the resource ceiling for a run. Tiered by **authorship** —
 * player-home / inline scripts get the tight budget, released platform
 * content (`/obj/` + `/domain/`) the large one. v1 only has inline
 * prompt scripts (the path-addressed store is P7), so `authorPath` is
 * absent and the tight tier applies; the platform tier lights up when a
 * stored recipe-script invokes with its `/obj/` path.
 */
function resolveLimits(authorPath?: string): ResourceLimits {
  const platform =
    authorPath !== undefined &&
    (authorPath.startsWith("/obj/") || authorPath.startsWith("/domain/"));
  return {
    sliceSteps: settingNum(AppSettingKeys.scriptSliceSteps, 1000),
    maxSteps: platform
      ? settingNum(AppSettingKeys.scriptMaxStepsPlatform, 1_000_000)
      : settingNum(AppSettingKeys.scriptMaxStepsPlayer, 10_000),
    maxDispatch: platform
      ? settingNum(AppSettingKeys.scriptMaxDispatchPlatform, 50_000)
      : settingNum(AppSettingKeys.scriptMaxDispatchPlayer, 500),
    maxDepth: platform
      ? settingNum(AppSettingKeys.scriptMaxDepthPlatform, 256)
      : settingNum(AppSettingKeys.scriptMaxDepthPlayer, 64),
  };
}

/**
 * Per-actor registry of running (typically suspended) coroutines —
 * in-memory, keyed on the actor's `stuffId`. Lets `cancelAll` (the
 * `stop`/`cancel` barge-in) reach a detached background script. Module
 * state on the logic singleton; coroutines are transient anyway (they
 * die on restart), so a HMR reload losing the map is harmless.
 */
const RUNNING = new Map<string, Set<Coroutine>>();

function registerCoroutine(actor: Stuff, co: Coroutine): void {
  let set = RUNNING.get(actor.stuffId);
  if (!set) {
    set = new Set();
    RUNNING.set(actor.stuffId, set);
  }
  set.add(co);
}

function deregisterCoroutine(actor: Stuff, co: Coroutine): void {
  const set = RUNNING.get(actor.stuffId);
  if (!set) return;
  set.delete(co);
  if (set.size === 0) RUNNING.delete(actor.stuffId);
}

function cancelAllImpl(reason: ScriptAbortReason): void {
  const actor = currentActor();
  if (actor === null) return;
  const set = RUNNING.get(actor.stuffId);
  if (!set) return;
  for (const co of [...set]) co.cancel(reason); // whenSettled handler deregisters
}

/**
 * Per-actor session `def`'d-command store — in-memory, keyed on
 * `stuffId`. A `def` typed at one prompt lands here and is invocable at
 * the next (via `make <name>`, or directly within a later script). The
 * interpreter writes/reads this map directly (passed as its `defs`), so a
 * `def` persists for the session. Transient (dies on restart), like the
 * coroutine registry.
 */
const SESSION_DEFS = new Map<string, Map<string, ScriptDef>>();

function sessionDefsFor(actor: Stuff): Map<string, ScriptDef> {
  let map = SESSION_DEFS.get(actor.stuffId);
  if (!map) {
    map = new Map();
    SESSION_DEFS.set(actor.stuffId, map);
  }
  return map;
}

/** The preemption-slice reschedule — one macrotask via ScheduleApi. */
function makeReschedule(): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      ScheduleApi.schedule(0, () => resolve());
    });
}

/** The bound-tail dispatch primitive for `actor` (re-resolved each run). */
function dispatchFor(actor: Stuff & CommandGiver): DispatchFn {
  return (command, model, prep) => actor._dispatchBound(command, model, prep);
}

/** The actor's home recipe path: `/home/<key>/scripts/<name>`. */
function homeScriptPath(actor: Stuff, name: string): string | null {
  const key = actor.getTemplatePath()?.split("/").filter(Boolean).pop() ?? null;
  return key ? `/home/${key}/scripts/${name}` : null;
}

/**
 * Auto-load a recipe-script the actor owns from the home store (the
 * learned/transcribed recipe), running its source to register the `def`,
 * then returning it. Re-resolved per call (cached until `goLive`) — so an
 * edit to the banked script reaches the next `make`. The stored source is
 * a `def …` (no dispatch), so the loader run completes synchronously.
 */
async function loadHomeRecipe(
  actor: Stuff & CommandGiver,
  name: string,
  defs: Map<string, ScriptDef>,
): Promise<ScriptDef | undefined> {
  const path = homeScriptPath(actor, name);
  if (path === null) return undefined;
  const ast = await resolveScriptImpl(path, actor);
  if (ast === null) return undefined;
  const loader = new Interpreter(actor, resolveLimits(path), defs);
  await loader.drive(ast, new Scope(), dispatchFor(actor), makeReschedule());
  return defs.get(name);
}

/**
 * Start a coroutine over `ast` in `scope`, register it for cancellation,
 * wire settle handling (deregister + abort scene), and **detach** —
 * returning once the run first suspends or completes (so a `wait`-bearing
 * script doesn't block the prompt). Pre-detach notes ride the ambient
 * command envelope. Shared by `runAst` and `invoke`.
 */
async function startAndDetach(
  actor: Stuff & CommandGiver,
  interpreter: Interpreter,
  ast: Script,
  scope: Scope,
): Promise<void> {
  const co = interpreter.startCoroutine(
    ast,
    scope,
    dispatchFor(actor),
    makeReschedule(),
  );
  registerCoroutine(actor, co);

  void co.whenSettled().then((result) => {
    deregisterCoroutine(actor, co);
    if (result.aborted !== undefined && MixinApi.isSensor(actor)) {
      MessageApi.scene(actor as Stuff & Sensor)
        .topic("system.script.aborted")
        .toSelf(
          Mml.compose`The script stopped (${result.aborted}${
            result.detail ? `: ${result.detail}` : ""
          }).`,
        )
        .send();
    }
  });

  await co.whenFirstYield();
  const ctx = ExecutionContextApi.getCurrentCommandContext();
  for (const note of interpreter.getNotes()) ctx?.note(note);
}

async function runAstImpl(ast: Script, authorPath?: string): Promise<void> {
  const actor = currentActor();
  if (actor === null) return; // no actor in context — nothing to run as
  const interpreter = new Interpreter(
    actor,
    resolveLimits(authorPath),
    sessionDefsFor(actor),
  );
  await startAndDetach(actor, interpreter, ast, new Scope());
}

/**
 * Invoke a named session script with positional args (the `make
 * <recipe>` path). Looks up the `def`'d script on the acting actor, binds
 * its params in a child of the def's captured scope (the closure), and
 * runs the body — paced by the same coroutine as any script. Returns
 * `false` when no such script is defined (the caller declines).
 */
async function invokeImpl(name: string, args: string[]): Promise<boolean> {
  // The acting author (transport-agnostic), so a recipe loaded by path
  // (`invokeByPath`, also author-keyed) and the session-`def` it
  // registered resolve under the same actor — the same giver in a
  // non-forced command frame as `currentActor`.
  const actor = currentAuthor();
  if (actor === null) return false;
  const defs = sessionDefsFor(actor);
  // A session `def` (the player's own) wins; otherwise auto-load a
  // learned recipe-script the actor owns from the home store.
  const def = defs.get(name) ?? (await loadHomeRecipe(actor, name, defs));
  if (!def) return false;
  const interpreter = new Interpreter(actor, resolveLimits(), defs);
  const callScope = def.scope.child();
  def.params.forEach((param, i) => callScope.define(param, args[i]));
  await startAndDetach(actor, interpreter, def.body, callScope);
  return true;
}

/**
 * Capture a faithful manual build (the `strain` engaged-completion path).
 * The acting author is the builder — stamped onto the scheduler's
 * completion frame by `ScriptApi.captureManualBuild` (the framework seam)
 * and read back here via {@link currentAuthor}. Idempotent on the deed:
 * a recipe already in the can-make state captures nothing (returns null).
 * Otherwise mints the deed and transcribes the personal recipe-script,
 * returning its banked path.
 */
async function captureManualBuildImpl(
  recipeId: string,
  name: string,
  sources: readonly string[],
): Promise<string | null> {
  const builder = currentAuthor();
  if (builder === null) return null;
  if (await RecipeKnowledge.canMake(builder, recipeId)) return null;
  await RecipeKnowledge.noteMade(builder, recipeId, name);
  return Transcriber.transcribe(recipeId, sources);
}

/* ─────────────── the path-addressed script store (P7) ─────────── */

/**
 * Parsed-AST cache keyed on path — the resolve-by-path hot path.
 * `goLive(path)` invalidates an entry (the `HotReloadApi.reload` analog),
 * so a CMS edit or a re-record reaches the next invocation without a
 * restart. In-memory; rebuilt lazily from the store.
 */
const RESOLVE_CACHE = new Map<string, Script>();

/** Convert a single bare `ParsedCommand` into a one-statement `Script`. */
function parsedToScript(parsed: ParsedCommand): Script {
  const args: Arg[] = parsed.rawTokens
    .slice(1)
    .map((token) => ({ kind: "literal", value: token.raw }));
  const command: Command = { kind: "command", word: parsed.verb, args };
  return { kind: "script", statements: [{ kind: "pipeline", commands: [command] }] };
}

/** Parse stored source text into a `Script` AST (or null on error). */
async function parseSourceToScript(
  source: string,
  actor: Stuff & CommandGiver,
): Promise<Script | null> {
  const parser = await CommandApi.resolveParser("script");
  const location = MixinApi.isContainable(actor) ? actor.getContainer() : null;
  const result = await parser.parse(source, {
    commandGiver: actor,
    location,
    available: actor.getAvailableCommands(),
  });
  if (result.script !== undefined) return result.script.ast;
  if (result.parsed !== undefined) return parsedToScript(result.parsed);
  return null; // parse error → unresolvable
}

/** Resolve a stored script at `path` to its parsed AST (cached). */
async function resolveScriptImpl(
  path: string,
  actor: Stuff & CommandGiver,
): Promise<Script | null> {
  const cached = RESOLVE_CACHE.get(path);
  if (cached) return cached;
  const doc = await ScriptDocument.findByPath(path);
  if (!doc) return null;
  const ast = await parseSourceToScript(doc.getSource(), actor);
  if (ast === null) return null;
  RESOLVE_CACHE.set(path, ast);
  return ast;
}

/**
 * Access-gate a script mutation by path, reusing the existing zone/access
 * stack: the covering spatial zone gates via `canMutateZone`; absent one
 * (e.g. a `/home/…` authoring path — the per-`/home/` access model rides
 * the future scoped-authoring sandbox), the slice-walk `can(write)`
 * applies. Returns a denial message, or null when permitted.
 */
/**
 * True when `path` lies in `actor`'s own `/home/<self>/` authoring
 * subtree — keyed on the same durable-path basename `homeScriptPath`
 * banks under, so a builder owns exactly the home recipes the
 * demonstration-capture writes for them.
 */
function isOwnHomePath(actor: Stuff, path: string): boolean {
  const key = actor.getTemplatePath()?.split("/").filter(Boolean).pop();
  return key !== undefined && path.startsWith(`/home/${key}/`);
}

async function gateScriptMutation(
  actor: Stuff | null,
  path: string,
): Promise<string | null> {
  // A player owns their own `/home/<self>/` subtree — the
  // demonstration-capture home-bank writes here as the builder, and a
  // player writing their own recorded recipe-script needs no broader
  // grant. (The fuller per-`/home/` access model rides the future
  // scoped-authoring sandbox; this is the self-owner base case.)
  if (actor !== null && isOwnHomePath(actor, path)) return null;
  const zone = await ZoneApi.resolveZoneForPath(path);
  if (zone) {
    if (!(await AccessApi.canMutateZone(actor, zone))) {
      return "you don't have permission to mutate that script's zone";
    }
    return null;
  }
  if (!(await AccessApi.can(actor, "write", null))) {
    return "you don't have permission to write that script";
  }
  return null;
}

async function saveScriptImpl(path: string, source: string): Promise<void> {
  const actor = currentAuthor();
  const denial = await gateScriptMutation(actor, path);
  if (denial !== null) throw new Error(denial);

  // Persist (find-or-create). Owner = the acting author's durable path.
  const doc = (await ScriptDocument.findByPath(path)) ?? new ScriptDocument();
  doc.path = path;
  doc.owner = actor?.getTemplatePath() ?? "";
  doc.source = source;
  await doc.save();

  // Authorship — append a provenance row keyed on the path (author from
  // context, never a param). ScriptLogic is now an admitted authoring
  // transport (the broadened recordAuthoring gate).
  await ProvenanceApi.recordAuthoring({ path });

  // Go-live: invalidate the resolve cache so the next invocation re-parses.
  RESOLVE_CACHE.delete(path);
}

async function invokeByPathImpl(path: string): Promise<boolean> {
  const actor = currentAuthor();
  if (actor === null) return false;
  const ast = await resolveScriptImpl(path, actor);
  if (ast === null) return false;
  const interpreter = new Interpreter(
    actor,
    resolveLimits(path),
    sessionDefsFor(actor),
  );
  await startAndDetach(actor, interpreter, ast, new Scope());
  return true;
}

async function runImpl(text: string): Promise<void> {
  const actor = currentActor();
  if (actor === null) return;
  const parser = await CommandApi.resolveParser("script");
  const location = MixinApi.isContainable(actor) ? actor.getContainer() : null;
  const result = await parser.parse(text, {
    commandGiver: actor,
    location,
    available: actor.getAvailableCommands(),
  });
  if (result.script !== undefined) {
    await runAstImpl(result.script.ast);
    return;
  }
  if (result.error !== undefined) throw new Error(result.error);
  // A bare command / bound result: run it through the normal pipeline.
  await actor.executeCommand(text);
}

/* ──────────────────────── format (AST → source) ──────────────── */
//
// The inverse of the script parser: walk the AST and emit canonical
// language source. Statements join with `; `, pipeline stages with
// ` | `; a block renders `{ … }` recursively. Literals carry their
// verbatim source slice (quotes intact), so the round-trip is exact.

function formatScript(ast: Script): string {
  return ast.statements.map(formatPipeline).join("; ");
}

function formatPipeline(pipeline: Pipeline): string {
  return pipeline.commands.map(formatCommand).join(" | ");
}

function formatCommand(command: Command): string {
  const parts = [command.word, ...command.args.map(formatArg)];
  return parts.join(" ");
}

function formatArg(arg: Arg): string {
  switch (arg.kind) {
    case "literal":
      return arg.value;
    case "var":
      return `$${arg.name}`;
    case "expr":
      return `(${arg.source})`;
    case "block":
      return `{ ${formatScript(arg.body)} }`;
  }
}

/**
 * ScriptLogic — the hot-reloadable logic singleton behind
 * {@link ScriptApi}.
 *
 * Lives at `/obj/api/script` (a stateless `Stuff` singleton, no backing
 * `Template`); `ScriptApi`'s statics forward here via
 * `StuffApi.singletonSync`. All run/define/cancel logic lives in
 * module-private functions, so there are no intra-singleton `this.x()`
 * calls to trip the gate. Each public method carries the `FromModule`
 * gate.
 *
 * @internal
 */
@Unshadowable
export class ScriptLogic extends Idea {
  /** See {@link ScriptApi.runAst}. */
  @CallSecurity(ScriptApiCallers)
  public async runAst(ast: Script): Promise<void> {
    return runAstImpl(ast);
  }

  /** See {@link ScriptApi.run}. */
  @CallSecurity(ScriptApiCallers)
  public async run(text: string): Promise<void> {
    return runImpl(text);
  }

  /** See {@link ScriptApi.cancelAll}. */
  @CallSecurity(ScriptApiCallers)
  public cancelAll(reason: ScriptAbortReason): void {
    cancelAllImpl(reason);
  }

  /** See {@link ScriptApi.invoke}. */
  @CallSecurity(ScriptApiCallers)
  public async invoke(name: string, args: string[]): Promise<boolean> {
    return invokeImpl(name, args);
  }

  /** See {@link ScriptApi.saveScript}. */
  @CallSecurity(ScriptApiCallers)
  public async saveScript(path: string, source: string): Promise<void> {
    return saveScriptImpl(path, source);
  }

  /** See {@link ScriptApi.goLive}. */
  @CallSecurity(ScriptApiCallers)
  public goLive(path: string): void {
    RESOLVE_CACHE.delete(path);
  }

  /** See {@link ScriptApi.invokeByPath}. */
  @CallSecurity(ScriptApiCallers)
  public async invokeByPath(path: string): Promise<boolean> {
    return invokeByPathImpl(path);
  }

  /** See {@link ScriptApi.format}. */
  @CallSecurity(ScriptApiCallers)
  public format(ast: Script): string {
    return formatScript(ast);
  }

  /** See {@link ScriptApi.captureManualBuild}. */
  @CallSecurity(ScriptApiCallers)
  public async captureManualBuild(
    recipeId: string,
    name: string,
    sources: readonly string[],
  ): Promise<string | null> {
    return captureManualBuildImpl(recipeId, name, sources);
  }
}
