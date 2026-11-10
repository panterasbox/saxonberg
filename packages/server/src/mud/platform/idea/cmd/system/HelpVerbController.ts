/**
 * HelpVerbController — `help verb [<name>]` — one command's topic by verb
 * or alias, strictly (no name → the landing) (over {@link
 * HelpControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { HelpApi } from "../../../../api/help";
import { HelpControllerBase, type HelpModel } from "./HelpControllerBase";

export default class HelpVerbController extends HelpControllerBase {
  async execute(model: HelpModel, context: CommandContext): Promise<void> {
    // The rulebook warms on first use (the scan sweep — not booted).
    await HelpApi.ready();
    if (!model.name) return HelpControllerBase.showLanding(context);
    const verb = model.name;
    const topic = HelpApi.commandTopic(verb);
    if (!topic) {
      HelpControllerBase.tellText(context, `\nunknown command: ${verb}\n`);
      context.note({
        kind: "controller-rejected",
        reason: "unknown-command",
        detail: verb,
      });
      return;
    }
    HelpControllerBase.renderTopic(topic, context);
  }
}
