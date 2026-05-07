/**
 * HelpController — display help information for commands.
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

interface HelpModel extends CommandModel {
  command?: string;
}

export class HelpController extends CommandController<HelpModel> {
  execute(model: HelpModel, context: CommandContext): CommandResult {
    const command = model.command;
    if (command) {
      return this.showCommandHelp(command, context);
    }
    return this.listCommands(context);
  }

  private listCommands(context: CommandContext): CommandResult {
    const commands = context.commandGiver.getAvailableCommands();
    if (commands.length === 0) {
      this.send(context, Mml.compose`\nNo commands available.\n`);
      return { success: true, summary: 'no commands' };
    }

    commands.sort((a, b) =>
      a.getPrimaryVerb().localeCompare(b.getPrimaryVerb())
    );

    const lines: string[] = ['', 'Available commands:', ''];
    for (const cmd of commands) {
      const verb = cmd.getPrimaryVerb();
      const description = cmd.description || 'No description available';
      lines.push(`  ${verb.padEnd(15)} - ${description}`);
    }
    lines.push('');
    lines.push('Type "help <command>" for more information.');
    lines.push('');

    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: `${commands.length} commands` };
  }

  private showCommandHelp(
    commandName: string,
    context: CommandContext
  ): CommandResult {
    const commands = context.commandGiver.getAvailableCommands();
    const command = commands.find((cmd) => {
      const verbs = cmd.verbs || [cmd.getPrimaryVerb()];
      return verbs.some((v) => v.toLowerCase() === commandName.toLowerCase());
    });

    if (!command) {
      return { success: false, summary: `unknown command: ${commandName}` };
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

    this.send(context, Mml.fromMarkup(lines.join('\n')));
    return { success: true, summary: command.getPrimaryVerb() };
  }

  private send(context: CommandContext, body: Mml): void {
    MessageApi.scene(context.commandGiver)
      .topic(MessageApi.Topics.world.perception.look)
      .toSelf(body)
      .send();
  }
}
