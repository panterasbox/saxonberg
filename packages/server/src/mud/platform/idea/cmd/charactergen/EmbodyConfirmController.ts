/**
 * EmbodyConfirmController — `embody confirm`: commit the draft
 * (controller-liquidity W7c, rung 4 — the commit is a different act from
 * editing the draft, so it is its own stanza with its own controller).
 *
 * Gates on nothing-missing — re-emitting the draft with what is still to
 * choose — then runs the atomic commit the editing controller owns
 * (`EmbodyController.commit`: clone + dress the Avatar, register
 * ownership, hand off). It extends that controller for the draft, the
 * config and the commit; it adds no rule of its own.
 */

import type { CommandContext } from "../../../../api/command";
import EmbodyController, { type EmbodyModel } from "./EmbodyController";

export default class EmbodyConfirmController extends EmbodyController {
  override async execute(_model: EmbodyModel, context: CommandContext): Promise<void> {
    const { login, draft, cfg } = await this.prepare(context);
    const missing = this.missingOf(draft, cfg);
    if (missing.length) {
      this.emitState(login, draft, cfg, {
        field: missing[0]!,
        message: `Still to choose: ${missing.join(", ")}.`,
      });
      context.note({
        kind: "controller-rejected",
        reason: "embody-incomplete",
        detail: missing.join(","),
      });
      return;
    }
    // Atomic commit + hand off; commit fires its own final frames, so no
    // state frame here.
    await this.commit(draft, cfg);
  }
}
