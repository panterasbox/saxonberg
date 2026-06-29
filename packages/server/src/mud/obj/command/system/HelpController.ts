/**
 * HelpController — the in-game rulebook surface, rendered off the
 * boot-warmed help index through {@link HelpApi}.
 *
 *   - bare `help`            → landing/index (categories + counts)
 *   - `help <verb>`          → that command's topic (bare fallthrough)
 *   - `help verb [name]`     → legacy verb form (still works)
 *   - `help api [target]`    → api/mixin/type topic (real signature + summary)
 *   - `help search <q>`      → search, results grouped by kind
 *
 * Every form reads through the index; topic bodies are already MML markup
 * (the rulebook entry). Emitted on the existing `system.shell.help` topic.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { Mml } from "../../../api/mml";
import { HelpApi } from "../../../api/help";
import type {
  HelpTopic,
  HelpIndexResult,
  HelpSearchResult,
} from "@saxonberg/types";

interface HelpModel extends CommandModel {
  subcommand?: string;
  topic?: string;
  name?: string;
  target?: string;
  query?: string;
}

export default class HelpController extends CommandController<HelpModel> {
  execute(model: HelpModel, context: CommandContext): void {
    switch (model.subcommand) {
      case "verb":
        return model.name
          ? this.showCommand(model.name, context)
          : this.showLanding(context);
      case "api":
        return this.showApi(model.target, context);
      case "search":
        return this.showSearch(model.query ?? "", context);
      default:
        // Bare `help` or fallthrough `help <verb>`.
        return model.topic
          ? this.showCommand(model.topic, context)
          : this.showLanding(context);
    }
  }

  /** The landing/index view — categories + counts + a hint line. */
  private showLanding(context: CommandContext): void {
    const index: HelpIndexResult = HelpApi.index();
    if (index.categories.length === 0) {
      this.tell(context, Mml.fromMarkup("\nNo help topics available.\n"));
      return;
    }
    const lines: string[] = ["", "Help — the rulebook for how the world works.", ""];
    for (const cat of index.categories) {
      lines.push(`  ${cat.title.padEnd(12)} ${cat.count}`);
    }
    lines.push("");
    lines.push('Type "help <verb>" for a command, "help api <Type>" for the');
    lines.push('engine surface, or "help search <word>".');
    lines.push("");
    this.tell(context, Mml.fromMarkup(lines.join("\n")));
  }

  /** Render one command topic by verb / alias. */
  private showCommand(verb: string, context: CommandContext): void {
    const topic = HelpApi.commandTopic(verb);
    if (!topic) {
      this.tell(context, Mml.fromMarkup(`\nunknown command: ${verb}\n`));
      context.note({
        kind: "controller-rejected",
        reason: "unknown-command",
        detail: verb,
      });
      return;
    }
    this.renderTopic(topic, context);
  }

  /** Render an api/mixin/type topic, or the api-kind landing. */
  private showApi(target: string | undefined, context: CommandContext): void {
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
      this.tell(context, Mml.fromMarkup(lines.join("\n")));
      return;
    }
    const topic = HelpApi.apiTopic(target);
    if (!topic) {
      this.tell(
        context,
        Mml.fromMarkup(`\nno api topic for '${target}'.\n`)
      );
      context.note({
        kind: "controller-rejected",
        reason: "unknown-api-topic",
        detail: target,
      });
      return;
    }
    this.renderTopic(topic, context);
  }

  /** Render search results grouped by kind. */
  private showSearch(query: string, context: CommandContext): void {
    if (!query) {
      this.tell(context, Mml.fromMarkup("\nUsage: help search <query>\n"));
      context.note({
        kind: "controller-rejected",
        reason: "missing-query",
        detail: "no query",
      });
      return;
    }
    const result: HelpSearchResult = HelpApi.search(query);
    if (result.groups.length === 0) {
      this.tell(context, Mml.fromMarkup(`\nNo matches for '${query}'.\n`));
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
    this.tell(context, Mml.fromMarkup(lines.join("\n")));
  }

  /** Render a topic's MML body + its navigable relation links. */
  private renderTopic(topic: HelpTopic, context: CommandContext): void {
    const lines: string[] = ["", topic.body];
    if (topic.relations.length > 0) {
      lines.push("", "See also:");
      for (const rel of topic.relations) {
        lines.push(`  ${rel.kind}: ${rel.targetTitle}`);
      }
    }
    lines.push("");
    this.tell(context, Mml.fromMarkup(lines.join("\n")));
  }

  private tell(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic("system.shell.help")
      .toSelf(body)
      .send();
  }
}
