/**
 * HelpController — subcommand-shaped help surface.
 *
 *   - bare `help`         → list verbs
 *   - `help verb [name]`  → verb help (no name → list verbs)
 *   - `help api [target]` → api signature browser (Type or Type.member)
 *   - `help search <q>`   → full-text search
 *
 * The api-reference index is best filled from JSDoc-derived JSON; v1
 * ships a placeholder that points players at the source until the
 * docs build pipeline lands.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

interface HelpModel extends CommandModel {
  subcommand?: string;
  name?: string;
  target?: string;
  query?: string;
}

export class HelpController extends CommandController<HelpModel> {
  execute(model: HelpModel, context: CommandContext): void {
    switch (model.subcommand) {
      case 'verb':
        return model.name
          ? this.showVerbHelp(model.name, context)
          : this.listCommands(context);
      case 'api':
        return this.showApiHelp(model.target, context);
      case 'search':
        return this.showSearchResults(model.query ?? '', context);
      default:
        // Bare `help` — `model.subcommand === undefined`.
        return this.listCommands(context);
    }
  }

  private listCommands(context: CommandContext): void {
    const commands = context.commandGiver.getAvailableCommands();
    if (commands.length === 0) {
      this.tell(context, Mml.compose`\nNo commands available.\n`);
      return;
    }
    commands.sort((a, b) =>
      a.getPrimaryVerb().localeCompare(b.getPrimaryVerb()),
    );
    const lines: string[] = ['', 'Available commands:', ''];
    for (const cmd of commands) {
      const verb = cmd.getPrimaryVerb();
      const description = cmd.description || 'No description available';
      lines.push(`  ${verb.padEnd(15)} - ${description}`);
    }
    lines.push('');
    lines.push('Type "help verb <command>" for verb-specific help, or');
    lines.push('"help api <Type>" for api docs, or "help search <q>".');
    lines.push('');
    this.tell(context, Mml.fromMarkup(lines.join('\n')));
    return;
  }

  private showVerbHelp(
    commandName: string,
    context: CommandContext,
  ): void {
    const commands = context.commandGiver.getAvailableCommands();
    const command = commands.find((cmd) => {
      const verbs = cmd.verbs || [cmd.getPrimaryVerb()];
      return verbs.some((v) => v.toLowerCase() === commandName.toLowerCase());
    });
    if (!command) {
      this.tell(context, Mml.fromMarkup(`\nunknown command: ${commandName}\n`));
      context.note({
        kind: 'controller-rejected',
        reason: 'unknown-command',
        detail: commandName,
      });
      return;
    }
    const lines: string[] = ['', `Command: ${command.getPrimaryVerb()}`, ''];
    if (command.description) {
      lines.push(`Description: ${command.description}`);
      lines.push('');
    }
    const verbs = command.verbs || [command.getPrimaryVerb()];
    if (verbs.length > 1) {
      lines.push(`Aliases: ${verbs.slice(1).join(', ')}`);
      lines.push('');
    }
    const usage = command.getUsage();
    if (usage) {
      lines.push('Usage:');
      lines.push(`  ${usage}`);
      lines.push('');
    }
    const helpText = command.getHelpText();
    if (helpText) {
      lines.push(helpText);
      lines.push('');
    }
    this.tell(context, Mml.fromMarkup(lines.join('\n')));
    return;
  }

  private showApiHelp(
    target: string | undefined,
    context: CommandContext,
  ): void {
    if (!target) {
      this.tell(
        context,
        Mml.fromMarkup(
          `\nUsage: help api <Type>  or  help api <Type>.<member>\n\n` +
            `(api index pipeline pending — see docs/subsystems/ for now)\n`,
        ),
      );
      return;
    }
    // v1 placeholder: the JSDoc-derived JSON index is a follow-on
    // landing; once it ships this branch reads from
    // `api/help-index.ts` and renders signatures + descriptions.
    this.tell(
      context,
      Mml.fromMarkup(
        `\nApi reference for '${target}' is not yet indexed.\n` +
          `Browse the source under packages/server/src/mud/api/ for now.\n`,
      ),
    );
    return;
  }

  private showSearchResults(
    query: string,
    context: CommandContext,
  ): void {
    if (!query) {
      this.tell(context, Mml.fromMarkup(`\nUsage: help search <query>\n`));
      context.note({
        kind: 'controller-rejected',
        reason: 'missing-query',
        detail: 'no query',
      });
      return;
    }
    const needle = query.toLowerCase();
    const commands = context.commandGiver.getAvailableCommands();
    const hits = commands.filter((cmd) => {
      const blob = `${cmd.getPrimaryVerb()} ${cmd.description ?? ''}`;
      return blob.toLowerCase().includes(needle);
    });
    if (hits.length === 0) {
      this.tell(context, Mml.fromMarkup(`\nNo matches for '${query}'.\n`));
      return;
    }
    const lines: string[] = ['', `Matches for '${query}':`, ''];
    for (const cmd of hits) {
      lines.push(
        `  ${cmd.getPrimaryVerb().padEnd(15)} - ${cmd.description ?? ''}`,
      );
    }
    lines.push('');
    this.tell(context, Mml.fromMarkup(lines.join('\n')));
    return;
  }

  private tell(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.help')
      .toSelf(body)
      .send();
  }
}
