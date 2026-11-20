/**
 * AppsUninstallController — `apps uninstall <app>` on the device you carry
 * (aether-devices D3). The host decides; free and instant.
 */

import type { CommandContext } from '../../../../api/command';
import { AppsControllerBase, type AppsModel } from './AppsControllerBase';

export default class AppsUninstallController extends AppsControllerBase {
  execute(model: AppsModel, context: CommandContext): void {
    const device = this.deviceFor(model, context);
    if (!device) return;
    const key = (model.app ?? '').trim().toLowerCase();
    const path = device
      .getInstalledApps()
      .find((p) => p.slice(p.lastIndexOf('/') + 1) === key);
    const name = path ? this.nameOf(device, path) : key;
    if (!device.uninstallApp(key)) {
      return this.refuse(context, { ok: false, reason: 'not-installed', facts: { device, app: key } });
    }
    this.say(context, `You uninstall ${name} from ${this.deviceName(device)}.`);
  }
}
