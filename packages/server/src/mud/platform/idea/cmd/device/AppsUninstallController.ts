/**
 * AppsUninstallController — `apps uninstall <app>` on the device you carry
 * (aether-devices D3). The host decides; free and instant.
 */

import type { CommandContext } from '../../../../api/command';
import { AppsControllerBase, type AppsModel } from './AppsControllerBase';

export default class AppsUninstallController extends AppsControllerBase {
  async execute(model: AppsModel, context: CommandContext): Promise<void> {
    const device = this.deviceFor(model, context);
    if (!device) return;
    // ⭐ Among the installed apps, by the one rule (naming overhaul D-C5):
    // `apps uninstall the messages`.
    const typed = model.app ?? '';
    const path = await this.named(context, device.appNamed(typed, 'installed'), 'installed app', typed);
    if (path === null) return;
    const name = this.nameOf(device, path);
    if (!device.uninstallApp(path.slice(path.lastIndexOf('/') + 1))) {
      return this.refuse(context, { ok: false, reason: 'not-installed', facts: { device, app: typed } });
    }
    this.say(context, `You uninstall ${name} from ${this.deviceName(device)}.`);
  }
}
