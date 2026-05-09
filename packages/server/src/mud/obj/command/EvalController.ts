/**
 * EvalController — run a code snippet against the avatar (or `--on`
 * target).
 *
 * Two modes:
 *   - `eval <code>` → replace the avatar's eval-singleton with new
 *     code, then run it.
 *   - `eval` (no code, with optional `--on`) → re-run the existing
 *     singleton's most-recent code against the new target.
 *
 * Singleton path: `/tpl/eval/<avatarId>/_singleton`. Each new
 * `eval <code>` destructs the prior singleton and clones a fresh
 * one, then `setCode` + `run`. Singletons do not persist across
 * server restarts.
 *
 * Multi-target dispatch: `--on <expr>` may resolve to many. Without
 * `--all` the controller errors with an ambiguity notice; with
 * `--all` it iterates and streams per-target results.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MqlApi } from '../../api/mql';
import { DescribeApi } from '../../api/describe';
import { EvalScript } from '../../lib/script/EvalScript';

interface EvalModel extends CommandModel {
  expr?: string;
  on?: string;
  all?: boolean;
}

export class EvalController extends CommandController<EvalModel> {
  async execute(model: EvalModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;

    // Singleton resolution. Per-avatar, so different players don't
    // stomp each other's singleton.
    const singletonPath = `/tpl/eval/${giver.stuffId}/_singleton`;
    const existing = findExistingSingleton(singletonPath);

    let evalStuff: EvalScript;
    if (model.expr) {
      // New code → replace singleton.
      if (existing) StuffApi.destruct(existing);
      evalStuff = await StuffApi.create(() => new EvalScript());
      // Stamp templatePath so MQL path-atom can address it.
      (evalStuff as unknown as { templatePath?: string }).templatePath =
        singletonPath;
      evalStuff.setCode(model.expr);
    } else {
      if (!existing) {
        return this.fail(
          context,
          'no prior eval to re-run; provide code first',
        );
      }
      evalStuff = existing;
    }

    // Resolve targets.
    let targets: Stuff[];
    if (model.on) {
      const r = MqlApi.resolveMany(model.on, {
        commandGiver: giver,
        scope: 'reachable',
      });
      if (r.stuff.length === 0) {
        return this.fail(context, `no targets matched --on ${model.on}`);
      }
      if (r.stuff.length > 1 && !model.all) {
        return this.fail(
          context,
          `ambiguous --on (matched ${r.stuff.length}); use --all to apply to each`,
        );
      }
      targets = r.stuff;
    } else {
      targets = [giver];
    }

    // Iterate.
    let lastSummary = '';
    for (const t of targets) {
      try {
        const result = await evalStuff.run(t);
        const repr = formatResult(result);
        const name = DescribeApi.getDisplayName(t, '?');
        this.tell(context, `\n${name}: ${repr}\n`);
        lastSummary = repr;
      } catch (err) {
        const name = DescribeApi.getDisplayName(t, '?');
        this.tell(
          context,
          `\n${name}: error: ${(err as Error).message}\n`,
        );
      }
    }
    return { success: true, summary: lastSummary };
  }

  private tell(context: CommandContext, text: string): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }
}

function findExistingSingleton(path: string): EvalScript | undefined {
  for (const obj of StuffApi.getAllObjects()) {
    if ((obj as unknown as { templatePath?: string }).templatePath === path) {
      return obj as unknown as EvalScript;
    }
  }
  return undefined;
}

function formatResult(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null) return 'null';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return Object.prototype.toString.call(v);
  }
}
