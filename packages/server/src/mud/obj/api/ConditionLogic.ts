// ConditionLogic — the hot-reloadable logic singleton behind ConditionApi.
// (Doc comment on the class below so @internal lands on the reflection.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import { MixinApi } from '../../api/mixin';
import { MaterialApi } from '../../api/material';
import { ExecutionContextApi } from '../../api/execution-context';
import { WorldClockApi } from '../../api/worldclock';
import { StuffApi } from '../../api/stuff';
import { TemplatePaths } from '../../lib/paths';
import { HARM_DEFAULTS, TRAUMA_BEHAVIOR } from '../../lib/vitals/Condition';
import { Channels } from '../../lib/material/Channel';
import type { Channel } from '../../lib/material/Channel';
import type { Construction } from '../../lib/material/Construction';
import type { Grade } from '../../lib/craft/Grade';
import type Material from '../../lib/material/Material';
import type {
  ActiveCondition,
  Trauma,
  TraumaType,
} from '../../lib/vitals/Condition';
import type { InflictSpec, InflictOutcome } from '../../api/condition';

const ConditionApiCallers = SecurityPolicies.FromModule(
  '/api/condition#ConditionApi'
);

/**
 * The channel's default trauma type — used to *record* a deflected (null-
 * resolution) blow's shape and to name the trauma a channel produces:
 * edge→laceration, point→puncture, blunt→contusion. `resolveTrauma`
 * refines blunt to a fracture on a boned part; this is the base.
 */
function channelDefaultType(channel: Channel): TraumaType {
  switch (channel) {
    case 'edge':
      return 'laceration';
    case 'point':
      return 'puncture';
    case 'blunt':
      return 'contusion';
  }
}

/**
 * The legacy magnitude-only severity — `energy → severity`, linear via a
 * single dial. Used ONLY by the `'thermal'` / `'tearing'` passthrough (burn
 * / avulsion) until those fold into a `heat` / tearing channel. Channel
 * insults derive severity from the materials-response function instead.
 */
function severityFromEnergy(energy: number): number {
  return Math.max(0, energy) * HARM_DEFAULTS.SEVERITY_PER_ENERGY;
}

/** One armor layer over a struck part — the materials-response inputs. */
interface CoveringLayer {
  material: Material | null;
  construction: Construction;
  grade: Grade | undefined;
  condition: number;
}

/**
 * Resolve the armor covering `partKey` on `host`, ordered **outside-in**
 * (outer layer first). Reads the body plan's `getSlotsCovering` (the
 * `covers` edge), keeps the occupants that are `Constructed` armor +
 * `Wearable`, and sorts by construction layer depth (plate outer … padded
 * inner). A module-private free function (no intra-singleton self-call).
 */
function resolveCoveringStack(host: Stuff, partKey: string): CoveringLayer[] {
  if (!MixinApi.isOrganism(host) || !MixinApi.isSlotted(host)) return [];
  const covering = host.getSpecies()?.getBodyPlan()?.getSlotsCovering(partKey);
  if (!covering || covering.length === 0) return [];
  const layers: CoveringLayer[] = [];
  for (const spec of covering) {
    for (const occ of host.getOccupants(spec.name)) {
      if (!MixinApi.isConstructed(occ) || !MixinApi.isWearable(occ)) continue;
      const construction = occ.getConstruction();
      if (!construction || !construction.isArmor()) continue;
      layers.push({
        material: MaterialApi.materialOf(occ),
        construction,
        grade: MixinApi.isGraded(occ) ? occ.getGrade() : undefined,
        condition: MixinApi.isTool(occ) ? occ.getCondition() : 1,
      });
    }
  }
  // Outside-in: highest layer depth first (plate outer, padded innermost).
  layers.sort(
    (a, b) => b.construction.getLayerDepth() - a.construction.getLayerDepth(),
  );
  return layers;
}

/** Does the resolved part carry a bone tissue (gates blunt → fracture)? */
function partHasBoneTissue(part: { tissues?: { tissuePath: string }[] }): boolean {
  for (const t of part.tissues ?? []) {
    const mat = StuffApi.findByTemplatePath<Material>(t.tissuePath);
    if (mat && mat.hasTag('bone')) return true;
    if (t.tissuePath.includes('bone')) return true; // pre-load fallback
  }
  return false;
}

/** The first resolvable tissue Material of the part (v1: type-decision only). */
function primaryTissueMaterial(part: {
  tissues?: { tissuePath: string }[];
}): Material | null {
  for (const t of part.tissues ?? []) {
    const mat = StuffApi.findByTemplatePath<Material>(t.tissuePath);
    if (mat) return mat;
  }
  return null;
}

/**
 * Resolve the inflicter's durable `templatePath` from execution context —
 * the command-frame giver (non-forced, single-consistent) or the REST
 * acting-author stamp. Never a caller-supplied parameter (the gated-Api
 * actor-from-context rule); `undefined` for an environmental / far-cause
 * / unattributable insult (forced dispatch, cross-actor cascade).
 */
function resolveInflicter(): string | undefined {
  const author = ExecutionContextApi.getActingAuthor();
  if (author == null) return undefined;
  const path = (author as Stuff).getTemplatePath?.();
  return path ?? undefined;
}

/** In-session game-time seconds, or `null` when no world clock is running. */
function conditionNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
    return null;
  }
  return WorldClockApi.getNow().rawValue();
}

/**
 * ConditionLogic — the hot-reloadable logic singleton behind
 * {@link ConditionApi}.
 *
 * Lives at `/obj/api/condition` (a stateless `Stuff` singleton, no backing
 * `Template`); `ConditionApi`'s public statics forward here via
 * `StuffApi.singletonSync`. The gated **inflict producer** — now resolving
 * a `Channel` insult outside-in through the materials-response covering
 * stack into the tissue (both trauma type and severity), with a legacy
 * `thermal`/`tearing` passthrough — plus the plain condition mutators
 * (`afflict` / `relieve`) and the condition query. Wound progression
 * (bleed / heal / death) is
 * driven **reconcile-on-read** by `VitalsMixin.reconcileConditions` — this
 * singleton holds NO tick handles and NO in-memory state. Internal
 * sub-logic lives in module-private free functions, so there are no
 * intra-singleton `this.x()` calls to trip the gate. Each public method
 * carries the `FromModule` gate. `dest /obj/api/condition` reloads it.
 *
 * @internal
 */
@Unshadowable
export class ConditionLogic extends ApiLogic {
  /** See {@link ConditionApi.inflict}. */
  @CallSecurity(ConditionApiCallers)
  public inflict(target: Stuff, spec: InflictSpec): InflictOutcome {
    const inflicter = resolveInflicter();
    return Channels.isChannel(spec.mechanism)
      ? inflictThroughStack(target, spec, spec.mechanism, inflicter)
      : inflictPassthrough(target, spec, inflicter);
  }

  /** See {@link ConditionApi.afflict}. */
  @CallSecurity(ConditionApiCallers)
  public afflict(target: Stuff, condition: ActiveCondition): void {
    if (!MixinApi.isVitals(target)) return;
    target.afflict(condition);
  }

  /** See {@link ConditionApi.relieve}. */
  @CallSecurity(ConditionApiCallers)
  public relieve(target: Stuff, condition: ActiveCondition): boolean {
    if (!MixinApi.isVitals(target)) return false;
    return target.relieve(condition);
  }

  /** See {@link ConditionApi.conditionsOf}. */
  @CallSecurity(ConditionApiCallers)
  public conditionsOf(target: Stuff): readonly ActiveCondition[] {
    if (!MixinApi.isVitals(target)) return [];
    return target.getConditions();
  }
}

/**
 * The materials-response path — a {@link Channel} insult resolved
 * outside-in through the covering stack into the tissue. Both the trauma
 * *type* and its *severity* come from the response function; a fully-
 * attenuated blow (null resolution) lands no wound but returns a truthful
 * record. Module-private (off-class, so no intra-singleton self-call).
 */
function inflictThroughStack(
  target: Stuff,
  spec: InflictSpec,
  channel: Channel,
  inflicter: string | undefined,
): InflictOutcome {
  const isBody = MixinApi.isVitals(target);
  let residual = Math.max(0, spec.energy);
  let partHasBone = false;
  let tissueMaterial: Material | null = null;

  if (isBody) {
    for (const layer of resolveCoveringStack(target, spec.site)) {
      residual = MaterialApi.attenuate(
        channel,
        residual,
        layer.material,
        layer.construction,
        layer.grade,
        layer.condition,
      ).residualEnergy;
    }
    const part = target.getPart(spec.site);
    if (part) {
      partHasBone = partHasBoneTissue(part);
      tissueMaterial = primaryTissueMaterial(part);
    }
  }

  const resolution = MaterialApi.resolveTrauma(
    channel,
    residual,
    tissueMaterial,
    partHasBone,
  );
  const trauma: Trauma = {
    kind: 'trauma',
    type: resolution?.type ?? channelDefaultType(channel),
    site: spec.site,
    severity: resolution?.severity ?? 0,
    mechanism: channel,
  };
  if (inflicter !== undefined) trauma.inflictedBy = inflicter;

  // Non-body target, or the stack turned the blow → nothing afflicted, but
  // the outcome carries the (severity-0 / deflected) record.
  if (!isBody || resolution === null) {
    return { trauma, afflicted: false };
  }

  const nowS = conditionNowSeconds();
  if (nowS !== null) trauma.tickedAt = nowS;
  TRAUMA_BEHAVIOR[trauma.type].onset(target, trauma);
  target.afflict(trauma);
  return { trauma, afflicted: true };
}

/**
 * The legacy magnitude-only passthrough — `'thermal'` → burn, `'tearing'`
 * → avulsion — byte-preserving harm's shipped burn/avulsion math until
 * those fold into a `heat` / tearing channel. See
 * docs/subsystems/materials-response.md.
 */
function inflictPassthrough(
  target: Stuff,
  spec: InflictSpec,
  inflicter: string | undefined,
): InflictOutcome {
  const type: TraumaType = spec.mechanism === 'thermal' ? 'burn' : 'avulsion';
  const trauma: Trauma = {
    kind: 'trauma',
    type,
    site: spec.site,
    severity: severityFromEnergy(spec.energy),
    mechanism: spec.mechanism,
  };
  if (inflicter !== undefined) trauma.inflictedBy = inflicter;

  if (!MixinApi.isVitals(target)) {
    return { trauma, afflicted: false };
  }
  const nowS = conditionNowSeconds();
  if (nowS !== null) trauma.tickedAt = nowS;
  TRAUMA_BEHAVIOR[type].onset(target, trauma);
  target.afflict(trauma);
  return { trauma, afflicted: true };
}
