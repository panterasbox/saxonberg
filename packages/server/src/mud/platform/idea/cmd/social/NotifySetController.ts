/**
 * NotifySetController — `notify set <ref> --login show …`: set fields on a rule from the typed options (over {@link NotifyControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { Mml } from "../../../../api/mml";
import {
  MAX_RULES,
  NotifyControllerBase,
  type NotifyModel,
} from "./NotifyControllerBase";

export default class NotifySetController extends NotifyControllerBase {
  async execute(model: NotifyModel, context: CommandContext): Promise<void> {
    const me = this.hostOf(context);
    if (me === null) return;
    const host = me.host;
    const rawRef = (model.ref ?? "").trim();
    // ⭐ `set` with no field is a question, not a no-op write: the bare
    // form used to SHOW, and a rule created with nothing set would be a
    // silent default row (controller-liquidity W7b).
    if (!NotifySetController.hasFieldOption(model)) {
      return this.fail(
        context,
        "Set which field? --login / --disconnect (show|silent), --message, " +
          "--render, --color, --boost / --no-boost.",
        "field-required",
      );
    }
    const ref = NotifySetController.normalizeRef(me.vid, rawRef);
    const parsed = NotifySetController.buildPatch(model);
    if (typeof parsed === "string") {
      return this.fail(context, parsed, "bad-option");
    }

    // Soft cap: only a genuinely NEW user-defined rule counts against it.
    const exists = host.notifyRules().some((r) => r.groupRef === ref);
    if (!exists && host.notifyRules().length >= MAX_RULES) {
      return this.fail(
        context,
        `You already have ${MAX_RULES} notify rules — remove one before ` +
          `adding another.`,
        "rule-cap",
      );
    }

    const result = host.setNotifyRule(ref, parsed);
    const verb = result.created ? "Set" : "Updated";
    this.send(
      context,
      Mml.fromMarkup(`\n${verb} rule for ${ref}.\n  ${NotifySetController.renderRuleLine(result.rule)}\n`),
    );
    this.pushProjection(host);
  }
}
