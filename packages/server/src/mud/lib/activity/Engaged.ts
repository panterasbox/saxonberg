/**
 * EngagedMixin — actor-side engagement slot map.
 *
 * Carries the runtime map of `EngagementSlot → Engagement`. An actor
 * composes `EngagedMixin` when they can hold engagements (Avatars,
 * creature NPCs, future vehicles that run their own walk activity, …).
 * The map is runtime-only — engagements do NOT persist, and
 * `_engagements` is intentionally absent from `persistentFields`.
 *
 * Method-only contract per the inter-stuff rule: outsiders read via
 * `getEngagement*`, never via field access. The privileged mutators
 * `_setEngagement` / `_clearEngagement` are decorated `@CallSecurity
 * (SecurityPolicies.ApiOnly)` + `@Final @Unshadowable` — only
 * `SchedulerApi` may invoke them, and no subclass / shadow can replace
 * or bypass them. This preserves the invariant that every entry in
 * the map corresponds to a live timer-and-subscription registration
 * the scheduler owns.
 *
 * Default aliases: ships `stop → cancel` so the player verb `stop`
 * resolves to the `cancel` controller. Picked up by `AliasMixin` via
 * `collectDefaultAliases`'s mixin-chain walk; harmless on actors that
 * compose `EngagedMixin` without `AliasMixin` (NPCs, vehicles).
 */

import type { MixinConstructor } from '../mixin';
import type { Engagement } from '../../api/scheduler';
import type { DefaultAliasEntry } from '../shell/Alias';
import type { CommandContributions } from '../../api/command';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';

export type EngagementSlot = 'body' | 'hands' | 'attention' | 'voice';

export const ENGAGEMENT_SLOTS: readonly EngagementSlot[] = [
  'body',
  'hands',
  'attention',
  'voice',
] as const;

/**
 * Public method surface for EngagedMixin. Read methods are open; the
 * `_setEngagement` / `_clearEngagement` mutators reject every caller
 * outside `SchedulerApi` at runtime (call-security `ApiOnly`).
 */
export interface Engaged {
  /** Snapshot of distinct engagements occupying any slot on this actor. */
  getEngagements(): readonly Engagement[];
  /** Engagement currently occupying `slot`, or undefined. */
  getEngagementBySlot(slot: EngagementSlot): Engagement | undefined;
  /** First engagement whose `.type` matches, or undefined. */
  getEngagementByType(type: string): Engagement | undefined;
  /** True iff `slot` has an engagement. */
  hasEngagement(slot: EngagementSlot): boolean;

  /**
   * Privileged mutator — only `SchedulerApi` may call. Runtime-rejected
   * outside `api/` by the call-security gate.
   */
  _setEngagement(slot: EngagementSlot, engagement: Engagement): void;
  /** Privileged mutator — same gating as `_setEngagement`. */
  _clearEngagement(slot: EngagementSlot): void;
}

export function EngagedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class EngagedMixin extends Base {
    static _mixinName = 'EngagedMixin';

    /**
     * Actor-side `cancel` verb — every Engaged thing can cancel its
     * own in-flight activities. Wave 1 ships the verb against an
     * empty engagement map (no v1 producers register engagements
     * yet); the verb stays useful and accurate ("nothing to cancel")
     * until Wave 2+ content earns it.
     */
    static commandContributions: CommandContributions = {
      self: ['cancel.yaml'],
      environment: [],
      inventory: [],
      peers: [],
    };

    /**
     * Default aliases contributed when the host also composes
     * `AliasMixin` — collected via `MixinApi.queryMixins` at alias-
     * resolution time. `stop` is the slate-mandated synonym; add more
     * synonyms here as content earns them.
     */
    static defaultAliases: DefaultAliasEntry[] = [
      {
        name: 'stop',
        body: 'cancel',
        description: 'cancel in-flight activities',
      },
    ];

    /**
     * Runtime-only map. Deliberately NOT in `persistentFields`: a
     * reloaded actor wakes up with no live engagements (no timers to
     * recover, no subscriptions to re-stitch). Mirrors
     * `Mobile._engagedModePath`'s runtime-only treatment today.
     */
    private _engagements: Map<EngagementSlot, Engagement> = new Map();

    public getEngagements(): readonly Engagement[] {
      // Distinct instances — a multi-slot engagement appears once.
      return Array.from(new Set(this._engagements.values()));
    }

    public getEngagementBySlot(
      slot: EngagementSlot,
    ): Engagement | undefined {
      return this._engagements.get(slot);
    }

    public getEngagementByType(type: string): Engagement | undefined {
      for (const e of new Set(this._engagements.values())) {
        if (e.type === type) return e;
      }
      return undefined;
    }

    public hasEngagement(slot: EngagementSlot): boolean {
      return this._engagements.has(slot);
    }

    /**
     * Set the engagement for `slot`. Locked down by
     * `@CallSecurity(SecurityPolicies.ApiOnly)` — only callers under
     * `mud/api/` (in practice, `SchedulerApi`) may invoke. `@Final
     * @Unshadowable` because the engagement map is a framework
     * invariant — a subclass override or shadow that lied about the
     * write would leave the scheduler's timer set out of sync with the
     * map.
     */
    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setEngagement(
      slot: EngagementSlot,
      engagement: Engagement,
    ): void {
      this._engagements.set(slot, engagement);
    }

    /**
     * Clear `slot`'s engagement. Same lockdown as `_setEngagement`.
     * Idempotent on absent slots.
     */
    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _clearEngagement(slot: EngagementSlot): void {
      this._engagements.delete(slot);
    }
  }

  return EngagedMixin;
}
