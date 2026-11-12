/**
 * NotifyRemoveController — `notify remove <ref>`: drop a rule; the group falls back to the default tail (over {@link NotifyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { NotifyControllerBase, type NotifyModel } from "./NotifyControllerBase";

export default class NotifyRemoveController extends NotifyControllerBase {
  async execute(model: NotifyModel, context: CommandContext): Promise<void> {
    const me = this.hostOf(context);
    if (me === null) return;
    const { host, vid } = me;
    const trimmed = (model.ref ?? "").trim();
    if (!trimmed) return this.fail(context, "Remove which rule?", "ref-required");
    const ref = NotifyRemoveController.normalizeRef(vid, trimmed);
    const removed = host.clearNotifyRule(ref);
    if (!removed) {
      this.send(context, Mml.fromMarkup(`\nNo rule for ${ref}.\n`));
      return;
    }
    this.send(
      context,
      Mml.fromMarkup(`\nRemoved rule for ${ref}; it falls back to the default.\n`),
    );
    this.pushProjection(host);
  }
}
