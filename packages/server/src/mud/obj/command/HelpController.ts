/**
 * HelpController - Display help information for commands
 *
 * Syntax:
 * - help          - List all available commands
 * - help <command> - Show detailed help for specific command
 */

import { CommandController } from '../../lib/command/CommandController';
import type { CommandContext, CommandResult } from '../../lib/command/models';

/**
 * Input model for help command
 */
export interface HelpInput {
  command?: string; // Optional command name to get help for
}

/**
 * Output model for help command
 */
export interface HelpOutput {
  text: string;
}

/**
 * HelpController - Handles help requests
 */
export class HelpController extends CommandController<HelpInput, HelpOutput> {
  execute(input: HelpInput, context: CommandContext): CommandResult<HelpOutput> {
    if (input.command) {
      // Show help for specific command
      return this.showCommandHelp(input.command, context);
    } else {
      // List all available commands
      return this.listCommands(context);
    }
  }

  /**
   * List all available commands
   */
  private listCommands(context: CommandContext): CommandResult<HelpOutput> {
    // Get available commands from CommandGiverMixin
    const commands = context.avatar.getAvailableCommands();

    if (commands.length === 0) {
      return {
        success: true,
        output: {
          text: 'No commands available.',
        },
      };
    }

    // Sort commands alphabetically by primary verb
    const sortedCommands = commands.sort((a, b) => {
      const verbA = a.getPrimaryVerb();
      const verbB = b.getPrimaryVerb();
      return verbA.localeCompare(verbB);
    });

    // Build command list
    const lines = ['', 'Available commands:', ''];

    for (const cmd of sortedCommands) {
      const verb = cmd.getPrimaryVerb();
      const description = cmd.description || 'No description available';
      lines.push(`  ${verb.padEnd(15)} - ${description}`);
    }

    lines.push('');
    lines.push('Type "help <command>" for more information about a specific command.');
    lines.push('');

    return {
      success: true,
      output: {
        text: lines.join('\n'),
      },
    };
  }

  /**
   * Show detailed help for specific command
   */
  private showCommandHelp(commandName: string, context: CommandContext): CommandResult<HelpOutput> {
    // Get available commands
    const commands = context.avatar.getAvailableCommands();

    // Find command by verb or alias
    const command = commands.find((cmd) => {
      const verbs = cmd.verbs || [cmd.getPrimaryVerb()];
      return verbs.some((v) => v.toLowerCase() === commandName.toLowerCase());
    });

    if (!command) {
      return {
        success: false,
        error: `Unknown command: ${commandName}`,
      };
    }

    // Build help text
    const lines = ['', `Command: ${command.getPrimaryVerb()}`, ''];

    // Description
    if (command.description) {
      lines.push(`Description: ${command.description}`);
      lines.push('');
    }

    // Aliases
    const verbs = command.verbs || [command.getPrimaryVerb()];
    if (verbs.length > 1) {
      const aliases = verbs.slice(1).join(', ');
      lines.push(`Aliases: ${aliases}`);
      lines.push('');
    }

    // Usage
    const usage = command.getUsage();
    if (usage) {
      lines.push('Usage:');
      lines.push(`  ${usage}`);
      lines.push('');
    }

    // Help text (if available from getHelpText())
    const helpText = command.getHelpText();
    if (helpText) {
      lines.push(helpText);
      lines.push('');
    }

    return {
      success: true,
      output: {
        text: lines.join('\n'),
      },
    };
  }
}
