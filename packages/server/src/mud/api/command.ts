/**
 * CommandApi - Command framework types and definition cache.
 *
 * Owns the public type surface for the command pipeline (View → Model →
 * Controller) and caches parsed CommandDefinitions. The static methods are a
 * plain verb/filename cache — all commands come from CommandProviders
 * (mixins, objects) in various contexts (self, environment, inventory,
 * colocated), there is no "global" command registry.
 *
 * Type surface lives here deliberately: controllers and MQL consumers
 * depend on this file to get `CommandContext`, `CommandResult`, etc., and
 * the view/model/field shapes that describe YAML-declared commands.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Location } from '../lib/stuff/Location';
import type { CommandGiver } from '../lib/command/CommandGiver';
import type { Interactive } from '../obj/Interactive';
import { CommandDefinition } from '../lib/command/CommandDefinition';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { decorateApiClass } from '../lib/security/decorators';

/**
 * Command execution context - read-only reference holder.
 *
 * `commandGiver` is the thing executing the command, typed as the general
 * `Stuff & CommandGiver` rather than any specific subclass (e.g. Avatar).
 * Controllers narrow with `MixinApi.isX()` predicates or cast to a known
 * concrete type (Character, Avatar) when they need class-specific surface.
 *
 * `interactive` carries the connection/session that originated the command.
 * Cascaded / indirect commands may null this out in the future; today every
 * path sets it.
 */
export interface CommandContext {
  commandGiver: Stuff & CommandGiver;
  interactive: Interactive;
  location: Location;
  commandText: string;
  executionId: string;
}

/**
 * Command execution result.
 *
 * Generic result type with typed output:
 * - success: Whether command completed successfully
 * - output: Command-specific output data (if successful)
 * - error: Error message (if failed)
 */
export interface CommandResult<T = unknown> {
  success: boolean;
  output?: T;
  error?: string;
}

/**
 * Resolved field values (field name → field value).
 *
 * Values are `unknown` because they can be resolved game objects (Stuff),
 * primitives, or arrays (for multi-object selection).
 */
export type ModelData = Record<string, unknown>;

/**
 * Command Model — resolved data passed to controllers (MVC).
 *
 * After parsing → matching → resolution → validation, this is the data
 * structure passed to `Controller.execute(model, context)`.
 */
export interface CommandModel {
  verb: string;
  fields: ModelData;
  options: Record<string, boolean>;
  subcommand?: string;
  raw: string;
}

/**
 * Field validator function type.
 *
 * Returns `undefined` when the field is valid, or an error message string
 * when it is invalid.
 */
export type FieldValidator = (
  value: unknown,
  field: string,
  context: CommandContext
) => string | undefined;

/**
 * YAML field definition.
 *
 * - `type`: Data type (string, number, boolean, object, array)
 * - `required`: Must be provided
 * - `remaining`: Consumes all remaining tokens
 * - `multiple`: Enables multi-object selection (returns array)
 * - `validators`: Array of validator function names
 * - `default`: Default value if not provided
 */
export interface FieldDefinition {
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  remaining?: boolean;
  multiple?: boolean;
  validators?: string[];
  default?: unknown;
}

/**
 * YAML syntax pattern definition.
 *
 * One syntax variant for a command: pattern string, description, and
 * field definitions keyed by field name.
 */
export interface SyntaxDefinition {
  pattern: string;
  description: string;
  fields?: Record<string, FieldDefinition>;
}

/**
 * YAML subcommand definition.
 */
export interface SubcommandDefinition {
  description: string;
  pattern: string;
  fields?: Record<string, FieldDefinition>;
}

/**
 * Command View - YAML command definition (the "View" in MVC).
 *
 * Root structure of a command YAML file:
 * - `verbs`: Array of command names/aliases
 * - `controller`: Controller class name (e.g., "LookController")
 * - `description`: Human-readable description
 * - `syntax`: Array of syntax patterns (for commands without subcommands)
 * - `subcommands`: Map of subcommand definitions (for commands with subcommands)
 */
export interface CommandView {
  verbs: string[];
  controller: string;
  description: string;
  syntax?: SyntaxDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
}

// Get path to command YAML directory

// Get path to command YAML directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CMD_DIR = join(__dirname, '../cmd');

/**
 * CommandApi - Static command definition cache
 */
export class CommandApi {
  /** Cached command definitions by filename (performance) */
  static #commands: Map<string, CommandDefinition> = new Map();

  /** Verb → CommandDefinition lookup map (performance) */
  static #verbMap: Map<string, CommandDefinition> = new Map();

  /**
   * Get a command definition by filename, loading it if not cached
   *
   * @param filename - YAML filename (e.g., 'look.yaml')
   * @returns CommandDefinition or null if not found
   */
  static getCommand(filename: string): CommandDefinition | null {
    // Check cache first
    if (this.#commands.has(filename)) {
      return this.#commands.get(filename)!;
    }

    // Load from disk
    try {
      const filePath = join(CMD_DIR, filename);
      const command = CommandDefinition.fromFile(filePath);

      // Cache it
      this.#commands.set(filename, command);

      // Register verbs for fast lookup
      for (const verb of command.verbs) {
        // Defensive: ensure verb is a string
        if (typeof verb !== 'string') {
          console.error(
            `CommandApi: Invalid verb in ${filename}: expected string, got ${typeof verb}. ` +
              `Verb value: ${JSON.stringify(verb)}`
          );
          continue;
        }

        const lowerVerb = verb.toLowerCase();
        if (this.#verbMap.has(lowerVerb)) {
          console.warn(`CommandApi: Verb '${verb}' from ${filename} is already registered`);
        }
        this.#verbMap.set(lowerVerb, command);
      }

      return command;
    } catch (error) {
      console.error(`CommandApi: Failed to load command ${filename}:`, error);
      return null;
    }
  }

  /**
   * Match verb to cached CommandDefinition
   *
   * @param verb - Command verb to match
   * @returns CommandDefinition or null if not found in cache
   */
  static matchVerb(verb: string): CommandDefinition | null {
    return this.#verbMap.get(verb.toLowerCase()) || null;
  }

  /**
   * Get all cached commands
   *
   * Note: This returns cached commands only. For contextual commands,
   * use CommandGiver.getAvailableCommands() which queries CommandProviders.
   */
  static getAllCommands(): CommandDefinition[] {
    return Array.from(this.#commands.values());
  }

  /**
   * Clear cache (useful for testing/reloading)
   */
  static clearCache(): void {
    this.#commands.clear();
    this.#verbMap.clear();
  }
}

decorateApiClass(CommandApi);
