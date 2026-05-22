import { SecurityApi } from './security';
/**
 * LightApi — viewer-agnostic and viewer-aware queries about light at a
 * Container.
 *
 * Wave 2 commits real units:
 *   - `lightAt(loc)` returns a `Light` whose `intensity` is
 *     `Quantity<'lux'>`. The walk accumulates lumen contributions
 *     internally and divides by the receiving Container's
 *     `getSizeScale()` (m²) before wrapping.
 *   - `LightSource.getEmittedFlux()` returns lumens.
 *   - `Light.color` is `Quantity<'K'> | null`; flux-weighted average
 *     across contributing sources.
 *
 * Layered surface:
 *   - `lightAt(loc)` — total light at a location (lux Light value).
 *   - `bandAt(loc)` — `LightBand` derivation directly from the lux
 *     intensity (the divide-by-sizeScale step lives in `lightAt`).
 *   - `perceivedBand(viewer, loc)` / `canSee(viewer, target)` /
 *     `shadowsAt(loc)` / `viewerVisionProfile(viewer)` — viewer-aware
 *     perception.
 *
 * Constants:
 *   - `MAX_HOPS = 2` — propagation depth budget.
 *   - `EXIT_TAU = 1.0` — per-exit attenuation factor.
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Sensor } from '../lib/message/Sensor';
import type { Perception } from '../lib/perception/Perception';
import type { Adornment } from '../lib/boundary/Adornment';
import { Light, LIGHT_BANDS, type LightSourceRef } from '../lib/perception/Light';
import type {
  LightBand,
  VisibilityDetail,
  VisionProfile,
} from '../lib/perception/Light';

/**
 * Witness hook fired on a light source's immediate environment when
 * `setEmittedFlux` or `setEmittedColorTemperature` results in a
 * different stored emission. Optional — implement only the host
 * Containers that care (typically a Location's caching layer or a
 * Vessel's lit-state observer).
 *
 * Lives in api/light.ts because it's the cross-module contract
 * between LightSourceMixin (the firer) and any Container (the
 * consumer); keeping it next to LightSourceMixin made it
 * lib-internal and harder to find for consumers writing the
 * receiver side.
 */
export interface LightSourceObserver {
  onLightSourceChanged?(
    source: Stuff,
    oldFlux: import('../lib/quantity').Quantity<'lumen'>,
    newFlux: import('../lib/quantity').Quantity<'lumen'>,
    oldColorTemperature: import('../lib/quantity').Quantity<'K'> | null,
    newColorTemperature: import('../lib/quantity').Quantity<'K'> | null
  ): void;
}
import { Quantity } from '../lib/quantity';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import type { LightConduit, BoundarySide } from '../lib/boundary/Conduit';
import type { Conduit } from '../lib/boundary/Conduit';
import type { Boundary } from '../lib/boundary/Boundary';
import type { BoundaryAnchor } from '../lib/boundary/BoundaryAnchor';

/** Maximum recursion depth for the propagation walk. */
export const MAX_HOPS = 2;

/** Per-exit attenuation factor; 1.0 means "no extra dimming on exit traversal." */
export const EXIT_TAU = 1.0;

// ---------- Band lookup ----------

/**
 * Lux unit + scale the lux tag-table is registered under. Encoded
 * once so all the `Quantity.*('lux', LUX_SCALE)` callers stay in
 * sync if the scale name ever changes.
 */
const LUX_SCALE = 'default';

/**
 * Membership set for runtime narrowing — derived from the
 * type-system source of truth (`LIGHT_BANDS` in
 * `lib/perception/Light.ts`) so there's no second copy to
 * keep in sync.
 */
const LIGHT_BAND_SET: ReadonlySet<LightBand> = new Set<LightBand>(LIGHT_BANDS);

/**
 * Map a lux numeric value to a `LightBand`. Consults the live
 * `Quantity` tag-table registry — the lux thresholds live in
 * `mud/config/quantity-tags.yaml` and load at boot via
 * `QuantityApi.loadTagTables`. `bandFor` is a thin typed adapter
 * over `Quantity.tag()` for the lux unit; reload of the YAML
 * propagates here transparently.
 *
 * Throws if the lux table isn't registered (test setup gap) or if
 * the registered tags don't match `LightBand` (content-side bug —
 * the YAML tag list must equal the typed union by construction).
 */
export function bandFor(luxValue: number): LightBand {
  const tag = Quantity.of(luxValue, 'lux').tag();
  if (!LIGHT_BAND_SET.has(tag as LightBand)) {
    throw new Error(
      `bandFor: lux value ${luxValue} produced unexpected tag '${tag}'. ` +
        `Either the lux tag table is not registered (call ` +
        `QuantityApi.loadTagTables / installV1QuantityTagTables) ` +
        `or the registered entries don't match the LightBand union.`
    );
  }
  return tag as LightBand;
}

/**
 * Concealment qualities `shadowsAt` returns. Reserved surface for
 * Hidden / Stealthing.
 */
export type ShadowQuality =
  | 'none'
  | 'faint'
  | 'partial'
  | 'deep'
  | 'absolute';

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

function newAccumulator(): FluxAccumulator {
  return { flux: 0, sources: [] };
}

function addContribution(
  acc: FluxAccumulator,
  flux: number,
  source: LightSourceRef | null
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
  sources: readonly LightSourceRef[]
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

export class LightApi {
  /**
   * Total light at `loc`. Walks ambient (a), contents-side emitters
   * (b), fixture-side emitters (c), cross-boundary propagation (d),
   * and cross-exit propagation (e). Bounded by `MAX_HOPS`; defended
   * against cycles via the `visited` set.
   *
   * Returns a `Light` whose `intensity` is `Quantity<'lux'>`,
   * computed as accumulated flux divided by `loc.getSizeScale()`.
   */
  public static lightAt(loc: Stuff & Container): Light {
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
   * Map `lightAt(loc).intensity.rawValue()` to a `LightBand`. The
   * divide-by-sizeScale step has already happened in `lightAt`.
   */
  public static bandAt(loc: Stuff & Container): LightBand {
    return bandFor(this.lightAt(loc).intensity.rawValue());
  }

  /**
   * Per-viewer band perception. Pipeline:
   *   1. Compute raw `bandAt(loc)`.
   *   2. Apply species vision profile via
   *      `viewerVisionProfile(viewer).bandShift`.
   *   3. Dispatch `viewer.perceivedBandModifier(shifted, loc)`.
   */
  public static perceivedBand(
    viewer: Stuff & Sensor & Perception,
    loc: Stuff & Container
  ): LightBand {
    const raw = this.bandAt(loc);
    const profile = this.viewerVisionProfile(viewer);
    const shifted = applyBandShift(raw, profile.bandShift);
    return viewer.perceivedBandModifier(shifted, loc);
  }

  /**
   * Per-viewer visibility gate. Pipeline:
   *   1. Resolve the target's environment.
   *   2. Compute the raw answer: viewer's `perceivedBand(env)` ≥
   *      detail-level threshold.
   *   3. Dispatch `viewer.canSeeOverride(target, detail, raw)`.
   */
  public static canSee(
    viewer: Stuff & Sensor & Perception,
    target: Stuff,
    detail: VisibilityDetail = 'figure'
  ): boolean {
    if (!MixinApi.isContainable(target)) {
      return viewer.canSeeOverride(target, detail, true);
    }
    const env = target.getContainer();
    if (!env) {
      return viewer.canSeeOverride(target, detail, false);
    }
    const band = this.perceivedBand(viewer, env);
    const required = REQUIRED_BAND_FOR_DETAIL[detail];
    const raw = compareBand(band, required) >= 0;
    return viewer.canSeeOverride(target, detail, raw);
  }

  /**
   * Concealment surface for Hidden / Stealthing. Maps the band into
   * one of five tiers — darker rooms shadow more.
   */
  public static shadowsAt(loc: Stuff & Container): ShadowQuality {
    const band = this.bandAt(loc);
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

  /**
   * Per-viewer vision profile. The host's identity default returns
   * `null`, in which case the framework falls back to the constant
   * human-shaped profile.
   */
  public static viewerVisionProfile(
    viewer: Stuff & Sensor & Perception
  ): VisionProfile {
    return viewer.getVisionProfile() ?? DEFAULT_VISION_PROFILE;
  }
}

/**
 * Band shift / compare arithmetic delegates to the generic
 * `Quantity.shiftTag` / `Quantity.compareTag` machinery applied to
 * the lux unit. The runtime ordering comes from the registered tag
 * table (`mud/config/quantity-tags.yaml § lux/default`); the
 * compile-time `LightBand` union is the typed view of that same
 * vocabulary (declared in `lib/perception/Light.ts` and pinned by
 * `bandFor`'s membership check).
 */
function applyBandShift(band: LightBand, shift: number): LightBand {
  return Quantity.shiftTag('lux', band, shift, LUX_SCALE) as LightBand;
}

function compareBand(a: LightBand, b: LightBand): number {
  return Quantity.compareTag('lux', a, b, LUX_SCALE);
}

/** Detail level → minimum band required to discern at that level. */
const REQUIRED_BAND_FOR_DETAIL: Record<VisibilityDetail, LightBand> = {
  shape: 'very-dim',
  figure: 'dim',
  detail: 'lit',
  fine: 'bright',
};

/**
 * Internal recursive walk. Returns a flux accumulator (lumens +
 * source list); the public `lightAt` divides by sizeScale and wraps.
 */
function walkFluxAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>
): FluxAccumulator {
  const acc = newAccumulator();
  if (depth > MAX_HOPS) return acc;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return acc;
  visited.add(id);

  // (a) Ambient — the location itself contributes flux + color temp.
  if (MixinApi.isAmbientLit(loc)) {
    const ambientFlux = loc.getAmbientFlux().rawValue();
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
      const anchor = asBoundaryAnchor(fx);
      if (!anchor) continue;
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
        visited
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
  tau: number
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

/** Read `getSizeScale()` if exposed; default to 1.0 (m²). */
function readSizeScale(loc: Stuff & Container): number {
  const fn = (loc as unknown as { getSizeScale?: () => number }).getSizeScale;
  if (typeof fn === 'function') return fn.call(loc);
  return 1.0;
}

/**
 * Narrow a fixture to a BoundaryAnchor without importing the class.
 */
function asBoundaryAnchor(fx: Stuff & Adornment): BoundaryAnchor | null {
  if ((fx as unknown as { _isBoundaryAnchor?: boolean })._isBoundaryAnchor) {
    return fx as unknown as BoundaryAnchor;
  }
  return null;
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

const _SIDE_TAG: BoundarySide = 'A';
void _SIDE_TAG;

SecurityApi.decorateApiClass(LightApi);
