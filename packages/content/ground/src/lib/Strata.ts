/**
 * StrataMixin — *where in the ground am I, and what does the ground say
 * about it?*
 *
 * ⭐⭐ **The five reads that turn a room's coordinates into a position in
 * the rock**, lifted verbatim out of `trade-mining`'s `WorkingMixin`
 * (which now composes over this) so the second consumer does not have to
 * depend on a mine. The extraction build's quarry is that consumer; a
 * cellar, a well and a cave are the ones after it.
 *
 * The split is the one the mining build already named — *"reads go to the
 * space, mutation goes to the warren"* — carried one level further: **the
 * position reads belong to the GROUND, and cutting belongs to the trade
 * that cuts.** A room composing this knows where it sits in the column
 * and can sample it; it gains no ability to change it.
 *
 * ## Where the mixin lives
 *
 * A pack's own substrate lives in its `src/lib/`, exactly as the kernel's
 * does — inherited, never instanced (`lint:instanceable` invariant 8, as
 * the TPA reform amended it). This module is a mixin factory and the
 * types its surface speaks, and nothing else.
 *
 * ⚠ **Cells are not metres.** A cell is a room somebody cut; the deposit
 * speaks metres, because rock does not know what cell size anybody chose.
 * {@link Strata.metresOf} is the one conversion and it reads the zone's
 * own `cellSize`.
 */

import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { AddressApi } from '@saxonberg/server/mud/api/address';
import type { MixinConstructor } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import Deposit, { type Point, type GroundSample } from '../idea/Deposit';

/**
 * A cell of a workings grid — integer coordinates, `z` negative down.
 *
 * ⚠ **Not the deposit's units.** See the header.
 */
export type Cell = readonly [number, number, number];

/** The mixin's marker, and the string `MixinApi.isActive` narrows on. */
export const STRATA_MIXIN = 'StrataMixin';

/** Public shape added by StrataMixin. */
export interface Strata {
  /** This room's cell — its persistence key, survey address and MQL atom. */
  getCell(): Cell;
  /** A cell converted to metres through the zone's own `cellSize`. */
  metresOf(cell: Cell): Point;
  /** The deposit governing this room, resolved through the ZONE's citation. */
  getDeposit(): Promise<Deposit | null>;
  /** The deposit's seed, derived from the covering Locality's address. */
  getGroundSeed(): Promise<number>;
  /** Everything the ground says about the cell this room occupies. */
  sampleHere(): Promise<GroundSample | null>;
}

/**
 * ⚠⚠ **Why this factory carries an explicit return type**, unlike most
 * mixins in the tree.
 *
 * TypeScript does not surface a mixin's own members on `this` inside a
 * class that extends it when the mixin's base is a type PARAMETER —
 * `class WorkingMixin extends StrataMixin(Base)` type-checked `super.x()`
 * fine and reported *"Property 'getCell' does not exist"* for `this.x()`,
 * and the same hole reached `MineRoom`, so every consumer typed as
 * `Working` lost the five reads. Annotating the return as
 * `TBase & Constructor<Strata>` is the standard idiom that closes it, and
 * it is what lets `WorkingMixin` keep calling these through `this` with no
 * casts at eight call sites.
 */
export function StrataMixin<TBase extends MixinConstructor<Stuff & Container>>(
  Base: TBase,
): TBase & (new (...args: any[]) => Strata) {
  class StrataMixin extends Base implements Strata {
    static _mixinName = STRATA_MIXIN;

    /** This working's cell. The persistence key, the survey address and the MQL atom are all this. */
    public getCell(): Cell {
      const c = (
        this as unknown as { getCoordinates(): [number, number, number] }
      ).getCoordinates();
      return [c[0], c[1], c[2]];
    }

    /**
     * This working's position in the ground, **in metres** — the cell
     * times the zone's own `cellSize`. The single conversion between the
     * grid a mine is cut on and the rock it is cut through.
     */
    public metresOf(cell: Cell): Point {
      const zone = (
        this as unknown as { getZone(): { getCellSize?(): number } | null }
      ).getZone();
      const size = zone?.getCellSize?.() ?? 1;
      return [cell[0] * size, cell[1] * size, cell[2] * size];
    }

    /**
     * The deposit governing this working, resolved through the ZONE's
     * `deposit:` field — ⭐ declared on the shared parent zone, so the
     * surface pithead and the workings resolve the same one and the
     * outcrop, the float and the three-point problem are all played
     * above ground.
     */
    public async getDeposit(): Promise<Deposit | null> {
      const zone = (
        this as unknown as {
          getZone(): { lookupField<T>(f: string): Promise<T | null> } | null;
        }
      ).getZone();
      if (!zone) return null;
      const path = await zone.lookupField<string>('deposit');
      if (!path) return null;
      return resolveDeposit(path);
    }

    /**
     * The deposit's seed — derived from the covering Locality's claimed
     * address and stored nowhere. Rename the mine and its ore moves.
     */
    public async getGroundSeed(): Promise<number> {
      const locality = await AddressApi.resolveLocalityFor(
        this as unknown as Stuff & Container,
      );
      return Deposit.seedFor(locality?.getAddress() ?? '');
    }

    /** Everything the ground says about the cell this room occupies. */
    public async sampleHere(): Promise<GroundSample | null> {
      const d = await this.getDeposit();
      if (!d) return null;
      return d.sampleAt(this.metresOf(this.getCell()), await this.getGroundSeed());
    }
  }
  return StrataMixin as unknown as TBase & (new (...args: any[]) => Strata);
}

/**
 * Resolve a deposit citation. Get-or-create through `singleton`, whose
 * first act is the index read — the *reference Ideas inert at boot*
 * failure cannot recur here.
 *
 * ⚠ A zone naming a deposit row that does not exist is an authoring
 * error, and barren ground is the honest reading of it — but the fault
 * goes to the log, because "barren" is exactly what a real barren cell
 * says and the two must not be indistinguishable.
 */
async function resolveDeposit(path: string): Promise<Deposit | null> {
  try {
    return await StuffApi.singleton<Deposit>(path);
  } catch (err) {
    console.error(`Strata: deposit '${path}' did not resolve`, err);
    return null;
  }
}
