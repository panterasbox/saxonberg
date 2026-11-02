// GovernmentLogic — the hot-reloadable logic singleton behind GovernmentApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from "../../../lib/stuff/ApiLogic";
import { CallSecurity, Unshadowable } from "../../../lib/security/decorators";
import { SecurityPolicies } from "../../../lib/security/SecurityPolicies";
import type { Stuff } from "../../../lib/stuff/Stuff";
import type Place from "../../../lib/stuff/Place";
import type { Container } from "../../../lib/spatial/Container";
import { StuffApi } from "../../../api/stuff";
import { AddressApi } from "../../../api/address";
import { MixinApi } from "../../../api/mixin";
import { Template } from "../../../lib/stuff/Template";
import { TemplatePaths } from "../../../lib/paths";
import { Character } from "../../../lib/character/Character";
import type { GovernmentDescriptor } from "../Government";
import type { RosterAssignment } from "../../../lib/employment/Roster";
import type { SeatView } from "../../../api/government";
import type GovernmentCatalogue from "../GovernmentCatalogue";
import type Ship from "../Ship";

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
/** The ship whose room `scope` stands in (walking out to the place), or `null`. */
async function shipAboard(scope: Stuff): Promise<Ship | null> {
  let place: Stuff | null = scope;
  for (let i = 0; place !== null && i < 8 && !place.isPlace(); i++) {
    place = MixinApi.isContainable(place) ? place.getContainer() : null;
  }
  if (place === null) return null;
  // The place is asked: a keyed room's structure is its warren's.
  const s = await (place as unknown as Place).structure().catch(() => null);
  if (s === null) return null;
  // Loaded on use: the ship's module sits above this one (an import here
  // would close a cycle through the register and the frame).
  const { default: ShipClass } = await import("../Ship");
  return s instanceof ShipClass ? s : null;
}

/**
 * ⭐ The law aboard a ship (P16): her flag state's — the register she is
 * entered in, never the colors she flies — and, in harbor (made fast at a
 * landing, or on a river within reach of one), the port's before it. At
 * sea, the flag state's alone; a stateless ship at sea is under nobody's.
 */
async function shipChain(ship: Ship): Promise<GovernmentDescriptor[]> {
  const out: GovernmentDescriptor[] = [];
  const seen = new Set<string>();
  const add = (d: GovernmentDescriptor | null | undefined): void => {
    if (!d || seen.has(d.key)) return;
    seen.add(d.key);
    out.push(d);
  };
  const port = await portOf(ship);
  if (port !== null) {
    const resolution = await AddressApi.resolveFor(port).catch(() => null);
    if (resolution?.address) for (const d of chainForAddress(resolution.address)) add(d);
  }
  // ⭐ Her flag state is her own register's word (she knows her register).
  const flag = await ship.flagState();
  if (flag) add(catalogue()?.getGovernment(flag));
  return out;
}

/** The landing whose port she is in: where she is made fast, else the nearest on her river. */
async function portOf(ship: Ship): Promise<(Stuff & Container) | null> {
  let path = ship.getBerth();
  if (path === null) {
    const pos = ship.getLinePosition();
    const frame = pos !== null ? await ship.liveFrame() : null;
    if (pos !== null && frame !== null && MixinApi.isLineFrame(frame)) {
      path = frame.landingNear(pos, IN_HARBOR_M);
    }
  }
  if (!path) return null;
  const landing = await StuffApi.singleton<Stuff>(path).catch(() => null);
  return landing !== null && MixinApi.isContainer(landing) ? landing : null;
}

/** How far up or down a river a ship is still in a landing's port — the river's banks' law (grain). */
const IN_HARBOR_M = 2000;

function domicileOf(character: Stuff): string | null {
  if (!(character instanceof Character)) return null;
  const address = character.getDomicileAddress();
  return address !== null && address.length > 0 ? address : null;
}

/**
 * The current roster assignments for a department **organization**: the
 * live instance's roster when it is standing (reflects runtime hires),
 * else the authored template row's `rosterSlots` — what makes a
 * never-ticked, lazily-stood-up department's seat provable.
 *
 * A department is an organization, not necessarily a Business: a registry
 * keeps records and does not trade. It stayed a Business only because
 * that is where positions used to live.
 */
async function rosterAssignmentsOf(
  department: string
): Promise<readonly RosterAssignment[]> {
  const live = StuffApi.findByTemplatePath(department);
  if (live && MixinApi.isOrganization(live)) {
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
        record.organizationPath !== seat.department ||
        record.positionKey !== seat.positionKey
      ) {
        continue;
      }
      if (ACTIVE_STATUSES.has(record.status)) return true;
      if (EXIT_STATUSES.has(record.status)) sawExit = true;
    }
    if (sawExit) return false;
  }

  const characterPath = character.getIdentityPath();
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
 * Lives at `/platform/idea/api/government` (a stateless `Stuff` singleton, no
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
    // ⭐⭐ Aboard a ship is asked FIRST (harbors P16, Risk 5): her rooms
    // stand in her own zone, which no address covers, so the address walk
    // would say "no government" — and so would an unaddressed cellar. The
    // question is *is this a ship*, never *is the chain empty*.
    const ship = await shipAboard(scope);
    if (ship !== null) return shipChain(ship);
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
