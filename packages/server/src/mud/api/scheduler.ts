/**
 * SchedulerApi — the engagement framework's runtime.
 *
 * Owns the active set of engagements, the timers backing
 * `DurativeActivity` completion and `ScheduledEmission` cadence, the
 * per-engagement host-destruction subscriptions, the 100ms duration
 * floor (with in-place synchronous completion below it), and the
 * activity-class registry that makes lifecycle dispatch HMR-aware.
 *
 * Wave 1 ships the substrate — no activity classes register against
 * it in this build; the API surface is exercised through the
 * `cancel` verb (which only ever finds an empty engagement map) and
 * the test suite. Wave 2's `TraverseActivity` would be the first
 * real consumer; Wave 3 the host-slot family.
 *
 * Threading: `start()` returns synchronously after firing
 * `onStart()`; timers fire on Node's event loop via setTimeout /
 * setInterval. All lifecycle invocations (`onComplete`, `onAbort`,
 * emission events) are wrapped in try/catch: a throw fires
 * `onAbort('thrown')`, force-clears every timer for the engagement,
 * and the server keeps running.
 *
 * Host-destruction discipline: when an engagement exposes a
 * `getHost()` that returns a Stuff, the scheduler subscribes via
 * `EventApi` to `Events.StuffDestructed` for that stuffId and fires
 * `onAbort('host-destroyed')` immediately on match.
 *
 * Wire emission: completion / abort / replace each ship an
 * `ActivityUpdateEnvelope` via `MessageApi.sendEnvelope`; the
 * engagement's actor (always a Sensor as part of `Engaged`'s host
 * Character composition) fans out to connected Interactives via
 * `Avatar.handleEnvelope`. The sub-100ms `completed-sync` path is
 * wire-silent — the controller renders completion prose; no
 * envelope ships.
 *
 * Inter-Stuff Contract: outside callers reach the engagement map
 * via `getEngagement*` methods; mutators `_setEngagement` /
 * `_clearEngagement` on `EngagedMixin` are runtime-gated to this Api
 * by the call-security `ApiOnly` policy.
 */

import { nanoid } from 'nanoid';
import type {
  ActivityUpdateEnvelope,
  AbortReason,
  EngagementCancelledNote,
  EngagementCompletedNote,
  EngagementStartedNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type {
  Engaged,
  EngagementSlot,
} from '../lib/activity/Engaged';
import { ENGAGEMENT_SLOTS } from '../lib/activity/Engaged';
import { EventApi, type Subscription } from './event';
import { Events } from '../lib/events';
import { ExecutionContextApi } from './execution-context';
import { HotReloadApi } from './hot-reload';
import { MessageApi } from './message';
import { MixinApi } from './mixin';
import { ModuleApi } from './module';
import { SecurityApi } from './security';

/* ─────────────────────────── Shape types ─────────────────────────── */

/**
 * Activity-specific cadenced side-effect descriptor. The
 * `event(ctx)` factory returns whatever the firing subsystem owns
 * (combat hit detail, recognition update, etc.) — the scheduler
 * doesn't shape the result onto the wire in Wave 1; it's the
 * subsystem's responsibility. Wave 1 ships the substrate, not any
 * consumer.
 */
export interface ScheduledEmission {
  intervalMs: number;
  event: (ctx: {
    engagement: Engagement;
    actor: Stuff & Engaged;
    elapsed: number;
  }) => unknown;
}

/**
 * Base shape of an engagement. Both `DurativeActivity` (timed,
 * completes on its own) and `SustainedEngagement` (untimed, ends
 * only on an explicit abort) extend / satisfy this.
 *
 * `engagementId` is framework-stamped at `start()` time; subclass
 * constructors initialize to `''`. `startedAt` is the activity's
 * own construction time (close enough to start-time for wire
 * purposes — the gap to `start()` is sub-tick). The `cancelable`
 * field is read at start-time when building
 * `EngagementStartedNote`; v1's default is `true` on every concrete
 * engagement.
 *
 * `getHost?()` is the eager-revalidation hook for host-destruction
 * (slate § Pre-completion mid-flight validity). Returning `null` —
 * or omitting the method — opts out.
 */
export interface Engagement {
  engagementId: string;
  readonly type: string;
  readonly actor: Stuff & Engaged;
  readonly startedAt: number;
  readonly slots: ReadonlySet<EngagementSlot>;
  readonly interruptibleBy: ReadonlySet<AbortReason>;
  readonly emissions?: readonly ScheduledEmission[];
  readonly cancelable: boolean;
  onStart(): void;
  onAbort(reason: AbortReason): void;
  getHost?(): Stuff | null;
}

/**
 * Engagement shape that completes on its own timer after
 * `duration` ms (or in-place synchronously when below 100ms).
 * `replaceableBy` lists activity types whose `start()` is allowed
 * to preempt this engagement.
 */
export interface DurativeActivity extends Engagement {
  readonly duration: number;
  readonly replaceableBy: readonly string[];
  onComplete(): void;
}

/**
 * Engagement shape with no timer. Ends only when an explicit verb
 * (`let go`, `dismount`, `stand`) calls `SchedulerApi.cancel(...)`.
 * Structurally identical to `Engagement`; the discriminator is the
 * absence of `duration` / `onComplete`.
 */
export type SustainedEngagement = Engagement;

/** Discriminator: does `e` carry a numeric `duration`? */
export function isDurativeActivity(
  e: Engagement,
): e is DurativeActivity {
  return typeof (e as DurativeActivity).duration === 'number';
}

/**
 * Five outcomes of `SchedulerApi.start()`. The two `ok:true`
 * statuses that carry a live engagement (`'started'`,
 * `'replaced'`) include a prebuilt `EngagementStartedNote` the
 * controller pushes onto its dispatch via `ctx.note(note)`;
 * `'completed-sync'` is wire-silent. The two `ok:false` cases ride
 * `ctx.note({ kind: 'controller-rejected', ... })`.
 */
export type StartResult =
  | {
      ok: true;
      status: 'started' | 'replaced';
      engagement: Engagement;
      note: EngagementStartedNote;
      replaced?: readonly Engagement[];
    }
  | {
      ok: true;
      status: 'completed-sync';
      engagement: Engagement;
    }
  | {
      ok: false;
      reason: 'engagement-conflict';
      conflicts: readonly Engagement[];
    }
  | {
      ok: false;
      reason: 'start-rejected';
      error: Error;
    };

/** Lifecycle-class shape — what `registerActivity` accepts. */
export type ActivityClass = new (...args: never[]) => Engagement;

/* ─────────────────────────── Internals ─────────────────────────── */

const DURATION_FLOOR_MS = 100;

/** Build an `EngagementStartedNote` from a registered engagement. */
function buildEngagementStartedNote(
  e: Engagement,
): EngagementStartedNote {
  const note: EngagementStartedNote = {
    kind: 'engagement-started',
    engagementId: e.engagementId,
    engagementType: e.type,
    startedAt: e.startedAt,
    cancelable: e.cancelable,
  };
  if (isDurativeActivity(e)) {
    note.duration = e.duration;
  }
  return note;
}

/** Build an `ActivityUpdateEnvelope` template wrapping a single note. */
function buildActivityUpdate(
  engagementId: string,
  note: EngagementCompletedNote | EngagementCancelledNote,
): Omit<ActivityUpdateEnvelope, 'frameId'> {
  return {
    type: 'activity-update',
    engagementId,
    outcome: { notes: [note] },
  };
}

/* ─────────────────────────── SchedulerApi ─────────────────────────── */

export class SchedulerApi {
  private constructor() {}

  /* ──────────────────── internal state ──────────────────── */

  /** engagementId → live engagement instance. */
  static #engagementsById: Map<string, Engagement> = new Map();
  /** engagementId → setTimeout handle for completion. */
  static #completionTimers: Map<string, ReturnType<typeof setTimeout>> =
    new Map();
  /** engagementId → setInterval handles for emissions. */
  static #emissionTimers: Map<
    string,
    Array<ReturnType<typeof setInterval>>
  > = new Map();
  /** engagementId → host-destruction subscription. */
  static #hostSubscriptions: Map<string, Subscription<unknown>> =
    new Map();
  /** type → activity class. Lifecycle dispatch consults this. */
  static #activityRegistry: Map<string, ActivityClass> = new Map();

  /* ──────────────────── activity-class registry ──────────────────── */

  /**
   * Register `cls` under `type`. Each activity file ends with a
   * module-load side-effect block calling this. A single class may
   * register multiple types (a future `TraverseActivity` would
   * register `'walk' | 'run' | 'sneak' | …` all pointing at one
   * class). Idempotent overwrite — re-registering an existing key
   * replaces the entry, which is how HMR rotates the class
   * reference on in-flight engagements.
   */
  public static registerActivity(type: string, cls: ActivityClass): void {
    SchedulerApi.#activityRegistry.set(type, cls);
  }

  /** Returns the latest class for `type`, or `undefined`. */
  public static getActivityClass(
    type: string,
  ): ActivityClass | undefined {
    return SchedulerApi.#activityRegistry.get(type);
  }

  /**
   * Wizard-callable cache-bust. Resolves the activity class's
   * source path via `ModuleApi` and calls `HotReloadApi.reload`; the
   * re-import fires the module's top-level `registerActivity`
   * side-effect, overwriting the registry entry (and any sibling
   * entries the class self-registered for).
   *
   * Throws if `type` isn't registered or the class has no
   * `ModuleApi` stamp. Does NOT drain in-flight engagements — for
   * that, compose with `cancelByType` first per actor.
   */
  public static async reloadActivity(type: string): Promise<void> {
    const cls = SchedulerApi.#activityRegistry.get(type);
    if (!cls) {
      throw new Error(
        `SchedulerApi.reloadActivity: activity type '${type}' is not registered`,
      );
    }
    const moduleId = ModuleApi.lookup(cls);
    if (!moduleId) {
      throw new Error(
        `SchedulerApi.reloadActivity: activity class for '${type}' has no module record`,
      );
    }
    // ModuleApi.lookup returns `<path>#<exportName>` for named
    // exports; HotReloadApi.reload wants the bare path.
    const path = moduleId.split('#')[0] ?? moduleId;
    await HotReloadApi.reload(path);
  }

  /* ──────────────────── lifecycle: start ──────────────────── */

  /**
   * Register and (for `DurativeActivity`) schedule an engagement.
   * Returns one of the five `StartResult` shapes. Programmer-error
   * conditions throw — `engagementId` already in use, missing
   * required fields. World-state events (slot conflict, onStart
   * throw) return `ok: false`.
   *
   * Five-outcome contract — see the slate's "Five outcomes" block.
   */
  public static start(engagement: Engagement): StartResult {
    if (!engagement) {
      throw new Error('SchedulerApi.start: engagement is null');
    }
    if (!engagement.actor) {
      throw new Error('SchedulerApi.start: engagement has no actor');
    }
    if (!engagement.slots || engagement.slots.size === 0) {
      throw new Error(
        'SchedulerApi.start: engagement declares an empty slots set',
      );
    }

    // Slot-conflict resolution.
    const actor = engagement.actor;
    const conflicts: Engagement[] = [];
    const seenIds = new Set<string>();
    for (const slot of engagement.slots) {
      const occupant = actor.getEngagementBySlot(slot);
      if (occupant && !seenIds.has(occupant.engagementId)) {
        conflicts.push(occupant);
        seenIds.add(occupant.engagementId);
      }
    }

    if (conflicts.length > 0) {
      const allReplaceable = conflicts.every(
        (c) =>
          isDurativeActivity(c) &&
          c.replaceableBy.includes(engagement.type),
      );
      if (!allReplaceable) {
        return {
          ok: false,
          reason: 'engagement-conflict',
          conflicts,
        };
      }
      // Each replaced engagement aborts with reason 'replaced' —
      // standard cancel path, which emits its own envelope.
      for (const c of conflicts) {
        SchedulerApi.#terminate(c, 'replaced');
      }
    }

    // Stamp the engagementId before onStart so the activity can
    // observe its own identity.
    if (!engagement.engagementId) {
      engagement.engagementId = nanoid();
    }
    if (SchedulerApi.#engagementsById.has(engagement.engagementId)) {
      throw new Error(
        `SchedulerApi.start: engagementId '${engagement.engagementId}' already in use`,
      );
    }

    // onStart fires BEFORE registration / timers / wire emission.
    // A throw converts to `start-rejected` with no side effects.
    try {
      engagement.onStart();
    } catch (err) {
      return {
        ok: false,
        reason: 'start-rejected',
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    // Sub-100ms duration → in-place synchronous completion. No
    // timer, no registration on the actor, no wire start-note.
    // Controller renders completion-prose itself.
    if (
      isDurativeActivity(engagement) &&
      engagement.duration < DURATION_FLOOR_MS
    ) {
      SchedulerApi.#runOnCompleteInPlace(engagement);
      return {
        ok: true,
        status: 'completed-sync',
        engagement,
      };
    }

    // Register on the actor's slot map, on the by-id index, and
    // schedule any timers + subscriptions.
    SchedulerApi.#register(engagement);

    const note = buildEngagementStartedNote(engagement);
    if (conflicts.length > 0) {
      return {
        ok: true,
        status: 'replaced',
        engagement,
        note,
        replaced: conflicts,
      };
    }
    return {
      ok: true,
      status: 'started',
      engagement,
      note,
    };
  }

  /* ──────────────────── lifecycle: cancel family ──────────────────── */

  /**
   * Cancel a specific engagement. Idempotent — a no-op for
   * already-aborted engagements or engagementIds the scheduler
   * never saw.
   */
  public static cancel(
    engagement: Engagement,
    reason: AbortReason,
  ): void {
    if (!engagement || !engagement.engagementId) return;
    if (!SchedulerApi.#engagementsById.has(engagement.engagementId)) {
      return;
    }
    SchedulerApi.#terminate(engagement, reason);
  }

  /** Cancel every engagement on `actor` with reason `'cancelled'`. */
  public static cancelAll(actor: Stuff & Engaged): void {
    for (const e of actor.getEngagements()) {
      SchedulerApi.#terminate(e, 'cancelled');
    }
  }

  /** Cancel every engagement on `actor` whose `.type === type`. */
  public static cancelByType(
    actor: Stuff & Engaged,
    type: string,
  ): void {
    for (const e of actor.getEngagements()) {
      if (e.type === type) {
        SchedulerApi.#terminate(e, 'cancelled');
      }
    }
  }

  /**
   * Cancel every engagement on `actor` for which `pred` returns
   * true. Snapshot is taken before iteration so cleanup-driven
   * mutations of the engagement map don't trip iteration.
   */
  public static cancelByPredicate(
    actor: Stuff & Engaged,
    pred: (e: Engagement) => boolean,
  ): void {
    const snapshot = actor.getEngagements();
    for (const e of snapshot) {
      if (pred(e)) SchedulerApi.#terminate(e, 'cancelled');
    }
  }

  /* ──────────────────── introspection ──────────────────── */

  public static getEngagements(
    actor: Stuff & Engaged,
  ): readonly Engagement[] {
    return actor.getEngagements();
  }

  public static getEngagementBySlot(
    actor: Stuff & Engaged,
    slot: EngagementSlot,
  ): Engagement | undefined {
    return actor.getEngagementBySlot(slot);
  }

  public static getEngagementById(
    id: string,
  ): Engagement | undefined {
    return SchedulerApi.#engagementsById.get(id);
  }

  /* ──────────────────── internal helpers ──────────────────── */

  /**
   * Register a started engagement on its actor's slot map, the
   * by-id index, and schedule completion / emission timers plus
   * host-destruction subscription.
   */
  static #register(e: Engagement): void {
    const actor = e.actor;
    for (const slot of e.slots) {
      actor._setEngagement(slot, e);
    }
    SchedulerApi.#engagementsById.set(e.engagementId, e);

    // Host-destruction hook.
    const host = typeof e.getHost === 'function' ? e.getHost() : null;
    if (host) {
      const hostId = host.stuffId;
      const id = e.engagementId;
      const sub = EventApi.on<{ stuffId: string }>(
        Events.StuffDestructed,
        (payload) => {
          if (payload.stuffId !== hostId) return;
          // EventApi.on listeners run inside an `EventDispatch`
          // frame whose target is the Subscription object, not
          // SchedulerApi. Re-plant the root so ApiOnly-gated
          // mutators downstream pass the check.
          SchedulerApi.#runAtRoot('hostDestroyed', () => {
            const live = SchedulerApi.#engagementsById.get(id);
            if (!live) return;
            SchedulerApi.#terminate(live, 'host-destroyed');
          });
        },
      );
      SchedulerApi.#hostSubscriptions.set(
        e.engagementId,
        sub as unknown as Subscription<unknown>,
      );
    }

    // Emission timers. Timer callbacks fire outside any caller
    // frame; wrap each in `ExecutionContextApi.runRoot` with
    // SchedulerApi as the synthetic root target so the privileged
    // `EngagedMixin._setEngagement` / `_clearEngagement` calls
    // downstream of the timer pass the `ApiOnly` check.
    if (e.emissions && e.emissions.length > 0) {
      const handles: Array<ReturnType<typeof setInterval>> = [];
      for (const em of e.emissions) {
        const h = setInterval(() => {
          SchedulerApi.#runAtRoot('emission', () => {
            SchedulerApi.#fireEmission(e, em);
          });
        }, em.intervalMs);
        handles.push(h);
      }
      SchedulerApi.#emissionTimers.set(e.engagementId, handles);
    }

    // Completion timer for DurativeActivity (above the floor).
    if (isDurativeActivity(e)) {
      const id = e.engagementId;
      const t = setTimeout(() => {
        SchedulerApi.#runAtRoot('completion', () => {
          const live = SchedulerApi.#engagementsById.get(id);
          if (!live || !isDurativeActivity(live)) return;
          SchedulerApi.#completeFromTimer(live);
        });
      }, e.duration);
      SchedulerApi.#completionTimers.set(e.engagementId, t);
    }
  }

  /**
   * Plant a synthetic root frame whose target is SchedulerApi so
   * ApiOnly-gated calls (`EngagedMixin._setEngagement` /
   * `_clearEngagement`) downstream of a timer or event dispatch
   * pass the call-security check.
   */
  static #runAtRoot(method: string, fn: () => void): void {
    ExecutionContextApi.runRoot(SchedulerApi, method, fn);
  }

  /**
   * Sub-100ms in-place completion. Activity's `onComplete` runs
   * synchronously inside `start()`. No timer scheduling, no actor-
   * slot registration, no envelope (slate: "the activity never
   * appeared on the wire as in-flight"). The controller's
   * `'completed-sync'` branch renders any completion prose itself.
   *
   * `onComplete` is responsible for its own precondition
   * re-validation (slate § Transaction-style validation). Throws
   * are caught and converted to `onAbort('thrown')` — no envelope
   * either, mirroring the wire-silent completion path. The
   * engagement was never visible to the wire, so neither failure
   * mode produces a frame.
   */
  static #runOnCompleteInPlace(e: DurativeActivity): void {
    try {
      e.onComplete();
    } catch (err) {
      console.error(
        `SchedulerApi: onComplete threw for sub-100ms engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      try {
        e.onAbort('thrown');
      } catch (abortErr) {
        console.error(
          `SchedulerApi: onAbort('thrown') threw for sub-100ms ` +
            `engagement '${e.engagementId}' (type '${e.type}')`,
          abortErr,
        );
      }
    }
  }

  /**
   * Timer-fired completion of a registered `DurativeActivity`.
   * Cancels every timer the scheduler owns for this engagement,
   * unsubscribes from host-destruction, deregisters from slot map
   * + by-id index, then runs `onComplete`. The completion envelope
   * ships via `MessageApi.sendEnvelope` keyed on the actor.
   *
   * On `onComplete` throw → fall through to `terminate(e, 'thrown')`.
   */
  static #completeFromTimer(e: DurativeActivity): void {
    SchedulerApi.#clearTimersAndSubs(e.engagementId);
    SchedulerApi.#deregister(e);
    SchedulerApi.#safeInvokeComplete(e);
  }

  /**
   * Unified terminate path for cancel / replaced / host-destroyed /
   * thrown / preconditions-changed. Clears every timer and the
   * host-destruction subscription, deregisters from slot map + by-id
   * index, fires `onAbort(reason)`, ships the
   * `EngagementCancelledNote` envelope.
   */
  static #terminate(e: Engagement, reason: AbortReason): void {
    if (!SchedulerApi.#engagementsById.has(e.engagementId)) {
      // Already terminated (or never registered for the
      // completed-sync path). Idempotent no-op.
      return;
    }
    SchedulerApi.#clearTimersAndSubs(e.engagementId);
    SchedulerApi.#deregister(e);
    try {
      e.onAbort(reason);
    } catch (err) {
      // Recursive onAbort throw: logged, not retried. Engagement
      // and timers are already cleared above.
      console.error(
        `SchedulerApi.#terminate: onAbort('${reason}') threw for ` +
          `engagement '${e.engagementId}' (type '${e.type}')`,
        err,
      );
    }
    SchedulerApi.#sendCancelledEnvelope(e, reason);
  }

  /**
   * Wrapper around `onComplete` that catches throws and converts
   * to `onAbort('thrown')` per the slate's watchdog discipline.
   * On clean completion, ships the `EngagementCompletedNote`
   * envelope.
   */
  static #safeInvokeComplete(e: DurativeActivity): void {
    try {
      e.onComplete();
    } catch (err) {
      console.error(
        `SchedulerApi: onComplete threw for engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      try {
        e.onAbort('thrown');
      } catch (abortErr) {
        console.error(
          `SchedulerApi: onAbort('thrown') threw for engagement ` +
            `'${e.engagementId}' (type '${e.type}')`,
          abortErr,
        );
      }
      SchedulerApi.#sendCancelledEnvelope(e, 'thrown');
      return;
    }
    SchedulerApi.#sendCompletedEnvelope(e);
  }

  /**
   * Fire one emission tick. The emission factory can throw; the
   * watchdog catches it and converts to `onAbort('thrown')`.
   */
  static #fireEmission(
    e: Engagement,
    em: ScheduledEmission,
  ): void {
    if (!SchedulerApi.#engagementsById.has(e.engagementId)) {
      // Engagement terminated between scheduling and firing; the
      // emission timer should have been cleared but we guard
      // defensively.
      return;
    }
    const elapsed = Date.now() - e.startedAt;
    try {
      em.event({ engagement: e, actor: e.actor, elapsed });
    } catch (err) {
      console.error(
        `SchedulerApi: emission threw for engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      SchedulerApi.#terminate(e, 'thrown');
    }
  }

  /** Clear completion timer, emission timers, and host subscription. */
  static #clearTimersAndSubs(id: string): void {
    const timer = SchedulerApi.#completionTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      SchedulerApi.#completionTimers.delete(id);
    }
    const emTimers = SchedulerApi.#emissionTimers.get(id);
    if (emTimers) {
      for (const h of emTimers) clearInterval(h);
      SchedulerApi.#emissionTimers.delete(id);
    }
    const sub = SchedulerApi.#hostSubscriptions.get(id);
    if (sub) {
      try {
        sub.unsubscribe();
      } catch (err) {
        console.error(
          `SchedulerApi: host-destruction unsubscribe threw for ` +
            `engagement '${id}'`,
          err,
        );
      }
      SchedulerApi.#hostSubscriptions.delete(id);
    }
  }

  /** Remove an engagement from the actor's slot map + by-id index. */
  static #deregister(e: Engagement): void {
    const actor = e.actor;
    for (const slot of ENGAGEMENT_SLOTS) {
      const occupant = actor.getEngagementBySlot(slot);
      if (occupant && occupant.engagementId === e.engagementId) {
        actor._clearEngagement(slot);
      }
    }
    SchedulerApi.#engagementsById.delete(e.engagementId);
  }

  static #sendCompletedEnvelope(e: Engagement): void {
    // EngagedMixin has no Sensor co-requirement (slate: stationary
    // forge-bound creatures can be Engaged without being Mobile or
    // Sensor). The wire path only matters for Sensor actors — the
    // envelope routes through `Avatar.handleEnvelope` (or whatever
    // the host's onEnvelope override does); NPCs sans Sensor are
    // server-side observable but never reach a wire.
    if (!MixinApi.isSensor(e.actor)) return;
    const note: EngagementCompletedNote = {
      kind: 'engagement-completed',
      engagementId: e.engagementId,
    };
    MessageApi.sendEnvelope(
      e.actor,
      buildActivityUpdate(e.engagementId, note),
    );
  }

  static #sendCancelledEnvelope(
    e: Engagement,
    reason: AbortReason,
  ): void {
    if (!MixinApi.isSensor(e.actor)) return;
    const note: EngagementCancelledNote = {
      kind: 'engagement-cancelled',
      engagementId: e.engagementId,
      reason,
    };
    MessageApi.sendEnvelope(
      e.actor,
      buildActivityUpdate(e.engagementId, note),
    );
  }

  /* ──────────────────── test seams ──────────────────── */

  /**
   * Test seam — drop every registered engagement, every timer, every
   * subscription, and every activity-class entry. Bypasses
   * lifecycle hooks; tests use this between cases so a missed
   * cleanup doesn't bleed.
   */
  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    for (const id of SchedulerApi.#completionTimers.keys()) {
      clearTimeout(SchedulerApi.#completionTimers.get(id)!);
    }
    SchedulerApi.#completionTimers.clear();
    for (const handles of SchedulerApi.#emissionTimers.values()) {
      for (const h of handles) clearInterval(h);
    }
    SchedulerApi.#emissionTimers.clear();
    for (const sub of SchedulerApi.#hostSubscriptions.values()) {
      try {
        sub.unsubscribe();
      } catch {
        // ignore — test seam
      }
    }
    SchedulerApi.#hostSubscriptions.clear();
    SchedulerApi.#engagementsById.clear();
    SchedulerApi.#activityRegistry.clear();
  }

  /**
   * Test seam — directly drop an activity-registry entry without
   * waiting for an HMR-driven re-register. @internal
   */
  public static _unregisterActivityForTesting(type: string): void {
    SecurityApi.assertTestOnly('_unregisterActivityForTesting');
    SchedulerApi.#activityRegistry.delete(type);
  }
}

SecurityApi.decorateApiClass(SchedulerApi);
