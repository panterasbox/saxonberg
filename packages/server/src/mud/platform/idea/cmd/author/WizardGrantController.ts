/**
 * WizardGrantController — `wizard grant <player>` — confer wizard
 * (code-trust) status (over {@link WizardControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { WizardControllerBase, type WizardModel } from './WizardControllerBase';

export default class WizardGrantController extends WizardControllerBase {
  async execute(model: WizardModel, context: CommandContext): Promise<void> {
    return this.confer(model, context, true);
  }
}
