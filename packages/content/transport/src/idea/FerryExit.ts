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
 * ⚠ It reads the river through the kernel's `LineFrame` (the frame its
 * `crossesAt` names) — a ferry whose river is not there crosses like a
 * road (the ford's rule).
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
import type { FrameSiteRecord } from '@saxonberg/server/mud/lib/expanse/FrameSited';
import type { LineFrame, LinePositionRecord } from '@saxonberg/server/mud/lib/expanse/LineFrame';
import FerryService from './FerryService';


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

export interface FerryExitOptions extends ExitOptions {
  ferry?: string;
  house?: string;
  fareMinor?: number;
  /** The river this ferry crosses, and where on it (its frame's own citation). */
  crossesAt?: FrameSiteRecord;
}

export default class FerryExit extends Exit {
  static fieldMeta: FieldMeta = {
    ...Exit.fieldMeta,
    ferry: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true },
    fareMinor: { persistent: true, authorable: true },
    crossesAt: { persistent: true, authorable: true },
    service: { persistent: true, authorable: true },
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
  protected crossesAt: FrameSiteRecord | null = null;

  constructor(opts?: FerryExitOptions) {
    super(opts);
    if (opts?.ferry !== undefined) this.ferry = opts.ferry;
    if (opts?.house !== undefined) this.house = opts.house;
    if (opts?.fareMinor !== undefined) this.fareMinor = opts.fareMinor;
    if (opts?.crossesAt !== undefined) this.setCrossesAt(opts.crossesAt);
  }

  public getFerry(): string { return this.ferry; }
  public setFerry(v: string): void { this.ferry = v; }
  public getHouse(): string { return this.house; }
  public setHouse(v: string): void { this.house = v; }
  public getFareMinor(): number { return this.fareMinor; }
  public setFareMinor(v: number): void { this.fareMinor = Math.max(0, Math.round(Number(v) || 0)); }
  public getCrossesAt(): FrameSiteRecord | null { return this.crossesAt ? { ...this.crossesAt } : null; }
  public setCrossesAt(v: FrameSiteRecord | null): void {
    this.crossesAt = v && typeof v.frame === 'string' && typeof v.cite === 'string' ? { ...v } : null;
  }

  /**
   * ⭐ The river this ferry crosses, and where on it — asked through the
   * kernel's `LineFrame` (W16; it used to reach the water mod's catalogue
   * and warren by path and duck-type them). `null`: no river to read.
   */
  private async crossing(): Promise<{ frame: Stuff & LineFrame; pos: LinePositionRecord } | null> {
    const site = this.crossesAt;
    if (site === null) return null;
    const frame = await StuffApi.singleton<Stuff>(site.frame).catch(() => null);
    if (frame === null || !MixinApi.isLineFrame(frame)) return null;
    const pos = await frame.locate(site.cite);
    return pos === null ? null : { frame, pos };
  }

  /** ⭐ The timetabled service this crossing runs to (W12), by row path, or `''` — on call only. */
  protected service = '';
  public getService(): string { return this.service; }
  public setService(v: string): void { this.service = typeof v === 'string' ? v : ''; }

  /** The service, loaded, or `null`. */
  public async liveService(): Promise<FerryService | null> {
    if (this.service === '') return null;
    const s = await StuffApi.singleton<Stuff>(this.service).catch(() => null);
    return s instanceof FerryService ? s : null;
  }

  /** Is `mover` the house's own ferryman — who runs the timetable, and is never held to it? */
  private isHouseFerryman(mover: Stuff): boolean {
    if (this.house === '' || !MixinApi.isEmployed(mover)) return false;
    return mover.getEmployment(this.house)?.positionKey === 'ferryman';
  }

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
    const at = await this.crossing();
    return at === null ? null : at.frame.waterAt(at.pos, WorldClockApi.getNow().rawValue());
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
    // ⭐ To the timetable (W12): in its hours a passenger boards only when
    // boarding is called at this landing, and is told when the next boat
    // goes. Out of its hours the service is on call, and the bell rules.
    const service = await this.liveService();
    if (service !== null && service.isTimetabled() && !this.isHouseFerryman(mover)) {
      const here = (this.getSource() as unknown as Stuff | null)?.getTemplatePath() ?? '';
      if (!service.boardingAt(here)) {
        const next = service.nextDepartureFrom(here);
        return {
          ok: false,
          gate: 'blocked',
          reason: next !== null
            ? `The ferry runs to the timetable now. The next boat from here leaves at ${service.clockWords(next)}.`
            : 'The ferry runs to the timetable, and there are no more boats from here today.',
        };
      }
      if (this.ferryHere() === null) {
        return { ok: false, gate: 'blocked', reason: 'Boarding is called, but the boat has not come over yet. The ferryman is bringing her.' };
      }
    }
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

  /**
   * The shallows of the far bank `driftM` below where this crossing lands —
   * the far landing's bank found by where IT stands on the river, which the
   * river reads (never transport parsing the river's citation grammar).
   */
  private async downstreamOf(farLanding: Stuff, driftM: number): Promise<(Stuff & Container) | null> {
    const at = await this.crossing();
    const site = MixinApi.isFrameSited(farLanding) ? farLanding.getFrameSite() : null;
    if (at === null || site === null) return null;
    const far = await at.frame.locate(site.cite);
    const water = await at.frame.waterAt(at.pos, WorldClockApi.getNow().rawValue());
    if (far === null || water === null) return null;
    const side = far.across > water.widthM / 2 ? 'right' : 'left';
    const shallows = await at.frame.shallowsAt({ ...at.pos, km: Math.max(0, at.pos.km - driftM / 1000) }, side);
    return shallows !== null && MixinApi.isContainer(shallows) ? (shallows as Stuff & Container) : null;
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
}
