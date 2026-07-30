// GovernmentLogic — the hot-reloadable logic singleton behind GovernmentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../lib/security/decorators";
import { SecurityPolicies } from "../../lib/security/SecurityPolicies";
import type { Stuff } from "../../lib/stuff/Stuff";
import type { Container } from "../../lib/spatial/Container";
import { StuffApi } from "../../api/stuff";
import { AddressApi } from "../../api/address";
import { MixinApi } from "../../api/mixin";
import { Template } from "../../lib/stuff/Template";
import { TemplatePaths } from "../../lib/paths";
import { Character } from "../../lib/character/Character";
import type {
  GovernmentDescriptor,
  GovernmentSeat,
} from "../../lib/civics/Government";
import type { RosterAssignment } from "../../lib/employment/Roster";
import type { SeatView } from "../../api/government";
import type GovernmentCatalogue from "../GovernmentCatalogue";

const GovernmentApiCallers = SecurityPolicies.FromModule(
  "/api/government#GovernmentApi"
);

/** Employment statuses that mean the seat's position is actively held. */
const ACTIVE_STATUSES = new Set(["employed", "on-shift", "off-shift"]);
/** Explicit-exit statuses — an exit is never resurrected by the roster. */
const EXIT_STATUSES = new Set(["quit", "fired"]);

/** The live GovernmentCatalogue singleton, or `null` before it warms. */
function catalogue(): GovernmentCatalogue | null {
  return (
    (StuffApi.findByTemplatePath(
      TemplatePaths.governmentCatalogue
    ) as GovernmentCatalogue | null) ?? null
  );
}

/**
 * The jurisdiction chain for an address, most-local first: walk the
 * coverage chain, collect each Locality's declared government key, drop
 * nulls and keys unknown to the catalogue, dedupe preserving the
 * most-local position, resolve to descriptors. `[]` off-grid — never
 * throws.
 */
function chainForAddress(address: string): GovernmentDescriptor[] {
  const cat = catalogue();
  if (!cat || address.length === 0) return [];
  const seen = new Set<string>();
  const out: GovernmentDescriptor[] = [];
  for (const locality of AddressApi.coverageChainOf(address)) {
    const key = locality.getGovernmentKey();
    if (key === null || seen.has(key)) continue;
    seen.add(key);
    const descriptor = cat.getGovernment(key);
    if (descriptor) out.push(descriptor);
  }
  return out;
}

/** The character's domicile address, or `null` (non-Characters included). */
function domicileOf(character: Stuff): string | null {
  if (!(character instanceof Character)) return null;
  const address = character.getDomicileAddress();
  return address !== null && address.length > 0 ? address : null;
}

/**
 * The current roster assignments for a department Business: the live
 * instance's roster when it is standing (reflects runtime hires), else
 * the authored template row's `rosterSlots` — what makes a never-ticked,
 * lazily-stood-up department's seat provable.
 */
async function rosterAssignmentsOf(
  department: string
): Promise<readonly RosterAssignment[]> {
  const live = StuffApi.findByTemplatePath(department);
  if (live && MixinApi.isBusiness(live)) {
    return live.getRosterAssignments();
  }
  // Cold-state posture: no store (or no such row) degrades to an empty
  // roster — the whole read surface never throws.
  let tpl: Template | null = null;
  try {
    tpl = await Template.findByPath(department);
  } catch {
    return [];
  }
  const raw = (tpl?.data as Record<string, unknown> | undefined)?.rosterSlots;
  if (!Array.isArray(raw)) return [];
  const out: RosterAssignment[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    if (typeof e.positionKey !== "string" || typeof e.assignee !== "string") {
      continue;
    }
    out.push({
      positionKey: e.positionKey,
      assignee: e.assignee,
      schedule: [],
    });
  }
  return out;
}

/**
 * Whether `character` holds the given seat. Two paths, in order: live
 * `Employment` records (an active record on the seat's (department,
 * position) wins; an explicit exit record suppresses the roster path —
 * "an explicit exit is never resurrected"), then the authored roster.
 */
async function holdsSeatImpl(
  character: Stuff,
  governmentKey: string,
  seatKey: string
): Promise<boolean> {
  const seat = catalogue()
    ?.getGovernment(governmentKey)
    ?.seats.find((s) => s.key === seatKey);
  if (!seat) return false;

  if (MixinApi.isEmployed(character)) {
    let sawExit = false;
    for (const record of character.getEmployments()) {
      if (
        record.businessPath !== seat.department ||
        record.positionKey !== seat.positionKey
      ) {
        continue;
      }
      if (ACTIVE_STATUSES.has(record.status)) return true;
      if (EXIT_STATUSES.has(record.status)) sawExit = true;
    }
    if (sawExit) return false;
  }

  const characterPath = character.getTemplatePath();
  if (!characterPath) return false;
  const assignments = await rosterAssignmentsOf(seat.department);
  return assignments.some(
    (a) => a.positionKey === seat.positionKey && a.assignee === characterPath
  );
}

/** Resolve each seat of a government to its current holder (or `null`). */
async function seatViewsOf(governmentKey: string): Promise<SeatView[]> {
  const government = catalogue()?.getGovernment(governmentKey);
  if (!government) return [];
  const views: SeatView[] = [];
  for (const seat of government.seats) {
    const assignments = await rosterAssignmentsOf(seat.department);
    const holder =
      assignments.find((a) => a.positionKey === seat.positionKey)?.assignee ??
      null;
    views.push({ seat: { ...seat }, holder });
  }
  return views;
}

/**
 * GovernmentLogic — the hot-reloadable logic singleton behind
 * {@link GovernmentApi}.
 *
 * Lives at `/obj/api/government` (a stateless `Stuff` singleton, no
 * backing `Template`); `GovernmentApi`'s public statics forward here via
 * `StuffApi.singletonSync`. It joins the warmed `GovernmentCatalogue`
 * (government descriptors by key) to the address substrate's coverage
 * chain (jurisdiction) and the employment substrate (seats) — all
 * derive-on-read, no storage of its own. Internal sub-logic lives in
 * module-private free functions so there are no intra-singleton
 * `this.x()` calls to trip the gate; each public method carries the
 * `FromModule` gate.
 *
 * @internal
 */
@Unshadowable
export class GovernmentLogic extends ApiLogic {
  /** See {@link GovernmentApi.governmentAt}. */
  @CallSecurity(GovernmentApiCallers)
  public governmentAt(address: string): GovernmentDescriptor | null {
    return chainForAddress(address)[0] ?? null;
  }

  /** See {@link GovernmentApi.governmentChainAt}. */
  @CallSecurity(GovernmentApiCallers)
  public governmentChainAt(address: string): GovernmentDescriptor[] {
    return chainForAddress(address);
  }

  /** See {@link GovernmentApi.subjectTo}. */
  @CallSecurity(GovernmentApiCallers)
  public async subjectTo(
    scope: Stuff & Container
  ): Promise<GovernmentDescriptor[]> {
    const resolution = await AddressApi.resolveFor(scope);
    return resolution.address ? chainForAddress(resolution.address) : [];
  }

  /** See {@link GovernmentApi.residentOf}. */
  @CallSecurity(GovernmentApiCallers)
  public residentOf(character: Stuff): GovernmentDescriptor[] {
    const domicile = domicileOf(character);
    return domicile ? chainForAddress(domicile) : [];
  }

  /** See {@link GovernmentApi.domicileAddressOf}. */
  @CallSecurity(GovernmentApiCallers)
  public domicileAddressOf(character: Stuff): string | null {
    return domicileOf(character);
  }

  /** See {@link GovernmentApi.holdsSeat}. */
  @CallSecurity(GovernmentApiCallers)
  public async holdsSeat(
    character: Stuff,
    governmentKey: string,
    seatKey: string
  ): Promise<boolean> {
    return holdsSeatImpl(character, governmentKey, seatKey);
  }

  /** See {@link GovernmentApi.getGovernment}. */
  @CallSecurity(GovernmentApiCallers)
  public getGovernment(key: string): GovernmentDescriptor | null {
    return catalogue()?.getGovernment(key) ?? null;
  }

  /** See {@link GovernmentApi.listGovernments}. */
  @CallSecurity(GovernmentApiCallers)
  public listGovernments(): GovernmentDescriptor[] {
    return catalogue()?.allGovernments() ?? [];
  }

  /** See {@link GovernmentApi.seatsOf}. */
  @CallSecurity(GovernmentApiCallers)
  public async seatsOf(governmentKey: string): Promise<SeatView[]> {
    return seatViewsOf(governmentKey);
  }
}
