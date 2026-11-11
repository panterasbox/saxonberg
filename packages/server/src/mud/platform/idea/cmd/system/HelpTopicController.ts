/**
 * HelpTopicController — bare `help` and `help <word>` — the landing, or
 * the topic a word names (over {@link HelpControllerBase}).
 */

import type { CommandContext } from "../../../../api/command";
import { HelpApi } from "../../../../api/help";
import { StuffApi } from "../../../../api/stuff";
import type { HelpIndexEntry } from "@saxonberg/types";
import { HelpControllerBase, type HelpModel } from "./HelpControllerBase";

export default class HelpTopicController extends HelpControllerBase {
  async execute(model: HelpModel, context: CommandContext): Promise<void> {
    // The rulebook warms on first use (the scan sweep — not booted).
    await StuffApi.ready(HelpApi);
    return model.topic
      ? HelpTopicController.showFallthrough(model.topic, context)
      : HelpControllerBase.showLanding(context);
  }

  /**
   * Bare `help <word>` — a verb first, then a verb category, then a
   * concept, a collection, and the engine surface.
   *
   * The order is what a player means by the word: a verb is what most
   * people are asking about, then a concept (`extraction`, `nitrogen` —
   * the rulebook's own words), and a collection name (`bank_ledger`)
   * cannot collide with either. `help verb <name>` stays strict — asking for a verb
   * by that name should say the verb does not exist, not wander off into
   * the persistence layer.
   */
  private static showFallthrough(target: string, context: CommandContext): void {
    // A concept (`help extraction`) sits after the verb and before the
    // collection: a rulebook word a player asks about is more often a
    // concept than a table, and a concept key cannot collide with a verb.
    const verb = HelpApi.commandTopic(target);
    if (!verb) {
      const inCategory = HelpApi.commandCategory(target);
      if (inCategory) return HelpTopicController.showCategory(target, inCategory, context);
    }
    const topic =
      verb ??
      HelpApi.conceptTopic(target) ??
      HelpApi.collectionTopic(target) ??
      HelpApi.apiTopic(target);
    if (!topic) {
      HelpControllerBase.tellText(context, `\nno help topic for '${target}'.\n`);
      context.note({
        kind: "controller-rejected",
        reason: "unknown-topic",
        detail: target,
      });
      return;
    }
    HelpControllerBase.renderTopic(topic, context);
  }

  /** `help <category>` — that category's verbs, one line each. */
  private static showCategory(
    category: string,
    entries: readonly HelpIndexEntry[],
    context: CommandContext,
  ): void {
    const lines = ["", `${category.toLowerCase()}:`, ""];
    for (const e of entries) lines.push(`  ${e.title.padEnd(14)} ${e.summary}`);
    lines.push("");
    HelpControllerBase.tellText(context, lines.join("\n"));
  }
}
