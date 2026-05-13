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
  execute(model: AliasModel, context: CommandContext): void {
    const avatar = context.commandGiver;
    if (!MixinApi.isAlias(avatar)) {
      this.send(context, Mml.fromMarkup('\nthis character has no aliases\n'));
      context.note({ kind: 'mixin-missing', mixin: 'AliasMixin' });
      return;
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
        return this.fail(context, `unknown subcommand: ${sub}`, 'unknown-subcommand');
    }
  }

  private executeList(
    avatar: AliasHost,
    context: CommandContext,
  ): void {
    const resolved = avatar.getAliases();
    const overrides = avatar.listOverrides();
    const tombstones = Object.entries(overrides.persistent)
      .filter(([, v]) => v === null)
      .map(([k]) => k)
      .sort();

    if (resolved.size === 0 && tombstones.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo aliases.\n`));
      return;
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
        `  ${marker} ${n.padEnd(nameWidth)} = ${entry.body}    [${entry.source}]`,
      );
    }
    if (tombstones.length > 0) {
      lines.push('');
      lines.push('Tombstoned (default suppressed):');
      for (const n of tombstones) {
        lines.push(`  T ${n.padEnd(nameWidth)}`);
      }
    }
    lines.push('');
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return;
  }

  private executeGet(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    const entry = avatar.getAlias(name);
    if (!entry) return this.fail(context, `no such alias: ${name}`, 'no-such-alias');
    this.send(
      context,
      Mml.fromMarkup(`\n${entry.name} = ${entry.body}    [${entry.source}]\n`),
    );
    return;
  }

  private executeSet(
    avatar: AliasHost,
    name: string | undefined,
    body: string | undefined,
    session: boolean,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    if (body === undefined || body === '')
      return this.fail(context, 'body required', 'body-required');
    try {
      avatar.setAlias(name, body, {
        lifetime: session ? 'session' : 'persistent',
        actor: avatar,
      });
    } catch (err) {
      return this.fail(context, (err as Error).message, 'set-failed');
    }
    const tier = session ? 'session' : 'persistent';
    this.send(
      context,
      Mml.fromMarkup(`\n${name} set [${tier}].\n`),
    );
    return;
  }

  private executeUnset(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    const removed = avatar.removeAlias(name, avatar);
    if (!removed) {
      return this.fail(context, `no such alias: ${name}`);
    }
    this.send(context, Mml.fromMarkup(`\n${name} cleared.\n`));
    return;
  }

  private executeDescribe(
    avatar: AliasHost,
    name: string | undefined,
    context: CommandContext,
  ): void {
    if (!name) return this.fail(context, 'name required', 'name-required');
    const entry = avatar.getAlias(name);
    if (!entry) return this.fail(context, `no such alias: ${name}`, 'no-such-alias');
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
