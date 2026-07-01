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
import type { Employed } from '../lib/employment/Employed';
import { StuffApi } from './stuff';
import { HotReloadApi } from './hot-reload';
import { SecurityApi } from './security';
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
  /** The actor's employment at `businessPath`, or undefined. */
  public static employmentOf(
    actor: Stuff,
    businessPath: string,
  ): Employment | undefined {
    return logic().employmentOf(actor, businessPath);
  }

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

  /** The Business operating at `locationPath`, or null. */
  public static businessAt(locationPath: string): BusinessStuff | null {
    return logic().businessAt(locationPath);
  }

  /** The Business `subject` proprietors, or null. */
  public static businessOfProprietor(subject: Stuff): BusinessStuff | null {
    return logic().businessOfProprietor(subject);
  }
}

SecurityApi.decorateApiClass(EmploymentApi);
