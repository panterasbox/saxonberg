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

/**
 * A concrete mixin constructor, for a factory that must ANNOTATE its return.
 *
 * ⚠ `any[]` is required and is not laziness: the TypeScript handbook's mixin
 * pattern needs it, `never[]` breaks parameter variance and `unknown[]` breaks
 * base-constructor assignability — both measured here, both producing
 * *"Base constructors must all have the same return type"*. The kernel's own
 * `MixinConstructor` carries the identical suppression with the identical
 * reason: *"it's the one place the rule is deliberately suppressed."*
 *
 * ⭐ Declared once and exported so the two factories that need it — this
 * pack's `StrataMixin` and `trade-mining`'s `WorkingMixin` — share **one**
 * suppression rather than four.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MixinCtor<T> = new (...args: any[]) => T;

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
  /**
   * ⭐⭐ **Give me a lump of that.** Mint a piece of the rock in front of
   * you, stamped by the `sample` verb with where it was taken.
   *
   * ⚠⚠ **This is NOT {@link sampleHere}, and the two are one dot
   * apart.** `sampleHere()` answers *what does the deposit say about
   * this cell* — a `GroundSample`, a number, a DATA READING, and the
   * thing `measure strike` already bands. `sampleFace()` answers *give
   * me a lump of that* and returns **Stuff**. Two meanings of the word
   * on one host, and neither renames: `sampleHere` is a `Reading`'s
   * truth source and never a verb; `sampleFace` is the verb's and never
   * a reading.
   *
   * `null` when this ground has nothing to take — which is the honest
   * answer, and what the verb turns into *"there is nothing here worth
   * taking a piece of"*.
   *
   * ⭐ It lives on the GROUND rather than on mining's `WorkingMixin`
   * because taking a piece of the rock in front of you is a read of
   * where you stand, not an act of the mining trade — *reads go to the
   * ground, cutting belongs to the trade that cuts*. A quarry, a cellar,
   * a well and a cave can be sampled without depending on a mine, which
   * is the entire reason this pack exists.
   */
  sampleFace(actor: Stuff, direction: string): Promise<Stuff | null>;
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
): TBase & MixinCtor<Strata> {
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

    /**
     * See {@link Strata.sampleFace}. ⚠ The base yields NOTHING: plain
     * ground is not a face, and a room that can be cut says so by
     * overriding this. Mining's `WorkingMixin` is the first override —
     * it has faces, an ore row and a grade, none of which the ground
     * substrate knows about.
     *
     * ⭐ Returning `null` rather than throwing is what lets `sample` be
     * one verb for the whole world: `sample the north face` in a
     * drawing-room is a refusal, not an error.
     */
    public async sampleFace(
      _actor: Stuff,
      _direction: string,
    ): Promise<Stuff | null> {
      return null;
    }
  }
  return StrataMixin as unknown as TBase & MixinCtor<Strata>;
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
