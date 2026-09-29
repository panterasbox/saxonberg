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

import { Modality, MAX_HOPS, EXIT_TAU } from '../../../lib/perception/Modality';
import type { Stuff } from '../../../lib/stuff/Stuff';
import type { Container } from '../../../lib/spatial/Container';
import Location from '../../../lib/stuff/Location';
import type { Sensor } from '../../../lib/message/Sensor';
import type { Perception } from '../../../lib/perception/Perception';
import {
  Light,
  REQUIRED_BAND_FOR_DETAIL,
  type LightSourceRef,
} from '../../../lib/perception/Light';
import type {
  LightBand,
  ShadowQuality,
  VisibilityDetail,
  VisionProfile,
} from '../../../lib/perception/Light';
import { Quantity } from '../../../lib/quantity';
import { MixinApi } from '../../../api/mixin';
import { StuffApi } from '../../../api/stuff';
import { PerceptionApi } from '../../../api/perception';
import type { LightConduit } from '../../../lib/boundary/Conduit';
import type { Conduit } from '../../../lib/boundary/Conduit';
import type { Boundary } from '../../../lib/boundary/Boundary';
import { BoundaryAnchor } from '../../../lib/boundary/BoundaryAnchor';
import { CelestialApi } from '../../../api/celestial';

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
    return this.walkLight(loc, CelestialApi.skyFactorNow());
  }

  /**
   * ⭐⭐ **How bright this place gets**: the same walk with the sky
   * evaluated at its DAILY PEAK instead of at this minute. See
   * {@link Modality.peakSignalAt} for why — a consumer asking how good
   * a spot is cannot sample an instant of a curve that goes to zero
   * every night.
   *
   * ⚠ Only the sky leg moves. A lamp burning in a cellar reads the same
   * either way, which is right: a lamp does not have a day.
   */
  public override peakSignalAt(loc: Stuff & Container): Light {
    return this.walkLight(loc, CelestialApi.skyFactorDailyPeak());
  }

  /** The shared body of {@link signalAt} / {@link meanSignalAt}. */
  private walkLight(loc: Stuff & Container, skyFactor: number): Light {
    const acc = walkFluxAt(loc, 0, new Set<string>(), skyFactor);
    if (acc.flux === 0 && acc.sources.length === 0) return Light.ZERO;
    const scale = readSizeScale(loc);
    const lux = scale > 0 ? acc.flux / scale : acc.flux;
    const sources = finalizeSources(acc.sources);
    const colorTemperature = Light.mixColorTemperature(sources);
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
    const lux = signal.intensity.rawValue();
    const raw = Light.bandFor(lux);
    const profile = this.viewerVisionProfile(viewer);
    // ⚠⚠ A band shift cannot MANUFACTURE photons. `applyBandShift` is
    // index arithmetic on the lux tag table, so a `bandShift: +1` species
    // used to read `very-dim` in a sealed cellar with no light in it at
    // all — never noticed, because until this build nowhere was dark. A
    // night-sighted species sees further into the dark; it does not see
    // in the absence of light (envelope D11).
    const shifted =
      lux > 0 ? Light.applyBandShift(raw, profile.bandShift) : raw;
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
  public viewerVisionProfile(viewer: Stuff): VisionProfile {
    if (!isPerception(viewer)) return DEFAULT_VISION_PROFILE;
    return viewer.getVisionProfile() ?? DEFAULT_VISION_PROFILE;
  }

  /**
   * Per-viewer band perception. Routes through `PerceptionApi` to
   * resolve the vision singleton, computes the signal, then applies
   * the band-shift + shadow seam.
   */
  public perceivedBand(
    viewer: Stuff & Sensor & Perception,
    loc: Stuff & Container,
  ): LightBand {
    const signal = this.signalAt(loc);
    return this.perceiveFor(viewer, loc, signal).band;
  }

  /**
   * Per-viewer visibility gate. Pipeline:
   *   1. Resolve the target's environment.
   *   2. Compute the raw answer: viewer's `perceivedBand(env)` ≥
   *      detail-level threshold.
   *   3. Dispatch `viewer.canSeeOverride(target, detail, raw)` so
   *      shadows can override (X-ray, blindfold).
   */
  public canSee(
    viewer: Stuff & Sensor & Perception,
    target: Stuff,
    detail: VisibilityDetail = 'figure',
  ): boolean {
    if (!MixinApi.isContainable(target)) {
      return viewer.canSeeOverride(target, detail, true);
    }
    let env = target.getContainer();
    // ⭐⭐ A FIXTURE hangs on a host; it is not in anybody's CONTENTS, so
    // `getContainer()` is null for it and this gate read that as "cannot be
    // seen" — every sconce, sign, anchor and (since the ground build) every
    // FLOOR rendered as *"something"* anywhere scene prose named it:
    // *"You begin searching something."* A fixture is seen in its HOST's
    // light, which is the same rule two lines down for a held item being
    // seen in the holder's room rather than in the dark of their pocket.
    // ⚠ Found by driving the ground build in a browser; the wire tier could
    // not see it, because it asserts the envelope and this is the prose.
    if (!env && MixinApi.isAdornment(target)) {
      const host = target.getAdornedTo() as unknown as Stuff | null;
      if (host && MixinApi.isContainer(host)) env = host;
    }
    if (!env) {
      return viewer.canSeeOverride(target, detail, false);
    }
    // What you HOLD you can see — the light that matters is where you
    // stand, not the dark of your own pocket ("You pick up something").
    // The same one level for an open container standing in a room: a
    // coupe in the rack, a keg in the floor stock, reads in the room's
    // light — `MixinApi.isOpenContainer`, the one rule reach and the
    // `peers` scope ask, so you can never name what you cannot see.
    if (env.stuffId === viewer.stuffId) {
      env = MixinApi.isContainable(viewer)
        ? (viewer.getContainer() ?? env)
        : env;
    } else if (
      !(env instanceof Location) &&
      MixinApi.isOpenContainer(env as Stuff) &&
      MixinApi.isContainable(env)
    ) {
      env = env.getContainer() ?? env;
    }
    const band = this.perceivedBand(viewer, env);
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
  public lightAt(loc: Stuff & Container): Light {
    return this.signalAt(loc);
  }

  /**
   * Derive the lux band at `loc` from the vision signal. Skips the
   * per-viewer band-shift — for that, call `perceivedBand`.
   */
  public bandAt(loc: Stuff & Container): LightBand {
    return Light.bandFor(this.lightAt(loc).intensity.rawValue());
  }

  /**
   * Concealment surface for Hidden / Stealthing. Maps the band at
   * `loc` into one of five tiers — darker rooms shadow more.
   */
  public shadowsAt(loc: Stuff & Container): ShadowQuality {
    const signal = this.signalAt(loc);
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
 * Internal recursive walk. Returns a flux accumulator (lumens +
 * source list); the public `signalAt` divides by sizeScale and wraps.
 */
function walkFluxAt(
  loc: Stuff & Container,
  depth: number,
  visited: Set<string>,
  skyFactor: number,
): FluxAccumulator {
  const acc = newAccumulator();
  if (depth > MAX_HOPS) return acc;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return acc;
  visited.add(id);

  /** Light from OTHER scopes — legs (d) and (e). Capped as one. */
  const spill: { sub: FluxAccumulator; tau: number; area: number }[] = [];

  // (a) Ambient — the location itself contributes flux + color temp.
  //
  // ⭐⭐ For a SKY-LIT scope (envelope D4) this is three factors that know
  // nothing about each other, multiplied: the scope's own noon flux (its
  // area, or an authored calibration), the sky's illuminance factor right
  // now (the sun's altitude, the moon's phase and altitude, a starlight
  // floor — `CelestialApi.skyFactorNow`, memoized per game minute), and
  // the cached weather cloud-dimming factor. That is why the same street
  // reads `bright` at noon and `very-dim` under a full moon with nothing
  // authored on the row and no stamp to go stale.
  //
  // Everything else — an inherent glow, a `'sky'`-less interior with a
  // calibration value on it — reads its stored ambient dimmed by the
  // weather, exactly as before.
  if (MixinApi.isAmbientLit(loc)) {
    const ambientFlux = loc.isSkyLit()
      ? loc.skyNoonFlux() * skyFactor * loc.getWeatherDimFactor()
      : loc.getAmbientFlux().rawValue() * loc.getWeatherDimFactor();
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

  // ⭐⭐ (a′) The TOWN's lamps — a property of the street, not an object
  // on it. Nothing is minted: a street declares that the service runs
  // here, and whether it is burning right now is derived from the hour
  // and from whether the extent paid for this street tonight. The
  // source ref is the STREET, so `analyze light` names the place rather
  // than a lamp that does not exist.
  if (MixinApi.isPublicLighting(loc)) {
    const civic = loc.publicLightingFlux();
    if (civic > 0) {
      addContribution(acc, civic, {
        stuffId: id,
        flux: civic,
        colorTemperature:
          loc.getPublicLighting()?.colorTemperature ?? null,
      });
    }
  }

  // (b) Contents-side emitters.
  for (const item of loc.getContents()) {
    if (MixinApi.isLightSource(item)) {
      const flux = item.getEmittedFlux().rawValue();
      if (flux > 0) {
        const colorTempQ = item.getEmittedColorTemperature();
        addContribution(acc, flux, {
          stuffId: (item as unknown as Stuff).stuffId,
          flux,
          colorTemperature: colorTempQ ? colorTempQ.rawValue() : null,
        });
      }
    }

    // ⭐⭐ (b′) **A lantern IN SOMEBODY'S HAND lights the room.**
    //
    // ⚠ It did not. Leg (b) walks the room's own contents, and a
    // carried lamp is in the CARRIER's contents, not the room's — so a
    // player could light a lantern, stand in the pitch dark, and have
    // the street read exactly as black as before. Acceptance 4 is
    // *"a player who lights a lantern can work by it"*, and it was
    // false. Found by the drive: `analyze light` read identically
    // before and after `light lantern`.
    //
    // It is the mirror of a rule the perception gate already has —
    // *what you HOLD you see in the light of where you stand, not in
    // the dark of your own pocket*. The light goes the other way for
    // the same reason: you are holding it up, in this room.
    //
    // ONE level deep and only through a person. Not recursive: a lamp
    // sealed in a chest in a pack is not lighting anything, and a
    // general recursion would make the hot path walk the world.
    if (!MixinApi.isContainer(item)) continue;
    if (loc instanceof Location && item instanceof Location) continue;
    for (const held of (item as Stuff & Container).getContents()) {
      if (!MixinApi.isLightSource(held)) continue;
      const flux = held.getEmittedFlux().rawValue();
      if (flux <= 0) continue;
      const colorTempQ = held.getEmittedColorTemperature();
      addContribution(acc, flux, {
        stuffId: (held as unknown as Stuff).stuffId,
        flux,
        colorTemperature: colorTempQ ? colorTempQ.rawValue() : null,
      });
    }
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

    // (d) Cross-boundary propagation. ⭐ Collected, not merged: legs (d)
    // and (e) are both light from ANOTHER scope, so they share one cap —
    // see {@link mergeCapped}.
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
        skyFactor,
      );
      spill.push({ sub, tau, area: readSizeScale(otherHost as unknown as Stuff & Container) });
    }
  }

  // (e) Cross-exit propagation. Doored exits skip — the boundary
  // walk handles those.
  if (MixinApi.isExitable(loc)) {
    for (const exit of loc.getObviousExits()) {
      if (exit.getDoor()) continue;
      // An exit that applies its own traversal may name no room at all
      // (the sandbox wardrobe passage names the WIRE). Walking it lands
      // on a non-Container and takes `look` down for the whole room.
      if (!exit.hasSpatialDestination()) continue;
      const destPath = exit.getDestinationTemplatePath();
      // Existence, not identity: a Warren hub exit names a template with
      // MANY live clones (`/world/lounge/location/lounge` once a satellite exists),
      // and the singleton lookup throws on it — which took `look` down for
      // the whole room and the presence fan with it (found live 2026-08-27).
      if (destPath && StuffApi.findAllByTemplatePath(destPath).length === 0) continue;
      let dest: Stuff & Container;
      try {
        dest = exit.getDestination();
      } catch {
        continue;
      }
      // Belt-and-braces on the hot path: a destroyed room's proxy
      // answers every call with `undefined`, and `look` must not die
      // because one neighbour was reaped mid-walk.
      if (!MixinApi.isContainer(dest) || (dest as Stuff).isDestroyed()) {
        continue;
      }
      const sub = walkFluxAt(dest, depth + 1, visited, skyFactor);
      spill.push({ sub, tau: EXIT_TAU, area: readSizeScale(dest) });
    }
  }

  mergeCapped(acc, spill, readSizeScale(loc));
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

/**
 * ⭐⭐⭐ **An opening cannot make you brighter than what is on the other
 * side of it**, and more openings onto the same day do not stack.
 *
 * Light arriving from OTHER scopes — through a doorway or a window —
 * is therefore capped at the **brightest neighbour's illuminance**,
 * while a scope's own light (its ambient, its contents, its fixtures,
 * what you are carrying) sums normally. Three windows onto a 45-lux
 * afternoon give you an afternoon, not three of them.
 *
 * ⚠⚠ **Why this exists.** `EXIT_TAU` is `1.0` — *no extra dimming on
 * exit traversal* — so the leg added each neighbour's ENTIRE flux and
 * then divided by the RECEIVER's area, and a room in a chain of bright
 * rooms came out brighter than every room lighting it. At midday
 * `delight-road/crossroads` — which authors **600 lumens over 400 m²**,
 * 1.5 lux, and which `lint:light-sources` calls *"deliberate gloom"* —
 * read `blinding`. Found by the sweep's browser walk (2026-09-25); the
 * wire drive could not see it, because the drive boots at `t = 0` and
 * `t = 0` is always midnight.
 *
 * ⚠ It was harmless until this build: before W0 no outdoor row carried
 * 24 000 lumens of ambient. **A consumer written when the input was
 * small** — the same shape as the forestry test and the plants.
 */
function mergeCapped(
  parent: FluxAccumulator,
  spill: readonly { sub: FluxAccumulator; tau: number; area: number }[],
  receiverArea: number,
): void {
  if (spill.length === 0) return;
  let capLux = 0;
  for (const { sub, tau, area } of spill) {
    const lux = area > 0 ? (sub.flux * tau) / area : sub.flux * tau;
    if (lux > capLux) capLux = lux;
  }
  const capFlux = capLux * (receiverArea > 0 ? receiverArea : 1);
  const rawFlux = spill.reduce((n, { sub, tau }) => n + sub.flux * tau, 0);
  if (rawFlux <= 0) return;
  // Scale every contribution by one factor, so `analyze light`'s
  // per-source attribution still adds up to what the room actually reads.
  const scale = rawFlux > capFlux ? capFlux / rawFlux : 1;
  for (const { sub, tau } of spill) {
    mergeAttenuated(parent, sub, tau * scale);
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

