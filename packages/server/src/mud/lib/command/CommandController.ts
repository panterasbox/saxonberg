/**
 * CommandController - Abstract base class for command execution logic (MVC)
 *
 * The Controller in MVC: executes business logic with validated CommandModel data.
 *
 * Controllers are ephemeral (new instance per execution) and type-safe:
 * - Generic `CommandController<Input, Output>` pattern
 * - Input: Command-specific input model (from CommandModel.fields)
 * - Output: Command-specific output data
 *
 * Pipeline: CommandView (YAML) → CommandModel (data) → Controller (execution)
 *
 * Controllers receive validated, resolved data and execute business logic.
 *
 * Example:
 * ```typescript
 * interface SayInput {
 *   message: string;
 * }
 *
 * interface SayOutput {
 *   text: string;
 * }
 *
 * class SayController extends CommandController<SayInput, SayOutput> {
 *   execute(input: SayInput, context: CommandContext): CommandResult<SayOutput> {
 *     context.avatar.say(input.message);
 *     return {
 *       success: true,
 *       output: { text: `You say, '${input.message}'` }
 *     };
 *   }
 * }
 * ```
 */

import type { CommandContext, CommandResult } from './models';

/**
 * Abstract base class for command controllers
 *
 * @template I Input model type (command-specific)
 * @template O Output data type (command-specific)
 */
export abstract class CommandController<I = unknown, O = unknown> {
  /**
   * Execute command with validated, resolved input
   *
   * Controllers should:
   * 1. Perform business logic (modify game state, send messages, etc.)
   * 2. Return success result with output data
   * 3. Return error result if execution fails
   *
   * @param input - Validated and resolved input model
   * @param context - Command execution context (avatar, location, etc.)
   * @returns Command result with success/error and optional output
   */
  abstract execute(input: I, context: CommandContext): CommandResult<O>;
}
