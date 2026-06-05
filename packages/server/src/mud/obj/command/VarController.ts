/**
 * VarController — player surface for the ad-hoc session-variable
 * store. Bash-style shell variables: untyped, transient, no schema.
 *
 * Subcommands: list (default), set, unset.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresEnvironment` validator (in var.yaml) gates the
 *     giver type.
 *   - Unknown-subcommand rejection is dispatcher-side — `assemble`
 *     returns `error: 'unknown-subcommand'` before the controller
 *     is ever cloned.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Environment } from '../../lib/shell/Environment';

type EnvHost = Stuff & Environment;

interface VarModel extends CommandModel {
  name?: string;
  value?: string;
}

export class VarController extends CommandController<VarModel> {
  execute(model: VarModel, context: CommandContext): void {
    // requiresEnvironment validator guarantees this cast.
    const avatar = context.commandGiver as unknown as EnvHost;

    const sub = model.subcommand ?? 'list';
    const name = model.name;
    const value = model.value;
    switch (sub) {
      case 'list':
        return this.executeList(avatar, context);
      case 'set':
        return this.executeSet(avatar, name, value, context);
      case 'unset':
        return this.executeUnset(avatar, name, context);
    }
  }

  private executeList(
    avatar: EnvHost,
    context: CommandContext,
  ): void {
    const vars = avatar.listVars();
    const entries = Object.entries(vars);
    if (entries.length === 0) {
      this.send(context, Mml.compose`\nNo session variables.\n`);
      return;
    }
    const lines = ['', ...entries.map(([k, v]) => `  ${k} = ${v}`), ''];
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return;
  }

  private executeSet(
    avatar: EnvHost,
    name: string | undefined,
    value: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    if (value === undefined) return this.fail(context, 'value required', 'value-required');
    try {
      avatar.setVar(name, value);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'set-failed');
    }
    this.send(context, Mml.fromMarkup(`\n${name} = ${value}\n`));
    return;
  }

  private executeUnset(
    avatar: EnvHost,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    try {
      avatar.unsetVar(name);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'unset-failed');
    }
    this.send(context, Mml.fromMarkup(`\n${name} cleared.\n`));
    return;
  }

  private fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    this.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
    return;
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
