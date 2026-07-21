/**
 * VisionModality — the vision singleton, implementing the field
 * propagation walk relocated from the retired `LightApi.lightAt`.
 *
 * `signalAt(loc)` returns a `Light` (lux intensity + flux-weighted
 * color temperature + capped source list). `perceiveFor(viewer, loc,
 * signal)` applies the species vision profile band-shift and the
 * `perceivedBandModifier` shadow seam.
 *
 * Vision-specific value types stay where they live (Light /
 * LightBand / AmbientLitMixin / LightSourceMixin / LightConduit) —
 * they're the modality's domain, not Api-shaped. The Api surface is
 * `PerceptionApi`; this file is the modality's implementation.
 */

import { Modality, MAX_HOPS, EXIT_TAU } from '../Modality';
import type { Stuff } from '../../stuff/Stuff';
import type { Container } from '../../spatial/Container';
import Location from '../../stuff/Location';
import type { Sensor } from '../../message/Sensor';
import type { Perception } from '../Perception';
import {
  Light,
  REQUIRED_BAND_FOR_DETAIL,
  type LightSourceRef,
} from '../Light';
import type {
  LightBand,
  ShadowQuality,
  VisibilityDetail,
  VisionProfile,
} from '../Light';
import { Quantity } from '../../quantity';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import type { LightConduit } from '../../boundary/Conduit';
import type { Conduit } from '../../boundary/Conduit';
import type { Boundary } from '../../boundary/Boundary';
import { BoundaryAnchor } from '../../boundary/BoundaryAnchor';

const DEFAULT_VISION_PROFILE: VisionProfile = {
  scotopicMin: 'pitch-black',
  photopicMax: 'blinding',
  bandShift: 0,
};

/** Internal accumulator the walk passes around — flux-shaped. */
interface FluxAccumulator {
  flux: number;
  sources: LightSourceRef[];
}

/**
 * Public percept shape — what `perceiveFor` returns. Carries the
 * viewer-shifted band and a reference back to the raw signal for
 * consumers that need both.
 */
export interface VisionPercept {
  band: LightBand;
  signal: Light;
}

export class VisionModality extends Modality {
  /**
   * Total light at `loc`. Walks ambient (a), contents-side emitters
   * (b), fixture-side emitters (c), cross-boundary propagation (d),
   * and cross-exit propagation (e). Bounded by `MAX_HOPS`; defended
   * against cycles via the `visited` set.
   *
   * Returns a `Light` whose `intensity` is `Quantity<'lux'>`,
   * computed as accumulated flux divided by `loc.getSizeScale()`.
   * Returns `Light.ZERO` when no source contributes — preserves the
   * pre-migration contract.
   */
  public override signalAt(loc: Stuff & Container): Light {
    const acc = walkFluxAt(loc, 0, new Set<string>());
    if (acc.flux === 0 && acc.sources.length === 0) return Light.ZERO;
    const scale = readSizeScale(loc);
    const lux = scale > 0 ? acc.flux / scale : acc.flux;
    const sources = finalizeSources(acc.sources);
    const colorTemperature = mixColorTemperature(sources);
    return Light.from({
      intensity: Quantity.of(lux, 'lux'),
      colorTemperature,
      sources,
    });
  }

  /**
   * Per-viewer band perception. Pipeline:
   *   1. Compute raw `bandFor(signal.intensity.rawValue())`.
   *   2. Apply species vision profile via `bandShift`.
   *   3. Dispatch `viewer.perceivedBandModifier(shifted, loc)`.
   */
  public override perceiveFor(
    viewer: Stuff & Sensor,
    loc: Stuff & Container,
    signal: Light,
  ): VisionPercept {
    const raw = Light.bandFor(signal.intensity.rawValue());
    const profile = VisionModality.viewerVisionProfile(viewer);
    const shifted = Light.applyBandShift(raw, profile.bandShift);
    const final = isPerception(viewer)
      ? viewer.perceivedBandModifier(shifted, loc)
      : shifted;
    return { band: final, signal };
  }

  /**
   * Per-viewer vision profile. The host's identity default returns
   * `null`, in which case the framework falls back to the constant
   * human-shaped profile.
   *
   * Static helper rather than instance — every consumer that needs
   * it has the viewer in hand and the modality singleton at most as
   * a witness. Kept on the class for discoverability.
   */
  public static viewerVisionProfile(viewer: Stuff): VisionProfile {
    if (!isPerception(viewer)) return DEFAULT_VISION_PROFILE;
    return viewer.getVisionProfile() ?? DEFAULT_VISION_PROFILE;
  }

  /**
   * Per-viewer band perception. Routes through `PerceptionApi` to
   * resolve the vision singleton, computes the signal, then applies
   * the band-shift + shadow seam.
   */
  public static perceivedBand(
    viewer: Stuff & Sensor & Perception,
    loc: Stuff & Container,
  ): LightBand {
    const inst = vision();
    const signal = inst.signalAt(loc);
    return inst.perceiveFor(viewer, loc, signal).band;
  }

  /**
   * Per-viewer visibility gate. Pipeline:
   *   1. Resolve the target's environment.
   *   2. Compute the raw answer: viewer's `perceivedBand(env)` ≥
   *      detail-level threshold.
   *   3. Dispatch `viewer.canSeeOverride(target, detail, raw)` so
   *      shadows can override (X-ray, blindfold).
   */
  public static canSee(
    viewer: Stuff & Sensor & Perception,
    target: Stuff,
    detail: VisibilityDetail = 'figure',
  ): boolean {
    if (!MixinApi.isContainable(target)) {
      return viewer.canSeeOverride(target, detail, true);
    }
    const env = target.getContainer();
    if (!env) {
      return viewer.canSeeOverride(target, detail, false);
    }
    const band = VisionModality.perceivedBand(viewer, env);
    const required = REQUIRED_BAND_FOR_DETAIL[detail];
    const raw = Light.compareBand(band, required) >= 0;
    return viewer.canSeeOverride(target, detail, raw);
  }

  /**
   * Read the vision signal at `loc` — convenience wrapper around
   * `PerceptionApi.modalityByName('vision').signalAt(loc)`. Returns
   * `Light.ZERO` when the walk surfaces no contribution. Lives on
   * the modality class as vision-domain ergonomics, not as a
   * backing-class accessor — the lookup goes through
   * `PerceptionApi` so the template surface stays the single
   * source of truth.
   */
  public static lightAt(loc: Stuff & Container): Light {
    return vision().signalAt(loc);
  }

  /**
   * Derive the lux band at `loc` from the vision signal. Skips the
   * per-viewer band-shift — for that, call `perceivedBand`.
   */
  public static bandAt(loc: Stuff & Container): LightBand {
    return Light.bandFor(VisionModality.lightAt(loc).intensity.rawValue());
  }

  /**
   * Concealment surface for Hidden / Stealthing. Maps the band at
   * `loc` into one of five tiers — darker rooms shadow more.
   */
  public static shadowsAt(loc: Stuff & Container): ShadowQuality {
    const signal = vision().signalAt(loc);
    const band = Light.bandFor(signal.intensity.rawValue());
    switch (band) {
      case 'pitch-black':
        return 'absolute';
      case 'very-dim':
        return 'deep';
      case 'dim':
        return 'partial';
      case 'lit':
        return 'faint';
      default:
        return 'none';
    }
  }
}

/**
 * Internal singleton lookup. Routes through `PerceptionApi` rather
 * than accessing the backing class directly — modalities are
 * template-loaded Ideas; consumers (including this file's own
 * static helpers) discover them via the substrate's surface.
 */
function vision(): VisionModality {
  return PerceptionApi.modalityByName('vision') as VisionModality;
}

function isPerception(viewer: Stuff): viewer is Stuff & Sensor & Perception {
  return MixinApi.isPerception(viewer);
}

// -------- Walk implementation --------

function newAccumulator(): FluxAccumulator {
  return { flux: 0, sources: [] };
}

function addContribution(
  acc: FluxAccumulator,
  flux: number,
  source: LightSourceRef | null,
): void {
  if (flux <= 0) return;
  acc.flux += flux;
  if (source) acc.sources.push(source);
}

/**
 * Cap and sort an accumulator's source list to match the public
 * `Light.sources` invariant: descending by flux, capped at 3.
 */
function finalizeSources(sources: LightSourceRef[]): LightSourceRef[] {
  if (sources.length === 0) return [];
  return [...sources].sort((a, b) => b.flux - a.flux).slice(0, 3);
}

/**
 * Compute the flux-weighted color temperature across the source list.
 * Returns null when no source carries a color temperature.
 */
function mixColorTemperature(
  sources: readonly LightSourceRef[],
): Quantity<'K'> | null {
  let weightedSum = 0;
  let weight = 0;
  for (const s of sources) {
    if (s.colorTemperature === null) continue;
    weightedSum += s.colorTemperature * s.flux;
    weight += s.flux;
  }
  if (weight === 0) return null;
  return Quantity.of(weightedSum / weight, 'K');
}

/**
 * Internal recursive walk. Returns a flux accumulator (lumens +
 * source list); the public `signalAt` divides by sizeScale and wraps.
 */
function walkFluxAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>,
): FluxAccumulator {
  const acc = newAccumulator();
  if (depth > MAX_HOPS) return acc;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return acc;
  visited.add(id);

  // (a) Ambient — the location itself contributes flux + color temp,
  // scaled by the cached weather cloud-dimming factor (Wave 2): overcast /
  // storm reads dimmer. The factor is stamped by the weather boundary
  // fan-out and read synchronously here — no async weather resolve on the
  // perception hot path. `1` (the default) is byte-identical to pre-Wave-2.
  if (MixinApi.isAmbientLit(loc)) {
    const ambientFlux =
      loc.getAmbientFlux().rawValue() * loc.getWeatherDimFactor();
    if (ambientFlux > 0) {
      const ambientColorTemp = loc.getAmbientColorTemperature();
      addContribution(acc, ambientFlux, {
        stuffId: id,
        flux: ambientFlux,
        colorTemperature: ambientColorTemp
          ? ambientColorTemp.rawValue()
          : null,
      });
    }
  }

  // (b) Contents-side emitters.
  for (const item of loc.getContents()) {
    if (!MixinApi.isLightSource(item)) continue;
    const flux = item.getEmittedFlux().rawValue();
    if (flux <= 0) continue;
    const colorTempQ = item.getEmittedColorTemperature();
    addContribution(acc, flux, {
      stuffId: (item as unknown as Stuff).stuffId,
      flux,
      colorTemperature: colorTempQ ? colorTempQ.rawValue() : null,
    });
  }

  if (MixinApi.isAdornable(loc)) {
    // (c) Fixture-side emitters.
    for (const fx of loc.getFixtureLightSources()) {
      if (!MixinApi.isLightSource(fx)) continue;
      const flux = fx.getEmittedFlux().rawValue();
      if (flux <= 0) continue;
      const colorTempQ = fx.getEmittedColorTemperature();
      addContribution(acc, flux, {
        stuffId: (fx as unknown as Stuff).stuffId,
        flux,
        colorTemperature: colorTempQ ? colorTempQ.rawValue() : null,
      });
    }

    // (d) Cross-boundary propagation.
    for (const fx of loc.getFixtures()) {
      if (!BoundaryAnchor.is(fx)) continue;
      const anchor = fx;
      const boundary = anchor.getBoundary();
      if (!boundary) continue;
      const otherHost = anchor.getOtherHost();
      if (!otherHost) continue;
      const conduit = findLightConduit(boundary);
      if (!conduit) continue;
      const otherSide = boundary.getOtherSide(anchor);
      const tau = conduit.transmissivity(otherSide, anchor.getSide());
      if (!(tau > 0)) continue;
      const sub = walkFluxAt(
        otherHost as unknown as Stuff & Container,
        depth + 1,
        visited,
      );
      mergeAttenuated(acc, sub, tau);
    }
  }

  // (e) Cross-exit propagation. Doored exits skip — the boundary
  // walk handles those.
  if (MixinApi.isExitable(loc)) {
    for (const exit of loc.getObviousExits()) {
      if (exit.getDoor()) continue;
      const destPath = exit.getDestinationTemplatePath();
      if (destPath && !StuffApi.findByTemplatePath(destPath)) continue;
      let dest: Stuff & Container;
      try {
        dest = exit.getDestination();
      } catch {
        continue;
      }
      const sub = walkFluxAt(dest, depth + 1, visited);
      mergeAttenuated(acc, sub, EXIT_TAU);
    }
  }

  return acc;
}

/**
 * Merge a sub-walk's accumulator into the parent's, attenuating flux
 * + per-source contributions by `tau`.
 */
function mergeAttenuated(
  parent: FluxAccumulator,
  sub: FluxAccumulator,
  tau: number,
): void {
  if (sub.flux === 0 && sub.sources.length === 0) return;
  if (tau <= 0) return;
  parent.flux += sub.flux * tau;
  for (const s of sub.sources) {
    parent.sources.push({
      stuffId: s.stuffId,
      flux: s.flux * tau,
      colorTemperature: s.colorTemperature,
    });
  }
}

/** Locations carry a topology-derived size scale; other containers default to 1.0 (m²). */
function readSizeScale(loc: Stuff & Container): number {
  return loc instanceof Location ? loc.getSizeScale() : 1.0;
}

function findLightConduit(boundary: Boundary): LightConduit | null {
  const conduits = boundary.getConduits();
  for (const c of conduits) {
    if (isLightConduit(c)) return c;
  }
  return null;
}

function isLightConduit(c: Conduit): c is LightConduit {
  return c.conduitKind === 'light';
}

