/**
 * EmploymentApi — the gated surface for the employment engine: businesses,
 * positions, rosters, and an actor's employment relationships.
 *
 * A `Business` is a standalone `Idea` (not a mixin on a place) that owns a
 * proprietor, its positions, a roster, an account, and its operating
 * locations. An actor's `EmployedMixin` holds the `Employment` records the
 * roster materializes; on-shift confers the Position's duties via the
 * augment substrate (so an on-shift bartender fulfils `order` and an
 * off-shift one does not).
 *
 * Thin forwarding shell: the logic lives in the hot-reloadable
 * {@link EmploymentLogic} singleton at `/obj/api/employment`, reached
 * synchronously via `StuffApi.singletonSync`. `dest /obj/api/employment`
 * reloads it.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Business } from '../lib/employment/Business';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { EmploymentLogic } from '../obj/api/EmploymentLogic';
import { fileURLToPath } from 'url';

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
export type { Business } from '../lib/employment/Business';
export type { Employed } from '../lib/employment/Employed';

import type { Employment } from '../lib/employment/Employment';

const LOGIC_PATH = '/obj/api/employment';
const LOGIC_CLASS_FILE = fileURLToPath(
  new URL('../obj/api/EmploymentLogic', import.meta.url),
);

/** A Business as a live Stuff. */
type BusinessStuff = Stuff & Business;

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
   * Whether `subject` may act as the proprietor of `business` — the direct
   * `proprietorPath` edge, or the `AccessApi.isAuthor` operator override.
   */
  public static isProprietorOf(
    subject: Stuff,
    business: BusinessStuff,
  ): Promise<boolean> {
    return logic().isProprietorOf(subject, business);
  }

  /** Hire `actor` into `business`'s `positionKey`. Returns the record. */
  public static hire(
    business: BusinessStuff,
    actor: Stuff,
    positionKey: string,
  ): Employment | null {
    return logic().hire(business, actor, positionKey);
  }

  /** Fire `actor` from `business` (status → fired; history preserved). */
  public static fire(business: BusinessStuff, actor: Stuff): void {
    return logic().fire(business, actor);
  }

  /** `actor` quits `businessPath` (status → quit; history preserved). */
  public static quit(actor: Stuff, businessPath: string): void {
    return logic().quit(actor, businessPath);
  }

  /**
   * Begin a proprietor covering their own bar — a transient on-shift
   * Employment against the first position, conferring its capability
   * (`MakerMixin`). Unpaid by construction. Returns the cover record.
   */
  public static beginCover(
    self: Stuff,
    business: BusinessStuff,
  ): Employment | null {
    return logic().beginCover(self, business);
  }

  /** End a proprietor's cover — drop the transient cover Employment. */
  public static endCover(self: Stuff, business: BusinessStuff): void {
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
