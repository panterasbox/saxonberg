/**
 * NotifyShowController — `notify show <ref>`: one rule (over {@link NotifyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { NotifyControllerBase, type NotifyModel } from "./NotifyControllerBase";

export default class NotifyShowController extends NotifyControllerBase {
  async execute(model: NotifyModel, context: CommandContext): Promise<void> {
    const me = this.hostOf(context);
    if (me === null) return;
    const rawRef = (model.ref ?? "").trim();
    const ref = NotifyShowController.normalizeRef(me.vid, rawRef);
    const rule = me.host.effectiveNotifyRules().find((r) => r.groupRef === ref);
    if (!rule) {
      this.send(context, Mml.fromMarkup(`\nNo rule for ${ref}.\n`));
      return;
    }
    this.send(context, Mml.fromMarkup(`\n${NotifyShowController.renderRuleLine(rule)}\n`));
  }
}
