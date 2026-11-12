/**
 * SettingsSetController — `settings set <key> <value>` — override a
 * setting, coerced to its declared type (over {@link
 * SettingsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  SettingsControllerBase,
  type SettingsModel,
} from './SettingsControllerBase';

export default class SettingsSetController extends SettingsControllerBase {
  execute(model: SettingsModel, context: CommandContext): void {
    const avatar = SettingsControllerBase.envHost(context);
    const key = model.key;
    const rawValue = model.value;
    if (!key) return SettingsControllerBase.fail(context, 'key required', 'key-required');
    if (rawValue === undefined) {
      return SettingsControllerBase.fail(context, 'value required', 'value-required');
    }
    const schema = avatar.describeSetting(key);
    if (!schema) {
      return SettingsControllerBase.fail(context, `no such setting: ${key}`, 'no-such-setting');
    }

    let coerced: unknown;
    try {
      coerced = SettingsControllerBase.coerceToType(rawValue, schema);
    } catch (err) {
      return SettingsControllerBase.fail(context, (err as Error).message, 'coercion-failed');
    }

    try {
      avatar.setSetting(key, coerced, avatar);
    } catch (err) {
      return SettingsControllerBase.fail(context, (err as Error).message, 'set-failed');
    }
    SettingsControllerBase.pushResultDisplay(avatar, key);
    SettingsControllerBase.send(
      context,
      Mml.fromMarkup(`\n${key} set to ${SettingsControllerBase.formatValue(coerced)}.\n`),
    );
  }
}
