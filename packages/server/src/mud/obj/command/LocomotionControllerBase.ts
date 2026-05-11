/**
 * LocomotionControllerBase — abstract base for the six locomotion verb
 * controllers (walk / climb / swim / fly / ride / drive) and the
 * refactored `go`.
 *
 * Each concrete controller overrides `modeName()` to return its mode's
 * short name (e.g. `'climb'`); `LocomotionApi.modeOfOrThrow` resolves
 * the full templatePath. Routing for passthrough modes (ride / drive)
 * walks to the conveyance host; non-passthrough modes traverse
 * directly via `LocomotionApi.engageAround` (which threads engagedMode
 * bookkeeping around the inner `Mobile.traverse`).
 *
 * Target shape mirrors `go.yaml`: MQL pre-resolves the player's typed
 * direction (or door alias) to a `target` carrying `via.exit` (via the
 * `canReach` validator on the YAML view). The controller reads
 * `target.via?.exit` directly; no manual exit lookup. Falls back to an
 * ExitableVessel's entry-exit when the player named a sibling vessel
 * (`walk cabin` / `climb cabin`).
 */

import { CommandController } from '../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  CommandResult,
} from '../../api/command';
import type { MqlOneResult } from '../../api/mql';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { Containable } from '../../lib/spatial/Containable';
import type { Mobile } from '../../lib/spatial/Mobile';
import type { Exit, TraversalGuard } from '../../lib/boundary/Exit';
import { ExitableVessel } from '../../lib/boundary/ExitableVessel';
import { LocomotionApi } from '../../api/locomotion';
import type { LocomotionMode } from '../../lib/locomotion/LocomotionMode';
import { MixinApi } from '../../api/mixin';
import { DescribeApi } from '../../api/describe';

export interface LocomotionModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class LocomotionControllerBase extends CommandController<LocomotionModel> {
  /**
   * Short name for this verb's mode (e.g. `'climb'`, `'swim'`).
   * `LocomotionApi.modeOfOrThrow` resolves the full templatePath
   * `/lib/locomotion/<name>` internally — concrete controllers don't
   * construct paths.
   */
  protected abstract modeName(context: CommandContext): string;

  async execute(
    model: LocomotionModel,
    context: CommandContext,
  ): Promise<CommandResult> {
    const actor = context.commandGiver;
    if (!MixinApi.isContainable(actor) || !MixinApi.isMobile(actor)) {
      return { success: false, summary: "can't move" };
    }

    const mode = LocomotionApi.modeOfOrThrow(this.modeName(context));

    const target = model.target;
    if (!target || target.stuff === null) {
      return {
        success: false,
        summary: this.composeRejection(
          { ok: false, gate: 'exitMode', mode: mode.getName() },
          mode,
          model,
        ),
      };
    }

    // Resolve to an Exit. MQL's `target.via?.exit` is the primary path
    // (typed-direction or door-alias). The ExitableVessel entry-exit
    // fallback handles sibling-vessel entry (`walk cabin`) where MQL
    // resolved to the vessel Stuff but not via a direction. Mirrors
    // GoController's pre-locomotion behavior for all six verbs.
    let exit: Exit | null =
      (target.via as { exit?: Exit } | undefined)?.exit ?? null;
    if (!exit && target.stuff instanceof ExitableVessel) {
      exit = target.stuff.getEntryExit() ?? null;
    }
    if (!exit) {
      return {
        success: false,
        summary: this.composeRejection(
          { ok: false, gate: 'exitMode', mode: mode.getName() },
          mode,
          model,
        ),
      };
    }
    const direction = exit.getDirection();

    // Run the remaining gates: body-plan, posture, exit-media,
    // enablement (with capability). MQL's canReach validator already
    // confirmed the exit is reachable; canTraverseExit adds the
    // mode-specific gates.
    const guard = LocomotionApi.canTraverseExit(actor, exit, mode, direction);
    if (!guard.ok) {
      return {
        success: false,
        summary: this.composeRejection(guard, mode, model),
      };
    }

    const destination = exit.getDestination();
    const destName = DescribeApi.getDisplayName(destination, 'somewhere new');

    if (mode.getPassthrough()) {
      const host = LocomotionApi.findConveyanceHost(actor, mode);
      if (
        !host ||
        !MixinApi.isMobile(host) ||
        !MixinApi.isContainable(host)
      ) {
        return {
          success: false,
          summary: this.composeRejection(
            { ok: false, gate: 'noConveyance', mode: mode.getName() },
            mode,
            model,
          ),
        };
      }
      const hostMode = LocomotionApi.resolveHostMode(host);
      const exitRef: Exit = exit;
      await LocomotionApi.engageAround(host, hostMode, exitRef, () =>
        host.traverse(exitRef, hostMode.getName()),
      );
    } else {
      const exitRef: Exit = exit;
      await LocomotionApi.engageAround(
        actor as Stuff & Containable & Mobile,
        mode,
        exitRef,
        () =>
          (actor as Stuff & Containable & Mobile).traverse(
            exitRef,
            mode.getName(),
          ),
      );
    }

    return { success: true, summary: `to ${destName}` };
  }

  /**
   * Verb-templated rejection prose. Concrete controllers override per
   * gate to taste (e.g., Climb says "this climb looks too hard for
   * you" at the capability gate; the base falls back to a generic
   * shape). Always call `super.composeRejection(...)` for gates the
   * subclass doesn't customize.
   */
  protected composeRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    _model: LocomotionModel,
  ): string {
    switch (guard.gate) {
      case 'bodyPlan':
        return `Your body can't ${mode.getName()}.`;
      case 'posture':
        return `You can't ${mode.getName()} from this posture.`;
      case 'exitMode':
        return `You can't ${mode.getName()} that way.`;
      case 'enablement':
        return guard.reason ?? `There's no way to ${mode.getName()} here.`;
      case 'capability':
        return guard.reason ?? "That's too hard for you.";
      case 'noConveyance':
        return `You're not ${mode.getName()}ing anything.`;
      case 'blocked':
        return 'The way is blocked.';
      case 'door':
        return guard.reason ?? 'The way is closed.';
      default:
        return guard.reason ?? "You can't go that way.";
    }
  }
}
