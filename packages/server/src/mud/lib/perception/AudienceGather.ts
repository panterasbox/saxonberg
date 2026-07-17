/**
 * AudienceGather — the discrete-event outward sound walk.
 *
 * The push-side inversion of `SoundModality.walkAt`. Where `walkAt`
 * gathers steady-state sound *into* a scope (summing sub-room emitters
 * up to a single here-level for a `listen`), this walk carries an
 * attenuation factor *outward* from a source room and collects one
 * `(sensor, deliveredDb, direction)` arrival per hearing sensor across
 * every reached room. It is the audience for a one-shot event — a
 * whistle blast, a bell, an alarm — pushed unbidden into the rooms that
 * can hear it.
 *
 * Physics reused verbatim from `SoundModality.walkAt`
 * (`lib/perception/modalities/SoundModality.ts`):
 *   - `MAX_HOPS` depth cap + the `visited` cycle guard.
 *   - `atmosphereBlocks` (vacuum stops the walk at the recipient room).
 *   - the doored-exit skip + the `BoundaryAnchor` cross-boundary branch
 *     computing `conduit.transmissivity(...)` (a closed Door returns 0
 *     and blocks; an open Door returns 1 and passes) — see
 *     `SoundConduit.ts` / `Door.transmissivity`.
 *   - `EXIT_TAU` for doorless exits (the doorway's own block factor;
 *     `1.0` = no dimming at the doorway itself).
 *
 * New to the push model (not present in the field-read walk):
 *   - `PER_HOP_TAU` — a per-hop distance falloff. `walkAt` leaves
 *     doorless traversal loss-free (`EXIT_TAU = 1.0`) because the field
 *     read is local (`MAX_HOPS = 2`) and models only boundary
 *     attenuation. A pushed event must instead fade with distance so an
 *     adjacent room hears a fainter blast and a louder source measurably
 *     reaches farther. Folded into the same linear `cumulativeTau`, so
 *     the delivered level stays `sourceDb + 10*log10(cumulativeTau)`.
 *   - direction tracking: the first-hop exit direction from the source
 *     room, carried down so a two-hop arrival still reads "from the
 *     north". The zero-hop (same-room) arrival has `direction = null`.
 *
 * Threshold-free by design: the walk returns every reached hearing
 * sensor with its delivered level; the hearing-threshold drop is the
 * caller's (`Scene.toAudible`) so the same walk serves callers with
 * different floors.
 */

import type { Stuff } from '../stuff/Stuff';
import type { Container } from '../spatial/Container';
import type { Sensor } from '../message/Sensor';
import { MAX_HOPS, EXIT_TAU } from './Modality';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';
import type { BoundaryAnchor } from '../boundary/BoundaryAnchor';
import type { Boundary } from '../boundary/Boundary';
import type { Conduit } from '../boundary/Conduit';
import type { SoundConduit } from '../boundary/SoundConduit';

/**
 * Structural narrowing for "this fixture is a BoundaryAnchor" — the
 * same `_isBoundaryAnchor` marker read `BoundaryAnchor.is` uses,
 * inlined so this module keeps a *type-only* import of the boundary
 * class. That matters: `Scene` imports this module and sits on the
 * eager `api/message` load path, so a runtime import of
 * `BoundaryAnchor` (→ `Thing` → `Containable`) here would force that
 * chain to evaluate before it is ready. Mirrors `SoundModality`'s use
 * of `BoundaryAnchor.is`, which is safe there only because that module
 * is off the message path.
 */
function isBoundaryAnchor(fx: object): fx is BoundaryAnchor {
  return (fx as { _isBoundaryAnchor?: boolean })._isBoundaryAnchor === true;
}

/**
 * One reached hearing sensor: the sensor, the delivered sound level in
 * dB (`sourceDb + 10*log10(cumulativeTau)`), and the first-hop exit
 * direction from the source room (`null` for the same-room arrival).
 */
export interface AudienceArrival {
  sensor: Stuff & Sensor;
  db: number;
  direction: string | null;
}

/**
 * Per-hop distance falloff for the push model, as a linear tau. `-20 dB`
 * per room (`10^(-20/10) = 0.01`) — roughly one room's worth of
 * open-air spreading. Distinct from the reused `EXIT_TAU` (the doorway
 * block factor); see the file header.
 */
const PER_HOP_TAU = 0.01;

// v1 limitation shared verbatim with `SoundModality.walkAt`: this reads
// only the room's *inline* `_atmosphere` override, not the biome-inherited
// value — so a biome-default vacuum room does NOT block the walk (a whistle
// would carry through it). The proper resolve, `Atmospheric.getAtmosphere`
// → `BiomeApi`, is **async**, and this walk is sync (no await), so the raw
// field is the only sync source. Closing the gap means making the whole
// acoustic walk async — a shared change with SoundModality, deferred.
function inlineAtmosphere(loc: Stuff & Container): string | null {
  if (!MixinApi.isAtmospheric(loc)) return null;
  const atmos = (loc as unknown as { _atmosphere?: string | null })._atmosphere;
  return typeof atmos === 'string' && atmos.length > 0 ? atmos : null;
}

function atmosphereBlocks(loc: Stuff & Container): boolean {
  return inlineAtmosphere(loc) === 'vacuum';
}

function isSoundConduit(c: Conduit): c is SoundConduit {
  return c.conduitKind === 'sound';
}

function findSoundConduit(boundary: Boundary): SoundConduit | null {
  for (const c of boundary.getConduits()) {
    if (isSoundConduit(c)) return c;
  }
  return null;
}

/**
 * Cardinal direction of the exit whose door is `boundary`, or `null`
 * when no obvious exit is wired through it (a bare window between rooms
 * carries no direction). Used to attribute a doored-boundary hop's
 * arrival direction.
 */
function directionThroughBoundary(
  loc: Stuff & Container,
  boundary: Boundary,
): string | null {
  if (!MixinApi.isExitable(loc)) return null;
  for (const exit of loc.getObviousExits()) {
    if (exit.getDoor() === boundary) return exit.getDirection();
  }
  return null;
}

function linearToDb(sourceDb: number, cumulativeTau: number): number {
  if (cumulativeTau <= 0) return Number.NEGATIVE_INFINITY;
  return sourceDb + 10 * Math.log10(cumulativeTau);
}

function walkOutward(
  loc: Stuff & Container,
  sourceDb: number,
  depth: number,
  cumulativeTau: number,
  direction: string | null,
  visited: Set<string>,
  out: AudienceArrival[],
): void {
  if (depth > MAX_HOPS) return;
  const id = (loc as unknown as Stuff).stuffId;
  if (visited.has(id)) return;
  visited.add(id);
  // Vacuum stops the walk at the recipient room (no emit, no recurse).
  if (atmosphereBlocks(loc)) return;

  // (a) Emit one arrival per hearing sensor in this room.
  const db = linearToDb(sourceDb, cumulativeTau);
  for (const sensor of MessageApi.getSensors(loc)) {
    out.push({ sensor, db, direction });
  }

  if (depth >= MAX_HOPS) return;

  // (b) Cross-boundary propagation — doored / windowed boundaries.
  // Mirrors `walkAt`'s BoundaryAnchor branch; a closed Door's
  // SoundConduit returns transmissivity 0 and short-circuits.
  if (MixinApi.isAdornable(loc)) {
    for (const fx of loc.getFixtures()) {
      if (!isBoundaryAnchor(fx)) continue;
      const anchor = fx;
      const boundary = anchor.getBoundary();
      if (!boundary) continue;
      const otherHost = anchor.getOtherHost();
      if (!otherHost) continue;
      const conduit = findSoundConduit(boundary);
      if (!conduit) continue;
      const otherSide = boundary.getOtherSide(anchor);
      const tau = conduit.transmissivity(otherSide, anchor.getSide());
      if (!(tau > 0)) continue;
      const nextDirection =
        direction ?? directionThroughBoundary(loc, boundary);
      walkOutward(
        otherHost as unknown as Stuff & Container,
        sourceDb,
        depth + 1,
        cumulativeTau * tau * PER_HOP_TAU,
        nextDirection,
        visited,
        out,
      );
    }
  }

  // (c) Cross-exit propagation — doorless exits only (doored exits are
  // handled by the boundary branch above, matching `walkAt`).
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
      const nextDirection = direction ?? exit.getDirection();
      walkOutward(
        dest,
        sourceDb,
        depth + 1,
        cumulativeTau * EXIT_TAU * PER_HOP_TAU,
        nextDirection,
        visited,
        out,
      );
    }
  }
}

/**
 * The discrete-event outward sound walk — the push-side inversion of
 * `SoundModality.walkAt`. A namespace class (the module's one concept);
 * the walk is a pure computation with no instance state.
 */
export class AudienceGather {
  /**
   * Gather every hearing sensor reachable from `sourceLoc` for a
   * discrete sound event of `sourceDb` dB, with each arrival's
   * delivered level and first-hop direction. Same-room sensors arrive
   * at `sourceDb` with `direction = null`; each hop attenuates and
   * attributes a direction. Threshold filtering is the caller's.
   */
  static gather(
    sourceLoc: Stuff & Container,
    sourceDb: number,
  ): AudienceArrival[] {
    const out: AudienceArrival[] = [];
    walkOutward(sourceLoc, sourceDb, 0, 1.0, null, new Set<string>(), out);
    return out;
  }
}
