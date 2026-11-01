/**
 * Ship — ⭐ **a {@link Structure} whose position is a variable** (maritime
 * review, 2026-10-13).
 *
 * A building and a ship are both *these rooms are one building*; what a
 * ship adds is everything that follows from the building MOVING, and none
 * of it belongs on a tower:
 *
 * - **the position and the voyage** — `expansePosition` (Positioned) and,
 *   under way, the voyage triple (Voyaging; see `Voyage`), held as a
 *   sustained engagement (Engaged) and outliving the process
 *   (Persistable: a ship's position, course and plot survive a restart);
 * - **heights aboard** — `deckHeightM` / `mastheadHeightM`, what a horizon
 *   reads of an OBSERVER on her; `heightM` (the truck) stays the
 *   Structure's, what others read of her as a target;
 * - **the house** — the Business whose roster mans her (her outfit), so
 *   the lookout is a SEAT read off the shipped roster;
 * - **who and what is aboard** — the Voyaging hooks (`aboard`,
 *   `watchRoom`, `gearAboard`, `sightHeightFor`).
 *
 * ⭐ *Is it a ship?* is `instanceof Ship` (and *does it voyage?* is
 * `MixinApi.isVoyaging`, which a boat answers too) — never a guard on a
 * field (`deckHeightM === null` once stood in for this on every
 * Structure).
 */

import Structure from '../../lib/spatial/Structure';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import { EngagedMixin } from '../../lib/activity/Engaged';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { VoyagingMixin } from '../../lib/expanse/Voyaging';
import { MovingMixin } from '../../lib/expanse/Moving';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { EvictionContext } from '../../lib/stuff/Stuff';
import type { VetoResult } from '../../lib/errors';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HullNow } from '../../lib/expanse/Voyaging';
import type { CourseRequest, CraftStop } from '../../lib/expanse/Frame';
import type { StartResult } from '../../api/scheduler';
import ExpanseNode from './ExpanseNode';
import Bollard from '../thing/Bollard';
import BerthExit, { type Berthed } from './BerthExit';
import ShipWarren, { AUTHORED_SHIP_WARREN } from './ShipWarren';
import type { Positioned } from '../../lib/expanse/Positioned';
import Rope from '../thing/Rope';
import { BilgeMixin } from '../../lib/expanse/Bilge';
import type { Exitable } from '../../lib/boundary/Exitable';
import type { BerthKeeper } from '../../lib/expanse/BerthKeeper';
import type { LineFrame } from '../../lib/expanse/LineFrame';
import { PersistableApi } from '../../api/persistable';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { ShipRegisterApi } from '../../api/ship-register';
import type { ShareHolder } from '../../api/ship-register';
import { BoundaryApi } from '../../api/boundary';
import { GovernmentApi } from '../../api/government';
import { Lock } from '../../lib/lock/Lock';
import { CallSecurity } from '../../lib/security/decorators';
import { SecurityPolicies } from '../../lib/security/SecurityPolicies';
import type { MarkupAugmenter } from '../../api/mml';
import Flag from '../thing/Flag';
import Flagstaff from '../thing/Flagstaff';
import { AppApi } from '../../api/app';
import { CompetenceBand, type CompetenceBandName } from '../../lib/advancement/CompetenceBand';
import type { Difficulty } from '../../lib/advancement/ActSignature';
import { EventApi, type Subscription } from '../../api/event';
import { CommandDispatchedEvent, type CommandDispatchedPayload } from '../../lib/events/CommandDispatchedEvent';
import { ScheduleApi, type ScheduleHandle } from '../../api/schedule';
import { Quantity } from '../../lib/quantity';
import type { FramePos } from '../../lib/expanse/Frame';

/** A ship's hull (river D28): how deep she floats, how wide, how long. */
export interface ShipHull {
  draftM: number;
  beamM: number;
  lengthM: number;
  /**
   * ⭐ The depth of her hull, keel to deck, m (harbors P2) — what she can
   * take aboard before she goes down. Absent for a ship nobody measured.
   */
  depthM?: number;
}

/** Water density, kg/m³ — what a laden hull displaces. */
const RHO = 1000;

/** The position key of the seat that sees further (maritime D13). */
const LOOKOUT_POSITION = 'lookout';

/** The position key of the seat that commands her (harbors P12). */
const MASTER_POSITION = 'master';

/**
 * ⭐ A bill she carries until it is paid (harbors P13) — a charter's days
 * owed to her line, written when the charter ends; paid at a harbor
 * office's book with `pay office`.
 */
export interface ShipBill {
  /** The venue the money goes to (a place its Business operates). */
  to: string;
  /** Whole minor units. */
  amountMinor: number;
  /** What it is for, in words. */
  reason: string;
  /**
   * Who it is owed by, by identity path (a charter's days are the
   * charterer's) — they answer for her at the office until it is paid.
   */
  by?: string;
}

/**
 * ⭐ A voyage charter (harbors P23): the charterer is her master until she
 * next berths at a kept quay, and pays the line for the world's days it
 * lasted, at the book's rate.
 */
export interface ShipCharter {
  /** The charterer, by identity path. */
  charterer: string;
  /** When it began, game-seconds. */
  sinceS: number;
  /** Minor units per world's day, the book's posted rate. */
  ratePerDay: number;
  /** The venue the days are paid to (the line's desk) — whose house's books they are. */
  payTo: string;
}

const DAY_S = 86_400;

/** The kind row of the way aboard a ship, named for her (harbors P4). */
const BERTH_EXIT_KIND = '/platform/idea/exits/berth';

/**
 * ⭐ A mooring line must reach from her rail to the bollard and back again
 * (harbors P6, grain): twice her height out of the water, never less than
 * this, m.
 */
const MIN_LINE_M = 2;

/** The knot her lines go round a bollard in (a joint row's key) — quick on, quick off. */
const MOORING_KNOT = 'clove-hitch';

/**
 * ⭐ The water a master keeps under her keel crossing a bar (harbors P10,
 * grain): her draft and this much again, m, or she waits for the flood.
 */
const UNDER_KEEL_M = 0.5;

/** What the bar says to her draft now (harbors P10). */
export interface BarClearance {
  /** Water over the bar less her draft and the margin under her keel, m — negative: she cannot cross. */
  clearanceM: number;
  /** The water over the bar now, m. */
  depthM: number;
  /** What she wants over it: her draft and the margin, m. */
  wantsM: number;
  /** Game-seconds of the next high water, or `null` for an untidal bar. */
  nextHighS: number | null;
}

/**
 * ⭐ What a hull lets in by her shell's band (harbors P19, grain): litres
 * a second per meter of her length, each a setting (`ship.leak.<band>`).
 * A sound hull is tight; a worn one weeps at every seam.
 */
const LEAK_LPS_PER_M: Record<string, number> = {
  sound: 0,
  // ⭐ Retuned at B5 against *nothing fails over a weekend away* (the
  // arithmetic is in `platform/content/settings/ship.yaml`).
  weathered: 0.0005,
  worn: 0.004,
  shabby: 0.02,
  dilapidated: 0.08,
};

/** What a hole lets in on top of her seams, L/s per meter (`ship.leak.holed`, grain). */
const HOLED_LPS_PER_M = 0.25;

/** The share of her hull's box that is hull (a block coefficient, as `hullNow` uses). */
const BLOCK = 0.7;

/** ⭐ Pumped down to this much water over her keel, a ship settled on a drying berth floats again, m (grain). */
const REFLOAT_BILGE_M = 0.15;

/** ⭐ Acts each person aboard has once she is settling (P20, grain). */
const SETTLING_ACTS = 6;

/** ⭐ Real seconds the settling window stays open at most (P20, grain). */
const SETTLING_REAL_S = 600;

/** One bilge pump's throughput, L/s — what a sounding tells an expert she out-runs. */
const ONE_PUMP_LPS = 0.6;

/** The bilge she has as it stands now (harbors P19), for a reading. */
export interface BilgeState {
  /** Litres in her bilge. */
  litres: number;
  /** The water's height above her keel, m. */
  heightM: number;
  /** Her hull's depth, keel to deck, m. */
  depthM: number;
  /** What is coming in, L/s, now. */
  leakLps: number;
  /** Her shell's band now (the hull clock). */
  band: string;
}

export const SHIP_CLASS_PATH = '/platform/idea/Ship';

export default class Ship extends BilgeMixin(PersistableMixin(
  VoyagingMixin(MovingMixin(EngagedMixin(PositionedMixin(Structure)))),
)) {
  static fieldMeta: FieldMeta = {
    deckHeightM: { persistent: true, authorable: true },
    mastheadHeightM: { persistent: true, authorable: true },
    house: { persistent: true, authorable: true, ref: 'identity:relation' },
    hull: { persistent: true, authorable: true },
    aground: { persistent: true },
    holed: { persistent: true },
    overboard: { persistent: true },
    berth: { persistent: true, authorable: true, ref: 'identity:relation' },
    moored: { persistent: true, authorable: true },
    gangwayKeyway: { persistent: true, authorable: true },
    gangwayLocked: { persistent: true, authorable: true },
    owed: { persistent: true },
    charter: { persistent: true },
    warren: { persistent: true, authorable: true, ref: 'identity:relation' },
    settling: { persistent: true },
    settled: { persistent: true },
    wreck: { persistent: true },
  };

  /**
   * ⭐ Who went over her side and has not come back aboard (river D30):
   * identity paths. Her `course` refuses while any of them is still in the
   * water, unless the master leaves them deliberately.
   */
  protected overboard: string[] = [];

  /** Somebody went over her side (the deck's way into the water says so). */
  public override noteOverboard(who: Stuff): void {
    const id = who.getIdentityPath() ?? who.getTemplatePath();
    if (id && !this.overboard.includes(id)) this.overboard.push(id);
  }

  /**
   * Her own people still in the water: of those who went over her side,
   * whoever is alive and in a water place now. Anybody aboard again, ashore
   * or gone is let go of.
   */
  public async peopleInTheWater(): Promise<Stuff[]> {
    const still: Stuff[] = [];
    const keep: string[] = [];
    for (const id of this.overboard) {
      const who = StuffApi.findByIdentityPath<Stuff>(id)[0] ?? null;
      if (who === null || who.isDestroyed()) continue;
      if (MixinApi.isOrganism(who) && !who.isAlive()) continue;
      const room = MixinApi.isContainable(who) ? who.getContainer() : null;
      if (room === null || !MixinApi.isWaterPlace(room) || !room.isWaterNow()) continue;
      keep.push(id);
      still.push(who);
    }
    this.overboard = keep;
    return still;
  }

  /** The master sails without them, on purpose: they are no longer hers to wait for. */
  public leaveThem(): void {
    this.overboard = [];
  }

  /** Her hull's numbers (river D28); `null` for a ship nobody measured. */
  protected hull: ShipHull | null = null;
  /** Hard aground — no course takes her anywhere until she floats (D28). */
  protected aground = false;
  /** Holed on a snag — stopped, taking water (D29). */
  protected holed = false;

  public getHull(): ShipHull | null { return this.hull ? { ...this.hull } : null; }
  public setHull(v: ShipHull | null): void { this.hull = v ? { ...v } : null; }
  public isAground(): boolean { return this.aground; }
  public isHoled(): boolean { return this.holed; }
  public setAground(v: boolean): void { this.aground = v === true; }
  public setHoled(v: boolean): void {
    // ⭐ The water that came in before the hole (or before it was patched)
    // came in at the old rate: integrate up to now first (P19).
    this.integrateBilge(WorldClockApi.getNow().rawValue());
    this.holed = v === true;
  }

  /* ───────────── the hull clock and the bilge (harbors P19, B4) ───────────── */

  // ⭐ Her bilge's litres and stamp are `BilgeMixin`'s (review 1 — the
  // boat's and hers are one substrate); where it comes in is hers below.

  /**
   * ⭐ Her hull's band (P19) — her warren's shell, on the house's clock and
   * the house's rate: `sound · weathered · worn · shabby · dilapidated`.
   * Read live, so `maintain` aboard makes her sound at once.
   */
  public async hullBand(): Promise<string> {
    const w = await this.standWarren();
    return w === null ? 'sound' : w.conditionBand();
  }

  /** ⭐ What is coming in now, L/s (P19): her band's rate by her length, and a hole's. */
  public async leakLps(): Promise<number> {
    return this.leakLpsFor(await this.hullBand());
  }

  /** The leak a hull of her length takes in a given band, L/s (with her hole, if holed). */
  public leakLpsFor(band: string): number {
    const length = this.hull?.lengthM ?? 30;
    const perM = shipSetting(`ship.leak.${band}`, LEAK_LPS_PER_M[band] ?? 0);
    const hole = this.holed ? shipSetting('ship.leak.holed', HOLED_LPS_PER_M) : 0;
    return length * (perM + hole);
  }

  /** Her hull's depth, keel to deck, m — the measured `depthM`, else twice her draft. */
  public hullDepthM(): number {
    const h = this.hull;
    if (h?.depthM !== undefined && h.depthM > 0) return h.depthM;
    return 2 * (h?.draftM ?? 1.2);
  }

  /** What her hull holds to the deck, L — past it, she has no more to give. */
  public override bilgeCapacityL(): number {
    const h = this.hull ?? { draftM: 1.2, beamM: 6, lengthM: 30 };
    return h.lengthM * h.beamM * BLOCK * this.hullDepthM() * 1000;
  }

  /** Litres in her bilge as last reconciled (sync — a reading reconciles first). */
  public bilgeNowL(): number {
    return this.bilgeL;
  }

  /** The water's height above her keel as last reconciled, m. */
  public bilgeHeightNowM(): number {
    const h = this.hull ?? { draftM: 1.2, beamM: 6, lengthM: 30 };
    return this.bilgeL / (h.lengthM * h.beamM * BLOCK * 1000);
  }

  /**
   * ⭐ Bring her bilge up to now (P19): the leak integrated over her shell's
   * LINE since the bilge's stamp — band by band, never sampled, so a long
   * absence fills her at every rate she weathered through. Her warren asks
   * this before it reconciles or restores her shell (`ShipWarren`), so the
   * stamp never falls behind the shell's. Returns her litres.
   */
  public async reconcileBilge(): Promise<number> {
    const w = await this.standWarren();
    if (w !== null) w.reconcileShell(); // integrates the bilge first
    else this.integrateBilge(WorldClockApi.getNow().rawValue());
    await this.noteFlood();
    return this.bilgeL;
  }

  /**
   * The integral itself, sync — `BilgeMixin`'s, over her own leak. Her
   * warren calls it; a first stamp is kept at once.
   */
  public override integrateBilge(nowS: number): void {
    const fresh = this.bilgeStamp <= 0;
    super.integrateBilge(nowS);
    if (fresh) this.persistMooring();
  }

  /**
   * ⭐ What came in through her hull between two moments (`BilgeMixin`'s
   * hook), over the standing warren's shell line — band by band, never
   * sampled. With no warren standing she cannot know her band (`null`: the
   * stamp stays where it was and the next reconcile covers the gap) —
   * except an authored ship whose rooms have not stood yet, whose shell has
   * never been read and is as it was authored: sound.
   */
  public override leakedBetween(from: number, nowS: number): number | null {
    const w = this._warren !== null && !this._warren.isDestroyed() ? this._warren : null;
    if (w === null && this.isOfKind()) return null;
    if (w === null) return this.leakLpsFor('sound') * (nowS - from);
    let litres = 0;
    const line = w.shellTrajectory();
    const k = line.perSecond;
    const at = (t: number): number =>
      line.stampS <= 0 || !(k > 0)
        ? line.condition
        : Math.min(1, Math.max(0, line.condition - k * (t - line.stampS)));
    // Where each band begins on the line, inside the span.
    const cuts = [from, nowS];
    if (line.stampS > 0 && k > 0) {
      for (const [floor] of w.bandFloors()) {
        if (floor <= 0) continue;
        const t = line.stampS + (line.condition - floor) / k;
        if (t > from && t < nowS) cuts.push(t);
      }
    }
    cuts.sort((a, b) => a - b);
    for (let i = 0; i + 1 < cuts.length; i += 1) {
      const a = cuts[i]!;
      const b = cuts[i + 1]!;
      if (!(b > a)) continue;
      litres += this.leakLpsFor(w.bandFor(at((a + b) / 2))) * (b - a);
    }
    return litres;
  }

  /**
   * ⭐ Pump her (P19): up to `litres` out of her bilge and over the side —
   * the bilge well's lift. Returns what came out; refuses nothing (an
   * empty bilge gives nothing back).
   */
  public async pumpOut(litres: number): Promise<number> {
    await this.reconcileBilge();
    const moved = this.takeBilge(litres);
    if (!(moved > 0)) return 0;
    this.persistMooring();
    await this.noteFlood();
    return moved;
  }

  /**
   * ⭐ Stage her bilge (harbors P25): `litres` in her as of `stampS` — the
   * staged twin of a bilge that filled there. A test world's staging only.
   */
  @CallSecurity(SecurityPolicies.FromModule('/platform/idea/api/TestHarnessLogic#TestHarnessLogic'))
  public stageBilge(litres: number, stampS: number): void {
    this.resetBilge(litres, stampS);
    // A staged bilge is a fresh start: she is afloat with that much in her.
    this.settled = false;
    this.persistMooring();
  }

  /** ⭐ Her bilge now (P19), reconciled — what a sounding reads. */
  public async bilgeState(): Promise<BilgeState> {
    await this.reconcileBilge();
    const band = await this.hullBand();
    return {
      litres: this.bilgeL,
      heightM: this.bilgeHeightNowM(),
      depthM: this.hullDepthM(),
      leakLps: this.leakLpsFor(band),
      band,
    };
  }

  /**
   * ⭐ Her bilge in words (P19), as a sounding finds it — banded by the
   * reader's seamanship: everybody hears how deep and whether it is
   * rising; a novice how fast; an expert whether one pump would gain on
   * it. Never a number (the reading adds the bracketed figure).
   */
  public async bilgeWords(band: CompetenceBandName): Promise<string> {
    const st = await this.bilgeState();
    const h = st.heightM;
    const level =
      st.litres < 5
        ? 'Her well is dry.'
        : h < 0.05
          ? 'There is a little water sloshing at the bottom of her well.'
          : h < 0.15
            ? "There is a hand's depth of water in her bilge."
            : h < 0.5
              ? 'There is water knee-deep in her bilge.'
              : h < 1
                ? 'There is water waist-deep in her bilge.'
                : st.heightM < st.depthM * 0.9
                  ? 'Her bilge is deep in water — deeper than a man could stand in.'
                  : 'She is full of water almost to her deck.';
    if (!(st.leakLps > 0)) return `${level} It is not rising.`;
    const rank = CompetenceBand.rank(band);
    if (rank < CompetenceBand.rank('novice')) return `${level} It is rising.`;
    const rate =
      st.leakLps < 0.05
        ? 'It is rising slowly — she weeps at her seams.'
        : st.leakLps < 0.3
          ? 'It is rising steadily; she is making water at her seams.'
          : 'It is rising fast.';
    if (rank < CompetenceBand.rank('expert')) return `${level} ${rate}`;
    const pump =
      st.leakLps < ONE_PUMP_LPS
        ? 'One pump kept at the brake would gain on it.'
        : 'One pump at the brake would not keep up with it.';
    return `${level} ${rate} ${pump}`;
  }

  /* ───────────── flooding, settling, sinking, the wreck (harbors P20, B5) ───────────── */

  /**
   * ⭐ She is settling (P20): the water is at her deck and she will not float
   * much longer. `null` while she floats. `sinceRealMs` is the WALL clock —
   * the backstop is real seconds, whatever the world's pace.
   */
  protected settling: { sinceS: number; sinceRealMs: number } | null = null;
  /** ⭐ On the bottom of a berth too shallow to take her (P20): settled, not sunk — pumpable. */
  protected settled = false;
  /** ⭐ Gone down (P20): when, and the depth of water she lies in. Her rooms are the wreck. */
  protected wreck: { atS: number; depthM: number } | null = null;

  /** Runtime: acts each person aboard has made since she began to settle, by stuffId. */
  private _acts = new Map<string, number>();
  private _actsSub: Subscription<CommandDispatchedPayload> | null = null;
  private _backstop: ScheduleHandle | null = null;
  private _sinking = false;

  public isSunk(): boolean {
    return this.wreck !== null;
  }

  public isSettled(): boolean {
    return this.settled;
  }

  public isSettling(): boolean {
    return this.settling !== null;
  }

  public getWreck(): { atS: number; depthM: number } | null {
    return this.wreck ? { ...this.wreck } : null;
  }

  /**
   * ⭐ The water's height above her keel, m (P20): her bilge spread over her
   * hull's box (`L × B × 0.7`); sunk, the sea's whole depth over her.
   */
  public floodHeightM(): number {
    if (this.wreck !== null) return this.wreck.depthM;
    return this.bilgeHeightNowM();
  }

  /**
   * ⭐ How high a room's floor stands above her keel, m: what the room says
   * (`ownFloorM`), else her floorplan's entry for it, else her deck at her
   * hull's depth and any other room on her keel.
   */
  public floorMOf(room: Stuff, ownFloorM: number | null = null): number {
    if (ownFloorM !== null && Number.isFinite(ownFloorM)) return ownFloorM;
    const w = this._warren !== null && !this._warren.isDestroyed() ? this._warren : null;
    if (w !== null) {
      for (const spec of w.getFloorplan()) {
        if (w.roomForLeaf(spec.leaf) !== room) continue;
        const f = Number(w.floorplanEntryOf(spec.leaf ?? '')?.floorM);
        if (Number.isFinite(f)) return f;
        if (spec.entry) return this.hullDepthM();
        return 0;
      }
    }
    const entrance = this.getEntrance();
    const path = room.getTemplatePath();
    if (entrance && path === entrance) return this.hullDepthM();
    return 0;
  }

  /**
   * ⭐ How deep the water stands over a room's floor, m (P20) — her rooms
   * flood from the lowest up by this arithmetic alone. ≤ 0 is dry.
   */
  public floodDepthAt(room: Stuff, ownFloorM: number | null = null): number {
    return this.floodHeightM() - this.floorMOf(room, ownFloorM);
  }

  /**
   * ⭐ How deep the water is under her where she lies, m (P20): a kept
   * berth's own depth (a mud berth, the harbor's fact), else her frame's
   * read of the bottom; `null` when nobody can say.
   */
  public async bottomDepthM(): Promise<number | null> {
    if (this.moored && this.berth) {
      const d = (await this.keeperAt(this.berth))?.berthDepthM();
      if (d !== null && d !== undefined && Number.isFinite(d)) return d;
    }
    const frame = await this.liveFrame();
    if (frame === null) return null;
    const line = this.getLinePosition();
    const chart = this.getExpansePosition();
    const pos: FramePos | null =
      line !== null ? { frame: 'line', at: line } : chart !== null ? { frame: 'chart', at: chart } : null;
    if (pos === null) return null;
    try {
      return await frame.depthUnder(pos, WorldClockApi.getNow().rawValue());
    } catch {
      return null;
    }
  }

  /**
   * ⭐ Where the water in her has got to, decided (P20). Asked after every
   * bilge reconcile, every stroke of the pump, at stand-up and when her
   * flood watch comes due. Nothing is rolled: the bilge and the depth
   * under her decide.
   *
   * - **Settled** at a berth: she floats again once her draft with the
   *   water in her clears the bottom (pumped out).
   * - **Settling**: pumped back below her deck, she holds — the window
   *   closes and she is told so.
   * - **Full to her deck**: in water shallower than her hull she settles
   *   onto the bottom; otherwise she begins to settle (the window).
   * - **Not full**: the watch is armed for when she will be.
   */
  public async noteFlood(): Promise<void> {
    if (this.wreck !== null || this._sinking || this.isDestroyed()) return;
    const full = this.bilgeL >= this.bilgeCapacityL() - 1e-6;
    if (this.settled) {
      // ⭐ She floats again once her draft with the water in her clears the
      // bottom — and at a berth that dries to her keel anyway (the mud she
      // always lay on at low water) once she is pumped down to her floors.
      const bottom = await this.bottomDepthM();
      const h = this.hull ?? { draftM: 1.2 };
      const clear = Math.max(bottom ?? 0, h.draftM + REFLOAT_BILGE_M);
      if (bottom !== null && h.draftM + this.bilgeHeightNowM() < clear) {
        this.settled = false;
        this.persistMooring();
        await this.tellAboard('She lifts off the mud and floats again.');
      }
      if (!this.settled) this.armFloodWatch();
      return;
    }
    if (this.settling !== null) {
      if (!full) await this.endSettling();
      return;
    }
    if (!full) {
      this.armFloodWatch();
      return;
    }
    const bottom = await this.bottomDepthM();
    if (bottom !== null && bottom < this.hullDepthM()) {
      this.settled = true;
      this.persistMooring();
      await this.tellAboard('She has settled onto the mud, the water standing in her to her deck.');
      return;
    }
    await this.beginSettling();
  }

  /**
   * ⭐ Her flood watch (P20): one game-time call when the water will reach
   * her deck at the leak she has now — or at her shell's next band, when
   * that comes first and the leak changes. A watch that fires early just
   * arms the next one; nothing is sampled.
   */
  private armFloodWatch(): void {
    try {
      WorldClockApi.cancelByTag('ship.flood', this as unknown as Stuff);
    } catch {
      return; // no clock (a unit world)
    }
    if (this.wreck !== null || this.settled || this.settling !== null || this.isDestroyed()) return;
    const w = this._warren !== null && !this._warren.isDestroyed() ? this._warren : null;
    const band = w === null ? 'sound' : w.conditionBand();
    const lps = this.leakLpsFor(band);
    if (!(lps > 0)) return;
    const nowS = WorldClockApi.getNow().rawValue();
    let dueS = (this.bilgeCapacityL() - this.bilgeL) / lps;
    if (w !== null) {
      const line = w.shellTrajectory();
      if (line.stampS > 0 && line.perSecond > 0) {
        const c = line.condition - line.perSecond * (nowS - line.stampS);
        for (const [floor] of w.bandFloors()) {
          if (floor <= 0 || floor >= c) continue;
          dueS = Math.min(dueS, (c - floor) / line.perSecond + 1);
          break;
        }
      }
    }
    try {
      WorldClockApi.at(
        Quantity.of(nowS + Math.max(1, dueS), 's'),
        () => {
          void this.reconcileBilge().catch((err) => console.warn('Ship: the flood watch failed:', err));
        },
        { host: this as unknown as Stuff, tag: 'ship.flood' },
      );
    } catch (err) {
      console.warn(`Ship: ${this.getDurableHandle()} could not arm her flood watch:`, err);
    }
  }

  /**
   * ⭐ She begins to settle (P20): everyone aboard is told once, and the
   * window opens — **per person**, sized in acts (*no window shall be
   * shorter than the act that answers it*): each person aboard, or who
   * comes aboard while she settles, has `ship.settlingActs` commands of
   * their own; she goes down when everyone still aboard has used theirs,
   * or after `ship.settlingRealS` real seconds (the backstop an idle body
   * or an empty ship meets). Nobody aboard: she goes at once.
   */
  private async beginSettling(): Promise<void> {
    this.settling = { sinceS: WorldClockApi.getNow().rawValue(), sinceRealMs: Date.now() };
    this._acts.clear();
    this.persistMooring();
    await this.tellAboard('She is settling. The water is at her deck, and she will not float much longer.');
    if ((await this.peopleAboard()).length === 0) {
      await this.sink();
      return;
    }
    this.listen();
  }

  /** The window, back after a restart: the backstop's remainder, the acts afresh. */
  private async resumeSettling(): Promise<void> {
    if (this.settling === null) return;
    if ((await this.peopleAboard()).length === 0) {
      await this.sink();
      return;
    }
    this.listen();
  }

  /** Pumped back below her deck in time: the window closes. */
  private async endSettling(): Promise<void> {
    this.settling = null;
    this.stopListening();
    this.persistMooring();
    await this.tellAboard('The water is below her deck again; she is holding.');
    this.armFloodWatch();
  }

  /** Start counting acts and the backstop's clock. */
  private listen(): void {
    if (this._actsSub === null) {
      try {
        this._actsSub = EventApi.on<CommandDispatchedPayload>(CommandDispatchedEvent.KIND, (p) => {
          void this.countAct(p).catch((err) => console.warn('Ship: an act was not counted:', err));
        });
      } catch (err) {
        // ⚠ The bus refused the subscription: the window is the backstop alone.
        console.warn(`Ship: ${this.getDurableHandle()} cannot count acts aboard; the backstop alone closes her window:`, err);
      }
    }
    if (this._backstop === null && this.settling !== null) {
      const leftMs = Math.max(0, settlingRealMs() - (Date.now() - this.settling.sinceRealMs));
      this._backstop = ScheduleApi.schedule(leftMs + 50, () => {
        this._backstop = null;
        void this.checkSettling().catch((err) => console.warn('Ship: the settling backstop failed:', err));
      });
    }
  }

  private stopListening(): void {
    try {
      this._actsSub?.unsubscribe();
    } catch {
      // gone with the bus
    }
    this._actsSub = null;
    if (this._backstop !== null) ScheduleApi.cancel(this._backstop);
    this._backstop = null;
    this._acts.clear();
  }

  /**
   * ⭐ One command dispatched, somewhere (P20): counted only when its giver
   * stands in one of her rooms. Anybody else's command is nothing to her.
   */
  public async countAct(p: CommandDispatchedPayload): Promise<void> {
    if (this.settling === null) return;
    const giver = StuffApi.findById(p.subjectId);
    if (giver === undefined || !(await this.isAboard(giver))) return;
    this._acts.set(p.subjectId, (this._acts.get(p.subjectId) ?? 0) + 1);
    await this.checkSettling();
  }

  /** Somebody left one of her rooms while she settles: they are out of the count. */
  public noteLeft(): void {
    if (this.settling === null) return;
    void this.checkSettling().catch((err) => console.warn('Ship: the settling window was not checked:', err));
  }

  /**
   * ⭐ Has her window closed? (P20) — everyone still aboard has used their
   * acts, nobody is aboard, or the backstop's real seconds are gone.
   */
  public async checkSettling(nowRealMs: number = Date.now()): Promise<boolean> {
    const window = this.settling;
    if (window === null || this.wreck !== null) return false;
    const people = await this.peopleAboard();
    const acts = settlingActs();
    const used = people.every((who) => (this._acts.get(who.stuffId) ?? 0) >= acts);
    const late = nowRealMs - window.sinceRealMs >= settlingRealMs();
    if (!used && !late) return false;
    if (this.settling === null || this.wreck !== null) return false; // closed meanwhile
    await this.sink();
    return true;
  }

  /** The interactive people standing in her rooms now. */
  private async peopleAboard(): Promise<Stuff[]> {
    return (await this.aboard()).filter((x) => MixinApi.isHasInteractive(x));
  }

  /** Does `who` stand in one of her rooms? */
  private async isAboard(who: Stuff): Promise<boolean> {
    const room = MixinApi.isContainable(who) ? who.getContainer() : null;
    if (room === null) return false;
    return (await this.liveMembers()).includes(room as unknown as Stuff & Container);
  }

  /**
   * ⭐ She goes down (P20). Where she lies, with everything in her: her
   * rooms are the wreck, at the bottom's depth; whoever is still aboard is
   * in a room under the sea; her title, her register entry and her cargo
   * are untouched. The water keeps a surface over her and a way down to
   * her (`Frame.stopOver` — the water pack wires it).
   */
  public async sink(): Promise<void> {
    if (this.wreck !== null || this._sinking) return;
    this._sinking = true;
    try {
      this.stopListening();
      this.settling = null;
      try {
        WorldClockApi.cancelByTag('ship.flood', this as unknown as Stuff);
      } catch {
        // no clock
      }
      if (this.getCourse() !== null) await this.anchorHere();
      if (this.moored) await this.castOffForGood();
      const bottom = (await this.bottomDepthM()) ?? this.hullDepthM() * 4;
      this.wreck = { atS: WorldClockApi.getNow().rawValue(), depthM: Math.max(bottom, this.hullDepthM()) };
      this.bilgeL = this.bilgeCapacityL();
      this.persistMooring();
      await this.tellAboard('She goes down under you. The sea comes in over her deck and closes over everything.');
      await this.wireWreck();
    } finally {
      this._sinking = false;
    }
  }

  /**
   * Made fast where she went down: the lines part and the way aboard comes
   * off the landing (the register's entry is untouched — she is still
   * hers, and still where she lies).
   */
  private async castOffForGood(): Promise<void> {
    const keeper = await this.keeperAt(this.berth);
    await this.bringLinesIn();
    this.removeBerth();
    this.moored = false;
    this.berth = null;
    if (keeper !== null) await keeper.release(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
  }

  /** ⭐ The water over her and the way down to her — asked of her frame; again at every stand-up. */
  private async wireWreck(): Promise<void> {
    if (this.wreck === null) return;
    try {
      await (await this.liveFrame())?.stopOver(this as never);
    } catch (err) {
      console.warn(`Ship: ${this.getDurableHandle()}'s wreck was not wired to the water over her:`, err);
    }
  }

  /** Stood up (restored or seeded): the wreck re-wired, the window resumed, or the flood read. */
  private async afterStanding(): Promise<void> {
    try {
      if (this.wreck !== null) await this.wireWreck();
      else if (this.settling !== null) await this.resumeSettling();
      else await this.reconcileBilge();
    } catch (err) {
      console.warn(`Ship: ${this.getDurableHandle()} could not read the water in her:`, err);
    }
  }

  /**
   * ⭐ Credit those handling her with seamanship (P24): whoever aboard may
   * take her helm — her master, her charterer — for mooring, casting off,
   * and bringing her to the node she was laid for.
   */
  private async creditHands(difficulty: Difficulty): Promise<void> {
    try {
      for (const who of await this.aboard()) {
        if (!this.mayBeSteeredBy(who) || !MixinApi.isAdvancing(who)) continue;
        await who.creditDeed({ discipline: 'seamanship', difficulty, outcome: 'success' });
      }
    } catch (err) {
      console.warn(`Ship: seamanship was not credited aboard ${this.getDurableHandle()}:`, err);
    }
  }

  /** An observer's eye height on deck, meters. */
  protected deckHeightM = 0;
  /** An observer's eye height at the masthead, meters; `null` for none. */
  protected mastheadHeightM: number | null = null;
  /** The Business row whose roster mans her; `null` for none. */
  protected house: string | null = null;

  public getDeckHeightM(): number { return this.deckHeightM; }
  public setDeckHeightM(value: number): void { this.deckHeightM = Number(value) || 0; }

  public getMastheadHeightM(): number | null { return this.mastheadHeightM; }
  public setMastheadHeightM(value: number | null): void {
    this.mastheadHeightM = value === null || value === undefined ? null : Number(value);
  }

  public getHouse(): string | null { return this.house; }
  public setHouse(value: string | null): void { this.house = value ?? null; }

  /** Her height as a target — the truck. */
  override getTargetHeightM(): number {
    return this.getHeightM();
  }

  /**
   * How high `observer`'s eye is, aboard her.
   *
   * ⭐⭐ The lookout is a SEAT (maritime D13): the masthead height is
   * granted to whoever holds the house's `lookout` position **on shift**,
   * read off the shipped roster, and the deck height to everyone else. So
   * appointing somebody lookout makes her see further with nothing about
   * her having changed.
   */
  override sightHeightFor(observer: unknown): number {
    const deck = this.deckHeightM;
    const house = this.house;
    if (house === null || this.mastheadHeightM === null) return deck;
    const who = observer as Stuff;
    if (!who || !MixinApi.isEmployed(who)) return deck;
    const job = who.getEmployment(house);
    if (job?.positionKey === LOOKOUT_POSITION && job.status === 'on-shift') {
      return this.mastheadHeightM;
    }
    return deck;
  }

  /* ───────────── who answers for her, and what she owes (harbors P12, P13) ───────────── */

  /** ⭐ What she has been billed and not yet paid (P13), in the order billed. */
  protected owed: ShipBill[] = [];

  /** Her unpaid bills, copies. */
  public getOwed(): ShipBill[] {
    return this.owed.map((b) => ({ ...b }));
  }

  /** ⭐ Bill her (P13): carried until it is paid at a harbor office. */
  public owe(bill: ShipBill): void {
    const amountMinor = Math.ceil(Number(bill.amountMinor));
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || typeof bill.to !== 'string' || bill.to === '') {
      throw new Error(`Ship.owe: a bill wants a venue and a positive amount (got ${JSON.stringify(bill)})`);
    }
    const line: ShipBill = { to: bill.to, amountMinor, reason: String(bill.reason ?? '') };
    if (typeof bill.by === 'string' && bill.by !== '') line.by = bill.by;
    this.owed.push(line);
    this.persistMooring();
  }

  /** One of her bills has been paid: the first that matches comes off. `false` when none matched. */
  public settleOwed(bill: ShipBill): boolean {
    const i = this.owed.findIndex((b) => b.to === bill.to && b.amountMinor === bill.amountMinor && b.reason === bill.reason);
    if (i < 0) return false;
    this.owed.splice(i, 1);
    this.persistMooring();
    return true;
  }

  /** What her unpaid bills come to, minor units. */
  public owedMinor(): number {
    return this.owed.reduce((n, b) => n + b.amountMinor, 0);
  }

  /**
   * ⭐ Does `who` answer for her (P12, P13, P23) — the one whose business
   * her dues and bills are? Whoever holds her company's `master` seat, her
   * charterer while the charter runs, and a charterer whose days she still
   * carries unpaid (the charter ended as she berthed; clearing her is still
   * theirs), and her managing owner by her register (B2) — a player who
   * holds the most of her shares.
   */
  public answersFor(who: Stuff): boolean {
    if (this.holdsMasterSeat(who) || this.isChartererOf(who) || this.isManagingOwner(who)) return true;
    const id = idOf(who);
    return id !== '' && this.owed.some((b) => b.by === id);
  }

  /**
   * ⭐ May `who` take her helm (P12)? Her charterer while the charter runs,
   * or whoever holds her company's `master` seat — nobody else. (Crews and
   * mates at the helm are a later seam: more seats read here.)
   */
  public override mayBeSteeredBy(who: Stuff): boolean {
    return this.isChartererOf(who) || this.holdsMasterSeat(who);
  }

  /** Does `who` hold her company's `master` seat? */
  private holdsMasterSeat(who: Stuff): boolean {
    const house = this.house;
    if (house === null || !MixinApi.isEmployed(who)) return false;
    return who.getEmployment(house)?.positionKey === MASTER_POSITION;
  }

  /* ───────────── her register, her owners, her flag (harbors P12, P14, P16) ───────────── */

  /** Runtime: her managing owner as her register last said — read sync by `answersFor`. */
  private _managingOwner: ShareHolder | null = null;

  /** Is `who` her managing owner by her register (a player holding the most of her shares)? */
  public isManagingOwner(who: Stuff): boolean {
    const owner = this._managingOwner;
    const id = idOf(who);
    return owner !== null && owner.kind === 'player' && id !== '' && owner.path === id;
  }

  /** ⭐ Read her register again — after she is entered, after her shares change hands, as she stands up. */
  public async refreshRegistry(): Promise<void> {
    const handle = this.getDurableHandle();
    if (!handle) return;
    try {
      this._managingOwner = await ShipRegisterApi.managingOwnerOf(handle);
    } catch (err) {
      console.warn(`Ship: ${handle}'s register could not be read:`, err);
    }
  }

  /**
   * ⭐ The flag she flies (P16): the flag on her entrance room's flagstaff,
   * or `null`. Only a claim — her flag STATE is her register's, and false
   * colors are found out by reading it.
   */
  public flownFlag(): Flag | null {
    const deck = this.entranceNow();
    if (deck === null) return null;
    for (const x of deck.getContents()) {
      if (x instanceof Flagstaff) {
        const flag = x.flying();
        if (flag !== null) return flag;
      }
    }
    return null;
  }

  /** Her entrance room if it stands now (no stand-up: the look is sync). */
  private entranceNow(): (Stuff & Container) | null {
    if (this.isOfKind()) {
      const room = this._warren?.entryRoom() ?? null;
      return room !== null && MixinApi.isContainer(room) ? room : null;
    }
    const entrance = this.getEntrance();
    const room = entrance ? StuffApi.findByDurableHandle<Stuff>(entrance) : null;
    return room !== null && MixinApi.isContainer(room) ? room : null;
  }

  static markupAugmenters: MarkupAugmenter[] = [flagAugmenter];

  /**
   * ⭐ Commission her (P17): a ship of a kind just bought, keyed by her
   * serial, is named, given her own company, entered in `flag`'s register
   * in `buyer`'s name (all sixty-four shares), keyed (the gangway locked,
   * the key to the buyer), her buyer made her master (a sole owner holds
   * all three — owner, managing owner, master), and brought alongside
   * `landingPath`. Returns what the buyer is told.
   *
   * @throws when she is not a ship of a kind, or her register refuses her
   *   — the caller asked the register about her name before taking money,
   *   so a refusal here is a race or a caller error, said loudly.
   */
  public async commission(buyer: Stuff, name: string, landingPath: string, flag: string): Promise<string> {
    const handle = this.getDurableHandle();
    const serial = this.getPersistenceKey();
    if (!this.isOfKind() || !handle || !serial) {
      throw new Error(`Ship.commission: only a ship of a kind, keyed by her serial, is commissioned (got ${handle ?? '?'})`);
    }
    const owner = buyer.getIdentityPath();
    if (!owner) throw new Error('Ship.commission: her buyer has no durable identity to hold her shares');
    const named = name.trim().replace(/^the\s+/i, '');
    this.setName(`the ${named}`);
    this.setShortDescription(named);
    const words = named.toLowerCase().split(/\s+/).filter((w) => w.length > 0);
    this.setKeywords([...new Set([named.toLowerCase(), ...words, ...this.getKeywords()])]);

    const company = await this.mintCompany(named);
    const refused = await ShipRegisterApi.enter(flag, {
      name: named,
      kind: this.getTemplatePath() ?? '',
      key: handle,
      shares: [{ holder: { kind: 'player', path: owner, name: buyer.getPresentation() }, shares: 64 }],
      house: company?.getIdentityPath() ?? '',
      lies: null,
    });
    if (refused !== null) throw new Error(`Ship.commission: the register refused ${named} — ${refused}`);
    await this.refreshRegistry();

    // ⭐ Her gangway is a door with a key (P9): locked, the key with her owner.
    const keyway = BoundaryApi.mintKeyway();
    this.gangwayKeyway = keyway;
    this.gangwayLocked = true;
    try {
      await new Lock(keyway, 'pin-tumbler').issueKeyTo(buyer);
    } catch (err) {
      console.warn(`Ship.commission: ${named}'s key was not issued:`, err);
    }
    // A sole owner is her master too: whoever her register names appoints, and she names herself.
    if (company !== null && MixinApi.isOrganization(company)) {
      const appointed = await company.appoint(buyer, MASTER_POSITION);
      if (appointed === null) console.warn(`Ship.commission: ${buyer.getPresentation()} was not made master of ${named}`);
    }

    // She lies where she was built: on the frame at the landing, made fast to it.
    const lying = await this.putDownAt(landingPath);
    await PersistableApi.capture(this as unknown as Stuff);
    const polity = GovernmentApi.getGovernment(flag)?.name ?? flag;
    return `She is entered in the register of ${polity} as the ${named}, all sixty-four shares in your name, and you are her master. Her gangway is locked; the key is yours. ${lying}`.trim();
  }

  /** ⭐ Put her on the frame where `landingPath` is sited and bring her alongside it. */
  private async putDownAt(landingPath: string): Promise<string> {
    const landing = await StuffApi.singleton<Stuff>(landingPath).catch(() => null);
    if (landing === null) return 'There is nowhere there for her to lie.';
    if (MixinApi.isFrameSited(landing)) {
      const site = landing.getFrameSite();
      const pos = await landing.sitePosition();
      if (site !== null && pos !== null) {
        this.placeAt(pos, WorldClockApi.getNow().rawValue(), site.frame);
        (await this.liveFrame())?.adopt(this as never);
      }
    }
    return this.comeAlongside(landingPath);
  }

  /**
   * ⭐ Her own company (P2): a Business minted from her kind's seed row
   * (`house:`) at `<seed>/<serial>` — the drilling outfit's precedent — whose
   * appointing authority is her register (`kind: register`). Stood up again
   * from the same seed when she loads and it does not stand (a company keeps
   * no record of its own: its seats are the seed's, its holders' records
   * their own). `null`, loudly, when she has no seed to mint from.
   */
  private async mintCompany(named?: string): Promise<Stuff | null> {
    const serial = this.getPersistenceKey();
    const handle = this.getDurableHandle();
    if (!this.isOfKind() || !serial || !handle) return null;
    const current = this.house ?? '';
    const seed = current.endsWith(`/${serial}`) ? current.slice(0, -(serial.length + 1)) : current;
    if (seed === '') {
      console.warn(`Ship: ${handle} names no company row to mint hers from`);
      return null;
    }
    const identity = `${seed}/${serial}`;
    const live = StuffApi.findByTemplatePath<Stuff>(identity);
    if (live !== undefined) {
      this.house = identity;
      return live;
    }
    const label = named ?? this.getName().replace(/^the\s+/i, '');
    try {
      const company = await StuffApi.clone<Stuff>(seed, undefined, {
        // identity-keyed-by: referenced — her register entry's `house`, her
        // own `house` field, and the employment records of whoever holds her
        // seats name it; its seats are the seed's.
        asIdentityPath: identity,
        dataOverlay: {
          name: `the ${label}'s company`,
          appointingAuthority: { kind: 'register', ship: handle },
        },
      });
      this.house = identity;
      return company;
    } catch (err) {
      console.warn(`Ship: ${handle}'s company '${identity}' could not be minted from '${seed}':`, err);
      return null;
    }
  }

  /** ⭐ Tell her register where she lies (a ship of a kind) — what re-wires her way after a restart (Risk 6). */
  private noteLies(landing: string | null): void {
    if (!this.isOfKind()) return;
    const handle = this.getDurableHandle();
    if (!handle) return;
    const lies = landing === null ? null : { landing, sinceS: WorldClockApi.getNow().rawValue() };
    void ShipRegisterApi.noteLies(handle, lies).catch((err) =>
      console.warn(`Ship: ${handle} could not tell her register where she lies:`, err),
    );
  }

  /* ───────────── the charter (harbors P23) ───────────── */

  /** ⭐ The charter running now, or `null` (P23). */
  protected charter: ShipCharter | null = null;

  /** The charter running now, a copy — `null` when she is not chartered. */
  public getCharter(): ShipCharter | null {
    return this.charter ? { ...this.charter } : null;
  }

  /** Is `who` her charterer now? */
  public isChartererOf(who: Stuff): boolean {
    const id = idOf(who);
    return this.charter !== null && id !== '' && this.charter.charterer === id;
  }

  /**
   * ⭐ Charter her to `who` at `ratePerDay`, the days paid to `payTo` (P23)
   * — or why not, in words: she has a charterer already, or a master of
   * her own is aboard on shift (she is not the line's to let while she is
   * commanded). Written on her and kept.
   *
   * @throws when the book posts a rate with nowhere to pay it (an
   *   authoring error, never a refusal).
   */
  public async charterTo(who: Stuff, ratePerDay: number, payTo: string | null): Promise<string | null> {
    const id = idOf(who);
    if (id === '') return 'Nobody can charter her by that name.';
    if (this.charter !== null) {
      return this.charter.charterer === id
        ? `${this.getPresentation()} is yours already, until she next berths.`
        : `${this.getPresentation()} is under charter to somebody else until she next berths.`;
    }
    // (A sunken ship is refused here too once she can sink — harbors B5.)
    if (await this.masterAboardOnShift()) {
      return `Her master is aboard and on watch; she is not to be chartered while her own master has her.`;
    }
    const rate = Math.max(0, Number(ratePerDay) || 0);
    if (rate > 0 && (typeof payTo !== 'string' || payTo === '')) {
      throw new Error(`Ship.charterTo: a charter at ${rate} a day names nowhere to pay it (the book's payTo)`);
    }
    this.charter = { charterer: id, sinceS: WorldClockApi.getNow().rawValue(), ratePerDay: rate, payTo: payTo ?? '' };
    this.persistMooring();
    return null;
  }

  /** Is anybody who holds her `master` seat aboard her, on shift? */
  private async masterAboardOnShift(): Promise<boolean> {
    const house = this.house;
    if (house === null) return false;
    for (const who of await this.aboard()) {
      if (!MixinApi.isEmployed(who)) continue;
      if (who.getEmployment(house)?.positionKey !== MASTER_POSITION) continue;
      if (who.isOnShiftFor(house)) return true;
    }
    return false;
  }

  /**
   * ⭐ The charter ends as she makes fast at a kept quay (P23): the world's
   * days it lasted — a day begun is a day owed — at its rate are billed to
   * her, owed by the charterer, paid at the harbor office. Returns what the
   * charterer is told, or `''` when she was not chartered.
   */
  private endCharter(): string {
    const c = this.charter;
    if (c === null) return '';
    this.charter = null;
    const nowS = WorldClockApi.getNow().rawValue();
    const days = Math.max(1, Math.ceil((nowS - c.sinceS) / DAY_S - 1e-9));
    const amount = days * c.ratePerDay;
    const name = this.getPresentation();
    let words: string;
    if (amount > 0) {
      this.owe({ to: c.payTo, amountMinor: amount, reason: `for ${days} day${days === 1 ? '' : 's'}' charter of ${name}`, by: c.charterer });
      words = `The charter of ${name} ends as she makes fast: ${days} day${days === 1 ? '' : 's'} at ${c.ratePerDay} — ${Math.ceil(amount)} owed to the line, paid at the harbor office.`;
    } else {
      this.persistMooring();
      words = `The charter of ${name} ends as she makes fast.`;
    }
    const charterer = StuffApi.findByIdentityPath<Stuff>(c.charterer)[0] ?? null;
    if (charterer !== null && !charterer.isDestroyed() && MixinApi.isSensor(charterer)) {
      try {
        MessageApi.scene(charterer).topic('sense.surroundings').toSelf(Mml.compose`${words}`).send();
      } catch {
        // decoration
      }
    }
    return words;
  }

  /* ───────────── made fast: the berth and her lines (harbors P4–P6) ───────────── */

  /**
   * ⭐ The landing she is made fast at, by path — `null` when she is not.
   * Her way aboard (a `BerthExit` named for her) stands on it while she is.
   */
  protected berth: string | null = null;
  /** Held to the landing by her own lines. */
  protected moored = false;
  /** Her gangway's keyway (P9) — `''` opens for nobody. */
  protected gangwayKeyway = '';
  /** Her gangway's bolt (P9) — `false` refuses nobody. */
  protected gangwayLocked = false;

  /**
   * Runtime: the way aboard she has put on her landing, and the ropes she
   * made fast across (whether each still is, the rope says — {@link fastLines}).
   */
  private berthExit: BerthExit | null = null;
  private madeFast: Rope[] = [];

  /** ⭐ The landing she is made fast at — what her deck's `ashore` leads to first. */
  public getBerth(): string | null {
    return this.moored ? this.berth : null;
  }

  public override isMoored(): boolean {
    return this.moored && this.berth !== null;
  }

  public isGangwayLocked(): boolean { return this.gangwayLocked; }
  /** The bolt thrown or drawn — kept, and told to her way aboard (it answers for her while she sleeps). */
  public setGangwayLocked(v: boolean): void {
    this.gangwayLocked = v === true;
    const exit = this.berthExit;
    if (exit !== null && !exit.isDestroyed()) exit.configureBerth(this as unknown as Stuff & Berthed);
    this.persistMooring();
  }
  public getGangwayKeyway(): string { return this.gangwayKeyway; }
  public setGangwayKeyway(v: string): void { this.gangwayKeyway = typeof v === 'string' ? v : ''; }

  /** The authored half of the mooring (a row's `berth:`), set before she loads. */
  public setBerth(v: string | null): void { this.berth = typeof v === 'string' && v !== '' ? v : null; }
  public setMoored(v: boolean): void { this.moored = v === true; }

  /** The word her way aboard is called by: her name, lowercased, the article dropped. */
  public berthWord(): string {
    return this.getName().replace(/^the\s+/i, '').trim().toLowerCase() || 'ship';
  }

  /**
   * ⭐ The lines aboard her that will hold her (P6, review 1): every ROPE on
   * her deck kept AT her bitts — flaked down `on` a {@link Bollard} there,
   * or tied round one — and long enough to reach. A rope lying loose on her
   * deck is not one of her lines: nobody made it ready (lens 2 — an author's
   * ordinary rope row propped `on: bitts`, or a player's `put rope on
   * bitts`, is a mooring line with no code).
   */
  public async linesAboard(): Promise<Rope[]> {
    const deck = await this.watchRoom();
    if (deck === null) return [];
    const needM = Math.max(MIN_LINE_M, 2 * this.deckHeightM);
    const out: Rope[] = [];
    for (const x of deck.getContents()) {
      if (!(x instanceof Rope) || x.getLengthM() < needM) continue;
      const at = x.getPlacement()?.host ?? x.getAnchor();
      if (at instanceof Bollard && at.getContainer() === (deck as unknown)) out.push(x);
    }
    return out;
  }

  /**
   * ⭐ Her lines fast now (review 1 — moored is a READ over her ropes): the
   * ropes she made fast across whose end is still round a bollard she made
   * it fast round. A rope knows; she only remembers which ones she tied.
   */
  public fastLines(): Rope[] {
    this.madeFast = this.madeFast.filter((r) => !r.isDestroyed() && r.acrossFor() === (this as unknown) && r.acrossTo() instanceof Bollard);
    return this.madeFast;
  }

  /**
   * ⭐ Why a course for `target` cannot end alongside, asked before it is
   * laid (P5) — so the refusal is instant and the voyage never starts.
   * `null` when it can, or when the course is for no landing at all.
   */
  public async mooringRefusal(target: string | null): Promise<string | null> {
    if (target === null || target === '') return null;
    if (!(await this.landingFor(target))) return null;
    return (await this.linesAboard()).length === 0 ? 'She has no lines to make fast.' : null;
  }

  /**
   * ⭐ Why she may not take a course for the landing `landing` now (harbors
   * P5, P7), asked before it is laid so the refusal is instant: no line to
   * make fast with; the berth she lies at has not cleared her; the berth
   * she is coming to has not admitted her (a harbor quay is given by the
   * harbormaster). `null` when she may go.
   */
  public async courseRefusal(landing: string | null, opts: { admit?: boolean } = {}): Promise<string | null> {
    const nowS = WorldClockApi.getNow().rawValue();
    const leaving = this.isMoored() ? await this.keeperAt(this.berth) : null;
    if (leaving !== null) {
      const held = await leaving.clearance(this as unknown as Stuff, nowS);
      if (held !== null) return held;
    }
    if (landing === null || landing === '') return null;
    if ((await this.linesAboard()).length === 0) return 'She has no lines to make fast.';
    if (opts.admit === false) return null;
    const coming = await this.keeperAt(landing);
    return coming === null ? null : coming.admit(this as unknown as Stuff, nowS);
  }

  /**
   * ⭐ She has come up to a node whose landing she may make fast at (A3):
   * a kept quay asks its keeper first — not given the berth, she lies off
   * and is told why (hail, then `course` it again); otherwise she makes
   * fast. The words for whoever is aboard.
   */
  public async arriveAlongside(landing: string): Promise<string> {
    const keeper = await this.keeperAt(landing);
    if (keeper !== null) {
      const no = await keeper.admit(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
      if (no !== null) return `She lies off. ${no}`;
    }
    return this.comeAlongside(landing);
  }

  /** The landing at `path` when somebody keeps a book for it (a harbor quay), else `null`. */
  private async keeperAt(path: string | null): Promise<(Stuff & BerthKeeper) | null> {
    if (path === null || path === '') return null;
    const s = await StuffApi.singleton<Stuff>(path).catch(() => null);
    return s !== null && MixinApi.isBerthKeeper(s) ? s : null;
  }

  /**
   * ⭐ What the bar of `river` says to her draft now (harbors P10): the
   * water over it (the tide's level in it) against her draft as she floats
   * and the margin a master keeps under her keel. Nothing rolled — only the
   * clock and her lading change the answer. `null` when the river has no
   * bar to read.
   */
  public async barClearance(river: Stuff & LineFrame, nowS: number): Promise<BarClearance | null> {
    const water = await river.barWater(nowS);
    if (water === null) return null;
    this.weighedKg = await this.cargoKg();
    const wantsM = this.hullNow().draftM + UNDER_KEEL_M;
    return {
      clearanceM: water.depthM - wantsM,
      depthM: water.depthM,
      wantsM,
      nextHighS: water.tide?.nextHighS ?? null,
    };
  }

  /**
   * ⭐ The bar's refusal in a pilot's words (harbors P10) — what is over it,
   * what she wants, and when the flood is — or `null` when she can cross now.
   */
  public async barRefusal(river: Stuff & LineFrame, nowS: number): Promise<string | null> {
    const bar = await this.barClearance(river, nowS);
    if (bar === null || bar.clearanceM >= 0) return null;
    const over = `There is ${bar.depthM.toFixed(1)} m over the bar and she wants ${bar.wantsM.toFixed(1)}.`;
    if (bar.nextHighS === null) return `${over} She cannot cross it.`;
    const h = Math.max(0, (bar.nextHighS - nowS) / 3600);
    const n = Math.round(h);
    const when = h < 0.75 ? 'within the hour' : `in about ${n} hour${n === 1 ? '' : 's'}`;
    return `${over} Not until the flood — high water ${when}.`;
  }

  /** Does a course `toward` end at a landing? A river's landing does; a sea node does when it has one behind it. */
  private async landingFor(toward: string): Promise<string | null> {
    if (this.getLine() !== null) return toward;
    const node = await StuffApi.singleton<Stuff>(toward).catch(() => null);
    return node instanceof ExpanseNode ? node.getDestination() : null;
  }

  /**
   * ⭐ She comes alongside `landingPath` and makes fast (P5, P6): each line
   * aboard goes ashore round a bollard there, and a way aboard named for
   * her goes on the landing. With no line, or no bollard ashore, she lies
   * off unmoored — said in the words returned.
   */
  public async comeAlongside(landingPath: string): Promise<string> {
    if (this.moored) await this.castOff();
    const landing = await StuffApi.singleton<Stuff>(landingPath).catch(() => null);
    if (landing === null || !MixinApi.isContainer(landing)) return 'There is nothing there to make fast to; she lies off.';
    const lines = await this.linesAboard();
    if (lines.length === 0) return 'She has no lines to make fast; she lies off.';
    const fast = await this.makeLinesFast(landing, lines);
    if (fast === 0) return `There is nothing at ${landing.getPresentation()} to make a line fast round; she lies off.`;
    this.berth = landingPath;
    this.moored = true;
    await this.installBerth(landing);
    this.persistMooring();
    this.noteLies(landingPath);
    // ⭐ A kept berth (a harbor quay): her time alongside starts in its book (P7),
    // and a charter ends there (P23) — its days billed to her.
    let ended = '';
    if (MixinApi.isBerthKeeper(landing)) {
      await landing.madeFast(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
      ended = this.endCharter();
    }
    // ⭐ Bringing her alongside and making fast is seamanship (P24) — for
    // whoever aboard has her helm.
    await this.creditHands('standard');
    const made = fast === 1
      ? 'A line goes ashore and is made fast round the bollard.'
      : 'Her lines go ashore and are made fast round the bollards.';
    return ended ? `${made} ${ended}` : made;
  }

  /**
   * ⭐ Cast off (P5): her lines are brought in from aboard and the way
   * aboard her comes off the landing. Any course from a moored ship does
   * this first.
   */
  public async castOff(): Promise<void> {
    const keeper = this.moored ? await this.keeperAt(this.berth) : null;
    await this.bringLinesIn();
    this.removeBerth();
    this.moored = false;
    this.berth = null;
    this.persistMooring();
    this.noteLies(null);
    // ⭐ The berth is free in its keeper's book (P7).
    if (keeper !== null) await keeper.release(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
  }

  /**
   * ⭐ One of her lines was let go (P6, review 1) — untied off its bollard
   * on the quay (cordage's `untie`), or cast off aboard. With her last line
   * off she is no longer moored: the way aboard comes off the landing and
   * everyone aboard is told. Her own bringing them in (sailing, sleeping,
   * going down) says nothing here — she asked.
   */
  public override onLineLetGo(line: Stuff): void {
    void line;
    if (this._bringingIn || !this.moored || this.fastLines().length > 0) return;
    const was = this.berth;
    this.removeBerth();
    this.moored = false;
    this.berth = null;
    this.persistMooring();
    this.noteLies(null);
    // Adrift, she no longer holds the berth she was given (P7).
    void this.keeperAt(was)
      .then((keeper) => keeper?.release(this as unknown as Stuff, WorldClockApi.getNow().rawValue()))
      .catch((err) => console.warn('Ship: the berth was not released:', err));
    void this.aboard()
      .then((people) => {
        for (const who of people) {
          try {
            MessageApi.scene(who).topic('sense.surroundings').toSelf(Mml.compose`Her last line is off the bollard. She is adrift.`).send();
          } catch {
            // decoration
          }
        }
      })
      .catch(() => undefined);
  }

  /**
   * Her lines, made fast round the bollards of `landing` in turn — each
   * through the rope's own `tieTo` (the end across: the rope stays at her
   * bitts, its end goes ashore round the bollard); how many went ashore.
   */
  private async makeLinesFast(landing: Stuff & Container, lines: Rope[]): Promise<number> {
    const bollards = landing.getContents().filter((x): x is Bollard => x instanceof Bollard);
    if (bollards.length === 0) return 0;
    this.madeFast = [];
    let i = 0;
    for (const line of lines) {
      const out = await line.tieTo(this as unknown as Stuff, bollards[i % bollards.length]!, MOORING_KNOT);
      if (out.ok) this.madeFast.push(line);
      else console.warn(`Ship: ${this.getTemplatePath()}: a line was not made fast (${out.reason})`);
      i += 1;
    }
    return this.fastLines().length;
  }

  /** Every one of her lines with an end out across comes in — she is not told (she asked). */
  private async bringLinesIn(): Promise<void> {
    const lines = this.madeFast;
    this.madeFast = [];
    this._bringingIn = true;
    try {
      for (const line of lines) if (!line.isDestroyed() && line.acrossFor() === (this as unknown)) await line.castOff();
    } finally {
      this._bringingIn = false;
    }
  }

  /** Runtime: she is bringing her own lines in — a line let go is hers to expect. */
  private _bringingIn = false;

  /** Her way aboard on `landing`, named for her; one only. */
  private async installBerth(landing: Stuff): Promise<void> {
    const entrance = this.getEntrance();
    if (!entrance || !MixinApi.isExitable(landing)) return;
    const ex = landing as unknown as Stuff & Container & Exitable;
    const live = this.berthExit;
    if (live !== null && !live.isDestroyed() && live.getSource() === (landing as unknown as Stuff & Container)) return;
    this.removeBerth();
    let word = this.berthWord();
    const there = ex.getExit(word);
    if (there) {
      // Hers already (a re-wire); anybody else's word is not taken from them.
      if (there instanceof BerthExit && there.getShipHandle() === this.getDurableHandle()) {
        this.berthExit = there;
        there.configureBerth(this as unknown as Stuff & Berthed);
        return;
      }
      word = `${word}-berth`;
    }
    this.berthExit = await ex.installExit<BerthExit>(
      BERTH_EXIT_KIND,
      { direction: word, source: ex, destinationPath: entrance, oneWay: true },
      (e) => e.configureBerth(this),
    );
  }

  /** Her way aboard off the landing it is on. */
  private removeBerth(): void {
    const exit = this.berthExit;
    this.berthExit = null;
    if (exit === null || exit.isDestroyed()) return;
    const on = exit.getSource();
    if (MixinApi.isExitable(on) && on.getExit(exit.getDirection()) === (exit as unknown)) on.removeExit(exit.getDirection());
    StuffApi.destruct(exit as unknown as Stuff);
  }

  /**
   * ⭐ Put her mooring back as it was (P4, P6): the landing she is made
   * fast at is stood up, her way aboard goes on it, and the lines that were
   * aboard go round its bollards again — a line's end is runtime and does not
   * outlive the process, and which lines were fast is not kept (every line
   * aboard is made fast: a line lifted off before a restart is back on). With no line aboard or no bollard ashore she can
   * no longer be moored, and is not (said loudly: a shipped world should
   * never hit it).
   */
  public async rewireBerth(): Promise<void> {
    if (!this.moored || this.berth === null) return;
    const path = this.berth;
    const landing = await StuffApi.singleton<Stuff>(path).catch(() => null);
    if (landing === null || !MixinApi.isContainer(landing)) {
      console.warn(`Ship: ${this.getTemplatePath()} is moored at '${path}', which does not stand`);
      return;
    }
    if (this.fastLines().length === 0) {
      const fast = await this.makeLinesFast(landing, await this.linesAboard());
      if (fast === 0) {
        console.warn(`Ship: ${this.getTemplatePath()} cannot make fast at '${path}' (no line aboard, or no bollard ashore); she lies off`);
        this.removeBerth();
        this.moored = false;
        this.berth = null;
        this.persistMooring();
        return;
      }
    }
    await this.installBerth(landing);
    // ⭐ A kept berth knows she lies there (P7) — the book's entry stands as it was.
    if (MixinApi.isBerthKeeper(landing)) await landing.madeFast(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
  }

  /** ⭐ A landing is being used: if she lies made fast there, her way goes back on it. */
  public override async wireBerthAt(place: Stuff): Promise<void> {
    if (this.isMoored() && this.berth === place.getTemplatePath()) await this.rewireBerth();
  }

  /** ⭐ Loaded from her record: she lies where she was made fast (P4). */
  override async onRestored(): Promise<void> {
    await super.onRestored();
    await this.standKind();
    await this.armBerth();
    await this.afterStanding();
  }

  /** ⭐ First stood up (no record yet): an authored mooring is made (P4). */
  override async seedBornWith(): Promise<void> {
    await super.seedBornWith();
    await this.standKind();
    await this.armBerth();
    await this.afterStanding();
  }

  /**
   * ⭐ A ship of a kind stood up (minted, or woken from sleep): her rooms
   * stand with her, and her frame keeps her among its craft — nothing
   * authored attaches a kind's ship to a sea (P3).
   */
  private async standKind(): Promise<void> {
    // ⭐ An authored ship's warren stands with her too (B4): her hull's clock
    // is its shell, and her rooms that stand now join it.
    if (!this.isOfKind()) {
      await this.standWarren();
      return;
    }
    this._sleeping = false;
    await this.standWarren();
    // Her company stands with her once she has one (commissioned: her house is hers by serial).
    if ((this.house ?? '').endsWith(`/${this.getPersistenceKey() ?? ''}`)) await this.mintCompany();
    await this.refreshRegistry();
    try {
      (await this.liveFrame())?.adopt(this as never);
    } catch (err) {
      console.warn(`Ship: ${this.getDurableHandle()} was not adopted by her frame:`, err);
    }
  }

  private async armBerth(): Promise<void> {
    if (!this.isMoored()) return;
    try {
      await this.rewireBerth();
    } catch (err) {
      console.warn(`Ship: ${this.getTemplatePath()} did not make fast again:`, err);
    }
  }

  private persistMooring(): void {
    try {
      void PersistableApi.capture(this as unknown as Stuff).catch((err) => console.warn('Ship: capture failed:', err));
    } catch (err) {
      console.warn('Ship: capture failed:', err);
    }
  }

  /** Her way aboard comes off with her (a reaped or destroyed ship leaves no door). */
  override onDestruct(): void {
    this.stopListening();
    try {
      WorldClockApi.cancelByHost(this as unknown as Stuff);
    } catch {
      // no clock (a unit world)
    }
    void this.bringLinesIn();
    this.removeBerth();
    // ⭐ Her warren goes with her: a kind's rooms come down whole; an
    // authored ship's adopted rows are let go of, never destructed — they
    // are rooms in their own right.
    const w = this._warren;
    this._warren = null;
    if (w !== null && !w.isDestroyed()) {
      if (!this.isOfKind()) w.releaseRooms();
      StuffApi.destruct(w as unknown as Stuff);
    }
    super.onDestruct();
  }

  /* ───────────── her rooms: the warren, the handle, sleep (harbors P1–P3, B1) ───────────── */

  /**
   * ⭐ The floorplan her rooms are minted from — a `ShipWarren` row
   * (`/stuff/idea/ShipWarren/smack`), authored on a ship KIND. `null` for
   * an authored ship (the Hesper), whose warren adopts her own rows.
   */
  protected warren: string | null = null;

  public getWarrenRow(): string | null { return this.warren; }
  public setWarren(v: string | null): void { this.warren = typeof v === 'string' && v !== '' ? v : null; }

  /** Runtime: her warren standing, and its stand-up in flight. */
  private _warren: ShipWarren | null = null;
  private _warrenPending: Promise<ShipWarren | null> | null = null;
  private _sleeping = false;

  /** ⭐ A ship of a KIND — keyed `(kind row, serial)` — rather than an authored one-row ship. */
  public isOfKind(): boolean {
    return this.isPersistenceKeyExplicit();
  }

  /**
   * ⭐ Her durable handle (P2, P3): `<kind row>#<serial>` for a ship of a
   * kind; her own row for an authored ship (one row IS one ship — the
   * singleton rung a building gets from its class, she gets here).
   */
  public override getDurableHandle(): string | null {
    return super.getDurableHandle() ?? this.getTemplatePath();
  }

  /**
   * ⭐ Her warren, standing (P1): keyed `(warren row, her key)` through the
   * spine's resolve-first stand-up — her serial for a kind, her row for an
   * authored ship — and woken (a kind's rooms minted; an authored ship's
   * resident rooms adopted). `null`, loudly, when it will not stand.
   */
  public async standWarren(): Promise<ShipWarren | null> {
    const live = this._warren;
    if (live !== null && !live.isDestroyed()) return live;
    if (this._warrenPending !== null) return this._warrenPending;
    this._warrenPending = (async () => {
      const row = this.warren ?? AUTHORED_SHIP_WARREN;
      const key = this.isOfKind() ? this.getPersistenceKey() : this.getTemplatePath();
      if (!key) return null;
      try {
        const w = await PersistableApi.standUpKeyed(row, key);
        if (!(w instanceof ShipWarren)) {
          throw new Error(`'${row}' is not a ShipWarren row`);
        }
        w.attachShip(this);
        this._warren = w;
        await w.wake();
        return w;
      } catch (err) {
        console.warn(`Ship: ${this.getDurableHandle()} could not stand her warren '${row}' up:`, err);
        return null;
      }
    })().finally(() => {
      this._warrenPending = null;
    });
    return this._warrenPending;
  }

  /** The member rooms that are resident now — her warren's (P3). */
  private async liveMembers(): Promise<(Stuff & Container)[]> {
    const w = await this.standWarren();
    if (w === null) return [];
    if (!this.isOfKind()) await w.adoptResident();
    return w.liveRooms();
  }

  /**
   * ⭐ Nobody interactive is aboard (her warren saw the last one go): a ship
   * of a kind that is not under way sleeps whole. An authored ship stands
   * while her zone does (the `Structure` rule) and never sleeps.
   */
  public async sleepIfEmpty(): Promise<void> {
    if (!this.isOfKind() || this.getCourse() !== null || this._sleeping) return;
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) if (MixinApi.isHasInteractive(x)) return;
    }
    await this.sleep();
  }

  /**
   * ⭐ Sleep whole (P1, D16's rule for a holding): every room's record, the
   * warren's and her own are captured, then the warren comes down with her
   * rooms and she with it. Made fast, she stays made fast — `moored` and
   * `berth` are kept, her lines' ends ashore come in unannounced (an end is
   * runtime, as across a restart) and her way aboard STAYS on the landing:
   * taking it stands her up again (`BerthExit`).
   */
  public async sleep(): Promise<void> {
    if (!this.isOfKind() || this._sleeping || this.isDestroyed()) return;
    this._sleeping = true;
    // Her lines' ends come in unannounced: `moored` is kept, and she is
    // bringing them in herself, so a line let go says nothing.
    await this.bringLinesIn();
    this.berthExit = null; // left standing on the landing, hers by handle
    const w = this._warren !== null && !this._warren.isDestroyed() ? this._warren : null;
    if (w !== null) await w.captureAll();
    await PersistableApi.capture(this as unknown as Stuff);
    this._warren = null;
    if (w !== null) StuffApi.destruct(w as unknown as Stuff);
    StuffApi.destruct(this as unknown as Stuff);
  }

  /** ⭐ Under way she stays resident (the voyage is hers to keep); otherwise as a structure. */
  public override canEvict(context: EvictionContext): VetoResult {
    if (this.getCourse() !== null) return { ok: false, reason: 'she is under way' };
    return super.canEvict(context);
  }

  /** Everyone standing in a member room — told what the water does. */
  override async aboard(): Promise<Stuff[]> {
    const out: Stuff[] = [];
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) if (MixinApi.isOrganism(x)) out.push(x);
    }
    return out;
  }

  /** The entrance — the deck the watch is kept on. */
  override async watchRoom(): Promise<(Stuff & Container) | null> {
    // ⭐ A ship of a kind: her deck is her warren's entry room, keyed (P2).
    if (this.isOfKind()) return (await this.standWarren())?.entryRoom() ?? null;
    const entrance = this.getEntrance();
    if (!entrance) return null;
    try {
      const s = await StuffApi.singleton<Stuff>(entrance);
      return MixinApi.isContainer(s) ? s : null;
    } catch {
      return null;
    }
  }

  /** What her rooms carry that is not people — cargo, stores, fuel, kg. */
  public async cargoKg(): Promise<number> {
    let kg = 0;
    for (const room of await this.liveMembers()) {
      for (const x of room.getContents()) {
        if (MixinApi.isOrganism(x) || !MixinApi.isTangible(x)) continue;
        if (MixinApi.isContainable(x) && x.isFixedInPlace()) continue;
        const m = x.getMass().rawValue();
        if (Number.isFinite(m)) kg += m;
      }
    }
    return kg;
  }

  /** Runtime: her cargo as last weighed (the sync hull read uses it). */
  private weighedKg = 0;

  /**
   * ⭐ Her hull as she floats now (D28): the draft deepens with what she
   * carries — put cargo ashore and she comes up.
   */
  override hullNow(): HullNow {
    const h = this.hull ?? { draftM: 1.2, beamM: 6, lengthM: 30 };
    const extra = this.weighedKg / (RHO * h.lengthM * h.beamM * 0.7);
    return { draftM: h.draftM + extra, beamM: h.beamM, lengthM: h.lengthM };
  }

  /** Weigh her before a course is worked out (the frame reads the hull sync). */
  override async steer(req: CourseRequest): Promise<StartResult | { refused: string }> {
    // ⭐ A ship on the ground has no watch to notice the river rising (the
    // drive found her aground for good): asked for a course, she first sees
    // whether she floats now — the water up, or her lightened.
    if (this.aground && !(await this.floatIfShePasses())) {
      return { refused: 'She is hard aground. Lighten her, wait for the water, or kedge her off.' };
    }
    if (this.wreck !== null) return { refused: 'She lies on the bottom. She goes nowhere now.' };
    if (this.settled) return { refused: 'She has settled onto the mud with the water in her. Pump her out first.' };
    if (this.settling !== null) return { refused: 'She is settling under you; she will answer no helm.' };
    if (this.holed) return { refused: 'She is holed and taking water; she goes nowhere until she is patched.' };
    // ⭐ A course that ends alongside needs a line to make fast with (P5),
    // a kept berth she leaves must clear her and one she comes to admit her
    // (P7) — all asked before the course is laid: the refusal is instant.
    // ⭐ A course across the chart for a node is laid from beyond hail of its
    // harbor: the keeper is asked at the arrival (`arriveAlongside`), not now
    // (A3 — the island's quay); a river's landing is asked before she moves.
    const toward = req.toward ?? null;
    const refused = await this.courseRefusal(toward ? await this.landingFor(toward) : null, { admit: this.getLine() !== null });
    if (refused !== null) return { refused };
    this.weighedKg = await this.cargoKg();
    const started = await super.steer(req);
    // ⭐ Under way from a berth: her lines come in and the way aboard goes (P5).
    if (!('refused' in started) && this.moored) {
      await this.castOff();
      await this.creditHands('easy'); // casting off is seamanship (P24)
    }
    return started;
  }

  /**
   * ⭐ The stop her course came to (D28, D29): aground and holed are
   * states she keeps (persisted); a river's mouth puts her out onto the sea.
   */
  override async onStop(stop: CraftStop): Promise<string> {
    if (stop.reason === 'aground') this.aground = true;
    if (stop.reason === 'holed') this.holed = true;
    // ⭐ At a landing she makes fast (P5): her lines go ashore round its bollards.
    if (stop.reason === 'landing' && stop.landing) {
      return `${stop.words} ${await this.comeAlongside(stop.landing)}`.trim();
    }
    if (stop.reason === 'arrived' && stop.landing) {
      return `${stop.words} ${await this.arriveAlongside(stop.landing)}`.trim();
    }
    // ⭐ The node she was laid for, raised (P24): seamanship to whoever has her helm.
    if (stop.reason === 'arrived') await this.creditHands('standard');
    if (stop.reason === 'mouth') {
      const frame = await this.liveFrame();
      const sea = frame !== null && MixinApi.isLineFrame(frame) ? frame.mouthOnSea() : null;
      if (sea !== null) {
        const node = await StuffApi.singleton<Stuff>(sea.node).catch(() => null);
        const at = node instanceof ExpanseNode ? node.getExpansePosition() : null;
        if (at !== null) {
          this.placeAt({ frame: 'chart', at }, WorldClockApi.getNow().rawValue(), sea.expanse);
          (await this.liveFrame())?.adopt(this as never);
          const out = `${stop.words} She is out over the bar, and lies at ${node!.getPresentation()}. The next course is the sea's.`;
          // ⭐ The node's landing is where she lies (P5): she makes fast there.
          const landing = (node as ExpanseNode).getDestination();
          return landing ? `${out} ${await this.comeAlongside(landing)}` : out;
        }
      }
    }
    return stop.words;
  }

  /**
   * ⭐ Off the sea and onto a river (D29): at the mouth node a river names,
   * she leaves the chart for the river's line, at its mouth.
   */
  public async enterRiver(line: string, course: string, mouthKm: number, across: number): Promise<void> {
    // ⭐ Made fast at the node's landing, she casts off first (harbors P5).
    if (this.moored) await this.castOff();
    this.placeAt({ frame: 'line', at: { course, km: mouthKm, across } }, WorldClockApi.getNow().rawValue(), line);
  }

  /** Floated off: the water came up, or she was lightened (D28). */
  public async floatIfShePasses(): Promise<boolean> {
    if (!this.aground) return true;
    const frame = await this.liveFrame();
    const pos = this.getLinePosition();
    if (frame === null || !MixinApi.isLineFrame(frame) || pos === null) return false;
    this.weighedKg = await this.cargoKg();
    const depth = await frame.depthAt(pos, WorldClockApi.getNow().rawValue());
    if (depth !== null && depth > this.hullNow().draftM) {
      this.aground = false;
      return true;
    }
    return false;
  }

  /** The Durable gear on deck — what an unattended watch wears. */
  override async gearAboard(): Promise<Stuff[]> {
    const deck = await this.watchRoom();
    return deck ? deck.getContents().filter((x) => MixinApi.isDurable(x)) : [];
  }
}

/** A person's durable key (D17: never the lineage stamp alone). */
function idOf(who: Stuff): string {
  return who.getIdentityPath() ?? who.getTemplatePath() ?? '';
}

/**
 * ⭐ *She flies the colors of the City of Terminus.* — derived from the flag
 * on her flagstaff (P16), so it is true the moment the flag is struck or
 * changed. Says nothing of her register: colors are a claim.
 */
function flagAugmenter(text: string, host: Stuff, _viewer: Stuff): string {
  if (!(host instanceof Ship)) return text;
  const flag = host.flownFlag();
  if (flag === null) return text;
  const polity = flag.colorsOf();
  const name = polity ? GovernmentApi.getGovernment(polity)?.name ?? polity : flag.getPresentation();
  const line = polity ? `She flies the colors of ${name}.` : `She flies ${name}.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

/** ⭐ Acts each person aboard has once she begins to settle (`ship.settlingActs`, grain). */
function settlingActs(): number {
  return Math.max(1, Math.round(shipSetting('ship.settlingActs', SETTLING_ACTS)));
}

/** ⭐ The backstop on her settling window, real ms (`ship.settlingRealS`, grain). */
function settlingRealMs(): number {
  return shipSetting('ship.settlingRealS', SETTLING_REAL_S) * 1000;
}

/** A numeric setting, else the shipped grain (the `FloorplanWarren` read). */
function shipSetting(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  } catch {
    // a cold cache or an unregistered key — the shipped grain
  }
  return fallback;
}
