/**
 * Core interfaces and types for the command framework (MVC Pattern)
 *
 * MVC Nomenclature:
 * - **View**: YAML files (CommandView) - declarative command definitions
 * - **Model**: CommandModel - resolved data passed to controllers
 * - **Controller**: XxxController classes - command execution logic
 *
 * Processing pipeline: YAML (View) → Parse → Match → Resolve → Validate → CommandModel (Model) → Controller
 */

import type { Avatar } from '../../obj/Avatar';
import type { Interactive } from '../../obj/Interactive';
import type { Location } from '../spatial/Location';
import type { Stuff } from '../stuff/Stuff';

/**
 * Command execution context - read-only reference holder
 *
 * Provides controllers with access to:
 * - avatar: The character executing the command
 * - interactive: The connection/session executing the command
 * - location: The avatar's current environment
 * - commandText: Original command string (for logging/debugging)
 * - executionId: Unique identifier for this command execution
 */
export interface CommandContext {
  avatar: Avatar;
  interactive: Interactive;
  location: Location;
  commandText: string;
  executionId: string;
}

/**
 * Parsed command from tokenization
 *
 * Result of CommandLineApi.parse():
 * - verb: First token (command name)
 * - args: Remaining positional arguments
 * - options: Extracted flags (-v, --verbose)
 */
export interface ParsedCommand {
  verb: string;
  args: string[];
  options: Map<string, unknown>;
}

/**
 * Model data - Resolved field values
 *
 * Type alias for resolved model data (field name → field value).
 * Values are `unknown` because they can be:
 * - Resolved game objects (Stuff)
 * - Primitives (string, number, boolean)
 * - Arrays (for multi-object selection)
 */
export type ModelData = Record<string, unknown>;

/**
 * Command Model - Resolved data passed to controllers (MVC)
 *
 * The Model in MVC: fully resolved and validated data after pipeline processing.
 *
 * After parsing → matching → resolution → validation:
 * - verb: Command name
 * - fields: Resolved field values (the model data: field name → resolved value)
 * - options: Command-line options (flag name → value)
 * - subcommand: Subcommand name (if applicable)
 * - raw: Original command string
 *
 * This is the data structure passed to Controller.execute(model, context).
 *
 * Example:
 * ```typescript
 * {
 *   verb: 'get',
 *   fields: { target: <Stuff object> },  // ModelData - resolved game object
 *   options: {},
 *   raw: 'get sword'
 * }
 * ```
 */
export interface CommandModel {
  verb: string;
  fields: ModelData;
  options: Record<string, unknown>;
  subcommand?: string;
  raw: string;
}

/**
 * Command execution result
 *
 * Generic result type with typed output:
 * - success: Whether command completed successfully
 * - output: Command-specific output data (if successful)
 * - error: Error message (if failed)
 */
export interface CommandResult<T = any> {
  success: boolean;
  output?: T;
  error?: string;
}

/**
 * YAML field definition
 *
 * Defines a command field's properties:
 * - type: Data type (string, number, boolean, object, array)
 * - required: Must be provided
 * - remaining: Consumes all remaining tokens
 * - multiple: Enables multi-object selection (returns array)
 * - validators: Array of validator function names
 * - default: Default value if not provided
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
 * YAML syntax pattern definition
 *
 * Defines one syntax variant for a command:
 * - pattern: Syntax string ("<target>", "[option]", etc.)
 * - description: Human-readable description
 * - fields: Field definitions keyed by field name
 */
export interface SyntaxDefinition {
  pattern: string;
  description: string;
  fields?: Record<string, FieldDefinition>;
}

/**
 * YAML subcommand definition
 *
 * Defines a subcommand's syntax and fields:
 * - description: Human-readable description
 * - pattern: Syntax string
 * - fields: Field definitions keyed by field name
 */
export interface SubcommandDefinition {
  description: string;
  pattern: string;
  fields?: Record<string, FieldDefinition>;
}

/**
 * Command View - YAML command definition (MVC)
 *
 * The View in MVC: declarative command definition from YAML files.
 *
 * Root structure of a command YAML file:
 * - verbs: Array of command names/aliases
 * - controller: Controller class name (e.g., "LookController")
 * - description: Human-readable description
 * - syntax: Array of syntax patterns (for commands without subcommands)
 * - subcommands: Map of subcommand definitions (for commands with subcommands)
 *
 * Example: look.yaml, get.yaml, player.yaml
 */
export interface CommandView {
  verbs: string[];
  controller: string;
  description: string;
  syntax?: SyntaxDefinition[];
  subcommands?: Record<string, SubcommandDefinition>;
}

/**
 * @deprecated Use CommandView instead (MVC nomenclature)
 */
export type CommandYamlSchema = CommandView;

/**
 * Field validator function type
 *
 * Validates a field value and returns:
 * - undefined: Field is valid
 * - string: Error message (field is invalid)
 *
 * @param value - Field value to validate (from ModelData)
 * @param field - Field name (for error messages)
 * @param context - Command execution context
 */
export type FieldValidator = (
  value: unknown,
  field: string,
  context: CommandContext
) => string | undefined;

/**
 * MQL (MUD Query Language) context
 *
 * Context for object resolution:
 * - avatar: The character performing the query
 * - location: The avatar's current environment
 * - searchOrder: Order of contexts to search (default: ['inventory', 'location'])
 */
export interface MqlContext {
  avatar: Avatar;
  location: Location;
  searchOrder?: string[];
}

/**
 * MQL match result with score
 *
 * Internal type for ranking object matches:
 * - object: The matched game object
 * - score: Match quality score (higher = better)
 */
export interface MqlMatch {
  object: Stuff;
  score: number;
}
