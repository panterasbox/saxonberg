/**
 * NotifyMoveController — `notify move <ref> --above|--below <other>`: reorder a rule (order = precedence) (over {@link NotifyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import { NotifyControllerBase, type NotifyModel } from "./NotifyControllerBase";

export default class NotifyMoveController extends NotifyControllerBase {
  async execute(model: NotifyModel, context: CommandContext): Promise<void> {
    const me = this.hostOf(context);
    if (me === null) return;
    const { host } = me;
    const rawRef = (model.ref ?? "").trim();
    if (!rawRef) {
      return this.fail(context, "Which rule to reorder?", "ref-required");
    }
    const where: "above" | "below" = model.above ? "above" : "below";
    const anchorRaw = (model.above ?? model.below ?? "").trim();
    if (!anchorRaw) {
      return this.fail(context, "Reorder relative to which rule?", "anchor-required");
    }
    const ref = this.refOrFail(context, rawRef);
    if (ref === null) return;
    const anchor = this.refOrFail(context, anchorRaw);
    if (anchor === null) return;
    if (ref === anchor) {
      return this.fail(context, "A rule can't be reordered against itself.", "self-anchor");
    }
    const ok = host.moveNotifyRule(ref, anchor, where);
    if (!ok) {
      return this.fail(context, `Couldn't reorder ${rawRef}.`, "reorder-failed");
    }
    this.send(context, Mml.fromMarkup(`\nMoved ${rawRef} ${where} ${anchorRaw}.\n`));
    this.pushProjection(host);
  }
}
