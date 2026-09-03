// ElectricityLogic — the hot-reloadable logic singleton behind ElectricityApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../../lib/security/decorators';
import { SecurityPolicies } from '../../../lib/security/SecurityPolicies';
import type { Stuff } from '../../../lib/stuff/Stuff';
import { MixinApi } from '../../../api/mixin';
import { MaterialApi } from '../../../api/material';
import { ConditionApi } from '../../../api/condition';
import { StuffApi } from '../../../api/stuff';
import { WorldClockApi } from '../../../api/worldclock';
import { TemplatePaths } from '../../../lib/paths';
import { AppApi } from '../../../api/app';
import { AppSettingKeys } from '../../../lib/config/AppSettings';
import { Quantity } from '../../../lib/quantity';
import type Material from '../../../lib/material/Material';
import type { Energized } from '../../../lib/electricity/Energized';
import type { SustainedShock } from '../Condition';
import type { ConductionOutcome } from '../../../lib/electricity/Energized';

const ElectricityApiCallers = SecurityPolicies.FromModule(
  '/api/electricity#ElectricityApi',
);

/**
 * The conduction verbs are also callable by the SOURCE itself (the
 * Energized mixin's own conduct/currentThrough/shockContact methods —
 * the Api OO sweep): the caller must both compose Energized and BE the
 * source argument, so no third object can fire someone else's charge.
 */
const ElectricitySourceCallers = SecurityPolicies.AnyOf(
  ElectricityApiCallers,
  SecurityPolicies.FromMixin('EnergizedMixin', {
    // Compare by stuffId — the caller may surface as the raw target
    // while the argument is the proxy (or vice versa).
    where: (caller, _target, _method, args) =>
      (caller as { stuffId?: string }).stuffId !== undefined &&
      (caller as { stuffId?: string }).stuffId ===
        (args[0] as { stuffId?: string } | undefined)?.stuffId,
  }),
);

/**
 * ElectricityLogic — the hot-reloadable logic singleton behind
 * {@link ElectricityApi}.
 *
 * Lives at `/platform/idea/api/electricity` (a stateless `Stuff` singleton, no backing
 * `Template`); `ElectricityApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Owns the **conduction walk** — building the
 * conductive-contact graph of a source's location, resolving which bodies
 * bridge the source's potential to ground, and dividing current toward the
 * ground sink by Ohm's law. Holds NO state and NO tick handles (a persisting
 * circuit becomes a reconcile-on-read condition on the body — see
 * `VitalsMixin`); the walk is a pure per-event computation. Internal
 * sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate; each public method
 * carries the `FromModule` gate. `dest /platform/idea/api/electricity` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ElectricityLogic extends ApiLogic {
  /** See {@link ElectricityApi.conduct}. */
  @CallSecurity(ElectricitySourceCallers)
  public conduct(source: Stuff & Energized): ConductionOutcome[] {
    return conductImpl(source);
  }

  /** See {@link ElectricityApi.currentThrough}. */
  @CallSecurity(ElectricitySourceCallers)
  public currentThrough(
    source: Stuff & Energized,
    victim: Stuff,
  ): Quantity<'A'> {
    const room = roomForConduction(source);
    if (!room) return zeroAmps();
    return divideCurrent(source, victim, buildConductiveGraph(room));
  }

  /** See {@link ElectricityApi.shockContact}. */
  @CallSecurity(ElectricitySourceCallers)
  public shockContact(
    source: Stuff & Energized,
    victim: Stuff,
  ): ConductionOutcome[] {
    return shockContactImpl(source, victim);
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
  return (node.getContainer() as Stuff | null) ?? null;
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
  const floorMat =
    floor && MixinApi.isTangible(floor) ? floor.getMaterial() : null;
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
  return room.getContents() as unknown as Stuff[];
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
        const mat = MixinApi.isTangible(occ) ? occ.getMaterial() : null;
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
  if ((body.getContainer() as Stuff | null) !== graph.room) {
    return false;
  }
  if (restsOnRaised(body, graph)) return false;
  if (groundContactInsulated(body)) return false;
  return true;
}

/** Is a source lying in the room's floor medium (the wire in the water)? */
function sourceInFloorMedium(source: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(source)) return false;
  return (source.getContainer() as Stuff | null) === graph.room;
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
  // shared conductive medium: a surface pool (co-immersion) OR the floor's
  // own conductive material (a live wire on a metal floor electrifies it).
  let live = touchesDirectly(body, source);
  if (
    !live &&
    (graph.poolConducts || graph.floorConducts) &&
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
  const bodyContainer = body.getContainer() as Stuff | null;
  const sourceContainer = source.getContainer() as Stuff | null;
  return bodyContainer === source || sourceContainer === body;
}

/** Does the body have a conductive path to ground? False on a raised
 * insulated step, in insulating footwear, or with no conductive floor/pool. */
function groundPath(body: Stuff, graph: ConductiveGraph): boolean {
  if (!MixinApi.isContainable(body)) return false;
  if (groundContactInsulated(body)) return false;
  if (restsOnRaised(body, graph)) return false;
  if ((body.getContainer() as Stuff | null) !== graph.room) {
    return false;
  }
  return graph.poolConducts || graph.floorConducts;
}

/**
 * Is the body wet (lower skin resistance → markedly more vulnerable)?
 * Reads the **stored wetness gauge** (weather Wave 2 — the upgrade over the
 * old derived `isRainWet` stopgap that read the raw global procgen field).
 * Rain wets a body via the presence-gated weather fan-out into the same
 * gauge, so this is **source-indifferent**: authored rain and procgen rain
 * both light up the shock path. Co-immersion in a conductive pool is wet
 * regardless of the gauge's prior state, and **also accrues** the gauge
 * (standing in the water soaks you) so the thermal / later reads see it.
 */
function isWet(body: Stuff, graph: ConductiveGraph): boolean {
  if (graph.poolConducts && immersedInFloorMedium(body, graph)) {
    if (MixinApi.isWet(body)) {
      body.wet(dial(AppSettingKeys.wetnessImmersionSaturation, 1));
    }
    return true;
  }
  if (MixinApi.isWet(body)) {
    const band = body.getWetnessBand();
    return band === 'wet' || band === 'soaked';
  }
  return false;
}

/**
 * The **armor inversion**, emergent from conductivity alone (no
 * `isElectrical` narrowing). The worn covering re-shapes the body's path
 * resistance: a **conductive** layer (metal plate/mail) spreads the current
 * over the body and bypasses the high-resistance skin contact — multiplying
 * the body resistance by a `<1` factor, so a plate-armored body takes MORE
 * current than a bare one; an **insulating** layer (rubber / leather / wool)
 * instead ADDS its series contact resistance, collapsing the current. A bare
 * body is just its own resistance. This is the "metal spreads current →
 * lower protection" distribution effect rendered as through-current (the
 * observable acceptance criterion), the deferred multi-site entry/exit
 * distribution left as a seam.
 */
function pathResistance(bodyResistanceOhms: number, victim: Stuff): number {
  const poolMin = dial(AppSettingKeys.electricityPoolMinConductivity, 0.005);
  const insulatorMax = dial(
    AppSettingKeys.electricityInsulatorMaxConductivity,
    0.001,
  );
  const skinFactor = dial(
    AppSettingKeys.electricityArmorConductiveSkinFactor,
    0.15,
  );
  let r = bodyResistanceOhms;
  for (const mat of wornConstructedMaterials(victim)) {
    const sigma = mat ? mat.getElectricalConductivity().rawValue() : 0;
    if (sigma >= poolMin) {
      // Conductive covering — spreads the current, lowers the skin path.
      r *= skinFactor;
    } else if (sigma <= insulatorMax) {
      // Insulating covering — adds series resistance (a rubber suit).
      r += MaterialApi.contactResistance(mat).rawValue();
    }
  }
  return r;
}

/** The worn `Constructed` armor-layer materials — the series-resistance path
 * (the armor inversion: metal spreads/lowers, rubber/leather adds). */
function wornConstructedMaterials(body: Stuff): Array<Material | null> {
  if (!MixinApi.isOrganism(body) || !MixinApi.isSlotted(body)) return [];
  const plan = body.getSpecies()?.getBodyPlan();
  if (!plan) return [];
  const mats: Array<Material | null> = [];
  for (const slot of plan.getSlots()) {
    for (const occ of body.getOccupants(slot.name)) {
      if (!MixinApi.isConstructed(occ) || !MixinApi.isWearable(occ)) continue;
      mats.push(MixinApi.isTangible(occ) ? occ.getMaterial() : null);
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
    MixinApi.isTangible(victim) ? victim.getMaterial() : null,
    wet,
  ).rawValue();
  const rPath = Quantity.of(pathResistance(bodyR, victim), 'Ω');
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
    const site = contactSiteFor(victim);
    ConditionApi.inflict(victim, {
      mechanism: 'shock',
      site,
      current,
    });
    // Hand a persisting circuit off to the reconcile-on-read sustain (the
    // being-shocked condition): above let-go the circuit holds, at the
    // tetanic band the "can't let go" flag latches it closed.
    maybeSustain(source, victim, current.rawValue(), site);
    out.push({ victim, currentThrough: current });
  }
  return out;
}

/**
 * A **direct two-terminal contact shock** — the stun-baton / taser path. A
 * contact device completes its own circuit through its two electrodes on the
 * victim, so it needs NO ground path and NO conductive medium: the current
 * is `I = V / (bodyResistance + worn-series)` straight through the contact.
 * Distinct from `conduct` (the ambient graph walk) — the honest unification
 * is that both end at `ConditionApi.inflict({mechanism:'shock', current})`.
 * A single victim; still upserts the being-shocked sustain (a held baton
 * keeps shocking). A no-op for a de-energized source.
 */
function shockContactImpl(
  source: Stuff & Energized,
  victim: Stuff,
): ConductionOutcome[] {
  if (!MixinApi.isVitals(victim)) return [];
  const v = effectiveVoltage(source);
  if (v.rawValue() <= 0) return [];
  const bodyR = MaterialApi.bodyResistance(
    MixinApi.isTangible(victim) ? victim.getMaterial() : null,
    false,
  ).rawValue();
  const rPath = Quantity.of(pathResistance(bodyR, victim), 'Ω');
  const current = MaterialApi.ohmsCurrent(v, rPath);
  if (current.rawValue() <= 0) return [];
  const site = contactSiteFor(victim);
  ConditionApi.inflict(victim, { mechanism: 'shock', site, current });
  maybeSustain(source, victim, current.rawValue(), site);
  return [{ victim, currentThrough: current }];
}

/**
 * Upsert the being-shocked `SustainedShock` on a bridged body. Only when the
 * source carries a durable `templatePath` (the reconcile re-verify re-probes
 * it) and the current is at/above let-go (below that it's a one-shot tingle,
 * no sustain). Idempotent — a re-conduct updates the live record rather than
 * stacking duplicates.
 */
function maybeSustain(
  source: Stuff & Energized,
  victim: Stuff,
  amps: number,
  site: string,
): void {
  const sourcePath = (source as unknown as Stuff).getTemplatePath?.();
  if (!sourcePath) return;
  const letGo = dial(AppSettingKeys.electricityLetGoAmps, 0.01);
  if (amps < letGo) return;
  if (!MixinApi.isVitals(victim)) return;
  const tetanic = dial(AppSettingKeys.electricityTetanicAmps, 0.02);
  const tetany = amps >= tetanic;
  // The after-grip window: a discrete contact (a baton tap) breaks its own
  // circuit at once, so tetany can't self-sustain off the circuit re-probe
  // — this bounds it. A live circuit re-probes as closed and holds tetany
  // regardless, but we still refresh the stamp so the grip lingers a beat
  // past the moment the victim is pulled free. Absent clock → no window.
  const tetanyUntil = tetany ? tetanyReleaseAt() : undefined;

  const existing = victim.getConditions().find(
    (c): c is SustainedShock =>
      c.kind === 'shock' && c.source === sourcePath,
  );
  if (existing) {
    existing.current = amps;
    if (tetany) {
      existing.tetany = true;
      if (tetanyUntil !== undefined) existing.tetanyUntil = tetanyUntil;
    }
    if (!existing.sites.includes(site)) existing.sites.push(site);
    return;
  }
  const record: SustainedShock = {
    kind: 'shock',
    current: amps,
    source: sourcePath,
    sites: [site],
  };
  if (tetany) {
    record.tetany = true;
    if (tetanyUntil !== undefined) record.tetanyUntil = tetanyUntil;
  }
  victim.afflict(record);
}

/** The game-time at which a freshly-latched tetany's after-grip releases,
 * or undefined when no world clock is running (a pre-boot / unit context
 * that never advances — the record then rides the circuit re-probe alone,
 * the pre-window behaviour). */
function tetanyReleaseAt(): number | undefined {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return undefined;
  }
  const nowS = WorldClockApi.getNow().rawValue();
  return nowS + dial(AppSettingKeys.electricityTetanyPulseSeconds, 6);
}
