/**
 * SettingsListController — `settings list` (and bare `settings`) — every
 * declared setting, grouped by the mixin that declares it, and the
 * settings card (over {@link SettingsControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { CardApi } from '../../../../api/card';
import {
  SettingsControllerBase,
  type SettingsModel,
} from './SettingsControllerBase';

export default class SettingsListController extends SettingsControllerBase {
  execute(_model: SettingsModel, context: CommandContext): void {
    const avatar = SettingsControllerBase.envHost(context);
    const snapshot = avatar.listSettings();
    if (snapshot.length === 0) {
      SettingsControllerBase.send(context, Mml.compose`\nNo settings declared.\n`);
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
        lines.push(
          `  ${marker} ${e.schema.key} = ${SettingsControllerBase.formatValue(e.currentValue)}`,
        );
      }
      lines.push('');
    }
    const report = Mml.fromMarkup(lines.join('\n'));
    SettingsControllerBase.send(context, report);
    // ⭐ Settings are a CARD (client-surface D10): the list opens (or
    // touches — it is a singleton) the settings card, whose body is the
    // client's editor. The report above stays the terminal's answer.
    CardApi.open(context, 'settings', { prose: report });
  }
}
