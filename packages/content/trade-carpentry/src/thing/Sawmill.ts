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
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
import type { FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';

/** The drainage catalogue, by path — never by import. */
const WATERCOURSE_CATALOGUE = '/system/water/idea/WatercourseCatalogue';

/** A room sibling that turns a flow into watts. */
interface PowerTake {
  generationW(flowM3S: number): number;
  getReachRef(): string;
}

/** The catalogue's reading surface, duck-typed. */
interface FlowSource {
  flowAt(reach: string, nowS: number): Promise<{ m3s: number } | null>;
}

const SawmillBase = ToolMixin(Good);

export default class Sawmill extends SawmillBase {
  static fieldMeta: FieldMeta = {
    throughputKgPerHour: { persistent: true, authorable: true },
    kgPerHourPerKw: { persistent: true, authorable: true },
    maxThroughputKgPerHour: { persistent: true, authorable: true },
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

  /** Does this rung run on water (true) or on hands (false)? */
  public isPowered(): boolean {
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
  private powerTake(): PowerTake | null {
    const self = this as unknown as Stuff;
    const room = MixinApi.isContainable(self) ? self.getContainer() : null;
    if (room === null || !MixinApi.isContainer(room)) return null;
    for (const occ of room.getContents()) {
      const duck = occ as unknown as Partial<PowerTake>;
      if (
        typeof duck.generationW === 'function' &&
        typeof duck.getReachRef === 'function'
      ) {
        return duck as PowerTake;
      }
    }
    return null;
  }

  /** Re-read the flow at most once per six game-hours. */
  private async refreshPower(take: PowerTake): Promise<void> {
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
   * Test seam — stamp the cached figure directly. ⚠ Production never
   * calls this; the flow read is the only writer.
   * @internal
   */
  public _setCachedPowerW(w: number): void {
    this._cachedW = w;
    this._cachedAtS = WorldClockApi.getNow().rawValue();
  }
}
