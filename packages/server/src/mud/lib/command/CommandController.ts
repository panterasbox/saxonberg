/**
 * CommandController — abstract base class for command execution logic.
 *
 * The Controller in MVC: executes business logic with validated
 * CommandModel data. Controllers are ephemeral (new instance per
 * execution).
 *
 * Pipeline: CommandView (YAML) → CommandModel (data) → Controller (execution)
 *
 * Messaging is the controller's responsibility — fire all prose via
 * `MessageApi.scene(...)`. The returned `CommandResult` is purely
 * semantic: `success` answers "did the command achieve its goal?",
 * and the optional `summary` decorates the auto-emitted MudlogApi
 * command-outcome entry (§9.4).
 */

import type { CommandContext, CommandResult } from '../../api/command';

/**
 * Abstract base class for command controllers.
 *
 * @template I Input model type (command-specific)
 */
export abstract class CommandController<I = unknown> {
  /**
   * Execute command with validated, resolved input.
   *
   * Controllers should:
   *   1. Fire any prose via `MessageApi.scene(...)` or mixin sugar.
   *   2. Return `{ success: true }` (with optional `summary` to
   *      override the auto-emit's default `'ok'` tail) when the
   *      command achieved its goal.
   *   3. Return `{ success: false, summary }` on failure — the
   *      summary feeds the auto-emit's body.
   */
  abstract execute(
    input: I,
    context: CommandContext
  ): CommandResult | Promise<CommandResult>;
}
