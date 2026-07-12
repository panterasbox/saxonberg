// MaterialLogic — the hot-reloadable logic singleton behind MaterialApi.
// (Doc comment lives on the class declaration below so @internal lands
// on the reflection TypeDoc emits, not on the module.)

import { ApiLogic } from '../../lib/stuff/ApiLogic';
import { CallSecurity, Unshadowable } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { Stuff } from '../../lib/stuff/Stuff';
import type Material from '../../lib/material/Material';
import type {
  MaterialComposition,
  AttenuationResult,
  TraumaResolution,
  OutcomeBand,
} from '../../api/material';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import type { Channel } from '../../lib/material/Channel';
import type {
  Construction,
  ResistToken,
} from '../../lib/material/Construction';
import type { Grade } from '../../lib/craft/Grade';
import type { TraumaType } from '../../lib/vitals/Condition';

const MaterialApiCallers = SecurityPolicies.FromModule('/api/material#MaterialApi'
);

/**
 * MaterialLogic — the hot-reloadable logic singleton behind
 * {@link MaterialApi}.
 *
 * Lives at `/obj/api/material` (a stateless `Stuff` singleton, no
 * backing `Template`); `MaterialApi`'s public statics forward here via
 * `StuffApi.singletonSync`. Any module that grabs this singleton and
 * calls a method other than through the Api gets `SecurityError`.
 *
 * Stateless by construction (no `PostRegistrationMixin`): `dest` is the
 * reload invalidator and the next `singletonSync` re-creates against
 * the current blueprint. Shared sub-logic lives in module-private free
 * functions (not gated, but off-class and un-callable from outside),
 * so there are no intra-singleton `this.x()` self-calls to trip the
 * gate.
 *
 * The `FromModule` gate is applied **per public method**, not at the
 * class level: a class-level default would also cover the inherited
 * `Stuff`/`Idea` framework methods (`getTemplatePath`, `isDestroyed`,
 * …) that the framework itself invokes (e.g. during `register`), whose
 * caller is `StuffApi`, not `MaterialApi` — and they'd be denied. Only
 * this singleton's own surface carries the gate; inherited methods keep
 * their framework policies. (Mirrors `AccessRegistry`.)
 *
 * @internal
 */
@Unshadowable
export class MaterialLogic extends ApiLogic {
  /** See {@link MaterialApi.materialOf}. */
  @CallSecurity(MaterialApiCallers)
  public materialOf(stuff: Stuff, detailKey?: string): Material | null {
    if (!MixinApi.isTangible(stuff)) return null;
    return stuff.getMaterial(detailKey);
  }

  /** See {@link MaterialApi.compositionOf}. */
  @CallSecurity(MaterialApiCallers)
  public compositionOf(material: Material): MaterialComposition {
    return computeComposition(material);
  }

  /** See {@link MaterialApi.containsElement}. */
  @CallSecurity(MaterialApiCallers)
  public containsElement(material: Material, elementSymbol: string): boolean {
    return containsElementOf(material, elementSymbol);
  }

  /** See {@link MaterialApi.findByTag}. */
  @CallSecurity(MaterialApiCallers)
  public findByTag(tag: string): Material[] {
    return everyMaterial().filter((m) => m.hasTag(tag));
  }

  /** See {@link MaterialApi.findByElement}. */
  @CallSecurity(MaterialApiCallers)
  public findByElement(symbol: string): Material[] {
    return everyMaterial().filter((m) => containsElementOf(m, symbol));
  }

  // ---------- materials-response ----------

  /** See {@link MaterialApi.attenuate}. */
  @CallSecurity(MaterialApiCallers)
  public attenuate(
    channel: Channel,
    energy: number,
    material: Material | null,
    construction: Construction,
    grade?: Grade,
    condition?: number,
  ): AttenuationResult {
    return attenuateImpl(
      channel,
      energy,
      material,
      construction,
      grade,
      condition,
    );
  }

  /** See {@link MaterialApi.resolveTrauma}. */
  @CallSecurity(MaterialApiCallers)
  public resolveTrauma(
    channel: Channel,
    energy: number,
    tissueMaterial: Material | null,
    partHasBone: boolean,
  ): TraumaResolution | null {
    return resolveTraumaImpl(channel, energy, tissueMaterial, partHasBone);
  }

  /** See {@link MaterialApi.previewBand}. */
  @CallSecurity(MaterialApiCallers)
  public previewBand(
    channel: Channel,
    material: Material | null,
    construction: Construction,
    grade?: Grade,
    condition?: number,
  ): OutcomeBand {
    return previewBandImpl(channel, material, construction, grade, condition);
  }

  /** See {@link MaterialApi.severityToBand}. */
  @CallSecurity(MaterialApiCallers)
  public severityToBand(severity: number | null): OutcomeBand {
    return severityToBand(severity);
  }

  /** See {@link MaterialApi.deliverableChannels}. */
  @CallSecurity(MaterialApiCallers)
  public deliverableChannels(construction: Construction): Channel[] {
    return construction.deliveredChannels();
  }

  /** See {@link MaterialApi.primaryChannel}. */
  @CallSecurity(MaterialApiCallers)
  public primaryChannel(construction: Construction): Channel | null {
    return construction.primaryChannel();
  }
}

// ---------- response-function internals (module-private free functions) ----------
//
// The physics core. Pure + isolated (no persistence, no world clock). The
// SHAPE (which token, which property dominates a channel) is code; every
// MAGNITUDE is an AppSetting read with a fallback to the seeded literal so a
// pre-warm / test read is safe. Off-class so there are no intra-singleton
// `this.x()` self-calls to trip the gate.

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

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

/** Per-token base attenuation fraction (the magnitude the qualitative shape
 * token resolves to). */
function baseAttenuationFor(token: ResistToken): number {
  const K = AppSettingKeys;
  switch (token) {
    case 'deflect':
      return dial(K.responseAttenuationDeflect, 0.98);
    case 'resist':
      return dial(K.responseAttenuationResist, 0.7);
    case 'absorb':
      return dial(K.responseAttenuationAbsorb, 0.75);
    case 'moderate':
      return dial(K.responseAttenuationModerate, 0.5);
    case 'poor':
      return dial(K.responseAttenuationPoor, 0.2);
    case 'transmit':
      return dial(K.responseAttenuationTransmit, 0.1);
    case 'fail':
      return dial(K.responseAttenuationFail, 0);
  }
}

/**
 * The *height* a material lends the response curve on a channel — the
 * normalized ratio vs the reference (steel) magnitudes, per-channel weighted.
 * `edge` is hardness-driven (a hard surface turns a cut); `blunt` is
 * toughness-driven with a structural floor (a construction's blunt response
 * is largely give/loft, so a soft absorber still works); `point` mixes both
 * (resist the tip AND resist punch-through). Unauthored material (zero
 * props) lends zero height on the cutting channels.
 */
function materialHeight(material: Material | null, channel: Channel): number {
  const scaleMax = dial(AppSettingKeys.responseMaterialScaleMax, 1.5);
  if (!material) return 0;
  const hardnessRef = dial(AppSettingKeys.responseMaterialHardnessRef, 600);
  const toughnessRef = dial(AppSettingKeys.responseMaterialToughnessRef, 200);
  const hn = clamp(material.getHardness().rawValue() / hardnessRef, 0, scaleMax);
  const tn = clamp(
    material.getToughness().rawValue() / toughnessRef,
    0,
    scaleMax,
  );
  // The channel picks which property dominates (SHAPE, code); the floor and
  // refs are magnitudes (AppSettings). edge → hardness (a hard surface turns
  // a cut), blunt → toughness (energy absorbed before failure), point → both.
  let ratio: number;
  switch (channel) {
    case 'edge':
      ratio = hn;
      break;
    case 'point':
      ratio = 0.5 * (hn + tn);
      break;
    case 'blunt':
      ratio = tn;
      break;
  }
  const floor = dial(AppSettingKeys.responseMaterialHeightFloor, 0.6);
  return clamp(floor + (1 - floor) * ratio, 0, scaleMax);
}

/**
 * The `grade × condition` height scalar (Settled-4: quality scales height,
 * never shape). Grade lerps within [min, max] across the five bands;
 * condition lerps within [conditionMin, 1]. Tuned so a masterwork at ~50%
 * condition lands in the same band as a common (fair) piece at 100%.
 */
function gradeConditionScale(grade?: Grade, condition?: number): number {
  const gmin = dial(AppSettingKeys.responseGradeMin, 0.85);
  const gmax = dial(AppSettingKeys.responseGradeMax, 1.15);
  const ord = grade ? grade.getOrdinal() : 1; // default 'fair'
  const gradeFactor = lerp(gmin, gmax, ord / 4);
  const condMin = dial(AppSettingKeys.responseConditionMin, 0.5);
  const cond = condition === undefined ? 1 : clamp01(condition);
  const conditionFactor = lerp(condMin, 1, cond);
  return gradeFactor * conditionFactor;
}

function attenuateImpl(
  channel: Channel,
  energy: number,
  material: Material | null,
  construction: Construction,
  grade?: Grade,
  condition?: number,
): AttenuationResult {
  const e = Math.max(0, energy);
  // A non-armor (weapon) construction attenuates nothing — energy passes.
  if (!construction.isArmor()) {
    return { residualEnergy: e, channel };
  }
  const token = construction.responseFor(channel);
  const base = baseAttenuationFor(token);
  const height = materialHeight(material, channel);
  const scale = gradeConditionScale(grade, condition);
  const atten = clamp01(base * height * scale);
  return { residualEnergy: e * (1 - atten), channel };
}

function resolveTraumaImpl(
  channel: Channel,
  energy: number,
  _tissueMaterial: Material | null,
  partHasBone: boolean,
): TraumaResolution | null {
  const e = Math.max(0, energy);
  if (e < dial(AppSettingKeys.responseNoWoundThreshold, 0.25)) {
    return null; // turned — no meaningful wound reached tissue
  }
  const severity = e * dial(AppSettingKeys.responseSeverityPerResidual, 1);
  let type: TraumaType;
  switch (channel) {
    case 'edge':
      type = 'laceration';
      break;
    case 'point':
      type = 'puncture';
      break;
    case 'blunt': {
      const fracture = dial(AppSettingKeys.responseBluntFractureThreshold, 1.5);
      type = e >= fracture && partHasBone ? 'fracture' : 'contusion';
      break;
    }
  }
  return { type, severity };
}

function severityToBand(severity: number | null): OutcomeBand {
  if (severity === null || severity <= 0) return 'turned';
  if (severity < dial(AppSettingKeys.responseBandGrazeMax, 0.5)) return 'grazes';
  if (severity < dial(AppSettingKeys.responseBandBiteMax, 1.5)) return 'bites';
  return 'bites-deep';
}

function previewBandImpl(
  channel: Channel,
  material: Material | null,
  construction: Construction,
  grade?: Grade,
  condition?: number,
): OutcomeBand {
  const refEnergy = dial(AppSettingKeys.responsePreviewReferenceEnergy, 2);
  if (construction.isArmor()) {
    const { residualEnergy } = attenuateImpl(
      channel,
      refEnergy,
      material,
      construction,
      grade,
      condition,
    );
    const trauma = resolveTraumaImpl(channel, residualEnergy, null, false);
    return severityToBand(trauma ? trauma.severity : null);
  }
  // weapon-delivery: the blow it delivers on this channel.
  const token = construction.deliveryFor(channel);
  if (token === 'none') return 'turned';
  const factor =
    token === 'primary'
      ? 1
      : dial(AppSettingKeys.responseDeliverySecondaryFactor, 0.6);
  const eff =
    refEnergy *
    factor *
    materialHeight(material, channel) *
    gradeConditionScale(grade, condition);
  const trauma = resolveTraumaImpl(channel, eff, null, false);
  return severityToBand(trauma ? trauma.severity : null);
}

/**
 * Recursively expand `material`'s composition. `direct` is one level;
 * `flat` aggregates leaf-element weight fractions. Pure elements with a
 * `chemistry.symbol` contribute their full mass to their own symbol (so
 * iron returns `{ Fe: 1 }`); mixtures recursively expand.
 *
 * Cycle-guarded: a composition reference back to an ancestor truncates
 * the walk at that node (defensive — well-formed content shouldn't
 * produce cycles).
 */
function computeComposition(material: Material): MaterialComposition {
  const direct = material.getComposition();
  const flat: Record<string, number> = {};
  const visited = new Set<string>();
  expandInto(material, 1, flat, visited);
  return {
    material,
    direct: direct.map((e) => ({ ...e })),
    flat,
  };
}

/**
 * Does `material` contain `elementSymbol` anywhere in its recursive
 * composition? Walks the same expansion as {@link computeComposition}
 * and consults the leaf elements' `chemistry.symbol`.
 */
function containsElementOf(material: Material, elementSymbol: string): boolean {
  const flat = computeComposition(material).flat;
  return (flat[elementSymbol] ?? 0) > 0;
}

function everyMaterial(): Material[] {
  return StuffApi.findByPathGlob<Material>('/lib/material/**').filter((m) =>
    isMaterial(m)
  );
}

function isMaterial(stuff: Stuff): stuff is Material {
  // Duck-check via the Material surface. Avoids an instanceof import
  // cycle and tolerates RadioactiveMaterial / future capability
  // subclasses uniformly.
  return (
    typeof (stuff as Partial<Material>).getDensity === 'function' &&
    typeof (stuff as Partial<Material>).getTags === 'function'
  );
}

function expandInto(
  material: Material,
  weight: number,
  acc: Record<string, number>,
  visited: Set<string>
): void {
  const path = material.getTemplatePath();
  if (path && visited.has(path)) return;
  if (path) visited.add(path);

  const direct = material.getComposition();
  if (direct.length === 0) {
    // Leaf material — credit its own element symbol if it has one.
    const symbol = material.getChemistry()?.symbol;
    if (symbol) acc[symbol] = (acc[symbol] ?? 0) + weight;
    return;
  }

  for (const entry of direct) {
    const child = StuffApi.findByTemplatePath<Material>(entry.materialPath);
    if (!child) continue;
    expandInto(child, weight * entry.fraction, acc, visited);
  }
}
