/**
 * SchedulerRegistry — singleton Idea holding engagement-framework
 * runtime state. Lives at `/platform/idea/SchedulerRegistry`. The thin
 * `SchedulerApi` facade at `api/scheduler.ts` is the only legitimate
 * caller — every public method on this class carries
 * `@CallSecurity(FromModule('/api/scheduler#SchedulerApi'))` so the
 * security gate denies any other module's call. External code that
 * grabs the Registry instance via `StuffApi.findByTemplatePath` gets a
 * reference but `SecurityError` is thrown on any method call.
 *
 * State held here:
 *   - `engagementsById` — engagementId → live engagement instance.
 *   - `completionTimers` — engagementId → world-clock handle for the
 *     scheduled `onComplete`.
 *   - `emissionTimers` — engagementId → world-clock handles for the
 *     per-engagement emission cadence.
 *   - `hostSubscriptions` — engagementId → EventApi subscription
 *     watching for the host's destruction.
 *   - `activityRegistry` — type → activity class. Lifecycle dispatch
 *     consults this so HMR-reloaded activity classes apply to in-flight
 *     engagements.
 *
 * HMR-aware: reload of `api/scheduler.ts` only drops the cached
 * pointer in the Api; this Stuff's state survives. Reload of THIS file
 * re-clones the Registry (state resets, `postRegister` re-runs
 * idempotently) per HotReloadApi's pattern.
 */

import { SecurityApi } from '../../api/security';
import type {
  ActivityUpdateEnvelope,
  AbortReason,
  EngagementCancelledNote,
  EngagementCompletedNote,
  EngagementStartedNote,
} from '@saxonberg/types';
import { Idea } from '../../lib/stuff/Idea';
import type { VetoResult } from '../../lib/errors';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import {
  type Engaged,
  ENGAGEMENT_SLOTS,
} from '../../lib/activity/Engaged';
import { EventApi, type Subscription } from '../../api/event';
import { Events } from '../../lib/events';
import {
  ExecutionContextApi,
  OMNI_SCOPE,
} from '../../api/execution-context';
import { HotReloadApi } from '../../api/hot-reload';
import { MessageApi } from '../../api/message';
import { MixinApi } from '../../api/mixin';
import { ModuleApi } from '../../api/module';
import { WorldClockApi, type ClockHandle } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { SchedulerApi } from '../../api/scheduler';
import type {
  ActivityClass,
  DurativeActivity,
  Engagement,
  ScheduledEmission,
  StartResult,
} from '../../api/scheduler';

/**
 * See WorldClockRegistry — same gate shape, same rationale. Admits the
 * Api facade, the `SchedulerLogic` singleton (caller template path
 * `/platform/idea/api/scheduler`, which actually forwards every call), and
 * internal `this.foo()` self-calls.
 */
const SchedulerApiCallers = SecurityPolicies.AnyOf(
  SecurityPolicies.FromModule('/api/scheduler#SchedulerApi'),
  SecurityPolicies.FromTemplate('/platform/idea/api/scheduler'),
  SecurityPolicies.SelfOnly,
);

const DURATION_FLOOR_MS = 100;

function isDurativeActivity(e: Engagement): e is DurativeActivity {
  return typeof (e as DurativeActivity).duration === 'number';
}

function buildEngagementStartedNote(e: Engagement): EngagementStartedNote {
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

export default class SchedulerRegistry extends Idea {

  /**
   * Residency veto - a load-bearing process-lifetime singleton is
   * never culled by the self-eviction sweep.
   */
  public canEvict(_context: EvictionContext): VetoResult {
    return { ok: false, reason: 'system singleton; never culled' };
  }
  private engagementsById: Map<string, Engagement> = new Map();
  private completionTimers: Map<string, ClockHandle> = new Map();
  private emissionTimers: Map<string, ClockHandle[]> = new Map();
  private hostSubscriptions: Map<string, Subscription<unknown>> = new Map();
  private activityRegistry: Map<string, ActivityClass> = new Map();

  /* ─────────────── activity-class dispatch index ───────────────
   *
   * type → class, populated by **capture-at-start** (see `start`) —
   * there is NO registration step. The index exists so lifecycle
   * dispatch (`dispatchOnComplete`/`dispatchOnAbort`/`dispatchGetHost`)
   * calls the freshest class's prototype methods on in-flight
   * engagement instances — the HMR re-point seam.
   */

  @CallSecurity(SchedulerApiCallers)
  public getActivityClass(type: string): ActivityClass | undefined {
    return this.activityRegistry.get(type);
  }

  @CallSecurity(SchedulerApiCallers)
  public async reloadActivity(type: string): Promise<void> {
    const cls = this.activityRegistry.get(type);
    if (!cls) {
      throw new Error(
        `SchedulerApi.reloadActivity: activity type '${type}' has not been ` +
          `started this session (capture-at-start), so there is nothing ` +
          `to re-point — the next start picks up the fresh class anyway`,
      );
    }
    const moduleId = ModuleApi.lookup(cls);
    if (!moduleId) {
      throw new Error(
        `SchedulerApi.reloadActivity: activity class for '${type}' has no module record`,
      );
    }
    const [path, exportName] = moduleId.includes('#')
      ? (moduleId.split('#') as [string, string])
      : [moduleId, cls.name];
    await HotReloadApi.reload(path);
    // Re-point the dispatch index explicitly — module re-eval no longer
    // self-registers (capture-at-start replaced module-scope
    // registration), so in-flight engagements of this type only see the
    // fresh class if we swap it in here.
    const next = HotReloadApi.getCurrentExport(path, exportName);
    if (next) this.activityRegistry.set(type, next as ActivityClass);
  }

  /* ──────────────────── lifecycle: start ──────────────────── */

  @CallSecurity(SchedulerApiCallers)
  public start(engagement: Engagement): StartResult {
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

    // Capture-at-start: the instance carries its class, so starting IS
    // what populates the type→class dispatch index. Latest start wins —
    // after a hot reload, the next start of a type re-points dispatch
    // for every in-flight engagement of that type.
    //
    // Sandbox needs-a-guard: the index is a free-string global — a
    // circle start must not RE-POINT dispatch for in-flight field
    // engagements of the same type. A circle-novel type still registers
    // (its own dispatch needs the entry; the class is wizard code).
    const startScope = ExecutionContextApi.getCircleScope();
    const scopedStart = startScope !== null && startScope !== OMNI_SCOPE;
    if (!scopedStart || !this.activityRegistry.has(engagement.type)) {
      this.activityRegistry.set(
        engagement.type,
        engagement.constructor as ActivityClass,
      );
    }

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
      for (const c of conflicts) {
        this.terminate(c, 'replaced');
      }
    }

    if (!engagement.engagementId) {
      engagement.engagementId = SecurityApi.uuid();
    }
    if (this.engagementsById.has(engagement.engagementId)) {
      throw new Error(
        `SchedulerApi.start: engagementId '${engagement.engagementId}' already in use`,
      );
    }

    try {
      engagement.onStart();
    } catch (err) {
      return {
        ok: false,
        reason: 'start-rejected',
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    if (
      isDurativeActivity(engagement) &&
      engagement.duration < DURATION_FLOOR_MS
    ) {
      this.runOnCompleteInPlace(engagement);
      return {
        ok: true,
        status: 'completed-sync',
        engagement,
      };
    }

    this.register(engagement);

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

  @CallSecurity(SchedulerApiCallers)
  public cancel(engagement: Engagement, reason: AbortReason): void {
    if (!engagement || !engagement.engagementId) return;
    if (!this.engagementsById.has(engagement.engagementId)) return;
    this.terminate(engagement, reason);
  }

  @CallSecurity(SchedulerApiCallers)
  public cancelAll(actor: Stuff & Engaged): void {
    for (const e of actor.getEngagements()) {
      this.terminate(e, 'cancelled');
    }
  }

  @CallSecurity(SchedulerApiCallers)
  public cancelByType(actor: Stuff & Engaged, type: string): void {
    for (const e of actor.getEngagements()) {
      if (e.type === type) {
        this.terminate(e, 'cancelled');
      }
    }
  }

  @CallSecurity(SchedulerApiCallers)
  public cancelByPredicate(
    actor: Stuff & Engaged,
    pred: (e: Engagement) => boolean,
  ): void {
    const snapshot = actor.getEngagements();
    for (const e of snapshot) {
      if (pred(e)) this.terminate(e, 'cancelled');
    }
  }

  /* ──────────────────── introspection ──────────────────── */

  @CallSecurity(SchedulerApiCallers)
  public getEngagementById(id: string): Engagement | undefined {
    return this.engagementsById.get(id);
  }

  /* ──────────────────── test seams ──────────────────── */

  @CallSecurity(SchedulerApiCallers)
  public _clearAllForTesting(): void {
    for (const h of this.completionTimers.values()) {
      h.cancel();
    }
    this.completionTimers.clear();
    for (const handles of this.emissionTimers.values()) {
      for (const h of handles) h.cancel();
    }
    this.emissionTimers.clear();
    for (const sub of this.hostSubscriptions.values()) {
      try {
        sub.unsubscribe();
      } catch {
        // ignore — test seam
      }
    }
    this.hostSubscriptions.clear();
    this.engagementsById.clear();
    this.activityRegistry.clear();
  }

  @CallSecurity(SchedulerApiCallers)
  public _unregisterActivityForTesting(type: string): void {
    this.activityRegistry.delete(type);
  }

  /* ──────────────────── internal helpers ──────────────────── */

  private register(e: Engagement): void {
    const actor = e.actor;
    // Direct participant call: `_setEngagement` is gated on THIS
    // registry (`FromTemplate('/platform/idea/SchedulerRegistry')`), so the
    // registry calls as itself — no synthetic SchedulerApi root needed.
    for (const slot of e.slots) {
      actor._setEngagement(slot, e);
    }
    this.engagementsById.set(e.engagementId, e);

    const host = this.dispatchGetHost(e);
    if (host) {
      const hostId = host.stuffId;
      const id = e.engagementId;
      const sub = EventApi.on<{ stuffId: string }>(
        Events.StuffDestructed,
        (payload) => {
          if (payload.stuffId !== hostId) return;
          ExecutionContextApi.runRoot(
            SchedulerApi,
            'hostDestroyed',
            () => {
              const live = this.engagementsById.get(id);
              if (!live) return;
              this.terminate(live, 'host-destroyed');
            },
            { circleScope: OMNI_SCOPE },
          );
        },
      );
      this.hostSubscriptions.set(
        e.engagementId,
        sub as unknown as Subscription<unknown>,
      );
    }

    if (e.emissions && e.emissions.length > 0) {
      const handles: ClockHandle[] = [];
      for (const em of e.emissions) {
        const h = WorldClockApi.every(
          Quantity.of(em.intervalMs / 1000, 's'),
          () => {
            // Guarded('swallow'): a throwing emission handler is recorded
            // as a runtime diagnostic and swallowed — a clock tick has no
            // caller to rethrow to, and swallowing keeps the cadence alive.
            // The engagement's continuation runs under its actor's
            // stamped scope — a circle actor's engagement stays
            // circle-governed across every async tick.
            const actorScope = e.actor.getCircleScope();
            void ExecutionContextApi.runRootGuarded(
              SchedulerApi,
              'emission',
              () => this.fireEmission(e, em),
              'swallow',
              actorScope !== null ? { circleScope: actorScope } : undefined
            );
          },
        );
        handles.push(h);
      }
      this.emissionTimers.set(e.engagementId, handles);
    }

    if (isDurativeActivity(e)) {
      const id = e.engagementId;
      const h = WorldClockApi.after(
        Quantity.of(e.duration / 1000, 's'),
        () => {
          const actorScope = e.actor.getCircleScope();
          ExecutionContextApi.runRoot(
            SchedulerApi,
            'completion',
            () => {
              const live = this.engagementsById.get(id);
              if (!live || !isDurativeActivity(live)) return;
              this.completeFromTimer(live);
            },
            actorScope !== null ? { circleScope: actorScope } : undefined,
          );
        },
      );
      this.completionTimers.set(e.engagementId, h);
    }
  }

  private runOnCompleteInPlace(e: DurativeActivity): void {
    try {
      this.dispatchOnComplete(e);
    } catch (err) {
      console.error(
        `SchedulerApi: onComplete threw for sub-100ms engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      try {
        this.dispatchOnAbort(e, 'thrown');
      } catch (abortErr) {
        console.error(
          `SchedulerApi: onAbort('thrown') threw for sub-100ms ` +
            `engagement '${e.engagementId}' (type '${e.type}')`,
          abortErr,
        );
      }
    }
  }

  private completeFromTimer(e: DurativeActivity): void {
    this.clearTimersAndSubs(e.engagementId);
    this.deregister(e);
    this.safeInvokeComplete(e);
  }

  private terminate(e: Engagement, reason: AbortReason): void {
    if (!this.engagementsById.has(e.engagementId)) return;
    this.clearTimersAndSubs(e.engagementId);
    this.deregister(e);
    try {
      this.dispatchOnAbort(e, reason);
    } catch (err) {
      console.error(
        `SchedulerApi.terminate: onAbort('${reason}') threw for ` +
          `engagement '${e.engagementId}' (type '${e.type}')`,
        err,
      );
    }
    this.sendCancelledEnvelope(e, reason);
  }

  private safeInvokeComplete(e: DurativeActivity): void {
    try {
      this.dispatchOnComplete(e);
    } catch (err) {
      console.error(
        `SchedulerApi: onComplete threw for engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      try {
        this.dispatchOnAbort(e, 'thrown');
      } catch (abortErr) {
        console.error(
          `SchedulerApi: onAbort('thrown') threw for engagement ` +
            `'${e.engagementId}' (type '${e.type}')`,
          abortErr,
        );
      }
      this.sendCancelledEnvelope(e, 'thrown');
      return;
    }
    this.sendCompletedEnvelope(e);
  }

  private dispatchOnComplete(e: DurativeActivity): void {
    const cls = this.activityRegistry.get(e.type);
    if (!cls) {
      console.warn(
        `SchedulerApi: activity class for type '${e.type}' is not ` +
          `registered at completion; aborting engagement ` +
          `'${e.engagementId}' with 'thrown'.`,
      );
      this.dispatchOnAbort(e, 'thrown');
      return;
    }
    (cls.prototype as DurativeActivity).onComplete.call(e);
  }

  private dispatchOnAbort(e: Engagement, reason: AbortReason): void {
    const cls = this.activityRegistry.get(e.type);
    if (!cls) {
      console.warn(
        `SchedulerApi: activity class for type '${e.type}' is not ` +
          `registered; skipping onAbort('${reason}') for ` +
          `engagement '${e.engagementId}'.`,
      );
      return;
    }
    (cls.prototype as Engagement).onAbort.call(e, reason);
  }

  private dispatchGetHost(e: Engagement): Stuff | null {
    const cls = this.activityRegistry.get(e.type);
    if (!cls) return null;
    const proto = cls.prototype as Engagement;
    if (typeof proto.getHost !== 'function') return null;
    return proto.getHost.call(e) ?? null;
  }

  private fireEmission(e: Engagement, em: ScheduledEmission): void {
    if (!this.engagementsById.has(e.engagementId)) return;
    const elapsed = WorldClockApi.getNow().rawValue() * 1000 - e.startedAt;
    try {
      em.event({ engagement: e, actor: e.actor, elapsed });
    } catch (err) {
      console.error(
        `SchedulerApi: emission threw for engagement ` +
          `'${e.engagementId}' (type '${e.type}'); aborting with 'thrown'`,
        err,
      );
      this.terminate(e, 'thrown');
    }
  }

  private clearTimersAndSubs(id: string): void {
    const timer = this.completionTimers.get(id);
    if (timer) {
      timer.cancel();
      this.completionTimers.delete(id);
    }
    const emTimers = this.emissionTimers.get(id);
    if (emTimers) {
      for (const h of emTimers) h.cancel();
      this.emissionTimers.delete(id);
    }
    const sub = this.hostSubscriptions.get(id);
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
      this.hostSubscriptions.delete(id);
    }
  }

  private deregister(e: Engagement): void {
    const actor = e.actor;
    // Direct participant call — see `register` for the gating note.
    for (const slot of ENGAGEMENT_SLOTS) {
      const occupant = actor.getEngagementBySlot(slot);
      if (occupant && occupant.engagementId === e.engagementId) {
        actor._clearEngagement(slot);
      }
    }
    this.engagementsById.delete(e.engagementId);
  }

  private sendCompletedEnvelope(e: Engagement): void {
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

  private sendCancelledEnvelope(e: Engagement, reason: AbortReason): void {
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
}

