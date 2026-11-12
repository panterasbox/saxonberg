/**
 * VarUnsetController — `var unset <name>` — forget a session variable
 * (over {@link VarControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { VarControllerBase, type VarModel } from './VarControllerBase';

export default class VarUnsetController extends VarControllerBase {
  execute(model: VarModel, context: CommandContext): void {
    const avatar = VarControllerBase.envHost(context);
    const name = model.name;
    if (!name) return VarControllerBase.fail(context, 'name required', 'name-required');
    try {
      avatar.unsetVar(name);
    } catch (err) {
      return VarControllerBase.fail(context, (err as Error).message, 'unset-failed');
    }
    VarControllerBase.send(context, Mml.fromMarkup(`\n${name} cleared.\n`));
  }
}
