/**
 * ManaPoweredMixin — **the wall socket.**
 *
 * A device that runs on mana and does not care where the mana came
 * from. That indifference is the whole design: the lamp on a residence
 * wall and the Teleport Authority's brass pillar compose the same
 * mixin, and neither one holds a branch on which supply answered.
 *
 * ## The three supplies, and the one place they are resolved
 *
 * | supply | the act | who can |
 * |---|---|---|
 * | a **cell** in the bay | `put cell in <device>` | anyone |
 * | a **mains** line | authored `mainsRef` | n/a — the city's |
 * | a **person** in contact | `recharge <device>`, or a ride's BYO flag | casters only, structurally |
 *
 * ⭐ Source resolution happens **exactly once**, in
 * {@link ManaPowered.resolveSupply}, and every other method calls it.
 * That is how "the device holds no branch on which answered" is
 * satisfied honestly rather than by assertion: there is one branch, and
 * it is the one whose job is to answer that question.
 *
 * ## Why the mixin, and not a terminal feature
 *
 * A capability that only one class composes is a method on that class
 * wearing a costume. This one is composed by a lamp, a terminal, and
 * anything anybody authors next — and it had to be provable BEFORE the
 * terminal composed it, which is why the domestic device ships first.
 *
 * ## Where it lives
 *
 * `/system/arcana/lib/` — a pack's own substrate, inherited and never
 * instanced (the TPA reform's P2a amended `lint:instanceable` to make
 * this representable). ⭐ The test for the kernel instead is
 * **whether its composers have a common pack ancestor**: arcana's lamp
 * and tpa's terminal do, because tpa depends on arcana anyway — it is
 * magic. A third pack wanting mana-powered devices *without* depending
 * on arcana is the signal to promote it, and that is a review question
 * rather than a lint.
 *
 * ⚠ **It deliberately does NOT implement `SupplyReporting`.** The
 * vocabulary is imported; the reporting interface is not.
 * `AnalyzeWaterController` reads that shape STRUCTURALLY, so
 * implementing it here would make `analyze water <terminal>` work by
 * accident — a free win and an embarrassing verb. The light carries the
 * condition, the long description carries it in words, and the board
 * carries the price; a method whose only consumer is a verb nobody is
 * adding is dead surface.
 */

import { MixinApi } from '@saxonberg/server/mud/api/mixin';
import { StuffApi } from '@saxonberg/server/mud/api/stuff';
import { WorldClockApi } from '@saxonberg/server/mud/api/worldclock';
import { Charge } from '@saxonberg/server/mud/lib/magic/Charge';
import {
  SUPPLY_STATE_PRECEDENCE,
  type SupplyState,
} from '@saxonberg/server/mud/lib/supply/SupplyState';
import type { MixinConstructor, FieldMeta } from '@saxonberg/server/mud/lib/mixin';
import type { Stuff } from '@saxonberg/server/mud/lib/stuff/Stuff';
import type { Charged } from '@saxonberg/server/mud/lib/magic/Charged';
import type { Slotted } from '@saxonberg/server/mud/lib/slot/Slotted';

/** The mixin marker — a pack cannot add to the kernel `Mixins` registry. */
export const MANA_POWERED_MIXIN = 'ManaPoweredMixin';

/** The slot every mana-powered device names its cell bay. */
export const BATTERY_SLOT = 'battery';

/**
 * **What SHAPE of supply the device needs**, which is Kell's own
 * distinction and not a synonym for "how much".
 *
 * - `impulse` — it draws per use and runs off a stored charge. A wand,
 *   a terminal, a lamp you switch.
 * - `binding` — it holds a working up continuously and wants a supply
 *   that does not stop.
 */
export type DrawMode = 'impulse' | 'binding';

/**
 * The structural shape a supply answers — **never a class, never an
 * import.** The device asks three questions of whatever is on the other
 * end and does not care what it is.
 */
export interface ManaSupply {
  /** What it is, in the player's words ("a spent cell", "the city line"). */
  label(): string;
  /** How much it could give right now, in τ. */
  availableTau(): number;
  /** Move up to `tau` into `into`; returns what actually arrived. */
  feed(into: Stuff, tau: number): Promise<number>;
  /** Its own trouble, or `null` when it is working. SYNC — see below. */
  supplyState(): SupplyState | null;
}

/** Which supply answered — for the FARE, never for the draw. */
export type SupplyMode = 'cell' | 'main' | 'contact' | 'none';

export interface ManaPowered {
  getDrawMode(): DrawMode;
  setDrawMode(v: DrawMode): void;

  /** The linked mains line's template path, or `''`. */
  getMainsRef(): string;
  setMainsRef(v: string): void;

  /**
   * **Below this, the working lapses — the device is not itself any
   * more.** Authored per row; `0` means the device is purely impulse
   * and has no floor to fall below.
   */
  getArmingFloorTau(): number;
  setArmingFloorTau(v: number): void;
  /** Is there enough in it to BE what it is? */
  isArmed(): boolean;

  /** Can this device spend `tau` right now, topping up first if it must? */
  canDraw(tau: number): Promise<boolean>;
  /** All-or-nothing, the shipped `spendCharge` contract. */
  draw(tau: number): Promise<boolean>;

  /**
   * **The STOCK question** — precedence-ordered, `null` when working.
   * What `getStatus()` reads, and what the light shows.
   */
  supplyState(): SupplyState | null;
  /**
   * **The TRANSACTION question** — can it cover THIS draw? A separate
   * read because the stock question knows no amount.
   */
  stateForDraw(tau: number): SupplyState | null;

  /** Which of the three answered — for the FARE, never for the draw. */
  getSupplyMode(): SupplyMode;

  /** Reconcile the standing draw (reconcile-on-read, no clock). */
  reconcileStandby(): void;

  /**
   * Stand the linked mains up, if this device names one. A host calls
   * it once at `postRegister`.
   */
  armSupply(): Promise<void>;

  // ---------- storage (public for the Hydrator) ----------
  drawMode: DrawMode;
  mainsRef: string;
  armingFloorTau: number;
  standbyWatts: number;
  standbyClockStamp: number;
}

/**
 * ⭐ `ManaPoweredMixin` requires `Slotted + Charged` on its base — the
 * `ChargedMixin requires ReservedMixin` precedent, stated in the type
 * rather than in a comment nobody reads.
 */
export function ManaPoweredMixin<
  TBase extends MixinConstructor<Stuff & Slotted & Charged>,
>(Base: TBase) {
  return class ManaPoweredMixin extends Base implements ManaPowered {
    static _mixinName = MANA_POWERED_MIXIN;

    static fieldMeta: FieldMeta = {
      drawMode: { persistent: true, authorable: true },
      mainsRef: { persistent: true, authorable: true },
      armingFloorTau: { persistent: true, authorable: true },
      standbyWatts: { persistent: true, authorable: true },
      standbyClockStamp: { persistent: true, runtimeState: true },
    };

    /** Which supply SHAPE this device needs. */
    public drawMode: DrawMode = 'impulse';

    /** The mains line it is wired to, if any (a template path). */
    public mainsRef: string = '';

    /**
     * The floor below which the working lapses. ⭐ A separate fact from
     * {@link drawMode}: a wall lamp authors `0` and is purely impulse; a
     * terminal authors a real one and is BOTH. Nothing about
     * `drawMode`'s meaning changes.
     */
    public armingFloorTau: number = 0;

    /** What it spends just staying on, in watts. Real power. */
    public standbyWatts: number = 0;

    /** Last standby reconcile, in-session game-seconds. 0 = unseeded. */
    public standbyClockStamp: number = 0;

    private _reconcilingStandby = false;

    /**
     * `this`, typed through the base constraint this mixin declares.
     * A class-factory mixin's `this` is the generic base, so the
     * constraint that makes `Slotted + Charged` a compile-time
     * requirement does not reach the body — the same cast
     * `ChargedMixin` makes for `Reserved`, named once instead of at
     * every site. Host-internal: never external surface.
     */
    private get host(): Stuff & Slotted & Charged {
      return this as unknown as Stuff & Slotted & Charged;
    }

    /* ── authored surface ───────────────────────────────────────── */

    public getDrawMode(): DrawMode {
      return this.drawMode;
    }
    public setDrawMode(v: DrawMode): void {
      if (v !== 'impulse' && v !== 'binding') {
        throw new TypeError(`bad drawMode '${String(v)}'`);
      }
      this.drawMode = v;
    }

    public getMainsRef(): string {
      return this.mainsRef;
    }
    public setMainsRef(v: string): void {
      this.mainsRef = typeof v === 'string' ? v : '';
    }

    public getArmingFloorTau(): number {
      return this.armingFloorTau;
    }
    public setArmingFloorTau(v: number): void {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 0) {
        throw new RangeError(
          `armingFloorTau: must be a non-negative number, got '${String(v)}'`,
        );
      }
      this.armingFloorTau = n;
    }

    public isArmed(): boolean {
      this.reconcileStandby();
      return this.host.getStoredTau() >= this.armingFloorTau;
    }

    /* ── the standing draw ──────────────────────────────────────── */

    /**
     * **Absence is a cost.** Reconcile-on-read, like everything else in
     * this codebase that changes over time with nobody watching
     * (`GrowingMixin`, `ThermalMixin`, the soil) — and it reuses
     * `Charge.standbyDraw` verbatim, so there is no new clock and no new
     * arithmetic. A terminal with zero traffic drains to `dry`, which is
     * what gives a cell swap a schedule and the Authority its first job.
     */
    public reconcileStandby(): void {
      if (this._reconcilingStandby) return;
      if (this.standbyWatts <= 0) return;
      let nowS: number;
      try {
        nowS = WorldClockApi.getNow().rawValue();
      } catch {
        return; // no world clock (pre-boot / unit fixtures) — idle
      }
      if (this.standbyClockStamp === 0) {
        this.standbyClockStamp = nowS;
        return;
      }
      const elapsed = nowS - this.standbyClockStamp;
      if (elapsed <= 0) {
        this.standbyClockStamp = nowS;
        return;
      }
      this._reconcilingStandby = true;
      try {
        let scale = 1;
        try {
          scale = WorldClockApi.getScale();
        } catch {
          /* the default scale is fine */
        }
        const loss = Charge.standbyDraw(this.standbyWatts, elapsed, scale);
        if (loss > 0) this.host.spendCharge(Math.min(loss, this.host.getStoredTau()));
        this.standbyClockStamp = nowS;
      } finally {
        this._reconcilingStandby = false;
      }
    }

    /**
     * ⚠⚠ **Stand the linked line up.** Found by the live drive, and it
     * is the difference between a design and a working one: a
     * `ManaMain` is a SINGLETON, and a singleton nobody resolves never
     * exists. {@link resolveSupply} reads the live object
     * (`findByTemplatePath`) and is deliberately SYNC — it is on the
     * render path — so it cannot clone one itself.
     *
     * So a device wired to a line resolves that line at standup,
     * exactly as `FastTravelMixin.armNetwork` resolves its routes. The
     * row installed, the terminal read its `mainsRef`, and every gate
     * still reported `getSupplyMode() === 'none'` — the whole
     * line-versus-cell fare distinction was inert, and nothing but
     * driving it would have said so.
     *
     * A failure is warned and swallowed: an unresolvable line is a
     * device with no line, which the six-word vocabulary already has a
     * word for.
     */
    public async armSupply(): Promise<void> {
      if (!this.mainsRef) return;
      try {
        await StuffApi.singletonOrClone<Stuff>(this.mainsRef);
      } catch (err) {
        console.warn(
          `ManaPoweredMixin: mains ${this.mainsRef} failed to load:`,
          err instanceof Error ? err.message : String(err),
        );
      }
    }

    /* ── the one branch ─────────────────────────────────────────── */

    /**
     * **Which supply is on the other end** — resolved here and nowhere
     * else, in precedence order: the cell in the bay, then the mains,
     * then a person in contact.
     *
     * `actor` is supplied only when a draw is short AND somebody is
     * present, which is why contact is last: it is the supply that
     * needs a volunteer.
     */
    public resolveSupply(actor?: Stuff | null): ManaSupply | null {
      const cell = this.host.getOccupant(BATTERY_SLOT);
      if (cell && MixinApi.isCharged(cell)) {
        return ManaPoweredMixin.chargedSupply(cell as unknown as Stuff & Charged, 'a cell');
      }
      const main = this.resolveMain();
      if (main) return main;
      if (actor && MixinApi.isCaster(actor) && MixinApi.isReserved(actor)) {
        return ManaPoweredMixin.contactSupply(actor);
      }
      return null;
    }

    public getSupplyMode(): SupplyMode {
      const cell = this.host.getOccupant(BATTERY_SLOT);
      if (cell && MixinApi.isCharged(cell)) return 'cell';
      return this.resolveMain() ? 'main' : 'none';
    }

    /** The linked mains, when it resolves and is neither cut nor off. */
    private resolveMain(): ManaSupply | null {
      if (!this.mainsRef) return null;
      const main = StuffApi.findByTemplatePath<Stuff>(this.mainsRef);
      if (!main || !MixinApi.isCharged(main)) return null;
      const state = ManaPoweredMixin.reportedState(main);
      if (state === 'cut' || state === 'off') return null;
      return ManaPoweredMixin.chargedSupply(
        main as unknown as Stuff & Charged,
        'the line',
        state ?? null,
      );
    }

    /* ── the draw ───────────────────────────────────────────────── */

    public async canDraw(tau: number): Promise<boolean> {
      this.reconcileStandby();
      if (this.host.getStoredTau() >= tau) return true;
      const supply = this.resolveSupply();
      return (supply?.availableTau() ?? 0) >= tau - this.host.getStoredTau();
    }

    public async draw(tau: number): Promise<boolean> {
      const want = Number(tau);
      if (!Number.isFinite(want) || want < 0) return false;
      this.reconcileStandby();
      if (want === 0) return true;
      if (this.host.getStoredTau() < want) {
        const deficit = want - this.host.getStoredTau();
        const supply = this.resolveSupply();
        if (supply) await supply.feed(this as unknown as Stuff, deficit);
      }
      // All or nothing — the shipped `spendCharge` contract. A partial
      // draw would make the depleted case unreportable.
      return this.host.spendCharge(want);
    }

    /* ── the two condition reads ────────────────────────────────── */

    /**
     * ⭐ **SYNC, and that is load-bearing.** `FastTravelMixin.getStatus()`
     * is synchronous and is read from `getPresentationMml` on every room
     * listing; an async condition read would ripple into the render
     * path. Every mana read already IS synchronous (`getStoredTau`,
     * `reconcileCharge`), so nothing forces a promise — water's
     * `supplyReport` is async only because it walks a river graph.
     */
    public supplyState(): SupplyState | null {
      this.reconcileStandby();
      const candidates: SupplyState[] = [];
      if (this.mainsRef) {
        const main = StuffApi.findByTemplatePath<Stuff>(this.mainsRef);
        const s = ManaPoweredMixin.reportedState(main);
        if (s) candidates.push(s);
      }
      if (!this.isArmed()) candidates.push('dry');
      for (const state of SUPPLY_STATE_PRECEDENCE) {
        if (candidates.includes(state)) return state;
      }
      return null;
    }

    /**
     * ⚠ The **ride-scoped** read, and it cannot be folded into
     * {@link supplyState}: that one knows no destination, so it cannot
     * know whether *this* draw is affordable. Trying to fold them is how
     * the light ends up lying.
     */
    public stateForDraw(tau: number): SupplyState | null {
      const stock = this.supplyState();
      if (stock) return stock;
      this.reconcileStandby();
      if (this.host.getStoredTau() >= tau) return null;
      const supply = this.resolveSupply();
      const reachable = this.host.getStoredTau() + (supply?.availableTau() ?? 0);
      return reachable >= tau ? null : 'overdrawn';
    }

    /* ── the two supply adapters ────────────────────────────────── */

    /** A charged shell (a cell, a mains) seen as a supply. */
    private static chargedSupply(
      shell: Stuff & Charged,
      label: string,
      state: SupplyState | null = null,
    ): ManaSupply {
      return {
        label: () => label,
        availableTau: () => shell.getStoredTau(),
        feed: async (into: Stuff, tau: number): Promise<number> => {
          const take = Math.min(tau, shell.getStoredTau());
          if (take <= 0) return 0;
          if (!shell.spendCharge(take)) return 0;
          return MixinApi.isCharged(into) ? into.receiveCharge(take) : 0;
        },
        supplyState: () => (shell.getStoredTau() > 0 ? state : 'dry'),
      };
    }

    /**
     * **The one place that knows the upstream's shape.** A supply is
     * whatever answers `supplyState()` — the `TravelNode` / water
     * `SupplyReporting` pattern, so a mains can be any pack's class and
     * this file imports none of them. Read in two places (the resolve,
     * which discards a `cut`/`off` line, and the condition report, which
     * must SHOW it), which is exactly why the probe is named once.
     */
    private static reportedState(main: Stuff | null): SupplyState | null {
      return (
        (main as unknown as { supplyState?: () => SupplyState | null } | null)
          ?.supplyState?.() ?? null
      );
    }

    /**
     * A person in contact. ⭐ It routes through the SHIPPED
     * `chargeFrom` — which already refuses a non-caster, already runs
     * through a real coupling with real losses, and already finds its
     * conduit. Nothing here re-implements any of that; AC12's negative
     * half falls out with nothing written.
     */
    private static contactSupply(actor: Stuff): ManaSupply {
      const pool = (): number =>
        MixinApi.isCaster(actor)
          ? (actor.getMana()?.current.rawValue() ?? 0)
          : 0;
      return {
        label: () => 'your own reserve',
        availableTau: pool,
        feed: async (into: Stuff, tau: number): Promise<number> => {
          if (!MixinApi.isCharged(into)) return 0;
          const out = await into.chargeFrom(actor, Math.min(tau, pool()));
          return out.delivered;
        },
        supplyState: () => (pool() > 0 ? null : 'dry'),
      };
    }
  };
}
