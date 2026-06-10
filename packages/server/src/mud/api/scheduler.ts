/**
 * SchedulerApi — thin facade over the `SchedulerRegistry` singleton.
 *
 * Stable caller-facing surface for the engagement framework's runtime.
 * Every state-touching method delegates to the Registry; the Registry's
 * methods carry `@CallSecurity(FromModule('mud/api/scheduler#SchedulerApi'))`
 * so the security gate denies any caller outside this module. External
 * code that grabs the Registry Stuff via `StuffApi.findByTemplatePath`
 * cannot call its methods; this Api is the only legitimate path.
 *
 * State lives on the Registry (engagement by-id index, completion /
 * emission timers, host-destruction subscriptions, activity-class
 * registry). Reload of this file invalidates only the cached pointer;
 * reload of `obj/SchedulerRegistry.ts` re-clones the Stuff per
 * HotReloadApi's pattern (state resets, `postRegister` re-runs
 * idempotently).
 *
 * The narrow-entry pattern: `SchedulerApi` is reachable from anywhere,
 * mediating every call into the Registry. State has one home, one
 * calling surface, and one structurally-enforced path between them.
 *
 * Thin Api-facade methods remain undecorated — the gate is enforced on
 * the Registry side. `SecurityApi.decorateApiClass` at the bottom
 * stamps frame-push wrappers on every static method so downstream
 * `ApiOnly` checks find `SchedulerApi` on the stack.
 */

import type {
  AbortReason,
  EngagementCancelledNote,
  EngagementCompletedNote,
  EngagementStartedNote,
} from '@saxonberg/types';
import type { Stuff } from '../lib/stuff/Stuff';
import type { Engaged, EngagementSlot } from '../lib/activity/Engaged';
import { SecurityApi } from './security';
import { StuffApi } from './stuff';
import type SchedulerRegistry from '../obj/SchedulerRegistry';

/* ─────────────────────────── public surface types ─────────────────────────── */

/**
 * Activity-specific cadenced side-effect descriptor.
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
 * Base shape of an engagement. Both `DurativeActivity` (timed) and
 * `SustainedEngagement` (untimed) satisfy this.
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

export interface DurativeActivity extends Engagement {
  readonly duration: number;
  readonly replaceableBy: readonly string[];
  onComplete(): void;
}

export type SustainedEngagement = Engagement;

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

// Re-export the note types so consumers don't need a second import.
export type {
  EngagementStartedNote,
  EngagementCompletedNote,
  EngagementCancelledNote,
};

/* ─────────────────────────── SchedulerApi ─────────────────────────── */

const REGISTRY_PATH = '/obj/SchedulerRegistry';

export class SchedulerApi {
  private constructor() {}

  static #registryRef: SchedulerRegistry | null = null;
  static #registryClass: (new () => SchedulerRegistry) | null = null;

  /** @internal — called from `obj/SchedulerRegistry.ts` module body. */
  public static _registerRegistryClass(
    cls: new () => SchedulerRegistry,
  ): void {
    SchedulerApi.#registryClass = cls;
  }

  static #lookupRegistry(): SchedulerRegistry | null {
    if (SchedulerApi.#registryRef) return SchedulerApi.#registryRef;
    const reg = StuffApi.findByTemplatePath<SchedulerRegistry>(REGISTRY_PATH);
    if (reg) SchedulerApi.#registryRef = reg;
    return reg ?? null;
  }

  /**
   * Resolve the Registry, lazy-creating a transient in-memory instance
   * if `BootstrapManager.run()` hasn't seeded one yet. Production hits
   * the manifest path; tests fall through here. See WorldClockApi for
   * the import-cycle rationale behind the class-registration pattern.
   */
  static #registry(): SchedulerRegistry {
    const existing = SchedulerApi.#lookupRegistry();
    if (existing) return existing;
    if (!SchedulerApi.#registryClass) {
      throw new Error(
        'SchedulerApi: SchedulerRegistry not bootstrapped and its ' +
          'class is not registered. Either run BootstrapManager.run() ' +
          "or import '../obj/SchedulerRegistry' so its module-load " +
          'side effect registers the class.',
      );
    }
    const reg = StuffApi.createSync<SchedulerRegistry>(
      () => new SchedulerApi.#registryClass!(),
    );
    reg.setTemplatePath(REGISTRY_PATH);
    SchedulerApi.#registryRef = reg;
    return reg;
  }

  /* ──────────────────── activity-class registry ──────────────────── */

  public static registerActivity(type: string, cls: ActivityClass): void {
    SchedulerApi.#registry().registerActivity(type, cls);
  }

  public static getActivityClass(type: string): ActivityClass | undefined {
    return SchedulerApi.#registry().getActivityClass(type);
  }

  public static async reloadActivity(type: string): Promise<void> {
    await SchedulerApi.#registry().reloadActivity(type);
  }

  /* ──────────────────── lifecycle: start ──────────────────── */

  public static start(engagement: Engagement): StartResult {
    return SchedulerApi.#registry().start(engagement);
  }

  /* ──────────────────── lifecycle: cancel family ──────────────────── */

  public static cancel(engagement: Engagement, reason: AbortReason): void {
    SchedulerApi.#registry().cancel(engagement, reason);
  }

  public static cancelAll(actor: Stuff & Engaged): void {
    SchedulerApi.#registry().cancelAll(actor);
  }

  public static cancelByType(actor: Stuff & Engaged, type: string): void {
    SchedulerApi.#registry().cancelByType(actor, type);
  }

  public static cancelByPredicate(
    actor: Stuff & Engaged,
    pred: (e: Engagement) => boolean,
  ): void {
    SchedulerApi.#registry().cancelByPredicate(actor, pred);
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

  public static getEngagementById(id: string): Engagement | undefined {
    return SchedulerApi.#registry().getEngagementById(id);
  }

  /* ──────────────────── HMR / test seams ──────────────────── */

  /**
   * HMR seam: drop the cached Registry pointer so the next call
   * re-resolves. Called when `api/scheduler.ts` is reloaded.
   * Registry state itself is unaffected.
   * @internal
   */
  public static _resetRegistryRefForReload(): void {
    SchedulerApi.#registryRef = null;
  }

  public static _clearAllForTesting(): void {
    SecurityApi.assertTestOnly('_clearAllForTesting');
    const reg = SchedulerApi.#lookupRegistry();
    if (reg) reg._clearAllForTesting();
  }

  public static _unregisterActivityForTesting(type: string): void {
    SecurityApi.assertTestOnly('_unregisterActivityForTesting');
    const reg = SchedulerApi.#lookupRegistry();
    if (reg) reg._unregisterActivityForTesting(type);
  }
}

SecurityApi.decorateApiClass(SchedulerApi);
