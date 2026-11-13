/**
 * VarSetController — `var set <name> <value>` — store a session variable
 * (over {@link VarControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { VarControllerBase, type VarModel } from './VarControllerBase';

export default class VarSetController extends VarControllerBase {
  execute(model: VarModel, context: CommandContext): void {
    const avatar = VarControllerBase.envHost(context);
    const name = model.name;
    const value = model.value;
    if (!name) return VarControllerBase.fail(context, 'name required', 'name-required');
    if (value === undefined) {
      return VarControllerBase.fail(context, 'value required', 'value-required');
    }
    try {
      avatar.setVar(name, value);
    } catch (err) {
      return VarControllerBase.fail(context, (err as Error).message, 'set-failed');
    }
    VarControllerBase.send(context, Mml.fromMarkup(`\n${name} = ${value}\n`));
  }
}
