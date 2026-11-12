/**
 * VarListController — `var list` (and bare `var`) — every session
 * variable you have set (over {@link VarControllerBase}).
 */

import type { CommandContext } from '../../../../api/command';
import { Mml } from '../../../../api/mml';
import { VarControllerBase, type VarModel } from './VarControllerBase';

export default class VarListController extends VarControllerBase {
  execute(_model: VarModel, context: CommandContext): void {
    const avatar = VarControllerBase.envHost(context);
    const vars = avatar.listVars();
    const entries = Object.entries(vars);
    if (entries.length === 0) {
      VarControllerBase.send(context, Mml.compose`\nNo session variables.\n`);
      return;
    }
    const lines = ['', ...entries.map(([k, v]) => `  ${k} = ${v}`), ''];
    VarControllerBase.send(context, Mml.fromMarkup(lines.join('\n')));
  }
}
