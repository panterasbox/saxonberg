/**
 * IceCrossingExit — **a crossing that only exists while the water is
 * frozen hard enough to bear you.**
 *
 * The ford's inverse: a ford is a road the water CLOSES; this is a road
 * the ice OPENS. It asks the water pack the one question it now answers
 * — what lies on this reach, and what it bears (`iceAt`, the climate
 * build: Stefan's law over the weather the water has had, Gold's formula
 * for the load) — and lets the mover across iff the sheet bears them.
 *
 * ## How it answers
 *
 * Unlike the ford, the answer depends on WHO is crossing: a sheet that
 * bears a person refuses a horse. `canTraverse` (async) reads the SHEET
 * (the same for everyone — the one thing stored) and weighs THIS mover
 * against it. Nothing per-mover is ever stored — an earlier version wrote
 * each mover's verdict into the shared `blocked` bit, and two people at
 * the shore across the read's await could get each other's answer. `isBlocked()` answers for a person on
 * foot, for the readers with no mover in hand (fire, the scope walk,
 * routing). The refusal names what is wrong with the ice: open water,
 * thin ice, rotten ice, or water that moves.
 *
 * ⚠ **Physical only**, like every closure in this build: comms and
 * teleport do not care what the river is doing.
 *
 * ## It reads the water mod's catalogue
 *
 * The ice is the water mod's (`WatercourseCatalogue.iceAt`), a declared
 * dependency. ⚠ With no catalogue the crossing is ALWAYS refused — a
 * crossing with no water behind it is a wall, the inverse of the ford's
 * degradation (a ford with no river is a road).
 *
 * See [docs/subsystems/logistics.md], [docs/subsystems/watershed.md].
 */

import Exit, { type ExitOptions } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';

import type WatercourseCatalogue from '@saxonberg/content-water/src/idea/WatercourseCatalogue';
import type { IceRecord } from '@saxonberg/content-water/src/idea/WatercourseCatalogue';

/** Where the water pack's compiled drainage lives. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';

/** A person on foot, when the mover says nothing about its mass. */
const DEFAULT_MOVER_KG = 80;

/** Why the crossing refused, for the prose. */
type IceRefusal = 'open' | 'running' | 'thin' | 'rotten' | 'no-water';

export interface IceCrossingExitOptions extends ExitOptions {
  /** `"<courseKey>:<nodeName>"` — the reach this crossing is over. */
  crossesReach?: string;
  /** Extra kilograms of margin the sheet must bear beyond the mover. */
  bearsMarginKg?: number;
}

export default class IceCrossingExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    _crossesReach: { persistent: true, authorable: true },
    _bearsMarginKg: { persistent: true, authorable: true },
  };

  /** The reach this crossing is over; `''` ⇒ nothing to read, refused. */
  protected _crossesReach = '';
  /** Kilograms of margin beyond the mover's own. */
  protected _bearsMarginKg = 0;

  /**
   * ⭐ The last read of the SHEET — the same for every mover, so it is
   * safe to share. `undefined` = never read; `null` = nothing to read
   * (no water pack, no reach). Who it bears is NOT stored: the gate
   * compares each mover's own mass against it, synchronously, so two
   * people at the shore at once can never read each other's answer.
   */
  private ice: IceRecord | null | undefined = undefined;

  constructor(opts?: IceCrossingExitOptions) {
    super(opts);
    if (opts?.crossesReach !== undefined) this.setCrossesReach(opts.crossesReach);
    if (opts?.bearsMarginKg !== undefined) this.setBearsMarginKg(opts.bearsMarginKg);
  }

  public getCrossesReach(): string {
    return this._crossesReach;
  }
  public setCrossesReach(value: string): void {
    this._crossesReach = value;
  }

  public getBearsMarginKg(): number {
    return this._bearsMarginKg;
  }
  public setBearsMarginKg(value: number): void {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError('IceCrossingExit.setBearsMarginKg: expected a non-negative number');
    }
    this._bearsMarginKg = value;
  }

  /** Read the sheet as it is now. Mover-independent. */
  public async refreshCrossing(): Promise<void> {
    this.ice = await IceCrossingExit.readIce(this._crossesReach);
  }

  /**
   * The way as a person on foot would find it — the answer for every
   * reader that has no mover in hand (fire spread, the scope walk,
   * routing). The authored `blocked` bit still closes it outright.
   *
   * ⚠ Before any crossing has read the sheet this is the AUTHORED bit alone:
   * `Exitable` asks `isBlocked()` at `addExit` to decide whether an exit
   * is "settled at birth", and an unread crossing must still get its
   * inverse wired. The gate is what fails closed (see `refusalFor`).
   */
  public override isBlocked(): boolean {
    if (super.isBlocked()) return true;
    if (this.ice === undefined) return false;
    return this.refusalFor(DEFAULT_MOVER_KG) !== null;
  }

  /**
   * Read the sheet at the moment of asking, then weigh THIS mover against
   * it. Refusals name what is wrong with the ice.
   */
  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    await this.refreshCrossing();
    const refusal = this.refusalFor(IceCrossingExit.massOf(mover));
    if (refusal !== null) {
      return { ok: false, gate: 'blocked', reason: IceCrossingExit.prose(refusal) };
    }
    return await super.canTraverse(mover, mode);
  }

  /** What is wrong with the ice for a body of `moverKg`, or `null`. */
  private refusalFor(moverKg: number): IceRefusal | null {
    const ice = this.ice;
    // Never read: fail closed — a crossing exists only while it bears.
    if (ice === undefined) return 'open';
    if (ice === null) return 'no-water';
    if (ice.reason === 'running') return 'running';
    if (ice.thicknessM <= 0) return 'open';
    if (ice.rotting) return 'rotten';
    if (ice.bearsKg < moverKg + this._bearsMarginKg) return 'thin';
    return null;
  }

  private static async readIce(reach: string): Promise<IceRecord | null> {
    if (reach === '') return null;
    const water = await StuffApi.singleton<WatercourseCatalogue>(WATERCOURSE_CATALOGUE).catch(() => null);
    if (!water) return null;
    return water.iceAt(reach, WorldClockApi.getNow().rawValue());
  }

  private static prose(refusal: IceRefusal | null): string {
    switch (refusal) {
      case 'running':
        return 'The water is moving here; whatever ice there is at the edges would not hold you.';
      case 'thin':
        return 'The ice is there, but it is thin and grey and it would not bear you.';
      case 'rotten':
        return 'The ice is rotten — honeycombed and dark. Nobody crosses that.';
      case 'no-water':
        return 'There is no crossing here.';
      case 'open':
      case null:
      default:
        return 'The water is open; there is no crossing here until it freezes.';
    }
  }

  /** The mover's mass, kg; a person on foot when it says nothing. */
  private static massOf(mover: Stuff): number {
    if (!MixinApi.isTangible(mover)) return DEFAULT_MOVER_KG;
    const kg = mover.getMass().rawValue();
    return Number.isFinite(kg) && kg > 0 ? kg : DEFAULT_MOVER_KG;
  }
}
