/**
 * ScriptApi — the run / define / cancel surface for the scripting
 * language (v1 engine).
 *
 * Thin, security-gated forwarding shell: the logic lives in the
 * hot-reloadable {@link ScriptLogic} singleton at `/obj/api/script`,
 * reached synchronously via `StuffApi.singletonSync`. `dest
 * /obj/api/script` reloads it.
 *
 * The acting actor is **always derived from `ExecutionContextApi`**
 * (the in-world command frame's giver), never passed as a parameter — a
 * script runs *as* its host and is bounded by *its* permissions
 * (memory: gated-api-actor-from-context). Every command the interpreter
 * runs is an ordinary gated, attributed, scope-re-checked dispatch over
 * the bus; the language never reaches raw mechanism.
 */

import type { Script } from "../lib/script/ast";
import type EvalScript from "../lib/script/EvalScript";
import type { ScriptAbortReason } from "../lib/script/AbortReason";
import type { Stuff } from "../lib/stuff/Stuff";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { ExecutionContextApi } from "./execution-context";
import { ScriptLogic } from "../obj/api/ScriptLogic";
import { fileURLToPath } from "url";
import { SecurityApi } from './security';
import { CallSecurity } from '../lib/security/decorators';
import { SecurityPolicies } from '../lib/security/SecurityPolicies';

/**
 * Opaque handle to a compiled sandboxed script. Deliberately carries no
 * structure: the backing form (`vm.Script`, later an `isolated-vm`
 * compiled script) is an Api-tier implementation detail, and the mudlib
 * holds one only to hand it back to {@link ScriptApi.runSandboxed}.
 */
export type CompiledSandbox = {
  readonly __compiledSandbox: unique symbol;
};

const LOGIC_PATH = "/obj/api/script";
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL("../obj/api/ScriptLogic", import.meta.url),
);

/** Resolve the HMR-able ScriptLogic singleton (sync). */
function logic(): ScriptLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        "ScriptLogic",
      ) as typeof ScriptLogic | null) ?? ScriptLogic)(),
  );
}

export class ScriptApi {
  /**
   * Run an already-parsed `Script` as the acting actor. Entry point
   * from the command dispatcher's `parseResult.script` branch — the
   * script parser hands the dispatcher the AST, the dispatcher hands it
   * here. Walks the script through the interpreter, dispatching each
   * command over the bus. Resolves when the script completes (or
   * suspends into a detached background coroutine — P5).
   */
  static runAst(ast: Script): Promise<void> {
    return logic().runAst(ast);
  }

  /**
   * Parse and run raw script `text` as the acting actor. Convenience
   * over {@link runAst} for programmatic / REPL callers; production
   * prompt dispatch goes through the parser → `runAst` path.
   */
  static run(text: string): Promise<void> {
    return logic().run(text);
  }

  /**
   * Invoke a named session script (a `def`'d recipe) with positional
   * `args`, binding its params — the `make <recipe>` path. The acting
   * actor is derived from context; the script runs paced by the coroutine
   * (engaged steps trickle out). Resolves `true` if a script of that name
   * was found and started, `false` otherwise (the caller declines). The
   * authored-content recipe-script source (loaded from the path-addressed
   * store) lands in P7; v1 invokes session `def`s.
   */
  static invoke(name: string, args: string[] = []): Promise<boolean> {
    return logic().invoke(name, args);
  }

  /**
   * Save a script's source to the path-addressed store, keyed on `path`
   * (owner/scope encoded in the path). Mutation is access-gated on the
   * covering zone (`AccessApi`), the owner is set from the acting author,
   * authorship is appended to the provenance ledger keyed on the path,
   * and the resolve cache is invalidated (go-live). The acting author is
   * derived from context, never a parameter.
   */
  static saveScript(path: string, source: string): Promise<void> {
    return logic().saveScript(path, source);
  }

  /**
   * Invalidate the resolve cache for `path` (the `HotReloadApi.reload`
   * analog) so the next invocation re-parses the stored source — a CMS
   * edit or a re-record reaches the next run without a restart.
   */
  static goLive(path: string): void {
    logic().goLive(path);
  }

  /**
   * Resolve and run the stored script at `path` (re-resolved per
   * invocation, cached until `goLive`). Runs as the acting actor, paced
   * by the coroutine. Resolves `true` if a script was found at the path,
   * `false` otherwise.
   */
  static invokeByPath(path: string): Promise<boolean> {
    return logic().invokeByPath(path);
  }

  /**
   * Cancel every running (suspended) script the **acting actor** owns —
   * the barge-in path. The actor is derived from execution context (never
   * a parameter); each coroutine stops with the typed `reason`, aborting
   * its in-flight engaged step (its effect never lands — partial matter
   * standing, no rollback). Wired into the `stop`/`cancel` verb.
   */
  static cancelAll(reason: ScriptAbortReason = "cancelled"): void {
    logic().cancelAll(reason);
  }

  /**
   * Serialize a `Script` AST back to canonical language source. The
   * round-trip property is `parse(format(parse(t)))` ≡ `parse(t)`. This
   * is the substrate demonstration capture (P8) emits real source
   * through — the recorded artifact is language source, not an opaque
   * trace.
   */
  static format(ast: Script): string {
    return logic().format(ast);
  }

  /**
   * Capture a faithful manual build as the builder's learned recipe: mint
   * the can-make **deed** and transcribe + bank the personal recipe-script
   * — the *same act* (learning **is** getting the script). Called at the
   * `strain` step's engaged completion, which the scheduler runs inside an
   * **authorless** `runRoot('completion')` frame — so the builder
   * (captured from the live command frame at dispatch, then threaded here)
   * is stamped as that frame's acting author via {@link
   * ExecutionContextApi.tagActingAuthor}. That stamp is the framework seam
   * a controller can't reach (frame mutators are framework-only); the
   * downstream `noteMade` / `Transcriber.transcribe` read it back through
   * `getActingAuthor`. Returns the banked script path, or null when
   * nothing was captured (already learned, or no resolvable owner).
   */
  static captureManualBuild(
    builder: Stuff,
    recipeId: string,
    name: string,
    sources: readonly string[],
  ): Promise<string | null> {
    ExecutionContextApi.tagActingAuthor(builder);
    return logic().captureManualBuild(recipeId, name, sources);
  }

  /**
   * Compile `code` into a sandboxed script, ready to run against a
   * context built later. The returned handle is **opaque** — the backing
   * form is Node's `vm.Script` today and the planned `isolated-vm`
   * migration changes it without touching callers.
   *
   * The `vm` module is a capability, so it lives here in the Api tier and
   * nowhere else (docs/architecture.md § The import boundary). The caller
   * — `EvalScript` — still owns the sandbox *contents*: the name
   * allowlist and the receiver bindings are mudlib policy, and assembling
   * them is plain object work needing no privilege.
   *
   * **Gated to `EvalScript` alone.** Moving `vm` behind an Api is only
   * worth anything if the Api actually gates it: an ungated pair here
   * would hand every module arbitrary code execution with a
   * caller-chosen globals bag, which is strictly worse than the
   * `SANDBOX_NAMES` allowlist it replaced. `EvalScript` is the one
   * legitimate caller, and it is itself reachable only behind
   * `AccessApi.isWizard`.
   */
  @CallSecurity(SecurityPolicies.FromModule("/lib/script/EvalScript"))
  static compileSandboxed(code: string): CompiledSandbox {
    return logic().compileSandboxed(code);
  }

  /**
   * Run a {@link ScriptApi.compileSandboxed} handle against a fresh
   * context built from `sandbox` — a plain object whose own enumerable
   * keys become the globals the code can see, and the only ones.
   *
   * Gated to `EvalScript` for the same reason as
   * {@link ScriptApi.compileSandboxed}.
   */
  @CallSecurity(SecurityPolicies.FromModule("/lib/script/EvalScript"))
  static runSandboxed(
    compiled: CompiledSandbox,
    sandbox: Record<string, unknown>,
  ): unknown {
    return logic().runSandboxed(compiled, sandbox);
  }

  /**
   * Mint (replacing any prior) the **eval scratch** singleton at
   * `path` — `<jurisdiction>/_eval` — carrying `code`, and return it
   * ready to `run`.
   *
   * The `eval` verb's scratch is path-addressable so MQL's path atom
   * can name it and a later bare `eval` can re-run it; stamping that
   * identity goes through `Stuff.setTemplatePath`, which is
   * `ApiOnly`-gated. `EvalController` is a controller, so it has no
   * standing to stamp — this is the seam it calls instead.
   */
  static mintEvalScratch(path: string, code: string): Promise<EvalScript> {
    return logic().mintEvalScratch(path, code);
  }
}

SecurityApi.decorateApiClass(ScriptApi);
