// EmploymentLogic — the hot-reloadable logic singleton behind EmploymentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { AccessApi } from '../../api/access';
import { WorldClockApi } from '../../api/worldclock';
import { Mixins } from '../../lib/mixin';
import type { Business } from '../../lib/employment/Business';
import type { Employed } from '../../lib/employment/Employed';
import {
  Employment,
  type EmploymentData,
} from '../../lib/employment/Employment';

const EmploymentApiCallers = SecurityPolicies.FromModule(
  'mud/api/employment#EmploymentApi',
);

/** A Business as a live Stuff — the enumerable seeded entity. */
type BusinessStuff = Stuff & Business;
/** An employable actor. */
type EmployedActor = Stuff & Employed;

/**
 * Proprietor authority — a direct `proprietorPath` edge on the Business,
 * with `AccessApi.isAuthor` as the orthogonal operator override (AccessApi
 * cannot represent an NPC owner, so ownership is the edge, not a group).
 */
async function isProprietorOfImpl(
  subject: Stuff,
  business: BusinessStuff,
): Promise<boolean> {
  if (subject.getTemplatePath() === business.getProprietor()) return true;
  return AccessApi.isAuthor(subject);
}

/** Hire `actor` into `business`'s `positionKey`. Returns the record, or null. */
function hireImpl(
  business: BusinessStuff,
  actor: Stuff,
  positionKey: string,
): Employment | null {
  if (!MixinApi.isEmployed(actor)) return null;
  const businessPath = business.getTemplatePath() ?? '';
  if (!businessPath) return null;
  const record: EmploymentData = {
    businessPath,
    positionKey,
    status: 'employed',
    hiredAt: WorldClockApi.getNow().rawValue(),
    onShiftSince: null,
  };
  (actor as EmployedActor)._upsertEmployment(record);
  return Employment.of(record);
}

/** Fire / quit — flip the record's status (history is preserved). */
function endEmploymentImpl(
  actor: Stuff,
  businessPath: string,
  status: 'fired' | 'quit',
): void {
  if (!MixinApi.isEmployed(actor)) return;
  (actor as EmployedActor)._setEmploymentStatus(businessPath, status);
}

/**
 * EmploymentLogic — the hot-reloadable logic singleton behind
 * {@link EmploymentApi}.
 *
 * Lives at `/obj/api/employment` (a stateless `Stuff` singleton, no backing
 * `Template`); `EmploymentApi`'s statics forward here via
 * `StuffApi.singletonSync`. The Business index + all mutation logic live in
 * module-private functions (the `CorpoLogic` / `CraftingLogic` precedent),
 * so there are no intra-singleton `this.x()` calls to trip the gate. Each
 * public method carries the `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class EmploymentLogic extends Idea {
  /**
   * The Business index — businesses are found by the `BusinessMixin`
   * marker (never a field on a room), the `SlotLogic` / `LocomotionLogic`
   * enumerate-by-scan precedent. Cached on the singleton instance so a
   * `StuffApi.clearAll` (which recreates the singleton) starts fresh;
   * rebuilt on a miss (the cache is a fast path, the live scan is the
   * source of truth). An ungated private helper — no gate to trip.
   */
  private businessCache: BusinessStuff[] | null = null;

  private allBusinesses(): BusinessStuff[] {
    if (this.businessCache) return this.businessCache;
    const out: BusinessStuff[] = [];
    for (const obj of StuffApi.getAllObjects()) {
      if (MixinApi.hasMixin(obj, Mixins.Business)) {
        out.push(obj as BusinessStuff);
      }
    }
    this.businessCache = out;
    return out;
  }

  private findBusiness(
    match: (b: BusinessStuff) => boolean,
  ): BusinessStuff | null {
    const hit = this.allBusinesses().find(match);
    if (hit) return hit;
    // A newly-stood-up business may post-date the cache: rebuild + retry.
    this.businessCache = null;
    return this.allBusinesses().find(match) ?? null;
  }

  /** See {@link EmploymentApi.employmentOf}. */
  @CallSecurity(EmploymentApiCallers)
  public employmentOf(
    actor: Stuff,
    businessPath: string,
  ): Employment | undefined {
    if (!MixinApi.isEmployed(actor)) return undefined;
    return (actor as EmployedActor).getEmployment(businessPath);
  }

  /** See {@link EmploymentApi.isProprietorOf}. */
  @CallSecurity(EmploymentApiCallers)
  public async isProprietorOf(
    subject: Stuff,
    business: BusinessStuff,
  ): Promise<boolean> {
    return isProprietorOfImpl(subject, business);
  }

  /** See {@link EmploymentApi.hire}. */
  @CallSecurity(EmploymentApiCallers)
  public hire(
    business: BusinessStuff,
    actor: Stuff,
    positionKey: string,
  ): Employment | null {
    return hireImpl(business, actor, positionKey);
  }

  /** See {@link EmploymentApi.fire}. */
  @CallSecurity(EmploymentApiCallers)
  public fire(business: BusinessStuff, actor: Stuff): void {
    endEmploymentImpl(actor, business.getTemplatePath() ?? '', 'fired');
  }

  /** See {@link EmploymentApi.quit}. */
  @CallSecurity(EmploymentApiCallers)
  public quit(actor: Stuff, businessPath: string): void {
    endEmploymentImpl(actor, businessPath, 'quit');
  }

  /** See {@link EmploymentApi.businessAt}. */
  @CallSecurity(EmploymentApiCallers)
  public businessAt(locationPath: string): BusinessStuff | null {
    return this.findBusiness((b) =>
      b.getOperatingLocations().includes(locationPath),
    );
  }

  /** See {@link EmploymentApi.businessOfProprietor}. */
  @CallSecurity(EmploymentApiCallers)
  public businessOfProprietor(subject: Stuff): BusinessStuff | null {
    const path = subject.getTemplatePath();
    if (!path) return null;
    return this.findBusiness((b) => b.getProprietor() === path);
  }
}
