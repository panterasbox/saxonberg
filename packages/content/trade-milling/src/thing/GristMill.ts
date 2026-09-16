/**
 * GristMill — the milling instrument. **One class, two rungs, both rows.**
 *
 * A hand quern and a water mill are the same object with different
 * numbers: the quern authors a throughput and no power coefficient, the
 * mill authors a power coefficient and no throughput of its own. That is
 * the instrument-affords-the-verb pattern — the capital ladder is rows,
 * never a class each, because a second venue should need zero code.
 *
 * ## ⭐⭐ The power read, and why it does not import the water pack
 *
 * `availablePowerW()` looks for a **room sibling that answers
 * `generationW(flow)` and `getReachRef()`**, resolves the drainage
 * catalogue by template path, and asks it what is passing. No import, no
 * dependency in `package.json`, no `WATERWORK_CLASSES` edit — the
 * `FordExit` rule, which is how two packs meet over a shape with neither
 * knowing the other exists.
 *
 * ⚠ **A mill with no wheel grinds at zero and says so.** It does not
 * quietly fall back to hand speed: a water mill with no river is a
 * building, and the honest failure is the one a player can act on.
 *
 * ⭐ And because the flow is seasonal, **the mill's rate is seasonal**.
 * Nobody authored that; it is `ρ·g·Δh·Q·η` with a `Q` that dries up in
 * August.
 */

import Thing from '@saxonberg/server/mud/platform/thing/Thing';
import { DetailedMixin } from '@saxonberg/server/mud/lib/description/Detailed';
import { ToolMixin } from '@saxonberg/server/mud/lib/craft/Tooled';
import { ComminutingMixin } from '@saxonberg/server/mud/lib/craft/Comminuting';
import type { CommandContributions } from '@saxonberg/server/mud/api/command';
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

const GristMillBase = ComminutingMixin(ToolMixin(DetailedMixin(Thing)));

export default class GristMill extends GristMillBase {
  /**
   * ⭐ The instrument affords the verb — a quern in your hands or a mill
   * in the room is what makes `mill` sayable. A static on the class,
   * never a row key: a row's `commandContributions:` is dead silently.
   */
  static commandContributions: CommandContributions = {
    self: [],
    peers: ['trade/milling/cmd/milling/mill.yaml'],
    environment: ['trade/milling/cmd/milling/mill.yaml'],
  };

  /**
   * ⚠ Memoised per weather segment, the `FordExit` shape: `flowAt` is
   * async and this read is sync, so the figure is refreshed off-band and
   * answered from the cache. A mill asked before the first refresh
   * answers 0 — which reads as "not turning yet", not as a lie.
   */
  private _cachedW = 0;
  private _cachedAtS = -1;
  private _refreshing = false;

  /** Watts reaching the stones right now. 0 = nothing is driving them. */
  public availablePowerW(): number {
    const take = this.powerTake();
    if (take === null) return 0;
    void this.refreshPower(take);
    return this._cachedW;
  }

  /** The room sibling that makes the power, if there is one. */
  private powerTake(): PowerTake | null {
    const self = this as unknown as Stuff;
    const room = (self as unknown as { getContainer(): Stuff | null })
      .getContainer();
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
      // No water pack, no catalogue, no reading — a building, not a mill.
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
