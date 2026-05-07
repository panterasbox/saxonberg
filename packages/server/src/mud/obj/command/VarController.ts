/**
 * VarController — player surface for the ad-hoc session-variable
 * store. Bash-style shell variables: untyped, transient, no schema.
 *
 * Subcommands: list (default), set, unset.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Environment } from '../../lib/shell/Environment';

type EnvHost = Stuff & Environment;

interface VarModel extends CommandModel {
  name?: string;
  value?: string;
}

export class VarController extends CommandController<VarModel> {
  execute(model: VarModel, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!MixinApi.isEnvironment(avatar)) {
      return {
        success: false,
        summary: 'this character has no session storage',
      };
    }

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
      default:
        return { success: false, summary: `unknown subcommand: ${sub}` };
    }
  }

  private executeList(
    avatar: EnvHost,
    context: CommandContext,
  ): CommandResult {
    const vars = avatar.listVars();
    const entries = Object.entries(vars);
    if (entries.length === 0) {
      this.send(context, Mml.compose`\nNo session variables.\n`);
      return { success: true, summary: 'no vars' };
    }
    const lines = ['', ...entries.map(([k, v]) => `  ${k} = ${v}`), ''];
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${entries.length} vars` };
  }

  private executeSet(
    avatar: EnvHost,
    name: string | undefined,
    value: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    if (value === undefined) return this.fail(context, 'value required');
    try {
      avatar.setVar(name, value);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.send(context, Mml.fromMarkup(`\n${name} = ${value}\n`));
    return { success: true, summary: `${name} set` };
  }

  private executeUnset(
    avatar: EnvHost,
    name: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    try {
      avatar.unsetVar(name);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.send(context, Mml.fromMarkup(`\n${name} cleared.\n`));
    return { success: true, summary: `${name} cleared` };
  }

  private fail(context: CommandContext, summary: string): CommandResult {
    this.send(context, Mml.fromMarkup(`\n${summary}\n`));
    return { success: false, summary };
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
