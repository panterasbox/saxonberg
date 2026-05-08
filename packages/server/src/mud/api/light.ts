import { SecurityApi } from './security';
/**
 * LightApi — viewer-agnostic and viewer-aware queries about how much
 * light a Container holds and what bands viewers perceive there.
 *
 * The cross-cutting viewer-aware-query pattern is documented in
 * `docs/subsystems/perception.md`. This Api implements the first
 * concrete user.
 *
 * Layered surface:
 *   - `lightAt(loc)` — total light at a location (raw `Light` value).
 *     Walks contents, fixtures, BoundaryAnchors (cross-boundary
 *     propagation), and `getObviousExits()` (cross-exit propagation),
 *     bounded by `MAX_HOPS` and defended by a per-call `visited` set
 *     against cycles. Fully lazy — no caches.
 *   - `bandAt(loc)` — `LightBand` derivation including each receiving
 *     location's `getSizeScale()` divisor.
 *   - `perceivedBand(viewer, loc)` / `canSee(viewer, target)` /
 *     `shadowsAt(loc)` / `viewerVisionProfile(viewer)` — Phase 6
 *     fleshes these out (Sensor / Shadow integration). Phase 2
 *     ships viable defaults.
 *
 * Constants:
 *   - `MAX_HOPS = 2` — the propagation walk truncates two
 *     containers from the query origin (one boundary hop + one
 *     further-room hop). Bounds the walk and matches the v1
 *     "open door / window one room over" requirement.
 *   - `EXIT_TAU = 1.0` — exits don't attenuate by themselves in v1.
 *     A future Door subclass that varies on traversal mode could
 *     drop this; for now exits leak fully (modulo the exit's door's
 *     LightConduit which gates at the source by closing).
 */

import type { Stuff } from '../lib/stuff/Stuff';
import type { Container } from '../lib/spatial/Container';
import type { Containable } from '../lib/spatial/Containable';
import type { Sensor } from '../lib/message/Sensor';
import type { Adornment } from '../lib/spatial/Adornment';
import { Light, bandFor } from '../lib/light/Light';
import type { LightBand } from '../lib/light/Light';
import { MixinApi } from './mixin';
import { StuffApi } from './stuff';
import { ShadowApi } from './shadow';
import type { LightConduit, BoundarySide } from '../lib/spatial/Conduit';
import type { Conduit } from '../lib/spatial/Conduit';
import type { Boundary } from '../lib/spatial/Boundary';
import type { BoundaryAnchor } from '../lib/spatial/BoundaryAnchor';

/** Maximum recursion depth for the propagation walk. */
export const MAX_HOPS = 2;

/** Per-exit attenuation factor; 1.0 means "no extra dimming on exit traversal." */
export const EXIT_TAU = 1.0;

/**
 * Visibility detail levels gated by `LightApi.canSee`. Phase 6 maps
 * each level to a minimum band threshold.
 */
export type VisibilityDetail = 'shape' | 'figure' | 'detail' | 'fine';

/**
 * Concealment qualities `shadowsAt` returns. Reserved surface for
 * Hidden / Stealthing — the band table maps directly into these
 * five tiers.
 */
export type ShadowQuality =
  | 'none'
  | 'faint'
  | 'partial'
  | 'deep'
  | 'absolute';

/**
 * Per-species vision profile. v1 returns a constant (human-shaped)
 * regardless of viewer; the Organism subsystem populates this from
 * `Species` later. Documented as nullable so a viewer with no
 * species data falls through cleanly.
 */
export interface VisionProfile {
  scotopicMin: LightBand;
  photopicMax: LightBand;
  bandShift: number;
}

const DEFAULT_VISION_PROFILE: VisionProfile = {
  scotopicMin: 'pitch-black',
  photopicMax: 'blinding',
  bandShift: 0,
};

export class LightApi {
  /**
   * Total light at `loc`, viewer-agnostic. Walks (a) ambient,
   * (b) contents-side emitters, (c) fixture-side emitters,
   * (d) cross-boundary propagation through fixture-anchored
   * Boundaries, and (e) cross-exit propagation through obvious
   * exits. Bounded by `MAX_HOPS`; defended against cycles via the
   * `visited` set.
   */
  public static lightAt(loc: Stuff & Container): Light {
    return walkLightAt(loc, 0, new Set<string>());
  }

  /**
   * Map `lightAt(loc).intensity / loc.getSizeScale()` to a
   * `LightBand`. Locations that don't override `getSizeScale()`
   * default to `1.0` (no scaling).
   */
  public static bandAt(loc: Stuff & Container): LightBand {
    const total = this.lightAt(loc);
    const scale = readSizeScale(loc);
    if (!Number.isFinite(scale) || scale <= 0) return bandFor(total.intensity);
    return bandFor(total.intensity / scale);
  }

  /**
   * Per-viewer band perception.
   *
   * Pipeline (`docs/subsystems/perception.md`):
   *   1. Compute raw `bandAt(loc)`.
   *   2. Apply the viewer's species vision profile via
   *      `viewerVisionProfile(viewer).bandShift` (v1 identity for
   *      every viewer; the Organism subsystem populates this
   *      later).
   *   3. Apply the optional `viewer.perceivedBandModifier?(raw, loc)`
   *      seam so Shadows on the viewer can override (BlindfoldShadow,
   *      DarknessShadow, NightVisionShadow). Optional method —
   *      declared in JSDoc here, NOT added to the Sensor interface,
   *      because Sensor implementors don't add it; only Shadows
   *      that intercept it do.
   *   4. Return.
   */
  public static perceivedBand(
    viewer: Stuff & Sensor,
    loc: Stuff & Container
  ): LightBand {
    const raw = this.bandAt(loc);
    const profile = this.viewerVisionProfile(viewer);
    const shifted = applyBandShift(raw, profile.bandShift);
    const overridden = invokeShadowSeam<LightBand>(
      viewer,
      'perceivedBandModifier',
      [shifted, loc]
    );
    return overridden ?? shifted;
  }

  /**
   * Per-viewer visibility gate.
   *
   * Pipeline:
   *   1. Resolve the target's environment. Targets that aren't
   *      Containable (Ideas, Zones) read true — they're queried
   *      by reference, not by location.
   *   2. Compute the raw answer: viewer's `perceivedBand(env)` ≥
   *      detail-level threshold.
   *   3. Apply the optional `viewer.canSeeOverride?(target, detail, raw)`
   *      seam so Shadows can yes/no the answer outright.
   */
  public static canSee(
    viewer: Stuff & Sensor,
    target: Stuff,
    detail: VisibilityDetail = 'figure'
  ): boolean {
    if (!MixinApi.isContainable(target)) {
      return applyCanSeeOverride(viewer, target, detail, true);
    }
    // `target` is narrowed to `Stuff & Containable` by the predicate above.
    const env = target.getContainer();
    if (!env) {
      return applyCanSeeOverride(viewer, target, detail, false);
    }
    const band = this.perceivedBand(viewer, env);
    const required = REQUIRED_BAND_FOR_DETAIL[detail];
    const raw = compareBand(band, required) >= 0;
    return applyCanSeeOverride(viewer, target, detail, raw);
  }

  /**
   * Concealment surface for Hidden / Stealthing. v1: maps the
   * band into one of five tiers — darker rooms shadow more. Pure
   * derivation; no viewer parameter (concealment is a property of
   * the *room*, not of any one observer).
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
   * Per-viewer vision profile. Optional `viewer.getVisionProfile?()`
   * seam lets the (future) Organism subsystem populate this from
   * species data; v1 falls back to the constant human-shaped
   * profile when the seam is absent or returns null.
   */
  public static viewerVisionProfile(viewer: Stuff & Sensor): VisionProfile {
    const profile = invokeShadowSeam<VisionProfile | null>(
      viewer,
      'getVisionProfile',
      []
    );
    if (profile) return profile;
    return DEFAULT_VISION_PROFILE;
  }
}

/**
 * Ordered band table. Index ≈ "how lit." Used by `applyBandShift`
 * (vision profile) and `compareBand` (canSee threshold).
 */
const BAND_ORDER: readonly LightBand[] = [
  'pitch-black',
  'very-dim',
  'dim',
  'lit',
  'bright',
  'blinding',
];

function bandIndex(band: LightBand): number {
  return BAND_ORDER.indexOf(band);
}

function applyBandShift(band: LightBand, shift: number): LightBand {
  if (!Number.isFinite(shift) || shift === 0) return band;
  const idx = bandIndex(band) + Math.trunc(shift);
  const clamped = Math.max(0, Math.min(BAND_ORDER.length - 1, idx));
  return BAND_ORDER[clamped]!;
}

function compareBand(a: LightBand, b: LightBand): number {
  return bandIndex(a) - bandIndex(b);
}

/** Detail level → minimum band required to discern at that level. */
const REQUIRED_BAND_FOR_DETAIL: Record<VisibilityDetail, LightBand> = {
  shape: 'very-dim',
  figure: 'dim',
  detail: 'lit',
  fine: 'bright',
};

function applyCanSeeOverride(
  viewer: Stuff & Sensor,
  target: Stuff,
  detail: VisibilityDetail,
  raw: boolean
): boolean {
  const overridden = invokeShadowSeam<boolean>(viewer, 'canSeeOverride', [
    target,
    detail,
    raw,
  ]);
  return overridden ?? raw;
}

/**
 * Invoke an optional Sensor seam method declared by a Shadow attached
 * to `viewer`. The seam methods (`perceivedBandModifier`,
 * `canSeeOverride`, `getVisionProfile`) deliberately do NOT live on
 * the `Sensor` interface — only Shadows that intercept light
 * perception declare them. Plain `viewer.foo()` would return
 * `undefined` because the host has no such method, so we walk the
 * shadow stack via `ShadowApi.getShadows(viewer, methodName)` and
 * invoke the topmost Shadow that declares the seam.
 *
 * v1 honours a single shadow's value — first match wins. Future
 * iterations can dispatch through the chain via `Shadow.callDown`
 * if multiple effects need to compose.
 */
function invokeShadowSeam<T>(
  viewer: Stuff,
  methodName: string,
  args: readonly unknown[]
): T | null {
  const shadows = ShadowApi.getShadows(viewer, methodName);
  for (const shadow of shadows) {
    const fn = (shadow as unknown as Record<string, unknown>)[methodName];
    if (typeof fn !== 'function') continue;
    const result = (fn as (...a: unknown[]) => unknown).apply(
      shadow,
      Array.from(args)
    );
    return result as T;
  }
  return null;
}

/**
 * Internal recursive walk. Separate from the public
 * `LightApi.lightAt` so the security gate fires once at the
 * top-level call rather than at every recursive step.
 */
function walkLightAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>
): Light {
  if (depth > MAX_HOPS) return Light.ZERO;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return Light.ZERO;
  visited.add(id);

  let total = readAmbientLight(loc);

  // (b) Contents-side emitters. Phase 3 swapped the structural marker
  // walk for `MixinApi.isLightSource` so shadow-based emission (a
  // future `IgnitedShadow`?) participates without changing the call
  // site.
  for (const item of loc.getContents()) {
    if (!MixinApi.isLightSource(item)) continue;
    const emitted = item.getEmittedLight();
    if (emitted && emitted !== Light.ZERO && emitted.intensity > 0) {
      total = total.add(emitted);
    }
  }

  // (c) Fixture-side emitters via `Adornable.getFixtureLightSources()`,
  // narrowed back to `LightSource` for the emission read.
  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtureLightSources()) {
      // `fx` is `Stuff & Adornment` from `getFixtureLightSources`; the
      // predicate narrows it to `Stuff & Adornment & LightSource` so
      // `getEmittedLight()` resolves on the narrowed type — no cast.
      if (!MixinApi.isLightSource(fx)) continue;
      const emitted = fx.getEmittedLight();
      if (emitted && emitted !== Light.ZERO && emitted.intensity > 0) {
        total = total.add(emitted);
      }
    }

    // (d) Cross-boundary propagation. Walk every BoundaryAnchor on
    // this side; if the boundary exposes a LightConduit and its
    // transmissivity from-other-to-here is non-zero, recurse and
    // attenuate. Recursive call shares the visited Set and the
    // depth budget.
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
      const contribution = walkLightAt(
        otherHost as unknown as Stuff & Container,
        depth + 1,
        visited
      ).attenuate(tau);
      if (contribution !== Light.ZERO) total = total.add(contribution);
    }
  }

  // (e) Cross-exit propagation. Doors are Boundaries (Phase 5
  // retrofit) and contribute via the cross-boundary walk above
  // through their LightConduit. Skip doored exits here to avoid
  // double-counting their neighbors.
  if (MixinApi.isExitable(loc)) {
    for (const exit of loc.getObviousExits()) {
      // Skip doored exits — handled by the boundary walk.
      if (exit.getDoor()) continue;

      // Eviction defense: skip exits whose destination is path-only
      // and not currently loaded. Future caching may pin neighbors
      // within MAX_HOPS; v1 simply doesn't propagate through
      // unloaded rooms.
      const destPath = exit.getDestinationTemplatePath();
      if (destPath && !StuffApi.findByTemplatePath(destPath)) continue;

      let dest: Stuff & Container;
      try {
        dest = exit.getDestination();
      } catch {
        continue;
      }
      const contribution = walkLightAt(dest, depth + 1, visited).attenuate(
        EXIT_TAU
      );
      if (contribution !== Light.ZERO) total = total.add(contribution);
    }
  }

  return total;
}

/**
 * Read `getAmbientLight()` if the loc composes AmbientLitMixin;
 * otherwise return `Light.ZERO`. Lets the walk treat ambient as
 * "first contribution" without hard-binding every Container to the
 * mixin.
 */
function readAmbientLight(loc: Stuff & Container): Light {
  if (MixinApi.isAmbientLit(loc)) return loc.getAmbientLight();
  return Light.ZERO;
}

/** Read `getSizeScale()` if exposed; default to 1.0. */
function readSizeScale(loc: Stuff & Container): number {
  const fn = (loc as unknown as { getSizeScale?: () => number }).getSizeScale;
  if (typeof fn === 'function') return fn.call(loc);
  return 1.0;
}

/**
 * Narrow a fixture to a BoundaryAnchor without importing the class
 * (avoids tangled load order between `Adornable` / `Boundary` /
 * `BoundaryAnchor` and this Api).
 */
function asBoundaryAnchor(fx: Stuff & Adornment): BoundaryAnchor | null {
  if ((fx as unknown as { _isBoundaryAnchor?: boolean })._isBoundaryAnchor) {
    return fx as unknown as BoundaryAnchor;
  }
  return null;
}

/**
 * Locate the LightConduit on a Boundary's conduit registry. Returns
 * null if no conduit advertises light.
 */
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

// Force at least one direct reference so TS doesn't complain about
// unused imports when the `BoundarySide` type only appears via
// inference. The value-level reference is otherwise harmless.
const _SIDE_TAG: BoundarySide = 'A';
void _SIDE_TAG;

SecurityApi.decorateApiClass(LightApi);
