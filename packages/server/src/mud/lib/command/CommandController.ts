/**
 * CommandController — abstract base class for command execution logic.
 *
 * The Controller in MVC: executes business logic with a fully-bound
 * CommandModel. Controllers are ephemeral (new instance per execution
 * via `StuffApi.clone`), so they can hold per-execution state safely.
 *
 * Pipeline: CommandView (YAML) → CommandModel (data) → Controller
 * (execution)
 *
 * Messaging is the controller's responsibility — fire all prose via
 * `MessageApi.scene(...)`. The returned `CommandResult` is purely
 * semantic: `success` answers "did the command achieve its goal?",
 * `pass: true` opts the controller out of the dispatch (the chain
 * tries the next match), and the optional `summary` decorates the
 * auto-emitted MudlogApi command-outcome entry.
 */

import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import { Idea } from '../stuff/Idea';

/**
 * Abstract base class for command controllers.
 *
 * Extends `Idea` so controllers are Stuff-shaped and cloneable from a
 * Template — `StuffApi.clone` instantiates one per command execution.
 * Reloaded class blueprints are picked up via `HotReloadApi`.
 */
export abstract class CommandController extends Idea {
  /**
   * Execute the command with a resolved CommandModel.
   *
   * Controllers should:
   *   1. Fire any prose via `MessageApi.scene(...)` or mixin sugar.
   *   2. Return `{ success: true }` (with optional `summary` to
   *      override the auto-emit's default `'ok'` tail) when the
   *      command achieved its goal.
   *   3. Return `{ success: false, summary }` on failure — the
   *      summary feeds the auto-emit's body.
   *   4. Return `{ pass: true, success: false }` to defer to the next
   *      handler in the chain. A passing controller MUST NOT have
   *      observable side effects.
   */
  abstract execute(
    model: CommandModel,
    context: CommandContext
  ): CommandResult | Promise<CommandResult>;
}
