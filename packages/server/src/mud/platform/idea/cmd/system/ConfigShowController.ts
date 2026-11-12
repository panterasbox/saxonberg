/**
 * ConfigShowController — `config <key>` — one setting's value (over
 * {@link ConfigControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { AppApi } from "../../../../api/app";
import { ConfigControllerBase, type ConfigModel } from "./ConfigControllerBase";

export default class ConfigShowController extends ConfigControllerBase {
  execute(model: ConfigModel, context: CommandContext): void {
    const key = model.key ?? "";
    ConfigControllerBase.send(context, Mml.fromMarkup(`\n${key} = ${AppApi.setting(key)}\n`));
  }
}
