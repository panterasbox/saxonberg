/**
 * LocomotionControllerBase — abstract base for the six locomotion verb
 * controllers (walk / climb / swim / fly / ride / drive) and the
 * refactored `go`.
 *
 * Each concrete controller overrides `modeName()` to return its mode's
 * short name (e.g. `'climb'`). The controller is presentation and
 * coordination only: it picks the mode (and drops a run the body cannot
 * hold to a walk), resolves the exit, calls `Mobile.traverse` — which
 * owns every gate, the flee, the conveyance host and the move — and
 * renders the refusal the crossing returns.
 *
 * Target shape mirrors `go.yaml`: MQL pre-resolves the player's typed
 * direction (or door alias) to a `target` carrying `via.exit` (via the
 * `canReach` validator on the YAML view). The controller reads
 * `target.via?.exit` directly; no manual exit lookup. Falls back to an
 * ExitableVessel's entry-exit when the player named a sibling vessel
 * (`walk cabin` / `climb cabin`).
 */

import { CommandController } from '../../../../lib/command/CommandController';
import type {
  CommandContext,
  CommandModel,
  } from '../../../../api/command';
import type { LocomotionGateFailedNote } from '@saxonberg/types';
import type { MqlOneResult } from '../../../../api/mql';
import type { Stuff } from '../../../../lib/stuff/Stuff';
import type Exit from '../../../../lib/boundary/Exit';
import type { TraversalGuard } from '../../../../lib/boundary/Exit';
import ExitableVessel from '../../../../lib/boundary/ExitableVessel';
import { LocomotionApi } from '../../../../api/locomotion';
import type { LocomotionMode } from '../../LocomotionMode';
import { MessageApi } from '../../../../api/message';
import { MixinApi } from '../../../../api/mixin';
import { Mml } from '../../../../api/mml';
import { SchedulerApi } from '../../../../api/scheduler';
import { WorldClockApi } from '../../../../api/worldclock';
import { ManualBuildStep } from '../../../../lib/craft/ManualBuildStep';
import type { Mobile } from '../../../../lib/spatial/Mobile';

export interface LocomotionModel extends CommandModel {
  target?: MqlOneResult;
}

export abstract class LocomotionControllerBase extends CommandController<LocomotionModel> {
  /**
   * Short name for this verb's mode (e.g. `'climb'`, `'swim'`).
   * `LocomotionApi.modeOfOrThrow` resolves the full templatePath
   * `/platform/idea/LocomotionMode/<name>` internally — concrete controllers don't
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
        .topic('shell.result')
        .toSelf(Mml.fromMarkup("You can't move."))
        .send();
      return;
    }

    // Lazy-load actor anatomy (species + bodyplan) AND the mode
    // singleton before the sync eligibility cascade reads them.
    // First-touch on a fresh server otherwise fails the body-plan
    // gate or the sync mode lookup.
    await LocomotionApi.preloadActorAnatomy(actor);
    let mode = await LocomotionApi.loadMode(this.modeName(context));

    // ⭐ Reach is a body read. A mode faster than a walk is asked of the
    // body FIRST: a fresh body that cannot hold the run drops to a walk
    // with a winded line and a `pace-broken` note, and the traverse goes
    // on under the walk. Only modes with `speed > 1` are asked — breaking
    // TO a walk means something only when you are going faster than one
    // (a sneak or a walk never trips it). A conditioned body is never
    // asked twice: its sustainable power covers the run.
    if (
      mode.getSpeed() > 1 &&
      MixinApi.isExerting(actor) &&
      !actor.canSustainPace(mode)
    ) {
      const walk = await LocomotionApi.loadMode('walk');
      context.note({ kind: 'pace-broken', from: mode.getName(), to: walk.getName() });
      MessageApi.scene(actor)
        .topic('shell.result')
        .toSelf(Mml.compose`You're winded — you drop to a walk.`)
        .send();
      mode = walk;
    }

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
    // ⭐ The crossing decides — prepare, every gate, the flee, the
    // conveyance host, engagement and the move all live in
    // `Mobile.traverse`, the one authoritative sequence. The controller
    // chose the exit and the mode; it reports what the crossing said.
    await this.cross(actor, exit, mode, model, context);
  }

  /**
   * Cross an exit the PLACE picked (no target was typed) under this
   * verb's mode — `swim` into the water from a shore, `descend` down a
   * column. The crossing decides; this reports what it said.
   */
  protected async crossPicked(actor: Stuff, exit: Exit, context: CommandContext): Promise<void> {
    if (!MixinApi.isMobile(actor)) return;
    await LocomotionApi.preloadActorAnatomy(actor);
    const mode = await LocomotionApi.loadMode(this.modeName(context));
    await this.cross(actor, exit, mode, {} as LocomotionModel, context);
  }

  /**
   * ⭐ The one crossing every movement verb ends in. A way that takes TIME
   * (`Exit.crossingRealS` — a swim down the water) is asked first whether
   * it will let you through at all, then holds your hands that long and
   * crosses at the end: `stop` leaves you where you were. Any other way is
   * the instant crossing. The crossing decides; this reports what it said.
   */
  private async cross(
    actor: Stuff & Mobile,
    exit: Exit,
    mode: LocomotionMode,
    model: LocomotionModel,
    context: CommandContext,
  ): Promise<void> {
    const realS = await exit.crossingRealS(actor);
    if (realS > 0 && MixinApi.isEngaged(actor) && MixinApi.isContainable(actor)) {
      // Asked BEFORE the time is spent: a way that will refuse at the end
      // (the ice overhead, too heavy to rise) refuses now — the WHOLE
      // gate `traverse` will ask (body, posture, load, the exit), not the
      // exit's alone: the browser walk swam a band and was told "you're
      // carrying too much to swim" at the end of it. (⚠ A deliberate
      // pre-gate: `traverse` asks again at the end, because the world
      // moves while you swim.)
      const gate = await LocomotionApi.canTraverseExit(actor, exit, mode, exit.getDirection());
      if (!gate.ok) {
        this.emitRejection(gate, mode, model, context);
        return;
      }
      const modeName = mode.getName();
      const scale = WorldClockApi.getScale();
      const step = new ManualBuildStep({
        actor,
        slots: ['hands'],
        durationMs: realS * 1000 * (Number.isFinite(scale) && scale > 0 ? scale : 1),
        // ⚠ Never back into this controller: it is destructed when
        // `execute` returns (`lint:completion-this`).
        onComplete: () => {
          void arriveAfter(actor, exit, modeName);
        },
      });
      const started = SchedulerApi.start(step);
      if (!started.ok) {
        MessageApi.scene(actor).topic('shell.result').toSelf(Mml.compose`Your hands are already busy.`).send();
        context.note({ kind: 'controller-rejected', reason: 'engagement-conflict', detail: 'engagement-conflict' });
        return;
      }
      const way = exit.getDirection();
      MessageApi.scene(actor)
        .topic('act.deed')
        .toSelf(Mml.compose`You ${modeName} ${way}.`)
        .toPeers(Mml.compose`${Mml.actor(actor)} ${modeName}s ${way}.`)
        .send();
      return;
    }
    const guard = await actor.traverse(exit, mode.getName());
    if (!guard.ok) this.emitRejection(guard, mode, model, context);
  }

  /**
   * Centralized failure emission for the locomotion family: fire
   * the rejection prose at `shell.result` (actor-side
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
      .topic('shell.result')
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
        // The exit's own words when it has them — a snowbound pass or an
        // unsafe ford says WHY (found by the climate drive: the snow
        // sentence never reached the player).
        return guard.reason ?? 'The way is blocked.';
      case 'door':
        return guard.reason ?? 'The way is closed.';
      case 'terrain':
        return guard.reason ?? "You can't drag the cart that way.";
      case 'breakaway':
        return guard.reason ?? "The cart won't budge.";
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
    case 'terrain': return 'terrain';
    case 'breakaway': return 'breakaway';
    case 'veto': return 'veto';
    case 'encumbrance': return 'encumbrance';
    case 'locked': return 'locked';
    case 'unbuilt': return 'unbuilt';
    case 'unpublished': return 'unpublished';
    default: return 'exit-mode';
  }
}

/**
 * A timed crossing lands: the crossing itself, unless the mover blacked
 * out on the way (they got no further). A refusal at the last is said in
 * the crossing's own words.
 */
async function arriveAfter(actor: Stuff & Mobile, exit: Exit, mode: string): Promise<void> {
  if (actor.isDestroyed()) return;
  if (MixinApi.isVitals(actor) && actor.getConsciousness() !== 'conscious') return;
  const guard = await actor.traverse(exit, mode);
  if (!guard.ok) {
    MessageApi.scene(actor).topic('shell.result').toSelf(Mml.fromMarkup(guard.reason ?? 'You can\'t get there.')).send();
  }
}
