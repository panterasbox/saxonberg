/**
 * PercolatingMixin — ⭐ a POROUS SOLID that a liquid seeps down through,
 * carrying something out of it as it goes (sugar D3).
 *
 * Claying a sugar loaf is the first consumer: wet clay on the base of the
 * loaf lets its water creep down through the crystals over days, washing
 * the molasses film off them, so the top of the loaf comes out white while
 * the foot is still brown. The same shape is lye leaching through ash, and
 * the ash hopper adopts it when the potash build lands — which is why it
 * is kernel substrate and not the sugar pack's.
 *
 * The mechanism, and nothing else:
 *   - `receivePercolant(litres)` — liquid is put on the solid;
 *   - the REACH (`0..1`, how far down it has got) advances on read, over
 *     the host's `percolationDays()`, while there is liquid working;
 *   - each advance calls the host's `@hook onPercolated(from, to)`, which
 *     decides what the reach did to it (the loaf lifts its bands and gives
 *     up molasses);
 *   - `percolatesInto()` says where what comes out goes: the vessel below
 *     the mould the solid sits in (a cone on its pot), else the vessel the
 *     solid is placed on, else nowhere.
 *
 * What composing it CLAIMS: a solid a liquid can move through over days.
 * Not every solid is — a bar of iron is not — so it is a mixin on the
 * porous things, never on Tangible.
 */
import type { MixinConstructor, FieldMeta } from '../mixin';
import { MixinApi } from '../../api/mixin';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import type { Stuff } from '../stuff/Stuff';
import type { Bulkable } from '../bulk/Bulkable';
import { TemplatePaths } from '../paths';

const SECONDS_PER_GAME_DAY = 86_400;

/** Public shape contributed by PercolatingMixin. */
export interface Percolating {
  /** Put `litres` of liquid on the solid to work down through it. */
  receivePercolant(litres: number): void;
  /** How far the liquid has got, `0..1` (reconciled on read). */
  getReach(): number;
  /** Litres of liquid still working through it. */
  getPercolantL(): number;
  /** Where what the liquid carries out goes, or `null`. */
  percolatesInto(): (Stuff & Bulkable) | null;
  /** Integrate the percolation to now. */
  reconcilePercolation(): void;
}

export function PercolatingMixin<TBase extends MixinConstructor<Stuff>>(Base: TBase) {
  return class PercolatingMixin extends Base implements Percolating {
    static _mixinName: string = 'PercolatingMixin';

    static fieldMeta: FieldMeta = {
      percolantL: { persistent: true, runtimeState: true },
      percolationReach: { persistent: true, runtimeState: true },
      percolationStamp: { persistent: true, runtimeState: true },
    };

    /** Litres of liquid working through the solid. */
    public percolantL = 0;
    /** How far down it has reached, `0..1`. */
    public percolationReach = 0;
    /** Game-seconds of the last reconcile; `0` = idle. */
    public percolationStamp = 0;

    /** Reentry guard (TS-private; proxy-safe — never `#`). */
    private _percolating = false;

    /**
     * @hook How many game-days the liquid takes to reach the bottom. The
     * host's own (a sugar loaf's `clayDays`). Default ten.
     */
    public percolationDays(): number {
      return 10;
    }

    /**
     * @hook The reach advanced from `fromReach` to `toReach` — the host
     * decides what that did to it. Default: nothing.
     */
    public onPercolated(_fromReach: number, _toReach: number): void {
      // the host's
    }

    public receivePercolant(litres: number): void {
      if (!(litres > 0)) return;
      this.reconcilePercolation();
      this.percolantL += litres;
      const now = percolationNowSeconds();
      if (now !== null && this.percolationStamp === 0) this.percolationStamp = now;
    }

    public getReach(): number {
      this.reconcilePercolation();
      return this.percolationReach;
    }

    public getPercolantL(): number {
      return this.percolantL;
    }

    public percolatesInto(): (Stuff & Bulkable) | null {
      const self = this as unknown as Stuff;
      if (!MixinApi.isContainable(self)) return null;
      const holder = self.getContainer() as unknown as Stuff | null;
      if (holder !== null && MixinApi.isMould(holder)) {
        const below = holder.drainsInto();
        if (below !== null) return below;
      }
      const host = (self.getPlacement()?.host ?? null) as unknown as Stuff | null;
      if (host !== null && MixinApi.isBulkable(host) && host.hasInteriorBulk()) return host;
      return null;
    }

    public reconcilePercolation(): void {
      if (this._percolating) return;
      if (!(this.percolantL > 0) || this.percolationReach >= 1) return;
      const now = percolationNowSeconds();
      if (now === null) return;
      if (this.percolationStamp === 0) {
        this.percolationStamp = now;
        return;
      }
      const elapsed = now - this.percolationStamp;
      this.percolationStamp = now;
      if (!(elapsed > 0)) return;
      const days = Math.max(1e-6, this.percolationDays());
      const from = this.percolationReach;
      const to = Math.min(1, from + elapsed / (days * SECONDS_PER_GAME_DAY));
      this.percolationReach = to;
      if (to >= 1) {
        // Through: what liquid was left has come out the bottom.
        this.percolantL = 0;
        this.percolationStamp = 0;
      }
      this._percolating = true;
      try {
        this.onPercolated(from, to);
      } finally {
        this._percolating = false;
      }
    }
  };
}

/** Game-seconds now, or `null` when no world clock is running. */
function percolationNowSeconds(): number | null {
  if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) return null;
  return WorldClockApi.getNow().rawValue();
}
