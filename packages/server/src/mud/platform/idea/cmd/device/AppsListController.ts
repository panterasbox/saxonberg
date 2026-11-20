/**
 * AppsListController — bare `apps`: what the device you carry runs, and
 * what else it offers (aether-devices D3).
 */

import type { CommandContext } from '../../../../api/command';
import { AppsControllerBase, type AppsModel } from './AppsControllerBase';

export default class AppsListController extends AppsControllerBase {
  execute(model: AppsModel, context: CommandContext): void {
    const device = this.deviceFor(model, context);
    if (!device) return;
    const runs = device.getInstalledApps().map((p) => this.nameOf(device, p));
    const offered = device
      .availableApps()
      .map((p) => p.slice(p.lastIndexOf('/') + 1));
    const lines = [
      runs.length
        ? `${this.deviceName(device)} runs: ${runs.join(', ')}.`
        : `${this.deviceName(device)} runs nothing.`,
    ];
    if (offered.length) {
      lines.push(`You can install: ${offered.join(', ')} — \`apps install <app>\`.`);
    }
    this.say(context, lines.join('\n'));
  }
}
