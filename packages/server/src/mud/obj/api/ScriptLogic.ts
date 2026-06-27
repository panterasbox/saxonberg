// ScriptLogic — the hot-reloadable logic singleton behind ScriptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CommandLineApi } from "../../api/command-line";
import type { Script, Pipeline, Command, Arg } from "../../lib/script/ast";

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

  /** See {@link ScriptApi.format}. */
  @CallSecurity(ScriptApiCallers)
  public format(ast: Script): string {
    return formatScript(ast);
  }
}
