/**
 * EmploymentApi — the gated surface for the employment engine:
 * organizations, positions, rosters, and an actor's employment
 * relationships.
 *
 * An **organization** owns the chart — positions, holders, and the
 * authority that fills them — and answers *who holds position P in
 * organization O?* the same way for a ministry, a shop and a newspaper. A
 * `Business` is an organization that also **trades**: a standalone `Idea`
 * (not a mixin on a place) adding an account, a bank, and its operating
 * locations. An actor's `EmployedMixin` holds the `Employment` records the
 * roster materializes; on-shift confers the Position's duties via the
 * augment substrate (so an on-shift bartender fulfils `order` and an
 * off-shift one does not).
 *
 * ⚠ **Employment is independent of money movement.** `postTransaction`
 * takes no employment argument and consults none: paying someone with no
 * employment record is identical to paying an employee off-book, which is
 * what makes paying under the table an emergent act rather than an
 * unmodellable one. Do not couple them.
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link EmploymentLogic} singleton at `/obj/api/employment`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/employment`
 * reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Business } from '../obj/Business';
import type { Organization } from '../lib/employment/Organization';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { EmploymentLogic } from '../obj/api/EmploymentLogic';
import { fileURLToPath } from 'url';

export type {
  PrincipalRef,
  PrincipalRefKind,
  EntityPrincipalRef,
  OfficePrincipalRef,
  SeatPrincipalRef,
  CommitteePrincipalRef,
} from '../lib/employment/Authority';
export { Authority, PRINCIPAL_REF_KINDS } from '../lib/employment/Authority';
export type { Position, PositionData } from '../lib/employment/Position';
export type {
  Employment,
  EmploymentData,
  EmploymentStatus,
} from '../lib/employment/Employment';
export type {
  Roster,
  RosterAssignment,
  ShiftEntry,
} from '../lib/employment/Roster';
export type { Business } from '../obj/Business';
export type { Organization } from '../lib/employment/Organization';
export type { Employed } from '../lib/employment/Employed';

import type { Employment } from '../lib/employment/Employment';
import type { PrincipalRef } from '../lib/employment/Authority';
import type { RemittanceSplit } from './banking';
import { SecurityApi } from './security';

const LOGIC_PATH = '/obj/api/employment';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/EmploymentLogic', import.meta.url),
);

/** A Business as a live Stuff. */
type BusinessStuff = Stuff & Business;
/** Any organization as a live Stuff — a Business, a ministry, a publisher. */
type OrganizationStuff = Stuff & Organization;

/** Resolve the HMR-able EmploymentLogic singleton (sync). */
function logic(): EmploymentLogic {
  return StuffApi.singletonSync(
    LOGIC_PATH,
    () =>
      new ((HotReloadApi.getCurrentExport(
        LOGIC_CLASS_FILE,
        'EmploymentLogic',
      ) as typeof EmploymentLogic | null) ?? EmploymentLogic)(),
  );
}

export class EmploymentApi {
  /**
   * ⭐ Does `principal` hold `ref` — **the** authority question, and the
   * only one. Dispatches on the tag: `entity` matches a templatePath,
   * `office` asks `CompactApi.holdsOffice`, `seat` asks
   * `GovernmentApi.holdsSeat`, `committee` asks
   * `CompactApi.isCommitteeMember`. Fails closed on an unauthored
   * authority, an unresolvable registry, or a non-Avatar where a playerId
   * is required.
   *
   * ⚠ Holding an organization's appointing authority is the power to
   * **fill** a position, never to exercise one — nothing that does the
   * work of a position may consult this.
   */
  public static holdsAuthority(
    principal: Stuff | null,
    ref: PrincipalRef | null,
  ): Promise<boolean> {
    return logic().holdsAuthority(principal, ref);
  }

  /**
   * Whether `subject` may act as the proprietor of `organization` — its
   * appointing authority, or the `AccessApi.isAuthor` operator override.
   * The override rides on top of an authority and is never one itself.
   */
  public static isProprietorOf(
    subject: Stuff,
    organization: OrganizationStuff,
  ): Promise<boolean> {
    return logic().isProprietorOf(subject, organization);
  }

  /**
   * Every actor holding `positionKey` at `organization` — the uniform
   * *who-holds-P-in-O?* read (durable templatePaths). Unions live
   * non-terminal `Employment` records with the authored roster, so a
   * never-ticked organization's holder is still provable; an explicit exit
   * suppresses the roster entry rather than being resurrected by it. Its
   * inverse — *what does actor A hold, anywhere?* — is the actor's own
   * `getActiveEmployments()`.
   */
  public static holdersOf(
    organization: OrganizationStuff,
    positionKey: string,
  ): string[] {
    return logic().holdersOf(organization, positionKey);
  }

  /**
   * The organization chain above `organization`, nearest parent first —
   * a department inside a ministry, a desk inside a paper. A parent that
   * does not resolve ends the chain; a **cycle throws** rather than
   * returning a truncated one. The position-level twin is the
   * organization's own `getReportingChain(positionKey)`.
   */
  public static organizationChainOf(
    organization: OrganizationStuff,
  ): OrganizationStuff[] {
    return logic().organizationChainOf(organization);
  }

  /** Hire `actor` into `organization`'s `positionKey`. Returns the record. */
  public static hire(
    organization: OrganizationStuff,
    actor: Stuff,
    positionKey: string,
  ): Employment | null {
    return logic().hire(organization, actor, positionKey);
  }

  /** Fire `actor` from `organization` (status → fired; history preserved). */
  public static fire(organization: OrganizationStuff, actor: Stuff): void {
    return logic().fire(organization, actor);
  }

  /** `actor` quits `organizationPath` (status → quit; history preserved). */
  public static quit(actor: Stuff, organizationPath: string): void {
    return logic().quit(actor, organizationPath);
  }

  /**
   * Begin a proprietor covering their own bar — a transient on-shift
   * Employment against the first position, conferring its capability
   * (`MakerMixin`). Unpaid by construction. Returns the cover record.
   */
  public static beginCover(
    self: Stuff,
    business: OrganizationStuff,
  ): Employment | null {
    return logic().beginCover(self, business);
  }

  /** End a proprietor's cover — drop the transient cover Employment. */
  public static endCover(self: Stuff, business: OrganizationStuff): void {
    return logic().endCover(self, business);
  }

  /**
   * The present on-shift server a tip should reach — a present, active
   * maker in `patron`'s location, or null. Shared by the EFT tip route and
   * `collect`'s gate.
   */
  public static tipRecipientFor(patron: Stuff): Stuff | null {
    return logic().tipRecipientFor(patron);
  }

  /** The **live** Business operating at `locationPath`, or null (a sync scan). */
  public static businessAt(locationPath: string): BusinessStuff | null {
    return logic().businessAt(locationPath);
  }

  /**
   * The Business operating at `locationPath` — standing it up **lazily** from
   * its authored template if it isn't live yet. Attribution keys on the
   * **fixture** (a terminal / vending unit), not the room, so two venues
   * sharing a room each resolve their own operator. The derived-standup path:
   * no manifest entry, no per-venue standup hook — the Business's own
   * `operatingLocations` data drives it. Async (the standup clones). Returns
   * null when no authored Business operates the path.
   */
  public static async ensureOperatorAt(
    locationPath: string,
  ): Promise<BusinessStuff | null> {
    return logic().ensureOperatorAt(locationPath);
  }

  /** The Business `subject` proprietors, or null. */
  public static businessOfProprietor(subject: Stuff): BusinessStuff | null {
    return logic().businessOfProprietor(subject);
  }

  /**
   * Run one roster-maintenance pass now: evaluate every Business's roster
   * against the game clock and update each assignee's shift state (lazy-
   * materializing records, settling wages on shift-end). Normally the boot-
   * installed recurring tick drives this; exposed for tests / manual fire.
   */
  public static tickRoster(): void {
    return logic().tickRoster();
  }

  /** Sync shift-state read for `actor` — the `shifts` brain's input. */
  public static shiftStateOf(actor: Stuff): 'on-shift' | 'off-shift' {
    return logic().shiftStateOf(actor);
  }

  /**
   * The one resolution seam for a Business's operating account — custody
   * is the business's **authored `banksAt`** (where a business banks is a
   * fact about the business, a term of its arrangement: the branch's Terms
   * price its fees, the fees route a royalty to that bank's corpo — never
   * a call-site default). Throws when the Business authors no `banksAt`
   * (an authoring error, loud). Idempotent (finds the existing account).
   */
  public static operatingAccountOf(business: BusinessStuff): Promise<string> {
    return logic().operatingAccountOf(business);
  }

  /**
   * Pay a per-settlement (piece-rate) employee for `units` attributed
   * settlements — `units × rate` from the Business account as a
   * `wage`/`piecework` posting. Verifies the participant relationship (a
   * live Employment at this business whose Position basis is
   * `per-settlement`); throws otherwise. The piece-rate venue calls this
   * at each attributed settlement (no shipped venue yet — the mine is the
   * named future consumer).
   */
  public static settlePiecework(
    business: BusinessStuff,
    employeeKey: string,
    units = 1,
  ): Promise<void> {
    return logic().settlePiecework(business, employeeKey, units);
  }

  /**
   * The share-of-flow remittance splits for a revenue moment at
   * `business` — one split per live Employment whose Position basis is
   * `share-of-flow` (`floor(share × amount)`, category `commission`),
   * capped below the flow. The revenue seam appends these to its Charge
   * before `BankingApi.settle`; empty for all shipped content.
   */
  public static flowSplitsFor(
    business: BusinessStuff,
    amountMinor: number,
  ): Promise<RemittanceSplit[]> {
    return logic().flowSplitsFor(business, amountMinor);
  }

  /**
   * Settle the wage for one completed shift (`rate × shift-hours`) from the
   * Business account to `employeeKey`, skipping a proprietor's unpaid cover.
   * Called by the roster tick on shift-end; exposed for tests / manual fire
   * (settles to the current game-clock instant).
   */
  public static settleShiftWage(
    business: BusinessStuff,
    employeeKey: string,
    employment: Employment,
  ): Promise<void> {
    return logic().settleShiftWage(business, employeeKey, employment);
  }

  /**
   * Boot the engine: run one immediate roster pass then self-register the
   * recurring game-time tick. Called from `AppBootstrap` after
   * `BankingApi.boot()`.
   */
  public static boot(): void {
    return logic().boot();
  }
}

SecurityApi.decorateApiClass(EmploymentApi);
