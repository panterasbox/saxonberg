/**
 * ConfigListController — `config` — every setting, blessed keys first,
 * a Tier C key marked with its seat (over {@link ConfigControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { AppApi } from "../../../../api/app";
import {
  ConfigControllerBase,
  KNOWN_KEYS,
  type ConfigModel,
} from "./ConfigControllerBase";

export default class ConfigListController extends ConfigControllerBase {
  execute(_model: ConfigModel, context: CommandContext): void {
    const all = AppApi.settings();
    // Blessed keys first, then ad-hoc, alphabetical within each.
    const keys = Object.keys(all).sort((a, b) => {
      const known = (k: string) => (KNOWN_KEYS.has(k) ? 0 : 1);
      return known(a) - known(b) || a.localeCompare(b);
    });
    const lines = [""];
    for (const k of keys) {
      // '*' flags an ad-hoc key (not a known setting); ' ' a blessed one.
      const marker = KNOWN_KEYS.has(k) ? " " : "*";
      const tier = AppApi.tierOf(k);
      const seat = tier.startsWith("C:") ? tier.slice(2) : null;
      lines.push(`  ${marker} ${k} = ${all[k]}${seat ? `  [C: ${seat}]` : ""}`);
    }
    lines.push("");
    ConfigControllerBase.send(context, Mml.fromMarkup(lines.join("\n")));
  }
}
