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
 * ## ⭐ It reads the river through the kernel, never the water mod
 *
 * The ford names the river it crosses and where (`crossesAt: { frame, cite }`
 * — the frame's row and a citation in its grammar), and asks that frame
 * through the kernel's `LineFrame` protocol: the water there, and taking a
 * swept body in (river W16 — it used to reach the water mod's catalogue
 * and warren by path and duck-type them). No river frame there, no river
 * to read: the ford is a road.
 *
 * See [docs/subsystems/logistics.md], [docs/subsystems/river.md].
 */

import Exit, { type ExitOptions } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { FrameSiteRecord } from '@saxonberg/server/mud/lib/expanse/FrameSited';
import type { LineFrame, LinePositionRecord } from '@saxonberg/server/mud/lib/expanse/LineFrame';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';

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

/**
 * The river at the crossing, as much of it as a ford reads: the channel's
 * depth (at the thalweg) and its current — a wader crosses the whole river,
 * and it is the channel, not the margin, that takes your feet (the drive
 * found a year of water reading the margin, and never a soul swept).
 */
interface FordWater {
  depthM: number;
  currentMps: number;
}

export interface FordExitOptions extends ExitOptions {
  /** The river this ford crosses, and where on it (its frame's own citation). */
  crossesAt?: FrameSiteRecord;
}

export default class FordExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    crossesAt: { persistent: true, authorable: true },
  };

  /** The river this ford crosses and where; `null` ⇒ nothing to read, always a road. */
  protected crossesAt: FrameSiteRecord | null = null;

  constructor(opts?: FordExitOptions) {
    super(opts);
    if (opts?.crossesAt !== undefined) this.setCrossesAt(opts.crossesAt);
  }

  public getCrossesAt(): FrameSiteRecord | null {
    return this.crossesAt ? { ...this.crossesAt } : null;
  }

  public setCrossesAt(value: FrameSiteRecord | null): void {
    this.crossesAt = value && typeof value.frame === 'string' && typeof value.cite === 'string' ? { ...value } : null;
  }

  /** The river frame the ford crosses, and where on it — or `null`. */
  private async crossing(): Promise<{ frame: Stuff & LineFrame; pos: LinePositionRecord } | null> {
    const site = this.crossesAt;
    if (site === null) return null;
    const frame = await StuffApi.singleton<Stuff>(site.frame).catch(() => null);
    if (frame === null || !MixinApi.isLineFrame(frame)) return null;
    const pos = await frame.locate(site.cite);
    return pos === null ? null : { frame, pos };
  }

  /**
   * ⭐ The water at the crossing now — how deep and how fast — or `null`
   * where there is no river to read (no water pack, no reach named).
   */
  public async waterNow(): Promise<FordWater | null> {
    const at = await this.crossing();
    return at === null ? null : at.frame.waterAt(at.pos, WorldClockApi.getNow().rawValue());
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
    const depth = water.depthM;
    if (depth > stature * HEAD_SHARE) return 'over-head';
    const mass = FordExit.massOf(mover);
    const hold = STABILITY_DV * (stature / REF_STATURE_M) * (mass / REF_MASS_KG);
    return depth * Math.abs(water.currentMps) > hold ? 'swept' : 'across';
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
    const at = await this.crossing();
    if (at === null) return false;
    try {
      MessageApi.scene(mover)
        .topic('act.deed')
        .toSelf(Mml.compose`Halfway over the water takes your feet out from under you, and the river has you.`)
        .toPeers(Mml.compose`Halfway over the ford ${Mml.actor(mover)} goes down, and the river has them.`)
        .send();
    } catch {
      /* decoration */
    }
    return at.frame.handIn(mover, at.pos);
  }

  private static statureOf(mover: Stuff): number {
    const m = MixinApi.isOrganism(mover) ? mover.getSpecies()?.getStature() ?? 0 : 0;
    return m > 0 ? m : DEFAULT_STATURE_M;
  }

  private static massOf(mover: Stuff): number {
    if (!MixinApi.isTangible(mover)) return DEFAULT_MASS_KG;
    const kg = mover.getMass().rawValue();
    return Number.isFinite(kg) && kg > 0 ? kg : DEFAULT_MASS_KG;
  }
}
