/**
 * Transcriber — demonstration capture: a completed **manual** build
 * becomes a named, parameterized recipe-script *in the language*.
 *
 * The third authoring source (typed inline, authored as content, or —
 * here — **captured by demonstration**). The set of commands that touched
 * the build vessel from first pour to the terminal `strain` (recorded on
 * the `ManualBuild` buffer — the vessel-as-buffer capture boundary) is
 * exactly "the martini". The Transcriber serializes them to real source
 * via the `format()` round-trip (so the artifact is inspectable + editable
 * like any script, NOT an opaque macro), **lifts the base spirit** (the
 * first step's spirit input) to the single `$brand` param, wraps the whole
 * in `def <recipe> ($brand) { … }`, and banks it to the owner's home path
 * in the path-addressed store.
 *
 * The owner is the acting author (the builder) — the `StrainController`
 * runs this inside a `tagActingAuthor` frame at engaged-completion, so
 * `getActingAuthor` and the downstream `saveScript` (gate + provenance)
 * resolve the builder transport-agnostically, never a passed actor.
 */

import { CommandApi } from "../../api/command";
import { ScriptApi } from "../../api/script";
import { ExecutionContextApi } from "../../api/execution-context";
import type { Script, Command } from "./ast";
import type { Stuff } from "../stuff/Stuff";
import type { CommandGiver } from "../command/CommandGiver";

/** Parse the joined manual-step sources into a `Script` body. */
async function parseBody(
  source: string,
  actor: Stuff & CommandGiver,
): Promise<Script | null> {
  const parser = await CommandApi.resolveParser("script");
  const result = await parser.parse(source, {
    commandGiver: actor,
    location: null,
    available: actor.getAvailableCommands(),
  });
  if (result.script !== undefined) return result.script.ast;
  return null; // a real build is always multi-statement → the script arm
}

/** Lift the first step's base spirit (`pour gin …` → `pour $brand …`). */
function liftBaseSpirit(body: Script): void {
  const first = body.statements[0]?.commands[0];
  const arg = first?.args[0];
  if (arg && arg.kind === "literal") {
    first!.args[0] = { kind: "var", name: "brand" };
  }
}

/** Wrap a body in `def <name> ($brand) { … }`. */
function wrapInDef(name: string, body: Script): Script {
  const command: Command = {
    kind: "command",
    word: "def",
    args: [
      { kind: "literal", value: name },
      { kind: "expr", source: "$brand" },
      { kind: "block", body },
    ],
  };
  return { kind: "script", statements: [{ kind: "pipeline", commands: [command] }] };
}

/** The owner's home recipe path: `/home/<key>/scripts/<name>`. */
function homeScriptsPath(ownerPath: string, name: string): string {
  const key = ownerPath.split("/").filter(Boolean).pop() ?? "anon";
  return `/home/${key}/scripts/${name}`;
}

export class Transcriber {
  /**
   * Transcribe a manual build into a banked recipe-script. Returns the
   * banked path, or null when there's nothing to capture (no recipe
   * match, no recorded sources — a scripted build — or no owner). Must
   * run inside a frame whose acting author is the builder.
   */
  static async transcribe(
    recipeId: string,
    commandSources: readonly string[],
  ): Promise<string | null> {
    if (recipeId.length === 0 || commandSources.length === 0) return null;
    const owner = ExecutionContextApi.getActingAuthor() as
      | (Stuff & CommandGiver)
      | null;
    const ownerPath = owner?.getTemplatePath() ?? null;
    if (owner === null || ownerPath === null) return null;

    const body = await parseBody(commandSources.join("; "), owner);
    if (body === null) return null;
    liftBaseSpirit(body);
    const source = ScriptApi.format(wrapInDef(recipeId, body));
    const path = homeScriptsPath(ownerPath, recipeId);
    await ScriptApi.saveScript(path, source);
    return path;
  }
}
