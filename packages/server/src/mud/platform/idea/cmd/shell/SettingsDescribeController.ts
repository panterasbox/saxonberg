/**
 * SettingsDescribeController — `settings describe <key>` — a setting's
 * schema entry (over {@link SettingsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import {
  SettingsControllerBase,
  type SettingsModel,
} from './SettingsControllerBase';

export default class SettingsDescribeController extends SettingsControllerBase {
  execute(model: SettingsModel, context: CommandContext): void {
    const avatar = SettingsControllerBase.envHost(context);
    const key = model.key;
    if (!key) return SettingsControllerBase.fail(context, 'key required', 'key-required');
    const schema = avatar.describeSetting(key);
    if (!schema) {
      return SettingsControllerBase.fail(context, `no such setting: ${key}`, 'no-such-setting');
    }
    const lines = [
      '',
      `${schema.key}`,
      `  type:        ${schema.type}`,
      `  default:     ${SettingsControllerBase.formatValue(schema.default)}`,
      `  lifetime:    ${schema.lifetime ?? 'persistent'}`,
      `  private:     ${schema.private ? 'yes' : 'no'}`,
      `  description: ${schema.description}`,
      '',
    ];
    if (schema.type === 'enum' && schema.enumValues) {
      lines.splice(3, 0, `  values:      ${schema.enumValues.join(', ')}`);
    }
    SettingsControllerBase.send(context, Mml.fromMarkup(lines.join('\n')));
  }
}
