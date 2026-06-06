/**
 * SettingsController — player surface for the schema-validated
 * persistent settings store. Subcommands: list (default), get, set,
 * unset, describe.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresEnvironment` validator (in settings.yaml) gates
 *     the giver type.
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
import { MixinApi } from '../../api/mixin';
import { Mml } from '../../api/mml';
import type { Stuff } from '../../lib/stuff/Stuff';
import type {
  Environment,
  SettingsSchemaEntry,
} from '../../lib/shell/Environment';

type EnvHost = Stuff & Environment;

interface SettingsModel extends CommandModel {
  key?: string;
  value?: string;
}

export class SettingsController extends CommandController<SettingsModel> {
  execute(model: SettingsModel, context: CommandContext): void {
    // requiresEnvironment validator guarantees env capability; narrow to prove it.
    const giver = context.commandGiver;
    if (!MixinApi.isEnvironment(giver)) {
      throw new Error('SettingsController: command giver has no environment');
    }
    const avatar: EnvHost = giver;

    const sub = model.subcommand ?? 'list';
    const key = model.key;
    const value = model.value;
    switch (sub) {
      case 'list':
        return this.executeList(avatar, context);
      case 'get':
        return this.executeGet(avatar, key, context);
      case 'set':
        return this.executeSet(avatar, key, value, context);
      case 'unset':
        return this.executeUnset(avatar, key, context);
      case 'describe':
        return this.executeDescribe(avatar, key, context);
    }
  }

  private executeList(
    avatar: EnvHost,
    context: CommandContext,
  ): void {
    const snapshot = avatar.listSettings();
    if (snapshot.length === 0) {
      this.send(context, Mml.compose`\nNo settings declared.\n`);
      return;
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
    return;
  }

  private executeGet(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): void {
    if (!key) return this.fail(context, 'key required', 'key-required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`, 'no-such-setting');
    const value = avatar.getSetting(key);
    this.send(
      context,
      Mml.fromMarkup(`\n${key} = ${formatValue(value)}\n`),
    );
    return;
  }

  private executeSet(
    avatar: EnvHost,
    key: string | undefined,
    rawValue: string | undefined,
    context: CommandContext,
  ): void {
    if (!key) return this.fail(context, 'key required', 'key-required');
    if (rawValue === undefined)
      return this.fail(context, 'value required', 'value-required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`, 'no-such-setting');

    let coerced: unknown;
    try {
      coerced = coerceToType(rawValue, schema);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'coercion-failed');
    }

    try {
      avatar.setSetting(key, coerced, avatar);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'set-failed');
    }
    this.send(
      context,
      Mml.fromMarkup(`\n${key} set to ${formatValue(coerced)}.\n`),
    );
    return;
  }

  private executeUnset(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): void {
    if (!key) return this.fail(context, 'key required', 'key-required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`, 'no-such-setting');
    try {
      avatar.unsetSetting(key, avatar);
    } catch (err) {
      return this.fail(context, (err as Error).message, 'unset-failed');
    }
    this.send(
      context,
      Mml.fromMarkup(`\n${key} cleared (default applies).\n`),
    );
    return;
  }

  private executeDescribe(
    avatar: EnvHost,
    key: string | undefined,
    context: CommandContext,
  ): void {
    if (!key) return this.fail(context, 'key required', 'key-required');
    const schema = avatar.describeSetting(key);
    if (!schema) return this.fail(context, `no such setting: ${key}`, 'no-such-setting');
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
