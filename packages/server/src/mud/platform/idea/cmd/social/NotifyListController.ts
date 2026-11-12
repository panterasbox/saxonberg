/**
 * NotifyListController — `notify`: your rules, top = highest precedence. A bare `notify` is also how the settings card requests a fresh projection on mount (over {@link NotifyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { NotifyControllerBase, type NotifyModel } from "./NotifyControllerBase";

export default class NotifyListController extends NotifyControllerBase {
  async execute(_model: NotifyModel, context: CommandContext): Promise<void> {
    const me = this.hostOf(context);
    if (me === null) return;
    const host = me.host;
    const rules = host.effectiveNotifyRules();
    if (rules.length === 0) {
      this.send(context, Mml.fromMarkup(`\nNo notify rules.\n`));
      return;
    }
    const lines = ["Your notify rules (top = highest precedence):"];
    for (const r of rules) lines.push(`  ${NotifyListController.renderRuleLine(r)}`);
    this.send(context, Mml.fromMarkup(`\n${lines.join("\n")}\n`));
    // A bare `notify` is how the settings card requests a fresh
    // projection on mount — push the effective list back.
    this.pushProjection(host);
  }
}
