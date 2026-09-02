/**
 * ChargedMixin — a **battery**: it holds energy, it spends energy on
 * use, and it leaks.
 *
 * The first of D5's three item classes. A charged item supplies **energy
 * *and* specification**, so a novice can fire a working they could never
 * cast: the maker passed the competence gate at manufacture, and the
 * user is spending stored labour. Bounded by energy density, which is
 * ordinary physics — the magic was in getting the energy in there, never
 * in the storage.
 *
 * ## The two things that make this an economy rather than a stat
 *
 * **It decays** (D7). Without that, stock grows without bound at any
 * inflow throttle and no dial can save it. With it, stock settles at
 * `S* = inflow/d`, recharging becomes a recurring *service*, and shell
 * inflation becomes harmless — so distribution can afford to be
 * generous. The arithmetic lives in {@link Charge}.
 *
 * ⚠ **Charge decay has NO far-past absence guard**, and this is the
 * single easiest thing in the build to get wrong. Metabolism has one for
 * fairness to an absent *body*; an **item must decay while nobody is
 * looking** — that is the entire basis of the equilibrium. Copying
 * metabolism's guard here would silently break wave 7. This follows
 * **husbandry**, which is documented as reconcile-on-read with no
 * far-past guard for exactly this reason.
 *
 * **The item is the endpoint** (D6), so recoil and waste heat land on
 * the *item* rather than the user. That gives the classes opposite
 * ergonomics for free: a focus that shoves recoils onto **you**; a
 * charged item's recoil lands on **the item**. Consequences that are
 * requirements, not flavour — a 100 g wand delivering 200 J recoils at
 * ~1.7 km/s and destroys itself, so **kinetic charged items must be
 * braced** (gun-shaped, recoil through a stock into the ground);
 * handheld wands are not kinetic delivery devices. A charged cooling
 * item absorbs the heat it pumps and can crack. And a spark wand is
 * *safer* than the equivalent cast, because the wand is in the circuit
 * and the user is not.
 *
 * ## Always-on is the expensive mode
 *
 * A worn item that confers its effect continuously draws continuously
 * (D8), so it flattens a charge in days where a triggered item lasts
 * months. That is a real tactical choice, and it bites hardest on
 * exactly the class most prone to inflation — because people wear rings
 * and stow wands.
 *
 * ⚠ **A depleted item still affords its verb** (D34). If a flat wand
 * stopped affording `zap`, the affordance list would become a free
 * charge meter — and charge is meant to need an instrument to read.
 * Zapping a dead wand fails audibly instead.
 *
 * **Prerequisite: `ReservedMixin`.** Charge is stored in a `Reserve`,
 * the same substrate mana, endurance and fuel use — never a bare
 * number — so a host must compose `ReservedMixin` beneath this one.
 */

import type { MixinConstructor, FieldMeta } from '../mixin';
import type { CommandContributions } from '../../api/command';
import { StuffApi } from '../../api/stuff';
import { WorldClockApi } from '../../api/worldclock';
import { AppApi } from '../../api/app';
import { ExecutionContextApi } from '../../api/execution-context';
import { MagicApi } from '../../api/magic';
import { MixinApi } from '../../api/mixin';
import { MessageApi } from '../../api/message';
import { Mml } from '../../api/mml';
import { AppSettingKeys } from '../config/AppSettings';
import { Quantity } from '../quantity';
import { Reserve, type Reserved } from '../reserve';
import { TemplatePaths } from '../paths';
import type { Stuff } from '../stuff/Stuff';
import type { Slotted } from '../slot/Slotted';
import type { Slottable } from '../slot/Slottable';
import { EffectContexts } from './EffectContext';
import { Charge } from './Charge';

/** The topic a worn host narrates its own wake/dry-click on (self-only, like a potion). */
const WORN_TOPIC = 'act.deed';

/**
 * Charge dials with seeded-literal fallbacks (pre-warm / test safe).
 * **Every rate carries its unit in its name** — the 12× game-time factor
 * is where a dishonest number would hide.
 */
export const CHARGE_DEFAULTS = {
  /**
   * Idle self-discharge, per GAME second. `1e-7` loses roughly a third
   * of a full charge over a game-year — slow enough that a stowed wand
   * is still useful next season, fast enough that `S* = inflow/d`
   * converges to something finite. *Calibrate at launch.*
   */
  DECAY_PER_GAME_SEC: 1e-7,
  /**
   * What an always-on item draws just staying on, in watts.
   *
   * Sized against D8's claim, which is a *ratio* rather than a number:
   * an always-on wearable **flattens a charge in days where a triggered
   * item lasts months**. At 5 W a 900 kJ shell runs about 25 game-days
   * of continuous draw, against an idle half-life near 80 game-days —
   * so always-on is genuinely the expensive mode and not a rounding
   * difference. *Calibrate at launch.*
   *
   * (5 W held continuously is real power — a ring drawing it would be
   * noticeably warm. That is not an embarrassment: the item is its own
   * endpoint (D6), so it absorbs that heat, and a wearable that runs
   * hot is the honest consequence rather than an oversight.)
   */
  STANDBY_WATTS: 5,
  /** Default shell capacity (kJ) when a template authors none. */
  CAPACITY_KJ: 500,
} as const;

/** Numeric AppSetting read, falling back to the seeded literal. */
function dial(key: string, fallback: number): number {
  try {
    const raw = AppApi.setting(key);
    if (raw === '' || raw == null) return fallback;
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

export interface Charged {
  /** Install the charge reserve from the authored capacity (idempotent). */
  installChargeReserve(): void;
  /**
   * **Reconcile-on-read**: integrate self-discharge (and standby draw
   * while active) since the last touch. No far-past guard — an item
   * decays whether or not anyone is watching.
   */
  reconcileCharge(): void;
  /** The charge reserve, freshly reconciled. `null` before install. */
  getCharge(): Reserve | null;
  /** Stored energy in kJ, freshly reconciled. */
  getStoredKJ(): number;
  /** Capacity in kJ. */
  getCapacityKJ(): number;
  setCapacityKJ(kJ: number): void;
  /** current/capacity in [0,1]. */
  getChargeFraction(): number;
  /** Is there nothing left? A depleted item still affords its verb. */
  isDepleted(): boolean;
  /**
   * Spend `kJ`. Returns `false` — **without spending anything** — when
   * the charge cannot cover it, so a partial firing is impossible.
   */
  spendCharge(kJ: number): boolean;
  /** Take `kJ` in, clamped at capacity. Returns what was actually taken. */
  receiveCharge(kJ: number): number;
  /** Does this item hold its effect up continuously while worn? */
  isAlwaysOn(): boolean;
  setAlwaysOn(value: boolean): void;
  /** Is the always-on draw currently running? */
  isDrawActive(): boolean;
  setDrawActive(value: boolean): void;
  /**
   * **Wearing sustains** (D5). An `alwaysOn` host that lands in a body
   * slot discharges its bound working as a `sustained` Condition on the
   * wearer (`sustainedBy` this host) and starts the standby draw.
   * Idempotent across multi-slot claims and persistence restore (the
   * Condition persisted with the wearer; `drawActive` with the host).
   * Fires from the one `Slotted.occupy` chokepoint — every path.
   */
  onSlotOccupied(host: Stuff & Slotted, slotName: string): void;
  /**
   * **Releasing releases.** When the last slot of the host lets go, every
   * sustained effect this host holds up on it is released and the draw
   * stops. A cursed host never reaches here — the release gate refuses
   * upstream (`Blessable.tryRelease`) and the draw continues.
   */
  onSlotReleased(host: Stuff & Slotted, slotName: string): void;
  /** Release every sustained effect this host holds up on `host`, and stop drawing. */
  releaseHeld(host: Stuff): void;

  // ---------- storage (public for the Hydrator) ----------
  capacityKJ: number;
  alwaysOn: boolean;
  drawActive: boolean;
  chargeClockStamp: number;
}

export function ChargedMixin<TBase extends MixinConstructor>(Base: TBase) {
  return class ChargedMixin extends Base implements Charged {
    static _mixinName = 'ChargedMixin';

    /**
     * **The capability declares the verb; the item never does** (D23).
     * `zap` is written once here and every charged item gets it — a
     * wand today, a braced kinetic stave once ranged lands, a mounted
     * emplacement after. Content authors never declare a use-verb.
     *
     * ⚠ It must not vary with anything hidden (D34): no per-class verb
     * (a fire wand and a lightning wand afford the SAME `zap`, or the
     * list identifies them), and a **depleted** item keeps affording it
     * (or the list becomes a free charge meter).
     */
    // The views are the arcana pack's (D8) — the ratified D3 exception:
    // the mixin that declares the capability names its verb's view,
    // wherever the view lives (see `Caster.CASTING_VERB_YAMLS`).
    static commandContributions: CommandContributions = {
      self: [],
      peers: ['system/arcana/cmd/magic/zap.yaml', 'system/arcana/cmd/magic/recharge.yaml'],
      environment: ['system/arcana/cmd/magic/zap.yaml', 'system/arcana/cmd/magic/recharge.yaml'],
    };

    static fieldMeta: FieldMeta = {
      capacityKJ: { persistent: true, authorable: true, spoiler: 1 },
      alwaysOn: { persistent: true, authorable: true },
      drawActive: { persistent: true, runtimeState: true },
      chargeClockStamp: { persistent: true, runtimeState: true },
    };

    /** Shell capacity, kJ. */
    public capacityKJ: number = CHARGE_DEFAULTS.CAPACITY_KJ;

    /** Does it hold its effect up continuously (a ring), or fire (a wand)? */
    public alwaysOn: boolean = false;

    /** Is the continuous draw running right now (worn + active)? */
    public drawActive: boolean = false;

    /** Last charge reconcile, in-session game-seconds. 0 = unseeded. */
    public chargeClockStamp: number = 0;

    private _reconcilingCharge = false;

    public installChargeReserve(): void {
      const reserved = this as unknown as Reserved;
      if (reserved.hasReserve(Charge.RESERVE_KEY)) return;
      reserved.setReserve(
        new Reserve(
          Charge.RESERVE_KEY,
          Quantity.of(this.capacityKJ, Charge.UNIT),
          Quantity.of(this.capacityKJ, Charge.UNIT),
          'arcane',
          null,
        ),
      );
    }

    public reconcileCharge(): void {
      if (this._reconcilingCharge) return;
      this.installChargeReserve();

      // Idle when no world clock runs (pre-boot / unit fixtures) — the
      // metabolism idiom.
      if (!StuffApi.findByTemplatePath(TemplatePaths.worldClockRegistry)) {
        return;
      }
      const nowS = WorldClockApi.getNow().rawValue();

      // First touch: seed the stamp, integrate nothing.
      if (this.chargeClockStamp === 0) {
        this.chargeClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.chargeClockStamp;
      if (elapsed <= 0) {
        this.chargeClockStamp = nowS;
        return;
      }

      // ⚠ NO far-past guard, and NO linkdead freeze. An item is not a
      // body: it decays while nobody is looking, and that is precisely
      // what makes `S* = inflow/d` true. Following husbandry, NOT
      // metabolism. Adding a guard here silently breaks distribution.
      this._reconcilingCharge = true;
      try {
        const reserved = this as unknown as Reserved;
        const pool = reserved.getReserve(Charge.RESERVE_KEY);
        if (pool) {
          const stored = pool.current.rawValue();
          const decayRate = dial(
            AppSettingKeys.magicChargeDecayPerGameSec,
            CHARGE_DEFAULTS.DECAY_PER_GAME_SEC,
          );
          let loss = Charge.lossOver(stored, elapsed, decayRate);

          // Standby draw — the cost of HOLDING something up, separate
          // from the leak, and two orders of magnitude bigger. Only
          // while the effect is actually running.
          if (this.alwaysOn && this.drawActive) {
            loss += Charge.standbyDraw(
              dial(
                AppSettingKeys.magicChargeStandbyWatts,
                CHARGE_DEFAULTS.STANDBY_WATTS,
              ),
              elapsed,
              WorldClockApi.getScale(),
            );
          }
          if (loss > 0) {
            reserved.adjustReserve(
              Charge.RESERVE_KEY,
              Quantity.of(-Math.min(loss, stored), Charge.UNIT),
            );
          }
          // Run flat: the standby draw has a consequence. The moment the
          // pool reaches zero, whatever this host was holding up on its
          // wearer is released — not at the next term's renewal
          // (`Vitals.renewSustained` refuses a depleted host there too;
          // this makes it immediate on the next read).
          const after = reserved.getReserve(Charge.RESERVE_KEY);
          if (this.drawActive && (after?.current.rawValue() ?? 0) <= 0) {
            const wearer = (this as unknown as Slottable).getOccupiedHost?.() ?? null;
            if (wearer) this.releaseHeld(wearer as unknown as Stuff);
            else this.drawActive = false;
          }
        }
        this.chargeClockStamp = nowS;
      } finally {
        this._reconcilingCharge = false;
      }
    }

    public onSlotOccupied(host: Stuff & Slotted, _slotName: string): void {
      // Not always-on: a triggered host you wear is a wand you wear.
      // Already drawing: a second slot of a multi-slot claim, or a
      // persistence restore — the Condition persisted with the wearer.
      if (!this.alwaysOn || this.drawActive) return;
      // A host with nothing to sustain on (a stand, a hook) is storage.
      if (!MixinApi.isVitals(host)) return;
      // No command giver = no actor to discharge AS (a restore, a
      // programmatic re-slot): the wearer's persisted Condition is the
      // truth and nothing re-fires.
      if (!ExecutionContextApi.getCurrentCommandGiver()) return;
      // The witness is synchronous; the discharge is not. `discharge`
      // reads the actor from the execution context (the wearer IS the
      // command giver inside `wear`) and stamps `sustainedBy` with this
      // host because it is the effect's source.
      void MagicApi.discharge(this as unknown as Stuff, host as unknown as Stuff).then(
        (out) => {
          if (out.ok) {
            this.setDrawActive(true);
            return;
          }
          // A flat ring: the dry click, and it stays off.
          if (out.refusal) {
            MessageApi.scene(host as unknown as Stuff)
              .topic(WORN_TOPIC)
              .toSelf(Mml.text(out.refusal))
              .send();
          }
        },
        () => {
          /* a throwing discharge never breaks the slot claim */
        },
      );
    }

    public onSlotReleased(host: Stuff & Slotted, _slotName: string): void {
      if (!this.alwaysOn) return;
      // Only when no other slot of the same host still holds this item
      // (a two-slot claim releases both before the effect lets go).
      const stillOn = (this as unknown as Stuff & Slottable)
        .occupiedSlots()
        .get(host);
      if (stillOn && stillOn.length > 0) return;
      this.releaseHeld(host as unknown as Stuff);
    }

    public releaseHeld(host: Stuff): void {
      const me = EffectContexts.durableIdOf(this as unknown as Stuff);
      if (MixinApi.isVitals(host)) {
        for (const c of [...host.getConditions()]) {
          if (c.kind === 'sustained' && c.sustainedBy === me) {
            host.releaseSustained(c);
          }
        }
      }
      if (this.drawActive) this.setDrawActive(false);
    }

    public getCharge(): Reserve | null {
      this.reconcileCharge();
      return (
        (this as unknown as Reserved).getReserve(Charge.RESERVE_KEY) ?? null
      );
    }

    public getStoredKJ(): number {
      return this.getCharge()?.current.rawValue() ?? 0;
    }

    public getCapacityKJ(): number {
      return this.capacityKJ;
    }

    public setCapacityKJ(kJ: number): void {
      const n = Number(kJ);
      if (!Number.isFinite(n) || n <= 0) {
        throw new RangeError(
          `capacityKJ: must be a positive number, got '${String(kJ)}'`,
        );
      }
      this.capacityKJ = n;
      // Re-seat the reserve so an authored capacity change is honoured
      // rather than silently ignored on an already-installed shell.
      const reserved = this as unknown as Reserved;
      const pool = reserved.getReserve(Charge.RESERVE_KEY);
      if (pool) {
        reserved.setReserve(
          new Reserve(
            Charge.RESERVE_KEY,
            Quantity.of(n, Charge.UNIT),
            Quantity.of(Math.min(pool.current.rawValue(), n), Charge.UNIT),
            pool.theme,
            pool.floorEffect,
          ),
        );
      }
    }

    public getChargeFraction(): number {
      const pool = this.getCharge();
      if (!pool) return 0;
      const cap = pool.capacity.rawValue();
      return cap > 0 ? pool.current.rawValue() / cap : 0;
    }

    public isDepleted(): boolean {
      return this.getStoredKJ() <= 0;
    }

    public spendCharge(kJ: number): boolean {
      const want = Number(kJ);
      if (!Number.isFinite(want) || want < 0) return false;
      if (want === 0) return true;
      const pool = this.getCharge();
      if (!pool || pool.current.rawValue() < want) return false;
      // All or nothing: a half-powered firing is not a thing, and
      // partial spends would make the depleted case unreportable.
      (this as unknown as Reserved).adjustReserve(
        Charge.RESERVE_KEY,
        Quantity.of(-want, Charge.UNIT),
      );
      return true;
    }

    public receiveCharge(kJ: number): number {
      const want = Number(kJ);
      if (!Number.isFinite(want) || want <= 0) return 0;
      const pool = this.getCharge();
      if (!pool) return 0;
      const room = pool.capacity.rawValue() - pool.current.rawValue();
      const taken = Math.min(want, room);
      if (taken <= 0) return 0;
      (this as unknown as Reserved).adjustReserve(
        Charge.RESERVE_KEY,
        Quantity.of(taken, Charge.UNIT),
      );
      return taken;
    }

    public isAlwaysOn(): boolean {
      return this.alwaysOn;
    }

    public setAlwaysOn(value: boolean): void {
      this.alwaysOn = value === true;
    }

    public isDrawActive(): boolean {
      return this.drawActive;
    }

    public setDrawActive(value: boolean): void {
      // Reconcile BEFORE flipping, so the interval just ended is billed
      // at the rate that was actually in force for it.
      this.reconcileCharge();
      this.drawActive = value === true;
    }
  };
}
