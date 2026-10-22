/**
 * FerryExit — ⭐ **a crossing that is a boat** (river D31).
 *
 * A ferry is an exit kind placed on each landing with the far landing as
 * its destination, so it is ONE edge the route planner costs — and flags,
 * because the row declares it `conditional`: *this way is not always
 * passable.* A journey's leg across it is the same `traverse` with the
 * wagon towed.
 *
 * It is passable when:
 *
 * - **the ferry is alongside this landing** — the ferry (a transport kind
 *   row, a flat `Boat` with a pole) lies here. On the far bank, it is not:
 *   ring the bell and the ferryman brings her over;
 * - **the river admits the crossing** — the ferryman's threshold,
 *   `water.ferry.refuseAboveMps` (1.2): *not at this water*;
 * - the fare is paid to the ferry's house (the venue's own settlement, as
 *   any counter takes payment).
 *
 * ⭐ The crossing is the swimmer's physics, poled: the ferry is pushed
 * across at a pole's pace while the current carries her down. Whoever
 * poles — the ferryman on shift at the landing, or you — holds her bow
 * upstream at the angle their `navigation` decides, and the **glide**
 * cancels the drift: a hand who knows lands at the far landing; one who
 * does not angle her lands downstream of it, in the shallows of the far
 * bank, and has to pole her back up (`paddle <landing>`).
 *
 * ⚠ It reads the water pack by SHAPE, never by import — an install with no
 * water pack has a ferry that crosses like a road (the ford's rule).
 */

import Exit, { type ExitOptions, type TraversalGuard } from '@saxonberg/server/mud/lib/boundary/Exit';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { MessageApi } from '@saxonberg/server/mud/api/message';
import { EmploymentApi } from '@saxonberg/server/mud/api/employment';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { AppApi } from '@saxonberg/server/mud/api/app';
import { Mml } from '@saxonberg/server/mud/api/mml';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import FerryCable from '../thing/FerryCable';

const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';
const REACH_WARREN = '/system/water/idea/ReachWarren';

/** A ferryman refuses above this current, m/s (`water.ferry.refuseAboveMps`). */
const REFUSE_ABOVE_MPS = 1.2;
/** Below this a cable ferry hangs slack: no current to drive her, m/s. */
const MIN_CABLE_MPS = 0.1;
/** A pole's pace across, m/s. */
const POLE_MPS = 1.2;
/** How far off the landing still lands at it, m. */
const LANDS_WITHIN_M = 40;
/** The angle upstream a hand holds her bow at, by how well they know the water. */
const ANGLE_DEG: Record<string, number> = {
  untrained: 0,
  novice: 10,
  competent: 40,
  proficient: 50,
  expert: 55,
  master: 60,
};

/** The river at the crossing, as much of it as a ferry reads: the channel's current (what a crossing meets mid-river), and the width. */
interface CrossingWater {
  currentMps: number;
  widthM: number;
}

interface WaterSource {
  positionOf(citation: string): Promise<{ course: string; km: number; across: number } | null>;
  riverStateAt(pos: { course: string; km: number; across: number }, nowS: number): Promise<CrossingWater | null>;
}

interface RiverStops {
  stopAt(course: string, km: number, side: 'left' | 'right' | 'mid'): Promise<unknown>;
}

export interface FerryExitOptions extends ExitOptions {
  ferry?: string;
  house?: string;
  fareMinor?: number;
  crossesReach?: string;
}

export default class FerryExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    ferry: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true },
    fareMinor: { persistent: true, authorable: true },
    crossesReach: { persistent: true, authorable: true },
    tethered: { persistent: true, authorable: true },
  };

  /**
   * ⭐ A cable ferry's cable (D31): its row path, when this crossing rides
   * one — the current is the engine, nobody poles, nothing drifts.
   */
  protected tethered = '';
  public getTethered(): string { return this.tethered; }
  public setTethered(v: string): void { this.tethered = v ?? ''; }

  /** The cable at this landing, if this crossing rides one. */
  public cableHere(): FerryCable | null {
    if (this.tethered === '') return null;
    const here = this.getSource() as unknown as Stuff;
    if (!MixinApi.isContainer(here)) return null;
    const c = here.getContents().find((x) => x.getTemplatePath() === this.tethered);
    return c instanceof FerryCable ? c : null;
  }

  /** How fast a cable ferry goes across in this current, m/s. */
  private cableSpeedMps(cable: FerryCable, currentMps: number): number {
    return Math.abs(currentMps) * Math.sin((cable.getAngleDeg() * Math.PI) / 180);
  }

  /** The ferry's kind row (a transport `Boat`). */
  protected ferry = '/system/transport/thing/ferry';
  /** The Business whose ferryman poles her and whose till takes the fare. */
  protected house = '';
  /** The fare, minor units. */
  protected fareMinor = 0;
  /** `"<course>:<node>[±km]"` — where the ferry crosses. */
  protected crossesReach = '';

  constructor(opts?: FerryExitOptions) {
    super(opts);
    if (opts?.ferry !== undefined) this.ferry = opts.ferry;
    if (opts?.house !== undefined) this.house = opts.house;
    if (opts?.fareMinor !== undefined) this.fareMinor = opts.fareMinor;
    if (opts?.crossesReach !== undefined) this.crossesReach = opts.crossesReach;
  }

  public getFerry(): string { return this.ferry; }
  public setFerry(v: string): void { this.ferry = v; }
  public getHouse(): string { return this.house; }
  public setHouse(v: string): void { this.house = v; }
  public getFareMinor(): number { return this.fareMinor; }
  public setFareMinor(v: number): void { this.fareMinor = Math.max(0, Math.round(Number(v) || 0)); }
  public getCrossesReach(): string { return this.crossesReach; }
  public setCrossesReach(v: string): void { this.crossesReach = v; }

  /**
   * ⭐ A ferry is never always there (D31): the route planner flags the leg
   * and a plan says so. The class's truth, not a row's flag (the drive's
   * route said nothing — the row's key never reached the exit).
   */
  public override isConditional(): boolean {
    return true;
  }

  /** The ferry, if she lies at this landing now. */
  public ferryHere(): (Stuff & Containable) | null {
    const here = this.getSource() as unknown as Stuff;
    if (!MixinApi.isContainer(here)) return null;
    for (const c of here.getContents()) {
      if (c.getTemplatePath() === this.ferry && MixinApi.isContainable(c)) return c;
    }
    return null;
  }

  /** The water at the crossing now, or `null` when there is none to read. */
  public async waterNow(): Promise<CrossingWater | null> {
    if (this.crossesReach === '') return null;
    const water = await FerryExit.waterSource();
    if (!water) return null;
    const pos = await water.positionOf(this.crossesReach);
    if (pos === null) return null;
    return water.riverStateAt(pos, WorldClockApi.getNow().rawValue());
  }

  /**
   * Who poles her across from here: the house's ferryman standing at this
   * landing on shift, or — with nobody to do it — `mover`.
   */
  public polerFor(mover: Stuff): Stuff {
    const here = this.getSource() as unknown as Stuff;
    if (this.house !== '' && MixinApi.isContainer(here)) {
      for (const c of here.getContents()) {
        if (!MixinApi.isEmployed(c)) continue;
        const job = c.getEmployment(this.house);
        if (job?.positionKey === 'ferryman' && job.status === 'on-shift') return c;
      }
    }
    return mover;
  }

  /** ⭐ Not when the ferry is across, and not at this water (D31). */
  public override async canTraverse(mover: Stuff & Containable, mode?: string): Promise<TraversalGuard> {
    if (this.ferryHere() === null) {
      return {
        ok: false,
        gate: 'blocked',
        reason: 'The ferry is lying at the far bank. Ring the bell and the ferryman will bring her over.',
      };
    }
    const water = await this.waterNow().catch(() => null);
    if (water !== null && Math.abs(water.currentMps) >= FerryExit.dial('water.ferry.refuseAboveMps', REFUSE_ABOVE_MPS)) {
      return { ok: false, gate: 'blocked', reason: 'Not at this water. The river is running too hard to take her across.' };
    }
    const cable = this.cableHere();
    if (cable !== null && water !== null && this.cableSpeedMps(cable, water.currentMps) < MIN_CABLE_MPS) {
      return { ok: false, gate: 'blocked', reason: 'There is no current to drive her; she hangs slack on the cable.' };
    }
    return super.canTraverse(mover, mode);
  }

  /** ⭐ The crossing takes as long as a pole takes her across. */
  public override async crossingRealS(mover: Stuff): Promise<number> {
    void mover;
    const water = await this.waterNow().catch(() => null);
    if (water === null) return 0;
    const cable = this.cableHere();
    const across = cable !== null ? Math.max(MIN_CABLE_MPS, this.cableSpeedMps(cable, water.currentMps)) : POLE_MPS;
    const gameS = water.widthM / across;
    const scale = WorldClockApi.getScale();
    return gameS / (Number.isFinite(scale) && scale > 0 ? scale : 1);
  }

  /**
   * ⭐ The crossing (D31): the fare, then the glide. A hand who holds her
   * at the right angle lands at the far landing (the ordinary move, the
   * wagon towed); one who does not lands downstream, in the shallows of the
   * far bank, with the ferry. `true` when this exit moved them itself.
   */
  public override async applyTraversal(mover: Stuff & Containable): Promise<boolean> {
    const ferry = this.ferryHere();
    if (ferry === null) return false;
    // ⭐ On a cable the current takes her across and nobody poles: she
    // lands where the cable does, every time.
    if (this.cableHere() !== null) {
      ContainmentApi.move(ferry, this.getDestination() as unknown as Stuff & Container);
      FerryExit.tell(mover, 'She swings out on the cable, sets her shoulder to the current, and the river itself walks her across to the far landing.');
      return false;
    }
    const poler = this.polerFor(mover);
    if (this.fareMinor > 0 && poler !== mover) {
      const sourcePath = (this.getSource() as unknown as Stuff).getTemplatePath();
      await EmploymentApi.settleSale(sourcePath, this.fareMinor, this.fareMinor, 'a ferry fare', []).catch(() => null);
    }
    const water = await this.waterNow().catch(() => null);
    const band = MixinApi.isAdvancing(poler) ? await poler.competenceBandFor('navigation') : 'untrained';
    const angle = ((ANGLE_DEG[band] ?? 0) * Math.PI) / 180;
    const current = Math.abs(water?.currentMps ?? 0);
    const t = (water?.widthM ?? 0) / Math.max(0.1, POLE_MPS * Math.cos(angle));
    const driftM = (current - POLE_MPS * Math.sin(angle)) * t;
    const dest = this.getDestination();
    ContainmentApi.move(ferry, dest as unknown as Stuff & Container);
    if (poler !== mover && MixinApi.isContainable(poler)) ContainmentApi.move(poler, dest as unknown as Stuff & Container);
    if (driftM <= LANDS_WITHIN_M || water === null) {
      FerryExit.tell(mover, `${poler === mover ? 'You set' : `${poler.getPresentation()} sets`} the pole and hold${poler === mover ? '' : 's'} her bow up into the current, and she crabs across and comes in square to the landing.`);
      return false;
    }
    // ⭐ Landed downstream: the current had her the whole way over.
    const landed = await this.downstreamOf(dest as unknown as Stuff, driftM);
    if (landed === null) return false;
    ContainmentApi.move(ferry, landed);
    ContainmentApi.move(mover, landed);
    if (poler !== mover && MixinApi.isContainable(poler)) ContainmentApi.move(poler, landed);
    FerryExit.tell(mover, `You pole straight across and the river takes her down the whole way; she grounds in the shallows ${Math.round(driftM)} meters below the landing. You will have to pole her back up (\`paddle\` to the landing).`);
    return true;
  }

  /** The shallows of the far bank `driftM` below where this crossing lands. */
  private async downstreamOf(farLanding: Stuff, driftM: number): Promise<(Stuff & Container) | null> {
    const water = await FerryExit.waterSource();
    const pos = water ? await water.positionOf(this.crossesReach) : null;
    const bank = (farLanding as unknown as { getBank?(): { side: 'left' | 'right' } | null }).getBank?.() ?? null;
    if (pos === null || bank === null) return null;
    try {
      const warren = (await StuffApi.singleton<Stuff>(REACH_WARREN)) as unknown as Partial<RiverStops>;
      if (typeof warren.stopAt !== 'function') return null;
      return (await warren.stopAt(pos.course, Math.max(0, pos.km - driftM / 1000), bank.side)) as Stuff & Container;
    } catch {
      return null;
    }
  }

  private static tell(who: Stuff, text: string): void {
    try {
      MessageApi.scene(who).topic('act.move').toSelf(Mml.compose`${text}`).send();
    } catch {
      /* decoration */
    }
  }

  private static dial(key: string, fallback: number): number {
    try {
      const n = Number.parseFloat(AppApi.setting(key) ?? '');
      return Number.isFinite(n) ? n : fallback;
    } catch {
      return fallback;
    }
  }

  private static async waterSource(): Promise<WaterSource | null> {
    try {
      const cat = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE);
      const duck = cat as unknown as Partial<WaterSource>;
      return typeof duck.riverStateAt === 'function' && typeof duck.positionOf === 'function' ? (duck as WaterSource) : null;
    } catch {
      return null;
    }
  }
}
