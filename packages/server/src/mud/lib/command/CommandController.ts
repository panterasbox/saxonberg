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
 * `MessageApi.scene(...)`. The outcome flows through the dispatch
 * context: `context.note(...)` for structured failure signals,
 * `context.setStatus(...)` for explicit status pinning. The
 * dispatcher assembles the dispatch-response envelope from the
 * context's accumulator state.
 *
 * Subclasses may narrow the model type by passing a more specific
 * `T extends CommandModel` parameter — e.g.
 * `class DropController extends CommandController<DropModel>`. The
 * dispatcher works with the default `CommandController` (== `T =
 * CommandModel`) and never sees the narrower type.
 */

import type {
  CommandContext,
  CommandModel,
} from '../../api/command';
import { Idea } from '../stuff/Idea';

/**
 * Abstract base class for command controllers.
 *
 * Extends `Idea` so controllers are Stuff-shaped and cloneable from a
 * Template — `StuffApi.clone` instantiates one per command execution.
 * Reloaded class blueprints are picked up via `HotReloadApi`.
 */
export abstract class CommandController<
  T extends CommandModel = CommandModel,
> extends Idea {
  /**
   * Execute the command with a resolved CommandModel.
   *
   * Controllers should:
   *   1. Fire any prose via `MessageApi.scene(...)` or mixin sugar.
   *   2. On failure, emit a structured `context.note(...)` so the
   *      dispatch-response envelope carries the failure signal.
   *      Auto-escalation handles the status; controllers may call
   *      `context.setStatus(...)` explicitly when needed.
   *   3. Return — there is no return value. The outcome of the
   *      command is what the dispatcher sees on the context's
   *      accumulator at the end of execute().
   */
  abstract execute(
    model: T,
    context: CommandContext
  ): void | Promise<void>;
}
