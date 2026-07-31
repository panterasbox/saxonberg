// ScriptLogic — the hot-reloadable logic singleton behind ScriptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Script as VmScript, createContext } from "node:vm";
import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CommandApi } from "../../api/command";
import { MixinApi } from "../../api/mixin";
import { DocumentApi } from "../../api/document";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { ScheduleApi } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { ExecutionContextApi } from "../../api/execution-context";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { StuffApi } from "../../api/stuff";
import EvalScript from "../../lib/script/EvalScript";
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
import type { CompiledSandbox } from "../../api/script";
import { Scope } from "../../lib/script/Scope";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Sensor } from "../../lib/message/Sensor";
import type { CommandGiver } from "../../lib/command/CommandGiver";
import type { Script, Pipeline, Command, Arg } from "../../lib/script/ast";
import type { ParsedCommand } from "../../api/command-line";

const ScriptApiCallers = SecurityPolicies.FromModule("/api/script#ScriptApi");

/**
 * Mint the eval scratch singleton at `path`, replacing any prior one.
 *
 * The stamp is the reason this lives behind an Api at all:
 * `Stuff.setTemplatePath` is `ApiOnly`-gated, and `EvalController` — a
 * controller, not Api code — was calling it directly, so every
 * `eval <code>` died on the gate before reaching the interpreter. The
 * doc comment on `#templatePath` already named this exact case ("Api
 * code that wants MQL path-atom addressability for an ad-hoc runtime
 * singleton — e.g. `EvalScript` stamping `/home/<id>/_eval`"); it just
 * had no Api to be called from.
 *
 * `create` (not `clone`): the scratch is a per-jurisdiction dynamic
 * unique — destruct-and-replace on each new code body, backed by
 * nothing, gone at restart.
 */
async function mintEvalScratchImpl(
  path: string,
  code: string,
): Promise<EvalScript> {
  const existing = StuffApi.findByTemplatePath<EvalScript>(path);
  if (existing) StuffApi.destruct(existing);
  const scratch = await StuffApi.create(() => new EvalScript());
  // The setter re-keys `byTemplatePath` for us — no manual index work.
  scratch.setTemplatePath(path);
  scratch.setCode(code);
  return scratch;
}

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

/* ─────────────── scripts over the document store (P7) ─────────── */
//
// Scripts are one **kind** of stored document (`kind: 'script'`,
// `data: { source }`) in the generic path-addressed `DocumentApi` store.
// ScriptLogic owns the script *semantics* — parse source → AST, the AST
// cache, and the script-specific go-live — while `DocumentApi` owns the
// storage, the owner-access gate, and provenance.

/** The document-store `kind` scripts are persisted under. */
const SCRIPT_KIND = "script";

/**
 * Parsed-AST cache keyed on path — the resolve-by-path hot path (the one
 * cache the generic store deliberately doesn't keep, since an AST is
 * script-specific). `goLive(path)` invalidates an entry (the
 * `HotReloadApi.reload` analog), so a CMS edit or a re-record reaches the
 * next invocation without a restart. In-memory; rebuilt lazily.
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

/** The source text of the script stored at `path`, or null. */
async function readScriptSource(path: string): Promise<string | null> {
  const doc = await DocumentApi.read(path);
  if (!doc || doc.getKind() !== SCRIPT_KIND) return null;
  const source = doc.getData().source;
  return typeof source === "string" ? source : null;
}

/** Resolve a stored script at `path` to its parsed AST (cached). */
async function resolveScriptImpl(
  path: string,
  actor: Stuff & CommandGiver,
): Promise<Script | null> {
  const cached = RESOLVE_CACHE.get(path);
  if (cached) return cached;
  const source = await readScriptSource(path);
  if (source === null) return null;
  const ast = await parseSourceToScript(source, actor);
  if (ast === null) return null;
  RESOLVE_CACHE.set(path, ast);
  return ast;
}

/**
 * Persist a script's source to the document store as `kind: 'script'`,
 * `data: { source }`. The owner-access gate, owner stamp, and provenance
 * all live in `DocumentApi.save` (the store chokepoint); ScriptLogic adds
 * only the script-specific go-live — invalidate the AST cache so the next
 * invocation re-parses.
 */
async function saveScriptImpl(path: string, source: string): Promise<void> {
  await DocumentApi.save(path, SCRIPT_KIND, { source });
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
export class ScriptLogic extends ApiLogic {
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

  /** See {@link ScriptApi.compileSandboxed}. */
  @CallSecurity(ScriptApiCallers)
  public compileSandboxed(code: string): CompiledSandbox {
    // Box into the opaque handle. Safe by construction: `CompiledSandbox`
    // has no structure, so the only value that can reach `runSandboxed`
    // is one this line produced.
    return new VmScript(code) as unknown as CompiledSandbox;
  }

  /** See {@link ScriptApi.runSandboxed}. */
  @CallSecurity(ScriptApiCallers)
  public runSandboxed(
    compiled: CompiledSandbox,
    sandbox: Record<string, unknown>,
  ): unknown {
    // Unbox — see `compileSandboxed`; nothing else mints a CompiledSandbox.
    return (compiled as unknown as VmScript).runInContext(
      createContext(sandbox),
    );
  }

  /** See {@link ScriptApi.mintEvalScratch}. */
  @CallSecurity(ScriptApiCallers)
  public async mintEvalScratch(
    path: string,
    code: string,
  ): Promise<EvalScript> {
    return mintEvalScratchImpl(path, code);
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
