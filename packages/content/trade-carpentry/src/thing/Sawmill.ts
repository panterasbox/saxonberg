/**
 * Sawmill — the sawing instrument. **One class, two rungs, both rows.**
 *
 * A pit saw and a water sawmill are the same object with different
 * numbers, exactly as a quern and a grist mill are: the pit saw authors a
 * throughput (kg of log an hour, two men on the saw) and no power
 * coefficient; the sawmill authors a power coefficient and no throughput
 * of its own. The capital ladder is rows, never a class each, so a second
 * sawmill in a second valley needs zero code.
 *
 * ## ⭐⭐ The power read is the grist mill's, verbatim
 *
 * `availablePowerW()` looks for a **room sibling that answers
 * `generationW(flow)` and `getReachRef()`** — a race off the water pack —
 * resolves the drainage catalogue by template path and asks it what is
 * passing. No import of the water pack and no dependency on it: the
 * `FordExit` rule, two packs meeting over a shape.
 *
 * ⚠ **A sawmill with no race cuts at zero and says so.** It does not
 * fall back to hand speed: a frame saw with no water is a shed.
 *
 * ⭐ And because the flow is seasonal, **the sawmill's rate is
 * seasonal** — a dry August cuts slower, which nobody authored.
 *
 * What it does NOT compose is `ComminutingMixin`: a saw does not reduce
 * matter to meal, it divides a log into boards, and that arithmetic is
 * the `saw` verb's.
 */

import Good from '@saxonberg/server/mud/platform/thing/Good';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tool';
import { PoweredMixin } from '@saxonberg/server/mud/lib/supply/Powered';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { ContainmentApi } from '@saxonberg/server/mud/api/containment';
import { PersistableApi } from '@saxonberg/server/mud/api/persistable';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import type { WaterPowered } from '@saxonberg/server/mud/lib/supply/WaterPowered';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type Material from '@saxonberg/server/mud/lib/material/Material';
import type { ActDone, ActPlan, ActRefusal } from '@saxonberg/server/mud/lib/craft/ActPlan';
import type { SawRefusal } from '@saxonberg/server/mud/lib/craft/Sawable';

/** The through-sawn board row. */
export const BOARD_PATH = '/trade/carpentry/thing/board';
/** The quarter-sawn board row — the same board, opened radially. */
export const QUARTERED_BOARD_PATH = '/trade/carpentry/thing/quartered-board';

/**
 * Kilograms in one board — what both board rows author as their `mass`
 * (a stack's mass is per unit). A test holds the rows to this figure, so
 * the yield arithmetic and the boards on the floor cannot drift apart.
 */
export const BOARD_KG = 6;

/**
 * ⭐ What quartering costs: the wedges between the radial cuts are
 * waste, so a quartered log gives two boards for every three a
 * through-sawn one would.
 */
export const QUARTER_YIELD = 2 / 3;

/** The sawdust row the kerf mints (one unit a kilogram). */
export const SAWDUST_PATH = '/trade/carpentry/thing/sawdust';

/** A board's thickness, m — what one kerf is measured against. */
export const BOARD_THICKNESS_M = 0.025;

/**
 * Metabolic watts of working a pit saw — the top sawyer's half of it,
 * heavy and steady. The water rung costs nothing of yours.
 */
export const PIT_SAW_EFFORT_W = 650;

/** What is going on the carriage, resolved before anything is cut. */
export interface SawCut {
  log: Stuff;
  quarter: boolean;
  /** Boards the cut will give. */
  boards: number;
  /** ⭐ A water sawmill holds nothing of yours: the plan is RUN, not engaged. */
  unattended: boolean;
}

/** What came off the saw. */
export type SawLanded =
  | { kind: 'boards'; boards: number; quarter: boolean }
  /** The saw or the log went while the cut ran, or there is no floor. */
  | { kind: 'gone' };

/** ⭐ Every reason a saw refuses a cut — `SawController` words each. */
export type SawmillRefusal =
  | SawRefusal
  | ActRefusal<'already-sawing'>
  | ActRefusal<'too-small', { quarter: boolean }>
  | ActRefusal<'no-power'>;

/** The saw's plan for one log. */
export type SawmillPlan = ActPlan<SawCut, SawLanded, never>;

/** The drainage catalogue, by path — never by import. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';

/** The catalogue's reading surface, duck-typed. */
interface FlowSource {
  flowAt(reach: string, nowS: number): Promise<{ m3s: number } | null>;
}

// ⚠ Not Chambered: a pit saw is a blade and has no loft. The mill that
// does is `LoftedSawmill`, which composes it on top of this.
const SawmillBase = PoweredMixin(ToolMixin(Good));

export default class Sawmill extends SawmillBase {
  static fieldMeta: FieldMeta = {
    throughputKgPerHour: { persistent: true, authorable: true },
    kgPerHourPerKw: { persistent: true, authorable: true },
    maxThroughputKgPerHour: { persistent: true, authorable: true },
    kerfM: { persistent: true, authorable: true },
  };

  /**
   * ⭐ The instrument affords the verb — a saw in your hands or a sawmill
   * in the room is what makes `saw` sayable. A static on the class, never
   * a row key: a row's `commandContributions:` is dead silently.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/carpentry/cmd/carpentry/saw.yaml'],
    environment: ['trade/carpentry/cmd/carpentry/saw.yaml'],
  };

  /** Kg of log an hour at the authored (hand) rate; 0 = power-driven. */
  public throughputKgPerHour = 0;
  /** Kg of log an hour per kilowatt reaching the blade; 0 = hand-driven. */
  public kgPerHourPerKw = 0;
  /** The frame's own ceiling, however much water there is; 0 = none. */
  public maxThroughputKgPerHour = 0;
  /**
   * The width of the cut, m (storage-and-ice D18): what a blade turns to
   * sawdust. A frame saw's thin blades run ~3 mm, a pit saw's heavy one
   * ~5 mm; 0 = the default kerf.
   */
  public kerfM = 0;

  /** The width of this saw's cut, m (default 4 mm when unauthored). */
  public getKerfM(): number {
    return this.kerfM > 0 ? this.kerfM : 0.004;
  }

  /** Runtime only — a frame saw cuts one log at a time. */
  private _sawing = false;

  /**
   * ⚠ Memoised per weather segment, the `FordExit` shape: `flowAt` is
   * async and this read is sync, so the figure is refreshed off-band and
   * answered from the cache. A sawmill asked before the first refresh
   * answers 0 — which reads as "not turning yet", not as a lie.
   */
  private _cachedW = 0;
  private _cachedAtS = -1;
  private _refreshing = false;

  /** Is the frame already working a log? */
  public isSawing(): boolean {
    return this._sawing;
  }

  public setSawing(on: boolean): void {
    this._sawing = on === true;
  }

  /**
   * Does this rung run on water (true) or on hands (false)? ⚠ A fact about
   * the rung, not the river: it was `isPowered()` until PoweredMixin gave that
   * word its meaning, *power is reaching it now* (a dry race answers false).
   */
  public runsOnWater(): boolean {
    return this.kgPerHourPerKw > 0;
  }

  /**
   * Kilograms of log an hour, right now. The hand rung is its authored
   * figure; the water rung is the power reaching the blade times its
   * coefficient, capped by the frame. 0 = it will not cut.
   */
  public ratePerHourNow(): number {
    if (this.throughputKgPerHour > 0) return this.throughputKgPerHour;
    if (!(this.kgPerHourPerKw > 0)) return 0;
    const rate = (this.availablePowerW() / 1000) * this.kgPerHourPerKw;
    return this.maxThroughputKgPerHour > 0
      ? Math.min(rate, this.maxThroughputKgPerHour)
      : rate;
  }

  /** Game-ms to saw `kg` of log at the current rate; Infinity at none. */
  public sawMs(kg: number): number {
    const rate = this.ratePerHourNow();
    if (!(rate > 0)) return Number.POSITIVE_INFINITY;
    return Math.max(1, Math.round((Math.max(0, kg) / rate) * 3_600_000));
  }

  /**
   * Await the river read so the next `availablePowerW()` is current. ⚠
   * Without this a FRESH sawmill's first `saw` would answer "nothing is
   * driving it" — the cache is cold and the refresh fire-and-forget.
   */
  public async settlePower(): Promise<void> {
    const take = this.powerTake();
    if (take === null) return;
    await this.refreshPower(take);
  }

  /** Watts reaching the blade right now. 0 = nothing is driving it. */
  public availablePowerW(): number {
    const take = this.powerTake();
    if (take === null) return 0;
    void this.refreshPower(take);
    return this._cachedW;
  }

  /** The room sibling that makes the power, if there is one. */
  private powerTake(): (Stuff & WaterPowered) | null {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    for (const occ of room.getContents()) {
      if (MixinApi.isWaterPowered(occ)) return occ;
    }
    return null;
  }

  /** Re-read the flow at most once per six game-hours. */
  private async refreshPower(take: WaterPowered): Promise<void> {
    if (this._refreshing) return;
    const nowS = WorldClockApi.getNow().rawValue();
    // The weather field itself is memoised per six-game-hour segment, so
    // asking more often than that buys nothing but work.
    const SEGMENT_S = 6 * 3600;
    if (this._cachedAtS >= 0 && nowS - this._cachedAtS < SEGMENT_S) return;
    this._refreshing = true;
    try {
      const reach = take.getReachRef();
      if (!reach) {
        this._cachedW = 0;
        this._cachedAtS = nowS;
        return;
      }
      const cat = await StuffApi.singleton<Stuff>(WATERCOURSE_CATALOGUE);
      const duck = cat as unknown as Partial<FlowSource>;
      if (typeof duck.flowAt !== 'function') {
        this._cachedW = 0;
        this._cachedAtS = nowS;
        return;
      }
      const reading = await duck.flowAt(reach, nowS);
      this._cachedW = reading === null ? 0 : take.generationW(reading.m3s);
      this._cachedAtS = nowS;
    } catch {
      // No water pack, no catalogue, no reading — a shed, not a sawmill.
      this._cachedW = 0;
      this._cachedAtS = WorldClockApi.getNow().rawValue();
    } finally {
      this._refreshing = false;
    }
  }

  /**
   * ⭐⭐ **The one sawing engine** (controller-liquidity W11, C6) — both
   * rungs, one plan. The log answers its own charge when its sawing is its
   * own business (`SawableMixin` — a bole gives one green length and the
   * take); any other piece of wood is weighed as it is. The plan refuses
   * before anything is cut (already sawing, not wood in the round, too
   * small to give a board, no water in the race).
   *
   * ⭐ The saw is CLAIMED for the whole cut on both rungs: `onBegin` sets
   * it sawing, the landing and an abort release it — so a second sawyer is
   * refused at the pit as at the mill, and a cut that ends in nothing
   * (the log gone under it) still hands the saw back.
   *
   * A pit saw's plan is engaged on the sawyer's hands ({@link
   * PIT_SAW_EFFORT_W}); a water sawmill's is `unattended` and the caller
   * hands it to {@link runUnattended}.
   */
  public async sawPlan(
    actor: Stuff,
    log: Stuff,
    opts: { quarter: boolean },
  ): Promise<SawmillPlan | SawmillRefusal> {
    if (this._sawing) return { ok: false, reason: 'already-sawing' };
    const quarter = opts.quarter === true;
    let charge: { kg: number; material: Material | null; seasoned: number } | null = null;
    let take: (() => unknown) | null = null;
    if (MixinApi.isSawable(log)) {
      const out = await log.sawPlanFor(actor, this as unknown as Stuff);
      if (!out.ok) return out;
      charge = out.facts;
      take = out.onComplete;
    } else {
      charge = Sawmill.chargeOf(log);
    }
    if (charge === null) return { ok: false, reason: 'not-sawable' };
    const boards = this.boardsFrom(charge.kg, BOARD_KG, quarter);
    if (boards < 1) return { ok: false, reason: 'too-small', facts: { quarter } };
    // ⚠ A cold water-sawmill answers 0 until its race has been read once,
    // and "will not turn" must be true when it is said.
    await this.settlePower();
    const durationMs = this.sawMs(charge.kg);
    if (!Number.isFinite(durationMs)) return { ok: false, reason: 'no-power' };
    const unattended = this.runsOnWater();
    const self = this;
    const landedCharge = charge;
    return {
      ok: true,
      durationMs,
      effortW: unattended ? 0 : PIT_SAW_EFFORT_W,
      facts: { log, quarter, boards, unattended },
      onBegin: () => self.setSawing(true),
      onAbort: () => self.setSawing(false),
      onComplete: async (): Promise<ActDone<SawLanded, never>> => {
        try {
          return await self.land(actor, log, take, landedCharge, boards, quarter);
        } finally {
          self.setSawing(false);
        }
      },
    };
  }

  /**
   * ⭐⭐ **The sawmill holds nothing of yours.** Runs an unattended plan on
   * the game clock — the sawyer may walk out, and the boards are on the
   * mill floor when they come back. Resolves with what came off.
   */
  public runUnattended(plan: SawmillPlan): Promise<ActDone<SawLanded, never>> {
    this.setSawing(true);
    return new Promise((resolve) => {
      WorldClockApi.after(
        Quantity.of(plan.durationMs / 1000, 's'),
        () => {
          Promise.resolve()
            .then(() => plan.onComplete())
            .then(resolve)
            .catch((err: unknown) => {
              console.error('Sawmill: an unattended cut failed', err);
              this.setSawing(false);
              resolve({ ok: true, facts: { kind: 'gone' } });
            });
        },
        { host: this as unknown as Stuff, tag: 'saw-log' },
      );
    });
  }

  /**
   * Boards a log of `kg` gives: its mass over a board's, and two in three
   * of that when it is quartered.
   */
  public boardsFrom(kg: number, unitKg: number, quarter: boolean): number {
    if (!(unitKg > 0) || !(kg > 0)) return 0;
    const through = kg / unitKg;
    return Math.floor(quarter ? through * QUARTER_YIELD : through);
  }

  /**
   * ⭐ Kilograms of sawdust a cut of `boards` makes (storage-and-ice D18):
   * one kerf a board (two when quartered — the radial cuts), each a kerf's
   * width of a board's thickness turned to dust. The boards come out
   * lighter by what is minted, so mass is conserved.
   */
  public kerfSawdustKg(boards: number, quarter: boolean, kerfM: number = this.getKerfM()): number {
    if (!(boards > 0) || !(kerfM > 0)) return 0;
    const cuts = boards * (quarter ? 2 : 1);
    return (cuts * kerfM * BOARD_KG) / BOARD_THICKNESS_M;
  }

  /**
   * What a piece of wood with no saw cut of its own puts on the carriage,
   * or `null` when it is not sawable — weighed as it is (one piece of a
   * stack). Already-sawn stock is not wood in the round.
   */
  private static chargeOf(
    log: Stuff,
  ): { kg: number; material: Material | null; seasoned: number } | null {
    if (!MixinApi.isTangible(log)) return null;
    const material = log.getMaterial();
    if (!material || !material.hasTag('wood')) return null;
    if (MixinApi.isConstructed(log) && log.getConstructionForm() === 'sawn') return null;
    const kg = log.getMass().rawValue();
    if (!(kg > 0)) return null;
    const seasoned = MixinApi.isSeasoning(log) ? log.getSeasonedFraction() : 0;
    return { kg, material, seasoned };
  }

  /**
   * ⭐ The boards land **where the saw is**: at a sawmill the sawyer may be
   * a valley away by now, which is the point of the rung, and a pit saw
   * stands where the log does. They are the sawyer's, and the log is
   * consumed after the board is minted from it (a board is the log's
   * owner's, read while the log is still there) and before it is placed.
   */
  private async land(
    actor: Stuff,
    log: Stuff,
    take: (() => unknown) | null,
    charge: { kg: number; material: Material | null; seasoned: number },
    boards: number,
    quarter: boolean,
  ): Promise<ActDone<SawLanded, never>> {
    const self = this as unknown as Stuff;
    if (this.isDestroyed() || log.isDestroyed()) return { ok: true, facts: { kind: 'gone' } };
    // A saw in the sawyer's own hands puts the boards at their feet, not
    // in their arms — a log's worth of boards is not a handful.
    let room = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (room === actor && MixinApi.isContainable(actor)) room = actor.getContainer();
    const landing: (Stuff & Container) | null =
      room !== null && MixinApi.isContainer(room) ? room : null;
    if (landing === null) return { ok: true, facts: { kind: 'gone' } };

    const board = await StuffApi.clone<Stuff & Containable>(
      quarter ? QUARTERED_BOARD_PATH : BOARD_PATH,
      undefined,
      { madeFrom: log },
    );
    if (take !== null) {
      await take();
    } else if (MixinApi.isStackable(log) && log.getQuantity() > 1) {
      log.setQuantity(log.getQuantity() - 1);
      await Sawmill.capture(log);
    } else {
      await StuffApi.destruct(log);
    }
    if (charge.material && MixinApi.isTangible(board)) board.setMaterial(charge.material);
    // ⭐ A board is as green as the log it came off.
    if (MixinApi.isSeasoning(board)) board.setSeasonedFraction(charge.seasoned);
    if (MixinApi.isStackable(board)) board.setQuantity(boards);
    const maker = actor.isDestroyed() ? '' : (actor.getIdentityPath() ?? '');
    if (maker && MixinApi.isCrafted(board)) board.setMaker(maker);
    // ⭐ The kerf (D18): the boards are lighter by EXACTLY what is minted —
    // whole kilograms, a heap's unit — so the log's mass is conserved.
    const dustKg = Math.round(this.kerfSawdustKg(boards, quarter));
    if (dustKg > 0 && boards > 0 && MixinApi.isTangible(board)) {
      board.setMass(Quantity.of(BOARD_KG - dustKg / boards, 'kg'));
    }
    ContainmentApi.move(board, landing);
    if (dustKg > 0) await Sawmill.landDust(dustKg, log, maker, landing);
    return { ok: true, facts: { kind: 'boards', boards, quarter } };
  }

  /**
   * Mint `kg` of sawdust where the boards fell. ⭐ It merges with the heap
   * already on the floor through the shipped stack merge, so a day at the
   * saw leaves ONE heap that grows.
   */
  private static async landDust(
    kg: number,
    log: Stuff,
    maker: string,
    landing: Stuff & Container,
  ): Promise<void> {
    try {
      const dust = await StuffApi.clone<Stuff & Containable>(SAWDUST_PATH, undefined, {
        madeFrom: log,
      });
      if (MixinApi.isStackable(dust)) dust.setQuantity(kg);
      if (maker && MixinApi.isCrafted(dust)) dust.setMaker(maker);
      ContainmentApi.move(dust, landing);
    } catch (err) {
      // ⚠ A missing sawdust row is a content gap: the boards are already
      // down and lighter, so say so loudly rather than pretend.
      console.warn('Sawmill: sawdust mint failed', err);
    }
  }

  private static async capture(host: Stuff): Promise<void> {
    try {
      await PersistableApi.captureHostOf(host);
    } catch (err) {
      console.warn('Sawmill: capture failed:', err);
    }
  }

  /**
   * Test seam — stamp the cached figure directly. ⚠ Production never
   * calls this; the flow read is the only writer.
   * @internal
   */
  public _setCachedPowerW(w: number): void {
    this._cachedW = w;
    this._cachedAtS = WorldClockApi.getNow().rawValue();
  }
}
