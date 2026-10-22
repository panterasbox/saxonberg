/**
 * FordExit — ⭐ **a crossing that reads the body, not a threshold** (river
 * D10, the requirements' *"fords read the body"*).
 *
 * A ford is a riffle somebody found: shallow, fast, gravel underfoot. Until
 * the river build it closed above a flow an author typed (12 m³/s at the
 * Delight) and was otherwise a road. Now it asks the water what it is
 * doing at the crossing — how deep, how fast — and asks the BODY whether
 * it can stand in that:
 *
 * - **Over your head** it is not a ford, it is a swim: refused, in the
 *   water's words. Stature decides — the same water a tall man wades is
 *   over a child's head.
 * - **Knocked off your feet** — the water's push against a wading body
 *   grows as depth × speed, and what holds you there is your weight on
 *   the gravel. Past what your body can stand against, the crossing fails
 *   part-way: the river takes your feet and you are in it, swept, at the
 *   ford.
 * - Otherwise you wade across.
 *
 * The look tells you how deep and fast it is (`look river`, `measure
 * current`); whether you try is yours. Nothing is a roll.
 *
 * ## ⚠ It reads the water pack by SHAPE, never by import
 *
 * The ford resolves the `WatercourseCatalogue` and the `ReachWarren` by
 * template path and duck-types the methods it needs. An install with no
 * water pack has a ford that is a road — the honest degradation, and it
 * keeps `transport` free of a dependency on `water` for one crossing.
 *
 * See [docs/subsystems/logistics.md], [docs/subsystems/river.md].
 */

import Exit, { type ExitOptions } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';

/** Where the water pack's compiled drainage lives, if it is installed. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';
/** Where the river's warren lives — what takes a body swept off a ford. */
const REACH_WARREN = '/system/water/idea/ReachWarren';

/** A wading body is over its head past this share of its height. */
const HEAD_SHARE = 0.85;
/**
 * ⭐ The depth × speed a standing adult of 1.75 m and 75 kg can hold
 * against, m²/s — the flood-hazard literature's figure for being knocked
 * off your feet (~0.6). Scaled by the body: a heavier, taller body stands
 * in more.
 */
const STABILITY_DV = 0.6;
const REF_STATURE_M = 1.75;
const REF_MASS_KG = 75;
const DEFAULT_MASS_KG = 80;
const DEFAULT_STATURE_M = 1.7;

/** The river at a position, as much of it as a ford reads. */
interface FordWater {
  depthHereM: number;
  currentHereMps: number;
}

/** The catalogue's methods a ford asks, by shape. */
interface WaterSource {
  positionOf(citation: string): Promise<{ course: string; km: number; across: number } | null>;
  riverStateAt(pos: { course: string; km: number; across: number }, nowS: number): Promise<FordWater | null>;
}

/** The warren's one method a ford asks, by shape. */
interface RiverIntake {
  handIn(thing: Stuff & Containable, pos: { course: string; km: number; across: number }): Promise<unknown>;
}

export interface FordExitOptions extends ExitOptions {
  /** `"<course>:<node>[±km]"` — where on the river this ford crosses. */
  crossesReach?: string;
}

export default class FordExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    _crossesReach: { persistent: true, authorable: true },
  };

  /** Where the ford crosses; `''` ⇒ nothing to read, always a road. */
  protected _crossesReach = '';

  constructor(opts?: FordExitOptions) {
    super(opts);
    if (opts?.crossesReach !== undefined) this.setCrossesReach(opts.crossesReach);
  }

  public getCrossesReach(): string {
    return this._crossesReach;
  }

  public setCrossesReach(value: string): void {
    this._crossesReach = value;
  }

  /**
   * ⭐ The water at the crossing now — how deep and how fast — or `null`
   * where there is no river to read (no water pack, no reach named).
   */
  public async waterNow(): Promise<FordWater | null> {
    if (this._crossesReach === '') return null;
    const water = await FordExit.waterSource();
    if (!water) return null;
    const pos = await water.positionOf(this._crossesReach);
    if (pos === null) return null;
    return water.riverStateAt(pos, WorldClockApi.getNow().rawValue());
  }

  /**
   * ⭐ What this body makes of the water at the crossing (D10): over its
   * head, off its feet, or across.
   */
  public verdictFor(
    mover: Stuff,
    water: FordWater,
  ): 'across' | 'over-head' | 'swept' {
    const stature = FordExit.statureOf(mover);
    const depth = water.depthHereM;
    if (depth > stature * HEAD_SHARE) return 'over-head';
    const mass = FordExit.massOf(mover);
    const hold = STABILITY_DV * (stature / REF_STATURE_M) * (mass / REF_MASS_KG);
    return depth * Math.abs(water.currentHereMps) > hold ? 'swept' : 'across';
  }

  /** Refused only where the water is over your head: then it is a swim. */
  public override async canTraverse(
    mover: Stuff & Containable,
    mode?: string,
  ): Promise<TraversalGuard> {
    const water = await this.waterNow().catch(() => null);
    if (water !== null && this.verdictFor(mover, water) === 'over-head') {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The ford is over your head at this water. Across here it would be a swim.',
      };
    }
    return super.canTraverse(mover, mode);
  }

  /**
   * ⭐ A crossing that fails part-way: the river takes your feet and you
   * are in it at the ford, carried. `true` when it did (the move is this
   * exit's); `false` to wade across as any road.
   */
  public override async applyTraversal(mover: Stuff & Containable): Promise<boolean> {
    const water = await this.waterNow().catch(() => null);
    if (water === null || this.verdictFor(mover, water) !== 'swept') return false;
    const source = await FordExit.waterSource();
    const pos = source ? await source.positionOf(this._crossesReach) : null;
    const warren = await FordExit.riverIntake();
    if (pos === null || warren === null) return false;
    try {
      MessageApi.scene(mover)
        .topic('act.deed')
        .toSelf(Mml.compose`Halfway over the water takes your feet out from under you, and the river has you.`)
        .toPeers(Mml.compose`Halfway over the ford ${Mml.actor(mover)} goes down, and the river has them.`)
        .send();
    } catch {
      /* decoration */
    }
    await warren.handIn(mover, pos);
    return true;
  }

  private static statureOf(mover: Stuff): number {
    const species = (mover as unknown as { getSpecies?(): { getStature(): number } | null }).getSpecies?.();
    const m = species?.getStature() ?? 0;
    return m > 0 ? m : DEFAULT_STATURE_M;
  }

  private static massOf(mover: Stuff): number {
    if (!MixinApi.isTangible(mover)) return DEFAULT_MASS_KG;
    const kg = mover.getMass().rawValue();
    return Number.isFinite(kg) && kg > 0 ? kg : DEFAULT_MASS_KG;
  }

  /** The water pack's catalogue, by SHAPE; `null` when it is not installed. */
  private static async waterSource(): Promise<WaterSource | null> {
    try {
      const cat = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE);
      const duck = cat as unknown as Partial<WaterSource>;
      return typeof duck.riverStateAt === 'function' && typeof duck.positionOf === 'function'
        ? (duck as WaterSource)
        : null;
    } catch {
      return null;
    }
  }

  private static async riverIntake(): Promise<RiverIntake | null> {
    try {
      const w = await StuffApi.singleton<Stuff>(REACH_WARREN);
      const duck = w as unknown as Partial<RiverIntake>;
      return typeof duck.handIn === 'function' ? (duck as RiverIntake) : null;
    } catch {
      return null;
    }
  }
}
