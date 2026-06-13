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

import { CommandController } from '../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../api/command';
import type { LocomotionGateFailedNote } from '@saxonberg/types';
import type { MqlOneResult } from '../../../api/mql';
import type Exit from '../../../lib/boundary/Exit';
import type { TraversalGuard } from '../../../lib/boundary/Exit';
import ExitableVessel from '../../../lib/boundary/ExitableVessel';
import { LocomotionApi } from '../../../api/locomotion';
import type { LocomotionMode } from '../../../lib/locomotion/LocomotionMode';
import { MessageApi } from '../../../api/message';
import { MixinApi } from '../../../api/mixin';
import { Mml } from '../../../api/mml';

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
  ): Promise<void> {
    const actor = context.commandGiver;
    if (!MixinApi.isContainable(actor) || !MixinApi.isMobile(actor)) {
      // No body-plan-shaped affordance at all — surface as a
      // mixin-missing note. Same `Scene.send` + ctx.note pairing as
      // any other failure.
      context.note({ kind: 'mixin-missing', mixin: 'MobileMixin' });
      MessageApi.scene(actor)
        .topic('system.shell.movement')
        .toSelf(Mml.fromMarkup("You can't move."))
        .send();
      return;
    }

    // Lazy-load actor anatomy (species + bodyplan) AND the mode
    // singleton before the sync eligibility cascade reads them.
    // First-touch on a fresh server otherwise fails the body-plan
    // gate or the sync mode lookup.
    await LocomotionApi.preloadActorAnatomy(actor);
    const mode = await LocomotionApi.loadMode(this.modeName(context));

    const target = model.target;
    if (!target || target.stuff === null) {
      this.emitRejection(
        { ok: false, gate: 'exitMode', mode: mode.getName() },
        mode,
        model,
        context,
      );
      return;
    }

    // Resolve to an Exit. MQL's `target.via?.exit` is the primary path
    // (typed-direction or door-alias; `MqlMatchVia` is augmented with
    // `exit?: Exit` by `lib/boundary/Exit.ts` via declaration merging).
    // The ExitableVessel entry-exit fallback handles sibling-vessel
    // entry (`walk cabin`) where MQL resolved to the vessel Stuff but
    // not via a direction.
    const viaExit = target.via?.exit;
    const exit: Exit | null =
      viaExit ??
      (target.stuff instanceof ExitableVessel
        ? target.stuff.getEntryExit() ?? null
        : null);
    if (!exit) {
      this.emitRejection(
        { ok: false, gate: 'exitMode', mode: mode.getName() },
        mode,
        model,
        context,
      );
      return;
    }
    const direction = exit.getDirection();

    // Run the remaining gates: body-plan, posture, exit-media,
    // enablement (with capability). MQL's canReach validator already
    // confirmed the exit is reachable; canTraverseExit adds the
    // mode-specific gates.
    const guard = LocomotionApi.canTraverseExit(actor, exit, mode, direction);
    if (!guard.ok) {
      this.emitRejection(guard, mode, model, context);
      return;
    }

    const destination = exit.getDestination();
    const destName = destination.getPresentation();

    if (mode.getPassthrough()) {
      const host = LocomotionApi.findConveyanceHost(actor, mode);
      if (
        !host ||
        !MixinApi.isMobile(host) ||
        !MixinApi.isContainable(host)
      ) {
        this.emitRejection(
          { ok: false, gate: 'noConveyance', mode: mode.getName() },
          mode,
          model,
          context,
        );
        return;
      }
      const hostMode = LocomotionApi.resolveHostMode(host);
      await LocomotionApi.engageAround(host, hostMode, exit, () =>
        host.traverse(exit, hostMode.getName()),
      );
    } else {
      await LocomotionApi.engageAround(actor, mode, exit, () =>
        actor.traverse(exit, mode.getName()),
      );
    }

    return;
  }

  /**
   * Centralized failure emission for the locomotion family: fire
   * the rejection prose at `system.shell.movement` (actor-side
   * shell channel) AND emit a structured `locomotion-gate-failed`
   * note onto the dispatch context. One pairing, every gate.
   */
  protected emitRejection(
    guard: TraversalGuard,
    mode: LocomotionMode,
    model: LocomotionModel,
    context: CommandContext,
  ): void {
    const prose = this.composeRejection(guard, mode, model);
    MessageApi.scene(context.commandGiver)
      .topic('system.shell.movement')
      .toSelf(Mml.fromMarkup(prose))
      .send();
    context.note({
      kind: 'locomotion-gate-failed',
      gate: mapGate(guard.gate),
      mode: mode.getName(),
    });
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

/**
 * Map TraversalGuard's camelCase gate names to the note's
 * kebab-case vocabulary. Two sources of truth would be worse;
 * this mapper is the seam.
 */
function mapGate(gate: string | undefined): LocomotionGateFailedNote['gate'] {
  switch (gate) {
    case 'bodyPlan': return 'body-plan';
    case 'exitMode': return 'exit-mode';
    case 'noConveyance': return 'no-conveyance';
    case 'posture': return 'posture';
    case 'enablement': return 'enablement';
    case 'capability': return 'capability';
    case 'blocked': return 'blocked';
    case 'door': return 'door';
    default: return 'exit-mode';
  }
}
