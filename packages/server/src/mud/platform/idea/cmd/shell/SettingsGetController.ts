/**
 * SettingsGetController — `settings get <key>` — a setting's current
 * value (over {@link SettingsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  SettingsControllerBase,
  type SettingsModel,
} from './SettingsControllerBase';

export default class SettingsGetController extends SettingsControllerBase {
  execute(model: SettingsModel, context: CommandContext): void {
    const avatar = SettingsControllerBase.envHost(context);
    const key = model.key;
    if (!key) return SettingsControllerBase.fail(context, 'key required', 'key-required');
    const schema = avatar.describeSetting(key);
    if (!schema) {
      return SettingsControllerBase.fail(context, `no such setting: ${key}`, 'no-such-setting');
    }
    const value = avatar.getSetting(key);
    SettingsControllerBase.send(
      context,
      Mml.fromMarkup(`\n${key} = ${SettingsControllerBase.formatValue(value)}\n`),
    );
  }
}
