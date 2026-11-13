/**
 * SettingsControllerBase — what the `settings` subcommands share
 * (controller-liquidity W7a, D13: one controller per subcommand over a
 * base per noun): the player surface for the schema-validated persistent
 * settings store. `list` (and bare `settings`) is
 * `SettingsListController`; `get`, `set`, `unset` and `describe` are
 * `SettingsGetController`, `SettingsSetController`,
 * `SettingsUnsetController` and `SettingsDescribeController`.
 *
 * Holds the giver narrowing, the value formatting and coercion, the
 * `shell.result` push `set` and `unset` both make, and the shell words.
 *
 * Cross-cutting concerns the framework handles, not us:
 *   - `requiresEnvironment` validator (in settings.yaml) gates
 *     the giver type.
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
import type {
  Environment,
  SettingsSchemaEntry,
} from '../../../../lib/shell/Environment';
import { ShellApi } from '../../../../api/shell';
import type { ClientState } from '../../../../lib/connection/ClientState';
import type { ResultDisplay } from '@saxonberg/types';

export type EnvHost = Stuff & Environment;

export interface SettingsModel extends CommandModel {
  key?: string;
  value?: string;
}

export abstract class SettingsControllerBase extends CommandController<SettingsModel> {
  /** The giver as an environment host — the validator guarantees it. */
  protected static envHost(context: CommandContext): EnvHost {
    // requiresEnvironment validator guarantees env capability; narrow to prove it.
    const giver = context.commandGiver;
    if (!MixinApi.isEnvironment(giver)) {
      throw new Error('SettingsController: command giver has no environment');
    }
    return giver;
  }

  /**
   * ⭐ Push `shell.result`'s two resolved answers when either changes,
   * so the filter takes effect **without a reconnect**.
   *
   * ⚠ Both values, always — the server cannot know a viewport, so it
   * ships what each width would resolve to and the client picks. The
   * `social.rules` projection is the precedent: a server→client push,
   * not a persisted client-state key.
   *
   * ⚠ Keyed on the BASE setting, so a write to `shell.result.mobile`
   * re-pushes too. A per-factor override that only took effect after a
   * reconnect would be indistinguishable from one that did not work.
   */
  protected static pushResultDisplay(avatar: EnvHost, key: string): void {
    if (key !== 'shell.result' && !key.startsWith('shell.result.')) return;
    if (!MixinApi.isClientState(avatar)) return;
    const host = avatar as unknown as Stuff;
    (avatar as unknown as ClientState).pushClientStateUpdate(
      'shell.result',
      {
        desktop:
          ShellApi.resolveSetting<ResultDisplay>(
            host,
            'shell.result',
            'desktop',
          ) ?? 'card',
        mobile:
          ShellApi.resolveSetting<ResultDisplay>(
            host,
            'shell.result',
            'mobile',
          ) ?? 'card',
      },
    );
  }

  protected static fail(
    context: CommandContext,
    detail: string,
    reason: string = 'unspecified',
  ): void {
    SettingsControllerBase.send(context, Mml.fromMarkup(`\n${detail}\n`));
    context.note({ kind: 'controller-rejected', reason, detail });
  }

  protected static send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('shell.config')
      .toSelf(body)
      .send();
  }

  protected static formatValue(v: unknown): string {
    if (typeof v === 'string') return JSON.stringify(v);
    return String(v);
  }

  protected static coerceToType(
    raw: string,
    schema: SettingsSchemaEntry,
  ): unknown {
    switch (schema.type) {
      case 'string': {
        // Shell convention: a value wrapped in a matching quote pair has the
        // quotes stripped. The greedy value arg captures the raw remainder
        // (including any quotes), and a user must quote a value that contains
        // command-tokenizer syntax — e.g. a Liquid `{{ … }}` presence format.
        const quoted = raw.match(/^"([\s\S]*)"$/) ?? raw.match(/^'([\s\S]*)'$/);
        return quoted ? quoted[1] : raw;
      }
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
}
