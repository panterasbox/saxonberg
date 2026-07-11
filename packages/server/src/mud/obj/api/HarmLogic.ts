// HarmLogic — the hot-reloadable logic singleton behind HarmApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { ExecutionContextApi } from '../../api/execution-context';
import { ScheduleApi } from '../../api/schedule';
import type { ScheduleHandle } from '../../api/schedule';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import {
  HARM_DEFAULTS,
  TRAUMA_BEHAVIOR,
} from '../../lib/vitals/Condition';
import type {
  ActiveCondition,
  Mechanism,
  Trauma,
  TraumaType,
} from '../../lib/vitals/Condition';
import type { Vitals } from '../../lib/vitals/Vitals';
import type { InflictSpec, InflictOutcome } from '../../api/harm';

const HarmApiCallers = SecurityPolicies.FromModule('/api/harm#HarmApi');

/** Transient per-live-body wound-tick state (NEVER persisted). */
interface TickEntry {
  handle: ScheduleHandle;
  /** Game-time seconds at the last integrated tick (the elapsed anchor). */
  stamp: number;
}

/**
 * The bijective mechanism → trauma-type map. A small switch (NOT a
 * `type → number` severity table — that antipattern is barred): mechanism
 * chooses which trauma *behaves*, severity is the separate magnitude read.
 */
function mechanismToType(mechanism: Mechanism): TraumaType {
  switch (mechanism) {
    case 'sharp':
      return 'laceration';
    case 'blunt':
      return 'contusion';
    case 'crushing':
      return 'fracture';
    case 'thermal':
      return 'burn';
    case 'tearing':
      return 'avulsion';
  }
}

/**
 * The v1 severity magnitude function — `energy → severity`, linear via a
 * single dial. Magnitude-only: `mechanism` is recorded on the trauma but
 * does NOT modulate severity yet (the deferred materials-response seam).
 */
function severityFromEnergy(energy: number): number {
  return Math.max(0, energy) * HARM_DEFAULTS.SEVERITY_PER_ENERGY;
}

/**
 * Resolve the inflicter's durable `templatePath` from execution context —
 * the command-frame giver (non-forced, single-consistent) or the REST
 * acting-author stamp. Never a caller-supplied parameter (the gated-Api
 * actor-from-context rule); `undefined` for an environmental / far-cause
 * / unattributable insult (forced dispatch, cross-actor cascade).
 */
function resolveInflicter(): string | undefined {
  const author = ExecutionContextApi.getActingAuthor();
  if (author == null) return undefined;
  const path = (author as Stuff).getTemplatePath?.();
  return path ?? undefined;
}

/** In-session game-time seconds, or `null` when no world clock is running. */
function harmNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/** The body's still-active (unresolved) trauma conditions. */
function activeTraumas(host: Vitals): Trauma[] {
  return host
    .getConditions()
    .filter((c: ActiveCondition): c is Trauma => c.kind === 'trauma');
}

/** Stamp the death seam once (cause + lifecycle), idempotent-guarded. */
function stampDeath(host: Stuff & Vitals, cause: string): void {
  if (!MixinApi.isOrganism(host)) return;
  if (host.getLifecycleState() === 'dead') return;
  host.setCauseOfDeath(cause);
  host.setLifecycleState('dead');
}

/**
 * One wound-tick integration for a live body. Reads game-time, applies the
 * **presence-freeze** discipline verbatim from `Metabolic.reconcileMetabolism`
 * (first-touch stamp, linkdead re-stamp, `elapsed<=0`, far-past guard),
 * runs each active trauma's `tick(host, t, elapsedSec)`, relieves cleared
 * wounds, then checks the bleed→death floor. Cancels + drops the tick when
 * the body has no active trauma left (or has died). A module-private free
 * function so the recurring closure never makes an intra-singleton
 * `this.x()` call the gate would deny.
 */
function advanceWounds(
  host: Stuff & Vitals,
  ticks: Map<string, TickEntry>
): void {
  const key = host.stuffId;
  const entry = ticks.get(key);
  if (!entry) return;

  const nowS = harmNowSeconds();
  if (nowS === null) return; // no clock — idle, no time source

  // Linkdead freeze: the body lingers in-world but its clock is paused —
  // re-stamp so the away-gap never accumulates.
  if (MixinApi.isHasInteractive(host) && host.isLinkdead()) {
    entry.stamp = nowS;
    return;
  }

  const elapsed = nowS - entry.stamp;
  if (elapsed <= 0) {
    entry.stamp = nowS;
    return;
  }
  // Far-past guard: a gap this long means absence — drop it, integrate
  // nothing (the fairness override; real-life absence never bleeds you).
  if (elapsed > HARM_DEFAULTS.MAX_REASONABLE_GAP_SEC) {
    entry.stamp = nowS;
    return;
  }
  entry.stamp = nowS;

  for (const t of activeTraumas(host)) {
    TRAUMA_BEHAVIOR[t.type].tick(host, t, elapsed);
  }

  // Relieve any wound that has healed to (near) zero severity.
  for (const t of activeTraumas(host)) {
    if (t.severity <= HARM_DEFAULTS.CLEARED_SEVERITY) host.relieve(t);
  }

  // Bleed → death floor. `getConsciousness()` already reads a low blood
  // volume as `unconscious`, so the conscious → unconscious waypoint falls
  // out for free — harm writes only the death sign.
  const floor = host.getVitalBand('bloodVolume').survivableMin;
  if (host.getVitalSign('bloodVolume').rawValue() <= floor) {
    stampDeath(host, 'exsanguination');
    cancelTick(host, ticks);
    return;
  }

  // No more active wounds → disarm.
  if (activeTraumas(host).length === 0) cancelTick(host, ticks);
}

/** Cancel + drop a body's wound-tick (idempotent). */
function cancelTick(host: Stuff, ticks: Map<string, TickEntry>): void {
  const entry = ticks.get(host.stuffId);
  if (!entry) return;
  ScheduleApi.cancel(entry.handle);
  ticks.delete(host.stuffId);
}

/**
 * HarmLogic — the hot-reloadable logic singleton behind {@link HarmApi}.
 *
 * Lives at `/obj/api/harm` (a stateless `Stuff` singleton, no backing
 * `Template`); `HarmApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The gated **inflict producer**, the recurring
 * **wound-tick driver** (game-time drain, presence-frozen, handle NEVER
 * persisted → re-armed on hydrate), and the harm-owned death stamp
 * (`exsanguination`). Internal sub-logic lives in module-private free
 * functions, so there are no intra-singleton `this.x()` calls to trip the
 * gate. Each public method carries the `FromModule` gate.
 * `dest /obj/api/harm` reloads it.
 *
 * @internal
 */
@Unshadowable
export class HarmLogic extends ApiLogic {
  /**
   * The per-live-body wound-tick registry — transient in-memory state,
   * keyed on the live `stuffId` (unique per instance; re-minted on
   * reclone/relog, so a hydrated body simply re-arms). NEVER persisted —
   * the Condition.ts "re-arm on hydrate" invariant. A fresh singleton
   * (post-HMR / post-`clearAll`) starts empty and re-arms from the
   * body-warm seams.
   */
  private ticks = new Map<string, TickEntry>();

  /** See {@link HarmApi.inflict}. */
  @CallSecurity(HarmApiCallers)
  public inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    const type = mechanismToType(spec.mechanism);
    const trauma: Trauma = {
      kind: 'trauma',
      type,
      site: spec.site,
      severity: severityFromEnergy(spec.energy),
      mechanism: spec.mechanism,
    };
    const inflicter = resolveInflicter();
    if (inflicter !== undefined) trauma.inflictedBy = inflicter;

    // A non-wound-able target (a cart, a bare Idea) takes no trauma —
    // the outcome carries the built trauma but nothing is afflicted.
    if (!MixinApi.isVitals(target)) {
      return { trauma, afflicted: false };
    }

    // Run the type's onset (laceration opens the bleed), land it, arm.
    TRAUMA_BEHAVIOR[type].onset(target, trauma);
    target.afflict(trauma);
    this.armWoundTick(target);
    return { trauma, afflicted: true };
  }

  /** See {@link HarmApi.rearmWoundTicks}. */
  @CallSecurity(HarmApiCallers)
  public rearmWoundTicks(host: Stuff): void {
    this.armWoundTick(host);
  }

  /**
   * Arm (or disarm) a body's recurring wound-tick. Idempotent: with ≥1
   * active trauma and no live handle it starts a `ScheduleApi.recurring`
   * whose callback integrates the game-time drain (presence-frozen); with
   * no active trauma it cancels + drops any live handle. A no-op for a
   * non-Vitals host, an already-armed live body, or a corpse. The handle
   * lives only in the in-memory map (never persisted).
   */
  private armWoundTick(host: Stuff): void {
    if (!MixinApi.isVitals(host)) return;
    const key = host.stuffId;
    const hasActive = activeTraumas(host).length > 0;
    const live = this.ticks.get(key);

    if (!hasActive) {
      if (live) cancelTick(host, this.ticks);
      return;
    }
    if (live) return; // already armed

    const nowS = harmNowSeconds();
    const ticks = this.ticks;
    const handle = ScheduleApi.recurring(HARM_DEFAULTS.TICK_INTERVAL_MS, () => {
      try {
        advanceWounds(host as Stuff & Vitals, ticks);
      } catch (err) {
        console.error('HarmLogic: wound tick failed', err);
      }
    });
    // First-touch stamp: seed at now so the first fire integrates only the
    // post-arm span (a null clock stamps 0 and re-seeds on first fire).
    ticks.set(key, { handle, stamp: nowS ?? 0 });
  }
}
