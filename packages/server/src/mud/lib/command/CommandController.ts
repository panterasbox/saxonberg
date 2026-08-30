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
import { PromptApi } from '../../api/prompt';
import { MixinApi } from '../../api/mixin';
import { MqlApi } from '../../api/mql';
import type { Display } from '../display/Display';
import type { Stuff } from '../stuff/Stuff';
import type { CommandGiver } from '../command/CommandGiver';

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

  /**
   * ⭐ The IMPLICIT screen — the one `actor` drives when the command did
   * not name one. A command that *does* name a screen resolves it through
   * the ordinary arg machinery (`watch … on <screen>`: `peers` scope,
   * `requires: DisplayMixin`); this is only the fallback, and it lives
   * here so the several verbs that show something on a screen share one
   * ladder instead of each inventing it.
   *
   * The ladder is ordered by REACH, and so is its cost:
   *
   *  1. **Held** — a screen in your hand is yours to drive whatever its
   *     pairing. The thief with the house tablet READS the sheet; the
   *     seat is what they lack, and the seat is checked where money
   *     moves, never here.
   *  2. **In reach and drivable** — a screen you share a room with whose
   *     `pairing` admits you.
   *  3. **Anywhere, by mind** — the modem is the driver's own attunement.
   *     ⚠ The ONE global read, gated on the attunement *before* it
   *     enumerates so an ordinary actor never pays for it, and expressed
   *     as an MQL system sweep rather than a bespoke world scan.
   *
   * `mode` says which: a driver by mind sees nothing of what they show.
   */
  protected async resolveScreen(
    actor: Stuff & CommandGiver,
  ): Promise<{ display: Stuff & Display; mode: 'hand' | 'mind' } | null> {
    const reachable = MqlApi.resolveMany('reachable:[mixin.DisplayMixin]', {
      commandGiver: actor,
      scope: 'reachable',
    }).stuff.filter((s): s is Stuff & Display => MixinApi.isDisplay(s));

    for (const d of reachable) {
      if (d.isCarriedBy(actor)) return { display: d, mode: 'hand' };
    }
    for (const d of reachable) {
      if (await d.mayDrive(actor)) return { display: d, mode: 'hand' };
    }
    if (MixinApi.isActive(actor, 'AetherMixin')) {
      const all = MqlApi.resolveMany('world:[mixin.DisplayMixin]', {
        commandGiver: null,
        scope: 'world',
      }).stuff.filter((s): s is Stuff & Display => MixinApi.isDisplay(s));
      for (const d of all) {
        if (d.getPairing() === 'open') continue;
        if (await d.mayDrive(actor)) return { display: d, mode: 'mind' };
      }
    }
    return null;
  }

  /**
   * **Ask for an object the player didn't name**, from a reachable
   * candidate set. Returns `null` when there is nobody to ask, nothing
   * to offer, or the player cancels — every one of which means "do not
   * proceed", so a caller can treat `null` as a quiet abort.
   *
   * ⚠ This is the answer to "the working needs a target and none was
   * given", and reaching past it is how `read` grew an `at` clause:
   * a preposition on a verb where aiming means nothing, invented
   * because the prompt substrate went unused. `zap wand at troll` is
   * fine — pointing a wand IS directional. `read scroll at flask` was
   * not, and the difference is whether the ACT is aimed.
   */
  protected async promptForObject(
    context: CommandContext,
    label: string,
    candidates: Stuff[],
  ): Promise<Stuff | null> {
    const interactive = context.interactive;
    if (!interactive || candidates.length === 0) return null;
    try {
      return await PromptApi.mqlObject(interactive, label, candidates);
    } catch {
      // Cancelled, timed out, or the host dropped — all "no target".
      return null;
    }
  }

  /**
   * **Everything the actor could plausibly aim something at** — what
   * they carry, plus what shares their environment, minus themselves.
   * The candidate pool for {@link promptForObject}; the working's own
   * targeting rules still judge whatever comes back.
   */
  protected reachableMarks(context: CommandContext): Stuff[] {
    const giver = context.commandGiver;
    const out: Stuff[] = [];
    if (MixinApi.isContainer(giver)) out.push(...giver.getContents());
    if (MixinApi.isContainable(giver)) {
      const env = giver.getContainer();
      if (env && MixinApi.isContainer(env)) {
        for (const c of env.getContents()) {
          if (c.stuffId !== giver.stuffId) out.push(c);
        }
      }
    }
    return out;
  }

  /**
   * ⭐ **The object that afforded this command, when it was not the
   * actor themselves** — the thermometer that lit up `measure
   * temperature`, the barometer behind `measure pressure`. Returns
   * `undefined` for an innate verb, where `commandSource` falls back
   * to the giver and naming it would claim the *person* was the
   * instrument.
   *
   * This is the provenance seam: a reading is only honest if you can
   * say how it was taken, and the affordance layer already knows —
   * `commandSource` is populated from the claiming match's affordance
   * record. Derived rather than asserted per call site, so a new
   * instrument gets provenance the moment it confers a verb.
   */
  protected affordingSource(context: CommandContext): string | undefined {
    const source = context.commandSource;
    if (!source || source.stuffId === context.commandGiver.stuffId) {
      return undefined;
    }
    return source.getPresentation();
  }
}
