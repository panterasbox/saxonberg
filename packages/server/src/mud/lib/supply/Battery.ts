/**
 * BatteryMixin — this thing runs on stored electrical energy, spends it,
 * and takes it from a powered thing it rests on (aether-devices D5, D6).
 *
 * The stock is a `battery` reserve in **watt-hours** on the shared
 * `Reserve` (`ReservedMixin`), so it rides the host's capture like every
 * other reserve. Above that it is its own law, and deliberately NOT
 * `ChargedMixin`'s: no self-discharge worth modeling, nothing drawn while
 * its body is offline, denominated in Wh, and cheap and easy to fill —
 * keeping a phone charged is not where this game puts a barrier.
 *
 * **When it moves.** Nothing runs on a timer. The battery is *settled* —
 * brought up to the present from its stamp — by whoever reads it for an
 * act, and the stamp is reset:
 *
 * - **draw**: `standbyW` while switched on and drawn by a live body. The
 *   draw is named by the caller (`settleBattery(now, drawer)`); a new
 *   drawer starts a fresh interval with no back-charge, so a body that was
 *   offline drew nothing by construction — no guard, no reverse search.
 * - **charge**: when the thing it rests in or on answers the kernel
 *   `Powered` shape, `min(acceptW, availablePowerW)` × the powered seconds
 *   since the stamp (`poweredTrajectory`), capped at capacity. No online
 *   bound here: a phone left on a charger fills while its owner is away.
 * - **use**: `spendUse()` — `useWh` per message sent or read through it.
 *
 * ⚠ A battery arriving from nowhere (a restore) keeps its stamp, so the
 * next settle on a charger charges across the whole absence.
 *
 * Arithmetic, at 12× game time: 12 Wh ÷ 0.10 W = 120 game hours = five
 * game days = ten real hours of standby. Numbers are a grain (authored on
 * the row).
 */

import type { FieldMeta, MixinConstructor } from '../mixin';
import type { Stuff } from '../stuff/Stuff';
import type { Reserved } from '../reserve/Reserved';
import { Reserve } from '../reserve/Reserved';
import { Quantity } from '../quantity';
import { MixinApi } from '../../api/mixin';
import { WorldClockApi } from '../../api/worldclock';
import type { MarkupAugmenter } from '../../api/mml';

/** The reserve key a battery keeps its charge under. */
const BATTERY = 'battery';
/** Seconds in an hour — watts × seconds ÷ this = watt-hours. */
const S_PER_H = 3600;

/**
 * `look phone` — the charge (D13): a percent while it runs, *dead* when
 * empty; nothing while it is switched off (the screen is dark).
 */
function chargeLineAugmenter(
  text: string,
  host: Stuff,
  _viewer: Stuff,
  opts?: { filter?: readonly string[] },
): string {
  if (opts?.filter && !opts.filter.includes('vision')) return text;
  if (host.isDestroyed() || !MixinApi.isBattery(host)) return text;
  if (MixinApi.isSwitchable(host) && !host.isOn()) return text;
  const nowS = Math.floor(WorldClockApi.getNow().value);
  const line = host.isDead(nowS)
    ? 'Its battery is dead.'
    : `Its battery reads ${Math.round(host.chargeFraction(nowS) * 100)}%.`;
  return text && text.length > 0 ? `${text}\n\n${line}` : line;
}

export interface Battery {
  /** The charge now, in Wh — settled up to `nowS` for `drawer`, without writing. */
  chargeWh(nowS: number, drawer?: string | null): number;
  /** The charge now as a fraction of capacity, 0…1. */
  chargeFraction(nowS: number, drawer?: string | null): number;
  /** Is the battery empty? */
  isDead(nowS: number, drawer?: string | null): boolean;
  /**
   * Bring the stored charge up to `nowS` and reset the stamp. `drawer` is
   * the live body drawing standby (null: nothing is drawing). A drawer
   * different from the last one starts a fresh interval. `restingOn`
   * names what it rested on since the stamp when that is no longer where
   * it is (a phone just lifted off its charger); default: where it is.
   */
  settleBattery(nowS: number, drawer: string | null, restingOn?: Stuff | null): void;
  /** Spend one use's energy (a message sent or read). Settles first. */
  spendUse(nowS: number, drawer: string | null): void;
  /** Set the stored charge as a fraction of capacity (staging); `nowS` defaults to now. */
  setChargeFraction(fraction: number, nowS?: number): void;
  /** Capacity in Wh. */
  getCapacityWh(): number;
  /**
   * Settle across what it rested on BEFORE the move just made (a phone
   * lifted off its charger keeps what it took), then remember what it
   * rests on now. Called by the host's `onMoved`.
   */
  settleAfterMove(nowS: number): void;
}

export function BatteryMixin<TBase extends MixinConstructor<Stuff & Reserved>>(Base: TBase) {
  return class BatteryMixin extends Base implements Battery {
    static _mixinName = 'BatteryMixin';

    static markupAugmenters: MarkupAugmenter[] = [chargeLineAugmenter];

    static fieldMeta: FieldMeta = {
      batteryStampS: { persistent: true },
      // Authored on the row — declared so the template phase applies them.
      capacityWh: { persistent: true },
      standbyW: { persistent: true },
      useWh: { persistent: true },
      acceptW: { persistent: true },
    };

    /** Authored: stored energy when full, Wh. */
    capacityWh = 0;
    /** Authored: draw while running, W. */
    standbyW = 0;
    /** Authored: energy per message sent or read, Wh. */
    useWh = 0;
    /** Authored: the most it will take from a charger, W. */
    acceptW = 0;

    /** Persisted: game second the stored charge is true as of. `null`: never settled. */
    batteryStampS: number | null = null;

    /** Runtime: who drew standby at the last settle (a new drawer is a fresh interval). */
    private _drawer: string | null = null;

    /**
     * Runtime: what it rested on at the last settle — read across a move.
     * `undefined` until this instance has settled once: a battery restored
     * from its record does not know, and must not charge an absence to
     * nothing (D6 — restored onto a charger, it charges across it).
     */
    private _restedOn: Stuff | null | undefined = undefined;

    getCapacityWh(): number {
      return this.capacityWh;
    }

    /** The template sets capacity; a fresh battery is born full. */
    setCapacityWh(value: number): void {
      this.capacityWh = value;
      if (!this.reserved().hasReserve(BATTERY)) this.writeStored(value);
    }

    chargeWh(nowS: number, drawer: string | null = this._drawer): number {
      return this.settled(nowS, drawer);
    }

    chargeFraction(nowS: number, drawer: string | null = this._drawer): number {
      const cap = this.capacityWh;
      return cap > 0 ? this.settled(nowS, drawer) / cap : 0;
    }

    isDead(nowS: number, drawer: string | null = this._drawer): boolean {
      return this.settled(nowS, drawer) <= 0;
    }

    settleBattery(nowS: number, drawer: string | null, restingOn?: Stuff | null): void {
      // ⛔ Never settle from limbo. A battery, or what it rests on, that is
      // between places (a room's reset re-seating its charger, a restore
      // standing it up) cannot say what the gap gave: the charger read
      // off-grid with no room under it, and the settle billed two powered
      // hours at nothing and stamped them gone (drive, step 13). Keep the
      // stamp; the settle after it lands charges the whole gap.
      const under = restingOn !== undefined ? restingOn : this.restingOn();
      if (this.inLimbo(this as unknown as Stuff) || (under !== null && this.inLimbo(under))) return;
      this.writeStored(this.settled(nowS, drawer, restingOn));
      this.batteryStampS = nowS;
      this._drawer = drawer;
      this._restedOn = this.restingOn();
    }

    /** Between places: a containable with no container. */
    private inLimbo(thing: Stuff): boolean {
      return MixinApi.isContainable(thing) && thing.getContainer() === null;
    }

    settleAfterMove(nowS: number): void {
      if (this._restedOn === undefined) {
        // Stood up from its record (or freshly made): keep the stamp, learn
        // what it rests on now — the next settle charges the whole interval.
        this._restedOn = this.restingOn();
        return;
      }
      this.settleBattery(nowS, null, this._restedOn);
    }

    /**
     * What it rests on: the thing it was set ON (a charger — the shipped
     * placement model keeps a thing put on a surface in the room, with the
     * surface as its placement host), else its container.
     */
    private restingOn(): Stuff | null {
      const host = this as unknown as Stuff;
      if (!MixinApi.isContainable(host)) return null;
      return host.getPlacement()?.host ?? host.getContainer();
    }

    spendUse(nowS: number, drawer: string | null): void {
      this.settleBattery(nowS, drawer);
      this.writeStored(this.stored() - this.useWh);
    }

    setChargeFraction(
      fraction: number,
      nowS: number = Math.floor(WorldClockApi.getNow().value),
    ): void {
      const f = Math.max(0, Math.min(1, fraction));
      this.writeStored(this.capacityWh * f);
      this.batteryStampS = nowS;
    }

    /** The charge at `nowS` for `drawer`, from the stored charge and the stamp. Pure. */
    private settled(nowS: number, drawer: string | null, restingOn?: Stuff | null): number {
      const from = this.batteryStampS;
      let charge = this.stored();
      if (from === null || !(nowS > from)) return charge;
      // Charge: from the thing it rests in or on, when that is powered.
      const under = restingOn !== undefined ? restingOn : this.restingOn();
      // ⚠ The gap is read off the supply's TRAJECTORY, never off what it
      // reads at the visit (the `Powered` contract): a grid read dark for a
      // moment at the settle billed two powered hours on a charger at zero
      // (drive, step 13). It takes `acceptW` while supplied — what a supply
      // could deliver in the past is not knowable, and no supply a battery
      // rests on today offers less than a phone accepts.
      if (under !== null && MixinApi.isPowered(under) && this.acceptW > 0) {
        const poweredS = under.poweredTrajectory(from, nowS).integrate((v) => v, 2);
        charge += (this.acceptW * poweredS) / S_PER_H;
      }
      // Draw: only by the same live body that drew at the stamp.
      if (drawer !== null && drawer === this._drawer && this.isRunning()) {
        charge -= (this.standbyW * (nowS - from)) / S_PER_H;
      }
      return Math.max(0, Math.min(this.capacityWh, charge));
    }

    /** Is the host switched on (a switchless host always runs)? */
    private isRunning(): boolean {
      const host = this as unknown as Stuff;
      return MixinApi.isSwitchable(host) ? host.isOn() : true;
    }

    /** The host's reserves — `ReservedMixin` is composed beneath (the type bound). */
    private reserved(): Reserved {
      return this as unknown as Reserved;
    }

    private stored(): number {
      return this.reserved().getReserve(BATTERY)?.current.rawValue() ?? this.capacityWh;
    }

    private writeStored(wh: number): void {
      const cap = this.capacityWh;
      // ⚠ No capacity yet means no battery yet: the template phase may run
      // another setter (`on`, which settles) before `capacityWh`, and an
      // empty reserve written then would leave a new phone born dead.
      if (!(cap > 0)) return;
      this.reserved().setReserve(
        new Reserve(
          BATTERY,
          Quantity.of(cap, 'Wh'),
          Quantity.of(Math.max(0, Math.min(cap, wh)), 'Wh'),
          'electric',
          null,
        ),
      );
    }
  };
}
