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
import { MEDIA } from '../biome/Medium';
import { Traversal } from '../location/Traversal';
import type { Leg } from '../location/Traversal';
import { StuffApi } from '../../api/stuff';
import { MessageApi } from '../../api/message';

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

/**
 * ⭐ One copy, on `AtmosphericMixin.atmosphereBlocks()`. The comment
 * that used to sit here said the v1 limitation was *"shared verbatim
 * with `SoundModality.walkAt`"* — a note admitting the duplication
 * while making a third copy of it. The limitation (an inherited
 * vacuum does not block; only a room's own `atmosphere: vacuum` does,
 * because the resolve is async and this walk is not) is documented at
 * the method, once.
 */
/** A place under the surface of a water: a band of a column. */
function underWater(loc: Stuff & Container): boolean {
  return MixinApi.isWaterPlace(loc) && loc.surfacePlace() !== (loc as unknown as Stuff);
}

/** The per-hop falloff into `loc`: the water's under the surface, the air's elsewhere. */
function hopTauOf(loc: Stuff & Container): number {
  return underWater(loc) ? MEDIA.water?.soundHopTau ?? PER_HOP_TAU : PER_HOP_TAU;
}

function atmosphereBlocks(loc: Stuff & Container): boolean {
  return MixinApi.isAtmospheric(loc) ? loc.atmosphereBlocks() : false;
}

function linearToDb(sourceDb: number, cumulativeTau: number): number {
  if (cumulativeTau <= 0) return Number.NEGATIVE_INFINITY;
  return sourceDb + 10 * Math.log10(cumulativeTau);
}

/** What travels outward along the legs: the running tau and the first-hop direction. */
interface Carry {
  tau: number;
  direction: string | null;
}

/**
 * ⭐ The legs out of `loc`, in the order this walk has always taken
 * them: ways with a boundary (b) first, then open ways (c) — mirroring `SoundModality.walkAt`, which is the pull-side
 * of the same physics.
 *
 * Each leg carries the tau that applies to it and the direction a
 * first hop through it would be attributed to. ⚠ `direction` is
 * **sticky**: only the FIRST hop names a direction, because what a
 * listener two rooms away reports is the way the sound came INTO their
 * neighbourhood, not the last doorway it crossed.
 */
function gatherLegs(loc: Stuff & Container): Array<Leg<Stuff & Container>> {
  const out: Array<Leg<Stuff & Container>> = [];

  if (!MixinApi.isExitable(loc)) return out;
  // ⚠ This walk's guard list was always SHORTER than the modalities': it
  // never checked `hasSpatialDestination`, `isContainer` or `isDestroyed`.
  // Routing the legs through `ExitableMixin.getObviousNeighbours` gives it
  // all five — an exit that names no room, or a room reaped mid-walk, no
  // longer reaches this walk at all.
  const ways = loc.getObviousNeighbours({ through: 'all' });

  // (b) Through a boundary — a shut door passes 0 and is dropped. The way
  // is the side, so it names its own direction (boundary build: the anchor
  // walk had to search the exits for the one whose door this was).
  for (const { exit, dest } of ways) {
    const boundary = exit.getBoundary();
    if (!boundary) continue;
    const tau = boundary.transmissivityInto('sound', exit);
    if (!(tau > 0)) continue;
    out.push({ node: dest, tau, dir: exit.getDirection() });
  }

  // (c) Through an open way.
  for (const { exit, dest } of ways) {
    if (exit.getBoundary()) continue;
    out.push({ node: dest, tau: EXIT_TAU, dir: exit.getDirection() });
  }

  return out;
}

/**
 * The outward sound walk, on the shared skeleton
 * (`lib/location/Traversal.ts` — *one traversal, or none*).
 *
 * ⭐⭐ **This is the push-down case, and it is why the skeleton has an
 * `enter` hook at all.** The three modalities fold a signal UP from
 * their neighbours; this one carries a level DOWN and emits at each
 * room it reaches. `Scene` consumes the result **in order** and
 * filters by threshold, so the emission order is the contract —
 * pre-order, which is what `enter` gives.
 *
 * ⚠ A vacuum short-circuits by returning the accumulator from
 * `enter`: no emit and no recursion, which is what *"vacuum stops the
 * walk at the recipient room"* always meant. The node is still marked.
 */
function walkOutward(
  loc: Stuff & Container,
  sourceDb: number,
  depth: number,
  cumulativeTau: number,
  direction: string | null,
  visited: Set<string>,
  out: AudienceArrival[],
): void {
  const walk = new Traversal<Stuff & Container, AudienceArrival[], Carry>({
    order: 'depth-first',
    keyOf: (node) => (node as unknown as Stuff).stuffId,
    neighbours: gatherLegs,
    bound: { hops: MAX_HOPS },
    visited,
    descend: (carry, leg) => ({
      // ⭐ Under the water sound carries further between places (D29
      // seam 11): the hop's falloff is the medium's, not the air's.
      tau: carry.tau * (leg.tau ?? EXIT_TAU) * hopTauOf(leg.node),
      // Sticky: the first hop names the direction and later hops keep it.
      direction: carry.direction ?? leg.dir ?? null,
    }),
    enter: (node, _d, carry) => {
      if (atmosphereBlocks(node)) return out;
      const db = linearToDb(sourceDb, carry.tau);
      // ⭐ …and arrives from no direction a hearer can place.
      const direction = underWater(node) ? null : carry.direction;
      for (const sensor of MessageApi.getSensors(node)) {
        out.push({ sensor, db, direction });
      }
      return undefined;
    },
    fold: () => out,
  });
  walk.walk(loc, { carry: { tau: cumulativeTau, direction }, depth });
}

/**
 * The discrete-event outward sound walk — the push-side inversion of
 * `SoundModality.walkAt`. A namespace class (the module's one concept);
 * the walk is a pure computation with no instance state.
  *
 * @internal every caller of this class sits in the `message` subsystem —
 * it is that subsystem's private collaborator, not author surface.
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
