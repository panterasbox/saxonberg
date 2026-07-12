/**
 * EmployedMixin — an actor's employment relationships.
 *
 * Composed on `Character` (actor-agnostic: NPCs are the v1 consumer, but a
 * player Avatar is employable at this relationship layer for free — only
 * the *capability* grant waits on runtime mixin composition). A sparse
 * null-default persistent field — the `BeliefStore` / `Status` precedent —
 * so an unemployed Character carries nothing.
 *
 * **Pure storage + the derived conferral read.** The mixin holds the
 * `Employment` records (as plain data) and dumb CRUD over them. It flips no
 * shift state itself: the privileged mutators are gated `ApiOnly` (the
 * `Engaged._setEngagement` precedent) so only the employment engine
 * (`EmploymentLogic`, an `obj/api/` logic singleton) writes them.
 *
 * `getConferredMixinNames()` is the knowing→doing seam the augment
 * substrate reads: the union of every **on-shift** Employment's Position
 * `confers` list. `MixinApi.collectAugmentConferralNames` picks it up via a
 * structural soft-lookup (no import), so an on-shift bartender's gated
 * `MakerMixin` goes active — and an off-shift one's goes inert.
 */

import type { MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { Employment, type EmploymentData, type EmploymentStatus } from './Employment';
import type { Business } from './Business';

/**
 * Public method surface (methods only). `employments` is public for the
 * Hydrator but is not the contract surface.
 */
export interface Employed {
  /** All employment records as value objects. */
  getEmployments(): readonly Employment[];
  /** The record at `businessPath`, or undefined. */
  getEmployment(businessPath: string): Employment | undefined;
  /** The first still-active (not quit/fired) employment, or undefined. */
  getActiveEmployment(): Employment | undefined;
  /** True iff any employment is currently on shift (sync hot-path read). */
  isOnShift(): boolean;
  /** Mixin names conferred by every on-shift Employment's Position. */
  getConferredMixinNames(): readonly string[];

  /** Privileged: set an existing record's status. `ApiOnly`. */
  _setEmploymentStatus(businessPath: string, status: EmploymentStatus): void;
  /** Privileged: replace-or-append a full record. `ApiOnly`. */
  _upsertEmployment(record: EmploymentData): void;
  /** Privileged: drop the record at `businessPath`. `ApiOnly`. */
  _removeEmployment(businessPath: string): void;
}

/** The terminal (no-longer-working) statuses. */
const INACTIVE: readonly EmploymentStatus[] = ['quit', 'fired'];

export function EmployedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class EmployedMixin extends Base implements Employed {
    static _mixinName = 'EmployedMixin';

    static persistentFields = ['employments'];

    /**
     * Stored employment records (plain data). Sparse: `null` on an
     * unemployed Character (nothing written to the doc). Wrapped into
     * `Employment` value objects on read.
     * @runtimeState
     */
    public employments: EmploymentData[] | null = null;

    public getEmployments(): readonly Employment[] {
      return (this.employments ?? []).map((e) => Employment.fromData(e));
    }

    public getEmployment(businessPath: string): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => e.businessPath === businessPath,
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public getActiveEmployment(): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => !INACTIVE.includes(e.status),
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public isOnShift(): boolean {
      return (this.employments ?? []).some((e) => e.status === 'on-shift');
    }

    public getConferredMixinNames(): readonly string[] {
      const store = this.employments ?? [];
      if (store.length === 0) return [];
      const out = new Set<string>();
      for (const e of store) {
        if (e.status !== 'on-shift') continue;
        const business = StuffApi.findByTemplatePath(
          e.businessPath,
        ) as unknown as Business | null;
        if (!business || typeof business.getPosition !== 'function') continue;
        const position = business.getPosition(e.positionKey);
        if (!position) continue;
        for (const name of position.confers) out.add(name);
      }
      return [...out];
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _setEmploymentStatus(
      businessPath: string,
      status: EmploymentStatus,
    ): void {
      const store = this.employments;
      if (!store) return;
      const record = store.find((e) => e.businessPath === businessPath);
      if (!record) return;
      record.status = status;
      // Leaving a shift clears the running-shift stamp; the on-transition
      // stamp is set by the engine via `_upsertEmployment` (it owns the
      // clock).
      if (status !== 'on-shift') record.onShiftSince = null;
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _upsertEmployment(record: EmploymentData): void {
      if (this.employments === null) this.employments = [];
      const idx = this.employments.findIndex(
        (e) => e.businessPath === record.businessPath,
      );
      if (idx >= 0) this.employments[idx] = record;
      else this.employments.push(record);
    }

    @CallSecurity(SecurityPolicies.ApiOnly)
    @Final
    @Unshadowable
    public _removeEmployment(businessPath: string): void {
      if (!this.employments) return;
      this.employments = this.employments.filter(
        (e) => e.businessPath !== businessPath,
      );
    }
  }

  return EmployedMixin;
}
