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
 * Singleton path: `/home/<playerId>/_eval` (falling back to
 * `/home/<stuffId>/_eval` for givers that aren't player-shaped —
 * e.g. scripted NPCs). Establishes the `/home/` branch of the
 * template tree as the per-player namespace; future variants tag
 * the basename (`_eval.<tag>`) instead of nesting deeper. Each
 * new `eval <code>` destructs the prior singleton and clones a
 * fresh one, then `setCode` + `run`. Singletons do not persist
 * across server restarts.
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
import type { MqlManyResult } from '../../api/mql';
import { DescribeApi } from '../../api/describe';
import { Avatar } from '../Avatar';
import { EvalScript } from '../../lib/script/EvalScript';

interface EvalModel extends CommandModel {
  expr?: string;
  on?: MqlManyResult;
  all?: boolean;
}

export class EvalController extends CommandController<EvalModel> {
  async execute(model: EvalModel, context: CommandContext): Promise<CommandResult> {
    const giver = context.commandGiver;

    // Singleton resolution. Keyed by the player's persistent
    // identity (Avatar.getPlayerId) so different players don't
    // stomp each other's singleton across runtime sessions. Falls
    // back to stuffId for non-Avatar givers (scripted NPCs that
    // happen to compose CommandGiver).
    const playerKey = giver instanceof Avatar ? giver.getPlayerId() : giver.stuffId;
    const singletonPath = `/home/${playerKey}/_eval`;
    const existing = StuffApi.findByTemplatePath<EvalScript>(singletonPath);

    let evalStuff: EvalScript;
    if (model.expr) {
      // New code → replace singleton.
      if (existing) StuffApi.destruct(existing);
      evalStuff = await StuffApi.create(() => new EvalScript());
      // Stamp templatePath so MQL path-atom can address it.
      StuffApi.setTemplatePath(evalStuff, singletonPath);
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

    // Resolve targets. The matcher already ran MQL on `--on` (it's
    // declared `type: objects` in the yaml), so model.on is an
    // `MqlManyResult`. Empty result is the no-match case; >1 still
    // requires `--all` for safety so a mistyped query doesn't
    // silently apply to many targets.
    let targets: Stuff[];
    if (model.on) {
      const stuff = model.on.stuff;
      if (stuff.length === 0) {
        return this.fail(
          context,
          `no targets matched --on ${model.on.raw ?? ''}`,
        );
      }
      if (stuff.length > 1 && !model.all) {
        return this.fail(
          context,
          `ambiguous --on (matched ${stuff.length}); use --all to apply to each`,
        );
      }
      targets = stuff;
    } else {
      targets = [giver];
    }

    // Iterate.
    let lastSummary = '';
    for (const t of targets) {
      try {
        const result = await evalStuff.run(t);
        const repr = this._formatResult(result);
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
      .topic(MessageApi.Topics.system.shell.author)
      .toSelf(Mml.fromMarkup(text))
      .send();
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.tell(context, `\n${summary}\n`);
    return { success: false, summary };
  }

  private _formatResult(v: unknown): string {
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
}
