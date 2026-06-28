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
import type { ScriptAbortReason } from "../lib/script/AbortReason";
import { StuffApi } from "./stuff";
import { HotReloadApi } from "./hot-reload";
import { SecurityApi } from "./security";
import { ScriptLogic } from "../obj/api/ScriptLogic";
import { fileURLToPath } from "url";

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
}

SecurityApi.decorateApiClass(ScriptApi);
