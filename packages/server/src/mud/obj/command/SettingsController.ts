/**
 * SettingsController — player surface for the schema-validated
 * persistent settings store.
 *
 * Subcommands: list (default), get, set, unset, describe.
 *
 * Type coercion: YAML field values arrive as strings. For schema
 * entries declaring `type: 'number'`, `'boolean'`, or `'enum'`, we
 * coerce before calling `setSetting`. `'struct'` and `'list'` are
 * rejected at the command surface (see
 * `docs/subsystems/shell-environment.md`) — a structured-value
 * command syntax doesn't exist yet.
 *
 * Privacy in the player path is trivially satisfied:
 * `actor === target === avatar`. The check earns its keep against
 * programmatic writes elsewhere (see D8).
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { MixinApi } from '../../api/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  Environment,
  SettingsSchemaEntry,
} from '../../lib/shell/Environment';

type EnvHost = Stuff & Environment;

export interface SettingsInput {
  subcommand?: string;
  key?: string;
  value?: string;
}

export class SettingsController extends CommandController<SettingsInput> {
  execute(input: SettingsInput, context: CommandContext): CommandResult {
    const avatar = context.commandGiver;
    if (!MixinApi.isEnvironment(avatar)) {
      return {
        success: false,
        summary: 'this character has no settings',
      };
    }

    const sub = input.subcommand ?? 'list';
    switch (sub) {
      case 'list':
        return this.executeList(avatar, context);
      case 'get':
        return this.executeGet(avatar, input.key, context);
      case 'set':
        return this.executeSet(avatar, input.key, input.value, context);
      case 'unset':
        return this.executeUnset(avatar, input.key, context);
      case 'describe':
        return this.executeDescribe(avatar, input.key, context);
      default:
        return { success: false, summary: `unknown subcommand: ${sub}` };
    }
  }

  private executeList(
    avatar: EnvHost,
    context: CommandContext,
  ): CommandResult {
    const snapshot = avatar.listSettings();
    if (snapshot.length === 0) {
      this.send(context, Mml.compose`\nNo settings declared.\n`);
      return { success: true, summary: 'no settings' };
    }

    const grouped = new Map<string, typeof snapshot>();
    for (const entry of snapshot) {
      const arr = grouped.get(entry.sourceMixin) ?? [];
      arr.push(entry);
      grouped.set(entry.sourceMixin, arr);
    }

    const lines: string[] = [''];
    for (const [mixin, entries] of grouped) {
      lines.push(`${mixin}:`);
      for (const e of entries) {
        const marker = e.isOverridden ? '*' : ' ';
        lines.push(`  ${marker} ${e.schema.key} = ${formatValue(e.currentValue)}`);
      }
      lines.push('');
    }
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${snapshot.length} settings` };
  }

  private executeGet(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!key) return this.fail(context, 'key required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`);
    const value = avatar.getSetting(key);
    this.send(
      context,
      Mml.fromMarkup(`\n${key} = ${formatValue(value)}\n`),
    );
    return { success: true, summary: `${key} = ${formatValue(value)}` };
  }

  private executeSet(
    avatar: EnvHost,
    key: string | undefined,
    rawValue: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!key) return this.fail(context, 'key required');
    if (rawValue === undefined)
      return this.fail(context, 'value required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`);

    let coerced: unknown;
    try {
      coerced = coerceToType(rawValue, schema);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }

    try {
      avatar.setSetting(key, coerced, avatar);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.send(
      context,
      Mml.fromMarkup(`\n${key} set to ${formatValue(coerced)}.\n`),
    );
    return { success: true, summary: `${key} set` };
  }

  private executeUnset(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!key) return this.fail(context, 'key required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`);
    try {
      avatar.unsetSetting(key, avatar);
    } catch (err) {
      return this.fail(context, (err as Error).message);
    }
    this.send(
      context,
      Mml.fromMarkup(`\n${key} cleared (default applies).\n`),
    );
    return { success: true, summary: `${key} cleared` };
  }

  private executeDescribe(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): CommandResult {
    if (!key) return this.fail(context, 'key required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`);
    const lines = [
      '',
      `${schema.key}`,
      `  type:        ${schema.type}`,
      `  default:     ${formatValue(schema.default)}`,
      `  lifetime:    ${schema.lifetime ?? 'persistent'}`,
      `  private:     ${schema.private ? 'yes' : 'no'}`,
      `  description: ${schema.description}`,
      '',
    ];
    if (schema.type === 'enum' && schema.enumValues) {
      lines.splice(3, 0, `  values:      ${schema.enumValues.join(', ')}`);
    }
    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${key}: ${schema.type}` };
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

function formatValue(v: unknown): string {
  if (typeof v === 'string') return JSON.stringify(v);
  return String(v);
}

function coerceToType(
  raw: string,
  schema: SettingsSchemaEntry,
): unknown {
  switch (schema.type) {
    case 'string':
      return raw;
    case 'number': {
      const n = Number(raw);
      if (Number.isNaN(n)) throw new Error(`'${raw}' is not a number`);
      return n;
    }
    case 'boolean': {
      const lc = raw.toLowerCase();
      if (lc === 'true' || lc === 'yes' || lc === '1') return true;
      if (lc === 'false' || lc === 'no' || lc === '0') return false;
      throw new Error(`'${raw}' is not a boolean`);
    }
    case 'enum':
      return raw;
    case 'struct':
    case 'list':
      throw new Error(
        `cannot set ${schema.type} values from the command line ` +
          `(structured-value syntax not implemented)`,
      );
  }
}
