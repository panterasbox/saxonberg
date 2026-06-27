// ScriptLogic — the hot-reloadable logic singleton behind ScriptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CommandLineApi } from "../../api/command-line";
import type { Script } from "../../lib/script/ast";

const ScriptApiCallers = SecurityPolicies.FromModule("mud/api/script#ScriptApi");

/* ─────────────────────────── impl ─────────────────────────── */
//
// All logic lives in module-private functions (the `CraftingLogic` /
// `RegardLogic` precedent), so there are no intra-singleton `this.x()`
// calls to trip the gate. The interpreter wiring lands in P2; P0 stands
// the surface up.

async function runAstImpl(_ast: Script): Promise<void> {
  // Replaced in P2 by the generator-interpreter run loop (derive the
  // acting actor from ExecutionContextApi, build the root scope, pump
  // the interpreter, surface the dispatch-response envelope).
  throw new Error("ScriptLogic.runAst: interpreter not yet wired (P2)");
}

async function runImpl(text: string): Promise<void> {
  void CommandLineApi; // parser wiring lands with the script parser (P1/P6)
  return runAstImpl(
    // Placeholder empty script; the parse → runAst path is wired in P2.
    { kind: "script", statements: [] } satisfies Script,
  ).then(() => {
    void text;
  });
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
}
