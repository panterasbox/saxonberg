/**
 * HelpSearchController — `help search <query>` — search results grouped
 * by kind (over {@link HelpControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { HelpApi } from "../../../../api/help";
import { StuffApi } from "../../../../api/stuff";
import type { HelpSearchResult } from "@saxonberg/types";
import { HelpControllerBase, type HelpModel } from "./HelpControllerBase";

export default class HelpSearchController extends HelpControllerBase {
  async execute(model: HelpModel, context: CommandContext): Promise<void> {
    const query = model.query ?? "";
    if (!query) {
      HelpControllerBase.tellText(context, "\nUsage: help search <query>\n");
      context.note({
        kind: "controller-rejected",
        reason: "missing-query",
        detail: "no query",
      });
      return;
    }
    const result: HelpSearchResult = HelpApi.search(query);
    if (result.groups.length === 0) {
      HelpControllerBase.tellText(context, `\nNo matches for '${query}'.\n`);
      return;
    }
    const lines: string[] = ["", `Matches for '${query}':`, ""];
    for (const group of result.groups) {
      lines.push(`${group.kind}:`);
      for (const hit of group.hits) {
        lines.push(`  ${hit.title.padEnd(20)} ${hit.summary}`);
      }
      lines.push("");
    }
    HelpControllerBase.tellText(context, lines.join("\n"));
  }
}
