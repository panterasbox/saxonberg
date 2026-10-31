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

import Structure from './Structure';
import { PositionedMixin } from '../../lib/expanse/Positioned';
import { EngagedMixin } from '../../lib/activity/Engaged';
import { PersistableMixin } from '../../lib/persistence/Persistable';
import { VoyagingMixin } from '../../lib/expanse/Voyaging';
import { MovingMixin } from '../../lib/expanse/Moving';
import { Template } from '../../lib/stuff/Template';
import { StuffApi } from '../../api/stuff';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { Container } from '../../lib/spatial/Container';
import type { FieldMeta } from '../../lib/mixin';
import type { Stuff } from '../../lib/stuff/Stuff';
import type { HullNow } from '../../lib/expanse/Voyaging';
import type { CourseRequest, CraftStop } from '../../lib/expanse/Frame';
import type { StartResult } from '../../api/scheduler';
import ExpanseNode from './ExpanseNode';
import Bollard from '../thing/Bollard';
import BerthExit from './BerthExit';
import type { Positioned } from '../../lib/expanse/Positioned';
import type { MooringLine } from '../../lib/spatial/MooringLine';
import type { Exitable } from '../../lib/boundary/Exitable';
import type { BerthKeeper } from '../../lib/expanse/BerthKeeper';
import type { LineFrame } from '../../lib/expanse/LineFrame';
import { PersistableApi } from '../../api/persistable';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';

/** A ship's hull (river D28): how deep she floats, how wide, how long. */
export interface ShipHull {
  draftM: number;
  beamM: number;
  lengthM: number;
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
}

/** The kind row of the way aboard a ship, named for her (harbors P4). */
const BERTH_EXIT_KIND = '/platform/idea/exits/berth';

/**
 * ⭐ A mooring line must reach from her rail to the bollard and back again
 * (harbors P6, grain): twice her height out of the water, never less than
 * this, m.
 */
const MIN_LINE_M = 2;

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

export const SHIP_CLASS_PATH = '/platform/idea/Ship';

export default class Ship extends PersistableMixin(
  VoyagingMixin(MovingMixin(EngagedMixin(PositionedMixin(Structure)))),
) {
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
      if (room === null || !MixinApi.isWaterPlace(room)) continue;
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
  public setHoled(v: boolean): void { this.holed = v === true; }

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
    this.owed.push({ to: bill.to, amountMinor, reason: String(bill.reason ?? '') });
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
   * ⭐ Does `who` answer for her (P12, P13) — the one whose business her
   * dues and bills are? Whoever holds her company's `master` seat. (The
   * charterer and the managing owner join this in later waves.)
   */
  public answersFor(who: Stuff): boolean {
    const house = this.house;
    if (house === null || !MixinApi.isEmployed(who)) return false;
    return who.getEmployment(house)?.positionKey === MASTER_POSITION;
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

  /** Runtime: the way aboard she has put on her landing, and the lines fast now. */
  private berthExit: BerthExit | null = null;
  private fastLines: (Stuff & MooringLine)[] = [];

  /** ⭐ The landing she is made fast at — what her deck's `ashore` leads to first. */
  public getBerth(): string | null {
    return this.moored ? this.berth : null;
  }

  public override isMoored(): boolean {
    return this.moored && this.berth !== null;
  }

  public isGangwayLocked(): boolean { return this.gangwayLocked; }
  public setGangwayLocked(v: boolean): void { this.gangwayLocked = v === true; }
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
   * ⭐ The lines aboard her that will hold her (P6): every line on her deck
   * that can be made fast round a bollard and is long enough to reach.
   */
  public async linesAboard(): Promise<(Stuff & MooringLine)[]> {
    const deck = await this.watchRoom();
    if (deck === null) return [];
    const needM = Math.max(MIN_LINE_M, 2 * this.deckHeightM);
    const out: (Stuff & MooringLine)[] = [];
    for (const x of deck.getContents()) {
      if (MixinApi.isMooringLine(x) && x.lineLengthM() >= needM) out.push(x);
    }
    return out;
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
  public async courseRefusal(landing: string | null): Promise<string | null> {
    const nowS = WorldClockApi.getNow().rawValue();
    const leaving = this.isMoored() ? await this.keeperAt(this.berth) : null;
    if (leaving !== null) {
      const held = await leaving.clearance(this as unknown as Stuff, nowS);
      if (held !== null) return held;
    }
    if (landing === null || landing === '') return null;
    if ((await this.linesAboard()).length === 0) return 'She has no lines to make fast.';
    const coming = await this.keeperAt(landing);
    return coming === null ? null : coming.admit(this as unknown as Stuff, nowS);
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
    // ⭐ A kept berth (a harbor quay): her time alongside starts in its book (P7).
    if (MixinApi.isBerthKeeper(landing)) await landing.madeFast(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
    return fast === 1
      ? 'A line goes ashore and is made fast round the bollard.'
      : 'Her lines go ashore and are made fast round the bollards.';
  }

  /**
   * ⭐ Cast off (P5): her lines are brought in from aboard and the way
   * aboard her comes off the landing. Any course from a moored ship does
   * this first.
   */
  public async castOff(): Promise<void> {
    const lines = this.fastLines;
    this.fastLines = [];
    const keeper = this.moored ? await this.keeperAt(this.berth) : null;
    for (const line of lines) if (!line.isDestroyed()) await line.castOffMooring();
    this.removeBerth();
    this.moored = false;
    this.berth = null;
    this.persistMooring();
    // ⭐ The berth is free in its keeper's book (P7).
    if (keeper !== null) await keeper.release(this as unknown as Stuff, WorldClockApi.getNow().rawValue());
  }

  /**
   * ⭐ One of her lines was cast off from ashore (P6) — somebody lifted it
   * off the bollard. With her last line off she is no longer moored: the
   * way aboard comes off the landing and everyone aboard is told.
   */
  public lineCastOff(line: Stuff & MooringLine): void {
    this.fastLines = this.fastLines.filter((l) => l !== line && !l.isDestroyed() && l.isMadeFast());
    if (this.fastLines.length > 0 || !this.moored) return;
    const was = this.berth;
    this.removeBerth();
    this.moored = false;
    this.berth = null;
    this.persistMooring();
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

  /** Her lines, made fast round the bollards of `landing` in turn; how many went ashore. */
  private async makeLinesFast(landing: Stuff & Container, lines: (Stuff & MooringLine)[]): Promise<number> {
    const bollards = landing.getContents().filter((x): x is Bollard => x instanceof Bollard);
    if (bollards.length === 0) return 0;
    this.fastLines = [];
    let i = 0;
    for (const line of lines) {
      if (await line.makeFastRound(bollards[i % bollards.length]!, this)) this.fastLines.push(line);
      i += 1;
    }
    return this.fastLines.length;
  }

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
      if (there instanceof BerthExit && there.getShipPath() === this.getTemplatePath()) {
        this.berthExit = there;
        return;
      }
      word = `${word}-berth`;
    }
    this.berthExit = await ex.installExit<BerthExit>(
      BERTH_EXIT_KIND,
      { direction: word, source: ex, destinationPath: entrance, oneWay: true },
      (e) => e.configureBerth(this as unknown as Stuff),
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
    const want = this.fastLines.filter((l) => !l.isDestroyed() && l.isMadeFast());
    if (want.length === 0) {
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
    await this.armBerth();
  }

  /** ⭐ First stood up (no record yet): an authored mooring is made (P4). */
  override async seedBornWith(): Promise<void> {
    await super.seedBornWith();
    await this.armBerth();
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
    for (const line of this.fastLines) if (!line.isDestroyed()) void line.castOffMooring();
    this.fastLines = [];
    this.removeBerth();
    super.onDestruct();
  }

  /** Runtime cache of the member room rows (the extent's descendants). */
  private memberPaths: Promise<string[]> | null = null;

  /** The member rooms that are resident now. */
  private async liveMembers(): Promise<(Stuff & Container)[]> {
    if (this.memberPaths === null) {
      const ext = this.getExtent();
      this.memberPaths = ext === ''
        ? Promise.resolve([])
        : Template.findDescendants(ext).then((ts) => ts.map((t) => t.path));
    }
    const out: (Stuff & Container)[] = [];
    for (const p of await this.memberPaths) {
      const s = StuffApi.findByTemplatePath<Stuff>(p);
      if (s && s.isPlace() && MixinApi.isContainer(s)) out.push(s);
    }
    return out;
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
    if (this.holed) return { refused: 'She is holed and taking water; she goes nowhere until she is patched.' };
    // ⭐ A course that ends alongside needs a line to make fast with (P5),
    // a kept berth she leaves must clear her and one she comes to admit her
    // (P7) — all asked before the course is laid: the refusal is instant.
    const toward = req.toward ?? null;
    const refused = await this.courseRefusal(toward ? await this.landingFor(toward) : null);
    if (refused !== null) return { refused };
    this.weighedKg = await this.cargoKg();
    const started = await super.steer(req);
    // ⭐ Under way from a berth: her lines come in and the way aboard goes (P5).
    if (!('refused' in started) && this.moored) await this.castOff();
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
    if ((stop.reason === 'landing' || stop.reason === 'arrived') && stop.landing) {
      return `${stop.words} ${await this.comeAlongside(stop.landing)}`.trim();
    }
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
