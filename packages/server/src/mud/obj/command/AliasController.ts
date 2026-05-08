/**
 * AliasController — player surface for the per-character alias store.
 * Subcommands: list (default), get, set, unset, describe.
 *
 * `set --session NAME BODY` writes to the transient store; bare
 * `set NAME BODY` writes to the persistent store (default). `unset`
 * tombstones the persistent tier when the name has a default,
 * otherwise just drops the override.
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
import type { Alias } from '../../lib/shell/Alias';

type AliasHost = Stuff & Alias;

interface AliasModel extends CommandModel {
  name?: string;
  body?: string;
  session?: boolean;
}

export class AliasController extends CommandController<AliasModel> {
  execute(model: AliasModel, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!MixinApi.isAlias(avatar)) {
      return { success: false, summary: 'this character has no aliases' };
    }

    const sub = model.subcommand ?? 'list';
    const name = model.name;
    const body = model.body;
    const session = !!model.session;
    switch (sub) {
      case 'list':
        return this.executeList(avatar, context);
      case 'get':
        return this.executeGet(avatar, name, context);
      case 'set':
        return this.executeSet(avatar, name, body, session, context);
      case 'unset':
        return this.executeUnset(avatar, name, context);
      case 'describe':
        return this.executeDescribe(avatar, name, context);
      default:
        return { success: false, summary: `unknown subcommand: ${sub}` };
    }
  }

  private executeList(
    avatar: AliasHost,
    context: CommandContext,
  ): CommandResult {
    const resolved = avatar.getAliases();
    const overrides = avatar.listOverrides();
    const tombstones = Object.entries(overrides.persistent)
      .filter(([, v]) => v === null)
      .map(([k]) => k)
      .sort();

    if (resolved.size === 0 && tombstones.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo aliases.\n`));
      return { success: true, summary: 'no aliases' };
    }

    const sortedNames = Array.from(resolved.keys()).sort();
    const nameWidth = Math.max(
      4,
      ...sortedNames.map((n) => n.length),
      ...tombstones.map((n) => n.length),
    );
    const lines: string[] = ['', 'Aliases:'];
    for (const n of sortedNames) {
      const entry = resolved.get(n)!;
      const marker = entry.source === 'default' ? ' ' : '*';
      lines.push(
        `  ${marker} ${pad(n, nameWidth)} = ${entry.body}    [${entry.source}]`,
      );
    }
    if (tombstones.length > 0) {
      lines.push('');
      lines.push('Tombstoned (default suppressed):');
      for (const n of tombstones) {
        lines.push(`  T ${pad(n, nameWidth)}`);
      }
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${resolved.size} aliases` };
  }

  private executeGet(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    const entry = avatar.getAlias(name);
    if (!entry) return this.fail(context, `no such alias: ${name}`);
    this.send(
      context,
      Mml.fromMarkup(`\n${entry.name} = ${entry.body}    [${entry.source}]\n`),
    );
    return {
      success: true,
      summary: `${entry.name} = ${entry.body}`,
    };
  }

  private executeSet(
    avatar: AliasHost,
    name: string | undefined,
    body: string | undefined,
    session: boolean,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    if (body === undefined || body === '')
      return this.fail(context, 'body required');
    try {
      avatar.setAlias(name, body, {
        lifetime: session ? 'session' : 'persistent',
        actor: avatar,
      });
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    const tier = session ? 'session' : 'persistent';
    this.send(
      context,
      Mml.fromMarkup(`\n${name} set [${tier}].\n`),
    );
    return { success: true, summary: `${name} set` };
  }

  private executeUnset(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    const removed = avatar.removeAlias(name, avatar);
    if (!removed) {
      return this.fail(context, `no such alias: ${name}`);
    }
    this.send(context, Mml.fromMarkup(`\n${name} cleared.\n`));
    return { success: true, summary: `${name} cleared` };
  }

  private executeDescribe(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!name) return this.fail(context, 'name required');
    const entry = avatar.getAlias(name);
    if (!entry) return this.fail(context, `no such alias: ${name}`);
    const lines = [
      '',
      entry.name,
      `  body:        ${entry.body}`,
      `  source:      ${entry.source}`,
    ];
    if (entry.description) {
      lines.push(`  description: ${entry.description}`);
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${entry.name}: ${entry.source}` };
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

function pad(s: string, w: number): string {
  return s.length >= w ? s : s + ' '.repeat(w - s.length);
}
