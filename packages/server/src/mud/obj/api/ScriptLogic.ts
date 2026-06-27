// ScriptLogic — the hot-reloadable logic singleton behind ScriptApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from "../../lib/stuff/Idea";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import { CommandApi } from "../../api/command";
import { MixinApi } from "../../api/mixin";
import { MessageApi } from "../../api/message";
import { Mml } from "../../api/mml";
import { ScheduleApi } from "../../api/schedule";
import { AppApi } from "../../api/app";
import { ExecutionContextApi } from "../../api/execution-context";
import { AppSettingKeys } from "../../lib/config/AppSettings";
import { Interpreter } from "../../lib/script/Interpreter";
import type { ResourceLimits, DispatchFn } from "../../lib/script/Interpreter";
import { Scope } from "../../lib/script/Scope";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Sensor } from "../../lib/message/Sensor";
import type { CommandGiver } from "../../lib/command/CommandGiver";
import type { Script, Pipeline, Command, Arg } from "../../lib/script/ast";

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

async function runAstImpl(ast: Script, authorPath?: string): Promise<void> {
  const actor = currentActor();
  if (actor === null) return; // no actor in context — nothing to run as

  const interpreter = new Interpreter(actor, resolveLimits(authorPath));
  const dispatch: DispatchFn = (command, model, prep) =>
    actor._dispatchBound(command, model, prep);
  // The preemption slice: yield one macrotask via ScheduleApi (never a
  // bare timer) so the event loop drains other actors' work between
  // slices. Game-clock suspension (`wait`) lands in P5 over WorldClockApi.
  const reschedule = (): Promise<void> =>
    new Promise<void>((resolve) => {
      ScheduleApi.schedule(0, () => resolve());
    });

  const result = await interpreter.drive(ast, new Scope(), dispatch, reschedule);

  // Thread the run's accumulated notes onto the ambient command context
  // so they ride the dispatch-response envelope (the machine channel),
  // exactly as a typed command's notes would.
  const ctx = ExecutionContextApi.getCurrentCommandContext();
  for (const note of result.notes) ctx?.note(note);

  if (result.aborted !== undefined && MixinApi.isSensor(actor)) {
    // Diegetic message (the human channel); partial effects stand.
    MessageApi.scene(actor as Stuff & Sensor)
      .topic("system.script.aborted")
      .toSelf(
        Mml.compose`The script stopped (${result.aborted}${
          result.detail ? `: ${result.detail}` : ""
        }).`,
      )
      .send();
  }
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

  /** See {@link ScriptApi.format}. */
  @CallSecurity(ScriptApiCallers)
  public format(ast: Script): string {
    return formatScript(ast);
  }
}
