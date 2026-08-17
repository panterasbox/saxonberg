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
 * Every form reads through the index. Topic bodies arrive as valid MML
 * (the catalogue escapes them at assembly) and pass through verbatim; this
 * controller's own chrome (landings, search lists, errors) is plain text,
 * escaped via `Mml.compose`. Emitted on the `shell.result` topic.
 */

import { CommandController } from "../../../lib/command/CommandController";
import type { CommandContext, CommandModel } from "../../../api/command";
import { MessageApi } from "../../../api/message";
import { CardApi } from "../../../api/card";
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
      this.tellText(context, "\nNo help topics available.\n");
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
    this.tellText(context, lines.join("\n"));
  }

  /** Render one command topic by verb / alias. */
  private showCommand(verb: string, context: CommandContext): void {
    const topic = HelpApi.commandTopic(verb);
    if (!topic) {
      this.tellText(context, `\nunknown command: ${verb}\n`);
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
      this.tellText(context, lines.join("\n"));
      return;
    }
    const topic = HelpApi.apiTopic(target);
    if (!topic) {
      this.tellText(context, `\nno api topic for '${target}'.\n`);
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
      this.tellText(context, "\nUsage: help search <query>\n");
      context.note({
        kind: "controller-rejected",
        reason: "missing-query",
        detail: "no query",
      });
      return;
    }
    const result: HelpSearchResult = HelpApi.search(query);
    if (result.groups.length === 0) {
      this.tellText(context, `\nNo matches for '${query}'.\n`);
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
    this.tellText(context, lines.join("\n"));
  }

  /** Render a topic's MML body + its navigable relation links. */
  private renderTopic(topic: HelpTopic, context: CommandContext): void {
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
    this.tell(context, composed, opened);
    /*
     * ⭐ The card carries **the topic this read already resolved**, and
     * the prose it just emitted. The help card is the one Wave 7 surface
     * with no client-side existence today; the REST catalogue is what
     * fills its body, and this is what opens it.
     */
  }

  /** Escape a plain-text chrome block to MML and send it. */
  private tellText(context: CommandContext, text: string): void {
    this.tell(context, Mml.compose`${text}`);
  }

  /**
   * `carded` says *this content is also on a card*, which is what
   * `shell.result` filters on. Only the topic read sets it — the
   * landing page, the verb list and the search results open no card,
   * so suppressing them would leave `help` doing nothing.
   */
  private tell(
    context: CommandContext,
    body: Mml,
    carded: string | null = null,
  ): void {
    const scene = MessageApi.scene(context.commandGiver).topic("shell.result");
    if (carded) scene.meta({ carded });
    scene.toSelf(body).send();
  }
}
