/**
 * CommandGiverMixin - Enables command execution for characters
 *
 * Applied to Character class (not Avatar directly) so NPCs can eventually execute commands.
 *
 * Provides:
 * - getAvailableCommands() - Discover commands from self, inventory, environment
 * - executeCommand() - Full command execution pipeline
 *
 * Pipeline: Parse → Match → Resolve → Validate → Execute
 */

import type { MixinConstructor } from '../mixin-types';
import type { Stuff } from '../stuff/Stuff';
import { CommandLineApi } from '../../api/command-line';
import {
  CommandApi,
  type CommandContext,
  type CommandResult,
  type FieldDefinition,
} from '../../api/command';
import { MqlApi } from '../../api/mql';
import { MixinApi } from '../../api/mixin';
import { ContainmentApi } from '../../api/containment';
import { CommandDefinition } from './CommandDefinition';
import type { CommandProviderRegistry } from './ICommandProvider';
import { getValidator } from './validators';
import { ExecutionContext, FrameKind } from '../security/ExecutionContext';

type CommandProviderHolder = { commandProvider?: CommandProviderRegistry };

/** Extract the `commandProvider` static off any class-like value, if present. */
const getProvider = (cls: unknown): CommandProviderRegistry | undefined =>
  (cls as CommandProviderHolder).commandProvider;

/**
 * Public shape provided by CommandGiverMixin.
 */
export interface CommandGiver {
  getAvailableCommands(): CommandDefinition[];
  executeCommand(commandText: string, context: CommandContext): Promise<CommandResult>;
}

/**
 * Mixin that adds command execution capabilities.
 *
 * Constraint rationale: Base must be Stuff (we need `.constructor` for mixin
 * introspection and `stuffId` identity), but deliberately NOT Container or
 * Containable — mixin composition should stay flexible. A disembodied command
 * executor with no inventory and no environment is a coherent future case.
 * Inventory / environment / colocated branches narrow at runtime instead.
 */
export function CommandGiverMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class CommandGiver extends Base {
    // Mixin marker for detection by MixinApi
    static _mixinName = 'CommandGiverMixin';

    /**
     * Get available commands from all CommandProviders
     *
     * Discovers commands from:
     * 1. Self (mixins on this object)
     * 2. Inventory items (objects I'm carrying)
     * 3. Environment (objects in my location)
     * 4. Colocated objects (other characters in my location)
     *
     * CommandProviders declare YAML filenames, which are resolved to
     * CommandDefinition objects via CommandApi.
     *
     * @returns Array of available command definitions
     */
    getAvailableCommands(): CommandDefinition[] {
      const commands: CommandDefinition[] = [];
      const seen = new Set<string>(); // Track by primary verb to avoid duplicates

      // Helper to resolve and add command if not already seen
      const addCommand = (filename: string) => {
        const cmd = CommandApi.getCommand(filename);
        if (!cmd) {
          console.warn(`CommandGiver: Failed to load command ${filename}`);
          return;
        }

        const verb = cmd.getPrimaryVerb();
        if (!seen.has(verb)) {
          seen.add(verb);
          commands.push(cmd);
        }
      };

      // Base is constrained to MixinConstructor<Stuff>, so at runtime `this`
      // is always a Stuff. TypeScript can't derive that through the generic
      // mixin pattern (`this` is typed as the mixin class alone), so we
      // assert it once for the type-predicate calls below.
      const self = this as this & Stuff;

      // 1. Commands from mixins on SELF (always applicable)
      const selfMixins = MixinApi.queryMixins(self.constructor);
      for (const mixin of selfMixins) {
        getProvider(mixin)?.self?.forEach(addCommand);
      }
      // Class itself may carry a commandProvider (e.g. Avatar)
      getProvider(self.constructor)?.self?.forEach(addCommand);

      // 2. Commands from objects in INVENTORY — only if this giver has one
      if (MixinApi.isContainer(self)) {
        const inventory = ContainmentApi.getContents(self);
        for (const obj of inventory) {
          for (const mixin of MixinApi.queryMixins(obj.constructor)) {
            getProvider(mixin)?.inventory?.forEach(addCommand);
          }
        }
      }

      // 3 + 4. Commands from ENVIRONMENT and COLOCATED objects — only if
      // this giver is placed somewhere
      if (MixinApi.isContainable(self)) {
        const environment = self.getEnvironment();
        if (environment) {
          const envContents = ContainmentApi.getContents(environment);
          for (const obj of envContents) {
            if (obj === self) continue;
            for (const mixin of MixinApi.queryMixins(obj.constructor)) {
              getProvider(mixin)?.environment?.forEach(addCommand);
            }
          }
          for (const obj of envContents) {
            if (obj === self) continue;
            if (!MixinApi.isCommandGiver(obj)) continue;
            for (const mixin of MixinApi.queryMixins(obj.constructor)) {
              getProvider(mixin)?.colocated?.forEach(addCommand);
            }
          }
        }
      }

      return commands;
    }

    /**
     * Execute command from text string
     *
     * Full pipeline: Parse → Discover → Match → Resolve → Validate → Execute
     *
     * @param commandText - Command string to execute
     * @param context - Command execution context
     * @returns Command result
     */
    async executeCommand(commandText: string, context: CommandContext): Promise<CommandResult> {
      // The proxy already pushed a frame for this call when
      // `executeCommand` was invoked. Tag it as the command-issuer
      // frame so `ExecutionContext.getCurrentCommandGiver()` can find
      // it without string-matching method names.
      ExecutionContext.tagCurrentFrame(FrameKind.Command);

      try {
        // 1. Parse command text
        const parsed = CommandLineApi.parse(commandText);

        if (!parsed.verb) {
          return {
            success: false,
            error: 'No command entered',
          };
        }

        // 2. Ensure commands are loaded (populates cache)
        // This discovers and loads all available commands from providers
        this.getAvailableCommands();

        // 3. Match verb to command definition
        const command = CommandApi.matchVerb(parsed.verb);

        if (!command) {
          return {
            success: false,
            error: `Unknown command: ${parsed.verb}`,
          };
        }

        // 4. Handle subcommands or regular syntax
        if (command.hasSubcommands()) {
          return await this.executeSubcommand(command, parsed.args, parsed.options, context);
        } else {
          return await this.executeSyntax(command, parsed.args, parsed.options, context);
        }
      } catch (error: unknown) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Command execution failed',
        };
      }
    }

    /**
     * Execute command with subcommands
     */
    private async executeSubcommand(
      command: CommandDefinition,
      args: string[],
      options: Map<string, boolean>,
      context: CommandContext
    ): Promise<CommandResult> {
      // First arg is subcommand name
      if (args.length === 0) {
        return {
          success: false,
          error: `${command.getPrimaryVerb()} requires a subcommand. Use: ${command.getUsage()}`,
        };
      }

      const subcommandName = args[0] || '';
      const subcommandArgs = args.slice(1);

      const subcommand = command.getSubcommand(subcommandName);
      if (!subcommand) {
        const available = command.getSubcommandNames().join(', ');
        return {
          success: false,
          error: `Unknown subcommand '${subcommandName}'. Available: ${available}`,
        };
      }

      // Match subcommand pattern and extract fields
      const fields = this.matchPattern(
        subcommand.pattern || '',
        subcommandArgs,
        subcommand.fields || {}
      );

      if (!fields) {
        return {
          success: false,
          error: `Invalid syntax. Use: ${command.getPrimaryVerb()} ${subcommandName} ${subcommand.pattern}`,
        };
      }

      // Add subcommand to fields
      fields.subcommand = subcommandName;

      // Resolve and validate fields
      return await this.resolveValidateExecute(command, fields, options, context);
    }

    /**
     * Execute command with regular syntax patterns
     */
    private async executeSyntax(
      command: CommandDefinition,
      args: string[],
      options: Map<string, boolean>,
      context: CommandContext
    ): Promise<CommandResult> {
      // Try each syntax pattern in order
      for (const syntax of command.syntax) {
        const fields = this.matchPattern(syntax.pattern, args, syntax.fields || {});

        if (fields) {
          // Resolve and validate fields
          return await this.resolveValidateExecute(command, fields, options, context);
        }
      }

      // No syntax matched
      return {
        success: false,
        error: `Invalid syntax. Use: ${command.getUsage()}`,
      };
    }

    /**
     * Match args against a pattern and extract fields
     *
     * Pattern syntax:
     * - `<field>` - Required field
     * - `[field]` - Optional field
     * - `<field...>` - Remaining tokens (consumes all)
     *
     * @param pattern - Syntax pattern string
     * @param args - Tokenized arguments
     * @param fieldDefs - Field definitions
     * @returns Extracted field values or null if no match
     */
    private matchPattern(
      pattern: string,
      args: string[],
      fieldDefs: Record<string, FieldDefinition>
    ): Record<string, unknown> | null {
      const fields: Record<string, unknown> = {};

      // Empty pattern matches empty args
      if (!pattern || pattern.trim() === '') {
        return args.length === 0 ? fields : null;
      }

      // Parse pattern tokens
      const patternRegex = /(<[^>]+>|\[[^\]]+\])/g;
      const patternTokens: Array<{ name: string; required: boolean; remaining: boolean }> = [];
      let match;

      while ((match = patternRegex.exec(pattern)) !== null) {
        const token = match[0];
        const required = token.startsWith('<');
        const name = token.slice(1, -1);
        const remaining = name.endsWith('...');

        patternTokens.push({
          name: remaining ? name.slice(0, -3) : name,
          required,
          remaining,
        });
      }

      // Match args against pattern tokens
      let argIndex = 0;

      for (const token of patternTokens) {
        const fieldDef = fieldDefs[token.name] || {};

        if (token.remaining) {
          // Consume all remaining args
          if (token.required && argIndex >= args.length) {
            return null; // Required remaining field but no args left
          }
          fields[token.name] = args.slice(argIndex).join(' ');
          break;
        } else if (token.required) {
          // Required field
          if (argIndex >= args.length) {
            return null; // Not enough args
          }
          fields[token.name] = args[argIndex];
          argIndex++;
        } else {
          // Optional field
          if (argIndex < args.length) {
            fields[token.name] = args[argIndex];
            argIndex++;
          } else if (fieldDef.default !== undefined) {
            fields[token.name] = fieldDef.default;
          }
        }
      }

      return fields;
    }

    /**
     * Resolve, validate, and execute command
     */
    private async resolveValidateExecute(
      command: CommandDefinition,
      fields: Record<string, unknown>,
      options: Map<string, boolean>,
      context: CommandContext
    ): Promise<CommandResult> {
      // Get field definitions (from syntax or subcommand)
      let fieldDefs: Record<string, FieldDefinition> = {};

      if (fields.subcommand && typeof fields.subcommand === 'string') {
        const subcommand = command.getSubcommand(fields.subcommand);
        fieldDefs = subcommand?.fields || {};
      } else if (command.syntax.length > 0) {
        // Find matching syntax (we already matched, so just use first for now)
        // TODO: Store which syntax matched and use its field defs
        fieldDefs = command.syntax[0]?.fields || {};
      }

      // Resolve object fields using MQL
      for (const [fieldName, fieldDef] of Object.entries(fieldDefs)) {
        const raw = fields[fieldName];
        if (fieldDef.type === 'object' && typeof raw === 'string' && raw.length > 0) {
          const query = raw;

          if (fieldDef.multiple) {
            // Resolve multiple objects
            const objects = MqlApi.resolveMany(query, {
              commandGiver: context.commandGiver,
              location: context.location,
            });

            if (objects.length === 0) {
              return {
                success: false,
                error: `You don't see any '${query}' here`,
              };
            }

            fields[fieldName] = objects;
          } else {
            // Resolve single object
            const obj = MqlApi.resolve(query, {
              commandGiver: context.commandGiver,
              location: context.location,
            });

            if (!obj) {
              return {
                success: false,
                error: `You don't see any '${query}' here`,
              };
            }

            fields[fieldName] = obj;
          }
        }
      }

      // Validate fields
      for (const [fieldName, fieldDef] of Object.entries(fieldDefs)) {
        if (fieldDef.validators) {
          for (const validatorName of fieldDef.validators) {
            const validator = getValidator(validatorName);
            if (validator) {
              const error = validator(fields[fieldName], fieldName, context);
              if (error) {
                return {
                  success: false,
                  error,
                };
              }
            }
          }
        }
      }

      // Convert options Map to plain object
      const optionsObj: Record<string, boolean> = {};
      options.forEach((value, key) => {
        optionsObj[key] = value;
      });

      // Execute controller
      return await this.executeController(command, fields, optionsObj, context);
    }

    /**
     * Instantiate and execute controller
     */
    private async executeController(
      command: CommandDefinition,
      fields: Record<string, unknown>,
      options: Record<string, boolean>,
      context: CommandContext
    ): Promise<CommandResult> {
      try {
        // Dynamic import of controller
        const controllerPath = `../../obj/command/${command.controller}`;
        const controllerModule = await import(controllerPath);

        const ControllerClass = controllerModule[command.controller];
        if (!ControllerClass) {
          throw new Error(`Controller class ${command.controller} not found in module`);
        }

        // Instantiate controller
        const controller = new ControllerClass();

        // Execute
        const result = controller.execute(fields, context);

        return result;
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: `Failed to execute command: ${message}`,
        };
      }
    }
  };
}
