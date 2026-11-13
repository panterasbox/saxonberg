/**
 * HelpControllerBase — what the `help` forms share (controller-liquidity
 * W7a, D13: one controller per subcommand over a base per noun; a bare
 * form that reads is its own controller): the in-game rulebook surface,
 * rendered off the boot-warmed help index through {@link HelpApi}.
 *
 *   - bare `help`            → landing: the verb categories + counts, then
 *                              the rest of the rulebook's kinds
 *   - `help <verb>`          → that command's topic (bare fallthrough)
 *   - `help <category>`      → the verbs of that category (D24)
 *   - `help <collection>`    → how the world stores that thing, and why
 *     (all four: `HelpTopicController`)
 *   - `help verb [name]`     → legacy verb form (still works) —
 *                              `HelpVerbController`
 *   - `help api [target]`    → api/mixin/type topic (real signature +
 *                              summary) — `HelpApiController`
 *   - `help search <q>`      → search, results grouped by kind —
 *                              `HelpSearchController`
 *
 * Every form reads through the index. Topic bodies arrive as valid MML
 * (the catalogue escapes them at assembly) and pass through verbatim; the
 * controllers' own chrome (landings, search lists, errors) is plain text,
 * escaped via `Mml.compose`. Emitted on the `shell.result` topic. The
 * base holds the landing, the topic render and the shell words.
 */

import { CommandController } from "../../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../../api/command";
import { MessageApi } from "../../../../api/message";
import { CardApi } from "../../../../api/card";
import { Mml } from "../../../../api/mml";
import { HelpApi } from "../../../../api/help";
import type { HelpTopic, HelpIndexResult } from "@saxonberg/types";

export interface HelpModel extends CommandModel {
  subcommand?: string;
  topic?: string;
  name?: string;
  target?: string;
  query?: string;
}

export abstract class HelpControllerBase extends CommandController<HelpModel> {
  /** The landing/index view — categories + counts + a hint line. */
  protected static showLanding(context: CommandContext): void {
    const index: HelpIndexResult = HelpApi.index();
    if (index.categories.length === 0) {
      HelpControllerBase.tellText(context, "\nNo help topics available.\n");
      return;
    }
    const lines: string[] = ["", "Help — the rulebook for how the world works.", ""];
    const verbs = HelpApi.commandCategories();
    if (verbs.length > 0) {
      lines.push("Verbs, by category:");
      for (const { category, count } of verbs) {
        lines.push(`  ${category.padEnd(12)} ${count}`);
      }
      lines.push("");
    }
    for (const cat of index.categories) {
      lines.push(`  ${cat.title.padEnd(12)} ${cat.count}`);
    }
    lines.push("");
    lines.push('Type "help <category>" to list its verbs, "help <verb>" for a command,');
    lines.push('"help api <Type>" for the engine surface, "help <collection>" for how');
    lines.push('the world stores something, or "help search <word>".');
    lines.push("");
    HelpControllerBase.tellText(context, lines.join("\n"));
  }

  /** Render a topic's MML body + its navigable relation links. */
  protected static renderTopic(topic: HelpTopic, context: CommandContext): void {
    // The body is already valid MML (escaped by the catalogue) — pass it
    // through verbatim; the "See also" chrome is plain text and is escaped
    // by `compose`.
    const body = Mml.fromMarkup(topic.body);
    let composed: Mml;
    if (topic.relations.length === 0) {
      composed = Mml.compose`\n${body}\n`;
    } else {
      const seeAlso: string[] = ["", "See also:"];
      for (const rel of topic.relations) {
        seeAlso.push(`  ${rel.kind}: ${rel.targetTitle}`);
      }
      composed = Mml.compose`\n${body}\n${seeAlso.join("\n")}\n`;
    }
    // Card first — `carded` must be a fact, not a promise. See
    // `MessageFrame.meta.carded`.
    const opened = CardApi.open(context, "help", {
      payload: { kind: "helpTopic", topic },
      prose: composed,
      // ⭐ Named by the TOPIC, not by "the rulebook".
      title: topic.title,
    });
    HelpControllerBase.tell(context, composed, opened);
    /*
     * ⭐ The card carries **the topic this read already resolved**, and
     * the prose it just emitted. The help card is the one Wave 7 surface
     * with no client-side existence today; the REST catalogue is what
     * fills its body, and this is what opens it.
     */
  }

  /** Escape a plain-text chrome block to MML and send it. */
  protected static tellText(context: CommandContext, text: string): void {
    HelpControllerBase.tell(context, Mml.compose`${text}`);
  }

  /**
   * `carded` says *this content is also on a card*, which is what
   * `shell.result` filters on. Only the topic read sets it — the
   * landing page, the verb list and the search results open no card,
   * so suppressing them would leave `help` doing nothing.
   */
  protected static tell(
    context: CommandContext,
    body: Mml,
    carded: string | null = null,
  ): void {
    const scene = MessageApi.scene(context.commandGiver).topic("shell.result");
    if (carded) scene.meta({ carded });
    scene.toSelf(body).send();
  }
}
