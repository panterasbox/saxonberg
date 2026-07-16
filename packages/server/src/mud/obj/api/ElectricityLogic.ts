// ElectricityLogic — the hot-reloadable logic singleton behind ElectricityApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { ConditionApi } from '../../api/condition';
import { ContainmentApi } from '../../api/containment';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Quantity } from '../../lib/quantity';
import type Material from '../../lib/material/Material';
import type { Energized } from '../../lib/electricity/Energized';
import type { ConductionOutcome } from '../../api/electricity';

const ElectricityApiCallers = SecurityPolicies.FromModule(
  '/api/electricity#ElectricityApi',
);

/**
 * ElectricityLogic — the hot-reloadable logic singleton behind
 * {@link ElectricityApi}.
 *
 * Lives at `/obj/api/electricity` (a stateless `Stuff` singleton, no backing
 * `Template`); `ElectricityApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the **conduction walk** — building the
 * conductive-contact graph of a source's location, resolving which bodies
 * bridge the source's potential to ground, and dividing current toward the
 * ground sink by Ohm's law. Holds NO state and NO tick handles (a persisting
 * circuit becomes a reconcile-on-read condition on the body — see
 * `VitalsMixin`); the walk is a pure per-event computation. Internal
 * sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate; each public method
 * carries the `FromModule` gate. `dest /obj/api/electricity` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ElectricityLogic extends ApiLogic {
  /** See {@link ElectricityApi.conduct}. */
  @CallSecurity(ElectricityApiCallers)
  public conduct(source: Stuff & Energized): ConductionOutcome[] {
    return conductImpl(source);
  }

  /** See {@link ElectricityApi.currentThrough}. */
  @CallSecurity(ElectricityApiCallers)
  public currentThrough(
    source: Stuff & Energized,
    victim: Stuff,
  ): Quantity<'A'> {
    const room = roomForConduction(source);
    if (!room) return zeroAmps();
    return divideCurrent(source, victim, buildConductiveGraph(room));
  }

  /** See {@link ElectricityApi.pathToGround}. */
  @CallSecurity(ElectricityApiCallers)
  public pathToGround(node: Stuff): boolean {
    const room = roomForConduction(node);
    if (!room) return false;
    return groundPath(node, buildConductiveGraph(room));
  }

  /** See {@link ElectricityApi.groundNodeFor}. */
  @CallSecurity(ElectricityApiCallers)
  public groundNodeFor(node: Stuff): Stuff | null {
    const room = roomForConduction(node);
    if (!room) return null;
    return buildConductiveGraph(room).floor;
  }
}

// ---------- conduction internals (module-private free functions) ----------
//
// The conductive-contact graph + the potential resolution + the current
// division. The SHAPE (the edge set — containment / resting-on-surface /
// co-immersion in a conductive pool — and the conductance-to-ground
// division) is code; every MAGNITUDE (the pool/insulator conductivity gates,
// the resistances) is an `electricity.*` dial with a seeded-literal
// fallback. The model generalizes additively — a source imposes a potential
// (any Energized node), a second source is another live node, a wire is a
// high-conductivity edge — so the deferred grid plugs in without changing
// callers. The division (`divideCurrent`) is the single seam a future full
// Kirchhoff mesh replaces.

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function zeroAmps(): Quantity<'A'> {
  return Quantity.of(0, 'A');
}

/** The location a conduction event resolves within — the node's container. */
function roomForConduction(node: Stuff): Stuff | null {
  if (!MixinApi.isContainable(node)) return null;
  return (ContainmentApi.getContainer(node) as Stuff | null) ?? null;
}

/**
 * The resolved conductive-contact graph of a room: the ground `Floor`, its
 * conductive surface pool (if any), the floor's own conductivity, and every
 * Energized source in scope. Built fresh per event (never stored) — potential
 * is computed at resolution time, not held as an ambient field.
 */
interface ConductiveGraph {
  room: Stuff;
  floor: Stuff | null;
  /** A conductive surface pool bridges everything standing in it. */
  poolConducts: boolean;
  /** The floor's own material grounds a body standing on it. */
  floorConducts: boolean;
  sources: Array<Stuff & Energized>;
}

function buildConductiveGraph(room: Stuff): ConductiveGraph {
  const floor = findFloor(room);
  const poolMat = floor ? conductivePoolOf(floor) : null;
  const floorMat = floor ? MaterialApi.materialOf(floor) : null;
  const poolMin = dial(AppSettingKeys.electricityPoolMinConductivity, 0.005);
  const sources: Array<Stuff & Energized> = [];
  for (const occ of contentsOf(room)) {
    if (MixinApi.isEnergized(occ) && effectiveVoltage(occ).rawValue() > 0) {
      sources.push(occ as Stuff & Energized);
    }
  }
  return {
    room,
    floor,
    poolConducts: poolMat !== null,
    floorConducts:
      floorMat !== null &&
      floorMat.getElectricalConductivity().rawValue() >= poolMin,
    sources,
  };
}

function contentsOf(room: Stuff): Stuff[] {
  if (!MixinApi.isContainer(room)) return [];
  return ContainmentApi.getContents(room) as unknown as Stuff[];
}

/** The room's ground node — a fixture (or content) carrying a surface bulk
 * slot (the puddle-bearing `Floor`). */
function findFloor(room: Stuff): Stuff | null {
  if (MixinApi.isAdornable(room)) {
    for (const fx of room.getFixtures()) {
      if (MixinApi.isBulkable(fx) && fx.hasSurfaceBulk()) {
        return fx as unknown as Stuff;
      }
    }
  }
  for (const c of contentsOf(room)) {
    if (MixinApi.isBulkable(c) && c.hasSurfaceBulk()) return c;
  }
  return null;
}

/** The floor's conductive surface pool material, or `null` (dry / too fresh /
 * non-conductive). */
function conductivePoolOf(floor: Stuff): Material | null {
  if (!MixinApi.isBulkable(floor)) return null;
  if (floor.getBulkAmount('surface').rawValue() <= 0) return null;
  const mat = floor.getBulkMaterial('surface');
  if (!mat) return null;
  const poolMin = dial(AppSettingKeys.electricityPoolMinConductivity, 0.005);
  return mat.getElectricalConductivity().rawValue() >= poolMin ? mat : null;
}

/** The effective potential a source imposes — 0 for a switched-off source. */
function effectiveVoltage(source: Stuff): Quantity<'V'> {
  if (!MixinApi.isEnergized(source)) return Quantity.of(0, 'V');
  if (MixinApi.isSwitchable(source) && !source.isOn()) {
    return Quantity.of(0, 'V');
  }
  return source.getVoltage();
}

/** Body parts that make ground contact (feet). Empty for a non-biped. */
function footPartsOf(body: Stuff): string[] {
  if (!MixinApi.isOrganism(body)) return [];
  const plan = body.getSpecies()?.getBodyPlan();
  if (!plan) return [];
  return plan
    .getBodyParts()
    .map((p) => p.key)
    .filter((k) => k.includes('foot'));
}

/**
 * Is the body's ground contact broken by an insulating covering on its feet
 * (rubber boots, a leather sole)? The counterplay. Reads the covering of the
 * foot parts specifically — a plate breastplate does NOT insulate the feet.
 */
function groundContactInsulated(body: Stuff): boolean {
  if (!MixinApi.isOrganism(body) || !MixinApi.isSlotted(body)) return false;
  const plan = body.getSpecies()?.getBodyPlan();
  if (!plan) return false;
  const insulatorMax = dial(
    AppSettingKeys.electricityInsulatorMaxConductivity,
    0.001,
  );
  for (const part of footPartsOf(body)) {
    for (const spec of plan.getSlotsCovering(part)) {
      for (const occ of body.getOccupants(spec.name)) {
        if (!MixinApi.isWearable(occ)) continue;
        const mat = MaterialApi.materialOf(occ);
        if (
          mat &&
          mat.getElectricalConductivity().rawValue() <= insulatorMax
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Is the body resting on a raised discrete surface (a dry step / stool),
 * lifting it out of the floor medium? */
function restsOnRaised(body: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(body)) return false;
  const on = body.getRestingOn();
  // The Floor is an Adornment, never a discrete resting surface — so any
  // non-null restingOn is a step/stool/chair that lifts the body off the
  // floor medium (out of a pool).
  return on !== null && (on as unknown as Stuff) !== graph.floor;
}

/** Is the body standing in the room's conductive floor medium (barefoot /
 * conductively-shod, not on a raised surface)? */
function immersedInFloorMedium(body: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(body)) return false;
  if ((ContainmentApi.getContainer(body) as Stuff | null) !== graph.room) {
    return false;
  }
  if (restsOnRaised(body, graph)) return false;
  if (groundContactInsulated(body)) return false;
  return true;
}

/** Is a source lying in the room's floor medium (the wire in the water)? */
function sourceInFloorMedium(source: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(source)) return false;
  return (ContainmentApi.getContainer(source) as Stuff | null) === graph.room;
}

/**
 * The **potential resolution** for one body against one source: is the body
 * in conductive contact with the source's live potential, and does it have a
 * path to ground? (The full-mesh seam computes node potentials here; v1
 * resolves the two booleans that gate a shock.)
 */
function resolvePotentials(
  body: Stuff,
  source: Stuff & Energized,
  graph: ConductiveGraph,
): { live: boolean; grounded: boolean } {
  const grounded = groundPath(body, graph);

  // Live contact — direct (the body holds / is held by the source) or via a
  // shared conductive pool (co-immersion).
  let live = touchesDirectly(body, source);
  if (
    !live &&
    graph.poolConducts &&
    immersedInFloorMedium(body, graph) &&
    sourceInFloorMedium(source, graph)
  ) {
    live = true;
  }
  return { live, grounded };
}

/** Direct conductive contact: one holds the other (containment edge). */
function touchesDirectly(body: Stuff, source: Stuff): boolean {
  if (!MixinApi.isContainable(body) || !MixinApi.isContainable(source)) {
    return false;
  }
  const bodyContainer = ContainmentApi.getContainer(body) as Stuff | null;
  const sourceContainer = ContainmentApi.getContainer(source) as Stuff | null;
  return bodyContainer === source || sourceContainer === body;
}

/** Does the body have a conductive path to ground? False on a raised
 * insulated step, in insulating footwear, or with no conductive floor/pool. */
function groundPath(body: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(body)) return false;
  if (groundContactInsulated(body)) return false;
  if (restsOnRaised(body, graph)) return false;
  if ((ContainmentApi.getContainer(body) as Stuff | null) !== graph.room) {
    return false;
  }
  return graph.poolConducts || graph.floorConducts;
}

/** Is the body wet (lower skin resistance)? v1: co-immersed in a conductive
 * pool. Phase 5 folds in active rain in a SkyExposed scope. */
function isWet(body: Stuff, graph: ConductiveGraph): boolean {
  return graph.poolConducts && immersedInFloorMedium(body, graph);
}

/** The worn `Constructed` armor-layer materials — the series-resistance path
 * (the armor inversion: metal ~0, rubber/leather large). */
function wornConstructedMaterials(body: Stuff): Array<Material | null> {
  if (!MixinApi.isOrganism(body) || !MixinApi.isSlotted(body)) return [];
  const plan = body.getSpecies()?.getBodyPlan();
  if (!plan) return [];
  const mats: Array<Material | null> = [];
  for (const slot of plan.getSlots()) {
    for (const occ of body.getOccupants(slot.name)) {
      if (!MixinApi.isConstructed(occ) || !MixinApi.isWearable(occ)) continue;
      mats.push(MaterialApi.materialOf(occ));
    }
  }
  return mats;
}

/**
 * The **current division** for one body: `I = ΔV / R_path`, where `R_path =
 * bodyResistance(wet) + seriesResistanceOfCoveringStack(worn armor)` and the
 * body must bridge a live potential AND a ground path. `0 A` otherwise
 * (bird-on-a-wire, insulated, dead source). v1 divides each bridged body
 * independently (the faction-blind pool hazard hits everyone); the
 * conductance-to-ground division among parallel bodies is the reserved mesh
 * seam.
 */
function divideCurrent(
  source: Stuff & Energized,
  victim: Stuff,
  graph: ConductiveGraph,
): Quantity<'A'> {
  const v = effectiveVoltage(source);
  if (v.rawValue() <= 0) return zeroAmps();
  const { live, grounded } = resolvePotentials(victim, source, graph);
  if (!live || !grounded) return zeroAmps();

  const wet = isWet(victim, graph);
  const bodyR = MaterialApi.bodyResistance(
    MaterialApi.materialOf(victim),
    wet,
  );
  const seriesR = MaterialApi.seriesResistanceOfCoveringStack(
    wornConstructedMaterials(victim),
  );
  const rPath = Quantity.of(bodyR.rawValue() + seriesR.rawValue(), 'Ω');
  return MaterialApi.ohmsCurrent(v, rPath);
}

/** A foot part (feet in the water) or the torso — the contact site a shock
 * wound sits at. */
function contactSiteFor(body: Stuff): string {
  const feet = footPartsOf(body);
  for (const f of feet) {
    if (MixinApi.isVitals(body) && body.getPart(f)) return f;
  }
  return 'body.torso';
}

function conductImpl(source: Stuff & Energized): ConductionOutcome[] {
  const room = roomForConduction(source);
  if (!room) return [];
  const graph = buildConductiveGraph(room);
  const out: ConductionOutcome[] = [];
  for (const victim of contentsOf(room)) {
    if (victim === (source as unknown as Stuff)) continue;
    if (!MixinApi.isVitals(victim)) continue;
    const current = divideCurrent(source, victim, graph);
    if (current.rawValue() <= 0) continue;
    ConditionApi.inflict(victim, {
      mechanism: 'shock',
      site: contactSiteFor(victim),
      current,
    });
    out.push({ victim, currentThrough: current });
  }
  return out;
}
