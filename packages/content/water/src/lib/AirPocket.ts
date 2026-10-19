/**
 * AirPocketMixin — ⭐⭐ **a pocket of air under the water** (underwater
 * D26): a diving bell, later a caisson or a dome. *A thing you can go
 * inside is a place with air* — the host is already `Atmospheric` (an
 * `ExitableVessel`) and authors `atmosphere: air`, so whoever is inside
 * breathes the pocket, not the water. This mixin adds what depth and
 * breathing do to it:
 *
 *  - **Boyle.** The pocket holds `airM3` at the surface; at depth `d` the
 *    water's weight squeezes it to `airM3 / (1 + d/10)` and the water
 *    rises inside to fill the rest — at ten metres the bell is half
 *    full of water.
 *  - **Fouling.** Every breather in it turns oxygen into CO₂ at a
 *    resting rate; the CO₂ is the pocket's atmosphere content, and the
 *    shipped displacement floor (*breathable ≠ safe*) is what finally
 *    stops them breathing. A lamp burning in it fouls it the same way.
 *  - **Refreshing.** An air barrel carried in and opened empties into
 *    the pocket and pushes the foul air out.
 *
 * While anybody is inside, the pocket keeps its own clock: every half
 * minute it fouls by what was breathed and asks each breather to look
 * again at the air. Nobody inside, no clock.
 */

import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Container } from '@saxonberg/server/mud/lib/spatial/Container';
import type { Containable } from '@saxonberg/server/mud/lib/spatial/Containable';
import type { Atmospheric } from '@saxonberg/server/mud/lib/biome/Atmospheric';
import { Quantity } from '@saxonberg/server/mud/lib/quantity';
import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { BiomeApi } from '@saxonberg/server/mud/api/biome';
import { ScheduleApi, type ScheduleHandle } from '@saxonberg/server/mud/api/schedule';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';

/** What a breathing body puts out, litres of CO₂ a game-second at rest. */
const CO2_L_PER_S = 0.2 / 60;

/** What a burning lamp puts out, litres of CO₂ a game-second. */
const LAMP_CO2_L_PER_S = 1 / 60;

/** The CO₂ material the pocket accumulates. */
const CO2_PATH = '/stuff/idea/material/gas/carbon-dioxide';

/** The pocket's clock while anybody breathes in it, real ms. */
const POCKET_TICK_MS = 30_000;

/** Public shape added by AirPocketMixin. */
export interface AirPocket {
  /** How far below the surface the pocket hangs now, m. */
  pocketDepthM(): number;
  /** The share of the pocket the water has risen into, 0..1. */
  waterlineFraction(): number;
  /** Litres of air in the pocket now (squeezed by depth). */
  airLitres(): number;
  /** Foul the pocket by `seconds` of what is breathing and burning in it. */
  foul(seconds: number): void;
  /** Push `litres` of fresh air in: the foul air goes out. */
  refresh(litres: number): void;
}

type PocketHost = Stuff & Container & Atmospheric & {
  getInteriorVolume(): Quantity<'m³'> | null;
};

export function AirPocketMixin<TBase extends MixinConstructor<PocketHost>>(Base: TBase) {
  return class AirPocketMixin extends Base implements AirPocket {
    static _mixinName: string = 'AirPocketMixin';

    static fieldMeta: FieldMeta = {
      airM3: { persistent: true, authorable: true },
    };

    /** The air the pocket holds at the surface, m³. */
    public airM3 = 1;

    /** The pocket's clock while occupied (runtime). */
    private _pocketClock: ScheduleHandle | null = null;
    /** When the pocket last fouled, game-seconds (runtime). */
    private _fouledAtS: number | null = null;

    public pocketDepthM(): number {
      const medium = BiomeApi.mediumFor(this as unknown as Stuff);
      return medium.immersed ? Math.max(0, medium.depthM) : 0;
    }

    public waterlineFraction(): number {
      return 1 - 1 / (1 + this.pocketDepthM() / 10);
    }

    public airLitres(): number {
      return (this.airM3 * 1000) / (1 + this.pocketDepthM() / 10);
    }

    /** ⭐ The pocket's volume IS its squeezed air: what the contents are a share of. */
    public getVolume(): Quantity<'m³'> | null {
      return Quantity.of(this.airLitres() / 1000, 'm³');
    }

    public foul(seconds: number): void {
      if (!(seconds > 0)) return;
      const self = this as unknown as Stuff & Container;
      let litres = 0;
      for (const c of self.getContents()) {
        if (MixinApi.isRespiration(c)) litres += CO2_L_PER_S * seconds;
        else if (MixinApi.isBurner(c) && c.isLit()) litres += LAMP_CO2_L_PER_S * seconds;
      }
      if (litres > 0) this.host().addAtmosphereContent(CO2_PATH, litres);
    }

    public refresh(litres: number): void {
      if (!(litres > 0)) return;
      // Fresh air in pushes the same volume of the mixture out.
      const share = Math.min(1, litres / Math.max(1, this.airLitres()));
      const host = this.host();
      for (const c of host.getAtmosphereContents()) {
        host.drawAtmosphereContent(c.type, c.amount * share * this.airLitres());
      }
    }

    /** Somebody came in: start the pocket's clock. */
    public onContainableAdded(thing: Stuff & Containable): void {
      (Base.prototype as { onContainableAdded?: (t: unknown) => void }).onContainableAdded?.call(this, thing);
      this.emptyOpenAir(thing);
      if (MixinApi.isRespiration(thing)) this.startClock();
    }

    /** An opened air vessel brought in pours its air into the pocket. */
    private emptyOpenAir(thing: Stuff): void {
      if (!MixinApi.isBulkable(thing)) return;
      if (MixinApi.isSealable(thing) && !thing.isOpen()) return;
      const mat = thing.getBulkMaterial('interior');
      if (mat === null || mat.getName() !== 'air') return;
      const litres = thing.getBulkAmount('interior').rawValue();
      if (!(litres > 0)) return;
      this.refresh(litres * 200);
      thing.setBulkAmount('interior', Quantity.of(0, 'L'));
    }

    private startClock(): void {
      if (this._pocketClock !== null) return;
      this._fouledAtS = this.pocketNowS();
      this._pocketClock = ScheduleApi.recurring(POCKET_TICK_MS, () => this.tick());
    }

    private tick(): void {
      const self = this as unknown as Stuff & Container;
      if (self.isDestroyed()) return this.stopClock();
      const nowS = this.pocketNowS();
      if (this._fouledAtS !== null && nowS > this._fouledAtS) this.foul(nowS - this._fouledAtS);
      this._fouledAtS = nowS;
      // Anything opened since it came in pours its air in too.
      for (const c of self.getContents()) this.emptyOpenAir(c);
      let breathers = 0;
      for (const c of self.getContents()) {
        if (!MixinApi.isRespiration(c)) continue;
        breathers += 1;
        void c.reassess().catch(() => {});
      }
      if (breathers === 0) this.stopClock();
    }

    private stopClock(): void {
      if (this._pocketClock !== null) ScheduleApi.cancel(this._pocketClock);
      this._pocketClock = null;
    }

    /** This pocket as the atmospheric host it is composed on. */
    private host(): PocketHost & { drawAtmosphereContent(type: string, litres: number): number } {
      return this as unknown as PocketHost & { drawAtmosphereContent(type: string, litres: number): number };
    }

    private pocketNowS(): number {
      try {
        return WorldClockApi.getNow().rawValue();
      } catch {
        return 0;
      }
    }
  };
}
