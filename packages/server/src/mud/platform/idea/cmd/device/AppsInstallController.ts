/**
 * AppsInstallController — `apps install <app>` on the device you carry
 * (aether-devices D3). The host decides; free and instant.
 */

import type { CommandContext } from '../../../../api/command';
import { AppsControllerBase, type AppsModel } from './AppsControllerBase';

export default class AppsInstallController extends AppsControllerBase {
  async execute(model: AppsModel, context: CommandContext): Promise<void> {
    const device = this.deviceFor(model, context);
    if (!device) return;
    // ⭐ The app, named by the one rule (naming overhaul D-C5 rule 5):
    // `apps install Messages`; an unknown word lists what the store has.
    const key = model.app ?? '';
    // The pool is what it runs and what the app store has (stream arrival D21).
    const path = await this.named(context, device.appNamed(key, 'any', await device.availableApps()), 'app', key);
    if (path === null) return;
    const result = await device.installByKey(path);
    if (!result.ok) {
      const offered = result.offered.length
        ? `The app store has: ${result.offered.join(', ')}.`
        : 'The app store has nothing else.';
      return this.refuse(context, {
        ok: false,
        reason: 'unknown-app',
        facts: { device, app: key, offered },
      });
    }
    const name = this.nameOf(device, result.app.getTemplatePath() ?? key);
    this.say(
      context,
      result.already
        ? `${name} is already installed on ${this.deviceName(device)}.`
        : `You install ${name} on ${this.deviceName(device)}.`,
    );
  }
}
