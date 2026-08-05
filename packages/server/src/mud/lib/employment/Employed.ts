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
 * shift state itself: the privileged mutators are written under a
 * **participant contract** — the organization party to the record (its
 * transition methods `hire`/`endEmployment`/`ensureRostered`/`beginShift`/
 * `endShift`/`beginCover`/`endCover` are the callers), with a narrow
 * janitorial arm for the employment engine.
 *
 * `getConferredMixinNames()` is the knowing→doing seam the augment
 * substrate reads: the union of every **on-shift** Employment's Position
 * `confers` list. `MixinApi.collectAugmentConferralNames` picks it up via a
 * structural soft-lookup (no import), so an on-shift bartender's gated
 * `MakerMixin` goes active — and an off-shift one's goes inert.
 */

import { Mixins, type MixinConstructor, type FieldMeta } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import { CallSecurity, Final, Unshadowable } from '../security/decorators';
import { SecurityPolicies } from '../security/SecurityPolicies';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { Employment, type EmploymentData, type EmploymentStatus } from './Employment';

/**
 * A stored record as it may actually be on disk: pre-split rows carry
 * `businessPath` where current ones carry `organizationPath`. Every raw
 * read below goes through {@link recordKey} rather than either name, so
 * the two shapes coexist with no migration.
 */
type StoredEmployment = EmploymentData & { businessPath?: string };

/** The counterparty key of a stored record, whichever name it was written under. */
function recordKey(record: StoredEmployment): string {
  return record.organizationPath ?? record.businessPath ?? '';
}

/**
 * The participant contract on an employment-record write: the caller is
 * **the organization party to the record** — an `OrganizationMixin`
 * composer whose own path is the record key being written
 * (`_upsertEmployment` carries it inside the record; the other two take it
 * as the first argument). An organization can never touch a record it
 * isn't party to. The employment engine keeps a narrow janitorial arm
 * (`FromTemplate('/obj/api/employment')`) for records whose organization
 * Idea isn't standing (lazy standup means a `quit` can outlive its
 * organization's live instance).
 */
const ByEmployingOrganization = SecurityPolicies.AnyOf(
  SecurityPolicies.FromMixin(Mixins.Organization, {
    where: (caller, _target, method, args) => {
      const path = (caller as Stuff).getTemplatePath() ?? '';
      if (!path) return false;
      const keyed =
        method === '_upsertEmployment'
          ? recordKey((args[0] ?? {}) as StoredEmployment)
          : (args[0] as string | undefined);
      return keyed === path;
    },
  }),
  SecurityPolicies.FromTemplate('/obj/api/employment'),
);

/**
 * Public method surface (methods only). `employments` is public for the
 * Hydrator but is not the contract surface.
 */
export interface Employed {
  /** All employment records as value objects. */
  getEmployments(): readonly Employment[];
  /** The record at `organizationPath`, or undefined. */
  getEmployment(organizationPath: string): Employment | undefined;
  /** The first still-active (not quit/fired) employment, or undefined. */
  getActiveEmployment(): Employment | undefined;
  /**
   * Every still-active employment — *what does this actor hold, anywhere?*
   * The inverse of an organization's who-holds-P read, and identical for a
   * ministry, a shop and a publisher.
   */
  getActiveEmployments(): readonly Employment[];
  /** True iff any employment is currently on shift (sync hot-path read). */
  isOnShift(): boolean;
  /** Mixin names conferred by every on-shift Employment's Position. */
  getConferredMixinNames(): readonly string[];

  /** Participant-gated: set an existing record's status — written by the
   * organization party to the record. */
  _setEmploymentStatus(
    organizationPath: string,
    status: EmploymentStatus,
  ): void;
  /** Participant-gated: replace-or-append a full record — written by the
   * organization party to the record. */
  _upsertEmployment(record: EmploymentData): void;
  /** Participant-gated: drop the record at `organizationPath` — written by
   * the organization party to the record. */
  _removeEmployment(organizationPath: string): void;
}

/** The terminal (no-longer-working) statuses. */
const INACTIVE: readonly EmploymentStatus[] = ['quit', 'fired'];

export function EmployedMixin<TBase extends MixinConstructor>(Base: TBase) {
  class EmployedMixin extends Base implements Employed {
    static _mixinName = 'EmployedMixin';

    static fieldMeta: FieldMeta = {
      employments: { persistent: true, runtimeState: true },
    };

    /**
     * Stored employment records (plain data). Sparse: `null` on an
     * unemployed Character (nothing written to the doc). Wrapped into
     * `Employment` value objects on read.
     */
    public employments: StoredEmployment[] | null = null;

    public getEmployments(): readonly Employment[] {
      return (this.employments ?? []).map((e) => Employment.fromData(e));
    }

    public getEmployment(organizationPath: string): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => recordKey(e) === organizationPath,
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public getActiveEmployment(): Employment | undefined {
      const found = (this.employments ?? []).find(
        (e) => !INACTIVE.includes(e.status),
      );
      return found ? Employment.fromData(found) : undefined;
    }

    public getActiveEmployments(): readonly Employment[] {
      return (this.employments ?? [])
        .filter((e) => !INACTIVE.includes(e.status))
        .map((e) => Employment.fromData(e));
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
        const organization = StuffApi.findByTemplatePath(recordKey(e));
        // ⚠ `MixinApi.isOrganization`, not `typeof x.getPosition ===
        // 'function'`. The duck-type predates the predicate — this build
        // is what added `Mixins.Organization` — and it narrows by shape,
        // so anything that happens to expose a `getPosition` would satisfy
        // it while a genuine organization behind a shadow might not.
        if (!organization || !MixinApi.isOrganization(organization)) continue;
        const position = organization.getPosition(e.positionKey);
        if (!position) continue;
        for (const name of position.confers) out.add(name);
      }
      return [...out];
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _setEmploymentStatus(
      organizationPath: string,
      status: EmploymentStatus,
    ): void {
      const store = this.employments;
      if (!store) return;
      const record = store.find((e) => recordKey(e) === organizationPath);
      if (!record) return;
      record.status = status;
      // Leaving a shift clears the running-shift stamp; the on-transition
      // stamp is set by the engine via `_upsertEmployment` (it owns the
      // clock).
      if (status !== 'on-shift') record.onShiftSince = null;
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _upsertEmployment(record: EmploymentData): void {
      if (this.employments === null) this.employments = [];
      const idx = this.employments.findIndex(
        (e) => recordKey(e) === record.organizationPath,
      );
      if (idx >= 0) this.employments[idx] = record;
      else this.employments.push(record);
    }

    @CallSecurity(ByEmployingOrganization)
    @Final
    @Unshadowable
    public _removeEmployment(organizationPath: string): void {
      if (!this.employments) return;
      this.employments = this.employments.filter(
        (e) => recordKey(e) !== organizationPath,
      );
    }
  }

  return EmployedMixin;
}
