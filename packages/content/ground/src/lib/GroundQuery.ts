/**
 * GroundQueryMixin — *what does the column say about THAT place?*
 *
 * ⭐⭐ **The trio that had been written three times privately.** Asking
 * the ground about a place is four steps and they are always the same
 * four: resolve the deposit through the place's zone citation, convert
 * the place's cell to metres through the zone's `cellSize`, derive the
 * seed from the covering Locality's address, and sample. It was written
 * in `trade-mining`'s `SurveyReading` (`depositAt`/`metresAt`/`seedAt`/
 * `groundAt`), again in `trade-farming`'s `SoilReading`, and the
 * drilling build's structural channel was about to be the fourth.
 *
 * ⭐ **Three copies is where a pattern gets a home, and this is the
 * home.** It is the ground pack's because every composer depends on the
 * ground and none of them depends on another — a channel that asks the
 * rock a question should not have to depend on a mine to ask it, which
 * is the whole reason this pack exists.
 *
 * ## The difference from `StrataMixin`
 *
 * `StrataMixin` is for a thing that **is** a place in the ground and
 * asks about itself. This is for a thing that is **handed** a place and
 * asks about that — a `Reading` row, which is a singleton `Idea` sitting
 * nowhere and answering about wherever the actor happens to be standing.
 * {@link GroundPointMixin} is the third case, a thing standing **in** a
 * place, and it composes this and supplies the place.
 *
 * ⚠ **Cells are not metres.** A cell is a room somebody cut; the deposit
 * speaks metres, because rock does not know what cell size anybody
 * chose. {@link GroundQuery.metresAt} is the one conversion.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Deposit, {
  type Point,
  type GroundSample,
  type FluidSample,
  type StructureReading,
} from '../idea/Deposit';
import type { MixinCtor } from './Strata';

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const GROUND_QUERY_MIXIN = 'GroundQueryMixin';

/** Public shape added by GroundQueryMixin. */
export interface GroundQuery {
  /** The deposit governing `place`, through its ZONE's citation. `null` if none. */
  depositAt(place: Stuff): Promise<Deposit | null>;
  /** The covering Locality's claimed address — what the seed and the body book key on. */
  addressAt(place: Stuff): Promise<string>;
  /** The deposit's seed for `place`, derived from that address and stored nowhere. */
  seedAt(place: Stuff): Promise<number>;
  /** `place`'s own cell, in zone metres — all three axes scaled. */
  metresAt(place: Stuff): Point;
  /**
   * The point `depthM` metres below `place`'s collar.
   *
   * ⚠ The horizontal pair scales by the grid and the DEPTH does not: a
   * hole is sunk and logged in metres, and the place's own `z` is
   * irrelevant to it.
   */
  metresBelow(place: Stuff, depthM: number): Point;
  /** Everything the column says at `place`'s own cell. */
  groundSampleAt(place: Stuff): Promise<GroundSample | null>;
  /** Everything the column says `depthM` below `place`. */
  groundSampleBelow(place: Stuff, depthM: number): Promise<GroundSample | null>;
  /** Every structure under `place`, read to `errorM` resolution. `[]` if none. */
  structuresAt(place: Stuff, errorM: number): Promise<StructureReading[]>;
  /** What is in the pore space `depthM` below `place`. */
  fluidBelow(place: Stuff, depthM: number): Promise<FluidSample | null>;
}

/**
 * ⚠ The explicit return annotation is required for `StrataMixin`'s
 * reason, measured there: TypeScript does not surface a mixin's own
 * members on `this` inside a class extending it when the base is a type
 * parameter, and every consumer typed as the interface would silently
 * lose the whole surface.
 */
export function GroundQueryMixin<TBase extends MixinConstructor>(
  Base: TBase,
): TBase & MixinCtor<GroundQuery> {
  class GroundQueryMixin extends Base implements GroundQuery {
    static _mixinName: string = GROUND_QUERY_MIXIN;

    public async depositAt(place: Stuff): Promise<Deposit | null> {
      const zone = (
        place as unknown as {
          getZone?(): { lookupField<T>(f: string): Promise<T | null> } | null;
        }
      ).getZone?.();
      if (!zone) return null;
      const path = await zone.lookupField<string>('deposit');
      if (!path) return null;
      // ⚠ Get-or-create: a `Deposit` is a reference Idea and nothing
      // boots a roster of them, so a bare `findByTemplatePath` reads
      // null forever on a fresh process. `singleton` IS the
      // get-or-create — its first act is that same index read — so a
      // resident pre-check in front of it is the lookup written twice.
      try {
        return await StuffApi.singleton<Deposit>(path);
      } catch (err) {
        // ⚠ Tolerated, never silent: a zone naming a row that does not
        // exist is an authoring fault, and barren ground is a
        // plausible-looking answer that would hide it.
        console.error(`GroundQuery: deposit '${path}' did not resolve`, err);
        return null;
      }
    }

    public async addressAt(place: Stuff): Promise<string> {
      const locality = await AddressApi.resolveLocalityFor(
        place as unknown as Stuff & Container,
      );
      return locality?.getAddress() ?? '';
    }

    public async seedAt(place: Stuff): Promise<number> {
      return Deposit.seedFor(await this.addressAt(place));
    }

    public metresAt(place: Stuff): Point {
      const [cell, size] = cellOf(place);
      return [cell[0] * size, cell[1] * size, cell[2] * size];
    }

    public metresBelow(place: Stuff, depthM: number): Point {
      const [cell, size] = cellOf(place);
      // ⚠ `-Math.abs(0)` is `-0`, which renders as "-0" in a point key
      // and a log line. Normalised here rather than at every call site.
      const down = depthM === 0 ? 0 : -Math.abs(depthM);
      return [cell[0] * size, cell[1] * size, down];
    }

    public async groundSampleAt(place: Stuff): Promise<GroundSample | null> {
      const deposit = await this.depositAt(place);
      if (!deposit) return null;
      return deposit.sampleAt(this.metresAt(place), await this.seedAt(place));
    }

    public async groundSampleBelow(
      place: Stuff,
      depthM: number,
    ): Promise<GroundSample | null> {
      const deposit = await this.depositAt(place);
      if (!deposit) return null;
      return deposit.sampleAt(
        this.metresBelow(place, depthM),
        await this.seedAt(place),
      );
    }

    public async structuresAt(
      place: Stuff,
      errorM: number,
    ): Promise<StructureReading[]> {
      const deposit = await this.depositAt(place);
      if (!deposit) return [];
      const at = this.metresAt(place);
      return deposit.structureReadingAt(
        at[0],
        at[1],
        errorM,
        await this.seedAt(place),
      );
    }

    public async fluidBelow(
      place: Stuff,
      depthM: number,
    ): Promise<FluidSample | null> {
      const deposit = await this.depositAt(place);
      if (!deposit) return null;
      return deposit.fluidAt(
        this.metresBelow(place, depthM),
        await this.seedAt(place),
      );
    }
  }
  return GroundQueryMixin as unknown as TBase & MixinCtor<GroundQuery>;
}

/** A place's integer cell and its zone's metres-per-cell. */
function cellOf(place: Stuff): [readonly [number, number, number], number] {
  const p = place as unknown as {
    getCoordinates?(): [number, number, number];
    getZone?(): { getCellSize?(): number } | null;
  };
  const cell = p.getCoordinates?.() ?? [0, 0, 0];
  const size = p.getZone?.()?.getCellSize?.() ?? 1;
  return [cell, size];
}
