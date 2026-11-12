/**
 * VarControllerBase — what the `var` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the player surface for the ad-hoc session-variable
 * store — Bash-style shell variables: untyped, transient, no schema.
 * `list` (and bare `var`) is `VarListController`; `set` and `unset` are
 * `VarSetController` and `VarUnsetController`.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresEnvironment` validator (in var.yaml) gates the
 *     giver type.
 *   - Unknown-subcommand rejection is dispatcher-side — `assemble`
 *     returns `error: 'unknown-subcommand'` before the controller
 *     is ever cloned.
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
} from '../../../../api/command';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type { Environment } from '../../../../lib/shell/Environment';

export type EnvHost = Stuff & Environment;

export interface VarModel extends CommandModel {
  name?: string;
  value?: string;
}

export abstract class VarControllerBase extends CommandController<VarModel> {
  /** The giver as an environment host — the validator guarantees it. */
  protected static envHost(context: CommandContext): EnvHost {
    // requiresEnvironment validator guarantees env capability; narrow to prove it.
    const giver = context.commandGiver;
    if (!MixinApi.isEnvironment(giver)) {
      throw new Error('VarController: command giver has no environment');
    }
    return giver;
  }

  protected static fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    VarControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.config')
      .toSelf(body)
      .send();
  }
}
