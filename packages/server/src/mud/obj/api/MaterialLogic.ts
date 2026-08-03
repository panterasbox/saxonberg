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
import { StuffApi } from '../../api/stuff';
import { Template } from '../../lib/stuff/Template';
import { AppApi } from '../../api/app';
import { AppSettingKeys } from '../../lib/config/AppSettings';
import { Channels } from '../../lib/material/Channel';
import type { Channel } from '../../lib/material/Channel';
import type {
  Construction,
  ResistToken,
} from '../../lib/material/Construction';
import { Quantity } from '../../lib/quantity';
import type { Grade } from '../../lib/craft/Grade';
import type { TraumaType } from '../Condition';

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
  /** See {@link MaterialApi.boot}. */
  @CallSecurity(MaterialApiCallers)
  public boot(): Promise<number> {
    return bootImpl();
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

  /** See {@link MaterialApi.gradeConditionScale}. */
  @CallSecurity(MaterialApiCallers)
  public gradeConditionScale(grade?: Grade, condition?: number): number {
    return gradeConditionScale(grade, condition);
  }

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
  // The former `deliverableChannels` / `primaryChannel` thin forwarders
  // were removed (item-1 antipattern sweep): callers hold a
  // `Construction` and call `.deliveredChannels()` / `.primaryChannel()`
  // directly.

  // ---------- electricity: the Ohm's-law circuit primitives ----------

  /** See {@link MaterialApi.ohmsCurrent}. */
  @CallSecurity(MaterialApiCallers)
  public ohmsCurrent(
    voltage: Quantity<'V'>,
    resistance: Quantity<'Ω'>,
  ): Quantity<'A'> {
    return ohmsCurrentImpl(voltage, resistance);
  }

  /** See {@link MaterialApi.jouleHeat}. */
  @CallSecurity(MaterialApiCallers)
  public jouleHeat(
    current: Quantity<'A'>,
    resistance: Quantity<'Ω'>,
  ): Quantity<'W'> {
    return jouleHeatImpl(current, resistance);
  }

  /** See {@link MaterialApi.bodyResistance}. */
  @CallSecurity(MaterialApiCallers)
  public bodyResistance(
    material: Material | null,
    wet: boolean,
  ): Quantity<'Ω'> {
    return bodyResistanceImpl(material, wet);
  }

  /** See {@link MaterialApi.contactResistance}. */
  @CallSecurity(MaterialApiCallers)
  public contactResistance(material: Material | null): Quantity<'Ω'> {
    return contactResistanceImpl(material);
  }

  /** See {@link MaterialApi.seriesResistanceOfCoveringStack}. */
  @CallSecurity(MaterialApiCallers)
  public seriesResistanceOfCoveringStack(
    materials: ReadonlyArray<Material | null>,
  ): Quantity<'Ω'> {
    return seriesResistanceOfCoveringStackImpl(materials);
  }

  /** See {@link MaterialApi.resolveShock}. */
  @CallSecurity(MaterialApiCallers)
  public resolveShock(current: Quantity<'A'>): TraumaResolution | null {
    return resolveShockImpl(current);
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
    default:
      // Non-mechanical channel (shock) — no mechanical height. Never
      // reached in practice (shock skips the fold); guards exhaustiveness.
      ratio = 0;
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

/**
 * The heat *insulation* one covering layer contributes — the fraction of
 * incident heat it blocks. Reads the layer material's `thermalConductivity`
 * (inverted: a low-conductivity insulator like leather/wool blocks hard, a
 * high-conductivity conductor like steel/iron barely blocks) and the
 * construction's outside-in layer depth (a deeper stack blocks more). This is
 * the heat sibling of the mechanical `baseAttenuationFor × materialHeight`
 * fold — same shape (base × height × depth × quality), thermal-property
 * driven. The armor inversion is emergent: no `isThermal` special case, just
 * conductivity. Returns a 0..1 blocked fraction.
 */
function heatAttenuationFraction(
  material: Material | null,
  construction: Construction,
  grade?: Grade,
  condition?: number,
): number {
  const base = dial(AppSettingKeys.responseHeatBaseAttenuation, 0.9);
  const refCond = dial(
    AppSettingKeys.responseHeatInsulationRefConductivity,
    2.0,
  );
  // A materialless / unknown covering conducts freely (no insulation).
  const cond = material
    ? material.getThermalConductivity().rawValue()
    : Number.POSITIVE_INFINITY;
  // insulation height: ref / (ref + conductivity) — 1 at zero conductivity,
  // →0 for a good conductor. leather (~0.14) → ~0.78, iron (~80) → ~0.006.
  const insulation = refCond / (refCond + Math.max(0, cond));
  const depth = construction.getLayerDepth();
  const depthBonus = 1 + depth * dial(AppSettingKeys.responseHeatDepthFactor, 0.1);
  const scale = gradeConditionScale(grade, condition);
  return clamp01(base * insulation * depthBonus * scale);
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
  // The thermal channel (heat) folds through the covering stack by
  // *insulation*, not the hardness/toughness mechanical fold.
  if (Channels.isThermalChannel(channel)) {
    const blocked = heatAttenuationFraction(
      material,
      construction,
      grade,
      condition,
    );
    return { residualEnergy: e * (1 - blocked), channel };
  }
  // A remaining non-mechanical channel (shock) doesn't fold through the
  // covering stack — it resolves by circuit upstream. Passes through untouched.
  if (!Channels.isMechanicalChannel(channel)) {
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
  // The thermal channel (heat): residual heat that survived the insulation
  // stack meets tissue as a `burn`, severity linear in the residual (the
  // same residual→severity tail the mechanical channels use). Below the
  // no-wound floor the heat was fully insulated → no burn.
  if (Channels.isThermalChannel(channel)) {
    if (e < dial(AppSettingKeys.responseNoWoundThreshold, 0.25)) return null;
    return {
      type: 'burn',
      severity: e * dial(AppSettingKeys.responseSeverityPerResidual, 1),
    };
  }
  // A remaining non-mechanical channel (shock) has no mechanical-fold trauma —
  // its trauma is resolved by the circuit path (`resolveShock`), not here.
  if (!Channels.isMechanicalChannel(channel)) return null;
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
  return StuffApi.findByPathGlob<Material>('/obj/material/**').filter((m) =>
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

// ---------- electricity: circuit internals (module-private free functions) ----------
//
// The honest, scale-invariant Ohm's-law core. `I = V/R` and `P = I²R` hold
// at every scale — the shock, the baton, and the deferred substation are one
// formula set. The SHAPE (which property inverts to resistance, the covering
// stack as a series sum) is code; every MAGNITUDE (geometry, floors/ceilings,
// the current bands) is an `electricity.*` dial with a seeded-literal
// fallback. No graph here — that is `ElectricityLogic`; these are the
// per-element primitives it composes.

/** `I = V/R` — current through a path, R floored to dodge divide-by-zero. */
function ohmsCurrentImpl(
  voltage: Quantity<'V'>,
  resistance: Quantity<'Ω'>,
): Quantity<'A'> {
  const floor = dial(AppSettingKeys.electricityResistanceFloorOhms, 1);
  const r = Math.max(resistance.rawValue(), floor);
  return Quantity.of(voltage.rawValue() / r, 'A');
}

/** `P = I²R` — the Joule loss term (seeds the deferred Joule→fire coupling;
 * the honest formula ships now, unused for harm in v1). */
function jouleHeatImpl(
  current: Quantity<'A'>,
  resistance: Quantity<'Ω'>,
): Quantity<'W'> {
  const i = current.rawValue();
  return Quantity.of(i * i * resistance.rawValue(), 'W');
}

/**
 * A body's contact-to-contact resistance. Reads flesh conductivity through
 * a nominal internal-path geometry (`R = (L/A)/σ`) so the material axis is
 * honest; falls back to the dry-skin dial when a body carries no
 * conductivity material. A `wet` body divides by the wet-skin factor (the
 * real reason water is deadly). Floored.
 */
function bodyResistanceImpl(
  material: Material | null,
  wet: boolean,
): Quantity<'Ω'> {
  const floor = dial(AppSettingKeys.electricityResistanceFloorOhms, 1);
  const sigma = material
    ? material.getElectricalConductivity().rawValue()
    : 0;
  let r: number;
  if (sigma > 0) {
    const geo = dial(AppSettingKeys.electricityBodyGeometryFactor, 20000);
    r = geo / sigma;
  } else {
    r = dial(AppSettingKeys.electricityBodyDryResistanceOhms, 100000);
  }
  if (wet) {
    r /= Math.max(1, dial(AppSettingKeys.electricityBodyWetFactor, 100));
  }
  return Quantity.of(Math.max(r, floor), 'Ω');
}

/**
 * The series resistance one material contributes to a path at a contact /
 * covering node — `R = (L/A)/σ`. A conductor (copper) resolves to ~0; an
 * insulator (rubber) resolves to a large-but-finite ceiling (an open break).
 * A null/unknown material reads as an insulator. This is the engine of the
 * armor inversion: metal adds ~0, rubber adds orders of magnitude.
 */
function contactResistanceImpl(material: Material | null): Quantity<'Ω'> {
  const maxOhms = dial(AppSettingKeys.electricityContactMaxOhms, 1e12);
  const sigma = material
    ? material.getElectricalConductivity().rawValue()
    : 0;
  if (sigma <= 0) return Quantity.of(maxOhms, 'Ω');
  const geo = dial(AppSettingKeys.electricityContactGeometryFactor, 0.01);
  return Quantity.of(clamp(geo / sigma, 0, maxOhms), 'Ω');
}

/**
 * The covering stack's total series resistance — the sum of each layer's
 * `contactResistance`. NOT the mechanical attenuate fold: shock adds
 * resistances, it doesn't subtract energy. Steel layers barely raise the
 * sum; a rubber/leather layer collapses the current. The armor inversion,
 * emergent from conductivity alone (no `isElectrical` narrowing).
 */
function seriesResistanceOfCoveringStackImpl(
  materials: ReadonlyArray<Material | null>,
): Quantity<'Ω'> {
  let total = 0;
  for (const m of materials) {
    total += contactResistanceImpl(m).rawValue();
  }
  return Quantity.of(total, 'Ω');
}

/**
 * Map a current through a body to the local contact trauma — a `burn` whose
 * severity scales with the current above the burn threshold. Below the
 * threshold there's no burn (perception / tingle only) → `null`. The
 * whole-body outcomes (let-go / tetany / fibrillation → arrest) are the
 * vitals coupling's job, not this local wound.
 */
function resolveShockImpl(current: Quantity<'A'>): TraumaResolution | null {
  const i = Math.max(0, current.rawValue());
  const threshold = dial(AppSettingKeys.electricityBurnThresholdAmps, 0.02);
  if (i < threshold) return null;
  const perAmp = dial(AppSettingKeys.electricityBurnSeverityPerAmp, 10);
  return { type: 'burn', severity: (i - threshold) * perAmp };
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

// ─────────────────── the boot roster warm (bootImpl) ───────────────────

/**
 * Stand up every authored Material as a live singleton so the sync
 * resolve-on-read seams (`Tangible.getMaterial`, the bulk slots'
 * material reads, `Combustible`'s autoignition read, composition
 * expansion) hit from the first frame of live play.
 *
 * The gap this closes: those readers use the SYNC
 * `StuffApi.findByTemplatePath`, which returns only already-live
 * instances — and nothing else ever stood materials up in a running
 * server (tests hand-construct theirs), so every live material read
 * was null: nothing could ignite, melt, or resolve a composition.
 * The `SpeciesApi.preloadAnatomy` tolerant-ensure precedent, made
 * total: the roster is small, reference-data, and read hot, so warm
 * it whole at boot rather than chasing every async seam that would
 * need a per-site ensure.
 *
 * Filters to rows whose backing `class` lives under `/obj/material/`
 * (Material + subclasses) — the tree's folder rows are `FolderZone`s
 * owned by the zone substrate, not ours to stand up.
 */
async function bootImpl(): Promise<number> {
  const templates = await Template.findDescendants('/obj/material/');
  let stood = 0;
  for (const tpl of templates) {
    if (!tpl.class.startsWith('/obj/material/')) continue;
    try {
      await StuffApi.singleton(tpl.path);
      stood++;
    } catch (err) {
      console.warn(`MaterialApi.boot: '${tpl.path}' failed to stand up:`, err);
    }
  }
  console.info(`MaterialApi.boot: ${stood} material singleton(s) live`);
  return stood;
}
