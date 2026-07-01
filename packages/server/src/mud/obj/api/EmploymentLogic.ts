// EmploymentLogic — the hot-reloadable logic singleton behind EmploymentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { Idea } from '../../lib/stuff/Idea';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { AccessApi } from '../../api/access';
import { BankingApi, Money } from '../../api/banking';
import { ContainmentApi } from '../../api/containment';
import { WorldClockApi } from '../../api/worldclock';
import type { ClockHandle } from '../../api/worldclock';
import { Quantity } from '../../lib/quantity';
import { DefaultCalendar } from '../../lib/time/DefaultCalendar';
import { Mixins } from '../../lib/mixin';
import type { Business } from '../../lib/employment/Business';
import type { Employed } from '../../lib/employment/Employed';
import {
  Employment,
  type EmploymentData,
  type EmploymentStatus,
} from '../../lib/employment/Employment';

/** One game-hour in game-seconds — the roster tick cadence. */
const ONE_GAME_HOUR_S = 3_600;

/** Statuses the roster no longer governs (explicit exit — not resurrected). */
const TERMINAL: readonly EmploymentStatus[] = ['quit', 'fired'];

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
 * Begin a proprietor's cover: upsert a **transient, on-shift** Employment
 * against the business's (first) position — reusing the whole on-shift→
 * confer path, so the covering proprietor gains the Position's capability
 * (`MakerMixin` for the bar). Unpaid by construction: the wage settlement
 * skips a proprietor-held Employment, and the roster tick never governs the
 * proprietor (they hold no roster slot), so the cover is never resurrected
 * or paid. Idempotent-ish: a re-begin just refreshes the record.
 */
function beginCoverImpl(
  self: Stuff,
  business: BusinessStuff,
): Employment | null {
  if (!MixinApi.isEmployed(self)) return null;
  const businessPath = business.getTemplatePath() ?? '';
  const positionKey = business.getPositions()[0]?.key;
  if (!businessPath || !positionKey) return null;
  const now = WorldClockApi.getNow().rawValue();
  const record: EmploymentData = {
    businessPath,
    positionKey,
    status: 'on-shift',
    hiredAt: now,
    onShiftSince: now,
  };
  (self as EmployedActor)._upsertEmployment(record);
  return Employment.of(record);
}

/** End a proprietor's cover: drop the transient cover Employment. */
function endCoverImpl(self: Stuff, business: BusinessStuff): void {
  if (!MixinApi.isEmployed(self)) return;
  (self as EmployedActor)._removeEmployment(business.getTemplatePath() ?? '');
}

/**
 * The present on-shift server for a tip — a present, **active** maker in
 * `patron`'s location, other than the patron (the `CraftingLogic.resolveMaker`
 * scan, one cardinality across: whoever is tending now). The EFT tip routes
 * to this actor's account; `collect` gates on being this actor.
 */
function tipRecipientForImpl(patron: Stuff): Stuff | null {
  if (!MixinApi.isContainable(patron)) return null;
  const loc = ContainmentApi.getContainer(patron);
  if (!loc || !MixinApi.isContainer(loc)) return null;
  for (const c of ContainmentApi.getContents(loc)) {
    if (c !== patron && MixinApi.isMaker(c)) return c;
  }
  return null;
}

/**
 * Settle the wage for a completed shift — the shift-end (on→off transition)
 * is the pay milestone: a **lump of `rate × shift-hours`, once, at the
 * boundary** (not a continuous sweep). `employment` carries the
 * `onShiftSince` stamp (captured before the caller clears it) and
 * `offTimeRaw` is the shift-end instant, so an early clock-out just pays the
 * partial. Skips the proprietor's own cover Employment (unpaid by
 * construction — no self-wage). Reads the game clock only via the passed
 * `offTimeRaw`, so a paused world (frozen clock) accrues nothing.
 *
 * The employer account keys on the **Business path** (not the venue), so
 * order income and shift wages settle on one account.
 */
async function settleShiftWageImpl(
  business: BusinessStuff,
  employeeKey: string,
  employment: Employment,
  offTimeRaw: number,
): Promise<void> {
  const onSince = employment.onShiftSince;
  if (onSince == null) return; // never actually on shift
  if (!employeeKey) return;
  // Unpaid cover: the proprietor tending their own bar draws no wage.
  if (employeeKey === business.getProprietor()) return;

  const position = business.getPosition(employment.positionKey);
  if (!position || position.wageRate <= 0) return;

  const gameHours = (offTimeRaw - onSince) / ONE_GAME_HOUR_S;
  if (gameHours <= 0) return;
  const amount = Math.round(position.wageRate * gameHours);
  if (amount <= 0) return;

  const accountPath = business.getAccountPath();
  const account = await BankingApi.ensureVenueAccount(
    accountPath,
    accountPath,
    '',
  );
  await BankingApi.payWage(account, employeeKey, Money.of(amount));
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

  /** The recurring game-time tick handle (runtime-only; re-armed on reload). */
  private rosterHandle: ClockHandle | null = null;

  /**
   * The roster maintenance pass (ungated private — the gated public
   * `tickRoster` and the schedule callback both delegate here, so no
   * intra-singleton gated `this.x()` call trips the gate). Enumerates every
   * Business, evaluates each roster assignment against the game clock, and
   * maintains the assignee's stored `Employment.status`:
   *
   *   - **lazy-materialize** a record from the assignment (the roster is the
   *     single source of truth — the seeds carry no employment block);
   *   - **off→on**: stamp `onShiftSince = now`;
   *   - **on→off**: settle the shift wage (Phase 4) off the captured record
   *     *before* clearing `onShiftSince`, then flip to off-shift.
   *
   * A `quit` / `fired` record is left alone (an explicit exit is never
   * resurrected by the seed roster).
   */
  private runTick(): void {
    const now = WorldClockApi.getNow();
    const date = DefaultCalendar.singleton().decompose(now);
    const nowRaw = now.rawValue();
    for (const business of this.allBusinesses()) {
      const businessPath = business.getTemplatePath() ?? '';
      if (!businessPath) continue;
      const roster = business.getRoster();
      for (const assignment of roster.getAssignments()) {
        const actor = StuffApi.findByTemplatePath(assignment.assignee);
        if (!actor || !MixinApi.isEmployed(actor)) continue;
        const employed = actor as EmployedActor;

        let emp = employed.getEmployment(businessPath);
        if (!emp) {
          const record: EmploymentData = {
            businessPath,
            positionKey: assignment.positionKey,
            status: 'off-shift',
            hiredAt: nowRaw,
            onShiftSince: null,
          };
          employed._upsertEmployment(record);
          emp = Employment.of(record);
        }
        if (TERMINAL.includes(emp.status)) continue;

        const desired = roster.evaluate(assignment, date);
        const currentlyOn = emp.status === 'on-shift';
        if (desired === 'on-shift' && !currentlyOn) {
          employed._upsertEmployment(
            emp.withStatus('on-shift', nowRaw).serialize(),
          );
        } else if (desired === 'off-shift' && currentlyOn) {
          // Settle off the captured record (has `onShiftSince`) at this
          // tick's instant, before the synchronous clear below — no race.
          void settleShiftWageImpl(
            business,
            assignment.assignee,
            emp,
            nowRaw,
          ).catch((err) =>
            console.error('EmploymentLogic: shift-wage settle failed', err),
          );
          employed._setEmploymentStatus(businessPath, 'off-shift');
        }
      }
    }
  }

  /** Self-register the recurring game-time roster tick (idempotent). */
  private installRosterSchedule(): void {
    if (this.rosterHandle) return;
    this.rosterHandle = WorldClockApi.every(
      Quantity.of(ONE_GAME_HOUR_S, 's'),
      () => {
        try {
          this.runTick();
        } catch (err) {
          console.error('EmploymentLogic: roster tick failed', err);
        }
      },
    );
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

  /** See {@link EmploymentApi.beginCover}. */
  @CallSecurity(EmploymentApiCallers)
  public beginCover(
    self: Stuff,
    business: BusinessStuff,
  ): Employment | null {
    return beginCoverImpl(self, business);
  }

  /** See {@link EmploymentApi.endCover}. */
  @CallSecurity(EmploymentApiCallers)
  public endCover(self: Stuff, business: BusinessStuff): void {
    endCoverImpl(self, business);
  }

  /** See {@link EmploymentApi.tipRecipientFor}. */
  @CallSecurity(EmploymentApiCallers)
  public tipRecipientFor(patron: Stuff): Stuff | null {
    return tipRecipientForImpl(patron);
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

  /** See {@link EmploymentApi.tickRoster}. */
  @CallSecurity(EmploymentApiCallers)
  public tickRoster(): void {
    this.runTick();
  }

  /** See {@link EmploymentApi.shiftStateOf}. */
  @CallSecurity(EmploymentApiCallers)
  public shiftStateOf(actor: Stuff): 'on-shift' | 'off-shift' {
    return MixinApi.isEmployed(actor) &&
      (actor as EmployedActor).isOnShift()
      ? 'on-shift'
      : 'off-shift';
  }

  /** See {@link EmploymentApi.settleShiftWage}. */
  @CallSecurity(EmploymentApiCallers)
  public settleShiftWage(
    business: BusinessStuff,
    employeeKey: string,
    employment: Employment,
  ): Promise<void> {
    return settleShiftWageImpl(
      business,
      employeeKey,
      employment,
      WorldClockApi.getNow().rawValue(),
    );
  }

  /**
   * See {@link EmploymentApi.boot}. Run one immediate roster pass (so
   * on-shift state is correct at boot) then self-register the recurring
   * game-time tick. Idempotent via the retained handle. The game-time
   * schedule freezes with a paused world, so accrual freezes too.
   */
  @CallSecurity(EmploymentApiCallers)
  public boot(): void {
    this.runTick();
    this.installRosterSchedule();
  }
}
