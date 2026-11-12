/**
 * HelpApiController — `help api [<Type>[.<member>]]` — an api/mixin/type
 * topic, or the engine-surface landing (over {@link HelpControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { HelpApi } from "../../../../api/help";
import { StuffApi } from "../../../../api/stuff";
import { HelpControllerBase, type HelpModel } from "./HelpControllerBase";

export default class HelpApiController extends HelpControllerBase {
  async execute(model: HelpModel, context: CommandContext): Promise<void> {
    // The rulebook warms on first use (the scan sweep — not booted).
    await StuffApi.ready(HelpApi);
    const target = model.target;
    if (!target) {
      const lines: string[] = [
        "",
        "Engine surface — apis you call, mixins (capabilities) you compose,",
        "and the types they speak.",
        "",
      ];
      for (const kind of ["api", "mixin", "type"] as const) {
        const topics = HelpApi.listKind(kind).topics;
        if (topics.length === 0) continue;
        lines.push(`${kind} (${topics.length}):`);
        for (const t of topics.slice(0, 40)) {
          lines.push(`  ${t.title}`);
        }
        if (topics.length > 40) lines.push(`  … and ${topics.length - 40} more`);
        lines.push("");
      }
      if (lines.length <= 4) {
        lines.push("(api index unavailable — run `pnpm docs`.)", "");
      }
      lines.push('Type "help api <Type>" or "help api <Type>.<member>".', "");
      HelpControllerBase.tellText(context, lines.join("\n"));
      return;
    }
    const topic = HelpApi.apiTopic(target);
    if (!topic) {
      HelpControllerBase.tellText(context, `\nno api topic for '${target}'.\n`);
      context.note({
        kind: "controller-rejected",
        reason: "unknown-api-topic",
        detail: target,
      });
      return;
    }
    HelpControllerBase.renderTopic(topic, context);
  }
}
