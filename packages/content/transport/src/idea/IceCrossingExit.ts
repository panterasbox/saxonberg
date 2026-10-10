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
 * bears a person refuses a horse. `applyTraversal` reads the ice for this
 * mover's mass and sets the shipped `blocked` bit before the gate looks;
 * `refreshCrossing` (the lane compile's question, by shape) answers for a
 * person on foot. The refusal names what is wrong with the ice: open
 * water, thin ice, rotten ice, or water that moves.
 *
 * ⚠ **Physical only**, like every closure in this build: comms and
 * teleport do not care what the river is doing.
 *
 * ## It reads the water pack by SHAPE
 *
 * The `FordExit` idiom. ⚠ With no water pack installed the crossing is
 * ALWAYS refused — a crossing with no water behind it is a wall, the
 * inverse of the ford's degradation (a ford with no river is a road).
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

/** Where the water pack's compiled drainage lives, if it is installed. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';

/** A person on foot, when the mover says nothing about its mass. */
const DEFAULT_MOVER_KG = 80;

/** The ice as the crossing reads it — the water pack's `IceRecord`, by shape. */
interface IceRead {
  thicknessM: number;
  bearsKg: number;
  rotting: boolean;
  reason: 'running' | 'warm' | null;
}

/** The one method a crossing asks the water for. */
interface IceSource {
  iceAt(ref: string, nowS: number): Promise<IceRead | null>;
}

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

  /** Why the last read refused (`null` when it bore the mover). */
  private refusal: IceRefusal | null = null;

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

  /** Read the ice for a body of `moverKg` and set `blocked` from it. */
  public async refreshCrossing(moverKg: number = DEFAULT_MOVER_KG): Promise<void> {
    const refusal = await this.refusalFor(moverKg);
    this.refusal = refusal;
    this.setBlocked(refusal !== null);
  }

  /** Read for THIS mover, then fall through: the `blocked` gate refuses. */
  public override async applyTraversal(mover: Stuff): Promise<boolean> {
    await this.refreshCrossing(IceCrossingExit.massOf(mover));
    return false;
  }

  /** The refusal names what is wrong with the ice. */
  public override canTraverse(mover: Stuff & Containable, mode?: string): TraversalGuard {
    const base = super.canTraverse(mover, mode);
    if (base.ok || base.gate !== 'blocked') return base;
    return { ok: false, gate: 'blocked', reason: IceCrossingExit.prose(this.refusal) };
  }

  private async refusalFor(moverKg: number): Promise<IceRefusal | null> {
    if (this._crossesReach === '') return 'no-water';
    const water = await IceCrossingExit.iceSource();
    if (!water) return 'no-water';
    const ice = await water.iceAt(this._crossesReach, WorldClockApi.getNow().rawValue());
    if (ice === null) return 'no-water';
    if (ice.reason === 'running') return 'running';
    if (ice.thicknessM <= 0) return 'open';
    if (ice.rotting) return 'rotten';
    if (ice.bearsKg < moverKg + this._bearsMarginKg) return 'thin';
    return null;
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

  /** The water pack's catalogue, by SHAPE; `null` when it is not installed. */
  private static async iceSource(): Promise<IceSource | null> {
    try {
      const cat = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE);
      const duck = cat as unknown as Partial<IceSource>;
      return typeof duck.iceAt === 'function' ? (duck as IceSource) : null;
    } catch {
      return null;
    }
  }
}
